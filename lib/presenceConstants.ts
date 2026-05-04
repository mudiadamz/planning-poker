// Shared timing constants for presence (heartbeat / cleanup / soft-leave).
// Kept in a plain (non-"use client") module so server routes can import it
// without dragging client-only modules (zustand, react hooks, etc.) into
// the server bundle.

/** Players whose `last_seen` is older than this are considered stale and
 *  swept by the periodic cleanup. Generous on purpose so users that
 *  briefly background the tab don't get auto-kicked. */
export const STALE_AFTER_SECONDS = 15 * 60;
