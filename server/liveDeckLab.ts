import { z } from "zod";
import { card, normalize, rawCard, tag } from "../src/lib/model";
import { countRankedDecks, ROLE_VERSION, type LabEvent, type RankedDeck, type GlobalRankedLimit } from "../src/lib/liveMeta";
import type { Env } from "./service";

const rankSchema = z.object({ items: z.array(z.object({
  rank: z.number().int().positive(), tag: z.string(), name: z.string(),
  eloRating: z.number().optional(), trophies: z.number().optional(),
})), paging: z.object({
  cursors: z.object({ after: z.union([z.string(), z.number()]).optional() }).passthrough().optional(),
}).passthrough().optional() });
const catalogSchema = z.object({ items: z.array(rawCard), supportItems: z.array(rawCard).optional() });
const ladderBase = "/locations/global/pathoflegend/players";
const inFlight = new Set<string>();
const lastStarted = new Map<string, number>();

class LiveError extends Error {
  constructor(message: string, public failed?: {rank:number;tag?:string;name:string;reason:string}[]) { super(message); }
}
const jsonError = (error: string, status: number) => Response.json({ error }, {
  status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});

/** Deliberately independent of service.upstream: NO TTL cache, stored snapshot,
 * profile-deck substitute, previous-season endpoint or shared completed result.
 */
