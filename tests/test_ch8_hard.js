/* Chapter 8 VERSCHÄRFT (NG+ hard mode): the same 3×4 table and rules, dealt
   only as an instance with four or five archive notes — each proven unique
   with no spare note (analyse_ch8.js, [1b]). Here, in the page: the dealt
   instance obeys that, AGN-H3R says fewer notes survived, a no-hint solve
   still earns Archivar, a stored instance that no longer meets the hard
   standard is thrown away and dealt fresh, and NORMAL NG+ is unchanged. */
const H = require('./helpers');
const { check, finish } = H.checker('ch8_hard');
const LEGACY = { cycle: 2, earned: [], endings: ['ret'], zieldaten: true, lastEnding: 'ret' };
const saveFor = mode => H.save({ chaptersCompleted: H.done(8), ...(mode != null ? { legacy: LEGACY, mode } : {}) });
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')));
const hs = async (p, aria) => { await p.locator(`#sceneHotspots [aria-label="${aria}"]`).first().click({ force: true }); await p.waitForTimeout(150); };
const tile = (p, s) => p.locator(`.rk-tile[data-slot="${s}"]`).click();
const swap = async (p, a, b) => { await tile(p, a); await tile(p, b); await p.waitForTimeout(40); };
const hist = p => p.evaluate(() => GameEngine.dialogue.history().map(l => l.text));
async function toBoard(p) {
  await p.waitForTimeout(3000); await H.settled(p); await H.drain(p); await p.waitForTimeout(300); await H.drain(p);
  await hs(p, 'Rekonstruktionstisch'); await H.drain(p);
  const go = p.locator('.choice-btn', { hasText: 'Fragmente sichten' });
  if (await go.count()) { await go.click(); await p.waitForTimeout(200); }
  for (let i = 0; i < 6; i++) { await H.drain(p); await p.waitForTimeout(200); }
  if (!(await p.locator('#rkModal:not(.hidden)').count())) { await hs(p, 'Rekonstruktionstisch'); await H.drain(p); }
}
const HARD_LINE = /weniger Notizen erhalten/;

(async () => {
  const b = await H.launch();

  console.log('\n[A] VERSCHÄRFT deals 4–5 notes, says so once, and a no-hint solve earns Archivar');
  { const { ctx, p, errs } = await H.open(b, '/chapter8/chapter8.html', saveFor('hard'));
    await toBoard(p);
    const inst = (await saved(p)).ch8_progress.inst;
    check(inst.notes.length >= 4 && inst.notes.length <= 5, `  ${inst.notes.length} archive notes`);
    check(HARD_LINE.test((await hist(p)).join(' | ')), '  AGN-H3R: fewer notes survived, each carries more');
    await p.locator('#rkActions button', { hasText: 'NOTIZEN' }).first().click().catch(() => {}); await p.waitForTimeout(200);
    const listed = await p.locator('.rk-notes:not(.rk-notes-fixed) li').count();
    check(listed === inst.notes.length, `  the notes sheet lists exactly those ${listed}`);
    await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(150);
    await p.evaluate(() => { const c = document.querySelector('#rkSheet .rk-sheet-close, #rkSheetClose'); if (c) c.click(); });
    const nearly = inst.sol.slice(); [nearly[3], nearly[8]] = [nearly[8], nearly[3]];
    await p.evaluate(pos => { const s = JSON.parse(localStorage.getItem('ka2_save_v1')); s.ch8_progress.pos = pos; localStorage.setItem('ka2_save_v1', JSON.stringify(s)); }, { board: nearly, rot: inst.sol.map(() => 0) });
    await p.reload({ waitUntil: 'domcontentloaded' }); await toBoard(p);
    check((await saved(p)).ch8_progress.inst.sol.join() === inst.sol.join(), '  a reload keeps the same hard instance');
    await swap(p, 3, 8); await p.waitForTimeout(500);
    const st = await saved(p);
    check(st.chaptersCompleted.includes('ch8') && st.achievementsUnlocked.includes('archivar'), '  sector complete, "archivar" earned with no hint');
    check(st.mode === 'hard' && st.legacy && st.legacy.cycle === 2, '  the NG+ record and the mode are untouched');
    check(errs.length === 0, '  no page errors' + (errs.length ? ': ' + errs.join(' | ') : '')); await ctx.close(); }

  console.log('\n[B] a stored instance below the hard standard is dealt fresh, never shown');
  { const { ctx, p, errs } = await H.open(b, '/chapter8/chapter8.html', saveFor('hard'));
    await toBoard(p);
    const inst = (await saved(p)).ch8_progress.inst;
    // a spare note (a copy) — still true on the solution, but no longer minimal
    await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('ka2_save_v1')); const n = s.ch8_progress.inst.notes; n.push(n[0].slice()); localStorage.setItem('ka2_save_v1', JSON.stringify(s)); });
    await p.reload({ waitUntil: 'domcontentloaded' }); await toBoard(p);
    const again = (await saved(p)).ch8_progress.inst;
    check(again.notes.length >= 4 && again.notes.length <= 5 && JSON.stringify(again.notes) !== JSON.stringify(inst.notes.concat([inst.notes[0]])),
          `  replaced by a fresh ${again.notes.length}-note instance`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[C] NORMAL NG+ and a first run keep the normal archive');
  for (const [label, mode] of [['NORMAL NG+', ''], ['first run', null]]) {
    const counts = new Set(); let line = false, errsAll = [];
    for (let i = 0; i < 6; i++) {
      const { ctx, p, errs } = await H.open(b, '/chapter8/chapter8.html', saveFor(mode));
      await toBoard(p);
      counts.add((await saved(p)).ch8_progress.inst.notes.length);
      if (HARD_LINE.test((await hist(p)).join(' | '))) line = true;
      errsAll.push(...errs); await ctx.close();
    }
    check(!line, `  ${label}: no VERSCHÄRFT line`);
    check([...counts].every(n => n >= 4 && n <= 7), `  ${label}: note counts ${[...counts].sort().join(',')} (4–7 allowed as before)`);
    check(errsAll.length === 0, '  no page errors');
  }

  console.log('\n[D] phones: the hard table fits');
  for (const vp of [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 844 }]) {
    const { ctx, p, errs } = await H.open(b, '/chapter8/chapter8.html', saveFor('hard'), { viewport: vp, mobile: true });
    await toBoard(p);
    const m = await p.evaluate(() => ({ docW: document.documentElement.scrollWidth, tiles: document.querySelectorAll('.rk-tile').length,
      chk: (() => { const e = document.getElementById('rkCheck'); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t === e || e.contains(t); })() }));
    check(m.docW <= vp.width && m.tiles === 12 && m.chk, `  ${vp.width}×${vp.height}: ${JSON.stringify(m)}`);
    check(errs.length === 0, '  no page errors'); await ctx.close();
  }

  await b.close(); finish();
})();
