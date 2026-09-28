/* FROSTMUSTER (Kapitel 2): 672 ways to cut the 24 cells around the well into
   six connected groups of four; the six carved channels leave nine, and the
   ice (18 channels, the carved ones included) leaves exactly one — which
   uses all 18. The board's own constants are lifted from the shipped source.

   VERSCHÄRFT (NG+): 6 rows × 5, two wells, seven groups: 1029 groupings, the
   five carved channels leave 18, the ice (24) leaves exactly one — using all
   24, and no grouping at all gets by with fewer. */
'use strict';
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(process.env.CH2_SRC || path.join(__dirname, '..', 'chapter2/chapter2.js'), 'utf8');
const set = name => new Set(SRC.match(new RegExp(`const ${name}\\s*=\\s*new Set\\(\\[([^\\]]*)\\]\\)`))[1].match(/'[^']+'/g).map(s => s.slice(1, -1)));
const BOARDS = {
  normal: { R: 5, C: 5, WELLS: [SRC.match(/const WELL\s*=\s*'(\d,\d)'/)[1]], MAX: +SRC.match(/const FROST_MAX_CUTS\s*=\s*(\d+)/)[1], FIXED: set('FROST_FIXED'),
            expect: { parts: 672, fit: 9 } },
  hard:   { R: 6, C: 5, WELLS: SRC.match(/const FROST_HARD_WELLS\s*=\s*\[([^\]]*)\]/)[1].match(/'[^']+'/g).map(s => s.slice(1, -1)),
            MAX: +SRC.match(/const FROST_HARD_MAX_CUTS\s*=\s*(\d+)/)[1], FIXED: set('FROST_HARD_FIXED'),
            expect: { parts: 1029, fit: 18 } },
};

function analyse({ R, C, WELLS, MAX, FIXED }) {
  const key = (r, c) => `${r},${c}`, isWell = k => WELLS.includes(k);
  const edge = (a, b) => { const [r1, c1] = a.split(',').map(Number), [r2, c2] = b.split(',').map(Number);
    return r1 === r2 ? `h,${r1},${Math.min(c1, c2)}` : `v,${Math.min(r1, r2)},${c1}`; };
  const nb = k => { const [r, c] = k.split(',').map(Number);
    return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([a,b]) => a >= 0 && b >= 0 && a < R && b < C).map(([a,b]) => key(a, b)); };
  const cells = []; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (!isWell(key(r, c))) cells.push(key(r, c));
  const ALL_EDGES = new Set(); cells.concat(WELLS).forEach(k => nb(k).forEach(n => ALL_EDGES.add(edge(k, n))));
  // every connected 4-cell piece, indexed by its first cell in reading order
  const order = k => cells.indexOf(k), pieces = new Map();
  for (const k of cells) (function grow(s) { if (s.length === 4) { const t = s.slice().sort((a, b) => order(a) - order(b)); pieces.set(t.join('|'), t); return; }
    for (const x of s) for (const n of nb(x)) if (!isWell(n) && !s.includes(n)) grow(s.concat(n)); })([k]);
  const byFirst = {}; for (const s of pieces.values()) (byFirst[s[0]] = byFirst[s[0]] || []).push(s);
  const parts = [];
  (function place(used, chosen) { const f = cells.find(k => !used.has(k)); if (!f) { parts.push(chosen.slice()); return; }
    for (const s of byFirst[f] || []) if (s.every(k => !used.has(k))) { s.forEach(k => used.add(k)); chosen.push(s); place(used, chosen); chosen.pop(); s.forEach(k => used.delete(k)); } })(new Set(), []);
  const inner = s => { const e = new Set(); for (const a of s) for (const b of s) if (a < b && nb(a).includes(b)) e.add(edge(a, b)); return e; };
  const holds = s => { const seen = new Set([s[0]]), q = [s[0]];      // still one piece with the carved channels in it?
    while (q.length) { const k = q.pop(); for (const n of nb(k)) if (s.includes(n) && !seen.has(n) && !FIXED.has(edge(k, n))) { seen.add(n); q.push(n); } }
    return seen.size === 4; };
  let minAll = 99; const layouts = [];
  for (const P of parts) {
    const keep = new Set(); P.forEach(s => inner(s).forEach(e => keep.add(e)));
    const need = new Set([...ALL_EDGES].filter(e => !keep.has(e))); minAll = Math.min(minAll, need.size);
    if (P.every(holds)) {
      const all = new Set([...need, ...FIXED]);
      layouts.push({ ice: all.size, player: [...all].filter(e => !FIXED.has(e)).sort(), pieces: P });
    }
  }
  return { parts: parts.length, layouts, minAll, within: layouts.filter(l => l.ice <= MAX) };
}

