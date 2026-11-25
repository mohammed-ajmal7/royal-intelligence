import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("the supplied Supercell ID avatar is an actual deployable WebP asset",()=>{
  const asset=readFileSync(new URL("../public/avatars/VUYRP9GQL.webp",import.meta.url));
  assert.ok(asset.length>500);
  assert.equal(asset.subarray(0,4).toString("ascii"),"RIFF");
  assert.equal(asset.subarray(8,12).toString("ascii"),"WEBP");
});

test("player profile displays supplied in-game avatar only for matching tag",()=>{
  const page=readFileSync(new URL("../src/app/page.tsx",import.meta.url),"utf8");
  const ui=readFileSync(new URL("../src/components/ProfileAvatar.tsx",import.meta.url),"utf8");
  assert.match(page,/ProfileAvatar playerTag=\{player.tag\}/);
  assert.match(ui,/tag === "VUYRP9GQL"/);
  assert.match(ui,/src="\/avatars\/VUYRP9GQL.webp"/);
  assert.match(ui,/<Crown size=\{28\}/);
  assert.ok(!ui.includes("type=\"file\""));
  assert.ok(!ui.includes("localStorage"));
  assert.ok(!ui.includes("profileArtwork"));
});

test("no misleading Supercell ID avatar auto-sync is promised",()=>{
  const ui=readFileSync(new URL("../src/components/ProfileAvatar.tsx",import.meta.url),"utf8");
  assert.match(ui,/NOT a live Supercell ID synchronization/);
});
