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
  constructor(message: string, public failed?: {rank:number;name:string;reason:string}[]) { super(message); }
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
      const fresh = async (path:string):Promise<unknown> => {
        for (let attempt=0; attempt<2; attempt++) {
          abort.signal.throwIfAborted();
          let response:Response;
          try {
            response = await fetcher(base+path, {
              cache:"no-store", redirect:"error",
              headers:{ Authorization:`Bearer ${env.CLASH_API_TOKEN}`, "Cache-Control":"no-cache", Accept:"application/json" },
              signal:AbortSignal.any([abort.signal,AbortSignal.timeout(10000)]),
            });
          } catch {
            if (abort.signal.aborted) throw new LiveError("Live scan cancelled or timed out. No completed result was reused.");
            throw new LiveError("The game API timed out or could not be reached.");
          }
          if (response.ok) return response.json();
          if (attempt===0 && (response.status===429 || response.status>=500)) {
            const seconds=Number(response.headers.get("retry-after"));
            if (Number.isFinite(seconds) && seconds>3) throw new LiveError("Game API rate limit reached; retry later.");
            await new Promise(resolve=>setTimeout(resolve,Math.max(300,Math.min(3000,seconds*1000||500))));
            continue;
          }
          throw new LiveError(response.status===403 ? "API access denied. Check the token and IP allowlist." :
            response.status===429 ? "Game API rate limit reached; retry later." :
            `Required game data unavailable (HTTP ${response.status}).`);
        }
        throw new LiveError("Required game data unavailable.");
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
        const players:RankedDeck[]=new Array(100);
        const failed:{rank:number;name:string;reason:string}[]=[];
        let next=0, completed=0;
        const worker=async()=>{
          while(next<ranks.length && !abort.signal.aborted) {
            const index=next++, rank=ranks[index];
            try {
              const payload=await fresh("/players/"+encodeURIComponent(rank.tag)+"/battlelog");
              if (!Array.isArray(payload)) throw new LiveError("Unsupported battle-log format.");
              const battles=payload.filter(b=>b && b.type==="pathOfLegend" &&
                Array.isArray(b.team)&&b.team.length===1 && Array.isArray(b.opponent)&&b.opponent.length===1 &&
                b.team[0]?.tag===rank.tag && typeof b.battleTime==="string")
                .sort((a,b)=>b.battleTime.localeCompare(a.battleTime));
              const battle=battles[0];
              if (!battle) throw new LiveError("No 1v1 Ranked battle in the available log; profile deck was not substituted.");
              const time=battle.battleTime.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(?:\.\d+)?Z$/,"$1-$2-$3T$4:$5:$6Z");
              if (!Number.isFinite(Date.parse(time)) || Date.parse(time)>Date.now()+60000)
                throw new LiveError("Invalid Ranked battle timestamp.");
              const rawCards=z.array(rawCard).length(8).parse(battle.team[0].cards);
              if (new Set(rawCards.map(c=>c.id)).size!==8) throw new LiveError("Ranked deck contains duplicate card IDs.");
              const cards=rawCards.map(c=>{
                const known=catalog.items.find(v=>v.id===c.id);
                if (!known || catalog.supportItems?.some(v=>v.id===c.id))
                  throw new LiveError("Ranked deck contains an unrecognized or tower card.");
                const result=card({...known,...c},true,true,false,cap);
                if (result.name!==known.name || result.elixir===null)
                  throw new LiveError("Ranked deck metadata is incomplete or inconsistent.");
                if (result.name==="Tombstone"&&result.active==="hero") result.roles=[...result.roles,"Win condition"];
                return result;
              });
              const support=Array.isArray(battle.team[0].supportCards)?battle.team[0].supportCards:[];
              players[index]={ rank:rank.rank,tag:rank.tag,name:rank.name,
                rating:rank.eloRating??rank.trophies??null,battleTime:time,
                fetchedAt:new Date().toISOString(),cards,
                towerNames:support.flatMap((c:unknown)=>{
                  const parsed=rawCard.safeParse(c);return parsed.success?[parsed.data.name]:[];
                }),
              };
            } catch(e) {
              failed.push({rank:rank.rank,name:rank.name,reason:e instanceof LiveError?e.message:"Incomplete or unsupported battle data."});
            }
            completed++;
            progress(2,completed,100,`Checked ${completed}/100 accounts; ${failed.length} unavailable.`);
          }
        };
        await Promise.all(Array.from({length:6},worker));
        abort.signal.throwIfAborted();
        if (failed.length || completed!==100)
          throw new LiveError(`Only ${completed-failed.length}/100 Ranked decks were retrieved. Strict mode requires all 100. No recommendation generated.`,failed.sort((a,b)=>a.rank-b.rank));
        progress(3,0,100,"Checking leaderboard consistency and counting all 800 card slots…");
        const endRanks=await leaderboard();
        if (endRanks.some((r,i)=>r.tag!==ranks[i].tag))
          throw new LiveError("Ranks changed while decks were being fetched. Run a new scan; this result was not used.");
        const counts=countRankedDecks(players);
        const unknown=counts.roleUsage.find(r=>r.role==="Unclassified");
        if(unknown) throw new LiveError("Role definitions are missing for: "+unknown.cards.map(c=>c.name).join(", ")+". Update the role catalog before recommending.");
        const completedAt=new Date().toISOString();
        const old=players.filter(p=>Date.parse(completedAt)-Date.parse(p.battleTime)>86400000).length;
        progress(3,100,100,"All 100 decks counted. Role coverage and form counts are ready.");
        emit({type:"complete",player,meta:{id:crypto.randomUUID(),startedAt,leaderboardAt,completedAt,
          source:base+ladderPath,sampleSize:100,roleVersion:ROLE_VERSION,players,...counts,
          warnings:[
            "Fresh API requests do not guarantee the upstream provider updates instantly. These are the latest available Ranked battle decks, not currently selected profile decks.",
            "Ranks matched at the beginning and end of this collection window; the API offers no atomic snapshot or guarantee they stayed unchanged between reads.",
            "The sample represents 100 ranked accounts, not necessarily 100 different people. Every account contributes once, even when decks repeat.",
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
