import { type PublicClient } from 'viem';
import { BELIEF_FACTORY_ABI, BELIEF_MARKET_ABI, ERC20_ABI, type MarketState } from './abi';

export async function marketExists(
  publicClient: PublicClient,
  factoryAddress: `0x${string}`,
  postId: `0x${string}`,
): Promise<boolean> {
  return publicClient.readContract({
    address: factoryAddress,
    abi: BELIEF_FACTORY_ABI,
    functionName: 'marketExists',
    args: [postId],
  }) as Promise<boolean>;
}

export async function getMarketAddress(
  publicClient: PublicClient,
  factoryAddress: `0x${string}`,
  postId: `0x${string}`,
): Promise<`0x${string}`> {
  return publicClient.readContract({
    address: factoryAddress,
    abi: BELIEF_FACTORY_ABI,
    functionName: 'getMarket',
    args: [postId],
  }) as Promise<`0x${string}`>;
}

export async function getMarketState(
  publicClient: PublicClient,
  marketAddress: `0x${string}`,
): Promise<MarketState> {
  const result = await publicClient.readContract({
    address: marketAddress,
    abi: BELIEF_MARKET_ABI,
    functionName: 'getMarketState',
  });
  const state = result as {
    belief: bigint;
    supportWeight: bigint;
    opposeWeight: bigint;
    supportPrincipal: bigint;
    opposePrincipal: bigint;
    srpBalance: bigint;
  };
  return state;
}

export async function batchGetMarketStates(
  publicClient: PublicClient,
  markets: Array<{ postId: string; address: `0x${string}` }>,
): Promise<Map<string, MarketState>> {
  if (markets.length === 0) return new Map();

  const contracts = markets.map((m) => ({
    address: m.address,
    abi: BELIEF_MARKET_ABI,
    functionName: 'getMarketState' as const,
  }));

  const results = await publicClient.multicall({ contracts });

  const stateMap = new Map<string, MarketState>();
  for (let i = 0; i < markets.length; i++) {
    const result = results[i];
    if (result.status === 'success') {
      const state = result.result as {
        belief: bigint;
        supportWeight: bigint;
        opposeWeight: bigint;
        supportPrincipal: bigint;
        opposePrincipal: bigint;
        srpBalance: bigint;
      };
      stateMap.set(markets[i].postId, state);
    }
  }
  return stateMap;
}

export async function getUsdcBalance(
  publicClient: PublicClient,
  usdcAddress: `0x${string}`,
  account: `0x${string}`,
): Promise<bigint> {
  return publicClient.readContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account],
  }) as Promise<bigint>;
}

export async function getUserPositions(
  publicClient: PublicClient,
  marketAddress: `0x${string}`,
  userAddress: `0x${string}`,
): Promise<bigint[]> {
  return publicClient.readContract({
    address: marketAddress,
    abi: BELIEF_MARKET_ABI,
    functionName: 'getUserPositions',
    args: [userAddress],
  }) as Promise<bigint[]>;
}

export async function getPendingRewards(
  publicClient: PublicClient,
  marketAddress: `0x${string}`,
  positionId: bigint,
): Promise<bigint> {
  return publicClient.readContract({
    address: marketAddress,
    abi: BELIEF_MARKET_ABI,
    functionName: 'pendingRewards',
    args: [positionId],
  }) as Promise<bigint>;
}
