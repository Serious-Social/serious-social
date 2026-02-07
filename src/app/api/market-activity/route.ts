import { NextRequest, NextResponse } from 'next/server';
import { getActivityEntries, getCastMapping } from '~/lib/kv';
import { getNeynarClient } from '~/lib/neynar';

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

export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get('postId');
  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 15;

  if (!postId) {
    return NextResponse.json({ activities: [] });
  }

  try {
    const client = getNeynarClient();

    // Fetch commit activities and cast mapping in parallel
    const [commitEntries, castMapping] = await Promise.all([
      getActivityEntries(postId, limit),
      getCastMapping(postId),
    ]);

    // Fetch comment replies if castHash exists (non-blocking)
    const [commitsResult, commentsResult] = await Promise.allSettled([
      // Resolve commit FIDs to profiles
      (async (): Promise<ActivityItem[]> => {
        if (commitEntries.length === 0) return [];

        const uniqueFids = [...new Set(commitEntries.map((e) => e.fid))];
        const { users } = await client.fetchBulkUsers({ fids: uniqueFids });
        const userMap = new Map(
          users.map((u) => [
            u.fid,
            { username: u.username, pfpUrl: u.pfp_url || '' },
          ])
        );

        return commitEntries.map((entry) => {
          const profile = userMap.get(entry.fid);
          return {
            type: 'commit' as const,
            fid: entry.fid,
            username: profile?.username || `fid:${entry.fid}`,
            pfpUrl: profile?.pfpUrl || '',
            timestamp: entry.timestamp,
            side: entry.side,
            amount: entry.amount,
          };
        });
      })(),
      // Fetch Farcaster replies as comments
      (async (): Promise<ActivityItem[]> => {
        if (!castMapping?.castHash) return [];

        const conversation = await client.lookupCastConversation({
          identifier: castMapping.castHash,
          type: 'hash',
          replyDepth: 1,
          limit: 20,
        });

        const cast = conversation.conversation.cast as {
          direct_replies?: Array<{
            text: string;
            timestamp: string;
            hash: string;
            author: {
              fid: number;
              username: string;
              pfp_url?: string;
            };
          }>;
        };

        const replies = cast.direct_replies || [];

        return replies.map((reply) => ({
          type: 'comment' as const,
          fid: reply.author.fid,
          username: reply.author.username,
          pfpUrl: reply.author.pfp_url || '',
          timestamp: new Date(reply.timestamp).getTime(),
          text: reply.text,
          castHash: reply.hash,
        }));
      })(),
    ]);

    const commits = commitsResult.status === 'fulfilled' ? commitsResult.value : [];
    const comments = commentsResult.status === 'fulfilled' ? commentsResult.value : [];

    // Merge, sort by timestamp descending, trim to limit
    const activities = [...commits, ...comments]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Failed to fetch market activity:', error);
    return NextResponse.json({ activities: [] });
  }
}
