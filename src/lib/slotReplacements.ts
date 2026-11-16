import type { Card } from "./model";
import type { MechanicsCatalog, ResolvedMechanics } from "./mechanics";
import { resolveMechanics } from "./mechanics";

/**
 * A replacement is a *role-preserving* candidate for one observed slot.
 * The elixir limit is hard: replacement <= source + 1. The actual player's
 * card level and real known targets are used instead of the pro's level.
 *
 * A high match score is a recommendation heuristic, not a win probability.
 */
export type ReplacementAssessment = {
  eligible: boolean;
  score: number;
  sourceLevel: number | null;
  originalOwnedLevel: number | null;
  ownedLevel: number | null;
  sourceElixir: number | null;
  ownedElixir: number | null;
  originalOwnedStats: { hp:number|null; damage:number|null; dps:number|null };
  replacementStats: { hp:number|null; damage:number|null; dps:number|null };
  preserved: string[];
  gained: string[];
  limitations: string[];
  reason: string;
};
export type AssignedReplacement = {
  source: Card;
  replacement: Card;
  assessment: ReplacementAssessment;
};
type Capabilities = {
  air: boolean; ground: boolean; splash: boolean;
  win: boolean; tank: boolean; spell: boolean;
  building: boolean; cycle: boolean; miniTank: boolean;
  heavySpell:boolean; flying:boolean;
  kind: string;
  uncertain: boolean;
};
const clamp=(value:number)=>Math.max(0,Math.min(100,value));
const important=new Set(["Win condition","Air defense","Ground defense",
  "Tank killer","Swarm control","Mini tank","Building","Spell","Cycle"]);
const heavySpellCards=new Set(["Fireball","Poison","Lightning","Rocket","Earthquake","Void"]);
const flyingTroops=new Set(["Baby Dragon","Minions","Minion Horde",
  "Mega Minion","Electro Dragon","Inferno Dragon","Lava Hound","Balloon",
  "Flying Machine","Bats","Phoenix","Skeleton Dragons"]);
const has=(card:Card,role:string)=>card.roles.includes(role);
const exactLevel=(card:Card)=>card.level!==null&&Number.isInteger(card.level)&&card.level>0;

