/* Chapter 4 findings from the total audit, pinned: resume without replaying
   the arrival, the balance's double tap, stale module status, the phantom
   STEUERLAUF, the achievement earned with the solve, an optional reply menu
   that really is optional, and a revisit door that simply leads on. */
const H = require('./helpers');
const { check, finish } = H.checker('ch4_softlock');

const MODS = over => Object.assign({
  pattern: { solved: false, output: null, opened: 0, fails: 0 },
  weight:  { solved: false, output: null, opened: 0, fails: 0 },
  timing:  { solved: false, output: null, opened: 0, fails: 0 },
  orient:  { solved: false, output: null, opened: 0, fails: 0 },
}, over || {});
const seed = (mods, done) => {
  const sv = H.save({ chaptersCompleted: done || ['ch0', 'ch1', 'ch2', 'ch3'] });
  if (mods) sv.chapterState = { ch4: { modules: mods, finalSolved: false, sigFound: false, froschiMentioned: true, seen: {}, talkSeen: {}, praise: 0 } };
  return sv;
};
const hs = async (p, aria) => { await p.locator(`#sceneHotspots [aria-label="${aria}"]`).first().click({ force: true }); await p.waitForTimeout(150); };
const act = async (p, sel) => { await p.locator(`#modModal ${sel}`).first().click(); await p.waitForTimeout(80); };
const status = p => p.locator('#modStatus').innerText();
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')));

