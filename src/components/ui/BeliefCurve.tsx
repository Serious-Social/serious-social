/**
 * BeliefCurve - Visual representation of support vs oppose signal.
 *
 * Design constraints from UX spec:
 * - Muted palette (no green/red)
 * - Minimalist, disclosure-style aesthetic
 * - Never framed as "winning"
 */
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CoinsIcon,
  Clock01Icon,
  BalanceScaleIcon,
} from "@hugeicons/core-free-icons";
import {
  MarketState,
  formatBelief,
  formatUSDC,
  getMarketStatus,
} from "~/lib/contracts";

export interface ProfileInfo {
  fid: number;
  pfpUrl: string;
  username: string;
}

interface BeliefCurveProps {
  state: MarketState | null;
  size?: "compact" | "full";
  section?: "primary" | "secondary" | "all";
  onInfoClick?: () => void;
  beliefChange24h?: number | null;
  participants?: { support: ProfileInfo[]; challenge: ProfileInfo[] };
  earlyWithdrawPenaltyPercent?: string;
}

/** Format seconds into a human-readable duration */
function formatDuration(seconds: number): string {
  if (seconds <= 0) return "--";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "<1m";
}

/** Segmented progress bar component.
 *  - Single color: filled segments use `color`, rest use neutral border.
 *  - Dual color: left segments use `color`, right segments use `secondaryColor`.
 */
