'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useConnect, useSwitchChain } from 'wagmi';
import { useMiniApp } from '@neynar/react';
import { useCommitFlow } from '~/hooks/useBeliefMarketWrite';
import { FriendChallenger } from '~/components/ui/FriendChallenger';
import { Side, formatUSDC, parseUSDC, formatBps, formatLockPeriod, DEFAULT_CHAIN_ID, CONTRACTS } from '~/lib/contracts';
import { APP_URL } from '~/lib/constants';

interface CommitModalProps {
  isOpen: boolean;
  onClose: () => void;
  side: Side;
  marketAddress: `0x${string}`;
  postId: string;
  castText?: string;
  parentCastHash?: string;
  lockPeriod?: number;
  earlyWithdrawPenaltyBps?: number;
  onSuccess?: () => void;
}

type Step = 'input' | 'comment' | 'approve' | 'commit' | 'success';

export function CommitModal({ isOpen, onClose, side, marketAddress, postId, castText, parentCastHash, lockPeriod, earlyWithdrawPenaltyBps, onSuccess }: CommitModalProps) {
  const { isConnected, chain, address } = useAccount();
  const { connectors, connect } = useConnect();
  const { switchChain } = useSwitchChain();
  const { context, actions } = useMiniApp();

  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [comment, setComment] = useState('');

  // Ref to track if success handler has already run for this commit
  const successHandledRef = useRef(false);

  const amountBigInt = parseUSDC(amount);
  const isValidAmount = amountBigInt > 0n;

  const {
    allowance,
    needsApproval,
    refetchAllowance,
    balance,
    hasBalance,
    approve,
    isApproving,
    isApproveConfirming,
    isApproveSuccess,
    approveError,
    resetApprove,
    commit,
    isCommitting,
    isCommitConfirming,
    isCommitSuccess,
    commitError,
    resetCommit,
  } = useCommitFlow(marketAddress, side);

  // Handle approval success -> move to commit step
  useEffect(() => {
    if (isApproveSuccess && step === 'approve') {
      refetchAllowance();
      setStep('commit');
      resetApprove();
    }
  }, [isApproveSuccess, step, refetchAllowance, resetApprove]);

  // Handle commit success -> publish comment, then notify + record participant
  useEffect(() => {
    if (isCommitSuccess && step === 'commit' && !successHandledRef.current) {
      successHandledRef.current = true;
      handleCommitSuccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCommitSuccess, step]);

  async function handleCommitSuccess() {
    setStep('success');

    const sideStr = side === Side.Support ? 'support' : 'challenge';
    const sideVerb = side === Side.Support ? 'supported' : 'challenged';
    const formattedAmount = formatUSDC(amountBigInt);
    let publishedCastHash: string | undefined;

    // 1. Open Farcaster composer with comment as a reply to the original cast
    if (comment.trim()) {
      const baseUrl = APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const marketUrl = `${baseUrl}/market/${postId}`;

      const text = `${comment.trim()}\n\n[${sideVerb} with $${formattedAmount}]`;

      try {
        const result = await actions.composeCast({
          text,
          embeds: [marketUrl] as [string],
          ...(parentCastHash ? { parent: { type: 'cast' as const, hash: parentCastHash } } : {}),
        });
        publishedCastHash = result?.cast?.hash;
      } catch (err) {
        console.error('Cast composer dismissed or failed:', err);
      }
    }

    // 2. Fire-and-forget: notify + record participant (parallel)
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: sideStr, postId, amount: formattedAmount }),
    }).catch((err) => console.error('Failed to send notification:', err));

    if (context?.user?.fid) {
      fetch('/api/market-participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          fid: context.user.fid,
          side: sideStr,
          amount: formattedAmount,
          comment: comment.trim() || undefined,
          commentCastHash: publishedCastHash,
        }),
      }).catch((err) => console.error('Failed to record participant:', err));
    }
  }

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setComment('');
      setStep('input');
      successHandledRef.current = false;
      resetApprove();
      resetCommit();
    }
  }, [isOpen, resetApprove, resetCommit]);

  if (!isOpen) return null;

  const handleProceed = () => {
    if (!isValidAmount) return;
    setStep('comment');
  };

  const handleCommentProceed = () => {
    // For challenges, comment is mandatory
    if (side === Side.Oppose && !comment.trim()) return;

    if (needsApproval(amountBigInt)) {
      setStep('approve');
      approve();
    } else {
      setStep('commit');
      commit(amountBigInt);
    }
  };

  const handleCommit = () => {
    commit(amountBigInt);
  };

  const handleDone = () => {
    onSuccess?.();
    onClose();
  };

  const isWrongChain = chain?.id !== DEFAULT_CHAIN_ID;

  const sideLabel = side === Side.Support ? 'Support' : 'Challenge';
  const lockPeriodStr = lockPeriod != null ? formatLockPeriod(lockPeriod) : '30 days';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-theme-surface border border-theme-border rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-primary text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{sideLabel} this claim</h2>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Not connected */}
          {!isConnected && (
            <div className="text-center space-y-4">
              <p className="text-theme-text-muted">Connect your wallet to continue</p>
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
          {isConnected && isWrongChain && (
            <div className="text-center space-y-4">
              <p className="text-theme-text-muted">Please switch to Base Sepolia</p>
              <button
                onClick={() => switchChain({ chainId: DEFAULT_CHAIN_ID })}
                className="w-full py-3 px-4 bg-gradient-primary hover:opacity-90 rounded-xl text-white font-medium transition-colors"
              >
                Switch Network
              </button>
            </div>
          )}

          {/* Input step */}
          {isConnected && !isWrongChain && step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-text mb-2">
                  Amount (USDC)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-muted">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-3 border border-theme-border bg-theme-bg rounded-xl focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none text-theme-text placeholder-theme-text-muted"
                  />
                </div>
                {balance !== undefined && (
                  <p className="text-sm text-theme-text-muted mt-1">
                    Balance: ${formatUSDC(balance)}
                  </p>
                )}
              </div>

              {/* Warning if insufficient balance */}
              {isValidAmount && !hasBalance(amountBigInt) && (
                <p className="text-sm text-red-500">Insufficient USDC balance</p>
              )}

              {/* Info box */}
              <div className="bg-theme-bg border border-theme-border rounded-lg p-4 text-sm text-theme-text-muted">
                <p>
                  {side === Side.Support
                    ? `By supporting, you signal that you believe this claim. Your capital is committed for ${lockPeriodStr}. Early withdrawal incurs a ${earlyWithdrawPenaltyBps != null ? formatBps(earlyWithdrawPenaltyBps) : '5%'} penalty.`
                    : `By challenging, you signal measured disagreement. Your capital is committed for ${lockPeriodStr}. Early withdrawal incurs a ${earlyWithdrawPenaltyBps != null ? formatBps(earlyWithdrawPenaltyBps) : '5%'} penalty.`}
                </p>
              </div>

              <button
                onClick={handleProceed}
                disabled={!isValidAmount || !hasBalance(amountBigInt)}
                className="w-full py-4 bg-gradient-primary hover:opacity-90 disabled:bg-theme-border disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {/* Comment step */}
          {isConnected && !isWrongChain && step === 'comment' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-text mb-2">
                  {side === Side.Oppose
                    ? 'Why are you challenging this? (required)'
                    : 'Add a comment (optional)'}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    side === Side.Oppose
                      ? 'Explain why you disagree...'
                      : 'Share your thoughts...'
                  }
                  maxLength={500}
                  rows={3}
                  className="w-full px-4 py-3 border border-theme-border bg-theme-bg rounded-xl focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none text-theme-text placeholder-theme-text-muted resize-none text-sm"
                />
                <p className="text-xs text-theme-text-muted mt-1 text-right">
                  {comment.length}/500
                </p>
              </div>

              {/* Summary */}
              <div className="bg-theme-bg border border-theme-border rounded-lg p-3 text-sm text-theme-text-muted">
                <p>
                  {sideLabel}ing with <strong className="text-theme-text">${formatUSDC(amountBigInt)}</strong>
                  {' '}&mdash; locked {lockPeriodStr}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 py-3 bg-theme-surface border border-theme-border hover:bg-theme-border rounded-xl text-theme-text font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCommentProceed}
                  disabled={side === Side.Oppose && !comment.trim()}
                  className="flex-1 py-3 bg-gradient-primary hover:opacity-90 disabled:bg-theme-border disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors"
                >
                  {needsApproval(amountBigInt) ? 'Approve & Commit' : 'Commit'}
                </button>
              </div>
            </div>
          )}

          {/* Approve step */}
          {isConnected && !isWrongChain && step === 'approve' && (
            <div className="text-center space-y-4">
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
                    ? 'Please confirm the approval transaction in your wallet'
                    : isApproveConfirming
                      ? 'Waiting for confirmation...'
                      : approveError?.message || 'Something went wrong'}
                </p>
              </div>

              {approveError && (
                <div className="space-y-3">
                  <p className="text-sm text-red-400 break-words">{approveError.message}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { resetApprove(); setStep('comment'); }}
                      className="flex-1 py-3 bg-theme-surface border border-theme-border hover:bg-theme-border rounded-xl text-theme-text font-medium transition-colors"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={() => { resetApprove(); approve(); }}
                      className="flex-1 py-3 bg-gradient-primary hover:opacity-90 rounded-xl text-white font-medium transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Commit step */}
          {isConnected && !isWrongChain && step === 'commit' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto">
                {isCommitting || isCommitConfirming ? (
                  <div className="w-full h-full border-4 border-theme-border border-t-theme-primary rounded-full animate-spin" />
                ) : commitError ? (
                  <div className="w-full h-full flex items-center justify-center text-red-500">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                ) : (
                  // Waiting for user to initiate commit after approval
                  <div className="w-full h-full flex items-center justify-center text-theme-primary">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              <div>
                <p className="font-medium text-theme-text">
                  {isCommitting
                    ? 'Confirm in wallet...'
                    : isCommitConfirming
                      ? 'Committing...'
                      : commitError
                        ? 'Commit failed'
                        : 'Ready to commit'}
                </p>
                <p className="text-sm text-theme-text-muted mt-1">
                  {isCommitting
                    ? `Please confirm to ${sideLabel.toLowerCase()} with $${formatUSDC(amountBigInt)}`
                    : isCommitConfirming
                      ? 'Waiting for confirmation...'
                      : commitError
                        ? commitError.message || 'Something went wrong'
                        : 'USDC approved. Click below to commit.'}
                </p>
              </div>

              {!isCommitting && !isCommitConfirming && commitError && (
                <div className="space-y-3">
                  <p className="text-sm text-red-400 break-words">{commitError.message}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { resetCommit(); setStep('comment'); }}
                      className="flex-1 py-3 bg-theme-surface border border-theme-border hover:bg-theme-border rounded-xl text-theme-text font-medium transition-colors"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={() => { resetCommit(); handleCommit(); }}
                      className="flex-1 py-3 bg-gradient-primary hover:opacity-90 rounded-xl text-white font-medium transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {!isCommitting && !isCommitConfirming && !commitError && (
                <button
                  onClick={handleCommit}
                  className="w-full py-3 bg-gradient-primary hover:opacity-90 rounded-xl text-white font-medium transition-colors"
                >
                  Commit ${formatUSDC(amountBigInt)}
                </button>
              )}
            </div>
          )}

          {/* Success step */}
          {isConnected && !isWrongChain && step === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto flex items-center justify-center">
                <div className="text-theme-positive">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <div>
                <p className="font-medium text-theme-text">Commitment successful!</p>
                <p className="text-sm text-theme-text-muted mt-1">
                  You {side === Side.Support ? 'supported' : 'challenged'} this claim with ${formatUSDC(amountBigInt)}
                </p>
              </div>

              <p className="text-sm text-theme-text-muted">
                Challenge your friends to weigh in.
              </p>

              {context?.user?.fid ? (
                <>
                  <FriendChallenger
                    viewerFid={context.user.fid}
                    side={side === Side.Support ? 'support' : 'challenge'}
                    amount={formatUSDC(amountBigInt)}
                    postId={postId}
                    castText={castText}
                  />
                  <button
                    onClick={handleDone}
                    className="w-full py-2 text-sm text-theme-text-muted hover:text-theme-text transition-colors"
                  >
                    Done
                  </button>
                </>
              ) : (
                <button
                  onClick={handleDone}
                  className="w-full py-3 bg-gradient-primary hover:opacity-90 rounded-xl text-white font-medium transition-colors"
                >
                  Done
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommitModal;
