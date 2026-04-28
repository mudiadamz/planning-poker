"use client";

import { cn } from "@/lib/cn";

type Props = {
  deck: string[];
  selected: string | null;
  disabled?: boolean;
  onPick: (value: string) => void;
};

export function VoteDeck({ deck, selected, disabled, onPick }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:text-xs">
        Pilih kartu kamu
      </p>
      <div className="flex flex-wrap items-end justify-center gap-1.5 sm:gap-3">
        {deck.map((card) => {
          const isSelected = selected === card;
          return (
            <button
              key={card}
              type="button"
              onClick={() => !disabled && onPick(card)}
              disabled={disabled}
              className={cn(
                "group relative h-14 w-10 rounded-lg border-2 bg-slate-900 text-base font-bold text-accent shadow-sm transition-all sm:h-20 sm:w-14 sm:text-lg",
                "enabled:hover:-translate-y-1 enabled:hover:border-accent enabled:hover:bg-accent/10 sm:enabled:hover:-translate-y-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "-translate-y-2 border-accent bg-accent text-white shadow-[0_0_0_3px_rgba(59,130,246,0.3)] sm:-translate-y-3"
                  : "border-accent/60 text-accent",
              )}
              aria-pressed={isSelected}
              title={`Vote ${card}`}
            >
              <span>{card}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
