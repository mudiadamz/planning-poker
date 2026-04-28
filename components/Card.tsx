"use client";

import { cn } from "@/lib/cn";

type Props = {
  value: string | null;
  revealed: boolean;
  highlight?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-10 w-7 text-xs sm:h-12 sm:w-9 sm:text-sm",
  md: "h-14 w-10 text-base sm:h-16 sm:w-12 sm:text-lg",
  lg: "h-16 w-12 text-lg sm:h-20 sm:w-14 sm:text-xl",
};

/**
 * 3D-flip card. When `revealed` and a value is present, shows the value on the front.
 * Otherwise shows a face-down back design (or empty placeholder if no vote yet).
 */
export function Card({
  value,
  revealed,
  highlight = false,
  size = "md",
  className,
}: Props) {
  const hasVote = value !== null && value !== undefined && value !== "";
  const showFront = revealed && hasVote;

  // No vote yet: dashed empty placeholder.
  if (!hasVote) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border-2 border-dashed border-slate-700 text-slate-700",
          SIZE[size],
          className,
        )}
      >
        <span className="text-base">·</span>
      </div>
    );
  }

  return (
    <div className={cn("perspective", className)}>
      <div
        className={cn(
          "preserve-3d relative transition-transform duration-500",
          SIZE[size],
          showFront ? "" : "rotate-y-180",
        )}
      >
        {/* Front face: vote value (only rendered when revealed, so the value
            isn't even present in the DOM beforehand). */}
        <div
          className={cn(
            "backface-hidden absolute inset-0 flex items-center justify-center rounded-lg border-2 bg-slate-900 font-bold",
            highlight
              ? "border-accent text-accent shadow-[0_0_0_3px_rgba(59,130,246,0.25)]"
              : "border-accent/70 text-accent",
          )}
        >
          {showFront ? value : null}
        </div>
        {/* Back face: voted indicator */}
        <div
          className={cn(
            "backface-hidden rotate-y-180 absolute inset-0 flex items-center justify-center rounded-lg border-2 border-accent/70 bg-accent/15",
          )}
        >
          <div className="h-2/3 w-2/3 rounded-md border border-accent/40 bg-[repeating-linear-gradient(135deg,rgba(59,130,246,0.25)_0px,rgba(59,130,246,0.25)_4px,transparent_4px,transparent_8px)]" />
        </div>
      </div>
    </div>
  );
}
