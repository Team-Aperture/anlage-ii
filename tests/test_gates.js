/* Every chapter refuses in-universe when reached too early, and points home. */
const H = require('./helpers');
const { check, finish } = H.checker('gates');
(async () => {
  const b = await H.launch();
  for (let n = 2; n <= 8; n++) {
    const { ctx, p, errs } = await H.open(b, `/chapter${n}/chapter${n}.html`, H.save({ chaptersCompleted: H.done(n - 1) }));
    await p.waitForTimeout(900);
    const body = await p.evaluate(() => document.body.innerText);
    check(/ZUGANG VERWEIGERT/.test(body) && new RegExp(`SEKTOR 0${n}`).test(body) && /NOCH NICHT ERREICHBAR/.test(body), `ch${n} too early: refused in-universe, sector named`);
    check(!/Kapitel 9|Kammer|ZIELDATEN|REKONSTRUKTION/i.test(body), `  and leaks nothing`);
    const out = p.locator('a, button').filter({ hasText: 'ZUM AKTUELLEN SEKTOR' });
    check(await out.count() === 1, '  offers the way to the current sector');
    await out.first().click(); await p.waitForTimeout(900);
    check(new RegExp(`chapter${n-1}\\.html`).test(p.url()), `  which is sector 0${n-1}`);
    check(errs.length === 0, '  no page errors'); await ctx.close();
  }
  console.log('\n[ch9]');
  { const { ctx, p } = await H.open(b, '/chapter9/chapter9.html', H.save({ chaptersCompleted: H.ALL, signalsFound: ['sig_01'] })); await p.waitForTimeout(900);
    const body = await p.evaluate(() => document.body.innerText);
    check(/ZUGANG VERWEIGERT/.test(body) && /FREMDSIGNALE/.test(body) && !/Kammer/i.test(body), 'ch9 with 1/5 signals: refused without naming itself'); await ctx.close(); }
  console.log('\n[ch0 needs nothing from Part I]');
  { const { ctx, p, errs } = await H.open(b, '/chapter0/chapter0.html', H.save({ flags: {} })); await p.waitForTimeout(1500);
    check(/chapter0\.html/.test(p.url()) && !/ZUGANG VERWEIGERT/.test(await p.evaluate(() => document.body.innerText)), 'ch0 without any Part-I flag simply opens');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }
  { const { ctx, p } = await H.open(b, '/chapter1/chapter1.html', H.save({ chaptersCompleted: ['ch0'], flags: {} })); await p.waitForTimeout(1500);
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')));
    check(/chapter1\.html/.test(p.url()) && st.chaptersCompleted.includes('ch0'), '  and a finished Sektor 00 is kept without it (the save normaliser drops nothing)'); await ctx.close(); }
  await b.close(); finish();
})();
