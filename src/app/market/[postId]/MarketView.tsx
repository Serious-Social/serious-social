'use client';

import Link from 'next/link';
import { useBeliefMarket, useUserPositionDetails, usePendingRewards, useMarketParams } from '~/hooks/useBeliefMarket';
import { useFarcasterWithdraw, useFarcasterClaimRewards } from '~/hooks/useFarcasterTransaction';
import { BeliefCurve, StatusBadge, type ProfileInfo } from '~/components/ui/BeliefCurve';
import { CommitModal } from '~/components/ui/CommitModal';
import { ShareButton } from '~/components/ui/Share';
import { formatUSDC, formatBps, formatLockPeriod, formatSRS, Side, Position, getMarketStatus } from '~/lib/contracts';
import { useMyReputation, usePendingReputation } from '~/hooks/useReputation';
import { useAccount } from 'wagmi';
import { useState, useEffect, useRef } from 'react';

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
  const { data: marketParams } = useMarketParams(marketAddress as `0x${string}` | undefined);
  const { isConnected } = useAccount();
  const { data: srsBalance } = useMyReputation();

  // Cast content state
  const [castContent, setCastContent] = useState<CastContent | null>(null);
  const [contentLoading, setContentLoading] = useState(true);

  // 24h belief change
  const [beliefChange24h, setBeliefChange24h] = useState<number | null>(null);

  // Participants
  const [participants, setParticipants] = useState<{ support: ProfileInfo[]; challenge: ProfileInfo[] } | null>(null);

  // Refs
  const howItWorksRef = useRef<HTMLDetailsElement>(null);

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

  // Fetch 24h belief snapshot
  useEffect(() => {
    if (!state) return;
    async function fetchSnapshot() {
      try {
        const res = await fetch(`/api/belief-snapshot?postId=${postId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.beliefChange24h != null) {
          setBeliefChange24h(data.beliefChange24h);
        }
      } catch {
        // Snapshot not available yet
      }
    }
    fetchSnapshot();
  }, [postId, state]);

  // Fetch participants
  useEffect(() => {
    async function fetchParticipants() {
      try {
        const res = await fetch(`/api/market-participants?postId=${postId}`);
        if (!res.ok) return;
        const data = await res.json();
        setParticipants(data);
      } catch {
        // Participants not available
      }
    }
    fetchParticipants();
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
      <div className="px-4 py-6 max-w-lg mx-auto bg-theme-bg min-h-screen">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary mx-auto mb-4" />
          <p className="text-theme-text-muted">Loading market data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto bg-theme-bg min-h-screen">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-theme-text-muted hover:text-theme-text mb-4"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
        <div className="text-center py-8">
          <h1 className="text-xl font-semibold text-theme-text mb-2">Error Loading Market</h1>
          <p className="text-theme-text-muted">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!marketExists) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto bg-theme-bg min-h-screen">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-theme-text-muted hover:text-theme-text mb-4"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
        <div className="text-center py-8">
          <h1 className="text-xl font-semibold text-theme-text mb-2">Market Not Found</h1>
          <p className="text-theme-text-muted">No belief market exists for this post yet.</p>
          <p className="text-xs text-theme-text-muted/70 mt-4 font-mono break-all">{postId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto bg-theme-bg min-h-screen overflow-x-hidden">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-theme-text-muted hover:text-theme-text mb-4"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Home
      </Link>

      <div className="space-y-4">
        {/* Cast content */}
        <section className="bg-theme-surface border border-theme-border rounded-xl p-4 overflow-hidden">
          <h2 className="text-sm font-medium text-theme-text-muted mb-2">Claim</h2>
          {contentLoading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-theme-border rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-theme-border rounded w-1/2"></div>
            </div>
          ) : castContent ? (
            <div>
              <p className="text-theme-text whitespace-pre-wrap break-words mb-3">{castContent.text}</p>
              <div className="flex items-center gap-2 text-xs text-theme-text-muted">
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
            <p className="text-theme-text-muted italic">Content not available</p>
          )}
        </section>

        {/* Belief curve */}
        <section className="bg-theme-surface border border-theme-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-theme-text-muted">Belief Signal</h2>
            {state && getMarketStatus(state) !== 'no_market' && (
              <StatusBadge status={getMarketStatus(state)} />
            )}
          </div>
          <BeliefCurve
            state={state ?? null}
            beliefChange24h={beliefChange24h}
            participants={participants ?? undefined}
            earlyWithdrawPenaltyPercent={marketParams ? formatBps(marketParams.earlyWithdrawPenaltyBps) : undefined}
            onInfoClick={() => {
              const el = howItWorksRef.current;
              if (el) {
                el.open = true;
                el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          />
        </section>

        {/* User's positions - prominent after staking (per UX spec) */}
        {isConnected && positions.length > 0 && (
          <section className="bg-gradient-to-br from-theme-primary/10 to-theme-surface border-2 border-theme-primary/30 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-theme-primary mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Your Positions
              {srsBalance != null && srsBalance > 0n && (
                <span className="ml-auto text-xs font-normal text-theme-text-muted">
                  {formatSRS(srsBalance)} SRS
                </span>
              )}
            </h2>
            <div className="space-y-3">
              {positions.map((pos) => (
                <PositionCard
                  key={pos.id.toString()}
                  position={pos}
                  marketAddress={marketAddress as `0x${string}`}
                  minRewardDuration={marketParams ? marketParams.minRewardDuration : undefined}
                  earlyWithdrawPenaltyBps={marketParams?.earlyWithdrawPenaltyBps}
                  onAction={() => {
                    refetch();
                    refetchPositions();
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Share button (secondary action) */}
        <section>
          <ShareButton
            buttonText="Share this market"
            className="w-full py-3 rounded-xl font-medium transition-colors bg-theme-surface border border-theme-border text-theme-text-muted hover:text-theme-text hover:bg-theme-border"
            cast={{
              text: castContent
                ? `"${castContent.text.slice(0, 100)}${castContent.text.length > 100 ? '...' : ''}"\n\nDo you believe this? Put your money where your mouth is.`
                : "Check out this belief market. Put your money where your mouth is.",
              embeds: [{ path: `/market/${postId}` }],
            }}
          />
        </section>

        {/* Spacer for sticky bottom bar */}
        <div className="h-20" />

        {/* Rules/Info (collapsible) */}
        <details id="how-it-works" ref={howItWorksRef} className="bg-theme-surface border border-theme-border rounded-xl">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-theme-text">
            How it works
          </summary>
          <div className="px-4 pb-4 text-sm text-theme-text-muted space-y-2">
            <p>
              <strong className="text-theme-text">Supporting</strong> a claim means staking USDC to signal that you believe it.
              Your capital is committed for {marketParams ? formatLockPeriod(marketParams.lockPeriod) : '30 days'}.
            </p>
            <p>
              <strong className="text-theme-text">Challenging</strong> means staking against the claim. This creates measured
              disagreement and improves signal clarity.
            </p>
            <p>
              <strong className="text-theme-text">Early withdrawal.</strong> You can withdraw before the lock period ends,
              but a {marketParams ? formatBps(marketParams.earlyWithdrawPenaltyBps) : '5%'} penalty is deducted and added to the reward pool. Early exits also
              forfeit any pending rewards.
            </p>
            <p>
              <strong className="text-theme-text">Time matters.</strong> The longer your capital stays committed, the more it
              contributes to the belief signal and the more rewards you earn.
            </p>
            <p>
              <strong className="text-theme-text">No one wins or loses.</strong> Your principal is returned after the commitment
              period. Rewards come from a shared pool, not from other participants.
            </p>
          </div>
        </details>

        {/* Market info */}
        <div className="text-center text-xs text-theme-text-muted/70 space-y-1 pt-4 border-t border-theme-border">
          <p>Market: {marketAddress?.slice(0, 10)}...{marketAddress?.slice(-8)}</p>
          <p>Post ID: {postId.slice(0, 10)}...{postId.slice(-8)}</p>
        </div>
      </div>

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-theme-bg/95 backdrop-blur-sm border-t border-theme-border p-4 z-40">
        <div className="max-w-lg mx-auto flex gap-3">
          <button
            onClick={() => handleOpenModal(Side.Support)}
            className="flex-1 py-4 rounded-xl font-medium transition-all bg-theme-surface border border-theme-border text-theme-text hover:bg-theme-border active:scale-[0.98]"
          >
            Support
          </button>
          <button
            onClick={() => handleOpenModal(Side.Oppose)}
            className="flex-1 py-4 rounded-xl font-medium transition-all bg-gradient-primary text-white hover:opacity-90 active:scale-[0.98]"
          >
            Challenge
          </button>
        </div>
      </div>

      {/* Commit Modal */}
      {marketAddress && (
        <CommitModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          side={modalSide}
          marketAddress={marketAddress as `0x${string}`}
          postId={postId}
          castText={castContent?.text}
          lockPeriod={marketParams?.lockPeriod}
          earlyWithdrawPenaltyBps={marketParams?.earlyWithdrawPenaltyBps}
          onSuccess={handleCommitSuccess}
        />
      )}
    </div>
  );
}

interface PositionCardProps {
  position: Position & { id: bigint };
  marketAddress: `0x${string}`;
  minRewardDuration?: number;
  earlyWithdrawPenaltyBps?: number;
  onAction: () => void;
}

function formatCountdown(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function PositionCard({ position, marketAddress, minRewardDuration, earlyWithdrawPenaltyBps, onAction }: PositionCardProps) {
  const isLocked = Date.now() / 1000 < position.unlockTimestamp;
  const unlockDate = new Date(position.unlockTimestamp * 1000);
  const canWithdraw = !position.withdrawn;
  const [showPenaltyConfirm, setShowPenaltyConfirm] = useState(false);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  // Update `now` every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 60_000);
    return () => clearInterval(interval);
  }, []);

  const rewardStartTime = minRewardDuration != null
    ? position.depositTimestamp + minRewardDuration
    : undefined;
  const rewardsCountdownRemaining = rewardStartTime != null && now < rewardStartTime
    ? rewardStartTime - now
    : undefined;

  // Pending rewards
  const { data: pendingRewards } = usePendingRewards(marketAddress, position.id);

  // Pending reputation (SRS)
  const { data: pendingSRS } = usePendingReputation(marketAddress, position.id);

  // Withdraw hook
  const {
    withdraw,
    isPending: isWithdrawPending,
    isConfirming: isWithdrawConfirming,
    error: withdrawError,
    reset: resetWithdraw,
  } = useFarcasterWithdraw();

  // Claim rewards hook
  const {
    claimRewards,
    isPending: isClaimPending,
    isConfirming: isClaimConfirming,
    error: claimError,
    reset: resetClaim,
  } = useFarcasterClaimRewards();

  const handleWithdraw = async () => {
    try {
      resetWithdraw();
      await withdraw(marketAddress, position.id);
      setShowPenaltyConfirm(false);
      onAction();
    } catch (e) {
      console.error('Withdraw failed:', e);
    }
  };

  const handleClaimRewards = async () => {
    try {
      resetClaim();
      await claimRewards(marketAddress, position.id);
      onAction();
    } catch (e) {
      console.error('Claim rewards failed:', e);
    }
  };

  const isProcessing = isWithdrawPending || isWithdrawConfirming || isClaimPending || isClaimConfirming;
  const hasPendingRewards = !!pendingRewards && pendingRewards > 0n;

  return (
    <div className="p-3 bg-theme-bg border border-theme-border rounded-lg space-y-3">
      {/* Position info row */}
      <div className="flex items-center justify-between">
        <div>
          <span className={`text-sm font-medium ${position.side === Side.Support ? 'text-theme-positive' : 'text-theme-negative'}`}>
            {position.side === Side.Support ? 'Support' : 'Challenge'}
          </span>
          <span className="text-sm text-theme-text-muted ml-2">${formatUSDC(position.amount)}</span>
        </div>
        <div className="text-right">
          {position.withdrawn ? (
            <span className="text-xs text-theme-text-muted">Withdrawn</span>
          ) : isLocked ? (
            <span className="text-xs text-theme-negative">
              Unlocks {unlockDate.toLocaleDateString()}
            </span>
          ) : (
            <span className="text-xs text-theme-positive">Ready to withdraw</span>
          )}
        </div>
      </div>

      {/* Pending rewards or countdown */}
      {!position.withdrawn && (
        hasPendingRewards ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-theme-text-muted">
                Pending rewards: <span className="text-theme-positive font-medium">${formatUSDC(pendingRewards)}</span>
              </span>
            </div>
            {pendingSRS != null && pendingSRS > 0n && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-theme-text-muted">
                  Pending seriousness: {formatSRS(pendingSRS)} SRS
                </span>
              </div>
            )}
          </div>
        ) : rewardsCountdownRemaining != null ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-theme-text-muted">
                Rewards begin in <span className="text-theme-negative font-medium">{formatCountdown(rewardsCountdownRemaining)}</span>
              </span>
            </div>
            {pendingSRS != null && pendingSRS > 0n && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-theme-text-muted">
                  Pending seriousness: {formatSRS(pendingSRS)} SRS
                </span>
              </div>
            )}
          </div>
        ) : pendingSRS != null && pendingSRS > 0n ? (
          <div className="flex items-center justify-between text-xs">
            <span className="text-theme-text-muted">
              Pending seriousness: {formatSRS(pendingSRS)} SRS
            </span>
          </div>
        ) : null
      )}

      {/* Early withdrawal confirmation */}
      {showPenaltyConfirm && (
        <div className="bg-theme-negative/10 border border-theme-negative/30 rounded-lg p-3 space-y-2">
          <p className="text-xs text-theme-text">
            Withdrawing early incurs a <strong>{earlyWithdrawPenaltyBps != null ? formatBps(earlyWithdrawPenaltyBps) : '5%'} penalty</strong> on your principal and forfeits pending rewards.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleWithdraw}
              disabled={isProcessing}
              className="flex-1 py-2 px-3 text-xs font-medium rounded-lg bg-theme-negative text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isWithdrawPending ? 'Confirming...' : isWithdrawConfirming ? 'Processing...' : 'Confirm withdraw'}
            </button>
            <button
              onClick={() => setShowPenaltyConfirm(false)}
              disabled={isProcessing}
              className="flex-1 py-2 px-3 text-xs font-medium rounded-lg bg-theme-surface border border-theme-border text-theme-text hover:bg-theme-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!position.withdrawn && !showPenaltyConfirm && (canWithdraw || hasPendingRewards) && (
        <div className="flex gap-2">
          {canWithdraw && (
            <button
              onClick={isLocked ? () => setShowPenaltyConfirm(true) : handleWithdraw}
              disabled={isProcessing}
              className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                isLocked
                  ? 'bg-theme-negative text-white hover:opacity-90'
                  : 'bg-theme-primary text-white hover:opacity-90'
              }`}
            >
              {isWithdrawPending ? 'Confirming...' : isWithdrawConfirming ? 'Processing...' : isLocked ? 'Withdraw early' : 'Withdraw'}
            </button>
          )}
          {hasPendingRewards && !position.withdrawn && (
            <button
              onClick={handleClaimRewards}
              disabled={isProcessing}
              className="flex-1 py-2 px-3 text-xs font-medium rounded-lg bg-theme-positive text-theme-bg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isClaimPending ? 'Confirming...' : isClaimConfirming ? 'Processing...' : 'Claim Rewards'}
            </button>
          )}
        </div>
      )}

      {/* Error messages */}
      {withdrawError && (
        <p className="text-xs text-red-500">Withdraw failed: {withdrawError.message}</p>
      )}
      {claimError && (
        <p className="text-xs text-red-500">Claim failed: {claimError.message}</p>
      )}
    </div>
  );
}
