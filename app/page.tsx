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
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/30">
          <Spade className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Planning Poker
        </h1>
        <p className="mt-2 max-w-md text-sm text-slate-400 sm:text-base">
          Estimasi story point bareng tim secara real-time. Bikin room,
          share link, voting bareng.
        </p>
      </div>

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 shadow-lg backdrop-blur"
        >
          <h2 className="mb-1 text-lg font-semibold text-white">
            Buat room baru
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            Setiap room punya URL unik untuk dibagikan ke tim.
          </p>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Nama room (opsional)
          </label>
          <input
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Sprint 42 grooming"
            className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
            maxLength={64}
          />
          <button
            type="submit"
            disabled={creating}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create room
          </button>
        </form>

        <form
          onSubmit={handleJoin}
          className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 shadow-lg backdrop-blur"
        >
          <h2 className="mb-1 text-lg font-semibold text-white">
            Join room
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            Punya kode room? Masukkan untuk gabung.
          </p>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Room ID
          </label>
          <input
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            placeholder="abc123"
            className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
            maxLength={16}
          />
          <button
            type="submit"
            disabled={joining || !joinId.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-accent/60 bg-transparent px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {joining ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            Join room
          </button>
        </form>
      </div>

      {error && (
        <p className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <p className="mt-12 text-xs text-slate-500">
        Built with Next.js + Supabase Realtime · Deploy ready for Vercel
      </p>
    </main>
  );
}
