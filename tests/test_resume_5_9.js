/* Resume and ending fixes in chapters 5–9 and the engine, pinned:
   finished chapters carry their achievement, a hint tap never replaces a
   running line's continuation, and every checkpoint in the middle of a story
   beat leads on — Chapter 6's guest, Chapter 7's crash, Chapter 8's finale,
   Chapter 9's warning and "Die Wahrheit". */
const H = require('./helpers');
const { check, finish } = H.checker('resume_5_9');
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')));
const hs = async (p, aria) => { await p.locator(`#sceneHotspots [aria-label="${aria}"]`).first().click({ force: true }); await p.waitForTimeout(150); };

(async () => {
  const b = await H.launch();

  console.log('\n[A] the save repair: finished chapters carry their achievement; the chamber needs the chamber');
  { const { ctx, p, errs } = await H.open(b, '/index.html', H.save({ chaptersCompleted: H.done(5), achievementsUnlocked: [] }));
    await p.waitForTimeout(800);
    const st = await saved(p);
    check(['ch0', 'ch1', 'ch2', 'ch3', 'ch4'].every(c => st.achievementsUnlocked.includes(c + '_complete')), `  ch0–ch4 achievements restored (${st.achievementsUnlocked.join(',')})`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }
  { const { ctx, p } = await H.open(b, '/index.html', H.save({ chaptersCompleted: H.ALL, signalsFound: H.SIG, achievementsUnlocked: ['chamber'] }));
    await p.waitForTimeout(800);
    check((await saved(p)).achievementsUnlocked.includes('chamber'), '  "Nicht registriert" stays once the chamber is reachable, before the truth');
    await ctx.close(); }
  { const { ctx, p } = await H.open(b, '/index.html', H.save({ chaptersCompleted: H.done(5), achievementsUnlocked: ['chamber'] }));
    await p.waitForTimeout(800);
    check(!(await saved(p)).achievementsUnlocked.includes('chamber'), '  …and is dropped while the chamber cannot be reached');
    await ctx.close(); }

  { const { ctx, p } = await H.open(b, '/index.html', H.save({ chaptersCompleted: H.ALL, achievementsUnlocked: ['ch8_complete', 'coordinates'] }));
    await p.waitForTimeout(800);
    const a = (await saved(p)).achievementsUnlocked;
    check(!a.includes('coordinates') && a.includes('ch8_complete'), '  the retired "Zieldaten erhalten" is folded into "Rekonstruktion"');
    await ctx.close(); }

  console.log('\n[B] Chapter 6: a reload in the opening still meets ASP-1024; a hint tap over a line spends nothing');
  { const { ctx, p, errs } = await H.open(b, '/chapter6/chapter6.html', H.save({ chaptersCompleted: H.done(6) }));
    await p.waitForTimeout(3600); await H.settled(p); await p.waitForTimeout(300);
    check(!!(await saved(p)).ch6_progress, '  (the checkpoint exists while the opening plays)');
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2600); await H.settled(p); await H.drain(p); await p.waitForTimeout(300);
    check(await p.locator('#guestIcon:not(.hidden)').count() === 1, '  the ASP-1024 icon is there after the reload');
    for (let i = 0; i < 12 && !(await p.locator('#hintBar:not(.hidden)').count()); i++) { await hs(p, 'Blackbox bedienen'); await H.drain(p); await p.waitForTimeout(250); }
    check(await p.locator('#hintBar:not(.hidden)').count() === 1, '  (the blackbox is open with its hint bar)');
    const before = await p.locator('#hintCount').innerText();
    await p.evaluate(() => { window.__cb = 0; GameEngine.dialogue.load([{ speaker: 'SYSTEM', text: 'PRÜFLINIE.' }], () => { window.__cb = 1; }); });
    await p.locator('#hintBtnR3MI').click({ force: true }); await p.waitForTimeout(80);
    await p.locator('#hintBtnR3MI').click({ force: true }); await p.waitForTimeout(200);
    await H.drain(p);
    check(await p.evaluate(() => window.__cb) === 1 && (await p.locator('#hintCount').innerText()) === before, `  the line's continuation ran and no hint was spent (${before})`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[C] Chapter 7: three anchors and no crash yet — the resume plays it');
  { const cp = { act: 4, fakeCompleteSeen: true, metFaxn: true, anchors: { labels: true, displays: true, actions: true },
                 bsodSeen: false, integritySeen: false, sigFound: false, luxSeen: false };
    const { ctx, p, errs } = await H.open(b, '/chapter7/chapter7.html', H.save({ chaptersCompleted: H.done(7), ch7_progress: cp }));
    await p.waitForTimeout(3000); await H.settled(p); await p.waitForTimeout(600);
    check(await p.locator('#bsod.visible, #bsod:not(.hidden)').count() >= 1, '  the crash sequence runs on resume');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[D] Chapter 8: a finale cut off by a reload plays again — the solved board is never re-scrambled');
  { const { ctx, p, errs } = await H.open(b, '/chapter8/chapter8.html', H.save({ chaptersCompleted: H.done(8) }));
    await p.waitForTimeout(3000); await H.settled(p); await H.drain(p); await p.waitForTimeout(400); await H.drain(p);
    const table = p.locator('#sceneHotspots .prop-interactive').filter({ hasText: /TISCH|AKTE|REKONSTRUKTION/ }).first();
    const aria = await p.evaluate(() => [...document.querySelectorAll('#sceneHotspots [aria-label]')].map(e => e.getAttribute('aria-label')));
    const tableAria = aria.find(a => /Tisch|Akte|Fragment/i.test(a));
    if (tableAria) { await hs(p, tableAria); await H.drain(p); await p.waitForTimeout(300); }
    const go = p.locator('.choice-btn', { hasText: 'Fragmente sichten' });
    if (await go.count()) { await go.click(); await p.waitForTimeout(200); await H.drain(p); await p.waitForTimeout(400); }
    const cp0 = (await saved(p)).ch8_progress;
    check(!!(cp0 && cp0.presorted && cp0.inst), `  reached the board (table hotspot "${tableAria}")`);
    await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('ka2_save_v1')); s.ch8_progress.solved = true; localStorage.setItem('ka2_save_v1', JSON.stringify(s)); });
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000); await H.settled(p);
    check((await saved(p)).chaptersCompleted.includes('ch8'), '  the sector counts as finished at once');
    check(await p.locator('#rkModal:not(.hidden)').count() === 0, '  no board to solve again');
    for (let i = 0; i < 6 && !(await p.locator('#chapterComplete:not(.hidden)').count()); i++) { await H.drain(p); await p.waitForTimeout(500); }
    check(await p.locator('#chapterComplete:not(.hidden)').count() === 1, '  the finale runs on to the end card');
    const z = await p.locator('#ccCoords').innerText().catch(() => '');
    check(/N .*E /.test(z), `  with the coordinates on it ("${z}")`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[E] Chapter 9: a warning cut off by a reload plays to its end; "Die Wahrheit" is earned at the receiver');
  { const cp = { act: 3, records: {}, signalDone: true, facedFirst: null, asked: {}, consoleSeen: false, burstSeen: false, optional: {} };
    const { ctx, p, errs } = await H.open(b, '/chapter9/chapter9.html', H.save({ chaptersCompleted: H.ALL, signalsFound: H.SIG, ch9_progress: cp }));
    await p.waitForTimeout(3000); await H.settled(p); await H.drain(p); await p.waitForTimeout(600); await H.drain(p); await p.waitForTimeout(300);
    check(await p.locator('#faceBar:not(.hidden)').count() === 1, '  the warning led on to the confrontation');
    check((await saved(p)).ch9_progress?.act === 4, '  act 4 is saved');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }
  { const cp = { act: 5, records: {}, signalDone: true, facedFirst: 'r3mi', asked: { used: 1, why: 1, others: 1 }, consoleSeen: true, burstSeen: true, optional: {} };
    const { ctx, p, errs } = await H.open(b, '/chapter9/chapter9.html', H.save({ chaptersCompleted: H.ALL, signalsFound: H.SIG, ch9_progress: cp }));
    await p.waitForTimeout(3000); await H.settled(p); await H.drain(p); await p.waitForTimeout(600); await H.drain(p);
    const recv = p.locator('.choice-btn', { hasText: 'Empfänger' });
    check(await recv.count() === 1, '  the receiver is offered after the resume');
    await recv.click(); await p.waitForTimeout(300);
    const st = await saved(p);
    check(st.flags.truth_revealed === true && st.achievementsUnlocked.includes('truth'), '  "Die Wahrheit" comes with the truth flag');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  await b.close(); finish();
})();
