import { Metadata } from 'next';
import { MarketView } from './MarketView';
import { isValidPostId } from '~/lib/postId';
import { APP_NAME, APP_URL } from '~/lib/constants';
import { getCastMapping } from '~/lib/kv';
import { getNeynarClient } from '~/lib/neynar';

interface PageProps {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ intent?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { postId } = await params;

  // Dynamic OG image URL for this market
  const ogImageUrl = `${APP_URL}/api/og/market?postId=${postId}`;
  const marketUrl = `${APP_URL}/market/${postId}`;

  // Try to get the cast text for a better description
  let description = 'View and participate in this belief market';
  try {
    const mapping = await getCastMapping(postId);
    if (mapping) {
      const client = getNeynarClient();
      const response = await client.lookupCastByHashOrWarpcastUrl({
        identifier: mapping.castHash,
        type: 'hash',
      });
      if (response.cast?.text) {
        description = response.cast.text.slice(0, 150) + (response.cast.text.length > 150 ? '...' : '');
      }
    }
  } catch (e) {
    // Ignore errors, use default description
  }

  return {
    title: `Market | ${APP_NAME}`,
    description,
    openGraph: {
      title: `Belief Market | ${APP_NAME}`,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: 'Belief Market',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Belief Market | ${APP_NAME}`,
      description,
      images: [ogImageUrl],
    },
    // Farcaster Frame metadata
    other: {
      'fc:frame': 'vNext',
      'fc:frame:image': ogImageUrl,
      'fc:frame:image:aspect_ratio': '1.91:1',
      'fc:frame:button:1': 'Support',
      'fc:frame:button:1:action': 'link',
      'fc:frame:button:1:target': `${marketUrl}?intent=support`,
      'fc:frame:button:2': 'Challenge',
      'fc:frame:button:2:action': 'link',
      'fc:frame:button:2:target': `${marketUrl}?intent=challenge`,
    },
  };
}

export default async function MarketPage({ params, searchParams }: PageProps) {
  const { postId } = await params;
  const { intent } = await searchParams;

  // Validate postId format
  if (!isValidPostId(postId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Invalid Market ID</h1>
          <p className="text-gray-600">The market identifier is not valid.</p>
        </div>
      </div>
    );
  }

  return <MarketView postId={postId as `0x${string}`} intent={intent as 'support' | 'challenge' | undefined} />;
}
