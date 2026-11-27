export function formatBattleMode(mode: string, isTwoVTwo = false): string {
  const value = mode.trim();
  if (isTwoVTwo || /^(teamvsteam|2v2(?:\s+match)?)$/i.test(value)) {
    return "2v2 Match";
  }

  const readable = value
    .replace(/_/g, " ")
    .replace(/(\d+)x(?=[A-Z])/g, "$1× ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  return readable.replace(/(^|\s)([a-z])/g, (_match, space: string, letter: string) =>
    space + letter.toUpperCase()
  );
}

export function formatBattleDate(value: string): string {
  const dateOnly = value.slice(0, 10);
  const date = new Date(dateOnly + "T12:00:00Z");
  if (Number.isNaN(date.getTime())) return dateOnly || value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
