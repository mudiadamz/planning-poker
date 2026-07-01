import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_RECONNECT_MIN_INTERVAL_MS,
  RealtimeReconnector,
  channelNeedsResubscribe,
  installRealtimeReconnect,
} from "./realtimeReconnect";

/**
 * Regression tests for the "must reload after the tab was inactive" bug.
 *
 * The room page's Supabase realtime channel dies when the tab is backgrounded
 * (the browser/server drop the WebSocket) and supabase-js does not transparently
 * resubscribe. Before the fix, returning to the tab left the room frozen until a
 * manual reload. These tests pin the wake-up-and-resubscribe behaviour that
 * replaces that reload.
 */

describe("channelNeedsResubscribe", () => {
  it("treats joined / joining channels as healthy", () => {
    expect(channelNeedsResubscribe("joined")).toBe(false);
    expect(channelNeedsResubscribe("joining")).toBe(false);
  });

  it("treats dead channel states as needing a resubscribe", () => {
    expect(channelNeedsResubscribe("closed")).toBe(true);
    expect(channelNeedsResubscribe("errored")).toBe(true);
    expect(channelNeedsResubscribe("leaving")).toBe(true);
  });

  it("treats a missing channel (null/undefined) as needing a resubscribe", () => {
    expect(channelNeedsResubscribe(null)).toBe(true);
    expect(channelNeedsResubscribe(undefined)).toBe(true);
  });
});

