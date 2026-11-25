/**
 * Public Clash Royale profile responses expose player badge and favorite-card
 * artwork, but not a Supercell ID avatar URL. Only use official image hosts.
 * Never mistake a battle banner/badge for the user's Supercell ID picture.
 */
export type ProfileArtwork = {
  src: string;
  alt: string;
  kind: "profile-icon" | "badge" | "favorite-card";
};

function record(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown> : {};
}

function officialAsset(input: unknown): string | null {
  if (typeof input !== "string") return null;
  try {
    const url = new URL(input);
    if (url.protocol !== "https:") return null;
    if (!["api-assets.clashroyale.com", "cdn.supercell.com"].includes(url.hostname))
      return null;
    return url.href;
  } catch {
    return null;
  }
}

function icon(input: unknown): string | null {
  const item = record(input);
  const urls = record(item.iconUrls);
  for (const candidate of [urls.large, urls.medium, item.iconUrl, item.imageUrl]) {
    const src = officialAsset(candidate);
    if (src) return src;
  }
  return null;
}

export function profileArtwork(rawPlayer: unknown): ProfileArtwork | null {
  const player = record(rawPlayer);
  // Optional future API field: use it when Supercell actually supplies it.
  for (const value of [player.profileIcon, player.avatar]) {
    const src = icon(value);
    if (src) return { src, alt: "Official Clash Royale profile icon", kind: "profile-icon" };
  }
  const badges = Array.isArray(player.badges) ? player.badges : [];
  for (const badge of badges) {
    const src = icon(badge);
    if (src) return {
      src,
      alt: "Clash Royale player badge" +
        (typeof record(badge).name === "string" ? ": " + record(badge).name : ""),
      kind: "badge",
    };
  }
  const favorite = player.currentFavouriteCard;
  const src = icon(favorite);
  if (src) {
    const name = record(favorite).name;
    return {
      src,
      alt: "Favorite Clash Royale card" +
        (typeof name === "string" ? ": " + name : ""),
      kind: "favorite-card",
    };
  }
  return null;
}
