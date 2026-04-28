"use client";

import { useMemo } from "react";

import type { Player } from "@/lib/types";
import { average, isNumericVote } from "@/lib/decks";

type Props = {
  players: Player[];
  revealed: boolean;
};

type Tally = {
  value: string;
  count: number;
};

export function Stats({ players, revealed }: Props) {
  const tallies = useMemo<Tally[]>(() => {
    const byValue = new Map<string, number>();
    for (const p of players) {
      if (p.vote == null) continue;
      byValue.set(p.vote, (byValue.get(p.vote) ?? 0) + 1);
    }
    return Array.from(byValue.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => {
        // Numeric ascending, non-numeric last alphabetically
        const an = isNumericVote(a.value);
        const bn = isNumericVote(b.value);
        if (an && bn) return Number(a.value) - Number(b.value);
        if (an) return -1;
        if (bn) return 1;
        return a.value.localeCompare(b.value);
      });
  }, [players]);

  const avg = useMemo(
    () => average(players.map((p) => p.vote)),
    [players],
  );

  const maxCount = tallies.reduce((m, t) => Math.max(m, t.count), 0);
  const allAgree =
    tallies.length === 1 && tallies[0].count > 1 && isNumericVote(tallies[0].value);

  if (!revealed) return null;

  const totalVotes = tallies.reduce((sum, t) => sum + t.count, 0);

  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 shadow-inner sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          Vote Summary
        </h3>
        {allAgree && (
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
            Agreement
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-4 rounded-xl bg-slate-950/40 px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">
            Average
          </div>
          <div className="text-2xl font-bold text-white">
            {avg !== null ? avg.toFixed(1) : "—"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">
            Total
          </div>
          <div className="text-2xl font-bold text-white">{totalVotes}</div>
        </div>
      </div>

      {tallies.length === 0 ? (
        <p className="text-sm text-slate-400">Tidak ada vote.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tallies.map((t) => {
            const widthPct = maxCount > 0 ? (t.count / maxCount) * 100 : 0;
            return (
              <li key={t.value} className="flex items-center gap-3">
                <div className="flex h-9 w-7 flex-shrink-0 items-center justify-center rounded border border-accent/60 bg-slate-900 text-sm font-bold text-accent">
                  {t.value}
                </div>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${Math.max(widthPct, 6)}%` }}
                  />
                </div>
                <div className="w-14 text-right text-[11px] uppercase tracking-wide text-slate-400">
                  {t.count} {t.count === 1 ? "vote" : "votes"}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
