import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { getRecentMarkets, getBeliefSnapshot, setBeliefSnapshot } from '~/lib/kv';
import {
  CONTRACTS,
  BELIEF_FACTORY_ABI,
  BELIEF_MARKET_ABI,
  DEFAULT_CHAIN_ID,
} from '~/lib/contracts';

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const postIds = await getRecentMarkets(50);

    if (postIds.length === 0) {
      return NextResponse.json({ success: true, snapshotted: 0 });
    }

    let snapshotted = 0;
    const now = Math.floor(Date.now() / 1000);
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

    // Batch-fetch all market addresses via multicall
    const addressResults = await publicClient.multicall({
      contracts: postIds.map((postId) => ({
        address: CONTRACTS[DEFAULT_CHAIN_ID].factory,
        abi: BELIEF_FACTORY_ABI,
        functionName: 'getMarket' as const,
        args: [postId as `0x${string}`],
      })),
      allowFailure: true,
    });

    // Collect valid markets for state fetch
    const validMarkets: { postId: string; address: `0x${string}` }[] = [];
    for (let i = 0; i < postIds.length; i++) {
      const result = addressResults[i];
      if (result.status === 'success') {
        const address = result.result as `0x${string}`;
        if (address && address !== ZERO_ADDRESS) {
          validMarkets.push({ postId: postIds[i], address });
        }
      }
    }

    // Batch-fetch all market states via multicall
    if (validMarkets.length > 0) {
      const stateResults = await publicClient.multicall({
        contracts: validMarkets.map(({ address }) => ({
          address,
          abi: BELIEF_MARKET_ABI,
          functionName: 'getMarketState' as const,
        })),
        allowFailure: true,
      });

      // Store snapshots
      await Promise.all(
        validMarkets.map(async ({ postId }, i) => {
          try {
            const result = stateResults[i];
            if (result.status !== 'success') return;

            const marketState = result.result as { belief: bigint };
            const existing = await getBeliefSnapshot(postId);
            const updated = [
              { belief: marketState.belief.toString(), ts: now },
              ...existing,
            ];

            await setBeliefSnapshot(postId, updated);
            snapshotted++;
          } catch (e) {
            console.error(`Failed to snapshot belief for ${postId}:`, e);
          }
        })
      );
    }

    return NextResponse.json({ success: true, snapshotted });
  } catch (error) {
    console.error('Cron snapshot-beliefs error:', error);
    return NextResponse.json(
      { error: 'Failed to snapshot beliefs' },
      { status: 500 }
    );
  }
}
