import { Metadata } from 'next';
import { MarketView } from './MarketView';
import { isValidPostId } from '~/lib/postId';
import { APP_NAME, APP_URL } from '~/lib/constants';

interface PageProps {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ intent?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { postId } = await params;

  // Dynamic OG image URL for this market
  const ogImageUrl = `${APP_URL}/api/og/${postId}`;

  return {
    title: `Market | ${APP_NAME}`,
    openGraph: {
      title: `Belief Market | ${APP_NAME}`,
      description: 'View and participate in this belief market',
      images: [ogImageUrl],
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
