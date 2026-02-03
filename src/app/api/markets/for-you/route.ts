import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { getRecentMarkets, getCastMapping } from '~/lib/kv';
import { getNeynarClient } from '~/lib/neynar';
import {
  CONTRACTS,
  BELIEF_FACTORY_ABI,
  BELIEF_MARKET_ABI,
  DEFAULT_CHAIN_ID,
} from '~/lib/contracts';
import type { MarketData } from '../route';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

/**
 * GET /api/markets/for-you?fid=123
 * Fetch markets created by people the user follows.
 */
export async function GET(request: NextRequest) {
  const fidParam = request.nextUrl.searchParams.get('fid');
  if (!fidParam) {
    return NextResponse.json({ markets: [] });
  }

  const fid = parseInt(fidParam, 10);
  if (isNaN(fid) || fid <= 0) {
    return NextResponse.json({ markets: [] });
  }

  try {
    // Fetch the user's following list (paginate to collect FIDs)
    const client = getNeynarClient();
    const followedFids = new Set<number>();
    let cursor: string | undefined;

    // Paginate through following list (up to 500 to keep it bounded)
    for (let i = 0; i < 5; i++) {
      const response = await client.fetchUserFollowing({
        fid,
        limit: 100,
        ...(cursor ? { cursor } : {}),
      });

      for (const follower of response.users) {
        followedFids.add(follower.user.fid);
      }

      if (!response.next?.cursor) break;
      cursor = response.next.cursor;
    }

    if (followedFids.size === 0) {
      return NextResponse.json({ markets: [] });
    }

    // Get all recent market postIds
    const postIds = await getRecentMarkets(50);
    if (postIds.length === 0) {
      return NextResponse.json({ markets: [] });
    }

    // Get cast mappings and filter by followed FIDs
    const mappings = await Promise.all(
      postIds.map(async (postId) => {
        const mapping = await getCastMapping(postId);
        return { postId, mapping };
      })
    );

    const matchingPostIds = mappings
      .filter(({ mapping }) =>
        mapping &&
        mapping.authorFid !== fid &&
        followedFids.has(mapping.authorFid)
      )
      .map(({ postId }) => postId);

    if (matchingPostIds.length === 0) {
      return NextResponse.json({ markets: [] });
    }

    // Re-fetch mappings for matching markets and bulk-fetch casts
    const matchedMappings = await Promise.all(
      matchingPostIds.map(async (postId) => ({
        postId,
        mapping: (await getCastMapping(postId))!,
      }))
    );

    const castHashes = matchedMappings.map((m) => m.mapping.castHash);
    const castMap = new Map<string, MarketData['cast']>();

    if (castHashes.length > 0) {
      try {
        const response = await client.fetchBulkCasts({ casts: castHashes });
        for (const cast of response.casts) {
          castMap.set(cast.hash, {
            text: cast.text,
            author: {
              fid: cast.author.fid,
              username: cast.author.username,
              displayName: cast.author.display_name || cast.author.username,
              pfpUrl: cast.author.pfp_url || '',
            },
          });
        }
      } catch (e) {
        console.error('Bulk cast fetch failed:', e);
      }
    }

    // Fetch on-chain data for matching markets
    const markets = await Promise.all(
      matchedMappings.map(async ({ postId, mapping }): Promise<MarketData | null> => {
        try {
          let marketAddress: string | null = null;
          let exists = false;
          let state = null;

          try {
            const address = await publicClient.readContract({
              address: CONTRACTS[DEFAULT_CHAIN_ID].factory,
              abi: BELIEF_FACTORY_ABI,
              functionName: 'getMarket',
              args: [postId as `0x${string}`],
            }) as `0x${string}`;

            if (address && address !== '0x0000000000000000000000000000000000000000') {
              marketAddress = address;
              exists = true;

              const marketState = await publicClient.readContract({
                address: address,
                abi: BELIEF_MARKET_ABI,
                functionName: 'getMarketState',
              }) as {
                belief: bigint;
                supportWeight: bigint;
                opposeWeight: bigint;
                supportPrincipal: bigint;
                opposePrincipal: bigint;
              };

              state = {
                belief: marketState.belief.toString(),
                supportPrincipal: marketState.supportPrincipal.toString(),
                opposePrincipal: marketState.opposePrincipal.toString(),
                supportWeight: marketState.supportWeight.toString(),
                opposeWeight: marketState.opposeWeight.toString(),
              };
            }
          } catch {
            // Market might not exist yet
          }

          return {
            postId,
            marketAddress,
            exists,
            cast: castMap.get(mapping.castHash) ?? null,
            state,
            createdAt: mapping.createdAt,
            beliefChange24h: null,
          };
        } catch (e) {
          console.error(`Error fetching market ${postId}:`, e);
          return null;
        }
      })
    );

    const validMarkets = markets.filter((m): m is MarketData => m !== null);

    return NextResponse.json({ markets: validMarkets });
  } catch (error) {
    console.error('Error fetching for-you markets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch for-you markets' },
      { status: 500 }
    );
  }
}
