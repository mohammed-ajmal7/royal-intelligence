import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const page=readFileSync(new URL("../src/app/page.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../src/app/globals.css",import.meta.url),"utf8");
const layout=readFileSync(new URL("../src/app/layout.tsx",import.meta.url),"utf8");
const legacy=readFileSync(new URL("../src/components/LegacyWorkspace.tsx",import.meta.url),"utf8");

test("one five-tab workspace rather than thirteen competing destinations",()=>{
  for(const label of ["Overview","Cards","Decks","Battles","Explore"])
    assert.ok(page.includes('name:"'+label+'"'),"Missing navigation: "+label);
  assert.match(page,/aria-label="Main navigation"/);
  assert.match(page,/aria-label="Mobile navigation"/);
  assert.match(page,/aria-current=\{tab===name\?"page":undefined\}/);
  assert.match(page,/const labPath=advancedPath\+"#Deck%20Laboratory"/);
  assert.match(page,/href=\{labPath\}/);
  assert.ok(!page.includes('name:"AI Coach"'));
});

test("the primary homepage is small and classic analytics are available separately",()=>{
  assert.ok(page.length<45000,"Homepage grew too large");
  assert.ok(css.length<27000,"Primary stylesheet grew too large");
  assert.ok(legacy.includes('<Panel title="Build from Ranked decks">'));
  assert.ok(legacy.includes("Self-Made Deck Generator"));
});

test("mobile controls, safe areas and deck grids are usable",()=>{
  assert.match(layout,/viewportFit: "cover"/);
  assert.match(css,/env\(safe-area-inset-bottom\)/);
  assert.match(css,/\.ri-mobile-nav/);
  assert.match(css,/\.ri-deck-grid/);
  assert.match(css,/\.ri-search input\{font-size:16px\}/);
  assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});

test("lightweight neutral design does not need network fonts or heavy visual layers",()=>{
  assert.ok(!css.includes("@import url("));
  assert.match(css,/--ri-bg:#f7f8fa/);
  assert.match(css,/\.ri-panel/);
  assert.match(css,/\.ri-card/);
});

test("enterprise layout avoids repeated explanatory copy and duplicate shortcut panels",()=>{
  assert.doesNotMatch(page,/ROYALEON \/ \{tab\.toUpperCase\(\)\}/);
  assert.doesNotMatch(page,/className="ri-shortcuts"/);
  assert.doesNotMatch(page,/className="ri-deck-hint"/);
  assert.doesNotMatch(page,/Enter your Clash Royale player tag to see your cards/);
  assert.match(page,/aria-label="Search cards"/);
  assert.match(page,/className="ri-filter-count" aria-live="polite"/);
  assert.match(page,/Role breakdown/);
  assert.match(page,/How recommendations work/);
  assert.match(css,/--ri-border:#e4e7ec/);
  assert.match(css,/\.ri-stat-grid\{display:grid/);
  assert.match(css,/\.ri-disclosure/);
  assert.match(css,/\.ri-filter-count/);
});

test("required compliance, access to advanced tools and original features remain",()=>{
  assert.match(page,/Not endorsed by Supercell/);
  assert.match(page,/aria-label="Main navigation"/);
  assert.match(page,/aria-label="Mobile navigation"/);
  assert.match(page,/generateSelfMadeDecks\(/);
  assert.match(page,/API_RESOURCES/);
  assert.match(page,/buildDeckPlaybook\(/);
  assert.match(page,/className="ri-battles"/);
  assert.match(legacy,/Self-Made Deck Generator/);
});


test("native browser arrows are replaced by consistently aligned chevrons",()=>{
  const advancedCss=readFileSync(new URL("../src/app/advanced/workspace.css",import.meta.url),"utf8");
  for(const sheet of [css,advancedCss]){
    assert.match(sheet,/-webkit-appearance:none/);
    assert.match(sheet,/appearance:none/);
    assert.match(sheet,/background-image:url\("data:image\/svg\+xml,/);
    assert.match(sheet,/background-repeat:no-repeat/);
    assert.match(sheet,/background-position:right 13px center/);
    assert.match(sheet,/background-size:18px 18px/);
    assert.match(sheet,/padding-right:42px/);
    assert.match(sheet,/@media\(forced-colors:active\)/);
  }
  assert.match(css,/\.ri-main select:not\(\[multiple\]\)/);
  assert.match(advancedCss,/\.royal-app select:not\(\[multiple\]\)/);
  assert.match(advancedCss,/\.royal-app \.detail-level-controls select:not\(\[multiple\]\)/);
  assert.match(advancedCss,/padding-right:29px/);
});
