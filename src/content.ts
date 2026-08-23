import type { CardId, IngredientColor, Token, TokenValue } from "./types.js";

export interface BoardPosition {
  trackIndex: number;
  coins: number;
  vp: number;
  ruby: boolean;
}

const MONEY = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,15,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,30,30,31,31,32,32,33,33,35] as const;
const VP = [0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,7,7,7,8,8,8,9,9,9,10,10,10,11,11,11,12,12,12,12,13,13,13,14,14,15] as const;
const RUBIES = new Set([5,9,13,16,20,24,28,30,34,36,40,42,46,50,52]);

export const POT_TRACK: readonly BoardPosition[] = MONEY.map((coins, trackIndex) => ({
  trackIndex,
  coins,
  vp: VP[trackIndex] ?? 0,
  ruby: RUBIES.has(trackIndex),
}));

export const RAT_BOUNDARIES = [1,4,7,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48] as const;

export const PRICE_BOOK: Partial<Record<IngredientColor, Partial<Record<TokenValue, number>>>> = {
  orange: { 1: 3 },
  green: { 1: 4, 2: 8, 4: 14 },
  blue: { 1: 5, 2: 10, 4: 19 },
  red: { 1: 6, 2: 10, 4: 16 },
  yellow: { 1: 8, 2: 12, 4: 18 },
  purple: { 1: 9 },
  black: { 1: 10 },
};

export const UNLOCK_ROUND: Record<IngredientColor, number> = {
  white: 1, orange: 1, green: 1, blue: 1, red: 1, black: 1, yellow: 2, purple: 3,
};

const COMPONENTS: ReadonlyArray<readonly [IngredientColor, TokenValue, number]> = [
  ["white",1,20],["white",2,8],["white",3,4],["orange",1,22],
  ["green",1,15],["green",2,8],["green",4,13],
  ["blue",1,12],["blue",2,8],["blue",4,10],
  ["red",1,12],["red",2,8],["red",4,10],
  ["yellow",1,13],["yellow",2,8],["yellow",4,10],
  ["purple",1,17],["black",1,17],
];

export function createTokenRegistry(): { tokens: Record<string, Token>; supply: string[] } {
  const tokens: Record<string, Token> = {};
  const supply: string[] = [];
  for (const [color, value, count] of COMPONENTS) {
    for (let i = 1; i <= count; i += 1) {
      const id = `${color}-${value}-${String(i).padStart(2,"0")}`;
      tokens[id] = { id, color, value };
      supply.push(id);
    }
  }
  return { tokens, supply };
}

const FORTUNE_ROWS = [
  ["F01","Forked Remedy","IMMEDIATE"],["F02","A Fuller Pot","IMMEDIATE"],
  ["F03","A Ruby for the Poor","IMMEDIATE"],["F04","The Lightest Five","IMMEDIATE"],
  ["F05","One Fine Choice","IMMEDIATE"],["F06","Ruby Barter","IMMEDIATE"],
  ["F07","Rat Bargain","IMMEDIATE"],["F08","Gifts of Chance","IMMEDIATE"],
  ["F09","Timely Upgrade","IMMEDIATE"],["F10","Help for the Trailer","IMMEDIATE"],
  ["F11","Roomier Cauldrons","ROUND"],["F12","Rat Swarm","ROUND"],
  ["F13","Four Points or Less White","IMMEDIATE"],["F14","Rats Pay Back","IMMEDIATE"],
  ["F15","Exact Seven","ROUND"],["F16","Ruby-Space Windfall","ROUND"],
  ["F17","Brighter Rubies","ROUND"],["F18","Neighbor's Mishap","ROUND"],
  ["F19","First White Reprieve","ROUND"],["F20","Double Champion Roll","ROUND"],
  ["F21","Brew Again","ROUND"],["F22","Final Pinch","ROUND"],
  ["F23","Pumpkin Festival","ROUND"],["F24","Bottles Restored","ROUND"],
] as const;

export const FORTUNE_CARDS: ReadonlyArray<{ id: CardId; title: string; timing: "IMMEDIATE" | "ROUND" }> =
  FORTUNE_ROWS.map(([id,title,timing]) => ({ id: id as CardId, title, timing }));

export const ALL_CARD_IDS = FORTUNE_CARDS.map((card) => card.id);

export function countRatTails(fromScore: number, leadScore: number): number {
  if (fromScore >= leadScore) return 0;
  let count = 0;
  const firstLap = Math.floor(fromScore / 50) - 1;
  const lastLap = Math.floor(leadScore / 50) + 1;
  for (let lap = firstLap; lap <= lastLap; lap += 1) {
    for (const boundary of RAT_BOUNDARIES) {
      const absolute = boundary + lap * 50;
      if (fromScore <= absolute && absolute < leadScore) count += 1;
    }
  }
  return count;
}

export function supplyKey(token: Token): string {
  return `${token.color}:${token.value}`;
}
