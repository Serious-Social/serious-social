"use client";

import Link from "next/link";
import { CONTRACTS, DEFAULT_CHAIN_ID, formatBps, formatLockPeriod } from "~/lib/contracts";
import { useDefaultParams } from "~/hooks/useBeliefMarket";
const chainId = DEFAULT_CHAIN_ID;
const explorerUrl = "https://basescan.org";

export function AboutView() {
  const { data: defaultParams } = useDefaultParams();

  const lockPeriodLabel = defaultParams ? formatLockPeriod(defaultParams.lockPeriod) : "30 days";
  const penaltyLabel = defaultParams ? formatBps(defaultParams.earlyWithdrawPenaltyBps) : "5%";

  return (
    <div className="px-4 py-4 space-y-4 max-w-lg mx-auto bg-white min-h-screen">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Home
      </Link>

      <h1 className="text-xl font-semibold text-gray-900">
        About Belief Markets
      </h1>

      {/* What is this? */}
      <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <h2 className="text-base font-semibold text-gray-900">
          What is this?
        </h2>
        <p className="text-sm text-gray-700">
          Belief Markets are a <strong>belief-coordination primitive</strong>{" "}
          where expressing conviction has a cost, belief strength is legible,
          disagreement is invited but bounded, and money disciplines behavior
          without dominating it.
        </p>
        <p className="text-sm text-gray-700">
          The core idea is{" "}
          <strong>escrowed seriousness</strong> &mdash; capital temporarily
          locked to signal durable belief.
        </p>
      </section>

      {/* How it works */}
      <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <h2 className="text-base font-semibold text-gray-900">
          How it works
        </h2>
        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
          <li>
            <strong>Stake USDC</strong> to support or challenge a claim.
          </li>
          <li>
            Principal is <strong>committed for {lockPeriodLabel}</strong>. You can
            withdraw early with a <strong>{penaltyLabel} penalty</strong> (added to the
            reward pool), or wait for the full period to withdraw penalty-free.
          </li>
          <li>
            Signal is <strong>time-weighted</strong> &mdash; it grows the longer
            your capital stays staked. Flash moves are dampened.
          </li>
          <li>
            The <strong>belief curve</strong> answers: &ldquo;Where has capital
            sat long enough to count?&rdquo; It reflects durable conviction, not
            momentary spikes.
          </li>
        </ul>
      </section>

      {/* Design principles */}
      <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <h2 className="text-base font-semibold text-gray-900">
          Design principles
        </h2>
        <ol className="text-sm text-gray-700 list-decimal pl-5 space-y-2">
          <li>
            <strong>No objective truth resolution</strong> &mdash; Beliefs are
            subjective. Markets never settle to &ldquo;true / false.&rdquo;
          </li>
          <li>
            <strong>Non-zero-sum by default</strong> &mdash; No forced transfer
            of principal. Rewards come from bounded fees, not others&rsquo;
            losses.
          </li>
          <li>
            <strong>Time &gt; Volatility</strong> &mdash; Signal is created by{" "}
            <em>how long</em> capital stays, not how fast it moves.
          </li>
          <li>
            <strong>Bounded adversariality</strong> &mdash; Enough economic
            tension to invite counter-staking, never enough to feel like
            gambling.
          </li>
          <li>
            <strong>Patience is rewarded</strong> &mdash; Early exits incur
            a {penaltyLabel} penalty and forfeit pending rewards. Flash moves are dampened.
          </li>
          <li>
            <strong>Explicit safety rails</strong> &mdash; Caps on rewards, no
            leverage, no liquidation.
          </li>
        </ol>
      </section>

      {/* What this is NOT */}
      <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <h2 className="text-base font-semibold text-gray-900">
          What this is NOT
        </h2>
        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
          <li>Not prediction markets</li>
          <li>Not creator tokens</li>
          <li>Not engagement farming</li>
          <li>Not pay-to-post</li>
          <li>Not a casino</li>
        </ul>
        <p className="text-sm text-gray-700 font-medium">
          This is infrastructure for serious belief coordination.
        </p>
      </section>

      {/* Contracts & Source */}
      <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <h2 className="text-base font-semibold text-gray-900">
          Contracts &amp; Source
        </h2>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>
            <a
              href={`${explorerUrl}/address/${CONTRACTS[chainId].factory}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-800 underline underline-offset-2"
            >
              BeliefMarketFactory
            </a>
            <span className="text-gray-400 text-xs ml-1">(verified)</span>
          </li>
          <li>
            <a
              href={`${explorerUrl}/address/${CONTRACTS[chainId].vault}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-800 underline underline-offset-2"
            >
              BeliefVault
            </a>
            <span className="text-gray-400 text-xs ml-1">(verified)</span>
          </li>
          <li>
            <a
              href="https://github.com/Serious-Social/serious-contracts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-800 underline underline-offset-2"
            >
              Source Code on GitHub
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
