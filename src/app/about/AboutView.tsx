"use client";

import Link from "next/link";

export function AboutView() {
  return (
    <div className="px-4 py-4 space-y-4 max-w-lg mx-auto bg-white min-h-screen">
      <Link
        href="/"
        className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
      >
        &larr; Back
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
            Principal is <strong>locked for 30 days</strong>. After the lock
            period, it becomes withdrawable.
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
            <strong>Patience is rewarded</strong> &mdash; Early exits earn
            little. Flash moves are dampened.
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
    </div>
  );
}
