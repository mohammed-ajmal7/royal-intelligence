import { recentCardReference } from "./recentCardMechanics";
import { sourcedGroupReference, withGroupComposition } from "./groupCardReferences";

/**
 * Mechanics are a SECOND, community-maintained dataset, not a Supercell player
 * API response. Missing fields are always null; no level scaling is invented.
 * Source: https://github.com/RoyaleAPI/cr-api-data
 */
export const MECHANICS_SOURCE = "https://github.com/RoyaleAPI/cr-api-data";
export const MECHANICS_DATA_BASE =
  "https://royaleapi.github.io/cr-api-data/json";
export type MechanicsKind = "Troop" | "Building" | "Spell" | "Other";

/** Each base-deployment group member has independent HP, targeting and attacks. */
export type MechanicsGroupUnit = {
  name: string;
  count: number | null;
  hpByLevel: number[] | null;
  damageByLevel: number[] | null;
  dpsByLevel?: number[] | null;
  shieldHpByLevel?: number[] | null;
  hitSpeedSeconds: number | null;
  targetsAir?: boolean | null;
  targetsGround?: boolean | null;
  rangeTiles?: number | null;
  rangeLabel?: string;
  moveSpeedLabel?: string;
  sourceUrl?: string;
};

export type MechanicsCard = {
  id: number;
  name: string;
  kind: MechanicsKind;
  hpByLevel: number[] | null;
  damageByLevel: number[] | null;
  /** Explicit damage-per-second array, if the source publishes it. */
  dpsByLevel?: number[] | null;
  hitSpeedSeconds: number | null;
  rangeTiles: number | null;
  moveSpeedRaw: number | null;
  targetsAir: boolean | null;
  targetsGround: boolean | null;
  buildingsOnly: boolean | null;
  areaRadiusTiles: number | null;
  unitCount: number | null;
  /** Base deployment composition; HP is NEVER a shared group health bar. */
  groupUnits?: MechanicsGroupUnit[];
  deploySeconds: number | null;
  firstHitSeconds: number | null;
  specialAbility: boolean;
  /** The data source may be behind current balance patches. */
  provenance: "royaleapi-community" | "crtool-game-data";
  /** Either the played unit or a separately identified spawned unit. */
  statSubject?: "card" | "spawned-unit";
  statSubjectLabel?: string;
  sourceUrl?: string;
  sourceUpdatedAt?: string;
  /** Direct source labels for non-numeric movement and melee range. */
  moveSpeedLabel?: string;
  rangeLabel?: string;
  /** Every numeric level column in the chosen public reference. */
  extraStatsByLevel?: Record<string, number[]>;
  /** Other explicitly labelled source sections: Evolutions, Heroes, summons. */
  extraFormsByLevel?: Record<string, Record<string, number[]>>;
  description?: string;
  /** Public source records, kept separate to preserve units and provenance. */
  sourceRecords?: Record<string, Record<string, unknown>>;
};
export type MechanicsCatalog = {
  source: string;
  fetchedAt: string;
  sourceUpdatedAt?: string | null;
  cards: MechanicsCard[];
  warnings: string[];
};
type Row = Record<string, unknown>;
type StatInputs = {
  cards: unknown;
  troop: unknown;
  characters: unknown;
  building: unknown;
  spell: unknown;
  projectile: unknown;
};
const rows = (source: unknown): Row[] =>
  Array.isArray(source)
    ? source.filter(
        (r): r is Row => !!r && typeof r === "object" && !Array.isArray(r),
      )
    : [];
const clean = (v: unknown): string =>
  typeof v === "string" ? v.replace(/[^a-z0-9]/gi, "").toLowerCase() : "";
const n = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const bool = (v: unknown): boolean | null =>
  typeof v === "boolean" ? v : null;
