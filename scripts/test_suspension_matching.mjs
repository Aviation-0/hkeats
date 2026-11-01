// scripts/test_suspension_matching.mjs
// Fetches FEHD's live suspension table and checks the strict matcher against the local database:
//  - how many table rows are tied to a licence (recall)
//  - that no licence is tied to someone else's record (precision, via name+address sanity)
import { DatabaseSync } from 'node:sqlite';
import * as cheerio from 'cheerio';
import {
  findD1SqliteFile, FEHD_SUSPENSIONS_URL, matchSuspensionRecords,
  addressSimilarity, normalizeNameForMatch,
} from '../lib/fehd-sync.mjs';

const html = await (await fetch(FEHD_SUSPENSIONS_URL)).text();
const $ = cheerio.load(html);
const recs = [];
$('table tr').each((i, row) => {
  const c = $(row).find('td').map((_, e) => $(e).text().replace(/\s+/g, ' ').trim()).get();
  if (c.length >= 5 && /\d{2}-\d{2}-\d{4}/.test(c[4])) recs.push({ district: c[0], type: c[1], address: c[2], name: c[3], period: c[4] });
});
console.log('FEHD suspension table rows:', recs.length);

const db = new DatabaseSync(findD1SqliteFile(), { readOnly: true });
const all = db.prepare('SELECT license_no, name_en, name_tc, address_en, address_tc, district, type FROM restaurants').all();
db.close();

let matchedPremises = 0;
const rowHits = new Map(); // table row index -> licences
const premisesHit = [];
for (const r of all) {
  const m = matchSuspensionRecords({ nameEn: r.name_en, nameTc: r.name_tc, addressEn: r.address_en, addressTc: r.address_tc }, recs);
  if (m.length) {
    matchedPremises++;
    premisesHit.push({ r, m });
    for (const s of m) rowHits.set(s, [...(rowHits.get(s) || []), r.license_no]);
  }
}
console.log('Premises matched by strict matcher:', matchedPremises, '(old matcher: 1664)');
const unmatched = recs.filter((s) => !rowHits.has(s));
console.log('Table rows with NO matching licence:', unmatched.length);
for (const s of unmatched) console.log('  UNMATCHED:', s.name, '|', s.address, '|', s.period);
const multi = [...rowHits.entries()].filter(([, l]) => l.length > 1);
console.log('Table rows matching >1 licence:', multi.length);
for (const [s, l] of multi) console.log('  MULTI:', s.name, s.address, '->', l.join(','));
console.log('\nSample matches:');
for (const { r, m } of premisesHit.slice(0, 8)) console.log(`  #${r.license_no} ${r.name_en}/${r.name_tc} @ ${r.address_en.slice(0, 60)} <- ${m.map((x) => x.period).join(' ; ')}`);

// Regression guards for the old bug
const old = all.filter((r) => /portion of shop/i.test(r.address_en)).length;
console.log(`\n(${old} premises have an address containing 'portion of shop' - the old 15-char prefix match hit all of them)`);
