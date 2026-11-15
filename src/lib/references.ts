/** Partial research snapshot checked November 14, 2026. Not a complete live statistics database. */
export const researchVerifiedAt = "2026-11-14T00:00:00Z";
export const sources = [
  {
    id: "official-api",
    title: "Clash Royale developer API",
    url: "https://developer.clashroyale.com/",
    status: "official",
    checkedAt: researchVerifiedAt,
  },
  {
    id: "proxy",
    title: "RoyaleAPI supported official-API proxy",
    url: "https://docs.royaleapi.com/proxy",
    status: "provider-documentation",
    checkedAt: researchVerifiedAt,
  },
  {
    id: "slots",
    title: "Supercell: Cards & Decks",
    url: "https://support.clashroyale.com/hc/en-us/articles/49484924205595-Cards-Decks",
    status: "official",
    checkedAt: researchVerifiedAt,
  },
  {
    id: "champions",
    title: "Supercell: Champions",
    url: "https://support.clashroyale.com/hc/en-us/articles/49484915467291-Champions",
    status: "official",
    checkedAt: researchVerifiedAt,
  },
  {
    id: "october-balance",
    title: "Supercell: October 6 and 19 balance changes",
    url: "https://supercell.com/en/games/clashroyale/blog/release-notes/october-balance-changes-2026/",
    status: "official",
    checkedAt: researchVerifiedAt,
  },
  {
    id: "november-season",
    title: "Supercell: November 2026",
    url: "https://support.clashroyale.com/hc/en-us/articles/57579150651419-What-s-New-November-2026",
    status: "official",
    checkedAt: researchVerifiedAt,
  },
  {
    id: "api-observations",
    title: "Community-maintained API field observations",
    url: "https://github.com/jthingelstad/cr-agent-api-docs",
    status: "observed-community-reference",
    checkedAt: researchVerifiedAt,
  },
  {
    id: "fan-policy",
    title: "Supercell Fan Content Policy",
    url: "https://supercell.com/en/fan-content-policy/",
    status: "official",
    checkedAt: researchVerifiedAt,
  },
] as const;
export interface VerifiedStat {
  cardId: number;
  cardName: string;
  form: "base" | "evolution" | "hero";
  level: number | null;
  statistic: string;
  value: number;
  unit: "hitpoints" | "seconds" | "tiles" | "cycles";
  sourceUrl: string;
  patch: string;
  verifiedAt: string;
  status: "verified-official";
  note?: string;
}
const balance =
  "https://supercell.com/en/games/clashroyale/blog/release-notes/october-balance-changes-2026/";
const november =
  "https://support.clashroyale.com/hc/en-us/articles/57579150651419-What-s-New-November-2026";
const stat = (
  cardId: number,
  cardName: string,
  statistic: string,
  value: number,
  unit: VerifiedStat["unit"],
  patch: string,
  form: VerifiedStat["form"] = "base",
): VerifiedStat => ({
  cardId,
  cardName,
  form,
  level: 11,
  statistic,
  value,
  unit,
  sourceUrl: balance,
  patch,
  verifiedAt: researchVerifiedAt,
  status: "verified-official",
  note: "Official patch article specifies Level 11. No other levels are inferred.",
});
/** Partial, patch-specific reference data. Missing values remain unavailable. */
export const verifiedStats: VerifiedStat[] = [
  stat(26000054, "Cannon Cart", "damage", 202, "hitpoints", "2026-10-19"),
  stat(26000040, "Dart Goblin", "damage", 143, "hitpoints", "2026-10-19"),
  stat(26000057, "Flying Machine", "damage", 179, "hitpoints", "2026-10-19"),
  stat(
    26000063,
    "Electro Dragon",
    "firstAttackDelay",
    0.5,
    "seconds",
    "2026-10-19",
  ),
  stat(
    26000056,
    "Skeleton Barrel",
    "deathDamage",
    163,
    "hitpoints",
    "2026-10-19",
  ),
  stat(
    26000056,
    "Skeleton Barrel",
    "deathDamage",
    163,
    "hitpoints",
    "2026-10-19",
    "evolution",
  ),
  stat(26000010, "Skeletons", "spawnSpread", 0.5, "tiles", "2026-10-19"),
  stat(28000015, "Barbarian Barrel", "damage", 215, "hitpoints", "2026-10-06"),
  stat(
    27000000,
    "Cannon",
    "barrageDamage",
    261,
    "hitpoints",
    "2026-10-06",
    "evolution",
  ),
  stat(27000007, "Elixir Collector", "lifetime", 110, "seconds", "2026-10-06"),
  stat(
    27000007,
    "Elixir Collector",
    "productionInterval",
    15,
    "seconds",
    "2026-10-06",
  ),
  stat(26000050, "Royal Ghost", "hp", 1152, "hitpoints", "2026-10-06"),
  stat(26000050, "Royal Ghost", "damage", 263, "hitpoints", "2026-10-06"),
  stat(
    28000004,
    "Goblin Barrel",
    "firstAttackDelay",
    0.3,
    "seconds",
    "2026-10-06",
  ),
  stat(26000029, "Lava Hound", "damage", 71, "hitpoints", "2026-10-06"),
  stat(26000029, "Lava Hound", "hitSpeed", 1.5, "seconds", "2026-10-06"),
  stat(26000051, "Ram Rider", "damage", 271, "hitpoints", "2026-10-06"),
  stat(26000058, "Wall Breakers", "damage", 302, "hitpoints", "2026-10-06"),
  stat(27000008, "X-Bow", "damage", 61, "hitpoints", "2026-10-06"),
  stat(
    26000028,
    "Three Musketeers",
    "hpPerUnit",
    906,
    "hitpoints",
    "2026-10-06",
  ),
  {
    cardId: 26000003,
    cardName: "Giant",
    form: "evolution",
    level: null,
    statistic: "requiredCycles",
    value: 1,
    unit: "cycles",
    sourceUrl: november,
    patch: "2026-11",
    verifiedAt: researchVerifiedAt,
    status: "verified-official",
  },
  {
    cardId: 28000006,
    cardName: "Mirror",
    form: "evolution",
    level: null,
    statistic: "requiredCycles",
    value: 2,
    unit: "cycles",
    sourceUrl: november,
    patch: "2026-11-09",
    verifiedAt: researchVerifiedAt,
    status: "verified-official",
  },
];
