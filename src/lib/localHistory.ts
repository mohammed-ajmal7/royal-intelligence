import type { Battle, Snapshot } from "./model";

export type TrackedChoice = {
  id: string;
  observed: string;
  cards: number[];
  mode: string;
  score: number;
};
export type PlayerHistory = {
  snapshots: Snapshot[];
  battles: Battle[];
  choices: TrackedChoice[];
};
export const emptyHistory = (): PlayerHistory => ({
  snapshots: [],
  battles: [],
  choices: [],
});
const storageKey = (playerTag: string) =>
  "ri-player-history-v1:" + playerTag.replace(/^#/, "").toUpperCase();

// Never put private app credentials or an entire API profile into local storage.
// Historical snapshots keep only the fields needed for the trophy trend.
function compact(s: Snapshot): Snapshot {
  return {
    ...s,
    cards: [],
    catalog: [],
    deck: [],
    towers: [],
    battles: [],
    chests: [],
    raw: null,
    warnings: [],
  };
}
export function mergeHistory(
  first: PlayerHistory,
  second: PlayerHistory,
): PlayerHistory {
  const snapshots = new Map<string, Snapshot>();
  for (const s of [...first.snapshots, ...second.snapshots]) {
    if (s?.mode === "live" && typeof s.fetchedAt === "string")
      snapshots.set(s.fetchedAt, compact(s));
  }
  const battles = new Map<string, Battle>();
  for (const b of [...first.battles, ...second.battles]) {
    if (b && typeof b.id === "string" && typeof b.time === "string")
      battles.set(b.id, b);
  }
  const choices = new Map<string, TrackedChoice>();
  for (const c of [...first.choices, ...second.choices]) {
    if (c && typeof c.id === "string" && Array.isArray(c.cards))
      choices.set(c.id, c);
  }
  return {
    snapshots: [...snapshots.values()]
      .sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt))
      .slice(0, 90),
    battles: [...battles.values()]
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, 200),
    choices: [...choices.values()]
      .sort((a, b) => b.observed.localeCompare(a.observed))
      .slice(0, 100),
  };
}
export function withSnapshot(
  history: PlayerHistory,
  snapshot: Snapshot,
): PlayerHistory {
  return mergeHistory(history, {
    snapshots: snapshot.mode === "live" ? [snapshot] : [],
    battles: snapshot.mode === "live" ? snapshot.battles : [],
    choices: [],
  });
}
export function readLocalHistory(playerTag: string): PlayerHistory {
  try {
    const raw = localStorage.getItem(storageKey(playerTag));
    if (!raw) return emptyHistory();
    const stored: unknown = JSON.parse(raw);
    if (!stored || typeof stored !== "object") return emptyHistory();
    const value = stored as Record<string, unknown>;
    if (value.version !== 1 ||
      value.tag !== playerTag.replace(/^#/, "").toUpperCase())
      return emptyHistory();
    const data = value.data as Partial<PlayerHistory> | undefined;
    return mergeHistory(emptyHistory(), {
      snapshots: Array.isArray(data?.snapshots) ? data.snapshots : [],
      battles: Array.isArray(data?.battles) ? data.battles : [],
      choices: Array.isArray(data?.choices) ? data.choices : [],
    });
  } catch {
    return emptyHistory();
  }
}
export function writeLocalHistory(
  playerTag: string,
  history: PlayerHistory,
): boolean {
  const key = storageKey(playerTag);
  const tag = playerTag.replace(/^#/, "").toUpperCase();
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ version: 1, tag, data: mergeHistory(emptyHistory(), history) }),
    );
    return true;
  } catch {
    // Quota or private browsing: retry with fewer historical records.
    try {
      const small = {
        snapshots: history.snapshots.slice(0, 15),
        battles: history.battles.slice(0, 60),
        choices: history.choices.slice(0, 30),
      };
      localStorage.setItem(key, JSON.stringify({
        version: 1,
        tag,
        data: mergeHistory(emptyHistory(), small),
      }));
      return true;
    } catch {
      return false;
    }
  }
}
export function clearLocalHistory(playerTag: string): boolean {
  try {
    localStorage.removeItem(storageKey(playerTag));
    return true;
  } catch {
    return false;
  }
}
