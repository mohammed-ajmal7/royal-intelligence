import test from "node:test";
import assert from "node:assert/strict";
import { projectMechanics, resolveMechanics } from "../src/lib/mechanics";
import { comparisonDelta, detailStats } from "../src/lib/cardDetails";
import { demo } from "../src/lib/demo";

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
