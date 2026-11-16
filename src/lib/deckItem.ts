import type { Card } from "./model";
import {
  getMechanicsRecord,
  resolveMechanics,
  statForLevel,
  type MechanicsCatalog,
  type MechanicsCard,
  type MechanicsKind,
  type MechanicsGroupUnit,
  type ResolvedMechanics,
} from "./mechanics";

/**
 * Source of truth:
 * - IDs, ownership, player levels, rarity and elixir: official Supercell API.
 * - Combat statistics and level tables: independently maintained community
 *   game files, never represented as an official or current-patch stat feed.
 *
 * There is no official, complete per-level combat-stat API. We only rank
 * values actually present in the community reference; unknown stays null.
 */
export type ItemCategory = "defense" | "attack";
export type DefenseMetric = "hits" | "hp";
export type AttackMetric = "hit" | "dps";
export type ItemType = "all" | MechanicsKind;
export type LevelMode = "comparison" | "player";
export type LevelOrigin = "reference" | "player" | "unavailable";
export type KindOrigin = "community" | "id-family" | "unknown";

export type ItemRankingOptions = {
  category: ItemCategory;
  defenseMetric: DefenseMetric;
  attackMetric: AttackMetric;
  kind: ItemType;
  ownedOnly: boolean;
  query: string;
  incomingDamage: number;
  /** Same reference level for every card, owned or unowned, for fair comparisons. */
  levelMode: LevelMode;
  /** Reference game level, not an unlock or an upgrade to a real account. */
  referenceLevel: number;
};

export type RankedItem = {
  card: Card;
  kind: MechanicsKind | null;
  kindOrigin: KindOrigin;
  level: number | null;
  levelOrigin: LevelOrigin;
  rank: number | null;
  value: number | null;
  unit: string;
  hp: number | null;
  damage: number | null;
  dps: number | null;
  hitsToDefeat: number | null;
  hitsSurvived: number | null;
  unitCount: number | null;
  /** One entry per distinct member type, not an aggregate health bar. */
  groupUnits: RankedGroupUnit[];
  primaryUnitName: string | null;
  attackInterval: number | null;
  rangeTiles: number | null;
  moveSpeedRaw: number | null;
  targetsAir: boolean | null;
  targetsGround: boolean | null;
  buildingsOnly: boolean | null;
  splashRadiusTiles: number | null;
  deploySeconds: number | null;
  firstHitSeconds: number | null;
  specialAbility: boolean | null;
  /** Distinguish damage/HP of one spawned unit from direct card effects. */
  statSubject: "card" | "spawned-unit";
  statSubjectLabel: string | null;
  sourceUrl: string | null;
  sourceUpdatedAt: string | null;
  available: boolean;
  missingReason: string | null;
};

export type RankedGroupUnit = {
  name: string;
  count: number | null;
  hp: number | null;
  damage: number | null;
  dps: number | null;
  shieldHp: number | null;
  hitSpeedSeconds: number | null;
  targetsAir: boolean | null;
  targetsGround: boolean | null;
  rangeTiles: number | null;
  rangeLabel: string | null;
  moveSpeedLabel: string | null;
  hitsToDefeat: number | null;
  hitsSurvived: number | null;
  sourceUrl: string | null;
};

/** Resolves one body of each unit type. A group's HP cannot be pooled. */
export function groupAtLevel(
  members: MechanicsGroupUnit[] | undefined,
  level: number | null,
  incomingDamage: number,
): RankedGroupUnit[] {
  return (members ?? []).map(member => {
    const hp = statForLevel(member.hpByLevel,level);
    const damage = statForLevel(member.damageByLevel,level);
    const explicitDps = statForLevel(member.dpsByLevel ?? null,level);
    const dps = explicitDps ?? (
      damage !== null && member.hitSpeedSeconds !== null &&
      member.hitSpeedSeconds > 0 ? damage / member.hitSpeedSeconds : null);
    const shieldHp = statForLevel(member.shieldHpByLevel ?? null,level);
    const hits = hitsToDefeat(hp,incomingDamage);
    return {
      name:member.name,count:member.count,hp,damage,dps,shieldHp,
      hitSpeedSeconds:member.hitSpeedSeconds,
      targetsAir:member.targetsAir ?? null,
      targetsGround:member.targetsGround ?? null,
      rangeTiles:member.rangeTiles ?? null,
      rangeLabel:member.rangeLabel ?? null,
      moveSpeedLabel:member.moveSpeedLabel ?? null,
      hitsToDefeat:hits,hitsSurvived:hits===null?null:hits-1,
      sourceUrl:member.sourceUrl ?? null,
    };
  });
}

export type ItemLevelRow = {
  level: number;
  hp: number | null;
  damage: number | null;
  dps: number | null;
  hitsToDefeat: number | null;
  hitsSurvived: number | null;
  hasNumericalStats: boolean;
};

