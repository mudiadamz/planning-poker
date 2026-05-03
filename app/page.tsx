"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { customAlphabet } from "nanoid";
import { Loader2, Plus, LogIn, Spade } from "lucide-react";

import { getSupabase } from "@/lib/supabase";
import { DEFAULT_DECK } from "@/lib/decks";

const nanoid = customAlphabet(
  "23456789abcdefghjkmnpqrstuvwxyz",
  6,
);

export default function HomePage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const [joinId, setJoinId] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const id = nanoid();
      const supabase = getSupabase();
      const { error } = await supabase.from("rooms").insert({
        id,
        name: roomName.trim() || null,
        deck: DEFAULT_DECK,
        revealed: false,
      });
      if (error) throw error;
      router.push(`/room/${id}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create room.");
      setCreating(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const id = joinId.trim().toLowerCase();
    if (!id) return;
    setJoining(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("rooms")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setError(`Room "${id}" not found.`);
        setJoining(false);
        return;
      }
      router.push(`/room/${id}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to join room.");
      setJoining(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-10">
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-gold/60 bg-wood text-gold-soft shadow-[inset_0_0_0_2px_rgba(212,175,55,0.4),0_8px_24px_rgba(0,0,0,0.45)]">
          <Spade className="h-8 w-8" />
        </div>
        <h1 className="font-serif text-4xl font-bold tracking-tight text-ivory-soft sm:text-5xl">
          Planning <span className="text-gold-soft">Poker</span>
        </h1>
        <p className="mt-3 max-w-md text-sm text-ivory-dim sm:text-base">
          Estimasi story point bareng tim secara real-time. Bikin room,
          share link, voting bareng.
        </p>
      </div>

      <div className="grid w-full max-w-3xl gap-5 sm:grid-cols-2">
        <form
          onSubmit={handleCreate}
          className="wood-frame rounded-2xl p-1.5"
        >
          <div className="rounded-xl bg-ivory-soft/95 p-6 text-wood-dark">
            <h2 className="mb-1 font-serif text-lg font-bold text-wood-dark">
              Buat room baru
            </h2>
            <p className="mb-4 text-sm text-wood/80">
              Setiap room punya URL unik untuk dibagikan ke tim.
            </p>
            <label className="mb-2 block font-serif text-xs font-bold uppercase tracking-wider text-wood">
              Nama room (opsional)
            </label>
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Sprint 42 grooming"
              className="mb-4 w-full rounded-lg border-2 border-wood/30 bg-ivory-soft px-3 py-2 text-sm text-wood-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
              maxLength={64}
            />
            <button
              type="submit"
              disabled={creating}
              className="brass-button inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-serif text-sm font-bold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create room
            </button>
          </div>
        </form>

        <form
          onSubmit={handleJoin}
          className="wood-frame rounded-2xl p-1.5"
        >
          <div className="rounded-xl bg-ivory-soft/95 p-6 text-wood-dark">
            <h2 className="mb-1 font-serif text-lg font-bold text-wood-dark">
              Join room
            </h2>
            <p className="mb-4 text-sm text-wood/80">
              Punya kode room? Masukkan untuk gabung.
            </p>
            <label className="mb-2 block font-serif text-xs font-bold uppercase tracking-wider text-wood">
              Room ID
            </label>
            <input
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              placeholder="abc123"
              className="mb-4 w-full rounded-lg border-2 border-wood/30 bg-ivory-soft px-3 py-2 text-sm font-mono text-wood-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
              maxLength={16}
            />
            <button
              type="submit"
              disabled={joining || !joinId.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-wood bg-wood-dark px-4 py-2.5 font-serif text-sm font-bold uppercase tracking-wider text-gold-soft transition hover:border-gold hover:bg-wood disabled:cursor-not-allowed disabled:opacity-60"
            >
              {joining ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Join room
            </button>
          </div>
        </form>
      </div>

      {error && (
        <p className="mt-6 rounded-lg border border-red-400/60 bg-red-500/15 px-4 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <p className="mt-12 font-serif text-xs italic text-ivory-dim">
        Built with Next.js + Supabase Realtime · Deploy ready for Vercel
      </p>
    </main>
  );
}
