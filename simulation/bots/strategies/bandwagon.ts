import { type BotStrategy, type BotAction, type BotState, type BotConfig, type MarketView, chance, randUSDC, hasPosition, beliefPct, pickRandom } from '../types';

/**
 * Bandwagon: Follows the majority side once momentum forms.
 * - Never creates markets
 * - Waits until market has 2+ participants or belief has moved from 50%
 * - Follows whichever side has higher principal
 * - Higher chance of acting when belief is more extreme (>65% or <35%)
 * - Acts at market age 2-6 (+ personal delay jitter of 0-3 ticks)
 * - Stakes $10-25
 */
export class BandwagonStrategy implements BotStrategy {
  private personalDelay: number;

  constructor() {
    // Each bandwagon bot has a slightly different reaction time (0-3 ticks delay)
    this.personalDelay = Math.floor(Math.random() * 4);
  }

  decide(
    state: BotState,
    _config: BotConfig,
    activeMarkets: MarketView[],
    _pendingTopics: Array<{ postId: string; castHash: string; title: string }>,
    tick: number,
  ): BotAction {
    // Cooldown: at least 2 ticks between actions
    if (state.lastActionTick >= 0 && tick - state.lastActionTick < 2) {
      return { type: 'skip', reason: 'cooldown' };
    }

    // Find markets with momentum
    const candidates = activeMarkets.filter((m) => {
      if (hasPosition(state, m.postId)) return false;
      if (m.age < 2 + this.personalDelay) return false; // wait for trend
      if (m.participantCount < 2) return false;

      const belief = beliefPct(m.state.belief);
      // Need some skew — not interested in 50/50 markets
      return belief > 55 || belief < 45;
    });

    if (candidates.length === 0) {
      return { type: 'skip', reason: 'no trending markets' };
    }

    const market = pickRandom(candidates);
    const belief = beliefPct(market.state.belief);

    // Probability scales with how extreme the belief is
    const extremity = Math.abs(belief - 50) / 50; // 0 to 1
    if (!chance(0.3 + extremity * 0.5)) {
      return { type: 'skip', reason: 'not convinced yet' };
    }

    // Follow the majority
    const side = belief > 50 ? 0 : 1; // support if belief is high (support winning)

    return {
      type: 'commit',
      postId: market.postId,
      marketAddress: market.address,
      amount: randUSDC(10, 25),
      side: side as 0 | 1,
    };
  }
}
