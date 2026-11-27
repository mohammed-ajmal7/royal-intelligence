import test from "node:test";
import assert from "node:assert/strict";
import { defaults, key } from "../src/lib/engine";
import { rolesFor, type Card } from "../src/lib/model";
import type { MechanicsCatalog, MechanicsCard } from "../src/lib/mechanics";
import {
  SELF_SLOTS,
  qualifiesForSelfSlot,
  generateSelfMadeDecks,
} from "../src/lib/selfMadeDeckLab";
import { assessStrategy, focusChoices } from "../src/lib/deckStrategy";
import { buildDeckPlaybook } from "../src/lib/deckPlaybook";

function own(name: string, id: number, level: number, elixir: number,
  evo = false): Card {
  return {
    id, name, level, elixir, rarity: "common", owned:true, tower:false,
    evo, hero:false, active:"base", roles:rolesFor(name),
  };
}
const collection: Card[] = [
  own("Hog Rider", 1, 11, 4),
  own("Valkyrie", 2, 11, 4),
  own("Musketeer", 3, 8, 4),
  own("Baby Dragon", 4, 10, 4),
  own("Mini P.E.K.K.A", 5, 12, 4),
  own("Knight", 6, 12, 3),
  own("Arrows", 7, 10, 3),
  own("Fireball", 8, 11, 4),
  own("Archers", 9, 13, 3, true),
  own("Bomber", 10, 16, 2, true),
  own("Cannon", 11, 10, 3),
];
test("the deck generator exposes the six defined playstyles and matching playbook guidance",()=>{
  assert.deepEqual(focusChoices.map(({value,label})=>[value,label]),[
    ["balanced","Balanced"],
    ["fast-attack","Fast Attack"],
    ["heavy-push","Heavy Push"],
    ["spell-bait","Spell Bait"],
    ["bridge-pressure","Bridge Pressure"],
    ["defend-counterattack","Defend & Counterattack"],
  ]);
  assert.deepEqual(focusChoices.map(({explanation})=>explanation),[
    "Equal focus on attack and defense.",
    "Quick attacks and fast card rotation.",
    "Build powerful, overwhelming pushes.",
    "Force opponents to waste their spells.",
    "Constant pressure at the bridge.",
    "Defend efficiently and punish opponents.",
  ]);
  for(const choice of focusChoices){
    assert.equal(assessStrategy(collection,null,{focus:choice.value}).focus,choice.value);
    const guide=buildDeckPlaybook(collection.slice(0,8),null,choice.value);
    assert.ok(guide,choice.label+" should produce a playbook");
    assert.ok(guide.identity.includes("Playstyle:"),choice.label+" should inform playbook guidance");
  }
  assert.match(buildDeckPlaybook(collection.slice(0,8),null,"fast-attack")!.identity,/quick, low-commitment attacks/);
  assert.match(buildDeckPlaybook(collection.slice(0,8),null,"heavy-push")!.identity,/Build one supported push/);
  assert.match(buildDeckPlaybook(collection.slice(0,8),null,"spell-bait")!.identity,/key spell/);
  assert.match(buildDeckPlaybook(collection.slice(0,8),null,"bridge-pressure")!.identity,/bridge pressure/);
  assert.match(buildDeckPlaybook(collection.slice(0,8),null,"defend-counterattack")!.identity,/Defend with the most efficient answer/);
});

test("self-made eight roles are distinct, owned, and do not borrow global usage", () => {
  const result = generateSelfMadeDecks(collection, defaults);
  assert.equal(result.issues.length, 0);
  assert.ok(result.candidates.length >= 1);
  const best = result.candidates[0];
  assert.equal(best.cards.length, 8);
  assert.equal(new Set(best.cards.map(c => c.id)).size, 8);
  assert.deepEqual(best.slots.map(x => x.id), SELF_SLOTS.map(x => x.id));
  for (const slot of best.slots) {
    assert.ok(qualifiesForSelfSlot(slot.id, slot.chosen.card));
    assert.ok(slot.chosen.card.owned);
    assert.ok(slot.considered >= 1);
    assert.ok(slot.chosen.grade >= 0 && slot.chosen.grade <= 100);
  }
  assert.ok(best.score >= 0 && best.score <= 100);
  assert.equal(best.playstyle.focus,"balanced");
  assert.ok(best.playstyle.score >= 0 && best.playstyle.score <= 100);
  assert.ok(best.strategy.scenarios.some(s => s.id === "air"));
});

