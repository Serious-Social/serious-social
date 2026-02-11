import { NextRequest, NextResponse } from 'next/server';
import { getActivityEntries, getCastMapping, getCommentCastHashes, type ActivityItem } from '~/lib/kv';
import { getNeynarClient } from '~/lib/neynar';

export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get('postId');
  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 15;

  if (!postId) {
    return NextResponse.json({ activities: [] });
  }

  try {
    // Fetch commit activities, cast mapping, and known comment hashes in parallel
    const [commitEntries, castMapping, knownCastHashes] = await Promise.all([
      getActivityEntries(postId, limit),
      getCastMapping(postId),
      getCommentCastHashes(postId),
    ]);

    let client: ReturnType<typeof getNeynarClient> | null = null;
    try {
      client = getNeynarClient();
    } catch {
      // Neynar unavailable — we'll still return commits with fallback identities
    }

    // Fetch comment replies if castHash exists (non-blocking)
    const [commitsResult, commentsResult] = await Promise.allSettled([
      // Resolve commit FIDs to profiles
      (async (): Promise<ActivityItem[]> => {
        if (commitEntries.length === 0) return [];

        // Try to resolve profiles, fall back to fid-based identities
        let userMap = new Map<number, { username: string; pfpUrl: string }>();
        if (client) {
          try {
            const uniqueFids = [...new Set(commitEntries.map((e) => e.fid))];
            const { users } = await client.fetchBulkUsers({ fids: uniqueFids });
            userMap = new Map(
              users.map((u) => [
                u.fid,
                { username: u.username, pfpUrl: u.pfp_url || '' },
              ])
            );
          } catch (error) {
            console.error('Failed to resolve commit profiles, using fallback identities:', error);
          }
        }

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
            text: entry.comment,
          };
        });
      })(),
      // Fetch Farcaster replies as comments
      (async (): Promise<ActivityItem[]> => {
        if (!client || !castMapping?.castHash) return [];

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
    const allComments = commentsResult.status === 'fulfilled' ? commentsResult.value : [];

    // Deduplicate: filter out Farcaster replies that were published via
    // the comment flow (their hash is registered in a dedicated Redis set)
    const comments = allComments.filter(
      (c) => !c.castHash || !knownCastHashes.has(c.castHash)
    );

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
