import type { Card } from "./model";
import { resolveMechanics, type MechanicsCatalog } from "./mechanics";
import { hitsToDefeat } from "./deckItem";

export type CardStat = {
  key: string;
  label: string;
  unit: string;
  direction: "higher" | "lower" | "neutral";
  value: number | null;
};
export function detailStats(
  card: Card,
  catalog: MechanicsCatalog | null,
  level: number | null,
  incoming: number,
): CardStat[] {
  const m = resolveMechanics({ id: card.id, level }, catalog);
  return [
    ["hp", "Hitpoints per unit", "HP", "higher", m?.hitpoints],
    ["damage", "Damage per hit / spell impact", "damage", "higher", m?.damage],
    ["dps", "Steady damage per second", "DPS", "higher", m?.dps],
    [
      "hits",
      "Hits to defeat",
      "hits",
      "higher",
      hitsToDefeat(m?.hitpoints ?? null, incoming),
    ],
    ["elixir", "Elixir cost", "elixir", "lower", card.elixir],
    ["interval", "Attack interval", "s", "lower", m?.hitSpeedSeconds],
    ["range", "Attack range", "tiles", "higher", m?.rangeTiles],
    [
      "speed",
      "Movement speed (source units)",
      "raw",
      "neutral",
      m?.moveSpeedRaw,
    ],
    ["splash", "Splash radius", "tiles", "higher", m?.splashRadiusTiles],
    ["count", "Units deployed", "units", "neutral", m?.unitCount],
    ["deploy", "Deployment time", "s", "lower", m?.deploySeconds],
    ["first", "Initial attack load time", "s", "lower", m?.firstHitSeconds],
  ].map(([key, label, unit, direction, value]) => ({
    key,
    label,
    unit,
    direction,
    value: typeof value === "number" && Number.isFinite(value) ? value : null,
  })) as CardStat[];
}
export function comparisonDelta(
  a: number | null,
  b: number | null,
  direction: CardStat["direction"],
) {
  if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b))
    return { delta: null, tone: "unknown" } as const;
  const delta = Math.round((a - b) * 1000) / 1000;
  return {
    delta,
    tone:
      delta === 0 || direction === "neutral"
        ? "equal"
        : (direction === "higher" ? delta > 0 : delta < 0)
          ? "better"
          : "worse",
  } as const;
}
export const formatStat = (n: number | null) =>
  n === null
    ? "Unavailable"
    : n.toLocaleString("en-US", { maximumFractionDigits: 2 });
export const signedStat = (n: number | null) =>
  n === null
    ? "Not comparable"
    : n === 0
      ? "= 0"
      : `${n > 0 ? "+" : "−"}${formatStat(Math.abs(n))}`;
