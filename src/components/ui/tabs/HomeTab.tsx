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
    <div className="px-4 py-4 space-y-6 max-w-lg mx-auto bg-theme-bg min-h-screen">
      {/* Header section */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-theme-text">Belief Markets</h2>
        <p className="text-sm text-theme-text-muted">
          Signal conviction with capital. Support claims you believe in or
          challenge those you disagree with.
        </p>
      </div>

      {/* For You markets */}
      {forYouLoading && fid && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-theme-text-muted">For You</h3>
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      )}

      {!forYouLoading && forYouMarkets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-theme-text-muted">For You</h3>
          <div className="space-y-3">
            {forYouMarkets.map((market) => (
              <MarketCard key={market.postId} market={market} />
            ))}
          </div>
        </div>
      )}

      {/* Recent markets */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-theme-text-muted">Recent Markets</h3>

        {isLoading && (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-500 text-sm">
            {error}
          </div>
        )}

        {!isLoading && !error && markets.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-theme-text-muted">No markets yet.</p>
            <p className="text-xs text-theme-text-muted/70 mt-1">Be the first to create one!</p>
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
      <div className="pt-4 border-t border-theme-border text-center">
        <p className="text-xs text-theme-text-muted/70">
          Powered by Neynar
        </p>
      </div>

      {/* Floating action buttons */}
      <Link
        href="/about"
        className="fixed bottom-6 left-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl font-bold bg-theme-surface border border-theme-border text-theme-text-muted hover:text-theme-text hover:bg-theme-border transition-colors"
      >
        ?
      </Link>
      <Link
        href="/create"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl font-bold bg-gradient-primary text-white hover:opacity-90 transition-colors"
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
  const isUnchallenged = market.state && opposeAmount === 0n;

  const beliefPercent = market.state
    ? Number(BigInt(market.state.belief) * 100n / BigInt(1e18))
    : 50;

  const formatUSDC = (amount: bigint) => {
    return (Number(amount) / 1_000_000).toFixed(0);
  };

  const timeAgo = getTimeAgo(new Date(market.createdAt));

  return (
    <Link
      href={`/market/${market.postId}`}
      className="block bg-theme-surface border border-theme-border rounded-xl p-4 hover:border-theme-primary/50 hover:bg-theme-surface/80 active:scale-[0.99] transition-all duration-150"
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
          <span className="text-sm text-theme-text-muted">@{market.cast.author.username}</span>
          <span className="text-xs text-theme-text-muted/70">{timeAgo}</span>
        </div>
      )}

      {/* Claim text */}
      <p className="text-theme-text text-sm line-clamp-4 mb-3">
        {market.cast?.text || 'Claim not available'}
      </p>

      {/* Belief indicator */}
      {market.exists && market.state && (
        isUnchallenged ? (
          <div className="text-center">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-theme-accent/10 text-theme-accent border border-theme-accent/30">
              Unchallenged
            </span>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline text-xs text-theme-text-muted">
              <span>{beliefPercent.toFixed(0)}% support · ${formatUSDC(totalPrincipal)} committed</span>
              {market.beliefChange24h != null && market.beliefChange24h !== 0 && (
                <span className={`font-medium ${market.beliefChange24h > 0 ? 'text-theme-positive' : 'text-theme-negative'}`}>
                  {market.beliefChange24h > 0 ? '+' : ''}{market.beliefChange24h}% 24h
                </span>
              )}
            </div>
            {/* Segmented belief bar */}
            <div className="flex gap-0.5 w-full">
              {Array.from({ length: 20 }).map((_, i) => {
                const filledSegments = Math.round((beliefPercent / 100) * 20);
                return (
                  <div
                    key={i}
                    className={`h-2 flex-1 ${
                      i < filledSegments ? 'bg-theme-positive' : 'bg-theme-border'
                    }`}
                  />
                );
              })}
            </div>
            {/* Support/Challenge labels */}
            <div className="flex justify-between text-xs text-theme-text-muted">
              <span>Support</span>
              <span>Challenge</span>
            </div>
          </div>
        )
      )}

      {!market.exists && (
        <div className="text-xs text-theme-negative">
          Market pending confirmation
        </div>
      )}
    </Link>
  );
}

/** Skeleton loading card that preserves layout during loading */
function SkeletonCard() {
  return (
    <div className="bg-theme-surface border border-theme-border rounded-xl p-4 animate-pulse">
      {/* Author skeleton */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-theme-border" />
        <div className="h-4 w-24 bg-theme-border rounded" />
        <div className="h-3 w-8 bg-theme-border rounded" />
      </div>
      {/* Text skeleton */}
      <div className="space-y-2 mb-3">
        <div className="h-4 bg-theme-border rounded w-full" />
        <div className="h-4 bg-theme-border rounded w-5/6" />
        <div className="h-4 bg-theme-border rounded w-3/4" />
      </div>
      {/* Bar skeleton */}
      <div className="flex gap-0.5 w-full">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="h-2 flex-1 bg-theme-border" />
        ))}
      </div>
    </div>
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
