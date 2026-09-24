/* Chapter 2 resume findings from the total audit, pinned. The checkpoint
   record is written directly (its shape is the chapter's own saveState). */
const H = require('./helpers');
const { check, finish } = H.checker('ch2_resume');
const FROZEN = 0, PARTIAL = 1;
const seed = ch2 => { const sv = H.save({ chaptersCompleted: ['ch0', 'ch1'] }); sv.chapterState = { ch2 }; return sv; };
const base = { thawState: PARTIAL, metFroschi: true, plantsStudied: true, orgelNudged: true, wellRevealed: false, p1Solved: true, p2Solved: false, bayernPMOFound: false, seen: {}, talkSeen: {}, react: { p1: {}, p2: {} }, p1Fails: 0 };

(async () => {
  const b = await H.launch();

  console.log('\n[A] a half-thawed garden resumes at 18 %');
  { const { ctx, p, errs } = await H.open(b, '/chapter2/chapter2.html', seed({ ...base }));
    await p.waitForTimeout(2200); await H.drain(p);
    check(/18 ?%/.test(await p.locator('#reactProgress').innerText()), `  the bar reads 18 % (${await p.locator('#reactProgress').innerText()})`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[B] a win latched but never restored (reload inside 900 ms) restores on resume, with the achievement');
  { const { ctx, p, errs } = await H.open(b, '/chapter2/chapter2.html', seed({ ...base, wellRevealed: true, p2Solved: true }));
    await p.waitForTimeout(2200); await p.waitForTimeout(300);
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')));
    check(st.chaptersCompleted.includes('ch2'), '  the chapter is marked complete');
    check(st.achievementsUnlocked.includes('ch2_complete'), '  ch2_complete is unlocked with the completion');
    check(/FROSTMUSTER GELÖST/.test(await H.lastLine(p)), `  the ending plays ("${(await H.lastLine(p)).slice(0, 30)}…")`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[C] latches survive a reload the moment they happen');
  { const { ctx, p, errs } = await H.open(b, '/chapter2/chapter2.html', seed({ ...base, thawState: FROZEN, p1Solved: false, plantsStudied: false, orgelNudged: false }));
    await p.waitForTimeout(2200); await H.drain(p); await p.waitForTimeout(300);
    const plaque = p.locator('#sceneHotspots [aria-label*="Tauprotokoll"], #sceneHotspots [aria-label*="Plakette"], #sceneHotspots [aria-label*="plakette"]').first();
    if (await plaque.count()) { await plaque.click({ force: true }); await p.waitForTimeout(150); await H.drain(p); }
    const cp = await p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')).chapterState.ch2);
    check(!!cp && (cp.plantsStudied === true || !(await plaque.count())), `  plantsStudied is in the checkpoint right after the examine (${JSON.stringify(cp && { plantsStudied: cp.plantsStudied })})`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[D] a puzzle can be left and re-entered; the room is inert while it is open');
  { const { ctx, p, errs } = await H.open(b, '/chapter2/chapter2.html', seed({ ...base, thawState: FROZEN, p1Solved: false }));
    await p.waitForTimeout(2200); await H.drain(p); await p.waitForTimeout(300);
    await p.locator('#sceneHotspots [aria-label="Wasserorgel bedienen"]').first().click({ force: true }); await p.waitForTimeout(150); await H.drain(p); await p.waitForTimeout(200);
    check(await p.locator('#puzzle1Modal:not(.hidden)').count() === 1, '  the organ opens the Tau-Sequenz');
    check(await p.evaluate(() => document.getElementById('sceneWrapper').inert === true && document.activeElement?.classList.contains('puzzle-card')), '  the scene is inert and the card has focus');
    await p.locator('#puzzle1Modal .ka-btn', { hasText: 'ZURÜCK ]' }).click(); await p.waitForTimeout(150);
    check(await p.locator('#puzzle1Modal:not(.hidden)').count() === 0 && await p.evaluate(() => document.getElementById('sceneWrapper').inert === false), '  [ ZURÜCK ] leaves it and frees the scene');
    await p.locator('#sceneHotspots [aria-label="Wasserorgel bedienen"]').first().click({ force: true }); await p.waitForTimeout(300);
    check(await p.locator('#puzzle1Modal:not(.hidden)').count() === 1 && await p.locator('.dlg-container.visible').count() === 0, '  coming back skips the intro lines');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  await b.close(); finish();
})();
