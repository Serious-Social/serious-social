/**
 * Hooks for reading SRS (Seriousness) reputation token data.
 */
import { useReadContract, useAccount } from 'wagmi';
import {
  CONTRACTS,
  BELIEF_FACTORY_ABI,
  BELIEF_MARKET_ABI,
  SRS_TOKEN_ABI,
  DEFAULT_CHAIN_ID,
} from '~/lib/contracts';

const chainId = DEFAULT_CHAIN_ID;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Get the SRS token address from the factory.
 * Returns { tokenAddress, isEnabled } — isEnabled is false when the address is zero.
 */
export function useReputationTokenAddress() {
  const result = useReadContract({
    address: CONTRACTS[chainId].factory,
    abi: BELIEF_FACTORY_ABI,
    functionName: 'reputationToken',
    chainId,
  });

  const tokenAddress = result.data as `0x${string}` | undefined;
  const isEnabled = !!tokenAddress && tokenAddress !== ZERO_ADDRESS;

  return {
    ...result,
    tokenAddress: isEnabled ? tokenAddress : undefined,
    isEnabled,
  };
}

/**
 * Get SRS balance for a given address.
 */
export function useSeriousnessBalance(address: `0x${string}` | undefined) {
  const { tokenAddress, isEnabled } = useReputationTokenAddress();

  return useReadContract({
    address: tokenAddress,
    abi: SRS_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId,
    query: {
      enabled: isEnabled && !!address,
    },
  });
}

/**
 * Get the connected user's SRS balance.
 */
export function useMyReputation() {
  const { address } = useAccount();
  return useSeriousnessBalance(address);
}

/**
 * Get pending reputation (SRS) for a specific position.
 */
export function usePendingReputation(
  marketAddress: `0x${string}` | undefined,
  positionId: bigint | undefined
) {
  return useReadContract({
    address: marketAddress,
    abi: BELIEF_MARKET_ABI,
    functionName: 'pendingReputation',
    args: positionId !== undefined ? [positionId] : undefined,
    chainId,
    query: {
      enabled: !!marketAddress && positionId !== undefined,
    },
  });
}
