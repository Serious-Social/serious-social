# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [2026-02-07]

### Added
- "Challenge any cast" URL input on create page — paste a Warpcast URL or cast hash to create a market on anyone's cast ([4ece911])
- "Friends in this market" section on market page — shows followed users who have participated
- Activity feed on market page — merges on-chain commits with Farcaster replies in a unified timeline
- Challenge-a-friend flow in post-commit modal — shows best friends as share targets with personalized @mention casts
- Per-market activity log in KV (commit events with LPUSH/LTRIM pattern)
- `/api/market-participants/friends` endpoint — intersects viewer's following list with market participants
- `/api/market-activity` endpoint — merges KV commit entries with Neynar cast replies

### Changed
- `/api/casts` route now supports `?url=` param for Warpcast URL lookups alongside existing `?hash=` and `?fid=` modes ([4ece911])
- Create page header changed from "Select a Cast" to "Create a Market" to reflect the two creation paths ([4ece911])
- Server-side validation for cast hash format and Warpcast URL host before calling Neynar ([4ece911])
- Read lock period, penalties, author premium, and stake limits from on-chain factory/market params instead of hardcoding in UI ([aeda529])
- Post-commit success step now shows best friends picker instead of generic share button
- Best friends API response now includes `displayName` and `pfpUrl`
- Market participant POST now records commit amount for activity feed
- Cache-bust share embed URLs with timestamp so each share gets a fresh OG image snapshot

### Fixed
- Activity feed no longer breaks if a single KV entry is malformed (per-entry try/catch)
- Market activity API still returns commits when Neynar is unavailable (fallback to `fid:<id>` identities)
- Removed redundant Skip/Done buttons in post-commit success step

## [2026-02-05]

### Changed
- Bypass wagmi connector for write operations, use Farcaster SDK ethProvider directly ([518941d])
- Tweak home page copy ([0a189e5])

### Fixed
- Fix `connector.getChainId` error by passing live connector to `sendTransaction` ([90ca823])

## [2026-02-04] - UI Redesign

### Added
- CSS variable-based theming system with runtime theme switching ([7590777], [991c575])
- IBM Plex Mono font for terminal aesthetic ([211ad28], [b1339bd])
- Hugeicons icon library ([0b2d586])
- Skeleton loading cards on home page ([70686e2])
- Sticky bottom action bar and highlighted user positions on market page ([e84f798])
- Badge pulse animation for unchallenged market status ([bd0be7c])
- UI research documentation and theme demos ([560792e])

### Changed
- Redesign BeliefCurve with segmented bars and hugeicons ([0e00695])
- Prioritize Net Belief Signal as primary metric ([1229325])
- Apply theme styling across all views: App, Header, HomeTab, CommitModal, CreateMarketView, MarketView ([9aa226f], [cab5bb9], [bd5ffa5], [74d1eda], [171320f], [54a52fa])
- Redesign OG image with purple theme and grid texture ([9508504])
- Use Redis-cached cast text in OG image generation ([544b35c])
- Handle Neynar API rate limits gracefully in for-you feed ([406cda8])
- Respect env file values for app URLs in dev script ([8562353])

## [2026-02-02]

### Changed
- Store cast text and author info in Redis to eliminate Neynar bulk fetch dependency ([1388d5d])

### Fixed
- Fix bulk cast fetch using v2 Neynar SDK response shape ([bb267f1])
- Revert incorrect Neynar SDK response path change ([eb28c10])
- Double the Unchallenged badge size in OG image ([148649c])
- Fix OG image aspect ratio to 1200x800 ([6a05b56])
- Fix OG image by replacing tw classes with inline styles ([8e7c851])
- Fix OG image rendering and include amount in share text ([b42b799])

## [2026-02-01]

### Added
- Market participant avatars on belief curve ([e8a66be])
- Inline sharing CTA and post-commit share prompt ([0de7026])

### Changed
- Simplify home page market cards to single belief bar ([ab07f5e])
- Show average hold time stats instead of raw signal weights ([fd1c2a5])
- Use bulk cast fetch to reduce Neynar API calls on market listings ([31cebb3])
- Move status badge inline with heading, enlarge bar labels ([93d900a])

## [2026-01-31]

### Added
- 24hr belief signal change indicator ([d96d033])
- Contested status badge on contested markets ([1804d95])
- Verified contract and GitHub links to About page ([d3e5237])
- Admin endpoint to clear stale market data from KV ([0a8e0cc])

### Changed
- Target BeliefVault for USDC approvals instead of individual markets/factory ([eac7e07])