export async function liveDeckLab(req: Request, env: Env, bucket: string, fetcher: typeof fetch = fetch) {
  if (!env.CLASH_API_TOKEN) return jsonError("Live global Ranked analysis needs a configured Clash Royale API token. No offline recommendation was generated.", 503);
  const base = env.CLASH_API_BASE ?? "https://api.clashroyale.com/v1";
  if (!["https://api.clashroyale.com/v1", "https://proxy.royaleapi.dev/v1"].includes(base))
    return jsonError("Unsupported game API base URL.", 500);
  let playerTag: string;
  let requestedCount: GlobalRankedLimit;
  try {
    const raw = await req.text();
    if (raw.length > 1024) return jsonError("Request too large.", 413);
    const input = z.object({
      tag: z.string().max(20),
      top: z.union([z.literal(100),z.literal(200),z.literal(300)]).default(100),
    }).parse(JSON.parse(raw));
    playerTag = tag(input.tag);
    requestedCount = input.top;
  } catch { return jsonError("Provide a valid player tag and Top 100, 200 or 300 selection.", 400); }
  if (inFlight.has(bucket) || inFlight.size >= 2 || Date.now() - (lastStarted.get(bucket) ?? 0) < 15000)
    return jsonError("A live analysis is running or was just requested. Wait before starting another fresh scan.", 429);
  inFlight.add(bucket);
  if (lastStarted.size > 1000) lastStarted.clear();
  lastStarted.set(bucket, Date.now());
  const abort = new AbortController();
  const stop = () => abort.abort();
  req.signal.addEventListener("abort", stop, { once: true });
  if (req.signal.aborted) stop();
  const deadline = setTimeout(stop, 240000);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: LabEvent) => {
        if (abort.signal.aborted) return;
        try { controller.enqueue(encoder.encode(JSON.stringify(event) + "\n")); }
        catch { stop(); }
      };
      const progress = (stage:1|2|3|4, completed:number, total:number, message:string) =>
        emit({ type:"progress", progress:{stage,completed,total,message} });
      const delay = (ms:number) => new Promise<void>(resolve => setTimeout(resolve,ms));
      /** New upstream request on EVERY attempt. No application cache or
       * saved decks. Retry only transient transport/429/5xx failures. */
      const fresh = async (path:string):Promise<unknown> => {
        for (let attempt=0;attempt<4;attempt++) {
          abort.signal.throwIfAborted();
          let response:Response;
          try {
            response=await fetcher(base+path,{
              cache:"no-store",redirect:"error",
              headers:{
                Authorization:`Bearer ${env.CLASH_API_TOKEN}`,
                "Cache-Control":"no-cache",Accept:"application/json",
              },
              signal:AbortSignal.any([abort.signal,AbortSignal.timeout(12000)]),
            });
          } catch {
            if(abort.signal.aborted)
              throw new LiveError("Live scan cancelled or timed out. No previous data was reused.");
            if(attempt<3) {
              await delay(Math.min(5000,500*2**attempt));
              continue;
            }
            throw new LiveError("The game API could not be reached after four fresh attempts.");
          }
          if(response.ok) {
            try {return await response.json();}
            catch {throw new LiveError("The game API returned invalid JSON.");}
          }
          const retryable=response.status===429 || response.status>=500;
          if(retryable && attempt<3) {
            const seconds=Number(response.headers.get("retry-after"));
            const wait=Number.isFinite(seconds)&&seconds>0
              ? Math.max(500,Math.min(12000,seconds*1000))
              : Math.min(5000,500*2**attempt);
            await delay(wait);
            continue;
          }
          throw new LiveError(
            response.status===403?"API access denied. Check token and IP allowlist.":
            response.status===429?"Game API rate limit exceeded after retries.":
            response.status===404?"Required player or battle log unavailable (HTTP 404).":
            `Required game data unavailable (HTTP ${response.status}).`
          );
        }
        throw new LiveError("Required game data could not be retrieved.");
      };
      /** Cursor paging is required: a single leaderboard page may stop at
       * 100 even when 200 or 300 are requested. No second leaderboard or
       * previous-season data is substituted for missing pages. */
      const leaderboard = async () => {
        const ranks: z.infer<typeof rankSchema>["items"] = [];
        const seen = new Set<string>();
        const cursors = new Set<string>();
        let after: string | null = null;
        let warning: string | null = null;
        while(ranks.length < requestedCount) {
          abort.signal.throwIfAborted();
          const limit = Math.min(100,requestedCount-ranks.length);
          const path = ladderBase+"?limit="+limit+
            (after?"&after="+encodeURIComponent(after):"");
          let response:z.infer<typeof rankSchema>;
          try {
            response = rankSchema.parse(await fresh(path));
          } catch (error) {
            if(ranks.length===0)throw error;
            warning = "The Ranked leaderboard stopped after rank #"+
              ranks.length+": "+(error instanceof Error?error.message:"page unavailable.");
            break;
          }
          if(!response.items.length) {
            warning = "No further current Ranked leaderboard entries were returned after #"+ranks.length+".";
            break;
          }
          let malformed=false;
          for(const entry of response.items) {
            if(ranks.length>=requestedCount)break;
            let normalized:string;
            try {normalized=tag(entry.tag);}
            catch {malformed=true;break;}
            if(entry.rank!==ranks.length+1 || seen.has(normalized)) {
              malformed=true;break;
            }
            seen.add(normalized);
            ranks.push({...entry,tag:normalized});
          }
          if(malformed) {
            warning="The current Ranked leaderboard contained an invalid, duplicate or missing rank after #"+ranks.length+".";
            break;
          }
          if(ranks.length>=requestedCount)break;
          const next=response.paging?.cursors?.after;
          const cursor=next===undefined?null:String(next);
          if(!cursor || cursors.has(cursor)) {
            warning="The API did not provide a usable next-page cursor after rank #"+ranks.length+".";
            break;
          }
          cursors.add(cursor);
          after=cursor;
        }
        if(!ranks.length)
          throw new LiveError("The game API returned no verifiable global Ranked leaderboard accounts.");
        return {ranks,warning};
      };
      void (async () => {
        const startedAt=new Date().toISOString();
        const scanSoftDeadline=Date.now()+167000;
        progress(1,0,requestedCount,
          "Fetching the current global Ranked top "+requestedCount+" and your collection…");
        const [leaderboardData,catalogInput,profile] = await Promise.all([
          leaderboard(), fresh("/cards"), fresh("/players/"+encodeURIComponent(playerTag)),
        ]);
        const {ranks,warning:leaderboardWarning}=leaderboardData;
        const leaderboardAt=new Date().toISOString();
        const catalog=catalogSchema.parse(catalogInput);
        const capSetting=Number(env.DISPLAY_LEVEL_CAP??16);
        const cap=Number.isInteger(capSetting)&&capSetting>0&&capSetting<=30?capSetting:16;
        const player=normalize(profile,catalog,[],{},leaderboardAt,cap);
        if (tag(player.tag)!==playerTag) throw new LiveError("The API returned a different player profile. Scan stopped.");
        progress(1,ranks.length,requestedCount,
          "Received "+ranks.length+" global Ranked accounts out of the selected "+
          requestedCount+". Reading their recent Ranked battles…");
        const players:(RankedDeck|undefined)[]=new Array(ranks.length);
        const rankIndex=new Map(ranks.map((rank,i)=>[rank.tag,i]));
        const cardIndex=new Map(catalog.items.map(item=>[item.id,item]));
        const towerIds=new Set(catalog.supportItems?.map(item=>item.id)??[]);
        const issues=new Map<number,string>();
        let next=0,completed=0;
        const cleanTag=(value:unknown):string|null=>{
          if(typeof value!=="string")return null;
          try {return tag(value);}
          catch {return null;}
        };
        /** Both sides of a real Ranked 1v1 battle are valid played decks.
         * If ranked account A's own recent log lacks Ranked games but A
         * appears as opponent in B's Ranked log, recover A's actual played
         * cards from that observed battle. No profile deck or old cache. */
        const observe=(input:unknown,sourceIndex:number):boolean=>{
          if(!input||typeof input!=="object")return false;
          const battle=input as {
            type?:unknown; battleTime?:unknown;
            team?:unknown; opponent?:unknown;
          };
          if(battle.type!=="pathOfLegend" ||
             !Array.isArray(battle.team)||battle.team.length!==1 ||
             !Array.isArray(battle.opponent)||battle.opponent.length!==1 ||
             typeof battle.battleTime!=="string")return false;
          const sides=[battle.team[0],battle.opponent[0]];
          const tags=sides.map(side=>cleanTag(side?.tag));
          if(!tags.includes(ranks[sourceIndex].tag))return false;
          const timestamp=battle.battleTime.replace(
            /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(?:\.\d+)?Z$/,
            "$1-$2-$3T$4:$5:$6Z"
          );
          const milliseconds=Date.parse(timestamp);
          if(!Number.isFinite(milliseconds) || milliseconds>Date.now()+60000)return false;
          let observed=false;
          for(let sideIndex=0;sideIndex<2;sideIndex++){
            const playerTag=tags[sideIndex];
            if(!playerTag)continue;
            const targetIndex=rankIndex.get(playerTag);
            if(targetIndex===undefined)continue;
            const side=sides[sideIndex];
            const parsed=z.array(rawCard).length(8).safeParse(side?.cards);
            if(!parsed.success || new Set(parsed.data.map(c=>c.id)).size!==8)
              continue;
            let cards:ReturnType<typeof card>[];
            try {
              cards=parsed.data.map(played=>{
                const known=cardIndex.get(played.id);
                if(!known || towerIds.has(played.id))
                  throw new LiveError("Unknown or tower card in played deck.");
                const result=card({...known,...played},true,true,false,cap);
                if(result.name!==known.name || result.elixir===null)
                  throw new LiveError("Incomplete played-card metadata.");
                if(result.name==="Tombstone"&&result.active==="hero")
                  result.roles=[...result.roles,"Win condition"];
                return result;
              });
            } catch {continue;}
            observed=true;
            const fromOwnLog=targetIndex===sourceIndex;
            const previous=players[targetIndex];
            // Latest verifiable Ranked battle wins. Prefer the account's
            // own log only for exactly equal timestamps.
            if(previous && (previous.battleTime>timestamp ||
              (previous.battleTime===timestamp &&
               (previous.evidenceOrigin==="own-log" || !fromOwnLog))))continue;
            const support=Array.isArray(side?.supportCards)?side.supportCards:[];
            players[targetIndex]={
              rank:ranks[targetIndex].rank,tag:playerTag,
              name:ranks[targetIndex].name||playerTag,
              rating:ranks[targetIndex].eloRating??ranks[targetIndex].trophies??null,
              battleTime:timestamp,fetchedAt:new Date().toISOString(),cards,
              towerNames:support.flatMap((value:unknown)=>{
                const parsed=rawCard.safeParse(value);
                return parsed.success?[parsed.data.name]:[];
              }),
              evidenceOrigin:fromOwnLog?"own-log":"other-top100-log",
              evidenceSourceRank:ranks[sourceIndex].rank,
            };
          }
          return observed;
        };
        const worker=async()=>{
          while(next<ranks.length&&!abort.signal.aborted&&Date.now()<scanSoftDeadline){
            const index=next++;
            try {
              const payload=await fresh(
                "/players/"+encodeURIComponent(ranks[index].tag)+"/battlelog"
              );
              if(!Array.isArray(payload))
                throw new LiveError("Unsupported battle-log format.");
              // Inspect all available Ranked 1v1 entries, not just the
              // first matching battle in each account's recent log.
              let observed=false;
              for(const battle of payload)
                if(observe(battle,index))observed=true;
              if(!observed)
                issues.set(index,
                  "No valid 1v1 Ranked battle in this account's currently available log.");
            } catch(e){
              issues.set(index,e instanceof Error?e.message:
                "The current battle log was unavailable.");
            }
            completed++;
            const available=players.filter(Boolean).length;
            progress(2,completed,ranks.length,
              `Checked ${completed}/${ranks.length} current logs; verified ${available}/${requestedCount} requested top-ranked decks.`);
          }
        };
        await Promise.all(Array.from({length:requestedCount===300?10:requestedCount===200?8:6},worker));
        abort.signal.throwIfAborted();
        const unavailable=ranks.flatMap((rank,index)=>players[index]?[]:[{
          rank:rank.rank,tag:rank.tag,name:rank.name||rank.tag,
          reason:(issues.get(index)??(
            index>=next
              ? "Scan time budget reached before this account could be requested."
              : "No qualifying Ranked battle found."
          ))+
            " Not observed as an opponent in another sampled Ranked battle.",
        }]);
        const observedPlayers=players.filter((player):player is RankedDeck=>!!player)
          .sort((a,b)=>a.rank-b.rank);
        // The recommendation is based ONLY on verified played decks.
        // A missing battle is no longer treated as proof the other 99–299
        // observed decks are unusable. Zero evidence still cannot generate.
        if(!observedPlayers.length)
          throw new LiveError(
            "No verifiable current Ranked 1v1 decks were found in the selected top "+
            requestedCount+". A live-based recommendation cannot be generated.",
            unavailable
          );
        progress(3,0,observedPlayers.length,
          "Checking available leaderboard evidence and counting "+
          observedPlayers.length*8+" verified card slots…");
        let changedRanks:number|null=null;
        let consistencyWarning:string|null=null;
        if(Date.now()<scanSoftDeadline+5000) {
          try {
            const check=await leaderboard();
            const current=new Map(check.ranks.map(r=>[r.rank,r.tag]));
            changedRanks=ranks.filter(r=>{
              const other=current.get(r.rank);
              return other!==undefined && other!==r.tag;
            }).length;
            if(check.warning)consistencyWarning="End-of-scan leaderboard recheck: "+check.warning;
          } catch (error) {
            consistencyWarning="The end-of-scan leaderboard check was unavailable: "+
              (error instanceof Error?error.message:"upstream request failed.");
          }
        } else {
          consistencyWarning="The end-of-scan leaderboard recheck was skipped to respect the scan time budget.";
        }
        const counts=countRankedDecks(observedPlayers);
        const unknown=counts.roleUsage.find(r=>r.role==="Unclassified");
        const completedAt=new Date().toISOString();
        const old=observedPlayers.filter(p=>Date.parse(completedAt)-Date.parse(p.battleTime)>86400000).length;
        const recovered=observedPlayers.filter(p=>p.evidenceOrigin==="other-top100-log").length;
        progress(3,observedPlayers.length,observedPlayers.length,
          "Counted "+observedPlayers.length+" verified decks and "+
          observedPlayers.length*8+" card slots; adapting to your owned levels…");
        emit({type:"complete",player,meta:{id:crypto.randomUUID(),startedAt,leaderboardAt,completedAt,
          source:base+ladderBase,requestedCount,leaderboardCount:ranks.length,
          sampleSize:observedPlayers.length,unavailable,
          leaderboardWarning:leaderboardWarning??null,changedRanks,
          roleVersion:ROLE_VERSION,players:observedPlayers,...counts,
          warnings:[
            "Fresh API requests do not guarantee the upstream provider updates instantly. These are the latest available Ranked battle decks, not currently selected profile decks.",
            "Ranks matched at the beginning and end of this collection window; the API offers no atomic snapshot or guarantee they stayed unchanged between reads.",
            "Only verified, actually played Ranked decks are counted. Each observed account contributes once, even when deck compositions repeat.",
            ...(ranks.length<requestedCount?[
              "The leaderboard supplied only "+ranks.length+"/"+requestedCount+
              " requested ranks; all statistics reflect available observed accounts, not the entire selected top group."
            ]:[]),
            ...(unavailable.length?[
              unavailable.length+" ranked accounts had no verifiable recent Ranked deck; recommendations use the remaining "+observedPlayers.length+
              " and may be less representative."
            ]:[]),
            ...(leaderboardWarning?[leaderboardWarning]:[]),
            ...(consistencyWarning?[consistencyWarning]:[]),
            ...(changedRanks!==null&&changedRanks>0?[
              changedRanks+" leaderboard ranks changed during the scan. Observations are from the opening leaderboard, not a synchronized current snapshot."
            ]:[]),
            ...(unknown?["Some cards lack editorial role definitions: "+unknown.cards.map(c=>c.name).join(", ")+". Their known card identities and other roles remain counted."]:[]),
            ...(recovered?[`${recovered} decks were verified from a Ranked opponent in another selected ranked account\u0027s fresh battle log. No profile deck was substituted.`]:[]),
            "Card and form usage are observed counts. Role labels, substitutions and recommendation scores are editorial estimates, not win probabilities.",
            ...(old?[`${old} accounts last played an available Ranked battle more than 24 hours ago; individual battle times are shown.`]:[]),
          ],
        }});
      })().catch(e=>{
        if (!abort.signal.aborted) emit({type:"error",error:e instanceof LiveError?e.message:
          "The required live data was incomplete or unsupported. No fallback recommendation was generated.",
          failed:e instanceof LiveError?e.failed:undefined});
      }).finally(()=>{
        clearTimeout(deadline);inFlight.delete(bucket);req.signal.removeEventListener("abort",stop);
        try{controller.close();}catch{/* Client disconnected. */}
      });
    },
    cancel(){stop();},
  });
  return new Response(stream,{headers:{"Content-Type":"application/x-ndjson; charset=utf-8",
    "Cache-Control":"no-store, no-transform","X-Accel-Buffering":"no","X-Content-Type-Options":"nosniff"}});
}
