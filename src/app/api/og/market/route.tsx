import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { getCastMapping } from "~/lib/kv";
import { getNeynarClient } from "~/lib/neynar";
import {
  CONTRACTS,
  BELIEF_FACTORY_ABI,
  BELIEF_MARKET_ABI,
  DEFAULT_CHAIN_ID,
} from "~/lib/contracts";

export const dynamic = 'force-dynamic';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');

  if (!postId) {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: '100%', height: '100%', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
          <h1 style={{ fontSize: 60, color: '#fff' }}>Invalid Market</h1>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  // Fetch market data
  let marketAddress: string | null = null;
  let supportPool = 0n;
  let opposePool = 0n;
  let marketExists = false;
  let state: {
    belief: bigint;
    supportWeight: bigint;
    opposeWeight: bigint;
    supportPrincipal: bigint;
    opposePrincipal: bigint;
    srpBalance: bigint;
  } | null = null;

  try {
    const address = await publicClient.readContract({
      address: CONTRACTS[DEFAULT_CHAIN_ID].factory,
      abi: BELIEF_FACTORY_ABI,
      functionName: 'getMarket',
      args: [postId as `0x${string}`],
    }) as `0x${string}`;

    if (address && address !== '0x0000000000000000000000000000000000000000') {
      marketAddress = address;
      marketExists = true;

      // Fetch market state
      state = await publicClient.readContract({
        address: address,
        abi: BELIEF_MARKET_ABI,
        functionName: 'getMarketState',
      }) as {
        belief: bigint;
        supportWeight: bigint;
        opposeWeight: bigint;
        supportPrincipal: bigint;
        opposePrincipal: bigint;
        srpBalance: bigint;
      };

      supportPool = state.supportPrincipal;
      opposePool = state.opposePrincipal;
    }
  } catch (e) {
    console.error('Error fetching market data:', e);
  }

  // Fetch cast content
  let castText = 'Claim not available';
  let authorName = '';
  let authorPfp = '';

  try {
    const mapping = await getCastMapping(postId);
    if (mapping) {
      const client = getNeynarClient();
      const response = await client.lookupCastByHashOrWarpcastUrl({
        identifier: mapping.castHash,
        type: 'hash',
      });
      if (response.cast) {
        castText = response.cast.text;
        authorName = response.cast.author.display_name || response.cast.author.username;
        authorPfp = response.cast.author.pfp_url || '';
      }
    }
  } catch (e) {
    console.error('Error fetching cast:', e);
  }

  // Truncate text if too long
  const maxLength = 200;
  const displayText = castText.length > maxLength
    ? castText.slice(0, maxLength) + '...'
    : castText;

  // Calculate percentages
  const total = supportPool + opposePool;
  const capitalSupportPercent = total > 0n ? Number((supportPool * 100n) / total) : 50;

  // Time commitment: average seconds per dollar = weight / principal
  const supportTime = state?.supportPrincipal && state.supportPrincipal > 0n
    ? Number(state.supportWeight / state.supportPrincipal)
    : 0;
  const opposeTime = state?.opposePrincipal && state.opposePrincipal > 0n
    ? Number(state.opposeWeight / state.opposePrincipal)
    : 0;
  const totalTime = supportTime + opposeTime;
  const timeSupportPercent = totalTime > 0 ? Math.round((supportTime / totalTime) * 100) : 50;

  // Main belief signal
  const beliefPercent = state?.belief ? Number(state.belief * 100n / BigInt(1e18)) : 50;
  const beliefOpposePercent = 100 - beliefPercent;

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#f8fafc' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 64px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#1e293b' }}>Serious Social</div>
          <div style={{ fontSize: 20, color: '#64748b' }}>Belief Market</div>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '40px 64px' }}>
          {/* Author */}
          {authorName && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
              <span style={{ fontSize: 24, color: '#475569' }}>@{authorName}</span>
            </div>
          )}

          {/* Claim text */}
          <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
            <p style={{ fontSize: 40, color: '#0f172a', lineHeight: 1.4 }}>{displayText}</p>
          </div>

          {/* Belief signal bars */}
          {marketExists && (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40 }}>
              {/* Unchallenged badge */}
              {opposePool === 0n && supportPool > 0n && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 18, color: '#b45309', backgroundColor: '#fef3c7', padding: '8px 16px', borderRadius: 9999, fontWeight: 500 }}>
                    Unchallenged
                  </span>
                </div>
              )}

              {/* Capital bar */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 20, color: '#64748b', width: 40 }}>$</span>
                <div style={{ display: 'flex', flex: 1, height: 12, backgroundColor: '#cbd5e1', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', height: '100%', width: `${capitalSupportPercent}%`, backgroundColor: '#334155', borderRadius: 9999 }} />
                </div>
              </div>

              {/* Time bar */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 20, color: '#64748b', width: 40 }}>{"\u23F1"}</span>
                <div style={{ display: 'flex', flex: 1, height: 12, backgroundColor: '#cbd5e1', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', height: '100%', width: `${timeSupportPercent}%`, backgroundColor: '#334155', borderRadius: 9999 }} />
                </div>
              </div>

              {/* Main belief bar */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 40 }} />
                <div style={{ display: 'flex', flex: 1, height: 32, backgroundColor: '#cbd5e1', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', height: '100%', width: `${Math.max(beliefPercent, 5)}%`, backgroundColor: '#334155', borderRadius: 9999, alignItems: 'center', justifyContent: 'center' }}>
                    {beliefPercent > 10 && (
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{beliefPercent}%</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Support / Challenge labels */}
              <div style={{ display: 'flex', marginTop: 8 }}>
                <div style={{ width: 40 }} />
                <div style={{ display: 'flex', flex: 1, justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 20, fontWeight: 500, color: '#334155' }}>Support</span>
                  <span style={{ fontSize: 20, fontWeight: 500, color: '#334155' }}>Challenge</span>
                </div>
              </div>
            </div>
          )}

          {!marketExists && (
            <div style={{ display: 'flex', marginTop: 40, padding: '16px 24px', backgroundColor: '#fef3c7', borderRadius: 12 }}>
              <span style={{ fontSize: 20, color: '#92400e' }}>Market not yet created</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 64px', backgroundColor: '#f1f5f9', borderTop: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: 24, color: '#64748b', fontWeight: 500 }}>Put your money where your mouth is</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
