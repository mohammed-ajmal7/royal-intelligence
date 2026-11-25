import type { Card } from "./model";

export type CardCollectionFilter = "Owned" | "Unowned" | "All" | "Locked" | "Unlocked";
export type CardTypeFilter = "" | "Evolutions" | "Heroes";

/**
 * For special forms, Locked/Unlocked are based on the player's form flag.
 * The API only provides that flag for cards in the player's collection;
 * unowned cards therefore remain available through Owned/Unowned/All only.
 */
export function filterCollection(
  cards: readonly Card[],
  options: { ownership: CardCollectionFilter; type: CardTypeFilter; query: string },
): Card[] {
  const search = options.query.trim().toLocaleLowerCase();
  return cards.filter(card => {
    if (card.tower || !card.name.toLocaleLowerCase().includes(search)) return false;

    const supportsType = options.type === "" ||
      (options.type === "Evolutions" && (card.hasEvolution === true || card.evo === true)) ||
      (options.type === "Heroes" && (card.hasHero === true || card.hero === true));
    if (!supportsType) return false;

    if (options.ownership === "Owned") return card.owned;
    if (options.ownership === "Unowned") return !card.owned;
    if (options.ownership === "Locked") {
      if (!card.owned || !options.type) return false;
      return options.type === "Evolutions" ? card.evo === false : card.hero === false;
    }
    if (options.ownership === "Unlocked") {
      if (!card.owned || !options.type) return false;
      return options.type === "Evolutions" ? card.evo === true : card.hero === true;
    }
    return true;
  }).sort((a,b) =>
    Number(b.owned) - Number(a.owned) ||
    (b.level ?? 0) - (a.level ?? 0) ||
    a.name.localeCompare(b.name)
  );
}
