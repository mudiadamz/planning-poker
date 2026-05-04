"use client";

import { useMemo } from "react";

import { cn } from "@/lib/cn";
import type { Player, Room } from "@/lib/types";
import { isNumericVote } from "@/lib/decks";
import { PlayerSeat } from "./PlayerSeat";

type Props = {
  room: Room;
  players: Player[];
  meId: string | null;
  ownerId: string | null;
  isOwner: boolean;
  onReveal: () => void;
  onReset: () => void;
  onKick?: (playerId: string) => void;
  onTransferOwnership?: (playerId: string) => void;
  busy: boolean;
};

/**
 * Distributes players around a virtual rectangular table.
 *
 * Order of placement (round-robin) by joined_at:
 *   top -> right -> bottom -> left -> repeat
 * with limits per side so the layout never gets too crowded.
 */
function seatPlayers(players: Player[]): {
  top: Player[];
  right: Player[];
  bottom: Player[];
  left: Player[];
} {
  const sorted = [...players].sort((a, b) =>
    a.joined_at.localeCompare(b.joined_at),
  );

  const top: Player[] = [];
  const right: Player[] = [];
  const bottom: Player[] = [];
  const left: Player[] = [];

  // Caps to keep things tidy; overflow falls back to top/bottom.
  const MAX_HORIZONTAL = 6;
  const MAX_VERTICAL = 3;

  const order: Array<{
    bucket: Player[];
    cap: number;
  }> = [
    { bucket: top, cap: MAX_HORIZONTAL },
    { bucket: right, cap: MAX_VERTICAL },
    { bucket: bottom, cap: MAX_HORIZONTAL },
    { bucket: left, cap: MAX_VERTICAL },
  ];

  for (const p of sorted) {
    let placed = false;
    for (let attempt = 0; attempt < order.length; attempt++) {
      const candidate = order.shift()!;
      order.push(candidate);
      if (candidate.bucket.length < candidate.cap) {
        candidate.bucket.push(p);
        placed = true;
        break;
      }
    }
    if (!placed) bottom.push(p);
  }

  return { top, right, bottom, left };
}

