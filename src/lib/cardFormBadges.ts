import type { Card } from "./model";

export type CardFormBadge = {
  form: "evolution" | "hero";
  unlocked: boolean;
};

type CardFormSupport = Pick<
  Card,
  "hasEvolution" | "hasHero" | "evolutionImage" | "heroImage" | "evo" | "hero"
>;

/** Returns every special form a card supports and whether the player has unlocked it. */
export function getCardFormBadges(card: CardFormSupport): CardFormBadge[] {
  const badges: CardFormBadge[] = [];
  const hasEvolution = card.hasEvolution === true || card.evo === true || Boolean(card.evolutionImage);
  const hasHero = card.hasHero === true || card.hero === true || Boolean(card.heroImage);

  if (hasEvolution) badges.push({ form: "evolution", unlocked: card.evo === true });
  if (hasHero) badges.push({ form: "hero", unlocked: card.hero === true });
  return badges;
}
