"use client";

import { cn } from "@/lib/cn";
import { isRedSuit, SUIT_GLYPH, suitFor } from "@/lib/decks";

type Props = {
  guide: Record<string, string>;
  cards: string[];
};

/**
 * Side panel that shows a short description for each card in the deck. Only
 * rendered when the active preset provides a `guide` (currently Story Point).
 * Visually mirrors the Stats panel so the layout reads symmetric.
 */
export function StoryPointGuide({ guide, cards }: Props) {
  const entries = cards
    .map((value) => ({ value, desc: guide[value] }))
    .filter((e): e is { value: string; desc: string } => Boolean(e.desc));

  if (entries.length === 0) return null;

  return (
    <div className="wood-frame animate-pop flex w-full flex-col gap-3 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-serif text-xs font-bold uppercase tracking-[0.2em] text-gold-soft">
          Story Point Guide
        </h3>
      </div>
      <ul className="flex flex-col gap-2">
        {entries.map(({ value, desc }) => {
          const suit = suitFor(value);
          const red = isRedSuit(suit);
          const glyph = SUIT_GLYPH[suit];
          return (
            <li
              key={value}
              className="flex items-start gap-3 rounded-xl border border-gold/30 bg-felt-dark/40 p-2.5"
            >
              <div className="relative flex h-12 w-9 flex-shrink-0 items-center justify-center rounded border-2 border-gold/60 bg-ivory-soft font-serif text-base font-bold shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
                <span
                  className={cn(
                    "pointer-events-none absolute inset-0 flex items-center justify-center text-2xl opacity-15",
                    red ? "text-cardRed" : "text-cardBlack",
                  )}
                  aria-hidden
                >
                  {glyph}
                </span>
                <span
                  className={cn(
                    "relative",
                    red ? "text-cardRed" : "text-cardBlack",
                  )}
                >
                  {value}
                </span>
              </div>
              <p className="flex-1 text-xs leading-relaxed text-ivory">
                {desc}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
