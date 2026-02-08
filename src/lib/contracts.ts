/**
 * Contract addresses and ABIs for Belief Markets.
 */
import { base, baseSepolia } from 'wagmi/chains';

export const CONTRACTS = {
  [base.id]: {
    factory: '0x0000000000000000000000000000000000000000' as `0x${string}`, // TODO: Deploy to mainnet
    vault: '0x0000000000000000000000000000000000000000' as `0x${string}`, // TODO: Deploy to mainnet
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`, // USDC on Base
  },
  [baseSepolia.id]: {
    factory: '0x789a11Ced3D407aD7CE4ADf1f7bFAf270b470773' as `0x${string}`,
    vault: '0xa9dd8F720197fED811b746154Ac696B2320756e6' as `0x${string}`,
    usdc: '0xEfA0e737B993Ae32DCB7c1c5C6878D25EE246cc4' as `0x${string}`, // Mock USDC on Base Sepolia
  },
} as const;

// Default chain for development
export const DEFAULT_CHAIN_ID = baseSepolia.id;

// Stake limits (in USDC, 6 decimals)
export const MIN_STAKE = 5_000_000n; // $5 USDC
export const MAX_STAKE = 100_000_000n; // $100 USDC
export const MIN_STAKE_DISPLAY = 5;
export const MAX_STAKE_DISPLAY = 100;

export const BELIEF_FACTORY_ABI = [
  {
    type: 'function',
    name: 'getMarket',
    inputs: [{ name: 'postId', type: 'bytes32' }],
    outputs: [{ name: 'market', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'marketExists',
    inputs: [{ name: 'postId', type: 'bytes32' }],
    outputs: [{ name: 'exists', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'createMarket',
    inputs: [
      { name: 'postId', type: 'bytes32' },
      { name: 'initialCommitment', type: 'uint256' },
      { name: 'initialSide', type: 'uint8' },
    ],
    outputs: [{ name: 'market', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getDefaultParams',
    inputs: [],
    outputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'lockPeriod', type: 'uint32' },
          { name: 'minRewardDuration', type: 'uint32' },
          { name: 'lateEntryFeeBaseBps', type: 'uint16' },
          { name: 'lateEntryFeeMaxBps', type: 'uint16' },
          { name: 'lateEntryFeeScale', type: 'uint64' },
          { name: 'authorPremiumBps', type: 'uint16' },
          { name: 'earlyWithdrawPenaltyBps', type: 'uint16' },
          { name: 'yieldBearingEscrow', type: 'bool' },
          { name: 'minStake', type: 'uint64' },
          { name: 'maxStake', type: 'uint64' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'MarketCreated',
    inputs: [
      { name: 'postId', type: 'bytes32', indexed: true },
      { name: 'market', type: 'address', indexed: false },
      { name: 'author', type: 'address', indexed: true },
    ],
  },
] as const;

export const BELIEF_MARKET_ABI = [
  // Read functions
  {
    type: 'function',
    name: 'belief',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getMarketState',
    inputs: [],
    outputs: [
      {
        name: 'state',
        type: 'tuple',
        components: [
          { name: 'belief', type: 'uint256' },
          { name: 'supportWeight', type: 'uint256' },
          { name: 'opposeWeight', type: 'uint256' },
          { name: 'supportPrincipal', type: 'uint256' },
          { name: 'opposePrincipal', type: 'uint256' },
          { name: 'srpBalance', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getMarketParams',
    inputs: [],
    outputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'lockPeriod', type: 'uint32' },
          { name: 'minRewardDuration', type: 'uint32' },
          { name: 'lateEntryFeeBaseBps', type: 'uint16' },
          { name: 'lateEntryFeeMaxBps', type: 'uint16' },
          { name: 'lateEntryFeeScale', type: 'uint64' },
          { name: 'authorPremiumBps', type: 'uint16' },
          { name: 'earlyWithdrawPenaltyBps', type: 'uint16' },
          { name: 'yieldBearingEscrow', type: 'bool' },
          { name: 'minStake', type: 'uint64' },
          { name: 'maxStake', type: 'uint64' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPosition',
    inputs: [{ name: 'positionId', type: 'uint256' }],
    outputs: [
      {
        name: 'position',
        type: 'tuple',
        components: [
          { name: 'side', type: 'uint8' },
          { name: 'withdrawn', type: 'bool' },
          { name: 'depositTimestamp', type: 'uint48' },
          { name: 'unlockTimestamp', type: 'uint48' },
          { name: 'amount', type: 'uint256' },
          { name: 'claimedRewards', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getUserPositions',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: 'positionIds', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'pendingRewards',
    inputs: [{ name: 'positionId', type: 'uint256' }],
    outputs: [{ name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'postId',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
  },
  // Write functions
  {
    type: 'function',
    name: 'commitSupport',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [{ name: 'positionId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'commitOppose',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [{ name: 'positionId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [{ name: 'positionId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimRewards',
    inputs: [{ name: 'positionId', type: 'uint256' }],
    outputs: [{ name: 'amount', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'Committed',
    inputs: [
      { name: 'positionId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'side', type: 'uint8', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'unlockTimestamp', type: 'uint48', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Withdrawn',
    inputs: [
      { name: 'positionId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'EarlyWithdrawn',
    inputs: [
      { name: 'positionId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'returnAmount', type: 'uint256', indexed: false },
      { name: 'penalty', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'RewardsClaimed',
    inputs: [
      { name: 'positionId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;

// ERC20 ABI for USDC approval
export const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

// Type definitions
export enum Side {
  Support = 0,
  Oppose = 1,
}

export interface MarketParams {
  lockPeriod: number;
  minRewardDuration: number;
  lateEntryFeeBaseBps: number;
  lateEntryFeeMaxBps: number;
  lateEntryFeeScale: bigint;
  authorPremiumBps: number;
  earlyWithdrawPenaltyBps: number;
  yieldBearingEscrow: boolean;
  minStake: bigint;
  maxStake: bigint;
}

export interface MarketState {
  belief: bigint;
  supportWeight: bigint;
  opposeWeight: bigint;
  supportPrincipal: bigint;
  opposePrincipal: bigint;
  srpBalance: bigint;
}

export interface Position {
  side: Side;
  withdrawn: boolean;
  depositTimestamp: number;
  unlockTimestamp: number;
  amount: bigint;
  claimedRewards: bigint;
}

// Helper to determine market status from state
export type MarketStatus = 'no_market' | 'unchallenged' | 'contested';

export function getMarketStatus(state: MarketState | null): MarketStatus {
  if (!state) return 'no_market';
  if (state.opposePrincipal === 0n) return 'unchallenged';
  return 'contested';
}

// Format belief as percentage (0-100)
export function formatBelief(belief: bigint): number {
  return Number(belief * 100n / BigInt(1e18));
}

// Format USDC amount (6 decimals)
export function formatUSDC(amount: bigint): string {
  const num = Number(amount) / 1e6;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Parse USDC input to bigint
export function parseUSDC(amount: string): bigint {
  const num = parseFloat(amount);
  if (isNaN(num) || num < 0) return 0n;
  return BigInt(Math.floor(num * 1e6));
}

// Format basis points as percentage string, e.g. 500 → "5%", 250 → "2.5%"
export function formatBps(bps: number): string {
  const pct = bps / 100;
  return pct % 1 === 0 ? `${pct}%` : `${pct}%`;
}

// Format lock period seconds as human-readable duration, e.g. 2592000 → "30 days"
export function formatLockPeriod(seconds: number): string {
  const days = seconds / 86400;
  if (days >= 1 && days % 1 === 0) return `${days} day${days === 1 ? '' : 's'}`;
  const hours = seconds / 3600;
  if (hours >= 1 && hours % 1 === 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
  return `${seconds} seconds`;
}