const units = (v: unknown): number | null => {
  const x = n(v);
  return x === null || x < 0 ? null : x / 1000;
};
const seconds = (v: unknown): number | null => {
  const x = n(v);
  return x === null || x <= 0 ? null : x / 1000;
};
const leveled = (v: unknown): number[] | null =>
  Array.isArray(v) &&
  v.length >= 2 &&
  v.every((x) => typeof x === "number" && Number.isFinite(x) && x >= 0)
    ? v.slice(0, 20)
    : null;
const prefer = (...values: unknown[]): number[] | null => {
  for (const v of values) {
    const value = leveled(v);
    if (value?.some((x) => x > 0)) return value;
  }
  return null;
};
const has = (v: unknown): boolean =>
  v != null && v !== false && v !== "" && v !== 0;
const firstByKey = (data: Row[]): Map<string, Row> => {
  const map = new Map<string, Row>();
  for (const item of data) {
    for (const value of [item.key, item.name, item.sc_key, item.name_en]) {
      const key = clean(value);
      if (key && !map.has(key)) map.set(key, item);
    }
  }
  return map;
};
const positive = (value: number | null): number | null =>
  value !== null && value > 0 ? value : null;
const numberFrom = (...fields: unknown[]): number | null => {
  for (const value of fields) {
    const x = n(value);
    if (x !== null && x > 0) return x;
  }
  return null;
};
const boolFrom = (...values: unknown[]): boolean | null => {
  for (const value of values) {
    const b = bool(value);
    if (b !== null) return b;
  }
  return null;
};

/** Join official card IDs to community game-file mechanics by stable key and spawned unit name.
 * A projectile may carry the real damage of a ranged troop; it is not summed
 * with direct damage (that would double count).
 */
