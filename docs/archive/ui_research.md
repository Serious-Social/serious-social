# Serious Social — UI/UX Research & Design Spec

**Project**: Belief Markets mini-app on Farcaster (Neynar)
**Context**: Terminal Brutalist aesthetic, deployed as a Farcaster Frame / Mini-App
**Date**: February 2026

---

## 1. Core UX Principles That Apply

### 1.1 Jakob's Law — Familiarity Wins

Users spend most of their time on *other* apps. They expect your app to work the way those apps work. This is the single most important principle for Serious Social because:

- Your users live inside Warpcast, X, and crypto dashboards daily
- They've internalized card layouts, avatar+handle patterns, and bottom-tab navigation
- Deviation from these patterns creates cognitive friction, not "personality"

**What this means for Serious Social:**

- Market cards must follow the social post pattern: avatar → handle → timestamp → content → engagement metrics
- The feed view must feel like scrolling a social timeline, not navigating a financial dashboard
- Interaction patterns (tap to expand, swipe, pull-to-refresh) should match what Warpcast already does
- Don't invent new UI vocabulary when existing conventions exist (e.g., don't create a novel progress indicator when a horizontal bar is universally understood)

### 1.2 Cognitive Load & Miller's Law

The average person holds roughly 7 (±2) items in working memory. Every UI element competes for that limited space. Your current detail view shows: Capital Conviction, Time Conviction, Net Belief Signal, Avg Support Hold, Avg Challenge Hold, Support Capital, Challenge Capital, Total Committed, Reward Pool — that's 9 distinct data points before the user even reaches the action buttons.

**What this means for Serious Social:**

- Group related stats visually (conviction meters together, capital stats together, time stats together)
- Use progressive disclosure — show the 3–4 most critical numbers upfront, collapse the rest under "How it works" or "Details"
- The primary view should answer one question: "Should I support or challenge this?" Everything else is secondary
- Consider a hierarchy: Net Belief Signal (most important) → Total Committed + Participants (social proof) → Individual breakdowns (detail)

### 1.3 Fitts's Law — Make Primary Actions Easy to Hit

The most important interactive elements should be the largest and closest to the user's natural thumb position. On mobile (where most Farcaster usage happens), the bottom third of the screen is the easiest to reach.

**What this means for Serious Social:**

- Support and Challenge buttons should be the largest tap targets on the detail view
- These buttons should live near the bottom of the viewport, not buried after scrolling through stats
- Consider a sticky bottom bar with the primary actions, similar to how e-commerce apps pin "Add to Cart"
- The "Share this market" action is secondary — it should exist but not compete visually with Support/Challenge

### 1.4 The Endowed Progress Effect

People are more likely to complete a task if they believe they've already made progress. This is why Duolingo shows streaks and LinkedIn shows profile completion bars.

**What this means for Serious Social:**

- Time Conviction is inherently an endowed progress mechanic — the longer you hold, the more your conviction score grows. This should be visually prominent and feel rewarding
- Show users their conviction score growing over time, not just as a static number
- "You've been committed for 2d 3h" feels more powerful than "Avg Support Hold: 2d 3h"
- Consider a personal dashboard that shows the user their own conviction trajectory

### 1.5 Social Proof & The Bandwagon Effect

People are more likely to take an action if they see others doing it. This is why X shows like/retweet counts, Instagram shows follower counts, and Amazon shows review counts.

**What this means for Serious Social:**

- Participant count ("23 believers") should be visible on every market card
- Show recent staking activity: "vitalik.eth supported 2h ago" creates urgency
- The "Unchallenged" badge is excellent social proof in reverse — it signals an open opportunity
- Consider showing a feed of recent actions (similar to how Uniswap shows recent swaps)

### 1.6 Loss Aversion & Framing

People feel losses roughly 2× more strongly than equivalent gains. The 5% early exit fee is a loss-framing mechanic, which is powerful but needs careful UI treatment.

**What this means for Serious Social:**

- Frame the 5% fee as "the price of impatience" (your README already does this well) — maintain this language in the UI
- When a user considers early exit, show what they'd lose in absolute terms, not just percentage
- Frame conviction rewards positively: "Earned $3.20 in conviction rewards" rather than "5% penalty avoided"
- The time-lock mechanic should feel like an investment, not a trap

---

## 2. Farcaster-Specific Constraints

### 2.1 Embed Preview Requirements

When a market URL is shared in a cast, Farcaster clients scrape meta tags and render a preview card. This is the primary discovery mechanism.

