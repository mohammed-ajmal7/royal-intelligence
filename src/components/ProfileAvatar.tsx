type Props = { playerTag: string; playerName: string };

/** Shared Clash Royale King portrait used consistently for every player profile. */
export const CLASH_ROYALE_KING_AVATAR =
  "https://clashroyale.inbox.supercell.com/9jtsgmsiuthj/4y08ldhCwzyvwFtI6WF7Xl/b3d1badaccadd8bd722de304fcdf6a90/king2.png";

export function ProfileAvatar({ playerTag, playerName }: Props) {
  return (
    <div
      className="ri-profile-avatar-wrap"
      title={playerName + " · " + playerTag}
      aria-label={playerName + " profile portrait"}
    >
      <img
        className="ri-profile-avatar"
        src={CLASH_ROYALE_KING_AVATAR}
        alt="Clash Royale King"
        width={96}
        height={96}
        loading="eager"
        decoding="async"
      />
    </div>
  );
}