(async () => {
  const b = await H.launch();

  console.log('\n[A] a checkpoint with nothing solved resumes at the bench, not at the arrival');
  { const { ctx, p, errs } = await H.open(b, '/chapter4/chapter4.html', seed(MODS({ pattern: { solved: false, output: null, opened: 1, fails: 0 } })));
    await p.waitForTimeout(2000);
    const first = await H.lastLine(p);
    check(/ZENTRALVERSCHLUSS: 0 \/ 4/.test(first), `  first line after the reload: "${first.slice(0, 50)}…"`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[B] the balance: a repeat is free, the log is tracked, and nobody is ever made to guess');
  { const { ctx, p, errs } = await H.open(b, '/chapter4/chapter4.html', seed(MODS()));
    await p.waitForTimeout(2000); await H.drain(p);
    await hs(p, 'Prüfwaage untersuchen'); await H.drain(p);
    const runs = async () => +(/(\d) \/ 5/.exec(await p.locator('#modModal .vs-note').first().innerText()) || [0, -1])[1];
    const lines = () => p.locator('#modModal .vs-log li:not(.vs-log-empty)').count();
    await act(p, '[data-act="w-sel"][data-ring="0"]'); await act(p, '[data-act="w-sel"][data-ring="1"]');
    await p.locator('#modModal [data-act="w-run"]').dblclick(); await p.waitForTimeout(200);
    check((await lines()) === 1 && (await runs()) === 4, `  a double tap weighs once (${await lines()} line, ${await runs()} / 5 left)`);
    check(/SCHON GEWOGEN/.test(await status(p)), `  the second press reads the log back for free ("${await status(p)}")`);
    let fixed = false, stuckAt0 = false;
    for (const [x, y] of [[0, 2], [0, 3], [1, 2], [1, 3], [2, 3]]) {
      await act(p, '[data-act="w-clear"]'); await act(p, `[data-act="w-sel"][data-ring="${x}"]`); await act(p, `[data-act="w-sel"][data-ring="${y}"]`);
      if (await p.locator('#modModal [data-act="w-run"]').isDisabled()) { if (!fixed) stuckAt0 = true; continue; }   // off only once the ranking is fixed
      await act(p, '[data-act="w-run"]');
      if (/LEGT DIE RANGFOLGE JETZT FEST/.test(await status(p))) fixed = true;
    }
    check(!stuckAt0, '  [ WIEGEN ] was never dead while the order was still open');
    check(fixed, '  the log announced once it fixed the ranking');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[C] a module never opens under another module\'s status; a cut-short STEUERLAUF does not stay lit');
  { const { ctx, p, errs } = await H.open(b, '/chapter4/chapter4.html', seed(MODS({ pattern: { solved: true, output: 1, opened: 1, fails: 0 } })));
    await p.waitForTimeout(2000); await H.drain(p);
    await hs(p, 'Markierstrecke untersuchen'); await H.drain(p);
    check(/HINTERLEGT/.test(await status(p)), '  (the solved module shows its green status)');
    await act(p, '[data-act="close"]');
    await hs(p, 'Prüfwaage untersuchen'); await H.drain(p);
    check(!/HINTERLEGT/.test(await status(p)), `  the unsolved balance opens with a clean status ("${await status(p)}")`);
    await act(p, '[data-act="close"]');
    await hs(p, 'Kolbensteuerung untersuchen'); await H.drain(p);
    for (let k = 0; k < 4; k++) await act(p, `[data-act="t-slot"][data-slot="${k}"][data-ring="${k}"]`);
    await act(p, '[data-act="t-check"]'); await p.waitForTimeout(350);
    await act(p, '[data-act="close"]');
    await hs(p, 'Kolbensteuerung untersuchen'); await p.waitForTimeout(200);
    const t = await p.evaluate(() => ({ st: document.getElementById('modStatus').textContent, lit: document.querySelectorAll('#modModal .vs-piston.fire').length }));
    check(!/STEUERLAUF/.test(t.st) && t.lit === 0, `  re-opened KOLBENSTEUERUNG is idle (${JSON.stringify(t)})`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[D] the lock: the achievement comes with the solve; the reply menu can be passed with [ WEITER ]');
  { // pattern ● = 1, weight → ring III (2), timing I→II→III→IV, orient ↻: rings read [3, 0, 1, 2]
    const { ctx, p, errs } = await H.open(b, '/chapter4/chapter4.html', seed(MODS({
      pattern: { solved: true, output: 1, opened: 1, fails: 0 }, weight: { solved: true, output: 2, opened: 1, fails: 0 },
      timing:  { solved: true, output: [0, 1, 2, 3], opened: 1, fails: 0 }, orient: { solved: true, output: 1, opened: 1, fails: 0 } })));
    await p.waitForTimeout(2000); await H.drain(p);
    await hs(p, 'Zentralverschluss untersuchen'); await H.drain(p);
    for (const [r, n] of [[0, 3], [2, 1], [3, 2]]) for (let i = 0; i < n; i++) await act(p, `[data-act="f-ring"][data-ring="${r}"]`);
    await act(p, '[data-act="f-check"]'); await p.waitForTimeout(300);
    const s1 = await saved(p);
    check(s1.chaptersCompleted.includes('ch4') && s1.achievementsUnlocked.includes('ch4_complete'), '  ch4 and "Teil für Teil" are saved at the solve');
    await H.drain(p); await p.waitForTimeout(300);
    const weiter = p.locator('.choice-btn', { hasText: 'WEITER' });
    check(await weiter.count() === 1, '  the OPTIONAL reply menu offers [ WEITER ]');
    await weiter.click(); await p.waitForTimeout(200); await H.drain(p); await p.waitForTimeout(400);
    check(await p.locator('#chapterComplete:not(.hidden)').count() === 1, '  and the ending runs on to the card');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[E] revisit: solved readouts show no empty value; the SEKTOR 05 door leads on');
  { const { ctx, p, errs } = await H.open(b, '/chapter4/chapter4.html', seed(null, ['ch0', 'ch1', 'ch2', 'ch3', 'ch4']));
    await p.waitForTimeout(2000); await H.drain(p);
    await hs(p, 'Markierstrecke untersuchen'); await H.drain(p);
    check(await p.locator('#modModal .vs-done-val').count() === 0, '  no "—" value line on a revisit');
    await act(p, '[data-act="close"]');
    await hs(p, 'Sektor 05 betreten'); await H.drain(p); await p.waitForTimeout(900);
    check(/chapter5\/chapter5\.html/.test(p.url()), `  the door led to Sektor 05 (${p.url().split('/').slice(-2).join('/')})`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  await b.close(); finish();
})();
