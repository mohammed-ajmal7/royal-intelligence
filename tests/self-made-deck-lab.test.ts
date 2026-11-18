import test from "node:test";
import assert from "node:assert/strict";
import { defaults, key } from "../src/lib/engine";
import { rolesFor, type Card } from "../src/lib/model";
import {
  SELF_SLOTS,
  qualifiesForSelfSlot,
  generateSelfMadeDecks,
} from "../src/lib/selfMadeDeckLab";

function own(name: string, id: number, level: number, elixir: number,
  evo = false): Card {
  return {
    id, name, level, elixir, rarity: "common", owned:true, tower:false,
    evo, hero:false, active:"base", roles:rolesFor(name),
  };
}
const collection: Card[] = [
  own("Hog Rider", 1, 11, 4),
  own("Valkyrie", 2, 11, 4),
  own("Musketeer", 3, 8, 4),
  own("Baby Dragon", 4, 10, 4),
  own("Mini P.E.K.K.A", 5, 12, 4),
  own("Knight", 6, 12, 3),
  own("Arrows", 7, 10, 3),
  own("Fireball", 8, 11, 4),
  own("Archers", 9, 13, 3, true),
  own("Bomber", 10, 16, 2, true),
  own("Cannon", 11, 10, 3),
];
test("self-made eight roles are distinct, owned, and do not borrow global usage", () => {
  const result = generateSelfMadeDecks(collection, defaults);
  assert.equal(result.issues.length, 0);
  assert.ok(result.candidates.length >= 1);
  const best = result.candidates[0];
  assert.equal(best.cards.length, 8);
  assert.equal(new Set(best.cards.map(c => c.id)).size, 8);
  assert.deepEqual(best.slots.map(x => x.id), SELF_SLOTS.map(x => x.id));
  for (const slot of best.slots) {
    assert.ok(qualifiesForSelfSlot(slot.id, slot.chosen.card));
    assert.ok(slot.chosen.card.owned);
    assert.ok(slot.considered >= 1);
    assert.ok(slot.chosen.grade >= 0 && slot.chosen.grade <= 100);
  }
  assert.ok(best.score >= 0 && best.score <= 100);
  assert.ok(best.strategy.scenarios.some(s => s.id === "air"));
});

test("ground splash cannot masquerade as a second anti-air answer", () => {
  assert.equal(qualifiesForSelfSlot("splash", collection[9]), false);
  assert.equal(qualifiesForSelfSlot("splash", collection[3]), true);
  assert.equal(qualifiesForSelfSlot("air", collection[8]), true);
  const result = generateSelfMadeDecks(collection, defaults);
  for (const candidate of result.candidates) {
    assert.notEqual(candidate.slots[2].chosen.card.id,
      candidate.slots[3].chosen.card.id);
    assert.notEqual(candidate.slots[3].chosen.card.name, "Bomber");
  }
});

test("owned levels and unlocked Evolution are reported, not fabricated as Evo DPS", () => {
  const result = generateSelfMadeDecks(collection, defaults);
  const best = result.candidates[0];
  assert.ok(best.slots[2].chosen.card.name === "Archers",
    "The much stronger owned anti-air card should outrank the underlevelled one");
  assert.equal(best.slots[2].chosen.card.evo, true);
  assert.ok(best.suggestedEvolutions.includes("Archers"));
  assert.equal(best.slots[2].chosen.dps, null);
  assert.equal(best.slots[2].chosen.hp, null);
  assert.equal(best.slots[2].chosen.confidence, 0);
});

test("locked cards, exclusions and average-elixir cap are hard requirements", () => {
  const constraints = { ...defaults, include: [5], exclude: [3], maxElixir: 4 };
  const result = generateSelfMadeDecks(collection, constraints);
  assert.ok(result.candidates.length > 0);
  for (const candidate of result.candidates) {
    assert.ok(candidate.cards.some(c => c.id === 5));
    assert.ok(!candidate.cards.some(c => c.id === 3));
    assert.ok(candidate.evaluation.avg! <= 4);
  }
  const impossible = generateSelfMadeDecks(collection,
    { ...defaults, maxElixir: 2 });
  assert.equal(impossible.candidates.length, 0);
  assert.ok(impossible.issues.length > 0);
});

test("missing mandatory role and invalid locked card explain no result", () => {
  const noSplash = collection.filter(c => c.name !== "Baby Dragon");
  const missing = generateSelfMadeDecks(noSplash, defaults);
  assert.equal(missing.candidates.length, 0);
  assert.match(missing.issues.join(" "), /Air \+ splash/);
  const invalid = generateSelfMadeDecks(collection,
    { ...defaults, include:[10], exclude:[10] });
  assert.equal(invalid.candidates.length, 0);
  assert.match(invalid.issues[0], /conflict/);
});

test("deterministic recommendation and responsive search on a full catalog", () => {
  const first = generateSelfMadeDecks(collection, defaults);
  const second = generateSelfMadeDecks(collection, defaults);
  assert.equal(key(first.candidates[0].cards), key(second.candidates[0].cards));
  assert.equal(first.candidates[0].score, second.candidates[0].score);
  assert.equal(first.eligibleCardCount, collection.length);
});


test("special slots use eligible unique cards across Evolution, Hero and Wild", () => {
  const cards = collection.map(c => ({...c}));
  cards.find(c => c.name === "Valkyrie")!.hero = true;
  cards.push({
    ...own("Archer Queen", 12, 13, 5), rarity: "champion",
  });
  cards.push({
    ...own("Little Prince", 13, 14, 3), rarity: "champion",
  });
  const result = generateSelfMadeDecks(cards, defaults);
  assert.ok(result.candidates.length > 0);
  for (const candidate of result.candidates) {
    assert.ok(candidate.cards.filter(c =>
      c.rarity.toLowerCase() === "champion").length <= 2);
    assert.ok(candidate.specialSlots.length <= 3);
    assert.ok(new Set(candidate.specialSlots.map(s => s.card)).size ===
      candidate.specialSlots.length);
    assert.ok(new Set(candidate.specialSlots.map(s => s.slot)).size ===
      candidate.specialSlots.length);
    assert.ok(candidate.specialSlots.every(s =>
      candidate.cards.some(c => c.name === s.card)));
    assert.ok(candidate.specialSlots.every(s =>
      (s.slot === "Evolution" ? s.form === "evolution" :
        s.slot === "Hero" ? s.form === "hero" || s.form === "champion" :
        true)));
  }
});

test("Royal Giant focus cannot quietly substitute a different win condition", () => {
  const without = generateSelfMadeDecks(collection, defaults, null, "royal-giant");
  assert.equal(without.candidates.length, 0);
  assert.match(without.issues.join(" "), /Royal Giant focus/);
  const withGiant = generateSelfMadeDecks(
    [...collection, own("Royal Giant", 14, 12, 6)],
    defaults, null, "royal-giant");
  assert.ok(withGiant.candidates.length > 0);
  assert.ok(withGiant.candidates.every(c =>
    c.cards.some(x => x.name === "Royal Giant")));
});
