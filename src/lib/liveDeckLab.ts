import { rolesFor, type Card } from "./model";
import { evaluate, key, legal, type Constraints } from "./engine";
import { assessStrategy, type ReasoningContext } from "./deckStrategy";
import type { MechanicsCatalog } from "./mechanics";
import type { LiveMeta, RankedDeck } from "./liveMeta";

export type LiveCandidate = {
  cards: Card[]; evaluation: ReturnType<typeof evaluate>;
  strategy: ReturnType<typeof assessStrategy>; recommendationScore: number;
  evidence: {
    scanId: string; observedCount: number; requestedCount: number;
    sourceRank: number; sourceName: string; sourceTag: string;
    sourceCards: Card[]; sharedCards: number; exactBaseDeckAccounts: number;
    substitutions: { out: string; in: string }[]; formDifferences: string[];
    components: { name: string; score: number; weight: number }[];
    cardUsage: { id: number; name: string; count: number; roles: string[] }[];
  };
};
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
const intersection=(a:string[],b:string[])=>a.filter(x=>b.includes(x));
const meaningful=(c:Card)=>c.roles.filter(r=>!["Spell","Support","Ground defense"].includes(r));
function similarity(source:Card,target:Card) {
  if(source.id===target.id)return 1;
  const wanted=meaningful(source), actual=meaningful(target);
  if(!wanted.length)return 0;
  return intersection(wanted,actual).length/new Set([...wanted,...actual]).size;
}

/** Live-deck adaptation only: no canned templates or offline generation path.
 * Usage percentages are counts, while this bounded search is explicitly an
 * editorial ranking. All eligible cards are considered for each substitution.
 */
