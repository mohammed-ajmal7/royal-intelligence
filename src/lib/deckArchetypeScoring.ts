import type { Battle, Card } from "./model";
import type { MechanicsCatalog } from "./mechanics";
import { resolveMechanics } from "./mechanics";
import { observedThreats, type StrategyFocus } from "./deckStrategy";

export type ArchetypeFactor = {
  id:string;
  label:string;
  score:number;
  weight:number;
  evidence:string;
};
export type DeckPlaystyleAnalysis = {
  focus:StrategyFocus;
  archetype:string;
  score:number;
  summary:string;
  factors:ArchetypeFactor[];
  strengths:string[];
  tradeoffs:string[];
  personalThreats:{name:string;seen:number;losses:number;response:string}[];
};

const FAST_WINS=new Set([
  "Hog Rider","Miner","Wall Breakers","Mortar","Goblin Drill",
  "Royal Hogs","Ram Rider","Battle Ram","Skeleton Barrel",
]);
const HEAVY_WINS=new Set([
  "Giant","Golem","Goblin Giant","Electro Giant","Elixir Golem",
  "Lava Hound","Giant Skeleton","Minion Giant","Royal Giant",
]);
const BAIT_WINS=new Set([
  "Goblin Barrel","Skeleton Barrel","Goblin Drill","Wall Breakers",
]);
const BRIDGE_THREATS=new Set([
  "Battle Ram","Ram Rider","Bandit","Royal Ghost","Dark Prince",
  "P.E.K.K.A","Wall Breakers","Magic Archer","Golden Knight",
  "Miner","Mega Knight","Prince","Suspicious Bush",
]);
const BAIT_CARDS=new Set([
  "Goblin Barrel","Skeleton Barrel","Princess","Dart Goblin","Goblin Gang",
  "Skeleton Army","Guards","Goblins","Bats","Minions","Minion Horde",
  "Wall Breakers","Goblin Drill","Suspicious Bush","Firecracker",
]);
const clamp=(value:number)=>Math.max(0,Math.min(100,value));
const role=(card:Card,name:string)=>card.roles.includes(name);
const count=(cards:Card[],predicate:(card:Card)=>boolean)=>cards.filter(predicate).length;
const average=(cards:Card[])=>cards.length&&cards.every(card=>card.elixir!==null)
  ?cards.reduce((sum,card)=>sum+(card.elixir??0),0)/cards.length:null;
const labelFor=(focus:StrategyFocus,deck:Card[])=>{
  const win=deck.find(card=>role(card,"Win condition"));
  switch(focus){
    case "fast-attack":return (win?.name??"Fast")+(win?" Cycle":" Fast Cycle");
    case "heavy-push":return (win?.name??"Heavy")+(win?" Beatdown":" Beatdown");
    case "spell-bait":return "Spell Bait";
    case "bridge-pressure":return "Bridge Pressure";
    case "defend-counterattack":return "Defensive Control";
    case "royal-giant":return "Royal Giant Control";
    default:return "Balanced Control";
  }
};
function countFit(actual:number,target:number,minimum=0){
  if(actual>=target)return 100;
  if(actual<minimum)return clamp(actual/Math.max(1,minimum)*55);
  return clamp(55+(actual-minimum+1)/(target-minimum)*45);
}
function rangeFit(value:number|null,low:number,high:number,tolerance:number){
  if(value===null)return 28;
  if(value>=low&&value<=high)return 100;
  const distance=value<low?low-value:value-high;
  return clamp(100-distance/tolerance*100);
}
function makeFactor(id:string,label:string,score:number,weight:number,evidence:string):ArchetypeFactor{
  return {id,label,score:Math.round(clamp(score)*10)/10,weight,evidence};
}
function deckSignals(deck:Card[],mechanics:MechanicsCatalog|null){
  const win=deck.filter(card=>role(card,"Win condition"));
  const air=deck.filter(card=>{
    const known=resolveMechanics(card,mechanics);
    return role(card,"Air defense")&&!role(card,"Cycle")&&
      !role(card,"Spell")&&known?.targetsAir!==false;
  });
  const tank=count(deck,card=>role(card,"Tank killer"));
  const buildings=count(deck,card=>role(card,"Building"));
  const ground=count(deck,card=>role(card,"Ground defense"));
  const splash=count(deck,card=>role(card,"Swarm control")&&!role(card,"Spell"));
  const small=count(deck,card=>role(card,"Small spell"));
  const heavy=count(deck,card=>role(card,"Heavy spell"));
  const cycle=count(deck,card=>role(card,"Cycle")&&(card.elixir??99)<=3);
  const bait=count(deck,card=>BAIT_CARDS.has(card.name));
  const pressure=count(deck,card=>role(card,"Pressure")||BRIDGE_THREATS.has(card.name));
  const support=count(deck,card=>role(card,"Support")||
    (role(card,"Air defense")&&(card.elixir??0)>=4)||
    (role(card,"Swarm control")&&!role(card,"Spell")));
  return {win,air,tank,buildings,ground,splash,small,heavy,cycle,bait,pressure,support};
}
function personalEvidence(deck:Card[],battles:Battle[],mechanics:MechanicsCatalog|null){
  const signals=observedThreats(battles).filter(signal=>signal.seen>=5);
  const counts=deckSignals(deck,mechanics);
  return signals.map(signal=>{
    const lossRate=signal.losses/Math.max(1,signal.losses+signal.wins);
    const vulnerable=signal.id==="air"?counts.air.length<2:
      signal.id==="tanks"?counts.tank===0&&counts.buildings===0:
      counts.splash===0&&counts.small===0;
    const response=signal.id==="air"
      ?(counts.air.length>=2?"Two or more anti-air answers are included.":"Add a second independent anti-air defender.")
      :signal.id==="tanks"
        ?(counts.tank+counts.buildings>0?"Dedicated tank defence is included.":"No dedicated tank answer is present.")
        :(counts.splash+counts.small>0?"Splash or small-spell control is included.":"Swarm/bait control is thin.");
    return {name:signal.name,seen:signal.seen,losses:signal.losses,
      response,priority:lossRate>=.5&&vulnerable?1:0};
  });
}

