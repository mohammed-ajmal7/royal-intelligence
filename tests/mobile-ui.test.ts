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
  assert.match(page,/href="\/advanced#Deck%20Laboratory"/);
  assert.ok(!page.includes('name:"AI Coach"'));
});

test("the primary homepage is small and classic analytics are available separately",()=>{
  assert.ok(page.length<45000,"Homepage grew too large");
  assert.ok(css.length<25000,"Primary stylesheet grew too large");
  assert.ok(legacy.includes("Top Global Player Comparison Deck Generator"));
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
  assert.match(css,/--ri-bg:#f8fafc/);
  assert.match(css,/\.ri-panel/);
  assert.match(css,/\.ri-card/);
});