export function projectMechanics(
  source: StatInputs,
  fetchedAt = new Date().toISOString(),
): MechanicsCatalog {
  const cards = rows(source.cards);
  const troops = firstByKey(rows(source.troop));
  const chars = firstByKey(rows(source.characters));
  const buildings = firstByKey(rows(source.building));
  const spells = firstByKey(rows(source.spell));
  const projectiles = firstByKey(rows(source.projectile));
  const warnings: string[] = [];
  if (!cards.length)
    warnings.push("The community card registry is unavailable.");
  if (!chars.size)
    warnings.push(
      "Character damage/HP and targeting statistics are unavailable.",
    );
  if (!buildings.size)
    warnings.push("Building combat statistics are unavailable.");
  if (!spells.size) warnings.push("Spell effect statistics are unavailable.");
  const result: MechanicsCard[] = [];
  for (const card of cards) {
    const id = n(card.id);
    if (!Number.isInteger(id) || id! <= 0) continue;
    const name = str(card.name);
    const kind: MechanicsKind = ["Troop", "Building", "Spell"].includes(
      str(card.type),
    )
      ? (card.type as MechanicsKind)
      : "Other";
    const idMatch = (source: unknown) => rows(source).find((x) => x.id === id);
    const key = clean(card.key);
    const t = troops.get(key) ?? troops.get(clean(card.sc_key)) ?? {};
    const building =
      buildings.get(key) ??
      buildings.get(clean(card.sc_key)) ??
      idMatch(source.building) ??
      {};
    const spell =
      spells.get(key) ??
      spells.get(clean(card.sc_key)) ??
      idMatch(source.spell) ??
      {};
    const unitName =
      t.summon_character ??
      t.spawn_character ??
      building.summon_character ??
      card.sc_key;
    const unit = chars.get(clean(unitName)) ?? chars.get(key) ?? {};
    const main =
      kind === "Building" ? building : kind === "Spell" ? spell : unit;
    // Some direct spells publish damage in a standalone projectile with a
    // *suffix* (FireballSpell / ArrowsSpell / RocketSpell). Only use exact
    // known naming forms; never fuzzy-match unrelated projectiles.
    const projectileName = clean(card.sc_key);
    const rawProjectile =
      projectiles.get(clean(main.projectile)) ??
      projectiles.get(clean(t.projectile)) ??
      projectiles.get(clean(spell.projectile)) ??
      (kind === "Spell"
        ? (projectiles.get(projectileName + "spell") ??
          projectiles.get(projectileName + "projectilerolling") ??
          projectiles.get(projectileName + "projectile"))
        : undefined) ??
      {};
    // Each row's rarity owns its level series (a summoned unit may differ
    // from the card's rarity). Never apply the card offset twice.
    const align = (series: number[] | null, owner: Row) => {
      const rarity = str(owner.rarity || card.rarity).toLowerCase();
      const start = ({ common: 1, rare: 3, epic: 6, legendary: 9, champion: 11 } as Record<string, number>)[rarity] ?? 1;
      return series && [...Array(start - 1).fill(0), ...series];
    };
    const hp = align(prefer(main.hitpoints_per_level, main.hitPointsPerLevel), main);
    const damageCandidates = [[main, main.damage_per_level], [rawProjectile, rawProjectile.damage_per_level], [main, main.instant_damage_per_level], [t, t.damage_per_level]] as const;
    const candidate = damageCandidates.find(([, value]) => prefer(value) !== null);
    const damage = candidate ? align(prefer(candidate[1]), candidate[0]) : null;
    const air =
      kind === "Spell"
        ? boolFrom(main.hits_air, main.attacks_air, rawProjectile.attacks_air)
        : boolFrom(main.attacks_air, rawProjectile.attacks_air);
    const ground =
      kind === "Spell"
        ? boolFrom(
            main.hits_ground,
            main.attacks_ground,
            rawProjectile.attacks_ground,
          )
        : boolFrom(main.attacks_ground, rawProjectile.attacks_ground);
    const hitsBuildings = boolFrom(main.target_only_buildings);
    const moveSpeed = kind === "Troop" ? positive(n(main.speed)) : null;
    const range =
      kind === "Spell"
        ? null
        : positive(units(main.range ?? unit.range ?? building.range));
    const area = positive(
      units(
        main.area_damage_radius ??
          rawProjectile.area_damage_radius ??
          main.radius ??
          t.radius,
      ),
    );
    const count =
      kind === "Troop"
        ? Math.max(1, Math.min(30, n(t.summon_number) ?? 1))
        : null;
    result.push({
      id: id!,
      name,
      kind,
      hpByLevel: hp,
      damageByLevel: damage,
      hitSpeedSeconds: seconds(main.hit_speed),
      rangeTiles: range,
      moveSpeedRaw: moveSpeed,
      targetsAir: air,
      targetsGround: ground,
      buildingsOnly: hitsBuildings,
      areaRadiusTiles: area,
      unitCount: count,
      deploySeconds: seconds(main.deploy_time ?? t.custom_deploy_time),
      firstHitSeconds: units(main.load_time),
      specialAbility:
        has(main.ability) ||
        has(t.hero_ability) ||
        has(t.passive_ability) ||
        has(main.charge_range) ||
        has(main.spawn_character) ||
        has(main.death_spawn_character) ||
        (n(main.spawn_number) ?? 0) > 0,
      provenance: "royaleapi-community",
      description: str(card.description),
      sourceRecords: Object.fromEntries(
        Object.entries({
          registry: card,
          deployment: t,
          unit: main,
          projectile: rawProjectile,
        }).filter(([, value]) => Object.keys(value).length),
      ),
    });
  }
  return { source: MECHANICS_SOURCE, fetchedAt, warnings, cards: result };
}
export function statForLevel(
  series: number[] | null,
  displayedLevel: number | null,
): number | null {
  if (
    !series ||
    displayedLevel === null ||
    !Number.isInteger(displayedLevel) ||
    displayedLevel < 1 ||
    displayedLevel > series.length
  )
    return null;
  const value = series[displayedLevel - 1];
  return Number.isFinite(value) && value > 0 ? value : null;
}
export type ResolvedMechanics = {
  hitpoints: number | null;
  damage: number | null;
  dps: number | null;
  hitSpeedSeconds: number | null;
  rangeTiles: number | null;
  moveSpeedRaw: number | null;
  targetsAir: boolean | null;
  targetsGround: boolean | null;
  buildingsOnly: boolean | null;
  splashRadiusTiles: number | null;
  unitCount: number | null;
  deploySeconds: number | null;
  firstHitSeconds: number | null;
  kind: MechanicsKind;
  specialAbility: boolean;
  completeness: number;
};
const mechanicsIndices = new WeakMap<
  MechanicsCatalog,
  Map<number, MechanicsCard>
