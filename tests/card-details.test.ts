import test from "node:test";
import assert from "node:assert/strict";
import { projectMechanics, resolveMechanics } from "../src/lib/mechanics";
import { comparisonDelta, detailStats } from "../src/lib/cardDetails";
import { demo } from "../src/lib/demo";
import { readFileSync } from "node:fs";

test("comparison preserves signed differences and reverses lower-is-better metrics", () => {
  assert.deepEqual(comparisonDelta(1000, 800, "higher"), {delta:200,tone:"better"});
  assert.deepEqual(comparisonDelta(800, 1000, "higher"), {delta:-200,tone:"worse"});
  assert.deepEqual(comparisonDelta(1.2, 1.5, "lower"), {delta:-0.3,tone:"better"});
  assert.deepEqual(comparisonDelta(5, 3, "lower"), {delta:2,tone:"worse"});
  assert.deepEqual(comparisonDelta(60, 90, "neutral"), {delta:-30,tone:"equal"});
  assert.deepEqual(comparisonDelta(4, 4, "higher"), {delta:0,tone:"equal"});
  assert.equal(comparisonDelta(null, 500, "higher").delta, null);
  assert.equal(comparisonDelta(NaN, 500, "higher").delta, null);
});
test("rarity series align to display levels and use projectile's own rarity", () => {
  const catalog=projectMechanics({cards:[
    {id:1,name:"Giant",key:"giant",sc_key:"Giant",type:"Troop",rarity:"Rare"},
    {id:2,name:"Test",key:"test",sc_key:"Test",type:"Troop",rarity:"Epic"},
  ],troop:[],characters:[
    {name:"Giant",rarity:"Rare",hitpoints_per_level:[1930,2123,2335],damage_per_level:[120,132,145],load_time:0},
    {name:"Test",rarity:"Epic",hitpoints_per_level:[100,110],projectile:"Projectile"},
  ],building:[],spell:[],projectile:[{name:"Projectile",rarity:"Common",damage_per_level:[10,11,12,13,14,15,16]}]});
  assert.equal(resolveMechanics({id:1,level:3},catalog)?.hitpoints,1930);
  assert.equal(resolveMechanics({id:1,level:5},catalog)?.damage,145);
  assert.equal(resolveMechanics({id:1,level:2},catalog)?.hitpoints,null);
  assert.equal(resolveMechanics({id:1,level:6},catalog)?.hitpoints,null);
  assert.equal(resolveMechanics({id:1,level:3},catalog)?.firstHitSeconds,0);
  assert.equal(resolveMechanics({id:2,level:6},catalog)?.hitpoints,100);
  assert.equal(resolveMechanics({id:2,level:6},catalog)?.damage,15);
  assert.equal(catalog.cards[1].sourceRecords?.projectile.name,"Projectile");
});
test("details never manufacture stats for absent cards and retain known elixir",()=>{
  const card=demo().cards[0];
  const stats=detailStats(card,null,null,200);
  assert.equal(stats.find(s=>s.key==="hp")?.value,null);
  assert.equal(stats.find(s=>s.key==="hits")?.value,null);
  assert.equal(stats.find(s=>s.key==="elixir")?.value,card.elixir);
});


