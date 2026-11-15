import { Card, Battle, roleGroups } from "./model";
export const modes = [
  "Best overall",
  "Maximum defense",
  "Maximum offense",
  "Trophy Road",
  "Ranked",
  "2v2 balanced",
  "2v2 defensive support",
  "Fast cycle",
  "Highest levels",
  "Budget upgrades",
];
export type Constraints = {
  mode: string;
  maxElixir: number;
  minLevel: number;
  include: number[];
  exclude: number[];
  cap: number;
  defense: number;
  offense: number;
  teammate?: Card[];
};
export const defaults: Constraints = {
  mode: "Best overall",
  maxElixir: 5,
  minLevel: 1,
  include: [],
  exclude: [],
  cap: 16,
  defense: 35,
  offense: 25,
};
export const templates = [
  [
    "Hog Rider",
    "Musketeer",
    "Cannon",
    "Fireball",
    "The Log",
    "Skeletons",
    "Ice Spirit",
    "Knight",
  ],
  [
    "Hog Rider",
    "Valkyrie",
    "Musketeer",
    "Tesla",
    "Fireball",
    "The Log",
    "Skeletons",
    "Ice Spirit",
  ],
  [
    "Goblin Barrel",
    "Princess",
    "Knight",
    "Inferno Tower",
    "Skeleton Army",
    "Rocket",
    "The Log",
    "Ice Spirit",
  ],
  [
    "Giant",
    "Prince",
    "Dark Prince",
    "Mega Minion",
    "Musketeer",
    "Fireball",
    "Zap",
    "Skeletons",
  ],
  [
    "X-Bow",
    "Tesla",
    "Archers",
    "Knight",
    "Skeletons",
    "Ice Spirit",
    "Fireball",
    "The Log",
  ],
  [
    "Mortar",
    "Knight",
    "Archers",
    "Skeletons",
    "Ice Spirit",
    "Fireball",
    "The Log",
    "Minions",
  ],
];
export const key = (cs: Card[]) =>
  cs
    .map((c) => c.id)
    .sort((a, b) => a - b)
    .join(";");
