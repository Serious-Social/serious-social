import { NextRequest, NextResponse } from 'next/server';
import { getNeynarClient } from '~/lib/neynar';

/**
 * GET /api/casts?fid=123
 * Fetch recent casts for a user by FID.
 * Returns only top-level casts (not replies) to keep the list clean.
 */
export async function GET(request: NextRequest) {
  const fid = request.nextUrl.searchParams.get('fid');
  const hash = request.nextUrl.searchParams.get('hash');
  const cursor = request.nextUrl.searchParams.get('cursor');

  // If hash is provided, fetch a specific cast
  if (hash) {
    return fetchCastByHash(hash);
  }

  // Otherwise, fetch user's casts by FID
  if (!fid) {
    return NextResponse.json(
      { error: 'Missing fid or hash parameter' },
      { status: 400 }
    );
  }

  const fidNum = parseInt(fid, 10);
  if (isNaN(fidNum)) {
    return NextResponse.json(
      { error: 'Invalid fid' },
      { status: 400 }
    );
  }

  try {
    const client = getNeynarClient();
    const response = await client.fetchCastsForUser({
      fid: fidNum,
      limit: 25,
      ...(cursor ? { cursor } : {}),
    });

    // Filter to only include top-level casts (no parent_hash means it's not a reply)
    const topLevelCasts = response.casts.filter(cast => !cast.parent_hash);

    // Map to a simpler structure
    const casts = topLevelCasts.map(cast => ({
      hash: cast.hash,
      text: cast.text,
      timestamp: cast.timestamp,
      author: {
        fid: cast.author.fid,
        username: cast.author.username,
        displayName: cast.author.display_name,
        pfpUrl: cast.author.pfp_url,
      },
      reactions: {
        likes: cast.reactions?.likes_count ?? 0,
        recasts: cast.reactions?.recasts_count ?? 0,
      },
      replies: cast.replies?.count ?? 0,
    }));

    return NextResponse.json({
      casts,
      nextCursor: response.next?.cursor ?? null,
    });
  } catch (error) {
    console.error('Error fetching casts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch casts' },
      { status: 500 }
    );
  }
}

/**
 * Fetch a specific cast by hash.
 */
async function fetchCastByHash(hash: string) {
  try {
    const client = getNeynarClient();
    const response = await client.lookupCastByHashOrWarpcastUrl({
      identifier: hash,
      type: 'hash',
    });

    if (!response.cast) {
      return NextResponse.json(
        { error: 'Cast not found' },
        { status: 404 }
      );
    }

    const cast = response.cast;

    return NextResponse.json({
      cast: {
        hash: cast.hash,
        text: cast.text,
        timestamp: cast.timestamp,
        author: {
          fid: cast.author.fid,
          username: cast.author.username,
          displayName: cast.author.display_name,
          pfpUrl: cast.author.pfp_url,
        },
        reactions: {
          likes: cast.reactions?.likes_count ?? 0,
          recasts: cast.reactions?.recasts_count ?? 0,
        },
        replies: cast.replies?.count ?? 0,
      },
    });
  } catch (error) {
    console.error('Error fetching cast:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cast' },
      { status: 500 }
    );
  }
}
