import test from "node:test";
import assert from "node:assert/strict";
import { demo } from "../src/lib/demo";
import { defaults, evaluate, generate } from "../src/lib/engine";
import {
  projectMechanics,
  resolveMechanics,
  statForLevel,
  type MechanicsCatalog,
  type MechanicsCard,
} from "../src/lib/mechanics";
import { mechanicsOf, scoreDeckMechanics } from "../src/lib/mechanicsScoring";

const levels = (base: number) =>
  Array.from({ length: 19 }, (_, i) => Math.round(base * Math.pow(1.1, i)));
test("source joins troop and ranged projectile by card ID, with exact level stats", () => {
  const catalog = projectMechanics({
    cards: [
      { id: 26000000, key: "knight", sc_key: "Knight", name: "Knight", type: "Troop" },
      { id: 26000014, key: "musketeer", sc_key: "Musketeer", name: "Musketeer", type: "Troop" },
      { id: 27000006, key: "tesla", sc_key: "Tesla", name: "Tesla", type: "Building" },
      { id: 28000000, key: "fireball", sc_key: "Fireball", name: "Fireball", type: "Spell" },
    ],
    troop: [
      { key: "knight", summon_character: "Knight", summon_number: 0 },
      { key: "musketeer", summon_character: "Musketeer", summon_number: 1 },
    ],
    characters: [
      {
        name: "Knight", hitpoints_per_level: levels(100),
        damage_per_level: levels(12), hit_speed: 1200,
        range: 1200, speed: 60,
        attacks_ground: true, attacks_air: false,
      },
      {
        name: "Musketeer", hitpoints_per_level: levels(70),
        damage_per_level: null, projectile: "MusketeerBullet",
        hit_speed: 1100, range: 6000, speed: 60,
        attacks_ground: true, attacks_air: true,
      },
    ],
    building: [{
      key:"tesla",id:27000006, name:"Tesla",
      hitpoints_per_level: levels(120), damage_per_level: levels(20),
      hit_speed:1100,range:5500,attacks_air:true,attacks_ground:true,
    }],
    spell:[],
    projectile:[
      { name: "MusketeerBullet", damage_per_level: levels(15) },
      { name: "FireballSpell", damage_per_level: levels(100) },
    ],
  }, "2026-11-15T08:00:00Z");
  assert.equal(catalog.cards.length,4);
  assert.equal(catalog.source,"https://github.com/RoyaleAPI/cr-api-data");
  const knight=resolveMechanics({id:26000000,level:11},catalog)!;
  assert.equal(knight.hitpoints,levels(100)[10]);
  assert.equal(knight.damage,levels(12)[10]);
  assert.equal(knight.dps,levels(12)[10]/1.2);
  assert.equal(knight.rangeTiles,1.2);
  assert.equal(knight.moveSpeedRaw,60);
  assert.equal(knight.targetsAir,false);
  assert.equal(knight.targetsGround,true);
  const musketeer=resolveMechanics({id:26000014,level:11},catalog)!;
  assert.equal(musketeer.damage,levels(15)[10], "Ranged projectile damage must join");
  assert.equal(musketeer.rangeTiles,6);
  const tesla=resolveMechanics({id:27000006,level:11},catalog)!;
  assert.equal(tesla.targetsAir,true);
  assert.equal(tesla.hitSpeedSeconds,1.1);
  assert.equal(resolveMechanics({id:28000000,level:11},catalog)!.damage,levels(100)[10]);
  assert.equal(resolveMechanics({id:28000000,level:25},catalog)!.damage,null);
  assert.equal(statForLevel(levels(15),20),null,"Unknown levels cannot be extrapolated");
});

test("mechanics score prioritizes actual HP and DPS with fixed roles/elixir", () => {
  const deck=demo().deck;
  const create=(hp:number,dmg:number):MechanicsCatalog=>({
    source:"fixture",fetchedAt:"2026-11-15T08:00:00Z",warnings:[],
    cards:deck.map(c=>({
      id:c.id,name:c.name,kind:"Troop",
      hpByLevel:Array(19).fill(hp),damageByLevel:Array(19).fill(dmg),
      hitSpeedSeconds:1,rangeTiles:5,moveSpeedRaw:60,
      targetsAir:true,targetsGround:true,buildingsOnly:false,
      areaRadiusTiles:2,unitCount:1,deploySeconds:1,
      firstHitSeconds:0.4,specialAbility:false,
      provenance:"royaleapi-community",
    } as MechanicsCard)),
  });
  const weak=create(140,14);
  const strong=create(1500,160);
  const low=evaluate(deck,defaults,weak);
  const high=evaluate(deck,defaults,strong);
  assert.equal(low.avg,high.avg);
  assert.equal(low.cycle,high.cycle);
  assert.equal(low.defense,high.defense);
  assert.equal(low.offense,high.offense);
  assert.ok(high.mechanic.score!>low.mechanic.score!);
  assert.ok(high.score>low.score,"Documented combat stats must affect deck ranking");
  assert.equal(high.scoring.mechanics,65);
  assert.equal(high.scoring.averageElixir,8);
  assert.equal(high.scoring.fourCardCycle,7);
  assert.equal(Math.round(high.scoring.mechanics+high.scoring.structure+8+7),100);
  assert.equal(scoreDeckMechanics(deck,undefined).score,null);
  assert.equal(evaluate(deck,defaults).scoring.mechanics,0);
  const choices=generate(demo().cards,defaults,deck,strong);
  assert.ok(choices.length>0);
  assert.equal(choices[0].evaluation.scoring.mechanics>0,true);
});

test("unknown damage stays unknown rather than imputed from HP or card level",()=>{
  const c=demo().deck[0];
  const cat:MechanicsCatalog={
    source:"fixture",fetchedAt:"2026-11-15T08:00:00Z",warnings:[],
    cards:[{
      id:c.id,name:c.name,kind:"Troop",
      hpByLevel:levels(90),damageByLevel:null,
      hitSpeedSeconds:1,rangeTiles:null,moveSpeedRaw:null,
      targetsAir:null,targetsGround:null,buildingsOnly:null,
      areaRadiusTiles:null,unitCount:null,deploySeconds:null,
      firstHitSeconds:null,specialAbility:false,
      provenance:"royaleapi-community",
    }],
  };
  const rating=mechanicsOf(c,cat);
  assert.equal(rating.damage,null);
  assert.equal(rating.dps,null);
  assert.ok(rating.confidence < 1);
  assert.equal(rating.signals.find(x=>x.label==="Damage per second")!.available,false);
});
