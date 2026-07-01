"use client";

import { useEffect, useRef } from "react";

/**
 * Realtime reconnection on tab wake-up.
 *
 * THE BUG THIS FIXES: Supabase Realtime rides a single WebSocket. When a tab
 * is backgrounded for a while, the browser suspends timers and the OS/browser
 * (or the server's heartbeat timeout) tears the socket down. supabase-js does
 * NOT transparently resubscribe an already-joined `RealtimeChannel` once that
 * happens — the channel just sits in a `closed` / `errored` state. So when the
 * user flips back to the tab, postgres_changes + broadcast events have silently
 * stopped arriving and the room looks frozen until they manually reload.
 *
 * THE FIX: watch for the moments a dropped socket would become noticeable —
 * the tab becoming visible again, the window regaining focus, the network
 * coming back `online`, plus a slow safety poll — and, IF the channel is in a
 * dead state, tear it down and resubscribe (and re-fetch state to reconcile
 * anything missed while we were disconnected). A healthy ("joined"/"joining")
 * channel is left untouched, and attempts are throttled so a flurry of
 * focus/visibility/online events can't trigger a reconnect storm.
 */

/**
 * The values `RealtimeChannel.state` can hold. A healthy, subscribed channel
 * is `"joined"`; `"joining"` means a (re)subscribe is already in flight.
 * Everything else means we are NOT receiving realtime events.
 */
export type RealtimeChannelState =
  | "closed"
  | "errored"
  | "joined"
  | "joining"
  | "leaving";

const HEALTHY_STATES: ReadonlySet<string> = new Set(["joined", "joining"]);

/** Default throttle between reconnect attempts. */
export const DEFAULT_RECONNECT_MIN_INTERVAL_MS = 5_000;
/** Default safety-net poll interval (covers the case where no DOM event fires
 *  but the socket is dead — e.g. a long-lived foreground tab on flaky wifi). */
export const DEFAULT_RECONNECT_POLL_MS = 15_000;

/**
 * True when a channel in `state` is dead and should be torn down + resubscribed.
 * A missing state (`null`/`undefined` — no channel yet) also counts as needing
 * a (re)subscribe.
 */
export function channelNeedsResubscribe(
  state: string | null | undefined,
): boolean {
  if (!state) return true;
  return !HEALTHY_STATES.has(state);
}

export interface ReconnectorOptions {
  /** Current channel state, or `null` when there is no channel. */
  getState: () => string | null | undefined;
  /** Tear down the dead channel, build a fresh one, and re-fetch state. */
  reconnect: () => void;
  /** Monotonic clock in ms; injectable for tests. Defaults to `Date.now`. */
  now?: () => number;
  /** Minimum gap between reconnect attempts (ms). */
  minIntervalMs?: number;
}

/**
 * Decides — and, when warranted, triggers — a realtime reconnect. Pure of any
 * DOM wiring so it can be unit-tested directly: every `check()` consults the
 * live channel state and a throttle clock, and only fires `reconnect()` when
 * the channel is actually dead and we're outside the throttle window.
 */
export class RealtimeReconnector {
  private readonly getState: () => string | null | undefined;
  private readonly reconnect: () => void;
  private readonly now: () => number;
  private readonly minIntervalMs: number;
  private lastAttempt = Number.NEGATIVE_INFINITY;

  constructor(opts: ReconnectorOptions) {
    this.getState = opts.getState;
    this.reconnect = opts.reconnect;
    this.now = opts.now ?? Date.now;
    this.minIntervalMs =
      opts.minIntervalMs ?? DEFAULT_RECONNECT_MIN_INTERVAL_MS;
  }

