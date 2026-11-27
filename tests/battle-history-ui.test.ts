import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("2v2 battle history renders all four players and all four decks", () => {
  const workspace = readFileSync(new URL("../src/components/LegacyWorkspace.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../src/app/advanced/legacy.css", import.meta.url), "utf8");

  assert.match(workspace, /const isTwoVTwo = b\.team\.length === 2 && b\.opponent\.length === 2/);
  assert.match(workspace, /b\.team\.map\(renderPlayer\)/);
  assert.match(workspace, /b\.opponent\.map\(renderPlayer\)/);
  assert.match(workspace, /teamNames \+ "  vs  " \+ opponentNames/);
  assert.match(workspace, /2v2 · 4 players · 4 decks/);
  assert.match(workspace, /isTwoVTwo && page === "Battle History"/);
  assert.match(workspace, /<Deck cards=\{person\.cards\} onClick=\{setSelected\}\/?>/);
  assert.match(workspace, /person\.cards\.length === 8/);
  assert.match(workspace, /Deck cards were not included in this battle record/);

  assert.match(styles, /\.battle-2v2-preview/);
  assert.match(styles, /\.battle-2v2-grid/);
  assert.match(styles, /\.battle-side-players/);
  assert.match(styles, /\.battle-player \.deck/);
  assert.match(styles, /@media\(max-width: 820px\)/);
});


test("dashboard Battles tab shows four distinct 2v2 player decks",()=>{
  const dashboard=readFileSync(new URL("../src/app/page.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../src/app/globals.css",import.meta.url),"utf8");

  assert.match(dashboard,/const isTwoVTwo=b\.team\.length===2&&b\.opponent\.length===2/);
  assert.match(dashboard,/b\.team\.map\(\(person,index\)=>playerDeck\(person,index,"team"\)\)/);
  assert.match(dashboard,/b\.opponent\.map\(\(person,index\)=>playerDeck\(person,index,"opponent"\)\)/);
  assert.match(dashboard,/You · /);
  assert.match(dashboard,/Teammate · /);
  assert.match(dashboard,/"Opponent "\+\(index\+1\)/);
  assert.match(dashboard,/2v2 · 4 players · 4 decks/);
  assert.match(dashboard,/reduce\(\(sum,person\)=>sum\+person\.cards\.length,0\)\}/);
  assert.match(dashboard,/32 cards returned/);
  assert.match(dashboard,/<MiniDeck cards=\{person\.cards\}\/?>/);

  assert.match(css,/\.ri-battle-2v2-teams\{display:grid;grid-template-columns:repeat\(2/);
  assert.match(css,/\.ri-battle-player \.ri-deck-grid\{grid-template-columns:repeat\(8/);
  assert.match(css,/@media\(max-width:760px\)\{\.ri-battle-2v2-teams/);
});
