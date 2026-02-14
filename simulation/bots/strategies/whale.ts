import { type BotStrategy, type BotAction, type BotState, type BotConfig, type MarketView, chance, randUSDC, hasPosition, pickRandom } from '../types';

/**
 * Whale: Large stakes, infrequent but impactful.
 * - Occasionally creates markets with large initial commitment ($50-100)
 * - Stakes $50-100 per position
 * - Only acts every 3-5 ticks (personal rhythm)
 * - Slightly prefers Support (60%)
 * - Maximum 2 positions total across all markets
 * - Acts at varying market ages (2-8 ticks) — some whales are early, some late
 */
export class WhaleStrategy implements BotStrategy {
  private actionInterval: number;
  private preferredAge: number;

  constructor() {
    // Each whale has its own rhythm: acts every 3-5 ticks
    this.actionInterval = 3 + Math.floor(Math.random() * 3);
    // And preferred market age to enter
    this.preferredAge = 2 + Math.floor(Math.random() * 7);
  }

  decide(
    state: BotState,
    _config: BotConfig,
    activeMarkets: MarketView[],
    pendingTopics: Array<{ postId: string; castHash: string; title: string }>,
    tick: number,
  ): BotAction {
    // Rhythm: only act on schedule
    if (state.lastActionTick >= 0 && tick - state.lastActionTick < this.actionInterval) {
      return { type: 'skip', reason: `waiting (rhythm: every ${this.actionInterval} ticks)` };
    }

    // Count total positions
    let totalPositions = 0;
    for (const positions of state.positions.values()) {
      totalPositions += positions.length;
    }

    if (totalPositions >= 2) {
      return { type: 'skip', reason: 'max positions reached' };
    }

    // Create market with large commitment
    if (pendingTopics.length > 0 && state.marketsCreated < 1 && chance(0.3)) {
      const topic = pickRandom(pendingTopics);
      const side = chance(0.6) ? 0 : 1;
      return {
        type: 'create_market',
        postId: topic.postId,
        castHash: topic.castHash,
        title: topic.title,
        amount: randUSDC(50, 100),
        side: side as 0 | 1,
      };
    }

    // Commit to existing market near preferred age
    const candidates = activeMarkets.filter((m) => {
      if (hasPosition(state, m.postId)) return false;
      // Accept markets within ±2 of preferred age
      return Math.abs(m.age - this.preferredAge) <= 2;
    });

    if (candidates.length > 0 && chance(0.5)) {
      const market = pickRandom(candidates);
      const side = chance(0.6) ? 0 : 1;
      return {
        type: 'commit',
        postId: market.postId,
        marketAddress: market.address,
        amount: randUSDC(50, 100),
        side: side as 0 | 1,
      };
    }

    return { type: 'skip', reason: 'no suitable markets' };
  }
}
