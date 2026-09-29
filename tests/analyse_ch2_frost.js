/* FROSTMUSTER (Kapitel 2): 672 ways to cut the 24 cells around the well into
   six connected groups of four; the six carved channels leave nine, and the
   ice (18 channels, the carved ones included) leaves exactly one — which
   uses all 18. The board's own constants are lifted from the shipped source. */
'use strict';
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(process.env.CH2_SRC || path.join(__dirname, '..', 'chapter2/chapter2.js'), 'utf8');
const WELL  = SRC.match(/const WELL\s*=\s*'(\d,\d)'/)[1];
const MAX   = +SRC.match(/const FROST_MAX_CUTS\s*=\s*(\d+)/)[1];
const FIXED = new Set(SRC.match(/const FROST_FIXED\s*=\s*new Set\(\[([^\]]*)\]\)/)[1].match(/'[^']+'/g).map(s => s.slice(1, -1)));
let fail = 0; const bad = m => { fail++; console.log('   !! ' + m); };
const N = 5, key = (r, c) => `${r},${c}`;
const edge = (a, b) => { const [r1, c1] = a.split(',').map(Number), [r2, c2] = b.split(',').map(Number);
  return r1 === r2 ? `h,${r1},${Math.min(c1, c2)}` : `v,${Math.min(r1, r2)},${c1}`; };
const nb = k => { const [r, c] = k.split(',').map(Number);
  return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([a,b]) => a >= 0 && b >= 0 && a < N && b < N).map(([a,b]) => key(a, b)); };
const cells = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (key(r, c) !== WELL) cells.push(key(r, c));
const ALL_EDGES = new Set(); cells.concat(WELL).forEach(k => nb(k).forEach(n => ALL_EDGES.add(edge(k, n))));
// every connected 4-cell piece, indexed by its first cell in reading order
const order = k => cells.indexOf(k), pieces = new Map();
for (const k of cells) (function grow(set) { if (set.length === 4) { const s = set.slice().sort((a, b) => order(a) - order(b)); pieces.set(s.join('|'), s); return; }
  for (const x of set) for (const n of nb(x)) if (n !== WELL && !set.includes(n)) grow(set.concat(n)); })([k]);
const byFirst = {}; for (const s of pieces.values()) (byFirst[s[0]] = byFirst[s[0]] || []).push(s);
const parts = [];
(function place(used, chosen) { const f = cells.find(k => !used.has(k)); if (!f) { parts.push(chosen.slice()); return; }
  for (const s of byFirst[f] || []) if (s.every(k => !used.has(k))) { s.forEach(k => used.add(k)); chosen.push(s); place(used, chosen); chosen.pop(); s.forEach(k => used.delete(k)); } })(new Set(), []);
const inner = s => { const e = new Set(); for (const a of s) for (const b of s) if (a < b && nb(a).includes(b)) e.add(edge(a, b)); return e; };
const holds = s => { const seen = new Set([s[0]]), q = [s[0]];      // still one piece with the carved channels in it?
  while (q.length) { const k = q.pop(); for (const n of nb(k)) if (s.includes(n) && !seen.has(n) && !FIXED.has(edge(k, n))) { seen.add(n); q.push(n); } }
  return seen.size === 4; };
let minAll = 99; const fit = [], layouts = [];
for (const P of parts) {
  const keep = new Set(); P.forEach(s => inner(s).forEach(e => keep.add(e)));
  const need = new Set([...ALL_EDGES].filter(e => !keep.has(e))); minAll = Math.min(minAll, need.size);
  if (P.every(holds)) {
    const all = new Set([...need, ...FIXED]);
    fit.push(all.size);
    layouts.push({ ice: all.size, player: [...all].filter(e => !FIXED.has(e)).sort() });   // for test_ch2_frost.js
  }
}
if (require.main !== module) { module.exports = { layouts, MAX }; return; }
const within = fit.filter(n => n <= MAX);
console.log(`\nFROSTMUSTER — well ${WELL}, ${FIXED.size} carved channels, ice ${MAX}`);
console.log(`   groupings of the 24 cells: ${parts.length}\n   fit the carved channels: ${fit.length} (ice ${fit.sort((a, b) => a - b).join(', ')})\n   fit the ice as well: ${within.length}`);
if (parts.length !== 672) bad(`expected 672 groupings, found ${parts.length}`);
if (within.length !== 1) bad(`the ice must leave exactly one layout, it leaves ${within.length}`);
if (within.length === 1 && within[0] !== MAX) bad(`the one layout should use all ${MAX} channels, it uses ${within[0]}`);
if (minAll !== MAX) bad(`the card says GENAU ${MAX}: every grouping needs at least ${minAll}`);
// the words around the board must not contradict it
if (/mehrere L(ö|oe)sungen/i.test(SRC)) bad('a line still promises several solutions');
const ladder = SRC.slice(SRC.indexOf('p2: ['), SRC.indexOf('function useHint'));
if (!/Achtzehn/.test(ladder)) bad('no Frostmuster hint names the ice budget');
console.log(`\n${fail ? fail + ' FINDING(S)' : 'AUDIT CLEAN'}`); process.exit(fail ? 1 : 0);
