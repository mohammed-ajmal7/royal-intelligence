import { NextResponse } from "next/server";
import {
  MECHANICS_DATA_BASE,
  projectMechanics,
  type MechanicsCatalog,
} from "../../../lib/mechanics";

// Fetch the public community stats once per cache lifetime, not for every deck.
// Never forward the Supercell API token or any player-specific information.
export const runtime = "nodejs";
export const revalidate = 86_400;
const files = {
  cards: "cards.json",
  troop: "cards_stats_troop.json",
  characters: "cards_stats_characters.json",
  building: "cards_stats_building.json",
  spell: "cards_stats_spell.json",
  projectile: "cards_stats_projectile.json",
} as const;
type SourceKey = keyof typeof files;
let lastGood: MechanicsCatalog | null = null;
let lastAt = 0;
let pending: Promise<MechanicsCatalog> | null = null;
const day = 86_400_000;
async function readFile(name: string): Promise<unknown> {
  const result = await fetch(MECHANICS_DATA_BASE + "/" + name, {
    next: { revalidate: 86_400 },
    signal: AbortSignal.timeout(9_000),
    headers: { accept: "application/json" },
  });
  if (!result.ok) throw new Error("Community stats source returned " + result.status);
  const size = Number(result.headers.get("content-length") ?? 0);
  if (size > 9_000_000) throw new Error("Community stats file exceeded safe size");
  return result.json();
}
async function load(): Promise<MechanicsCatalog> {
  const fetched = await Promise.allSettled(
    (Object.keys(files) as SourceKey[]).map(async k => [k,await readFile(files[k])] as const),
  );
  const inputs: Record<SourceKey, unknown> = {
    cards: [],troop: [],characters: [],building: [],spell: [],projectile: [],
  };
  const warnings: string[] = [];
  fetched.forEach((entry,i) => {
    const key = (Object.keys(files) as SourceKey[])[i];
    if (entry.status === "fulfilled") inputs[key] = entry.value[1];
    else warnings.push(key + " community stats feed was unavailable.");
  });
  const result = projectMechanics(inputs);
  result.warnings.push(...warnings);
  if (!result.cards.length) throw new Error("No public combat-stat registry is available.");
  return result;
}
export async function GET() {
  if (lastGood && Date.now() - lastAt < day)
    return NextResponse.json(lastGood, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" },
    });
  if (!pending) pending = load().finally(() => { pending = null; });
  try {
    const catalog = await pending;
    lastGood = catalog;
    lastAt = Date.now();
    return NextResponse.json(catalog, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" },
    });
  } catch {
    if (lastGood) return NextResponse.json({
      ...lastGood,
      warnings: [...lastGood.warnings, "Showing last downloaded community stats because refresh failed."],
    });
    return NextResponse.json({
      error: "Verified level-specific combat statistics are temporarily unavailable. Only collection/roles/elixir can be evaluated.",
    }, { status: 503, headers: { "Cache-Control": "public, s-maxage=300" } });
  }
}
