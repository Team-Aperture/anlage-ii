/* Very short windows — a landscape phone, or a laptop at 250-300 % browser
   zoom (a real accessibility case): nothing a player must reach is cut off
   with no way to scroll to it.
     [A] the chapter-complete cards of Chapters 0-4 scroll (they were centred
         flex boxes with no overflow; [ HAUPTMENÜ ] / [ EINTRETEN ] fell off);
     [B] the first-visit phone warning scrolls on a landscape phone;
     [C] the talk menus of Chapters 1-4 are capped and scroll, like the shared
         stylesheet's, instead of leaving the top of the screen;
     [D] the return bar (Nachsuche) keeps the niches reachable down to 300 %
         zoom, and on a tablet in portrait it no longer sits on the robot icons;
     [E] reduced motion also stills Chapters 2 and 4. */
const H = require('./helpers');
const { chromium } = require('playwright');
const { check, finish } = H.checker('small_windows');
const SMALL = [[480, 300], [427, 267]];
const reach = (p, sel) => p.evaluate(sel => {            // can the element be scrolled into view and hit?
  const e = document.querySelector(sel); if (!e) return 'missing';
  e.scrollIntoView({ block: 'center' });
  const r = e.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return (t === e || e.contains(t)) && r.bottom <= innerHeight + 1 && r.top >= -1 ? 'ok' : 'covered or off screen';
}, sel);

