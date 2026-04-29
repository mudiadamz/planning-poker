"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Lock,
  LogOut,
  RefreshCcw,
  ShieldCheck,
  Spade,
} from "lucide-react";

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

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [rounds, setRounds] = useState<VotingRound[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [roomFilter, setRoomFilter] = useState("");

  const fetchHistory = useCallback(
    async (room?: string) => {
      setLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams();
        if (room) params.set("room_id", room);
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
        setAuthed(true);
      } catch (err) {
        console.error(err);
        setLoadError(err instanceof Error ? err.message : "Gagal memuat history.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Initial probe — try fetching history; if 401 we'll show the login form.
  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

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
      await fetchHistory();
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
    setRounds([]);
  }

  const grouped = useMemo(() => {
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
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-2xl border border-slate-700/60 bg-slate-900/95 p-6 shadow-2xl"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent ring-1 ring-accent/30">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">
                Superadmin
              </h1>
              <p className="text-xs text-slate-400">
                Masukkan password admin untuk lihat history voting.
              </p>
            </div>
          </div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
          />
          {loginError && (
            <p className="mb-3 text-xs text-red-400">{loginError}</p>
          )}
          <button
            type="submit"
            disabled={submitting || !password}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Masuk
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Voting history</h1>
            <p className="text-xs text-slate-400">
              Snapshot setiap sesi voting yang sudah di-reveal & di-reset.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchHistory(roomFilter || undefined)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-accent hover:text-accent disabled:opacity-50 sm:px-3"
            title="Refresh"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-red-500 hover:text-red-400 sm:px-3"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
          placeholder="Filter by room id (optional)"
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-mono outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <button
          type="button"
          onClick={() => void fetchHistory(roomFilter || undefined)}
          className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition hover:bg-accent-soft"
        >
          Apply
        </button>
      </div>

      {loadError && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {loadError}
        </p>
      )}

      {!loading && rounds.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-10 text-center text-slate-400">
          <Spade className="h-6 w-6 opacity-60" />
          <p className="text-sm">Belum ada history voting.</p>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {grouped.map(([roomId, list]) => (
          <section
            key={roomId}
            className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 shadow-inner sm:p-5"
          >
            <header className="mb-3 flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">
                  {list[0].room_name || "Untitled room"}
                </div>
                <div className="font-mono text-[11px] text-slate-400">
                  {roomId}
                </div>
              </div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                {list.length} round{list.length === 1 ? "" : "s"}
              </div>
            </header>

            <ul className="flex flex-col gap-3">
              {list.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"
                >
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-[11px] text-slate-400">
                    <span>
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-3">
                      <span>{r.vote_count} vote{r.vote_count === 1 ? "" : "s"}</span>
                      {r.average !== null && (
                        <span className="text-accent">
                          avg {Number(r.average).toFixed(1)}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {r.votes.map((v) => (
                      <span
                        key={v.player_id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-200"
                      >
                        <span className="truncate max-w-[120px]">{v.name}</span>
                        <span className="rounded bg-accent/20 px-1.5 font-mono font-semibold text-accent">
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
