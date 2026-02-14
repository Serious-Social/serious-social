import { PersonalityType, type BotConfig } from './types';
import { Bot } from './bot';
import { createStrategy } from './strategies';
import { type BotWallet } from '../wallets';
import { type SimulationConfig } from '../config';

const PERSONALITY_ORDER: PersonalityType[] = [
  PersonalityType.EarlyMover,
  PersonalityType.Bandwagon,
  PersonalityType.Contrarian,
  PersonalityType.Whale,
  PersonalityType.Cautious,
  PersonalityType.Random,
];

export function createBots(config: SimulationConfig, wallets: BotWallet[]): Bot[] {
  const distribution = config.personalityDistribution;
  const bots: Bot[] = [];
  let walletIdx = 0;

  for (const personality of PERSONALITY_ORDER) {
    const ratio = distribution[personality] || 0;
    const count = Math.round(config.totalBots * ratio);

    for (let i = 0; i < count && walletIdx < wallets.length; i++) {
      const wallet = wallets[walletIdx];
      const botConfig: BotConfig = {
        id: walletIdx,
        name: `${personality.replace('_', '-')}-${String(i + 1).padStart(3, '0')}`,
        personality: personality as PersonalityType,
        fakeFid: 900000 + walletIdx,
        walletIndex: wallet.index,
      };

      const strategy = createStrategy(personality as PersonalityType);
      const bot = new Bot(botConfig, strategy, wallet.client, wallet.address);
      bots.push(bot);
      walletIdx++;
    }
  }

  // If rounding left us short, fill remaining with Random
  while (bots.length < config.totalBots && walletIdx < wallets.length) {
    const wallet = wallets[walletIdx];
    const botConfig: BotConfig = {
      id: walletIdx,
      name: `random-extra-${String(walletIdx).padStart(3, '0')}`,
      personality: PersonalityType.Random,
      fakeFid: 900000 + walletIdx,
      walletIndex: wallet.index,
    };
    const strategy = createStrategy(PersonalityType.Random);
    bots.push(new Bot(botConfig, strategy, wallet.client, wallet.address));
    walletIdx++;
  }

  return bots;
}
