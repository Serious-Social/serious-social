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
        <div tw="flex h-full w-full flex-col justify-center items-center bg-slate-900">
          <h1 tw="text-6xl text-white">Invalid Market</h1>
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

  // Use 3:2 aspect ratio for Mini App embeds (1200x800)
  return new ImageResponse(
    (
      <div tw="flex h-full w-full flex-col bg-slate-50">
        {/* Header */}
        <div tw="flex items-center justify-between px-16 py-6 bg-white border-b border-slate-200">
          <div tw="text-3xl font-bold text-slate-800">Serious Social</div>
          <div tw="text-xl text-slate-500">Belief Market</div>
        </div>

        {/* Content - more padding */}
        <div tw="flex flex-1 flex-col px-16 py-10">
          {/* Author */}
          {authorName && (
            <div tw="flex items-center mb-6">
              <span tw="text-2xl text-slate-600">@{authorName}</span>
            </div>
          )}

          {/* Claim text */}
          <div tw="flex flex-1 items-center">
            <p tw="text-4xl text-slate-900 leading-snug">{displayText}</p>
          </div>

          {/* Belief signal bars */}
          {marketExists && (
            <div tw="flex flex-col mt-10">
              {/* Unchallenged badge - centered */}
              {opposePool === 0n && supportPool > 0n && (
                <div tw="flex justify-center mb-4">
                  <span tw="text-lg text-amber-700 bg-amber-100 px-4 py-2 rounded-full font-medium">
                    Unchallenged
                  </span>
                </div>
              )}

              {/* Capital bar */}
              <div tw="flex items-center mb-2">
                <span tw="text-xl text-slate-500 w-10">$</span>
                <div tw="flex flex-1 h-3 bg-slate-300 rounded-full overflow-hidden">
                  <div
                    tw="flex h-full bg-slate-700 rounded-full"
                    style={{ width: `${capitalSupportPercent}%` }}
                  />
                </div>
              </div>

              {/* Time bar */}
              <div tw="flex items-center mb-3">
                <span tw="text-xl text-slate-500 w-10">{"\u23F1"}</span>
                <div tw="flex flex-1 h-3 bg-slate-300 rounded-full overflow-hidden">
                  <div
                    tw="flex h-full bg-slate-700 rounded-full"
                    style={{ width: `${timeSupportPercent}%` }}
                  />
                </div>
              </div>

              {/* Main belief bar */}
              <div tw="flex items-center">
                <div tw="w-10" />
                <div tw="flex flex-1 h-8 bg-slate-300 rounded-full overflow-hidden">
                  <div
                    tw="flex h-full bg-slate-700 rounded-full items-center justify-center"
                    style={{ width: `${beliefPercent}%`, minWidth: beliefPercent > 5 ? undefined : '40px' }}
                  >
                    {beliefPercent > 10 && (
                      <span tw="text-sm font-bold text-white">{beliefPercent}%</span>
                    )}
                  </div>
                  {beliefPercent <= 10 && beliefOpposePercent > 10 && (
                    <div tw="flex items-center justify-end flex-1">
                      <span tw="text-sm font-bold text-slate-600 mr-2">{beliefOpposePercent}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Support / Challenge labels */}
              <div tw="flex mt-2">
                <div tw="w-10" />
                <div tw="flex flex-1 justify-between">
                  <span tw="text-xl font-medium text-slate-700">Support</span>
                  <span tw="text-xl font-medium text-slate-700">Challenge</span>
                </div>
              </div>
            </div>
          )}

          {!marketExists && (
            <div tw="flex mt-10 px-6 py-4 bg-amber-100 rounded-xl">
              <span tw="text-xl text-amber-800">Market not yet created</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div tw="flex items-center justify-center px-16 py-6 bg-slate-100 border-t border-slate-200">
          <span tw="text-2xl text-slate-500 font-medium">Put your money where your mouth is</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
