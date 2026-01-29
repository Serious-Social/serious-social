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

    // Fetch full data for matching markets (same pattern as /api/markets)
    const markets = await Promise.all(
      matchingPostIds.map(async (postId): Promise<MarketData | null> => {
        try {
          const mapping = await getCastMapping(postId);
          if (!mapping) return null;

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
                supportPrincipal: bigint;
                opposePrincipal: bigint;
              };

              state = {
                belief: marketState.belief.toString(),
                supportPrincipal: marketState.supportPrincipal.toString(),
                opposePrincipal: marketState.opposePrincipal.toString(),
              };
            }
          } catch {
            // Market might not exist yet
          }

          let cast = null;
          try {
            const response = await client.lookupCastByHashOrWarpcastUrl({
              identifier: mapping.castHash,
              type: 'hash',
            });
            if (response.cast) {
              cast = {
                text: response.cast.text,
                author: {
                  fid: response.cast.author.fid,
                  username: response.cast.author.username,
                  displayName: response.cast.author.display_name || response.cast.author.username,
                  pfpUrl: response.cast.author.pfp_url || '',
                },
              };
            }
          } catch {
            // Cast fetch failed
          }

          return {
            postId,
            marketAddress,
            exists,
            cast,
            state,
            createdAt: mapping.createdAt,
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