export const defaultItemOptions: ItemRankingOptions = {
  category: "attack",
  defenseMetric: "hits",
  attackMetric: "hit",
  kind: "all",
  ownedOnly: false,
  query: "",
  incomingDamage: 200,
  levelMode: "comparison",
  referenceLevel: 11,
};

/**
 * Assumes fixed incoming damage to ONE unit, without shields, resistances,
 * healing, buffs, simultaneous hits or building lifetime decay.
 * The lethal hit is included in hitsToDefeat, not in hitsSurvived.
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

const validLevel = (value: number | null): value is number =>
  value !== null && Number.isInteger(value) && value >= 1 && value <= 30;

export function selectedItemLevel(
  card: Card,
  options: ItemRankingOptions,
): { level: number | null; origin: LevelOrigin } {
  if (options.levelMode === "player" && card.owned && validLevel(card.level)) {
    return { level: card.level, origin: "player" };
  }
  if (validLevel(options.referenceLevel)) {
    return { level: options.referenceLevel, origin: "reference" };
  }
  return { level: null, origin: "unavailable" };
}

/**
 * An official ID identifies the card family. Its prefix can classify an
 * otherwise absent card in an old community registry, but does NOT provide
 * combat stats. Such classification is labelled "ID family" in the UI.
 */
export function classifyCard(
  card: Card,
  mechanics: ResolvedMechanics | null,
): { kind: MechanicsKind | null; origin: KindOrigin } {
  if (mechanics && mechanics.kind !== "Other") {
    return { kind: mechanics.kind, origin: "community" };
  }
  const family = Math.floor(card.id / 1_000_000);
  const kind: MechanicsKind | null =
    family === 26 ? "Troop" :
    family === 27 ? "Building" :
    family === 28 ? "Spell" : null;
  return { kind, origin: kind ? "id-family" : "unknown" };
}

function missingValueReason(
  item: MechanicsCard | undefined,
  mechanics: ResolvedMechanics | null,
  kind: MechanicsKind | null,
  level: number | null,
  options: ItemRankingOptions,
): string {
  if (!item || !mechanics) {
    return "No community combat-stat record for this card.";
  }
  if (level === null) return "Select an available reference level.";
  if (options.category === "defense" && kind === "Spell") {
    return "A direct spell has no unit hitpoints.";
  }
  if (options.category === "defense") {
    if (options.defenseMetric === "hits" &&
        hitsToDefeat(1, options.incomingDamage) === null) {
      return "Enter valid incoming damage (1–100,000).";
    }
    return "No recorded hitpoints for this level.";
  }
  if (options.attackMetric === "dps") {
    return "Damage per hit or attack interval is unavailable at this level.";
  }
  return "No recorded direct damage at this level (may be a spawner or utility).";
}

