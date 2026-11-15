import test from "node:test";
import assert from "node:assert/strict";
import { demo } from "../src/lib/demo";
import { generate, deckAudit, evaluate, defaults, legal, key } from "../src/lib/engine";
import type { Card } from "../src/lib/model";

const sample = demo();
test("coverage audit spots real weaknesses instead of promising invincibility", () => {
  const audit = deckAudit(sample.deck);
  assert.equal(audit.total, 7);
  assert.equal(audit.checks.find(c => c.id === "win")?.ok, true);
  assert.equal(audit.checks.find(c => c.id === "air")?.ok, false);
  assert.equal(audit.checks.find(c => c.id === "tank")?.ok, false);
  assert.ok(audit.missing.includes("Dedicated tank stopper"));
  assert.equal(evaluate(sample.deck).audit.passed, audit.passed);
});

test("optimizer considers a win condition outside top 40 overlevelled filler cards", () => {
  const filler: Card[] = Array.from({ length: 52 }, (_, i) => ({
    ...sample.deck[0], id: 990000 + i, name: "Unclassified #" + i,
    level: 16, elixir: 3, roles: [], rarity: "rare", owned: true, tower: false,
  }));
  const real = sample.deck.map(c => ({ ...c, level: 9 }));
  const pool = [...filler, ...real];
  const choices = generate(pool, defaults);
  assert.ok(choices.length >= 1, "A valid owned win condition must still be found");
  for (const choice of choices) {
    assert.ok(legal(choice.cards));
    assert.ok(choice.cards.some(c => c.name === "Hog Rider"));
    assert.ok(choice.cards.some(c => c.level === 9));
    assert.ok(choice.evaluation.score >= 0 && choice.evaluation.score <= 100);
    assert.ok(choice.evaluation.audit.passed <= 7);
  }
});

test("all suggested decks honor strict user include/exclude and elixir rules", () => {
  const forced = sample.deck.find(c => c.name === "Musketeer")!;
  const excluded = sample.deck.find(c => c.name === "Valkyrie")!;
  const q = { ...defaults, maxElixir: 4.5, include: [forced.id], exclude: [excluded.id] };
  const choices = generate(sample.cards, q, sample.deck);
  assert.ok(choices.length > 0);
  for (const choice of choices) {
    assert.equal(choice.cards.length, 8);
    assert.equal(new Set(choice.cards.map(c => c.id)).size, 8);
    assert.ok(choice.cards.some(c => c.id === forced.id));
    assert.ok(!choice.cards.some(c => c.id === excluded.id));
    assert.ok(choice.evaluation.avg! <= 4.5);
    assert.ok(choice.cards.every(c => c.owned && !c.tower && c.rarity !== "champion"));
  }
});

test("full eight-card lock is preserved and never silently replaced", () => {
  const ids = sample.deck.map(c => c.id);
  const q = { ...defaults, include: ids };
  const choices = generate(sample.cards, q);
  assert.equal(choices.length, 1);
  assert.equal(key(choices[0].cards), key(sample.deck));
});

test("diverse results do not duplicate identical or seven-overlapping decks", () => {
  const choices = generate(sample.cards, defaults, sample.deck);
  assert.ok(choices.length >= 1 && choices.length <= 5);
  for (let i=0;i<choices.length;i++) {
    for (let j=i+1;j<choices.length;j++) {
      const intersection = choices[i].cards.filter(c => choices[j].cards.some(d => d.id === c.id));
      assert.ok(intersection.length <= 6);
    }
  }
});
