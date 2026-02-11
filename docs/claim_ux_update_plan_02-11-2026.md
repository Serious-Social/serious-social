# Market Detail Page — Tabs UX Overhaul (v2)

## Implementation Spec for `/market/[postId]/MarketView.tsx`

**Target**: Farcaster mini-app webview (375px width, ~700px viewport)
**Goal**: Belief signal + CTA visible within first ~414px. Reduce perceived scroll by ~60%.
**Dependencies**: None new. Tailwind 3.4+, React state only.
**Design System**: Uses existing `globals.css` theme tokens (`--color-*`, `--gradient-*`). All components use `theme-*` Tailwind classes. Font: IBM Plex Mono (monospace stack).

---

## Design System Mapping

The prototype uses inline styles for portability. When implementing, map to existing Tailwind/CSS conventions:

| Prototype Token | CSS Variable | Tailwind Class |
|----------------|--------------|----------------|
| `T.bg` | `--color-bg` | `bg-theme-bg` |
| `T.surface` | `--color-surface` | `bg-theme-surface` |
| `T.border` | `--color-border` | `border-theme-border` |
| `T.primary` | `--color-primary` | `text-theme-primary` |
| `T.text` | `--color-text` | `text-theme-text` |
| `T.textMuted` | `--color-text-muted` | `text-theme-text-muted` |
| `T.support` | `--color-positive` | `text-theme-positive` |
| `T.challenge` | `--color-negative` | `text-theme-negative` |
| `T.gradStart/End` | `--gradient-start/end` | `gradient-primary` / `bg-gradient-primary` |

**Theme compatibility**: All three themes (amber, purple, rain) work because we use semantic tokens, not hardcoded hex values. The prototype hardcodes purple for demonstration only.

---

## Problem

The market detail page renders 10+ sections in a single vertical scroll. On mobile, the belief signal sits below the fold — users scroll 2–3 screens before they can act. Above-the-fold content determines engagement in short-session mini-apps.

---

## Changes Summary

| # | Change | File | Saves |
|---|--------|------|-------|
| 1 | Truncate claim text with "read more" | `MarketView.tsx` | ~100–400px |
| 2 | Split BeliefCurve into primary/secondary via `section` prop | `BeliefCurve.tsx` | — |
| 3 | Compact inline stats row replacing 2×3 grid | `BeliefCurve.tsx` | ~150px |
| 4 | Underline tab system with badge counts + swipe | `MarketView.tsx` | ~400–600px |
| 5 | "How it Works" bottom sheet modal | `MarketView.tsx` | scroll height + UX fix |
| 6 | Inline position display (real data, not badge pointer) | `MarketView.tsx` | net neutral (better density) |
| 7 | Empty states for Position tab | `MarketView.tsx` | — (UX quality) |

---

## Page Layout (target pixel budget)

```
[← back]                                           ~32px
[Claim - 3 lines clamped + "read more"]            ~80px
[Inline Position - side + amount + P&L (if any)]   ~38px
[Belief Signal - PRIMARY only]                      ~200px
  ├ Net belief bar + percentages + 24h badge
  ├ Avatar stack + participant count
  ├ Compact stats (Committed | Pool | Avg Hold)
  └ "how does this work? →" button (opens sheet)
[Tab bar: Signal | Activity ·2 | Position ·1]      ~36px
[Tab content]                                       variable
[Spacer]                                            ~80px

[Sticky CTA: Support | Challenge]                   fixed
[Bottom sheet: How it works]                        modal
```

**Above-fold total: ~386px**

---

## Detailed Specifications

### 1. Claim Truncation

```
- Tailwind: line-clamp-3 on <p>
- Toggle: "read more" / "show less" (text-theme-primary, 11px, font-semibold)
- Only show toggle when text.length > 120 chars
- Font: 14px, weight 500, line-height 1.5, monospace
- Lowercase toggle labels to match terminal aesthetic
```

### 2. BeliefCurve `section` Prop

```typescript
interface BeliefCurveProps {
  section?: 'primary' | 'secondary' | 'all'; // default: 'all'
}
```

**Primary**: Net belief bar, percentages, 24h change badge, avatar stack, compact stats, "how does this work?" button.

