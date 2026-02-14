import { type MarketState } from '../chain/abi';
import { type MarketView } from '../bots/types';

export interface TrackedMarket {
  postId: string;
  address: `0x${string}`;
  title: string;
  castHash: string;
  createdAtTick: number;
  createdByBotId: number | null;
  participantFids: Set<number>;
  state: MarketState | null;
}

export class MarketTracker {
  private markets: Map<string, TrackedMarket> = new Map();

  addMarket(
    postId: string,
    address: `0x${string}`,
    title: string,
    castHash: string,
    tick: number,
    createdByBotId: number | null,
  ): void {
    this.markets.set(postId, {
      postId,
      address,
      title,
      castHash,
      createdAtTick: tick,
      createdByBotId,
      participantFids: new Set(),
      state: null,
    });
  }

  recordParticipant(postId: string, fid: number): void {
    const market = this.markets.get(postId);
    if (market) {
      market.participantFids.add(fid);
    }
  }

  updateState(postId: string, state: MarketState): void {
    const market = this.markets.get(postId);
    if (market) {
      market.state = state;
    }
  }

  getAll(): TrackedMarket[] {
    return [...this.markets.values()];
  }

  getActive(): TrackedMarket[] {
    return this.getAll().filter((m) => m.state !== null);
  }

  getMarketViews(currentTick: number): MarketView[] {
    return this.getActive().map((m) => ({
      postId: m.postId,
      address: m.address,
      state: m.state!,
      age: currentTick - m.createdAtTick,
      participantCount: m.participantFids.size,
      createdByBot: m.createdByBotId,
    }));
  }

  getAddresses(): Array<{ postId: string; address: `0x${string}` }> {
    return this.getAll()
      .filter((m) => m.address !== '0x0000000000000000000000000000000000000000')
      .map((m) => ({ postId: m.postId, address: m.address }));
  }

  has(postId: string): boolean {
    return this.markets.has(postId);
  }

  get(postId: string): TrackedMarket | undefined {
    return this.markets.get(postId);
  }
}
