/* The seal symbols must not move under the pointer, and each must register on
   a real, separated mouse-down/up — the sequence that failed on Windows. */
const H = require('./helpers');
const { check, finish } = H.checker('ch0_ring');
const KEYS = [['⬡','ring-left','Hexagon'],['●','ring-top','Punkt'],['▲','ring-right','Dreieck'],['■','ring-bottom','Viereck']];
(async () => {
  const b = await H.launch();
  for (const vp of [{ width: 1280, height: 900 }, { width: 360, height: 740 }]) {
    console.log(`\n[${vp.width}px]`);
    const { ctx, p, errs } = await H.open(b, '/chapter0/chapter0.html', H.save({}), { viewport: vp, mobile: vp.width < 500 });
    await p.waitForTimeout(4000); await H.drain(p);
    for (let i = 0; i < 25 && !(await p.locator('#puzzleModal:not(.hidden)').count()); i++) {
      const d = p.locator('.door-hotspot'); if (await d.count()) await d.first().click({ force: true });
      await p.waitForTimeout(200); await H.drain(p);
    }
    if (!(await p.locator('#puzzleModal:not(.hidden)').count())) { check(false, 'could not open the seal'); await ctx.close(); continue; }
    for (const [sym, cls, name] of KEYS) {
      const r = await p.evaluate(c => { const btn = document.querySelector('.' + c); const a = btn.getBoundingClientRect();
        btn.classList.add('hit'); const d = btn.getBoundingClientRect(); btn.classList.remove('hit');
        return { move: Math.abs(a.x-d.x)+Math.abs(a.y-d.y), size: Math.abs(a.width-d.width)+Math.abs(a.height-d.height), w:a.width, h:a.height }; }, cls);
      check(r.move < 0.5 && r.size < 0.5 && r.w >= 44 && r.h >= 44, `${name} (${sym}): box neither moves nor resizes when pressed, stays ${r.w|0}×${r.h|0}`);
    }
    for (const [sym, cls, name] of KEYS) {
      const box = await p.locator('.' + cls).boundingBox();
      await p.mouse.move(box.x + box.width/2, box.y + box.height/2); await p.mouse.down(); await p.waitForTimeout(120); await p.mouse.up(); await p.waitForTimeout(150);
      const shown = await p.locator('#puzzleDisplay, .puzzle-display, #sequenceDisplay').first().innerText().catch(() => '');
      check(shown.includes(sym), `${name} (${sym}) registers on a real down/up press`);
      await p.locator('#puzzleResetBtn').click({ force: true }); await p.waitForTimeout(150);
    }
    check(errs.length === 0, 'no page errors'); await ctx.close();
  }
  await b.close(); finish();
})();