### Fixed
- Fix belief signal bar not filling 100% when unchallenged ([64a21fe])

## [2026-01-29]

### Added
- Info button on Reward Pool card with explainer modal ([590662b])
- Three-bar belief signal visualization in OG image ([f87eba2])

[4ece911]: https://github.com/Serious-Social/serious-social/commit/4ece911
[aeda529]: https://github.com/Serious-Social/serious-social/commit/aeda529
[0a189e5]: https://github.com/Serious-Social/serious-social/commit/0a189e5
[518941d]: https://github.com/Serious-Social/serious-social/commit/518941d
[90ca823]: https://github.com/Serious-Social/serious-social/commit/90ca823
[544b35c]: https://github.com/Serious-Social/serious-social/commit/544b35c
[70686e2]: https://github.com/Serious-Social/serious-social/commit/70686e2
[1229325]: https://github.com/Serious-Social/serious-social/commit/1229325
[e84f798]: https://github.com/Serious-Social/serious-social/commit/e84f798
[b1339bd]: https://github.com/Serious-Social/serious-social/commit/b1339bd
[bd0be7c]: https://github.com/Serious-Social/serious-social/commit/bd0be7c
[560792e]: https://github.com/Serious-Social/serious-social/commit/560792e
[9508504]: https://github.com/Serious-Social/serious-social/commit/9508504
[406cda8]: https://github.com/Serious-Social/serious-social/commit/406cda8
[54a52fa]: https://github.com/Serious-Social/serious-social/commit/54a52fa
[171320f]: https://github.com/Serious-Social/serious-social/commit/171320f
[bd5ffa5]: https://github.com/Serious-Social/serious-social/commit/bd5ffa5
[74d1eda]: https://github.com/Serious-Social/serious-social/commit/74d1eda
[0e00695]: https://github.com/Serious-Social/serious-social/commit/0e00695
[cab5bb9]: https://github.com/Serious-Social/serious-social/commit/cab5bb9
[9aa226f]: https://github.com/Serious-Social/serious-social/commit/9aa226f
[211ad28]: https://github.com/Serious-Social/serious-social/commit/211ad28
[991c575]: https://github.com/Serious-Social/serious-social/commit/991c575
[7590777]: https://github.com/Serious-Social/serious-social/commit/7590777
[8562353]: https://github.com/Serious-Social/serious-social/commit/8562353
[0b2d586]: https://github.com/Serious-Social/serious-social/commit/0b2d586
[1388d5d]: https://github.com/Serious-Social/serious-social/commit/1388d5d
[eb28c10]: https://github.com/Serious-Social/serious-social/commit/eb28c10
[bb267f1]: https://github.com/Serious-Social/serious-social/commit/bb267f1
[148649c]: https://github.com/Serious-Social/serious-social/commit/148649c
[6a05b56]: https://github.com/Serious-Social/serious-social/commit/6a05b56
[8e7c851]: https://github.com/Serious-Social/serious-social/commit/8e7c851
[b42b799]: https://github.com/Serious-Social/serious-social/commit/b42b799
[93d900a]: https://github.com/Serious-Social/serious-social/commit/93d900a
[0de7026]: https://github.com/Serious-Social/serious-social/commit/0de7026
[31cebb3]: https://github.com/Serious-Social/serious-social/commit/31cebb3
[e8a66be]: https://github.com/Serious-Social/serious-social/commit/e8a66be
[ab07f5e]: https://github.com/Serious-Social/serious-social/commit/ab07f5e
[fd1c2a5]: https://github.com/Serious-Social/serious-social/commit/fd1c2a5
[d96d033]: https://github.com/Serious-Social/serious-social/commit/d96d033
[1804d95]: https://github.com/Serious-Social/serious-social/commit/1804d95
[d3e5237]: https://github.com/Serious-Social/serious-social/commit/d3e5237
[64a21fe]: https://github.com/Serious-Social/serious-social/commit/64a21fe
[eac7e07]: https://github.com/Serious-Social/serious-social/commit/eac7e07
[0a8e0cc]: https://github.com/Serious-Social/serious-social/commit/0a8e0cc
[590662b]: https://github.com/Serious-Social/serious-social/commit/590662b
[f87eba2]: https://github.com/Serious-Social/serious-social/commit/f87eba2
[8bbd038]: https://github.com/Serious-Social/serious-social/commit/8bbd038
[36712ac]: https://github.com/Serious-Social/serious-social/commit/36712ac
[aa0b81c]: https://github.com/Serious-Social/serious-social/commit/aa0b81c
