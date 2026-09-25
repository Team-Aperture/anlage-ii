/* The entrance page scrolls on a phone. Its body used to carry
   overflow:hidden, which the viewport inherits, so on mobile Chrome the
   opened "TEIL I NICHT GESPIELT?" text ran below the screen and could not be
   reached. Checked with real touch-scroll gestures, collapsed and expanded,
   on narrow and short phones; desktop must not change. */
const H = require('./helpers');
const { check, finish } = H.checker('access_scroll');

// a real finger swipe (raw touch events through the DevTools protocol), not
// a scrollTo(): with the old overflow:hidden this moved the page 0 px
async function swipe(ctx, p, fromY, toY) {
  const cdp = await ctx.newCDPSession(p);
  const x = Math.round(p.viewportSize().width / 2), steps = 12;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: fromY }] });
  for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: fromY + (toY - fromY) * i / steps }] }); await new Promise(r => setTimeout(r, 16)); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(600);
}
const swipeUp = (ctx, p) => { const h = p.viewportSize().height; return swipe(ctx, p, Math.round(h * 0.85), Math.round(h * 0.15)); };
const bottomOf = (p, sel) => p.evaluate(s => { const e = [...document.querySelectorAll(s)].pop(); return e ? Math.round(e.getBoundingClientRect().bottom) : null; }, sel);

(async () => {
  const b = await H.launch();
  for (const [w, h] of [[320, 568], [320, 640], [360, 640], [360, 740], [390, 664], [390, 844]]) {
    const { ctx, p, errs } = await H.open(b, '/access.html', undefined, { viewport: { width: w, height: h }, mobile: true });
    await p.waitForTimeout(1400);
    console.log(`\n[${w}x${h}]`);
    // collapsed: whatever is below the fold (the help summary) can be reached
    for (let i = 0; i < 2; i++) await swipeUp(ctx, p);
    const sum = await bottomOf(p, '.access-help summary');
    check(sum !== null && sum <= h, `  collapsed: the TEIL I summary is reachable by swiping (bottom ${sum} ≤ ${h})`);
    // expanded: open it and swipe down to the end of its text
    await p.locator('.access-help summary').click(); await p.waitForTimeout(250);
    check(await p.locator('.access-help[open]').count() === 1, '  the section opens');
    for (let i = 0; i < 4; i++) await swipeUp(ctx, p);
    const last = await bottomOf(p, '.access-help-content p');
    check(last !== null && last <= h, `  expanded: the last line of its text is reachable (bottom ${last} ≤ ${h})`);
    const sx = await p.evaluate(() => document.scrollingElement.scrollWidth - innerWidth);
    check(sx <= 0, `  no sideways scrolling (${sx}px extra)`);
    // and back up to the card: nothing is left stranded above
    for (let i = 0; i < 4; i++) await swipe(ctx, p, Math.round(h * 0.15), Math.round(h * 0.85));
    check(await p.evaluate(() => document.scrollingElement.scrollTop) === 0, '  swiping back reaches the top again');
    check(errs.length === 0, '  no page errors'); await ctx.close();
  }

  console.log('\n[desktop 1280x800] unchanged: centred card, no scrollbar while it fits');
  { const { ctx, p, errs } = await H.open(b, '/access.html', undefined, { viewport: { width: 1280, height: 800 } });
    await p.waitForTimeout(1400);
    const r = await p.evaluate(() => { const c = document.querySelector('.access-card').getBoundingClientRect();
      return { sh: document.scrollingElement.scrollHeight, ih: innerHeight, sw: document.scrollingElement.scrollWidth, iw: innerWidth, top: Math.round(c.top), bottom: Math.round(c.bottom) }; });
    check(r.sh <= r.ih && r.sw <= r.iw, `  collapsed: nothing to scroll (${r.sh}/${r.ih})`);
    check(r.top > 40 && r.bottom < r.ih, `  the card sits inside the screen (${r.top}–${r.bottom})`);
    await p.locator('.access-help summary').click(); await p.waitForTimeout(250);
    await p.mouse.wheel(0, 2000); await p.waitForTimeout(300);
    const last = await bottomOf(p, '.access-help-content p');
    check(last !== null && last <= 800, `  expanded: its last line is reachable with the mouse wheel (bottom ${last})`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  await b.close(); finish();
})();