export function rankDeckItems(
  cards: Card[],
  catalog: MechanicsCatalog | null | undefined,
  options: ItemRankingOptions,
): RankedItem[] {
  const seen = new Set<number>();
  const filter = options.query.trim().toLocaleLowerCase();
  const ranked: RankedItem[] = [];
  for (const card of cards) {
    if (card.tower || seen.has(card.id)) continue;
    seen.add(card.id);
    if (options.ownedOnly && !card.owned) continue;
    if (filter && !card.name.toLocaleLowerCase().includes(filter)) continue;

    const chosen = selectedItemLevel(card, options);
    const record = getMechanicsRecord(card, catalog);
    const m = resolveMechanics({ id: card.id, name: card.name, level: chosen.level }, catalog);
    const classified = classifyCard(card, m);
    if (
      options.kind !== "all" &&
      !(options.kind === "Other"
        ? classified.kind === null || classified.kind === "Other"
        : classified.kind === options.kind)
    ) continue;
    const groupUnits = groupAtLevel(record?.groupUnits, chosen.level,
      options.incomingDamage);
    // For mixed squads a leaderboard shows the strongest INDIVIDUAL member
    // for the selected metric, never sum of all separate HP bars.
    const metric = (member: RankedGroupUnit): number | null =>
      options.category === "defense"
        ? options.defenseMetric === "hits" ? member.hitsToDefeat : member.hp
        : options.attackMetric === "hit" ? member.damage : member.dps;
    const primary = groupUnits.length > 0
      ? [...groupUnits].sort((a,b) =>
          (metric(b) ?? -1) - (metric(a) ?? -1))[0] : null;
    const hp = primary?.hp ?? m?.hitpoints ?? null;
    const damage = primary?.damage ?? m?.damage ?? null;
    const dps = primary?.dps ?? m?.dps ?? null;
    const hits = primary?.hitsToDefeat ?? hitsToDefeat(hp, options.incomingDamage);
    const value = options.category === "defense"
      ? options.defenseMetric === "hits" ? hits : hp
      : options.attackMetric === "hit" ? damage : dps;
    const available = value !== null && Number.isFinite(value);
    ranked.push({
      card,
      kind: classified.kind,
      kindOrigin: classified.origin,
      level: chosen.level,
      levelOrigin: chosen.origin,
      rank: null,
      value,
      unit: groupUnits.length > 0
        ? options.category === "defense"
          ? options.defenseMetric === "hits"
            ? "hits to defeat one " + (primary?.name ?? "unit")
            : "HP per " + (primary?.name ?? "unit")
          : options.attackMetric === "hit"
            ? "damage per " + (primary?.name ?? "unit") + " hit"
            : "DPS per " + (primary?.name ?? "unit")
        : options.category === "defense"
          ? options.defenseMetric === "hits" ? "hits to defeat" : "HP per unit"
          : options.attackMetric === "hit" ? "damage per hit" : "DPS per unit",
      hp, damage, dps,
      hitsToDefeat: hits,
      hitsSurvived: hits === null ? null : hits - 1,
      unitCount: groupUnits.length && groupUnits.every(u=>u.count!==null)
        ? groupUnits.reduce((sum,u)=>sum+(u.count??0),0)
        : m?.unitCount ?? null,
      groupUnits,
      primaryUnitName:primary?.name ?? null,
      attackInterval: primary?.hitSpeedSeconds ?? m?.hitSpeedSeconds ?? null,
      rangeTiles: m?.rangeTiles ?? null,
      moveSpeedRaw: m?.moveSpeedRaw ?? null,
      targetsAir: m?.targetsAir ?? null,
      targetsGround: m?.targetsGround ?? null,
      buildingsOnly: m?.buildingsOnly ?? null,
      splashRadiusTiles: m?.splashRadiusTiles ?? null,
      deploySeconds: m?.deploySeconds ?? null,
      firstHitSeconds: m?.firstHitSeconds ?? null,
      specialAbility: m?.specialAbility ?? null,
      statSubject: groupUnits.length ? "spawned-unit" : record?.statSubject ?? "card",
      statSubjectLabel: primary?.name ?? record?.statSubjectLabel ?? null,
      sourceUrl: record?.sourceUrl ?? null,
      sourceUpdatedAt: record?.sourceUpdatedAt ?? null,
      available,
      missingReason: available ? null :
        missingValueReason(record, m, classified.kind, chosen.level, options),
    });
  }

  ranked.sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    if (a.available && b.available) {
      const difference = b.value! - a.value!;
      if (difference !== 0) return difference;
      // Same number of lethal hits: greater remaining HP sorts first, but
      // tied metric values still share the SAME leaderboard rank.
      if (options.category === "defense" && options.defenseMetric === "hits") {
        const hpDelta = (b.hp ?? 0) - (a.hp ?? 0);
        if (hpDelta !== 0) return hpDelta;
      }
    }
    return a.card.name.localeCompare(b.card.name) || a.card.id - b.card.id;
  });

  let lastValue: number | null = null;
  let denseRank = 0;
  for (const item of ranked) {
    if (!item.available) continue;
    if (lastValue !== item.value) denseRank++;
    item.rank = denseRank;
    lastValue = item.value;
  }
  return ranked;
}

/**
 * Every level for which this reference publishes a numeric array entry is
 * exposed. Missing years/levels are not synthesized by 10% scaling.
 * Zero-padded rarity gaps are displayed as unavailable.
 */
export function itemLevelRows(
  card: Card,
  catalog: MechanicsCatalog | null | undefined,
  incomingDamage: number,
  playerCap = 16,
): ItemLevelRow[] {
  const reference = getMechanicsRecord(card, catalog);
  const length = Math.min(30, Math.max(
    validLevel(playerCap) ? playerCap : 16,
    reference?.hpByLevel?.length ?? 0,
    reference?.damageByLevel?.length ?? 0,
  ));
  const rows: ItemLevelRow[] = [];
  for (let level = 1; level <= length; level++) {
    const hp = statForLevel(reference?.hpByLevel ?? null, level);
    const damage = statForLevel(reference?.damageByLevel ?? null, level);
    const interval = reference?.hitSpeedSeconds ?? null;
    const explicitDps=statForLevel(reference?.dpsByLevel ?? null,level);
    const dps=explicitDps ?? (
      reference?.kind === "Spell" && reference?.statSubject !== "spawned-unit"
        ? null
        : damage !== null && interval !== null && interval > 0
          ? damage / interval : null
    );
    const hits = hitsToDefeat(hp, incomingDamage);
    rows.push({
      level, hp, damage, dps,
      hitsToDefeat: hits,
      hitsSurvived: hits === null ? null : hits - 1,
      hasNumericalStats: hp !== null || damage !== null,
    });
  }
  return rows;
}
