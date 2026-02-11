import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '~/auth';
import { getCastMapping, registerCommentCastHash, checkCommentRateLimit } from '~/lib/kv';
import { getNeynarClient } from '~/lib/neynar';
import { APP_URL } from '~/lib/constants';

export async function POST(request: NextRequest) {
  try {
    // 1. Get authenticated session with signer
    const session = await getSession();
    if (!session?.user?.fid) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const signerUuid = session.signers?.[0]?.signer_uuid;
    if (!signerUuid) {
      return NextResponse.json(
        { error: 'No approved signer found. Please sign in again.' },
        { status: 403 }
      );
    }

    // 2. Parse and validate request body
    const { postId, text, side, amount } = await request.json();
    if (!postId || !text?.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields: postId, text' },
        { status: 400 }
      );
    }

    // 3. Rate limit check
    const rateCheck = await checkCommentRateLimit(postId, session.user.fid);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // 4. Get the original cast hash from KV
    const castMapping = await getCastMapping(postId);
    if (!castMapping?.castHash) {
      return NextResponse.json(
        { error: 'Original cast not found for this market' },
        { status: 404 }
      );
    }

    // 4. Build the reply text with stake context
    const sideVerb = side === 'support' ? 'supported' : 'challenged';
    const contextLine = amount ? `\n\n[${sideVerb} with $${amount}]` : '';
    const fullText = `${text.trim()}${contextLine}`;

    // 5. Build market URL embed
    const marketUrl = `${APP_URL}/market/${postId}`;

    // 6. Generate idempotency key from postId + fid + comment text
    const idem = `${postId}-${session.user.fid}-${simpleHash(text.trim())}`;

    // 7. Publish via Neynar as a reply to the original claim's cast
    const client = getNeynarClient();
    const castResponse = await client.publishCast({
      signerUuid,
      text: fullText,
      parent: castMapping.castHash,
      embeds: [{ url: marketUrl }],
      idem,
    });

    const castHash = (castResponse as { cast?: { hash?: string } }).cast?.hash;

    if (castHash) {
      await registerCommentCastHash(postId, castHash);
    }

    return NextResponse.json({
      success: true,
      castHash: castHash || null,
    });
  } catch (error) {
    console.error('Failed to publish comment cast:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';
    const isAuthError = message.toLowerCase().includes('signer') ||
      message.toLowerCase().includes('unauthorized') ||
      message.toLowerCase().includes('forbidden');

    return NextResponse.json(
      { error: isAuthError ? 'Signer not authorized. Please sign in again.' : 'Failed to publish comment' },
      { status: isAuthError ? 403 : 500 }
    );
  }
}

/** Simple string hash for idempotency key */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
