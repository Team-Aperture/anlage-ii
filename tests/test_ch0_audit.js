/* Chapter 0 findings from the total audit, pinned. */
const H = require('./helpers');
const { check, finish } = H.checker('ch0_audit');
async function toRing(p) {
  await p.waitForTimeout(3800); await H.drain(p);
  for (let i = 0; i < 25 && !(await p.locator('#puzzleModal:not(.hidden)').count()); i++) {
    const d = p.locator('.door-hotspot'); if (await d.count()) await d.first().click({ force: true });
    await p.waitForTimeout(200); await H.drain(p);
  }
  return !!(await p.locator('#puzzleModal:not(.hidden)').count());
}
const press = async (p, sym) => { await p.locator(`.puzzle-key[data-symbol="${sym}"]`).click({ force: true }); await p.waitForTimeout(80); };
(async () => {
  const b = await H.launch();

  console.log('\n[A] the header exists, is on top, and its link works');
  { const { ctx, p, errs } = await H.open(b, '/chapter0/chapter0.html', H.save({})); await p.waitForTimeout(3800);
    const r = await p.evaluate(() => { const bar = document.querySelector('.sys-bar'); const a = bar?.querySelector('a'); if (!bar || !a) return { none: true };
      const cs = getComputedStyle(bar), q = a.getBoundingClientRect(); const top = document.elementFromPoint(q.left + q.width/2, q.top + q.height/2);
      return { none: false, fixed: cs.position === 'fixed', z: +cs.zIndex, hit: !!top && (top === a || a.contains(top)) }; });
    check(!r.none && r.fixed && r.z >= 20 && r.hit, `[ ZURÜCK ZUM MENÜ ] is fixed, above the scene, and takes the pointer (${JSON.stringify(r)})`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[B] a tap during the release lines does not lose the completion card');
  { const { ctx, p, errs } = await H.open(b, '/chapter0/chapter0.html', H.save({})); 
    check(await toRing(p), 'the ring opens');
    for (const s of ['●','▲','■','⬡']) await press(p, s);
    await p.waitForTimeout(3600);                                       // the release lines have started
    check(await p.locator('.dlg-container.visible').count() === 1, '  release lines are on screen');
    await p.locator('.req-hotspot').first().click({ force: true });    // the tap that used to replace the callback
    await p.waitForTimeout(300); await H.drain(p); await p.waitForTimeout(800);
    check(await p.locator('#chapterComplete:not(.hidden)').count() === 1, '  the completion card still appears');
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')));
    check(st.chaptersCompleted.includes('ch0') && st.achievementsUnlocked.includes('ch0_complete'), '  completion and achievement were latched at once');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[C] re-entering the ring keeps entered marks; a reset cancels the fail wipe');
  { const { ctx, p } = await H.open(b, '/chapter0/chapter0.html', H.save({})); check(await toRing(p), 'the ring opens');
    await press(p, '●'); await press(p, '▲');
    await p.evaluate(() => Chapter0.openPuzzle());                     // re-entry
    await p.waitForTimeout(150);
    check((await p.locator('#puzzleDisplay').innerText()).includes('▲'), '  re-entry did not wipe the two marks');
    await p.locator('#puzzleResetBtn').click({ force: true }); await p.waitForTimeout(80);
    for (const s of ['⬡','■','▲','●']) await press(p, s);              // wrong
    await p.waitForTimeout(150); await p.locator('#puzzleResetBtn').click({ force: true }); await p.waitForTimeout(80);
    await press(p, '●'); await p.waitForTimeout(1200);                // past the old 780 ms wipe
    check((await p.locator('#puzzleDisplay').innerText()).includes('●'), '  a mark entered after reset survives the old fail timer');
    const inert = await p.evaluate(() => document.getElementById('sceneWrapper').inert === true);
    check(inert, '  the scene behind the modal is inert while it is open');
    await ctx.close(); }

  console.log('\n[D] the dust drift is reachable, and the phone key grid is aligned');
  { const { ctx, p } = await H.open(b, '/chapter0/chapter0.html', H.save({}), { viewport: { width: 360, height: 640 }, mobile: true });
    await p.waitForTimeout(3800); await H.drain(p);
    // the finding: the objective HUD used to sit over the drift at the bottom-left
    const dust = await p.evaluate(() => { const e = document.querySelector('.env-dust'); if (!e) return { none: true }; const r = e.getBoundingClientRect(); let hit = 0, n = 0;
      for (let fx = .15; fx <= .85; fx += .35) for (let fy = .2; fy <= .8; fy += .3) { n++; const t = document.elementFromPoint(r.left + r.width*fx, r.top + r.height*fy); if (t && (t === e || e.contains(t))) hit++; } return { none: false, frac: hit / n }; });
    check(!dust.none && dust.frac >= 0.8, `STAUBSCHICHT is tappable at 360×640 (${Math.round((dust.frac||0)*100)}% of its area)`);
    check(await toRing(p), '  the ring opens');
    const g = await p.evaluate(() => { const card = document.querySelector('.puzzle-card').getBoundingClientRect();
      const ks = [...document.querySelectorAll('.puzzle-key')].map(k => k.getBoundingClientRect());
      const inside = ks.every(r => r.left >= card.left - 1 && r.right <= card.right + 1 && r.top >= card.top - 1 && r.bottom <= card.bottom + 1);
      let overlap = false; for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const a = ks[i], c = ks[j]; if (!(a.right <= c.left + 1 || c.right <= a.left + 1 || a.bottom <= c.top + 1 || c.bottom <= a.top + 1)) overlap = true; }
      return { inside, overlap }; });
    check(g.inside && !g.overlap, `  four keys inside the card, none overlapping (${JSON.stringify(g)})`);
    await ctx.close(); }

  console.log('\n[E] a solved ring counts as a finished chapter on return; the bar sits where it should');
  { const sv = H.save({}); sv.puzzlesSolved = { ch0_door: true };
    const { ctx, p } = await H.open(b, '/chapter0/chapter0.html', sv); await p.waitForTimeout(3500); await H.drain(p);
    check((await p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')))).chaptersCompleted.includes('ch0'), 'puzzle-solved-but-unmarked save is marked complete');
    await ctx.close();
    const r2 = await H.open(b, '/chapter0/chapter0.html', H.save({ chaptersCompleted: ['ch0'] })); await r2.p.waitForTimeout(3500); await H.drain(r2.p); await r2.p.waitForTimeout(700);
    const bar = await r2.p.evaluate(() => { const bar = document.getElementById('nachsucheBar'); if (!bar) return null; const b = bar.getBoundingClientRect(); return { fromBottom: innerHeight - b.bottom }; });
    check(bar && bar.fromBottom < 60, `  the return bar sits at the bottom edge, not lifted into the room (${bar && bar.fromBottom|0}px up)`);
    await r2.ctx.close(); }

  console.log('\n[F] reduced motion still shows the room');
  { const { ctx, p } = await H.open(b, '/chapter0/chapter0.html', H.save({}), { reduced: true }); await p.waitForTimeout(600);
    const op = await p.evaluate(() => getComputedStyle(document.getElementById('sceneWrapper')).opacity);
    check(op === '1', `the scene is visible with prefers-reduced-motion (opacity ${op})`);
    await ctx.close(); }

  console.log('\n[G] desktop modal: nothing overhangs, the note is readable, the nudge renders');
  { const { ctx, p } = await H.open(b, '/chapter0/chapter0.html', H.save({})); check(await toRing(p), 'the ring opens');
    const r = await p.evaluate(() => {
      const q = s => document.querySelector(s).getBoundingClientRect();
      const top = q('.puzzle-key.ring-top'), bottom = q('.puzzle-key.ring-bottom'), status = q('#puzzleStatus'), actions = q('.puzzle-actions');
      const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).map(Number).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
      const fg = lum(getComputedStyle(document.getElementById('puzzleNote')).color), bg = lum(getComputedStyle(document.querySelector('.puzzle-card')).backgroundColor);
      return { topClear: top.top >= status.bottom - 0.5, bottomClear: bottom.bottom <= actions.top + 0.5, contrast: (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05) }; });
    check(r.topClear && r.bottomClear, `  ● clears the status line and ■ clears the buttons (${JSON.stringify(r)})`);
    check(r.contrast >= 4, `  the in-modal note reads at ${r.contrast.toFixed(2)}:1`);
    for (let i = 0; i < 3; i++) { for (const s of ['⬡','■','▲','●']) await press(p, s); await p.waitForTimeout(1000); }
    const nudge = await p.evaluate(() => { const hb = document.getElementById('puzzleHintBtn'); return { cls: hb.classList.contains('nudge'), anim: getComputedStyle(hb).animationName }; });
    check(nudge.cls && /hintNudge/.test(nudge.anim), `  third failure nudges the modal's own hint button (${JSON.stringify(nudge)})`);
    await ctx.close(); }

  console.log('\n[H] desktop room: the lamp is below the header, the seal hit box is the seal');
  { const { ctx, p } = await H.open(b, '/chapter0/chapter0.html', H.save({})); await p.waitForTimeout(3800); await H.drain(p);
    const r = await p.evaluate(() => { const q = s => document.querySelector(s).getBoundingClientRect();
      const lamp = q('.env-light'), bar = q('.sys-bar'), door = q('.ph-door'), hot = q('.hotspot.door-hotspot');
      const same = Math.abs(door.left - hot.left) < 1 && Math.abs(door.top - hot.top) < 1 && Math.abs(door.width - hot.width) < 1 && Math.abs(door.height - hot.height) < 1;
      return { lampClear: lamp.top >= bar.bottom, same, round: getComputedStyle(document.querySelector('.hotspot.door-hotspot')).borderRadius }; });
    check(r.lampClear, '  NOTBELEUCHTUNG sits below the fixed header');
    check(r.same && r.round === '50%', `  the door hotspot is the drawn door, and round (${JSON.stringify(r)})`);
    await ctx.close(); }

  console.log('\n[I] short desktop window: the seal stays off the floor stencil');
  { const { ctx, p } = await H.open(b, '/chapter0/chapter0.html', H.save({}), { viewport: { width: 1280, height: 600 } }); await p.waitForTimeout(3800); await H.drain(p);
    const r = await p.evaluate(() => { const d = document.querySelector('.ph-door').getBoundingClientRect(), f = document.querySelector('.ref-floor').getBoundingClientRect(); return { doorBottom: d.bottom, floorTop: f.top }; });
    check(r.doorBottom <= r.floorTop + 1, `  door bottom ${r.doorBottom|0} ≤ stencil top ${r.floorTop|0} at 1280×600`);
    await ctx.close(); }

  console.log('\n[J] phone: boxes fit their art, labels stay on screen, keys are discs, buttons one line each');
  { const { ctx, p } = await H.open(b, '/chapter0/chapter0.html', H.save({}), { viewport: { width: 360, height: 740 }, mobile: true });
    await p.waitForTimeout(3800); await H.drain(p);
    const r = await p.evaluate(() => {
      const props = [...document.querySelectorAll('.scene-prop.prop-interactive[data-prop]')].map(el => {
        const vb = el.querySelector('svg').getAttribute('viewBox').split(/[\s,]+/).map(Number); const b = el.getBoundingClientRect();
        return { k: el.dataset.prop, off: Math.abs(b.height - b.width * vb[3] / vb[2]) }; });
      const q = s => document.querySelector(s).getBoundingClientRect();
      const warn = q('.ref-warning .prop-label'), term = q('.env-terminal .prop-label'), door = q('.ph-door'), hot = q('.hotspot.door-hotspot');
      return { worst: Math.max(...props.map(x => x.off)), n: props.length, warnLeft: warn.left, termRight: term.right,
        doorSame: Math.abs(door.top - hot.top) < 1 && Math.abs(door.height - hot.height) < 1 && Math.abs(door.left - hot.left) < 1 }; });
    check(r.n === 8 && r.worst < 2, `  all ${r.n} prop boxes are as tall as their art (worst ${r.worst.toFixed(1)}px off)`);
    check(r.warnLeft >= 0 && r.termRight <= 360, `  WARNTAFEL starts at ${r.warnLeft|0}px, ARCHIVTERMINAL ends at ${r.termRight|0}px`);
    check(r.doorSame, '  the door hotspot follows the 240px phone door');
    check(await toRing(p), '  the ring opens');
    const m = await p.evaluate(() => { const keys = [...document.querySelectorAll('.puzzle-key')].map(k => k.getBoundingClientRect());
      const btns = [...document.querySelectorAll('.puzzle-actions .ka-btn')].map(b => ({ h: b.getBoundingClientRect().height, clipped: b.scrollWidth > b.clientWidth + 1 }));
      return { discs: keys.every(k => Math.abs(k.width - k.height) < 1 && k.width >= 60), btns }; });
    check(m.discs, '  the four keys are 64px discs');
    check(m.btns.length === 3 && m.btns.every(b => b.h < 40 && !b.clipped), `  three one-line buttons, none clipped (${JSON.stringify(m.btns)})`);
    await ctx.close(); }

  console.log('\n[K] gameplay: focus, cinematic, label, note, hint pointer, settled beacon, toast');
  { const { ctx, p } = await H.open(b, '/chapter0/chapter0.html', H.save({})); await p.waitForTimeout(3800); await H.drain(p);
    await p.locator('.ref-warning').click({ force: true }); await p.waitForTimeout(150); await H.drain(p);
    const beacon = await p.evaluate(() => { const cs = getComputedStyle(document.querySelector('.ref-warning'), '::after'); return { anim: cs.animationName, bg: cs.backgroundColor }; });
    check(beacon.anim === 'none' && /46, 207, 98/.test(beacon.bg), `  an examined marking's beacon settles green (${JSON.stringify(beacon)})`);
    check(await toRing(p), '  the ring opens');
    check(await p.evaluate(() => document.activeElement?.classList.contains('puzzle-card')), '  focus lands on the card, not on a key');
    for (let i = 0; i < 2; i++) { for (const s of ['⬡','■','▲','●']) await press(p, s); await p.waitForTimeout(1000); }
    await p.locator('#puzzleHintBtn').click({ force: true }); await p.waitForTimeout(150);
    const l1 = await H.lastLine(p); await H.drain(p);
    check(/REFERENZEN: \d \/ 4/.test(l1), `  a guesser with unread markings is pointed at them first ("${l1}")`);
    await p.locator('#puzzleHintBtn').click({ force: true }); await p.waitForTimeout(150);
    const l2 = await H.lastLine(p); await H.drain(p);
    check(/BODENMARKIERUNG NENNT/.test(l2), `  the next request starts the method ladder ("${l2.slice(0, 30)}…")`);
    for (let i = 0; i < 2; i++) { for (const s of ['⬡','■','▲','●']) await press(p, s); await p.waitForTimeout(1000); }
    check(/AUFSTEIGEND/.test(await p.locator('#puzzleNote').innerText()), '  the 4th failure keeps the direction reminder');
    await ctx.close(); }
  { const { ctx, p } = await H.open(b, '/chapter0/chapter0.html', H.save({})); check(await toRing(p), 'the ring opens (cinematic run)');
    await p.locator('#puzzleHintBtn').click({ force: true }); await p.waitForTimeout(150);        // a hint line stays up
    for (const s of ['●','▲','■','⬡']) await press(p, s);
    let toast = false; const t0 = Date.now(); let inertAt12 = null, inertAt36 = null;
    while (Date.now() - t0 < 5200) { if (await p.locator('.achievement-toast').count()) toast = true;
      const el = Date.now() - t0; const inert = await p.evaluate(() => document.getElementById('sceneWrapper').inert === true);
      if (el > 1200 && inertAt12 === null) inertAt12 = inert; if (el > 3700 && inertAt36 === null) inertAt36 = inert; await p.waitForTimeout(100); }
    check(toast, '  the "Wieder da" toast appears even though a hint line was up');
    check(inertAt12 === true && inertAt36 === false, `  the room is inert through the cinematic and free for the release lines (${inertAt12}/${inertAt36})`);
    check(await p.locator('.dlg-container.visible').count() === 1 && /FREIGEGEBEN/.test(await H.lastLine(p)), '  release lines are on screen, not under a card');
    check((await p.locator('.door-hotspot .hotspot-label').innerText()) === 'SEKTOR 01', '  the seal\'s visible tag now says SEKTOR 01');
    await ctx.close(); }

  await b.close(); finish();
})();
