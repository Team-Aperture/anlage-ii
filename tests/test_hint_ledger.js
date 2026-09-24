/* Hint ladders are walked once per chapter run. Closing and reopening a
   puzzle, switching windows, Chapter 3's overexposure retry, Chapter 6's
   protocol round trip and a reload never hand spent steps back. A new stage
   (Ch3) or phase (Ch6) is a new ladder by design; a fresh run starts at 0;
   old or junk save data is clamped. Chapter 8 already worked this way. */
const H = require('./helpers');
const { check, finish } = H.checker('hint_ledger');
const want = () => true;
const hs = async (p, aria) => { await p.locator(`#sceneHotspots [aria-label="${aria}"]`).first().click({ force: true }); await p.waitForTimeout(150); };
const all = async (p, s = 350) => { await H.drain(p); await p.waitForTimeout(s); await H.drain(p); };
const count = async p => {
  const vis = await p.locator('#hintBar:not(.hidden)').count();
  const t = (await p.locator('#hintCount').innerText().catch(() => '?')).replace('HINWEISE: ', '').replace(' VERFÜGBAR', '');
  return vis ? t : `(${t}, bar hidden)`;
};
const spend = async (p, n, btn = '#hintBtnR3MI') => { for (let i = 0; i < n; i++) { await p.locator(btn).click({ force: true }); await p.waitForTimeout(150); await all(p, 150); } };
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')));
const R = {};
const rec = (ch, k, v) => { (R[ch] = R[ch] || {})[k] = v; };

