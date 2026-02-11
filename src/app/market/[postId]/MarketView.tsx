'use client';

import Link from 'next/link';
import { useBeliefMarket, useUserPositionDetails, usePendingRewards, useMarketParams } from '~/hooks/useBeliefMarket';
import { useFarcasterWithdraw, useFarcasterClaimRewards } from '~/hooks/useFarcasterTransaction';
import { BeliefCurve, StatusBadge, type ProfileInfo } from '~/components/ui/BeliefCurve';
import { CommitModal } from '~/components/ui/CommitModal';
import { ShareButton } from '~/components/ui/Share';
import { FriendsInMarket } from '~/components/ui/FriendsInMarket';
import { ActivityFeed } from '~/components/ui/ActivityFeed';
import { formatUSDC, formatBps, formatLockPeriod, Side, Position, getMarketStatus } from '~/lib/contracts';
import { useMiniApp } from '@neynar/react';
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
  const { context } = useMiniApp();

  // Cast content state
  const [castContent, setCastContent] = useState<CastContent | null>(null);
  const [contentLoading, setContentLoading] = useState(true);

  // 24h belief change
  const [beliefChange24h, setBeliefChange24h] = useState<number | null>(null);

  // Participants
  const [participants, setParticipants] = useState<{ support: ProfileInfo[]; challenge: ProfileInfo[] } | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSide, setModalSide] = useState<Side>(Side.Support);

  // Tab state
  const [activeTab, setActiveTab] = useState(0);
  const [tabKey, setTabKey] = useState(0);

  // Claim expansion
  const [isClaimExpanded, setIsClaimExpanded] = useState(false);

  // Bottom sheet
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Swipe tracking
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const tabs = ['Signal', 'Activity', 'Position'];

  const switchTab = (i: number) => {
    setActiveTab(i);
    setTabKey(k => k + 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const next = activeTab + (dx < 0 ? 1 : -1);
      if (next >= 0 && next < tabs.length) switchTab(next);
    }
    touchRef.current = null;
  };

  // Fetch cast content via mapping
  useEffect(() => {
    async function fetchContent() {
      try {
        const mappingResponse = await fetch(`/api/cast-mapping?postId=${postId}`);
        if (!mappingResponse.ok) {
          console.error('Cast mapping not found');
          setContentLoading(false);
          return;
        }
        const mapping = await mappingResponse.json();
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

  // First non-withdrawn position for inline display
  const firstActivePosition = positions.find(p => !p.withdrawn);

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
        className="inline-flex items-center gap-2 text-theme-text-muted hover:text-theme-text mb-3"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Home
      </Link>

      <div className="space-y-3">
        {/* Claim — truncated with toggle */}
        <section>
          {contentLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-theme-border rounded w-3/4"></div>
              <div className="h-4 bg-theme-border rounded w-full"></div>
              <div className="h-4 bg-theme-border rounded w-1/2"></div>
            </div>
          ) : castContent ? (
            <div>
              <p className={`text-sm font-medium leading-relaxed text-theme-text whitespace-pre-wrap break-words ${!isClaimExpanded ? 'line-clamp-3' : ''}`}>
                {castContent.text}
              </p>
              {castContent.text.length > 120 && (
                <button
                  onClick={() => setIsClaimExpanded(!isClaimExpanded)}
                  className="text-xs font-semibold text-theme-primary mt-1"
                >
                  {isClaimExpanded ? 'show less' : 'read more'}
                </button>
              )}
            </div>
          ) : (
            <p className="text-theme-text-muted italic text-sm">Content not available</p>
          )}
        </section>

        {/* Inline position */}
        {isConnected && firstActivePosition && marketAddress && (
          <InlinePositionRow
            position={firstActivePosition}
            marketAddress={marketAddress as `0x${string}`}
            totalPositions={positions.filter(p => !p.withdrawn).length}
            onTap={() => switchTab(2)}
          />
        )}

        {/* Belief Signal — PRIMARY section */}
        <section className="bg-theme-surface border border-theme-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-theme-text-muted">Belief Signal</h2>
            {state && getMarketStatus(state) !== 'no_market' && (
              <StatusBadge status={getMarketStatus(state)} />
            )}
          </div>
          <BeliefCurve
            state={state ?? null}
            section="primary"
            beliefChange24h={beliefChange24h}
            participants={participants ?? undefined}
            earlyWithdrawPenaltyPercent={marketParams ? formatBps(marketParams.earlyWithdrawPenaltyBps) : undefined}
            onInfoClick={() => setIsSheetOpen(true)}
          />
        </section>

        {/* Tab bar — underline style */}
        <div className="flex border-b border-theme-border sticky top-0 bg-theme-bg z-10 pt-0.5" role="tablist">
          {tabs.map((label, i) => (
            <button
              key={label}
              role="tab"
              aria-selected={activeTab === i}
              onClick={() => switchTab(i)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors relative flex items-center justify-center gap-1 ${
                activeTab === i
                  ? 'text-theme-text font-bold'
                  : 'text-theme-text-muted'
              }`}
            >
              {label}
              {/* Badge: Position tab shows position count */}
              {i === 2 && positions.filter(p => !p.withdrawn).length > 0 && (
                <span className="text-[8px] font-bold min-w-[14px] h-[14px] rounded-full inline-flex items-center justify-center px-1 bg-theme-positive/10 text-theme-positive border border-theme-positive/25">
                  {positions.filter(p => !p.withdrawn).length}
                </span>
              )}
              {/* Active underline */}
              {activeTab === i && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-theme-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div
          key={tabKey}
          role="tabpanel"
          className="fade-up min-h-[200px]"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Signal tab */}
          {activeTab === 0 && (
            <div className="space-y-3">
              <section className="bg-theme-surface border border-theme-border rounded-xl p-4">
                <BeliefCurve
                  state={state ?? null}
                  section="secondary"
                  beliefChange24h={beliefChange24h}
                  earlyWithdrawPenaltyPercent={marketParams ? formatBps(marketParams.earlyWithdrawPenaltyBps) : undefined}
                />
              </section>
              <FriendsInMarket postId={postId} viewerFid={context?.user?.fid} />
            </div>
          )}

          {/* Activity tab */}
          {activeTab === 1 && (
            <ActivityFeed postId={postId} bare />
          )}

          {/* Position tab */}
          {activeTab === 2 && (
            <div>
              {isConnected && positions.length > 0 ? (
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
              ) : (
                <div className="border border-dashed border-theme-border bg-theme-surface rounded-lg p-7 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-theme-text mb-1">
                    No active positions
                  </div>
                  <div className="text-xs text-theme-text-muted leading-relaxed">
                    Support or Challenge this claim to open a position and earn from the reward pool.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Share button */}
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

      {/* Bottom sheet: How it works */}
      {isSheetOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setIsSheetOpen(false)}>
          <div className="absolute inset-0 bg-black/60 sheet-backdrop" />
          <div className="absolute bottom-0 left-0 right-0 bg-theme-surface rounded-t-2xl sheet-panel max-h-[65%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-8 h-[3px] rounded-full bg-theme-border" />
            </div>
            <div className="px-5 py-3">
              <h2 className="text-sm font-bold text-theme-text mb-3">How Belief Markets Work</h2>
              <div className="space-y-3 pb-6">
                {[
                  { n: '01', title: 'Commit Capital', desc: `Support or Challenge a claim by committing USDC. Your capital is committed for ${marketParams ? formatLockPeriod(marketParams.lockPeriod) : '30 days'}.` },
                  { n: '02', title: 'Time-Weighted Signal', desc: 'The longer your capital stays committed, the more it contributes to the belief signal. Earlier and longer commitments earn more rewards.' },
                  { n: '03', title: 'Earn Rewards', desc: `Rewards come from a shared pool, not other participants. Early withdrawal incurs a ${marketParams ? formatBps(marketParams.earlyWithdrawPenaltyBps) : '5%'} penalty. Your principal is returned after the commitment period.` },
                ].map((step, i) => (
                  <div key={step.n} className={`flex gap-3 py-3 ${i < 2 ? 'border-b border-theme-border/40' : ''}`}>
                    <span className="text-[10px] font-bold text-theme-primary min-w-[18px]">{step.n}</span>
                    <div>
                      <div className="text-xs font-bold text-theme-text mb-0.5">{step.title}</div>
                      <div className="text-xs text-theme-text-muted leading-relaxed">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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

// ── Inline Position Row ──────────────────────────────────────────────────────
// Separate component so it can call usePendingRewards hook

interface InlinePositionRowProps {
  position: Position & { id: bigint };
  marketAddress: `0x${string}`;
  totalPositions: number;
  onTap: () => void;
}

function InlinePositionRow({ position, marketAddress, totalPositions, onTap }: InlinePositionRowProps) {
  const { data: pendingRewards } = usePendingRewards(marketAddress, position.id);
  const isSupport = position.side === Side.Support;

  return (
    <button
      onClick={onTap}
      className={`w-full flex items-center justify-between py-2 px-3 rounded-lg transition-all active:scale-[0.99] ${
        isSupport
          ? 'bg-theme-positive/10 border border-theme-positive/25'
          : 'bg-theme-negative/10 border border-theme-negative/25'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <div className={`w-[5px] h-[5px] rounded-full ${isSupport ? 'bg-theme-positive shadow-[0_0_5px_rgba(167,139,250,0.4)]' : 'bg-theme-negative shadow-[0_0_5px_rgba(251,146,60,0.4)]'}`} />
        <span className="text-xs font-bold text-theme-text">${formatUSDC(position.amount)}</span>
        <span className="text-[10px] text-theme-text-muted">{isSupport ? 'support' : 'challenge'}</span>
      </div>
      <div className="flex items-center gap-2">
        {pendingRewards && pendingRewards > 0n && (
          <span className="text-xs font-bold text-theme-positive">+${formatUSDC(pendingRewards)}</span>
        )}
        {totalPositions > 1 && (
          <span className="text-[10px] text-theme-text-muted">+{totalPositions - 1} more</span>
        )}
      </div>
    </button>
  );
}

// ── Position Card ────────────────────────────────────────────────────────────

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
          <div className="flex items-center justify-between text-xs">
            <span className="text-theme-text-muted">
              Pending rewards: <span className="text-theme-positive font-medium">${formatUSDC(pendingRewards)}</span>
            </span>
          </div>
        ) : rewardsCountdownRemaining != null ? (
          <div className="flex items-center justify-between text-xs">
            <span className="text-theme-text-muted">
              Rewards begin in <span className="text-theme-negative font-medium">{formatCountdown(rewardsCountdownRemaining)}</span>
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
