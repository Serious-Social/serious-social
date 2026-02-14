import { Metadata } from 'next';
import { MarketView } from './MarketView';
import { isValidPostId } from '~/lib/postId';
import { APP_NAME, APP_URL } from '~/lib/constants';
import { getCastMapping } from '~/lib/kv';
import { getNeynarClient } from '~/lib/neynar';
import { getMiniAppEmbedMetadata } from '~/lib/utils';

interface PageProps {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ intent?: string; t?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { postId } = await params;
  const { t } = await searchParams;

  // Dynamic OG image URL for this market (cache-bust with t param so each share gets a fresh image)
  const ogImageUrl = `${APP_URL}/api/og/market?postId=${postId}${t ? `&t=${t}` : ''}`;
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
  } catch (_e) {
    // Ignore errors, use default description
  }

  // Mini App embed metadata with custom button that launches to this market
  const frameMetadata = getMiniAppEmbedMetadata({
    ogImageUrl,
    buttonText: 'Support or Challenge',
    launchUrl: marketUrl,
    title: `Belief Market | ${APP_NAME}`,
    description,
  });

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
          height: 800,
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
    // Farcaster Mini App embed metadata
    other: {
      'fc:frame': JSON.stringify(frameMetadata),
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
