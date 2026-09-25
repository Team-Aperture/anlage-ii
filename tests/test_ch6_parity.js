/* Chapter 6's Blackbox no longer rolls the parity condition ("an odd number
   of round symbols"): no controlled change isolates it, and it made one
   chamber in five much harder. Saves already running on it stay playable -
   only one with nothing recorded yet starts over. Rules, archives and final
   answers are computed with the chapter's own generator code, sliced from
   the shipped source. */
const H = require('./helpers');
const fs = require('fs');
// Loads the real generator code out of chapter6.js (no copies), with a seedable RNG.
const SRC = require('path').join(__dirname, '..', 'chapter6', 'chapter6.js');
const src = fs.readFileSync(SRC, 'utf8');
function slice(from, to) { const a = src.indexOf(from); const b = src.indexOf(to, a); if (a < 0 || b < 0) throw new Error('slice ' + from); return src.slice(a, b); }
const body = "  const SERIES = '1024';\n" +
  slice('  const SYMS', '  // ═══════════════════════════════════════════════════════════════\n  // STATE') +
  slice('  function randInt', '  function dialogueBusy') +
  slice('  function behaviour', '  // ═══════════════════════════════════════════════════════════════\n  // CHECKPOINT');
function make(rng) {
  const f = new Function('Math', body + `; return { SYMS, N_SYM, isRound, PERMS, PERM_KEYS, CONDS, COND_KEYS, applyPerm, evalRule, ALL_INPUTS,
     randInt, pick, shuffle, sameSeq, distinct, behaviour, candidateSet, ruleUsable, stillOpen, buildRule, inputsWhere, freshInput,
     buildArchive, ARCHIVE_CLEAN, MIN_OPEN_ARCHIVE, MIN_OPEN_DIAG, SERIES };`);
  const M = Object.create(Math); M.random = rng || Math.random;
  return f(M);
}
// mulberry32
make.rng = function (seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

// One playthrough's generated instance, exactly as chapter6.js would build it:
// rule (buildRule, optionally forced), archive (buildArchive), stage-1 predict
// input, stage-2 diagnostic (enterPhase2 lines 874-885), final inputs (drawFinal).
function inst(G, forceRule, phase1Tests) {
  const rule = forceRule || G.buildRule();
  const archive = G.buildArchive(rule);
  const tests = [];
  const usedInputs = (pi, fi) => archive.filter(a => !a.foreign).map(a => a.inp).concat(tests.map(t => t.inp)).concat(pi ? [pi] : []).concat(fi || []);
  for (let i = 0; i < (phase1Tests || 0); i++) { const x = G.pick(G.ALL_INPUTS); tests.push({ inp: x, out: G.evalRule(x, rule) }); }
  // enterPhase2
  const r = rule;
  const fired = x => G.CONDS[r.cond](x) && !G.sameSeq(G.applyPerm(x, G.PERMS[r.p1]), G.evalRule(x, r));
  const used = usedInputs(null, null);
  const seen = archive.concat(tests).filter(x => !x.foreign).map(x => ({ inp: x.inp, out: x.out }));
  const cands = G.candidateSet();
  const pool = G.ALL_INPUTS.filter(x => fired(x) && !used.some(u => G.sameSeq(u, x)));
  let d1 = pool.length ? pool[0] : G.freshInput(fired, used);
  for (const x of G.shuffle(pool).slice(0, 80)) {
    if (G.stillOpen(seen.concat([{ inp: x, out: G.evalRule(x, r) }]), cands).length >= G.MIN_OPEN_DIAG) { d1 = x; break; }
  }
  const diag = { inp: d1, out: G.evalRule(d1, r), tag: 'DIAGNOSE' };
  tests.push(diag);
  function drawFinal(extraUsed) {
    const u = usedInputs(null, null).concat(extraUsed || []);
    const off = G.freshInput(x => !G.CONDS[r.cond](x) && G.distinct(x), u);
    u.push(off);
    const on = G.freshInput(x => G.CONDS[r.cond](x) && !G.sameSeq(G.applyPerm(x, G.PERMS[r.p1]), G.evalRule(x, r)), u);
    return G.shuffle([off, on]);
  }
  return { rule, archive, tests, diag, drawFinal };
}

const G = make(make.rng(2026));
const PATCH = true;   // the shipped chapter is the patched one
const { check, finish } = H.checker('ch6_parity');
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')));
const hs = async (p, aria) => { await p.locator(`#sceneHotspots [aria-label="${aria}"]`).first().click({ force: true }); await p.waitForTimeout(150); };
const lines = p => p.evaluate(() => { try { return GameEngine.dialogue.history().map(l => l.text); } catch (_) { return []; } });
const RULE = { p1: 'pa', cond: 'cd', p2: 'pc' };
const I = inst(G, RULE, 0);
const archive = I.archive;
const cp = (over) => ({ rule: RULE, archive, tests: [], phase: 1, metAsp: true, predictInput: null, finalInputs: null, sigFound: false, anomalySeen: false, wildRuns: 0, ...over });
async function openCh6(b, prog) {
  const sv = H.save({ chaptersCompleted: H.done(6), ch6_progress: prog });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(s => { if (sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded', '1');
    localStorage.setItem('ka2_mobile_warning_dismissed', '1'); localStorage.setItem('ka2_save_v1', JSON.stringify(s)); }, sv);
  await p.route('**://fonts.g**/**', r => r.abort());
  await p.goto(H.BASE + '/chapter6/chapter6.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3200); await H.settled(p); await p.waitForTimeout(300);
  return { ctx, p, errs };
}
(async () => {
  const b = await H.launch();
  console.log(`\nlegacy parity save, stage 2 with the diagnostic: kept, and the final is solvable`);
  { const { ctx, p, errs } = await openCh6(b, cp({ phase: 2, tests: [I.diag] }));
    const L = await lines(p);
    check(L.some(t => /PROTOKOLL WIEDERHERGESTELLT/.test(t)), '  resume line shown');
    await H.drain(p);
    const st = await saved(p);
    check(st.ch6_progress && st.ch6_progress.rule.cond === 'cd' && JSON.stringify(st.ch6_progress.archive) === JSON.stringify(archive), '  rule and archive unchanged');
    for (let i = 0; i < 8 && !(await p.locator('#bbModal:not(.hidden)').count()); i++) { await hs(p, 'Blackbox bedienen'); await H.drain(p); }
    await p.locator('#bbActions [data-act="f-open"]').click(); await p.waitForTimeout(200); await H.drain(p);
    const F = (await saved(p)).ch6_progress.finalInputs;
    check(Array.isArray(F) && F.length === 2, '  final inputs drawn and saved');
    for (let k = 0; k < 2; k++) { const want = G.evalRule(F[k], RULE);
      for (let i = 0; i < 3; i++) for (let n = 0; n < want[i]; n++) { await p.locator(`#bbBody [data-act="f-slot-${k}"][data-i="${i}"]`).click(); } }
    await p.locator('#bbActions [data-act="f-commit"]').click(); await p.waitForTimeout(300);
    const st2 = await saved(p);
    check(st2.chaptersCompleted.includes('ch6'), '  parity model accepted: ch6 complete (no softlock)');
    await H.drain(p); await p.waitForTimeout(600);
    check(errs.length === 0, '  no page errors ' + errs.join(' | ')); await ctx.close(); }

  console.log('\nlegacy parity save with one recorded run (stage 1): kept as is');
  { const t = { n: '1024-32', inp: [0, 3, 1], out: G.evalRule([0, 3, 1], RULE), tag: '' };
    const { ctx, p, errs } = await openCh6(b, cp({ tests: [t] }));
    const L = await lines(p); const st = await saved(p);
    check(L.some(t => /PROTOKOLL WIEDERHERGESTELLT/.test(t)) && st.ch6_progress.rule.cond === 'cd' && st.ch6_progress.tests.length === 1, '  resumed with its rule and its run');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\nlegacy parity save, nothing recorded yet');
  { const { ctx, p, errs } = await openCh6(b, cp({}));
    const L = await lines(p); const st = await saved(p);
    if (PATCH) {
      check(st.ch6_progress.rule.cond !== 'cd', `  re-rolled (now ${JSON.stringify(st.ch6_progress.rule)})`);
      check(L.some(t => /SEKTOR 06 — VERSUCHSKAMMER/.test(t)) && !L.some(t => /WIEDERHERGESTELLT/.test(t)), '  plays the opening, not the resume line');
    } else check(st.ch6_progress.rule.cond === 'cd', '  (current code) kept on parity');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\nlegacy parity save, nothing run but the foreign record already found: kept');
  { const { ctx, p, errs } = await openCh6(b, cp({ sigFound: true, anomalySeen: true }));
    const st = await saved(p);
    check(st.ch6_progress.rule.cond === 'cd', '  kept');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\nlegacy parity save, prediction already drawn: kept');
  { const pi = G.ALL_INPUTS.find(x => !G.CONDS.cd(x) && G.distinct(x) && !archive.some(a => G.sameSeq(a.inp, x)));
    const { ctx, p, errs } = await openCh6(b, cp({ predictInput: pi }));
    const st = await saved(p);
    check(st.ch6_progress.rule.cond === 'cd' && G.sameSeq(st.ch6_progress.predictInput, pi), '  kept with its prediction input');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  if (PATCH) {
    console.log('\nfresh experiments never roll parity (6 loads; the node census covers the distribution)');
    const seen = [];
    for (let k = 0; k < 6; k++) { const { ctx, p } = await openCh6(b, null); const st = await saved(p); seen.push(st.ch6_progress && st.ch6_progress.rule.cond); await ctx.close(); }
    check(seen.every(c => c && c !== 'cd'), '  ' + seen.join(','));
  }
  await b.close(); finish();
})();
