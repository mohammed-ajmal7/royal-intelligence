import type { Battle, Card } from "./model";
import { resolveMechanics, type MechanicsCatalog } from "./mechanics";

/**
 * Explainable strategy evaluation. These are editorial matchup heuristics, NOT
 * a battle simulator, training data, actual win probability or real LLM.
 * Missing combat values never count as a measured zero.
 */
export type StrategyFocus = "balanced" | "air" | "tank" | "swarm" | "cycle" | "royal-giant";
export const focusChoices: { value:StrategyFocus; label:string; explanation:string }[] = [
  {value:"balanced",label:"Balanced: defend + attack",explanation:"Cover all major threats"},
  {value:"air",label:"Counter heavy air",explanation:"Prioritize air pressure and flying tanks"},
  {value:"tank",label:"Stop giant tanks",explanation:"Prioritize tank killers and supporting defense"},
  {value:"swarm",label:"Punish swarms and bait",explanation:"Prioritize splash and spell answers"},
  {value:"cycle",label:"Defend with low elixir",explanation:"Faster rotations without losing core counters"},
  {value:"royal-giant",label:"Build around Royal Giant",explanation:"Preserve RG pressure and reliable defense"},
];
export type ThreatId = "air" | "tanks" | "swarms" | "ground" | "pressure" | "rotation";
export type Scenario = {
  id:ThreatId; label:string; score:number; status:"strong"|"watch"|"weak";
  defenders:string[]; explanation:string; caution:string|null;
};
export type BattleSignal = {
  id:"air"|"tanks"|"swarms"; name:string; seen:number; losses:number; wins:number;
};
export type StrategyReport = {
  score:number; focus:StrategyFocus; headline:string; avgElixir:number|null; fourCardCycle:number|null;
  scenarios:Scenario[]; strengths:string[]; risks:string[]; synergies:string[];
  cards:{id:number;name:string;why:string;data:string}[];
  limitations:string[];
  battleSignals:BattleSignal[];
};
export type ReasoningContext = {
  focus?:StrategyFocus;
  battles?:Battle[];
};
const score100=(n:number)=>Math.round(Math.max(0,Math.min(100,n))*10)/10;
const unique=(values:string[])=>[...new Set(values)];
const names=(cards:Card[])=>cards.map(c=>c.name);
const has=(deck:Card[],name:string)=>deck.some(c=>c.name===name);
const role=(c:Card,r:string)=>c.roles.includes(r);
const heavySpell=new Set(["Fireball","Poison","Lightning","Rocket","Earthquake","Void"]);
const smallSpell=new Set(["Arrows","Zap","The Log","Giant Snowball","Barbarian Barrel","Royal Delivery"]);
const rangedAir=(c:Card,mechanics?:MechanicsCatalog|null)=>{
  const m=resolveMechanics(c,mechanics);
  return m?.targetsAir===true ||
    (m?.targetsAir !== false && role(c,"Air defense"));
};
const reliableAir=(c:Card,mechanics?:MechanicsCatalog|null)=>
  rangedAir(c,mechanics) && !role(c,"Cycle") &&
  !smallSpell.has(c.name) && !heavySpell.has(c.name);