test("ground splash cannot masquerade as a second anti-air answer", () => {
  assert.equal(qualifiesForSelfSlot("splash", collection[9]), false);
  assert.equal(qualifiesForSelfSlot("splash", collection[3]), true);
  assert.equal(qualifiesForSelfSlot("air", collection[8]), true);
  const result = generateSelfMadeDecks(collection, defaults);
  for (const candidate of result.candidates) {
    assert.notEqual(candidate.slots[2].chosen.card.id,
      candidate.slots[3].chosen.card.id);
    assert.notEqual(candidate.slots[3].chosen.card.name, "Bomber");
  }
});

test("owned levels and unlocked Evolution are reported, not fabricated as Evo DPS", () => {
  const result = generateSelfMadeDecks(collection, defaults);
  const best = result.candidates[0];
  assert.ok(best.slots[2].chosen.card.name === "Archers",
    "The much stronger owned anti-air card should outrank the underlevelled one");
  assert.equal(best.slots[2].chosen.card.evo, true);
  assert.ok(best.suggestedEvolutions.includes("Archers"));
  assert.equal(best.slots[2].chosen.dps, null);
  assert.equal(best.slots[2].chosen.hp, null);
  assert.equal(best.slots[2].chosen.confidence, 0);
});

test("locked cards, exclusions and average-elixir cap are hard requirements", () => {
  const constraints = { ...defaults, include: [5], exclude: [3], maxElixir: 4 };
  const result = generateSelfMadeDecks(collection, constraints);
  assert.ok(result.candidates.length > 0);
  for (const candidate of result.candidates) {
    assert.ok(candidate.cards.some(c => c.id === 5));
    assert.ok(!candidate.cards.some(c => c.id === 3));
    assert.ok(candidate.evaluation.avg! <= 4);
  }
  const impossible = generateSelfMadeDecks(collection,
    { ...defaults, maxElixir: 2 });
  assert.equal(impossible.candidates.length, 0);
  assert.ok(impossible.issues.length > 0);
});

test("missing mandatory role and invalid locked card explain no result", () => {
  const noSplash = collection.filter(c => c.name !== "Baby Dragon");
  const missing = generateSelfMadeDecks(noSplash, defaults);
  assert.equal(missing.candidates.length, 0);
  assert.match(missing.issues.join(" "), /Air \+ splash/);
  const invalid = generateSelfMadeDecks(collection,
    { ...defaults, include:[10], exclude:[10] });
  assert.equal(invalid.candidates.length, 0);
  assert.match(invalid.issues[0], /conflict/);
});

test("deterministic recommendation and responsive search on a full catalog", () => {
  const first = generateSelfMadeDecks(collection, defaults);
  const second = generateSelfMadeDecks(collection, defaults);
  assert.equal(key(first.candidates[0].cards), key(second.candidates[0].cards));
  assert.equal(first.candidates[0].score, second.candidates[0].score);
  assert.equal(first.eligibleCardCount, collection.length);
});


test("special slots use eligible unique cards across Evolution, Hero and Wild", () => {
  const cards = collection.map(c => ({...c}));
  cards.find(c => c.name === "Valkyrie")!.hero = true;
  cards.push({
    ...own("Archer Queen", 12, 13, 5), rarity: "champion",
  });
  cards.push({
    ...own("Little Prince", 13, 14, 3), rarity: "champion",
  });
  const result = generateSelfMadeDecks(cards, defaults);
  assert.ok(result.candidates.length > 0);
  for (const candidate of result.candidates) {
    assert.ok(candidate.cards.filter(c =>
      c.rarity.toLowerCase() === "champion").length <= 2);
    assert.ok(candidate.specialSlots.length <= 3);
    assert.ok(new Set(candidate.specialSlots.map(s => s.card)).size ===
      candidate.specialSlots.length);
    assert.ok(new Set(candidate.specialSlots.map(s => s.slot)).size ===
      candidate.specialSlots.length);
    assert.ok(candidate.specialSlots.every(s =>
      candidate.cards.some(c => c.name === s.card)));
    assert.ok(candidate.specialSlots.every(s =>
      (s.slot === "Evolution" ? s.form === "evolution" :
        s.slot === "Hero" ? s.form === "hero" || s.form === "champion" :
        true)));
  }
});

test("Royal Giant focus cannot quietly substitute a different win condition", () => {
  const without = generateSelfMadeDecks(collection, defaults, null, "royal-giant");
  assert.equal(without.candidates.length, 0);
  assert.match(without.issues.join(" "), /Royal Giant focus/);
  const withGiant = generateSelfMadeDecks(
    [...collection, own("Royal Giant", 14, 12, 6)],
    defaults, null, "royal-giant");
  assert.ok(withGiant.candidates.length > 0);
  assert.ok(withGiant.candidates.every(c =>
    c.cards.some(x => x.name === "Royal Giant")));
  assert.ok(withGiant.candidates.every(c => c.playstyle.focus === "royal-giant"));
});