export async function recommendFromTop100(collection:Card[], q:Constraints, meta:LiveMeta,
  mechanics?:MechanicsCatalog|null, reasoning:ReasoningContext={}, signal?:AbortSignal):Promise<LiveCandidate[]> {
  const yieldToUI=async()=>{await new Promise(resolve=>setTimeout(resolve,0));signal?.throwIfAborted();};
  if(![100,200,300].includes(meta.requestedCount) ||
     meta.sampleSize<1 || meta.sampleSize>meta.requestedCount ||
     meta.players.length!==meta.sampleSize ||
     new Set(meta.players.map(p=>p.tag)).size!==meta.sampleSize ||
     meta.players.some(p=>p.rank<1 || p.rank>meta.requestedCount ||
       p.cards.length!==8 || new Set(p.cards.map(c=>c.id)).size!==8))
    throw new Error("This scan lacks enough validated live Ranked evidence to recommend a deck.");
  if(Date.now()-Date.parse(meta.completedAt)>60000 || !Number.isFinite(Date.parse(meta.completedAt)))
    throw new Error("This live scan expired before generation. Fetch the selected global top players again.");
  if(q.include.length>8 || new Set(q.include).size!==q.include.length ||
    q.include.some(id=>q.exclude.includes(id)) || !Number.isFinite(q.maxElixir)||q.maxElixir<=0)
    throw new Error("Your include/exclude or elixir constraints conflict.");
  const pool=collection.filter(c=>c.owned&&!c.tower&&c.rarity.toLowerCase()!=="champion"&&
    c.level!==null&&c.level>=q.minLevel&&c.elixir!==null&&Number.isFinite(c.elixir)&&!q.exclude.includes(c.id))
    .map(c=>({...c,active:"base",roles:rolesFor(c.name)}));
  const forced=q.include.map(id=>pool.find(c=>c.id===id));
  if(forced.some(c=>!c))throw new Error("A locked card is unavailable at your chosen minimum level or is an unsupported Champion.");
  if(reasoning.focus==="royal-giant"&&!forced.some(c=>c?.name==="Royal Giant")) {
    const rg=pool.find(c=>c.name==="Royal Giant");
    if(!rg)throw new Error("Royal Giant focus requires an eligible owned Royal Giant.");
    forced.push(rg);
  }
  if(pool.length<8 || forced.length>8)return [];
  const locked=forced as Card[];
  const usage=new Map(meta.usage.map(c=>[c.id,c.count]));
  const highestLevel=Math.max(...pool.map(c=>c.level??0));
  const maxUsage=Math.max(1,...meta.usage.map(c=>c.count));
  const pairs=new Map<string,number>();
  const pairKey=(a:number,b:number)=>a<b?`${a}:${b}`:`${b}:${a}`;
  for(const p of meta.players)for(let i=0;i<8;i++)for(let j=i+1;j<8;j++) {
    const k=pairKey(p.cards[i].id,p.cards[j].id);pairs.set(k,(pairs.get(k)??0)+1);
  }
  const roleUsage=new Map(meta.roleUsage.map(r=>[r.role,new Map(r.cards.map(c=>[c.id,c.count]))]));
  const eligible=(cs:Card[])=>legal(cs)&&locked.every(c=>cs.some(x=>x.id===c.id))&&
    cs.some(c=>c.roles.includes("Win condition"))&&
    cs.reduce((sum,c)=>sum+(c.elixir??0),0)<=q.maxElixir*8;
  const seeds=new Map<string,{cards:Card[];source:RankedDeck}>();
  const add=(cs:Card[],source:RankedDeck)=>{
    if(!eligible(cs))return;
    const id=key(cs),previous=seeds.get(id);
    const shared=(p:RankedDeck)=>cs.filter(c=>p.cards.some(x=>x.id===c.id)).length;
    if(!previous||shared(source)>shared(previous.source))seeds.set(id,{cards:cs,source});
  };
  for(const source of meta.players) {
    if(source.rank%5===1)await yieldToUI();
    // Match forced cards to source slots first, then adapt the remaining slots.
    const remaining=[...source.cards];
    for(const fixed of locked) {
      const best=remaining.map((c,i)=>({i,value:similarity(c,fixed)})).sort((a,b)=>b.value-a.value)[0];
      if(best)remaining.splice(best.i,1);
    }
    let beam:{cards:Card[];value:number}[]=[{cards:[...locked],value:0}];
    for(const wanted of remaining) {
      const trials:{cards:Card[];value:number}[]=[];
      for(const state of beam) {
        const options=pool.filter(c=>!state.cards.some(x=>x.id===c.id)&&
          (!wanted.roles.includes("Win condition")||c.roles.includes("Win condition")))
          .map(c=>{
            const synergy=state.cards.reduce((sum,x)=>sum+(pairs.get(pairKey(c.id,x.id))??0),0)/Math.max(1,state.cards.length);
            const roleCount=Math.max(0,...wanted.roles.map(r=>roleUsage.get(r)?.get(c.id)??0));
            const value=similarity(wanted,c)*40+(c.level??0)/highestLevel*22+
              (usage.get(c.id)??0)/maxUsage*12+roleCount/maxUsage*10+synergy/maxUsage*12-
              Math.abs((wanted.elixir??0)-(c.elixir??0))*2;
            return {card:c,value};
          }).sort((a,b)=>b.value-a.value||a.card.id-b.card.id).slice(0,8);
        for(const option of options) {
          const cards=[...state.cards,option.card];
          if(cards.reduce((sum,c)=>sum+(c.elixir??0),0)<=q.maxElixir*8)
            trials.push({cards,value:state.value+option.value});
        }
      }
      const unique=new Map<string,{cards:Card[];value:number}>();
      for(const trial of trials.sort((a,b)=>b.value-a.value||key(a.cards).localeCompare(key(b.cards))))
        if(!unique.has(key(trial.cards)))unique.set(key(trial.cards),trial);
      beam=[...unique.values()].slice(0,10);
      if(!beam.length)break;
    }
    for(const state of beam)add(state.cards,source);
    const exact=source.cards.map(c=>pool.find(p=>p.id===c.id));
    if(exact.every((c):c is Card=>!!c))add(exact,source);
  }
  const rows:LiveCandidate[]=[];
  for(const {cards,source} of seeds.values()) {
    if(rows.length%20===0)await yieldToUI();
    const strategy=assessStrategy(cards,mechanics,{...reasoning,
      focus:q.mode==="Fast cycle"&&reasoning.focus==="balanced"?"cycle":reasoning.focus});
    const targeted=strategy.scenarios.filter(s=>q.mode==="Maximum defense"?
      ["air","tanks","ground","swarms"].includes(s.id):q.mode==="Maximum offense"?s.id==="pressure":false);
    const tactical=targeted.length?strategy.score*0.5+
      targeted.reduce((sum,s)=>sum+s.score,0)/targeted.length*0.5:strategy.score;
    const readiness=cards.reduce((sum,c)=>sum+(c.level??0)/highestLevel*100,0)/8;
    const shared=cards.filter(c=>source.cards.some(s=>s.id===c.id)).length;
    const popularity=cards.reduce((sum,c)=>sum+(usage.get(c.id)??0)/maxUsage*100,0)/8;
    let together=0;
    for(let i=0;i<8;i++)for(let j=i+1;j<8;j++) {
      const denominator=Math.max(1,Math.min(usage.get(cards[i].id)??0,usage.get(cards[j].id)??0));
      together+=(pairs.get(pairKey(cards[i].id,cards[j].id))??0)/denominator;
    }
    const sourceRoleCounts=(cs:Card[])=>new Map([...new Set(cs.flatMap(c=>c.roles))]
      .map(r=>[r,cs.filter(c=>c.roles.includes(r)).length]));
    const sourceRoles=sourceRoleCounts(source.cards),ownRoles=sourceRoleCounts(cards);
    const roleFit=100-clamp([...sourceRoles].reduce((sum,[r,n])=>sum+Math.max(0,n-(ownRoles.get(r)??0)),0)*5);
    const cohesion=shared/8*50+together/28*30+roleFit*0.2;
    const components=[
      {name:"Live deck similarity and card combinations",score:cohesion,weight:35},
      {name:"Tactical coverage, mode and chosen focus",score:tactical,weight:30},
      {name:"Readiness at your owned levels",score:readiness,weight:25},
      {name:"Card frequency in the verified global sample",score:popularity,weight:10},
    ];
    const out=source.cards.filter(c=>!cards.some(x=>x.id===c.id));
    const added=cards.filter(c=>!source.cards.some(x=>x.id===c.id));
    const substitutions=out.map(c=>{
      added.sort((a,b)=>similarity(c,b)-similarity(c,a)||a.id-b.id);
      return {out:c.name,in:added.shift()?.name??"Unmatched"};
    });
    const formDifferences=source.cards.filter(c=>c.active!=="base"&&cards.some(x=>x.id===c.id))
      .map(c=>`${c.name}: source ${c.active}; recommendation uses base form. Special-form effects are not assumed.`);
    rows.push({cards,evaluation:evaluate(cards,q,mechanics),strategy,
      recommendationScore:Math.round(components.reduce((sum,c)=>sum+c.score*c.weight/100,0)*10)/10,
      evidence:{scanId:meta.id,observedCount:meta.sampleSize,requestedCount:meta.requestedCount,
        sourceRank:source.rank,sourceName:source.name,sourceTag:source.tag,
        sourceCards:source.cards,sharedCards:shared,
        exactBaseDeckAccounts:meta.players.filter(p=>key(p.cards)===key(cards)).length,
        substitutions,formDifferences,components,
        cardUsage:cards.map(c=>({id:c.id,name:c.name,count:usage.get(c.id)??0,roles:c.roles})),
      },
    });
  }
  rows.sort((a,b)=>b.recommendationScore-a.recommendationScore||key(a.cards).localeCompare(key(b.cards)));
  const result:LiveCandidate[]=[];
  for(const row of rows)if(result.every(old=>row.cards.filter(c=>old.cards.some(x=>x.id===c.id)).length<=6)) {
    result.push(row);if(result.length===5)break;
  }
  return result;
}