export function analyseDeckPlaystyle(
  deck:Card[],
  focus:StrategyFocus,
  mechanics:MechanicsCatalog|null=null,
  battles:Battle[]=[],
):DeckPlaystyleAnalysis{
  const stats=deckSignals(deck,mechanics);
  const avg=average(deck);
  const winCount=stats.win.length;
  const fastWin=count(deck,card=>FAST_WINS.has(card.name));
  const heavyWin=count(deck,card=>HEAVY_WINS.has(card.name));
  const baitWin=count(deck,card=>BAIT_WINS.has(card.name));
  const personal=personalEvidence(deck,battles,mechanics);
  const factors:ArchetypeFactor[]=[];
  const add=(id:string,label:string,score:number,weight:number,evidence:string)=>
    factors.push(makeFactor(id,label,score,weight,evidence));
  const defence=countFit(stats.air.length,2)+
    countFit(stats.tank+stats.buildings,2)+
    countFit(stats.ground,1);
  const spellCoverage=stats.small>0&&stats.heavy>0?100:
    stats.small>0||stats.heavy>0?58:18;
  switch(focus){
    case "fast-attack":
      add("fast-win","Fast win condition",fastWin?100:winCount?32:0,25,
        fastWin?deck.filter(c=>FAST_WINS.has(c.name)).map(c=>c.name).join(", "):
        "No classic fast-rotation win condition found.");
      add("cycle","Cycle speed",rangeFit(avg,2.6,3.5,1.8),25,
        avg===null?"Average elixir is unknown.":"Average elixir "+avg.toFixed(2)+".");
      add("cheap-cards","Cheap rotation cards",countFit(stats.cycle,3,1),20,
        stats.cycle+" cards cost 3 elixir or less and carry the Cycle role.");
      add("pressure","Repeatable pressure",countFit(count(deck,c=>
        role(c,"Pressure")||FAST_WINS.has(c.name)),3,1),15,
        "Counts cards classified for pressure or a fast win condition.");
      add("defence","Defensive floor",Math.min(100,defence/3),15,
        "Checks anti-air, tank answers and ground defence so fast attacks do not leave the deck helpless.");
      break;
    case "heavy-push":
      add("heavy-win","Beatdown win condition",heavyWin?100:
        winCount&&stats.win.some(c=>(c.elixir??0)>=5)?66:18,25,
        heavyWin?deck.filter(c=>HEAVY_WINS.has(c.name)).map(c=>c.name).join(", "):
        "No dedicated high-investment beatdown win condition found.");
      add("support","Push support",countFit(stats.support,3,1),25,
        stats.support+" support / splash / ranged cards can accompany a large commitment.");
      add("cost","Beatdown cost profile",rangeFit(avg,4,5.2,1.8),20,
        avg===null?"Average elixir is unknown.":"Average elixir "+avg.toFixed(2)+".");
      add("spell","Push protection",stats.heavy?85:stats.small?48:15,15,
        "Checks whether the push has spell support or at least a low-cost control spell.");
      add("air","Air coverage",countFit(stats.air.length,2,0),15,
        stats.air.length+" sustained air-targeting defenders.");
      break;
    case "spell-bait":
      add("bait-win","Bait win condition",baitWin?100:winCount?35:0,25,
        baitWin?deck.filter(c=>BAIT_WINS.has(c.name)).map(c=>c.name).join(", "):
        "No barrel / drill / bait-style win condition is present.");
      add("bait-density","Independent bait threats",countFit(stats.bait,4,1),30,
        stats.bait+" cards can pressure or force a small-spell response.");
      add("spell-punish","Spell-punish plan",stats.heavy?88:stats.small?56:12,15,
        "Checks for a spell or control answer to punish the opponent's defensive rotation.");
      add("defence","Defensive coverage",Math.min(100,defence/3),15,
        "Checks air, tank and ground responses behind the bait plan.");
      add("cost","Bait rotation cost",rangeFit(avg,3,4,1.7),15,
        avg===null?"Average elixir is unknown.":"Average elixir "+avg.toFixed(2)+".");
      break;
    case "bridge-pressure":
      add("bridge-win","Bridge-pressure win condition",
        count(deck,c=>["Battle Ram","Ram Rider","Wall Breakers","Royal Hogs","Hog Rider"].includes(c.name))?100:
        winCount?36:0,25,
        "Prioritises Battle Ram, Ram Rider, Wall Breakers, Royal Hogs or Hog Rider pressure.");
      add("pressure","Pressure units",countFit(stats.pressure,3,1),25,
        stats.pressure+" pressure-oriented cards create threats from more than one lane.");
      add("tempo","Bridge-tempo cost",rangeFit(avg,3.2,4.4,1.8),15,
        avg===null?"Average elixir is unknown.":"Average elixir "+avg.toFixed(2)+".");
      add("air","Air coverage",countFit(stats.air.length,2,0),15,
        stats.air.length+" sustained anti-air defenders.");
      add("defence","Defence behind pressure",countFit(stats.tank+stats.buildings+stats.ground,3,1),20,
        "Checks that bridge pressure does not sacrifice all tank and ground defence.");
      break;
    case "defend-counterattack":
      add("hard-counters","Tank and building answers",
        countFit(stats.tank+stats.buildings,2,1),25,
        stats.tank+" tank killers and "+stats.buildings+" defensive buildings.");
      add("air","Independent anti-air answers",countFit(stats.air.length,2,0),20,
        stats.air.length+" sustained anti-air defenders.");
      add("ground","Ground defence depth",countFit(stats.ground,2,1),15,
        stats.ground+" ground-defence cards.");
      add("spells","Spell control",spellCoverage,15,
        "Checks for both a small spell and a heavier spell option.");
      add("counterpush","Counterpush win condition",winCount===1?88:
        winCount>1?52:15,15,
        winCount===1?"One primary tower-damage plan.":"Deck has "+winCount+" recognised win conditions.");
      add("tempo","Defensive rotation cost",rangeFit(avg,3,4.1,1.8),10,
        avg===null?"Average elixir is unknown.":"Average elixir "+avg.toFixed(2)+".");
      break;
    case "royal-giant":
      add("rg","Royal Giant core",count(deck,c=>c.name==="Royal Giant")?100:0,35,
        hasCard(deck,"Royal Giant")?"Royal Giant is included.":"Royal Giant focus requires Royal Giant.");
      add("air","Air coverage",countFit(stats.air.length,2,0),20,
        stats.air.length+" sustained air defenders.");
      add("defence","Counterpush defence",Math.min(100,defence/3),20,
        "Checks tank, air and ground defence to protect Royal Giant counterpushes.");
      add("spell","Spell support",spellCoverage,15,
        "Checks spell answers for swarms and support troops.");
      add("cost","Royal Giant rotation",rangeFit(avg,3.5,4.4,1.8),10,
        avg===null?"Average elixir is unknown.":"Average elixir "+avg.toFixed(2)+".");
      break;
    default:
      add("win","Single primary win condition",winCount===1?100:
        winCount===2?58:winCount===0?8:35,20,
        "One clear tower-damage plan is preferred over several competing win conditions.");
      add("air","Air coverage",countFit(stats.air.length,2,0),20,
        stats.air.length+" sustained air defenders.");
      add("tank","Tank response",countFit(stats.tank+stats.buildings,2,1),15,
        stats.tank+" tank killers and "+stats.buildings+" defensive buildings.");
      add("splash","Swarm control",countFit(stats.splash+stats.small,2,1),15,
        "Checks for an area defender and efficient swarm control.");
      add("spells","Spell coverage",spellCoverage,15,
        "Checks for both a small spell and a heavier spell option.");
      add("rotation","Balanced rotation",rangeFit(avg,3,4.2,1.8),15,
        avg===null?"Average elixir is unknown.":"Average elixir "+avg.toFixed(2)+".");
  }
  const lossEvidence=personal.filter(item=>item.priority===1);
  if(lossEvidence.length){
    add("personal-threats","Your observed matchup risks",100,12,
      lossEvidence.map(item=>item.name+" ("+item.losses+"/"+item.seen+" losses): "+item.response).join(" "));
  }
  const weight=factors.reduce((sum,item)=>sum+item.weight,0);
  const score=weight?Math.round(factors.reduce((sum,item)=>sum+item.score*item.weight,0)/weight*10)/10:0;
  const strengths=factors.filter(item=>item.score>=78).map(item=>item.label+": "+item.evidence);
  const tradeoffs=factors.filter(item=>item.score<55).map(item=>item.label+": "+item.evidence);
  const archetype=labelFor(focus,deck);
  const summary=archetype+" fit: "+score.toFixed(1)+"/100. "+
    (strengths[0]??"The deck only partially matches this playstyle.")+
    (tradeoffs.length?" Main gap: "+tradeoffs[0]:"");
  return {focus,archetype,score,summary,factors,strengths,tradeoffs,
    personalThreats:personal.map(({name,seen,losses,response})=>({name,seen,losses,response}))};
}
function hasCard(cards:Card[],name:string){return cards.some(card=>card.name===name);}

