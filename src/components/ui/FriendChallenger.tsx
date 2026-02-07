'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMiniApp } from '@neynar/react';
import { APP_URL } from '~/lib/constants';

interface BestFriend {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
}

interface FriendChallengerProps {
  viewerFid: number;
  side: 'support' | 'challenge';
  amount: string;
  postId: string;
  castText?: string;
}

export function FriendChallenger({ viewerFid, side, amount, postId, castText }: FriendChallengerProps) {
  const { actions } = useMiniApp();
  const [friends, setFriends] = useState<BestFriend[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/best-friends?fid=${viewerFid}`)
      .then((res) => res.json())
      .then((data) => setFriends(data.bestFriends || []))
      .catch((err) => {
        console.error('Failed to fetch best friends:', err);
        setFriends([]);
      })
      .finally(() => setIsLoading(false));
  }, [viewerFid]);

  const composeChallenge = useCallback(
    (friendUsername?: string) => {
      const sideVerb = side === 'support' ? 'supported' : 'challenged';
      const baseUrl = APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const marketUrl = `${baseUrl}/market/${postId}`;

      let text: string;
      if (friendUsername && castText) {
        const snippet = castText.length > 80 ? `${castText.slice(0, 80)}...` : castText;
        text = `"${snippet}"\n\nI just ${sideVerb} with $${amount}. @${friendUsername}, what say you?`;
      } else if (friendUsername) {
        text = `I just ${sideVerb} this claim with $${amount}. @${friendUsername}, what do you think? Put your money where your mouth is.`;
      } else if (castText) {
        text = `I just ${sideVerb} this claim with $${amount}:\n\n"${castText.slice(0, 100)}${castText.length > 100 ? '...' : ''}"\n\nDo you agree? Put your money where your mouth is.`;
      } else {
        text = `I just ${sideVerb} a belief market with $${amount}. Do you agree? Put your money where your mouth is.`;
      }

      actions.composeCast({
        text,
        embeds: [marketUrl] as [string],
      });
    },
    [side, amount, postId, castText, actions]
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-4 py-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-theme-border animate-pulse" />
            <div className="w-12 h-3 rounded bg-theme-border animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  // No friends — fall back to generic share
  if (!friends || friends.length === 0) {
    return (
      <button
        onClick={() => composeChallenge()}
        className="w-full py-3 bg-gradient-primary hover:opacity-90 rounded-xl text-white font-medium transition-colors"
      >
        Share to Farcaster
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {/* Friend buttons */}
      <div className="flex items-center justify-center gap-5">
        {friends.slice(0, 3).map((friend) => (
          <button
            key={friend.fid}
            onClick={() => composeChallenge(friend.username)}
            className="flex flex-col items-center gap-1.5 group"
          >
            {friend.pfpUrl ? (
              <img
                src={friend.pfpUrl}
                alt={friend.displayName}
                className="w-8 h-8 rounded-full ring-2 ring-transparent group-hover:ring-theme-primary transition-all"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-theme-border group-hover:ring-2 group-hover:ring-theme-primary transition-all" />
            )}
            <span className="text-xs text-theme-text-muted group-hover:text-theme-text transition-colors truncate max-w-[64px]">
              @{friend.username}
            </span>
          </button>
        ))}
      </div>

      {/* Generic share fallback */}
      <button
        onClick={() => composeChallenge()}
        className="w-full text-sm text-theme-text-muted hover:text-theme-text transition-colors"
      >
        Share to anyone
      </button>
    </div>
  );
}
