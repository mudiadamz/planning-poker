"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type IdentityState = {
  /** Display name, shared across every room this browser joins. */
  playerName: string | null;
  /**
   * Stable client-generated player id PER ROOM. `pp_players.id` is a global
   * primary key, so one id can't be reused across rooms — but within a room
   * the same id must survive reloads and tabs so ownership and presence stay
   * put. Keyed by roomId.
   */
  playerIdByRoom: Record<string, string>;
  setName: (name: string) => void;
  setPlayerId: (roomId: string, id: string) => void;
  clearRoom: (roomId: string) => void;
};

export const useIdentity = create<IdentityState>()(
  persist(
    (set) => ({
      playerName: null,
      playerIdByRoom: {},
      setName: (name) => set({ playerName: name }),
      setPlayerId: (roomId, id) =>
        set((s) => ({
          playerIdByRoom: { ...s.playerIdByRoom, [roomId]: id },
        })),
      clearRoom: (roomId) =>
        set((s) => {
          const next = { ...s.playerIdByRoom };
          delete next[roomId];
          return { playerIdByRoom: next };
        }),
    }),
    {
      name: "poker-identity",
      version: 2,
      // v1 stored a single { playerId, playerName }. Keep the name; drop the
      // single global id (it only ever matched the last room joined).
      migrate: (persisted: unknown) => {
        const p = (persisted ?? {}) as {
          playerName?: string | null;
          playerIdByRoom?: Record<string, string>;
        };
        return {
          playerName: p.playerName ?? null,
          playerIdByRoom: p.playerIdByRoom ?? {},
        } as IdentityState;
      },
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
          : window.localStorage,
      ),
    },
  ),
);
