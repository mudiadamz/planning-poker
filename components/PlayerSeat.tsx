"use client";

import { Crown } from "lucide-react";

import { cn } from "@/lib/cn";
import type { Player } from "@/lib/types";
import { Card } from "./Card";

type Props = {
  player: Player;
  revealed: boolean;
  isMe?: boolean;
  isOwner?: boolean;
  highlight?: boolean;
};

export function PlayerSeat({
  player,
  revealed,
  isMe,
  isOwner,
  highlight,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
      <Card
        value={player.vote}
        revealed={revealed}
        highlight={highlight}
        size="md"
      />
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
