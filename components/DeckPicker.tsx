"use client";

import { useState } from "react";
import { ChevronDown, Settings2 } from "lucide-react";

import { cn } from "@/lib/cn";
import { DECK_PRESETS } from "@/lib/decks";

type Props = {
  current: string[];
  disabled?: boolean;
  onChange: (deck: string[]) => Promise<void> | void;
};

export function DeckPicker({ current, disabled, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState(current.join(", "));
  const [saving, setSaving] = useState(false);

  function matchedPresetId(): string | null {
    const key = JSON.stringify(current);
    for (const p of DECK_PRESETS) {
      if (JSON.stringify(p.cards) === key) return p.id;
    }
    return null;
  }

  async function applyPreset(presetId: string) {
    const preset = DECK_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSaving(true);
    try {
      await onChange(preset.cards);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function applyCustom(e: React.FormEvent) {
    e.preventDefault();
    const cards = customText
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cards.length < 2) return;
    setSaving(true);
    try {
      await onChange(cards);
      setCustomMode(false);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const activeId = matchedPresetId();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-wood-dark/70 px-3 py-1.5 text-xs font-medium text-ivory transition hover:border-gold hover:text-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Settings2 className="h-3.5 w-3.5" />
        {activeId
          ? DECK_PRESETS.find((p) => p.id === activeId)?.label
          : "Custom deck"}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border-2 border-gold/60 bg-wood-dark/95 p-2 shadow-2xl backdrop-blur">
          <div className="mb-1 px-2 py-1 font-serif text-[10px] font-semibold uppercase tracking-wider text-gold-soft">
            Deck preset
          </div>
          {DECK_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              disabled={saving}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-gold/10",
                activeId === p.id
                  ? "bg-gold/20 text-gold-soft"
                  : "text-ivory",
              )}
            >
              <span className="font-medium">{p.label}</span>
              <span className="truncate text-xs text-ivory-dim">
                {p.cards.slice(0, 5).join(" · ")}
                {p.cards.length > 5 ? "…" : ""}
              </span>
            </button>
          ))}

          <div className="my-1 h-px bg-gold/30" />

          {customMode ? (
            <form onSubmit={applyCustom} className="space-y-2 px-1 pb-1">
              <label className="block px-1 font-serif text-[10px] font-semibold uppercase tracking-wider text-gold-soft">
                Custom (comma-separated)
              </label>
              <input
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="1, 2, 3, 5, 8, 13, ?"
                className="w-full rounded-md border border-gold/40 bg-ivory-soft/95 px-2 py-1.5 text-sm text-wood-dark outline-none focus:border-gold"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="brass-button flex-1 rounded-md px-2 py-1.5 text-xs font-bold uppercase tracking-wider disabled:opacity-60"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  className="rounded-md border border-gold/40 px-2 py-1.5 text-xs text-ivory hover:bg-gold/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setCustomText(current.join(", "));
                setCustomMode(true);
              }}
              className="w-full rounded-md px-2 py-1.5 text-left text-sm text-ivory transition hover:bg-gold/10"
            >
              Custom…
            </button>
          )}
        </div>
      )}
    </div>
  );
}
