"use client";

/**
 * Tiny Web Audio sound effects — synthesized at runtime so we don't need
 * any audio asset files. Each effect is a short envelope-shaped tone (or a
 * pair of tones) that plays in <300ms.
 *
 * Mute state is persisted in localStorage as "poker-muted" = "1" | "0".
 */

export type SoundType = "pick" | "reveal" | "reset" | "join" | "leave";

const STORAGE_KEY = "poker-muted";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx && ctx.state !== "closed") return ctx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  window.dispatchEvent(new CustomEvent("poker-mute-change"));
}

type Tone = {
  freq: number;
  /** Seconds, relative to play start. */
  start: number;
  duration: number;
  /** Peak gain (0..1). Default 0.18. */
  gain?: number;
  type?: OscillatorType;
};

function playTones(tones: Tone[]) {
  if (isMuted()) return;
  const audio = getCtx();
  if (!audio) return;
  const now = audio.currentTime;

  for (const t of tones) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = t.type ?? "sine";
    osc.frequency.setValueAtTime(t.freq, now + t.start);

    const peak = t.gain ?? 0.18;
    gain.gain.setValueAtTime(0, now + t.start);
    gain.gain.linearRampToValueAtTime(peak, now + t.start + 0.01);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + t.start + t.duration,
    );

    osc.connect(gain).connect(audio.destination);
    osc.start(now + t.start);
    osc.stop(now + t.start + t.duration + 0.02);
  }
}

export function playSound(type: SoundType) {
  switch (type) {
    case "pick":
      playTones([
        { freq: 720, start: 0, duration: 0.08, type: "triangle", gain: 0.16 },
        { freq: 960, start: 0.05, duration: 0.08, type: "triangle", gain: 0.12 },
      ]);
      break;
    case "reveal":
      playTones([
        { freq: 440, start: 0, duration: 0.12, type: "sawtooth", gain: 0.12 },
        { freq: 660, start: 0.08, duration: 0.14, type: "sawtooth", gain: 0.14 },
        { freq: 880, start: 0.18, duration: 0.18, type: "sawtooth", gain: 0.16 },
      ]);
      break;
    case "reset":
      playTones([
        { freq: 880, start: 0, duration: 0.1, type: "sine", gain: 0.14 },
        { freq: 660, start: 0.08, duration: 0.12, type: "sine", gain: 0.13 },
        { freq: 440, start: 0.18, duration: 0.18, type: "sine", gain: 0.12 },
      ]);
      break;
    case "join":
      playTones([
        { freq: 660, start: 0, duration: 0.1, type: "sine", gain: 0.16 },
        { freq: 990, start: 0.1, duration: 0.18, type: "sine", gain: 0.14 },
      ]);
      break;
    case "leave":
      playTones([
        { freq: 520, start: 0, duration: 0.1, type: "sine", gain: 0.13 },
        { freq: 330, start: 0.1, duration: 0.18, type: "sine", gain: 0.12 },
      ]);
      break;
  }
}