**Technical specs:**
- Image renders at **1.91:1 aspect ratio** (standard Open Graph)
- A single **CTA button** appears below the image (max ~30 characters)
- The image is **scraped once and cached** — it won't update if the market state changes
- Supported formats: PNG, JPG, GIF, WebP (use PNG for production reliability)
- Meta tag: `fc:miniapp` (or `fc:frame` for backward compatibility)

**Design implications:**
- The embed image must convey the full value proposition in a single glance: What is the claim? How much is staked? What's the status?
- Since the image is cached at share-time, include a timestamp or "as of" indicator
- The CTA button text should create action: "Support or Challenge" > "View Market" > "Open"
- Brand recognition matters — your logo/wordmark should appear in every embed so users learn to recognize Serious Social cards in their feed

### 2.2 Mini-App Dimensions

After tapping the CTA button, the mini-app launches in a vertical modal.

**Technical specs:**
- Mobile: dictated by device dimensions (full screen)
- Web: fixed at **424×695px**
- Frame SDK required for communication with parent app
- EIP-1193 for onchain transactions (each must be individually approved)

**Design implications:**
- Design for 424px width as the baseline — this is narrow
- Vertical scroll is expected, but keep primary actions above the fold
- The Farcaster client renders a header bar above your app (app name, author, close button) — account for this stealing ~50px of vertical space
- Splash screen shows during load — use your brand mark and background color to set expectations

### 2.3 Feed Context & Scroll Behavior

Users scroll through dozens of casts per session. Your embed competes with text posts, images, other frames, and ads.

**Design implications:**
- You have approximately **2 seconds** of attention as a user scrolls past
- High-contrast elements and clear typography are essential — subtlety is invisible in a feed
- The embed should create a "pattern interrupt" — something visually distinct from standard text casts
- Financial data ($98, 100%, 3 believers) creates curiosity gaps that drive taps
- Status badges ("Unchallenged", "64% Support") create urgency and debate impulse

---

## 3. Patterns Borrowed from Major Platforms

### 3.1 From X (Twitter)

**What works:**
- The bifurcated engagement row (reply, retweet, like, share) teaches users that multiple actions exist at a glance
- Card-based link previews with image + title + domain create a consistent expectation for embedded content
- Quote tweets create conversation threads — consider how users might "quote cast" a market with their take

**Apply to Serious Social:**
- Market cards in the list view should follow the post-card pattern: metadata row → content → engagement/status row
- Keep the visual density similar to a tweet — don't overload cards with data
- The "Share this market" flow should optimize for casting with a pre-filled message

### 3.2 From Instagram

**What works:**
- Grid layouts create visual rhythm and scannability
- The "one card, one concept" principle keeps each piece of content digestible
- Stories (ephemeral, full-screen, vertical) established the modal-overlay pattern that Farcaster mini-apps inherit

**Apply to Serious Social:**
- Each market card = one claim, one status, one set of key metrics. Don't combine markets
- The mini-app's full-screen vertical layout should feel like opening an Instagram story — immersive, focused, dismissible
- Visual consistency across all market cards (same layout, same data positions) builds muscle memory

### 3.3 From Facebook

**What works:**
- Reactions (Love, Sad, Angry, etc.) proved that binary engagement (like/dislike) is too limiting — people want nuanced expression
- The notification badge system creates habitual check-ins

**Apply to Serious Social:**
- Support/Challenge is a good binary, but consider surfacing *why* people support or challenge (optional comment/thesis)
- Notification hooks via Farcaster's notification system: "Your market was challenged!" or "Your conviction score increased" drives re-engagement

### 3.4 From Crypto-Native Apps (Uniswap, Polymarket, Phantom)

**What works:**
- Transaction confirmation flows with clear before/after states reduce anxiety around irreversible actions
- Portfolio views that show position + P&L at a glance
- Skeleton loading states that maintain layout stability during chain reads

**Apply to Serious Social:**
- When a user taps "Support", show a clear confirmation: "You're staking $50 USDC in support of this claim. Early exit incurs a 5% fee."
- After staking, show the user their position prominently: amount, duration, conviction score, projected rewards
- Use skeleton screens (not spinners) during loading to prevent layout shift — the current loading spinner on the dark button in your screenshot feels jarring

---

## 4. Typography in a Terminal Brutalist Context

### 4.1 Font Selection

Monospace is the defining characteristic of terminal brutalist aesthetic, but not all monospace fonts are equal:

- **IBM Plex Mono**: Best overall choice — designed for extended reading, has excellent weight range (300–700), and includes italic variants. Feels "IBM mainframe" without being nostalgic
- **JetBrains Mono**: Slightly more contemporary, excellent ligatures, designed for code readability. Good alternative
- **Fira Code**: Strong ligature support but can feel too "developer tool" and less "terminal"
- **Space Mono**: More personality/quirkiness, but lower readability at small sizes
- **GT America Mono**: Premium option if budget allows — the most "Bloomberg terminal" of the bunch