async function probe(b) {

  // ── CH1: puzzle 2 via the hall checkpoint ────────────────────────────
  if (want('ch1')) {
    const sv = H.save({ chaptersCompleted: ['ch0'] });
    sv.chapterState = { ch1: { p1Solved: true, p2Solved: false, talkSeen: {}, clicks: {} } };
    const { ctx, p, errs } = await H.open(b, '/chapter1/chapter1.html', sv);
    await p.waitForTimeout(2200); await all(p);
    const toP2 = async () => {
      await hs(p, 'Inneres Tor untersuchen'); await all(p); await all(p);
      if (await p.locator('#sceneHotspots [aria-label="Weiter zum Wartungsknoten"]').count()) { await hs(p, 'Weiter zum Wartungsknoten'); await all(p); }
      await hs(p, 'Zentrale Konsole untersuchen'); await all(p);
    };
    await toP2();
    rec('ch1', 'p2 opened', await count(p));
    await spend(p, 2); rec('ch1', 'p2 after 2 hints', await count(p));
    await p.locator('#puzzle2Modal .ka-btn', { hasText: 'ZURÜCK ]' }).click(); await p.waitForTimeout(200);
    await hs(p, 'Zentrale Konsole untersuchen'); await all(p);
    rec('ch1', 'p2 close+reopen', await count(p));
    rec('ch1', 'checkpoint keys', Object.keys((await saved(p)).chapterState.ch1 || {}).join(','));
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2200); await all(p);
    await toP2();
    rec('ch1', 'p2 after reload', await count(p));
    rec('ch1', 'errors', errs.length);
    await ctx.close();
  }

  // ── CH2: puzzle 1 (Tau-Sequenz) ─────────────────────────────────────
  if (want('ch2')) {
    const base = { thawState: 0, metFroschi: true, plantsStudied: true, orgelNudged: true, wellRevealed: false, p1Solved: false, p2Solved: false, bayernPMOFound: false, seen: {}, talkSeen: {}, react: { p1: {}, p2: {} }, p1Fails: 0 };
    const sv = H.save({ chaptersCompleted: ['ch0', 'ch1'] }); sv.chapterState = { ch2: base };
    const { ctx, p, errs } = await H.open(b, '/chapter2/chapter2.html', sv);
    await p.waitForTimeout(2200); await all(p);
    const openP1 = async () => { await hs(p, 'Wasserorgel bedienen'); await all(p); };
    await openP1(); rec('ch2', 'p1 opened', await count(p));
    await spend(p, 2); rec('ch2', 'p1 after 2 hints', await count(p));
    await p.locator('#puzzle1Modal .ka-btn', { hasText: 'ZURÜCK ]' }).click(); await p.waitForTimeout(200);
    await openP1(); rec('ch2', 'p1 close+reopen', await count(p));
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2200); await all(p);
    await openP1(); rec('ch2', 'p1 after reload', await count(p));
    rec('ch2', 'errors', errs.length);
    await ctx.close();
  }

  // ── CH3: array, stage 1 ────────────────────────────────────────────
  if (want('ch3')) {
    const sv = H.save({ chaptersCompleted: H.done(3) });
    sv.chapterState = { ch3: { stage: 1, metLux: true, sigFound: false, logsRead: 0, sawWestgang: false, seen: {}, talkSeen: {}, react: { failedOnce: true } } };
    const { ctx, p, errs } = await H.open(b, '/chapter3/chapter3.html', sv);
    await p.waitForTimeout(2200); await all(p);
    rec('ch3', 'stage1 opened (resume)', await count(p));
    await spend(p, 2); rec('ch3', 'stage1 after 2 hints', await count(p));
    await p.locator('#belBackBtn').click(); await p.waitForTimeout(200);
    await hs(p, 'Beobachtungsarray untersuchen'); await all(p);
    rec('ch3', 'stage1 close+reopen', await count(p));
    // overexpose the same stage: one look, then blank submits (25 each)
    await p.locator('#belObserveBtn').click(); await p.waitForTimeout(5500); await all(p);
    for (let i = 0; i < 6 && !(await p.locator('#belStatus', { hasText: 'ÜBERBELICHTET' }).count()); i++) {
      await p.evaluate(() => Chapter3.submit()); await p.waitForTimeout(150); await all(p, 100);
    }
    await all(p, 500);
    rec('ch3', 'stage1 after overexposure retry', await count(p));
    await spend(p, 2);
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2200); await all(p);
    rec('ch3', 'stage1 after reload', await count(p));
    rec('ch3', 'errors', errs.length);
    await ctx.close();
  }

  // ── CH4: Markierstrecke + reopen ───────────────────────────────────
  if (want('ch4')) {
    const M = { solved: false, output: null, opened: 0, fails: 0 };
    const sv = H.save({ chaptersCompleted: H.done(4) });
    sv.chapterState = { ch4: { modules: { pattern: { ...M }, weight: { ...M }, timing: { ...M }, orient: { ...M } }, finalSolved: false, sigFound: false, froschiMentioned: true, seen: {}, talkSeen: {}, praise: 0 } };
    const { ctx, p, errs } = await H.open(b, '/chapter4/chapter4.html', sv);
    await p.waitForTimeout(2200); await all(p);
    await hs(p, 'Markierstrecke untersuchen'); await all(p);
    rec('ch4', 'pattern opened', await count(p));
    await spend(p, 3); rec('ch4', 'pattern after 3 hints', await count(p));
    await p.locator('#modModal [data-act="close"]').first().click(); await p.waitForTimeout(200);
    await hs(p, 'Markierstrecke untersuchen'); await all(p);
    rec('ch4', 'pattern close+reopen', await count(p));
    await hs(p, 'Prüfwaage untersuchen'); await all(p);   // open another module directly (closes the first)
    await hs(p, 'Markierstrecke untersuchen'); await all(p);
    rec('ch4', 'pattern after visiting weight', await count(p));
    await spend(p, 1);
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2200); await all(p);
    await hs(p, 'Markierstrecke untersuchen'); await all(p);
    rec('ch4', 'pattern after reload', await count(p));
    rec('ch4', 'errors', errs.length);
    await ctx.close();
  }

  // ── CH5: Schaltgalerie ────────────────────────────────────────────
  if (want('ch5')) {
    const sv = H.save({ chaptersCompleted: H.done(5), ch5_progress: { beat: '14-E', branch: 'haupt', metTflon: true, relay: false, crossing: false, marker: false, sigFound: false, restSeen: false, webGags: 0, gags: {}, log: [] } });
    const { ctx, p, errs } = await H.open(b, '/chapter5/chapter5.html', sv);
    await p.waitForTimeout(3200); await H.settled(p); await all(p);
    await hs(p, 'Schaltwand bedienen'); await all(p);
    rec('ch5', 'gallery opened', await count(p));
    await spend(p, 3); rec('ch5', 'gallery after 3 hints', await count(p));
    await p.locator('#stModal [data-act="close"]').first().click(); await p.waitForTimeout(200);
    await hs(p, 'Schaltwand bedienen'); await all(p);
    rec('ch5', 'gallery close+reopen', await count(p));
    await spend(p, 1);
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3200); await H.settled(p); await all(p);
    await hs(p, 'Schaltwand bedienen'); await all(p);
    rec('ch5', 'gallery after reload', await count(p));
    rec('ch5', 'errors', errs.length);
    await ctx.close();
  }

  // ── CH6: Blackbox, incl. the protocol round-trip ───────────────────
  if (want('ch6')) {
    const { ctx, p, errs } = await H.open(b, '/chapter6/chapter6.html', H.save({ chaptersCompleted: H.done(6) }));
    await p.waitForTimeout(3600); await H.settled(p); await all(p);
    const openBB = async () => { for (let i = 0; i < 12 && !(await p.locator('#bbModal:not(.hidden)').count()); i++) { await hs(p, 'Blackbox bedienen'); await all(p, 200); } await all(p); };
    await openBB(); rec('ch6', 'bb opened', await count(p));
    await spend(p, 3); rec('ch6', 'bb after 3 hints', await count(p));
    await p.locator('#bbModal [data-act="close"]').first().click(); await p.waitForTimeout(200);
    await openBB(); rec('ch6', 'bb close+reopen', await count(p));
    await spend(p, 2);
    await p.locator('#bbModal [data-act="proto"]').first().click(); await p.waitForTimeout(200); await all(p);
    rec('ch6', 'protocol open (from bb)', await count(p));
    await p.locator('#vpModal [data-act="close"]').first().click(); await p.waitForTimeout(200);
    await openBB(); rec('ch6', 'bb after protocol round-trip', await count(p));
    await spend(p, 1);
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2800); await H.settled(p); await all(p);
    await openBB(); rec('ch6', 'bb after reload', await count(p));
    rec('ch6', 'errors', errs.length);
    await ctx.close();
  }

  // ── CH7: Türen ───────────────────────────────────────────────────
  if (want('ch7')) {
    const sv = H.save({ chaptersCompleted: H.done(7), ch7_progress: { act: 2, fakeCompleteSeen: true, metFaxn: true, anchors: { labels: false, displays: false, actions: false }, bsodSeen: false, integritySeen: false, sigFound: false, luxSeen: false } });
    const { ctx, p, errs } = await H.open(b, '/chapter7/chapter7.html', sv);
    await p.waitForTimeout(3000); await H.settled(p); await all(p);
    const openD = async () => { for (let i = 0; i < 6 && !(await p.locator('#vxModal:not(.hidden)').count()); i++) { await hs(p, 'Die drei Türen prüfen'); await all(p, 200); } await all(p); };
    await openD(); rec('ch7', 'doors opened', await count(p));
    await spend(p, 3); rec('ch7', 'doors after 3 hints', await count(p));
    await p.locator('#vxModal [data-act="close"]').first().click(); await p.waitForTimeout(200);
    await openD(); rec('ch7', 'doors close+reopen', await count(p));
    await spend(p, 1);
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000); await H.settled(p); await all(p);
    await openD(); rec('ch7', 'doors after reload', await count(p));
    rec('ch7', 'errors', errs.length);
    await ctx.close();
  }

  // ── CH8: reconstruction table ───────────────────────────────────
  if (want('ch8')) {
    const { ctx, p, errs } = await H.open(b, '/chapter8/chapter8.html', H.save({ chaptersCompleted: H.done(8) }));
    await p.waitForTimeout(3000); await H.settled(p); await all(p);
    await hs(p, 'Rekonstruktionstisch'); await all(p);
    const go = p.locator('.choice-btn', { hasText: 'Fragmente sichten' });
    if (await go.count()) { await go.click(); await p.waitForTimeout(200); await all(p, 500); }
    rec('ch8', 'board opened', await count(p));
    await spend(p, 2); rec('ch8', 'board after 2 hints', await count(p));
    await p.locator('#rkModal [data-act="close"]').first().click(); await p.waitForTimeout(200);
    await hs(p, 'Rekonstruktionstisch'); await all(p);
    rec('ch8', 'board close+reopen', await count(p));
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000); await H.settled(p); await all(p);
    await hs(p, 'Rekonstruktionstisch'); await all(p);
    rec('ch8', 'board after reload', await count(p));
    const cp = (await saved(p)).ch8_progress || {};
    rec('ch8', 'checkpoint hintStep/hintsUsed', `${cp.hintStep}/${cp.hintsUsed}`);
    rec('ch8', 'errors', errs.length);
    await ctx.close();
  }

}

