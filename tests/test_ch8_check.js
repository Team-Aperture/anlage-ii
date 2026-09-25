/* Chapter 8: the ARCHIVKOHÄRENZ readout is taken only on [ PRÜFEN ]. A move
   never re-reads it (it only goes stale), a check spends no hint, a tap over
   a line advances the line, a finished board still locks in on the move that
   finishes it, and a reload shows the table unchecked on the same board. */
const H = require('./helpers');
const { check, finish } = H.checker('ch8_check');
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')));
const hs = async (p, aria) => { await p.locator(`#sceneHotspots [aria-label="${aria}"]`).first().click({ force: true }); await p.waitForTimeout(150); };
const coh = p => p.locator('#rkCoh').innerText();
const tile = (p, s) => p.locator(`.rk-tile[data-slot="${s}"]`).click();
const swap = async (p, a, b) => { await tile(p, a); await tile(p, b); await p.waitForTimeout(40); };
async function toBoard(p) {
  await p.waitForTimeout(3000); await H.settled(p); await H.drain(p); await p.waitForTimeout(300); await H.drain(p);
  await hs(p, 'Rekonstruktionstisch'); await H.drain(p);
  const go = p.locator('.choice-btn', { hasText: 'Fragmente sichten' });
  if (await go.count()) { await go.click(); await p.waitForTimeout(200); }
  for (let i = 0; i < 6; i++) { await H.drain(p); await p.waitForTimeout(200); }
  if (!(await p.locator('#rkModal:not(.hidden)').count())) { await hs(p, 'Rekonstruktionstisch'); await H.drain(p); }
}
async function seed(p, pos) {           // same instance, a chosen position; then back to the table
  await p.evaluate(pos => { const s = JSON.parse(localStorage.getItem('ka2_save_v1')); s.ch8_progress.pos = pos; localStorage.setItem('ka2_save_v1', JSON.stringify(s)); }, pos);
  await p.reload({ waitUntil: 'domcontentloaded' }); await toBoard(p);
}

