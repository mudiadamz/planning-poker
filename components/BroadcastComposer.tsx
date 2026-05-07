"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Megaphone, Send, X } from "lucide-react";

type Props = {
  open: boolean;
  /** Short context line shown above the textarea, e.g. "Broadcast to room ABC". */
  context?: string;
  /** Friendly placeholder for the textarea. */
  placeholder?: string;
  /** Initial text in the textarea. */
  initialValue?: string;
  /** Disabled while submitting. */
  busy?: boolean;
  /** Optional error to display below the textarea (e.g. send failure). */
  error?: string | null;
  /** Submit handler. Throwing here will surface as inline error. */
  onSubmit: (message: string) => Promise<void> | void;
  onClose: () => void;
};

const MAX_LENGTH = 500;

/**
 * Modal composer used by both the room owner ("broadcast to my room")
 * and the admin dashboard ("broadcast to any room"). Sends are
 * fire-and-forget from the composer's perspective — the parent does
 * the actual transport and reports back via `busy` / `error`.
 */
export function BroadcastComposer({
  open,
  context,
  placeholder,
  initialValue,
  busy,
  error,
  onSubmit,
  onClose,
}: Props) {
  const [draft, setDraft] = useState(initialValue ?? "");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(initialValue ?? "");
      // Tiny tick so the textarea is mounted before we focus.
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
  }, [open, initialValue]);

  if (!open) return null;

  const trimmed = draft.trim();
  const canSend = trimmed.length > 0 && !busy;

  async function handleSend() {
    if (!canSend) return;
    await onSubmit(trimmed);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-felt-dark/80 px-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="wood-frame w-full max-w-md rounded-2xl p-1.5">
        <div className="rounded-xl bg-ivory-soft/95 p-5 text-wood-dark">
          <header className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-gold/60 bg-wood text-gold-soft">
                <Megaphone className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-serif text-base font-bold text-wood-dark">
                  Broadcast message
                </h2>
                {context && (
                  <p className="text-xs text-wood/80">{context}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg p-1 text-wood/60 transition hover:bg-wood/10 hover:text-wood-dark disabled:opacity-50"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={(e) => {
              if (
                (e.key === "Enter" && (e.ctrlKey || e.metaKey)) ||
                (e.key === "Enter" && !e.shiftKey && !e.altKey)
              ) {
                e.preventDefault();
                void handleSend();
              } else if (e.key === "Escape") {
                if (!busy) onClose();
              }
            }}
            disabled={busy}
            rows={4}
            placeholder={placeholder ?? "Tulis pesan untuk semua orang di room..."}
            className="w-full resize-y rounded-lg border-2 border-wood/30 bg-ivory-soft px-3 py-2 text-sm text-wood-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:cursor-not-allowed disabled:opacity-60"
          />

          <div className="mt-1 flex items-center justify-between text-[11px] text-wood/60">
            <span>Enter untuk kirim, Shift+Enter untuk baris baru.</span>
            <span>
              {draft.length} / {MAX_LENGTH}
            </span>
          </div>

          {error && (
            <p className="mt-2 rounded-lg border border-red-400/60 bg-red-500/10 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!canSend}
              className="brass-button inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-serif text-sm font-bold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Kirim
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center rounded-lg border-2 border-wood/40 bg-ivory px-4 py-2.5 text-sm font-medium text-wood-dark transition hover:border-wood hover:bg-ivory-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
