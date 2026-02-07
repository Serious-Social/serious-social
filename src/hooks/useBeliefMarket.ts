/**
 * Hooks for interacting with Belief Markets.
 */
import { useReadContract, useReadContracts, useAccount } from 'wagmi';
import {
  CONTRACTS,
  BELIEF_FACTORY_ABI,
  BELIEF_MARKET_ABI,
  DEFAULT_CHAIN_ID,
  MarketParams,
  MarketState,
  Position,
  Side,
} from '~/lib/contracts';

const chainId = DEFAULT_CHAIN_ID;

/**
 * Get the market address for a postId.
 */
export function useMarketAddress(postId: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACTS[chainId].factory,
    abi: BELIEF_FACTORY_ABI,
    functionName: 'getMarket',
    args: postId ? [postId] : undefined,
    chainId,
    query: {
      enabled: !!postId,
    },
  });
}

/**
 * Check if a market exists for a postId.
 */
export function useMarketExists(postId: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACTS[chainId].factory,
    abi: BELIEF_FACTORY_ABI,
    functionName: 'marketExists',
    args: postId ? [postId] : undefined,
    chainId,
    query: {
      enabled: !!postId,
    },
  });
}

/**
 * Get factory default params (for pages without a specific market).
 */
export function useDefaultParams() {
  const result = useReadContract({
    address: CONTRACTS[chainId].factory,
    abi: BELIEF_FACTORY_ABI,
    functionName: 'getDefaultParams',
    chainId,
  });

  const params: MarketParams | undefined = result.data
    ? {
        lockPeriod: Number(result.data.lockPeriod),
        minRewardDuration: Number(result.data.minRewardDuration),
        lateEntryFeeBaseBps: Number(result.data.lateEntryFeeBaseBps),
        lateEntryFeeMaxBps: Number(result.data.lateEntryFeeMaxBps),
        lateEntryFeeScale: BigInt(result.data.lateEntryFeeScale),
        authorPremiumBps: Number(result.data.authorPremiumBps),
        earlyWithdrawPenaltyBps: Number(result.data.earlyWithdrawPenaltyBps),
        yieldBearingEscrow: result.data.yieldBearingEscrow,
        minStake: BigInt(result.data.minStake),
        maxStake: BigInt(result.data.maxStake),
      }
    : undefined;

  return {
    ...result,
    data: params,
  };
}

/**
 * Get the full market state for a market address.
 */
