import type { Player } from "./types";

/**
 * Pure player-roster reconciliation, shared by the room page's realtime
 * handlers and its post-reconnect re-fetch. Kept side-effect free (no sounds,
 * no state) so the exact merge rules can be unit-tested in isolation.
 *
 * THE CONSISTENCY BUG THESE GUARD AGAINST: a client's realtime socket dies
 * while its tab is backgrounded. During that window other people join/leave,
 * and supabase-js does NOT replay the missed postgres_changes events on
 * reconnect. So incremental handlers alone leave every client with a
 * different, partial roster ("some users don't show"). Two defenses:
 *   1. UPDATE upserts (see `applyPlayerUpdate`) so a player whose INSERT we
 *      missed still appears the moment any later event about them arrives.
 *   2. A full re-fetch on reconnect goes through `reconcilePlayers`, which is
 *      authoritative and rebuilds the roster from scratch.
 */

/** Stable ordering used everywhere a roster is rebuilt, matching the initial
 *  SELECT's `order by joined_at asc`. Deterministic order means every client
 *  shows the same seats in the same places. */
export function sortPlayersByJoinedAt(players: Player[]): Player[] {
  return [...players].sort((a, b) => a.joined_at.localeCompare(b.joined_at));
}

/**
 * Apply an INSERT event. Adds the player if absent; returns the SAME array
 * reference when the id is already present (a duplicate/echoed event) so
 * callers can cheaply detect "nothing changed" via identity.
 */
export function applyPlayerInsert(prev: Player[], p: Player): Player[] {
  if (prev.some((x) => x.id === p.id)) return prev;
  return [...prev, p];
}

/**
 * Apply an UPDATE event as an UPSERT. If the player already exists we replace
 * their row; if NOT, we add them. The add path is the critical fix: without
 * it, an UPDATE for a player whose INSERT we missed (socket was dead) would be
 * dropped and that player would be invisible to this client forever.
 */
export function applyPlayerUpdate(prev: Player[], p: Player): Player[] {
  if (!prev.some((x) => x.id === p.id)) return [...prev, p];
  return prev.map((x) => (x.id === p.id ? p : x));
}

/**
 * Apply a DELETE (or broadcast-leave) event. Removes the player; returns the
 * SAME array reference when the id is not present so callers can skip the
 * "leave" sound for an already-gone player.
 */
export function applyPlayerDelete(prev: Player[], id: string): Player[] {
  if (!prev.some((x) => x.id === id)) return prev;
  return prev.filter((x) => x.id !== id);
}

/**
 * Authoritative reconcile after a full re-fetch (initial load or post-reconnect
 * silent reconcile). The fetched rows ARE the source of truth for who is
 * currently active, so we rebuild wholesale (and re-sort). This is what makes
 * the active-user count correct again after a disconnect/rejoin: ghosts that
 * left while we were away disappear, and players we never saw join show up.
 */
export function reconcilePlayers(fetched: Player[]): Player[] {
  return sortPlayersByJoinedAt(fetched);
}
