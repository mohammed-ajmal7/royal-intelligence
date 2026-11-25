import type { Card } from "./model";

export type CardOwnership = "Owned" | "Unowned" | "All";
export type CardTypeFilter = "" | "Evolutions" | "Heroes";

/**
 * Ownership and card capability are independent filters.
 * "All" includes unlocked and locked cards. Type filtering checks whether
 * the card supports a special form, not whether the player has unlocked it.
 *
 * Missing form availability metadata is unknown, never assumed true.
 * A reported unlocked form is also evidence that the card supports that form.
 */
export function filterCollection(
  cards: readonly Card[],
  options: { ownership: CardOwnership; type: CardTypeFilter; query: string },
): Card[] {
  const search = options.query.trim().toLocaleLowerCase();
  return cards.filter(card =>
    !card.tower &&
    (options.ownership === "All" ||
      card.owned === (options.ownership === "Owned")) &&
    card.name.toLocaleLowerCase().includes(search) &&
    (options.type === "" ||
      (options.type === "Evolutions" &&
        (card.hasEvolution === true || card.evo === true)) ||
      (options.type === "Heroes" &&
        (card.hasHero === true || card.hero === true)))
  ).sort((a,b) =>
    Number(b.owned) - Number(a.owned) ||
    (b.level ?? 0) - (a.level ?? 0) ||
    a.name.localeCompare(b.name)
  );
}
