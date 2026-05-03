"use client";

import { cn } from "@/lib/cn";
import { isRedSuit, SUIT_GLYPH, suitFor } from "@/lib/decks";

type Props = {
  deck: string[];
  selected: string | null;
  disabled?: boolean;
  onPick: (value: string) => void;
};

export function VoteDeck({ deck, selected, disabled, onPick }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3">
      <p className="font-serif text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-soft sm:text-xs">
        Pilih kartu kamu
      </p>
      <div className="flex flex-wrap items-end justify-center gap-1.5 sm:gap-3">
        {deck.map((card, idx) => {
          const isSelected = selected === card;
          const suit = suitFor(card);
          const red = isRedSuit(suit);
          const glyph = SUIT_GLYPH[suit];
          const colorClass = red ? "text-cardRed" : "text-cardBlack";
          // Subtle fan tilt — alternate left/right around the center card.
          const mid = Math.floor(deck.length / 2);
          const offset = idx - mid;
          const tilt = isSelected ? 0 : offset * 1.2;
          return (
            <button
              key={card}
              type="button"
              onClick={() => !disabled && onPick(card)}
              disabled={disabled}
              style={{ transform: `rotate(${tilt}deg)` }}
              className={cn(
                "group relative h-16 w-11 rounded-lg border-2 bg-ivory-soft font-serif font-bold shadow-[0_3px_8px_rgba(0,0,0,0.35)] transition-all sm:h-24 sm:w-16",
                "enabled:hover:-translate-y-2 enabled:hover:rotate-0 enabled:hover:shadow-[0_8px_20px_rgba(0,0,0,0.45)] sm:enabled:hover:-translate-y-3",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "-translate-y-3 border-gold shadow-[0_0_0_3px_rgba(212,175,55,0.55),0_10px_22px_rgba(0,0,0,0.5)] sm:-translate-y-4"
                  : "border-gold/50 hover:border-gold",
              )}
              aria-pressed={isSelected}
              title={`Vote ${card}`}
            >
              {/* Top-left pip */}
              <div
                className={cn(
                  "absolute left-0.5 top-0.5 flex flex-col items-center leading-none sm:left-1 sm:top-1",
                  colorClass,
                )}
              >
                <span className="text-[9px] sm:text-[11px]">{card}</span>
                <span className="text-[9px] sm:text-[11px]">{glyph}</span>
              </div>
              {/* Bottom-right pip rotated */}
              <div
                className={cn(
                  "absolute bottom-0.5 right-0.5 flex rotate-180 flex-col items-center leading-none sm:bottom-1 sm:right-1",
                  colorClass,
                )}
              >
                <span className="text-[9px] sm:text-[11px]">{card}</span>
                <span className="text-[9px] sm:text-[11px]">{glyph}</span>
              </div>
              {/* Center value with faded suit watermark */}
              <span
                className={cn(
                  "pointer-events-none absolute inset-0 flex items-center justify-center text-[28px] opacity-15 sm:text-[44px]",
                  colorClass,
                )}
                aria-hidden
              >
                {glyph}
              </span>
              <span
                className={cn(
                  "relative z-10 flex h-full w-full items-center justify-center text-base tracking-tight sm:text-xl",
                  colorClass,
                )}
              >
                {card}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
