import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { getRecentMarkets, getCastMapping, setCastMapping, getBeliefSnapshots, BeliefSnapshotEntry } from '~/lib/kv';
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

    // Fetch on-chain data for each market in parallel
    const markets = await Promise.all(
      validMappings.map(async ({ postId, mapping }): Promise<MarketData | null> => {
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

              // Fetch market state
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
          } catch (e) {
            // Market might not exist yet, that's okay
          }

          // Compute 24h belief change
          let beliefChange24h: number | null = null;
          if (state) {
            const snapshots = snapshotsMap.get(postId);
            if (snapshots && snapshots.length > 0) {
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
              // Only show delta if the snapshot is at least 1h old
              if (now - closest.ts >= 3600) {
                const currentBelief = Number(BigInt(state.belief) * 10000n / BigInt(1e18)) / 100;
                const snapshotBelief = Number(BigInt(closest.belief) * 10000n / BigInt(1e18)) / 100;
                beliefChange24h = Math.round((currentBelief - snapshotBelief) * 10) / 10;
              }
            }
          }

          return {
            postId,
            marketAddress,
            exists,
            cast: castMap.get(mapping.castHash) ?? null,
            state,
            createdAt: mapping.createdAt,
            beliefChange24h,
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