(async () => {
  const b = await H.launch();

  console.log('\n[A] moves never re-read the meter; [ PRÜFEN ] does, and a later move only marks it stale');
  { const { ctx, p, errs } = await H.open(b, '/chapter8/chapter8.html', H.save({ chaptersCompleted: H.done(8) }));
    await toBoard(p);
    check(await p.locator('#rkModal:not(.hidden)').count() === 1, '  (the table is open)');
    check(await coh(p) === 'UNGEPRÜFT' && await p.locator('#rkCheck:not([disabled])').count() === 1, '  unchecked table, [ PRÜFEN ] enabled');
    const hintBefore = await p.locator('#hintCount').innerText();
    for (let i = 0; i < 25; i++) { const a = (i * 5) % 12, c = (i * 7 + 3) % 12; if (a !== c) await swap(p, a, c); }
    await tile(p, 4); await p.locator('#rkRotate').click(); await tile(p, 4);
    check(await coh(p) === 'UNGEPRÜFT', '  25 swaps and a turn: the readout never moved');
    await p.locator('#rkCheck').click(); await p.waitForTimeout(100);
    const r1 = await coh(p);
    check(['INSTABIL', 'STEIGEND', 'KONSISTENT'].includes(r1) && await p.locator('#rkCohLabel').innerText() === 'ARCHIVKOHÄRENZ'
          && !(await p.locator('#rkCohBox.stale').count()), `  a check reads the board (${r1})`);
    await H.drain(p);
    await swap(p, 0, 1);
    check(await coh(p) === r1 && await p.locator('#rkCohBox.stale').count() === 1 && await p.locator('#rkCohLabel').innerText() === 'LETZTE PRÜFUNG',
          '  after a swap: same value, dimmed, labelled LETZTE PRÜFUNG');
    await swap(p, 0, 1);
    check(!(await p.locator('#rkCohBox.stale').count()), '  swapped back to the checked filing: current again');
    for (let i = 0; i < 5; i++) { await p.locator('#rkCheck').click(); await p.waitForTimeout(60); await H.drain(p); }
    const cp = (await saved(p)).ch8_progress;
    check(cp.hintsUsed === 0 && cp.hintStep === 0 && await p.locator('#hintCount').innerText() === hintBefore, `  six checks spent no hint (${cp.hintStep}/${cp.hintsUsed}, ${hintBefore})`);

    console.log('\n[B] a tap on [ PRÜFEN ] while a line is up advances the line and reads nothing');
    await swap(p, 2, 5);
    await p.evaluate(() => { window.__cb = 0; GameEngine.dialogue.load([{ speaker: 'SYSTEM', text: 'PRÜFLINIE.' }], () => { window.__cb = 1; }); });
    await p.waitForTimeout(150);
    await p.locator('#rkCheck').click({ force: true }); await p.waitForTimeout(200); await H.drain(p);
    check(await p.evaluate(() => window.__cb) === 1 && await p.locator('#rkCohBox.stale').count() === 1, '  the continuation ran; the reading is still the stale one');

    console.log('\n[C] a reload shows the same board, unchecked');
    const before = (await saved(p)).ch8_progress.pos.board.join(',');
    await p.reload({ waitUntil: 'domcontentloaded' }); await toBoard(p);
    const after = await p.evaluate(() => [...document.querySelectorAll('.rk-tile')].length);
    check((await saved(p)).ch8_progress.pos.board.join(',') === before && after === 12, '  same filing after the reload');
    check(await coh(p) === 'UNGEPRÜFT' && !(await p.locator('#rkCohBox.stale').count()), '  and no reading carried over');

    console.log('\n[D] the placing move says nothing; [ PRÜFEN ] brings AGN-H3R\'s line, latched first');
    const inst = (await saved(p)).ch8_progress.inst;
    const nearly = inst.sol.slice(); [nearly[0], nearly[1]] = [nearly[1], nearly[0]];
    const rot = inst.sol.map(() => 0); rot[6] = 1;                       // one fragment turned wrong
    await seed(p, { board: nearly, rot });
    await swap(p, 0, 1); await p.waitForTimeout(700);
    check(!(await p.locator('.dlg-container.visible').count()) && (await saved(p)).ch8_progress.placedSeen === false && await coh(p) === 'UNGEPRÜFT',
          '  placement completed: no line, no reading, nothing latched');
    await p.locator('#rkCheck').click(); await p.waitForTimeout(80);
    check(await coh(p) === 'KONSISTENT' && (await saved(p)).ch8_progress.placedSeen === true, '  the check reads KONSISTENT and latches placedSeen at once');
    await p.waitForTimeout(600);
    const line = await H.lastLine(p);
    check(await p.locator('.dlg-container.visible').count() === 1 && /Die Ablage stimmt/.test(line), `  …then AGN-H3R says so (${line})`);
    await H.drain(p);

    console.log('\n[E] the move that finishes the board still locks it in — no check needed');
    await tile(p, 6); for (let i = 0; i < 3; i++) { await p.locator('#rkRotate').click(); await p.waitForTimeout(40); }
    await p.waitForTimeout(400);
    const st = await saved(p);
    check(await p.locator('#rkBanner.visible').innerText().catch(() => '') === 'REKONSTRUKTION KOHÄRENT', '  REKONSTRUKTION KOHÄRENT');
    check(st.chaptersCompleted.includes('ch8') && st.achievementsUnlocked.includes('archivar'), '  sector complete, "archivar" earned (checks are not hints)');
    check(await p.locator('#rkCheck[disabled]').count() === 1 && await coh(p) === 'KONSISTENT', '  [ PRÜFEN ] is off on the locked board');
    check(errs.length === 0, '  no page errors' + (errs.length ? ': ' + errs.join(' | ') : '')); await ctx.close(); }

  console.log('\n[F] a solved-by-moves board without any check still wins (fresh instance, no reading ever taken)');
  { const { ctx, p, errs } = await H.open(b, '/chapter8/chapter8.html', H.save({ chaptersCompleted: H.done(8) }));
    await toBoard(p);
    const inst = (await saved(p)).ch8_progress.inst;
    const nearly = inst.sol.slice(); [nearly[3], nearly[8]] = [nearly[8], nearly[3]];
    await seed(p, { board: nearly, rot: inst.sol.map(() => 0) });
    check(await coh(p) === 'UNGEPRÜFT', '  (unchecked)');
    await swap(p, 3, 8); await p.waitForTimeout(400);
    check((await saved(p)).chaptersCompleted.includes('ch8'), '  the swap that finishes it completes the sector');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[G] phones: [ DREHEN ] and [ PRÜFEN ] share the first row; the sticky row stays two rows at 360px');
  for (const vp of [{ width: 390, height: 844 }, { width: 360, height: 740 }]) {
    const { ctx, p, errs } = await H.open(b, '/chapter8/chapter8.html', H.save({ chaptersCompleted: H.done(8) }), { viewport: vp });
    await toBoard(p);
    const m = await p.evaluate(() => {
      const row = document.getElementById('rkActions'), r = el => el.getBoundingClientRect();
      const rot = r(document.getElementById('rkRotate')), chk = r(document.getElementById('rkCheck'));
      return { lines: new Set([...row.children].map(c => Math.round(r(c).top))).size, sameRow: Math.round(rot.top) === Math.round(chk.top),
               inView: chk.bottom <= innerHeight && rot.bottom <= innerHeight, docW: document.documentElement.scrollWidth };
    });
    check(m.lines === 2 && m.sameRow && m.inView && m.docW <= vp.width, `  ${vp.width}px: ${JSON.stringify(m)}`);
    check(errs.length === 0, '  no page errors'); await ctx.close();
  }

  await b.close(); finish();
})();
