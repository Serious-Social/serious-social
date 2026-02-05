/**
 * Hook for sending transactions using the Farcaster miniapp SDK's ethProvider directly.
 * This bypasses the wagmi connector which has compatibility issues.
 */
import { useState, useCallback } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { encodeFunctionData, createPublicClient, http, type Hash } from 'viem';
import { baseSepolia } from 'viem/chains';
import {
  CONTRACTS,
  BELIEF_FACTORY_ABI,
  BELIEF_MARKET_ABI,
  ERC20_ABI,
  DEFAULT_CHAIN_ID,
} from '~/lib/contracts';

const chainId = DEFAULT_CHAIN_ID;

// Public client for reading transaction receipts
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

interface TransactionState {
  hash: Hash | null;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
}

/**
 * Hook to send transactions using the Farcaster SDK's ethereum provider.
 */
export function useFarcasterTransaction() {
  const [state, setState] = useState<TransactionState>({
    hash: null,
    isPending: false,
    isConfirming: false,
    isSuccess: false,
    error: null,
  });

  const reset = useCallback(() => {
    setState({
      hash: null,
      isPending: false,
      isConfirming: false,
      isSuccess: false,
      error: null,
    });
  }, []);

  const sendTransaction = useCallback(async (params: {
    to: `0x${string}`;
    data: `0x${string}`;
    value?: bigint;
  }) => {
    console.log('[useFarcasterTransaction] Starting transaction...');
    setState(prev => ({ ...prev, isPending: true, error: null }));

    try {
      // Get the ethereum provider from the SDK
      console.log('[useFarcasterTransaction] Getting ethProvider from SDK...');
      console.log('[useFarcasterTransaction] sdk.wallet:', sdk.wallet);
      const provider = sdk.wallet.ethProvider;

      console.log('[useFarcasterTransaction] Provider:', provider);
      console.log('[useFarcasterTransaction] Provider type:', typeof provider);

      if (!provider) {
        throw new Error('Ethereum provider not available - sdk.wallet.ethProvider is null/undefined');
      }

      // Get accounts
      console.log('[useFarcasterTransaction] Requesting eth_accounts...');
      const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
      console.log('[useFarcasterTransaction] Accounts:', accounts);

      if (!accounts || accounts.length === 0) {
        // Request accounts if not connected
        console.log('[useFarcasterTransaction] No accounts, requesting eth_requestAccounts...');
        const requestedAccounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
        console.log('[useFarcasterTransaction] Requested accounts:', requestedAccounts);
        if (!requestedAccounts || requestedAccounts.length === 0) {
          throw new Error('No accounts available after eth_requestAccounts');
        }
      }

      const from = (await provider.request({ method: 'eth_accounts' }) as string[])[0];

      console.log('[useFarcasterTransaction] Sending transaction:', {
        from,
        to: params.to,
        data: params.data.slice(0, 20) + '...',
      });

      // Send the transaction
      console.log('[useFarcasterTransaction] Calling eth_sendTransaction...');
      const txParams = {
        from: from as `0x${string}`,
        to: params.to,
        data: params.data,
        value: params.value ? `0x${params.value.toString(16)}` as `0x${string}` : undefined,
      };
      console.log('[useFarcasterTransaction] TX params:', txParams);

      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      }) as Hash;

      console.log('[useFarcasterTransaction] Transaction hash received:', hash);

      setState(prev => ({ ...prev, hash, isPending: false, isConfirming: true }));

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      console.log('[useFarcasterTransaction] Transaction confirmed:', receipt);

      setState(prev => ({ ...prev, isConfirming: false, isSuccess: true }));

      return hash;
    } catch (error) {
      console.error('[useFarcasterTransaction] Error:', error);
      setState(prev => ({
        ...prev,
        isPending: false,
        isConfirming: false,
        error: error instanceof Error ? error : new Error(String(error)),
      }));
      throw error;
    }
  }, []);

  return {
    sendTransaction,
    ...state,
    reset,
  };
}

/**
 * Hook to approve USDC using the Farcaster SDK provider.
 */
export function useFarcasterApproveUSDC() {
  const { sendTransaction, hash, isPending, isConfirming, isSuccess, error, reset } = useFarcasterTransaction();

  const approve = useCallback(async (spender: `0x${string}`, amount: bigint) => {
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, amount],
    });

    return sendTransaction({
      to: CONTRACTS[chainId].usdc,
      data,
    });
  }, [sendTransaction]);

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

/**
 * Hook to create a market using the Farcaster SDK provider.
 */
export function useFarcasterCreateMarket() {
  const { sendTransaction, hash, isPending, isConfirming, isSuccess, error, reset } = useFarcasterTransaction();

  const createMarket = useCallback(async (postId: `0x${string}`, initialCommitment: bigint) => {
    const data = encodeFunctionData({
      abi: BELIEF_FACTORY_ABI,
      functionName: 'createMarket',
      args: [postId, initialCommitment],
    });

    return sendTransaction({
      to: CONTRACTS[chainId].factory,
      data,
    });
  }, [sendTransaction]);

  return {
    createMarket,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

/**
 * Hook to withdraw from a position using the Farcaster SDK provider.
 */
export function useFarcasterWithdraw() {
  const { sendTransaction, hash, isPending, isConfirming, isSuccess, error, reset } = useFarcasterTransaction();

  const withdraw = useCallback(async (marketAddress: `0x${string}`, positionId: bigint) => {
    const data = encodeFunctionData({
      abi: BELIEF_MARKET_ABI,
      functionName: 'withdraw',
      args: [positionId],
    });

    return sendTransaction({
      to: marketAddress,
      data,
    });
  }, [sendTransaction]);

  return {
    withdraw,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

/**
 * Hook to commit support using the Farcaster SDK provider.
 */
export function useFarcasterCommitSupport() {
  const { sendTransaction, hash, isPending, isConfirming, isSuccess, error, reset } = useFarcasterTransaction();

  const commit = useCallback(async (marketAddress: `0x${string}`, amount: bigint) => {
    const data = encodeFunctionData({
      abi: BELIEF_MARKET_ABI,
      functionName: 'commitSupport',
      args: [amount],
    });

    return sendTransaction({
      to: marketAddress,
      data,
    });
  }, [sendTransaction]);

  return {
    commit,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

/**
 * Hook to commit oppose using the Farcaster SDK provider.
 */
export function useFarcasterCommitOppose() {
  const { sendTransaction, hash, isPending, isConfirming, isSuccess, error, reset } = useFarcasterTransaction();

  const commit = useCallback(async (marketAddress: `0x${string}`, amount: bigint) => {
    const data = encodeFunctionData({
      abi: BELIEF_MARKET_ABI,
      functionName: 'commitOppose',
      args: [amount],
    });

    return sendTransaction({
      to: marketAddress,
      data,
    });
  }, [sendTransaction]);

  return {
    commit,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

/**
 * Hook to claim rewards from a position using the Farcaster SDK provider.
 */
export function useFarcasterClaimRewards() {
  const { sendTransaction, hash, isPending, isConfirming, isSuccess, error, reset } = useFarcasterTransaction();

  const claimRewards = useCallback(async (marketAddress: `0x${string}`, positionId: bigint) => {
    const data = encodeFunctionData({
      abi: BELIEF_MARKET_ABI,
      functionName: 'claimRewards',
      args: [positionId],
    });

    return sendTransaction({
      to: marketAddress,
      data,
    });
  }, [sendTransaction]);

  return {
    claimRewards,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}
