/* SPEKTRUM (Kapitel 3, Stufe 3): Eichmessung A is one unique high over two
   equal lows, B is two equal highs over one unique low, neither pass alone
   determines the rank rule, both together determine exactly one. */
'use strict';
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'chapter3/chapter3.js'), 'utf8');
function grab(name) { const i = SRC.indexOf('function ' + name); if (i < 0) throw new Error('not found: ' + name);
  let d = 0, s = false; for (let j = i; j < SRC.length; j++) { if (SRC[j] === '{') { d++; s = true; } else if (SRC[j] === '}') { d--; if (s && d === 0) return SRC.slice(i, j + 1); } } throw new Error('unbalanced ' + name); }
const i0 = SRC.indexOf('  const LVL_MIN'), i1 = SRC.indexOf('\n', SRC.indexOf('  const GAP_MIN', i0));
const M = new Function(`${SRC.slice(i0, i1)}
  function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function shuffle(a){const r=a.slice();for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]];}return r;}
  ${grab('buildCalibration')} ${grab('calibPair')} ${grab('calibUsable')} ${grab('targetLevels')} ${grab('rankResponse')}
  return { buildCalibration, rankResponse };`)();
let fail = 0; const bad = m => { if (fail++ < 6) console.log('   !! ' + m); };
const perms = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
const fits = (ex, p, rank) => { const g = M.rankResponse(ex, p), r = M.rankResponse(ex, rank); return g.every((v, i) => v === r[i]); };
const shape = ex => { const c = {}; ex.forEach(v => c[v] = (c[v] || 0) + 1); const tied = +Object.keys(c).find(k => c[k] === 2), alone = +Object.keys(c).find(k => c[k] === 1); return alone > tied ? 'peak' : 'trough'; };
const N = 200000; let wrongShape = 0, oneSuffices = 0, ambiguous = 0, copyWins = 0;
for (let t = 0; t < N; t++) { const ev = M.buildCalibration(); const rank = perms[t % 6];
  const lv = a => new Set(a).size;
  if (lv(ev.target) !== 3 || ev.examples.some(e => lv(e) !== 2) || shape(ev.examples[0]) !== 'peak' || shape(ev.examples[1]) !== 'trough') { wrongShape++; bad('shape: ' + JSON.stringify(ev)); }
  if (ev.examples.some(ex => perms.filter(p => fits(ex, p, rank)).length === 1)) { oneSuffices++; bad('a single pass determines the rule'); }
  if (perms.filter(p => ev.examples.every(ex => fits(ex, p, rank))).length !== 1) { ambiguous++; bad('both passes do not pin one rule'); }
  const want = M.rankResponse(ev.target, rank); for (const ex of ev.examples) { const o = M.rankResponse(ex, rank); if (o.every((v, i) => v === want[i])) copyWins++; } }
console.log(`\nSPEKTRUM — ${N} instances\n   wrong shape (A=5,2,2-like / B=4,4,1-like / target distinct): ${wrongShape}\n   a single pass sufficed: ${oneSuffices}\n   A+B ambiguous: ${ambiguous}\n   copying an example wins: ${copyWins}`);
console.log(`\n${fail ? fail + ' FINDING(S)' : 'AUDIT CLEAN'}`); process.exit(fail ? 1 : 0);
