import type { Card } from "./model";

export type CardOwnership = "Owned" | "Unowned" | "All";
export type FormStatusFilter = "All" | "Unlocked" | "Locked";
export type CardTypeFilter = "" | "Evolutions" | "Heroes";

/**
 * Ownership and special-form unlock status are separate filters.
 * Locked/Unlocked only apply to owned cards and the selected special form.
 */
export function filterCollection(
  cards: readonly Card[],
  options: { ownership: CardOwnership; type: CardTypeFilter; formStatus?: FormStatusFilter; query: string },
): Card[] {
  const search = options.query.trim().toLocaleLowerCase();
  const formStatus = options.formStatus ?? "All";
  return cards.filter(card => {
    if (card.tower || !card.name.toLocaleLowerCase().includes(search)) return false;

    const supportsType = options.type === "" ||
      (options.type === "Evolutions" && (card.hasEvolution === true || card.evo === true)) ||
      (options.type === "Heroes" && (card.hasHero === true || card.hero === true));
    if (!supportsType) return false;
    if (options.ownership !== "All" && card.owned !== (options.ownership === "Owned")) return false;

    if (options.type && options.ownership === "Owned" && formStatus !== "All") {
      const unlocked = options.type === "Evolutions" ? card.evo === true : card.hero === true;
      const locked = options.type === "Evolutions" ? card.evo === false : card.hero === false;
      if (formStatus === "Unlocked" && !unlocked) return false;
      if (formStatus === "Locked" && !locked) return false;
    }
    return true;
  }).sort((a,b) =>
    Number(b.owned) - Number(a.owned) ||
    (b.level ?? 0) - (a.level ?? 0) ||
    a.name.localeCompare(b.name)
  );
}
