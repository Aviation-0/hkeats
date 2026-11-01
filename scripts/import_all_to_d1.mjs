// scripts/import_all_to_d1.mjs
// Automates importing all exported SQL batches into remote Cloudflare D1

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const outDir = path.join(process.cwd(), 'd1_export');
if (!fs.existsSync(outDir)) {
  console.error('❌ Directory ./d1_export not found. Run "node scripts/export_d1_dump.mjs" first.');
  process.exit(1);
}

const files = fs.readdirSync(outDir).filter((f) => f.startsWith('batch_') && f.endsWith('.sql')).sort();
console.log(`🚀 Found ${files.length} batches to import into remote Cloudflare D1 (eatsafe-hk-db)...`);

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  const filePath = path.join(outDir, file).replace(/\\/g, '/');
  console.log(`[${i + 1}/${files.length}] Uploading ${file}...`);
  try {
    execSync(`npx.cmd wrangler d1 execute eatsafe-hk-db --remote --file="${filePath}"`, {
      stdio: 'inherit',
    });
  } catch (err) {
    console.error(`❌ Failed on ${file}:`, err.message);
    process.exit(1);
  }
}

console.log('🎉 All batches successfully uploaded to Cloudflare D1!');