function mockMechanics(id:number,name:string,dps:number,damage:number,
  hp:number,kind:"Troop"|"Spell"="Troop"):MechanicsCard {
  return {
    id,name,kind,
    hpByLevel:Array(16).fill(hp),
    damageByLevel:Array(16).fill(damage),
    dpsByLevel:kind==="Troop"?Array(16).fill(dps):null,
    hitSpeedSeconds:kind==="Troop"?1:null,
    rangeTiles:kind==="Troop"?5.5:null,
    moveSpeedRaw:null,targetsAir:true,targetsGround:true,
    buildingsOnly:false,areaRadiusTiles:null,unitCount:1,
    deploySeconds:null,firstHitSeconds:null,specialAbility:false,
    provenance:"crtool-game-data",sourceUpdatedAt:"2026-11-18",
  };
}
function ownWithRoles(name:string,id:number,level:number,elixir:number,
  roles:string[],evo=false,hero=false):Card {
  return {...own(name,id,level,elixir,evo),roles,hero};
}

test("role-specific measured DPS beats a higher-level but weaker owned air defender",()=>{
  const low=ownWithRoles("Sky Expert",211,11,4,["Air defense"]);
  const high=ownWithRoles("Sky Novice",212,13,4,["Air defense"]);
  const cards=[...collection,low,high];
  const mechanics:MechanicsCatalog={
    source:"test exact-level combat data",fetchedAt:"2026-11-18T00:00:00Z",
    warnings:[],cards:[
      mockMechanics(low.id,low.name,520,520,1000),
      mockMechanics(high.id,high.name,90,90,1000),
    ],
  };
  const result=generateSelfMadeDecks(cards,defaults,mechanics);
  assert.ok(result.candidates.length>0);
  const role=result.candidates[0].slots.find(s=>s.id==="air")!;
  const ranked=[role.chosen,...role.alternatives];
  assert.equal(ranked.length,role.considered);
  assert.ok(ranked.find(x=>x.card.id===low.id)!.grade >
    ranked.find(x=>x.card.id===high.id)!.grade);
  assert.ok(ranked.find(x=>x.card.id===low.id)!.numericCoverage>0);
  assert.ok(ranked.find(x=>x.card.id===low.id)!.measured.some(x=>
    x.label==="Anti-air DPS" && x.value===520));
});

test("only owned cards enter full role rankings; special unlocks are not fake DPS",()=>{
  const cards=[...collection,
    ownWithRoles("Test Owned Air",301,12,4,["Air defense"],true,true),
    {...ownWithRoles("Test Unowned Air",302,16,4,["Air defense"]),owned:false},
  ];
  const result=generateSelfMadeDecks(cards,defaults);
  const role=result.candidates[0].slots.find(s=>s.id==="air")!;
  const ranked=[role.chosen,...role.alternatives];
  assert.ok(ranked.some(x=>x.card.id===301));
  assert.ok(!ranked.some(x=>x.card.id===302));
  const evolved=ranked.find(x=>x.card.id===301)!;
  assert.equal(evolved.specialBonus,5);
  assert.equal(evolved.dps,null);
  assert.equal(evolved.numericScore,null);
  assert.ok(evolved.card.evo && evolved.card.hero);
});

test("a costly mega-tank cannot win the cheap mini-tank role",()=>{
  const massive=ownWithRoles("Mega Knight",401,16,7,["Mini tank","Ground defense"]);
  const result=generateSelfMadeDecks([...collection,massive],defaults);
  assert.ok(result.candidates.length>0);
  const slot=result.candidates[0].slots.find(s=>s.id==="mini")!;
  assert.ok(![slot.chosen,...slot.alternatives]
    .some(x=>x.card.id===massive.id));
});

test("Bridge Pressure and Heavy Push can use archetype-specific role candidates",()=>{
  const bandit=own("Bandit",901,13,3);
  const royalGhost=own("Royal Ghost",902,13,3);
  const nightWitch=own("Night Witch",903,13,4);
  assert.equal(qualifiesForSelfSlot("mini",bandit),false);
  assert.equal(qualifiesForSelfSlot("mini",bandit,null,"bridge-pressure"),true);
  assert.equal(qualifiesForSelfSlot("ground",royalGhost,null,"bridge-pressure"),true);
  assert.equal(qualifiesForSelfSlot("mini",nightWitch),false);
  assert.equal(qualifiesForSelfSlot("mini",nightWitch,null,"heavy-push"),true);
});
