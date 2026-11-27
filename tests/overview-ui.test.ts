import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Overview uses compact metric cards with clear visual hierarchy",()=>{
  const page=readFileSync(new URL("../src/app/page.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../src/app/overview-dashboard.css",import.meta.url),"utf8");

  assert.match(page,/import "\.\/overview-dashboard\.css"/);
  assert.match(page,/function Stat\([\s\S]*Icon\?:typeof Trophy/);
  assert.match(page,/Stat Icon=\{Trophy\} label="Trophies"/);
  assert.match(page,/Stat Icon=\{Medal\} label="Personal best"/);
  assert.match(page,/Stat Icon=\{Layers3\} label="Cards"/);
  assert.match(page,/Stat Icon=\{Percent\} label="Win rate"/);
  assert.match(page,/className="ri-stat-grid ri-overview-stats"/);
  assert.match(page,/player\.cards\.filter\(c=>!c\.tower\)\.length/);
  assert.match(page,/player\.catalog\.filter\(c=>!c\.tower\)\.length/);

  assert.match(page,/className="ri-panel ri-overview-deck"/);
  assert.match(page,/\{player\.deck\.length\}\/8 CARDS/);
  assert.match(page,/average elixir/);
  assert.match(page,/\{currentWinCondition\}/);
  assert.match(page,/Edit deck/);
  assert.match(page,/<MiniDeck cards=\{player\.deck\}/);
  assert.match(page,/c\.evo===true\?" · Evo":""/);
  assert.match(page,/c\.hero===true\?" · Hero":""/);

  assert.match(css,/\.ri-overview-stats[\s\S]*grid-template-columns:repeat\(4/);
  assert.match(css,/\.ri-overview-stats \.ri-stat-icon/);
  assert.match(css,/\.ri-overview-deck-chip\.is-elixir/);
  assert.match(css,/\.ri-overview-deck \.ri-deck-grid/);
  assert.match(css,/aspect-ratio:1 \/ 1/);
  assert.match(css,/@media\(max-width:900px\)/);
  assert.match(css,/@media\(max-width:560px\)/);
});
