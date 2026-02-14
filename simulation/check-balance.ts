import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createPublicClient, http, formatEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import { mnemonicToAccount } from 'viem/accounts';

async function main() {
  const mnemonic = process.env.SIM_MNEMONIC!;
  const funder = mnemonicToAccount(mnemonic, { addressIndex: 0 });
  console.log('Funder address:', funder.address);

  const client = createPublicClient({ chain: baseSepolia, transport: http(process.env.SIM_RPC_URL) });
  const bal = await client.getBalance({ address: funder.address });
  console.log('ETH balance:', formatEther(bal));

  const usdcBal = await client.readContract({
    address: '0x2cebb3DFf94B7cCB09FC218F91B70Ea35A0fFd1a',
    abi: [{ type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }],
    functionName: 'balanceOf',
    args: [funder.address],
  }) as bigint;
  console.log('USDC balance:', Number(usdcBal) / 1e6);

  // Check if Mock USDC has a public mint function
  try {
    await client.simulateContract({
      address: '0x2cebb3DFf94B7cCB09FC218F91B70Ea35A0fFd1a',
      abi: [{ type: 'function', name: 'mint', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' }],
      functionName: 'mint',
      args: [funder.address, 1_000_000n],
      account: funder.address,
    });
    console.log('Mock USDC has public mint() ✓');
  } catch (e) {
    console.log('No public mint():', (e as Error).message.slice(0, 100));
  }
}

main().catch(console.error);
