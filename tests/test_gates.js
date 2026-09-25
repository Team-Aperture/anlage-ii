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
  console.log('\n[ch0 without the code]');
  { const { ctx, p } = await H.open(b, '/chapter0/chapter0.html', H.save({ flags: {} })); await p.waitForTimeout(1500);
    check(/access\.html/.test(p.url()), 'ch0 without ka1_verified goes to the access page'); await ctx.close(); }
  await b.close(); finish();
})();
