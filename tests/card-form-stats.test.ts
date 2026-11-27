import test from "node:test";
import assert from "node:assert/strict";
import {
  buildUnifiedLevelTable,
  buildUnifiedStatEntries,
  signedStatDelta,
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
