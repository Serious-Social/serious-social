import { type PublicClient, type WalletClient, maxUint256, decodeEventLog } from 'viem';
import { BELIEF_FACTORY_ABI, BELIEF_MARKET_ABI, ERC20_ABI, Side } from './abi';
import { SimLogger } from '../logger';

interface TxResult {
  hash: `0x${string}`;
  success: boolean;
}

interface CreateMarketResult extends TxResult {
  marketAddress: `0x${string}`;
}

interface CommitResult extends TxResult {
  positionId: bigint;
}

export async function approveUsdc(
  walletClient: WalletClient,
  publicClient: PublicClient,
  usdcAddress: `0x${string}`,
  spender: `0x${string}`,
  logger: SimLogger,
): Promise<TxResult> {
  const hash = await walletClient.writeContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender, maxUint256],
    account: walletClient.account!,
    chain: walletClient.chain,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  logger.debug('chain', `USDC approve tx: ${hash} (${receipt.status})`);
  return { hash, success: receipt.status === 'success' };
}

export async function createMarket(
  walletClient: WalletClient,
  publicClient: PublicClient,
  factoryAddress: `0x${string}`,
  postId: `0x${string}`,
  amount: bigint,
  side: Side,
  logger: SimLogger,
): Promise<CreateMarketResult> {
  const hash = await walletClient.writeContract({
    address: factoryAddress,
    abi: BELIEF_FACTORY_ABI,
    functionName: 'createMarket',
    args: [postId, amount, side],
    account: walletClient.account!,
    chain: walletClient.chain,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Extract market address from MarketCreated event
  let marketAddress: `0x${string}` = '0x0000000000000000000000000000000000000000';
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: BELIEF_FACTORY_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === 'MarketCreated') {
        marketAddress = (decoded.args as { market: `0x${string}` }).market;
        break;
      }
    } catch {
      // Not a matching event
    }
  }

  logger.debug('chain', `createMarket tx: ${hash} → ${marketAddress}`);
  return { hash, success: receipt.status === 'success', marketAddress };
}

export async function commitToMarket(
  walletClient: WalletClient,
  publicClient: PublicClient,
  marketAddress: `0x${string}`,
  amount: bigint,
  side: Side,
  logger: SimLogger,
): Promise<CommitResult> {
  const functionName = side === Side.Support ? 'commitSupport' : 'commitOppose';

  const hash = await walletClient.writeContract({
    address: marketAddress,
    abi: BELIEF_MARKET_ABI,
    functionName,
    args: [amount],
    account: walletClient.account!,
    chain: walletClient.chain,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Extract positionId from Committed event
  let positionId = 0n;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: BELIEF_MARKET_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === 'Committed') {
        positionId = (decoded.args as { positionId: bigint }).positionId;
        break;
      }
    } catch {
      // Not a matching event
    }
  }

  logger.debug('chain', `${functionName} tx: ${hash} positionId=${positionId}`);
  return { hash, success: receipt.status === 'success', positionId };
}

export async function withdrawPosition(
  walletClient: WalletClient,
  publicClient: PublicClient,
  marketAddress: `0x${string}`,
  positionId: bigint,
  logger: SimLogger,
): Promise<TxResult> {
  const hash = await walletClient.writeContract({
    address: marketAddress,
    abi: BELIEF_MARKET_ABI,
    functionName: 'withdraw',
    args: [positionId],
    account: walletClient.account!,
    chain: walletClient.chain,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  logger.debug('chain', `withdraw tx: ${hash} (${receipt.status})`);
  return { hash, success: receipt.status === 'success' };
}

export async function claimRewards(
  walletClient: WalletClient,
  publicClient: PublicClient,
  marketAddress: `0x${string}`,
  positionId: bigint,
  logger: SimLogger,
): Promise<TxResult> {
  const hash = await walletClient.writeContract({
    address: marketAddress,
    abi: BELIEF_MARKET_ABI,
    functionName: 'claimRewards',
    args: [positionId],
    account: walletClient.account!,
    chain: walletClient.chain,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  logger.debug('chain', `claimRewards tx: ${hash} (${receipt.status})`);
  return { hash, success: receipt.status === 'success' };
}
