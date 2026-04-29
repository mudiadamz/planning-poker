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
  onEmoji?: (emoji: string) => void;
  onLeave: () => void;
};

export function RoomControls({
  roomId,
  roomName,
  playerName,
  canRename,
  onRename,
  canReact,
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

  return (
    <header className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent ring-1 ring-accent/30">
          <LinkIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold text-white">
            {roomName || "Planning Room"}
          </div>
          <div className="truncate text-xs text-slate-400">
            Room ID: <span className="font-mono">{roomId}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canRename &&
          (editing ? (
            <div className="flex items-center gap-1 rounded-lg border border-accent/60 bg-slate-900/80 px-2 py-1">
              <UserCircle2 className="h-3.5 w-3.5 shrink-0 text-accent" />
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
                className="w-28 bg-transparent px-1 text-xs font-medium text-white outline-none placeholder:text-slate-500 sm:w-36"
              />
              <button
                type="button"
                onClick={() => void commitRename()}
                disabled={savingName}
                className="rounded p-0.5 text-emerald-400 transition hover:bg-emerald-500/10 disabled:opacity-50"
                title="Simpan"
                aria-label="Simpan nama"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={cancelRename}
                disabled={savingName}
                className="rounded p-0.5 text-slate-400 transition hover:bg-slate-700/60 hover:text-white disabled:opacity-50"
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
              className="group inline-flex max-w-[160px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-accent hover:text-accent sm:max-w-[200px] sm:px-3"
              title="Ganti nama"
            >
              <UserCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{playerName || "Pilih nama"}</span>
              <Pencil className="h-3 w-3 shrink-0 opacity-60 group-hover:opacity-100" />
            </button>
          ))}

        {nameError && (
          <span className="text-[11px] text-red-400">{nameError}</span>
        )}

        {canReact && onEmoji && (
          <EmojiBlaster onPick={onEmoji} />
        )}

        <button
          type="button"
          onClick={toggleMute}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-accent hover:text-accent sm:px-3",
            muted && "border-amber-500/60 text-amber-300",
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
            "inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-accent hover:text-accent sm:px-3",
            copied && "border-emerald-500 text-emerald-400",
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
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-red-500 hover:text-red-400 sm:px-3"
          title="Leave room"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </header>
  );
}
