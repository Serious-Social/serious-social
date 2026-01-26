import { NextRequest, NextResponse } from 'next/server';
import { getCastMapping } from '~/lib/kv';
import { notifyMarketCreated, notifySupport, notifyChallenge } from '~/lib/beliefNotifications';
import { isValidPostId } from '~/lib/postId';

/**
 * POST /api/notify
 * Trigger a notification for market activity.
 *
 * Body: {
 *   type: 'market_created' | 'support' | 'challenge',
 *   postId: string,
 *   actorUsername?: string,
 *   amount: string (formatted, e.g. "10.00")
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, postId, actorUsername, amount } = body;

    if (!type || !postId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: type, postId, amount' },
        { status: 400 }
      );
    }

    if (!isValidPostId(postId)) {
      return NextResponse.json(
        { error: 'Invalid postId format' },
        { status: 400 }
      );
    }

    if (!['market_created', 'support', 'challenge'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      );
    }

    // Get the cast mapping to find the author FID
    const mapping = await getCastMapping(postId);
    if (!mapping) {
      return NextResponse.json(
        { error: 'Cast mapping not found' },
        { status: 404 }
      );
    }

    const authorFid = mapping.authorFid;

    let result;
    switch (type) {
      case 'market_created':
        result = await notifyMarketCreated({
          authorFid,
          creatorUsername: actorUsername,
          amount,
        });
        break;

      case 'support':
        result = await notifySupport({
          authorFid,
          supporterUsername: actorUsername,
          amount,
        });
        break;

      case 'challenge':
        result = await notifyChallenge({
          authorFid,
          challengerUsername: actorUsername,
          amount,
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      // Don't fail the request if notification fails - it's not critical
      console.log('Notification not sent:', result.error);
      return NextResponse.json({ success: true, notificationSkipped: result.error });
    }
  } catch (error) {
    console.error('Error in notify endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
