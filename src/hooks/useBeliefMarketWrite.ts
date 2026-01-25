/**
 * Write hooks for Belief Market transactions.
 * Uses useSendTransaction for better compatibility with Farcaster frame connector.
 */
import { useSendTransaction, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { encodeFunctionData } from 'viem';
import {
  CONTRACTS,
  BELIEF_FACTORY_ABI,
  BELIEF_MARKET_ABI,
  ERC20_ABI,
  DEFAULT_CHAIN_ID,
  Side,
} from '~/lib/contracts';

const chainId = DEFAULT_CHAIN_ID;

/**
 * Hook to check and manage USDC allowance for a market.
 */
export function useUSDCAllowance(marketAddress: `0x${string}` | undefined) {
  const { address: userAddress } = useAccount();

  const { data: allowance, refetch } = useReadContract({
    address: CONTRACTS[chainId].usdc,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress && marketAddress ? [userAddress, marketAddress] : undefined,
    chainId,
    query: {
      enabled: !!userAddress && !!marketAddress,
    },
  });

  return {
    allowance: allowance as bigint | undefined,
    refetch,
  };
}

/**
 * Hook to get user's USDC balance.
 */
export function useUSDCBalance() {
  const { address: userAddress } = useAccount();

  const { data: balance, refetch } = useReadContract({
    address: CONTRACTS[chainId].usdc,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    chainId,
    query: {
      enabled: !!userAddress,
    },
  });

  return {
    balance: balance as bigint | undefined,
    refetch,
  };
}

/**
 * Hook to approve USDC spending.
 */
export function useApproveUSDC() {
  const { sendTransaction, data: hash, isPending, error, reset } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const approve = (spender: `0x${string}`, amount: bigint) => {
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, amount],
    });

    console.log('[useApproveUSDC] Sending approval transaction:', {
      to: CONTRACTS[chainId].usdc,
      spender,
      amount: amount.toString(),
    });

    sendTransaction(
      {
        to: CONTRACTS[chainId].usdc,
        data,
      },
      {
        onSuccess: (hash) => {
          console.log('[useApproveUSDC] Transaction submitted:', hash);
        },
        onError: (err) => {
          console.error('[useApproveUSDC] Transaction error:', err);
        },
      }
    );
  };

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
 * Hook to commit to support side.
 */
export function useCommitSupport(marketAddress: `0x${string}` | undefined) {
  const { sendTransaction, data: hash, isPending, error, reset } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const commit = (amount: bigint) => {
    if (!marketAddress) return;
    const data = encodeFunctionData({
      abi: BELIEF_MARKET_ABI,
      functionName: 'commitSupport',
      args: [amount],
    });

    sendTransaction({
      to: marketAddress,
      data,
    });
  };

  return {
    commit,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
    reset,
  };
}

/**
 * Hook to commit to oppose side.
 */
export function useCommitOppose(marketAddress: `0x${string}` | undefined) {
  const { sendTransaction, data: hash, isPending, error, reset } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const commit = (amount: bigint) => {
    if (!marketAddress) return;
    const data = encodeFunctionData({
      abi: BELIEF_MARKET_ABI,
      functionName: 'commitOppose',
      args: [amount],
    });

    sendTransaction({
      to: marketAddress,
      data,
    });
  };

  return {
    commit,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
    reset,
  };
}

/**
 * Combined hook for the full commit flow (approve + commit).
 */
