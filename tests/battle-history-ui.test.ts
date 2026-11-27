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
