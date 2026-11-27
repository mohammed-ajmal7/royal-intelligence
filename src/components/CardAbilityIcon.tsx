"use client";

import { useState } from "react";

type Form = "base" | "evolution" | "hero";

const HERO_ABILITY_FILE_STEMS: Record<string, string> = {
  wizard: "Wizard",
  "mini pekka": "Mini-P.E.K.K.A.",
  musketeer: "Musketeer",
  knight: "Knight",
  giant: "Giant",
  "ice golem": "Ice-Golem",
  goblins: "Goblins",
  "mega minion": "Mega-Minion",
  "barbarian barrel": "Barbarian-Barrel",
  "magic archer": "Magic-Archer",
  balloon: "Balloon",
  "dark prince": "Dark-Prince",
  bowler: "Bowler",
  tombstone: "Tombstone",
  valkyrie: "Valkyrie",
  berserker: "Berserker",
  "ice wizard": "Ice-Wizard",
  "electro wizard": "Electro-Wizard",
};

function heroAbilityFileName(cardName: string): string {
  const key = cardName.trim().toLowerCase().replace(/[.]/g, "").replace(/\s+/g, " ");
  const stem = HERO_ABILITY_FILE_STEMS[key] ??
    cardName.trim().replace(/\s+/g, "-").replace(/[’']/g, "");
  return "Ability-" + stem + "-Heroic.png";
}

/**
 * Clash Royale's game ability button artwork, distributed by the Clash Royale
 * community wiki. The Wizard file is verified as Ability-Wizard-Heroic.png.
 * Other Hero cards follow the same per-card file naming convention.
 */
export function heroAbilityIconUrl(cardName: string): string {
  return "https://clashroyale.fandom.com/wiki/Special:FilePath/" +
    encodeURIComponent(heroAbilityFileName(cardName));
}

export function CardAbilityIcon({
  cardName,
  form,
  abilityName,
  size = "normal",
}: {
  cardName: string;
  form: Form;
  abilityName: string;
  size?: "normal" | "small";
}) {
  const [failed, setFailed] = useState(false);
  const src = form === "hero" ? heroAbilityIconUrl(cardName) : null;

  if (!src || failed) {
    return (
      <span className={"ri-ability-icon ri-ability-icon-fallback" + (size === "small" ? " is-small" : "")} aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path d="m16 2.5 3.1 7.1 7.6-2-2 7.5 5.2 3.2-7.2 3.4.4 7.8-7.1-3.3-6.3 4.5.2-8-7.1-3.3 6-4.9-2.1-7.5 7.5 2.1L16 2.5Z"
            fill="currentColor" opacity=".92"/>
          <path d="m16 9 2.1 4.8 5.1-1.3-1.3 5 3.5 2.1-4.8 2.3.3 5.2-4.8-2.2-4.2 3 .1-5.3-4.7-2.2 4-3.3-1.4-5 5 1.4L16 9Z"
            fill="#fff" opacity=".9"/>
        </svg>
      </span>
    );
  }

  return (
    <span className={"ri-ability-icon" + (size === "small" ? " is-small" : "")}>
      <img
        src={src}
        alt={abilityName + " in-game ability icon"}
        title={abilityName}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
