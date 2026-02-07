'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAccount, useConnect, useSwitchChain } from 'wagmi';
import { useMiniApp } from '@neynar/react';
import { useVaultAllowance, useUSDCBalance } from '~/hooks/useBeliefMarketWrite';
import { useFarcasterApproveUSDC, useFarcasterCreateMarket } from '~/hooks/useFarcasterTransaction';
import { useMarketAddress, useMarketExists, useDefaultParams } from '~/hooks/useBeliefMarket';
import { generatePostId } from '~/lib/postId';
import { maxUint256 } from 'viem';
import {
  formatUSDC,
  parseUSDC,
  formatBps,
  formatLockPeriod,
  DEFAULT_CHAIN_ID,
  CONTRACTS,
  MIN_STAKE,
  MAX_STAKE,
} from '~/lib/contracts';
import { ShareButton } from '~/components/ui/Share';

interface Cast {
  hash: string;
  text: string;
  timestamp: string;
  author: {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl: string;
  };
  reactions: {
    likes: number;
    recasts: number;
  };
  replies: number;
}

type Step = 'select' | 'commit' | 'approve' | 'create' | 'success';

export function CreateMarketView() {
  const router = useRouter();
  const { isConnected, chain, address } = useAccount();
  const { connectors, connect } = useConnect();
  const { switchChain } = useSwitchChain();
  const { context } = useMiniApp();
  const { data: defaultParams } = useDefaultParams();

  // Derive stake limits from contract params (fallback to hardcoded constants)
  const minStake = defaultParams?.minStake ?? MIN_STAKE;
  const maxStake = defaultParams?.maxStake ?? MAX_STAKE;
  const minStakeDisplay = Number(minStake) / 1e6;
  const maxStakeDisplay = Number(maxStake) / 1e6;

  // State
  const [casts, setCasts] = useState<Cast[]>([]);
  const [castsLoading, setCastsLoading] = useState(false);
  const [castsLoadingMore, setCastsLoadingMore] = useState(false);
  const [castsError, setCastsError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [selectedCast, setSelectedCast] = useState<Cast | null>(null);
  const [amount, setAmount] = useState('10');
  const [step, setStep] = useState<Step>('select');

  // URL lookup state
  const [castUrl, setCastUrl] = useState('');
  const [urlLookupLoading, setUrlLookupLoading] = useState(false);
  const [urlLookupError, setUrlLookupError] = useState<string | null>(null);
  const [urlCast, setUrlCast] = useState<Cast | null>(null);

  const amountBigInt = parseUSDC(amount);
  const amountNum = parseFloat(amount) || 0;
  const isValidAmount = amountBigInt >= minStake && amountBigInt <= maxStake;

  // Generate postId from selected cast hash
  const postId = selectedCast ? generatePostId(selectedCast.hash) : null;

  // Check if market already exists for this cast
  const { data: marketExists, isLoading: checkingMarket } = useMarketExists(postId ?? undefined);

  // Use wagmi for reading allowance/balance, SDK for writing
  const { allowance, refetch: refetchAllowance } = useVaultAllowance();
  const { balance } = useUSDCBalance();

  // Farcaster SDK-based hooks for transactions
  const {
    approve: approveUSDC,
    isPending: isApproving,
    isConfirming: isApproveConfirming,
    isSuccess: isApproveSuccess,
    error: approveError,
    reset: resetApprove,
  } = useFarcasterApproveUSDC();

  const {
    createMarket: createMarketTx,
    isPending: isCreating,
    isConfirming: isCreateConfirming,
    isSuccess: isCreateSuccess,
    error: createError,
    reset: resetCreate,
  } = useFarcasterCreateMarket();

  const { data: marketAddress, refetch: refetchMarket } = useMarketAddress(postId ?? undefined);

  const vaultAddress = CONTRACTS[DEFAULT_CHAIN_ID].vault;

  const needsApproval = (amount: bigint) => {
    if (amount === 0n) return false;
    if (!allowance) return true;
    return allowance < amount;
  };

  const hasBalance = (amount: bigint) => {
    if (amount === 0n) return true;
    if (!balance) return false;
    return balance >= amount;
  };

  // Fetch casts with optional cursor for pagination
  const fetchCasts = useCallback(async (fid: number, cursor?: string) => {
    const isLoadMore = !!cursor;
    if (isLoadMore) {
      setCastsLoadingMore(true);
    } else {
      setCastsLoading(true);
      setCastsError(null);
    }

    try {
      const params = new URLSearchParams({ fid: String(fid) });
      if (cursor) params.set('cursor', cursor);
      const response = await fetch(`/api/casts?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch casts');
      }
      const data = await response.json();
      const newCasts = data.casts || [];
      setCasts(prev => isLoadMore ? [...prev, ...newCasts] : newCasts);
      setNextCursor(data.nextCursor ?? null);
    } catch (error) {
      setCastsError(error instanceof Error ? error.message : 'Failed to load casts');
    } finally {
      setCastsLoading(false);
      setCastsLoadingMore(false);
    }
  }, []);

  // Fetch user's casts when we have the FID
  useEffect(() => {
    const fid = context?.user?.fid;
    if (!fid) return;
    fetchCasts(fid);
  }, [context?.user?.fid, fetchCasts]);

  // Infinite scroll: observe sentinel element
  useEffect(() => {
    const fid = context?.user?.fid;
    if (!fid || !nextCursor || step !== 'select') return;

    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !castsLoadingMore) {
          fetchCasts(fid, nextCursor);
        }
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [context?.user?.fid, nextCursor, step, castsLoadingMore, fetchCasts]);

  // Handle approval success - move to create step
  useEffect(() => {
    if (isApproveSuccess && step === 'approve') {
      refetchAllowance();
      setStep('create');
    }
  }, [isApproveSuccess, step, refetchAllowance]);

  // Handle create success - store mapping and show success
  useEffect(() => {
    if (isCreateSuccess && step === 'create' && selectedCast && postId) {
      // Store the cast mapping for later retrieval
      fetch('/api/cast-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          castHash: selectedCast.hash,
          authorFid: selectedCast.author.fid,
          text: selectedCast.text,
          authorUsername: selectedCast.author.username,
          authorDisplayName: selectedCast.author.displayName,
          authorPfpUrl: selectedCast.author.pfpUrl,
        }),
      }).catch(err => {
        console.error('Failed to store cast mapping:', err);
      });

      refetchMarket();
      setStep('success');
    }
  }, [isCreateSuccess, step, refetchMarket, selectedCast, postId]);

  const handleSelectCast = (cast: Cast) => {
    setSelectedCast(cast);
    setStep('commit');
  };

  const handleBack = () => {
    setSelectedCast(null);
    setStep('select');
    resetApprove();
    resetCreate();
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleUrlLookup = async () => {
    const trimmed = castUrl.trim();
    if (!trimmed) return;

    // Abort any in-flight lookup
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setUrlLookupLoading(true);
    setUrlLookupError(null);
    setUrlCast(null);

    try {
      // Determine if it's a raw hash or a URL
      const isHash = /^0x[0-9a-fA-F]{40}$/.test(trimmed);
      if (trimmed.startsWith('0x') && !isHash) {
        throw new Error('Invalid cast hash. Expected 0x followed by 40 hex characters.');
      }

      const params = isHash
        ? new URLSearchParams({ hash: trimmed })
        : new URLSearchParams({ url: trimmed });

      const response = await fetch(`/api/casts?${params}`, { signal: controller.signal });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Cast not found');
      }
      const data = await response.json();
      if (!data.cast) {
        throw new Error('Cast not found');
      }
      setUrlCast(data.cast);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setUrlLookupError(error instanceof Error ? error.message : 'Failed to look up cast');
    } finally {
      if (!controller.signal.aborted) {
        setUrlLookupLoading(false);
      }
    }
  };

  const handleProceed = async () => {
    if (!postId || !isValidAmount) return;

    if (needsApproval(amountBigInt)) {
      setStep('approve');
      try {
        await approveUSDC(vaultAddress, maxUint256);
        // Success will be handled by the useEffect
      } catch (err) {
        console.error('Approval failed:', err);
      }
    } else {
      setStep('create');
      try {
        await createMarketTx(postId, amountBigInt);
        // Success will be handled by the useEffect
      } catch (err) {
        console.error('Create market failed:', err);
      }
    }
  };

  const handleCreate = async () => {
    if (!postId) return;
    try {
      await createMarketTx(postId, amountBigInt);
      // Success will be handled by the useEffect
    } catch (err) {
      console.error('Create market failed:', err);
    }
  };

  const handleViewMarket = () => {
    if (postId) {
      router.push(`/market/${postId}`);
    }
  };

  const isWrongChain = chain?.id !== DEFAULT_CHAIN_ID;
  const canProceed = selectedCast && isValidAmount && hasBalance(amountBigInt) && !marketExists;

  return (
    <div className="min-h-screen bg-theme-bg">
      {/* Header */}
      <header className="bg-theme-surface border-b border-theme-border px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {step === 'select' ? (
            <Link href="/" className="text-theme-text-muted hover:text-theme-text">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          ) : step !== 'success' ? (
            <button onClick={handleBack} className="text-theme-text-muted hover:text-theme-text">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <div className="w-5" />
          )}
          <h1 className="text-lg font-semibold text-theme-text flex-1 text-center">
            {step === 'success' ? 'Market Created' : 'Create Market'}
          </h1>
          <div className="w-5" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Not in Farcaster context */}
        {!context?.user?.fid && (
          <div className="bg-theme-surface border border-theme-border rounded-xl p-6 text-center">
            <p className="text-theme-text-muted">Open this app in a Farcaster client to see your casts.</p>
          </div>
        )}

        {/* Not connected */}
        {context?.user?.fid && !isConnected && (
          <div className="bg-theme-surface border border-theme-border rounded-xl p-6 space-y-4">
            <p className="text-theme-text-muted text-center">Connect your wallet to create a market</p>
            <div className="space-y-2">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => connect({ connector })}
                  className="w-full py-3 px-4 bg-theme-bg border border-theme-border hover:bg-theme-border rounded-xl text-theme-text font-medium transition-colors"
                >
                  {connector.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Wrong chain */}
        {context?.user?.fid && isConnected && isWrongChain && (
          <div className="bg-theme-surface border border-theme-border rounded-xl p-6 text-center space-y-4">
            <p className="text-theme-text-muted">Please switch to Base Sepolia</p>
            <button
              onClick={() => switchChain({ chainId: DEFAULT_CHAIN_ID })}
              className="w-full py-3 px-4 bg-gradient-primary hover:opacity-90 rounded-xl text-white font-medium transition-colors"
            >
              Switch Network
            </button>
          </div>
        )}

        {/* Select cast step */}
        {context?.user?.fid && isConnected && !isWrongChain && step === 'select' && (
          <div className="space-y-4">
            {/* URL lookup section */}
            <div className="bg-theme-surface border border-theme-border rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-theme-text">Challenge any cast</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={castUrl}
                  onChange={(e) => setCastUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleUrlLookup(); }}
                  placeholder="Paste a Warpcast URL or cast hash..."
                  aria-label="Warpcast URL or cast hash"
                  className="flex-1 px-3 py-2 border border-theme-border bg-theme-bg rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none text-theme-text placeholder-theme-text-muted text-sm"
                />
                <button
                  onClick={handleUrlLookup}
                  disabled={urlLookupLoading || !castUrl.trim()}
                  className="px-4 py-2 bg-gradient-primary hover:opacity-90 disabled:bg-theme-border disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-colors whitespace-nowrap"
                >
                  {urlLookupLoading ? 'Looking up...' : 'Look up'}
                </button>
              </div>

              {urlLookupError && (
                <p className="text-sm text-red-400">{urlLookupError}</p>
              )}

              {urlCast && (
                <button
                  onClick={() => handleSelectCast(urlCast)}
                  className="w-full bg-theme-bg border border-theme-border rounded-lg p-3 text-left hover:border-theme-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {urlCast.author.pfpUrl && (
                      <img
                        src={urlCast.author.pfpUrl}
                        alt={urlCast.author.displayName}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <span className="text-sm font-medium text-theme-text">{urlCast.author.displayName}</span>
                    <span className="text-xs text-theme-text-muted">@{urlCast.author.username}</span>
                  </div>
                  <p className="text-sm text-theme-text line-clamp-3">{urlCast.text}</p>
                  <p className="text-xs text-theme-primary mt-2">Create market on this cast &rarr;</p>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-theme-text-muted text-xs">
              <div className="flex-1 border-t border-theme-border" />
              <span>or pick one of your casts</span>
              <div className="flex-1 border-t border-theme-border" />
            </div>

            {castsLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary mx-auto mb-4" />
                <p className="text-theme-text-muted">Loading your casts...</p>
              </div>
            )}

            {castsError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl">
                {castsError}
              </div>
            )}

            {!castsLoading && !castsError && casts.length === 0 && (
              <div className="text-center py-8 text-theme-text-muted">
                No casts found. Post something on Farcaster first!
              </div>
            )}

            {!castsLoading && casts.length > 0 && (
              <div className="space-y-3">
                {casts.map((cast) => (
                  <CastCard
                    key={cast.hash}
                    cast={cast}
                    onClick={() => handleSelectCast(cast)}
                  />
                ))}
                {/* Sentinel for infinite scroll */}
                {nextCursor && (
                  <div ref={loadMoreRef} className="py-4 text-center">
                    {castsLoadingMore && (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-theme-primary mx-auto" />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Commit step */}
        {context?.user?.fid && isConnected && !isWrongChain && step === 'commit' && selectedCast && (
          <div className="space-y-6">
            {/* Selected cast */}
            <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
              <p className="text-xs text-theme-text-muted mb-2">Selected cast</p>
              <p className="text-theme-text">{selectedCast.text}</p>
            </div>

            {/* Market exists warning */}
            {marketExists && (
              <div className="bg-theme-negative/10 border border-theme-negative/30 rounded-xl p-4">
                <p className="text-theme-text text-sm">
                  A market already exists for this cast.{' '}
                  <button
                    onClick={handleViewMarket}
                    className="underline font-medium text-theme-primary"
                  >
                    View market
                  </button>
                </p>
              </div>
            )}

            {/* Commitment input */}
            {!marketExists && (
              <>
                <div className="bg-theme-surface border border-theme-border rounded-xl p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-theme-text mb-2">
                      Your Commitment (USDC)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-muted">$</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="10.00"
                        min={minStakeDisplay}
                        max={maxStakeDisplay}
                        step="0.01"
                        className="w-full pl-8 pr-4 py-3 border border-theme-border bg-theme-bg rounded-xl focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none text-theme-text placeholder-theme-text-muted"
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-theme-text-muted">
                        Min ${minStakeDisplay}, Max ${maxStakeDisplay}
                      </p>
                      {balance !== undefined && (
                        <p className="text-xs text-theme-text-muted">
                          Balance: ${formatUSDC(balance)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Validation errors */}
                  {amountNum > 0 && amountNum < minStakeDisplay && (
                    <p className="text-sm text-red-500">Minimum commitment is ${minStakeDisplay}</p>
                  )}
                  {amountNum > maxStakeDisplay && (
                    <p className="text-sm text-red-500">Maximum commitment is ${maxStakeDisplay}</p>
                  )}
                  {isValidAmount && !hasBalance(amountBigInt) && (
                    <p className="text-sm text-red-500">Insufficient USDC balance</p>
                  )}
                </div>

                {/* Info box */}
                <div className="bg-theme-bg border border-theme-border rounded-lg p-4 text-sm text-theme-text-muted space-y-2">
                  <p><strong className="text-theme-text">By creating this market:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Your USDC is committed for {defaultParams ? formatLockPeriod(defaultParams.lockPeriod) : '30 days'} ({defaultParams ? formatBps(defaultParams.earlyWithdrawPenaltyBps) : '5%'} early withdrawal penalty)</li>
                    <li>A {defaultParams ? formatBps(defaultParams.authorPremiumBps) : '2%'} author premium funds the reward pool</li>
                    <li>Others can support or challenge your claim</li>
                  </ul>
                </div>

                <button
                  onClick={handleProceed}
                  disabled={!canProceed || checkingMarket}
                  className="w-full py-4 bg-gradient-primary hover:opacity-90 disabled:bg-theme-border disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors"
                >
                  {checkingMarket
                    ? 'Checking...'
                    : needsApproval(amountBigInt)
                      ? 'Approve & Create Market'
                      : 'Create Market'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Approve step */}
        {context?.user?.fid && isConnected && !isWrongChain && step === 'approve' && (
          <div className="bg-theme-surface border border-theme-border rounded-xl p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto">
              {isApproving || isApproveConfirming ? (
                <div className="w-full h-full border-4 border-theme-border border-t-theme-primary rounded-full animate-spin" />
              ) : approveError ? (
                <div className="w-full h-full flex items-center justify-center text-red-500">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              ) : null}
            </div>

            <div>
              <p className="font-medium text-theme-text">
                {isApproving ? 'Confirm in wallet...' : isApproveConfirming ? 'Approving USDC...' : 'Approval failed'}
              </p>
              <p className="text-sm text-theme-text-muted mt-1">
                {isApproving
                  ? 'Please confirm the approval transaction'
                  : isApproveConfirming
                    ? 'Waiting for confirmation...'
                    : approveError?.message || 'Something went wrong'}
              </p>
            </div>

            {approveError && (
              <button
                onClick={() => { resetApprove(); approveUSDC(vaultAddress, maxUint256); }}
                className="w-full py-3 bg-gradient-primary hover:opacity-90 rounded-xl text-white font-medium transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        )}

        {/* Create step */}
        {context?.user?.fid && isConnected && !isWrongChain && step === 'create' && (
          <div className="bg-theme-surface border border-theme-border rounded-xl p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto">
              {isCreating || isCreateConfirming ? (
                <div className="w-full h-full border-4 border-theme-border border-t-theme-primary rounded-full animate-spin" />
              ) : createError ? (
                <div className="w-full h-full flex items-center justify-center text-red-500">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-theme-primary">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>

            <div>
              <p className="font-medium text-theme-text">
                {isCreating
                  ? 'Confirm in wallet...'
                  : isCreateConfirming
                    ? 'Creating market...'
                    : createError
                      ? 'Creation failed'
                      : 'Ready to create'}
              </p>
              <p className="text-sm text-theme-text-muted mt-1">
                {isCreating
                  ? `Committing $${formatUSDC(amountBigInt)} to create your belief market`
                  : isCreateConfirming
                    ? 'Waiting for confirmation...'
                    : createError
                      ? createError.message || 'Something went wrong'
                      : 'USDC approved. Click below to create the market.'}
              </p>
            </div>

            {!isCreating && !isCreateConfirming && (
              <button
                onClick={createError ? () => { resetCreate(); handleCreate(); } : handleCreate}
                className="w-full py-3 bg-gradient-primary hover:opacity-90 rounded-xl text-white font-medium transition-colors"
              >
                {createError ? 'Try Again' : 'Create Market'}
              </button>
            )}
          </div>
        )}

        {/* Success step */}
        {context?.user?.fid && isConnected && !isWrongChain && step === 'success' && selectedCast && (
          <div className="bg-theme-surface border border-theme-border rounded-xl p-6 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto flex items-center justify-center text-theme-positive mb-4">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-medium text-theme-text text-lg">Market Created!</p>
              <p className="text-sm text-theme-text-muted mt-1">
                Your belief market is live. Share it to invite others.
              </p>
            </div>

            <div className="bg-theme-bg border border-theme-border rounded-lg p-4">
              <p className="text-xs text-theme-text-muted mb-1">Your claim</p>
              <p className="text-sm text-theme-text line-clamp-3">{selectedCast.text}</p>
            </div>

            <div className="bg-theme-bg border border-theme-border rounded-lg p-4 space-y-2">
              <div>
                <p className="text-xs text-theme-text-muted">Your commitment</p>
                <p className="text-sm text-theme-text font-medium">${formatUSDC(amountBigInt)}</p>
              </div>
              {marketAddress && marketAddress !== '0x0000000000000000000000000000000000000000' && (
                <div>
                  <p className="text-xs text-theme-text-muted">Market</p>
                  <code className="text-xs text-theme-text-muted/70 break-all">{marketAddress}</code>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <ShareButton
                buttonText="Share on Farcaster"
                className="w-full py-3 bg-gradient-primary hover:opacity-90 rounded-xl text-white font-medium transition-colors"
                cast={{
                  text: `I just put $${formatUSDC(amountBigInt)} behind my claim:\n\n"${selectedCast.text.slice(0, 100)}${selectedCast.text.length > 100 ? '...' : ''}"\n\nDo you agree? Commit to your stance.`,
                  embeds: [{ path: `/market/${postId}` }],
                }}
              />
              <button
                onClick={handleViewMarket}
                className="w-full py-3 bg-theme-bg border border-theme-border hover:bg-theme-border rounded-xl text-theme-text font-medium transition-colors"
              >
                View Market
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function CastCard({ cast, onClick }: { cast: Cast; onClick: () => void }) {
  const timeAgo = getTimeAgo(new Date(cast.timestamp));

  return (
    <button
      onClick={onClick}
      className="w-full bg-theme-surface border border-theme-border rounded-xl p-4 text-left hover:border-theme-primary/50 transition-colors"
    >
      <p className="text-theme-text line-clamp-3 mb-2">{cast.text}</p>
      <div className="flex items-center justify-between text-xs text-theme-text-muted">
        <span>{timeAgo}</span>
        <div className="flex items-center gap-3">
          <span>{cast.reactions.likes} likes</span>
          <span>{cast.replies} replies</span>
        </div>
      </div>
    </button>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