/** Style bias is used during search so good archetypes survive beam pruning. */
export function playstyleCardAffinity(
  slot:string,card:Card,focus:StrategyFocus,
):number{
  const cost=card.elixir??5;
  const isCycle=role(card,"Cycle");
  const isPressure=role(card,"Pressure")||BRIDGE_THREATS.has(card.name);
  const isBait=BAIT_CARDS.has(card.name);
  const isSmall=role(card,"Small spell");
  const isHeavy=role(card,"Heavy spell");
  switch(focus){
    case "fast-attack":
      return (slot==="win"&&FAST_WINS.has(card.name)?15:0)+
        (isCycle?4:0)+(cost<=3?3:cost<=4?1:0)-
        (cost>=6?5:cost>=5?2:0);
    case "heavy-push":
      return (slot==="win"&&HEAVY_WINS.has(card.name)?17:0)+
        (role(card,"Support")?5:0)+
        (slot==="heavy"&&isHeavy?8:0)+
        (cost>=5?3:0)-(slot==="win"&&FAST_WINS.has(card.name)?6:0);
    case "spell-bait":
      return (slot==="win"&&BAIT_WINS.has(card.name)?17:0)+
        (isBait?8:0)+(role(card,"Pressure")?2:0)+
        (slot==="heavy"&&card.name==="Rocket"?7:0);
    case "bridge-pressure":
      return (isPressure?8:0)+
        (slot==="win"&&["Battle Ram","Ram Rider","Wall Breakers","Royal Hogs","Hog Rider"].includes(card.name)?13:0)+
        (cost<=4?2:0);
    case "defend-counterattack":
      return (role(card,"Tank killer")?5:0)+(role(card,"Building")?5:0)+
        (role(card,"Ground defense")?3:0)+(role(card,"Air defense")&&!isCycle?4:0)+
        (isSmall?2:0);
    case "royal-giant":
      return (card.name==="Royal Giant"?20:0)+(role(card,"Support")?2:0);
    default:
      return 0;
  }
}