"use client";

export type EmojiFloater = {
  id: string;
  emoji: string;
  from: string;
  /** 0..1 — horizontal position as a fraction of viewport width. */
  x: number;
};

type Props = {
  floaters: EmojiFloater[];
};

export function EmojiBlastLayer({ floaters }: Props) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {floaters.map((f) => (
        <div
          key={f.id}
          className="animate-float-up absolute bottom-16 flex flex-col items-center select-none"
          style={{ left: `${f.x * 100}%`, transform: "translateX(-50%)" }}
        >
          <span className="text-4xl drop-shadow-lg sm:text-5xl">
            {f.emoji}
          </span>
          <span className="mt-1 max-w-[140px] truncate rounded-full bg-wood-dark/85 px-2 py-0.5 text-[10px] font-medium text-ivory ring-1 ring-gold/50">
            {f.from}
          </span>
        </div>
      ))}
    </div>
  );
}
