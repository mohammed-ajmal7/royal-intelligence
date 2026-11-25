/** Original Royaleon SVG pictograms; not extracted or official Supercell art. */
export function statIconPath(label: string): string | null {
  const key = label.trim().toLowerCase().replace(/[_-]+/g," ").replace(/\s+/g," ");
  let asset: string | null = null;
  if (/shield/.test(key) && /(hp|hit ?points|health)/.test(key)) asset="shield";
  else if (/\b(hit ?points|hp|health)\b/.test(key)) asset="hitpoints";
  else if (/damage\s*\/\s*sec|damage per second|\bdps\b/.test(key)) asset="damage-per-second";
  else if (/\bdamage\b/.test(key)) asset="damage";
  else if (/\b(hit speed|attack speed|first hit|attack interval)\b/.test(key)) asset="hit-speed";
  else if (/\btarget(s|ing)?\b/.test(key)) asset="targets";
  else if (/\bmovement speed\b|^speed$|^move speed$/.test(key)) asset="speed";
  else if (/\brange\b/.test(key)) asset="range";
  else if (/\b(radius|splash radius)\b/.test(key)) asset="radius";
  else if (/\b(count|unit count|troop count|spawn count)\b/.test(key)) asset="count";
  else if (/\b(deploy time|spawn delay|deploy delay|lifetime)\b/.test(key)) asset="deploy-time";
  else if (/\bcycles?\b/.test(key)) asset="cycles";
  else if (/\bstar level(s)?\b/.test(key)) asset="star-level";
  else if (/\bevolution\b/.test(key)) asset="evolution";
  else if (/\bhero\b/.test(key)) asset="hero";
  else if (/\barena\b/.test(key)) asset="arena";
  return asset ? "/game-icons/stats/" + asset + ".svg" : null;
}

export function elixirAsset(cost: number | null | undefined): string | null {
  return Number.isInteger(cost) && cost != null && cost >= 1 && cost <= 10
    ? "/game-icons/elixir/" + cost + ".svg"
    : null;
}

/** Only range and radius values have units of tiles, not Ranged Damage. */
export function statValueWithUnit(value: string, label: string): string {
  const trimmed = value.trim();
  if (/\b(range|radius)\b/i.test(label)
    && /^\d+(?:\.\d+)?(?:\s*[–-]\s*\d+(?:\.\d+)?)?$/.test(trimmed))
    return trimmed + " tiles";
  return trimmed.replace(/(\d)sec$/i,"$1 s");
}
