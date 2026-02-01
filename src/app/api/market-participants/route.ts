import { NextRequest, NextResponse } from 'next/server';
import { getMarketParticipants, addMarketParticipant } from '~/lib/kv';
import { getNeynarClient } from '~/lib/neynar';

export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get('postId');

  if (!postId) {
    return NextResponse.json(
      { error: 'Missing postId parameter' },
      { status: 400 }
    );
  }

  try {
    const participants = await getMarketParticipants(postId);
    if (!participants) {
      return NextResponse.json({ support: [], challenge: [] });
    }

    const allFids = [...participants.support, ...participants.challenge];
    if (allFids.length === 0) {
      return NextResponse.json({ support: [], challenge: [] });
    }

    // Resolve FIDs to profiles via Neynar
    const client = getNeynarClient();
    const { users } = await client.fetchBulkUsers({ fids: allFids });

    const userMap = new Map(
      users.map((u) => [
        u.fid,
        { fid: u.fid, pfpUrl: u.pfp_url, username: u.username },
      ])
    );

    const resolve = (fids: number[]) =>
      fids
        .map((fid) => userMap.get(fid))
        .filter((u): u is NonNullable<typeof u> => u != null);

    return NextResponse.json({
      support: resolve(participants.support),
      challenge: resolve(participants.challenge),
    });
  } catch (error) {
    console.error('Failed to fetch market participants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch participants' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { postId, fid, side } = await request.json();

    if (!postId || !fid || !side) {
      return NextResponse.json(
        { error: 'Missing required fields: postId, fid, side' },
        { status: 400 }
      );
    }

    if (side !== 'support' && side !== 'challenge') {
      return NextResponse.json(
        { error: 'Side must be "support" or "challenge"' },
        { status: 400 }
      );
    }

    await addMarketParticipant(postId, fid, side);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to add market participant:', error);
    return NextResponse.json(
      { error: 'Failed to add participant' },
      { status: 500 }
    );
  }
}
