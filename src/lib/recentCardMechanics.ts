import type { MechanicsCard } from "./mechanics";

/**
 * Dated GAME-DATA reference for two cards that cannot be evaluated correctly
 * from the original (historical) RoyaleAPI/cr-api-data JSON files.
 *
 * Primary per-level source: crtool game data 16.635.1, published 2026-11-09.
 * https://crtool.app/en/units/minion-giant/
 * https://crtool.app/en/units/goblin-barrel/
 *
 * Cross-check at level 11: https://www.royaletools.com/cards/minion-giant
 * https://www.royaletools.com/cards/goblin-barrel
 *
 * These are independently maintained game-data references. They are not part
 * of the official Clash Royale API, and are not guaranteed for future patches.
 * NEVER extrapolate levels that this reference does not provide.
 */
const sourceVersion = "16.635.1";
const sourceUpdatedAt = "2026-11-09";

function levels(start: number, values: readonly number[]): number[] {
  // The reference specifies the *first displayed* game level; zero represents
  // an unavailable entry and statForLevel() already treats it as unknown.
  return [...Array(start - 1).fill(0), ...values];
}
const minionGiantHP = levels(3, [
  859, 944, 1036, 1136, 1249, 1370, 1505, 1654, 1817,
  1995, 2193, 2406, 2641, 2903, 3195, 3514, 3869, 4260,
]);
const minionGiantDamage = levels(3, [
  72, 79, 87, 96, 105, 115, 127, 139, 153,
  168, 185, 203, 223, 245, 270, 297, 327, 360,
]);
const goblinHP = levels(6, [
  126, 139, 152, 167, 184, 202, 221, 244, 267, 293,
  323, 355, 391, 430, 474,
]);
const goblinDamage = levels(6, [
  78, 86, 94, 103, 114, 125, 137, 151, 166, 182,
  200, 220, 242, 267, 294,
]);

const records: Record<string, Omit<MechanicsCard, "id">> = {
  miniongiant: {
    name: "Minion Giant",
    kind: "Troop",
    hpByLevel: minionGiantHP,
    damageByLevel: minionGiantDamage,
    hitSpeedSeconds: 1.7,
    rangeTiles: 4,
    moveSpeedRaw: 60,
    targetsAir: false,
    targetsGround: false,
    buildingsOnly: true,
    areaRadiusTiles: null, // Source does not quantify its area radius.
    unitCount: 1,
    deploySeconds: 1,
    firstHitSeconds: 0.8,
    specialAbility: false,
    provenance: "crtool-game-data",
    statSubject: "card",
    statSubjectLabel: "Minion Giant",
    sourceUrl: "https://crtool.app/en/units/minion-giant/",
    sourceUpdatedAt,
    description: "Flying, building-targeting troop. Damage and HP are sourced for levels 3–20.",
    sourceRecords: {
      reference: {
        source: "crtool",
        gameDataVersion: sourceVersion,
        lastUpdated: sourceUpdatedAt,
        url: "https://crtool.app/en/units/minion-giant/",
        levelRange: "3–20",
        calculation: "damage per hit; derived DPS = damage / 1.7 seconds",
        note: "October 19, 2026 balance: level 11 damage 168 → 153.",
      },
    },
  },
  goblinbarrel: {
    name: "Goblin Barrel",
    kind: "Spell",
    // Important: this is HP of ONE of the three summoned Goblins, NOT the
    // barrel's HP. Damage shown is each Goblin's melee attack, never impact
    // damage or guaranteed combined damage from all three units.
    hpByLevel: goblinHP,
    damageByLevel: goblinDamage,
    hitSpeedSeconds: 1.1,
    rangeTiles: 0.5,
    moveSpeedRaw: 120,
    targetsAir: false,
    targetsGround: true,
    buildingsOnly: false,
    areaRadiusTiles: 1.5, // Barrel landing radius, not a splash-damage radius.
    unitCount: 3,
    deploySeconds: 1,
    firstHitSeconds: 0.3,
    specialAbility: true,
    provenance: "crtool-game-data",
    statSubject: "spawned-unit",
    statSubjectLabel: "Goblin",
    sourceUrl: "https://crtool.app/en/units/goblin-barrel/",
    sourceUpdatedAt,
    description: "Spawns three Goblins. HP, damage and DPS are PER spawned Goblin; the barrel itself does not deal direct damage.",
    sourceRecords: {
      reference: {
        source: "crtool",
        gameDataVersion: sourceVersion,
        lastUpdated: sourceUpdatedAt,
        url: "https://crtool.app/en/units/goblin-barrel/",
        levelRange: "6–20",
        summonedUnit: "Goblin",
        summonedUnitCount: 3,
        directBarrelDamage: 0,
        calculation: "per-Goblin damage per hit; derived per-Goblin DPS = damage / 1.1 seconds",
        note: "Evolution's Decoy Goblins have separate stats; not included in the base-card leaderboard.",
      },
    },
  },
};

export function recentCardReference(
  card: { id: number; name?: string },
): MechanicsCard | undefined {
  const key = card.name?.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const item = key ? records[key] : undefined;
  return item ? { ...item, id: card.id } : undefined;
}
