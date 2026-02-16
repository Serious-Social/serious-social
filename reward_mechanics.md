# Reward Mechanics & Incentives

This document describes how rewards work in Belief Markets for each user type: **Creator**, **Supporter**, and **Challenger** (opposer).

---

## Overview

Belief Markets use a **non-zero-sum** economic model. Users are never betting against each other. Instead, all rewards come from a shared **Signal Reward Pool (SRP)**, funded by fees. Both sides of a market (Support and Oppose) earn from the same pool, proportional to how long they have been staked.

The core principle:

> **Patience is rewarded, not speed or cleverness.**

---

## User Types

### Creator

The person who opens a market by attaching it to a post. The creator makes the first stake and chooses a side (Support or Oppose).

### Supporter

Any user who stakes USDC on the **Support** side of a market after creation.

### Challenger

Any user who stakes USDC on the **Oppose** side of a market after creation.

> Note: The creator is also a supporter or challenger depending on which side they chose. The distinction is only in how their initial stake is treated.

---

## Fee Sources (What Funds the SRP)

Three mechanisms feed USDC into the Signal Reward Pool:

### 1. Creator Challenge Premium

When the creator opens a market, a percentage of their initial stake is deducted as a **challenge premium** and deposited into the SRP.

- Default: **10%** of the creator's commitment (`creatorPremiumBps = 1000`)
- Purpose: the creator is putting skin in the game and inviting others to challenge their belief
- The creator's recorded principal is the **net amount** after the premium

**Example:** Creator stakes $100 USDC on Support. $10 goes to the SRP, and $90 is recorded as their principal.

### 2. Late Entry Fee (Sliding Scale)

Every staker after the first pays an entry fee that scales with total principal already in the market.

- **First staker pays no entry fee** (the creator, who pays the premium instead)
- Formula: `feeBps = min(baseFee + totalPrincipal / scale, maxFee)`
- Default base fee: **100 bps (1%)**
- Default max fee: **750 bps (7.5%)**
- Default scale: **$1,000 USDC per additional bps**

This means early participants pay less and later participants pay more, rewarding conviction shown early.

**Example:** With $5,000 already staked, the fee is `min(100 + 5000e6/1000e6, 750) = 105 bps (1.05%)`. A new $50 stake pays ~$0.53 to the SRP.

### 3. Early Withdrawal Penalty

Users who withdraw before their lock period expires forfeit a percentage of their principal to the SRP.

- Default: **15%** of principal (`earlyWithdrawPenaltyBps = 1500`)
- Only collected if remaining stakers exist to receive it
- Early withdrawers also **forfeit all pending rewards**

**Example:** A user withdraws $100 early. $15 goes to the SRP, and they receive $85 back with no rewards.

---

## How Rewards Are Earned

All three user types earn rewards from the SRP using the same mechanism. There is no special treatment — the math is identical for creators, supporters, and challengers.

### Time-Weighted Signal

Each position earns rewards proportional to **how much** was staked and **how long** it has been staked. The weight of a position grows linearly with time:

```
position_weight(t) = amount * (t - depositTimestamp)
```

A $50 stake held for 20 days has the same weight as a $100 stake held for 10 days. This means:

- **Early stakers** accumulate more weight over time, earning a larger share
- **Late stakers** need more time to catch up
- **Flash stakers** earn almost nothing

### Rewards Are Side-Agnostic

Rewards are calculated using only two inputs per position: **stake amount** and **time in the market**. The side a position is on (Support or Oppose) does not appear in the reward formula at all. Both sides draw from the same SRP, and each position's share is its individual time-weighted signal divided by the total weight across both sides combined.

This means a creator who stakes on an unpopular side earns exactly the same rewards as if they had staked on the popular side — what matters is how much they staked and how long they stayed, not whether others agreed or disagreed. The choice of side affects the **belief curve** (which is purely informational) but has no impact on reward distribution.

