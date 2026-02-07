import { NextRequest, NextResponse } from 'next/server';
import { getNeynarClient } from '~/lib/neynar';

/**
 * GET /api/casts?fid=123
 * GET /api/casts?hash=0x...
 * GET /api/casts?url=https://warpcast.com/...
 * Fetch recent casts for a user by FID, or look up a single cast by hash or Warpcast URL.
 */
export async function GET(request: NextRequest) {
  const fid = request.nextUrl.searchParams.get('fid');
  const hash = request.nextUrl.searchParams.get('hash');
  const url = request.nextUrl.searchParams.get('url');
  const cursor = request.nextUrl.searchParams.get('cursor');

  // If hash is provided, fetch a specific cast by hash
  if (hash) {
    return fetchCast(hash, 'hash');
  }

  // If url is provided, fetch a specific cast by Warpcast URL
  if (url) {
    return fetchCast(url, 'url');
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
 * Fetch a specific cast by hash or Warpcast URL.
 */
async function fetchCast(identifier: string, type: 'hash' | 'url') {
  try {
    const client = getNeynarClient();
    const response = await client.lookupCastByHashOrWarpcastUrl({
      identifier,
      type,
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
