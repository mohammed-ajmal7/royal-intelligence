import test from "node:test";
import assert from "node:assert/strict";
import { rolesFor, type Battle, type Card } from "../src/lib/model";
import { analyseDeckPlaystyle, playstyleCardAffinity } from "../src/lib/deckArchetypeScoring";

function card(name:string,id:number,elixir:number):Card{
  return {id,name,rarity:"common",level:14,elixir,owned:true,evo:false,hero:false,
    active:"base",tower:false,roles:rolesFor(name)};
}
const fast=[
  card("Hog Rider",1,4),card("Knight",2,3),card("Musketeer",3,4),
  card("Firecracker",4,3),card("Mini P.E.K.K.A",5,4),
  card("Skeletons",6,1),card("The Log",7,2),card("Fireball",8,4),
];
const heavy=[
  card("Golem",11,8),card("Night Witch",12,4),card("Baby Dragon",13,4),
  card("Mega Minion",14,3),card("Mini P.E.K.K.A",15,4),
  card("Tombstone",16,3),card("Lightning",17,6),card("Barbarian Barrel",18,2),
];
const bait=[
  card("Goblin Barrel",21,3),card("Princess",22,3),card("Goblin Gang",23,3),
  card("Skeleton Army",24,3),card("Knight",25,3),card("Inferno Tower",26,5),
  card("Rocket",27,6),card("The Log",28,2),
];
const bridge=[
  card("Battle Ram",31,4),card("Bandit",32,3),card("Royal Ghost",33,3),
  card("Magic Archer",34,4),card("P.E.K.K.A",35,7),
  card("Electro Wizard",36,4),card("Zap",37,2),card("Poison",38,4),
];
const defence=[
  card("Royal Giant",41,6),card("Knight",42,3),card("Tesla",43,4),
  card("Musketeer",44,4),card("Mini P.E.K.K.A",45,4),
  card("Baby Dragon",46,4),card("Arrows",47,3),card("Fireball",48,4),
];

test("each playstyle scores its own archetype instead of reusing a generic deck score",()=>{
  assert.ok(analyseDeckPlaystyle(fast,"fast-attack").score >
    analyseDeckPlaystyle(heavy,"fast-attack").score);
  assert.ok(analyseDeckPlaystyle(heavy,"heavy-push").score >
    analyseDeckPlaystyle(fast,"heavy-push").score);
  assert.ok(analyseDeckPlaystyle(bait,"spell-bait").score >
    analyseDeckPlaystyle(fast,"spell-bait").score);
  assert.ok(analyseDeckPlaystyle(bridge,"bridge-pressure").score >
    analyseDeckPlaystyle(fast,"bridge-pressure").score);
  assert.ok(analyseDeckPlaystyle(defence,"defend-counterattack").score >
    analyseDeckPlaystyle(fast,"defend-counterattack").score);
});

test("search affinity favours cards that belong in the selected archetype",()=>{
  const hog=fast[0],golem=heavy[0],barrel=bait[0],ram=bridge[0];
  assert.ok(playstyleCardAffinity("win",hog,"fast-attack") >
    playstyleCardAffinity("win",golem,"fast-attack"));
  assert.ok(playstyleCardAffinity("win",golem,"heavy-push") >
    playstyleCardAffinity("win",hog,"heavy-push"));
  assert.ok(playstyleCardAffinity("win",barrel,"spell-bait") >
    playstyleCardAffinity("win",hog,"spell-bait"));
  assert.ok(playstyleCardAffinity("win",ram,"bridge-pressure") >
    playstyleCardAffinity("win",hog,"bridge-pressure"));
});

test("personal threat evidence is only added from five or more observed 1v1 battles",()=>{
  const makeBattle=(index:number):Battle=>({
    id:"battle-"+index,time:"2026-11-27T00:00:00.000Z",mode:"Ranked",
    team:[{tag:"#ME",name:"You",crowns:0,cards:fast}],
    opponent:[{tag:"#OP",name:"Opponent",crowns:1,cards:[
      card("Lava Hound",100+index,7),card("Balloon",200+index,5),
      ...heavy.slice(1,7),
    ]}],
    outcome:"loss",
  });
  const report=analyseDeckPlaystyle(fast,"balanced",null,
    Array.from({length:5},(_,index)=>makeBattle(index)));
  assert.ok(report.personalThreats.some(item=>item.name==="Air-heavy threats"));
  assert.ok(report.factors.some(item=>item.id==="personal-threats"));
  const small=analyseDeckPlaystyle(fast,"balanced",null,
    Array.from({length:4},(_,index)=>makeBattle(index)));
  assert.ok(!small.factors.some(item=>item.id==="personal-threats"));
});