describe("RealtimeReconnector", () => {
  it("does NOT reconnect while the channel is healthy (unforced poll path)", () => {
    const reconnect = vi.fn();
    const r = new RealtimeReconnector({
      getState: () => "joined",
      reconnect,
    });
    expect(r.check()).toBe(false);
    expect(reconnect).not.toHaveBeenCalled();
  });

  it("FORCE reconnects even when the channel claims to be healthy (mobile zombie socket)", () => {
    const reconnect = vi.fn();
    const r = new RealtimeReconnector({
      getState: () => "joined", // the socket lies after a mobile resume
      reconnect,
    });
    expect(r.check(true)).toBe(true);
    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  it("still throttles forced reconnects", () => {
    const reconnect = vi.fn();
    let clock = 0;
    const r = new RealtimeReconnector({
      getState: () => "joined",
      reconnect,
      now: () => clock,
      minIntervalMs: 5_000,
    });
    expect(r.check(true)).toBe(true);
    clock += 1_000;
    expect(r.check(true)).toBe(false); // inside the throttle window
    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  it("reconnects when the channel is dead (the inactive-tab case)", () => {
    const reconnect = vi.fn();
    const r = new RealtimeReconnector({
      getState: () => "closed",
      reconnect,
    });
    expect(r.check()).toBe(true);
    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  it("reconnects when there is no channel yet", () => {
    const reconnect = vi.fn();
    const r = new RealtimeReconnector({ getState: () => null, reconnect });
    expect(r.check()).toBe(true);
    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  it("throttles a burst of checks into a single reconnect", () => {
    const reconnect = vi.fn();
    let clock = 1_000;
    const r = new RealtimeReconnector({
      getState: () => "errored",
      reconnect,
      now: () => clock,
      minIntervalMs: 5_000,
    });

    // A flurry of focus/visibility/online events firing in quick succession.
    expect(r.check()).toBe(true);
    clock += 100;
    expect(r.check()).toBe(false);
    clock += 4_000; // still inside the 5s window
    expect(r.check()).toBe(false);
    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  it("allows another reconnect once the throttle window passes", () => {
    const reconnect = vi.fn();
    let clock = 1_000;
    const r = new RealtimeReconnector({
      getState: () => "closed",
      reconnect,
      now: () => clock,
      minIntervalMs: 5_000,
    });

    expect(r.check()).toBe(true);
    clock += 5_001;
    expect(r.check()).toBe(true);
    expect(reconnect).toHaveBeenCalledTimes(2);
  });

  it("defaults to a sensible throttle window", () => {
    expect(DEFAULT_RECONNECT_MIN_INTERVAL_MS).toBeGreaterThanOrEqual(1_000);
  });
});

describe("installRealtimeReconnect (DOM wiring)", () => {
  let cleanup: (() => void) | null = null;

  afterEach(() => {
    cleanup?.();
    cleanup = null;
    vi.restoreAllMocks();
  });

  function setVisibility(state: "visible" | "hidden") {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => state,
    });
  }

  it("resubscribes when a backgrounded tab becomes visible with a dead channel", () => {
    const reconnect = vi.fn();
    let channelState = "joined";
    cleanup = installRealtimeReconnect({
      getState: () => channelState,
      reconnect,
      isVisible: () => document.visibilityState === "visible",
    });

    // Tab goes to the background; the OS/server quietly kill the socket.
    setVisibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    channelState = "closed";

    // User flips back to the tab.
    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));

    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  it("refreshes when the tab becomes visible EVEN IF the channel claims healthy (mobile zombie socket)", () => {
    // The core mobile fix: after minimise/resume the socket is dead but
    // `channel.state` still says "joined", so a state-gated reconnect would
    // wrongly skip and leave the room frozen. The wake signal forces a refresh.
    const reconnect = vi.fn();
    cleanup = installRealtimeReconnect({
      getState: () => "joined",
      reconnect,
      isVisible: () => document.visibilityState === "visible",
    });

    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));

    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  it("does NOT refresh on visibilitychange when the tab went HIDDEN", () => {
    const reconnect = vi.fn();
    cleanup = installRealtimeReconnect({
      getState: () => "closed",
      reconnect,
      isVisible: () => document.visibilityState === "visible",
    });

    setVisibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));

    expect(reconnect).not.toHaveBeenCalled();
  });

  it("refreshes on a bfcache restore (pageshow persisted) — the mobile resume path", () => {
    const reconnect = vi.fn();
    cleanup = installRealtimeReconnect({
      getState: () => "joined",
      reconnect,
    });

    const evt = new Event("pageshow") as PageTransitionEvent;
    Object.defineProperty(evt, "persisted", { value: true });
    window.dispatchEvent(evt);

    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  it("ignores a non-persisted pageshow (an ordinary page load)", () => {
    const reconnect = vi.fn();
    cleanup = installRealtimeReconnect({
      getState: () => "joined",
      reconnect,
    });

    const evt = new Event("pageshow") as PageTransitionEvent;
    Object.defineProperty(evt, "persisted", { value: false });
    window.dispatchEvent(evt);

    expect(reconnect).not.toHaveBeenCalled();
  });

  it("reconnects on a network `online` event when the channel is dead", () => {
    const reconnect = vi.fn();
    cleanup = installRealtimeReconnect({
      getState: () => "errored",
      reconnect,
    });

    window.dispatchEvent(new Event("online"));

    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  it("reconnects on window `focus` when the channel is dead", () => {
    const reconnect = vi.fn();
    cleanup = installRealtimeReconnect({
      getState: () => "closed",
      reconnect,
    });

    window.dispatchEvent(new Event("focus"));

    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  it("runs a safety-net poll that reconnects a silently-dead socket", () => {
    vi.useFakeTimers();
    try {
      const reconnect = vi.fn();
      let channelState = "joined";
      setVisibility("visible");
      cleanup = installRealtimeReconnect({
        getState: () => channelState,
        reconnect,
        pollMs: 1_000,
        isVisible: () => document.visibilityState === "visible",
      });

      vi.advanceTimersByTime(1_000);
      expect(reconnect).not.toHaveBeenCalled(); // healthy → no-op

      channelState = "closed";
      vi.advanceTimersByTime(1_000);
      expect(reconnect).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("removes every listener and timer on cleanup", () => {
    vi.useFakeTimers();
    try {
      const reconnect = vi.fn();
      setVisibility("visible");
      const dispose = installRealtimeReconnect({
        getState: () => "closed",
        reconnect,
        pollMs: 1_000,
        isVisible: () => document.visibilityState === "visible",
      });
      dispose();

      window.dispatchEvent(new Event("online"));
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
      const ps = new Event("pageshow") as PageTransitionEvent;
      Object.defineProperty(ps, "persisted", { value: true });
      window.dispatchEvent(ps);
      vi.advanceTimersByTime(5_000);

      expect(reconnect).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
