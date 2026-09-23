/* Visual findings from the screenshot pass, pinned: readable tertiary text,
   a styled back link on every page, the entrance apart from the eight sectors,
   puzzle cards that start below the hint bar and keep their buttons on a phone
   screen, and Chapter 5's route bar clear of the unit icons. */
const H = require('./helpers');
const { check, finish } = H.checker('visual');

const contrast = (p, sel, bgSel) => p.evaluate(([sel, bgSel]) => {
  const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).map(Number).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
  const e = document.querySelector(sel); if (!e) return 0;
  const fg = lum(getComputedStyle(e).color), bg = bgSel ? lum(getComputedStyle(document.querySelector(bgSel)).backgroundColor) : lum('rgb(9,15,21)');
  return (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05);
}, [sel, bgSel]);
const box = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; }, sel);
const overlaps = (a, c) => !!(a && c) && !(a.r <= c.l || c.r <= a.l || a.b <= c.t || c.b <= a.t);

(async () => {
  const b = await H.launch();

  console.log('\n[A] tertiary text is readable; the dialogue hint most of all');
  { const { ctx, p } = await H.open(b, '/chapter3/chapter3.html', H.save({ chaptersCompleted: H.done(3) }));
    await p.waitForTimeout(3600); await H.settled(p); await p.waitForTimeout(400);
    const c = await contrast(p, '.dlg-advance');
    check(c >= 4, `  [ WEITER … ] reads at ${c.toFixed(2)}:1`);
    const dim = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--text-dim').trim());
    const d = await p.evaluate(v => { const lum = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0); };
      return (lum(v) + .05) / (lum('#090f15') + .05); }, dim);
    check(d >= 3, `  --text-dim is ${dim}, ${d.toFixed(2)}:1 on the panels`);
    await ctx.close(); }

  console.log('\n[B] the access page\'s way back looks like the rest of the header');
  { const { ctx, p } = await H.open(b, '/access.html', undefined, { viewport: { width: 360, height: 740 }, mobile: true });
    await p.waitForTimeout(1200);
    const s = await p.evaluate(() => { const cs = getComputedStyle(document.querySelector('.back-link')); return { deco: cs.textDecorationLine, color: cs.color }; });
    check(s.deco === 'none' && s.color !== 'rgb(0, 0, 238)', `  no browser-default link style (${JSON.stringify(s)})`);
    await ctx.close(); }

  console.log('\n[C] the title screen: the entrance apart from eight numbered sectors');
  { const { ctx, p } = await H.open(b, '/index.html', H.save({ chaptersCompleted: H.done(5) }));
    await p.waitForTimeout(7500);
    const n = await p.evaluate(() => { const all = [...document.querySelectorAll('.sector-node')]; return { entrance: all.filter(e => e.classList.contains('entrance')).map(e => e.textContent), sectors: all.filter(e => !e.classList.contains('entrance') && !e.classList.contains('bonus')).length, ticks: all.filter(e => !e.classList.contains('entrance') && e.textContent === '✓').length }; });
    check(n.entrance.length === 1 && n.entrance[0] === '⬡' && n.sectors === 8, `  one entrance seal, eight sectors (${JSON.stringify(n)})`);
    check(n.ticks === 4 && /FORTSCHRITT: 4 \/ 8/.test(await p.evaluate(() => document.body.innerText)), '  four ticks over "4 / 8 SEKTOREN"');
    await ctx.close(); }

  console.log('\n[D] a phone: a puzzle card starts below the hint bar and keeps its buttons on screen');
  { const mods = { pattern: { solved: false, output: null, opened: 1, fails: 0 }, weight: { solved: false, output: null, opened: 1, fails: 0 }, timing: { solved: false, output: null, opened: 1, fails: 0 }, orient: { solved: false, output: null, opened: 1, fails: 0 } };
    const sv = H.save({ chaptersCompleted: H.done(4) }); sv.chapterState = { ch4: { modules: mods, finalSolved: false, sigFound: false, froschiMentioned: true, seen: {}, talkSeen: {}, praise: 0 } };
    const { ctx, p } = await H.open(b, '/chapter4/chapter4.html', sv, { viewport: { width: 360, height: 740 }, mobile: true });
    await p.waitForTimeout(2000); await H.drain(p);
    await p.locator('#sceneHotspots [aria-label="Prüfwaage untersuchen"]').first().click({ force: true }); await p.waitForTimeout(400); await H.drain(p); await p.waitForTimeout(200);
    const bar = await box(p, '#hintBar'), head = await box(p, '#modModal .puzzle-header, #modModal #modLabel'), check_ = await box(p, '#modModal [data-act="w-check"]');
    const rows = await p.evaluate(() => { const bs = [...document.querySelectorAll('#hintBar .ka-btn')].map(b => Math.round(b.getBoundingClientRect().top)); return new Set(bs).size; });
    check(rows === 1, `  the three unit buttons share one row (${rows} row(s))`);
    check(bar && head && head.t >= bar.b, `  the card's header starts below the bar (${head && head.t | 0} ≥ ${bar && bar.b | 0})`);
    check(check_ && check_.b <= 740, `  [ PRÜFEN ] is on screen (bottom ${check_ && check_.b | 0})`);
    await ctx.close(); }

  console.log('\n[E] Chapter 5 on a phone: the route bar and the unit icons never overlap');
  for (const w of [320, 360, 390]) {
    const { ctx, p } = await H.open(b, '/chapter5/chapter5.html', H.save({ chaptersCompleted: H.done(5) }), { viewport: { width: w, height: 740 }, mobile: true });
    await p.waitForTimeout(3500); await H.settled(p); for (let i = 0; i < 6; i++) { await H.drain(p); await p.waitForTimeout(400); }
    const bar = await box(p, '.route-bar'), icons = await box(p, '#robotIcons');
    check(!!bar && !!icons && !overlaps(bar, icons), `  ${w}px: clear (${bar ? 'bar found' : 'NO BAR'}, ${icons ? 'icons found' : 'NO ICONS'})`);
    await ctx.close();
  }

  await b.close(); finish();
})();
