import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Card } from "../src/lib/model";
import type { MechanicsCatalog, MechanicsCard } from "../src/lib/mechanics";
import {
  defaultItemOptions, hitsToDefeat, rankDeckItems,
} from "../src/lib/deckItem";

const createCard = (id:number,name:string,owned=true,level=10):Card=>({
  id,name,owned,level:owned?level:null,rarity:"rare",image:undefined,
  elixir:4,evo:false,hero:false,active:"base",tower:false,roles:[],
});
const hp = (v:number)=>Array(19).fill(v);
const createMechanic=(card:Card,health:number|null,damage:number|null,speed:number|null,kind:"Troop"|"Building"|"Spell"="Troop",units=1):MechanicsCard=>({
  id:card.id,name:card.name,kind,hpByLevel:health===null?null:hp(health),
  damageByLevel:damage===null?null:hp(damage),
  hitSpeedSeconds:speed,rangeTiles:4,moveSpeedRaw:60,
  targetsAir:false,targetsGround:true,buildingsOnly:false,
  areaRadiusTiles:null,unitCount:units,deploySeconds:null,
  firstHitSeconds:null,specialAbility:false,provenance:"royaleapi-community",
});
const tank=createCard(1,"Giant");
const mini=createCard(2,"Knight");
const swarm=createCard(3,"Skeleton Army");
const spell=createCard(4,"Fireball");
const unknown=createCard(5,"Mystery Card");
const notOwned=createCard(6,"Opponent-only card",false);
const stats:MechanicsCatalog={
  source:"fixture",fetchedAt:"2026-11-15T08:00:00Z",warnings:[],
  cards:[
    createMechanic(tank,2400,130,1.6),
    createMechanic(mini,1600,220,0.8),
    createMechanic(swarm,1000,300,0.4,"Troop",12),
    createMechanic(spell,null,600,null,"Spell"),
    createMechanic(notOwned,9000,1000,0.6),
  ],
};
const cards=[tank,mini,swarm,spell,unknown,notOwned];
const options=(patch:Partial<typeof defaultItemOptions>={})=>({
  ...defaultItemOptions,...patch,
});

test("hits-to-defeat is real HP divided by incoming damage, rounded UP",()=>{
  assert.equal(hitsToDefeat(2400,200),12);
  assert.equal(hitsToDefeat(1600,200),8);
  assert.equal(hitsToDefeat(1000,200),5);
  assert.equal(hitsToDefeat(1001,200),6);
  assert.equal(hitsToDefeat(200,200),1);
  assert.equal(hitsToDefeat(1,200),1);
  for(const bad of [0,-3,NaN,Infinity,100001]) assert.equal(hitsToDefeat(1000,bad),null);
  assert.equal(hitsToDefeat(null,200),null);
  assert.equal(hitsToDefeat(0,200),null);
});

test("defense rankings sort by real hits endured, highest first, not arbitrary labels",()=>{
  const result=rankDeckItems(cards,stats,options({category:"defense",ownedOnly:true}));
  assert.deepEqual(result.filter(x=>x.rank!==null).map(x=>x.card.name),[
    "Giant","Knight","Skeleton Army",
  ]);
  assert.deepEqual(result.slice(0,3).map(x=>x.value),[12,8,5]);
  assert.deepEqual(result.slice(0,3).map(x=>x.hitsSurvived),[11,7,4]);
  assert.equal(result[0].hp,2400);
  assert.equal(result[0].rank,1);
  assert.equal(result.at(-1)?.available,false);
  assert.equal(result.find(x=>x.card.id===spell.id)?.rank,null);
  assert.equal(result.find(x=>x.card.id===notOwned.id),undefined);
  assert.equal(result.find(x=>x.card.id===swarm.id)?.unitCount,12);
  assert.equal(result.find(x=>x.card.id===swarm.id)?.hp,1000,
    "A troop group must not be treated as 12x one unit's HP");
});

