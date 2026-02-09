# Serious Social — UX & Interaction Specification (v1)

## Purpose

Define how **Belief Markets** surface to users on Farcaster in a way that:
- Feels native to existing social norms
- Preserves seriousness and intent
- Minimizes cognitive overload
- Encourages *meaningful* interaction, not dopamine farming

This spec covers the **Farcaster Mini-App UX** — entry points, navigation, interaction flows, and visual design.

---

## Core UX Principles

1. **Read First, Act Second**
   - Users must understand *what is being claimed* before committing capital.
   - No "one-tap staking" from the feed.

2. **Signal Over Engagement**
   - Belief signal should be legible even with low participation.
   - Silence is information, not failure.

3. **Farcaster-Native**
   - Embeds are entry points, not destinations.
   - The mini-app is for deliberate interaction, not browsing.

4. **Non-Gamified Financiality**
   - No green/red flashing
   - No "winning," "losing," or gambling language
   - Capital = seriousness, not speculation

---

## User Roles

- **Author** — publishes a cast and commits capital to stand behind it.
- **Reader** — encounters a market embed in-feed.
- **Supporter** — stakes capital to endorse the claim.
- **Challenger** — stakes capital to challenge the claim.

---

## Entry Points

### Farcaster Mini-App Embed

Serious Social is a **Farcaster Mini-App** (v1). Users encounter it as an embed attached to a cast.

#### Default App Embed

When `serious-social.vercel.app` is shared directly, the embed displays:

- **OG Image** (1200x800, 3:2 ratio):
  - Dark purple background (`#110e1c`) with subtle grid texture overlay
  - `SERIOUS.SOCIAL` header in purple (`#a78bfa`), top-left, letter-spaced
  - App name ("Serious Social") centered in large white text
  - Tagline ("A seriousness layer for decentralized social") in muted text
  - Bottom separator with "Signal conviction with capital and time"
- **CTA Button**: "Are you serious?"

#### Market-Specific Embed

When a market link (`/market/[postId]`) is shared, the embed displays:

- **OG Image** (1200x800, 3:2 ratio):
  - Same dark purple background with grid texture
  - `SERIOUS.SOCIAL` header, top-left
  - Market status badge, top-right:
    - **Unchallenged**: accent-colored border, "UNCHALLENGED" label
    - **Contested**: muted border, "{X}% SUPPORT" label
  - Claim text (truncated to 140 chars) in the center
  - Bottom stats row (border-top separator):
    - Total staked (formatted USDC)
    - Participant count ("BELIEVERS")
    - Support/challenge split bar (contested markets only)
    - 100% SUPPORT (unchallenged markets)
  - Fallback state: "Market pending confirmation" if not yet deployed on-chain
- **CTA Button**: "Support or Challenge"

---

## App Navigation

### Home Page (`/`)

- **Header**: "Serious Social" + user profile avatar (tappable — shows FID & Neynar score)
- **Content**:
  - "For You" tab: personalized markets based on user's FID
  - "Recent Markets": last 10 created markets
- **Market Cards**: claim text, author (pfp + @username + timestamp), belief % + conviction bar, "Unchallenged" badge if applicable
- **Floating Action Buttons**:
  - Bottom-left: `?` — navigates to About page
  - Bottom-right: `+` — navigates to Create Market page

### About Page (`/about`)

Educational page explaining Belief Markets:

- Core concept: **"Escrowed seriousness"** — capital temporarily locked to signal durable belief
- Design principles: no objective truth resolution, non-zero-sum, time > volatility, bounded adversariality, patience rewarded
- **What this is NOT**: prediction markets, creator tokens, engagement farming, pay-to-post, casino
- Contract addresses & GitHub source links

### Create Market Flow (`/create`)

Multi-step flow: **Select → Commit → Approve → Create → Success**

1. **Select step**:
   - "Challenge any cast" — paste a Warpcast URL or cast hash to look up
   - "Or pick one of your casts" — paginated list of user's own casts (infinite scroll)
   - Each cast shows: text, author, timestamp, likes, reply count
   - Tapping a cast advances to the Commit step

2. **Commit step**:
   - Selected cast displayed
   - **Side picker** (Support / Challenge) — only shown for other people's casts; creating a market on your own cast defaults to Support
   - Amount input (USDC), validated against min/max ($5–$100 default)
   - Info box: lock period (30 days), early withdrawal penalty (5%), creator premium (2%), others can support or challenge
   - "Approve & Create Market" button (if USDC approval needed) or "Create Market"

3. **Approve step**: wallet confirmation spinner

4. **Create step**: wallet confirmation spinner

5. **Success step**:
   - Checkmark icon
   - Commitment summary ($X, side, cast text)
   - "Share on Farcaster" button (pre-fills cast about the action)
   - "View Market" button

### Market View (`/market/[postId]`)

- **Header**: back link to home
- **Claim section**: cast text + author info
- **Belief Signal section**:
  - Primary: **Net Belief Signal** — 20-segment bar (0–100%), labeled "Support ← → Challenge"
  - 24h change indicator (e.g., "+5% 24h")
  - Participant avatars (max 5 + overflow count)
  - "How does this work?" — collapsible rules section
