'use client';

import { useState, useEffect } from 'react';
import sdk from '@farcaster/miniapp-sdk';
import { formatSRS } from '~/lib/contracts';
import type { LeaderboardEntry } from '~/app/api/leaderboard/route';

export function LeaderboardTab() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const response = await fetch('/api/leaderboard?limit=25');
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard');
        }
        const data = await response.json();
        setEntries(data.entries || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load leaderboard');
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h3 className="text-sm font-medium text-theme-text">Most Serious</h3>
        <p className="text-xs text-theme-text-muted">
          Seriousness accrues to those who commit capital over time. It cannot be bought, sold, or transferred.
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-8 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && entries.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-theme-text-muted">No reputation accrued yet.</p>
        </div>
      )}

      {/* Leaderboard entries */}
      {!isLoading && !error && entries.length > 0 && (
        <div className="space-y-1">
          {entries.map((entry) => (
            <button
              key={entry.fid}
              onClick={() => sdk.actions.viewProfile({ fid: entry.fid })}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-theme-surface active:scale-[0.99] transition-all text-left"
            >
              {/* Rank */}
              <span className="text-xs text-theme-text-muted w-6 text-right tabular-nums">
                {entry.rank}
              </span>

              {/* PFP */}
              {entry.pfpUrl ? (
                <img
                  src={entry.pfpUrl}
                  alt={entry.displayName}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-theme-border flex-shrink-0" />
              )}

              {/* Name + username */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-theme-text truncate">
                  {entry.displayName}
                </p>
                <p className="text-xs text-theme-text-muted truncate">
                  @{entry.username}
                </p>
              </div>

              {/* SRS balance */}
              <span className="text-sm font-medium text-theme-primary tabular-nums flex-shrink-0">
                {formatSRS(BigInt(entry.srsBalance))}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
      <div className="w-6 h-4 bg-theme-border rounded" />
      <div className="w-8 h-8 rounded-full bg-theme-border" />
      <div className="flex-1 space-y-1">
        <div className="h-4 w-24 bg-theme-border rounded" />
        <div className="h-3 w-16 bg-theme-border rounded" />
      </div>
      <div className="h-4 w-12 bg-theme-border rounded" />
    </div>
  );
}
