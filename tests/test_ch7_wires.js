/* Chapter 7's Schaltbild station in the real page, a few fresh instances:
   lighting the requested lamp TAGS is refused (and R-3MI/FAX-N say why, once),
   a readable cable shows the swapped tag up, hint 3 names the method, and the
   two switches with hidden routes release the anchor. */
'use strict';
const H = require('./helpers');
const PATCHED = true;
const { check, finish } = H.checker('ch7_wires');
const RUNS = +(process.env.RUNS || 6);
const cp = { act: 3, fakeCompleteSeen: true, metFaxn: true, anchors: { labels: true, displays: false, actions: false }, bsodSeen: false, integritySeen: false, sigFound: false, luxSeen: false };

async function openPage(b) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(s => { if (sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded', '1');
    localStorage.setItem('ka2_mobile_warning_dismissed', '1'); localStorage.setItem('ka2_save_v1', JSON.stringify(s)); },
    H.save({ chaptersCompleted: H.done(7), ch7_progress: cp }));
  await p.route('**://fonts.g**/**', r => r.abort());
  await p.goto(H.BASE + '/chapter7/chapter7.html', { waitUntil: 'domcontentloaded' });
  return { ctx, p, errs };
}
const read = p => p.evaluate(() => {
  const real = [...document.querySelectorAll('.vx-schema.real .vx-map')].map(m => m.classList.contains('hidden-route') ? null : +m.querySelector('span:last-child').textContent.slice(1) - 1);
  const want = document.querySelector('.vx-target b').textContent.match(/T\d/g).map(x => +x.slice(1) - 1);
  const lit = [...document.querySelectorAll('.vx-term')].map((e, i) => e.classList.contains('live') ? i : -1).filter(i => i >= 0);
  const on = [...document.querySelectorAll('.vx-sw')].map(e => e.classList.contains('on'));
  return { real, want, lit, on };
});
const sw = async (p, i) => { await p.locator(`.vx-sw[data-i="${i}"]`).click(); await p.waitForTimeout(40); };
const allOff = async p => { await p.locator('[data-act="wire-clear"]').click(); await p.waitForTimeout(40); };
const commit = async p => { await p.locator('[data-act="wire-commit"]').click(); await p.waitForTimeout(150); };
const hist = p => p.evaluate(() => GameEngine.dialogue.history().map(l => l.text).join(' | '));
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')).ch7_progress);

(async () => {
  const b = await H.launch();
  let lampFollowerWon = 0, crossCheckSeen = 0, cableWon = 0, trustLine = 0;
  for (let r = 0; r < RUNS; r++) {
    const { ctx, p, errs } = await openPage(b);
    await p.waitForTimeout(2500); await H.settled(p); await H.drain(p);
    for (let i = 0; i < 6 && !(await p.locator('#vxModal:not(.hidden)').count()); i++) {
      await p.locator('#sceneHotspots [aria-label="Schaltbild und Verkabelung prüfen"]').first().click({ force: true }); await p.waitForTimeout(250); await H.drain(p); }
    await H.drain(p);
    const st0 = await read(p);
    // map each switch to the tag that lights (the live lamps)
    const tagOf = [];
    for (let s = 0; s < 4; s++) { await sw(p, s); tagOf[s] = (await read(p)).lit[0]; await sw(p, s); }
    const visible = st0.real.map((t, s) => t === null ? -1 : s).filter(s => s >= 0);
    if (visible.some(s => tagOf[s] !== st0.real[s])) crossCheckSeen++;
    // lamp follower: light exactly the wanted tags
    await allOff(p);
    for (const t of st0.want) await sw(p, tagOf.indexOf(t));
    const lf = await read(p);
    check(lf.lit.sort().join() === st0.want.slice().sort().join(), `  run ${r}: lamp follower lit tags ${lf.lit} = want ${st0.want}`);
    await commit(p);
    const after = await saved(p);
    if (after.anchors.displays) { lampFollowerWon++; await ctx.close(); continue; }
    const status = await p.locator('#vxStatus').innerText();
    if (/Aber die Lampen leuchten doch/.test(await hist(p))) trustLine++;
    await H.drain(p);
    // second lamp-follower press: no repeat of the special line
    const h0 = (await hist(p)).split('|').length; await commit(p);
    const h1 = await hist(p); const repeated = (h1.match(/Aber die Lampen leuchten doch/g) || []).length;
    check(repeated === 1, `  run ${r}: the tag line is said once (${repeated}); status "${status}"`);
    await H.drain(p);
    // hints: the third V-TGM rung names the method
    for (let k = 0; k < 3; k++) { await p.locator('#hintBtnVTGM').click({ force: true }); await p.waitForTimeout(120); await H.drain(p); }
    const hh = await p.evaluate(() => GameEngine.dialogue.history().slice(-1)[0]);
    if (PATCHED) check(/hidden/.test(hh.text) && /verdeckter/.test(hh.subtitle || ''), `  run ${r}: third V-TGM hint names the hidden routes`);
    // cable solver: both hidden-route switches, visible ones off
    await allOff(p);
    for (let s = 0; s < 4; s++) if (!visible.includes(s)) await sw(p, s);
    await commit(p);
    const fin = await saved(p);
    if (fin.anchors.displays) cableWon++;
    check(!!fin.anchors.displays, `  run ${r}: the two hidden-route switches release the anchor`);
    await H.drain(p); await p.waitForTimeout(200);
    check(await p.locator('#vxModal.hidden').count() === 1 && await p.locator('#sceneHotspots [aria-label="Riegelbank bedienen"]').count() === 1, `  run ${r}: modal closed, Riegelbank is next`);
    check(errs.length === 0, `  run ${r}: no page errors ${errs.join(';')}`);
    await ctx.close();
  }
  console.log('');
  check(lampFollowerWon === 0, `  lighting the requested tags never released it (${lampFollowerWon}/${RUNS})`);
  check(crossCheckSeen === RUNS, `  a readable cable always showed a swapped tag (${crossCheckSeen}/${RUNS})`);
  check(trustLine === RUNS && cableWon === RUNS, `  the tag line came every time (${trustLine}), the hidden pair always won (${cableWon})`);
  await b.close(); finish();
})();