const primaryWin=(deck:Card[])=>deck.filter(c=>role(c,"Win condition"));
const count=(a:Card[],p:(c:Card)=>boolean)=>a.filter(p).length;
const english=(a:string[])=>a.length?a.join(", "):"none identified";
const simpleGameRole=(c:Card)=>{
  const parts=[];
  if(role(c,"Win condition"))parts.push("main tower pressure");
  if(role(c,"Tank killer"))parts.push("high-health threat removal");
  if(role(c,"Air defense")&&!role(c,"Cycle"))parts.push("sustained anti-air");
  if(role(c,"Swarm control"))parts.push("splash or swarm clearance");
  if(role(c,"Ground defense"))parts.push("ground defense");
  if(role(c,"Building"))parts.push("pulling/holding enemy pushes");
  if(role(c,"Cycle"))parts.push("cheap rotations or control");
  if(smallSpell.has(c.name))parts.push("fast spell utility");
  if(heavySpell.has(c.name))parts.push("medium/heavy spell pressure");
  return parts.slice(0,3);
};
/** Public battle results identify card presence, not placement or why a player lost. */
export function observedThreats(battles:Battle[]):BattleSignal[] {
  const oneVsOne=battles.filter(b=>b.team.length===1 && b.opponent.length===1 &&
    (b.outcome==="win"||b.outcome==="loss")).slice(0,50);
  const definitions:{id:BattleSignal["id"];name:string;match:(c:Card)=>boolean}[]=[
    {id:"air",name:"Air-heavy threats",match:c=>["Balloon","Lava Hound","Inferno Dragon","Electro Dragon","Baby Dragon","Phoenix","Minion Horde","Minions","Flying Machine","Skeleton Dragons"].includes(c.name)},
    {id:"tanks",name:"Large ground pushes",match:c=>["Golem","Giant","Royal Giant","Goblin Giant","Electro Giant","Mega Knight","P.E.K.K.A","Giant Skeleton"].includes(c.name)},
    {id:"swarms",name:"Swarm or bait pressure",match:c=>["Goblin Barrel","Skeleton Army","Goblin Gang","Minion Horde","Bats","Royal Recruits","Graveyard","Minions"].includes(c.name)},
  ];
  return definitions.map(d=>{
    const matches=oneVsOne.filter(b=>b.opponent.some(p=>p.cards.some(d.match)));
    return {id:d.id,name:d.name,seen:matches.length,
      losses:matches.filter(b=>b.outcome==="loss").length,
      wins:matches.filter(b=>b.outcome==="win").length};
  });
}
export function assessStrategy(
  deck:Card[],mechanics?:MechanicsCatalog|null,context:ReasoningContext={},
):StrategyReport {
  const focus=context.focus??"balanced";
  const avg=deck.length===8&&deck.every(c=>c.elixir!==null)
    ? deck.reduce((sum,c)=>sum+(c.elixir??0),0)/8:null;
  const four=deck.length>=4&&deck.every(c=>c.elixir!==null)
    ? [...deck].sort((a,b)=>(a.elixir??0)-(b.elixir??0))
      .slice(0,4).reduce((sum,c)=>sum+(c.elixir??0),0):null;
  const air=deck.filter(c=>reliableAir(c,mechanics));
  const antiAirBuilding=air.filter(c=>role(c,"Building"));
  const tank=deck.filter(c=>role(c,"Tank killer"));
  const ground=deck.filter(c=>role(c,"Ground defense")||role(c,"Building"));
  const splash=deck.filter(c=>role(c,"Swarm control")&&!smallSpell.has(c.name));
  const cheap=deck.filter(c=>smallSpell.has(c.name));
  const big=deck.filter(c=>heavySpell.has(c.name));
  const wins=primaryWin(deck);
  const cycle=deck.filter(c=>role(c,"Cycle"));
  const warnings:string[]=[];
  const synergies:string[]=[];
  const scenarios:Scenario[]=[];
  const add=(id:ThreatId,label:string,value:number,defenders:Card[],explanation:string,caution:string|null=null)=>{
    const score=score100(value);
    scenarios.push({id,label,score,status:score>=72?"strong":score>=48?"watch":"weak",
      defenders:unique(names(defenders)),explanation,caution});
  };
  const airValue=score100(Math.min(2,air.length)*28+
    (antiAirBuilding.length?18:0)+(air.filter(c=>!role(c,"Building")).length>=2?19:0)+
    (tank.some(c=>rangedAir(c,mechanics))?7:0));
  add("air","Heavy air attacks",airValue,air,
    air.length?english(names(air))+" provide recorded or role-based anti-air coverage.":
      "No reliable sustained anti-air defender was identified.",
    air.length<2?"A single answer can be distracted, cycled out or removed.":null);
  add("tanks","Giant tanks / big pushes",Math.min(tank.length,2)*35+
      (ground.some(c=>role(c,"Building"))?20:0)+
      (air.some(c=>role(c,"Air defense"))?10:0),
    unique([...tank,...ground.filter(c=>role(c,"Building"))].map(c=>c.id))
      .map(id=>deck.find(c=>c.id===id)!).filter(Boolean),
    tank.length?english(names(tank))+" can threaten high-health attackers.":
      "Dedicated tank-killing pressure is missing.",
    tank.length===1 && tank[0].name==="Inferno Tower"
      ?"Inferno Tower is a strong conditional counter but resets/distraction can disrupt it.":null);
  add("swarms","Swarms / bait",Math.min(splash.length,2)*26+
    (cheap.length?28:0)+(big.length?7:0)+
    (splash.some(c=>rangedAir(c,mechanics))?13:0),
    [...splash,...cheap],splash.length||cheap.length?
      "Splash support and fast spell coverage are available.":"Swarm cleanup is missing.",
    !cheap.length?"No low-cost spell to answer bait efficiently.":null);
  add("ground","Ground pressure / win conditions",
    Math.min(ground.length,2)*27+(tank.length?22:0)+
      (ground.some(c=>role(c,"Building"))?18:0),
    unique([...ground,...tank].map(c=>c.id))
      .map(id=>deck.find(c=>c.id===id)!).filter(Boolean),
    "Ground defenders and building pulls are evaluated separately from damage-per-hit.",
    ground.length===0?"No identifiable ground defense.":null);
  const sameWin= wins.length===1?48:wins.length===2?37:wins.length?26:0;
  const pushSupport=has(deck,"Royal Giant")?
    count(deck,c=>["Baby Dragon","Bomber","Wizard","Musketeer","Fireball","Arrows","Phoenix"].includes(c.name)):
    count(deck,c=>role(c,"Swarm control")||role(c,"Air defense"));
  add("pressure","Tower pressure / counterpush",
    sameWin+Math.min(pushSupport,2)*17+(cheap.length?9:0)+(big.length?9:0),
    [...wins,...deck.filter(c=>role(c,"Swarm control")||heavySpell.has(c.name))],
    wins.length?"Main win condition: "+english(names(wins))+
      ". Support availability matters more than total raw DPS.":
      "No identified repeatable tower-damage win condition.",
    wins.length>2?"Too many win conditions can dilute defensive options.":null);
  const rotation=avg===null||four===null?null:
    score100(100-Math.max(0,avg-3.3)*22-Math.max(0,four-10)*6+
      (cycle.length?7:0));
  add("rotation","Elixir / four-card rotation",rotation??35,cycle,
    avg!==null&&four!==null?"Average "+avg.toFixed(2)+
      " elixir; four cheapest cards cost "+four+" elixir total.":
      "Incomplete elixir data; rotation cannot be reliably calculated.",
    avg!==null&&avg>4.2?"High average cost can make repeated defense difficult.":null);
  if(has(deck,"Royal Giant")){
    if(splash.length>0)synergies.push("Royal Giant benefits from "+english(names(splash.slice(0,2)))+" clearing support troops and swarms.");
    if(cheap.length)synergies.push(english(names(cheap))+" can clear or slow small defenders during a Royal Giant push.");
    if(tank.length)synergies.push(english(names(tank))+" can defend high-health threats while Royal Giant remains the win condition.");
    if(!big.length)warnings.push("No heavy spell. This is a trade-off, not an automatic failure for Royal Giant control.");
  }
  if(air.length>=2 && antiAirBuilding.length>0)
    synergies.push("Air-targeting building plus another anti-air defender gives two different response types.");
  if(splash.length>=3 && splash.filter(c=>(c.elixir??0)>=4).length>=2)
    warnings.push("Several expensive splash supporters overlap. Consider a cheaper single-target defender or spell.");
  if(antiAirBuilding.some(c=>c.name==="Inferno Tower") &&
     !tank.some(c=>c.name!=="Inferno Tower"))
    warnings.push("Inferno Tower is the only major tank killer; resets or distractions can expose the defense.");
  if(cheap.length===0)warnings.push("No cheap spell. Bait and low-HP swarm answers may be inefficient.");
  if(air.length<2)warnings.push("Fewer than two independent sustained air defenders.");
  if(!wins.length)warnings.push("No recognized repeatable tower-damage win condition.");
  const weightByFocus:Record<StrategyFocus,Record<ThreatId,number>>={
    balanced:{air:24,tanks:20,swarms:17,ground:15,pressure:14,rotation:10},
    air:{air:44,tanks:17,swarms:11,ground:11,pressure:10,rotation:7},
    tank:{air:16,tanks:44,swarms:10,ground:15,pressure:9,rotation:6},
    swarm:{air:16,tanks:14,swarms:43,ground:11,pressure:9,rotation:7},
    cycle:{air:16,tanks:14,swarms:13,ground:11,pressure:11,rotation:35},
    "royal-giant":{air:23,tanks:21,swarms:14,ground:13,pressure:22,rotation:7},
  };
  const weights=weightByFocus[focus];
  let total=scenarios.reduce((sum,s)=>sum+s.score*weights[s.id]/100,0);
  if(splash.length>=3 && splash.filter(c=>(c.elixir??0)>=4).length>=2) total-=7;
  if(wins.length!==1) total-=Math.min(15,Math.abs(wins.length-1)*7);
  if(focus==="royal-giant"&&!has(deck,"Royal Giant"))total-=30;
  if(air.length===0)total-=10;
  const strengths=scenarios.filter(s=>s.status==="strong").map(s=>s.label+": "+s.explanation);
  const risks=unique([...scenarios.filter(s=>s.status==="weak").map(s=>s.label+
    ": "+(s.caution??s.explanation)),...warnings]).slice(0,7);
  const cards=deck.map(c=>{
    const m=resolveMechanics(c,mechanics);
    const known=m?.hitpoints!==null&&m?.hitpoints!==undefined ||
      m?.damage!==null&&m?.damage!==undefined;
    const labels=simpleGameRole(c);
    const data= known ? "Reference stats at Lv "+(c.level??"?")+
      (m?.hitpoints!==null&&m?.hitpoints!==undefined?", "+m.hitpoints+" HP":"")+
      (m?.damage!==null&&m?.damage!==undefined?", "+m.damage+" hit damage":"")+
      " (community source; patch may differ)":
      "Numerical combat data incomplete; role classification is editorial.";
    let why=labels.length?labels.join(", "):"No established combat role in the current classification.";
    if(c.name==="Inferno Tower")why+="; resets and distractions are a specific vulnerability";
    if(c.name==="Ice Spirit")why+="; one-use utility, not a sustained air defender";
    if(c.name==="Royal Giant")why+="; support and opponent building responses determine tower damage";
    return {id:c.id,name:c.name,why,data};
  });
  const signals=observedThreats(context.battles??[]);
  const signalCount=signals.reduce((sum,s)=>sum+s.seen,0);
  const limitations=[
    "Threat coverage is estimated from known roles and available static stats; not a battle simulation or win rate.",
    "Battle logs reveal cards and outcomes, not placement or timing mistakes.",
    "Evolution/hero availability does not prove that form is equipped or active in the recommended deck.",
    "Community combat tables can lag balance changes and lack conditional abilities.",
    ...(signalCount<4?["Insufficient observed matchup evidence to infer your personal biggest weakness."]:[]),
  ];
  const ranked=[...scenarios].sort((a,b)=>a.score-b.score);
  const headline=ranked.length?"Best identified strength: "+
    (ranked.at(-1)?.label??"none")+". Most exposed scenario: "+
    (ranked[0]?.label??"none")+".":"No scenario assessment available.";
  return {score:score100(total),focus,headline,avgElixir:avg,fourCardCycle:four,
    scenarios,strengths,risks,synergies,cards,limitations,battleSignals:signals};
}
export type SwapExplanation={out:string[];added:string[];gains:string[];costs:string[]};
export function compareStrategy(
  current:Card[],candidate:Card[],mechanics?:MechanicsCatalog|null,
  context:ReasoningContext={},
):SwapExplanation {
  const removed=current.filter(c=>!candidate.some(d=>d.id===c.id));
  const added=candidate.filter(c=>!current.some(d=>d.id===c.id));
  const before=assessStrategy(current,mechanics,context);
  const after=assessStrategy(candidate,mechanics,context);
  const gains:string[]=[],costs:string[]=[];
  for(const next of after.scenarios){
    const previous=before.scenarios.find(s=>s.id===next.id);
    if(!previous)continue;
    const delta=next.score-previous.score;
    if(delta>=8)gains.push(next.label+" coverage improves by "+delta.toFixed(0)+" heuristic points.");
    if(delta<=-8)costs.push(next.label+" coverage declines by "+Math.abs(delta).toFixed(0)+" heuristic points.");
  }
  if(after.avgElixir!==null&&before.avgElixir!==null){
    const difference=after.avgElixir-before.avgElixir;
    if(difference>=0.35)costs.push("Average elixir becomes "+difference.toFixed(2)+" heavier.");
    if(difference<=-0.35)gains.push("Average elixir falls by "+Math.abs(difference).toFixed(2)+".");
  }
  return {out:names(removed),added:names(added),gains,costs};
}
