# Serious Social — Mini‑App Implementation Plan (Neynar Stack)

This document outlines a concrete, step‑by‑step plan for implementing the **Serious Social** Farcaster mini‑app and Frames using the **Neynar stack**.

It is intended to be provided to an implementation agent (e.g. Claude Code) alongside:
- `belief_markets_spec.md` (protocol / contracts)
- `serious_social_ux_spec.md` (UX & interaction)

---

## Goals

- Ship a Farcaster‑native mini‑app that surfaces belief markets *in‑feed*
- Render dynamic belief‑curve OG images
- Use Neynar for Farcaster data, auth, and frame validation
- Keep onchain logic authoritative; Neynar is infrastructure, not source of truth

---

## High‑Level Architecture

```
Farcaster Feed
   ↓
Frame (dynamic OG image + buttons)
   ↓
Mini‑App (read → support/challenge → commit)
   ↓
Belief Market Contracts (Base)
```

Key separation:
- **Frames** = discovery + entry
- **Mini‑App** = deliberate interaction
- **Contracts** = truth
- **Neynar** = social identity + verification

---

## What Neynar Is Used For

Neynar provides:
- Farcaster data APIs (casts, users, context)
- Frame action validation (who clicked what)
- Mini‑app authentication (Sign In With Neynar)
- Optional casting on user’s behalf

Neynar is **not**:
- the belief market indexer
- the economic source of truth

---

## Recommended Build Order (v0)

Build in this order to minimize blockers and auth friction:

1. **Frame + Dynamic OG Image (Read‑Only)**
2. **Mini‑App Read‑Only View**
3. **Onchain Commit Flow (Wallet Tx)**
4. **Frame Buttons → Mini‑App Deep Links**
5. **Neynar Auth (SIWN) + Optional Cast Sharing**

---

## Step‑by‑Step Plan

### Step 1 — Bootstrap Mini‑App (Neynar Starter)

- Start from Neynar’s Farcaster mini‑app starter kit
- Ensure app runs both:
  - inside Farcaster clients
  - in a normal browser (for debugging)

Deliverable:
- Deployed mini‑app shell with Neynar config

---

### Step 2 — Dynamic OG Image Endpoint

This is the core discovery surface.

Create a server route that:
- Accepts `postId`
- Fetches belief market state (onchain or indexed)
- Renders a **dynamic OG image** showing:
  - belief curve (simplified)
  - total committed capital
  - avg commitment duration
  - market status (Unchallenged / Contested)

Notes:
- Image must re‑render on every load
- Cache aggressively (belief state can be cached briefly)

Suggested route:
```
GET /api/og/:postId
```

---

### Step 3 — Frame Metadata Endpoint

Create a Frame endpoint that:
- References the OG image URL
- Defines two buttons:
  - Support
  - Challenge

Buttons should:
- Trigger frame actions
- Never commit capital directly

Suggested route:
```
GET /api/frame/:postId
```

---

### Step 4 — Frame Action Handling (Neynar Validation)

When a user clicks a frame button:

- Validate the action using Neynar’s frame validation
- Extract:
  - FID
  - verified addresses (if needed)
  - button intent (support / challenge)

Then:
- Redirect or open the mini‑app with context:

Example:
```
/app/:postId?intent=support
/app/:postId?intent=challenge
```

Suggested route:
```
POST /api/frame/action
```

---

### Step 5 — Mini‑App Read‑Only View

Default mini‑app view must:
- Render full post content (or summary)
- Show belief curve and stats
- Explain rules (collapsible)
- Offer two CTAs:
  - Support
  - Challenge

This view must appear **before any wallet interaction**.

---

### Step 6 — Onchain Commit Flow

When user chooses Support or Challenge:

- Prompt wallet connection
- Let user input USDC amount
- Submit tx to belief market contract
- Await confirmation
- Refresh belief state

Notes:
- This logic is independent of Neynar
- Onchain state is authoritative

---

### Step 7 — Mini‑App Authentication (SIWN)

Use Neynar’s **Sign In With Neynar** to:
- Identify user by FID
- Issue signer if needed
- Enable Farcaster write actions

Use cases:
- Display “You committed” state
- (Optional) allow user to cast about their commitment

Signer usage rules:
- Never auto‑post
- User‑initiated only

---

### Step 8 — Optional: Cast Sharing

After a successful commit, optionally show:

> “Share that you supported / challenged this claim”

If user opts in:
- Use Neynar signer to publish a cast

This is optional and should be **off by default**.

---

## Suggested Route Map

```
GET  /api/og/:postId          → Dynamic OG image
GET  /api/frame/:postId       → Frame metadata
POST /api/frame/action        → Neynar‑validated action handler
GET  /app/:postId             → Mini‑app main view
POST /api/auth/*              → SIWN auth routes
```

---

## UX Guardrails (Must‑Haves)

- No committing directly from frame
- No ranking or leaderboard UI
- No green/red “winning” signals
- “Unchallenged” is informational, not celebratory

---

## v0 Scope Reminder

Explicitly **out of scope**:
- Reputation systems
- Badge minting
- Market resolution
- Governance
- Cross‑post aggregation

Goal of v0:
> Validate that people will use capital + time to signal belief — not to grow metrics.

---

## Final Implementation Principle

If a feature makes it easier to act *without thinking*, it is probably wrong.

Prefer:
- deliberate flows
- explicit context
- slow, legible updates

---

End of implementation plan.

