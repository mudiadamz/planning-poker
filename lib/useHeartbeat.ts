"use client";

import { useEffect } from "react";

import { getSupabase } from "./supabase";
import { STALE_AFTER_SECONDS } from "./presenceConstants";

export { STALE_AFTER_SECONDS };

// Heartbeat tuning. We deliberately keep users "active" for a long time so
// people don't get auto-kicked just because they switched browser tabs to a
// meeting / docs / Slack for a few minutes. Browsers throttle setInterval on
// hidden tabs anyway, so even a generous interval is cheap.
const HEARTBEAT_INTERVAL_MS = 30_000;
// Cleanup runs more aggressively than the heartbeat because the close-tab
// "soft leave" flow (see /api/leave) deliberately backdates `last_seen` so
// that a real close becomes stale within ~10s. We want the sweep to pick
// those up promptly so seats don't linger as ghosts.
const CLEANUP_INTERVAL_MS = 10_000;

/**
 * Periodically refresh `last_seen` for the local player so other clients can
 * detect them as online. Pings even when the tab is hidden (subject to the
 * browser's background throttling) so backgrounded tabs stay alive longer.
 *
 * Returns nothing - side-effect only.
 */
export function useHeartbeat(playerId: string | null, roomId: string | null) {
  useEffect(() => {
    if (!playerId || !roomId) return;

    const supabase = getSupabase();
    let cancelled = false;

    async function ping() {
      if (cancelled) return;
      try {
        await supabase
          .from("players")
          .update({ last_seen: new Date().toISOString() })
          .eq("id", playerId)
          .eq("room_id", roomId);
      } catch (err) {
        console.error("heartbeat failed", err);
      }
    }

    void ping();
    const id = window.setInterval(() => {
      void ping();
    }, HEARTBEAT_INTERVAL_MS);

    // Always re-ping the moment the tab becomes visible again, so a user
    // returning from a long context-switch is immediately "fresh" without
    // having to wait for the next interval tick.
    function onVisible() {
      if (document.visibilityState === "visible") void ping();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [playerId, roomId]);
}

/**
 * Server-cleanup helper: removes player rows in the given room whose
 * `last_seen` is older than `staleSeconds`. Called once on mount of the room
 * page so abandoned tabs don't litter the seats.
 */
export async function cleanupStalePlayers(
  roomId: string,
  staleSeconds = STALE_AFTER_SECONDS,
): Promise<void> {
  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - staleSeconds * 1000).toISOString();
  await supabase
    .from("players")
    .delete()
    .eq("room_id", roomId)
    .lt("last_seen", cutoff);
}

/**
 * Periodic cleanup loop. Every CLEANUP_INTERVAL_MS any client in the room
 * sweeps players whose last_seen is older than STALE_AFTER_SECONDS — so
 * truly disconnected players (closed laptop, lost wifi, etc.) eventually
 * disappear from the table for everyone, while users who briefly background
 * the tab stay seated.
 */
export function useStalePlayerCleanup(roomId: string | null) {
  useEffect(() => {
    if (!roomId) return;
    const id = window.setInterval(() => {
      void cleanupStalePlayers(roomId).catch(() => {});
    }, CLEANUP_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [roomId]);
}