>();
/** Prefer the dated 2026 card reference for the named game cards; match the
 * numeric ID from the official player/catalog entry, never an invented ID.
 * All other cards use the existing historical community registry unchanged.
 */
export function getMechanicsRecord(
  card: { id: number; name?: string },
  catalog?: MechanicsCatalog | null,
): MechanicsCard | undefined {
  const recent = sourcedGroupReference(card) ?? recentCardReference(card);
  // Goblin Barrel spawns three separate Goblins. Its per-Goblin statistics
  // must never be replaced by an old "spell impact damage" record.
  if (recent && card.name?.toLowerCase() === "goblin barrel")
    return withGroupComposition(recent);
  if (!catalog) return recent && withGroupComposition(recent);
  let index = mechanicsIndices.get(catalog);
  if (!index) {
    index = new Map(catalog.cards.map(c => [c.id,c]));
    mechanicsIndices.set(catalog,index);
  }
  const sourced = index.get(card.id);
  const useSourced = sourced?.provenance === "crtool-game-data" &&
    !!sourced.sourceUpdatedAt &&
    (!recent || sourced.sourceUpdatedAt > (recent.sourceUpdatedAt ?? "") ||
      (sourced.sourceUpdatedAt === recent.sourceUpdatedAt &&
        !!sourced.groupUnits?.length && !!sourced.extraStatsByLevel));
  const chosen = useSourced ? sourced : recent ?? sourced;
  return chosen ? withGroupComposition(chosen) : undefined;
}

export function resolveMechanics(
  card: { id: number; level: number | null; name?: string },
  catalog?: MechanicsCatalog | null,
): ResolvedMechanics | null {
  const item = getMechanicsRecord(card, catalog);
  if (!item) return null;
  const hitpoints = statForLevel(item.hpByLevel, card.level);
  const damage = statForLevel(item.damageByLevel, card.level);
  const explicitDps = statForLevel(item.dpsByLevel ?? null, card.level);
  const dps = explicitDps ?? (
    // One-shot spells do not have a sustained attack interval. For example,
    // Lightning's cast timing must not be treated as a 2,000+ DPS value.
    item.kind === "Spell" && item.statSubject !== "spawned-unit"
      ? null
      : damage !== null && item.hitSpeedSeconds !== null && item.hitSpeedSeconds > 0
        ? damage / item.hitSpeedSeconds
        : null
  );
  const major = [
    hitpoints,
    damage,
    item.hitSpeedSeconds,
    item.rangeTiles,
    item.moveSpeedRaw,
    item.targetsAir,
    item.targetsGround,
    item.areaRadiusTiles,
  ];
  const completeness = major.filter((x) => x !== null).length / major.length;
  return {
    hitpoints,
    damage,
    dps,
    hitSpeedSeconds: item.hitSpeedSeconds,
    rangeTiles: item.rangeTiles,
    moveSpeedRaw: item.moveSpeedRaw,
    targetsAir: item.targetsAir,
    targetsGround: item.targetsGround,
    buildingsOnly: item.buildingsOnly,
    splashRadiusTiles: item.areaRadiusTiles,
    unitCount: item.unitCount,
    deploySeconds: item.deploySeconds,
    firstHitSeconds: item.firstHitSeconds,
    kind: item.kind,
    specialAbility: item.specialAbility,
    completeness,
  };
}
