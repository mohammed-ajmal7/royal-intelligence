import { rolesFor, type Card, type Snapshot } from "./model";

export const ROLE_VERSION = "2026-11-16.1";
export type RankedDeck = {
  rank: number; tag: string; name: string; rating: number | null;
  battleTime: string; fetchedAt: string; cards: Card[]; towerNames: string[];
};
export type Usage = {
  id: number; name: string; count: number; roles: string[];
  forms: Record<string, number>;
};
export type RoleUsage = {
  role: string; decks: number; slots: number;
  cards: { id: number; name: string; count: number }[];
};
export type LiveMeta = {
  id: string; startedAt: string; leaderboardAt: string; completedAt: string;
  source: string; sampleSize: 100; roleVersion: string;
  players: RankedDeck[]; usage: Usage[]; roleUsage: RoleUsage[];
  warnings: string[];
};
export type LabProgress = { stage: 1 | 2 | 3 | 4; completed: number; total: number; message: string };
export type LabEvent =
  | { type: "progress"; progress: LabProgress }
  | { type: "complete"; meta: LiveMeta; player: Snapshot }
  | { type: "error"; error: string; failed?: { rank: number; name: string; reason: string }[] };

/** Each ranked ACCOUNT contributes one deck, including duplicate deck compositions.
 * Base-card counts combine forms; forms are also counted separately. Role deck
 * coverage is a union, so a role is counted once per deck, never once per tag.
 */
export function countRankedDecks(players: RankedDeck[]) {
  const cards = new Map<number, Usage>();
  const roles = new Map<string, RoleUsage>();
  for (const player of players) {
    const covered = new Set<string>();
    for (const card of player.cards) {
      const cardRoles = [...rolesFor(card.name)];
      if (card.name === "Tombstone" && card.active === "hero") cardRoles.push("Win condition");
      const current = cards.get(card.id) ?? { id: card.id, name: card.name,
        count: 0, roles: [], forms: {} };
      current.count++;
      current.roles = [...new Set([...current.roles, ...cardRoles])];
      current.forms[card.active] = (current.forms[card.active] ?? 0) + 1;
      cards.set(card.id, current);
      for (const role of cardRoles.length ? cardRoles : ["Unclassified"]) {
        const row = roles.get(role) ?? { role, decks: 0, slots: 0, cards: [] };
        row.slots++;
        const entry = row.cards.find(c => c.id === card.id);
        if (entry) entry.count++;
        else row.cards.push({ id: card.id, name: card.name, count: 1 });
        roles.set(role, row);
        covered.add(role);
      }
    }
    for (const role of covered) roles.get(role)!.decks++;
  }
  return {
    usage: [...cards.values()].sort((a,b) => b.count-a.count || a.id-b.id),
    roleUsage: [...roles.values()].map(row => ({ ...row,
      cards: row.cards.sort((a,b) => b.count-a.count || a.id-b.id),
    })).sort((a,b) => b.decks-a.decks || a.role.localeCompare(b.role)),
  };
}