**Secondary**: Capital distribution bars, hold time stats, friends list.

**All**: Everything (backward compatible, no breaking change).

### 3. Compact Stats Row

Replace 2×3 StatCard grid with single-row 3-cell display:

```
[ Committed: 14.2 ETH | Pool: 2.8 ETH | Avg Hold: 12.4d ]
```

- Cells separated by 1px gap using `bg-theme-border` as gap color
- Each cell: `bg-theme-surface`, center-aligned
- Value: 12px mono bold, `text-theme-text`
- Label: 8px uppercase, `text-theme-text-muted`, letter-spacing 0.6
- Border-radius: `rounded-lg` (8px, matching `--radius: 0.5rem`)

### 4. Tab System

#### Tab Bar — Underline Style

Matches the existing app aesthetic (not pill/segmented control):

```
- Full-width flex row
- Bottom border: 1px solid border-theme-border
- Active tab: 2px solid border-theme-primary, text-theme-text, font-bold
- Inactive tab: transparent border, text-theme-text-muted, font-medium
- Font: 11px monospace
- Sticky at top when scrolled
- Background: bg-theme-bg (prevents content bleed-through)
```

#### Badge Counts

```
Signal          — no badge
Activity · 2    — count of new/unseen items
Position · 1    — count of active positions
```

Badge: 8px mono bold, 14px height pill, `bg-theme-primary/10`, `text-theme-primary`, `border border-theme-primary/25`. For Position tab, use positive color variant.

#### Swipe Navigation

```javascript
// Track touchStart X/Y
// On touchEnd: if |deltaX| > 50px AND |deltaX| > |deltaY| * 1.5 → switch tab
// Y threshold prevents hijacking vertical scroll
```

#### Accessibility

```html
<div role="tablist">
  <button role="tab" aria-selected={active} />
</div>
<div role="tabpanel" />
```

### 5. Bottom Sheet — "How it Works"

Remove the existing `<details>` below the sticky bar and `howItWorksRef`.

```
- Trigger: "how does this work? →" button in belief signal card
- Button style: full-width, bg-theme-primary/10, border border-theme-primary/25,
  text-theme-primary, 11px mono semibold, rounded-md
- Sheet: slides up from bottom, bg-theme-surface, rounded-t-2xl
- 65% max height, drag handle bar, overlay dismiss
- Content: numbered steps (01, 02, 03) with title + description
- Step number: text-theme-primary, 10px mono bold
- Pattern: matches existing CommitModal / RewardPoolCard
```

### 6. Inline Position Display

Replaces the position badge. Shows real data instead of "you have 1 position → view":

```
[● 5px dot] 0.5 ETH  support                 +0.08 ETH
```

- Single row, ~38px, `rounded-lg`
- Background: `bg-theme-positive/10` (support) or `bg-theme-negative/10` (challenge)
- Border: `border border-theme-positive/25`
- Dot: 5px with matching `box-shadow` glow
- Amount: 12px mono bold
- Side label: 10px `text-theme-text-muted`
- P&L: 11px mono bold, colored by sign
- Tappable → switches to Position tab

### 7. Empty States

**Position tab (no positions)**:
```
- Dashed border container: border-dashed border-theme-border
- Background: bg-theme-surface, rounded-lg
- Title: 10px uppercase mono bold, text-theme-text
- Body: 11px text-theme-text-muted, line-height 1.5
- Copy: "Support or Challenge this claim to open a position
         and earn from the reward pool."
```

---

## Tab Content Specifications

### Signal Tab

1. **Capital Distribution** — section header (10px uppercase mono, `text-theme-text-muted`)
   - Two rows: label + value + 3px progress bar
   - Support bar: `bg-theme-positive` at 65% opacity
   - Challenge bar: `bg-theme-negative` at 65% opacity
   - Bar track: `bg-theme-border`

2. **Hold Time Stats** — 2-cell row (same pattern as compact stats)
   - 14px mono bold values, 8px uppercase labels

3. **Friends in Market** — section header + list
   - 28×28 rounded-md avatars with side-colored background
   - Name: 12px mono semibold
   - Side badge: 9px uppercase pill

