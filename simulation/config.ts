import { baseSepolia } from 'viem/chains';

export interface SimulationConfig {
  // Simulation parameters
  totalTicks: number;
  tickIntervalMs: number;
  snapshotEveryNTicks: number;

  // Bot configuration
  totalBots: number;
  personalityDistribution: Record<string, number>;

  // Market configuration
  totalMarkets: number;
  newMarketPacingTicks: number;

  // Chain configuration
  rpcUrl: string;
  chainId: number;
  factoryAddress: `0x${string}`;
  vaultAddress: `0x${string}`;
  usdcAddress: `0x${string}`;

  // API configuration
  appBaseUrl: string;
  newsApiKey: string;

  // Wallet configuration
  mnemonic: string;
  funderIndex: number;
  botStartIndex: number;

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

const CONTRACTS = {
  [baseSepolia.id]: {
    factory: '0x0C5dc9b8A71DcE45d365AE96b29A4a6A7Ca491F5' as `0x${string}`,
    vault: '0xBB608F92A479f997a0511dca02D3BeCE555191F1' as `0x${string}`,
    usdc: '0x2cebb3DFf94B7cCB09FC218F91B70Ea35A0fFd1a' as `0x${string}`,
  },
};

export function loadConfig(): SimulationConfig {
  const chainId = baseSepolia.id;
  const contracts = CONTRACTS[chainId];

  const mnemonic = process.env.SIM_MNEMONIC;
  if (!mnemonic) {
    throw new Error('SIM_MNEMONIC is required. Run: npx tsx simulation/wallets/generate.ts');
  }

  const rpcUrl = process.env.SIM_RPC_URL;
  if (!rpcUrl) {
    throw new Error('SIM_RPC_URL is required (e.g. https://base-sepolia.g.alchemy.com/v2/YOUR_KEY)');
  }

  const newsApiKey = process.env.NEWS_API_KEY || '';

  return {
    totalTicks: parseInt(process.env.SIM_TOTAL_TICKS || '50'),
    tickIntervalMs: parseInt(process.env.SIM_TICK_INTERVAL || '30000'),
    snapshotEveryNTicks: 5,

    totalBots: parseInt(process.env.SIM_TOTAL_BOTS || '75'),
    personalityDistribution: {
      early_mover: 0.15,
      bandwagon: 0.25,
      contrarian: 0.15,
      whale: 0.10,
      cautious: 0.20,
      random: 0.15,
    },

    totalMarkets: parseInt(process.env.SIM_TOTAL_MARKETS || '15'),
    newMarketPacingTicks: 3,

    rpcUrl,
    chainId,
    factoryAddress: contracts.factory,
    vaultAddress: contracts.vault,
    usdcAddress: contracts.usdc,

    appBaseUrl: process.env.SIM_APP_URL || 'http://localhost:3000',
    newsApiKey,

    mnemonic,
    funderIndex: 0,
    botStartIndex: 1,

    logLevel: (process.env.SIM_LOG_LEVEL as SimulationConfig['logLevel']) || 'info',
  };
}