  /**
   * Maybe fire a reconnect, subject to the throttle window. Returns `true`
   * when one was triggered.
   *
   * `force` exists because of mobile: when an app is minimised the OS suspends
   * the tab and the WebSocket is severed WITHOUT the frozen JS ever processing
   * a close event, so on resume `channel.state` still lies "joined". A wake
   * signal (tab visible again / bfcache restore / focus / network back) must
   * therefore refresh UNCONDITIONALLY — we cannot trust the reported state.
   * The unforced path (the periodic safety poll) still gates on a dead state
   * so an idle foreground tab doesn't churn.
   */
  check(force = false): boolean {
    if (!force && !channelNeedsResubscribe(this.getState())) return false;
    const t = this.now();
    if (t - this.lastAttempt < this.minIntervalMs) return false;
    this.lastAttempt = t;
    this.reconnect();
    return true;
  }
}

export interface InstallReconnectOptions extends ReconnectorOptions {
  /** Safety-net poll interval (ms). */
  pollMs?: number;
  /** Whether the tab is currently visible. Defaults to reading
   *  `document.visibilityState`. Injectable for tests. */
  isVisible?: () => boolean;
}

/**
 * Wire a {@link RealtimeReconnector} to the browser signals that reveal a
 * dropped socket: `visibilitychange` (tab wake), window `focus`, network
 * `online`, and a periodic safety poll. Returns a cleanup function that
 * removes every listener / timer. Framework-agnostic so it can be exercised in
 * a plain jsdom test by dispatching the corresponding events.
 */
export function installRealtimeReconnect(
  opts: InstallReconnectOptions,
): () => void {
  const reconnector = new RealtimeReconnector(opts);
  const pollMs = opts.pollMs ?? DEFAULT_RECONNECT_POLL_MS;
  const isVisible =
    opts.isVisible ??
    (() =>
      typeof document === "undefined" ||
      document.visibilityState === "visible");

  // Wake signals → FORCE a refresh (state may be silently stale even though the
  // channel claims to be healthy — see RealtimeReconnector.check). The periodic
  // poll stays unforced so an idle foreground tab doesn't needlessly churn.
  const onVisibility = () => {
    if (isVisible()) reconnector.check(true);
  };
  const onFocusOrOnline = () => {
    reconnector.check(true);
  };
  // `pageshow` is the reliable mobile signal: returning to a backgrounded PWA /
  // browser tab restores it from the bfcache and fires this with
  // `persisted === true`. A non-persisted pageshow is just a normal page load
  // (already covered by the initial fetch), so we ignore it to avoid a
  // redundant refresh and an unwanted round-counter bump on first paint.
  const onPageShow = (e: Event) => {
    if ((e as PageTransitionEvent).persisted) reconnector.check(true);
  };
  const onPoll = () => {
    if (isVisible()) reconnector.check();
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("focus", onFocusOrOnline);
  window.addEventListener("online", onFocusOrOnline);
  window.addEventListener("pageshow", onPageShow);
  const pollId = window.setInterval(onPoll, pollMs);

  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("focus", onFocusOrOnline);
    window.removeEventListener("online", onFocusOrOnline);
    window.removeEventListener("pageshow", onPageShow);
    window.clearInterval(pollId);
  };
}

export interface UseRealtimeReconnectOptions {
  /** Disable wiring entirely (e.g. before the channel exists). */
  enabled: boolean;
  /** Read the current channel state. */
  getState: () => string | null | undefined;
  /** Tear down + recreate the channel and re-fetch state. */
  reconnect: () => void;
  minIntervalMs?: number;
  pollMs?: number;
}

/**
 * React wrapper around {@link installRealtimeReconnect}. Latest callbacks are
 * held in refs so the listeners are installed once per `enabled` toggle rather
 * than re-installed on every render.
 */
export function useRealtimeReconnect(opts: UseRealtimeReconnectOptions): void {
  const { enabled, minIntervalMs, pollMs } = opts;
  const getStateRef = useRef(opts.getState);
  const reconnectRef = useRef(opts.reconnect);
  getStateRef.current = opts.getState;
  reconnectRef.current = opts.reconnect;

  useEffect(() => {
    if (!enabled) return;
    return installRealtimeReconnect({
      getState: () => getStateRef.current(),
      reconnect: () => reconnectRef.current(),
      minIntervalMs,
      pollMs,
    });
  }, [enabled, minIntervalMs, pollMs]);
}
