/**
 * Generate bot wallets from an HD mnemonic.
 * Usage: npx tsx simulation/wallets/generate.ts [--count 100]
 *
 * If SIM_MNEMONIC is set in .env.local, uses that.
 * Otherwise generates a new mnemonic and prints it.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { mnemonicToAccount } from 'viem/accounts';
import { generateMnemonic, english } from 'viem/accounts';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const count = parseInt(process.argv.find((_, i, arr) => arr[i - 1] === '--count') || '100');

let mnemonic = process.env.SIM_MNEMONIC;
let isNew = false;

if (!mnemonic) {
  mnemonic = generateMnemonic(english);
  isNew = true;
  console.log('\n=== NEW MNEMONIC GENERATED ===');
  console.log(`Add this to your .env.local:\n`);
  console.log(`SIM_MNEMONIC="${mnemonic}"`);
  console.log('\n==============================\n');
}

console.log(`Deriving ${count + 1} wallets (index 0 = funder, 1-${count} = bots)...\n`);

const addresses: Array<{ index: number; address: string; role: string }> = [];

for (let i = 0; i <= count; i++) {
  const account = mnemonicToAccount(mnemonic, { addressIndex: i });
  addresses.push({
    index: i,
    address: account.address,
    role: i === 0 ? 'funder' : `bot-${String(i).padStart(3, '0')}`,
  });
}

// Print first few
console.log('Funder:', addresses[0].address);
console.log(`Bot 001: ${addresses[1].address}`);
console.log(`Bot 002: ${addresses[2].address}`);
console.log(`... (${count - 2} more)`);
console.log(`Bot ${String(count).padStart(3, '0')}: ${addresses[count].address}`);

// Write to wallets.json
const outPath = resolve(__dirname, 'wallets.json');
writeFileSync(outPath, JSON.stringify({ count, addresses }, null, 2));
console.log(`\nWrote ${outPath}`);

if (isNew) {
  console.log('\nIMPORTANT: Save the mnemonic above to .env.local before running fund.ts');
}
