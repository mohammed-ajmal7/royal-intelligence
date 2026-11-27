import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("every player profile uses the shared high-resolution Clash Royale King portrait",()=>{
  const avatar=readFileSync(new URL("../src/components/ProfileAvatar.tsx",import.meta.url),"utf8");
  const page=readFileSync(new URL("../src/app/page.tsx",import.meta.url),"utf8");
  assert.match(avatar,/CLASH_ROYALE_KING_AVATAR/);
  assert.match(avatar,/clashroyale\.inbox\.supercell\.com/);
  assert.match(avatar,/alt="Clash Royale King"/);
  assert.doesNotMatch(avatar,/suppliedAvatarSnapshots|VUYRP9GQL|VGJYQYG0Q|screenshot snapshot/);
  assert.match(page,/PlayerProfileHeader player=\{player\}/);
  assert.doesNotMatch(page,/ProfileAvatar playerTag=\{player\.tag\}/);
});

test("player profile metadata resolves arena and clan artwork from each live player payload",()=>{
  const header=readFileSync(new URL("../src/components/PlayerProfileHeader.tsx",import.meta.url),"utf8");
  assert.match(header,/raw\.arena\?\.id/);
  assert.match(header,/raw\.clan\?\.badgeId/);
  assert.match(header,/getArenaConstants\(\)/);
  assert.match(header,/getBadgeConstants\(\)/);
  assert.match(header,/arena" \+ arenaNumber \+ "\.png"/);
  assert.match(header,/badges\/" \+ badge\.name \+ "\.png"/);
  assert.match(header,/player\.kingLevel/);
  assert.match(header,/player\.arena/);
  assert.match(header,/player\.clan/);
  assert.match(header,/KingTowerIcon/);
  assert.match(header,/PlayerAvatar|ProfileAvatar/);
});

test("profile metadata keeps visual fallbacks and responsive icon-led layout",()=>{
  const header=readFileSync(new URL("../src/components/PlayerProfileHeader.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../src/components/collection-card-details.css",import.meta.url),"utf8");
  assert.match(header,/<MapPin/);
  assert.match(header,/<Shield/);
  assert.match(header,/is-no-clan/);
  assert.match(css,/\.ri-profile-avatar-wrap/);
  assert.match(css,/\.ri-profile-meta/);
  assert.match(css,/\.ri-king-tower-icon/);
  assert.match(css,/@media\(max-width:560px\)/);
});
