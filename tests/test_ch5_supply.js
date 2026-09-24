/* Chapter 5's Versorgungspult in the page: every pressure line costs the same,
   so a player who reads the schema supplies the two systems it names, cranks
   the Stellwerk, and crosses; "spend the whole reserve" alone decides nothing. */
const H = require('./helpers');
const { check, finish } = H.checker('ch5_supply');
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')).ch5_progress);
const cp = { beat: '14-G', branch: 'haupt', metTflon: true, relay: true, crossing: false, marker: false, sigFound: false, restSeen: true, webGags: 0, gags: {}, log: [] };

(async () => {
  const b = await H.launch();
  for (const vp of [{ width: 1280, height: 800 }, { width: 360, height: 740 }]) {
    console.log(`\n[${vp.width}px]`);
    const { ctx, p, errs } = await H.open(b, '/chapter5/chapter5.html', H.save({ chaptersCompleted: H.done(5), ch5_progress: cp }), { viewport: vp, mobile: vp.width < 500 });
    await p.waitForTimeout(3000); await H.settled(p); for (let i = 0; i < 4; i++) { await H.drain(p); await p.waitForTimeout(250); }
    for (let i = 0; i < 6 && !(await p.locator('#stModal:not(.hidden)').count()); i++) {
      await p.locator('#sceneHotspots [aria-label="Versorgungspult bedienen"]').first().click({ force: true }); await p.waitForTimeout(300); await H.drain(p);
    }
    await H.drain(p);
    const labels = await p.$$eval('[data-act="vg-sup"]', bs => bs.map(x => x.textContent.trim()));
    check(labels.length === 4 && labels.every(l => /· 3/.test(l)), `  four pressure lines, all at 3 (${labels.join(' ')})`);
    const rows = await p.$$eval('.vg-row', rs => rs.map(r => ({ id: r.querySelector('.vg-id')?.textContent, fn: r.querySelector('.vg-fn')?.textContent || '' })));
    const decoys = rows.filter(r => /beleuchtet|eisfrei/.test(r.fn)).map(r => r.id);
    const right  = rows.filter(r => /fährt die Plattform aus|verriegelt die Plattform/.test(r.fn)).map(r => r.id);
    // the decoy pair empties the reserve too — and is refused
    await p.locator('[data-act="vg-crank"]').click(); await p.waitForTimeout(150); await H.drain(p);
    for (const id of decoys) { await p.locator(`[data-act="vg-sup"][data-id="${id}"]`).click(); await p.waitForTimeout(80); }
    check(/0 \/ 6/.test(await p.locator('.vg-budget').innerText()), '  two decoys empty the reserve as well');
    await p.locator('[data-act="vg-commit"]').click(); await p.waitForTimeout(300);
    check(!(await saved(p)).crossing, `  and are refused ("${(await p.locator('#stStatus, .st-status').first().innerText().catch(() => '')).trim()}")`);
    await H.drain(p);
    await p.locator('[data-act="vg-clear"]').click(); await p.waitForTimeout(80);
    for (const id of right) { await p.locator(`[data-act="vg-sup"][data-id="${id}"]`).click(); await p.waitForTimeout(80); }
    await p.locator('[data-act="vg-commit"]').click(); await p.waitForTimeout(400); await H.drain(p); await p.waitForTimeout(300);
    check((await saved(p)).crossing === true, '  the two systems the schema names release the platform');
    check(errs.length === 0, '  no page errors' + (errs.length ? ': ' + errs[0] : '')); await ctx.close();
  }
  await b.close(); finish();
})();
