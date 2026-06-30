import { describe, expect, it } from "vitest";

import {
  applyPlayerDelete,
  applyPlayerInsert,
  applyPlayerUpdate,
  reconcilePlayers,
  sortPlayersByJoinedAt,
} from "./players";
import type { Player } from "./types";

/**
 * Regression tests for the "rejoin shows a stale / inconsistent roster" bug:
 * after a user disconnects and rejoins, some active users didn't show up and
 * different clients saw different player lists.
 *
 * Root cause: while a tab's realtime socket is dead it misses other players'
 * INSERT events, and supabase-js does not replay them. The old UPDATE handler
 * only `map`-replaced existing rows, so a player whose INSERT we missed stayed
 * invisible forever. These tests pin the upsert + authoritative-reconcile
 * behaviour that heals the roster.
 */

function player(id: string, over: Partial<Player> = {}): Player {
  return {
    id,
    room_id: "room1",
    name: `Player ${id}`,
    vote: null,
    last_seen: "2026-07-01T00:00:00.000Z",
    joined_at: "2026-07-01T00:00:00.000Z",
    left_at: null,
    ...over,
  };
}

describe("applyPlayerInsert", () => {
  it("adds a new player", () => {
    const prev = [player("a")];
    const next = applyPlayerInsert(prev, player("b"));
    expect(next.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("is idempotent and preserves the array identity on a duplicate", () => {
    const prev = [player("a")];
    const next = applyPlayerInsert(prev, player("a"));
    expect(next).toBe(prev); // same ref ⇒ callers know nothing changed
  });
});

describe("applyPlayerUpdate (the core fix)", () => {
  it("replaces an existing player's row", () => {
    const prev = [player("a", { vote: null }), player("b")];
    const next = applyPlayerUpdate(prev, player("a", { vote: "5" }));
    expect(next.find((p) => p.id === "a")?.vote).toBe("5");
    expect(next).toHaveLength(2);
  });

  it("ADDS a player whose INSERT was missed while the socket was dead", () => {
    // We were disconnected when "c" joined, so they're absent locally. The
    // first event we receive about them is an UPDATE (they cast a vote).
    const prev = [player("a"), player("b")];
    const next = applyPlayerUpdate(prev, player("c", { vote: "8" }));
    expect(next.map((p) => p.id).sort()).toEqual(["a", "b", "c"]);
    expect(next.find((p) => p.id === "c")?.vote).toBe("8");
  });

  it("would have been dropped by the old map-only logic (guards the regression)", () => {
    const prev = [player("a"), player("b")];
    const buggyMapOnly = prev.map((x) =>
      x.id === "c" ? player("c") : x,
    );
    expect(buggyMapOnly.some((p) => p.id === "c")).toBe(false); // the bug
    expect(applyPlayerUpdate(prev, player("c")).some((p) => p.id === "c")).toBe(
      true,
    ); // the fix
  });
});

describe("applyPlayerDelete", () => {
  it("removes a present player", () => {
    const prev = [player("a"), player("b")];
    expect(applyPlayerDelete(prev, "a").map((p) => p.id)).toEqual(["b"]);
  });

  it("preserves array identity when the id is absent", () => {
    const prev = [player("a")];
    expect(applyPlayerDelete(prev, "zzz")).toBe(prev);
  });
});

describe("reconcilePlayers (authoritative re-fetch on rejoin)", () => {
  it("rebuilds the roster from the server list, dropping ghosts and surfacing missed joiners", () => {
    // Local (stale) view after a disconnect: still shows ghost "x" who left,
    // and is missing "c" who joined while we were away.
    const staleLocal = [player("a"), player("x"), player("b")];
    // Authoritative server snapshot fetched on reconnect.
    const server = [player("a"), player("b"), player("c")];

    const reconciled = reconcilePlayers(server);

    expect(reconciled.map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(reconciled.some((p) => p.id === "x")).toBe(false); // ghost gone
    expect(reconciled.some((p) => p.id === "c")).toBe(true); // joiner shown
    expect(reconciled).toHaveLength(3);
    // Sanity: it does not depend on the stale local list at all.
    expect(reconciled).not.toContain(staleLocal[1]);
  });

  it("orders deterministically by joined_at so every client shows the same seats", () => {
    const server = [
      player("c", { joined_at: "2026-07-01T00:03:00.000Z" }),
      player("a", { joined_at: "2026-07-01T00:01:00.000Z" }),
      player("b", { joined_at: "2026-07-01T00:02:00.000Z" }),
    ];
    expect(reconcilePlayers(server).map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the input array", () => {
    const server = [
      player("b", { joined_at: "2026-07-01T00:02:00.000Z" }),
      player("a", { joined_at: "2026-07-01T00:01:00.000Z" }),
    ];
    const snapshot = server.map((p) => p.id);
    reconcilePlayers(server);
    expect(server.map((p) => p.id)).toEqual(snapshot);
  });
});

describe("two clients converge to the same roster", () => {
  it("yields identical membership regardless of event order (the real symptom)", () => {
    const base = [player("a"), player("b")];

    // Client 1 sees: c joins (INSERT), then c votes (UPDATE), then b leaves.
    let c1 = base;
    c1 = applyPlayerInsert(c1, player("c"));
    c1 = applyPlayerUpdate(c1, player("c", { vote: "3" }));
    c1 = applyPlayerDelete(c1, "b");

    // Client 2 MISSED c's INSERT (socket was dead) and only sees c's UPDATE,
    // then b's leave broadcast — out of order relative to client 1.
    let c2 = base;
    c2 = applyPlayerUpdate(c2, player("c", { vote: "3" })); // upsert adds c
    c2 = applyPlayerDelete(c2, "b");

    const ids1 = c1.map((p) => p.id).sort();
    const ids2 = c2.map((p) => p.id).sort();
    expect(ids1).toEqual(ids2);
    expect(ids1).toEqual(["a", "c"]);
    expect(c2.find((p) => p.id === "c")?.vote).toBe("3");
  });
});

describe("sortPlayersByJoinedAt", () => {
  it("sorts ascending and is stable for equal timestamps", () => {
    const ts = "2026-07-01T00:00:00.000Z";
    const players = [player("b", { joined_at: ts }), player("a", { joined_at: ts })];
    // Equal joined_at ⇒ original relative order preserved.
    expect(sortPlayersByJoinedAt(players).map((p) => p.id)).toEqual(["b", "a"]);
  });
});
