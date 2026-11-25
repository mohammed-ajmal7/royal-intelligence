import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { filterCollection } from "../src/lib/collectionFilter";
import type { Card } from "../src/lib/model";

function item(name:string, owned:boolean, evo:boolean|null, hero:boolean|null, level:number|null):Card {
  return {id:name.length*100+name.charCodeAt(0),name,owned,evo,hero,level,
    rarity:"rare",elixir:3,image:undefined,active:"base",tower:false,roles:[]};
}
const cards:Card[]=[
  item("Archers",true,true,false,10),
  item("Knight",true,false,true,11),
  item("Wizard",true,false,false,8),
  item("Valkyrie",false,true,false,null),
  item("Mini P.E.K.K.A",false,false,true,null),
  item("Cannon",false,null,null,null),
];

test("ownership default shows only owned cards, with All covering all types",()=>{
  const found=filterCollection(cards,{ownership:"Owned",type:"All",query:""});
  assert.deepEqual(found.map(c=>c.name),["Knight","Archers","Wizard"]);
  assert.ok(found.every(c=>c.owned));
});
test("Unowned filters out all owned cards independently of the type selector",()=>{
  const found=filterCollection(cards,{ownership:"Unowned",type:"All",query:""});
  assert.deepEqual(found.map(c=>c.name),["Cannon","Mini P.E.K.K.A","Valkyrie"]);
  assert.ok(found.every(c=>!c.owned));
});
test("Evolutions and Heroes intersect correctly with each ownership selection",()=>{
  assert.deepEqual(filterCollection(cards,{ownership:"Owned",type:"Evolutions",query:""}).map(c=>c.name),["Archers"]);
  assert.deepEqual(filterCollection(cards,{ownership:"Owned",type:"Heroes",query:""}).map(c=>c.name),["Knight"]);
  assert.deepEqual(filterCollection(cards,{ownership:"Unowned",type:"Evolutions",query:""}).map(c=>c.name),["Valkyrie"]);
  assert.deepEqual(filterCollection(cards,{ownership:"Unowned",type:"Heroes",query:""}).map(c=>c.name),["Mini P.E.K.K.A"]);
});
test("unknown form metadata never counts as an evolution or hero, and search composes",()=>{
  assert.deepEqual(filterCollection(cards,{ownership:"Unowned",type:"Evolutions",query:"Can"}),[]);
  assert.deepEqual(filterCollection(cards,{ownership:"Owned",type:"All",query:"  ARC  "}).map(c=>c.name),["Archers"]);
  assert.equal(cards[0].name,"Archers","Original card array should not be modified");
});
test("Cards UI exposes two accessible controls with independent defaults",()=>{
  const page=readFileSync(new URL("../src/app/page.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../src/app/globals.css",import.meta.url),"utf8");
  assert.match(page,/useState<CardOwnership>\("Owned"\)/);
  assert.match(page,/useState<CardTypeFilter>\("All"\)/);
  assert.match(page,/role="group" aria-label="Card ownership"/);
  assert.match(page,/aria-pressed=\{cardsOwnership===ownership\}/);
  assert.match(page,/\["Owned","Unowned"\] as const/);
  assert.match(page,/\["All","Evolutions","Heroes"\] as const/);
  assert.match(page,/aria-label="Card type"/);
  assert.match(page,/filterCollection\(collection/);
  assert.match(page,/setCardsOwnership\("Owned"\);setCardsFilter\("All"\)/);
  assert.match(css,/\.ri-ownership-toggle button\.is-active/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/\.ri-filterbar\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
});
