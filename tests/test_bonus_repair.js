/* Old completed beta saves: the truth sequence in Chapter 9 sets
   truth_revealed and awards ??? (bonus_found) and Die Wahrheit in one step,
   but some beta saves came back with the flag and without ???. Loading such a
   save restores ??? — on the strength of the flag, which the save checks only
   keep with Sektor 08 finished and all five signals found — without replaying
   Chapter 9. The visible achievement alone is not trusted.
   Also: the beta-test credit is in the credits, on a phone too. */
const H = require('./helpers');
const { check, finish } = H.checker('bonus_repair');
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')));

// shaped like a completed beta run: older schema, beta provenance, the truth
// sequence done (flag + Die Wahrheit + chamber), but ??? missing
const BETA = (over = {}) => ({
  version: '1.0.0-beta', schemaVersion: 3, provenance: 'beta', firstPlay: false,
  chaptersCompleted: H.ALL.slice(), signalsFound: H.SIG.slice(), puzzlesSolved: {}, chapterState: {},
  calibration: Object.fromEntries(H.ALL.filter(c => c !== 'ch0').map(c => [c, true])),
  flags: { truth_revealed: true, zieldaten: true, ka1_verified: true }, settings: { muted: true },
  achievementsUnlocked: ['first_boot', ...H.ALL.map(c => c + '_complete'), 'signal_first', 'signal_all', 'chamber', 'truth', 'all_guests'],
  ...over,
});

