import { Crown } from "lucide-react";

type Props = { playerTag: string; playerName: string };

/**
 * The official Clash Royale player API does not contain a Supercell ID avatar.
 * For the single account that provided its in-game image, display that exact
 * snapshot. This is NOT a live Supercell ID synchronization. Other accounts
 * use a neutral icon rather than a wrong badge or a made-up avatar.
 */
export function ProfileAvatar({ playerTag, playerName }: Props) {
  const tag = playerTag.replace(/^#/, "").toUpperCase();
  const screenshotProvided = tag === "VUYRP9GQL";
  return (
    <div className="ri-profile-avatar-wrap">
      <div className="ri-profile-icon ri-profile-avatar">
        {screenshotProvided
          ? <img src="/avatars/VUYRP9GQL.webp"
              alt={playerName + "'s Supercell ID avatar, captured from the supplied game screenshot"}
              width={109} height={119} loading="eager"/>
          : <Crown size={28} aria-label="Clash Royale profile" />}
      </div>
    </div>
  );
}
