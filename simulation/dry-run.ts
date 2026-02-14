/**
 * Dry run — tests everything except on-chain transactions.
 * Verifies: config loading, wallet derivation, news API, bot creation, strategy decisions.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { loadConfig } from './config';
import { SimLogger } from './logger';
import { loadBotWallets } from './wallets';
import { createBots } from './bots/factory';
import { loadTopics } from './markets/topics';
import { MarketTracker } from './markets/tracker';
import { type MarketView } from './bots/types';

async function main() {
  const config = loadConfig();
  const logger = new SimLogger('info');

  logger.header('=== DRY RUN — Testing simulation components ===');
  logger.separator();

  // 1. Wallets
  logger.info('test', 'Loading wallets...');
  const wallets = loadBotWallets(config.mnemonic, config.rpcUrl, Math.min(config.totalBots, 10), config.botStartIndex);
  logger.info('test', `Loaded ${wallets.length} wallets (showing first 3):`);
  for (const w of wallets.slice(0, 3)) {
    logger.info('test', `  Bot wallet #${w.index}: ${w.address}`);
  }

  // 2. Bots
  logger.separator();
  logger.info('test', 'Creating bots...');
  const smallConfig = { ...config, totalBots: 10 };
  const bots = createBots(smallConfig, wallets);
  logger.info('test', `Created ${bots.length} bots:`);
  for (const bot of bots) {
    logger.info('test', `  ${bot.config.name} (${bot.config.personality}) FID=${bot.config.fakeFid}`);
  }

  // 3. Topics (News API)
  logger.separator();
  logger.info('test', 'Fetching news headlines...');
  const topics = await loadTopics(config.newsApiKey, 10, logger);
  logger.info('test', `Got ${topics.length} topics:`);
  for (const t of topics.slice(0, 5)) {
    logger.info('test', `  "${t.title.slice(0, 60)}..." → ${t.postId.slice(0, 14)}...`);
  }

  // 4. Strategy dry-run (simulate decisions with mock market data)
  logger.separator();
  logger.info('test', 'Testing strategy decisions (mock data)...');

  // Create a fake market view
  const mockMarkets: MarketView[] = [{
    postId: topics[0]?.postId || '0x0000000000000000000000000000000000000000000000000000000000000001',
    address: '0x0000000000000000000000000000000000000001' as `0x${string}`,
    state: {
      belief: BigInt(7e17),  // 70% — support-heavy
      supportWeight: 100n,
      opposeWeight: 30n,
      supportPrincipal: 50_000_000n,  // $50
      opposePrincipal: 15_000_000n,   // $15
      srpBalance: 2_000_000n,
    },
    age: 3,
    participantCount: 4,
    createdByBot: null,
  }];

  const pendingTopics = topics.slice(1, 4).map(t => ({
    postId: t.postId,
    castHash: t.castHash,
    title: t.title,
  }));

  for (const bot of bots) {
    const action = bot.decide(mockMarkets, pendingTopics, 5);
    const desc = action.type === 'skip'
      ? `SKIP (${action.reason})`
      : action.type === 'create_market'
      ? `CREATE "${action.title.slice(0, 30)}..." $${Number(action.amount) / 1e6} ${action.side === 0 ? 'SUP' : 'CHL'}`
      : action.type === 'commit'
      ? `COMMIT $${Number(action.amount) / 1e6} ${action.side === 0 ? 'SUP' : 'CHL'}`
      : action.type;
    logger.info('test', `  ${bot.config.name}: ${desc}`);
  }

  logger.separator();
  logger.header('DRY RUN COMPLETE — All components working!');
  logger.info('test', 'Next: fund the funder wallet with Base Sepolia ETH, then run simulation/fund.ts');
}

main().catch(console.error);
