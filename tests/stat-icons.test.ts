import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { statIconPath, statValueWithUnit, elixirAsset } from "../src/lib/statAssets";

const fromPublic=(path:string)=>new URL("../public"+path,import.meta.url);
const ui=readFileSync(new URL("../src/components/CollectionCardDetails.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../src/components/collection-card-details.css",import.meta.url),"utf8");
const home=readFileSync(new URL("../src/app/page.tsx",import.meta.url),"utf8");

test("each numbered elixir asset 1–10 exists as valid scalable SVG",()=>{
  for(let n=1;n<=10;n++){
    const path=elixirAsset(n);
    assert.equal(path,"/game-icons/elixir/"+n+".svg");
    assert.ok(existsSync(fromPublic(path!)));
    const svg=readFileSync(fromPublic(path!),"utf8");
    assert.match(svg,/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg,new RegExp("<title>"+n+" Elixir</title>"));
    assert.match(svg,/viewBox="0 0 128 144"/);
    assert.match(svg,/radialGradient id="magenta"/);
    assert.match(svg,/clipPath id="dropClip"/);
    assert.match(svg,/filter id="outerShadow"/);
    assert.match(svg,new RegExp(">"+n+"</text>"));
    assert.match(svg,/stop-color="#ed00c8"/);
    assert.match(svg,/stroke="#fff"/);
    assert.match(svg,/font-style="italic"/);
  }
  for(const value of [null,undefined,0,-1,2.5,11])assert.equal(elixirAsset(value),null);
});
test("all stat pictograms are vector assets in public, including advanced mechanics",()=>{
  for(const label of [
    "Hitpoints","Shield hitpoints","Damage","Ranged Damage","Power Shot Damage",
    "Damage/sec","Hit Speed","First hit","Targets","Speed","Range",
    "Power Shot Range","Count","Radius","Deploy time","Evolution cycles",
    "Star level","Unlock arena",
  ]){
    const asset=statIconPath(label);
    assert.ok(asset,label+" icon missing");
    assert.ok(existsSync(fromPublic(asset!)),label+" asset not found");
    const svg=readFileSync(fromPublic(asset!),"utf8");
    assert.match(svg,/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.ok(svg.includes("</svg>"));
  }
  // Form icons are rendered through the shared official badge component, not placeholder stat SVGs.
  assert.equal(statIconPath("Evolution"),null);
  assert.equal(statIconPath("Hero"),null);
  assert.equal(statIconPath("Evolution cycles"),"/game-icons/stats/cycles.svg");
  assert.match(ui,/key === "evolution" \? "evolution" : key === "hero" \? "hero" : null/);
  assert.match(ui,/<CardFormIcon form=\{form\} className="ri-inspector-stat-icon ri-inspector-form-info-icon" decorative\/>/);
});
test("damage and attack values never accidentally receive range units",()=>{
  assert.equal(statValueWithUnit("112","Ranged Damage"),"112");
  assert.equal(statValueWithUnit("140","Power Shot Damage"),"140");
  assert.equal(statValueWithUnit("304","Hitpoints"),"304");
  assert.equal(statValueWithUnit("5","Range"),"5 tiles");
  assert.equal(statValueWithUnit("4.5–6","Power Shot Range"),"4.5–6 tiles");
  assert.equal(statValueWithUnit("0.9sec","Hit Speed"),"0.9 s");
  assert.equal(statValueWithUnit("5 tiles","Range"),"5 tiles");
});
test("the inspector is denser with labeled stats, compact form controls and optional details",()=>{
  assert.match(ui,/className="ri-inspector-stat-icon"/);
  assert.match(ui,/statValueWithUnit\(value,label\)/);
  assert.match(ui,/className="ri-inspector-meta"/);
  assert.match(ui,/className="ri-inspector-about"/);
  assert.match(ui,/<UnifiedStatGrid entries=\{statEntries\}\/?>/);
  assert.match(ui,/buildUnifiedStatEntries/);
  assert.match(ui,/<ElixirIcon cost=\{card\.elixir\} size=\{24\} decorative\/>/);
  assert.match(css,/width:min\(628px,calc\(100% - 24px\)\)/);
  assert.match(css,/\.ri-inspector-facts\{\s*display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.ri-inspector-stat-icon/);
  assert.match(css,/@media\(max-width:560px\)/);
  assert.match(home,/<ElixirIcon cost=\{card\.elixir\} size=\{28\} decorative\/>/);
  assert.match(home,/className="ri-cost"/);
  assert.ok(ui.includes('unavailableLabel = "No form listed"'));
  assert.ok(ui.includes('card.owned && unlocked === false ? "Locked" : "Available"'));
  assert.match(ui,/className="ri-level-design"/);
  assert.match(ui,/className="ri-level-grid" role="group" aria-label="Choose card level"/);
  assert.match(ui,/Your actual card level/);
  assert.match(ui,/setLevel\(value\); setAllLevels\(false\)/);
  assert.match(css,/\.ri-level-grid\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/\.ri-level-option\.is-selected/);
  assert.ok(ui.includes('const evolutionStatus = formStatus(hasEvolution, card.evo, "Not available");'));
  assert.ok(ui.includes('const heroStatus = formStatus(hasHero, card.hero, "Not available");'));
  assert.ok(ui.includes("Evolution: evolutionStatus,"));
  assert.ok(ui.includes("Hero: heroStatus,"));
  assert.ok(ui.includes('evolutionStatus === "Not available" ? ["Evolution"] : []'));
  assert.ok(ui.includes('heroStatus === "Not available" ? ["Hero"] : []'));
  assert.ok(css.includes(".ri-inspector-fact.is-unavailable"));
  assert.ok(css.includes("filter:grayscale(1)"));
  const globalCss=readFileSync(new URL("../src/app/globals.css",import.meta.url),"utf8");
  assert.match(globalCss,/\.ri-cost\s*\{[^}]*background:\s*transparent/);
});


test("all Damage labels use the shared blast SVG everywhere",()=>{
  const asset=statIconPath("Damage");
  assert.equal(asset,"/game-icons/stats/damage.svg");
  assert.equal(statIconPath("Ranged Damage"),asset);
  assert.equal(statIconPath("Power Shot Damage"),asset);
  assert.equal(statIconPath("Damage/sec"),"/game-icons/stats/damage-per-second.svg");
  const svg=readFileSync(fromPublic(asset!),"utf8");
  assert.match(svg,/<title>Damage blast<\/title>/);
  assert.match(svg,/fill="#ffb33b"/);
  assert.match(svg,/fill="#f36c35"/);
  assert.match(svg,/stroke-linejoin="round"/);
  assert.match(ui,/10 1\.2 12\.1 5\.3 16\.5 3\.8/);
  assert.match(css,/\.ri-level-metric-icon\.is-damage\{\s*background:#fff0e5;\s*color:#e46e2f/);
});


test("all card-cost surfaces share the polished numbered ElixirIcon",()=>{
  const shared=readFileSync(new URL("../src/components/ElixirIcon.tsx",import.meta.url),"utf8");
  const page=home;
  const cardDetails=readFileSync(new URL("../src/components/CardDetails.tsx",import.meta.url),"utf8");
  const deckItem=readFileSync(new URL("../src/components/DeckItemView.tsx",import.meta.url),"utf8");
  const playbook=readFileSync(new URL("../src/components/DeckPlaybookPanel.tsx",import.meta.url),"utf8");
  const selfMade=readFileSync(new URL("../src/components/SelfMadeDeckPanel.tsx",import.meta.url),"utf8");
  const legacy=readFileSync(new URL("../src/components/LegacyWorkspace.tsx",import.meta.url),"utf8");
  const liveMeta=readFileSync(new URL("../src/components/LiveMetaPanel.tsx",import.meta.url),"utf8");
  const iconCss=readFileSync(new URL("../src/components/elixir-icon.css",import.meta.url),"utf8");
  const advancedCss=readFileSync(new URL("../src/app/advanced/legacy.css",import.meta.url),"utf8");

  assert.match(shared,/elixirAsset\(cost\)/);
  assert.match(shared,/className=\{classes\}/);
  for(const source of [page,cardDetails,deckItem,playbook,selfMade,legacy,liveMeta,ui])
    assert.match(source,/ElixirIcon/, "every individual card-cost surface uses the shared icon");
  assert.match(deckItem,/className="deck-item-elixir"/);
  assert.match(legacy,/className="elixir"/);
  assert.match(selfMade,/other\.card\.elixir/);
  assert.match(liveMeta,/sourceElixir/);
  assert.match(iconCss,/\.ri-elixir-icon/);
  assert.match(advancedCss,/\.deck-item-elixir \.ri-elixir-icon/);
  assert.match(advancedCss,/\.elixir \.ri-elixir-icon/);
});
