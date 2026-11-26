import { rolesFor, type Card } from "./model";
import { evaluate, key, legal, type Constraints } from "./engine";
import { assessStrategy, type ReasoningContext } from "./deckStrategy";
import type { MechanicsCatalog } from "./mechanics";
import type { LiveMeta, RankedDeck } from "./liveMeta";
import { createReplacementAnalyzer, type AssignedReplacement } from "./slotReplacements";

export type LiveCandidate = {
  cards: Card[]; evaluation: ReturnType<typeof evaluate>;
  strategy: ReturnType<typeof assessStrategy>; recommendationScore: number;
  evidence: {
    scanId: string; observedCount: number; requestedCount: number;
    adaptationMethod: "source-deck" | "observed-usage-fallback";
    sourceRank: number; sourceName: string; sourceTag: string;
    sourceCards: Card[]; sharedCards: number; exactBaseDeckAccounts: number;
    substitutions: {
      out:string; in:string; sourceLevel:number|null;
      originalOwnedLevel:number|null; ownedLevel:number|null;
      sourceElixir:number|null; ownedElixir:number|null; score:number|null;
      originalOwnedStats:{hp:number|null;damage:number|null;dps:number|null};
      replacementStats:{hp:number|null;damage:number|null;dps:number|null};
      preserved:string[]; gained:string[]; limitations:string[]; reason:string;
    }[];
    formDifferences: string[];
    ownedLevelBenchmark:number; lowestOwnedLevel:number; maxSlotElixirIncrease:1;
    measuredCombatCoverage:number;
    components: { name: string; score: number; weight: number }[];
    cardUsage: { id: number; name: string; count: number; roles: string[] }[];
  };
};
const clamp=(n:number)=>Math.max(0,Math.min(100,n));

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
  const analyzer=createReplacementAnalyzer(pool,mechanics,collection);
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
  const seeds=new Map<string,{cards:Card[];source:RankedDeck;
    method:"source-deck"|"observed-usage-fallback";
    assignments:AssignedReplacement[]|null}>();
  const add=(cs:Card[],source:RankedDeck,
    method:"source-deck"|"observed-usage-fallback"="source-deck")=>{
    if(!eligible(cs))return;
    // Even after beam search, validate that EVERY source slot has a
    // compatible owned replacement under the +1-per-slot elixir rule.
    const assignments=analyzer.assign(source.cards,cs);
    if(method==="source-deck"&&!assignments)return;
    const id=key(cs),previous=seeds.get(id);
    const quality=assignments?
      assignments.reduce((sum,row)=>sum+row.assessment.score,0)/8:0;
    const previousQuality=previous?.assignments?
      previous.assignments.reduce((sum,row)=>sum+row.assessment.score,0)/8:0;
    if(!previous || (method==="source-deck"&&previous.method!=="source-deck") ||
      (method===previous.method && quality>previousQuality))
      seeds.set(id,{cards:cs,source,method,assignments});
  };
  for(const source of meta.players) {
    if(source.rank%5===1)await yieldToUI();
    // Lock cards into a source role only if their function and cost qualify.
    // Process most-constrained locked cards first. If this source cannot
    // honor the user's locks, try another observed deck (then fallback).
    const remaining=[...source.cards];
    const sortedLocks=[...locked].sort((a,b)=>{
      const aFits=source.cards.filter(c=>analyzer.evaluate(c,a).eligible).length;
      const bFits=source.cards.filter(c=>analyzer.evaluate(c,b).eligible).length;
      return aFits-bFits || a.id-b.id;
    });
    let lockedCompatible=true;
    for(const fixed of sortedLocks) {
      const best=remaining.map((c,i)=>({i,match:analyzer.evaluate(c,fixed)}))
        .filter(row=>row.match.eligible)
        .sort((a,b)=>b.match.score-a.match.score||a.i-b.i)[0];
      if(!best){lockedCompatible=false;break;}
      remaining.splice(best.i,1);
    }
    if(!lockedCompatible)continue;
    let beam:{cards:Card[];value:number}[]=[{cards:[...locked],value:0}];
    for(const wanted of remaining) {
      const trials:{cards:Card[];value:number}[]=[];
      for(const state of beam) {
        const options=pool.filter(c=>!state.cards.some(x=>x.id===c.id))
          .map(c=>{
            const match=analyzer.evaluate(wanted,c);
            if(!match.eligible)return null;
            const synergy=state.cards.reduce((sum,x)=>
              sum+(pairs.get(pairKey(c.id,x.id))??0),0)/
              Math.max(1,state.cards.length);
            const roleCount=Math.max(0,...wanted.roles.map(r=>
              roleUsage.get(r)?.get(c.id)??0));
            const value=match.score*0.84+
              (usage.get(c.id)??0)/maxUsage*5+
              roleCount/maxUsage*4+
              synergy/maxUsage*7;
            return {card:c,value};
          })
          .filter((x):x is {card:Card;value:number}=>x!==null)
          .sort((a,b)=>b.value-a.value||a.card.id-b.card.id)
          .slice(0,12);
        for(const option of options) {
          const cards=[...state.cards,option.card];
          if(cards.reduce((sum,c)=>sum+(c.elixir??0),0)<=q.maxElixir*8)
            trials.push({cards,value:state.value+option.value});
        }
      }
      const unique=new Map<string,{cards:Card[];value:number}>();
      for(const trial of trials.sort((a,b)=>b.value-a.value||key(a.cards).localeCompare(key(b.cards))))
        if(!unique.has(key(trial.cards)))unique.set(key(trial.cards),trial);
      beam=[...unique.values()].slice(0,20);
      if(!beam.length)break;
    }
    for(const state of beam)add(state.cards,source);
    const exact=source.cards.map(c=>pool.find(p=>p.id===c.id));
    if(exact.every((c):c is Card=>!!c))add(exact,source);
  }
  // Independently seek a strong owned-level team using current observed
  // usage, pairings and role coverage. Include it even when direct pro-deck
  // adaptations exist, so an underleveled popular card never wins solely
  // due to matching a source deck. This is clearly NOT a pro player's deck.
  if(meta.players.length>0 && pool.length>=8) {
    let beam:{cards:Card[];value:number}[]=[{cards:[...locked],value:0}];
    for(let slot=locked.length;slot<8;slot++) {
      const trials:{cards:Card[];value:number}[]=[];
      for(const state of beam)for(const option of pool) {
        if(state.cards.some(c=>c.id===option.id))continue;
        const needsWin=!state.cards.some(c=>c.roles.includes("Win condition"));
        if(slot===7 && needsWin && !option.roles.includes("Win condition"))continue;
        const cards=[...state.cards,option];
        if(cards.reduce((sum,c)=>sum+(c.elixir??0),0)>q.maxElixir*8)continue;
        const newRoles=option.roles.filter(role=>!state.cards.some(c=>c.roles.includes(role))).length;
        const together=state.cards.reduce((sum,c)=>
          sum+(pairs.get(pairKey(c.id,option.id))??0),0);
        const value=state.value+
          (usage.get(option.id)??0)/maxUsage*36+
          (option.level??0)/highestLevel*34+
          Math.min(3,newRoles)*8+
          together/Math.max(1,state.cards.length*maxUsage)*14;
        trials.push({cards,value});
      }
      const distinct=new Map<string,{cards:Card[];value:number}>();
      for(const trial of trials.sort((a,b)=>b.value-a.value||
        key(a.cards).localeCompare(key(b.cards))))
        if(!distinct.has(key(trial.cards)))distinct.set(key(trial.cards),trial);
      beam=[...distinct.values()].slice(0,36);
      if(!beam.length)break;
      await yieldToUI();
    }
    for(const state of beam) {
      if(!eligible(state.cards))continue;
      const nearest=[...meta.players].sort((a,b)=>
        state.cards.filter(c=>b.cards.some(x=>x.id===c.id)).length-
        state.cards.filter(c=>a.cards.some(x=>x.id===c.id)).length)[0];
      add(state.cards,nearest,"observed-usage-fallback");
    }
  }
  const rows:LiveCandidate[]=[];
  for(const {cards,source,method,assignments} of seeds.values()) {
    if(rows.length%20===0)await yieldToUI();
    const strategy=assessStrategy(cards,mechanics,{...reasoning,
      focus:q.mode==="Fast cycle"&&reasoning.focus==="balanced"?"fast-attack":reasoning.focus});
    const targeted=strategy.scenarios.filter(s=>q.mode==="Maximum defense"?
      ["air","tanks","ground","swarms"].includes(s.id):q.mode==="Maximum offense"?s.id==="pressure":false);
    const tactical=targeted.length?strategy.score*0.5+
      targeted.reduce((sum,s)=>sum+s.score,0)/targeted.length*0.5:strategy.score;
    // Avoid average-only readiness hiding one critically underlevelled
    // defender. Benchmarks are relative to THIS player's eligible levels.
    const levelGaps=cards.map(c=>Math.max(0,analyzer.benchmark-(c.level??0)));
    const biggestGap=Math.max(0,...levelGaps);
    const readiness=clamp(100-
      levelGaps.reduce((sum,gap)=>sum+gap,0)/8*13-biggestGap*7);
    const matchQuality=assignments?
      assignments.reduce((sum,row)=>sum+row.assessment.score,0)/8:60;
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
      {name:"Observed deck combinations and role cohesion",score:cohesion,weight:20},
      {name:"Air, ground, tank, swarm and chosen-focus coverage",score:tactical,weight:25},
      {name:"Owned-card levels and weakest-card readiness",score:readiness,weight:40},
      {name:"Observed card frequency",score:popularity,weight:5},
      {name:"Verified functional / elixir slot replacements",score:matchQuality,weight:10},
    ];
    const substitutions=assignments?
      assignments.filter(row=>row.source.id!==row.replacement.id)
        .map(row=>({
          out:row.source.name,in:row.replacement.name,
          sourceLevel:row.assessment.sourceLevel,
          originalOwnedLevel:row.assessment.originalOwnedLevel,
          ownedLevel:row.assessment.ownedLevel,
          sourceElixir:row.assessment.sourceElixir,
          ownedElixir:row.assessment.ownedElixir,
          originalOwnedStats:row.assessment.originalOwnedStats,
          replacementStats:row.assessment.replacementStats,
          score:row.assessment.score,
          preserved:row.assessment.preserved,
          gained:row.assessment.gained,
          limitations:row.assessment.limitations,
          reason:row.assessment.reason,
        })):
      // An observed-usage fallback is NOT a direct one-to-one replacement,
      // so the UI must not claim precise source-slot substitutions.
      [];
    const formDifferences=source.cards.filter(c=>c.active!=="base"&&cards.some(x=>x.id===c.id))
      .map(c=>`${c.name}: source ${c.active}; recommendation uses base form. Special-form effects are not assumed.`);
    rows.push({cards,evaluation:evaluate(cards,q,mechanics),strategy,
      recommendationScore:Math.round(components.reduce((sum,c)=>sum+c.score*c.weight/100,0)*10)/10,
      evidence:{scanId:meta.id,observedCount:meta.sampleSize,requestedCount:meta.requestedCount,
        adaptationMethod:method,sourceRank:source.rank,sourceName:source.name,sourceTag:source.tag,
        sourceCards:source.cards,sharedCards:shared,
        exactBaseDeckAccounts:meta.players.filter(p=>key(p.cards)===key(cards)).length,
        substitutions,formDifferences,components,
        ownedLevelBenchmark:analyzer.benchmark,
        lowestOwnedLevel:Math.min(...cards.map(c=>c.level??0)),
        maxSlotElixirIncrease:1 as const,
        measuredCombatCoverage:strategy.cards.filter(c=>
          c.data.startsWith("Reference stats")).length,
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
