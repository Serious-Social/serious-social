/**
 * BeliefCurve - Visual representation of support vs oppose signal.
 *
 * Design constraints from UX spec:
 * - Muted palette (no green/red)
 * - Minimalist, disclosure-style aesthetic
 * - Never framed as "winning"
 */
import { useState } from 'react';
import { MarketState, formatBelief, formatUSDC, getMarketStatus } from '~/lib/contracts';

interface BeliefCurveProps {
  state: MarketState | null;
  size?: 'compact' | 'full';
  onInfoClick?: () => void;
}

/** Format micro-USDC·s weight to abbreviated USDC·s (K/M/B) */
function formatWeight(weight: bigint): string {
  const value = Number(weight) / 1e6;
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(1);
}

export function BeliefCurve({ state, size = 'full', onInfoClick }: BeliefCurveProps) {
  if (!state) {
    return (
      <div className="text-center text-gray-500 py-8">
        No market data available
      </div>
    );
  }

  const beliefPercent = formatBelief(state.belief);
  const opposePercent = 100 - beliefPercent;
  const status = getMarketStatus(state);
  const totalPrincipal = state.supportPrincipal + state.opposePrincipal;

  // Capital split percentages
  const capitalSupportPercent = totalPrincipal > 0n
    ? Number((state.supportPrincipal * 100n) / totalPrincipal)
    : 50;

  // Time commitment: average seconds per dollar = weight / principal
  const supportTime = state.supportPrincipal > 0n
    ? Number(state.supportWeight / state.supportPrincipal)
    : 0;
  const opposeTime = state.opposePrincipal > 0n
    ? Number(state.opposeWeight / state.opposePrincipal)
    : 0;
  const totalTime = supportTime + opposeTime;
  const timeSupportPercent = totalTime > 0 ? (supportTime / totalTime) * 100 : 50;

  if (size === 'compact') {
    return (
      <div className="space-y-2">
        {/* Status badge */}
        <StatusBadge status={status} />

        {/* Simple bar */}
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden flex">
          <div
            className="bg-slate-600 transition-all duration-500"
            style={{ width: `${beliefPercent}%` }}
          />
          <div
            className="bg-slate-300 transition-all duration-500"
            style={{ width: `${opposePercent}%` }}
          />
        </div>

        {/* Labels */}
        <div className="flex justify-between text-xs text-gray-600">
          <span>Support {beliefPercent.toFixed(0)}%</span>
          <span>Challenge {opposePercent.toFixed(0)}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status badge (only for unchallenged markets) */}
      {status === 'unchallenged' && (
        <div className="flex justify-center">
          <StatusBadge status={status} />
        </div>
      )}

      {/* Capital & Time bars */}
      {totalPrincipal > 0n && (
        <div className="space-y-1.5">
          {/* Capital bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-4 text-center font-medium">$</span>
            <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden flex">
              <div
                className="bg-slate-600 transition-all duration-500"
                style={{ width: `${capitalSupportPercent}%` }}
              />
              <div
                className="bg-slate-300 transition-all duration-500"
                style={{ width: `${100 - capitalSupportPercent}%` }}
              />
            </div>
          </div>

          {/* Time bar */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden flex">
              <div
                className="bg-slate-600 transition-all duration-500"
                style={{ width: `${timeSupportPercent}%` }}
              />
              <div
                className="bg-slate-300 transition-all duration-500"
                style={{ width: `${100 - timeSupportPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main belief bar */}
      <div className="space-y-2">
        <div className="h-6 bg-gray-200 rounded-lg overflow-hidden flex">
          <div
            className="bg-slate-600 transition-all duration-500 flex items-center justify-end pr-2"
            style={{ width: `${Math.max(beliefPercent, 10)}%` }}
          >
            {beliefPercent >= 20 && (
              <span className="text-white text-sm font-medium">{beliefPercent.toFixed(0)}%</span>
            )}
          </div>
          <div
            className="bg-slate-300 transition-all duration-500 flex items-center justify-start pl-2"
            style={{ width: `${Math.max(opposePercent, 10)}%` }}
          >
            {opposePercent >= 20 && (
              <span className="text-slate-700 text-sm font-medium">{opposePercent.toFixed(0)}%</span>
            )}
          </div>
        </div>

        {/* Side labels */}
        <div className="flex justify-between text-sm text-gray-600">
          <span>Support</span>
          <span>Challenge</span>
        </div>

        {/* How does this work link */}
        {onInfoClick && (
          <div className="text-center">
            <button
              onClick={onInfoClick}
              className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
            >
              How does this work?
            </button>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <StatCard
          label="Support Signal"
          value={formatWeight(state.supportWeight)}
        />
        <StatCard
          label="Challenge Signal"
          value={formatWeight(state.opposeWeight)}
        />
        <StatCard
          label="Support Capital"
          value={`$${formatUSDC(state.supportPrincipal)}`}
        />
        <StatCard
          label="Challenge Capital"
          value={`$${formatUSDC(state.opposePrincipal)}`}
        />
        <StatCard
          label="Total Committed"
          value={`$${formatUSDC(totalPrincipal)}`}
        />
        <RewardPoolCard value={`$${formatUSDC(state.srpBalance)}`} />
      </div>

      {/* Explanatory note for unchallenged state */}
      {status === 'unchallenged' && (
        <p className="text-sm text-gray-500 text-center italic">
          No counter-signal yet
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: 'no_market' | 'unchallenged' | 'contested' }) {
  const styles = {
    no_market: 'bg-gray-100 text-gray-600',
    unchallenged: 'bg-amber-50 text-amber-700 border border-amber-200',
    contested: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  const labels = {
    no_market: 'No Market',
    unchallenged: 'Unchallenged',
    contested: 'Contested',
  };

  return (
    <span className={`px-4 py-1.5 rounded-full text-base font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-lg font-semibold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function RewardPoolCard({ value }: { value: string }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="bg-gray-50 rounded-lg p-3 text-center relative">
        <button
          onClick={() => setShowModal(true)}
          className="absolute top-2 right-2 w-5 h-5 rounded-full border border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 flex items-center justify-center text-xs leading-none transition-colors"
          aria-label="How rewards work"
        >
          ?
        </button>
        <div className="text-lg font-semibold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500">Reward Pool</div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm mx-4 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">How Rewards Work</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                The <strong>Signal Reward Pool</strong> is a shared pool of USDC that grows over time and is distributed to committed participants.
              </p>
              <p>
                <strong>Where it comes from:</strong> Entry fees are charged when you commit capital to an active market. These start small and gradually increase as more capital enters. Early withdrawal penalties (5% of principal) also feed the pool.
              </p>
              <p>
                <strong>Who earns rewards:</strong> All active participants on both sides earn rewards proportional to their dollar-hours &mdash; the amount committed multiplied by how long it stays committed. The longer you stay and the more you commit, the larger your share.
              </p>
              <p>
                <strong>When you can claim:</strong> Rewards begin accruing after a minimum commitment period. You can claim accumulated rewards at any time once they start. Withdrawing early forfeits any pending rewards.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BeliefCurve;
