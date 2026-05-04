"use client";

import { useEffect, useRef } from "react";

export type EmojiFloater = {
  id: string;
  emoji: string;
  from: string;
  /** 0..1 — horizontal position as a fraction of viewport width. Used as
   *  the start fallback for untargeted/anonymous reactions. */
  x: number;
  /** Optional target player id. When set, the emoji animates from the
   *  sender's seat (or bottom of the screen) toward the target's seat. */
  to?: string;
  /** Optional sender player id, used to find the seat element to fly from. */
  fromPlayerId?: string;
};

type Props = {
  floaters: EmojiFloater[];
};

export function EmojiBlastLayer({ floaters }: Props) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {floaters.map((f) =>
        f.to ? (
          <TargetedFloater key={f.id} floater={f} />
        ) : (
          <UntargetedFloater key={f.id} floater={f} />
        ),
      )}
    </div>
  );
}

function UntargetedFloater({ floater }: { floater: EmojiFloater }) {
  return (
    <div
      className="animate-float-up absolute bottom-16 flex select-none flex-col items-center"
      style={{ left: `${floater.x * 100}%`, transform: "translateX(-50%)" }}
    >
      <span className="text-4xl drop-shadow-lg sm:text-5xl">
        {floater.emoji}
      </span>
      <span className="mt-1 max-w-[140px] truncate rounded-full bg-wood-dark/85 px-2 py-0.5 text-[10px] font-medium text-ivory ring-1 ring-gold/50">
        {floater.from}
      </span>
    </div>
  );
}

/**
 * Targeted reactions visibly fly from the sender's seat (or the bottom of
 * the screen if the sender is unknown) and converge on the target's seat,
 * then shrink and fade as if absorbed by them. Uses the Web Animations API
 * because the start/end coordinates are computed from live DOM rects.
 */
function TargetedFloater({ floater }: { floater: EmojiFloater }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !floater.to) return;

    const target = document.querySelector(
      `[data-player-id="${floater.to}"]`,
    );
    if (!target) return;

    const targetRect = target.getBoundingClientRect();
    const fromEl = floater.fromPlayerId
      ? document.querySelector(`[data-player-id="${floater.fromPlayerId}"]`)
      : null;
    const fromRect = fromEl?.getBoundingClientRect() ?? null;

    const startX = fromRect
      ? fromRect.left + fromRect.width / 2
      : floater.x * window.innerWidth;
    const startY = fromRect
      ? fromRect.top + fromRect.height / 2
      : window.innerHeight - 100;
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;

    const dx = endX - startX;
    const dy = endY - startY;
    // Arc the path slightly upward so it doesn't look like a straight laser.
    const peakOffset = -Math.min(120, Math.max(40, Math.abs(dx) * 0.15 + 60));

    const animation = el.animate(
      [
        {
          transform: `translate(${startX}px, ${startY}px) scale(0.5)`,
          opacity: 0,
        },
        {
          transform: `translate(${startX}px, ${startY}px) scale(1.25)`,
          opacity: 1,
          offset: 0.12,
        },
        {
          transform: `translate(${startX + dx * 0.5}px, ${startY + dy * 0.5 + peakOffset}px) scale(1.4) rotate(-8deg)`,
          opacity: 1,
          offset: 0.55,
        },
        {
          transform: `translate(${endX}px, ${endY}px) scale(0.95) rotate(0deg)`,
          opacity: 1,
          offset: 0.92,
        },
        {
          transform: `translate(${endX}px, ${endY}px) scale(0.3)`,
          opacity: 0,
        },
      ],
      {
        duration: 1800,
        easing: "cubic-bezier(0.4, 0.1, 0.6, 1)",
        fill: "forwards",
      },
    );

    return () => animation.cancel();
  }, [floater]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-0 select-none"
      style={{ willChange: "transform, opacity" }}
    >
      {/* Inner wrapper offsets the visual center to the (x,y) the outer
          element is translated to. Animating only the outer keeps things
          simple and GPU-friendly. */}
      <div className="-translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <span className="text-4xl drop-shadow-lg sm:text-5xl">
          {floater.emoji}
        </span>
        <span className="mt-1 max-w-[140px] truncate rounded-full bg-wood-dark/85 px-2 py-0.5 text-[10px] font-medium text-ivory ring-1 ring-gold/50">
          {floater.from}
        </span>
      </div>
    </div>
  );
}
