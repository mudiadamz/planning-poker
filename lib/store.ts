"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type IdentityState = {
  playerId: string | null;
  playerName: string | null;
  setIdentity: (id: string, name: string) => void;
  setName: (name: string) => void;
  clear: () => void;
};

export const useIdentity = create<IdentityState>()(
  persist(
    (set) => ({
      playerId: null,
      playerName: null,
      setIdentity: (id, name) => set({ playerId: id, playerName: name }),
      setName: (name) => set({ playerName: name }),
      clear: () => set({ playerId: null, playerName: null }),
    }),
    {
      name: "poker-identity",
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
