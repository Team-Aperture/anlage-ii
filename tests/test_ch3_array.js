/* Chapter 3's exposure array, pinned: a hint tap during a stage change
   advances the line instead of freezing the array, the next stage is saved
   before the transition lines, a lost continuation heals on any control, and
   the array can be left and re-entered. Stage 1 is solved from what the scope
   actually shows, the way a player would. */
const H = require('./helpers');
const { check, finish } = H.checker('ch3_array');
const src = H.fs.readFileSync(H.path.join(H.ROOT, 'chapter3/chapter3.js'), 'utf8');

const seed = stage => {
  const sv = H.save({ chaptersCompleted: ['ch0', 'ch1', 'ch2'] });
  sv.chapterState = { ch3: { stage, metLux: true, sigFound: false, logsRead: 0, sawWestgang: false, seen: {}, talkSeen: {}, react: {} } };
  return sv;
};
const stageLabel = p => p.locator('#belStage').innerText();
const cp = p => p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')).chapterState.ch3);

// Watch one recording and name the blende that broke ranks, and when.
async function solveStage1(p) {
  await p.locator('#belObserveBtn').click();
  let found = null;
  for (let i = 0; i < 200 && !found; i++) {
    const f = await p.evaluate(() => {
      const beat = document.querySelector('#belScope .bel-beat')?.textContent || '';
      const on = [...document.querySelectorAll('#belScope .bel-shutter')].map(s => s.classList.contains('flare'));
      return { beat, on };
    });
    if (f.on.length === 4) {
      const lit = f.on.filter(Boolean).length;
      if (lit === 1 || lit === 3) {
        const odd = f.on.findIndex(v => v === (lit === 1));
        const m = /TAKT (\d+)/.exec(f.beat);
        if (m) found = { blend: odd, beat: +m[1] };
      }
    }
    await p.waitForTimeout(60);
  }
  for (let i = 0; i < 100 && /LÄUFT/.test(await p.locator('#belStatus').innerText()); i++) await p.waitForTimeout(100);
  if (!found) return false;
  await p.locator(`#belAnswer .bel-role-btn[data-pick="blend"][data-v="${found.blend}"]`).click();
  await p.locator(`#belAnswer .bel-role-btn[data-pick="beat"][data-v="${found.beat}"]`).click();
  await p.locator('#belSubmitBtn').click();
  await p.waitForTimeout(200);
  return true;
}

(async () => {
  const b = await H.launch();

  console.log('\n[A] a hint tap during the stage change advances the line; the next stage is saved first');
  { const { ctx, p, errs } = await H.open(b, '/chapter3/chapter3.html', seed(1));
    await p.waitForTimeout(2200); await H.drain(p); await p.waitForTimeout(200);
    check(/STUFE 1/.test(await stageLabel(p)), 'resumed on stage 1 with the array open');
    check(await p.evaluate(() => document.getElementById('sceneWrapper').inert === true), '  the room is inert while the array is open');
    check(await solveStage1(p), '  stage 1 solved from the scope');
    check(await p.locator('.dlg-container.visible').count() === 1, '  the transition lines are up');
    check((await cp(p))?.stage === 2, `  the checkpoint already names stage 2 (${(await cp(p))?.stage})`);
    const before = await p.locator('#hintCount').innerText();
    await p.locator('#hintBtnLux').click({ force: true }); await p.waitForTimeout(120);
    await p.locator('#hintBtnLux').click({ force: true }); await p.waitForTimeout(120);
    check((await p.locator('#hintCount').innerText()) === before, `  hint taps during the lines spend nothing (${before})`);
    await H.drain(p); await p.waitForTimeout(300);
    check(/STUFE 2/.test(await stageLabel(p)), `  the array moved on to stage 2 (${await stageLabel(p)})`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[B] a reload during the transition resumes on the next stage');
  { const { ctx, p } = await H.open(b, '/chapter3/chapter3.html', seed(1));
    await p.waitForTimeout(2200); await H.drain(p); await p.waitForTimeout(200);
    await solveStage1(p);
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2200); await H.drain(p); await p.waitForTimeout(200);
    check(/STUFE 2/.test(await stageLabel(p)), `  resumed on stage 2 (${await stageLabel(p)})`);
    await ctx.close(); }

  console.log('\n[C] a lost continuation heals on any control of the array');
  { const { ctx, p, errs } = await H.open(b, '/chapter3/chapter3.html', seed(1));
    await p.waitForTimeout(2200); await H.drain(p); await p.waitForTimeout(200);
    await solveStage1(p);
    // something replaces the running lines and their continuation with it
    await p.evaluate(() => GameEngine.dialogue.load([{ speaker: 'SYSTEM', text: 'STÖRUNG.' }]));
    await H.drain(p); await p.waitForTimeout(200);
    check(/STUFE 1/.test(await stageLabel(p)), '  (the array is stuck between stages)');
    await p.locator('#belSubmitBtn').click(); await p.waitForTimeout(300);
    check(/STUFE 2/.test(await stageLabel(p)) && !(await p.locator('#belObserveBtn').isDisabled()), '  [ ÜBERNEHMEN ] starts stage 2 and the array works again');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[D] the array can be left and re-entered where it stood');
  { const { ctx, p, errs } = await H.open(b, '/chapter3/chapter3.html', seed(2));
    await p.waitForTimeout(2200); await H.drain(p); await p.waitForTimeout(200);
    const label = await stageLabel(p);
    await p.locator('#belBackBtn').click(); await p.waitForTimeout(200);
    check(await p.locator('#belModal.hidden').count() === 1 && await p.locator('#hintBar.hidden').count() === 1, '  [ ZURÜCK ] leaves the array');
    check(await p.evaluate(() => document.getElementById('sceneWrapper').inert === false), '  the room is live again');
    await p.locator('#sceneHotspots [aria-label="Beobachtungsarray untersuchen"]').first().click({ force: true }); await p.waitForTimeout(300);
    check(await p.locator('#belModal:not(.hidden)').count() === 1 && await p.locator('#hintBar:not(.hidden)').count() === 1, '  the array hotspot re-opens it, with its hint bar');
    check((await stageLabel(p)) === label, `  on the same stage (${label})`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    check(await p.locator('#belModal.hidden').count() === 1, '  Escape leaves it too');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[E] the achievement is earned with the completion, not at the end of the ending');
  { const body = src.slice(src.indexOf('function solveBelichtung'), src.indexOf('function act7_quiet'));
    check(/markChapterComplete\(CHAPTER_ID\);\s*try \{ GameEngine\.achievements\.unlock\('ch3_complete'\)/.test(body), '  solveBelichtung unlocks ch3_complete next to markChapterComplete'); }

  await b.close(); finish();
})();
