import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Overview uses compact metric cards with clear visual hierarchy",()=>{
  const page=readFileSync(new URL("../src/app/page.tsx",import.meta.url),"utf8");
  const header=readFileSync(new URL("../src/components/PlayerProfileHeader.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../src/app/player-profile.css",import.meta.url),"utf8");

  assert.match(page,/import "\.\/overview-dashboard\.css"/);
  assert.match(page,/import \{ PlayerProfileHeader \} from "\.\.\/components\/PlayerProfileHeader"/);
  assert.match(page,/<PlayerProfileHeader player=\{player\} metrics=\{\{/);
  assert.match(page,/trophies:fmt\(player\.trophies\)/);
  assert.match(page,/personalBest:fmt\(player\.bestTrophies\)/);
  assert.match(page,/cardsOwned:player\.cards\.filter\(c=>!c\.tower\)\.length/);
  assert.match(page,/cardsTotal:player\.catalog\.filter\(c=>!c\.tower\)\.length/);
  assert.match(page,/winRate:battleSummary[\s\S]*Math\.round\(100\*battleSummary\.wins/);
  assert.doesNotMatch(page,/ri-stat-grid ri-overview-stats/);

  assert.match(header,/label="Trophies"/);
  assert.match(header,/label="Personal best"/);
  assert.match(header,/label="Cards"/);
  assert.match(header,/label="Win rate"/);
  assert.match(header,/ri-profile-stat-copy/);

  assert.match(page,/className="ri-panel ri-overview-deck"/);
  assert.match(page,/\{player\.deck\.length\}\/8 CARDS/);
  assert.match(page,/average elixir/);
  assert.match(page,/\{currentWinCondition\}/);
  assert.match(page,/Edit deck/);
  assert.match(page,/<MiniDeck cards=\{player\.deck\}/);
  assert.match(page,/c\.evo===true\?" · Evo":""/);
  assert.match(page,/c\.hero===true\?" · Hero":""/);

  assert.match(css,/\.ri-profile-stats[\s\S]*grid-template-columns: repeat\(4/);
  assert.match(css,/\.ri-profile-stat-icon/);
  assert.match(css,/\.ri-profile-title-row/);
  assert.match(css,/@media \(max-width: 560px\)/);
  assert.match(css,/grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});
