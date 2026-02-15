import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { getRecentMarkets, getCastMapping, setCastMapping, getBeliefSnapshots, BeliefSnapshotEntry } from '~/lib/kv';
import { getNeynarClient } from '~/lib/neynar';
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
    supportWeight: string;
    opposeWeight: string;
  } | null;
  createdAt: number;
  beliefChange24h: number | null;
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

    // Batch-fetch belief snapshots for 24h delta
    const snapshotsMap = await getBeliefSnapshots(postIds);

    // Get cast mappings for all markets
    const mappings = await Promise.all(
      postIds.map(async (postId) => ({
        postId,
        mapping: await getCastMapping(postId),
      }))
    );

    // Filter to markets with valid mappings
    const validMappings = mappings.filter(
      (m): m is { postId: string; mapping: NonNullable<typeof m.mapping> } => m.mapping !== null
    );

    // Build cast data from stored mappings first, fall back to Neynar for old mappings missing text
    const castMap = new Map<string, MarketData['cast']>();
    const missingMappings: { postId: string; castHash: string; authorFid: number }[] = [];

    for (const { postId, mapping } of validMappings) {
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
      const client = getNeynarClient();
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
      contracts: validMappings.map(({ postId }) => ({
        address: CONTRACTS[DEFAULT_CHAIN_ID].factory,
        abi: BELIEF_FACTORY_ABI,
        functionName: 'getMarket' as const,
        args: [postId as `0x${string}`],
      })),
      allowFailure: true,
    });

    // Build address map and collect valid markets for state fetch
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const marketAddresses = new Map<string, `0x${string}`>();
    const stateContracts: { address: `0x${string}`; abi: typeof BELIEF_MARKET_ABI; functionName: 'getMarketState' }[] = [];
    const statePostIds: string[] = [];

    for (let i = 0; i < validMappings.length; i++) {
      const result = addressResults[i];
      if (result.status === 'success') {
        const address = result.result as `0x${string}`;
        if (address && address !== ZERO_ADDRESS) {
          marketAddresses.set(validMappings[i].postId, address);
          stateContracts.push({
            address,
            abi: BELIEF_MARKET_ABI,
            functionName: 'getMarketState',
          });
          statePostIds.push(validMappings[i].postId);
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
    const markets: MarketData[] = validMappings.map(({ postId, mapping }) => {
      const address = marketAddresses.get(postId);
      const state = stateMap.get(postId) ?? null;
      const exists = !!address;

      // Compute 24h belief change
      let beliefChange24h: number | null = null;
      if (state) {
        const snapshots = snapshotsMap.get(postId);
        if (snapshots && snapshots.length > 0) {
          const now = Math.floor(Date.now() / 1000);
          const target = now - 24 * 60 * 60;
          let closest = snapshots[0];
          let closestDiff = Math.abs(closest.ts - target);
          for (const entry of snapshots) {
            const diff = Math.abs(entry.ts - target);
            if (diff < closestDiff) {
              closest = entry;
              closestDiff = diff;
            }
          }
          if (now - closest.ts >= 3600) {
            const currentBelief = Number(BigInt(state.belief) * 10000n / BigInt(1e18)) / 100;
            const snapshotBelief = Number(BigInt(closest.belief) * 10000n / BigInt(1e18)) / 100;
            beliefChange24h = Math.round((currentBelief - snapshotBelief) * 10) / 10;
          }
        }
      }

      return {
        postId,
        marketAddress: address ?? null,
        exists,
        cast: castMap.get(mapping.castHash) ?? null,
        state,
        createdAt: mapping.createdAt,
        beliefChange24h,
      };
    });

    const validMarkets = markets.filter((m) => m !== null);

    return NextResponse.json({ markets: validMarkets });
  } catch (error) {
    console.error('Error fetching markets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}
