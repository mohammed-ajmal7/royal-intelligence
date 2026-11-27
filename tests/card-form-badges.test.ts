import test from "node:test";
import assert from "node:assert/strict";
import { getCardFormBadges } from "../src/lib/cardFormBadges";

test("unlocked Evolution and locked Hero forms produce separate status badges",()=>{
  const badges=getCardFormBadges({
    hasEvolution:true,
    hasHero:true,
    evolutionImage:"https://example.com/evolution.png",
    heroImage:"https://example.com/hero.png",
    evo:true,
    hero:false,
  });
  assert.deepEqual(badges,[
    {form:"evolution",unlocked:true},
    {form:"hero",unlocked:false},
  ]);
});

test("available but not unlocked forms remain visible as locked badges",()=>{
  const badges=getCardFormBadges({
    hasEvolution:true,
    hasHero:true,
    evolutionImage:undefined,
    heroImage:undefined,
    evo:false,
    hero:null,
  });
  assert.deepEqual(badges,[
    {form:"evolution",unlocked:false},
    {form:"hero",unlocked:false},
  ]);
});

test("a card with only base artwork receives no form badge",()=>{
  assert.deepEqual(getCardFormBadges({
    hasEvolution:false,
    hasHero:false,
    evolutionImage:undefined,
    heroImage:undefined,
    evo:false,
    hero:false,
  }),[]);
});

test("special form artwork can identify form availability even if flags are missing",()=>{
  assert.deepEqual(getCardFormBadges({
    hasEvolution:undefined,
    hasHero:undefined,
    evolutionImage:"https://example.com/evolution.png",
    heroImage:"https://example.com/hero.png",
    evo:null,
    hero:true,
  }),[
    {form:"evolution",unlocked:false},
    {form:"hero",unlocked:true},
  ]);
});
