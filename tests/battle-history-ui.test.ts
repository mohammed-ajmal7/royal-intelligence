import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatBattleDate, formatBattleMode } from "../src/lib/battlePresentation";

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

test("dashboard Battles summaries use concise team names and compact SVG result badges",()=>{
  const dashboard=readFileSync(new URL("../src/app/page.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../src/app/globals.css",import.meta.url),"utf8");

  assert.match(dashboard,/"You"\s*:\s*person\.name/);
  assert.doesNotMatch(dashboard,/"You \(" \+ person\.name/);
  assert.match(dashboard,/<Smile size=\{14\}/);
  assert.match(dashboard,/<Frown size=\{14\}/);
  assert.match(dashboard,/ri-battle-result "\+\(b\.outcome/);
  assert.match(dashboard,/ri-battle-trophy-change/);
  assert.match(css,/\.ri-battle>summary\{[\s\S]*min-height:68px[\s\S]*padding:10px 13px/);
  assert.match(css,/\.ri-battle-result\.is-win\{/);
  assert.match(css,/\.ri-battle-result\.is-loss\{/);
  assert.match(css,/@media\(max-width:390px\)/);
});

test("dashboard Battles tab shows four distinct 2v2 player decks with readable matchup details",()=>{
  const dashboard=readFileSync(new URL("../src/app/page.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../src/app/globals.css",import.meta.url),"utf8");
  const battleStyles=readFileSync(new URL("../src/app/battles.css",import.meta.url),"utf8");

  assert.match(dashboard,/const isTwoVTwo=b\.team\.length===2&&b\.opponent\.length===2/);
  assert.match(dashboard,/b\.team\.map\(\(person,index\)=>playerDeck\(person,index,"team"\)\)/);
  assert.match(dashboard,/b\.opponent\.map\(\(person,index\)=>playerDeck\(person,index,"opponent"\)\)/);
  assert.match(dashboard,/You · /);
  assert.match(dashboard,/Teammate · /);
  assert.match(dashboard,/formatBattleMode\(b\.mode,isTwoVTwo\)/);
  assert.match(dashboard,/formatBattleDate\(b\.time\)/);
  assert.match(dashboard,/yourTeamNames\+" vs "\+opponentNames/);
  assert.match(dashboard,/ri-battle-match-context/);
  assert.match(dashboard,/<small>Opponent<\/small>/);
  assert.match(dashboard,/formatBattleMode\(b\.mode,true\)/);
  assert.match(dashboard,/Your Deck/);
  assert.match(dashboard,/singleOpponentName\+"’s Deck"/);
  assert.match(dashboard,/<MiniDeck cards=\{person\.cards\}\/?>/);
  assert.doesNotMatch(dashboard,/32 cards returned/);
  assert.doesNotMatch(dashboard,/Opponent cards/);

  assert.match(css,/\.ri-battle-2v2-teams\{display:grid;grid-template-columns:repeat\(2/);
  assert.match(css,/\.ri-battle-player \.ri-deck-grid\{grid-template-columns:repeat\(8/);
  assert.match(battleStyles,/\.ri-battle-match-context/);
  assert.match(battleStyles,/\.ri-battle-deck-panel/);
  assert.ok(css.length<27000,"Primary stylesheet stays within size budget");
});

test("battle labels use readable mode names and stable calendar dates",()=>{
  assert.equal(formatBattleMode("7xElixir_Friendly"),"7× Elixir Friendly");
  assert.equal(formatBattleMode("TeamVsTeam"),"2v2 Match");
  assert.equal(formatBattleMode("TeamVsTeam",true),"2v2 Match");
  assert.equal(formatBattleDate("2026-11-25"),"Nov 25, 2026");
});
