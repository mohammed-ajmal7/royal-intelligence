import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sortCardsByStat, cardStatSortValue } from "../src/lib/cardCollectionSort";
import type { Card, } from "../src/lib/model";
import type { MechanicsCard, MechanicsCatalog } from "../src/lib/mechanics";

function card(id:number,name:string,level:number|null):Card {
  return {
    id,name,level,owned:level!==null,rarity:"rare",elixir:3,
    evo:null,hero:null,active:"base",tower:false,roles:[],
  };
}

function mechanicsCard(
  id:number,
  name:string,
  hpByLevel:number[]|null,
  damageByLevel:number[]|null,
  dpsByLevel:number[]|null,
  hitSpeedSeconds:number|null=1,
  kind:MechanicsCard["kind"]="Troop",
):MechanicsCard {
  return {
    id,name,kind,hpByLevel,damageByLevel,dpsByLevel,hitSpeedSeconds,
    rangeTiles:5,moveSpeedRaw:60,targetsAir:true,targetsGround:true,
    buildingsOnly:false,areaRadiusTiles:1,unitCount:1,deploySeconds:1,
    firstHitSeconds:.4,specialAbility:false,provenance:"royaleapi-community",
  };
}

const a=card(991001,"Sort Fixture A",1);
const b=card(991002,"Sort Fixture B",2);
const noLevel=card(991003,"Sort Fixture Unknown",null);
const catalog:MechanicsCatalog={
  source:"fixture",fetchedAt:"2026-11-27T00:00:00Z",warnings:[],
  cards:[
    mechanicsCard(a.id,a.name,[100,400],[10,90],[10,30]),
    mechanicsCard(b.id,b.name,[200,350],[20,80],[20,25]),
  ],
};

test("Current sorts by each owned card's actual level, highest first",()=>{
  assert.deepEqual(sortCardsByStat([a,b],"hitpoints","current",catalog).map(c=>c.name),
    ["Sort Fixture B","Sort Fixture A"]);
  assert.deepEqual(sortCardsByStat([a,b],"damage","current",catalog).map(c=>c.name),
    ["Sort Fixture B","Sort Fixture A"]);
  assert.deepEqual(sortCardsByStat([a,b],"dps","current",catalog).map(c=>c.name),
    ["Sort Fixture B","Sort Fixture A"]);
});

test("Max sorts each metric using the highest published level for that card",()=>{
  assert.deepEqual(sortCardsByStat([b,a],"hitpoints","max",catalog).map(c=>c.name),
    ["Sort Fixture A","Sort Fixture B"]);
  assert.deepEqual(sortCardsByStat([b,a],"damage","max",catalog).map(c=>c.name),
    ["Sort Fixture A","Sort Fixture B"]);
  assert.deepEqual(sortCardsByStat([b,a],"dps","max",catalog).map(c=>c.name),
    ["Sort Fixture A","Sort Fixture B"]);
});

test("Missing current levels and missing metric records stay at the bottom",()=>{
  const input=[noLevel,b,a];
  assert.deepEqual(sortCardsByStat(input,"hitpoints","current",catalog).map(c=>c.name),
    ["Sort Fixture B","Sort Fixture A","Sort Fixture Unknown"]);
  assert.deepEqual(sortCardsByStat(input,"hitpoints","max",catalog).map(c=>c.name),
    ["Sort Fixture A","Sort Fixture B","Sort Fixture Unknown"]);
  assert.equal(cardStatSortValue(noLevel,"hitpoints","current",catalog),null);
});

test("DPS can be ranked from damage and hit speed when no explicit DPS array exists",()=>{
  const item=mechanicsCard(991004,"Sort Fixture Calculated DPS",[100,200],[20,40],null,2);
  const entry=card(item.id,item.name,2);
  const separate:MechanicsCatalog={...catalog,cards:[item]};
  assert.equal(cardStatSortValue(entry,"dps","current",separate),20);
  assert.equal(cardStatSortValue(entry,"dps","max",separate),20);
});

test("highest published valid stat level is used; values are never extrapolated",()=>{
  const item=mechanicsCard(991005,"Sort Fixture Sparse",[100,450,0],[20,0,0],[10,0,0]);
  const entry=card(item.id,item.name,8);
  const separate:MechanicsCatalog={...catalog,cards:[item]};
  assert.equal(cardStatSortValue(entry,"hitpoints","max",separate),450);
  assert.equal(cardStatSortValue(entry,"damage","max",separate),20);
  assert.equal(cardStatSortValue(entry,"hitpoints","current",separate),null);
});

test("Default order preserves the input order and Cards UI exposes all three sorts plus Current/Max",()=>{
  const page=readFileSync(new URL("../src/app/page.tsx",import.meta.url),"utf8");
  const controls=readFileSync(new URL("../src/components/CardSortControls.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../src/app/card-sorting.css",import.meta.url),"utf8");
  assert.deepEqual(sortCardsByStat([b,a],"none","max",catalog).map(c=>c.name),
    ["Sort Fixture B","Sort Fixture A"]);
  assert.match(page,/useState<CardStatSortMetric>\("none"\)/);
  assert.match(page,/useState<CardStatSortMode>\("current"\)/);
  assert.match(controls,/<option value="hitpoints">Highest Hitpoints<\/option>/);
  assert.match(controls,/<option value="damage">Highest Damage<\/option>/);
  assert.match(controls,/<option value="dps">Highest Damage\/Sec<\/option>/);
  assert.match(controls,/aria-label="Card stat level"/);
  assert.match(controls,/value === "current" \? "Current" : "Max"/);
  assert.match(page,/sortCardsByStat\(visible,cardsSort,cardsSortMode,mechanics\)/);
  assert.match(page,/<CardSortControls sort=\{cardsSort\} mode=\{cardsSortMode\} status=\{mechanicsStatus\}/);
  assert.match(page,/\{sortedVisible\.map\(c=>/);
  assert.match(css,/\.ri-card-sort-toggle/);
  assert.match(css,/\.ri-card-sort-toggle button\.is-active/);
});
