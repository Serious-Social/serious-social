import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { getRecentMarkets, getBeliefSnapshot, setBeliefSnapshot } from '~/lib/kv';
import {
  CONTRACTS,
  BELIEF_FACTORY_ABI,
  BELIEF_MARKET_ABI,
  DEFAULT_CHAIN_ID,
} from '~/lib/contracts';

const publicClient = createPublicClient({
  chain: baseSepolia,
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

    await Promise.all(
      postIds.map(async (postId) => {
        try {
          // Get market address
          const address = (await publicClient.readContract({
            address: CONTRACTS[DEFAULT_CHAIN_ID].factory,
            abi: BELIEF_FACTORY_ABI,
            functionName: 'getMarket',
            args: [postId as `0x${string}`],
          })) as `0x${string}`;

          if (!address || address === '0x0000000000000000000000000000000000000000') {
            return;
          }

          // Get current market state
          const marketState = (await publicClient.readContract({
            address,
            abi: BELIEF_MARKET_ABI,
            functionName: 'getMarketState',
          })) as { belief: bigint };

          // Read existing snapshots, prepend new entry, trim
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

    return NextResponse.json({ success: true, snapshotted });
  } catch (error) {
    console.error('Cron snapshot-beliefs error:', error);
    return NextResponse.json(
      { error: 'Failed to snapshot beliefs' },
      { status: 500 }
    );
  }
}
