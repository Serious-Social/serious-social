import { type BotStrategy, type BotAction, type BotState, type BotConfig, type MarketView, chance, randUSDC, hasPosition, pickRandom } from '../types';

/**
 * EarlyMover: Stakes early in new markets, creates markets.
 * - High probability of creating a market if topics available
 * - Acts in the first 0-2 ticks of a market's life (+ random jitter)
 * - Moderate stakes: $10-30
 * - Prefers Support (70%)
 * - Each bot has a personal "eagerness jitter" — some act tick 0, others tick 1-2
 */
export class EarlyMoverStrategy implements BotStrategy {
  private eagernessDelay: number;

  constructor() {
    // Personal jitter: this bot's minimum delay before acting on a market (0-2 ticks)
    this.eagernessDelay = Math.floor(Math.random() * 3);
  }

  decide(
    state: BotState,
    config: BotConfig,
    activeMarkets: MarketView[],
    pendingTopics: Array<{ postId: string; castHash: string; title: string }>,
    tick: number,
  ): BotAction {
    // Cooldown: don't act every single tick
    if (state.lastActionTick >= 0 && tick - state.lastActionTick < 1) {
      return { type: 'skip', reason: 'cooldown' };
    }

    // 60% chance to create a market if topics available and haven't created too many
    if (pendingTopics.length > 0 && state.marketsCreated < 3 && chance(0.6)) {
      const topic = pickRandom(pendingTopics);
      const side = chance(0.7) ? 0 : 1; // 70% support
      return {
        type: 'create_market',
        postId: topic.postId,
        castHash: topic.castHash,
        title: topic.title,
        amount: randUSDC(10, 30),
        side: side as 0 | 1,
      };
    }

    // Stake in young markets (age <= 2 + personal jitter)
    const youngMarkets = activeMarkets.filter(
      (m) => m.age <= 2 + this.eagernessDelay && !hasPosition(state, m.postId),
    );

    if (youngMarkets.length > 0 && chance(0.7)) {
      const market = pickRandom(youngMarkets);
      const side = chance(0.7) ? 0 : 1;
      return {
        type: 'commit',
        postId: market.postId,
        marketAddress: market.address,
        amount: randUSDC(10, 30),
        side: side as 0 | 1,
      };
    }

    return { type: 'skip', reason: 'no young markets' };
  }
}
