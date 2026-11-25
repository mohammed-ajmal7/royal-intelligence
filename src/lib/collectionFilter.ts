import type { Card } from "./model";

export type CardOwnership = "Owned" | "Unowned";
export type CardTypeFilter = "All" | "Evolutions" | "Heroes";

/**
 * Independent ownership and card-type filters. "All" means all cards
 * within the selected ownership group, not all owned + unowned cards.
 *
 * The official player collection only confirms unlocked special forms.
 * Missing evolution/hero metadata is unknown, never interpreted as unlocked.
 */
export function filterCollection(
  cards: readonly Card[],
  options: { ownership: CardOwnership; type: CardTypeFilter; query: string },
): Card[] {
  const search = options.query.trim().toLocaleLowerCase();
  const owned = options.ownership === "Owned";
  return cards.filter(card =>
    card.owned === owned &&
    card.name.toLocaleLowerCase().includes(search) &&
    (options.type === "All" ||
      (options.type === "Evolutions" && card.evo === true) ||
      (options.type === "Heroes" && card.hero === true))
  ).sort((a,b) =>
    (b.level ?? 0) - (a.level ?? 0) || a.name.localeCompare(b.name)
  );
}