const RESULT = {};
for (const [name, B] of Object.entries(BOARDS)) RESULT[name] = { ...analyse(B), board: B };
if (require.main !== module) {
  module.exports = { layouts: RESULT.normal.layouts, MAX: BOARDS.normal.MAX, hard: { layouts: RESULT.hard.layouts, MAX: BOARDS.hard.MAX, WELLS: BOARDS.hard.WELLS } };
  return;
}
let fail = 0; const bad = m => { fail++; console.log('   !! ' + m); };
for (const [name, r] of Object.entries(RESULT)) {
  const B = r.board;
  console.log(`\nFROSTMUSTER ${name.toUpperCase()} — ${B.R}×${B.C}, wells ${B.WELLS.join(' ')}, ${B.FIXED.size} carved channels, ice ${B.MAX}`);
  console.log(`   groupings: ${r.parts}\n   fit the carved channels: ${r.layouts.length} (ice ${r.layouts.map(l => l.ice).sort((a, b) => a - b).join(', ')})\n   fit the ice as well: ${r.within.length}`);
  if (r.parts !== B.expect.parts) bad(`${name}: expected ${B.expect.parts} groupings, found ${r.parts}`);
  if (r.layouts.length !== B.expect.fit) bad(`${name}: expected ${B.expect.fit} layouts to fit the carved channels, found ${r.layouts.length}`);
  if (r.within.length !== 1) bad(`${name}: the ice must leave exactly one layout, it leaves ${r.within.length}`);
  if (r.within.length === 1 && r.within[0].ice !== B.MAX) bad(`${name}: the one layout should use all ${B.MAX} channels, it uses ${r.within[0].ice}`);
  if (r.minAll !== B.MAX) bad(`${name}: the card says GENAU ${B.MAX}: every grouping needs at least ${r.minAll}`);
  // every carved channel is a real border of the answer (none is decoration)
  if (r.within.length === 1) {
    const S = r.within[0], id = {}; S.pieces.forEach((p, i) => p.forEach(k => { id[k] = i; }));
    for (const e of B.FIXED) { const [t, a, b] = e.split(','); const x = `${a},${b}`, y = t === 'h' ? `${a},${+b + 1}` : `${+a + 1},${b}`;
      if (id[x] === id[y] && id[x] != null) bad(`${name}: carved ${e} runs inside a group`); }
    const grid = []; for (let rr = 0; rr < B.R; rr++) { let line = '   '; for (let c = 0; c < B.C; c++) { const k = `${rr},${c}`; line += B.WELLS.includes(k) ? '◉ ' : String.fromCharCode(65 + id[k]) + ' '; } grid.push(line); }
    console.log(grid.join('\n'));
  }
}
// the words around the board must not contradict it
if (/mehrere L(ö|oe)sungen/i.test(SRC)) bad('a line still promises several solutions');
const ladder = SRC.slice(SRC.indexOf('p2: ['), SRC.indexOf('function useHint'));
if (!/Achtzehn/.test(ladder)) bad('no Frostmuster hint names the ice budget');
const hardLadder = SRC.slice(SRC.indexOf('if (FROST_HARD) HINTS.p2'), SRC.indexOf('// A ladder is walked once'));
if (!/Vierundzwanzig/.test(hardLadder) || !/genau vier Quadrate/.test(hardLadder)) bad('the VERSCHÄRFT ladder does not name its budget and squares');
console.log(`\n${fail ? fail + ' FINDING(S)' : 'AUDIT CLEAN'}`); process.exit(fail ? 1 : 0);
