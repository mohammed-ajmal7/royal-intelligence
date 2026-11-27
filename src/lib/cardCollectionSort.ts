import type { Card } from "./model";
import {
  getMechanicsRecord,
  resolveMechanics,
  type MechanicsCatalog,
} from "./mechanics";

export type CardStatSortMetric = "none" | "hitpoints" | "damage" | "dps";
export type CardStatSortMode = "current" | "max";

function metricLevelCount(
  card: Card,
  metric: Exclude<CardStatSortMetric, "none">,
  catalog: MechanicsCatalog,
): number {
  const record = getMechanicsRecord(card, catalog);
  if (!record) return 0;
  if (metric === "hitpoints") return record.hpByLevel?.length ?? 0;
  if (metric === "damage") return record.damageByLevel?.length ?? 0;
  if (record.dpsByLevel?.length) return record.dpsByLevel.length;
  if (record.kind === "Spell" && record.statSubject !== "spawned-unit") return 0;
  return record.damageByLevel?.length ?? 0;
}

function valueAtLevel(
  card: Card,
  metric: Exclude<CardStatSortMetric, "none">,
  level: number,
  catalog: MechanicsCatalog,
): number | null {
  const resolved = resolveMechanics({ id: card.id, name: card.name, level }, catalog);
  if (!resolved) return null;
  const value = resolved[metric];
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

/**
 * Current uses the actual level in the player's card collection.
 * Max uses the highest published level for that metric; no scaling is guessed.
 */
export function cardStatSortValue(
  card: Card,
  metric: Exclude<CardStatSortMetric, "none">,
  mode: CardStatSortMode,
  catalog: MechanicsCatalog | null | undefined,
): number | null {
  if (!catalog) return null;

  if (mode === "current") {
    return card.level == null ? null : valueAtLevel(card, metric, card.level, catalog);
  }

  const count = metricLevelCount(card, metric, catalog);
  for (let level = count; level >= 1; level--) {
    const value = valueAtLevel(card, metric, level, catalog);
    if (value !== null) return value;
  }
  return null;
}

/** Highest values first; cards without a published value stay at the bottom. */
export function sortCardsByStat(
  cards: readonly Card[],
  metric: CardStatSortMetric,
  mode: CardStatSortMode,
  catalog: MechanicsCatalog | null | undefined,
): Card[] {
  if (metric === "none") return [...cards];

  return cards
    .map((card, index) => ({
      card,
      index,
      value: cardStatSortValue(card, metric, mode, catalog),
    }))
    .sort((a, b) => {
      if (a.value == null && b.value == null) return a.index - b.index;
      if (a.value == null) return 1;
      if (b.value == null) return -1;
      return b.value - a.value || a.index - b.index;
    })
    .map(entry => entry.card);
}
