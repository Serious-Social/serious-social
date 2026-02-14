/**
 * Re-exports contract ABIs and types for the simulation.
 * Mirrors src/lib/contracts.ts but avoids the wagmi/chains import.
 */

export { BELIEF_FACTORY_ABI, BELIEF_MARKET_ABI, ERC20_ABI } from '../../src/lib/contracts';
export { Side, type MarketState, type Position, type MarketParams, formatBelief, formatUSDC, parseUSDC } from '../../src/lib/contracts';
export { generatePostId, isValidPostId } from '../../src/lib/postId';
