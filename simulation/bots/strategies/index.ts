import { PersonalityType, type BotStrategy } from '../types';
import { EarlyMoverStrategy } from './early-mover';
import { BandwagonStrategy } from './bandwagon';
import { ContrarianStrategy } from './contrarian';
import { WhaleStrategy } from './whale';
import { CautiousStrategy } from './cautious';
import { RandomStrategy } from './random';

const STRATEGY_MAP: Record<PersonalityType, new () => BotStrategy> = {
  [PersonalityType.EarlyMover]: EarlyMoverStrategy,
  [PersonalityType.Bandwagon]: BandwagonStrategy,
  [PersonalityType.Contrarian]: ContrarianStrategy,
  [PersonalityType.Whale]: WhaleStrategy,
  [PersonalityType.Cautious]: CautiousStrategy,
  [PersonalityType.Random]: RandomStrategy,
};

export function createStrategy(personality: PersonalityType): BotStrategy {
  const StrategyClass = STRATEGY_MAP[personality];
  return new StrategyClass();
}
