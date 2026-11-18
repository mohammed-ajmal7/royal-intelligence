import type { Card } from "./model";
import type { Constraints } from "./engine";
import { evaluate, key, legal } from "./engine";
import { assessStrategy, type StrategyFocus } from "./deckStrategy";
import {
  getMechanicsRecord,
  resolveMechanics,
  type MechanicsCatalog,
} from "./mechanics";
import { mechanicsOf } from "./mechanicsScoring";
import { ownedLevelBenchmark } from "./slotReplacements";

/**
 * Independent OWNED-COLLECTION generator. No top-player sample, external
 * popularity signal or fabricated combat/evolution multipliers are used.
 *
 * Each role receives a DIFFERENT card. This is a fixed balanced-control
 * blueprint, not a universal best deck or an exhaustive match simulator.
 */
export const SELF_SLOTS = [
  { id: "win", label: "Win condition", purpose: "Reliable tower damage" },
  { id: "mini", label: "Mini tank", purpose: "Absorbs ground damage" },
  { id: "air", label: "Air defender", purpose: "Sustained anti-air damage" },
  { id: "splash", label: "Air + splash", purpose: "Controls grouped air and ground troops" },
  { id: "tank", label: "Tank killer / building", purpose: "Stops high-hitpoint threats" },
  { id: "ground", label: "Ground defense", purpose: "Efficient defensive rotation" },
  { id: "small", label: "Small spell", purpose: "Swarm and bait removal" },
  { id: "heavy", label: "Heavy spell", purpose: "Support removal and spell pressure" },
] as const;
export type SelfSlotId = (typeof SELF_SLOTS)[number]["id"];

export type SelfCardComparison = {
  card: Card;
  grade: number;
  hp: number | null;
  damage: number | null;
  dps: number | null;
  target: string;
  confidence: number;
  evidence: string;
};
export type SelfSlotComparison = {
  id: SelfSlotId;
  label: string;
  purpose: string;
  chosen: SelfCardComparison;
  alternatives: SelfCardComparison[];
  considered: number;
};
export type SelfMadeCandidate = {
  cards: Card[];
  score: number;
  evaluation: ReturnType<typeof evaluate>;
  strategy: ReturnType<typeof assessStrategy>;
  slots: SelfSlotComparison[];
  averageRolePower: number;
  ownedEvolutionCount: number;
  suggestedEvolutions: string[];
  warnings: string[];
};
export type SelfMadeResult = {
  candidates: SelfMadeCandidate[];
  issues: string[];
  eligibleCardCount: number;
  slotCounts: Record<SelfSlotId, number>;
  source: string | null;
};

const clamp = (n: number) => Math.min(100, Math.max(0, n));
const round = (n: number) => Math.round(n * 10) / 10;
const role = (c: Card, name: string) => c.roles.includes(name);
const defensiveBuildings = new Set([
  "Cannon", "Tesla", "Inferno Tower", "Bomb Tower", "Tombstone", "Goblin Cage",
]);
const isTroopOrBuilding = (c: Card) =>
  !role(c, "Spell") && !role(c, "Win condition") &&
  c.rarity.toLowerCase() !== "champion";
const canSustainAir = (card: Card, mechanics: MechanicsCatalog | null) => {
  if (!role(card, "Air defense") || !isTroopOrBuilding(card) || role(card, "Cycle"))
    return false;
  const known = resolveMechanics(card, mechanics);
  return known?.targetsAir !== false && known?.buildingsOnly !== true;
};

