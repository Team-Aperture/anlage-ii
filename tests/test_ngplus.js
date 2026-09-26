/* NG+ — another calibration cycle after Chapter 9.
   The story, every puzzle, checkpoint and all five Signalnischen start over;
   achievements from every cycle, settings and the coordinates stay. Archivar
   still means "Chapter 8 without a hint, this cycle", and a second cycle can
   pick another Chapter 9 ending. Old saves without the legacy record are
   untouched. */
const H = require('./helpers');
const { check, finish } = H.checker('ngplus');
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')));
const hs = async (p, aria) => { await p.locator(`#sceneHotspots [aria-label="${aria}"]`).first().click({ force: true }); await p.waitForTimeout(150); };

// a finished first cycle, as Amy's save looks: everything but Archivar and one ending
const EARNED1 = ['first_boot', 'ch0_complete', 'ch1_complete', 'ch2_complete', 'ch3_complete', 'ch4_complete', 'ch5_complete', 'ch6_complete',
  'ch7_complete', 'ch8_complete', 'signal_first', 'signal_all', 'chamber', 'truth', 'bonus_found', 'said_hiii', 'all_guests', 'ch9_complete'];
const DONE1 = () => H.save({ chaptersCompleted: H.ALL, signalsFound: H.SIG, achievementsUnlocked: EARNED1.slice(),
  flags: { truth_revealed: true, zieldaten: true, ch9_ending: 'hiii', reactivation_consent_seen: true }, settings: {} });
// a second cycle in progress
const CYCLE2 = (over = {}) => H.save({ achievementsUnlocked: EARNED1.slice(), legacy: { cycle: 2, earned: EARNED1.slice(), endings: ['hiii'], zieldaten: true }, ...over });

