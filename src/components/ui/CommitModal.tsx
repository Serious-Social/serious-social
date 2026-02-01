'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useSwitchChain } from 'wagmi';
import { useCommitFlow } from '~/hooks/useBeliefMarketWrite';
import { Side, formatUSDC, parseUSDC, DEFAULT_CHAIN_ID, CONTRACTS } from '~/lib/contracts';

interface CommitModalProps {
  isOpen: boolean;
  onClose: () => void;
  side: Side;
  marketAddress: `0x${string}`;
  postId: string;
  onSuccess?: () => void;
}

type Step = 'input' | 'approve' | 'commit' | 'success';

export function CommitModal({ isOpen, onClose, side, marketAddress, postId, onSuccess }: CommitModalProps) {
  const { isConnected, chain, address } = useAccount();
  const { connectors, connect } = useConnect();
  const { switchChain } = useSwitchChain();

  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('input');

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

  // Handle commit success -> move to success step and send notification
  useEffect(() => {
    if (isCommitSuccess && step === 'commit') {
      setStep('success');

      // Send notification to claim author (fire and forget)
      const notifyType = side === Side.Support ? 'support' : 'challenge';
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: notifyType,
          postId,
          amount: formatUSDC(amountBigInt),
        }),
      }).catch((err) => console.error('Failed to send notification:', err));
    }
  }, [isCommitSuccess, step, side, postId, amountBigInt]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setStep('input');
      resetApprove();
      resetCommit();
    }
  }, [isOpen, resetApprove, resetCommit]);

  if (!isOpen) return null;

  const handleProceed = () => {
    if (!isValidAmount) return;

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

  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  const isWrongChain = chain?.id !== DEFAULT_CHAIN_ID;

  const sideLabel = side === Side.Support ? 'Support' : 'Challenge';
  const sideColor = side === Side.Support ? 'slate-700' : 'slate-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 bg-${sideColor} text-white`}>
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
              <p className="text-gray-600">Connect your wallet to continue</p>
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
          {isConnected && isWrongChain && (
            <div className="text-center space-y-4">
              <p className="text-gray-600">Please switch to Base Sepolia</p>
              <button
                onClick={() => switchChain({ chainId: DEFAULT_CHAIN_ID })}
                className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-800 rounded-xl text-white font-medium transition-colors"
              >
                Switch Network
              </button>
            </div>
          )}

          {/* Input step */}
          {isConnected && !isWrongChain && step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (USDC)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                  />
                </div>
                {balance !== undefined && (
                  <p className="text-sm text-gray-500 mt-1">
                    Balance: ${formatUSDC(balance)}
                  </p>
                )}
              </div>

              {/* Warning if insufficient balance */}
              {isValidAmount && !hasBalance(amountBigInt) && (
                <p className="text-sm text-red-600">Insufficient USDC balance</p>
              )}

              {/* Info box */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                <p>
                  {side === Side.Support
                    ? 'By supporting, you signal that you believe this claim. Your capital is committed for 30 days. Early withdrawal incurs a 5% penalty.'
                    : 'By challenging, you signal measured disagreement. Your capital is committed for 30 days. Early withdrawal incurs a 5% penalty.'}
                </p>
              </div>

              <button
                onClick={handleProceed}
                disabled={!isValidAmount || !hasBalance(amountBigInt)}
                className="w-full py-4 bg-slate-700 hover:bg-slate-800 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors"
              >
                {needsApproval(amountBigInt) ? 'Approve & Commit' : 'Commit'}
              </button>
            </div>
          )}

          {/* Approve step */}
          {isConnected && !isWrongChain && step === 'approve' && (
            <div className="text-center space-y-4">
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
                    ? 'Please confirm the approval transaction in your wallet'
                    : isApproveConfirming
                      ? 'Waiting for confirmation...'
                      : approveError?.message || 'Something went wrong'}
                </p>
              </div>

              {approveError && (
                <button
                  onClick={() => {
                    resetApprove();
                    approve();
                  }}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-800 rounded-xl text-white font-medium transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          )}

          {/* Commit step */}
          {isConnected && !isWrongChain && step === 'commit' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto">
                {isCommitting || isCommitConfirming ? (
                  <div className="w-full h-full border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
                ) : commitError ? (
                  <div className="w-full h-full flex items-center justify-center text-red-500">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                ) : (
                  // Waiting for user to initiate commit after approval
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              <div>
                <p className="font-medium text-gray-900">
                  {isCommitting
                    ? 'Confirm in wallet...'
                    : isCommitConfirming
                      ? 'Committing...'
                      : commitError
                        ? 'Commit failed'
                        : 'Ready to commit'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {isCommitting
                    ? `Please confirm to ${sideLabel.toLowerCase()} with $${formatUSDC(amountBigInt)}`
                    : isCommitConfirming
                      ? 'Waiting for confirmation...'
                      : commitError
                        ? commitError.message || 'Something went wrong'
                        : 'USDC approved. Click below to commit.'}
                </p>
              </div>

              {!isCommitting && !isCommitConfirming && (
                <button
                  onClick={commitError ? () => { resetCommit(); handleCommit(); } : handleCommit}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-800 rounded-xl text-white font-medium transition-colors"
                >
                  {commitError ? 'Try Again' : `Commit $${formatUSDC(amountBigInt)}`}
                </button>
              )}
            </div>
          )}

          {/* Success step */}
          {isConnected && !isWrongChain && step === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto flex items-center justify-center text-green-500">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <p className="font-medium text-gray-900">Commitment successful!</p>
                <p className="text-sm text-gray-500 mt-1">
                  You {side === Side.Support ? 'supported' : 'challenged'} this claim with ${formatUSDC(amountBigInt)}
                </p>
              </div>

              <button
                onClick={handleSuccess}
                className="w-full py-3 bg-slate-700 hover:bg-slate-800 rounded-xl text-white font-medium transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommitModal;
