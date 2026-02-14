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
