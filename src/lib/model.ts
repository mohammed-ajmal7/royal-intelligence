import { z } from "zod";
export type Card = {
  id: number;
  name: string;
  rarity: string;
  level: number | null;
  elixir: number | null;
  owned: boolean;
  image?: string;
  evo: boolean | null;
  hero: boolean | null;
  active: string;
  tower: boolean;
  roles: string[];
};
export type Person = {
  tag: string;
  name: string;
  crowns: number | null;
  cards: Card[];
};
export type Battle = {
  id: string;
  time: string;
  mode: string;
  team: Person[];
  opponent: Person[];
  outcome: "win" | "loss" | "unknown";
  /** Actual trophy change for this player, when supplied by the battle log. */
  trophyChange?: number | null;
  arena?: string;
  battleType?: string;
};
export type Snapshot = {
  mode: "demo" | "live";
  tag: string;
  name: string;
  fetchedAt: string;
  trophies: number | null;
  bestTrophies: number | null;
  kingLevel: number | null;
  arena: string;
  clan: string;
  cards: Card[];
  catalog: Card[];
  deck: Card[];
  towers: Card[];
  battles: Battle[];
  chests: { name: string; index: number }[];
  raw: unknown;
  warnings: string[];
  stored?: boolean;
  stale?: boolean;
  cap: number;
};
export const roleGroups: Record<string, string[]> = {
  "Win condition": [
    "Hog Rider",
    "Giant",
    "Golem",
    "Goblin Barrel",
    "Graveyard",
    "Royal Giant",
    "Balloon",
    "Lava Hound",
    "Miner",
    "Mortar",
    "X-Bow",
    "Royal Hogs",
    "Ram Rider",
    "Battle Ram",
    "Goblin Giant",
    "Goblin Drill",
    "Wall Breakers",
    "Electro Giant",
  ],
  "Air defense": [
    "Archers",
    "Musketeer",
    "Minions",
    "Minion Horde",
    "Wizard",
    "Ice Wizard",
    "Electro Wizard",
    "Mega Minion",
    "Baby Dragon",
    "Inferno Dragon",
    "Inferno Tower",
    "Tesla",
    "Bats",
    "Spear Goblins",
    "Goblin Gang",
    "Ice Spirit",
    "Electro Spirit",
    "Dart Goblin",
    "Princess",
    "Magic Archer",
    "Firecracker",
    "Executioner",
    "Witch",
    "Electro Dragon",
    "Flying Machine",
    "Hunter",
    "Phoenix",
    "Archer Queen",
    "Little Prince",
    "Three Musketeers",
  ],
  "Ground defense": [
    "Knight",
    "Archers",
    "Goblins",
    "Musketeer",
    "Cannon",
    "Tesla",
    "Bomb Tower",
    "Tombstone",
    "Goblin Cage",
    "Mini P.E.K.K.A",
    "P.E.K.K.A",
    "Prince",
    "Dark Prince",
    "Valkyrie",
    "Mega Knight",
    "Skeletons",
    "Skeleton Army",
    "Goblin Gang",
    "Guards",
    "Barbarians",
    "Elite Barbarians",
    "Minions",
    "Electro Wizard",
    "Ice Wizard",
    "Royal Ghost",
    "Bandit",
    "Bowler",
    "Fisherman",
    "Mighty Miner",
    "Golden Knight",
    "Monk",
    "Skeleton King",
  ],
  "Tank killer": [
    "Mini P.E.K.K.A",
    "P.E.K.K.A",
    "Inferno Tower",
    "Inferno Dragon",
    "Prince",
    "Skeleton Army",
    "Barbarians",
    "Elite Barbarians",
    "Sparky",
    "Hunter",
    "Archer Queen",
    "Mighty Miner",
  ],
  "Swarm control": [
    "Valkyrie",
    "Dark Prince",
    "Bomber",
    "Wizard",
    "Ice Wizard",
    "Electro Wizard",
    "Baby Dragon",
    "Witch",
    "Princess",
    "Firecracker",
    "Magic Archer",
    "Executioner",
    "Mega Knight",
    "Giant Skeleton",
    "Sparky",
    "Bowler",
    "Royal Ghost",
    "Bomb Tower",
    "Fire Spirit",
    "Electro Spirit",
    "Fireball",
    "Arrows",
    "Zap",
    "The Log",
    "Poison",
    "Tornado",
    "Royal Delivery",
    "Barbarian Barrel",
  ],
  "Mini tank": [
    "Knight",
    "Valkyrie",
    "Ice Golem",
    "Dark Prince",
    "Mega Knight",
    "Giant Skeleton",
    "Miner",
    "Golden Knight",
    "Monk",
    "Skeleton King",
  ],
  Building: [
    "Cannon",
    "Tesla",
    "Inferno Tower",
    "Bomb Tower",
    "Tombstone",
    "Goblin Cage",
    "Mortar",
    "X-Bow",
    "Goblin Hut",
    "Barbarian Hut",
    "Furnace",
    "Elixir Collector",
  ],
  Spell: [
    "Fireball",
    "Arrows",
    "Zap",
    "The Log",
    "Poison",
    "Lightning",
    "Rocket",
    "Tornado",
    "Giant Snowball",
    "Earthquake",
    "Goblin Barrel",
    "Graveyard",
    "Freeze",
    "Rage",
    "Royal Delivery",
    "Mirror",
    "Barbarian Barrel",
    "Clone",
    "Void",
  ],
  Cycle: [
    "Skeletons",
    "Goblins",
    "Spear Goblins",
    "Bats",
    "Ice Spirit",
    "Electro Spirit",
    "Fire Spirit",
    "Heal Spirit",
    "Ice Golem",
    "Zap",
    "The Log",
    "Giant Snowball",
    "Wall Breakers",
  ],
};
export const rolesFor = (name: string) =>
  Object.keys(roleGroups).filter((r) => roleGroups[r].includes(name));