**Recommendation**: IBM Plex Mono for body/data, with weight variation to create hierarchy (300 for labels, 400 for body, 600 for values, 700 for headlines).

### 4.2 Type Scale for Mobile (424px width)

```
Headlines:     20px / 600 weight / 2px letter-spacing
Values/Data:   20px / 600 weight / 0 letter-spacing
Body/Claims:   14px / 400 weight / 0 letter-spacing
Labels:        12px / 400 weight / 0.5px letter-spacing
Micro/Tags:    10–11px / 400 weight / 1px letter-spacing / uppercase
```

### 4.3 Hierarchy Through Weight, Not Size

In a monospace system, varying font size too much breaks the grid alignment that gives terminal UIs their character. Instead, create hierarchy through:

- **Weight**: Light (300) for secondary info, Regular (400) for body, Semibold (600) for data, Bold (700) for critical values
- **Opacity**: 1.0 for primary, 0.6–0.7 for secondary, 0.4 for tertiary
- **Letter-spacing**: Tighter for large text, wider for small caps/labels
- **Case**: UPPERCASE for labels and categories, sentence case for claims and body text

---

## 5. Layout & Spatial Design

### 5.1 Grid System

Terminal UIs derive their character from strict alignment. Use an 8px base grid:

- Padding: 16px (2 units) or 20px for primary containers
- Gaps between cards: 12px
- Internal card padding: 16px
- Stat grid gaps: 8px
- Section spacing: 24–32px

### 5.2 Information Density

The current UI has the right amount of information but poor density distribution. The conviction meters take up significant vertical space while the stat grid is compressed.

**Recommended layout priority (top to bottom in detail view):**

1. **Claim text + author** (the reason this market exists)
2. **Net Belief Signal bar** (the single most important data point)
3. **Key metrics row** (Total Committed, Participants, Duration — inline, not grid)
4. **Support / Challenge buttons** (primary action, prominent)
5. **Detailed breakdown** (conviction meters, individual capitals, reward pool — collapsible)
6. **Share + metadata** (secondary)

This inverts the current layout which leads with conviction meters before the user even knows what the claim is.

### 5.3 Card Anatomy for Market List

```
┌─────────────────────────────────────────────┐
│  [Avatar]  @handle  · timestamp     [badge] │   ← metadata row (32px height)
│                                             │
│  Claim text goes here, typically 2–3 lines  │   ← content (variable)
│  with enough context to be interesting…     │
│                                             │
│  [$252 committed]  [12 believers]  [+3.2%]  │   ← metrics row (20px height)
│  [████████████░░░░░░] 64% support           │   ← progress bar (8px height)
└─────────────────────────────────────────────┘
```

### 5.4 Embed Image Layout (1.91:1)

```
┌───────────────────────────────────────────────────────────┐
│  SERIOUS.SOCIAL                      [⚡ UNCHALLENGED]    │   ← brand + status
│                                                           │
│  "Claim text preview, enough to understand               │   ← claim (3 lines max)
│   the proposition being made…"                            │
│                                                           │
│  ─────────────────────────────────────────────            │   ← divider
│  $98 STAKED    3 BELIEVERS    100% SUPPORT                │   ← stats row
└───────────────────────────────────────────────────────────┘
│              [Support or Challenge]                        │   ← CTA (rendered by client)
```

---

## 6. Interaction Design

### 6.1 Micro-interactions Worth Implementing

- **Card hover/press**: Subtle border color shift to primary accent — signals interactivity without animation overhead
- **Progress bar fill**: Animate width on mount (0 → actual value over 600ms ease-out) — creates a sense of "loading real data"
- **Conviction score counter**: Animate number counting up when user views their position — reinforces the endowed progress effect
- **Blinking cursor**: A single blinking cursor element somewhere in the footer — subtle terminal flavor without being gimmicky
- **Badge pulse**: The "Unchallenged" badge could have a subtle pulse or glow to create urgency

### 6.2 Interactions to Avoid

- **Parallax or scroll-jacking**: Breaks expected scroll behavior, especially bad inside a Farcaster modal
- **Auto-playing animations**: Waste performance and distract from data
- **Hover-only reveals**: The app is primarily mobile — hover states are enhancements, not primary interactions
- **Toast notifications for non-critical events**: Reserve toasts for transaction confirmations only

### 6.3 Transaction Flow

The staking flow is the most critical UX moment. It must feel secure, clear, and irreversible-by-design (not by accident):

