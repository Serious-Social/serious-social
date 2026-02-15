import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { getRecentMarkets, getCastMapping, setCastMapping } from '~/lib/kv';
import { getNeynarClient } from '~/lib/neynar';
import {
  CONTRACTS,
  BELIEF_FACTORY_ABI,
  BELIEF_MARKET_ABI,
  DEFAULT_CHAIN_ID,
} from '~/lib/contracts';
import type { MarketData } from '../route';

const publicClient = createPublicClient({
  chain: base,
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
      try {
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
      } catch (e: unknown) {
        // Handle rate limit / payment errors gracefully
        const status = (e as { status?: number })?.status;
        if (status === 402 || status === 429) {
          console.warn(`Neynar API limit reached (${status}), returning empty for-you feed`);
          return NextResponse.json({ markets: [] });
        }
        throw e;
      }
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

    // Build cast data from stored mappings first, fall back to Neynar for old mappings missing text
    const castMap = new Map<string, MarketData['cast']>();
    const missingMappings: { postId: string; castHash: string; authorFid: number }[] = [];

    for (const { postId, mapping } of matchedMappings) {
      if (mapping.text) {
        castMap.set(mapping.castHash, {
          text: mapping.text,
          author: {
            fid: mapping.authorFid,
            username: mapping.authorUsername || '',
            displayName: mapping.authorDisplayName || mapping.authorUsername || '',
            pfpUrl: mapping.authorPfpUrl || '',
          },
        });
      } else {
        missingMappings.push({ postId, castHash: mapping.castHash, authorFid: mapping.authorFid });
      }
    }

    // Fallback: fetch old mappings individually from Neynar and backfill Redis
    if (missingMappings.length > 0) {
      await Promise.all(
        missingMappings.map(async ({ postId, castHash, authorFid }) => {
          try {
            const response = await client.lookupCastByHashOrWarpcastUrl({
              identifier: castHash,
              type: 'hash',
            });
            const cast = response.cast;
            if (cast) {
              const castData: MarketData['cast'] = {
                text: cast.text,
                author: {
                  fid: cast.author.fid,
                  username: cast.author.username,
                  displayName: cast.author.display_name || cast.author.username,
                  pfpUrl: cast.author.pfp_url || '',
                },
              };
              castMap.set(castHash, castData);

              // Backfill Redis so future requests skip Neynar
              setCastMapping(postId, {
                castHash,
                authorFid,
                createdAt: Date.now(),
                text: cast.text,
                authorUsername: cast.author.username,
                authorDisplayName: cast.author.display_name || cast.author.username,
                authorPfpUrl: cast.author.pfp_url || '',
              }).catch((e) => console.error(`Failed to backfill cast mapping for ${postId}:`, e));
            }
          } catch (e) {
            console.error(`Cast fetch failed for ${castHash}:`, e);
          }
        })
      );
    }

    // Batch-fetch market addresses via multicall (1 RPC call instead of N)
    const addressResults = await publicClient.multicall({
      contracts: matchedMappings.map(({ postId }) => ({
        address: CONTRACTS[DEFAULT_CHAIN_ID].factory,
        abi: BELIEF_FACTORY_ABI,
        functionName: 'getMarket' as const,
        args: [postId as `0x${string}`],
      })),
      allowFailure: true,
    });

    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const marketAddresses = new Map<string, `0x${string}`>();
    const stateContracts: { address: `0x${string}`; abi: typeof BELIEF_MARKET_ABI; functionName: 'getMarketState' }[] = [];
    const statePostIds: string[] = [];

    for (let i = 0; i < matchedMappings.length; i++) {
      const result = addressResults[i];
      if (result.status === 'success') {
        const address = result.result as `0x${string}`;
        if (address && address !== ZERO_ADDRESS) {
          marketAddresses.set(matchedMappings[i].postId, address);
          stateContracts.push({
            address,
            abi: BELIEF_MARKET_ABI,
            functionName: 'getMarketState',
          });
          statePostIds.push(matchedMappings[i].postId);
        }
      }
    }

    // Batch-fetch market states via multicall (1 RPC call instead of N)
    const stateMap = new Map<string, MarketData['state']>();
    if (stateContracts.length > 0) {
      const stateResults = await publicClient.multicall({
        contracts: stateContracts,
        allowFailure: true,
      });

      for (let i = 0; i < stateResults.length; i++) {
        const result = stateResults[i];
        if (result.status === 'success') {
          const ms = result.result as {
            belief: bigint;
            supportWeight: bigint;
            opposeWeight: bigint;
            supportPrincipal: bigint;
            opposePrincipal: bigint;
          };
          stateMap.set(statePostIds[i], {
            belief: ms.belief.toString(),
            supportPrincipal: ms.supportPrincipal.toString(),
            opposePrincipal: ms.opposePrincipal.toString(),
            supportWeight: ms.supportWeight.toString(),
            opposeWeight: ms.opposeWeight.toString(),
          });
        }
      }
    }

    // Assemble final market data
    const markets: MarketData[] = matchedMappings.map(({ postId, mapping }) => {
      const address = marketAddresses.get(postId);
      const state = stateMap.get(postId) ?? null;
      return {
        postId,
        marketAddress: address ?? null,
        exists: !!address,
        cast: castMap.get(mapping.castHash) ?? null,
        state,
        createdAt: mapping.createdAt,
        beliefChange24h: null,
      };
    });

    const validMarkets = markets.filter((m) => m !== null);

    return NextResponse.json({ markets: validMarkets });
  } catch (error) {
    console.error('Error fetching for-you markets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch for-you markets' },
      { status: 500 }
    );
  }
}