(async () => {
  const b = await H.launch();

  console.log('\n[A] chapter-complete cards scroll on a short window');
  for (const [w, h] of SMALL) for (const n of [0, 1, 2, 3, 4]) {
    const { ctx, p, errs } = await H.open(b, `/chapter${n}/chapter${n}.html`, H.save({ chaptersCompleted: H.done(n) }), { viewport: { width: w, height: h }, touch: true, mobile: true });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { const c = document.getElementById('chapterComplete'); c.classList.remove('hidden'); c.style.animation = 'none'; c.style.opacity = '1'; });
    const m = await p.evaluate(() => { const c = document.getElementById('chapterComplete'); return { scrolls: c.scrollHeight > c.clientHeight, canScroll: /auto|scroll/.test(getComputedStyle(c).overflowY) }; });
    const links = await p.evaluate(() => [...document.querySelectorAll('#chapterComplete a.ka-btn, #chapterComplete button.ka-btn')].map((e, i) => { e.dataset.i = i; return i; }));
    let ok = true;
    for (const i of links) if ((await reach(p, `#chapterComplete [data-i="${i}"]`)) !== 'ok') ok = false;
    check(ok && (m.canScroll || !m.scrolls), `  ch${n} ${w}x${h}: every button of the card is reachable (${links.length} buttons, card ${m.scrolls ? 'taller than the window, scrolls' : 'fits'})`);
    if (errs.length) check(false, '  page errors ' + errs[0]); await ctx.close();
  }

  console.log('\n[B] the first-visit phone warning scrolls on a landscape phone');
  for (const [w, h] of [[568, 320], [480, 300]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
    await ctx.route('**://fonts.g**/**', r => r.abort());
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.goto(H.BASE + '/index.html'); await p.waitForTimeout(2200);
    check(await p.locator('#mobileWarning').count() === 1, `  ${w}x${h}: the warning shows`);
    check(await reach(p, '#mwLater') === 'ok', `  ${w}x${h}: [ SPÄTER AUF PC ÖFFNEN ] can be scrolled to and tapped`);
    check(await p.evaluate(() => { const c = document.querySelector('.mw-card').getBoundingClientRect(); const o = document.getElementById('mobileWarning'); o.scrollTop = 0; const t = document.querySelector('.mw-card h2, .mw-card .mw-title, .mw-card'); return t.getBoundingClientRect().top >= -1; }), `  ${w}x${h}: and the top of the card is reachable too`);
    check(errs.length === 0, '  no page errors'); await ctx.close();
  }

  console.log('\n[C] talk menus on a short window: capped, and the top stays on screen');
  for (const [n, who] of [[2, '.r3mi-icon'], [4, '.r3mi-icon']]) {
    const { ctx, p, errs } = await H.open(b, `/chapter${n}/chapter${n}.html`, H.save({ chaptersCompleted: H.done(n) }), { viewport: { width: 480, height: 300 }, touch: true, mobile: true });
    await p.waitForTimeout(3500); await H.settled(p); await H.drain(p); await p.waitForTimeout(400); await H.drain(p);
    const open = await p.evaluate(() => { const o = document.getElementById('choiceOverlay'); return !!o; });
    await p.evaluate(() => { GameEngine.chapter.showChoices({ prompt: 'TEST', choices: Array.from({ length: 6 }, (_, i) => ({ key: 'k' + i, label: 'Option ' + (i + 1) + ' — eine längere Antwort', fn() {} })) }); });
    await p.waitForTimeout(700);
    const m = await p.evaluate(() => { const o = document.getElementById('choiceOverlay'), r = o.getBoundingClientRect(); return { top: Math.round(r.top), h: Math.round(r.height), vh: innerHeight, scroll: /auto|scroll/.test(getComputedStyle(o).overflowY), tall: o.scrollHeight > o.clientHeight }; });
    check(open && m.top >= 0 && m.scroll, `  ch${n}: the menu starts at y=${m.top} (not above the screen) and is ${m.scroll ? 'scrollable' : 'NOT scrollable'} (${m.h}px of ${m.vh}${m.tall ? ', content scrolls' : ''})`);
    check(errs.length === 0, '  no page errors'); await ctx.close();
  }

  console.log('\n[D] the return bar at 250-300 % zoom and on a tablet');
  { const niches = [['/chapter4/chapter4.html', 'Braunen Kasten untersuchen', 'sig_02'], ['/chapter7/chapter7.html', 'Wandplatte untersuchen', 'sig_05']];
    for (const [w, h] of SMALL) for (const [url, label, own] of niches) {
      const { ctx, p } = await H.open(b, url, H.save({ chaptersCompleted: H.ALL, signalsFound: H.SIG.filter(s => s !== own) }), { viewport: { width: w, height: h }, touch: true, mobile: true });
      await p.waitForTimeout(3000); await H.settled(p);
      for (let i = 0; i < 40 && !(await p.locator(`#sceneHotspots [aria-label="${label}"]`).count()); i++) { await H.drain(p); await p.waitForTimeout(300); }
      await H.drain(p); await p.waitForTimeout(900);
      const r = await p.evaluate(label => { const e = document.querySelector(`#sceneHotspots [aria-label="${label}"]`), q = e.getBoundingClientRect(); let hit = 0;
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const t = document.elementFromPoint(q.left + q.width * (i + .5) / 8, q.top + q.height * (j + .5) / 8); if (t && (t === e || e.contains(t))) hit++; }
        return { pct: Math.round(100 * hit / 64), bar: Math.round(document.getElementById('nachsucheBar').getBoundingClientRect().height) }; }, label);
      check(r.pct >= 30 && r.bar <= 40, `  ${own} ${w}x${h}: ${r.pct} % of the niche reachable, bar ${r.bar} px (one row)`);
      await ctx.close(); } }
  for (const [w, h] of [[768, 1024], [834, 1112]]) {
    const { ctx, p } = await H.open(b, '/chapter5/chapter5.html', H.save({ chaptersCompleted: H.ALL, signalsFound: H.SIG.filter(s => s !== 'sig_03') }), { viewport: { width: w, height: h }, touch: true });
    await p.waitForTimeout(3000); await H.settled(p);
    for (let i = 0; i < 40 && !(await p.locator('#nachsucheBar').count()); i++) { await H.drain(p); await p.waitForTimeout(300); }
    await H.drain(p); await p.waitForTimeout(1200); await H.drain(p); await p.waitForTimeout(600);
    const r = await p.evaluate(() => [...document.querySelectorAll('#robotIcons .robot-icon:not(.hidden)')].map(e => { const q = e.getBoundingClientRect(), t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return t === e || e.contains(t); }));
    check(r.length >= 2 && r.every(Boolean), `  ${w}x${h} portrait tablet: all ${r.length} robot icons are tappable above the bar`);
    await ctx.close();
  }

  console.log('\n[E] reduced motion stills Chapters 2 and 4');
  for (const n of [2, 4]) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    await ctx.addInitScript(s => { if (sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded', '1'); localStorage.setItem('ka2_mobile_warning_dismissed', '1'); localStorage.setItem('ka2_save_v1', JSON.stringify(s)); }, H.save({ chaptersCompleted: H.done(n) }));
    await ctx.route('**://fonts.g**/**', r => r.abort());
    const p = await ctx.newPage(); await p.goto(H.BASE + `/chapter${n}/chapter${n}.html`); await p.waitForTimeout(1500);
    const names = await p.evaluate(sels => sels.map(s => { const e = document.querySelector(s); return e ? getComputedStyle(e).animationName : 'missing'; }), n === 2 ? ['.ch-ring-1', '.ch-ring-2', '.ch2-frost-1', '.ri-eye-r'] : ['.ch-ring-1', '.ch-ring-2', '.ch4-lock', '.ri-eye-r']);
    check(names.every(x => x === 'none'), `  ch${n}: spinning rings, pulses and eyes are still (${names.join(', ')})`);
    await ctx.close();
  }

  await b.close(); finish();
})();
