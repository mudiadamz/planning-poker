"use client";

import { useState } from "react";
import { Loader2, UserCircle2 } from "lucide-react";

type Props = {
  defaultName?: string;
  onJoin: (name: string) => Promise<void> | void;
};

export function JoinDialog({ defaultName = "", onJoin }: Props) {
  const [name, setName] = useState(defaultName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Nama tidak boleh kosong.");
      return;
    }
    if (trimmed.length > 32) {
      setError("Nama maksimal 32 karakter.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onJoin(trimmed);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Gagal join room.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-felt-dark/80 px-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="wood-frame w-full max-w-sm rounded-2xl p-1.5"
      >
        <div className="rounded-xl bg-ivory-soft/95 p-6 text-wood-dark">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gold/60 bg-wood text-gold-soft">
              <UserCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-wood-dark">
                Masuk ke room
              </h2>
              <p className="text-xs text-wood/80">
                Pilih nama tampilan kamu (emoji boleh).
              </p>
            </div>
          </div>

          <label className="mb-2 block font-serif text-xs font-bold uppercase tracking-wider text-wood">
            Nama
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder=""
            maxLength={32}
            className="mb-3 w-full rounded-lg border-2 border-wood/30 bg-ivory-soft px-3 py-2 text-sm text-wood-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
          />

          {error && (
            <p className="mb-3 text-xs text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="brass-button inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-serif text-sm font-bold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Masuk
          </button>
        </div>
      </form>
    </div>
  );
}
