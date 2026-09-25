/* Chapter 6's Blackbox, driven through the SHIPPED generator (source slices,
   seeded RNG): parity of the round symbols is never rolled, the other four
   conditions share the rolls evenly, the validation family is still all 125
   rules, and a saved experiment on parity still loads and still evaluates. */
const fs = require('fs'), path = require('path');
const SRC = process.env.CH6_SRC || path.join(__dirname, '..', 'chapter6', 'chapter6.js');
const src = fs.readFileSync(SRC, 'utf8');
const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('missing ' + a); return src.slice(i, j); };
let fail = 0; const check = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fail++; };
let a = 20260924; const rnd = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const M = Object.create(Math); M.random = rnd;
const body = "const SERIES = '1024'; const SAVE_KEY = 'ch6_progress';\n" + cut('  const SYMS', '  // ═══════════════════════════════════════════════════════════════\n  // STATE')
  + cut('  function randInt', '  function dialogueBusy') + cut('  function behaviour', '  // ═══════════════════════════════════════════════════════════════\n  // CHECKPOINT')
  + cut('  function loadCheckpoint', '  // ═══════════════════════════════════════════════════════════════\n  // TEST RUNS');
let stored = null;
const GameEngine = { state: { get: () => stored } };
const G = new Function('Math', 'GameEngine', body + '; return { CONDS, candidateSet, behaviour, ruleUsable, buildRule, buildArchive, evalRule, loadCheckpoint, ALL_INPUTS };')(M, GameEngine);

const cands = G.candidateSet(), sigs = cands.map(G.behaviour);
check(cands.length === 125 && new Set(sigs).size === 125 && cands.every(r => G.ruleUsable(r, sigs)), '  validation family unchanged: 125 rules, all distinct, all usable');
const n = {}; const T = 3000;
for (let i = 0; i < T; i++) { const r = G.buildRule(); n[r.cond] = (n[r.cond] || 0) + 1; }
check(!n.cd, `  parity (cd) never rolled in ${T} rules`);
check(['ca','cb','cc','ce'].every(k => Math.abs(n[k] / T - 0.25) < 0.035), '  the other four share the rolls evenly ' + JSON.stringify(n));

const rule = { p1: 'pa', cond: 'cd', p2: 'pc' }, archive = G.buildArchive(rule);
const cp = o => ({ rule, archive, tests: [], phase: 1, predictInput: null, finalInputs: null, sigFound: false, ...o });
const run = { n: '1024-32', inp: [0, 3, 1], out: G.evalRule([0, 3, 1], rule), tag: '' };
stored = cp({ tests: [run] });              check(!!G.loadCheckpoint(), '  parity save with a recorded run: kept');
stored = cp({ phase: 2, tests: [run] });    check(!!G.loadCheckpoint(), '  parity save in stage 2: kept');
stored = cp({ predictInput: [0, 1, 2] });   check(!!G.loadCheckpoint(), '  parity save with a prediction drawn: kept');
stored = cp({ sigFound: true });            check(!!G.loadCheckpoint(), '  parity save with the foreign record found: kept');
stored = cp({});                            check(G.loadCheckpoint() === null, '  parity save with nothing recorded: starts over');
stored = cp({ rule: { p1: 'pa', cond: 'ce', p2: 'pc' } }); check(!!G.loadCheckpoint(), '  any other untouched save: kept');
check(G.evalRule([3, 0, 1], rule).join() === [3, 1, 0].join() && G.evalRule([3, 4, 1], rule).join() === [4, 1, 3].join(), '  parity rule still evaluates as before');
console.log(`\n${fail === 0 ? 'ALL CHECKS PASSED' : fail + ' CHECK(S) FAILED'}  [analyse_ch6_blackbox]`); process.exit(fail ? 1 : 0);
