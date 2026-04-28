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
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-slate-700/60 bg-slate-900/95 p-2 shadow-2xl backdrop-blur">
          <div className="mb-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Deck preset
          </div>
          {DECK_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              disabled={saving}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-slate-800/80",
                activeId === p.id && "bg-accent/15 text-accent",
              )}
            >
              <span className="font-medium">{p.label}</span>
              <span className="truncate text-xs text-slate-400">
                {p.cards.slice(0, 5).join(" · ")}
                {p.cards.length > 5 ? "…" : ""}
              </span>
            </button>
          ))}

          <div className="my-1 h-px bg-slate-700/60" />

          {customMode ? (
            <form onSubmit={applyCustom} className="space-y-2 px-1 pb-1">
              <label className="block px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Custom (comma-separated)
              </label>
              <input
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="1, 2, 3, 5, 8, 13, ?"
                className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-sm outline-none focus:border-accent"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-md bg-accent px-2 py-1.5 text-xs font-semibold text-white hover:bg-accent-soft disabled:opacity-60"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  className="rounded-md border border-slate-700 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
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
              className="w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-300 transition hover:bg-slate-800/80"
            >
              Custom…
            </button>
          )}
        </div>
      )}
    </div>
  );
}
