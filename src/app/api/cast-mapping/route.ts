import { NextRequest, NextResponse } from 'next/server';
import { setCastMapping, getCastMapping, CastMapping } from '~/lib/kv';
import { isValidPostId } from '~/lib/postId';

/**
 * GET /api/cast-mapping?postId=0x...
 * Retrieve the cast mapping for a postId.
 */
export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get('postId');

  if (!postId) {
    return NextResponse.json(
      { error: 'Missing postId parameter' },
      { status: 400 }
    );
  }

  if (!isValidPostId(postId)) {
    return NextResponse.json(
      { error: 'Invalid postId format' },
      { status: 400 }
    );
  }

  try {
    const mapping = await getCastMapping(postId);

    if (!mapping) {
      return NextResponse.json(
        { error: 'Mapping not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(mapping);
  } catch (error) {
    console.error('Error fetching cast mapping:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cast mapping' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cast-mapping
 * Store a cast mapping for a postId.
 * Body: { postId: string, castHash: string, authorFid: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, castHash, authorFid } = body;

    if (!postId || !castHash || authorFid === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: postId, castHash, authorFid' },
        { status: 400 }
      );
    }

    if (!isValidPostId(postId)) {
      return NextResponse.json(
        { error: 'Invalid postId format' },
        { status: 400 }
      );
    }

    const mapping: CastMapping = {
      castHash,
      authorFid,
      createdAt: Date.now(),
    };

    await setCastMapping(postId, mapping);

    return NextResponse.json({ success: true, mapping });
  } catch (error) {
    console.error('Error storing cast mapping:', error);
    return NextResponse.json(
      { error: 'Failed to store cast mapping' },
      { status: 500 }
    );
  }
}
