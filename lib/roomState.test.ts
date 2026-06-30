import { describe, expect, it } from "vitest";

import {
  didRoundReset,
  didRoundReveal,
  shouldRestoreVote,
} from "./roomState";

/**
 * Tests for the requirement: when a user disconnects and rejoins they must
 * adopt the current admin state — cards revealed, or a new vote round the
 * admin started while they were away — and must not resurrect a stale vote.
 */

describe("didRoundReveal", () => {
  it("is true only on a hidden → revealed transition", () => {
    expect(didRoundReveal({ revealed: false }, { revealed: true })).toBe(true);
  });

  it("is false when already revealed, still hidden, or on reset", () => {
    expect(didRoundReveal({ revealed: true }, { revealed: true })).toBe(false);
    expect(didRoundReveal({ revealed: false }, { revealed: false })).toBe(false);
    expect(didRoundReveal({ revealed: true }, { revealed: false })).toBe(false);
  });

  it("is false on first observation (no previous state)", () => {
    expect(didRoundReveal(null, { revealed: true })).toBe(false);
  });
});

describe("didRoundReset", () => {
  it("is true only on a revealed → hidden transition (admin started a new vote)", () => {
    expect(didRoundReset({ revealed: true }, { revealed: false })).toBe(true);
  });

  it("is false otherwise and on first observation", () => {
    expect(didRoundReset({ revealed: false }, { revealed: true })).toBe(false);
    expect(didRoundReset({ revealed: true }, { revealed: true })).toBe(false);
    expect(didRoundReset({ revealed: false }, { revealed: false })).toBe(false);
    expect(didRoundReset(null, { revealed: false })).toBe(false);
  });
});

describe("shouldRestoreVote", () => {
  it("restores a held vote when the id and round are unchanged", () => {
    expect(
      shouldRestoreVote({ hasExistingId: true, sameRound: true, vote: "5" }),
    ).toBe(true);
  });

  it("does NOT restore once the round advanced (a reset happened while away)", () => {
    expect(
      shouldRestoreVote({ hasExistingId: true, sameRound: false, vote: "5" }),
    ).toBe(false);
  });

  it("does NOT restore for a brand-new seat (no existing id)", () => {
    expect(
      shouldRestoreVote({ hasExistingId: false, sameRound: true, vote: "5" }),
    ).toBe(false);
  });

  it("does NOT restore when there was no vote to carry", () => {
    expect(
      shouldRestoreVote({ hasExistingId: true, sameRound: true, vote: null }),
    ).toBe(false);
  });
});

describe("rejoin after a missed reset (the reported scenario)", () => {
  it("a reconnect that bumped the round drops the stale vote", () => {
    // Before dropping, the player had voted "8" in round 0.
    const capturedRound = 0;
    const capturedVote = "8";

    // While disconnected the admin revealed then reset (new round). The
    // reconnect reconcile bumps the local round counter to invalidate any
    // restorable vote — so the live counter no longer matches what we captured.
    const liveRoundAfterReconnect = capturedRound + 1;
    const sameRound = liveRoundAfterReconnect === capturedRound;

    expect(sameRound).toBe(false);
    expect(
      shouldRestoreVote({
        hasExistingId: true,
        sameRound,
        vote: capturedVote,
      }),
    ).toBe(false); // rejoins clean into the new round, no ghost vote
  });

  it("a brief blip with no reset keeps the player's vote", () => {
    const capturedRound = 3;
    const liveRound = 3; // nothing changed while away
    expect(
      shouldRestoreVote({
        hasExistingId: true,
        sameRound: liveRound === capturedRound,
        vote: "13",
      }),
    ).toBe(true);
  });
});
