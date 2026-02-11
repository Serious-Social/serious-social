/**
 * Hook for sending transactions using the Farcaster miniapp SDK's ethereum provider.
 * Uses sdk.wallet.getEthereumProvider() (async, recommended) with chain detection and timeout.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
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

// Timeout for wallet prompt (30 seconds)
const WALLET_PROMPT_TIMEOUT = 30_000;

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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
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
      // Use async getEthereumProvider() which checks capabilities first
      console.log('[useFarcasterTransaction] Getting ethereum provider...');
      const provider = await sdk.wallet.getEthereumProvider();

      if (!provider) {
        throw new Error('Wallet not available. Please open this app in Farcaster.');
      }

      // Check current chain and attempt switch if needed
      try {
        const currentChainHex = await provider.request({ method: 'eth_chainId' }) as string;
        const currentChainId = parseInt(currentChainHex, 16);
        console.log('[useFarcasterTransaction] Current chain:', currentChainId, 'Target:', DEFAULT_CHAIN_ID);

        if (currentChainId !== DEFAULT_CHAIN_ID) {
          console.log('[useFarcasterTransaction] Switching chain...');
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${DEFAULT_CHAIN_ID.toString(16)}` }],
          });
        }
      } catch (switchError) {
        console.warn('[useFarcasterTransaction] Chain switch failed:', switchError);
        throw new Error(
          `Your wallet does not support Base Sepolia (chain ${DEFAULT_CHAIN_ID}). ` +
          `Transactions require a wallet that supports this network.`
        );
      }

      // Get accounts
      let accounts = await provider.request({ method: 'eth_accounts' }) as string[];

      if (!accounts || accounts.length === 0) {
        accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts available. Please connect your wallet.');
        }
      }

      const from = accounts[0] as `0x${string}`;

      // Build clean tx params (no undefined values - some mobile providers choke on them)
      const txParams: Record<string, string> = {
        from,
        to: params.to,
        data: params.data,
      };
      if (params.value) {
        txParams.value = `0x${params.value.toString(16)}`;
      }

      console.log('[useFarcasterTransaction] Sending transaction:', {
        from,
        to: params.to,
        data: params.data.slice(0, 20) + '...',
      });

      // Send transaction with timeout to prevent indefinite hang
      const hash = await Promise.race([
        provider.request({
          method: 'eth_sendTransaction',
          params: [txParams],
        }),
        new Promise<never>((_, reject) => {
          timeoutRef.current = setTimeout(() => {
            reject(new Error(
              'Transaction timed out waiting for wallet approval. ' +
              'Your wallet may not support this network. Please try again.'
            ));
          }, WALLET_PROMPT_TIMEOUT);
        }),
      ]) as Hash;

      // Clear timeout on success
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      console.log('[useFarcasterTransaction] Transaction hash received:', hash);

      setState(prev => ({ ...prev, hash, isPending: false, isConfirming: true }));

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      console.log('[useFarcasterTransaction] Transaction confirmed:', receipt);

      setState(prev => ({ ...prev, isConfirming: false, isSuccess: true }));

      return hash;
    } catch (error) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
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

  const createMarket = useCallback(async (postId: `0x${string}`, initialCommitment: bigint, initialSide: number) => {
    const data = encodeFunctionData({
      abi: BELIEF_FACTORY_ABI,
      functionName: 'createMarket',
      args: [postId, initialCommitment, initialSide],
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