**Example:** A creator stakes $90 (net) on Support at day 0. Staker B stakes $99 (net) on day 1. At day 10:
- Creator's weight: 90 x 10 = 900
- B's weight: 99 x 9 = 891
- Creator's share of any fee: 900 / 1791 = 50.3%

This is identical whether B chose Support or Oppose.

### Minimum Reward Duration

Positions must wait at least `minRewardDuration` (default: **3 days**) after deposit before any rewards can be claimed. This prevents micro-staking to farm fee events.

---

## Incentive Summary by User Type

### Creator

| Aspect | Detail |
|---|---|
| **Cost** | Pays the creator challenge premium (default 10%) on initial stake |
| **No late entry fee** | The creator is the first staker and pays no entry fee |
| **Side choice** | Chooses Support or Oppose at market creation |
| **Lock period** | Same as all other positions (default 30 days) |
| **Reward earning** | Same time-weighted mechanism as everyone else |
| **Incentive** | Put skin in the game to invite serious engagement; premium funds the reward pool that attracts challengers |

### Supporter

| Aspect | Detail |
|---|---|
| **Cost** | Pays a late entry fee (scales with total principal already staked) |
| **Earning** | Time-weighted share of the SRP, proportional to stake size and duration |
| **Early supporters earn more** | Lower entry fee + more time to accumulate weight |
| **Lock period** | Principal locked for the lock period (default 30 days) |
| **Incentive** | Signal durable belief in the claim; earn rewards for providing sustained signal |

### Challenger

| Aspect | Detail |
|---|---|
| **Cost** | Same late entry fee as supporters |
| **Earning** | Same time-weighted share of the SRP — challengers draw from the same pool |
| **Strategic value** | Counter-staking provides resistance, prevents unchecked drift, improves epistemic clarity |
| **Lock period** | Same as supporters (default 30 days) |
| **Incentive** | Express genuine disagreement with economic backing; earn for staying, not for "winning" |

---

## Withdrawal Scenarios

### Normal Withdrawal (after lock period)

1. Full principal returned
2. Pending SRP rewards auto-claimed in the same transaction
3. Position's weight removed from the pool (shifts the belief curve)

### Early Withdrawal (before lock period)

1. Early withdrawal penalty deducted from principal (default 15%)
2. Penalty routed to SRP (only if remaining stakers exist)
3. **All pending rewards forfeited**
4. Remaining principal returned

Early withdrawal is always allowed — users are never trapped — but it is costly by design. It penalizes impatience while keeping the door open.

---

## Key Properties

- **Side-agnostic rewards**: The side of a position (Support or Oppose) has no effect on earnings. Only stake size and duration matter.
- **Non-zero-sum**: No forced transfer of principal between sides. Rewards come from fees, not others' losses.
- **No resolution**: Markets never settle to "true" or "false." Belief is subjective and ongoing.
- **No leverage, no liquidation**: Safety rails prevent degenerate behavior.
- **Bounded stakes**: Minimum $5, maximum $1,000 per position (defaults).
- **Silence is not loss**: Holding a position costs nothing beyond the initial fee and opportunity cost.

---

## Configurable Parameters

| Parameter | Default | Description |
|---|---|---|
| `lockPeriod` | 30 days | How long principal is locked |
| `minRewardDuration` | 3 days | Wait time before rewards are claimable |
| `lateEntryFeeBaseBps` | 100 (1%) | Base entry fee for non-first stakers |
| `lateEntryFeeMaxBps` | 750 (7.5%) | Maximum entry fee cap |
| `lateEntryFeeScale` | $1,000 USDC | Principal per additional bps of fee |
| `creatorPremiumBps` | 1000 (10%) | Premium deducted from creator's initial stake |
| `earlyWithdrawPenaltyBps` | 1500 (15%) | Penalty for withdrawing before lock expires |
| `minStake` | $5 USDC | Minimum stake per position |
| `maxStake` | $1,000 USDC | Maximum stake per position |
