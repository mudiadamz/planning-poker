"use client";

import { useMemo } from "react";

import { cn } from "@/lib/cn";
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

  // Casino chip colors cycled per tally row so the bars feel colorful.
  const CHIP_COLORS = [
    "bg-gold",
    "bg-cardRed",
    "bg-emerald-500",
    "bg-sky-400",
    "bg-violet-500",
    "bg-orange-400",
  ];

  return (
    <div className="wood-frame animate-pop flex w-full flex-col gap-2 overflow-hidden rounded-xl p-2.5">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h3 className="font-serif text-[11px] font-bold uppercase tracking-[0.2em] text-gold-soft">
          Vote Summary
        </h3>
        {allAgree && (
          <span className="rounded-full border border-gold/60 bg-gold/15 px-2 py-0.5 font-serif text-[9px] font-bold uppercase tracking-wider text-gold-soft">
            Agreement
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-3 rounded-lg border border-gold/30 bg-felt-dark/60 px-3 py-2">
        <div>
          <div className="text-[9px] uppercase tracking-wide text-ivory-dim">
            Average
          </div>
          <div className="font-serif text-xl font-bold leading-tight text-gold-soft">
            {avg !== null ? avg.toFixed(1) : "—"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wide text-ivory-dim">
            Total
          </div>
          <div className="font-serif text-xl font-bold leading-tight text-ivory-soft">
            {totalVotes}
          </div>
        </div>
      </div>

      {tallies.length === 0 ? (
        <p className="px-1 py-0.5 text-xs text-ivory-dim">Tidak ada vote.</p>
      ) : (
        <ul className="flex max-h-[40vh] flex-col gap-1.5 overflow-y-auto pr-0.5 lg:max-h-[calc(100vh-22rem)]">
          {tallies.map((t, idx) => {
            const widthPct = maxCount > 0 ? (t.count / maxCount) * 100 : 0;
            const chipColor = CHIP_COLORS[idx % CHIP_COLORS.length];
            return (
              <li key={t.value} className="flex items-center gap-2">
                <div className="flex h-8 w-6 flex-shrink-0 items-center justify-center rounded border-2 border-gold/60 bg-ivory-soft font-serif text-xs font-bold text-cardBlack">
                  {t.value}
                </div>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full border border-gold/30 bg-felt-dark/80">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      chipColor,
                    )}
                    style={{ width: `${Math.max(widthPct, 6)}%` }}
                  />
                </div>
                <div className="w-10 text-right text-[10px] uppercase tracking-wide text-ivory-dim">
                  {t.count}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