export function ownedLevelBenchmark(cards: Card[]):number {
  const levels=cards.filter(c=>c.owned&&!c.tower&&exactLevel(c))
    .map(c=>c.level!).sort((a,b)=>a-b);
  if(!levels.length)return 1;
  return levels[Math.floor((levels.length-1)*0.75)];
}
export function createReplacementAnalyzer(
  pool:Card[], mechanics:MechanicsCatalog|null|undefined,
  fullCollection:Card[]=pool,
) {
  const benchmark=ownedLevelBenchmark(pool);
  const originalOwned=new Map(fullCollection.filter(c=>c.owned)
    .map(c=>[c.id,c]));
  const profileCache=new Map<string,{caps:Capabilities;mechanics:ResolvedMechanics|null}>();
  const matchCache=new Map<string,ReplacementAssessment>();
  const profile=(card:Card)=>{
    const k=card.id+":"+(card.level??"?")+":"+card.active;
    const existing=profileCache.get(k);
    if(existing)return existing;
    const m=resolveMechanics(card,mechanics);
    const air=m?.targetsAir ?? has(card,"Air defense");
    const ground=m?.targetsGround ?? (
      has(card,"Ground defense")||has(card,"Tank killer")||
      has(card,"Win condition")||has(card,"Swarm control")||
      has(card,"Mini tank")||has(card,"Building"));
    const splash=m?.splashRadiusTiles!==null&&m?.splashRadiusTiles!==undefined
      ? m.splashRadiusTiles>0:has(card,"Swarm control");
    const spell=has(card,"Spell")||m?.kind==="Spell";
    const building=has(card,"Building")||m?.kind==="Building";
    const kind=spell?"Spell":building?"Building":
      m?.kind==="Troop"?"Troop":"Other";
    const result={caps:{
      air,ground,splash,kind,
      win:has(card,"Win condition"),
      tank:has(card,"Tank killer"),
      spell,building,cycle:has(card,"Cycle"),
      miniTank:has(card,"Mini tank"),
      heavySpell:heavySpellCards.has(card.name),
      flying:flyingTroops.has(card.name),
      uncertain:m===null || (m.targetsAir===null && m.targetsGround===null),
    },mechanics:m};
    profileCache.set(k,result);
    return result;
  };
  function evaluate(source:Card,target:Card):ReplacementAssessment{
    const k=[source.id,source.level??0,target.id,target.level??0].join(":");
    const cached=matchCache.get(k);
    if(cached)return cached;
    const sourceData=profile(source), targetData=profile(target);
    const original=originalOwned.get(source.id);
    const originalData=original ? profile(original) : null;
    const sourceCaps=sourceData.caps,targetCaps=targetData.caps;
    const blocked:string[]=[];
    const same=source.id===target.id;
    if(!target.owned || target.tower || !exactLevel(target))
      blocked.push("Card is unowned, a tower troop, or has no verified owned level");
    if(target.rarity.toLowerCase()==="champion")
      blocked.push("Champion form handling is not supported by this base-card optimizer");
    if(source.elixir===null||target.elixir===null||
      !Number.isFinite(source.elixir)||!Number.isFinite(target.elixir))
      blocked.push("Official elixir cost is unavailable");
    else if(target.elixir>source.elixir+1)
      blocked.push("Costs more than 1 elixir above the observed card");
    if(sourceCaps.kind!=="Other"&&targetCaps.kind!=="Other"&&
      sourceCaps.kind!==targetCaps.kind)
      blocked.push("Changes troop/building/spell deployment type");
    const required:[
      keyof Capabilities,string
    ][]=[
      ["win","tower-pressure win condition"],
      ["air","air targeting"],
      ["ground","ground targeting"],
      ["tank","tank-killing role"],
      ["splash","splash/swarm-control capability"],
      ["miniTank","mini-tank role"],
    ];
    for(const [flag,label] of required)
      if(sourceCaps[flag]===true && targetCaps[flag]!==true)
        blocked.push("Loses "+label);
    if(sourceCaps.spell&&!targetCaps.spell)
      blocked.push("Loses spell function");
    if(sourceCaps.building&&!targetCaps.building)
      blocked.push("Loses building function");
    if(sourceCaps.heavySpell&&!targetCaps.heavySpell)
      blocked.push("Loses the heavy-spell response");
    if(sourceCaps.flying&&!targetCaps.flying)
      blocked.push("Loses the flying troop's ground-attack immunity");
    if(!same && !source.roles.some(r=>important.has(r)) &&
      sourceCaps.kind==="Other")
      blocked.push("Not enough functional data to verify a replacement");
    const preserved=required.filter(([flag])=>
      sourceCaps[flag]===true&&targetCaps[flag]===true).map(([,label])=>label);
    if(sourceCaps.spell&&targetCaps.spell)preserved.push("spell");
    if(sourceCaps.building&&targetCaps.building)preserved.push("building");
    if(sourceCaps.heavySpell&&targetCaps.heavySpell)preserved.push("heavy-spell answer");
    if(sourceCaps.flying&&targetCaps.flying)preserved.push("flying troop role");
    const gained:string[]=[];
    if(!sourceCaps.splash&&targetCaps.splash)
      gained.push("adds splash/swarm-control utility");
    if(!sourceCaps.air&&targetCaps.air)
      gained.push("adds air defense");
    if(!sourceCaps.flying&&targetCaps.flying)
      gained.push("adds a flying option");
    if(!sourceCaps.tank&&targetCaps.tank)
      gained.push("adds a tank-killing role");
    if(source.elixir!==null&&target.elixir!==null&&target.elixir<source.elixir)
      gained.push("reduces elixir cost by "+(source.elixir-target.elixir));
    if(source.level!==null&&target.level!==null&&target.level>source.level)
      gained.push("owned level is "+(target.level-source.level)+" above the observed card's played level");
    const limitations:string[]=[];
    if(sourceCaps.uncertain||targetCaps.uncertain)
      limitations.push("Some attack/target properties use editorial roles because current combat fields are missing");
    if(source.level===null)
      limitations.push("Observed player's card level was not provided");
    if(!original)
      limitations.push("The observed card is not in your owned collection");
    else if(original.level===null)
      limitations.push("The level of your copy of the observed card is unavailable");
    else if(original.id!==target.id && target.level!==null &&
      original.level<target.level)
      gained.push("Your replacement is "+(target.level-original.level)+
        " levels above your owned "+source.name);
    if(targetData.mechanics?.hitpoints===null||targetData.mechanics?.damage===null)
      limitations.push("Actual-level HP or damage data is incomplete");
    const sourceRoles=source.roles.filter(r=>important.has(r));
    const overlap=sourceRoles.length===0?0.65:
      sourceRoles.filter(role=>target.roles.includes(role)).length/sourceRoles.length;
    const fidelity=sourceCaps.kind===targetCaps.kind?0.7+overlap*0.3:
      0.55+overlap*0.3;
    const currentLevel=target.level??0;
    const relativeGap=Math.max(0,benchmark-currentLevel);
    const levelQuality=clamp(100-relativeGap*18);
    const globalGap=source.level===null?0:
      Math.max(0,source.level-currentLevel-2);
    const costBonus=source.elixir===null||target.elixir===null?0:
      target.elixir<source.elixir?10:target.elixir===source.elixir?7:2;
    // Published HP/damage/DPS at the player's actual owned levels are
    // optional comparison evidence, not estimates generated from level.
    // Comparing groups or spells as if they were individual DPS units would
    // be misleading, so add only a small effectiveness adjustment to two
    // comparable troop records with known stats.
    const known=targetData.mechanics;
    const origin=originalData?.mechanics;
    const measured=known?.hitpoints!==null&&known?.hitpoints!==undefined
      &&known?.damage!==null&&known?.damage!==undefined?4:
      known?.damage!==null&&known?.damage!==undefined?2:0;
    const comparable=origin?.kind==="Troop"&&known?.kind==="Troop" &&
      (original?.elixir??0)>0 && (target.elixir??0)>0 &&
      original?.id!==target.id;
    const dpsDifference=comparable&&origin?.dps!==null&&origin?.dps!==undefined&&
      known?.dps!==null&&known?.dps!==undefined
      ? known.dps/(target.elixir??1) -
        origin.dps/(original?.elixir??1) : null;
    const measuredAdvantage=dpsDifference===null?0:
      Math.max(-5,Math.min(5,dpsDifference/30));
    if(dpsDifference!==null)limitations.push(
      "DPS comparison is per elixir from available community tables; it does not simulate troop count, splash targets or battle outcomes");
    const value=clamp(fidelity*45+levelQuality*0.42+
      costBonus+measured+measuredAdvantage-
      Math.min(18,globalGap*3)+
      (!sourceCaps.splash&&targetCaps.splash?3:0));
    const eligible=blocked.length===0;
    const reason=eligible
      ? (same?"Retain owned "+target.name:"Replace "+source.name+" with "+target.name)+
        ": Lv "+(source.level??"?")+" observed → Lv "+target.level+
        " owned; "+source.elixir+" → "+target.elixir+
        " elixir; "+(preserved.join(", ")||"same deployment function")+
        " preserved."
      : blocked.join("; ")+".";
    const answer={
      eligible,score:eligible?Math.round(value*10)/10:0,
      sourceLevel:source.level,originalOwnedLevel:original?.level??null,
      ownedLevel:target.level,
      sourceElixir:source.elixir,ownedElixir:target.elixir,
      originalOwnedStats:{
        hp:origin?.hitpoints??null,damage:origin?.damage??null,
        dps:origin?.dps??null,
      },
      replacementStats:{
        hp:known?.hitpoints??null,damage:known?.damage??null,
        dps:known?.dps??null,
      },
      preserved,gained,limitations,reason,
    };
    matchCache.set(k,answer);
    return answer;
  }
  /** Optimal *slot assignment* for the provided eight cards, not a claim
   * that the resulting deck is globally optimal. Bitmask DP considers every
   * valid mapping of eight source roles to the eight owned replacements. */
  function assign(source:Card[],targets:Card[]):AssignedReplacement[]|null{
    if(source.length!==8||targets.length!==8)return null;
    const cache=new Map<number,{score:number;rows:AssignedReplacement[]}|null>();
    const go=(mask:number):{score:number;rows:AssignedReplacement[]}|null=>{
      const index=Array.from({length:8},(_,i)=>i).filter(i=>(mask&(1<<i))!==0).length;
      if(index===8)return {score:0,rows:[]};
      if(cache.has(mask))return cache.get(mask)??null;
      let best:{score:number;rows:AssignedReplacement[]}|null=null;
      for(let j=0;j<8;j++){
        if(mask&(1<<j))continue;
        const assessment=evaluate(source[index],targets[j]);
        if(!assessment.eligible)continue;
        const tail=go(mask|(1<<j));
        if(!tail)continue;
        const score=assessment.score+tail.score;
        if(!best||score>best.score)
          best={score,rows:[{source:source[index],replacement:targets[j],
            assessment},...tail.rows]};
      }
      cache.set(mask,best);
      return best;
    };
    return go(0)?.rows??null;
  }
  return {evaluate,assign,benchmark};
}
