"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

import { getSupabase } from "@/lib/supabase";
import { useIdentity } from "@/lib/store";
import { DEFAULT_DECK } from "@/lib/decks";
import {
  cleanupStalePlayers,
  useHeartbeat,
  useStalePlayerCleanup,
} from "@/lib/useHeartbeat";
import type { Player, Room } from "@/lib/types";
import { JoinDialog } from "@/components/JoinDialog";
import { RoomControls } from "@/components/RoomControls";
import { PokerTable } from "@/components/PokerTable";
import { VoteDeck } from "@/components/VoteDeck";
import { Stats } from "@/components/Stats";
import { DeckPicker } from "@/components/DeckPicker";
import {
  EmojiBlastLayer,
  type EmojiFloater,
} from "@/components/EmojiBlastLayer";
import { playSound } from "@/lib/sounds";

type Params = Promise<{ roomId: string }>;

export default function RoomPage({ params }: { params: Params }) {
  const { roomId } = use(params);
  const router = useRouter();

  const { playerId, playerName, setIdentity, setName, clear } = useIdentity();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [floaters, setFloaters] = useState<EmojiFloater[]>([]);
  const [leaving, setLeaving] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const playerIdRef = useRef<string | null>(null);
  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);

  const spawnFloater = useCallback((emoji: string, from: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const x = 0.15 + Math.random() * 0.7; // 15%..85% of viewport width
    setFloaters((prev) => [...prev, { id, emoji, from, x }]);
    window.setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => f.id !== id));
    }, 3100);
  }, []);

  // Initial load: room + players, plus stale cleanup.
  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabase();

    async function load() {
      setLoading(true);
      try {
        await cleanupStalePlayers(roomId).catch(() => {});

        const { data: roomData, error: roomErr } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", roomId)
          .maybeSingle();
        if (roomErr) throw roomErr;
        if (!roomData) {
          if (!cancelled) setNotFound(true);
          return;
        }

        const { data: playerData, error: playerErr } = await supabase
          .from("players")
          .select("*")
          .eq("room_id", roomId)
          .order("joined_at", { ascending: true });
        if (playerErr) throw playerErr;

        if (!cancelled) {
          setRoom(roomData);
          setPlayers(playerData ?? []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load room.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // Realtime subscription
  useEffect(() => {
    if (!room) return;
    const supabase = getSupabase();

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setNotFound(true);
            return;
          }
          const next = payload.new as Room;
          setRoom((prev) => {
            if (prev) {
              if (!prev.revealed && next.revealed) playSound("reveal");
              else if (prev.revealed && !next.revealed) playSound("reset");
            }
            return next;
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const p = payload.new as Player;
            setPlayers((prev) => {
              if (prev.some((x) => x.id === p.id)) return prev;
              if (p.id !== playerIdRef.current) playSound("join");
              return [...prev, p];
            });
          } else if (payload.eventType === "UPDATE") {
            const p = payload.new as Player;
            setPlayers((prev) =>
              prev.map((x) => (x.id === p.id ? p : x)),
            );
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as Player;
            setPlayers((prev) => {
              if (!prev.some((x) => x.id === old.id)) return prev;
              if (old.id !== playerIdRef.current) playSound("leave");
              return prev.filter((x) => x.id !== old.id);
            });
          }
        },
      )
      .on("broadcast", { event: "emoji" }, (msg) => {
        const payload = msg.payload as
          | { emoji?: string; from?: string }
          | undefined;
        if (!payload?.emoji) return;
        spawnFloater(payload.emoji, payload.from || "Anon");
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [room, roomId, spawnFloater]);

  // Verify our locally-stored player still exists in DB; if not, we were
  // either kicked by the owner or removed for being stale. Show a notice
  // and redirect home rather than the rejoin dialog.
  useEffect(() => {
    if (loading || !room || !playerId || leaving) return;
    const stillThere = players.some((p) => p.id === playerId);
    if (!stillThere && players.length > 0) {
      const timer = window.setTimeout(() => {
        const exists = players.some((p) => p.id === playerId);
        if (exists) return;
        setLeaving(true);
        clear();
        if (typeof window !== "undefined") {
          window.alert("Kamu dikeluarkan / disconnect dari room ini.");
        }
        router.push("/");
      }, 1500);
      return () => window.clearTimeout(timer);
    }
  }, [loading, room, players, playerId, leaving, clear, router]);

  useHeartbeat(playerId, roomId);
  useStalePlayerCleanup(playerId ? roomId : null);

  // Cleanup on tab close / unload
  useEffect(() => {
    if (!playerId) return;
    function onBeforeUnload() {
      const supabase = getSupabase();
      // Best-effort: don't await, browser may not finish.
      void supabase.from("players").delete().eq("id", playerId!);
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [playerId]);

  const me = useMemo(
    () => players.find((p) => p.id === playerId) ?? null,
    [players, playerId],
  );

  // Owner = pemain pertama yang join (joined_at paling awal). Jika owner
  // keluar, otomatis pindah ke pemain berikutnya (urutan berikutnya).
  const owner = useMemo(() => {
    if (players.length === 0) return null;
    return [...players].sort((a, b) =>
      a.joined_at.localeCompare(b.joined_at),
    )[0];
  }, [players]);

  const isOwner = !!owner && !!me && owner.id === me.id;

  const needsJoin = !loading && !notFound && room && !me && !leaving;

  const handleJoin = useCallback(
    async (name: string) => {
      const supabase = getSupabase();
      const { data, error: insertErr } = await supabase
        .from("players")
        .insert({
          room_id: roomId,
          name,
        })
        .select("*")
        .single();
      if (insertErr) throw insertErr;
      if (!data) throw new Error("Insert returned no row.");
      setIdentity(data.id, data.name);
      setPlayers((prev) =>
        prev.some((p) => p.id === data.id) ? prev : [...prev, data],
      );
    },
    [roomId, setIdentity],
  );

  const handleVote = useCallback(
    async (value: string) => {
      if (!playerId || !room || room.revealed) return;
      const supabase = getSupabase();
      playSound("pick");
      // Optimistic update
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, vote: value } : p,
        ),
      );
      const { error: err } = await supabase
        .from("players")
        .update({ vote: value, last_seen: new Date().toISOString() })
        .eq("id", playerId);
      if (err) {
        console.error(err);
        setError("Gagal mengirim vote.");
      }
    },
    [playerId, room],
  );

  const handleReveal = useCallback(async () => {
    if (!room || busy || !isOwner || !playerId) return;
    setBusy(true);
    try {
      const supabase = getSupabase();
      const { error: err } = await supabase.rpc("reveal_room", {
        p_room_id: room.id,
        p_player_id: playerId,
      });
      if (err) throw err;
    } catch (err) {
      console.error(err);
      setError("Gagal reveal kartu.");
    } finally {
      setBusy(false);
    }
  }, [room, busy, isOwner, playerId]);

  const handleReset = useCallback(async () => {
    if (!room || busy || !isOwner || !playerId) return;
    setBusy(true);
    try {
      const supabase = getSupabase();
      const { error: err } = await supabase.rpc("reset_room", {
        p_room_id: room.id,
        p_player_id: playerId,
      });
      if (err) throw err;
      // Optimistic local clear (realtime will reconcile)
      setPlayers((prev) => prev.map((p) => ({ ...p, vote: null })));
    } catch (err) {
      console.error(err);
      setError("Gagal mulai voting baru.");
    } finally {
      setBusy(false);
    }
  }, [room, busy, isOwner, playerId]);

  const handleDeckChange = useCallback(
    async (deck: string[]) => {
      if (!room || !isOwner || !playerId) return;
      const supabase = getSupabase();
      const { error: err } = await supabase.rpc("update_room_deck", {
        p_room_id: room.id,
        p_player_id: playerId,
        p_deck: deck,
      });
      if (err) {
        console.error(err);
        setError("Gagal mengubah deck.");
      }
    },
    [room, isOwner, playerId],
  );

  const handleEmoji = useCallback(
    (emoji: string) => {
      const channel = channelRef.current;
      const fromName = me?.name ?? playerName ?? "Anon";
      // Show locally immediately (Supabase broadcast does not echo to sender).
      spawnFloater(emoji, fromName);
      if (!channel) return;
      void channel.send({
        type: "broadcast",
        event: "emoji",
        payload: { emoji, from: fromName },
      });
    },
    [me, playerName, spawnFloater],
  );

  const handleKick = useCallback(
    async (targetId: string) => {
      if (!room || !isOwner || !playerId || targetId === playerId) return;
      const target = players.find((p) => p.id === targetId);
      if (!target) return;
      if (
        typeof window !== "undefined" &&
        !window.confirm(`Keluarkan ${target.name} dari room?`)
      ) {
        return;
      }
      const supabase = getSupabase();
      const { error: err } = await supabase.rpc("kick_player", {
        p_room_id: room.id,
        p_owner_id: playerId,
        p_target_id: targetId,
      });
      if (err) {
        console.error(err);
        setError("Gagal mengeluarkan pemain.");
      }
    },
    [room, isOwner, playerId, players],
  );

  const handleRename = useCallback(
    async (newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed || !playerId) return;
      if (trimmed === playerName) return;
      const supabase = getSupabase();
      // Optimistic update: local store + players list
      setName(trimmed);
      setPlayers((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, name: trimmed } : p)),
      );
      const { error: err } = await supabase
        .from("players")
        .update({ name: trimmed })
        .eq("id", playerId);
      if (err) {
        console.error(err);
        setError("Gagal mengubah nama.");
      }
    },
    [playerId, playerName, setName],
  );

  const handleLeave = useCallback(async () => {
    setLeaving(true);
    if (playerId) {
      const supabase = getSupabase();
      try {
        await supabase.from("players").delete().eq("id", playerId);
      } catch {
        // ignore — we are leaving anyway
      }
    }
    clear();
    router.push("/");
  }, [playerId, clear, router]);

  if (notFound) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold">Room tidak ditemukan</h1>
        <p className="text-slate-400">
          Room <span className="font-mono">{roomId}</span> tidak ada atau sudah
          dihapus.
        </p>
        <button
          onClick={() => router.push("/")}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-soft"
        >
          Kembali ke beranda
        </button>
      </main>
    );
  }

  if (loading || !room) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </main>
    );
  }

  const deck = Array.isArray(room.deck) && room.deck.length > 0
    ? room.deck
    : DEFAULT_DECK;

  return (
    <main className="flex min-h-screen flex-col">
      <RoomControls
        roomId={room.id}
        roomName={room.name}
        playerName={me?.name ?? playerName ?? ""}
        canRename={!!me}
        onRename={handleRename}
        canReact={!!me}
        onEmoji={handleEmoji}
        onLeave={handleLeave}
      />

      <div className="flex justify-end px-3 sm:px-6">
        <DeckPicker
          current={deck}
          disabled={busy || !isOwner}
          onChange={handleDeckChange}
        />
      </div>

      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-3 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:flex-row lg:items-center lg:justify-center lg:gap-8">
        <div className="flex w-full flex-1 items-center justify-center">
          <PokerTable
            room={room}
            players={players}
            meId={playerId}
            ownerId={owner?.id ?? null}
            isOwner={isOwner}
            onReveal={handleReveal}
            onReset={handleReset}
            onKick={handleKick}
            busy={busy}
          />
        </div>

        {room.revealed && (
          <aside className="w-full lg:w-80 lg:flex-shrink-0">
            <Stats players={players} revealed={room.revealed} />
          </aside>
        )}
      </section>

      <div className="border-t border-slate-800/60 bg-slate-950/60 px-3 py-4 sm:px-6">
        <VoteDeck
          deck={deck}
          selected={me?.vote ?? null}
          disabled={room.revealed}
          onPick={handleVote}
        />
      </div>

      {needsJoin && (
        <JoinDialog
          defaultName={playerName ?? ""}
          onJoin={handleJoin}
        />
      )}

      <EmojiBlastLayer floaters={floaters} />

      {error && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300 shadow-lg">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 text-red-200 hover:text-white"
          >
            ×
          </button>
        </div>
      )}
    </main>
  );
}
