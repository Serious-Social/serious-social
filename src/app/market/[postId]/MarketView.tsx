'use client';

import { useBeliefMarket, useUserPositionDetails } from '~/hooks/useBeliefMarket';
import { BeliefCurve } from '~/components/ui/BeliefCurve';
import { CommitModal } from '~/components/ui/CommitModal';
import { ShareButton } from '~/components/ui/Share';
import { formatUSDC, Side } from '~/lib/contracts';
import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';

interface CastContent {
  text: string;
  author: {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl: string;
  };
  timestamp: string;
}

interface MarketViewProps {
  postId: `0x${string}`;
  intent?: 'support' | 'challenge';
}

export function MarketView({ postId, intent }: MarketViewProps) {
  const { marketAddress, marketExists, state, isLoading, error, refetch } = useBeliefMarket(postId);
  const { positions, refetch: refetchPositions } = useUserPositionDetails(marketAddress as `0x${string}` | undefined);
  const { isConnected } = useAccount();

  // Cast content state
  const [castContent, setCastContent] = useState<CastContent | null>(null);
  const [contentLoading, setContentLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSide, setModalSide] = useState<Side>(Side.Support);

  // Fetch cast content via mapping
  useEffect(() => {
    async function fetchContent() {
      try {
        // First get the cast mapping (postId -> castHash)
        const mappingResponse = await fetch(`/api/cast-mapping?postId=${postId}`);
        if (!mappingResponse.ok) {
          console.error('Cast mapping not found');
          setContentLoading(false);
          return;
        }

        const mapping = await mappingResponse.json();

        // Then fetch the actual cast from Neynar
        const castResponse = await fetch(`/api/casts?hash=${mapping.castHash}`);
        if (castResponse.ok) {
          const data = await castResponse.json();
          setCastContent(data.cast);
        }
      } catch (err) {
        console.error('Failed to fetch cast content:', err);
      } finally {
        setContentLoading(false);
      }
    }
    fetchContent();
  }, [postId]);

  // Open modal if intent is provided via URL
  useEffect(() => {
    if (intent && marketExists && marketAddress) {
      setModalSide(intent === 'support' ? Side.Support : Side.Oppose);
      setIsModalOpen(true);
    }
  }, [intent, marketExists, marketAddress]);

  const handleOpenModal = (side: Side) => {
    setModalSide(side);
    setIsModalOpen(true);
  };

  const handleCommitSuccess = () => {
    refetch();
    refetchPositions();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading market data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Error Loading Market</h1>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!marketExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Market Not Found</h1>
          <p className="text-gray-600">No belief market exists for this post yet.</p>
          <p className="text-sm text-gray-500 mt-4 font-mono break-all">{postId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <h1 className="text-lg font-semibold text-gray-900 text-center">Belief Market</h1>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Cast content */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500 mb-2">Claim</h2>
          {contentLoading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : castContent ? (
            <div>
              <p className="text-gray-900 whitespace-pre-wrap mb-3">{castContent.text}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {castContent.author.pfpUrl && (
                  <img
                    src={castContent.author.pfpUrl}
                    alt={castContent.author.displayName}
                    className="w-5 h-5 rounded-full"
                  />
                )}
                <span>@{castContent.author.username}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic">Content not available</p>
          )}
        </section>

        {/* Belief curve */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500 mb-4">Belief Signal</h2>
          <BeliefCurve state={state ?? null} />
        </section>

        {/* User's positions */}
        {isConnected && positions.length > 0 && (
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Your Positions</h2>
            <div className="space-y-2">
              {positions.map((pos) => (
                <PositionCard key={pos.id.toString()} position={pos} />
              ))}
            </div>
          </section>
        )}

        {/* Action CTAs */}
        <section className="space-y-3">
          <button
            onClick={() => handleOpenModal(Side.Support)}
            className="w-full py-4 rounded-xl font-medium transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Support this claim
          </button>
          <button
            onClick={() => handleOpenModal(Side.Oppose)}
            className="w-full py-4 rounded-xl font-medium transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Challenge this claim
          </button>
        </section>

        {/* Share */}
        <section>
          <ShareButton
            buttonText="Share this market"
            className="w-full py-4 rounded-xl font-medium transition-colors bg-slate-700 text-white hover:bg-slate-800"
            cast={{
              text: castContent
                ? `"${castContent.text.slice(0, 100)}${castContent.text.length > 100 ? '...' : ''}"\n\nDo you believe this? Put your money where your mouth is.`
                : "Check out this belief market. Put your money where your mouth is.",
              embeds: [{ path: `/market/${postId}` }],
            }}
          />
        </section>

        {/* Rules/Info (collapsible) */}
        <details className="bg-white rounded-xl shadow-sm">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700">
            How it works
          </summary>
          <div className="px-4 pb-4 text-sm text-gray-600 space-y-2">
            <p>
              <strong>Supporting</strong> a claim means staking USDC to signal that you believe it.
              Your capital is locked for a period (typically 30 days).
            </p>
            <p>
              <strong>Challenging</strong> means staking against the claim. This creates measured
              disagreement and improves signal clarity.
            </p>
            <p>
              <strong>Time matters.</strong> The longer your capital stays committed, the more it
              contributes to the belief signal. Early exits earn minimal rewards.
            </p>
            <p>
              <strong>No one wins or loses.</strong> Your principal is returned after the lock
              period. Rewards come from a shared pool, not from other participants.
            </p>
          </div>
        </details>

        {/* Market info */}
        <div className="text-center text-xs text-gray-400 space-y-1">
          <p>Market: {marketAddress?.slice(0, 10)}...{marketAddress?.slice(-8)}</p>
          <p>Post ID: {postId.slice(0, 10)}...{postId.slice(-8)}</p>
        </div>
      </main>

      {/* Commit Modal */}
      {marketAddress && (
        <CommitModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          side={modalSide}
          marketAddress={marketAddress as `0x${string}`}
          onSuccess={handleCommitSuccess}
        />
      )}
    </div>
  );
}

function PositionCard({ position }: { position: { id: bigint; side: Side; amount: bigint; unlockTimestamp: number; withdrawn: boolean } }) {
  const isLocked = Date.now() / 1000 < position.unlockTimestamp;
  const unlockDate = new Date(position.unlockTimestamp * 1000);

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <span className={`text-sm font-medium ${position.side === Side.Support ? 'text-slate-700' : 'text-slate-500'}`}>
          {position.side === Side.Support ? 'Support' : 'Challenge'}
        </span>
        <span className="text-sm text-gray-600 ml-2">${formatUSDC(position.amount)}</span>
      </div>
      <div className="text-right">
        {position.withdrawn ? (
          <span className="text-xs text-gray-500">Withdrawn</span>
        ) : isLocked ? (
          <span className="text-xs text-amber-600">
            Unlocks {unlockDate.toLocaleDateString()}
          </span>
        ) : (
          <span className="text-xs text-green-600">Unlocked</span>
        )}
      </div>
    </div>
  );
}