export function useMarketState(marketAddress: `0x${string}` | undefined) {
  const result = useReadContract({
    address: marketAddress,
    abi: BELIEF_MARKET_ABI,
    functionName: 'getMarketState',
    chainId,
    query: {
      enabled: !!marketAddress && marketAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  // Transform the tuple to our typed interface
  const state: MarketState | undefined = result.data
    ? {
        belief: result.data.belief,
        supportWeight: result.data.supportWeight,
        opposeWeight: result.data.opposeWeight,
        supportPrincipal: result.data.supportPrincipal,
        opposePrincipal: result.data.opposePrincipal,
        srpBalance: result.data.srpBalance,
      }
    : undefined;

  return {
    ...result,
    data: state,
  };
}

/**
 * Combined hook: Get market state by postId.
 * First resolves postId -> market address, then fetches state.
 */
export function useBeliefMarket(postId: `0x${string}` | undefined) {
  const { data: marketAddress, isLoading: addressLoading, error: addressError } = useMarketAddress(postId);
  const { data: state, isLoading: stateLoading, error: stateError, refetch } = useMarketState(marketAddress as `0x${string}` | undefined);

  const isLoading = addressLoading || stateLoading;
  const error = addressError || stateError;
  const marketExists = !!marketAddress && marketAddress !== '0x0000000000000000000000000000000000000000';

  return {
    marketAddress: marketExists ? marketAddress : undefined,
    marketExists,
    state,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Get user's positions in a market.
 */
export function useUserPositions(marketAddress: `0x${string}` | undefined) {
  const { address: userAddress } = useAccount();

  const { data: positionIds, isLoading, error, refetch } = useReadContract({
    address: marketAddress,
    abi: BELIEF_MARKET_ABI,
    functionName: 'getUserPositions',
    args: userAddress ? [userAddress] : undefined,
    chainId,
    query: {
      enabled: !!marketAddress && !!userAddress && marketAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  return {
    positionIds: positionIds as bigint[] | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Get details for a specific position.
 */
export function usePosition(marketAddress: `0x${string}` | undefined, positionId: bigint | undefined) {
  const result = useReadContract({
    address: marketAddress,
    abi: BELIEF_MARKET_ABI,
    functionName: 'getPosition',
    args: positionId !== undefined ? [positionId] : undefined,
    chainId,
    query: {
      enabled: !!marketAddress && positionId !== undefined,
    },
  });

  const position: Position | undefined = result.data
    ? {
        side: result.data.side as Side,
        withdrawn: result.data.withdrawn,
        depositTimestamp: Number(result.data.depositTimestamp),
        unlockTimestamp: Number(result.data.unlockTimestamp),
        amount: result.data.amount,
        claimedRewards: result.data.claimedRewards,
      }
    : undefined;

  return {
    ...result,
    data: position,
  };
}

/**
 * Get pending rewards for a position.
 */
export function usePendingRewards(marketAddress: `0x${string}` | undefined, positionId: bigint | undefined) {
  return useReadContract({
    address: marketAddress,
    abi: BELIEF_MARKET_ABI,
    functionName: 'pendingRewards',
    args: positionId !== undefined ? [positionId] : undefined,
    chainId,
    query: {
      enabled: !!marketAddress && positionId !== undefined,
    },
  });
}

/**
 * Get market params (lockPeriod, minRewardDuration, etc.).
 */
export function useMarketParams(marketAddress: `0x${string}` | undefined) {
  const result = useReadContract({
    address: marketAddress,
    abi: BELIEF_MARKET_ABI,
    functionName: 'getMarketParams',
    chainId,
    query: {
      enabled: !!marketAddress && marketAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  const params: MarketParams | undefined = result.data
    ? {
        lockPeriod: Number(result.data.lockPeriod),
        minRewardDuration: Number(result.data.minRewardDuration),
        lateEntryFeeBaseBps: Number(result.data.lateEntryFeeBaseBps),
        lateEntryFeeMaxBps: Number(result.data.lateEntryFeeMaxBps),
        lateEntryFeeScale: BigInt(result.data.lateEntryFeeScale),
        authorPremiumBps: Number(result.data.authorPremiumBps),
        earlyWithdrawPenaltyBps: Number(result.data.earlyWithdrawPenaltyBps),
        yieldBearingEscrow: result.data.yieldBearingEscrow,
        minStake: BigInt(result.data.minStake),
        maxStake: BigInt(result.data.maxStake),
      }
    : undefined;

  return {
    ...result,
    data: params,
  };
}

/**
 * Get all position details for the current user in a market.
 */
export function useUserPositionDetails(marketAddress: `0x${string}` | undefined) {
  const { positionIds, isLoading: idsLoading } = useUserPositions(marketAddress);

  const contracts = (positionIds ?? []).map((id) => ({
    address: marketAddress as `0x${string}`,
    abi: BELIEF_MARKET_ABI,
    functionName: 'getPosition' as const,
    args: [id] as const,
    chainId,
  }));

  const { data, isLoading: detailsLoading, error, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: !!marketAddress && !!positionIds && positionIds.length > 0,
    },
  });

  const positions: (Position & { id: bigint })[] = [];
  if (data && positionIds) {
    for (let i = 0; i < data.length; i++) {
      const result = data[i];
      if (result.status === 'success' && result.result) {
        const pos = result.result;
        positions.push({
          id: positionIds[i],
          side: pos.side as Side,
          withdrawn: pos.withdrawn,
          depositTimestamp: Number(pos.depositTimestamp),
          unlockTimestamp: Number(pos.unlockTimestamp),
          amount: pos.amount,
          claimedRewards: pos.claimedRewards,
        });
      }
    }
  }

  return {
    positions,
    isLoading: idsLoading || detailsLoading,
    error,
    refetch,
  };
}
