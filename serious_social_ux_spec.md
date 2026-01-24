# Serious Social — UX & Interaction Specification (v0)

## Purpose

Define how **Belief Markets** surface to users on Farcaster in a way that:
- Feels native to existing social norms
- Preserves seriousness and intent
- Minimizes cognitive overload
- Encourages *meaningful* interaction, not dopamine farming

This spec focuses on **Frames + Mini-App UX**, not protocol mechanics.

---

## Core UX Principles

1. **Read First, Act Second**
   - Users must understand *what is being claimed* before committing capital.
   - No “one-tap staking” from the feed.

2. **Signal Over Engagement**
   - Belief signal should be legible even with low participation.
   - Silence is information, not failure.

3. **Farcaster-Native**
   - Frames are entry points, not destinations.
   - Mini-apps are for deliberate interaction, not browsing.

4. **Non-Gamified Financiality**
   - No green/red flashing
   - No “winning,” “losing,” or gambling language
   - Capital = seriousness, not speculation

---

## User Roles

- **Author** — publishes a post and commits capital to stand behind it.
- **Reader** — consumes content in-feed.
- **Support-Staker** — stakes capital to endorse the claim.
- **Counter-Staker** — stakes capital to challenge the claim.

---

## Primary User Flow (Reader → Participant)

### 1. In-Feed Discovery (Frame)

When scrolling, a reader encounters a cast containing:
- Long-form or medium-form post text (native cast text)
- An attached **Serious Social Frame**

#### Frame Contents (OG Image)

The OG image must be **dynamically rendered** on each load and display:

**Required Elements**
- Post title or short descriptor
- Current belief curve (simplified sparkline or bar)
- Capital committed (aggregate)
- Time-weighted context (e.g. “avg commitment: 34 days”)
- Market status badge (see below)

**Market Status States**
- 🟡 **Unchallenged** — zero counter-stake
- ⚪ **Contested** — both sides have capital
- ⚫ **Resolved** — market closed / expired (future)

**Design Constraints**
- Muted palette (no green/red)
- Minimalist, disclosure-style aesthetic
- Optimized for ~3–5 seconds of attention

---

### 2. Frame Actions

The Frame exposes **exactly two buttons**:

- **Support**
- **Challenge**

Rules:
- Buttons **do not** commit capital directly
- Buttons open the mini-app in a *contextual mode*

---

## Mini-App UX

### Entry Modes

The mini-app opens in one of three modes:

1. **Read-Only** (default)
2. **Support Flow**
3. **Challenge Flow**

The app must always retain awareness of:
- Post ID
- Entry intent (support / challenge)
- Current belief state

---

### 3. Read-Only View (Default)

This view is shown:
- When users open the app directly
- Before any financial interaction

**Required Components**
- Full post content (or canonical summary)
- Author identity
- Current belief curve (larger, clearer)
- Capital distribution
- Rules & disclaimers (collapsible)

**Primary CTA**
- “Support this claim”
- “Challenge this claim”

---

### 4. Support Flow

Triggered via:
- Frame → Support
- Mini-app → Support CTA

**Flow**
1. Re-display claim summary
2. Show current support-side belief curve
3. Stake input (USDC)
4. Duration selector (optional in v0)
5. Confirmation modal

**UX Notes**
- Emphasize *endorsement*, not profit
- Show how stake contributes to belief curve
- No projected ROI emphasized

---

### 5. Challenge Flow

Triggered via:
- Frame → Challenge
- Mini-app → Challenge CTA

**Flow**
1. Re-display claim summary
2. Show current counter-belief curve
3. Explain *why counter-staking matters*
4. Stake input (USDC)
5. Confirmation modal

**UX Notes**
- Language should frame challenge as “measured disagreement”
- Avoid adversarial or combative tone
- Emphasize responsibility of counter-signal

---

## Visual Belief Indicators

### Belief Curve

- Always time-weighted
- Always symmetric (support vs oppose)
- Never framed as “winning”

Displayed in:
- Frame OG image (compressed)
- Mini-app header (expanded)

---

### “Silence Is Consent” Marker

If **zero counter-stake exists**:
- Market is labeled **Unchallenged**
- Visual treatment:
  - Soft highlight
  - Neutral badge
  - Subtle prompt (“No counter-signal yet”)

Purpose:
- Create social itch without shame
- Encourage participation without coercion

---

## Belief Badges (Optional / v1)

**Concept**
- Non-transferable NFTs or badges reflecting *position*, not profit.

Examples:
- “Top 5% Conviction — Post #123”
- “Early Challenger — Post #456”

**Constraints**
- Badges must be:
  - Non-speculative
  - Non-tradable
  - Context-specific
- Never displayed as status symbols outside context

---

## What This Is NOT

- ❌ A prediction market
- ❌ A debate platform
- ❌ A casino
- ❌ A social engagement farm

This is a **seriousness layer** on top of social writing.

---

## v0 Scope Summary

**Included**
- Frames with dynamic OG images
- Support / Challenge branching
- Mini-app commit flows
- Unchallenged state
- Time-weighted belief visualization

**Explicitly Deferred**
- Badges / NFTs
- Market resolution logic
- Reputation scoring
- Cross-post aggregation

---

## Design North Star

> A user should be able to glance at a post and immediately answer:
>
> **“Is anyone willing to stand behind this with time and capital?”**

If the UI does not answer that question clearly, it has failed.

