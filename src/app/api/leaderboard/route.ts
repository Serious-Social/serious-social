import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { getAllParticipantWallets, getWalletFids } from '~/lib/kv';
import { getNeynarClient } from '~/lib/neynar';
import {
  CONTRACTS,
  BELIEF_FACTORY_ABI,
  SRS_TOKEN_ABI,
  DEFAULT_CHAIN_ID,
} from '~/lib/contracts';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface LeaderboardEntry {
  rank: number;
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  srsBalance: string;
}

/**
 * GET /api/leaderboard?limit=25
 * Fetch the SRS reputation leaderboard.
 */
export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(limitParam || '25', 10), 1), 50);

  try {
    // Read SRS token address from factory
    const srsAddress = await publicClient.readContract({
      address: CONTRACTS[DEFAULT_CHAIN_ID].factory,
      abi: BELIEF_FACTORY_ABI,
      functionName: 'reputationToken',
    }) as `0x${string}`;

    // If SRS is disabled (address zero), return empty
    if (!srsAddress || srsAddress === ZERO_ADDRESS) {
      return NextResponse.json({ entries: [], totalSRS: '0' });
    }

    // Get all participant wallets
    const wallets = await getAllParticipantWallets();
    if (wallets.length === 0) {
      return NextResponse.json({ entries: [], totalSRS: '0' });
    }

    // Batch-read SRS balances via multicall
    const balanceCalls = wallets.map((wallet) => ({
      address: srsAddress,
      abi: SRS_TOKEN_ABI,
      functionName: 'balanceOf' as const,
      args: [wallet as `0x${string}`] as const,
    }));

    const balanceResults = await publicClient.multicall({
      contracts: balanceCalls,
    });

    // Pair wallets with balances, filter zeros
    const walletsWithBalances: { wallet: string; balance: bigint }[] = [];
    for (let i = 0; i < wallets.length; i++) {
      const result = balanceResults[i];
      if (result.status === 'success' && result.result && (result.result as bigint) > 0n) {
        walletsWithBalances.push({
          wallet: wallets[i],
          balance: result.result as bigint,
        });
      }
    }

    if (walletsWithBalances.length === 0) {
      return NextResponse.json({ entries: [], totalSRS: '0' });
    }

    // Sort by balance descending, trim to limit
    walletsWithBalances.sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0));
    const trimmed = walletsWithBalances.slice(0, limit);

    // Resolve wallets → FIDs
    const walletFids = await getWalletFids(trimmed.map((w) => w.wallet));

    // Collect unique FIDs
    const fids: number[] = [];
    for (const { wallet } of trimmed) {
      const fid = walletFids.get(wallet.toLowerCase());
      if (fid != null && !fids.includes(fid)) {
        fids.push(fid);
      }
    }

    // Resolve FIDs → profiles
    const profileMap = new Map<number, { username: string; displayName: string; pfpUrl: string }>();
    if (fids.length > 0) {
      try {
        const client = getNeynarClient();
        const { users } = await client.fetchBulkUsers({ fids });
        for (const user of users) {
          profileMap.set(user.fid, {
            username: user.username,
            displayName: user.display_name || user.username,
            pfpUrl: user.pfp_url || '',
          });
        }
      } catch (e) {
        console.error('Failed to resolve Neynar profiles:', e);
      }
    }

    // Build entries
    const entries: LeaderboardEntry[] = [];
    let totalSRS = 0n;

    for (let i = 0; i < trimmed.length; i++) {
      const { wallet, balance } = trimmed[i];
      const fid = walletFids.get(wallet.toLowerCase());
      if (fid == null) continue;

      const profile = profileMap.get(fid);
      totalSRS += balance;

      entries.push({
        rank: i + 1,
        fid,
        username: profile?.username || `fid:${fid}`,
        displayName: profile?.displayName || `fid:${fid}`,
        pfpUrl: profile?.pfpUrl || '',
        srsBalance: balance.toString(),
      });
    }

    return NextResponse.json({
      entries,
      totalSRS: totalSRS.toString(),
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
