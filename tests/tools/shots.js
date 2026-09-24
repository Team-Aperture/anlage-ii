/* Screenshots every page at phone and desktop width, after the opening has
   settled, plus the title screen in its three states. Output: tests/shots/ */
const H = require('../helpers');
(async () => {
  const b = await H.launch();
  const out = H.path.join(__dirname, '..', 'shots');
  const shots = [];
  for (const [w, h, tag] of [[360, 740, 'm'], [1280, 800, 'd']]) {
    for (let n = 0; n <= 9; n++) {
      const sv = H.save({ chaptersCompleted: H.done(n), signalsFound: n === 9 ? H.SIG : [] });
      const { ctx, p } = await H.open(b, `/chapter${n}/chapter${n}.html`, sv, { viewport: { width: w, height: h }, mobile: w < 500 });
      await p.waitForTimeout(3500); await H.settled(p); await H.drain(p); await p.waitForTimeout(500);
      const f = `${out}/ch${n}_${tag}.png`; await p.screenshot({ path: f }); shots.push(f); await ctx.close();
    }
    for (const [name, sv] of [['title_fresh', H.save({})], ['title_mid', H.save({ chaptersCompleted: H.done(5), signalsFound: ['sig_01','sig_02'] })],
                              ['title_done', H.save({ chaptersCompleted: H.ALL, signalsFound: H.SIG, flags: { ka1_verified: true, zieldaten: true, truth_revealed: true } })]]) {
      const { ctx, p } = await H.open(b, '/index.html', sv, { viewport: { width: w, height: h }, mobile: w < 500 });
      await p.waitForTimeout(7500); const f = `${out}/${name}_${tag}.png`; await p.screenshot({ path: f, fullPage: true }); shots.push(f); await ctx.close();
    }
    const { ctx, p } = await H.open(b, '/access.html', undefined, { viewport: { width: w, height: h }, mobile: w < 500 });
    await p.waitForTimeout(2500); const f = `${out}/access_${tag}.png`; await p.screenshot({ path: f, fullPage: true }); shots.push(f); await ctx.close();
  }
  await b.close(); console.log(shots.length + ' screenshots in ' + out);
})();