export function useCommitFlow(marketAddress: `0x${string}` | undefined, side: Side) {
  const { allowance, refetch: refetchAllowance } = useUSDCAllowance(marketAddress);
  const { balance } = useUSDCBalance();
  const approveHook = useApproveUSDC();
  const supportHook = useCommitSupport(marketAddress);
  const opposeHook = useCommitOppose(marketAddress);

  const commitHook = side === Side.Support ? supportHook : opposeHook;

  const needsApproval = (amount: bigint) => {
    if (!allowance) return true;
    return allowance < amount;
  };

  const hasBalance = (amount: bigint) => {
    if (!balance) return false;
    return balance >= amount;
  };

  return {
    // Allowance
    allowance,
    needsApproval,
    refetchAllowance,
    // Balance
    balance,
    hasBalance,
    // Approve
    approve: approveHook.approve,
    approveHash: approveHook.hash,
    isApproving: approveHook.isPending,
    isApproveConfirming: approveHook.isConfirming,
    isApproveSuccess: approveHook.isSuccess,
    approveError: approveHook.error,
    resetApprove: approveHook.reset,
    // Commit
    commit: commitHook.commit,
    commitHash: commitHook.hash,
    isCommitting: commitHook.isPending,
    isCommitConfirming: commitHook.isConfirming,
    isCommitSuccess: commitHook.isSuccess,
    commitError: commitHook.error,
    resetCommit: commitHook.reset,
  };
}

/*//////////////////////////////////////////////////////////////
                        FACTORY HOOKS
//////////////////////////////////////////////////////////////*/

/**
 * Hook to check USDC allowance for the factory (for market creation).
 */
export function useFactoryAllowance() {
  const { address: userAddress } = useAccount();
  const factoryAddress = CONTRACTS[chainId].factory;

  const { data: allowance, refetch } = useReadContract({
    address: CONTRACTS[chainId].usdc,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress ? [userAddress, factoryAddress] : undefined,
    chainId,
    query: {
      enabled: !!userAddress,
    },
  });

  return {
    allowance: allowance as bigint | undefined,
    refetch,
  };
}

/**
 * Hook to create a new belief market.
 */
export function useCreateMarket() {
  const { sendTransaction, data: hash, isPending, error, reset } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const createMarket = (postId: `0x${string}`, initialCommitment: bigint) => {
    const data = encodeFunctionData({
      abi: BELIEF_FACTORY_ABI,
      functionName: 'createMarket',
      args: [postId, initialCommitment],
    });

    console.log('[useCreateMarket] Creating market:', {
      to: CONTRACTS[chainId].factory,
      postId,
      initialCommitment: initialCommitment.toString(),
    });

    sendTransaction(
      {
        to: CONTRACTS[chainId].factory,
        data,
      },
      {
        onSuccess: (hash) => {
          console.log('[useCreateMarket] Transaction submitted:', hash);
        },
        onError: (err) => {
          console.error('[useCreateMarket] Transaction error:', err);
        },
      }
    );
  };

  return {
    createMarket,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
    reset,
  };
}

/**
 * Combined hook for the full market creation flow (approve + create).
 */
export function useCreateMarketFlow() {
  const { allowance, refetch: refetchAllowance } = useFactoryAllowance();
  const { balance } = useUSDCBalance();
  const approveHook = useApproveUSDC();
  const createHook = useCreateMarket();

  const factoryAddress = CONTRACTS[chainId].factory;

  const needsApproval = (amount: bigint) => {
    if (amount === 0n) return false;
    if (!allowance) return true;
    return allowance < amount;
  };

  const hasBalance = (amount: bigint) => {
    if (amount === 0n) return true;
    if (!balance) return false;
    return balance >= amount;
  };

  const approveFactory = (amount: bigint) => {
    approveHook.approve(factoryAddress, amount);
  };

  return {
    // Allowance
    allowance,
    needsApproval,
    refetchAllowance,
    // Balance
    balance,
    hasBalance,
    // Approve
    approveFactory,
    approveHash: approveHook.hash,
    isApproving: approveHook.isPending,
    isApproveConfirming: approveHook.isConfirming,
    isApproveSuccess: approveHook.isSuccess,
    approveError: approveHook.error,
    resetApprove: approveHook.reset,
    // Create
    createMarket: createHook.createMarket,
    createHash: createHook.hash,
    isCreating: createHook.isPending,
    isCreateConfirming: createHook.isConfirming,
    isCreateSuccess: createHook.isSuccess,
    createReceipt: createHook.receipt,
    createError: createHook.error,
    resetCreate: createHook.reset,
  };
}
