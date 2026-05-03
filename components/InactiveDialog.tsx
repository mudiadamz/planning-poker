"use client";

import { useState } from "react";
import { Loader2, MoonStar } from "lucide-react";

type Props = {
  roomName?: string | null;
  playerName?: string | null;
  onRejoin: () => Promise<void> | void;
  onLeave: () => void;
};

export function InactiveDialog({
  roomName,
  playerName,
  onRejoin,
  onLeave,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRejoin() {
    setError(null);
    setSubmitting(true);
    try {
      await onRejoin();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Gagal rejoin room.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-felt-dark/80 px-4 backdrop-blur-sm">
      <div className="wood-frame w-full max-w-sm rounded-2xl p-1.5">
        <div className="rounded-xl bg-ivory-soft/95 p-6 text-wood-dark">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gold/60 bg-wood text-gold-soft">
              <MoonStar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-wood-dark">
                Kamu sempat tidak aktif
              </h2>
              <p className="text-xs text-wood/80">
                Tab dibiarkan inactive terlalu lama, jadi kamu otomatis keluar
                dari room
                {roomName ? (
                  <>
                    {" "}
                    <span className="font-semibold text-wood-dark">
                      {roomName}
                    </span>
                  </>
                ) : null}
                .
              </p>
            </div>
          </div>

          <p className="mb-4 text-sm text-wood">
            Mau gabung lagi
            {playerName ? (
              <>
                {" "}sebagai{" "}
                <span className="font-bold text-wood-dark">{playerName}</span>
              </>
            ) : null}
            ?
          </p>

          {error && <p className="mb-3 text-xs text-red-700">{error}</p>}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleRejoin}
              disabled={submitting}
              className="brass-button inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-serif text-sm font-bold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Rejoin
            </button>
            <button
              type="button"
              onClick={onLeave}
              disabled={submitting}
              className="inline-flex flex-1 items-center justify-center rounded-lg border-2 border-wood/40 bg-ivory px-4 py-2.5 text-sm font-medium text-wood-dark transition hover:border-wood hover:bg-ivory-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              Keluar ke beranda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
