"use client";

import { Crown, X } from "lucide-react";

import { cn } from "@/lib/cn";
import type { Player } from "@/lib/types";
import { Card } from "./Card";

type Props = {
  player: Player;
  revealed: boolean;
  isMe?: boolean;
  isOwner?: boolean;
  highlight?: boolean;
  /** True when the local user is the room owner and may manage others. */
  canManage?: boolean;
  onKick?: (playerId: string) => void;
  onTransferOwnership?: (playerId: string) => void;
};

export function PlayerSeat({
  player,
  revealed,
  isMe,
  isOwner,
  highlight,
  canManage,
  onKick,
  onTransferOwnership,
}: Props) {
  // Owner actions (kick / transfer) only show on hover when the local user is
  // the owner and the seat is someone else.
  const showActions = canManage && !isMe && !isOwner;

  return (
    <div className="group relative flex flex-col items-center gap-1.5 sm:gap-2">
      <Card
        value={player.vote}
        revealed={revealed}
        highlight={highlight}
        size="md"
      />
      {showActions && (
        <div className="absolute -right-1.5 -top-1.5 z-10 flex items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          {onTransferOwnership && (
            <button
              type="button"
              onClick={() => onTransferOwnership(player.id)}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-amber-400/60 bg-slate-900 text-amber-300 shadow transition hover:bg-amber-400 hover:text-slate-900"
              title={`Jadikan ${player.name} owner room`}
              aria-label={`Jadikan ${player.name} owner room`}
            >
              <Crown className="h-3 w-3" />
            </button>
          )}
          {onKick && (
            <button
              type="button"
              onClick={() => onKick(player.id)}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-red-500/60 bg-slate-900 text-red-300 shadow transition hover:bg-red-500 hover:text-white"
              title={`Keluarkan ${player.name}`}
              aria-label={`Keluarkan ${player.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
      <div
        className={cn(
          "flex max-w-[100px] items-center justify-center gap-1 truncate text-center text-xs font-medium sm:max-w-[140px] sm:text-sm",
          isMe ? "text-accent" : "text-slate-200",
        )}
        title={
          isOwner ? `${player.name} (room owner)` : player.name
        }
      >
        {isOwner && (
          <Crown
            className="h-3 w-3 flex-shrink-0 text-amber-400 sm:h-3.5 sm:w-3.5"
            aria-label="Room owner"
          />
        )}
        <span className="truncate">{player.name}</span>
        {isMe && (
          <span className="text-[10px] text-slate-500 sm:text-xs">
            (you)
          </span>
        )}
      </div>
    </div>
  );
}
