"use client";

import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

import { cn } from "@/lib/cn";

export const EMOJIS = [
  "🎉",
  "🔥",
  "🚀",
  "💯",
  "👍",
  "👎",
  "👏",
  "😂",
  "😅",
  "🤔",
  "😴",
  "🤯",
  "🥲",
  "🍕",
  "🍻",
  "❤️",
  "💀",
  "🤡",
  "🦄",
  "🐢",
] as const;

type Props = {
  disabled?: boolean;
  onPick: (emoji: string) => void;
};

export function EmojiBlaster({ disabled, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close popover when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(emoji: string) {
    onPick(emoji);
    // Keep open for spam-clicking — closes on outside click / Esc.
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-amber-400 hover:text-amber-300 sm:px-3",
          open && "border-amber-400 text-amber-300",
          disabled && "cursor-not-allowed opacity-50",
        )}
        title="Lempar emoji"
        aria-label="Lempar emoji"
        aria-expanded={open}
      >
        <Smile className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">React</span>
      </button>

      {open && (
        <div
          role="menu"
          className="animate-pop absolute right-0 top-full z-40 mt-2 grid w-[224px] grid-cols-5 gap-1 rounded-xl border border-slate-700/80 bg-slate-900/95 p-2 shadow-2xl backdrop-blur"
        >
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => pick(emoji)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-xl transition hover:scale-110 hover:bg-slate-800 active:scale-95"
              title={`Lempar ${emoji}`}
              aria-label={`Lempar ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
