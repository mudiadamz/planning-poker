"use client";

import { useEffect, useRef, useState } from "react";

export type EmojiFloater = {
  id: string;
  emoji: string;
  /** Sender display name. Kept for analytics / future tooltips; not
   *  rendered next to the floating emoji. */
  from: string;
  /** 0..1 — used as the horizontal jitter seed inside the table so a
   *  burst of reactions doesn't pile on the exact same point. */
  x: number;
  /** Optional target player id. When set, the emoji animates from the
   *  table center toward the target's seat instead of floating up. */
  to?: string;
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

/** Compute the on-screen center of the poker table, with a sensible
 *  bottom-of-viewport fallback for cases where the table isn't mounted yet. */
function getTableCenter(): { x: number; y: number; width: number; height: number } {
  const el = document.querySelector("[data-table-center]");
  if (!el) {
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight - 120,
      width: 280,
      height: 160,
    };
  }
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    width: rect.width,
    height: rect.height,
  };
}

function UntargetedFloater({ floater }: { floater: EmojiFloater }) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    const center = getTableCenter();
    // Use the floater's stored x as a deterministic horizontal jitter seed
    // (-50%..+50% of a capped table-width) so multiple simultaneous reactions
    // don't stack on the exact same pixel.
    const spread = Math.min(center.width * 0.7, 220);
    const jitterX = (floater.x - 0.5) * spread;
    setPos({ left: center.x + jitterX, top: center.y });
  }, [floater]);

  if (!pos) return null;

  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: pos.left, top: pos.top }}
    >
      <div className="animate-float-up select-none">
        <span className="text-4xl drop-shadow-lg sm:text-5xl">
          {floater.emoji}
        </span>
      </div>
    </div>
  );
}

/**
 * Targeted reactions visibly fly from the center of the table along a slight
 * upward arc and converge on the target's seat, then shrink and fade as if
 * absorbed by them. Uses the Web Animations API because the start/end
 * coordinates are computed from live DOM rects.
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
    const center = getTableCenter();
    const startX = center.x;
    const startY = center.y;
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
      <div className="-translate-x-1/2 -translate-y-1/2">
        <span className="text-4xl drop-shadow-lg sm:text-5xl">
          {floater.emoji}
        </span>
      </div>
    </div>
  );
}
