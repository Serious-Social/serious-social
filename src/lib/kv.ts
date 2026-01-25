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
