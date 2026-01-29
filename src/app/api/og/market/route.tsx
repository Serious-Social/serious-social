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
import { APP_URL } from "~/lib/constants";

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
      { width: 1200, height: 800 }
    );
  }

  // Fetch market data
  let marketAddress: string | null = null;
  let supportPool = 0n;
  let opposePool = 0n;
  let marketExists = false;

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
      const state = await publicClient.readContract({
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
  const supportPercent = total > 0n ? Number((supportPool * 100n) / total) : 50;
  const opposePercent = total > 0n ? 100 - supportPercent : 50;

  // Format amounts
  const formatUSDC = (amount: bigint) => {
    return (Number(amount) / 1_000_000).toFixed(0);
  };

  // Use 3:2 aspect ratio for Mini App embeds (1200x800)
  return new ImageResponse(
    (
      <div tw="flex h-full w-full flex-col bg-slate-50">
        {/* Header */}
        <div tw="flex items-center justify-between px-16 py-6 bg-white border-b border-slate-200">
          <div tw="flex items-center">
            <img src={`${APP_URL}/logo.png`} width={48} height={34} tw="mr-3" />
            <div tw="text-3xl font-bold text-slate-800">Serious Social</div>
          </div>
          <div tw="text-xl text-slate-500">Belief Market</div>
        </div>

        {/* Content - more padding */}
        <div tw="flex flex-1 flex-col px-16 py-10">
          {/* Author */}
          {authorName && (
            <div tw="flex items-center mb-6">
              {authorPfp && (
                <img
                  src={authorPfp}
                  tw="w-14 h-14 rounded-full mr-4"
                  alt=""
                />
              )}
              <span tw="text-2xl text-slate-600">@{authorName}</span>
            </div>
          )}

          {/* Claim text */}
          <div tw="flex flex-1 items-center">
            <p tw="text-4xl text-slate-900 leading-snug">{displayText}</p>
          </div>

          {/* Belief signal bar */}
          {marketExists && (
            <div tw="flex flex-col mt-10">
              <div tw="flex justify-between mb-3">
                <span tw="text-xl text-slate-600">
                  Support: ${formatUSDC(supportPool)} ({supportPercent}%)
                </span>
                <span tw="text-xl text-slate-600">
                  Challenge: ${formatUSDC(opposePool)} ({opposePercent}%)
                </span>
              </div>
              <div tw="flex w-full h-8 bg-slate-200 rounded-full overflow-hidden">
                <div
                  tw="flex h-full bg-slate-700"
                  style={{ width: `${supportPercent}%` }}
                />
                <div
                  tw="flex h-full bg-slate-400"
                  style={{ width: `${opposePercent}%` }}
                />
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
          <span tw="text-lg text-slate-500">Put your money where your mouth is</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 800,
    }
  );
}
