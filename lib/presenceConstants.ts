// Shared timing constants for presence (heartbeat / cleanup / soft-leave).
// Kept in a plain (non-"use client") module so server routes can import it
// without dragging client-only modules (zustand, react hooks, etc.) into
// the server bundle.

/** Players whose `last_seen` is older than this are considered stale and
 *  swept by the periodic cleanup. Generous on purpose so users that
 *  background the tab (meetings, Slack, etc.) don't get auto-kicked when
 *  the browser throttles heartbeats. Tab close still accelerates removal
 *  via the soft-leave beacon (~10s). */
export const STALE_AFTER_SECONDS = 60 * 60;

/** If our player row vanishes but we heartbeated within this window,
 *  treat it as a cleanup race / network blip and auto-rejoin instead of
 *  showing the inactive dialog. */
export const HEARTBEAT_REJOIN_GRACE_SECONDS = 3 * 60;

/** Tighter threshold used when a fresh visitor first lands on a room
 *  page. Heartbeats fire every 30s and even hidden/backgrounded tabs
 *  ping at most ~60s (browser timer throttle), so anything older than
 *  this is almost certainly a frozen / closed tab — i.e. a ghost.
 *  Run as a one-shot sweep on mount so a long-abandoned room is fresh
 *  the moment a real user opens the link. */
export const JOIN_STALE_AFTER_SECONDS = 90;

/** Hard floor on any caller-supplied stale threshold for the server
 *  cleanup route. Prevents a buggy or malicious client from passing
 *  a tiny window and nuking active players (heartbeat is 30s, so
 *  60s leaves a healthy 2x margin). */
export const MIN_STALE_AFTER_SECONDS = 60;
