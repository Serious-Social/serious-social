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
export function HomeTab() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="px-4 py-2 space-y-6 max-w-lg mx-auto">
      {/* Header section */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">Belief Markets</h2>
        <p className="text-sm text-gray-600">
          Signal conviction with capital. Support claims you believe in or
          challenge those you disagree with.
        </p>
      </div>

      {/* Create button */}
      <Link
        href="/create"
        className="block w-full py-4 px-6 bg-slate-700 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors text-center"
      >
        Create a Belief Market
      </Link>

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
    </div>
  );
}

function MarketCard({ market }: { market: MarketData }) {
  const supportAmount = market.state ? BigInt(market.state.supportPrincipal) : 0n;
  const opposeAmount = market.state ? BigInt(market.state.opposePrincipal) : 0n;
  const total = supportAmount + opposeAmount;
  const supportPercent = total > 0n ? Number((supportAmount * 100n) / total) : 50;

  const formatUSDC = (amount: bigint) => {
    return (Number(amount) / 1_000_000).toFixed(0);
  };

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

      {/* Belief bar */}
      {market.exists && market.state && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>${formatUSDC(supportAmount)} support</span>
            <span>${formatUSDC(opposeAmount)} challenge</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-600 transition-all"
              style={{ width: `${supportPercent}%` }}
            />
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