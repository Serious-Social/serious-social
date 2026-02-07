import { MiniAppNotificationDetails } from '@farcaster/miniapp-sdk';
import { Redis } from '@upstash/redis';
import { APP_NAME } from './constants';

// In-memory fallback storage
const localStore = new Map<string, MiniAppNotificationDetails>();

// Use Redis if KV env vars are present, otherwise use in-memory
const useRedis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
const redis = useRedis
  ? new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    })
  : null;

function getUserNotificationDetailsKey(fid: number): string {
  return `${APP_NAME}:user:${fid}`;
}

export async function getUserNotificationDetails(
  fid: number
): Promise<MiniAppNotificationDetails | null> {
  const key = getUserNotificationDetailsKey(fid);
  if (redis) {
    return await redis.get<MiniAppNotificationDetails>(key);
  }
  return localStore.get(key) || null;
}

export async function setUserNotificationDetails(
  fid: number,
  notificationDetails: MiniAppNotificationDetails
): Promise<void> {
  const key = getUserNotificationDetailsKey(fid);
  if (redis) {
    await redis.set(key, notificationDetails);
  } else {
    localStore.set(key, notificationDetails);
  }
}

export async function deleteUserNotificationDetails(
  fid: number
): Promise<void> {
  const key = getUserNotificationDetailsKey(fid);
  if (redis) {
    await redis.del(key);
  } else {
    localStore.delete(key);
  }
}

/*//////////////////////////////////////////////////////////////
                      CAST HASH MAPPING
//////////////////////////////////////////////////////////////*/

// In-memory fallback for castHash mapping
const castHashStore = new Map<string, CastMapping>();

export interface CastMapping {
  castHash: string;
  authorFid: number;
  createdAt: number;
  text?: string;
  authorUsername?: string;
  authorDisplayName?: string;
  authorPfpUrl?: string;
}

function getCastMappingKey(postId: string): string {
  return `${APP_NAME}:cast:${postId}`;
}

/**
 * Store the mapping from postId to castHash.
 * Called when a market is created.
 */
export async function setCastMapping(
  postId: string,
  data: CastMapping
): Promise<void> {
  const key = getCastMappingKey(postId);
  if (redis) {
    await redis.set(key, data);
  } else {
    castHashStore.set(key, data);
  }
}

/**
 * Retrieve castHash by postId.
 */
export async function getCastMapping(
  postId: string
): Promise<CastMapping | null> {
  const key = getCastMappingKey(postId);
  if (redis) {
    return await redis.get<CastMapping>(key);
  }
  return castHashStore.get(key) || null;
}

/*//////////////////////////////////////////////////////////////
                      RECENT MARKETS
//////////////////////////////////////////////////////////////*/

const RECENT_MARKETS_KEY = `${APP_NAME}:recent_markets`;
const MAX_RECENT_MARKETS = 50;

// In-memory fallback for recent markets
const recentMarketsStore: string[] = [];

/**
 * Add a market to the recent markets list.
 * Called when a market is created.
 */
export async function addRecentMarket(postId: string): Promise<void> {
  if (redis) {
    // Add to the front of the list
    await redis.lpush(RECENT_MARKETS_KEY, postId);
    // Trim to keep only the most recent
    await redis.ltrim(RECENT_MARKETS_KEY, 0, MAX_RECENT_MARKETS - 1);
  } else {
    // In-memory fallback
    recentMarketsStore.unshift(postId);
    if (recentMarketsStore.length > MAX_RECENT_MARKETS) {
      recentMarketsStore.pop();
    }
  }
}

/**
 * Get the list of recent market postIds.
 */
export async function getRecentMarkets(limit: number = 10): Promise<string[]> {
  if (redis) {
    return await redis.lrange(RECENT_MARKETS_KEY, 0, limit - 1);
  }
  return recentMarketsStore.slice(0, limit);
}

/**
 * Clear all market-related data from KV.
 * Removes the recent markets list and all cast mappings for those markets.
 * Useful after contract redeployments that invalidate existing markets.
 */
/*//////////////////////////////////////////////////////////////
                    BELIEF SNAPSHOTS
//////////////////////////////////////////////////////////////*/

export interface BeliefSnapshotEntry {
  belief: string;
  ts: number;
}

const MAX_SNAPSHOT_ENTRIES = 25;
const SNAPSHOT_TTL_SECONDS = 48 * 60 * 60; // 48h

function getBeliefSnapshotKey(postId: string): string {
  return `${APP_NAME}:belief_snapshot:${postId}`;
}

/**
 * Get the rolling belief snapshot list for a market.
 */
export async function getBeliefSnapshot(
  postId: string
): Promise<BeliefSnapshotEntry[]> {
  const key = getBeliefSnapshotKey(postId);
  if (redis) {
    const data = await redis.get<BeliefSnapshotEntry[]>(key);
    return data || [];
  }
  return [];
}

/**
 * Store the rolling belief snapshot list for a market.
 */