/** Never substitute a ground-only splash unit for an air-splash answer. */
export function qualifiesForSelfSlot(
  slot: SelfSlotId,
  card: Card,
  mechanics: MechanicsCatalog | null = null,
): boolean {
  const m = resolveMechanics(card, mechanics);
  switch (slot) {
    case "win": return role(card, "Win condition");
    case "mini": return role(card, "Mini tank") && !role(card, "Spell");
    case "air": return canSustainAir(card, mechanics);
    case "splash": return canSustainAir(card, mechanics) &&
      role(card, "Swarm control") && (m?.splashRadiusTiles === null ||
        m?.splashRadiusTiles === undefined || m.splashRadiusTiles > 0 ||
        !!getMechanicsRecord(card, mechanics)?.groupUnits?.length);
    case "tank": return role(card, "Tank killer") || defensiveBuildings.has(card.name);
    case "ground": return role(card, "Ground defense") && isTroopOrBuilding(card);
    case "small": return role(card, "Small spell");
    case "heavy": return role(card, "Heavy spell");
  }
}

function profile(card: Card, slot: SelfSlotId, benchmark: number,
  mechanics: MechanicsCatalog | null): SelfCardComparison {
  const raw = mechanicsOf(card, mechanics);
  const m = resolveMechanics(card, mechanics);
  // Levels are the player's own normalized base levels. The reference
  // publication's exact-level values are used directly, never projected.
  const readiness = clamp(100 - Math.max(0, benchmark - (card.level ?? 0)) * 17);
  let fit = 91;
  if (slot === "air") {
    fit += m?.targetsAir === true ? 5 : 0;
    fit += m?.dps !== null && m?.dps !== undefined ? 4 : 0;
    if (role(card, "Swarm control")) fit -= 3;
  } else if (slot === "splash") {
    fit += m?.targetsAir === true ? 3 : 0;
    fit += m?.splashRadiusTiles !== null && m?.splashRadiusTiles !== undefined &&
      m.splashRadiusTiles > 0 ? 6 : 0;
  } else if (slot === "tank") {
    fit += m?.dps !== null && m?.dps !== undefined ? 6 : 0;
    fit += defensiveBuildings.has(card.name) ? 2 : 0;
  } else if (slot === "mini") {
    fit += m?.hitpoints !== null && m?.hitpoints !== undefined ? 5 : 0;
    fit -= Math.max(0, (card.elixir ?? 0) - 4) * 5;
  } else if (slot === "ground") {
    fit += (card.elixir ?? 9) <= 3 ? 7 : 0;
    fit -= Math.max(0, (card.elixir ?? 0) - 4) * 7;
  } else if (slot === "win") {
    fit += 5;
  } else {
    fit += 8;
  }
  const confidence = raw.score === null ? 0 : raw.confidence;
  // Unknown mechanics don't score as zero: confidence removes their weight.
  // The measured component is an editorial per-elixir normalization, NOT an
  // independent win rate or a direct cross-category DPS comparison.
  const grade = round(clamp(
    (readiness * 50 + clamp(fit) * 25 +
      (raw.score ?? 0) * 25 * confidence) / (75 + 25 * confidence),
  ));
  const known: string[] = [];
  if (raw.hp !== null) known.push("HP " + Math.round(raw.hp));
  if (raw.dps !== null) known.push("DPS " + Math.round(raw.dps));
  if (card.evo === true) known.push("Evolution unlocked");
  if (card.hero === true) known.push("Hero unlocked");
  if (m?.specialAbility) known.push("Special ability recorded");
  return {
    card, grade, hp: raw.hp, damage: raw.damage, dps: raw.dps,
    target: raw.targets, confidence,
    evidence: known.length ? known.join(" · ") :
      "Only level and classified role can currently be verified",
  };
}

type Assignment = { id: SelfSlotId; card: Card; grade: number };
type Beam = { chosen: Assignment[]; ids: Set<number>; spent: number; value: number };

/**
 * Bounded beam search compares EVERY eligible owned card for EVERY role.
 * It does not claim exhaustive global optimality over all 8-card permutations.
 */
