"use client";

import { useEffect, useRef, useState } from "react";
import { Smile, Users } from "lucide-react";

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

type Player = { id: string; name: string };

type Props = {
  disabled?: boolean;
  /** Optional list of players to choose from as a reaction target. */
  players?: Player[];
  /** Local player's id, used to mark "(kamu)" in the target list. */
  meId?: string | null;
  /** Called with the chosen emoji and an optional target player id (null = everyone). */
  onPick: (emoji: string, targetId: string | null) => void;
};

export function EmojiBlaster({ disabled, players, meId, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
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

  // If the targeted player leaves the room, fall back to "everyone" so we
  // never broadcast at a ghost id.
  useEffect(() => {
    if (target && players && !players.some((p) => p.id === target)) {
      setTarget(null);
    }
  }, [target, players]);

  function pick(emoji: string) {
    onPick(emoji, target);
    // Keep open for spam-clicking — closes on outside click / Esc.
  }

  const targetLabel = target
    ? players?.find((p) => p.id === target)?.name ?? "Pemain"
    : "Semua";

  const hasOthers = !!players && players.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-wood-dark/70 px-2.5 py-1.5 text-xs font-medium text-ivory transition hover:border-gold hover:text-gold-soft sm:px-3",
          open && "border-gold text-gold-soft",
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
          className="animate-pop absolute right-0 top-full z-40 mt-2 w-[260px] rounded-xl border-2 border-gold/60 bg-wood-dark/95 p-2 shadow-2xl backdrop-blur"
        >
          {hasOthers && (
            <div className="mb-2 border-b border-gold/30 pb-2">
              <div className="mb-1 flex items-center gap-1 px-1 font-serif text-[10px] font-bold uppercase tracking-[0.18em] text-gold-soft">
                <Users className="h-3 w-3" />
                Tujuan: <span className="text-ivory">{targetLabel}</span>
              </div>
              <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto px-0.5 pt-1">
                <TargetChip
                  active={target === null}
                  label="Semua"
                  onClick={() => setTarget(null)}
                />
                {players!.map((p) => (
                  <TargetChip
                    key={p.id}
                    active={target === p.id}
                    label={p.id === meId ? `${p.name} (kamu)` : p.name}
                    onClick={() => setTarget(p.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-5 gap-1">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => pick(emoji)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-xl transition hover:scale-110 hover:bg-gold/15 active:scale-95"
                title={`Lempar ${emoji}${target ? " ke " + targetLabel : ""}`}
                aria-label={`Lempar ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TargetChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "max-w-[120px] truncate rounded-full border px-2 py-0.5 text-[11px] font-medium transition",
        active
          ? "border-gold bg-gold/20 text-gold-soft"
          : "border-gold/40 text-ivory hover:border-gold hover:text-gold-soft",
      )}
      title={label}
    >
      {label}
    </button>
  );
}
