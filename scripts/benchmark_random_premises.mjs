// scripts/benchmark_random_premises.mjs
// Large-scale precision/recall benchmark: sample real licensed premises from the DB at random,
// query the live API like Google Maps would, and verify the top hit is the exact licence.
import { DatabaseSync } from 'node:sqlite';
import { findD1SqliteFile } from '../lib/fehd-sync.mjs';

const N = parseInt(process.argv[2] || '400', 10);
const BASE = process.env.BASE || 'http://localhost:3000';

let seed = 20261009;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;

const db = new DatabaseSync(findD1SqliteFile(), { readOnly: true });
const rows = db.prepare(`
  SELECT license_no, type, district, name_en, name_tc, address_en
  FROM restaurants
  WHERE type IN ('General Restaurant Licence','Light Refreshment Restaurant Licence','Bakery Licence','Siu Mei and Lo Mei Shop Licence')
    AND name_en IS NOT NULL AND TRIM(name_en) <> '' AND LOWER(name_en) NOT IN ('no record')
`).all();
db.close();

// How many licences share (name, district)? Used to separate ambiguous chain branches from real misses.
const key = (r) => `${r.name_en.trim().toLowerCase()}|${r.district}`;
const dupCount = new Map();
for (const r of rows) dupCount.set(key(r), (dupCount.get(key(r)) || 0) + 1);

const sample = [];
const used = new Set();
while (sample.length < N) {
  const r = rows[Math.floor(rnd() * rows.length)];
  if (used.has(r.license_no)) continue;
  used.add(r.license_no);
  sample.push(r);
}

const hasZh = (s) => /[\u4e00-\u9fa5]/.test(s || '');
const streetOnly = (addr) => addr.split(',').slice(2).join(',').trim() || addr;

async function query(r, variant) {
  const p = new URLSearchParams();
  const zhName = hasZh(r.name_en);
  if (variant === 'A') {
    p.set('shopsign', r.name_en);
    if (r.name_tc && r.name_tc !== r.name_en && !zhName) p.set('secondaryName', r.name_tc);
    p.set('address', r.address_en);
  } else {
    // Noisier: no shop/floor prefix, title-cased name, Chinese subtitle only when it exists
    p.set('shopsign', r.name_en.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()));
    if (r.name_tc && !zhName && hasZh(r.name_tc)) p.set('secondaryName', r.name_tc);
    p.set('address', streetOnly(r.address_en) + ', Hong Kong');
  }
  const res = await fetch(`${BASE}/api/restaurants?${p}`);
  const j = await res.json();
  return j.restaurants || [];
}

const stats = { A: { exact: 0, sameName: 0, wrong: 0, none: 0 }, B: { exact: 0, sameName: 0, wrong: 0, none: 0 } };
const failures = [];
const t0 = Date.now();
for (const r of sample) {
  for (const v of ['A', 'B']) {
    let out;
    try { out = await query(r, v); } catch (e) { out = []; }
    const top = out[0];
    const ambiguous = dupCount.get(key(r)) > 1;
    if (!top) { stats[v].none++; failures.push({ v, kind: 'NONE', r }); }
    else if (top.license_no === r.license_no) stats[v].exact++;
    else if (top.name_en && top.name_en.trim().toLowerCase() === r.name_en.trim().toLowerCase()) {
      stats[v].sameName++;
      if (!ambiguous) failures.push({ v, kind: 'SAMENAME_OTHER_BRANCH', r, top });
    } else { stats[v].wrong++; failures.push({ v, kind: 'WRONG', r, top }); }
  }
}
console.log(`\n${N} random premises, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
for (const v of ['A', 'B']) {
  const s = stats[v];
  console.log(`Variant ${v}: exact ${s.exact} (${(100 * s.exact / N).toFixed(1)}%) | other-branch-same-name ${s.sameName} | WRONG ${s.wrong} | none ${s.none}`);
}
console.log(`\nSample failures (max 25):`);
for (const f of failures.filter((f) => f.kind !== 'SAMENAME_OTHER_BRANCH' || true).slice(0, 25)) {
  console.log(`[${f.v}] ${f.kind}  want #${f.r.license_no} "${f.r.name_en}" @ ${f.r.address_en.slice(0, 70)} (${f.r.district})` +
    (f.top ? `\n      got  #${f.top.license_no} "${f.top.name_en}" @ ${(f.top.address_en || '').slice(0, 70)} (${f.top.district})` : ''));
}
import fs from 'node:fs';
fs.writeFileSync('scratch/random_benchmark_failures.json', JSON.stringify(failures, null, 1));
