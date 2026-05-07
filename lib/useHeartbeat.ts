"use client";

import { useEffect } from "react";

import { getSupabase } from "./supabase";
import {
  JOIN_STALE_AFTER_SECONDS,
  STALE_AFTER_SECONDS,
} from "./presenceConstants";

export { JOIN_STALE_AFTER_SECONDS, STALE_AFTER_SECONDS };

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
 * Client-side stale-player sweep: removes player rows in the given
 * room whose `last_seen` is older than `staleSeconds`, using the
 * caller's anon Supabase client. Run periodically by every active
 * client in the room (see `useStalePlayerCleanup`).
 *
 * Errors are surfaced via `console.error` instead of being swallowed
 * — silent failure here is what allows ghost seats to persist for
 * hours / days when RLS or network misbehaves.
 */
export async function cleanupStalePlayers(
  roomId: string,
  staleSeconds = STALE_AFTER_SECONDS,
): Promise<number> {
  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - staleSeconds * 1000).toISOString();
  const { data, error } = await supabase
    .from("players")
    .delete()
    .eq("room_id", roomId)
    .lt("last_seen", cutoff)
    .select("id");
  if (error) {
    console.error("cleanupStalePlayers (client) failed", error);
    return 0;
  }
  return data?.length ?? 0;
}

/**
 * Server-side stale-player sweep via `/api/cleanup`. Uses the
 * service role on the server, so it bypasses RLS and any flaky anon
 * delete policy. Defaults to the tighter `JOIN_STALE_AFTER_SECONDS`
 * window — call this on room mount to evict ghosts the moment a real
 * visitor lands on the page.
 *
 * Returns the number of players deleted, or 0 on any failure (the
 * client-side periodic sweep will pick up the slack on the next
 * tick, so the room never gets stuck).
 */
export async function cleanupStalePlayersOnJoin(
  roomId: string,
  staleSeconds = JOIN_STALE_AFTER_SECONDS,
): Promise<number> {
  try {
    const res = await fetch("/api/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, staleSeconds }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        "cleanupStalePlayersOnJoin (server) failed",
        res.status,
        text,
      );
      return 0;
    }
    const json = (await res.json().catch(() => null)) as {
      deleted?: number;
    } | null;
    return json?.deleted ?? 0;
  } catch (err) {
    console.error("cleanupStalePlayersOnJoin (server) error", err);
    return 0;
  }
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
