"use client";

import { useEffect } from "react";

import { getSupabase } from "./supabase";

const HEARTBEAT_INTERVAL_MS = 10_000;
const CLEANUP_INTERVAL_MS = 20_000;
export const STALE_AFTER_SECONDS = 45;

/**
 * Periodically refresh `last_seen` for the local player so other clients can
 * detect them as online. Runs only while the tab is visible.
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
      if (document.visibilityState === "visible") {
        void ping();
      }
    }, HEARTBEAT_INTERVAL_MS);

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
 * Periodic cleanup loop. Every 20s any client in the room sweeps players
 * whose last_seen is older than 45s — so disconnected players (closed laptop,
 * lost wifi, etc.) automatically disappear from the table for everyone.
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
