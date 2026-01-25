/**
 * Utility for generating postIds for belief markets.
 *
 * A postId is derived from the cast hash, making each market
 * directly linked to a Farcaster cast.
 */
import { keccak256, toBytes } from 'viem';

/**
 * Generate a postId from a Farcaster cast hash.
 * Uses keccak256 to ensure consistent bytes32 format.
 * @param castHash The Farcaster cast hash (0x prefixed hex string)
 * @returns A bytes32 hex string for use as postId
 */
export function generatePostId(castHash: string): `0x${string}` {
  // Normalize: ensure 0x prefix and lowercase
  const normalized = castHash.toLowerCase().startsWith('0x')
    ? castHash.toLowerCase()
    : `0x${castHash.toLowerCase()}`;

  // Hash to get consistent bytes32
  return keccak256(toBytes(normalized));
}

/**
 * Validate that a string is a valid postId (bytes32 hex).
 * @param postId The string to validate
 * @returns True if valid bytes32 hex
 */
export function isValidPostId(postId: string): postId is `0x${string}` {
  return /^0x[a-fA-F0-9]{64}$/.test(postId);
}

/**
 * Validate that a string is a valid cast hash.
 * Cast hashes are typically 20 bytes (40 hex chars).
 * @param hash The string to validate
 * @returns True if valid cast hash format
 */
export function isValidCastHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(hash);
}
