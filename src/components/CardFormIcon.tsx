import { useId } from "react";

export type CardFormKind = "evolution" | "hero";

type Props = {
  form: CardFormKind;
  className?: string;
  decorative?: boolean;
};

const FORM_ASSETS: Record<CardFormKind, string> = {
  evolution: "https://api-assets.clashroyale.com/cardevolutions/300/jAj1Q5rclXxU9kVImGqSJxa4wEMfEhvwNQ_4jiGUuqg.png",
  hero: "https://api-assets.clashroyale.com/cardheroes/300/jAj1Q5rclXxU9kVImGqSJxa4wEMfEhvwNQ_4jiGUuqg.png",
};

/**
 * The badge is cropped from the official Clash Royale card-form art.
 * Both official form assets carry the same form marker across cards.
 */
export function CardFormIcon({ form, className, decorative = false }: Props) {
  const rawId = useId();
  const clipId = "card-form-" + rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const evolution = form === "evolution";
  const path = evolution
    ? "M45 1 C49 1 52 4 55 7 L85 37 C91 43 91 47 85 53 L55 83 C52 86 49 89 45 89 C41 89 38 86 35 83 L5 53 C-1 47 -1 43 5 37 L35 7 C38 4 41 1 45 1 Z"
    : "M45 1 C49 1 52 4 55 7 L85 37 C91 43 91 47 85 53 L55 83 C52 86 49 89 45 89 C41 89 38 86 35 83 L5 53 C-1 47 -1 43 5 37 L35 7 C38 4 41 1 45 1 Z";
  // The evolution marker occupies a slightly larger badge area than the hero marker.
  const image = evolution
    ? { x: -105, y: -35, width: 300, height: 420 }
    : { x: -148, y: -51, width: 386, height: 540 };
  return (
    <svg
      className={className}
      viewBox="0 0 90 90"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : evolution ? "Evolution" : "Hero"}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={path}/>
        </clipPath>
      </defs>
      <path d={path} fill={evolution ? "#8d46d1" : "#e9a92e"}/>
      <image
        href={FORM_ASSETS[form]}
        x={image.x}
        y={image.y}
        width={image.width}
        height={image.height}
        preserveAspectRatio="none"
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
}
