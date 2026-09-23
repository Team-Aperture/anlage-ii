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

  await b.close(); finish();
})();