test("changing reference damage changes defense hit counts and rank explanations",()=>{
  const result=rankDeckItems(cards,stats,options({category:"defense",ownedOnly:true,incomingDamage:700}));
  assert.equal(result.find(x=>x.card.id===tank.id)?.hitsToDefeat,4);
  assert.equal(result.find(x=>x.card.id===mini.id)?.hitsToDefeat,3);
  assert.equal(result.find(x=>x.card.id===swarm.id)?.hitsToDefeat,2);
  const invalid=rankDeckItems(cards,stats,options({category:"defense",ownedOnly:true,incomingDamage:NaN}));
  assert.ok(invalid.every(x=>x.value===null && x.rank===null));
  const health=rankDeckItems(cards,stats,options({category:"defense",ownedOnly:true,defenseMetric:"hp",incomingDamage:NaN}));
  assert.deepEqual(health.filter(x=>x.available).map(x=>x.value),[2400,1600,1000]);
});

test("attack options correctly rank per-hit damage or DPS independently",()=>{
  const byHit=rankDeckItems(cards,stats,options({category:"attack",ownedOnly:true}));
  assert.deepEqual(byHit.filter(x=>x.available).map(x=>x.card.name),[
    "Fireball","Skeleton Army","Knight","Giant",
  ]);
  assert.deepEqual(byHit.filter(x=>x.available).map(x=>x.value),[600,300,220,130]);
  const byDps=rankDeckItems(cards,stats,options({category:"attack",attackMetric:"dps",ownedOnly:true}));
  assert.deepEqual(byDps.filter(x=>x.available).map(x=>x.card.name),[
    "Skeleton Army","Knight","Giant",
  ]);
  assert.equal(byDps.find(x=>x.card.id===spell.id)?.available,false);
  assert.equal(byDps.find(x=>x.card.id===swarm.id)?.value,750);
});

test("filters distinguish troops, spells, missing source and unowned cards",()=>{
  const spellOnly=rankDeckItems(cards,stats,options({
    category:"attack",kind:"Spell",query:"Fire",
  }));
  assert.deepEqual(spellOnly.map(x=>x.card.name),["Fireball"]);
  const all=rankDeckItems(cards,stats,options({category:"attack",ownedOnly:false}));
  const referenceCard=all.find(x=>x.card.id===notOwned.id);
  assert.equal(referenceCard?.value,1000,
    "Unowned catalog cards can use a clearly labeled, selected comparison level");
  assert.equal(referenceCard?.levelOrigin,"reference");
  assert.equal(referenceCard?.level,11);
  assert.equal(referenceCard?.card.owned,false);
  const noSource=rankDeckItems(cards,null,options());
  assert.ok(noSource.every(x=>x.value===null && x.rank===null));
  const allFiltered=rankDeckItems(cards,stats,options({kind:"Building"}));
  assert.equal(allFiltered.length,0);
});

test("advanced workspace preserves the full Deck Item inspector",()=>{
  const page=readFileSync(new URL("../src/components/LegacyWorkspace.tsx",import.meta.url),"utf8");
  const home=readFileSync(new URL("../src/app/page.tsx",import.meta.url),"utf8");
  assert.match(home,/const advancedPath="\/advanced"\+playerParam/);
  assert.match(home,/href=\{advancedPath\}/);
  const component=readFileSync(new URL("../src/components/DeckItemView.tsx",import.meta.url),"utf8");
  assert.match(page,/\["Deck Item", ListOrdered\]/);
  assert.match(page,/page === "Deck Item"/);
  assert.match(page,/Rank my cards by Attack or Defense/);
  assert.match(component,/Choose ranking category/);
  assert.match(component,/Choose defense measurement/);
  assert.match(component,/Choose attack measurement/);
  assert.match(component,/Incoming damage per hit/);
  assert.match(component,/Rankings are not fabricated/);
  assert.match(component,/Select reference level/);
  assert.match(component,/All levels \+ full card stats/);
});
