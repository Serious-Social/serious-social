import { type MarketState } from '../chain/abi';

export enum PersonalityType {
  EarlyMover = 'early_mover',
  Bandwagon = 'bandwagon',
  Contrarian = 'contrarian',
  Whale = 'whale',
  Cautious = 'cautious',
  Random = 'random',
}

export interface BotConfig {
  id: number;
  name: string;
  personality: PersonalityType;
  fakeFid: number;
  walletIndex: number;
}

export interface PositionRecord {
  postId: string;
  marketAddress: `0x${string}`;
  positionId: bigint;
  side: 0 | 1;
  amount: bigint;
  entryTick: number;
}

export interface BotState {
  positions: Map<string, PositionRecord[]>; // postId -> positions
  totalStaked: bigint;
  totalWithdrawn: bigint;
  totalRewardsClaimed: bigint;
  lastActionTick: number;
  marketsCreated: number;
}

export interface MarketView {
  postId: string;
  address: `0x${string}`;
  state: MarketState;
  age: number;         // ticks since creation
  participantCount: number;
  createdByBot: number | null; // bot id that created it, if known
}

export type BotAction =
  | { type: 'create_market'; postId: string; castHash: string; title: string; amount: bigint; side: 0 | 1 }
  | { type: 'commit'; postId: string; marketAddress: `0x${string}`; amount: bigint; side: 0 | 1 }
  | { type: 'withdraw'; postId: string; marketAddress: `0x${string}`; positionId: bigint }
  | { type: 'claim_rewards'; postId: string; marketAddress: `0x${string}`; positionId: bigint }
  | { type: 'skip'; reason: string };

export interface BotStrategy {
  decide(
    botState: BotState,
    botConfig: BotConfig,
    activeMarkets: MarketView[],
    pendingTopics: Array<{ postId: string; castHash: string; title: string }>,
    tick: number,
  ): BotAction;
}

/** Utility: random int in [min, max] inclusive */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Utility: random bigint USDC amount in [$min, $max] */
export function randUSDC(minDollars: number, maxDollars: number): bigint {
  const dollars = minDollars + Math.random() * (maxDollars - minDollars);
  return BigInt(Math.floor(dollars * 1e6));
}

/** Utility: random boolean with given probability */
export function chance(probability: number): boolean {
  return Math.random() < probability;
}

/** Utility: get belief as 0-100 percentage */
export function beliefPct(belief: bigint): number {
  return Number(belief * 100n / BigInt(1e18));
}

/** Utility: pick random element from array */
export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Check if bot already has a position in this market */
export function hasPosition(state: BotState, postId: string): boolean {
  const positions = state.positions.get(postId);
  return !!positions && positions.length > 0;
}
