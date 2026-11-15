import test from "node:test";
import assert from "node:assert/strict";
import { demo } from "../src/lib/demo";
import { evaluate, defaults } from "../src/lib/engine";

test("average elixir and four-card cycle are separate measurable quantities", () => {
  const cards = demo().deck;
  const equalCost = cards.map(c => ({ ...c, elixir: 3 }));
  const unevenCost = cards.map((c, i) =>
    ({ ...c, elixir: [1, 1, 2, 2, 4, 4, 5, 5][i] }));
  const flat = evaluate(equalCost);
  const fast = evaluate(unevenCost);
  assert.equal(flat.avg, 3);
  assert.equal(fast.avg, 3);
  assert.equal(flat.cycle, 12);
  assert.equal(fast.cycle, 6);
  assert.ok(fast.score > flat.score, "Cheaper rotation must count independently at the same average elixir");
  assert.ok(fast.features.some(f => f.name === "Four-card cycle efficiency"));
});

test("fast-cycle playstyle increases the cycle efficiency weight", () => {
  const cards = demo().deck;
  const regular = evaluate(cards, defaults);
  const cycle = evaluate(cards, { ...defaults, mode: "Fast cycle" });
  const weight = (e: typeof regular) => e.features.find(f => f.name === "Four-card cycle efficiency")!.weight;
  assert.equal(weight(regular), 10);
  assert.equal(weight(cycle), 25);
  assert.ok(cycle.cycle != null);
});

test("unknown elixir does not fabricate average or four-card cost", () => {
  const cards = demo().deck.map((c, index) =>
    index === 0 ? { ...c, elixir: null } : c);
  const value = evaluate(cards);
  assert.equal(value.avg, null);
  assert.equal(value.cycle, null);
  assert.equal(value.cycleEfficiency, 0);
});
