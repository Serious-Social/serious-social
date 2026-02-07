import { NextRequest, NextResponse } from 'next/server';
import { getMarketParticipants } from '~/lib/kv';
import { getNeynarClient } from '~/lib/neynar';

export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get('postId');
  const viewerFidParam = request.nextUrl.searchParams.get('viewerFid');

  if (!postId || !viewerFidParam) {
    return NextResponse.json({ friends: [] });
  }

  const viewerFid = parseInt(viewerFidParam, 10);
  if (isNaN(viewerFid) || viewerFid <= 0) {
    return NextResponse.json({ friends: [] });
  }

  try {
    const client = getNeynarClient();

    // Fetch viewer's following list (paginate up to 500)
    const followedFids = new Set<number>();
    let cursor: string | undefined;

    for (let i = 0; i < 5; i++) {
      try {
        const response = await client.fetchUserFollowing({
          fid: viewerFid,
          limit: 100,
          ...(cursor ? { cursor } : {}),
        });

        for (const follower of response.users) {
          followedFids.add(follower.user.fid);
        }

        if (!response.next?.cursor) break;
        cursor = response.next.cursor;
      } catch (e: unknown) {
        const status = (e as { status?: number })?.status;
        if (status === 402 || status === 429) {
          return NextResponse.json({ friends: [] });
        }
        throw e;
      }
    }

    if (followedFids.size === 0) {
      return NextResponse.json({ friends: [] });
    }

    // Fetch market participants
    const participants = await getMarketParticipants(postId);
    if (!participants) {
      return NextResponse.json({ friends: [] });
    }

    // Intersect: find friends who are participants
    const friendFids: { fid: number; side: 'support' | 'challenge' }[] = [];

    for (const fid of participants.support) {
      if (followedFids.has(fid)) {
        friendFids.push({ fid, side: 'support' });
      }
    }
    for (const fid of participants.challenge) {
      if (followedFids.has(fid)) {
        friendFids.push({ fid, side: 'challenge' });
      }
    }

    if (friendFids.length === 0) {
      return NextResponse.json({ friends: [] });
    }

    // Resolve profiles
    const uniqueFids = [...new Set(friendFids.map((f) => f.fid))];
    const { users } = await client.fetchBulkUsers({ fids: uniqueFids });

    const userMap = new Map(
      users.map((u) => [
        u.fid,
        {
          username: u.username,
          displayName: u.display_name || u.username,
          pfpUrl: u.pfp_url || '',
        },
      ])
    );

    const friends = friendFids
      .map(({ fid, side }) => {
        const profile = userMap.get(fid);
        if (!profile) return null;
        return { fid, ...profile, side };
      })
      .filter((f): f is NonNullable<typeof f> => f != null);

    return NextResponse.json({ friends });
  } catch (error) {
    console.error('Failed to fetch friends in market:', error);
    return NextResponse.json({ friends: [] });
  }
}
