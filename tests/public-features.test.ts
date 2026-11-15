import test from "node:test";
import assert from "node:assert/strict";
import { api, clearCache } from "../server/service";
import { demo } from "../src/lib/demo";
import {
  emptyHistory, mergeHistory, withSnapshot,
  readLocalHistory, writeLocalHistory, clearLocalHistory,
} from "../src/lib/localHistory";

const cards = Array.from({ length: 8 }, (_, i) => ({
  id: 26000000 + i, name: "Card" + i, level: 10, maxLevel: 16,
  elixirCost: 3, rarity: "common",
}));
const apiEnv = { CLASH_API_TOKEN: "mock-token", CLASH_API_BASE: "https://proxy.royaleapi.dev/v1" };
test("anonymous player scouting returns only a valid public deck and never a token", async () => {
  clearCache();
  const requests: string[] = [];
  const mock: typeof fetch = async (input) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith("/cards")) return Response.json({ items: cards });
    if (url.includes("/players/")) return Response.json({
      tag: "#VUYRP9GQL", name: "aju", trophies: 2456,
      cards, currentDeck: cards,
    });
    return new Response("", { status: 404 });
  };
  const r = await api(new Request("https://x.test/api/scout?tag=VUYRP9GQL"), apiEnv, mock);
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.tag, "#VUYRP9GQL");
  assert.equal(body.deck.length, 8);
  assert.equal(body.name, "aju");
  assert.ok(requests.some((s) => s.endsWith("/players/%23VUYRP9GQL")));
  assert.ok(!JSON.stringify(body).includes(apiEnv.CLASH_API_TOKEN));
  assert.ok(!requests.some((s) => s.includes("battlelog") || s.includes("upcomingchests")));
});
test("public clan lookup loads verified clan data and member roster", async () => {
  clearCache();
  const mock: typeof fetch = async (input) => {
    const u = String(input);
    if (u.endsWith("/members")) return Response.json({ items: [
      { tag: "#VUYRP9GQL", name: "aju", trophies: 2000, role: "member" },
    ] });
    if (u.includes("/clans/")) return Response.json({
      tag: "#PYC98Q", name: "Team", clanScore: 12345, members: 1,
    });
    return new Response("", { status: 404 });
  };
  const r = await api(new Request("https://x.test/api/clan?tag=%23PYC98Q"), apiEnv, mock);
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.clan.name, "Team");
  assert.equal(body.members[0].tag, "#VUYRP9GQL");
  assert.deepEqual(body.warnings, []);
});
test("clan profile still loads when members endpoint fails", async () => {
  clearCache();
  const mock: typeof fetch = async (input) =>
    String(input).endsWith("/members")
      ? new Response("", { status: 503 })
      : Response.json({ tag: "#PYC98Q", name: "Team" });
  const r = await api(new Request("https://x.test/api/clan?tag=PYC98Q"), apiEnv, mock);
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.clan.name, "Team");
  assert.equal(body.members.length, 0);
  assert.equal(body.warnings.length, 1);
});
test("browser records are bounded, deduplicated and isolated by player tag", () => {
  const store = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    },
  });
  try {
    const s = { ...demo(), mode: "live" as const, tag: "#VUYRP9GQL" };
    const h = withSnapshot(emptyHistory(), s);
    const twice = withSnapshot(h, s);
    assert.equal(twice.snapshots.length, 1);
    assert.equal(twice.battles.length, s.battles.length);
    assert.ok(writeLocalHistory(s.tag, twice));
    const read = readLocalHistory("#VUYRP9GQL");
    assert.equal(read.snapshots.length, 1);
    assert.equal(read.snapshots[0].raw, null);
    assert.equal(readLocalHistory("#PUV9GQ").snapshots.length, 0);
    const choice = { id: "choice1", observed: "2026-11-15T10:00:00Z", cards: s.deck.map(c=>c.id), mode: "Best overall", score: 50 };
    const merged = mergeHistory(read, { snapshots: [], battles: [], choices: [choice, choice] });
    assert.equal(merged.choices.length, 1);
    assert.equal(merged.choices[0].cards.length, 8);
    assert.ok(clearLocalHistory(s.tag));
    assert.equal(readLocalHistory(s.tag).snapshots.length, 0);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
