import { Card, Battle, roleGroups } from "./model";
import type { MechanicsCatalog } from "./mechanics";
import { scoreDeckMechanics } from "./mechanicsScoring";
import { assessStrategy, type ReasoningContext } from "./deckStrategy";
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
const heavySpellNames = new Set([
  "Fireball", "Poison", "Lightning", "Rocket", "Earthquake", "Void",
]);
const cheapSpellNames = new Set([
  "Arrows", "Zap", "The Log", "Giant Snowball", "Barbarian Barrel",
  "Royal Delivery", "Tornado", "Rage",
]);
const hasRole = (c: Card, role: string) => c.roles.includes(role);
const reliableAir = (c: Card) =>
  hasRole(c, "Air defense") && !hasRole(c, "Cycle");

export function deckAudit(cs: Card[]) {
  const count = (fn: (c: Card) => boolean) => cs.filter(fn).length;
  const checks = [
    { id: "win", label: "Tower-damage win condition", ok: count(c => hasRole(c, "Win condition")) >= 1 },
    { id: "air", label: "Two reliable air defenders", ok: count(reliableAir) >= 2 },
    { id: "tank", label: "Dedicated tank stopper", ok: count(c => hasRole(c, "Tank killer")) >= 1 },
    { id: "ground", label: "Ground-defense response", ok: count(c => hasRole(c, "Ground defense")) >= 1 },
    { id: "splash", label: "Swarm and splash response", ok: count(c => hasRole(c, "Swarm control")) >= 1 },
    { id: "bigspell", label: "Heavy spell / spell pressure", ok: count(c => heavySpellNames.has(c.name)) >= 1 },
    { id: "smallspell", label: "Cheap control spell", ok: count(c => cheapSpellNames.has(c.name)) >= 1 },
  ];
  return {
    checks,
    passed: checks.filter(c => c.ok).length,
    total: checks.length,
    missing: checks.filter(c => !c.ok).map(c => c.label),
  };
}
export function evaluate(
  cs: Card[],
  q: Constraints = defaults,
  mechanics?: MechanicsCatalog | null,
) {
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
    coverage = (Object.values(roles).filter(Boolean).length / Object.keys(roleGroups).length) * 100,
    efficiency =
      avg == null
        ? 0
        : clamp(
            100 - Math.max(0, avg - (q.mode === "Fast cycle" ? 2.6 : 3.5)) * 30,
          ),
    // The lowest possible four-card rotation cost is an independent
    // efficiency signal. It is not always a card-specific return cost.
    cycleTarget = q.mode === "Fast cycle" ? 7 : /defens|offense/i.test(q.mode) ? 12 : 10,
    cycleEfficiency = cycle == null ? 0 :
      clamp(100 - Math.max(0, cycle - cycleTarget) * (q.mode === "Fast cycle" ? 15 : 10)),
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
    {
      name: "Four-card cycle efficiency",
      value: cycleEfficiency,
      weight: q.mode === "Fast cycle" ? 25 : 10,
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
  const audit = deckAudit(cs);
  // Apply a visible coverage penalty so a few overlevelled cards cannot
  // outweigh missing core answers. This is an editorial score, not win odds.
  const penaltyByCheck: Record<string, number> = {
    win: 18, air: 12, tank: 10, ground: 7,
    splash: 6, bigspell: 9, smallspell: 7,
  };
  const base = features.reduce((sum, feature) =>
    sum + feature.value * feature.weight, 0) /
    features.reduce((sum, feature) => sum + feature.weight, 0);
  const penalty = audit.checks.reduce((sum, check) =>
    sum + (check.ok ? 0 : penaltyByCheck[check.id]), 0);

  // Cards are scored FIRST from HP, DPS, hit interval, range, movement,
  // actual target types and splash when available at the player's level.
  // If coverage is incomplete, automatically redistribute that weight to
  // the existing structural score. Do not treat an unknown stat as zero.
  const mechanic = scoreDeckMechanics(cs,mechanics);
  const statShare = mechanic.score === null ? 0 :
    0.65 * Math.min(1, mechanic.coverage / 0.70);
  const averageShare = 0.08;
  const fourCardShare = 0.07;
  const structuralShare = 1 - statShare - averageShare - fourCardShare;
  const structuralFeatures = features.filter(f =>
    f.name !== "Elixir efficiency" &&
    f.name !== "Four-card cycle efficiency");
  const structure = structuralFeatures.reduce((total,f)=>total+f.value*f.weight,0) /
    structuralFeatures.reduce((total,f)=>total+f.weight,0);
  const rawScore =
    structure * structuralShare +
    (mechanic.score ?? 0) * statShare +
    efficiency * averageShare +
    cycleEfficiency * fourCardShare;
  // Role coverage still protects against obvious holes, but proven numerical
  // stats can outweigh coarse labels. No value here is a win probability.
  const appliedPenalty = penalty * (1 - statShare * 0.6);
  const scoring = {
    mechanics: Math.round(statShare * 1000) / 10,
    structure: Math.round(structuralShare * 1000) / 10,
    averageElixir: Math.round(averageShare * 1000) / 10,
    fourCardCycle: Math.round(fourCardShare * 1000) / 10,
    penalty: Math.round(appliedPenalty * 10) / 10,
  };
  return {
    score: Math.round(clamp(rawScore - appliedPenalty) * 10) / 10,
    mechanic,
    scoring,
    audit,
    avg,
    cycle,
    cycleEfficiency,
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
/** Deterministic bounded multistart search.
 * Every eligible owned card is considered: no arbitrary top-40 cutoff.
 * Archetype + role-aware seeds are improved through all-card swaps.
 * Results are heuristic and cannot guarantee wins against unknown decks.
 */
export function generate(
  collection: Card[],
  q: Constraints,
  currentDeck: Card[] = [],
  mechanics?: MechanicsCatalog | null,
  reasoning?: ReasoningContext,
) {
  if (
    q.include.length > 8 ||
    new Set(q.include).size !== q.include.length ||
    q.include.some(id => q.exclude.includes(id)) ||
    !Number.isFinite(q.maxElixir) || q.maxElixir <= 0
  ) return [];

  const pool = [...new Map(collection
    .filter(c =>
      c.owned && !c.tower && c.rarity !== "champion" &&
      c.level != null && c.level >= q.minLevel &&
      c.elixir != null && Number.isFinite(c.elixir) &&
      !q.exclude.includes(c.id)
    ).map(c => [c.id, c])).values()];
  const byId = new Map(pool.map(c => [c.id, c]));
  const forced = q.include.map(id => byId.get(id));
  if (pool.length < 8 || forced.some(c => !c)) return [];
  const locked = new Set(q.include);
  const forcedCards = forced as Card[];
  const winCards = pool.filter(c => hasRole(c, "Win condition"));
  if (!winCards.length && !forcedCards.some(c => hasRole(c, "Win condition")))
    return [];

  const permitted = (cs: Card[]) => (
    cs.length === 8 &&
    legal(cs) &&
    locked.size <= cs.length &&
    [...locked].every(id => cs.some(c => c.id === id)) &&
    cs.some(c => hasRole(c, "Win condition")) &&
    cs.reduce((sum, c) => sum + (c.elixir ?? 0), 0) <= q.maxElixir * 8 + 1e-7
  );
  // Numeric strength is not enough: inspect tactical matchup coverage,
  // redundancies, cycle and specific strategic goals before selecting eight.
  // Use an exact stable-key memo, because the optimizer evaluates many swaps.
  const scores = new Map<string, number>();
  const fitness = (cs: Card[]) => {
    const id = key(cs);
    const old = scores.get(id);
    if (old !== undefined) return old;
    const base = evaluate(cs, q, mechanics).score;
    const tactical = reasoning
      ? assessStrategy(cs,mechanics,{focus:reasoning.focus}).score : base;
    const blended = Math.round((base*(reasoning?0.58:1)+tactical*(reasoning?0.42:0))*10)/10;
    scores.set(id,blended);
    return blended;
  };
  const candidates = new Map<string, Card[]>();
  const addCandidate = (cs: Card[]) => {
    if (permitted(cs)) candidates.set(key(cs), cs);
  };

  // Each pattern explicitly looks for win pressure, anti-air, ground answers,
  // a tank stopper and both spell classes. The full pool remains eligible.
  const patterns: string[][] = [
    ["win", "bigspell", "air", "tank", "smallspell", "air", "ground", "splash"],
    ["win", "air", "tank", "ground", "bigspell", "smallspell", "air", "cycle"],
    ["win", "bigspell", "smallspell", "tank", "air", "splash", "air", "cycle"],
    ["win", "air", "air", "tank", "splash", "bigspell", "smallspell", "ground"],
  ];
  const roleTest: Record<string, (c: Card) => boolean> = {
    win: c => hasRole(c, "Win condition"),
    air: reliableAir,
    tank: c => hasRole(c, "Tank killer"),
    ground: c => hasRole(c, "Ground defense"),
    splash: c => hasRole(c, "Swarm control"),
    bigspell: c => heavySpellNames.has(c.name),
    smallspell: c => cheapSpellNames.has(c.name),
    cycle: c => hasRole(c, "Cycle"),
  };
  const weightedLevel = (c: Card) =>
    (c.level ?? 0) / Math.max(1, q.cap) * 28;
  const seed = (anchor: Card | undefined, pattern: string[]) => {
    const cs = [...forcedCards];
    if (anchor && !cs.some(c => c.id === anchor.id)) cs.push(anchor);
    if (cs.length > 8) return;
    const taken = new Set(cs.map(c => c.id));
    const used = new Set<string>();
    for (const slot of pattern) {
      if (cs.length === 8) break;
      // A dedicated second defender must actually be a second card;
      // other roles can be covered by cards occupying multiple roles.
      const requested = slot === "air" && used.has("air")
        ? 2 : 1;
      used.add(slot);
      if (cs.filter(roleTest[slot]).length >= requested) continue;
      const available = pool.filter(c =>
        !taken.has(c.id) && roleTest[slot](c) &&
        cs.reduce((sum, v) => sum + (v.elixir ?? 0), c.elixir ?? 0)
          <= q.maxElixir * 8 + 1e-7
      );
      const ranked = available.sort((a, b) => {
        const grade = (c: Card) =>
          weightedLevel(c) +
          deckAudit([...cs, c]).passed * 7 -
          (c.elixir ?? 0) * (q.mode === "Fast cycle" ? 5 : 1.2) +
          (c.roles.length * 0.5);
        return grade(b) - grade(a) || a.id - b.id;
      });
      const pick = ranked[0];
      if (pick) { cs.push(pick); taken.add(pick.id); }
    }
    while (cs.length < 8) {
      const available = pool.filter(c =>
        !taken.has(c.id) &&
        cs.reduce((sum, v) => sum + (v.elixir ?? 0), c.elixir ?? 0)
          <= q.maxElixir * 8 + 1e-7
      );
      if (!available.length) return;
      available.sort((a, b) => {
        const grade = (c: Card) =>
          weightedLevel(c) +
          (deckAudit([...cs, c]).passed - deckAudit(cs).passed) * 15 +
          c.roles.length * 0.8 -
          (c.elixir ?? 0) * (q.mode === "Fast cycle" ? 5 : 1.3);
        return grade(b) - grade(a) || a.id - b.id;
      });
      const pick = available[0];
      cs.push(pick);
      taken.add(pick.id);
    }
    addCandidate(cs);
  };

  const sortedWin = winCards.sort((a,b) =>
    weightedLevel(b) - weightedLevel(a) || a.id-b.id);
  for (const anchor of sortedWin) {
    for (const pattern of patterns) seed(anchor, pattern);
  }
  // Retain an existing player's real deck as a legitimate baseline.
  addCandidate(currentDeck.map(c => byId.get(c.id)).filter((c): c is Card => !!c));
  for (const names of templates) {
    const cs = names.map(n => pool.find(c => c.name === n));
    if (cs.every((c): c is Card => !!c)) addCandidate(cs as Card[]);
  }
  // Forced cards might already provide the win condition.
  if (forcedCards.some(c => hasRole(c, "Win condition")))
    for (const pattern of patterns) seed(undefined, pattern);

  const seeds = [...candidates.values()]
    .sort((a,b) => fitness(b) - fitness(a) || key(a).localeCompare(key(b)));
  // Make sure alternative win conditions get explored, not just the most
  // overlevelled archetype.
  const diverse = new Map<number, Card[]>();
  for (const cs of seeds) {
    const win = cs.find(c => hasRole(c, "Win condition"));
    if (win && !diverse.has(win.id)) diverse.set(win.id, cs);
  }
  const sampled = [...new Map(
    [...seeds.slice(0, 16), ...[...diverse.values()].slice(0, 14)]
      .map(cs => [key(cs), cs])
  ).values()].slice(0, 30);
  const optimized = new Map<string, Card[]>();
  for (const start of sampled) {
    let best = [...start];
    let bestScore = fitness(best);
    // Single-card swaps inspect every owned, eligible card; preserve hard
    // includes and the elixir cap. Bounded passes keep the UI responsive.
    for (let pass = 0; pass < 3; pass++) {
      let winner: Card[] | null = null;
      let winnerScore = bestScore;
      for (let position = 0; position < 8; position++) {
        if (locked.has(best[position].id)) continue;
        for (const card of pool) {
          if (best.some((c, i) => i !== position && c.id === card.id)) continue;
          if (card.id === best[position].id) continue;
          const trial = [...best];
          trial[position] = card;
          if (!permitted(trial)) continue;
          const score = fitness(trial);
          if (score > winnerScore + 1e-7) {
            winner = trial;
            winnerScore = score;
          }
        }
      }
      if (!winner) break;
      best = winner;
      bestScore = winnerScore;
    }
    optimized.set(key(best), best);
  }
  // Include exact seeds as alternative options if local optima collapse.
  for (const cs of seeds) optimized.set(key(cs), cs);
  const ranked = [...optimized.values()]
    .filter(permitted)
    .map(cs => ({
      cards: cs.map(c => ({ ...c, active: "base" })),
      evaluation: evaluate(cs, q, mechanics),
      recommendationScore: fitness(cs),
      strategy: reasoning ? assessStrategy(cs,mechanics,reasoning) : null,
    }))
    .sort((a,b) => b.recommendationScore - a.recommendationScore ||
      key(a.cards).localeCompare(key(b.cards)));
  const result: typeof ranked = [];
  for (const choice of ranked) {
    if (result.every(existing =>
      choice.cards.filter(c => existing.cards.some(e => e.id === c.id)).length <= 6
    )) {
      result.push(choice);
      if (result.length === 5) break;
    }
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

