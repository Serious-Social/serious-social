"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { MarketData } from "~/app/api/markets/route";

/**
 * HomeTab component displays the main landing content for the mini app.
 *
 * This is the default tab that users see when they first open the mini app.
 * It shows recent belief markets and a way to create new ones.
 */
export function HomeTab({ fid }: { fid?: number }) {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forYouMarkets, setForYouMarkets] = useState<MarketData[]>([]);
  const [forYouLoading, setForYouLoading] = useState(false);

  useEffect(() => {
    async function fetchMarkets() {
      try {
        const response = await fetch('/api/markets?limit=10');
        if (!response.ok) {
          throw new Error('Failed to fetch markets');
        }
        const data = await response.json();
        setMarkets(data.markets || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load markets');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMarkets();
  }, []);

  useEffect(() => {
    if (!fid) return;

    async function fetchForYouMarkets() {
      setForYouLoading(true);
      try {
        const response = await fetch(`/api/markets/for-you?fid=${fid}`);
        if (!response.ok) return;
        const data = await response.json();
        setForYouMarkets(data.markets || []);
      } catch {
        // Silently fail — the section just won't appear
      } finally {
        setForYouLoading(false);
      }
    }

    fetchForYouMarkets();
  }, [fid]);

  return (
    <div className="px-4 py-4 space-y-6 max-w-lg mx-auto bg-white min-h-screen">
      {/* Header section */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">Belief Markets</h2>
        <p className="text-sm text-gray-600">
          Signal conviction with capital. Support claims you believe in or
          challenge those you disagree with.
        </p>
      </div>

      {/* For You markets */}
      {forYouLoading && fid && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-500">For You</h3>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-600 mx-auto" />
          </div>
        </div>
      )}

      {!forYouLoading && forYouMarkets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-500">For You</h3>
          <div className="space-y-3">
            {forYouMarkets.map((market) => (
              <MarketCard key={market.postId} market={market} />
            ))}
          </div>
        </div>
      )}

      {/* Recent markets */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-500">Recent Markets</h3>

        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading markets...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-600 text-sm">
            {error}
          </div>
        )}

        {!isLoading && !error && markets.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No markets yet.</p>
            <p className="text-xs text-gray-400 mt-1">Be the first to create one!</p>
          </div>
        )}

        {!isLoading && !error && markets.length > 0 && (
          <div className="space-y-3">
            {markets.map((market) => (
              <MarketCard key={market.postId} market={market} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-400">
          Powered by Neynar
        </p>
      </div>

      {/* Floating action buttons */}
      <Link
        href="/about"
        className="fixed bottom-6 left-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
      >
        ?
      </Link>
      <Link
        href="/create"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl font-bold bg-slate-700 text-white hover:bg-slate-800 transition-colors"
      >
        +
      </Link>
    </div>
  );
}

function MarketCard({ market }: { market: MarketData }) {
  const supportAmount = market.state ? BigInt(market.state.supportPrincipal) : 0n;
  const opposeAmount = market.state ? BigInt(market.state.opposePrincipal) : 0n;
  const totalPrincipal = supportAmount + opposeAmount;
  const capitalSupportPercent = totalPrincipal > 0n ? Number((supportAmount * 100n) / totalPrincipal) : 50;

  const supportWeight = market.state ? BigInt(market.state.supportWeight) : 0n;
  const opposeWeight = market.state ? BigInt(market.state.opposeWeight) : 0n;
  const supportTime = supportAmount > 0n ? Number(supportWeight / supportAmount) : 0;
  const opposeTime = opposeAmount > 0n ? Number(opposeWeight / opposeAmount) : 0;
  const totalTime = supportTime + opposeTime;
  const timeSupportPercent = totalTime > 0 ? (supportTime / totalTime) * 100 : 50;

  const beliefPercent = market.state
    ? Number(BigInt(market.state.belief) * 100n / BigInt(1e18))
    : 50;

  const timeAgo = getTimeAgo(new Date(market.createdAt));

  return (
    <Link
      href={`/market/${market.postId}`}
      className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Author */}
      {market.cast && (
        <div className="flex items-center gap-2 mb-2">
          {market.cast.author.pfpUrl && (
            <img
              src={market.cast.author.pfpUrl}
              alt={market.cast.author.displayName}
              className="w-6 h-6 rounded-full"
            />
          )}
          <span className="text-sm text-gray-600">@{market.cast.author.username}</span>
          <span className="text-xs text-gray-400">{timeAgo}</span>
        </div>
      )}

      {/* Claim text */}
      <p className="text-gray-900 text-sm line-clamp-2 mb-3">
        {market.cast?.text || 'Claim not available'}
      </p>

      {/* Condensed belief bars */}
      {market.exists && market.state && (
        <div className="space-y-1.5">
          {totalPrincipal > 0n && (
            <>
              {/* Capital bar */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs w-4 shrink-0">💰</span>
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden flex">
                  <div className="bg-slate-600 transition-all" style={{ width: `${capitalSupportPercent}%` }} />
                  <div className="bg-slate-300 transition-all" style={{ width: `${100 - capitalSupportPercent}%` }} />
                </div>
              </div>

              {/* Time bar */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs w-4 shrink-0">⏳</span>
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden flex">
                  <div className="bg-slate-600 transition-all" style={{ width: `${timeSupportPercent}%` }} />
                  <div className="bg-slate-300 transition-all" style={{ width: `${100 - timeSupportPercent}%` }} />
                </div>
              </div>
            </>
          )}

          {/* Net belief bar */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs w-4 shrink-0">⚖️</span>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden flex">
              <div className="bg-slate-600 transition-all" style={{ width: `${beliefPercent}%` }} />
              <div className="bg-slate-300 transition-all" style={{ width: `${100 - beliefPercent}%` }} />
            </div>
            {market.beliefChange24h != null && market.beliefChange24h !== 0 && (
              <span className={`text-xs font-medium shrink-0 ${market.beliefChange24h > 0 ? 'text-slate-500' : 'text-amber-600'}`}>
                {market.beliefChange24h > 0 ? '+' : ''}{market.beliefChange24h}%
              </span>
            )}
          </div>
        </div>
      )}

      {!market.exists && (
        <div className="text-xs text-amber-600">
          Market pending confirmation
        </div>
      )}
    </Link>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
} 