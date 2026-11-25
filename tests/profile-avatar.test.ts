import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { suppliedAvatarSnapshots } from "../src/components/ProfileAvatar";

function webp(path: string) {
  const asset = readFileSync(new URL("../public" + path, import.meta.url));
  assert.ok(asset.length > 500);
  assert.equal(asset.subarray(0,4).toString("ascii"), "RIFF");
  assert.equal(asset.subarray(8,12).toString("ascii"), "WEBP");
}

test("supplied screenshots generate real, deployable avatar assets", () => {
  assert.equal(suppliedAvatarSnapshots.VUYRP9GQL, "/avatars/VUYRP9GQL.webp");
  assert.equal(suppliedAvatarSnapshots.VGJYQYG0Q, "/avatars/VGJYQYG0Q.webp");
  for (const path of Object.values(suppliedAvatarSnapshots)) webp(path);
});

test("profile images are exact-player snapshots; unavailable profiles show an honest fallback", () => {
  const page = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
  const ui = readFileSync(new URL("../src/components/ProfileAvatar.tsx", import.meta.url), "utf8");
  assert.match(page, /ProfileAvatar playerTag=\{player.tag\}/);
  assert.match(ui, /suppliedAvatarSnapshots\[tag\]/);
  assert.match(ui, /<UserRound size=\{26\}/);
  assert.match(ui, /Player avatar unavailable through the public Clash Royale API/);
  assert.ok(!ui.includes('type="file"'));
  assert.ok(!ui.includes("localStorage"));
});

test("profile images cannot be falsely presented as synced Supercell or platform avatars", () => {
  const ui = readFileSync(new URL("../src/components/ProfileAvatar.tsx", import.meta.url), "utf8");
  assert.match(ui, /NOT live Supercell ID avatars/);
  assert.match(ui, /Not automatically synchronized/);
  assert.match(ui, /Game Center avatar IDs/);
  assert.match(ui, /Google Play Games avatar IDs/);
});
