'use client';

import { useState, useEffect, useCallback } from 'react';
import sdk from '@farcaster/miniapp-sdk';

interface Friend {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  side: 'support' | 'challenge';
}

interface FriendsInMarketProps {
  postId: string;
  viewerFid: number | undefined;
}

export function FriendsInMarket({ postId, viewerFid }: FriendsInMarketProps) {
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    if (!viewerFid) return;

    const params = new URLSearchParams({ postId, viewerFid: String(viewerFid) });
    fetch(`/api/market-participants/friends?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setFriends(data.friends || []))
      .catch((err) => console.error('Failed to fetch friends in market:', err));
  }, [postId, viewerFid]);

  const handleViewProfile = useCallback((fid: number) => {
    sdk.actions.viewProfile({ fid });
  }, []);

  if (!viewerFid || friends.length === 0) return null;

  return (
    <section className="bg-theme-surface border border-theme-border rounded-xl p-4">
      <p className="text-sm font-medium text-theme-text-muted mb-3">
        {friends.length} {friends.length === 1 ? 'person' : 'people'} you follow {friends.length === 1 ? 'is' : 'are'} in this market
      </p>
      <div className="space-y-2">
        {friends.map((friend) => (
          <button
            key={friend.fid}
            onClick={() => handleViewProfile(friend.fid)}
            className="flex items-center gap-3 w-full text-left hover:bg-theme-bg rounded-lg p-1.5 -mx-1.5 transition-colors"
          >
            {friend.pfpUrl ? (
              <img
                src={friend.pfpUrl}
                alt={friend.displayName}
                className="w-6 h-6 rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-theme-border flex-shrink-0" />
            )}
            <span className="text-sm text-theme-text truncate">
              {friend.displayName}
            </span>
            <span className="text-xs text-theme-text-muted ml-auto flex-shrink-0">
              {friend.side === 'support' ? 'Supporting' : 'Challenging'}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
