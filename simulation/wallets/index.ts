import { type WalletClient } from 'viem';
import { createBotWalletClient, deriveAccount } from '../chain/client';

export interface BotWallet {
  index: number;
  address: `0x${string}`;
  client: WalletClient;
}

export function loadBotWallets(mnemonic: string, rpcUrl: string, count: number, startIndex: number = 1): BotWallet[] {
  return Array.from({ length: count }, (_, i) => {
    const index = startIndex + i;
    const account = deriveAccount(mnemonic, index);
    return {
      index,
      address: account.address,
      client: createBotWalletClient(mnemonic, index, rpcUrl),
    };
  });
}
