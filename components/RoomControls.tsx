"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Link as LinkIcon,
  LogOut,
  Pencil,
  UserCircle2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { isMuted, setMuted } from "@/lib/sounds";
import { EmojiBlaster } from "./EmojiBlaster";

type Props = {
  roomId: string;
  roomName?: string | null;
  playerName?: string;
  canRename?: boolean;
  onRename?: (name: string) => Promise<void> | void;
  canReact?: boolean;
  /** Players that can be picked as the target of an emoji reaction. */
  reactTargets?: Array<{ id: string; name: string }>;
  /** Local player id, so the target picker can mark it as "(kamu)". */
  meId?: string | null;
  onEmoji?: (emoji: string, targetId: string | null) => void;
  onLeave: () => void;
};

export function RoomControls({
  roomId,
  roomName,
  playerName,
  canRename,
  onRename,
  canReact,
  reactTargets,
  meId,
  onEmoji,
  onLeave,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setMutedState(isMuted());
    function onMuteChange() {
      setMutedState(isMuted());
    }
    window.addEventListener("poker-mute-change", onMuteChange);
    return () =>
      window.removeEventListener("poker-mute-change", onMuteChange);
  }, []);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }
  const [draft, setDraft] = useState(playerName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(playerName ?? "");
  }, [playerName, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function copyLink() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/room/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error(err);
    }
  }

  async function commitRename() {
    const trimmed = draft.trim();
    if (!trimmed) {
      setNameError("Nama tidak boleh kosong.");
      return;
    }
    if (trimmed.length > 32) {
      setNameError("Nama maksimal 32 karakter.");
      return;
    }
    setNameError(null);
    if (trimmed === playerName) {
      setEditing(false);
      return;
    }
    setSavingName(true);
    try {
      await onRename?.(trimmed);
      setEditing(false);
    } catch (err) {
      console.error(err);
      setNameError(err instanceof Error ? err.message : "Gagal mengubah nama.");
    } finally {
      setSavingName(false);
    }
  }

  function cancelRename() {
    setDraft(playerName ?? "");
    setNameError(null);
    setEditing(false);
  }

  const pillBase =
    "inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-wood-dark/70 px-2.5 py-1.5 text-xs font-medium text-ivory transition hover:border-gold hover:text-gold-soft sm:px-3";

  return (
    <header className="wood flex w-full flex-wrap items-center justify-between gap-2 border-b-2 border-gold/60 px-3 py-3 shadow-[inset_0_-2px_0_rgba(212,175,55,0.25)] sm:gap-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold-soft ring-1 ring-gold/50">
          <LinkIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate font-serif text-sm font-bold text-ivory-soft">
            {roomName || "Planning Room"}
          </div>
          <div className="truncate text-xs text-ivory-dim">
            Room ID: <span className="font-mono text-gold-soft">{roomId}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canRename &&
          (editing ? (
            <div className="flex items-center gap-1 rounded-lg border border-gold/60 bg-wood-dark/90 px-2 py-1">
              <UserCircle2 className="h-3.5 w-3.5 shrink-0 text-gold-soft" />
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void commitRename();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancelRename();
                  }
                }}
                disabled={savingName}
                maxLength={32}
                placeholder="Nama kamu"
                className="w-28 bg-transparent px-1 text-xs font-medium text-ivory-soft outline-none placeholder:text-ivory-dim/70 sm:w-36"
              />
              <button
                type="button"
                onClick={() => void commitRename()}
                disabled={savingName}
                className="rounded p-0.5 text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-50"
                title="Simpan"
                aria-label="Simpan nama"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={cancelRename}
                disabled={savingName}
                className="rounded p-0.5 text-ivory-dim transition hover:bg-wood/60 hover:text-ivory-soft disabled:opacity-50"
                title="Batal"
                aria-label="Batal mengubah nama"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="group inline-flex max-w-[160px] items-center gap-1.5 rounded-lg border border-gold/40 bg-wood-dark/70 px-2.5 py-1.5 text-xs font-medium text-ivory transition hover:border-gold hover:text-gold-soft sm:max-w-[200px] sm:px-3"
              title="Ganti nama"
            >
              <UserCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{playerName || "Pilih nama"}</span>
              <Pencil className="h-3 w-3 shrink-0 opacity-60 group-hover:opacity-100" />
            </button>
          ))}

        {nameError && (
          <span className="text-[11px] text-red-300">{nameError}</span>
        )}

        {canReact && onEmoji && (
          <EmojiBlaster
            onPick={onEmoji}
            players={reactTargets}
            meId={meId}
          />
        )}

        <button
          type="button"
          onClick={toggleMute}
          className={cn(
            pillBase,
            muted && "border-gold text-gold-soft",
          )}
          title={muted ? "Suara dimatikan" : "Matikan suara"}
          aria-label={muted ? "Aktifkan suara" : "Matikan suara"}
          aria-pressed={muted}
        >
          {muted ? (
            <VolumeX className="h-3.5 w-3.5" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </button>

        <button
          onClick={copyLink}
          className={cn(
            pillBase,
            copied && "border-emerald-400 text-emerald-300",
          )}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Copy invite link</span>
              <span className="sm:hidden">Copy</span>
            </>
          )}
        </button>
        <button
          onClick={onLeave}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-wood-dark/70 px-2.5 py-1.5 text-xs font-medium text-ivory transition hover:border-red-400 hover:text-red-300 sm:px-3"
          title="Leave room"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </header>
  );
}
