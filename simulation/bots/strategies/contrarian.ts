import { type BotStrategy, type BotAction, type BotState, type BotConfig, type MarketView, chance, randUSDC, hasPosition, beliefPct, pickRandom } from '../types';

/**
 * Contrarian: Opposes the majority, bets against the crowd.
 * - Rarely creates markets (10% chance)
 * - Always picks the minority side
 * - Acts when belief is skewed (>65% or <35%)
 * - Waits for a trend to form: market age 3-10 (+ personal jitter of 0-4 ticks)
 * - Stakes $15-40 (willing to put more behind contrarian bets)
 * - Max 2 positions per market
 */
export class ContrarianStrategy implements BotStrategy {
  private waitTicks: number;

  constructor() {
    // Contrarians vary in patience: some counter early (3 ticks), some wait longer (7 ticks)
    this.waitTicks = 3 + Math.floor(Math.random() * 5);
  }

  decide(
    state: BotState,
    _config: BotConfig,
    activeMarkets: MarketView[],
    pendingTopics: Array<{ postId: string; castHash: string; title: string }>,
    tick: number,
  ): BotAction {
    // Cooldown: at least 2 ticks between actions
    if (state.lastActionTick >= 0 && tick - state.lastActionTick < 2) {
      return { type: 'skip', reason: 'cooldown' };
    }

    // Small chance to create a market
    if (pendingTopics.length > 0 && state.marketsCreated < 1 && chance(0.1)) {
      const topic = pickRandom(pendingTopics);
      return {
        type: 'create_market',
        postId: topic.postId,
        castHash: topic.castHash,
        title: topic.title,
        amount: randUSDC(15, 40),
        side: chance(0.5) ? 0 : 1 as 0 | 1,
      };
    }

    // Find skewed markets to counter
    const candidates = activeMarkets.filter((m) => {
      const positions = state.positions.get(m.postId);
      if (positions && positions.length >= 2) return false; // max 2 positions
      if (m.age < this.waitTicks) return false;

      const belief = beliefPct(m.state.belief);
      return belief > 65 || belief < 35; // need real skew
    });

    if (candidates.length === 0) {
      return { type: 'skip', reason: 'no skewed markets' };
    }

    // Pick the most skewed market
    const sorted = [...candidates].sort((a, b) => {
      const skewA = Math.abs(beliefPct(a.state.belief) - 50);
      const skewB = Math.abs(beliefPct(b.state.belief) - 50);
      return skewB - skewA;
    });
    const market = sorted[0];
    const belief = beliefPct(market.state.belief);

    if (!chance(0.6)) {
      return { type: 'skip', reason: 'holding back' };
    }

    // Counter the majority: if belief is high (support winning), oppose. And vice versa.
    const side = belief > 50 ? 1 : 0;

    return {
      type: 'commit',
      postId: market.postId,
      marketAddress: market.address,
      amount: randUSDC(15, 40),
      side: side as 0 | 1,
    };
  }
}
