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
                  Masukkan password admin untuk lihat history voting.
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

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-gold/60 bg-wood text-gold-soft">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold text-ivory-soft">
              Voting history
            </h1>
            <p className="text-xs text-ivory-dim">
              Snapshot setiap sesi voting yang sudah di-reveal & di-reset.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchHistory(roomFilter || undefined)}
            disabled={loading}
            className={`${pillBase} disabled:opacity-50`}
            title="Refresh"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
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

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
          placeholder="Filter by room id (optional)"
          className="min-w-0 flex-1 rounded-lg border border-gold/40 bg-wood-dark/70 px-3 py-2 text-sm font-mono text-ivory-soft outline-none transition placeholder:text-ivory-dim focus:border-gold focus:ring-1 focus:ring-gold"
        />
        <button
          type="button"
          onClick={() => void fetchHistory(roomFilter || undefined)}
          className="brass-button rounded-lg px-3 py-2 font-serif text-xs font-bold uppercase tracking-wider"
        >
          Apply
        </button>
      </div>

      {loadError && (
        <p className="rounded-lg border border-red-400/60 bg-red-500/15 px-3 py-2 text-sm text-red-200">
          {loadError}
        </p>
      )}

      {!loading && rounds.length === 0 && (
        <div className="wood-frame flex flex-col items-center gap-2 rounded-2xl p-10 text-center text-ivory-dim">
          <Spade className="h-6 w-6 text-gold/70" />
          <p className="text-sm">Belum ada history voting.</p>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {grouped.map(([roomId, list]) => (
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
                    <span>
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-3">
                      <span>{r.vote_count} vote{r.vote_count === 1 ? "" : "s"}</span>
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
                        <span className="truncate max-w-[120px]">{v.name}</span>
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
