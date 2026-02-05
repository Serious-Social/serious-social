/**
 * Write hooks for Belief Market transactions.
 * Uses Farcaster SDK's ethProvider directly to bypass wagmi connector rehydration issues.
 * Read hooks still use wagmi's useReadContract (reads don't need a connector).
 */
import { useReadContract, useAccount } from 'wagmi';
import { maxUint256 } from 'viem';
import {
  CONTRACTS,
  ERC20_ABI,
  DEFAULT_CHAIN_ID,
  Side,
} from '~/lib/contracts';
import {
  useFarcasterApproveUSDC,
  useFarcasterCommitSupport,
  useFarcasterCommitOppose,
  useFarcasterCreateMarket,
} from './useFarcasterTransaction';

const chainId = DEFAULT_CHAIN_ID;

/**
 * Hook to check USDC allowance for the BeliefVault (used by both commit and create flows).
 */
export function useVaultAllowance() {
  const { address: userAddress } = useAccount();
  const vaultAddress = CONTRACTS[chainId].vault;

  const { data: allowance, refetch } = useReadContract({
    address: CONTRACTS[chainId].usdc,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress ? [userAddress, vaultAddress] : undefined,
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
 * Hook to commit to support side.
 */
function useCommitSupport(marketAddress: `0x${string}` | undefined) {
  const { commit: sdkCommit, hash, isPending, isConfirming, isSuccess, error, reset } = useFarcasterCommitSupport();

  const commit = (amount: bigint) => {
    if (!marketAddress) return;
    sdkCommit(marketAddress, amount);
  };

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
 * Hook to commit to oppose side.
 */
function useCommitOppose(marketAddress: `0x${string}` | undefined) {
  const { commit: sdkCommit, hash, isPending, isConfirming, isSuccess, error, reset } = useFarcasterCommitOppose();

  const commit = (amount: bigint) => {
    if (!marketAddress) return;
    sdkCommit(marketAddress, amount);
  };

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
 * Combined hook for the full commit flow (approve + commit).
 */
export function useCommitFlow(marketAddress: `0x${string}` | undefined, side: Side) {
  const { allowance, refetch: refetchAllowance } = useVaultAllowance();
  const { balance } = useUSDCBalance();
  const approveHook = useFarcasterApproveUSDC();
  const supportHook = useCommitSupport(marketAddress);
  const opposeHook = useCommitOppose(marketAddress);

  const vaultAddress = CONTRACTS[chainId].vault;
  const commitHook = side === Side.Support ? supportHook : opposeHook;

  const needsApproval = (amount: bigint) => {
    if (!allowance) return true;
    return allowance < amount;
  };

  const hasBalance = (amount: bigint) => {
    if (!balance) return false;
    return balance >= amount;
  };

  const approve = () => {
    approveHook.approve(vaultAddress, maxUint256);
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
    approve,
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
 * Combined hook for the full market creation flow (approve + create).
 */
export function useCreateMarketFlow() {
  const { allowance, refetch: refetchAllowance } = useVaultAllowance();
  const { balance } = useUSDCBalance();
  const approveHook = useFarcasterApproveUSDC();
  const createHook = useFarcasterCreateMarket();

  const vaultAddress = CONTRACTS[chainId].vault;

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

  const approveVault = () => {
    approveHook.approve(vaultAddress, maxUint256);
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
    approveVault,
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
    createError: createHook.error,
    resetCreate: createHook.reset,
  };
}
