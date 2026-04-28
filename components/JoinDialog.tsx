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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-slate-700/60 bg-slate-900/95 p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent ring-1 ring-accent/30">
            <UserCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              Masuk ke room
            </h2>
            <p className="text-xs text-slate-400">
              Pilih nama tampilan kamu (emoji boleh).
            </p>
          </div>
        </div>

        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
          Nama
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder=""
          maxLength={32}
          className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
        />

        {error && (
          <p className="mb-3 text-xs text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Masuk
        </button>
      </form>
    </div>
  );
}