(async () => {
  const b = await H.launch();

  console.log('\n[A] after Chapter 9 the title offers a new cycle; two taps start it');
  { const { ctx, p, errs } = await H.open(b, '/index.html', DONE1());
    await p.waitForTimeout(6500);
    check(await p.locator('#newCycleBtn').count() === 1, '  [ NEUER DURCHLAUF ] is in the menu');
    await p.locator('#newCycleBtn').click(); await p.waitForTimeout(300);
    check(await p.locator('#newCycleOverlay:not(.hidden)').count() === 1, '  it explains what stays and what starts over');
    await p.locator('#ncyGo').click(); await p.waitForTimeout(200);
    check((await saved(p)).chaptersCompleted.length === 9, '  the first tap only arms it');
    await p.locator('#ncyGo').click(); await p.waitForTimeout(1600);
    const st = await saved(p);
    check(st.chaptersCompleted.length === 0 && st.signalsFound.length === 0 && !st.flags.truth_revealed && !st.ch8_progress && !Object.keys(st.chapterState).length,
      '  sectors, Signalnischen, story flags and checkpoints start over');
    check(EARNED1.every(a => st.achievementsUnlocked.includes(a)), `  every achievement stays (${st.achievementsUnlocked.length})`);
    check(st.legacy && st.legacy.cycle === 2 && st.legacy.zieldaten === true && st.legacy.endings.includes('hiii'), `  the cycle is recorded (${JSON.stringify(st.legacy && { cycle: st.legacy.cycle, endings: st.legacy.endings })})`);
    await p.waitForTimeout(6500);
    const txt = await p.evaluate(() => document.body.innerText);
    check(/DURCHLAUF 02/.test(txt), '  the title says DURCHLAUF 02');
    check(await p.evaluate(() => !!GameEngine.state.zieldaten()) && /ZIELDATEN/.test(txt), '  the coordinates are still on the title screen');
    check(await p.locator('#newCycleBtn').count() === 0, '  no second new cycle before this one reaches Chapter 9');
    check(errs.length === 0, '  no page errors' + (errs.length ? ': ' + errs[0] : '')); await ctx.close(); }

  console.log('\n[B] a cycle-2 save keeps its achievements through reloads and export/import');
  { const { ctx, p, errs } = await H.open(b, '/index.html', CYCLE2());
    await p.waitForTimeout(1500);
    await p.reload(); await p.waitForTimeout(1500);
    const st = await saved(p);
    check(EARNED1.every(a => st.achievementsUnlocked.includes(a)), '  nothing is dropped although this cycle has not earned them yet');
    const code = await p.evaluate(() => GameEngine.state.exportSave());
    const r = await p.evaluate(c => GameEngine.state.importSave(c), code);
    check(r.ok && !r.edited && !r.dropped.length, `  its own export imports unedited (${JSON.stringify(r)})`);
    const st2 = await saved(p);
    check(EARNED1.every(a => st2.achievementsUnlocked.includes(a)) && st2.legacy.cycle === 2, '  and keeps everything');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[C] no new cycle before Chapter 9; old saves carry no legacy record');
  { const { ctx, p } = await H.open(b, '/index.html', H.save({ chaptersCompleted: H.ALL, signalsFound: H.SIG, flags: { zieldaten: true } }));
    await p.waitForTimeout(6500);
    check(await p.locator('#newCycleBtn').count() === 0, '  Chapter 8 done, Chapter 9 not: no [ NEUER DURCHLAUF ]');
    check((await saved(p)).legacy === null && await p.evaluate(() => GameEngine.state.cycle()) === 1, '  a first-cycle save stays exactly as it was (legacy null, cycle 1)');
    await ctx.close(); }
  { const { ctx, p } = await H.open(b, '/index.html', H.save({ legacy: { cycle: 'x', earned: 5 } }));
    await p.waitForTimeout(800);
    check((await saved(p)).legacy === null, '  a malformed legacy record is discarded, not trusted');
    await ctx.close(); }

  console.log('\n[D] cycle 2: Archivar still needs Chapter 8 without a hint — this cycle');
  for (const useHint of [false, true]) {
    const { ctx, p, errs } = await H.open(b, '/chapter8/chapter8.html', CYCLE2({ chaptersCompleted: H.done(8) }));
    await p.waitForTimeout(3000); await H.settled(p); await H.drain(p); await p.waitForTimeout(300); await H.drain(p);
    await hs(p, 'Rekonstruktionstisch'); await H.drain(p);
    const go = p.locator('.choice-btn', { hasText: 'Fragmente sichten' }); if (await go.count()) { await go.click(); await p.waitForTimeout(200); }
    for (let i = 0; i < 6; i++) { await H.drain(p); await p.waitForTimeout(200); }
    if (useHint) { await p.locator('#hintBtnR3MI').click({ force: true }); await p.waitForTimeout(200); await H.drain(p); }
    const inst = (await saved(p)).ch8_progress.inst;
    const nearly = inst.sol.slice(); [nearly[0], nearly[1]] = [nearly[1], nearly[0]];
    await p.evaluate(pos => { const s = JSON.parse(localStorage.getItem('ka2_save_v1')); s.ch8_progress.pos = pos; localStorage.setItem('ka2_save_v1', JSON.stringify(s)); }, { board: nearly, rot: inst.sol.map(() => 0) });
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000); await H.settled(p); await H.drain(p); await p.waitForTimeout(300); await H.drain(p);
    if (!(await p.locator('#rkModal:not(.hidden)').count())) { await hs(p, 'Rekonstruktionstisch'); await H.drain(p); }
    await p.locator('.rk-tile[data-slot="0"]').click(); await p.locator('.rk-tile[data-slot="1"]').click(); await p.waitForTimeout(600);
    const st = await saved(p);
    check(st.chaptersCompleted.includes('ch8'), `  ${useHint ? 'with a hint' : 'without a hint'}: the board is solved`);
    check(st.achievementsUnlocked.includes('archivar') === !useHint, `  …and Archivar is ${useHint ? 'not ' : ''}earned`);
    check(errs.length === 0, '  no page errors'); await ctx.close();
  }

  console.log('\n[E] cycle 2: Chapter 9 offers the final choice again — another ending, another achievement');
  { const cp = { act: 5, records: {}, signalDone: true, facedFirst: 'vtgm', asked: { used: 1, why: 1, others: 1 }, consoleSeen: true, burstSeen: true, optional: {} };
    const { ctx, p, errs } = await H.open(b, '/chapter9/chapter9.html', CYCLE2({ chaptersCompleted: H.ALL, signalsFound: H.SIG, flags: { zieldaten: true }, ch9_progress: cp }));
    await p.waitForTimeout(3000); await H.settled(p); await H.drain(p); await p.waitForTimeout(600); await H.drain(p);
    await p.locator('.choice-btn', { hasText: 'Empfänger' }).click(); await p.waitForTimeout(300);
    for (let i = 0; i < 40 && !(await p.locator('.choice-btn', { hasText: 'Ich komme zurück' }).count()); i++) { await H.drain(p); await p.waitForTimeout(250); }
    await p.locator('.choice-btn', { hasText: 'Ich komme zurück' }).click(); await p.waitForTimeout(400);
    const st = await saved(p);
    check(st.achievementsUnlocked.includes('will_return') && st.achievementsUnlocked.includes('said_hiii'), '  "Ich komme zurück" now sits next to the first cycle\'s "Hiii."');
    check(st.flags.ch9_ending === 'ret', '  this cycle\'s ending is recorded');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[F] a few remembered lines in cycle 2, none in cycle 1');
  for (const [label, sv, want] of [['cycle 1', H.save({}), false], ['cycle 2', CYCLE2(), true]]) {
    { const { ctx, p } = await H.open(b, '/access.html', sv);
      await p.waitForTimeout(1000); await p.locator('#verifyBtn').click(); await p.waitForTimeout(3500);
      const t = await p.locator('#accessRows').innerText();
      check(/WIEDERERKANNT/.test(t) === want, `  ${label}: entrance signature ${want ? 'WIEDERERKANNT' : 'ERFASST'}`);
      await ctx.close(); }
    { const { ctx, p } = await H.open(b, '/chapter0/chapter0.html', sv);
      await p.waitForTimeout(3800); await H.drain(p);
      for (let i = 0; i < 25 && !(await p.evaluate(() => GameEngine.dialogue.history().some(l => /ARCHIVTERMINAL/.test(l.text)))); i++) {
        await p.locator('[aria-label="Archivterminal untersuchen"]').first().click({ force: true }).catch(() => {}); await p.waitForTimeout(250); await H.drain(p);
      }
      const h = await p.evaluate(() => GameEngine.dialogue.history().map(l => l.text).join(' | '));
      check(/DIE ANLAGE HAT DICH NICHT VERGESSEN/.test(h) === want, `  ${label}: Chapter 0 terminal ${want ? 'remembers' : 'says nothing extra'}`);
      await ctx.close(); }
  }

  { const c1 = H.fs.readFileSync(H.path.join(H.ROOT, 'chapter1/chapter1.js'), 'utf8'), c9 = H.fs.readFileSync(H.path.join(H.ROOT, 'chapter9/chapter9.js'), 'utf8');
    check(/CYCLE > 1 \? say\(REMEMBERED, act2_minimumExposition\)/.test(c1) && /Have we… met before/.test(c1), '  Chapter 1: the first meeting gets its flicker of recognition only in cycle 2+');
    check(/cyc > 1 \? \[\{ speaker:'SYSTEM', text:'Diesmal wirkt keiner der beiden überrascht\.' \}\]/.test(c9), '  Chapter 9: one quiet line only in cycle 2+'); }
  await b.close(); finish();
})();
