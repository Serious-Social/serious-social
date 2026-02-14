import { type BotStrategy, type BotAction, type BotState, type BotConfig, type MarketView, chance, randUSDC, hasPosition, beliefPct, pickRandom } from '../types';

/**
 * Cautious: Small stakes, waits for stability.
 * - Never creates markets
 * - Minimum stakes: $5-10
 * - Only acts after market has 3+ participants
 * - Waits until market age > 4 (+ personal jitter of 0-5 ticks)
 * - Follows majority side (75%)
 * - Some cautious bots attempt early withdrawal if belief shifts >20 points against them
 */
export class CautiousStrategy implements BotStrategy {
  private minAge: number;
  private panicThreshold: number;

  constructor() {
    // Each cautious bot has different patience
    this.minAge = 4 + Math.floor(Math.random() * 6); // 4-9 ticks before entering
    // And different panic level for considering withdrawal
    this.panicThreshold = 15 + Math.floor(Math.random() * 15); // 15-30% belief shift
  }

  decide(
    state: BotState,
    _config: BotConfig,
    activeMarkets: MarketView[],
    _pendingTopics: Array<{ postId: string; castHash: string; title: string }>,
    tick: number,
  ): BotAction {
    // Cooldown: at least 3 ticks between actions
    if (state.lastActionTick >= 0 && tick - state.lastActionTick < 3) {
      return { type: 'skip', reason: 'cooldown' };
    }

    // Check for panic withdrawal on existing positions
    for (const [postId, positions] of state.positions) {
      const market = activeMarkets.find((m) => m.postId === postId);
      if (!market) continue;

      for (const pos of positions) {
        const belief = beliefPct(market.state.belief);
        // If I supported and belief dropped far, or I opposed and belief rose far
        const isAgainstMe =
          (pos.side === 0 && belief < 50 - this.panicThreshold) ||
          (pos.side === 1 && belief > 50 + this.panicThreshold);

        if (isAgainstMe && chance(0.3)) {
          return {
            type: 'withdraw',
            postId,
            marketAddress: pos.marketAddress,
            positionId: pos.positionId,
          };
        }
      }
    }

    // Look for stable, well-participated markets to join
    const candidates = activeMarkets.filter((m) => {
      if (hasPosition(state, m.postId)) return false;
      if (m.age < this.minAge) return false;
      if (m.participantCount < 3) return false;
      return true;
    });

    if (candidates.length === 0) {
      return { type: 'skip', reason: 'no stable markets' };
    }

    if (!chance(0.4)) {
      return { type: 'skip', reason: 'being cautious' };
    }

    const market = pickRandom(candidates);
    const belief = beliefPct(market.state.belief);
    // Follow majority (75%) or go minority (25%)
    const side = chance(0.75)
      ? (belief > 50 ? 0 : 1)
      : (belief > 50 ? 1 : 0);

    return {
      type: 'commit',
      postId: market.postId,
      marketAddress: market.address,
      amount: randUSDC(5, 10),
      side: side as 0 | 1,
    };
  }
}
