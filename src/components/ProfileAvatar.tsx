import { UserRound } from "lucide-react";

type Props = { playerTag: string; playerName: string };

/**
 * Screenshot-based snapshots, NOT live Supercell ID avatars.
 *
 * Clash Royale's public player response does not expose Supercell ID avatars,
 * Game Center avatar IDs or Google Play Games avatar IDs. Neither game tag
 * alone nor a player's name can safely resolve an identity on those platforms.
 *
 * Never substitute card art or someone else's avatar for an unknown profile.
 */
export const suppliedAvatarSnapshots: Readonly<Record<string, string>> = {
  VUYRP9GQL: "/avatars/VUYRP9GQL.webp",
  VGJYQYG0Q: "/avatars/VGJYQYG0Q.webp",
};

export function ProfileAvatar({ playerTag, playerName }: Props) {
  const tag = playerTag.trim().replace(/^#/, "").toUpperCase().replace(/O/g, "0");
  const screenshot = suppliedAvatarSnapshots[tag];
  return (
    <div className="ri-profile-avatar-wrap">
      <div className="ri-profile-icon ri-profile-avatar"
        title={screenshot
          ? "Avatar from a supplied game screenshot. Not automatically synchronized."
          : "Player avatar unavailable through the public Clash Royale API."}>
        {screenshot
          ? <img src={screenshot}
              alt={playerName + "'s Supercell ID avatar (screenshot snapshot)"}
              width={96} height={96} loading="eager" />
          : <UserRound size={26} aria-label="Player avatar unavailable" />}
      </div>
    </div>
  );
}
