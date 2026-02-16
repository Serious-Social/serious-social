# Serious Social

A Farcaster mini app for **Belief Markets** — a belief-coordination primitive where expressing conviction has a cost, belief strength is legible, and money disciplines behavior without dominating it.

Live at [serious-social.vercel.app](https://serious-social.vercel.app)

## What are Belief Markets?

Belief Markets let users stake USDC to signal durable conviction in claims posted on Farcaster. The core idea is **escrowed seriousness** — capital temporarily locked to signal belief.

- **Non-zero-sum**: No forced transfer of principal between sides. Rewards come from fees, not others' losses.
- **Time-weighted signal**: Reward share grows with stake size and duration. Early believers earn most.
- **Side-agnostic rewards**: Both supporters and challengers earn from the same shared reward pool.
- **No resolution**: Markets never settle to "true / false." Belief is subjective and ongoing.

See [reward_mechanics.md](./reward_mechanics.md) for the full economic model.

## Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Chain**: Base mainnet (USDC)
- **Contracts**: [serious-contracts](https://github.com/Serious-Social/serious-contracts) — BeliefMarketFactory, BeliefVault
- **Wallet**: Farcaster miniapp SDK (`sdk.wallet.getEthereumProvider()`), wagmi/viem for reads
- **Data**: Vercel KV (Redis) for market metadata, activity, participant tracking
- **Social**: Neynar API for cast lookups, user profiles, notifications

## Pages

| Route | Description |
|---|---|
| `/` | Home — recent markets, "For You" feed, conviction leaderboard |
| `/create` | Create a market from your own casts or by challenging any Farcaster URL |
| `/market/[postId]` | Market detail — belief curve, positions, commit/withdraw, activity |
| `/about` | How Belief Markets work, reward mechanics, contract links |

## API Routes

| Route | Description |
|---|---|
| `/api/markets` | Fetch recent markets with on-chain state (uses multicall) |
| `/api/markets/for-you` | Personalized feed based on user's Farcaster following |
| `/api/casts` | Look up casts by FID, hash, or Warpcast/Farcaster URL |
| `/api/cast-mapping` | Store/retrieve cast-to-market mappings |
| `/api/market-participants` | Record and retrieve market participants |
| `/api/market-activity` | Activity feed for a market |
| `/api/belief-snapshot` | Get 24h belief change for a market |
| `/api/cron/snapshot-beliefs` | Cron job to snapshot belief state for all markets |
| `/api/og/market` | Dynamic OG image generation for market embeds |
| `/api/notify` | Send Farcaster notifications on market activity |
| `/api/send-notification` | Low-level notification sender |
| `/api/leaderboard` | SRS reputation token leaderboard |

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Fill in: NEYNAR_API_KEY, KV_REST_API_URL, KV_REST_API_TOKEN, etc.

# Run development server
npm run dev
```

## Key Architecture

- **`src/lib/contracts.ts`** — ABIs, addresses, type interfaces, helpers (`formatUSDC`, `parseUSDC`, `formatBps`, `formatLockPeriod`)
- **`src/hooks/useBeliefMarket.ts`** — wagmi read hooks for market state, params, positions
- **`src/hooks/useFarcasterTransaction.ts`** — write hooks using Farcaster SDK ethProvider directly (bypasses wagmi connector)
- **`src/hooks/useBeliefMarketWrite.ts`** — combined approve + commit/create flows
- **`src/hooks/useReputation.ts`** — SRS reputation token balance and leaderboard hooks
- **`src/lib/kv.ts`** — Vercel KV helpers for market metadata, participants, snapshots
- **`src/lib/beliefNotifications.ts`** — Farcaster notification helpers

## Contracts

Deployed on Base mainnet. Source: [serious-contracts](https://github.com/Serious-Social/serious-contracts)

| Contract | Address |
|---|---|
| BeliefMarketFactory | [`0x03ced...558e`](https://basescan.org/address/0x03ced67957579fa1657d448d810320b89b19558e) |
| BeliefVault | [`0xb42d...be4e`](https://basescan.org/address/0xb42dfd13a1f84caecdd6636009554499649abe4e) |

## License

MIT
