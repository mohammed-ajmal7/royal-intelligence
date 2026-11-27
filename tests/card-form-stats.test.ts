import test from "node:test";
import assert from "node:assert/strict";
import {
  buildUnifiedLevelTable,
  buildUnifiedStatEntries,
  signedStatDelta,
  ownedLevelStatEquation,
  ownedLevelStatBreakdown,
} from "../src/lib/cardFormStats";
import type { CardReferenceSection } from "../src/lib/liveCardReference";

const baseSections: CardReferenceSection[] = [{
  name: "Card stats",
  facts: { "Targets": "Ground" },
  levels: {
    8: { Hitpoints: "1,000", Damage: "200", "Hit Speed": "1.4 s", Range: "5" },
    9: { Hitpoints: "1,100", Damage: "220", "Hit Speed": "1.4 s", Range: "5" },
  },
}];

const heroSections: CardReferenceSection[] = [
  {
    name: "Card stats",
    facts: {},
    levels: {
      8: { Hitpoints: "1,150", Damage: "180", "Hit Speed": "1.6 s", Targets: "Air & Ground", Range: "5" },
      9: { Hitpoints: "1,260", Damage: "205", "Hit Speed": "1.6 s", Targets: "Air & Ground", Range: "5" },
    },
  },
  {
    name: "Rhino",
    facts: { "Ability elixir": "3" },
    levels: {
      8: { "Spawn Damage": "90", Hitpoints: "500", "Charge Damage": "250" },
      9: { "Spawn Damage": "100", Hitpoints: "550", "Charge Damage": "275" },
    },
  },
];

test("one selected-form stat grid combines base stats and form-only ability stats", () => {
  const entries = buildUnifiedStatEntries(baseSections, heroSections, "hero", 8);
  const byLabel = Object.fromEntries(entries.map(entry => [entry.label, entry]));

  assert.equal(byLabel.Hitpoints.value, "1,150");
  assert.equal(byLabel.Hitpoints.baseValue, "1,000");
  assert.equal(byLabel.Hitpoints.delta, "+150");
  assert.equal(byLabel.Hitpoints.marker, "hero");

  assert.equal(byLabel.Damage.value, "180");
  assert.equal(byLabel.Damage.delta, "−20");
  assert.equal(byLabel.Damage.marker, "hero");

  assert.equal(byLabel["Hit Speed"].value, "1.6 s");
  assert.equal(byLabel["Hit Speed"].delta, "+0.2 s");

  assert.equal(byLabel.Targets.value, "Air & Ground");
  assert.equal(byLabel.Targets.delta, null);
  assert.equal(byLabel.Targets.marker, "hero");

  assert.equal(byLabel["Rhino · Spawn Damage"].value, "90");
  assert.equal(byLabel["Rhino · Spawn Damage"].marker, "hero");
  assert.equal(byLabel["Rhino · Ability elixir"].value, "3");
  assert.equal(byLabel["Rhino · Hitpoints"].value, "500");
});

test("base view shows original values without form markers or deltas", () => {
  const entries = buildUnifiedStatEntries(baseSections, baseSections, "base", 8);
  const hitpoints = entries.find(entry => entry.label === "Hitpoints");
  assert.equal(hitpoints?.value, "1,000");
  assert.equal(hitpoints?.marker, null);
  assert.equal(hitpoints?.delta, null);
});

test("same-level comparisons use the selected level, not the owned level or another level", () => {
  const levelEight = buildUnifiedStatEntries(baseSections, heroSections, "hero", 8)
    .find(entry => entry.label === "Hitpoints");
  const levelNine = buildUnifiedStatEntries(baseSections, heroSections, "hero", 9)
    .find(entry => entry.label === "Hitpoints");

  assert.equal(levelEight?.delta, "+150");
  assert.equal(levelNine?.delta, "+160");
});

