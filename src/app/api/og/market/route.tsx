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

// Purple theme colors (default)
const THEME = {
  bg: '#0c0a15',
  embedBg: '#110e1c',
  surface: '#1a1625',
  border: '#2d2640',
  primary: '#a78bfa',
  primaryMuted: '#7c3aed',
  text: '#f5f3ff',
  textMuted: '#a1a1aa',
  positive: '#a78bfa',
  negative: '#fb923c',
  accent: '#c4b5fd',
};

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
        <div style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: THEME.bg,
        }}>
          <h1 style={{ fontSize: 60, color: THEME.text }}>Invalid Market</h1>
        </div>
      ),
      { width: 1200, height: 800 }
    );
  }

  // Fetch market data
  let supportPool = 0n;
  let opposePool = 0n;
  let marketExists = false;
  let participantCount = 0;
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

      // Get participant count from API
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://serious.social';
        const participantsRes = await fetch(`${baseUrl}/api/market-participants?postId=${postId}`);
        if (participantsRes.ok) {
          const participantsData = await participantsRes.json();
          participantCount = (participantsData.support?.length || 0) + (participantsData.challenge?.length || 0);
        }
      } catch {
        // Ignore participant fetch errors
      }
    }
  } catch (e) {
    console.error('Error fetching market data:', e);
  }

  // Fetch cast content from Redis cache (avoids Neynar rate limits)
  let castText = 'Claim not available';

  try {
    const mapping = await getCastMapping(postId);
    if (mapping) {
      // Use cached text from Redis if available
      if (mapping.text) {
        castText = mapping.text;
      } else {
        // Fallback to Neynar API only if no cached text
        try {
          const client = getNeynarClient();
          const response = await client.lookupCastByHashOrWarpcastUrl({
            identifier: mapping.castHash,
            type: 'hash',
          });
          if (response.cast) {
            castText = response.cast.text;
          }
        } catch (apiError) {
          // Neynar rate limited or unavailable - use fallback
          console.warn('Neynar API unavailable, using fallback text');
        }
      }
    }
  } catch (e) {
    console.error('Error fetching cast mapping:', e);
  }

  // Truncate text if too long
  const maxLength = 140;
  const displayText = castText.length > maxLength
    ? castText.slice(0, maxLength) + '...'
    : castText;

  // Calculate percentages
  const total = supportPool + opposePool;
  const supportPercent = total > 0n ? Number((supportPool * 100n) / total) : 100;
  const isUnchallenged = opposePool === 0n && supportPool > 0n;

  // Format USDC (6 decimals)
  const totalStaked = Number(total) / 1_000_000;
  const stakedDisplay = totalStaked >= 1000
    ? `$${(totalStaked / 1000).toFixed(1)}k`
    : `$${totalStaked.toFixed(0)}`;

  return new ImageResponse(
    (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: THEME.embedBg,
        padding: '48px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
      }}>
        {/* Grid texture overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(${THEME.border}40 1px, transparent 1px),
            linear-gradient(90deg, ${THEME.border}40 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          opacity: 0.3,
        }} />

        {/* Content container */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Header row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
          }}>
            <span style={{
              color: THEME.primary,
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '3px',
            }}>
              SERIOUS.SOCIAL
            </span>
            {marketExists && (
              isUnchallenged ? (
                <span style={{
                  color: THEME.accent,
                  fontSize: '20px',
                  padding: '8px 20px',
                  border: `2px solid ${THEME.accent}`,
                  letterSpacing: '1px',
                  fontWeight: 500,
                }}>
                  UNCHALLENGED
                </span>
              ) : (
                <span style={{
                  color: THEME.textMuted,
                  fontSize: '20px',
                  padding: '8px 20px',
                  border: `2px solid ${THEME.border}`,
                  letterSpacing: '1px',
                }}>
                  {supportPercent}% SUPPORT
                </span>
              )
            )}
          </div>

          {/* Claim text */}
          <div style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
          }}>
            <p style={{
              color: THEME.text,
              fontSize: '36px',
              lineHeight: 1.4,
              opacity: 0.9,
              margin: 0,
            }}>
              &ldquo;{displayText}&rdquo;
            </p>
          </div>

          {/* Bottom stats row */}
          {marketExists && (
            <div style={{
              display: 'flex',
              gap: '60px',
              alignItems: 'flex-end',
              paddingTop: '32px',
              borderTop: `2px solid ${THEME.border}`,
              marginTop: '32px',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{
                  color: THEME.primary,
                  fontSize: '48px',
                  fontWeight: 700,
                  lineHeight: 1,
                }}>
                  {stakedDisplay}
                </span>
                <span style={{
                  color: THEME.textMuted,
                  fontSize: '16px',
                  letterSpacing: '1px',
                  marginTop: '8px',
                }}>
                  STAKED
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{
                  color: THEME.text,
                  fontSize: '48px',
                  fontWeight: 700,
                  lineHeight: 1,
                }}>
                  {participantCount || '—'}
                </span>
                <span style={{
                  color: THEME.textMuted,
                  fontSize: '16px',
                  letterSpacing: '1px',
                  marginTop: '8px',
                }}>
                  BELIEVERS
                </span>
              </div>
              {!isUnchallenged && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  marginLeft: 'auto',
                }}>
                  {/* Mini belief bar */}
                  <div style={{
                    display: 'flex',
                    width: '200px',
                    height: '12px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${supportPercent}%`,
                      backgroundColor: THEME.positive,
                      height: '100%',
                    }} />
                    <div style={{
                      flex: 1,
                      backgroundColor: THEME.negative,
                      opacity: 0.4,
                      height: '100%',
                    }} />
                  </div>
                  <span style={{
                    color: THEME.textMuted,
                    fontSize: '16px',
                    letterSpacing: '1px',
                    marginTop: '8px',
                    textAlign: 'right',
                  }}>
                    {supportPercent}% / {100 - supportPercent}%
                  </span>
                </div>
              )}
              {isUnchallenged && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  marginLeft: 'auto',
                  alignItems: 'flex-end',
                }}>
                  <span style={{
                    color: THEME.text,
                    fontSize: '48px',
                    fontWeight: 700,
                    lineHeight: 1,
                  }}>
                    100%
                  </span>
                  <span style={{
                    color: THEME.textMuted,
                    fontSize: '16px',
                    letterSpacing: '1px',
                    marginTop: '8px',
                  }}>
                    SUPPORT
                  </span>
                </div>
              )}
            </div>
          )}

          {!marketExists && (
            <div style={{
              display: 'flex',
              marginTop: 'auto',
              padding: '20px 32px',
              backgroundColor: `${THEME.surface}`,
              border: `2px solid ${THEME.border}`,
            }}>
              <span style={{ fontSize: '24px', color: THEME.textMuted }}>
                Market pending confirmation
              </span>
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 800,
    }
  );
}
