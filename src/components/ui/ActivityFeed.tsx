'use client';

import { useState, useEffect, useCallback } from 'react';
import sdk from '@farcaster/miniapp-sdk';

interface ActivityItem {
  type: 'commit' | 'comment';
  fid: number;
  username: string;
  pfpUrl: string;
  timestamp: number;
  side?: 'support' | 'challenge';
  amount?: string;
  text?: string;
  castHash?: string;
}

interface ActivityFeedProps {
  postId: string;
}

function formatRelativeTime(ts: number): string {
  const now = Date.now();
  const diffMs = now - ts;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth}mo`;
}

export function ActivityFeed({ postId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    fetch(`/api/market-activity?postId=${postId}&limit=15`)
      .then((res) => res.json())
      .then((data) => setActivities(data.activities || []))
      .catch((err) => console.error('Failed to fetch activity feed:', err));
  }, [postId]);

  const handleViewProfile = useCallback((fid: number) => {
    sdk.actions.viewProfile({ fid });
  }, []);

  if (activities.length === 0) return null;

  return (
    <section className="bg-theme-surface border border-theme-border rounded-xl p-4">
      <h2 className="text-sm font-medium text-theme-text-muted mb-3">Recent Activity</h2>
      <div className="space-y-3">
        {activities.map((item, i) => (
          <div key={`${item.type}-${item.fid}-${item.timestamp}-${i}`} className="flex items-start gap-2.5">
            <button
              onClick={() => handleViewProfile(item.fid)}
              className="flex-shrink-0"
            >
              {item.pfpUrl ? (
                <img
                  src={item.pfpUrl}
                  alt={item.username}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-theme-border" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              {item.type === 'commit' ? (
                <p className="text-sm text-theme-text">
                  <button
                    onClick={() => handleViewProfile(item.fid)}
                    className="font-medium hover:underline"
                  >
                    @{item.username}
                  </button>
                  {' '}
                  <span className="text-theme-text-muted">
                    {item.side === 'support' ? 'supported' : 'challenged'} with ${item.amount}
                  </span>
                </p>
              ) : (
                <div>
                  <p className="text-sm text-theme-text">
                    <button
                      onClick={() => handleViewProfile(item.fid)}
                      className="font-medium hover:underline"
                    >
                      @{item.username}
                    </button>
                  </p>
                  {item.text && (
                    <p className="text-xs text-theme-text-muted italic mt-0.5 line-clamp-2">
                      {item.text.length > 120 ? `${item.text.slice(0, 120)}...` : item.text}
                    </p>
                  )}
                </div>
              )}
            </div>
            <span className="text-xs text-theme-text-muted flex-shrink-0">
              {formatRelativeTime(item.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