export const rawCard = z
  .object({
    id: z.number().int(),
    name: z.string(),
    level: z.number().optional(),
    maxLevel: z.number().optional(),
    rarity: z.string().optional(),
    elixirCost: z.number().optional(),
    evolutionLevel: z.number().optional(),
    iconUrls: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();
export const profileSchema = z
  .object({
    tag: z.string(),
    name: z.string(),
    cards: z.array(rawCard),
    currentDeck: z.array(rawCard).optional(),
    supportCards: z.array(rawCard).optional(),
  })
  .passthrough();
export function tag(input: string) {
  const t = input.trim().toUpperCase().replace(/^%23/, "").replace(/^#/, "");
  if (!/^[0289PYLQGRJCUV]{3,15}$/.test(t))
    throw new Error("Enter a valid player tag.");
  return "#" + t;
}
export function level(
  v: number | undefined,
  max: number | undefined,
  cap = 16,
) {
  return Number.isInteger(v) &&
    Number.isInteger(max) &&
    v! > 0 &&
    v! <= max! &&
    max! <= cap
    ? v! + cap - max!
    : null;
}
export function card(
  input: unknown,
  owned = false,
  active = false,
  tower = false,
  cap = 16,
): Card {
  const c = rawCard.parse(input),
    flag = c.evolutionLevel,
    valid =
      flag !== undefined && Number.isInteger(flag) && flag >= 0 && flag <= 3;
  return {
    id: c.id,
    name: c.name,
    rarity: c.rarity ?? "unknown",
    level: owned ? level(c.level, c.maxLevel, cap) : null,
    elixir: c.elixirCost ?? null,
    owned,
    image: c.iconUrls?.medium,
    // The collection omits evolutionLevel when no special form is unlocked.
    // Battle/deck entries omit it when the base form is equipped or played.
    evo: valid ? !!(flag! & 1) : owned && !active ? false : null,
    hero: valid ? !!(flag! & 2) : owned && !active ? false : null,
    active: active
      ? flag === 1 ? "evolution" : flag === 2 ? "hero" : flag === 3 ? "unknown" : "base"
      : "unknown",
    tower,
    roles: rolesFor(c.name),
  };
}
const obj = (x: unknown): Record<string, unknown> =>
  x && typeof x === "object" ? (x as Record<string, unknown>) : {};
const num = (x: unknown) =>
  typeof x === "number" && Number.isFinite(x) ? x : null;
export function parseBattle(input: unknown, owner: string, cap = 16): Battle {
  const b = obj(input);
  const person = (v: unknown): Person => {
    const p = obj(v);
    return {
      tag: String(p.tag ?? ""),
      name: String(p.name ?? "Unknown"),
      crowns: num(p.crowns),
      cards: Array.isArray(p.cards)
        ? p.cards.map((x) => card(x, true, true, false, cap))
        : [],
    };
  };
  let team = (Array.isArray(b.team) ? b.team : []).map(person),
    opponent = (Array.isArray(b.opponent) ? b.opponent : []).map(person);
  if (opponent.some((p) => p.tag === owner))
    [team, opponent] = [opponent, team];
  const a = team[0]?.crowns,
    c = opponent[0]?.crowns;
  const consistent =
    a != null &&
    c != null &&
    team.every((p) => p.crowns === a) &&
    opponent.every((p) => p.crowns === c) &&
    team.some((p) => p.tag === owner);
  const time = String(b.battleTime ?? "").replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(?:\.\d+)?Z$/,
    "$1-$2-$3T$4:$5:$6Z",
  );
  const mode = String(obj(b.gameMode).name ?? b.type ?? "Unknown");
  const rawTeam = (Array.isArray(b.team) ? b.team : [])
    .concat(Array.isArray(b.opponent) ? b.opponent : []);
  const own = obj(rawTeam.find((p) => obj(p).tag === owner));
  return {
    id: JSON.stringify([
      b.battleTime,
      b.type,
      mode,
      [...team, ...opponent]
        .map((p) => [
          p.tag,
          p.crowns,
          p.cards.map((c) => `${c.id}:${c.level}:${c.active}`).sort(),
        ])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    ]),
    time,
    mode,
    team,
    opponent,
    trophyChange: num(own.trophyChange),
    arena: String(obj(b.arena).name ?? ""),
    battleType: String(b.type ?? ""),
    outcome:
      consistent && a! > c!
        ? "win"
        : consistent && a! < c!
          ? "loss"
          : "unknown",
  };
}
export function normalize(
  pInput: unknown,
  cInput: unknown,
  bInput: unknown,
  chInput: unknown,
  at = new Date().toISOString(),
  cap = 16,
): Snapshot {
  const p = profileSchema.parse(pInput),
    c = z
      .object({
        items: z.array(rawCard),
        supportItems: z.array(rawCard).optional(),
      })
      .parse(cInput);
  const cards = p.cards.map((x) =>
    card(
      { ...c.items.find((y) => y.id === x.id), ...x },
      true,
      false,
      false,
      cap,
    ),
  );
  const towers = (p.supportCards ?? []).map((x) =>
    card(x, true, false, true, cap),
  );
  const catalog = c.items.map(
    (x) => cards.find((y) => y.id === x.id) ?? card(x),
  );
  for (const x of cards)
    if (!catalog.some((y) => y.id === x.id)) catalog.push(x);
  catalog.push(
    ...(c.supportItems ?? []).map(
      (x) =>
        towers.find((t) => t.id === x.id) ?? card(x, false, false, true, cap),
    ),
  );
  const battles = (Array.isArray(bInput) ? bInput : []).map((x) =>
    parseBattle(x, p.tag, cap),
  );
  return {
    mode: "live",
    tag: p.tag,
    name: p.name,
    fetchedAt: at,
    cap,
    trophies: num(p.trophies),
    bestTrophies: num(p.bestTrophies),
    kingLevel: num(p.kingTowerLevel),
    arena: String(obj(p.arena).name ?? "Unknown arena"),
    clan: String(obj(p.clan).name ?? "No clan"),
    cards,
    catalog,
    towers,
    deck: (p.currentDeck ?? []).map((x) => {
      const own = cards.find((y) => y.id === x.id);
      return {
        ...card(
          {
            ...c.items.find((y) => y.id === x.id),
            ...p.cards.find((y) => y.id === x.id),
            ...x,
          },
          true,
          true,
          false,
          cap,
        ),
        evo: own?.evo ?? null,
        hero: own?.hero ?? null,
      };
    }),
    battles: [...new Map(battles.map((x) => [x.id, x])).values()],
    chests: z
      .array(z.object({ name: z.string(), index: z.number() }))
      .catch([])
      .parse(obj(chInput).items),
    raw: p,
    warnings: [
      `Display levels use a level-${cap} reference; confirm against your game.`,
      `Special-form flags follow an observed API convention, not a guaranteed official schema.`,
      `Roles and deck scores are editorial heuristics. Combat values and boost states are incomplete.`,
    ],
  };
}
