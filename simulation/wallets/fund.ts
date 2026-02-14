/**
 * Fund all bot wallets with ETH (for gas) and USDC (for staking).
 * Also pre-approves the vault for each wallet.
 *
 * Usage: npx tsx simulation/wallets/fund.ts
 *
 * Requires:
 *   - SIM_MNEMONIC in .env.local
 *   - SIM_RPC_URL in .env.local
 *   - Funder wallet (index 0) must have ETH + USDC
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { formatEther, parseEther, maxUint256, type PublicClient, type WalletClient } from 'viem';
import { loadConfig } from '../config';
import { getPublicClient, createBotWalletClient, deriveAccount } from '../chain/client';
import { SimLogger } from '../logger';

const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'transfer', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'mint', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
] as const;

const ETH_PER_BOT = parseEther('0.01');
const USDC_PER_BOT = 500_000_000n; // $500 USDC (6 decimals)
const BATCH_SIZE = 10;

async function main() {
  const config = loadConfig();
  const logger = new SimLogger('info');
  const publicClient = getPublicClient(config.rpcUrl);
  const funderWallet = createBotWalletClient(config.mnemonic, config.funderIndex, config.rpcUrl);
  const funderAddress = deriveAccount(config.mnemonic, config.funderIndex).address;

  logger.header('Bot Wallet Funding');
  logger.info('wallet', `Funder: ${funderAddress}`);
  logger.info('wallet', `Bots to fund: ${config.totalBots}`);

  // Check funder balances
  const funderEth = await publicClient.getBalance({ address: funderAddress });
  const funderUsdc = await publicClient.readContract({
    address: config.usdcAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [funderAddress],
  }) as bigint;

  logger.info('wallet', `Funder ETH: ${formatEther(funderEth)}`);
  logger.info('wallet', `Funder USDC: ${Number(funderUsdc) / 1e6}`);

  const totalEthNeeded = ETH_PER_BOT * BigInt(config.totalBots);
  const totalUsdcNeeded = USDC_PER_BOT * BigInt(config.totalBots);

  logger.info('wallet', `ETH needed: ${formatEther(totalEthNeeded)}`);
  logger.info('wallet', `USDC needed: ${Number(totalUsdcNeeded) / 1e6}`);

  // Probe if USDC has a public mint function
  let canMint = false;
  try {
    await publicClient.simulateContract({
      address: config.usdcAddress,
      abi: ERC20_ABI,
      functionName: 'mint',
      args: [funderAddress, 1_000_000n],
      account: funderAddress,
    });
    canMint = true;
    logger.info('wallet', 'Mock USDC has public mint() — will mint directly to bots');
  } catch {
    logger.info('wallet', 'No public mint() — will transfer from funder');
    if (funderUsdc < totalUsdcNeeded) {
      logger.error('wallet', `Funder needs ${Number(totalUsdcNeeded) / 1e6} USDC but has ${Number(funderUsdc) / 1e6}`);
      process.exit(1);
    }
  }

  if (funderEth < totalEthNeeded) {
    logger.error('wallet', `Funder needs ${formatEther(totalEthNeeded)} ETH but has ${formatEther(funderEth)}`);
    process.exit(1);
  }

  // Process in batches
  for (let batchStart = 0; batchStart < config.totalBots; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, config.totalBots);
    logger.info('wallet', `Funding batch ${batchStart + 1}-${batchEnd}...`);

    const promises: Promise<void>[] = [];

    for (let i = batchStart; i < batchEnd; i++) {
      const botIndex = config.botStartIndex + i;
      const botAddress = deriveAccount(config.mnemonic, botIndex).address;

      promises.push(
        fundSingleBot(
          publicClient, funderWallet, funderAddress, botAddress,
          config, canMint, botIndex, logger,
        ),
      );
    }

    await Promise.all(promises);
    logger.info('wallet', `Batch ${batchStart + 1}-${batchEnd} complete`);
  }

  // Pre-approve vault for all bots
  logger.separator();
  logger.info('wallet', 'Pre-approving vault for all bot wallets...');

  for (let batchStart = 0; batchStart < config.totalBots; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, config.totalBots);
    const promises: Promise<void>[] = [];

    for (let i = batchStart; i < batchEnd; i++) {
      const botIndex = config.botStartIndex + i;
      promises.push(approveVault(publicClient, config, botIndex, logger));
    }

    await Promise.all(promises);
  }

  logger.separator();
  logger.header('Funding complete!');
}

async function fundSingleBot(
  publicClient: PublicClient,
  funderWallet: WalletClient,
  funderAddress: `0x${string}`,
  botAddress: `0x${string}`,
  config: ReturnType<typeof loadConfig>,
  canMint: boolean,
  botIndex: number,
  logger: SimLogger,
) {
  // Check existing balances
  const ethBal = await publicClient.getBalance({ address: botAddress });
  const usdcBal = await publicClient.readContract({
    address: config.usdcAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [botAddress],
  }) as bigint;

  // Send ETH if needed
  if (ethBal < ETH_PER_BOT / 2n) {
    const hash = await funderWallet.sendTransaction({
      to: botAddress,
      value: ETH_PER_BOT,
      account: funderWallet.account!,
      chain: funderWallet.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    logger.debug('wallet', `Sent 0.01 ETH to bot-${String(botIndex).padStart(3, '0')}`);
  }

  // Send/mint USDC if needed
  if (usdcBal < USDC_PER_BOT / 2n) {
    if (canMint) {
      const hash = await funderWallet.writeContract({
        address: config.usdcAddress,
        abi: ERC20_ABI,
        functionName: 'mint',
        args: [botAddress, USDC_PER_BOT],
        account: funderWallet.account!,
        chain: funderWallet.chain,
      });
      await publicClient.waitForTransactionReceipt({ hash });
    } else {
      const hash = await funderWallet.writeContract({
        address: config.usdcAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [botAddress, USDC_PER_BOT],
        account: funderWallet.account!,
        chain: funderWallet.chain,
      });
      await publicClient.waitForTransactionReceipt({ hash });
    }
    logger.debug('wallet', `Funded $500 USDC to bot-${String(botIndex).padStart(3, '0')}`);
  }
}

async function approveVault(
  publicClient: PublicClient,
  config: ReturnType<typeof loadConfig>,
  botIndex: number,
  logger: SimLogger,
) {
  const botWallet = createBotWalletClient(config.mnemonic, botIndex, config.rpcUrl);
  const botAddress = deriveAccount(config.mnemonic, botIndex).address;

  // Check existing allowance
  const allowance = await publicClient.readContract({
    address: config.usdcAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [botAddress, config.vaultAddress],
  }) as bigint;

  if (allowance < USDC_PER_BOT) {
    const hash = await botWallet.writeContract({
      address: config.usdcAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [config.vaultAddress, maxUint256],
      account: botWallet.account!,
      chain: botWallet.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    logger.debug('wallet', `Approved vault for bot-${String(botIndex).padStart(3, '0')}`);
  }
}

main().catch((err) => {
  console.error('Funding failed:', err);
  process.exit(1);
});
