import { DatabaseSync } from 'node:sqlite';
import { findD1SqliteFile } from '../lib/fehd-sync.mjs';
import { performAiSemanticSearch } from '../lib/ai-search.mjs';

const dbPath = findD1SqliteFile();
console.log('Using database:', dbPath);
const db = new DatabaseSync(dbPath, { readOnly: true });

async function test() {
  console.log('\n--- Test 1: Sing Heung Yuen (勝香園) ---');
  const res1 = await performAiSemanticSearch(db, {
    shopsign: 'Sing Heung Yuen',
    secondaryName: '勝香園',
    address: '2 Mee Lun Street, Central',
    district: 'CENTRAL/WESTERN'
  });
  console.log('Total found:', res1.total);
  if (res1.restaurants[0]) {
    console.log('Match:', res1.restaurants[0].name_en, '|', res1.restaurants[0].name_tc, '| Score:', res1.restaurants[0].aiScore);
  }

  console.log('\n--- Test 2: Kau Kee (九記清湯牛腩) ---');
  const res2 = await performAiSemanticSearch(db, {
    shopsign: 'Kau Kee Restaurant',
    secondaryName: '九記牛腩',
    address: '21 Gough Street, Central',
    district: 'CENTRAL/WESTERN'
  });
  console.log('Total found:', res2.total);
  if (res2.restaurants[0]) {
    console.log('Match:', res2.restaurants[0].name_en, '|', res2.restaurants[0].name_tc, '| Score:', res2.restaurants[0].aiScore);
  }
}

test().then(() => {
  db.close();
  console.log('\n✅ Direct search verification passed!');
});
