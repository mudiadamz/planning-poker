"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Crown,
  ExternalLink,
  History,
  Loader2,
  Lock,
  LogOut,
  Megaphone,
  Pencil,
  RefreshCcw,
  ShieldCheck,
  Spade,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";

import { BroadcastComposer } from "@/components/BroadcastComposer";

type AdminPlayer = {
  id: string;
  name: string;
  vote: string | null;
  last_seen: string;
  joined_at: string;
  active: boolean;
};

type AdminRoom = {
  id: string;
  name: string | null;
  revealed: boolean;
  owner_id: string | null;
  effective_owner_id: string | null;
  created_at: string;
  players: AdminPlayer[];
  total_count: number;
  active_count: number;
};

type VotingRound = {
  id: string;
  room_id: string;
  room_name: string | null;
  deck: string[] | null;
  votes: Array<{ player_id: string; name: string; vote: string | null }>;
  vote_count: number;
  average: number | null;
  created_at: string;
};

type Mode =
  | { kind: "rooms" }
  | { kind: "history"; roomId: string; roomName: string | null };

const ROOMS_REFRESH_INTERVAL_MS = 10_000;

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>({ kind: "rooms" });

  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const [rounds, setRounds] = useState<VotingRound[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Inline action state, keyed by player or room id.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  // Composer state for the admin broadcast modal. Targets one room
  // at a time — picking a room from the list opens the modal scoped
  // to it.
  const [broadcastTarget, setBroadcastTarget] = useState<AdminRoom | null>(
    null,
  );
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  const fetchRooms = useCallback(async (silent = false) => {
    if (!silent) setRoomsLoading(true);
    setRoomsError(null);
    try {
      const res = await fetch("/api/admin/rooms", {
        method: "GET",
        credentials: "same-origin",
      });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Error" }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const body = (await res.json()) as { rooms: AdminRoom[] };
      setRooms(body.rooms);
      setAuthed(true);
    } catch (err) {
      console.error(err);
      setRoomsError(err instanceof Error ? err.message : "Gagal memuat rooms.");
    } finally {
      if (!silent) setRoomsLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (roomId: string) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const params = new URLSearchParams({ room_id: roomId });
      const res = await fetch(`/api/admin/history?${params.toString()}`, {
        method: "GET",
        credentials: "same-origin",
      });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Error" }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const body = (await res.json()) as { rounds: VotingRound[] };
      setRounds(body.rounds);
    } catch (err) {
      console.error(err);
      setHistoryError(
        err instanceof Error ? err.message : "Gagal memuat history.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRooms();
  }, [fetchRooms]);

  // Auto-refresh the rooms overview while it's the active view so
  // active counts stay roughly fresh without a manual click.
  useEffect(() => {
    if (mode.kind !== "rooms" || authed !== true) return;
    const id = window.setInterval(() => {
      void fetchRooms(true);
    }, ROOMS_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [mode.kind, authed, fetchRooms]);

  // When entering history mode, load that room's rounds.
  const lastFetchedHistoryFor = useRef<string | null>(null);
  useEffect(() => {
    if (mode.kind !== "history") {
      lastFetchedHistoryFor.current = null;
      return;
    }
    if (lastFetchedHistoryFor.current === mode.roomId) return;
    lastFetchedHistoryFor.current = mode.roomId;
    void fetchHistory(mode.roomId);
  }, [mode, fetchHistory]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Error" }));
        throw new Error(body.error || "Login gagal.");
      }
      setPassword("");
      await fetchRooms();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    setAuthed(false);
    setRooms([]);
    setRounds([]);
    setMode({ kind: "rooms" });
  }

  const setBusy = useCallback((key: string, v: boolean) => {
    setPending((prev) => {
      if (!v) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: true };
    });
  }, []);

  const handleTransfer = useCallback(
    async (room: AdminRoom, player: AdminPlayer) => {
      if (player.id === room.effective_owner_id) return;
      if (
        typeof window !== "undefined" &&
        !window.confirm(
          `Pindahkan kepemilikan room "${room.name ?? room.id}" ke ${player.name}?`,
        )
      ) {
        return;
      }
      const key = `transfer:${room.id}:${player.id}`;
      setBusy(key, true);
      setActionError(null);
      try {
        const res = await fetch("/api/admin/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            roomId: room.id,
            newOwnerId: player.id,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Error" }));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        await fetchRooms(true);
      } catch (err) {
        console.error(err);
        setActionError(
          err instanceof Error ? err.message : "Gagal transfer ownership.",
        );
      } finally {
        setBusy(key, false);
      }
    },
    [fetchRooms, setBusy],
  );

  const handleRename = useCallback(
    async (room: AdminRoom) => {
      if (typeof window === "undefined") return;
      const next = window.prompt(
        `Ganti nama untuk room "${room.id}":`,
        room.name ?? "",
      );
      if (next === null) return;
      const trimmed = next.trim();
      if (trimmed === (room.name ?? "")) return;
      const key = `rename:${room.id}`;
      setBusy(key, true);
      setActionError(null);
      try {
        const res = await fetch("/api/admin/rename-room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            roomId: room.id,
            name: trimmed.length > 0 ? trimmed : null,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Error" }));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        await fetchRooms(true);
      } catch (err) {
        console.error(err);
        setActionError(
          err instanceof Error ? err.message : "Gagal rename room.",
        );
      } finally {
        setBusy(key, false);
      }
    },
    [fetchRooms, setBusy],
  );

  const handleDelete = useCallback(
    async (room: AdminRoom) => {
      if (typeof window === "undefined") return;
      if (
        !window.confirm(
          `Hapus room "${room.name ?? room.id}"? Semua pemain di room ini akan diputus dan history voting tetap tersimpan, tapi room-nya hilang.`,
        )
      ) {
        return;
      }
      const key = `delete:${room.id}`;
      setBusy(key, true);
      setActionError(null);
      try {
        const res = await fetch("/api/admin/delete-room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ roomId: room.id }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Error" }));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        await fetchRooms(true);
      } catch (err) {
        console.error(err);
        setActionError(
          err instanceof Error ? err.message : "Gagal menghapus room.",
        );
      } finally {
        setBusy(key, false);
      }
    },
    [fetchRooms, setBusy],
  );

  const handleBroadcastSubmit = useCallback(
    async (message: string) => {
      const room = broadcastTarget;
      if (!room) return;
      setBroadcastBusy(true);
      setBroadcastError(null);
      try {
        const res = await fetch("/api/admin/broadcast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            roomId: room.id,
            message,
            from: "Admin",
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Error" }));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        setBroadcastTarget(null);
      } catch (err) {
        console.error(err);
        setBroadcastError(
          err instanceof Error ? err.message : "Gagal mengirim broadcast.",
        );
      } finally {
        setBroadcastBusy(false);
      }
    },
    [broadcastTarget],
  );

  const handleKick = useCallback(
    async (room: AdminRoom, player: AdminPlayer) => {
      if (
        typeof window !== "undefined" &&
        !window.confirm(
          `Keluarkan ${player.name} dari room "${room.name ?? room.id}"?`,
        )
      ) {
        return;
      }
      const key = `kick:${room.id}:${player.id}`;
      setBusy(key, true);
      setActionError(null);
      try {
        const res = await fetch("/api/admin/kick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            roomId: room.id,
            playerId: player.id,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Error" }));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        await fetchRooms(true);
      } catch (err) {
        console.error(err);
        setActionError(
          err instanceof Error ? err.message : "Gagal kick player.",
        );
      } finally {
        setBusy(key, false);
      }
    },
    [fetchRooms, setBusy],
  );

  // Sort rule:
  //   1. Rooms with at least one active player first.
  //   2. Within each group, more active members > more total members.
  //   3. Tie-break by created_at desc (newest first).
  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      const aActive = a.active_count > 0 ? 1 : 0;
      const bActive = b.active_count > 0 ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      if (a.active_count !== b.active_count)
        return b.active_count - a.active_count;
      if (a.total_count !== b.total_count) return b.total_count - a.total_count;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [rooms]);

  const groupedHistory = useMemo(() => {
    const map = new Map<string, VotingRound[]>();
    for (const r of rounds) {
      const list = map.get(r.room_id) ?? [];
      list.push(r);
      map.set(r.room_id, list);
    }
    return Array.from(map.entries()).sort(
      (a, b) =>
        new Date(b[1][0].created_at).getTime() -
        new Date(a[1][0].created_at).getTime(),
    );
  }, [rounds]);

  if (authed === null) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold-soft" />
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <form
          onSubmit={handleLogin}
          className="wood-frame w-full max-w-sm rounded-2xl p-1.5"
        >
          <div className="rounded-xl bg-ivory-soft/95 p-6 text-wood-dark">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gold/60 bg-wood text-gold-soft">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-serif text-base font-bold text-wood-dark">
                  Superadmin
                </h1>
                <p className="text-xs text-wood/80">
                  Masukkan password admin untuk akses room overview.
                </p>
              </div>
            </div>
            <label className="mb-2 block font-serif text-xs font-bold uppercase tracking-wider text-wood">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="mb-3 w-full rounded-lg border-2 border-wood/30 bg-ivory-soft px-3 py-2 text-sm text-wood-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
            />
            {loginError && (
              <p className="mb-3 text-xs text-red-700">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={submitting || !password}
              className="brass-button inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-serif text-sm font-bold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Masuk
            </button>
          </div>
        </form>
      </main>
    );
  }

  const pillBase =
    "inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-wood-dark/70 px-2.5 py-1.5 text-xs font-medium text-ivory transition hover:border-gold hover:text-gold-soft sm:px-3";

  if (mode.kind === "history") {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMode({ kind: "rooms" })}
              className={pillBase}
              title="Kembali ke daftar room"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Rooms</span>
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-serif text-xl font-bold text-ivory-soft">
                {mode.roomName || "Untitled room"}
              </h1>
              <p className="truncate font-mono text-xs text-gold-soft">
                {mode.roomId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchHistory(mode.roomId)}
              disabled={historyLoading}
              className={`${pillBase} disabled:opacity-50`}
              title="Refresh"
            >
              <RefreshCcw
                className={`h-3.5 w-3.5 ${historyLoading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-wood-dark/70 px-2.5 py-1.5 text-xs font-medium text-ivory transition hover:border-red-400 hover:text-red-300 sm:px-3"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {historyError && (
          <p className="rounded-lg border border-red-400/60 bg-red-500/15 px-3 py-2 text-sm text-red-200">
            {historyError}
          </p>
        )}

        {!historyLoading && rounds.length === 0 && (
          <div className="wood-frame flex flex-col items-center gap-2 rounded-2xl p-10 text-center text-ivory-dim">
            <Spade className="h-6 w-6 text-gold/70" />
            <p className="text-sm">
              Belum ada history voting untuk room ini.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-6">
          {groupedHistory.map(([roomId, list]) => (
            <section
              key={roomId}
              className="wood-frame rounded-2xl p-4 sm:p-5"
            >
              <header className="mb-3 flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-serif text-sm font-bold text-ivory-soft">
                    {list[0].room_name || "Untitled room"}
                  </div>
                  <div className="font-mono text-[11px] text-gold-soft">
                    {roomId}
                  </div>
                </div>
                <div className="text-[11px] uppercase tracking-wide text-ivory-dim">
                  {list.length} round{list.length === 1 ? "" : "s"}
                </div>
              </header>

              <ul className="flex flex-col gap-3">
                {list.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-gold/30 bg-felt-dark/60 p-3"
                  >
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-[11px] text-ivory-dim">
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                      <span className="flex items-center gap-3">
                        <span>
                          {r.vote_count} vote
                          {r.vote_count === 1 ? "" : "s"}
                        </span>
                        {r.average !== null && (
                          <span className="font-serif font-bold text-gold-soft">
                            avg {Number(r.average).toFixed(1)}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.votes.map((v) => (
                        <span
                          key={v.player_id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-wood-dark/70 px-2 py-0.5 text-[11px] text-ivory"
                        >
                          <span className="max-w-[120px] truncate">
                            {v.name}
                          </span>
                          <span className="rounded border border-gold/40 bg-gold/15 px-1.5 font-mono font-bold text-gold-soft">
                            {v.vote ?? "—"}
                          </span>
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    );
  }

  // mode.kind === "rooms"
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-gold/60 bg-wood text-gold-soft">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold text-ivory-soft">
              Rooms overview
            </h1>
            <p className="text-xs text-ivory-dim">
              Semua room aktif beserta pemainnya. Auto-refresh tiap 10 detik.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchRooms()}
            disabled={roomsLoading}
            className={`${pillBase} disabled:opacity-50`}
            title="Refresh"
          >
            <RefreshCcw
              className={`h-3.5 w-3.5 ${roomsLoading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-wood-dark/70 px-2.5 py-1.5 text-xs font-medium text-ivory transition hover:border-red-400 hover:text-red-300 sm:px-3"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {roomsError && (
        <p className="rounded-lg border border-red-400/60 bg-red-500/15 px-3 py-2 text-sm text-red-200">
          {roomsError}
        </p>
      )}
      {actionError && (
        <p className="rounded-lg border border-red-400/60 bg-red-500/15 px-3 py-2 text-sm text-red-200">
          {actionError}
          <button
            onClick={() => setActionError(null)}
            className="ml-3 text-red-300 hover:text-ivory-soft"
          >
            ×
          </button>
        </p>
      )}

      {!roomsLoading && rooms.length === 0 && (
        <div className="wood-frame flex flex-col items-center gap-2 rounded-2xl p-10 text-center text-ivory-dim">
          <Spade className="h-6 w-6 text-gold/70" />
          <p className="text-sm">Belum ada room.</p>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {sortedRooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            pending={pending}
            pillBase={pillBase}
            onTransfer={(p) => void handleTransfer(room, p)}
            onKick={(p) => void handleKick(room, p)}
            onRename={() => void handleRename(room)}
            onDelete={() => void handleDelete(room)}
            onBroadcast={() => {
              setBroadcastError(null);
              setBroadcastTarget(room);
            }}
            onViewHistory={() =>
              setMode({
                kind: "history",
                roomId: room.id,
                roomName: room.name,
              })
            }
          />
        ))}
      </div>

      <BroadcastComposer
        open={!!broadcastTarget}
        context={
          broadcastTarget
            ? `Pesan akan muncul untuk semua orang di room "${
                broadcastTarget.name ?? broadcastTarget.id
              }".`
            : undefined
        }
        placeholder="Tulis pengumuman untuk peserta room..."
        busy={broadcastBusy}
        error={broadcastError}
        onSubmit={handleBroadcastSubmit}
        onClose={() => {
          if (!broadcastBusy) {
            setBroadcastTarget(null);
            setBroadcastError(null);
          }
        }}
      />
    </main>
  );
}

function RoomCard({
  room,
  pending,
  pillBase,
  onTransfer,
  onKick,
  onRename,
  onDelete,
  onBroadcast,
  onViewHistory,
}: {
  room: AdminRoom;
  pending: Record<string, boolean>;
  pillBase: string;
  onTransfer: (player: AdminPlayer) => void;
  onKick: (player: AdminPlayer) => void;
  onRename: () => void;
  onDelete: () => void;
  onBroadcast: () => void;
  onViewHistory: () => void;
}) {
  const hasActive = room.active_count > 0;
  const renaming = !!pending[`rename:${room.id}`];
  const deleting = !!pending[`delete:${room.id}`];
  return (
    <section className="wood-frame rounded-2xl p-4 sm:p-5">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                hasActive
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                  : "bg-ivory-dim/50"
              }`}
              title={hasActive ? "Active" : "Idle"}
              aria-label={hasActive ? "Active" : "Idle"}
            />
            <span className="truncate font-serif text-base font-bold text-ivory-soft">
              {room.name || "Untitled room"}
            </span>
            {room.revealed && (
              <span className="rounded border border-gold/40 bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-soft">
                Revealed
              </span>
            )}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-gold-soft">
            {room.id}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200">
            <Users className="h-3.5 w-3.5" />
            {room.active_count} active / {room.total_count}
          </span>
          <a
            href={`/room/${room.id}`}
            target="_blank"
            rel="noreferrer"
            className={pillBase}
            title="Buka room di tab baru"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Open</span>
          </a>
          <button
            type="button"
            onClick={onBroadcast}
            className={pillBase}
            title="Broadcast pesan ke peserta room"
          >
            <Megaphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Broadcast</span>
          </button>
          <button
            type="button"
            onClick={onRename}
            disabled={renaming}
            className={`${pillBase} disabled:opacity-50`}
            title="Ubah nama room"
          >
            {renaming ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Pencil className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Rename</span>
          </button>
          <button
            type="button"
            onClick={onViewHistory}
            className={pillBase}
            title="Lihat history voting"
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">History</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/40 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-200 transition hover:border-red-400 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3"
            title="Hapus room"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </header>

      {room.players.length === 0 ? (
        <p className="rounded-lg border border-gold/20 bg-felt-dark/40 px-3 py-3 text-xs text-ivory-dim">
          Tidak ada pemain di room ini.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {room.players.map((p) => {
            const isOwner = p.id === room.effective_owner_id;
            const transferKey = `transfer:${room.id}:${p.id}`;
            const kickKey = `kick:${room.id}:${p.id}`;
            const transferring = !!pending[transferKey];
            const kicking = !!pending[kickKey];

            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/25 bg-felt-dark/60 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      p.active ? "bg-emerald-400" : "bg-ivory-dim/40"
                    }`}
                    aria-hidden
                  />
                  <span className="truncate text-sm text-ivory">{p.name}</span>
                  {isOwner && (
                    <span className="inline-flex items-center gap-1 rounded border border-gold/50 bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-soft">
                      <Crown className="h-3 w-3" />
                      Owner
                    </span>
                  )}
                  <span
                    className="hidden text-[11px] text-ivory-dim sm:inline"
                    title={`Last seen ${new Date(p.last_seen).toLocaleString()}`}
                  >
                    {p.active ? "online" : relativeTimeShort(p.last_seen)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onTransfer(p)}
                    disabled={isOwner || transferring}
                    className="inline-flex items-center gap-1 rounded-lg border border-gold/40 bg-wood-dark/70 px-2 py-1 text-[11px] font-medium text-ivory transition hover:border-gold hover:text-gold-soft disabled:cursor-not-allowed disabled:opacity-40"
                    title={
                      isOwner
                        ? "Sudah owner"
                        : "Jadikan player ini sebagai owner room"
                    }
                  >
                    {transferring ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Crown className="h-3 w-3" />
                    )}
                    <span className="hidden sm:inline">Make owner</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onKick(p)}
                    disabled={kicking}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-400/40 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-200 transition hover:border-red-400 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Keluarkan player dari room"
                  >
                    {kicking ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <UserMinus className="h-3 w-3" />
                    )}
                    <span className="hidden sm:inline">Kick</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * Render a `last_seen` timestamp as "5m ago" / "2h ago" / "3d ago"
 * for the inline player row. Kept short on purpose so a long offline
 * gap doesn't blow up the row width on small screens.
 */
function relativeTimeShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "—";
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}
