/* KA-II is one save that reaches 100 %. For a short while the live build let
   a finished save start a second calibration cycle (NG+); that option is
   gone. A save that already began one must still load unharmed: what it
   earned stays earned, its coordinates stay on the title, and its export
   code still imports without an "edited" warning. No way to start a new
   cycle is offered anywhere. */
const H = require('./helpers');
const { check, finish } = H.checker('legacy_cycle');

// exactly what the live NG+ build wrote on starting cycle 2
const EARNED = ['first_boot','ch0_complete','ch1_complete','ch2_complete','ch3_complete','ch4_complete','ch5_complete','ch6_complete','ch7_complete','ch8_complete',
  'signal_first','signal_all','chamber','bonus_found','truth','will_return','ch9_complete','all_guests'];
const cycle2 = (over = {}) => H.save({ chaptersCompleted: ['ch0'], achievementsUnlocked: EARNED.slice(),
  legacy: { cycle: 2, earned: EARNED.slice(), endings: ['ret'], zieldaten: true }, ...over });
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')));

(async () => {
  const b = await H.launch();

  console.log('\n[A] a save in its second cycle keeps everything it earned');
  { const { ctx, p, errs } = await H.open(b, '/index.html', cycle2());
    await p.waitForTimeout(1500); await p.keyboard.press('Escape'); await p.waitForTimeout(900);
    const sv = await saved(p);
    check(EARNED.every(a => sv.achievementsUnlocked.includes(a)), `  all ${EARNED.length} earlier achievements are still unlocked`);
    check(sv.legacy && sv.legacy.cycle === 2 && sv.chaptersCompleted.join() === 'ch0', '  the record and this cycle\'s own progress are left as they were');
    check(await p.evaluate(() => GameEngine.state.hasZieldaten() && GameEngine.state.zieldaten().length > 0), '  the coordinates are still readable');
    check(await p.locator('#newCycleBtn, #newCycleOverlay').count() === 0 && !/NEUER DURCHLAUF/.test(await p.locator('body').innerText()), '  no NEUER DURCHLAUF anywhere');
    check(typeof (await p.evaluate(() => GameEngine.state.newCycle)) === 'undefined', '  and no way to start one in the engine');
    check(errs.length === 0, '  no page errors ' + errs.join(';')); await ctx.close(); }

  console.log('\n[B] its export code imports back unchanged and unflagged');
  { const { ctx, p, errs } = await H.open(b, '/index.html', cycle2());
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => { const code = GameEngine.state.exportSave(); return GameEngine.state.importSave(code); });
    check(r.ok && !r.edited && !(r.dropped || []).length, `  import: ${JSON.stringify(r)}`);
    check((await saved(p)).legacy?.cycle === 2, '  the record survives the round trip');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[C] a broken record is dropped, not believed; an ordinary save gains nothing');
  { const { ctx, p, errs } = await H.open(b, '/index.html', H.save({ chaptersCompleted: ['ch0'], achievementsUnlocked: ['truth', 'ch8_complete'], legacy: { cycle: 1, earned: ['truth'] }, mode: 'hard' }));
    await p.waitForTimeout(1200);
    const sv = await saved(p);
    check(!('legacy' in sv) && !('mode' in sv), '  a "cycle 1" record and the never-shipped mode are removed');
    check(!sv.achievementsUnlocked.includes('truth') && !sv.achievementsUnlocked.includes('ch8_complete'), '  and it does not protect achievements the save never earned');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }
  { const { ctx, p, errs } = await H.open(b, '/index.html', H.save({ chaptersCompleted: H.done(3) }));
    await p.waitForTimeout(1200);
    const sv = await saved(p);
    check(!('legacy' in sv) && !(await p.evaluate(() => GameEngine.state.hasZieldaten())), '  a normal save stays a normal save');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  await b.close(); finish();
})();
