import type { Card } from "./model";
import {
  resolveMechanics,
  type MechanicsCatalog,
  type MechanicsKind,
} from "./mechanics";

/** Rankings use observed card stats, never subjective defense/attack weights. */
export type ItemCategory = "defense" | "attack";
export type DefenseMetric = "hits" | "hp";
export type AttackMetric = "hit" | "dps";
export type ItemType = "all" | "Troop" | "Building" | "Spell";
export type ItemRankingOptions = {
  category: ItemCategory;
  defenseMetric: DefenseMetric;
  attackMetric: AttackMetric;
  kind: ItemType;
  ownedOnly: boolean;
  query: string;
  incomingDamage: number;
};
export type RankedItem = {
  card: Card;
  kind: MechanicsKind | null;
  rank: number | null;
  value: number | null;
  unit: string;
  hp: number | null;
  damage: number | null;
  dps: number | null;
  hitsToDefeat: number | null;
  hitsSurvived: number | null;
  unitCount: number | null;
  available: boolean;
};
export const defaultItemOptions: ItemRankingOptions = {
  category: "defense",
  defenseMetric: "hits",
  attackMetric: "hit",
  kind: "all",
  ownedOnly: true,
  query: "",
  incomingDamage: 200,
};

/**
 * One direct attack (fixed damage, no shield or damage mitigation) against one
 * unit with HP. 'Hits to defeat' includes the fatal blow.
 * The number of complete hits survived is exactly one fewer.
 * This is not a lifetime/per-elixir/total-group HP simulation.
 */
export function hitsToDefeat(
  hitpoints: number | null,
  incomingDamage: number,
): number | null {
  if (hitpoints === null || !Number.isFinite(hitpoints) || hitpoints <= 0 ||
      !Number.isFinite(incomingDamage) || incomingDamage < 1 ||
      incomingDamage > 100_000) return null;
  return Math.ceil(hitpoints / incomingDamage);
}

export function rankDeckItems(
  cards: Card[],
  catalog: MechanicsCatalog | null | undefined,
  options: ItemRankingOptions,
): RankedItem[] {
  const seen = new Set<number>();
  const filter = options.query.trim().toLowerCase();
  const rows: RankedItem[] = [];
  for (const card of cards) {
    if (seen.has(card.id) || card.tower) continue;
    seen.add(card.id);
    if (options.ownedOnly && !card.owned) continue;
    if (filter && !card.name.toLowerCase().includes(filter)) continue;
    const m = resolveMechanics(card, catalog);
    const kind = m?.kind ?? null;
    // Unknown source classification must not be silently called a troop.
    if (options.kind !== "all" && kind !== options.kind) continue;
    const hp = card.owned ? m?.hitpoints ?? null : null;
    const damage = card.owned ? m?.damage ?? null : null;
    const dps = card.owned ? m?.dps ?? null : null;
    const hits = hitsToDefeat(hp, options.incomingDamage);
    const value = options.category === "defense"
      ? options.defenseMetric === "hits" ? hits : hp
      : options.attackMetric === "hit" ? damage : dps;
    rows.push({
      card,
      kind,
      rank: null,
      value,
      unit: options.category === "defense"
        ? options.defenseMetric === "hits" ? "hits to defeat" : "HP per unit"
        : options.attackMetric === "hit" ? "damage per hit" : "DPS per unit",
      hp,damage,dps,
      hitsToDefeat: hits,
      hitsSurvived: hits === null ? null : hits - 1,
      unitCount: m?.unitCount ?? null,
      available: value !== null && Number.isFinite(value),
    });
  }
  rows.sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    if (a.available && b.available) {
      const difference = b.value! - a.value!;
      if (difference !== 0) return difference;
      // Same hit count? Prefer the higher actual HP.
      if (options.category === "defense" && options.defenseMetric === "hits") {
        const hpDelta = (b.hp ?? 0) - (a.hp ?? 0);
        if (hpDelta !== 0) return hpDelta;
      }
    }
    return a.card.name.localeCompare(b.card.name) || a.card.id - b.card.id;
  });
  // Dense ranks for ties, as a leaderboard should show; cards missing stats
  // are unranked. When equal hit counts but HP differs, the rank is distinct
  // because higher HP breaks the tie for survivability.
  let rank = 0;
  let lastValue: number | null = null;
  let lastHp: number | null = null;
  for (const row of rows) {
    if (!row.available) continue;
    if (lastValue !== row.value ||
      (options.category === "defense" && options.defenseMetric === "hits" &&
       lastHp !== row.hp)) rank++;
    row.rank = rank;
    lastValue = row.value;
    lastHp = row.hp;
  }
  return rows;
}