- **Secondary conviction bars** (progressive disclosure):
  - Capital Conviction: support vs challenge split of principal
  - Time Conviction: support vs challenge split of time-weighted holds
- **Stats grid** (2x3):
  - Avg Support Hold, Avg Challenge Hold
  - Support Capital, Challenge Capital
  - Total Committed, Reward Pool (with `?` info modal)
- **Friends in this market**: up to 5 friends with their stance (Supporting/Challenging)
- **User's Positions** (if staked):
  - Per position: side label + amount, unlock date, pending rewards, action buttons (Withdraw / Claim Rewards)
  - Early withdrawal warning if still locked (shows penalty %)
- **Activity Feed**: recent commits (up to 15 items) showing who supported/challenged and when
- **Share button**: "Share this market" (secondary style)
- **Sticky bottom action bar**:
  - "Support" button (muted surface style)
  - "Challenge" button (gradient primary style)

---

## Commit Flow (CommitModal)

Triggered from the Market View's sticky bottom bar (Support or Challenge).

### Steps

1. **Input step**:
   - Amount input (USDC) with balance display
   - Info box: explains side choice, lock period, early withdrawal penalty
   - "Approve & Commit" or "Commit" button (depending on existing allowance)
   - Disabled if insufficient balance or zero amount

2. **Approve step** (if needed):
   - Spinner: "Confirm in wallet..." → "Approving USDC..." → error state with "Try Again"

3. **Commit step**:
   - Spinner: "Confirm in wallet..." → "Committing..." → "Ready to commit"
   - "Commit $X" button

4. **Success step**:
   - Green checkmark
   - "Commitment successful!" + amount & side recap
   - "Challenge your friends to weigh in." — friend invitation component
   - "Skip" or "Done" button

### Wallet Edge Cases

- **Not connected**: show wallet connector list
- **Wrong chain** (not Base Sepolia): show "Switch Network" button

---

## Market States & Visual Indicators

### Market State

On-chain state includes:
- `belief` — net belief signal (0–100%)
- `supportWeight` / `opposeWeight` — time-weighted capital
- `supportPrincipal` / `opposePrincipal` — raw capital committed
- `srpBalance` — signal reward pool balance

### Status States

| State | Condition | Badge | Visual Treatment |
|-------|-----------|-------|-----------------|
| **Unchallenged** | opposePrincipal = 0, supportPrincipal > 0 | Accent-colored, pulsing border | 100% filled bar, "No counter-signal yet" |
| **Contested** | Both sides have capital | Muted border | Belief % displayed, split bars visible |
| **No Market** | Market not yet deployed | Muted | "Market pending confirmation" |

### Belief Signal Visualization

- **Primary**: 20-segment bar, filled segments = support %, empty = challenge %
- **Colors**: filled = theme-positive (purple `#a78bfa`), empty = theme-border (muted)
- **Animation**: smooth transition between states
- Unchallenged markets show full bar + explanatory text instead of split breakdown

---

## Visual Design

### Color Theme

| Token | Hex | Usage |
|-------|-----|-------|
| `theme-bg` | `#0c0a15` | Page background |
| `theme-surface` | `#1a1625` | Cards, panels |
| `theme-border` | `#2d2640` | Borders, dividers |
| `theme-text` | `#f5f3ff` | Primary text |
| `theme-text-muted` | `#a1a1aa` | Secondary text |
| `theme-primary` | `#a78bfa` | Purple accent, CTAs |
| `theme-positive` | `#a78bfa` | Support indicators |
| `theme-negative` | `#fb923c` | Challenge indicators (orange) |
| `theme-accent` | `#c4b5fd` | Unchallenged badges |

### OG Image Theme (Embed)

Same palette applied to server-rendered OG images:
- Background: `#110e1c` (slightly lighter than page bg)
- Grid texture: `#2d264040` lines at 40px intervals, 30% opacity
- Typography: system-ui, weight 700 for headers

### Design Constraints

- Muted palette — no green/red for gain/loss
- Dark, minimalist aesthetic
- Mobile-first (full-screen modals, sticky bottom bars, safe area insets)
- Optimized for 3–5 seconds of attention in-feed

---

## What This Is NOT

- A prediction market
- A debate platform
- A casino
- A social engagement farm

This is a **seriousness layer** on top of social writing.

---

## Scope Summary

### Implemented (v0)

- Farcaster Mini-App with dynamic OG embeds
- Home page with personalized + recent market feeds
- Market creation (own casts or any cast by URL/hash)
- Support / Challenge commit flows with USDC
- Market view with belief signal, conviction bars, stats, activity feed
- Unchallenged / Contested state visualization
- Withdraw & Claim Rewards flows
- Friend tracking (friends in market, friend invitations post-commit)
- Share to Farcaster (composer integration)
- Educational About page

### Planned (v1+)

- SRS reputation token system (on-chain, 18-decimal token)
- Leaderboard / Conviction tab on home page
- Market resolution logic
- Belief badges (non-transferable, context-specific)
- Cross-post aggregation

---

## Design North Star

> A user should be able to glance at a post and immediately answer:
>
> **"Is anyone willing to stand behind this with time and capital?"**

If the UI does not answer that question clearly, it has failed.
