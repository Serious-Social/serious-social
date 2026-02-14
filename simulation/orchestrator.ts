import { type PublicClient } from 'viem';
import { type SimulationConfig } from './config';
import { getPublicClient } from './chain/client';
import { batchGetMarketStates, getMarketAddress } from './chain/queries';
import { type Bot } from './bots/bot';
import { createBots } from './bots/factory';
import { loadBotWallets } from './wallets';
import { loadTopics, type SimTopic } from './markets/topics';
import { MarketTracker } from './markets/tracker';
import { ApiClient } from './api/client';
import { Observer } from './observer';
import { SimLogger } from './logger';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Orchestrator {
  private publicClient!: PublicClient;
  private bots: Bot[] = [];
  private tracker = new MarketTracker();
  private apiClient!: ApiClient;
  private observer!: Observer;
  private logger!: SimLogger;

  private allTopics: SimTopic[] = [];
  private releasedTopics: SimTopic[] = [];
  private pendingTopics: SimTopic[] = [];
  private topicIndex = 0;

  private running = false;

  constructor(private config: SimulationConfig) {}

  async setup(): Promise<void> {
    this.logger = new SimLogger(this.config.logLevel);
    this.observer = new Observer(this.logger);
    this.apiClient = new ApiClient(this.config.appBaseUrl, this.logger);
    this.publicClient = getPublicClient(this.config.rpcUrl);

    this.logger.header('=== BELIEF MARKET SIMULATION ===');
    this.logger.separator('=');

    // Load wallets
    this.logger.info('orchestrator', `Loading ${this.config.totalBots} bot wallets...`);
    const wallets = loadBotWallets(
      this.config.mnemonic,
      this.config.rpcUrl,
      this.config.totalBots,
      this.config.botStartIndex,
    );

    // Create bots
    this.bots = createBots(this.config, wallets);
    this.logger.info('orchestrator', `Created ${this.bots.length} bots`);

    // Show personality distribution
    const dist = new Map<string, number>();
    for (const bot of this.bots) {
      dist.set(bot.config.personality, (dist.get(bot.config.personality) || 0) + 1);
    }
    for (const [personality, count] of dist) {
      this.logger.info('orchestrator', `  ${personality}: ${count} bots`);
    }

    // Load topics (real headlines)
    this.allTopics = await loadTopics(
      this.config.newsApiKey,
      this.config.totalMarkets + 10, // extra buffer
      this.logger,
    );

    // Release first batch of topics
    this.releaseTopics(3);

    this.logger.separator();
    this.logger.info('orchestrator', `Config: ${this.config.totalTicks} ticks, ${this.config.tickIntervalMs}ms interval, ${this.config.totalMarkets} markets target`);
    this.logger.separator();
  }

  private releaseTopics(count: number): void {
    for (let i = 0; i < count && this.topicIndex < this.allTopics.length; i++) {
      const topic = this.allTopics[this.topicIndex++];
      // Only release if not already a market
      if (!this.tracker.has(topic.postId)) {
        this.pendingTopics.push(topic);
        this.logger.debug('market', `Topic available: "${topic.title.slice(0, 50)}..."`);
      }
    }
  }

  async run(): Promise<void> {
    this.running = true;

    for (let tick = 0; tick < this.config.totalTicks && this.running; tick++) {
      await this.runTick(tick);

      // Wait between ticks
      if (tick < this.config.totalTicks - 1 && this.running) {
        await sleep(this.config.tickIntervalMs);
      }
    }

    // Final report
    await this.refreshMarketStates();
    this.observer.finalReport(this.bots, this.tracker, this.config.totalTicks);
  }

  private async runTick(tick: number): Promise<void> {
    this.logger.info('orchestrator', `--- Tick ${tick} ---`);

    // 1. Refresh all market states via multicall
    await this.refreshMarketStates();

    // 2. Maybe release new topics
    if (tick > 0 && tick % this.config.newMarketPacingTicks === 0) {
      const marketsCreated = this.tracker.getAll().length;
      if (marketsCreated < this.config.totalMarkets) {
        this.releaseTopics(2);
      }
    }

    // 3. Build market views for bot decisions
    const marketViews = this.tracker.getMarketViews(tick);

    // 4. Shuffle bots and iterate
    const shuffledBots = shuffle(this.bots);
    let actions = 0;
    let skips = 0;
    let errors = 0;

    for (const bot of shuffledBots) {
      if (!this.running) break;

      // Bot decides
      const action = bot.decide(marketViews, this.pendingTopics, tick);

      if (action.type === 'skip') {
        skips++;
        continue;
      }

      // Execute the action
      const result = await bot.execute(
        action,
        this.publicClient,
        this.config,
        this.apiClient,
        this.logger,
      );

      if (result.success) {
        actions++;
        bot.state.lastActionTick = tick;

        // Post-action bookkeeping
        if (action.type === 'create_market' && result.marketAddress) {
          // Register market in tracker
          this.tracker.addMarket(
            action.postId,
            result.marketAddress,
            action.title,
            action.castHash,
            tick,
            bot.config.id,
          );
          this.tracker.recordParticipant(action.postId, bot.config.fakeFid);

          // Remove from pending topics
          this.pendingTopics = this.pendingTopics.filter((t) => t.postId !== action.postId);
        }

        if (action.type === 'commit') {
          this.tracker.recordParticipant(action.postId, bot.config.fakeFid);

          // Update entry tick on the position
          const positions = bot.state.positions.get(action.postId);
          if (positions && positions.length > 0) {
            positions[positions.length - 1].entryTick = tick;
          }
        }
      } else {
        errors++;
      }
    }

    // 5. Log tick summary
    this.observer.recordTickActions(actions);
    this.observer.tickSummary(tick, actions, skips, this.tracker);

    // 6. Periodic snapshot
    if (tick > 0 && tick % this.config.snapshotEveryNTicks === 0) {
      this.observer.snapshot(tick, this.bots, this.tracker);
    }

    if (errors > this.bots.length * 0.5) {
      this.logger.warn('orchestrator', `High error rate: ${errors}/${this.bots.length} bots failed. Pausing 60s...`);
      await sleep(60000);
    }
  }

  private async refreshMarketStates(): Promise<void> {
    const addresses = this.tracker.getAddresses();
    if (addresses.length === 0) return;

    try {
      const states = await batchGetMarketStates(this.publicClient, addresses);
      for (const [postId, state] of states) {
        this.tracker.updateState(postId, state);
      }
      this.logger.debug('chain', `Refreshed ${states.size} market states`);
    } catch (err) {
      this.logger.warn('chain', `Failed to refresh market states: ${(err as Error).message}`);
    }
  }

  stop(): void {
    this.logger.info('orchestrator', 'Stopping simulation...');
    this.running = false;
  }
}
