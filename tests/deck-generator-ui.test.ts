import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Deck generator places icon-led Playstyle and Max elixir controls at the lower right",()=>{
  const page=readFileSync(new URL("../src/app/page.tsx",import.meta.url),"utf8");
  const analysis=readFileSync(new URL("../src/components/DeckCandidateAnalysis.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../src/app/deck-generator.css",import.meta.url),"utf8");

  assert.ok(page.includes('import "./deck-generator.css"'));
  assert.ok(page.includes('<Swords size={15} aria-hidden="true"/> Playstyle'));
  assert.ok(page.includes('<Flame size={15} aria-hidden="true"/> Max elixir'));
  assert.ok(page.includes("Generate best deck"));
  assert.ok(page.includes("mechanics,focus,localBattles"));
  assert.ok(page.includes("<DeckCandidateAnalysis candidate={result}"));
  assert.ok(analysis.includes("candidate.playstyle.factors"));
  assert.ok(analysis.includes("candidate.playstyle.tradeoffs"));
  assert.ok(analysis.includes("[slot.chosen,...slot.alternatives]"));
  assert.ok(css.includes("justify-content:flex-end"));
  assert.ok(css.includes("margin-left:auto"));
  assert.ok(css.includes(".ri-generator-controls"));
  assert.ok(css.includes(".ri-role-ranking-scroll"));
  assert.ok(css.includes("@media(max-width:650px)"));
});