export function PokerTable({
  room,
  players,
  meId,
  ownerId,
  isOwner,
  onReveal,
  onReset,
  onKick,
  onTransferOwnership,
  busy,
}: Props) {
  const seats = useMemo(() => seatPlayers(players), [players]);

  const anyVoted = players.some((p) => p.vote !== null);
  const allVoted =
    players.length > 0 && players.every((p) => p.vote !== null);

  // Highlight numeric outliers (max & min) once revealed, just like the screenshot.
  const numericVotes = players
    .map((p) => p.vote)
    .filter((v): v is string => isNumericVote(v));
  const numericValues = numericVotes.map((v) =>
    v.includes("/") ? Number(v.split("/")[0]) / Number(v.split("/")[1]) : Number(v),
  );
  const max = numericValues.length ? Math.max(...numericValues) : null;
  const min = numericValues.length ? Math.min(...numericValues) : null;
  const sameVote = max !== null && min !== null && max === min;

  function isHighlighted(player: Player): boolean {
    if (!room.revealed) return false;
    if (!isNumericVote(player.vote)) return false;
    if (sameVote) return false;
    const n = player.vote!.includes("/")
      ? Number(player.vote!.split("/")[0]) / Number(player.vote!.split("/")[1])
      : Number(player.vote);
    return n === max || n === min;
  }

  return (
    <div className="flex w-full flex-col items-center gap-3 sm:gap-6">
      {/* Top row */}
      <div className="flex flex-wrap items-end justify-center gap-3 sm:gap-6">
        {seats.top.map((p) => (
          <PlayerSeat
            key={p.id}
            player={p}
            revealed={room.revealed}
            isMe={p.id === meId}
            isOwner={p.id === ownerId}
            highlight={isHighlighted(p)}
            canManage={isOwner}
            onKick={onKick}
            onTransferOwnership={onTransferOwnership}
          />
        ))}
      </div>

      {/* Middle row: left players · table · right players */}
      <div className="flex w-full max-w-4xl items-center justify-center gap-2 sm:gap-6">
        <div className="flex flex-col items-end gap-3 sm:gap-6">
          {seats.left.map((p) => (
            <PlayerSeat
              key={p.id}
              player={p}
              revealed={room.revealed}
              isMe={p.id === meId}
              isOwner={p.id === ownerId}
              highlight={isHighlighted(p)}
              canManage={isOwner}
              onKick={onKick}
              onTransferOwnership={onTransferOwnership}
            />
          ))}
        </div>

        <div
          data-table-center
          className="relative flex h-32 min-w-[180px] flex-1 items-center justify-center rounded-[40px] border-[10px] border-wood px-3 text-center sm:h-44 sm:min-w-[280px] sm:rounded-[60px] sm:border-[14px]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at center, #1a6f55 0%, #0d4f3c 55%, #08382a 100%), repeating-radial-gradient(circle at 50% 50%, rgba(0,0,0,0.05) 0, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 4px)",
            backgroundBlendMode: "multiply",
            boxShadow:
              "inset 0 0 0 3px #d4af37, inset 0 0 30px rgba(0,0,0,0.55), 0 12px 30px -10px rgba(0,0,0,0.6)",
          }}
        >
          {/* Decorative gold pin-rail dots around the rim, like brass studs. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[30px] sm:rounded-[46px]"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, transparent 96%, rgba(212,175,55,0.0) 100%)",
            }}
          />
          {isOwner ? (
            room.revealed ? (
              <button
                onClick={onReset}
                disabled={busy}
                className="brass-button rounded-full px-4 py-2 font-serif text-xs font-bold uppercase tracking-wider transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 sm:px-6 sm:py-2.5 sm:text-sm"
              >
                Start new voting
              </button>
            ) : (
              <button
                onClick={onReveal}
                disabled={busy || !anyVoted}
                className={cn(
                  "rounded-full px-4 py-2 font-serif text-xs font-bold uppercase tracking-wider transition sm:px-6 sm:py-2.5 sm:text-sm",
                  anyVoted
                    ? "brass-button enabled:hover:scale-105"
                    : "border border-gold/40 bg-felt-dark/60 text-ivory-dim",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
                title={
                  anyVoted
                    ? allVoted
                      ? "Reveal all votes"
                      : "Reveal votes (belum semua memilih)"
                    : "Belum ada vote..."
                }
              >
                {anyVoted ? "Reveal cards" : "Pick your cards!"}
              </button>
            )
          ) : (
            <p className="font-serif text-xs font-medium uppercase tracking-wider text-ivory/85 sm:text-sm">
              {room.revealed
                ? "Menunggu owner memulai voting baru..."
                : anyVoted
                  ? "Menunggu owner reveal kartu..."
                  : "Pilih kartu kamu!"}
            </p>
          )}
        </div>

        <div className="flex flex-col items-start gap-3 sm:gap-6">
          {seats.right.map((p) => (
            <PlayerSeat
              key={p.id}
              player={p}
              revealed={room.revealed}
              isMe={p.id === meId}
              isOwner={p.id === ownerId}
              highlight={isHighlighted(p)}
              canManage={isOwner}
              onKick={onKick}
              onTransferOwnership={onTransferOwnership}
            />
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex flex-wrap items-start justify-center gap-3 sm:gap-6">
        {seats.bottom.map((p) => (
          <PlayerSeat
            key={p.id}
            player={p}
            revealed={room.revealed}
            isMe={p.id === meId}
            isOwner={p.id === ownerId}
            highlight={isHighlighted(p)}
            canManage={isOwner}
            onKick={onKick}
            onTransferOwnership={onTransferOwnership}
          />
        ))}
      </div>
    </div>
  );
}
