export type DeckPreset = {
  id: string;
  label: string;
  cards: string[];
};

export const DECK_PRESETS: DeckPreset[] = [
  {
    id: "fibonacci",
    label: "Fibonacci",
    cards: ["1", "2", "3", "5", "8", "13", "21", "?"],
  },
  {
    id: "modified-fibonacci",
    label: "Modified Fibonacci",
    cards: ["0", "1/2", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?"],
  },
  {
    id: "powers-of-2",
    label: "Powers of 2",
    cards: ["1", "2", "4", "8", "16", "32", "?"],
  },
  {
    id: "tshirt",
    label: "T-Shirt sizes",
    cards: ["XS", "S", "M", "L", "XL", "XXL", "?"],
  },
];

export const DEFAULT_DECK: string[] = DECK_PRESETS[0].cards;

const NON_NUMERIC = new Set(["?", "XS", "S", "M", "L", "XL", "XXL", "☕"]);

export function isNumericVote(v: string | null | undefined): boolean {
  if (!v) return false;
  if (NON_NUMERIC.has(v)) return false;

  if (v.includes("/")) {
    const [a, b] = v.split("/").map(Number);
    return Number.isFinite(a) && Number.isFinite(b) && b !== 0;
  }
  return Number.isFinite(Number(v));
}

export function voteToNumber(v: string): number {
  if (v.includes("/")) {
    const [a, b] = v.split("/").map(Number);
    return a / b;
  }
  return Number(v);
}

export function average(votes: (string | null | undefined)[]): number | null {
  const nums = votes.filter(isNumericVote).map((v) => voteToNumber(v as string));
  if (nums.length === 0) return null;
  const sum = nums.reduce((acc, n) => acc + n, 0);
  return sum / nums.length;
}

export type Suit = "spade" | "heart" | "diamond" | "club";

export const SUIT_GLYPH: Record<Suit, string> = {
  spade: "\u2660",
  heart: "\u2665",
  diamond: "\u2666",
  club: "\u2663",
};

const SUIT_ORDER: Suit[] = ["spade", "heart", "diamond", "club"];

/**
 * Deterministically pick a classic playing-card suit for a given vote value.
 * Same value always renders with the same suit so a player's card has a stable
 * identity round-to-round.
 */
export function suitFor(value: string): Suit {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return SUIT_ORDER[h % SUIT_ORDER.length];
}

export function isRedSuit(suit: Suit): boolean {
  return suit === "heart" || suit === "diamond";
}