const closeMod = async p => { const c = p.locator('#modModal:not(.hidden) [data-act="close"]'); if (await c.count()) { await c.first().click(); await p.waitForTimeout(150); } };
const hs4 = async (p, aria) => { await closeMod(p); await p.locator(`#sceneHotspots [aria-label="${aria}"]`).first().click({ force: true }); await p.waitForTimeout(150); };
const left = async p => +((/(\d+) VERFÜGBAR/.exec(await p.locator('#hintCount').innerText()) || [0, -1])[1]);
const M = { solved: false, output: null, opened: 1, fails: 0 };
const ch4 = hints => { const sv = H.save({ chaptersCompleted: H.done(4) });
  sv.chapterState = { ch4: { modules: { pattern: { ...M }, weight: { ...M }, timing: { ...M }, orient: { ...M } }, finalSolved: false, sigFound: false, froschiMentioned: true, seen: {}, talkSeen: {}, praise: 0, ...(hints === undefined ? {} : { hints }) } };
  return sv; };


(async () => {
  const b = await H.launch();

  console.log('\n[A] spent hints stay spent: close + reopen, another window, a retry, a reload');
  await probe(b);
  const eq = (ch, k, want) => check(R[ch] && R[ch][k] === want, `  ${ch}: ${k} → ${R[ch] && R[ch][k]} (want ${want})`);
  eq('ch1', 'p2 close+reopen', R.ch1['p2 after 2 hints']); eq('ch1', 'p2 after reload', R.ch1['p2 after 2 hints']);
  eq('ch2', 'p1 close+reopen', R.ch2['p1 after 2 hints']); eq('ch2', 'p1 after reload', R.ch2['p1 after 2 hints']);
  eq('ch3', 'stage1 close+reopen', R.ch3['stage1 after 2 hints']); eq('ch3', 'stage1 after overexposure retry', R.ch3['stage1 after 2 hints']); eq('ch3', 'stage1 after reload', '0');
  eq('ch4', 'pattern close+reopen', '0'); eq('ch4', 'pattern after visiting weight', '0'); eq('ch4', 'pattern after reload', '0');
  eq('ch5', 'gallery close+reopen', '0'); eq('ch5', 'gallery after reload', '0');
  eq('ch6', 'bb close+reopen', '0'); eq('ch6', 'bb after protocol round-trip', '0'); eq('ch6', 'bb after reload', '0');
  eq('ch7', 'doors close+reopen', '0'); eq('ch7', 'doors after reload', '0');
  eq('ch8', 'board close+reopen', R.ch8['board after 2 hints']); eq('ch8', 'board after reload', R.ch8['board after 2 hints']);
  for (const ch of Object.keys(R)) check(R[ch].errors === 0, `  ${ch}: no page errors`);

  console.log('\n[1] ch4: every module keeps its own ladder; junk in the save is clamped');
  { const { ctx, p, errs } = await H.open(b, '/chapter4/chapter4.html', ch4({ pattern: 99, weight: -2, timing: 'x', orient: 1.9, final: 2, bogus: 5, __proto__: { polluted: 1 } }));
    await p.waitForTimeout(2200); await all(p);
    await hs4(p, 'Markierstrecke untersuchen'); await all(p);
    check(await left(p) === 0, `  pattern: 99 → clamped to the full ladder (left ${await left(p)})`);
    await hs4(p, 'Prüfwaage untersuchen'); await all(p);
    check(await left(p) === 3, `  weight: -2 → 0 used (left ${await left(p)})`);
    await p.locator('#hintBtnVTGM').click({ force: true }); await p.waitForTimeout(150); await all(p, 150);
    await hs4(p, 'Kolbensteuerung untersuchen'); await all(p);
    check(await left(p) === 3, `  timing: "x" → 0 used (left ${await left(p)})`);
    await hs4(p, 'Getriebezug untersuchen'); await all(p);
    check(await left(p) === 2, `  orient: 1.9 → 1 used (left ${await left(p)})`);
    await hs4(p, 'Prüfwaage untersuchen'); await all(p);
    check(await left(p) === 2, `  weight still has the one step spent a moment ago (left ${await left(p)})`);
    const cp = (await saved(p)).chapterState.ch4.hints;
    const norm = o => JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]));
    check(norm(cp) === norm({ pattern: 3, weight: 1, orient: 1, final: 2 }), `  the checkpoint keeps only known ladders, clamped (${JSON.stringify(cp)})`);
    check(await p.evaluate(() => ({}).polluted === undefined), '  no prototype pollution');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[2] ch4: an old checkpoint without the field reads as nothing spent');
  { const { ctx, p, errs } = await H.open(b, '/chapter4/chapter4.html', ch4(undefined));
    await p.waitForTimeout(2200); await all(p);
    await hs4(p, 'Markierstrecke untersuchen'); await all(p);
    check(await left(p) === 3, `  3 left (${await left(p)})`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[3] ch3: a new stage is a new ladder, the reached stage keeps its own');
  const ch3 = (stage, hints) => { const sv = H.save({ chaptersCompleted: H.done(3) });
    sv.chapterState = { ch3: { stage, metLux: true, sigFound: false, logsRead: 0, sawWestgang: false, seen: {}, talkSeen: {}, react: {}, hints } }; return sv; };
  { const { ctx, p, errs } = await H.open(b, '/chapter3/chapter3.html', ch3(2, { stage1: 3 }));
    await p.waitForTimeout(2200); await all(p);
    check(await left(p) === 3, `  stage 2 after a used-up stage 1: 3 left (${await left(p)})`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }
  { const { ctx, p, errs } = await H.open(b, '/chapter3/chapter3.html', ch3(2, { stage1: 3, stage2: 2 }));
    await p.waitForTimeout(2200); await all(p);
    check(await left(p) === 1, `  stage 2 with two spent: 1 left (${await left(p)})`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[4] ch6: phase 2 is its own ladder, and survives a reload');
  { const { ctx, p, errs } = await H.open(b, '/chapter6/chapter6.html', H.save({ chaptersCompleted: H.done(6) }));
    await p.waitForTimeout(3600); await H.settled(p); await all(p);
    await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('ka2_save_v1')); s.ch6_progress.phase = 2; s.ch6_progress.hints = { phase1: 3, phase2: 1 }; localStorage.setItem('ka2_save_v1', JSON.stringify(s)); });
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2800); await H.settled(p); await all(p);
    for (let i = 0; i < 12 && !(await p.locator('#bbModal:not(.hidden)').count()); i++) { await hs4(p, 'Blackbox bedienen'); await all(p, 200); }
    check(await left(p) === 2, `  phase 2 with one spent: 2 left (${await left(p)})`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[5] ch1: a hint in repair 1 (no checkpoint yet) never writes one');
  { const { ctx, p, errs } = await H.open(b, '/chapter1/chapter1.html', H.save({ chaptersCompleted: ['ch0'] }));
    await p.waitForTimeout(3800); await all(p, 400);
    await hs4(p, 'Wartungsterminal untersuchen'); await all(p, 400);
    await hs4(p, 'Leitungspaneel untersuchen'); await H.drain(p); await p.waitForTimeout(700); await all(p, 400);
    await hs4(p, 'Dunklen Korridor betreten'); await H.drain(p); await p.waitForTimeout(900); await all(p, 400);
    await p.locator('.choice-btn').first().click(); await p.waitForTimeout(150); await all(p, 1200); await all(p, 400);
    check(await p.locator('#puzzle1Modal:not(.hidden)').count() === 1, '  (repair 1 is open)');
    await p.locator('#hintBtnR3MI').click({ force: true }); await p.waitForTimeout(200); await all(p, 150);
    check(await left(p) === 2, `  one hint spent (left ${await left(p)})`);
    check(!(await saved(p)).chapterState.ch1, '  no ch1 checkpoint was created (a reload still replays Act 1)');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[6] a paid-for hint is never cut off: a line that arrives meanwhile waits, callback and all');
  { const { ctx, p, errs } = await H.open(b, '/chapter4/chapter4.html', ch4({}));
    await p.waitForTimeout(2200); await all(p);
    await hs4(p, 'Kolbensteuerung untersuchen'); await all(p);
    // a wrong order starts the STEUERLAUF; a hint taken during it used to be replaced by the excuse line
    for (let k = 0; k < 4; k++) await p.locator(`#modModal [data-act="t-slot"][data-slot="${k}"][data-ring="${3 - k}"]`).first().click().catch(() => {});
    await p.locator('#modModal [data-act="t-check"]').first().click().catch(() => {}); await p.waitForTimeout(250);
    await p.locator('#hintBtnR3MI').click({ force: true }); await p.waitForTimeout(1800);
    const on = await p.evaluate(() => document.getElementById('dlgSpeaker')?.textContent + '|' + document.getElementById('dlgText')?.textContent);
    check(/^R-3MI\|„Ich fang/.test(on), `  the hint is still the line on screen 1.8 s later (${on.slice(0, 40)}…)`);
    await all(p, 400);
    const h = await p.evaluate(() => GameEngine.dialogue.history().map(l => l.speaker + ': ' + l.text));
    const iHint = h.findIndex(t => /Ich fang immer bei der ersten an/.test(t));
    check(iHint >= 0 && h.length > iHint + 1, `  and whatever waited behind it played afterwards (${h.length - iHint - 1} line(s))`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }
  { const { ctx, p, errs } = await H.open(b, '/chapter4/chapter4.html', ch4({}));
    await p.waitForTimeout(2200); await all(p);
    const r = await p.evaluate(async () => {
      const D = GameEngine.dialogue, wait = ms => new Promise(r => setTimeout(r, ms));
      let cb = 0;
      D.holdNext(); D.load([{ speaker: 'V-TGM', text: '"HELD."', subtitle: 'GEHALTEN.' }]);
      D.load([{ speaker: 'SYSTEM', text: 'SPÄTER.' }], () => { cb = 1; });
      await wait(300);
      const first = document.getElementById('dlgText').textContent;
      D.advance(); D.advance(); await wait(300);                       // finish typing, then leave the held line
      const second = document.getElementById('dlgText').textContent;
      D.advance(); D.advance(); await wait(200);
      return { first, second, cb };
    });
    check(/HELD/.test(r.first) && /SPÄTER/.test(r.second) && r.cb === 1, `  engine: a held line stays, the late batch plays next and its callback runs (${JSON.stringify(r)})`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[7] Ch2: Escape during a puzzle\'s intro lines does not leave its hint buttons dead');
  { const base = { thawState: 0, metFroschi: true, plantsStudied: true, orgelNudged: true, wellRevealed: false, p1Solved: false, p2Solved: false, bayernPMOFound: false, seen: {}, talkSeen: {}, react: { p1: {}, p2: {} }, p1Fails: 0 };
    const sv = H.save({ chaptersCompleted: ['ch0', 'ch1'] }); sv.chapterState = { ch2: base };
    const { ctx, p, errs } = await H.open(b, '/chapter2/chapter2.html', sv);
    await p.waitForTimeout(2200); await all(p);
    await p.locator('#sceneHotspots [aria-label="Wasserorgel bedienen"]').first().click({ force: true }); await p.waitForTimeout(300);
    await p.keyboard.press('Escape'); await p.waitForTimeout(100); await all(p);
    const n0 = await p.evaluate(() => GameEngine.dialogue.history().length);
    await p.locator('#hintBtnR3MI').click(); await p.waitForTimeout(300);
    const n1 = await p.evaluate(() => GameEngine.dialogue.history().length);
    check(await p.locator('#puzzle1Modal:not(.hidden)').count() === 1 && n1 > n0 && await left(p) === 3, `  the organ opens and its first hint plays (${await left(p)} left)`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  await b.close(); finish();
})().catch(e => { console.error(e); process.exit(1); });