test("card level selector opens as a dropdown popover and closes after selection",()=>{
  const component=readFileSync(new URL("../src/components/CollectionCardDetails.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../src/components/collection-card-details.css",import.meta.url),"utf8");
  assert.match(component,/const \[levelPickerOpen, setLevelPickerOpen\] = useState\(false\)/);
  assert.match(component,/aria-expanded=\{levelPickerOpen\}/);
  assert.match(component,/aria-controls=\{levelPickerId\}/);
  assert.match(component,/onClick=\{\(\) => setLevelPickerOpen\(open => !open\)\}/);
  assert.match(component,/setLevel\(value\); setAllLevels\(false\); setLevelPickerOpen\(false\);/);
  assert.match(component,/closeOnOutsidePointer/);
  assert.match(component,/event\.key === "Escape"/);
  assert.match(component,/event\.preventDefault\(\)/);
  assert.match(component,/event\.stopPropagation\(\)/);
  assert.match(component,/hidden=\{!levelPickerOpen\}/);
  assert.match(component,/!levelPickerOpen && <button type="button" className="ri-level-trigger"/);
  assert.match(component,/className="ri-level-panel-close"/);
  assert.match(component,/aria-label="Close card level selector"/);
  assert.match(component,/onClick=\{\(\) => setLevelPickerOpen\(false\)\}/);
  assert.match(css,/\.ri-level-panel-actions/);
  assert.match(css,/\.ri-level-panel-close:focus-visible/);
  assert.match(css,/\.ri-level-popover\{[\s\S]*position:absolute/);
  assert.match(css,/\.ri-level-popover\[hidden\]\{display:none\}/);
  assert.match(css,/\.ri-level-trigger\[aria-expanded="true"\]/);
});


test("card inspector uses compact spacing without removing card information",()=>{
  const component=readFileSync(new URL("../src/components/CollectionCardDetails.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../src/components/collection-card-details.css",import.meta.url),"utf8");

  // Keep every data section and the original fields visible in the component.
  assert.match(component,/<UnifiedStatGrid entries=\{statEntries\}\/?>/);
  assert.match(component,/buildUnifiedLevelTable/);
  assert.match(component,/ri-inspector-unified-section/);
  assert.match(component,/<h3>Card information<\/h3>/);
  for(const field of ["Star level","Maximum star level","Evolution:","Hero:","Unlock arena","Roles:"])
    assert.ok(component.includes(field),`Card information field missing: ${field}`);
  assert.match(component,/Combat stat source/);
  assert.match(component,/Ability details/);
  assert.match(component,/All levels/);

  // Ensure the compact overrides shrink the modal and all major content groups.
  assert.match(css,/\.ri-card-dialog\.ri-inspector\{[\s\S]*width:min\(600px/);
  assert.match(css,/\.ri-inspector-header\{[\s\S]*padding:10px 46px 9px 14px/);
  assert.match(css,/\.ri-inspector-body\{[\s\S]*gap:9px/);
  assert.match(css,/\.ri-inspector-fact\{[\s\S]*min-height:43px/);
  assert.match(css,/\.ri-inspector-stat-icon\{[\s\S]*width:26px/);
  assert.match(css,/\.ri-inspector-information-facts \.ri-inspector-fact\{[\s\S]*min-height:43px/);
  assert.match(css,/\.ri-level-option\{[\s\S]*min-height:48px/);
  assert.match(css,/@media\(max-width:560px\)/);
  assert.doesNotMatch(component,/Recommended design/);
  assert.match(component,/<section className="ri-level-design" aria-label="Card level">/);
  assert.match(css,/\/\* Extra-compact level selector/);
  assert.match(css,/\.ri-level-trigger\{[\s\S]*min-height:39px/);
  assert.match(css,/\.ri-level-option\{[\s\S]*min-height:39px/);
  assert.match(css,/\.ri-level-panel-footer\{[\s\S]*margin-top:7px/);
});

test("selected form uses one unified stat grid and official form icons",()=>{
  const component=readFileSync(new URL("../src/components/CollectionCardDetails.tsx",import.meta.url),"utf8");
  const icon=readFileSync(new URL("../src/components/CardFormIcon.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../src/components/collection-card-details.css",import.meta.url),"utf8");
  const overviewCss=readFileSync(new URL("../src/app/overview-dashboard.css",import.meta.url),"utf8");

  assert.ok(component.includes("buildUnifiedStatEntries"));
  assert.ok(component.includes("buildUnifiedLevelTable"));
  assert.ok(component.includes("function FormMarker"));
  assert.ok(component.includes('<CardFormIcon className={"ri-inspector-form-marker is-" + form} form={form}/>'));
  assert.ok(component.includes("ri-inspector-unified-section"));
  assert.ok(component.includes("<UnifiedStatGrid entries={statEntries}/>"));
  assert.ok(component.includes('option !== "base" && <CardFormIcon'));
  assert.ok(component.includes('className="ri-inspector-form-tab-icon"'));
  assert.ok(!component.includes("sections.map(section =>"));
  assert.ok(component.includes("abilityDescriptions.map"));

  assert.ok(icon.includes("api-assets.clashroyale.com/cardevolutions"));
  assert.ok(icon.includes("api-assets.clashroyale.com/cardheroes"));
  assert.ok(icon.includes("<image"));
  assert.ok(icon.includes("clipPath="));
  assert.ok(css.includes(".ri-inspector-form-marker"));
  assert.ok(css.includes(".ri-inspector-form-tab-icon"));
  assert.ok(css.includes(".ri-inspector-stat-delta"));
  assert.ok(overviewCss.includes(".ri-card-type-icon"));
});

test("all-level view uses one combined Base versus Evolution/Hero comparison table",()=>{
  const component=readFileSync(new URL("../src/components/CollectionCardDetails.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../src/components/collection-card-details.css",import.meta.url),"utf8");

  assert.ok(component.includes("function LevelMetricIcon"));
  assert.ok(component.includes("function LevelStats"));
  assert.ok(component.includes("buildUnifiedLevelTable(baseSections, formSections, form, minimum, cap)"));
  assert.ok(component.includes("Combined card stats by level"));
  assert.ok(component.includes("Each level is compared with Base at the same level."));
  assert.ok(component.includes('aria-current={row.level === viewing ? "true" : undefined}'));
  assert.ok(component.includes("ri-level-row-current"));
  assert.ok(component.includes("cell.delta"));
  assert.ok(component.includes("ri-level-table-track"));
  assert.ok(component.includes('style={{width:ratio+"%"}}'));

  assert.ok(css.includes(".ri-level-table-heading"));
  assert.ok(css.includes(".ri-level-metric-icon.is-health"));
  assert.ok(css.includes(".ri-level-metric-icon.is-dps"));
  assert.ok(css.includes(".ri-level-metric-icon.is-damage"));
  assert.ok(css.includes(".ri-inspector-table tbody tr.is-viewing"));
  assert.ok(css.includes(".ri-level-table-track"));
  assert.ok(css.includes(".ri-inspector-stat-delta"));
  assert.ok(css.includes(".ri-level-table-delta"));
  assert.ok(css.includes("position:sticky"));
  assert.ok(css.includes("@media(max-width:560px)"));
});


test("combat stat grid shows owned-level arithmetic and keeps the owned level fixed",()=>{
  const component=readFileSync(new URL("../src/components/CollectionCardDetails.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../src/components/collection-card-details.css",import.meta.url),"utf8");
  assert.match(component,/const ownedLevel = card\.owned && card\.level != null \? card\.level : null/);
  assert.match(component,/buildUnifiedStatEntries\(comparisonBase, activeSections, form, viewing, ownedLevel\)/);
  assert.match(component,/entry\.ownedProgression\.equation/);
  assert.match(component,/OWNED · LV /);
  assert.match(component,/isOwned \? "✓ OWNED" : "LEVEL"/);
  assert.match(component,/Your owned card level/);
  assert.match(css,/\.ri-inspector-owned-equation/);
});