```
[User taps SUPPORT]
    ↓
[Amount input] — Pre-filled suggestions ($10, $50, $100, Custom)
    ↓
[Confirmation screen]
    - "You're staking $50 in SUPPORT of this claim"
    - "Early exit incurs a 5% fee ($2.50)"
    - "Your conviction grows the longer you hold"
    ↓
[Wallet approval] — Standard EIP-1193 flow
    ↓
[Success state]
    - Show updated position
    - Show conviction score starting to grow
    - Prompt to share ("Cast your conviction?")
```

---

## 7. Loading & Empty States

### 7.1 Skeleton Screens Over Spinners

The current UI shows a spinner on the dark button during loading. Replace with skeleton screens that preserve layout:

- Use the same card dimensions but fill with subtle animated placeholder blocks
- Stat values show as `--` or `···` in monospace (maintains terminal aesthetic)
- Progress bars show as empty tracks (background color only)

### 7.2 Empty States That Drive Action

- **No markets yet**: "No beliefs staked yet. Be the first to make a claim." with a prominent "Create Market" CTA
- **No challenge on a market**: "No counter-signal yet" (you already have this — it works well)
- **User has no positions**: "You haven't staked any conviction yet. Browse markets to find something worth believing in."
- **Search returns nothing**: "No markets match your search. Try different terms or create a new market."

Each empty state should have a clear next action. Dead ends kill engagement.

---

## 8. Accessibility in a Dark Terminal UI

### 8.1 Contrast Requirements

- **Text on background**: Minimum 4.5:1 ratio (WCAG AA)
- **Large text (18px+)**: Minimum 3:1 ratio
- **Interactive elements**: Minimum 3:1 against adjacent colors
- **Disabled states**: Still need 3:1 but should look visually muted

### 8.2 Terminal-Specific Concerns

- Monospace at small sizes (10–11px) is harder to read than proportional fonts — use sparingly for labels only, never for body text on mobile
- All-caps text reduces readability by ~10% — reserve for short labels (2–3 words max)
- ASCII decorators (├──, └──, ╔═══╗) are decorative, not structural — ensure screen readers skip them via `aria-hidden`
- Progress bars need `aria-valuenow`, `aria-valuemin`, `aria-valuemax` attributes
- The blinking cursor animation should respect `prefers-reduced-motion`

---

## 9. Performance Considerations

### 9.1 Embed Image Generation

The embed image is the most performance-critical asset — it's loaded for every user who scrolls past the cast in their feed.

- Generate as a static PNG, not a dynamic server-rendered image
- Target file size: under 100KB for fast loading on mobile
- Cache aggressively — the image is scraped once at share-time anyway
- Pre-render common market states (unchallenged, active with various split percentages)
- Include a fallback Open Graph image for non-Farcaster clients

### 9.2 Mini-App Load Time

- Target: interactive within 2 seconds
- Use the Farcaster splash screen (icon + background color) to bridge the gap
- Lazy-load secondary data (detailed stats, transaction history) after primary view renders
- Minimize JavaScript bundle — the mini-app should be lightweight

---

## 10. Measuring Success

### 10.1 Key Metrics to Track

- **Embed → Open rate**: What % of users who see the embed in their feed tap through to the mini-app?
- **Open → Stake rate**: What % of users who open the mini-app actually stake?
- **Average time to first action**: How long between opening the app and tapping Support/Challenge?
- **Share rate**: What % of users share a market after viewing or staking?
- **Conviction duration**: Average time before early exit (longer = better UX for this product)

### 10.2 UX Red Flags

- High embed impression count but low tap-through → Embed image isn't compelling enough
- High open rate but low stake rate → The detail view isn't building confidence or the transaction flow is too complex
- High early exit rate → Users don't understand the time-weighted mechanic or the rewards aren't visible enough
- Low share rate → The share flow has too much friction or users don't feel proud of their position

---

## 11. Summary of Immediate UI Changes

Priority changes from current design, ranked by impact:

1. **Fix the embed image** — Currently shows a broken image placeholder. This is the #1 discovery mechanism and it's non-functional
2. **Lead with the claim, not the metrics** — Users need to know *what* they're evaluating before seeing conviction data
3. **Sticky action buttons** — Support/Challenge should be accessible without scrolling
4. **Skeleton loading states** — Replace the spinner with layout-preserving skeletons
5. **Progressive disclosure** — Collapse detailed breakdowns (individual conviction meters, capital splits) under an expandable section
6. **Card hover/tap feedback** — Market cards in the list view need interactive affordance
7. **Personal position prominence** — After staking, the user's own position should be the first thing they see, with conviction score growing visually
8. **Share flow optimization** — Pre-fill a cast message with the market claim and embed URL when users tap "Share"