(async () => {
  const b = await H.launch();

  console.log('\n[A] an old completed beta save gets ??? back on load — on the title, no Chapter 9');
  { const { ctx, p, errs } = await H.open(b, '/index.html', BETA());
    await p.waitForTimeout(1500);
    const sv = await saved(p);
    check(sv.achievementsUnlocked.includes('bonus_found'), '  bonus_found restored');
    check(sv.achievementsUnlocked.includes('truth') && sv.flags.truth_revealed === true && sv.chaptersCompleted.length === 9 && sv.signalsFound.length === 5, '  nothing else lost');
    check(!/chapter9/.test(p.url()) && !(await p.evaluate(() => GameEngine.dialogue.history().length)), '  no Chapter 9 page, no line replayed');
    await p.evaluate(() => GameEngine.achievements.showOverlay()); await p.waitForTimeout(200);
    const item = await p.evaluate(() => { const i = GameEngine.achievements.listed().findIndex(a => a.id === 'bonus_found');
      return document.querySelectorAll('#achievementList .ach-item')[i]?.className || ''; });
    check(/unlocked/.test(item), '  and the list shows it as earned (still titled ???)');
    check(errs.length === 0, '  no page errors ' + errs.join(';')); await ctx.close(); }

  console.log('\n[B] …and through an imported code as well');
  { const { ctx, p, errs } = await H.open(b, '/index.html', H.save({}));
    await p.waitForTimeout(1200);
    const code = Buffer.from(unescape(encodeURIComponent(JSON.stringify(BETA())))).toString('base64');
    const r = await p.evaluate(c => GameEngine.state.importSave(c), code);
    check(r.ok && (await saved(p)).achievementsUnlocked.includes('bonus_found'), '  import repairs it too');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[C] only real evidence counts');
  { const { ctx, p, errs } = await H.open(b, '/index.html', BETA({ signalsFound: H.SIG.slice(0, 4) }));
    await p.waitForTimeout(1200);
    const sv = await saved(p);
    check(!sv.flags.truth_revealed && !sv.achievementsUnlocked.includes('bonus_found'), '  flag without all five signals: the flag is dropped, no ???');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }
  { const { ctx, p, errs } = await H.open(b, '/index.html', BETA({ flags: { zieldaten: true, ka1_verified: true } }));
    await p.waitForTimeout(1200);
    const sv = await saved(p);
    check(!sv.achievementsUnlocked.includes('bonus_found') && !sv.achievementsUnlocked.includes('truth'), '  Die Wahrheit without the flag: not trusted, no ???');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }
  { const { ctx, p, errs } = await H.open(b, '/index.html', H.save({ chaptersCompleted: H.done(5) }));
    await p.waitForTimeout(1200);
    check(!(await saved(p)).achievementsUnlocked.includes('bonus_found'), '  a run in progress gains nothing');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[E] the rest of Chapter 9\'s awards, Erstkontakt and Gute Gesellschaft: restored from their evidence');
  { // the flag survived, the awards did not: Die Wahrheit, ??? and the platinum come back together
    const ach = ['first_boot', ...H.ALL.map(c => c + '_complete'), 'signal_first', 'signal_all', 'chamber', 'all_guests', 'italian_brainrot', 'bayern_pmo', 'archivar', 'jigsaw_refused'];
    const { ctx, p, errs } = await H.open(b, '/index.html', BETA({ achievementsUnlocked: ach }));
    await p.waitForTimeout(1200);
    const sv = await saved(p);
    check(['truth', 'bonus_found', 'ch9_complete'].every(a => sv.achievementsUnlocked.includes(a)), '  truth_revealed present: Die Wahrheit, ??? and the platinum are restored together (a save with nothing left to earn could never fire the platinum again)');
    const left = await p.evaluate(() => GameEngine.achievements.listed().filter(a => !GameEngine.achievements.isUnlocked(a.id)).map(a => a.id));
    check(left.length === 0, `  the save manager can read ${await p.evaluate(() => GameEngine.achievements.listed().length)} / ${await p.evaluate(() => GameEngine.achievements.listed().length)} (not earned: ${left.join(',') || 'none'})`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }
  { // Erstkontakt: a save that has been past the first page has it; one that has not, does not
    const { ctx, p, errs } = await H.open(b, '/index.html', BETA({ firstPlay: false, achievementsUnlocked: [] , chaptersCompleted: ['ch0'], signalsFound: [], flags: { ka1_verified: true } }));
    await p.waitForTimeout(1200);
    check((await saved(p)).achievementsUnlocked.includes('first_boot'), '  firstPlay false (the first page was left within 1.2 s): Erstkontakt restored');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }
  { const { ctx, p, errs } = await H.open(b, '/access.html', BETA({ firstPlay: true, achievementsUnlocked: [], chaptersCompleted: [], signalsFound: [], flags: {} }));
    await p.waitForTimeout(1200);
    check(!(await saved(p)).achievementsUnlocked.includes('first_boot'), '  a first visit still has nothing: no Erstkontakt before the player is in');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }
  { // Gute Gesellschaft: the evidence is a finished Sektor 08, not one step less
    const mk = n => H.save({ chaptersCompleted: H.done(n), achievementsUnlocked: [] });
    const { ctx, p } = await H.open(b, '/index.html', mk(9)); await p.waitForTimeout(1000);
    check((await saved(p)).achievementsUnlocked.includes('all_guests'), '  Sektor 08 finished: Gute Gesellschaft restored');
    await ctx.close();
    const r = await H.open(b, '/index.html', mk(8)); await r.p.waitForTimeout(1000);
    check(!(await saved(r.p)).achievementsUnlocked.includes('all_guests'), '  Sektor 07 the last one finished: not yet');
    await r.ctx.close(); }

  console.log('\n[D] the beta-test credit');
  for (const vp of [{ width: 1280, height: 800 }, { width: 320, height: 568 }]) {
    const { ctx, p, errs } = await H.open(b, '/index.html', H.save({}), { viewport: vp, mobile: vp.width < 500 });
    await p.waitForTimeout(1200);
    await p.evaluate(() => GameEngine.showCredits()); await p.waitForTimeout(300);
    const t = await p.locator('#creditsOverlay').innerText();
    check(/BETA-TESTS \/\/ TEST & FEEDBACK/.test(t) && /hihatzz/.test(t) && /TeamReiselustigen/.test(t) && /Vielen Dank fürs Testen/.test(t), `  ${vp.width}px: section, both names and the thanks`);
    const m = await p.evaluate(() => ({ sx: document.scrollingElement.scrollWidth - innerWidth, over: [...document.querySelectorAll('.cr-testers span')].some(s => s.getBoundingClientRect().right > innerWidth) }));
    check(m.sx <= 0 && !m.over, `  ${vp.width}px: nothing runs off the side`);
    check(errs.length === 0, '  no page errors'); await ctx.close();
  }

  await b.close(); finish();
})();
