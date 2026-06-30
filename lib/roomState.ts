import type { Room } from "./types";

/**
 * Pure helpers for reconciling the *room* (admin) state — the reveal flag and
 * the voting round — when events arrive, and when a rejoining client must
 * adopt the current state after a disconnect.
 *
 * REQUIREMENT THESE ENCODE: when a user disconnects and rejoins they must see
 * the current admin state (cards revealed, or a fresh round started while they
 * were away) and must NOT have a stale pre-disconnect vote resurrected into a
 * new round. The room row is the source of truth for `revealed`; the local
 * monotonic round counter decides whether a held vote is still valid.
 */

type RevealState = Pick<Room, "revealed">;

/** A reveal just happened: hidden → revealed. Drives the "reveal" cue. */
export function didRoundReveal(
  prev: RevealState | null,
  next: RevealState,
): boolean {
  return !!prev && !prev.revealed && next.revealed;
}

/**
 * A new voting round just started: revealed → hidden (the admin reset). This
 * clears everyone's vote server-side, so any vote we were holding to restore
 * on rejoin is now stale and must be dropped.
 */
export function didRoundReset(
  prev: RevealState | null,
  next: RevealState,
): boolean {
  return !!prev && prev.revealed && !next.revealed;
}

/**
 * Whether a rejoining player may carry their previous vote into the freshly
 * re-seated row. Safe ONLY when all hold:
 *   - we kept our stable per-room id (a brand-new id means a fresh seat),
 *   - the round has not advanced since we captured the vote (no reset seen),
 *   - we actually had a vote to restore.
 * A reconnect bumps the round counter on purpose (we may have MISSED a reset
 * while our socket was dead), which makes `sameRound` false here and so trusts
 * the server's current round instead of a possibly-stale local vote.
 */
export function shouldRestoreVote(opts: {
  hasExistingId: boolean;
  sameRound: boolean;
  vote: string | null;
}): boolean {
  return opts.hasExistingId && opts.sameRound && opts.vote != null;
}