export function wilson(wins: number, total: number) {
  if (
    !Number.isInteger(wins) ||
    !Number.isInteger(total) ||
    wins < 0 ||
    total < 0 ||
    wins > total
  )
    throw new Error("Invalid match counts");
  if (!total) return null;
  const z = 1.95996398454,
    p = wins / total,
    d = 1 + (z * z) / total,
    c = (p + (z * z) / (2 * total)) / d,
    h =
      (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) /
      d;
  return {
    rate: p,
    low: wins === 0 ? 0 : c - h,
    high: wins === total ? 1 : c + h,
    total,
  };
}
export function stats(bs: Battle[]) {
  const wins = bs.filter((b) => b.outcome === "win").length,
    losses = bs.filter((b) => b.outcome === "loss").length;
  return {
    wins,
    losses,
    unknown: bs.length - wins - losses,
    ci: wilson(wins, wins + losses),
  };
}
export function legal(cs: Card[]) {
  return (
    cs.length === 8 &&
    new Set(cs.map((c) => c.id)).size === 8 &&
    cs.every((c) => c.owned && !c.tower)
  );
}
const clamp = (n: number) => Math.max(0, Math.min(100, n));
export function evaluate(cs: Card[], q: Constraints = defaults) {
  const roles = Object.fromEntries(
    Object.keys(roleGroups).map((r) => [
      r,
      cs.filter((c) => c.roles.includes(r)).length,
    ]),
  );
  const air = cs.filter(
      (c) => c.roles.includes("Air defense") && !c.roles.includes("Cycle"),
    ).length,
    utility = cs.filter(
      (c) => c.roles.includes("Spell") && !c.roles.includes("Win condition"),
    ).length;
  const avg =
    cs.length && cs.every((c) => c.elixir != null)
      ? cs.reduce((s, c) => s + c.elixir!, 0) / cs.length
      : null;
  const cycle =
    cs.length >= 4 && avg != null
      ? [...cs]
          .sort((a, b) => a.elixir! - b.elixir!)
          .slice(0, 4)
          .reduce((s, c) => s + c.elixir!, 0)
      : null;
  const defense =
      25 * Math.min(air / 2, 1) +
      20 * Math.min(roles["Ground defense"] / 2, 1) +
      25 * Math.min(roles["Tank killer"], 1) +
      15 * Math.min(roles["Swarm control"] / 2, 1) +
      15 * Math.min(roles.Building, 1),
    offense = clamp(
      (roles["Win condition"] ? 50 : 0) +
        Math.min(utility, 2) * 12 +
        (roles["Mini tank"] ? 12 : 0) +
        (roles.Cycle ? 8 : 0),
    ),
    readiness = cs.length
      ? (cs.reduce((s, c) => s + Math.min(c.level ?? 0, q.cap) / q.cap, 0) /
          cs.length) *
        100
      : 0,
    coverage = (Object.values(roles).filter(Boolean).length / 9) * 100,
    efficiency =
      avg == null
        ? 0
        : clamp(
            100 - Math.max(0, avg - (q.mode === "Fast cycle" ? 2.6 : 3.5)) * 30,
          ),
    balance = clamp(
      (roles["Win condition"] === 1
        ? 40
        : roles["Win condition"] === 2
          ? 30
          : 0) +
        (utility >= 1 && utility <= 2 ? 20 : 0) +
        (roles["Mini tank"] ? 15 : 0) +
        (air ? 15 : 0) +
        (roles.Cycle ? 10 : 0) -
        Math.max(0, roles.Building - 1) * 20 -
        Math.max(0, utility - 3) * 20,
    ),
    fit =
      (Math.max(
        ...templates.map((t) => cs.filter((c) => t.includes(c.name)).length),
      ) /
        8) *
      100;
  const features = [
    {
      name: "Defense",
      value: defense,
      weight: q.defense + (/defens/i.test(q.mode) ? 25 : 0),
    },
    {
      name: "Offense",
      value: offense,
      weight: q.offense + (q.mode === "Maximum offense" ? 25 : 0),
    },
    {
      name: "Level readiness",
      value: readiness,
      weight: /Highest|Trophy|Budget/.test(q.mode) ? 35 : 20,
    },
    { name: "Role coverage", value: coverage, weight: 10 },
    {
      name: "Elixir efficiency",
      value: efficiency,
      weight: q.mode === "Fast cycle" ? 30 : 10,
    },
    { name: "Composition balance", value: balance, weight: 20 },
    { name: "Editorial archetype fit", value: fit, weight: 30 },
  ];
  if (q.mode.includes("2v2") && q.teammate?.length === 8) {
    const missing = Object.keys(roleGroups).filter(
      (r) => !q.teammate!.some((c) => c.roles.includes(r)),
    );
    features.push({
      name: "Teammate complement",
      value: missing.length
        ? (missing.filter((r) => roles[r]).length / missing.length) * 100
        : coverage,
      weight: 20,
    });
  }
  const warnings = [];
  if (!legal(cs)) warnings.push("Select eight distinct owned base cards.");
  if (!roles["Win condition"])
    warnings.push("No recognized primary win condition.");
  if (air < 2)
    warnings.push(
      "Limited sustained anti-air. Cycle units cannot replace reliable air counters.",
    );
  if (!roles["Tank killer"])
    warnings.push("No recognized dedicated tank killer.");
  if (!utility) warnings.push("No utility spell.");
  if (avg != null && avg > 4.2)
    warnings.push("Heavy rotation: preserve elixir for defense.");
  if (cs.some((c) => !c.roles.length))
    warnings.push("Some card roles are unclassified.");
  if (cs.some((c) => c.rarity === "champion"))
    warnings.push(
      "Champion slot legality must be checked in-game. Automatic search excludes Champions.",
    );
  return {
    score:
      Math.round(
        (features.reduce((s, f) => s + f.value * f.weight, 0) /
          features.reduce((s, f) => s + f.weight, 0)) *
          10,
      ) / 10,
    avg,
    cycle,
    roles,
    air,
    defense,
    offense,
    readiness,
    coverage,
    features,
    warnings,
  };
}
export function generate(collection: Card[], q: Constraints) {
  if (
    q.include.length > 8 ||
    new Set(q.include).size !== q.include.length ||
    q.include.some((id) => q.exclude.includes(id))
  )
    return [];
  const pool = collection.filter(
    (c) =>
      c.owned &&
      !c.tower &&
      c.rarity !== "champion" &&
      c.level != null &&
      c.level >= q.minLevel &&
      c.elixir != null &&
      !q.exclude.includes(c.id),
  );
  const forced = q.include.map((id) => pool.find((c) => c.id === id));
  if (forced.some((c) => !c) || pool.length < 8) return [];
  const choices = [...pool].sort((a, b) => b.level! - a.level!).slice(0, 40);
  let beam: Card[][] = [forced as Card[]];
  for (let d = forced.length; d < 8; d++) {
    const next = new Map<string, { cards: Card[]; score: number }>();
    for (const cs of beam)
      for (const c of choices) {
        if (cs.some((x) => x.id === c.id)) continue;
        const cards = [...cs, { ...c, active: "base" }];
        if (cards.reduce((s, c) => s + c.elixir!, 0) > q.maxElixir * 8)
          continue;
        const k = key(cards);
        if (next.has(k)) continue;
        const e = evaluate(cards, q);
        next.set(k, {
          cards,
          score:
            e.score +
            e.coverage * 0.15 -
            Math.max(0, e.roles["Win condition"] - 2) * 8,
        });
      }
    beam = [...next.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 75)
      .map((x) => x.cards);
  }
  for (const t of templates) {
    const cs = t.map((n) => pool.find((c) => c.name === n));
    if (
      cs.every((c): c is Card => !!c) &&
      q.include.every((id) => cs.some((c) => c.id === id))
    )
      beam.push(cs);
  }
  const ranked = beam
    .filter(
      (cs) =>
        legal(cs) &&
        cs.some((c) => c.roles.includes("Win condition")) &&
        evaluate(cs, q).avg! <= q.maxElixir,
    )
    .map((cs) => ({
      cards: cs.map((c) => ({ ...c, active: "base" })),
      evaluation: evaluate(cs, q),
    }))
    .sort((a, b) => b.evaluation.score - a.evaluation.score);
  const result: typeof ranked = [];
  for (const d of ranked)
    if (
      result.every(
        (x) =>
          d.cards.filter((c) => x.cards.some((a) => a.id === c.id)).length <= 6,
      )
    ) {
      result.push(d);
      if (result.length === 5) break;
    }
  return result;
}
export function deckLink(cs: Card[]) {
  if (cs.length !== 8 || new Set(cs.map((c) => c.id)).size !== 8)
    throw new Error("Select eight distinct cards.");
  return (
    "https://link.clashroyale.com/deck/en?deck=" + cs.map((c) => c.id).join(";")
  );
}
export function importLink(input: string, catalog: Card[]) {
  const u = new URL(input);
  if (u.hostname !== "link.clashroyale.com")
    throw new Error("Use an official Clash Royale deck link.");
  const ids = (u.searchParams.get("deck") ?? "").split(";").map(Number);
  if (ids.length !== 8 || new Set(ids).size !== 8)
    throw new Error("Expected eight distinct card IDs.");
  return ids.map((id) => {
    const c = catalog.find((c) => c.id === id);
    if (!c)
      throw new Error(
        "This link contains cards absent from the loaded catalog.",
      );
    return c;
  });
}
export function combat(
  hp: number,
  damage: number,
  interval: number,
  delay: number,
) {
  if (
    [hp, damage, interval].some((x) => !Number.isFinite(x) || x <= 0) ||
    !Number.isFinite(delay) ||
    delay < 0
  )
    return null;
  const hits = Math.ceil(hp / damage);
  return { hits, dps: damage / interval, time: delay + (hits - 1) * interval };
}
