import { type PublicClient, type WalletClient } from 'viem';
import { type BotConfig, type BotState, type BotAction, type BotStrategy, type MarketView, type PositionRecord } from './types';
import { Side, formatUSDC } from '../chain/abi';
import { createMarket, commitToMarket, withdrawPosition, claimRewards } from '../chain/transactions';
import { ApiClient } from '../api/client';
import { SimLogger } from '../logger';
import { type SimulationConfig } from '../config';

export class Bot {
  public state: BotState;

  constructor(
    public config: BotConfig,
    public strategy: BotStrategy,
    public walletClient: WalletClient,
    public address: `0x${string}`,
  ) {
    this.state = {
      positions: new Map(),
      totalStaked: 0n,
      totalWithdrawn: 0n,
      totalRewardsClaimed: 0n,
      lastActionTick: -1,
      marketsCreated: 0,
    };
  }

  decide(
    activeMarkets: MarketView[],
    pendingTopics: Array<{ postId: string; castHash: string; title: string }>,
    tick: number,
  ): BotAction {
    return this.strategy.decide(this.state, this.config, activeMarkets, pendingTopics, tick);
  }

  async execute(
    action: BotAction,
    publicClient: PublicClient,
    simConfig: SimulationConfig,
    apiClient: ApiClient,
    logger: SimLogger,
  ): Promise<{ success: boolean; marketAddress?: `0x${string}`; positionId?: bigint }> {
    if (action.type === 'skip') return { success: true };

    const label = `${this.config.name} (${this.config.personality})`;

    try {
      if (action.type === 'create_market') {
        const result = await createMarket(
          this.walletClient, publicClient, simConfig.factoryAddress,
          action.postId as `0x${string}`, action.amount, action.side as Side, logger,
        );

        if (result.success) {
          // Record position — creator gets position ID from the Committed event within createMarket
          // We get the positionId by querying after creation
          this.state.totalStaked += action.amount;
          this.state.marketsCreated++;
          this.state.lastActionTick = -1; // will be set by orchestrator

          // Register with app API
          await apiClient.storeCastMapping({
            postId: action.postId,
            castHash: action.castHash,
            authorFid: this.config.fakeFid,
            text: action.title,
            authorUsername: this.config.name,
            authorDisplayName: `Sim ${this.config.name}`,
          });

          await apiClient.recordParticipant({
            postId: action.postId,
            fid: this.config.fakeFid,
            side: action.side === 0 ? 'support' : 'challenge',
            amount: formatUSDC(action.amount),
          });

          logger.info('bot', `${label} CREATED market "${action.title.slice(0, 50)}..." $${formatUSDC(action.amount)} ${action.side === 0 ? 'SUPPORT' : 'CHALLENGE'}`);
          return { success: true, marketAddress: result.marketAddress };
        }
        return { success: false };
      }

      if (action.type === 'commit') {
        const result = await commitToMarket(
          this.walletClient, publicClient, action.marketAddress,
          action.amount, action.side as Side, logger,
        );

        if (result.success) {
          // Record position
          const posRecord: PositionRecord = {
            postId: action.postId,
            marketAddress: action.marketAddress,
            positionId: result.positionId,
            side: action.side,
            amount: action.amount,
            entryTick: -1, // set by orchestrator
          };
          const existing = this.state.positions.get(action.postId) || [];
          existing.push(posRecord);
          this.state.positions.set(action.postId, existing);
          this.state.totalStaked += action.amount;

          await apiClient.recordParticipant({
            postId: action.postId,
            fid: this.config.fakeFid,
            side: action.side === 0 ? 'support' : 'challenge',
            amount: formatUSDC(action.amount),
          });

          logger.info('bot', `${label} COMMITTED $${formatUSDC(action.amount)} ${action.side === 0 ? 'SUPPORT' : 'CHALLENGE'} on ${action.postId.slice(0, 10)}...`);
          return { success: true, positionId: result.positionId };
        }
        return { success: false };
      }

      if (action.type === 'withdraw') {
        const result = await withdrawPosition(
          this.walletClient, publicClient, action.marketAddress,
          action.positionId, logger,
        );

        if (result.success) {
          this.state.totalWithdrawn += action.positionId; // approximate
          logger.info('bot', `${label} WITHDREW position ${action.positionId} from ${action.postId.slice(0, 10)}...`);
        }
        return { success: result.success };
      }

      if (action.type === 'claim_rewards') {
        const result = await claimRewards(
          this.walletClient, publicClient, action.marketAddress,
          action.positionId, logger,
        );

        if (result.success) {
          logger.info('bot', `${label} CLAIMED REWARDS for position ${action.positionId}`);
        }
        return { success: result.success };
      }

      return { success: false };
    } catch (err) {
      logger.warn('bot', `${label} action failed: ${(err as Error).message}`);
      return { success: false };
    }
  }
}
