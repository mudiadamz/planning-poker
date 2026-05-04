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
              style={{
                transform: isSelected
                  ? `translateY(-1.25rem) scale(1.18) rotate(0deg)`
                  : `rotate(${tilt}deg)`,
              }}
              className={cn(
                "group relative h-16 w-11 rounded-lg border-2 font-serif font-bold transition-all duration-200 sm:h-24 sm:w-16",
                "enabled:hover:-translate-y-2 enabled:hover:rotate-0 enabled:hover:shadow-[0_8px_20px_rgba(0,0,0,0.45)] sm:enabled:hover:-translate-y-3",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "z-10 border-gold bg-gradient-to-b from-ivory-soft via-ivory to-gold-soft/60 shadow-[0_0_0_4px_rgba(212,175,55,0.85),0_0_28px_rgba(245,215,110,0.65),0_18px_30px_rgba(0,0,0,0.55)] ring-2 ring-gold ring-offset-2 ring-offset-felt-dark"
                  : "border-gold/50 bg-ivory-soft shadow-[0_3px_8px_rgba(0,0,0,0.35)] hover:border-gold",
                !isSelected &&
                  selected !== null &&
                  "opacity-70 hover:opacity-100",
              )}
              aria-pressed={isSelected}
              title={`Vote ${card}`}
            >
              {/* "Pilihan" ribbon shown only on the selected card. */}
              {isSelected && (
                <span
                  aria-hidden
                  className="brass-button absolute -top-3 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 font-serif text-[8px] font-bold uppercase tracking-[0.18em] sm:text-[9px]"
                >
                  Pilihan
                </span>
              )}
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
                  "pointer-events-none absolute inset-0 flex items-center justify-center text-[28px] sm:text-[44px]",
                  colorClass,
                  isSelected ? "opacity-25" : "opacity-15",
                )}
                aria-hidden
              >
                {glyph}
              </span>
              <span
                className={cn(
                  "relative z-10 flex h-full w-full items-center justify-center tracking-tight",
                  colorClass,
                  isSelected
                    ? "text-lg sm:text-2xl"
                    : "text-base sm:text-xl",
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