export async function setBeliefSnapshot(
  postId: string,
  snapshots: BeliefSnapshotEntry[]
): Promise<void> {
  const key = getBeliefSnapshotKey(postId);
  const trimmed = snapshots.slice(0, MAX_SNAPSHOT_ENTRIES);
  if (redis) {
    await redis.set(key, trimmed, { ex: SNAPSHOT_TTL_SECONDS });
  }
}

/**
 * Batch-read belief snapshots for multiple markets (one mget call).
 */
export async function getBeliefSnapshots(
  postIds: string[]
): Promise<Map<string, BeliefSnapshotEntry[]>> {
  const result = new Map<string, BeliefSnapshotEntry[]>();
  if (postIds.length === 0) return result;

  if (redis) {
    const keys = postIds.map(getBeliefSnapshotKey);
    const values = await redis.mget<(BeliefSnapshotEntry[] | null)[]>(...keys);
    for (let i = 0; i < postIds.length; i++) {
      if (values[i]) {
        result.set(postIds[i], values[i]!);
      }
    }
  }
  return result;
}

/*//////////////////////////////////////////////////////////////
                    MARKET PARTICIPANTS
//////////////////////////////////////////////////////////////*/

export interface MarketParticipants {
  support: number[];
  challenge: number[];
}

const participantsStore = new Map<string, MarketParticipants>();

function getMarketParticipantsKey(postId: string): string {
  return `${APP_NAME}:participants:${postId}`;
}

export async function getMarketParticipants(
  postId: string
): Promise<MarketParticipants | null> {
  const key = getMarketParticipantsKey(postId);
  if (redis) {
    return await redis.get<MarketParticipants>(key);
  }
  return participantsStore.get(key) || null;
}

export async function addMarketParticipant(
  postId: string,
  fid: number,
  side: 'support' | 'challenge'
): Promise<void> {
  const key = getMarketParticipantsKey(postId);
  let data: MarketParticipants;

  if (redis) {
    const existing = await redis.get<MarketParticipants>(key);
    data = existing || { support: [], challenge: [] };
  } else {
    data = participantsStore.get(key) || { support: [], challenge: [] };
  }

  if (!data[side].includes(fid)) {
    data[side].push(fid);
  }

  if (redis) {
    await redis.set(key, data);
  } else {
    participantsStore.set(key, data);
  }
}

/*//////////////////////////////////////////////////////////////
                      ACTIVITY LOG
//////////////////////////////////////////////////////////////*/

export interface ActivityEntry {
  type: 'commit';
  fid: number;
  side: 'support' | 'challenge';
  amount: string;      // formatted USDC, e.g. "25.00"
  timestamp: number;   // Unix ms
}

const MAX_ACTIVITY_ENTRIES = 50;

// In-memory fallback for activity entries
const activityStore = new Map<string, string[]>();

function getActivityKey(postId: string): string {
  return `${APP_NAME}:activity:${postId}`;
}

export async function addActivityEntry(
  postId: string,
  entry: ActivityEntry
): Promise<void> {
  const key = getActivityKey(postId);
  const serialized = JSON.stringify(entry);

  if (redis) {
    await redis.lpush(key, serialized);
    await redis.ltrim(key, 0, MAX_ACTIVITY_ENTRIES - 1);
  } else {
    const list = activityStore.get(key) || [];
    list.unshift(serialized);
    if (list.length > MAX_ACTIVITY_ENTRIES) {
      list.pop();
    }
    activityStore.set(key, list);
  }
}

export async function getActivityEntries(
  postId: string,
  limit: number = 15
): Promise<ActivityEntry[]> {
  const key = getActivityKey(postId);

  if (redis) {
    const raw = await redis.lrange(key, 0, limit - 1);
    const entries: ActivityEntry[] = [];
    for (const item of raw as Array<string | ActivityEntry>) {
      try {
        entries.push(typeof item === 'string' ? JSON.parse(item) as ActivityEntry : item);
      } catch {
        // Skip malformed entries
      }
    }
    return entries;
  }

  const list = activityStore.get(key) || [];
  const entries: ActivityEntry[] = [];
  for (const s of list.slice(0, limit)) {
    try {
      entries.push(JSON.parse(s) as ActivityEntry);
    } catch {
      // Skip malformed entries
    }
  }
  return entries;
}

export async function clearAllMarketData(): Promise<{ deletedKeys: number }> {
  if (redis) {
    // Get all recent market postIds so we can delete their cast mappings
    const postIds = await redis.lrange(RECENT_MARKETS_KEY, 0, -1);
    const keysToDelete = [
      RECENT_MARKETS_KEY,
      ...postIds.map((postId: string) => getCastMappingKey(postId)),
    ];
    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
    }
    return { deletedKeys: keysToDelete.length };
  }
  // In-memory fallback
  const count = recentMarketsStore.length;
  for (const postId of recentMarketsStore) {
    castHashStore.delete(getCastMappingKey(postId));
  }
  recentMarketsStore.length = 0;
  return { deletedKeys: count + 1 };
}