export function generateSelfMadeDecks(
  collection: Card[],
  constraints: Constraints,
  mechanics: MechanicsCatalog | null = null,
  focus: StrategyFocus = "balanced",
): SelfMadeResult {
  const issues: string[] = [];
  const slotCounts = Object.fromEntries(
    SELF_SLOTS.map(slot => [slot.id, 0]),
  ) as Record<SelfSlotId, number>;
  const empty = (): SelfMadeResult => ({
    candidates: [], issues, eligibleCardCount: 0,
    slotCounts, source: mechanics?.source ?? null,
  });
  const q = constraints;
  if (q.include.length > 8 || new Set(q.include).size !== q.include.length ||
    q.include.some(id => q.exclude.includes(id)) ||
    !Number.isFinite(q.maxElixir) || q.maxElixir <= 0) {
    issues.push("The locked, excluded or maximum-elixir filters conflict.");
    return empty();
  }
  const pool = [...new Map(collection.filter(c =>
    c.owned && !c.tower && c.rarity.toLowerCase() !== "champion" &&
    c.level !== null && Number.isInteger(c.level) && c.level >= q.minLevel &&
    c.elixir !== null && Number.isFinite(c.elixir) && c.elixir >= 0 &&
    !q.exclude.includes(c.id),
  ).map(c => [c.id, { ...c, active: "base" }])).values()];
  const benchmark = ownedLevelBenchmark(pool);
  const options = new Map<SelfSlotId, SelfCardComparison[]>();
  for (const slot of SELF_SLOTS) {
    const matches = pool.filter(c => qualifiesForSelfSlot(slot.id, c, mechanics))
      .map(c => profile(c, slot.id, benchmark, mechanics))
      .sort((a, b) => b.grade - a.grade ||
        (b.card.level ?? 0) - (a.card.level ?? 0) ||
        a.card.id - b.card.id);
    options.set(slot.id, matches);
    slotCounts[slot.id] = matches.length;
    if (!matches.length)
      issues.push("No owned eligible card for " + slot.label +
        ". Review your minimum level or excluded cards.");
  }
  if (pool.length < 8) issues.push("Fewer than eight eligible owned cards.");
  const forced = new Set(q.include);
  for (const id of forced) {
    if (!pool.some(c => c.id === id))
      issues.push("Locked card #" + id + " is not eligible in your collection.");
    else if (!SELF_SLOTS.some(slot => options.get(slot.id)!.some(x => x.card.id === id)))
      issues.push("Locked card #" + id + " cannot fill any of the eight required roles.");
  }
  if (issues.length) return { ...empty(), eligibleCardCount: pool.length };

  // Constrained slots go first; a forced card with only one legal role is
  // reserved by the feasibility check rather than lost to beam greediness.
  const order = [...SELF_SLOTS].sort((a, b) =>
    options.get(a.id)!.length - options.get(b.id)!.length);
  const maxSpent = q.maxElixir * 8 + 1e-7;
  let beam: Beam[] = [{ chosen: [], ids: new Set(), spent: 0, value: 0 }];
  for (let index = 0; index < order.length; index++) {
    const slot = order[index];
    const remaining = order.slice(index + 1).map(s => s.id);
    const next: Beam[] = [];
    for (const state of beam) {
      for (const candidate of options.get(slot.id)!) {
        const card = candidate.card;
        if (state.ids.has(card.id) || state.spent + (card.elixir ?? 0) > maxSpent)
          continue;
        const ids = new Set(state.ids);
        ids.add(card.id);
        if ([...forced].filter(id => !ids.has(id)).length > remaining.length)
          continue;
        if ([...forced].some(id => !ids.has(id) &&
          !remaining.some(r => options.get(r)!.some(x => x.card.id === id))))
          continue;
        // Small reward for high role strength, before whole-deck scoring.
        next.push({
          chosen: [...state.chosen, { id: slot.id, card, grade: candidate.grade }],
          ids, spent: state.spent + (card.elixir ?? 0),
          value: state.value + candidate.grade,
        });
      }
    }
    // Never cut the card pool itself: the beam bounds combinations only.
    next.sort((a, b) => b.value - a.value ||
      a.spent - b.spent ||
      [...a.ids].sort((x,y)=>x-y).join(",").localeCompare(
        [...b.ids].sort((x,y)=>x-y).join(",")));
    const unique = new Set<string>();
    beam = next.filter(s => {
      const id = s.chosen.map(c => c.id + ":" + c.card.id).sort().join("|");
      if (unique.has(id)) return false;
      unique.add(id);
      return true;
    }).slice(0, 500);
    if (!beam.length) break;
  }
  const full: SelfMadeCandidate[] = [];
  const seen = new Set<string>();
  for (const state of beam) {
    if (state.chosen.length !== 8 || [...forced].some(id => !state.ids.has(id)))
      continue;
    const cards = SELF_SLOTS.map(slot =>
      state.chosen.find(x => x.id === slot.id)!.card);
    if (!legal(cards) || seen.has(key(cards))) continue;
    seen.add(key(cards));
    const evaluation = evaluate(cards, q, mechanics);
    if (evaluation.avg === null || evaluation.avg > q.maxElixir + 1e-7) continue;
    const strategy = assessStrategy(cards, mechanics, { focus });
    const averageRolePower = round(state.value / 8);
    const evolutionReady = cards.filter(c => c.evo === true);
    const suggestedEvolutions = evolutionReady
      .map(c => ({
        name: c.name,
        grade: state.chosen.find(x => x.card.id === c.id)!.grade,
      }))
      .sort((a,b) => b.grade - a.grade)
      .slice(0,2).map(x => x.name);
    // Evolution is a small *unlock* preference, NOT fake upgraded DPS.
    // In-game active slots/rotation are not visible for a generated deck.
    const evolutionBonus = Math.min(3, evolutionReady.length * 1.5);
    const extraWins = Math.max(0, cards.filter(c => role(c,"Win condition")).length - 1);
    const score = round(clamp(
      averageRolePower * .48 + evaluation.score * .29 +
      strategy.score * .23 + evolutionBonus - extraWins * 2.5,
    ));
    const slots: SelfSlotComparison[] = SELF_SLOTS.map(slot => {
      const chosen = options.get(slot.id)!.find(x =>
        x.card.id === state.chosen.find(s => s.id === slot.id)!.card.id)!;
      return {
        id:slot.id, label:slot.label, purpose:slot.purpose, chosen,
        // All alternatives were evaluated; show only the strongest five.
        alternatives:options.get(slot.id)!.filter(x =>
          x.card.id !== chosen.card.id).slice(0,5),
        considered:options.get(slot.id)!.length,
      };
    });
    const warnings = [
      "Evolution/Hero unlocked does not mean equipped or activated; choose legal in-game slots.",
      "Comparison numbers use base forms at your owned level, never invented Evolution damage multipliers.",
      "Some published combat values may lag the current balance patch.",
    ];
    if (slots.some(s => s.chosen.confidence < .4))
      warnings.push("Incomplete HP, damage or targeting values: low-confidence comparisons are clearly marked.");
    full.push({
      cards, score, evaluation, strategy, slots, averageRolePower,
      ownedEvolutionCount:evolutionReady.length, suggestedEvolutions,
      warnings,
    });
  }
  full.sort((a,b) => b.score - a.score ||
    b.averageRolePower - a.averageRolePower ||
    key(a.cards).localeCompare(key(b.cards)));
  const selected: SelfMadeCandidate[] = [];
  for (const candidate of full) {
    if (selected.every(existing =>
      candidate.cards.filter(c => existing.cards.some(x => x.id === c.id)).length <= 6
    )) selected.push(candidate);
    if (selected.length >= 4) break;
  }
  if (!selected.length) issues.push(
    "No eight distinct owned cards can fill all roles within the current lock, level and elixir limits. " +
    "Try a higher elixir cap or relax the filters.",
  );
  return {
    candidates:selected, issues, eligibleCardCount:pool.length,
    slotCounts, source:mechanics?.source ?? null,
  };
}
