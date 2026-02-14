#!/usr/bin/env tsx
/**
 * Belief Market Bot Simulation
 *
 * Simulates 50-100 bots with different personalities interacting with
 * real smart contracts on Base Sepolia to observe market dynamics.
 *
 * Usage:
 *   npx tsx simulation/run.ts
 *   npx tsx simulation/run.ts --bots 50 --ticks 30 --interval 10000
 *
 * Prerequisites:
 *   1. npx tsx simulation/wallets/generate.ts --count 100
 *   2. npx tsx simulation/wallets/fund.ts
 *   3. npm run dev  (app must be running for API routes)
 *
 * Environment:
 *   SIM_MNEMONIC      - HD wallet mnemonic
 *   SIM_RPC_URL       - Base Sepolia RPC endpoint
 *   SIM_APP_URL       - App URL (default: http://localhost:3000)
 *   NEWS_API_KEY      - NewsAPI.org key for real headlines
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Orchestrator } from './orchestrator';
import { loadConfig } from './config';

// Parse CLI overrides
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
}

async function main() {
  const config = loadConfig();

  // CLI overrides
  const botsOverride = getArg('bots');
  const ticksOverride = getArg('ticks');
  const intervalOverride = getArg('interval');

  if (botsOverride) config.totalBots = parseInt(botsOverride);
  if (ticksOverride) config.totalTicks = parseInt(ticksOverride);
  if (intervalOverride) config.tickIntervalMs = parseInt(intervalOverride);

  const orchestrator = new Orchestrator(config);

  // Graceful shutdown on Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n\nReceived SIGINT, finishing current tick...');
    orchestrator.stop();
  });

  process.on('SIGTERM', () => {
    orchestrator.stop();
  });

  await orchestrator.setup();
  await orchestrator.run();

  process.exit(0);
}

main().catch((err) => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
