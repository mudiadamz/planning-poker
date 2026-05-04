"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/cn";
import { isRedSuit, SUIT_GLYPH, suitFor } from "@/lib/decks";

type Props = {
  guide: Record<string, string>;
  cards: string[];
};

/**
 * Side panel that shows a short description for each card in the deck. Only
 * rendered when the active preset provides a `guide` (currently Story Point).
 *
 * Designed to be compact and to never overflow the viewport: the body has a
 * capped max-height with internal scrolling, and the whole panel can be
 * collapsed to just its title bar via the chevron.
 */
export function StoryPointGuide({ guide, cards }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const entries = cards
    .map((value) => ({ value, desc: guide[value] }))
    .filter((e): e is { value: string; desc: string } => Boolean(e.desc));

  if (entries.length === 0) return null;

  return (
    <div className="wood-frame animate-pop flex w-full flex-col overflow-hidden rounded-xl">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 transition hover:bg-gold/10"
        aria-expanded={!collapsed}
        aria-controls="story-point-guide-list"
        title={collapsed ? "Buka panel" : "Minimize panel"}
      >
        <h3 className="font-serif text-[11px] font-bold uppercase tracking-[0.2em] text-gold-soft">
          Story Point Guide
        </h3>
        {collapsed ? (
          <ChevronDown className="h-3.5 w-3.5 text-gold-soft" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 text-gold-soft" />
        )}
      </button>
      {!collapsed && (
        <ul
          id="story-point-guide-list"
          className="flex max-h-[55vh] flex-col gap-1 overflow-y-auto px-1.5 pb-1.5 lg:max-h-[calc(100vh-16rem)]"
        >
          {entries.map(({ value, desc }) => {
            const suit = suitFor(value);
            const red = isRedSuit(suit);
            const glyph = SUIT_GLYPH[suit];
            return (
              <li
                key={value}
                className="flex items-start gap-2 rounded-lg border border-gold/30 bg-felt-dark/40 px-1.5 py-1.5"
              >
                <div className="relative flex h-9 w-7 flex-shrink-0 items-center justify-center rounded border-2 border-gold/60 bg-ivory-soft font-serif text-xs font-bold shadow-[0_1px_3px_rgba(0,0,0,0.35)]">
                  <span
                    className={cn(
                      "pointer-events-none absolute inset-0 flex items-center justify-center text-base opacity-15",
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
                <p className="flex-1 text-[11px] leading-snug text-ivory">
                  {desc}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
