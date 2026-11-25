import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { profileArtwork } from "../src/lib/profileArt";

const base="https://api-assets.clashroyale.com";

test("official player badge replaces arbitrary name initials",()=>{
  const art=profileArtwork({
    tag:"#VUYRP9GQL",name:"aju",
    badges:[{name:"Challenge12Wins",iconUrls:{large:base+"/badges/160/challenge.png"}}],
    currentFavouriteCard:{name:"Knight",iconUrls:{medium:base+"/cards/300/knight.png"}},
  });
  assert.deepEqual(art,{
    src:base+"/badges/160/challenge.png",
    alt:"Clash Royale player badge: Challenge12Wins",
    kind:"badge",
  });
});

test("an explicit future official profile icon takes priority over badge",()=>{
  const art=profileArtwork({
    profileIcon:{iconUrls:{large:base+"/profile/avatar.png"}},
    badges:[{name:"Rank",iconUrls:{large:base+"/badges/rank.png"}}],
  });
  assert.equal(art?.kind,"profile-icon");
});

test("favorite card artwork is a truthful fallback, never called Supercell ID avatar",()=>{
  const art=profileArtwork({
    badges:[],
    currentFavouriteCard:{name:"Archers",iconUrls:{medium:base+"/cards/300/archers.png"}},
  });
  assert.equal(art?.kind,"favorite-card");
  assert.match(art?.alt??"",/Favorite Clash Royale card: Archers/);
});

test("reject untrusted URLs and missing artwork",()=>{
  assert.equal(profileArtwork({badges:[{iconUrls:{large:"https://evil.test/cookie.png"}}]}),null);
  assert.equal(profileArtwork({badges:[{iconUrls:{large:"javascript:alert(1)"}}]}),null);
  assert.equal(profileArtwork({badges:[{iconUrls:{large:"http://api-assets.clashroyale.com/test.png"}}]}),null);
  assert.equal(profileArtwork({}),null);
});

test("profile UI has an image and personal avatar picker instead of initial",()=>{
  const page=readFileSync(new URL("../src/app/page.tsx",import.meta.url),"utf8");
  const ui=readFileSync(new URL("../src/components/ProfileAvatar.tsx",import.meta.url),"utf8");
  assert.match(page,/ProfileAvatar playerTag=\{player.tag\}/);
  assert.ok(!page.includes("player.name.slice(0,1).toUpperCase()"));
  assert.match(ui,/type="file"/);
  assert.match(ui,/localStorage\.setItem\(key, image\)/);
  assert.match(ui,/width = 240/);
  assert.match(ui,/onError=\{\(\) => setBroken\(true\)\}/);
});
