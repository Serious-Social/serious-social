import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient } from 'viem';
import { baseSepolia } from 'viem/chains';
import { mnemonicToAccount, type HDAccount } from 'viem/accounts';

let _publicClient: PublicClient | null = null;

export function getPublicClient(rpcUrl: string): PublicClient {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
    });
  }
  return _publicClient;
}

export function deriveAccount(mnemonic: string, addressIndex: number): HDAccount {
  return mnemonicToAccount(mnemonic, { addressIndex });
}

export function createBotWalletClient(mnemonic: string, addressIndex: number, rpcUrl: string): WalletClient {
  const account = deriveAccount(mnemonic, addressIndex);
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpcUrl),
  });
}
