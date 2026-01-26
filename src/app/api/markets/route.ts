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

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export interface MarketData {
  postId: string;
  marketAddress: string | null;
  exists: boolean;
  cast: {
    text: string;
    author: {
      fid: number;
      username: string;
      displayName: string;
      pfpUrl: string;
    };
  } | null;
  state: {
    belief: string;
    supportPrincipal: string;
    opposePrincipal: string;
  } | null;
  createdAt: number;
}

/**
 * GET /api/markets?limit=10
 * Fetch recent markets with their data.
 */
export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(limitParam || '10', 10), 1), 20);

  try {
    // Get recent market postIds
    const postIds = await getRecentMarkets(limit);

    if (postIds.length === 0) {
      return NextResponse.json({ markets: [] });
    }

    // Fetch data for each market in parallel
    const markets = await Promise.all(
      postIds.map(async (postId): Promise<MarketData | null> => {
        try {
          // Get cast mapping
          const mapping = await getCastMapping(postId);
          if (!mapping) {
            return null;
          }

          // Check if market exists on-chain
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

              // Fetch market state
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
          } catch (e) {
            // Market might not exist yet, that's okay
          }

          // Fetch cast content
          let cast = null;
          try {
            const client = getNeynarClient();
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
          } catch (e) {
            // Cast fetch failed, continue without it
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

    // Filter out null results
    const validMarkets = markets.filter((m): m is MarketData => m !== null);

    return NextResponse.json({ markets: validMarkets });
  } catch (error) {
    console.error('Error fetching markets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}