### Activity Tab

- Staggered `fadeUp` animation (0.02s delay per item, max 5)
- Avatar: 28×28 rounded-md
- Username: 12px mono semibold
- Action: colored by type (support=positive, challenge=negative, withdrew=muted)
- New indicator: 4px dot, `bg-theme-primary` with glow
- Separator: `border-theme-border` at 25% opacity

### Position Tab

- Full card: `bg-theme-surface`, `rounded-lg`, side-colored border
- Side indicator: 6px dot with glow
- Committed: 22px mono bold
- Unrealized: 18px mono bold, colored by sign
- Buttons: Withdraw (`bg-theme-embed-bg`, `border-theme-border`) + Claim (`bg-gradient-primary`)

---

## Animation Specifications

```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes sheetUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* Stagger classes */
.stagger-1 { animation-delay: 0.02s; }
.stagger-2 { animation-delay: 0.04s; }
.stagger-3 { animation-delay: 0.06s; }
.stagger-4 { animation-delay: 0.08s; }
.stagger-5 { animation-delay: 0.10s; }

/* Belief bar fill */
transition: width 0.7s cubic-bezier(0.16, 1, 0.3, 1);

/* Respect prefers-reduced-motion (already in globals.css) */
@media (prefers-reduced-motion: reduce) {
  .fade-up, [class*="stagger-"] { animation: none; }
}
```

---

## Success Metrics

| Metric | Baseline | Target |
|--------|----------|--------|
| Time to first action (Support/Challenge tap) | Measure current | -30% |
| Scroll depth before first CTA interaction | Measure current | < 1 screen |
| Commit conversion rate | Measure current | +15% |
| Tab discovery rate | N/A | > 60% interact with ≥2 tabs |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/app/market/[postId]/MarketView.tsx` | Claim truncation, inline position, tab system, bottom sheet, layout restructure |
| `src/components/ui/BeliefCurve.tsx` | `section` prop, compact stats row |
| `src/components/ui/ActivityFeed.tsx` | Accept tab-content render mode |
| `src/app/globals.css` | Add `fadeUp`, `sheetUp`, stagger utilities (or inline in component) |

No new files. No new dependencies.

---

## Reference Implementation

The complete React prototype is provided as `market-detail-v2.jsx`. It demonstrates:

- All layout and interaction patterns using inline styles mapped to the design system
- IBM Plex Mono throughout, matching the monospace terminal aesthetic
- Purple theme tokens (support=#a78bfa, challenge=#fb923c) — adapts to any theme via CSS variables in production
- Underline tab bar (not pill/segmented)
- Capital distribution bars with labeled progress indicators
- Compact 3-cell stats row with 1px gap dividers
- Swipe navigation with Y-axis deadzone
- Bottom sheet with numbered steps
- Staggered fade-up animations on tab content
- Empty state for Position tab
- ARIA tab roles

Adapt component names and prop patterns to match existing codebase conventions. Replace inline styles with Tailwind `theme-*` classes.

---

## Implementation Checklist

- [ ] Add `line-clamp-3` to claim `<p>` with toggle state
- [ ] Add `section` prop to `BeliefCurve` (`'primary' | 'secondary' | 'all'`)
- [ ] Replace StatCard grid with compact 3-cell inline row
- [ ] Implement underline tab bar with `border-b-2 border-theme-primary`
- [ ] Add badge counts to Activity and Position tab labels
- [ ] Implement swipe navigation with Y-axis threshold
- [ ] Add `fadeUp` animation on tab content switch
- [ ] Add stagger classes to activity feed items
- [ ] Replace position badge with inline position card showing real data
- [ ] Remove `<details>` "How it works" and `howItWorksRef`
- [ ] Implement bottom sheet modal for "How it works"
- [ ] Add empty state for Position tab
- [ ] Add ARIA roles (`tablist`, `tab`, `tabpanel`)
- [ ] Add animation keyframes to `globals.css` (or component-scoped)
- [ ] Add `prefers-reduced-motion` guard for new animations
- [ ] Verify above-fold fits within 420px on iPhone SE
- [ ] Test all three themes (amber, purple, rain)
- [ ] Instrument success metrics