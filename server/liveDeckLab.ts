import { z } from "zod";
import { card, normalize, rawCard, tag } from "../src/lib/model";
import { countRankedDecks, ROLE_VERSION, type LabEvent, type RankedDeck } from "../src/lib/liveMeta";
import type { Env } from "./service";

const rankSchema = z.object({ items: z.array(z.object({
  rank: z.number().int().positive(), tag: z.string(), name: z.string(),
  eloRating: z.number().optional(), trophies: z.number().optional(),
})) });
const catalogSchema = z.object({ items: z.array(rawCard), supportItems: z.array(rawCard).optional() });
const ladderPath = "/locations/global/pathoflegend/players?limit=100";
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
  if (!env.CLASH_API_TOKEN) return jsonError("Live top-100 analysis needs a configured Clash Royale API token. No offline recommendation was generated.", 503);
  const base = env.CLASH_API_BASE ?? "https://api.clashroyale.com/v1";
  if (!["https://api.clashroyale.com/v1", "https://proxy.royaleapi.dev/v1"].includes(base))
    return jsonError("Unsupported game API base URL.", 500);
  let playerTag: string;
  try {
    const raw = await req.text();
    if (raw.length > 1024) return jsonError("Request too large.", 413);
    playerTag = tag(z.object({ tag: z.string().max(20) }).parse(JSON.parse(raw)).tag);
  } catch { return jsonError("Provide a valid player tag.", 400); }
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
      const leaderboard = async () => {
        const rows=rankSchema.parse(await fresh(ladderPath)).items;
        const top=rows.filter(r=>r.rank<=100).sort((a,b)=>a.rank-b.rank);
        if (top.length!==100 || new Set(top.map(r=>tag(r.tag))).size!==100 ||
            top.some((r,i)=>r.rank!==i+1))
          throw new LiveError("The API did not supply all 100 distinct current Ranked accounts with ranks 1–100. Scan stopped.");
        return top.map(r=>({...r,tag:tag(r.tag)}));
      };
      void (async () => {
        const startedAt=new Date().toISOString();
        progress(1,0,100,"Fetching the current global Ranked top 100 and your collection…");
        const [ranks,catalogInput,profile] = await Promise.all([
          leaderboard(), fresh("/cards"), fresh("/players/"+encodeURIComponent(playerTag)),
        ]);
        const leaderboardAt=new Date().toISOString();
        const catalog=catalogSchema.parse(catalogInput);
        const capSetting=Number(env.DISPLAY_LEVEL_CAP??16);
        const cap=Number.isInteger(capSetting)&&capSetting>0&&capSetting<=30?capSetting:16;
        const player=normalize(profile,catalog,[],{},leaderboardAt,cap);
        if (tag(player.tag)!==playerTag) throw new LiveError("The API returned a different player profile. Scan stopped.");
        progress(1,100,100,"Current ranks 1–100 received. Fetching their latest available Ranked battles…");
        const players:(RankedDeck|undefined)[]=new Array(100);
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
         * If top-100 account A's own recent log lacks Ranked games but A
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
          while(next<ranks.length&&!abort.signal.aborted){
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
            progress(2,completed,100,
              `Checked ${completed}/100 recent logs; found ${available}/100 top-ranked played decks.`);
          }
        };
        await Promise.all(Array.from({length:5},worker));
        abort.signal.throwIfAborted();
        const failed=ranks.flatMap((rank,index)=>players[index]?[]:[{
          rank:rank.rank,tag:rank.tag,name:rank.name||rank.tag,
          reason:(issues.get(index)??"No qualifying Ranked battle found.")+
            " Not observed as an opponent in another sampled top-100 Ranked battle.",
        }]);
        if(failed.length || completed!==100)
          throw new LiveError(
            `Only ${100-failed.length}/100 verifiable Ranked decks found from the current top-100 accounts. `+
            `Strict mode needs all 100; no recommendation generated. `+
            `See the unavailable account and reason below.`,
            failed.sort((a,b)=>a.rank-b.rank)
          );
        const completePlayers=players as RankedDeck[];
        progress(3,0,100,"Checking leaderboard consistency and counting all 800 card slots…");
        const endRanks=await leaderboard();
        if (endRanks.some((r,i)=>r.tag!==ranks[i].tag))
          throw new LiveError("Ranks changed while decks were being fetched. Run a new scan; this result was not used.");
        const counts=countRankedDecks(completePlayers);
        const unknown=counts.roleUsage.find(r=>r.role==="Unclassified");
        if(unknown) throw new LiveError("Role definitions are missing for: "+unknown.cards.map(c=>c.name).join(", ")+". Update the role catalog before recommending.");
        const completedAt=new Date().toISOString();
        const old=completePlayers.filter(p=>Date.parse(completedAt)-Date.parse(p.battleTime)>86400000).length;
        const recovered=completePlayers.filter(p=>p.evidenceOrigin==="other-top100-log").length;
        progress(3,100,100,"All 100 decks counted. Role coverage and form counts are ready.");
        emit({type:"complete",player,meta:{id:crypto.randomUUID(),startedAt,leaderboardAt,completedAt,
          source:base+ladderPath,sampleSize:100,roleVersion:ROLE_VERSION,players:completePlayers,...counts,
          warnings:[
            "Fresh API requests do not guarantee the upstream provider updates instantly. These are the latest available Ranked battle decks, not currently selected profile decks.",
            "Ranks matched at the beginning and end of this collection window; the API offers no atomic snapshot or guarantee they stayed unchanged between reads.",
            "The sample represents 100 ranked accounts, not necessarily 100 different people. Every account contributes once, even when decks repeat.",
            ...(recovered?[`${recovered} decks were verified from a Ranked opponent in another top-100 account\u0027s fresh battle log. No profile deck was substituted.`]:[]),
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
