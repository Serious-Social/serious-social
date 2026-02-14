import { type BotStrategy, type BotAction, type BotState, type BotConfig, type MarketView, chance, randUSDC, hasPosition, pickRandom, randInt } from '../types';

/**
 * Random: The noise — random everything.
 * - 20% chance of creating market per tick if topics available
 * - Random side (50/50)
 * - Random amount ($5-100 uniform)
 * - 30% chance of acting each tick on existing markets
 * - Acts at any market age (no preference)
 * - Occasionally attempts withdrawal or reward claim on random positions
 */
export class RandomStrategy implements BotStrategy {
  decide(
    state: BotState,
    _config: BotConfig,
    activeMarkets: MarketView[],
    pendingTopics: Array<{ postId: string; castHash: string; title: string }>,
    tick: number,
  ): BotAction {
    // Small cooldown: at least 1 tick between actions
    if (state.lastActionTick >= 0 && tick - state.lastActionTick < 1) {
      return { type: 'skip', reason: 'cooldown' };
    }

    // 10% chance to try claiming rewards on an existing position
    if (state.positions.size > 0 && chance(0.1)) {
      const entries = [...state.positions.entries()];
      const [postId, positions] = pickRandom(entries);
      const pos = pickRandom(positions);
      const market = activeMarkets.find((m) => m.postId === postId);
      if (market) {
        return {
          type: 'claim_rewards',
          postId,
          marketAddress: pos.marketAddress,
          positionId: pos.positionId,
        };
      }
    }

    // 5% chance to try early withdrawal
    if (state.positions.size > 0 && chance(0.05)) {
      const entries = [...state.positions.entries()];
      const [postId, positions] = pickRandom(entries);
      const pos = pickRandom(positions);
      return {
        type: 'withdraw',
        postId,
        marketAddress: pos.marketAddress,
        positionId: pos.positionId,
      };
    }

    // 20% chance to create market
    if (pendingTopics.length > 0 && state.marketsCreated < 2 && chance(0.2)) {
      const topic = pickRandom(pendingTopics);
      return {
        type: 'create_market',
        postId: topic.postId,
        castHash: topic.castHash,
        title: topic.title,
        amount: randUSDC(5, 100),
        side: chance(0.5) ? 0 : 1 as 0 | 1,
      };
    }

    // 30% chance to commit to a random market
    const available = activeMarkets.filter((m) => !hasPosition(state, m.postId));
    if (available.length > 0 && chance(0.3)) {
      const market = pickRandom(available);
      return {
        type: 'commit',
        postId: market.postId,
        marketAddress: market.address,
        amount: randUSDC(5, 100),
        side: chance(0.5) ? 0 : 1 as 0 | 1,
      };
    }

    return { type: 'skip', reason: 'random skip' };
  }
}
