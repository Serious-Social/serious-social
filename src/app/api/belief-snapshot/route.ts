import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { getBeliefSnapshot } from '~/lib/kv';
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

/**
 * GET /api/belief-snapshot?postId=0x...
 * Returns the 24h belief change for a single market.
 */
export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get('postId');
  if (!postId) {
    return NextResponse.json({ error: 'postId required' }, { status: 400 });
  }

  try {
    const snapshots = await getBeliefSnapshot(postId);
    if (snapshots.length === 0) {
      return NextResponse.json({ beliefChange24h: null });
    }

    // Get current belief from chain
    const address = (await publicClient.readContract({
      address: CONTRACTS[DEFAULT_CHAIN_ID].factory,
      abi: BELIEF_FACTORY_ABI,
      functionName: 'getMarket',
      args: [postId as `0x${string}`],
    })) as `0x${string}`;

    if (!address || address === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({ beliefChange24h: null });
    }

    const marketState = (await publicClient.readContract({
      address,
      abi: BELIEF_MARKET_ABI,
      functionName: 'getMarketState',
    })) as { belief: bigint };

    const now = Math.floor(Date.now() / 1000);
    const target = now - 24 * 60 * 60;

    // Find entry closest to 24h ago
    let closest = snapshots[0];
    let closestDiff = Math.abs(closest.ts - target);
    for (const entry of snapshots) {
      const diff = Math.abs(entry.ts - target);
      if (diff < closestDiff) {
        closest = entry;
        closestDiff = diff;
      }
    }

    // Only show delta if snapshot is at least 1h old
    if (now - closest.ts < 3600) {
      return NextResponse.json({ beliefChange24h: null });
    }

    const currentBelief = Number(marketState.belief * 10000n / BigInt(1e18)) / 100;
    const snapshotBelief = Number(BigInt(closest.belief) * 10000n / BigInt(1e18)) / 100;
    const beliefChange24h = Math.round((currentBelief - snapshotBelief) * 10) / 10;

    return NextResponse.json({ beliefChange24h });
  } catch (error) {
    console.error('Error fetching belief snapshot:', error);
    return NextResponse.json({ beliefChange24h: null });
  }
}