export function SegmentedBar({
  percent,
  segments = 20,
  color = "positive",
  secondaryColor,
}: {
  percent: number;
  segments?: number;
  color?: "positive" | "negative";
  secondaryColor?: "positive" | "negative";
}) {
  const filledSegments = Math.round((percent / 100) * segments);
  const fillClass = color === "negative" ? "bg-theme-negative" : "bg-theme-positive";
  const emptyClass = secondaryColor
    ? secondaryColor === "negative" ? "bg-theme-negative" : "bg-theme-positive"
    : "bg-theme-border";
  const isSecondary = (i: number) => secondaryColor && i >= filledSegments;

  return (
    <div className="flex gap-0.5 w-full">
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 transition-colors duration-300 ${
            i < filledSegments ? fillClass : emptyClass
          }`}
          style={isSecondary(i) ? { opacity: 0.3 } : undefined}
        />
      ))}
    </div>
  );
}

/** Compact 3-cell stats row for primary section */
function CompactStats({ state }: { state: MarketState }) {
  const totalPrincipal = state.supportPrincipal + state.opposePrincipal;
  const supportTime =
    state.supportPrincipal > 0n
      ? Number(state.supportWeight / state.supportPrincipal)
      : 0;
  const opposeTime =
    state.opposePrincipal > 0n
      ? Number(state.opposeWeight / state.opposePrincipal)
      : 0;
  const avgHoldTime = Math.round((supportTime + opposeTime) / 2);

  const items = [
    { label: "Committed", value: `$${formatUSDC(totalPrincipal)}` },
    { label: "Pool", value: `$${formatUSDC(state.srpBalance)}` },
    { label: "Avg Hold", value: formatDuration(avgHoldTime) },
  ];

  return (
    <div className="flex gap-[1px] bg-theme-border rounded-lg overflow-hidden">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex-1 bg-theme-surface py-2 px-1 text-center"
        >
          <div className="text-xs font-bold text-theme-text">{item.value}</div>
          <div className="text-[8px] font-semibold text-theme-text-muted uppercase tracking-wide mt-0.5">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BeliefCurve({
  state,
  size = "full",
  section = "all",
  onInfoClick,
  beliefChange24h,
  participants,
  earlyWithdrawPenaltyPercent,
}: BeliefCurveProps) {
  if (!state) {
    return (
      <div className="text-center text-theme-text-muted py-8">
        No market data available
      </div>
    );
  }

  const beliefPercent = formatBelief(state.belief);
  const opposePercent = 100 - beliefPercent;
  const status = getMarketStatus(state);
  const totalPrincipal = state.supportPrincipal + state.opposePrincipal;

  // Capital split percentages
  const capitalSupportPercent =
    totalPrincipal > 0n
      ? Number((state.supportPrincipal * 100n) / totalPrincipal)
      : 50;

  // Time commitment: average seconds per dollar = weight / principal
  const supportTime =
    state.supportPrincipal > 0n
      ? Number(state.supportWeight / state.supportPrincipal)
      : 0;
  const opposeTime =
    state.opposePrincipal > 0n
      ? Number(state.opposeWeight / state.opposePrincipal)
      : 0;
  const totalTime = supportTime + opposeTime;
  const timeSupportPercent =
    totalTime > 0 ? (supportTime / totalTime) * 100 : 50;

  if (size === "compact") {
    return (
      <div className="space-y-2">
        {/* Status badge */}
        <StatusBadge status={status} />

        {/* Segmented bar */}
        <SegmentedBar percent={beliefPercent} segments={20} secondaryColor="negative" />

        {/* Labels */}
        <div className="flex justify-between text-xs text-theme-text-muted">
          <span>Support {beliefPercent.toFixed(0)}%</span>
          <span>Challenge {opposePercent.toFixed(0)}%</span>
        </div>
      </div>
    );
  }

  // PRIMARY section: above-the-fold essentials
  if (section === "primary") {
    return (
      <div className="space-y-3">
        {/* Net Belief Signal bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xl font-bold text-theme-positive">
              {beliefPercent.toFixed(0)}%
            </span>
            {beliefChange24h != null && beliefChange24h !== 0 && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  beliefChange24h > 0
                    ? "text-theme-positive bg-theme-positive/10 border border-theme-positive/25"
                    : "text-theme-negative bg-theme-negative/10 border border-theme-negative/25"
                }`}
              >
                {beliefChange24h > 0 ? "+" : ""}
                {beliefChange24h}% 24h
              </span>
            )}
            <span className="text-xl font-bold text-theme-negative">
              {opposePercent.toFixed(0)}%
            </span>
          </div>
          <div className="flex justify-between text-[10px] text-theme-text-muted uppercase tracking-wide font-medium">
            <span>Support</span>
            <span>Challenge</span>
          </div>
          <SegmentedBar percent={beliefPercent} segments={20} secondaryColor="negative" />
          <p className="text-[9px] text-theme-text-muted/60 text-center tracking-wide">
            weighted by time × capital
          </p>
        </div>

        {/* Participant avatars + count */}
        {participants &&
          (participants.support.length > 0 ||
            participants.challenge.length > 0) && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="flex items-center">
                {participants.support
                  .slice(0, 3)
                  .concat(participants.challenge.slice(0, 1))
                  .map((p, i) => (
                    <img
                      key={p.fid}
                      src={p.pfpUrl}
                      alt={p.username}
                      className="w-6 h-6 rounded-full border-2 border-theme-surface object-cover"
                      style={{ marginLeft: i > 0 ? "-0.35rem" : undefined }}
                    />
                  ))}
              </div>
              <span className="text-xs text-theme-text-muted">
                {participants.support.length + participants.challenge.length}{" "}
                {participants.support.length + participants.challenge.length ===
                1
                  ? "participant"
                  : "participants"}
              </span>
            </div>
          )}

        {/* Compact stats row */}
        {totalPrincipal > 0n && <CompactStats state={state} />}

        {/* "how does this work?" button */}
        {onInfoClick && (
          <button
            onClick={onInfoClick}
            className="w-full flex items-center justify-center gap-1 py-2.5 rounded-lg bg-theme-primary/10 border border-theme-border text-theme-primary text-xs font-semibold transition-colors hover:bg-theme-primary/20"
          >
            how does this work? →
          </button>
        )}

        {/* Unchallenged note */}
        {status === "unchallenged" && (
          <p className="text-sm text-theme-text-muted text-center italic">
            No counter-signal yet
          </p>
        )}
      </div>
    );
  }

  // SECONDARY section: detailed breakdown for Signal tab
  if (section === "secondary") {
    return (
      <div className="space-y-4">
        {/* Capital & Time conviction bars */}
        {totalPrincipal > 0n && (
          <div className="space-y-3">
            {/* Capital distribution */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted mb-2">
                Capital Distribution
              </div>
              {[
                {
                  label: "Capital (Support)",
                  value: `$${formatUSDC(state.supportPrincipal)}`,
                  pct: capitalSupportPercent,
                  color: "positive" as const,
                  secondary: "positive" as const,
                },
                {
                  label: "Capital (Challenge)",
                  value: `$${formatUSDC(state.opposePrincipal)}`,
                  pct: 100 - capitalSupportPercent,
                  color: "negative" as const,
                  secondary: "negative" as const,
                },
              ].map((c) => (
                <div key={c.label} className="mb-2">
                  <div className="flex justify-between text-xs text-theme-text-muted mb-1">
                    <span>{c.label}</span>
                    <span className="font-semibold">{c.value}</span>
                  </div>
                  <SegmentedBar percent={c.pct} segments={20} color={c.color} secondaryColor={c.secondary} />
                </div>
              ))}
            </div>

            {/* Hold time stats - 2 cell row */}
            <div className="flex gap-[1px] bg-theme-border rounded-lg overflow-hidden">
              {[
                {
                  label: "Avg Hold (Support)",
                  value: formatDuration(supportTime),
                },
                {
                  label: "Avg Hold (Challenge)",
                  value: formatDuration(opposeTime),
                },
              ].map((h) => (
                <div
                  key={h.label}
                  className="flex-1 bg-theme-surface py-2 px-2.5"
                >
                  <div className="text-sm font-bold text-theme-text">
                    {h.value}
                  </div>
                  <div className="text-[8px] font-semibold text-theme-text-muted uppercase tracking-wide mt-0.5">
                    {h.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ALL section: existing full rendering (backward compatible)
  return (
    <div className="space-y-4">
      {/* Main belief bar - PRIMARY METRIC (shown first per UX spec) */}
      <div className="space-y-2">
        <span className="text-sm text-theme-text-muted font-medium flex items-center gap-1.5">
          <HugeiconsIcon
            icon={BalanceScaleIcon}
            size={16}
            className="text-theme-primary"
          />
          Net Belief Signal
          {beliefChange24h != null && beliefChange24h !== 0 && (
            <span
              className={`ml-1.5 ${beliefChange24h > 0 ? "text-theme-positive" : "text-theme-negative"}`}
            >
              {beliefChange24h > 0 ? "+" : ""}
              {beliefChange24h}% 24h
            </span>
          )}
        </span>
        {/* Main bar - larger segments */}
        <SegmentedBar percent={beliefPercent} segments={20} secondaryColor="negative" />

        {/* Side labels */}
        <div className="flex justify-between text-sm text-theme-text-muted">
          <span>Support</span>
          <span>Challenge</span>
        </div>

        {/* Participant avatars */}
        {participants &&
          (participants.support.length > 0 ||
            participants.challenge.length > 0) && (
            <div className="flex justify-between items-start">
              <AvatarRow profiles={participants.support} align="left" />
              <AvatarRow profiles={participants.challenge} align="right" />
            </div>
          )}

        {/* How does this work link */}
        {onInfoClick && (
          <div className="text-center">
            <button
              onClick={onInfoClick}
              className="text-sm text-theme-primary hover:text-theme-accent underline underline-offset-2"
            >
              How does this work?
            </button>
          </div>
        )}
      </div>

      {/* Capital & Time conviction bars - SECONDARY (progressive disclosure) */}
      {totalPrincipal > 0n && (
        <div className="space-y-3">
          {/* Capital bar */}
          <div className="space-y-1">
            <span className="text-sm text-theme-text-muted font-medium flex items-center gap-1.5">
              <HugeiconsIcon
                icon={CoinsIcon}
                size={16}
                className="text-theme-primary"
              />
              Capital Conviction
            </span>
            <SegmentedBar percent={capitalSupportPercent} segments={20} secondaryColor="negative" />
          </div>

          {/* Time bar */}
          <div className="space-y-1">
            <span className="text-sm text-theme-text-muted font-medium flex items-center gap-1.5">
              <HugeiconsIcon
                icon={Clock01Icon}
                size={16}
                className="text-theme-primary"
              />
              Time Conviction
            </span>
            <SegmentedBar percent={timeSupportPercent} segments={20} secondaryColor="negative" />
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <StatCard
          label="Avg Support Hold"
          value={formatDuration(supportTime)}
        />
        <StatCard
          label="Avg Challenge Hold"
          value={formatDuration(opposeTime)}
        />
        <StatCard
          label="Support Capital"
          value={`$${formatUSDC(state.supportPrincipal)}`}
          accent
        />
        <StatCard
          label="Challenge Capital"
          value={`$${formatUSDC(state.opposePrincipal)}`}
        />
        <StatCard
          label="Total Committed"
          value={`$${formatUSDC(totalPrincipal)}`}
          accent
        />
        <RewardPoolCard
          value={`$${formatUSDC(state.srpBalance)}`}
          earlyWithdrawPenaltyPercent={earlyWithdrawPenaltyPercent}
        />
      </div>

      {/* Explanatory note for unchallenged state */}
      {status === "unchallenged" && (
        <p className="text-sm text-theme-text-muted text-center italic">
          No counter-signal yet
        </p>
      )}
    </div>
  );
}

export function StatusBadge({
  status,
}: {
  status: "no_market" | "unchallenged" | "contested";
}) {
  const styles = {
    no_market: "bg-theme-surface text-theme-text-muted",
    unchallenged:
      "bg-theme-accent/10 text-theme-accent border border-theme-accent/30 badge-pulse",
    contested: "bg-theme-surface text-theme-text border border-theme-border",
  };

  const labels = {
    no_market: "No Market",
    unchallenged: "Unchallenged",
    contested: "Contested",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-theme-surface border border-theme-border rounded-lg p-3 text-center">
      <div
        className={`text-lg font-semibold ${accent ? "text-theme-primary" : "text-theme-text"}`}
      >
        {value}
      </div>
      <div className="text-xs text-theme-text-muted">{label}</div>
    </div>
  );
}

function RewardPoolCard({
  value,
  earlyWithdrawPenaltyPercent,
}: {
  value: string;
  earlyWithdrawPenaltyPercent?: string;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="bg-theme-surface border border-theme-border rounded-lg p-3 text-center relative">
        <button
          onClick={() => setShowModal(true)}
          className="absolute top-2 right-2 w-5 h-5 rounded-full border border-theme-border text-theme-text-muted hover:text-theme-text hover:border-theme-primary flex items-center justify-center text-xs leading-none transition-colors"
          aria-label="How rewards work"
        >
          ?
        </button>
        <div className="text-lg font-semibold text-theme-primary">{value}</div>
        <div className="text-xs text-theme-text-muted">Reward Pool</div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-theme-surface border border-theme-border rounded-2xl shadow-xl max-w-sm mx-4 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-theme-text">
                How Rewards Work
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-theme-text-muted hover:text-theme-text transition-colors"
                aria-label="Close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="text-sm text-theme-text-muted space-y-2">
              <p>
                The{" "}
                <strong className="text-theme-text">Signal Reward Pool</strong>{" "}
                is a shared pool of USDC that grows over time and is distributed
                to committed participants.
              </p>
              <p>
                <strong className="text-theme-text">
                  Where it comes from:
                </strong>{" "}
                Entry fees are charged when you commit capital to an active
                market. These start small and gradually increase as more capital
                enters. Early withdrawal penalties (
                {earlyWithdrawPenaltyPercent ?? "5%"} of principal) also feed
                the pool.
              </p>
              <p>
                <strong className="text-theme-text">Who earns rewards:</strong>{" "}
                All active participants on both sides earn rewards proportional
                to their dollar-hours &mdash; the amount committed multiplied by
                how long it stays committed. The longer you stay and the more
                you commit, the larger your share.
              </p>
              <p>
                <strong className="text-theme-text">When you can claim:</strong>{" "}
                Rewards begin accruing after a minimum commitment period. You
                can claim accumulated rewards at any time once they start.
                Withdrawing early forfeits any pending rewards.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const MAX_VISIBLE_AVATARS = 5;

function AvatarRow({
  profiles,
  align,
}: {
  profiles: ProfileInfo[];
  align: "left" | "right";
}) {
  if (profiles.length === 0) return <div />;

  const visible = profiles.slice(0, MAX_VISIBLE_AVATARS);
  const overflow = profiles.length - MAX_VISIBLE_AVATARS;

  return (
    <div
      className={`flex items-center ${align === "right" ? "flex-row-reverse" : ""}`}
    >
      {visible.map((p, i) => (
        <img
          key={p.fid}
          src={p.pfpUrl}
          alt={p.username}
          title={p.username}
          className="w-6 h-6 rounded-full border-2 border-theme-surface object-cover"
          style={{
            marginLeft: align === "left" && i > 0 ? "-0.35rem" : undefined,
            marginRight: align === "right" && i > 0 ? "-0.35rem" : undefined,
          }}
        />
      ))}
      {overflow > 0 && (
        <span
          className={`text-xs text-theme-text-muted ${align === "left" ? "ml-1" : "mr-1"}`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

export default BeliefCurve;
