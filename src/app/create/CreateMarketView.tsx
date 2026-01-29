'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAccount, useConnect, useSwitchChain } from 'wagmi';
import { useMiniApp } from '@neynar/react';
import { useFactoryAllowance, useUSDCBalance } from '~/hooks/useBeliefMarketWrite';
import { useFarcasterApproveUSDC, useFarcasterCreateMarket } from '~/hooks/useFarcasterTransaction';
import { useMarketAddress, useMarketExists } from '~/hooks/useBeliefMarket';
import { generatePostId } from '~/lib/postId';
import {
  formatUSDC,
  parseUSDC,
  DEFAULT_CHAIN_ID,
  CONTRACTS,
  MIN_STAKE,
  MAX_STAKE,
  MIN_STAKE_DISPLAY,
  MAX_STAKE_DISPLAY,
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

  // State
  const [casts, setCasts] = useState<Cast[]>([]);
  const [castsLoading, setCastsLoading] = useState(false);
  const [castsError, setCastsError] = useState<string | null>(null);
  const [selectedCast, setSelectedCast] = useState<Cast | null>(null);
  const [amount, setAmount] = useState('10');
  const [step, setStep] = useState<Step>('select');

  const amountBigInt = parseUSDC(amount);
  const amountNum = parseFloat(amount) || 0;
  const isValidAmount = amountBigInt >= MIN_STAKE && amountBigInt <= MAX_STAKE;

  // Generate postId from selected cast hash
  const postId = selectedCast ? generatePostId(selectedCast.hash) : null;

  // Check if market already exists for this cast
  const { data: marketExists, isLoading: checkingMarket } = useMarketExists(postId ?? undefined);

  // Use wagmi for reading allowance/balance, SDK for writing
  const { allowance, refetch: refetchAllowance } = useFactoryAllowance();
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

  const factoryAddress = CONTRACTS[DEFAULT_CHAIN_ID].factory;

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

  // Fetch user's casts when we have the FID
  useEffect(() => {
    const fid = context?.user?.fid;
    if (!fid) return;

    async function fetchCasts() {
      setCastsLoading(true);
      setCastsError(null);

      try {
        const response = await fetch(`/api/casts?fid=${fid}`);
        if (!response.ok) {
          throw new Error('Failed to fetch casts');
        }
        const data = await response.json();
        setCasts(data.casts || []);
      } catch (error) {
        setCastsError(error instanceof Error ? error.message : 'Failed to load casts');
      } finally {
        setCastsLoading(false);
      }
    }

    fetchCasts();
  }, [context?.user?.fid]);

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

  const handleProceed = async () => {
    if (!postId || !isValidAmount) return;

    if (needsApproval(amountBigInt)) {
      setStep('approve');
      try {
        await approveUSDC(factoryAddress, amountBigInt);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {step === 'select' ? (
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          ) : step !== 'success' ? (
            <button onClick={handleBack} className="text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <div className="w-5" />
          )}
          <h1 className="text-lg font-semibold text-gray-900 flex-1 text-center">
            {step === 'select' ? 'Select a Cast' : step === 'success' ? 'Market Created' : 'Create Market'}
          </h1>
          <div className="w-5" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Not in Farcaster context */}
        {!context?.user?.fid && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <p className="text-gray-600">Open this app in a Farcaster client to see your casts.</p>
          </div>
        )}

        {/* Not connected */}
        {context?.user?.fid && !isConnected && (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <p className="text-gray-600 text-center">Connect your wallet to create a market</p>
            <div className="space-y-2">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => connect({ connector })}
                  className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium transition-colors"
                >
                  {connector.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Wrong chain */}
        {context?.user?.fid && isConnected && isWrongChain && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-4">
            <p className="text-gray-600">Please switch to Base Sepolia</p>
            <button
              onClick={() => switchChain({ chainId: DEFAULT_CHAIN_ID })}
              className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-800 rounded-xl text-white font-medium transition-colors"
            >
              Switch Network
            </button>
          </div>
        )}

        {/* Select cast step */}
        {context?.user?.fid && isConnected && !isWrongChain && step === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Choose a cast to create a belief market for. Others will be able to support or challenge your claim.
            </p>

            {castsLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading your casts...</p>
              </div>
            )}

            {castsError && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl">
                {castsError}
              </div>
            )}

            {!castsLoading && !castsError && casts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
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
              </div>
            )}
          </div>
        )}

        {/* Commit step */}
        {context?.user?.fid && isConnected && !isWrongChain && step === 'commit' && selectedCast && (
          <div className="space-y-6">
            {/* Selected cast */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-2">Selected cast</p>
              <p className="text-gray-900">{selectedCast.text}</p>
            </div>

            {/* Market exists warning */}
            {marketExists && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-800 text-sm">
                  A market already exists for this cast.{' '}
                  <button
                    onClick={handleViewMarket}
                    className="underline font-medium"
                  >
                    View market
                  </button>
                </p>
              </div>
            )}

            {/* Commitment input */}
            {!marketExists && (
              <>
                <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Commitment (USDC)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="10.00"
                        min={MIN_STAKE_DISPLAY}
                        max={MAX_STAKE_DISPLAY}
                        step="0.01"
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-gray-500">
                        Min ${MIN_STAKE_DISPLAY}, Max ${MAX_STAKE_DISPLAY}
                      </p>
                      {balance !== undefined && (
                        <p className="text-xs text-gray-500">
                          Balance: ${formatUSDC(balance)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Validation errors */}
                  {amountNum > 0 && amountNum < MIN_STAKE_DISPLAY && (
                    <p className="text-sm text-red-600">Minimum commitment is ${MIN_STAKE_DISPLAY}</p>
                  )}
                  {amountNum > MAX_STAKE_DISPLAY && (
                    <p className="text-sm text-red-600">Maximum commitment is ${MAX_STAKE_DISPLAY}</p>
                  )}
                  {isValidAmount && !hasBalance(amountBigInt) && (
                    <p className="text-sm text-red-600">Insufficient USDC balance</p>
                  )}
                </div>

                {/* Info box */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 space-y-2">
                  <p><strong>By creating this market:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    <li>Your USDC is committed for 30 days (5% early withdrawal penalty)</li>
                    <li>A 2% author premium funds the reward pool</li>
                    <li>Others can support or challenge your claim</li>
                  </ul>
                </div>

                <button
                  onClick={handleProceed}
                  disabled={!canProceed || checkingMarket}
                  className="w-full py-4 bg-slate-700 hover:bg-slate-800 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors"
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
          <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto">
              {isApproving || isApproveConfirming ? (
                <div className="w-full h-full border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
              ) : approveError ? (
                <div className="w-full h-full flex items-center justify-center text-red-500">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              ) : null}
            </div>

            <div>
              <p className="font-medium text-gray-900">
                {isApproving ? 'Confirm in wallet...' : isApproveConfirming ? 'Approving USDC...' : 'Approval failed'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {isApproving
                  ? 'Please confirm the approval transaction'
                  : isApproveConfirming
                    ? 'Waiting for confirmation...'
                    : approveError?.message || 'Something went wrong'}
              </p>
            </div>

            {approveError && (
              <button
                onClick={() => { resetApprove(); approveUSDC(factoryAddress, amountBigInt); }}
                className="w-full py-3 bg-slate-700 hover:bg-slate-800 rounded-xl text-white font-medium transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        )}

        {/* Create step */}
        {context?.user?.fid && isConnected && !isWrongChain && step === 'create' && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto">
              {isCreating || isCreateConfirming ? (
                <div className="w-full h-full border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
              ) : createError ? (
                <div className="w-full h-full flex items-center justify-center text-red-500">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>

            <div>
              <p className="font-medium text-gray-900">
                {isCreating
                  ? 'Confirm in wallet...'
                  : isCreateConfirming
                    ? 'Creating market...'
                    : createError
                      ? 'Creation failed'
                      : 'Ready to create'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
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
                className="w-full py-3 bg-slate-700 hover:bg-slate-800 rounded-xl text-white font-medium transition-colors"
              >
                {createError ? 'Try Again' : 'Create Market'}
              </button>
            )}
          </div>
        )}

        {/* Success step */}
        {context?.user?.fid && isConnected && !isWrongChain && step === 'success' && selectedCast && (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto flex items-center justify-center text-green-500 mb-4">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-medium text-gray-900 text-lg">Market Created!</p>
              <p className="text-sm text-gray-500 mt-1">
                Your belief market is live. Share it to invite others.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Your claim</p>
              <p className="text-sm text-gray-900 line-clamp-3">{selectedCast.text}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div>
                <p className="text-xs text-gray-500">Your commitment</p>
                <p className="text-sm text-gray-900 font-medium">${formatUSDC(amountBigInt)}</p>
              </div>
              {marketAddress && marketAddress !== '0x0000000000000000000000000000000000000000' && (
                <div>
                  <p className="text-xs text-gray-500">Market</p>
                  <code className="text-xs text-gray-700 break-all">{marketAddress}</code>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <ShareButton
                buttonText="Share on Farcaster"
                className="w-full py-3 bg-slate-700 hover:bg-slate-800 rounded-xl text-white font-medium transition-colors"
                cast={{
                  text: `I just put $${formatUSDC(amountBigInt)} behind my claim:\n\n"${selectedCast.text.slice(0, 100)}${selectedCast.text.length > 100 ? '...' : ''}"\n\nDo you agree? Commit to your stance.`,
                  embeds: [{ path: `/market/${postId}` }],
                }}
              />
              <button
                onClick={handleViewMarket}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium transition-colors"
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
      className="w-full bg-white rounded-xl shadow-sm p-4 text-left hover:bg-gray-50 transition-colors"
    >
      <p className="text-gray-900 line-clamp-3 mb-2">{cast.text}</p>
      <div className="flex items-center justify-between text-xs text-gray-500">
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