test("all-level table keeps every form stat in one table and compares each matching level", () => {
  const table = buildUnifiedLevelTable(baseSections, heroSections, "hero", 8, 9);
  const hitpoints = table.columns.findIndex(column => column.label === "Hitpoints");
  const spawnDamage = table.columns.findIndex(column => column.label === "Rhino · Spawn Damage");
  const range = table.columns.findIndex(column => column.label === "Range");

  assert.equal(table.columns[hitpoints].marker, "hero");
  assert.equal(table.columns[spawnDamage].marker, "hero");
  assert.equal(table.columns[range].marker, null);
  assert.equal(table.rows.length, 2);
  assert.equal(table.rows[0].cells[hitpoints].value, "1,150");
  assert.equal(table.rows[0].cells[hitpoints].delta, "+150");
  assert.equal(table.rows[1].cells[hitpoints].delta, "+160");
  assert.equal(table.rows[0].cells[spawnDamage].value, "90");
  assert.equal(table.rows[0].cells[spawnDamage].delta, null);
  assert.equal(table.rows[1].cells[spawnDamage].value, "100");
});

test("signed stat differences retain units and ignore unchanged or non-numeric values", () => {
  assert.equal(signedStatDelta("200", "180"), "−20");
  assert.equal(signedStatDelta("1.4 s", "1.6 s"), "+0.2 s");
  assert.equal(signedStatDelta("1,000", "1000"), null);
  assert.equal(signedStatDelta("Ground", "Air"), null);
  assert.equal(signedStatDelta(null, "90"), null);
  assert.equal(signedStatDelta("100", null), null);
});


test("owned-level stat equations use the player's level as a fixed baseline",()=>{
  const section: CardReferenceSection = {
    name:"Card stats",
    facts:{},
    levels:{
      9:{Hitpoints:"1,462",Damage:"167","Hit Speed":"1.2 s"},
      15:{Hitpoints:"2,566",Damage:"293","Hit Speed":"1.2 s"},
    },
  };
  const entries=buildUnifiedStatEntries([section],[section],"base",15,9);
  const byLabel=Object.fromEntries(entries.map(entry=>[entry.label,entry]));
  assert.equal(byLabel.Hitpoints.ownedProgression?.equation,"Lv 9: 1,462 + 1,104 = 2,566 (Lv 15)");
  assert.equal(byLabel.Damage.ownedProgression?.equation,"Lv 9: 167 + 126 = 293 (Lv 15)");
  assert.equal(byLabel["Hit Speed"].ownedProgression,null);
  assert.equal(ownedLevelStatEquation("2,566","1,462",9,5),"Lv 9: 2,566 − 1,104 = 1,462 (Lv 5)");
  assert.equal(ownedLevelStatEquation("1.2 s","1.5 s",9,15),"Lv 9: 1.2 + 0.3 = 1.5 s (Lv 15)");
  assert.equal(ownedLevelStatEquation("Ground","Air",9,15),null);
  assert.equal(ownedLevelStatEquation(null,"200",9,15),null);
});

test("Archer level 12 shows owned-level arithmetic and highlights the verified final HP",()=>{
  const archer: CardReferenceSection = {
    name:"Card stats",
    facts:{},
    levels:{
      11:{Hitpoints:"304"},
      12:{Hitpoints:"334"},
    },
  };

  const level11=buildUnifiedStatEntries([archer],[archer],"base",11,11)
    .find(entry=>entry.label==="Hitpoints");
  const level12=buildUnifiedStatEntries([archer],[archer],"base",12,11)
    .find(entry=>entry.label==="Hitpoints");

  assert.equal(level11?.value,"304");
  assert.equal(level11?.ownedProgression,null);
  assert.equal(level12?.value,"334");
  assert.deepEqual(level12?.ownedProgression,{
    level:11,
    targetLevel:12,
    fromValue:"304",
    changeValue:"30",
    operator:"+",
    toValue:"334",
    equation:"Lv 11: 304 + 30 = 334 (Lv 12)",
  });

  const breakdown=ownedLevelStatBreakdown("304","334",11,12);
  assert.equal(breakdown?.equation,"Lv 11: 304 + 30 = 334 (Lv 12)");
  assert.equal(ownedLevelStatBreakdown("304","274",11,12)?.operator,"−");
});

