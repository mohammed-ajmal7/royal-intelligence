import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const page = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");

test("mobile navigation exposes Home, Cards, Build, Battles and More", () => {
  assert.match(page, /aria-label="Mobile primary navigation"/);
  for (const label of ["Home", "Cards", "Build", "Battles", "More"])
    assert.ok(page.includes(label), "Missing dock tab: " + label);
  assert.match(page, /aria-current=\{page === p \? "page"/);
  assert.match(page, /aria-expanded=\{mobile\}/);
  assert.match(page, /aria-label="Close navigation drawer"/);
});
test("player tag search is above the page heading on phones", () => {
  const main = page.indexOf("<main>");
  const account = page.indexOf('<div className="account-bar">', main);
  const heading = page.indexOf('<div className="page-heading">', main);
  assert.ok(main >= 0 && account > main && heading > account);
});
test("mobile layout includes safe-area and thumb-friendly inputs", () => {
  assert.match(layout, /viewportFit: "cover"/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.mobile-bottom-nav/);
  assert.match(css, /\.mobile-tab\.active/);
  assert.match(css, /\.account-bar \.tag-input input \{ font-size: 16px/);
});
test("themed panels and eight-card deck retain mobile grids", () => {
  for (const selector of [".hero", ".art", ".panel", ".metric", ".collection-summary", ".modal", ".smart-overview"])
    assert.ok(css.includes(selector), "Missing themed selector: " + selector);
  assert.match(css, /\.smart-overview \.deck, \.battle-detail \.deck \{\s*grid-template-columns: repeat\(4/);
  assert.match(css, /--arena-blue: #157dcc/);
  assert.match(css, /--gold: #ffd060/);
});
