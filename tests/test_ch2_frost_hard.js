/* Frostmuster VERSCHÄRFT (NG+ hard mode): a 6×5 tablet, two wells, seven
   groups, 24 ice. The one layout the proof (analyse_ch2_frost.js) finds wins;
   a valid grouping that needs 25 is refused with the reason; the card, the
   intro and the hint ladder speak about the larger board; phones keep the
   whole board and its buttons on screen. NORMAL NG+ and a first run still
   get the 5×5 tablet. */
const H = require('./helpers');
const A = require('./analyse_ch2_frost.js');
const FIT = A.hard.layouts;
const { check, finish } = H.checker('ch2_frost_hard');
const LEGACY = { cycle: 2, earned: [], endings: ['trust'], zieldaten: true, lastEnding: 'trust' };
const seed = (mode) => { const sv = H.save({ chaptersCompleted: ['ch0', 'ch1'], ...(mode != null ? { legacy: LEGACY, mode } : {}) }); sv.chapterState = { ch2: base }; return sv; };
const base = { thawState: 1, metFroschi: true, plantsStudied: true, orgelNudged: true, wellRevealed: true, p1Solved: true, p2Solved: false, bayernPMOFound: false, seen: {}, talkSeen: {}, react: { p1: {}, p2: {} }, p1Fails: 0 };

async function open(b, mode = 'hard', vp = { width: 1280, height: 800 }) {
  const r = await H.open(b, '/chapter2/chapter2.html', seed(mode), { viewport: vp, mobile: vp.width < 500 });
  await r.p.waitForTimeout(2200); await H.drain(r.p); await r.p.waitForTimeout(200);
  await r.p.locator('#sceneHotspots [aria-label="Eisbrunnen untersuchen"]').first().click({ force: true });
  await r.p.waitForTimeout(200); await H.drain(r.p); await r.p.waitForTimeout(250);
  return r;
}
const status = p => p.evaluate(() => { const e = document.getElementById('puzzle2Status'); return { cls: e.className, text: e.textContent }; });
const cut = async (p, e) => { await p.locator(`#frostGrid .frost-ch[data-edge="${e}"]`).click({ force: true }); await p.waitForTimeout(25); };
const hist = p => p.evaluate(() => GameEngine.dialogue.history().map(l => l.text));
const board = p => p.evaluate(() => ({ cells: document.querySelectorAll('#frostGrid .frost-cell').length,
  wells: [...document.querySelectorAll('#frostGrid .frost-well')].map(e => e.dataset.r + ',' + e.dataset.c),
  fixed: document.querySelectorAll('#frostGrid .frost-ch.fixed').length }));

(async () => {
  const b = await H.launch();
  const SOL = FIT.find(f => f.ice === 24);
  check(FIT.length === 18 && FIT.filter(f => f.ice === 24).length === 1, '(18 layouts fit the carved channels, one fits the ice)');

  console.log('\n[A] the board, the card and the intro describe the larger tablet');
  { const { ctx, p, errs } = await open(b);
    const g = await board(p);
    check(g.cells === 30 && g.wells.sort().join(' ') === '2,1 3,3' && g.fixed === 5, `  6×5 cells, wells ${g.wells.join(' ')}, ${g.fixed} carved channels`);
    const h = (await hist(p)).join(' | ');
    check(/Sechs Reihn, fünf Spoitn — und zwoa Brunnen/.test(h) && /sieben Bereiche/.test(h) && /vierazwanzg Kanäl/.test(h), '  F-RØ5CHI names the size, both wells, seven groups and 24 ice');
    check(!/Fünf-mal-Fünf/.test(h), '  the 5×5 intro is not used');
    const sub = await p.locator('#puzzle2Modal .puzzle-sub').innerText();
    check(/SIEBEN 4ER-BEREICHE/.test(sub) && /GENAU 24/.test(sub), `  card: ${sub}`);
    check(/0 \/ 7 BEREICHE · BRUNNEN 0\/2 ISOLIERT · EIS 5\/24/.test((await status(p)).text), '  ' + (await status(p)).text);
    check(errs.length === 0, '  no page errors ' + errs.join(';')); await ctx.close(); }

  console.log('\n[B] the proven layout wins with exactly 24');
  { const { ctx, p, errs } = await open(b);
    for (const e of SOL.player) await cut(p, e);
    const s = await status(p);
    check(/ok/.test(s.cls) && /7 \/ 7 BEREICHE · BRUNNEN 2\/2 ISOLIERT · EIS 24\/24/.test(s.text), '  ' + s.text);
    check(await p.locator('#frostGrid .frost-cell.region-6').count() === 4, '  the seventh group gets its own colour');
    await p.waitForTimeout(1300);
    check(/FROSTMUSTER GELÖST/.test(await H.lastLine(p)), '  the restoration plays');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[C] one well cut free is counted, not a win');
  { const { ctx, p, errs } = await open(b);
    for (const e of ['h,2,0', 'h,2,1', 'v,1,1', 'v,2,1']) await cut(p, e);
    check(/BRUNNEN 1\/2 ISOLIERT/.test((await status(p)).text), '  ' + (await status(p)).text);
    check(await p.locator('#frostGrid .frost-well.isolated').count() === 1, '  only that well glows');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[D] a valid grouping that needs 25: refused, with the reason');
  for (const f of FIT.filter(f => f.ice === 25)) {
    const { ctx, p, errs } = await open(b);
    for (const e of f.player.slice(0, -1)) await cut(p, e);
    await cut(p, f.player[f.player.length - 1]);
    const s = await status(p);
    check(/error/.test(s.cls) && /MIT 25 KANÄLEN\. DAS EIS REICHT NUR FÜR 24\./.test(s.text), '  ' + s.text);
    check(/De Gruppn passn scho/.test(await H.lastLine(p)), '  F-RØ5CHI: ' + await H.lastLine(p));
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[E] the hint ladder is the VERSCHÄRFT one');
  { const { ctx, p, errs } = await open(b);
    await p.locator('#hintBtnVTGM').click(); await p.waitForTimeout(50);
    check(/Cut each one free on all four sides/.test(await H.lastLine(p)), '  step 1: ' + await H.lastLine(p)); await H.drain(p);
    await p.locator('#hintBtnR3MI').click(); await p.waitForTimeout(50);
    check(/Vierundzwanzig Kanäle/.test(await H.lastLine(p)), '  step 2: ' + await H.lastLine(p)); await H.drain(p);
    await p.locator('#hintBtnR3MI').click(); await p.waitForTimeout(50);
    check(/genau vier Quadraten/.test(await H.lastLine(p)), '  step 3: ' + await H.lastLine(p)); await H.drain(p);
    await p.locator('#hintBtnVTGM').click(); await p.waitForTimeout(50);
    check(/pink channel as a finished border/.test(await H.lastLine(p)), '  step 4: ' + await H.lastLine(p));
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[F] a first run and NORMAL NG+ keep the 5×5 tablet');
  for (const [label, mode] of [['first run', null], ['NORMAL NG+', '']]) {
    const { ctx, p, errs } = await open(b, mode);
    const g = await board(p);
    check(g.cells === 25 && g.wells.join() === '2,2' && g.fixed === 6, `  ${label}: 5×5, well 2,2, 6 carved`);
    check(/1 \/ 6 BEREICHE · BRUNNEN OFFEN · EIS 6\/18/.test((await status(p)).text), '  ' + (await status(p)).text);
    check(/GENAU 18/.test(await p.locator('#puzzle2Modal .puzzle-sub').innerText()), '  card still says 18');
    check(errs.length === 0, '  no page errors'); await ctx.close();
  }

  console.log('\n[G] phones and small windows: the whole board and both buttons fit, taps land on channels');
  for (const vp of [[320, 568], [360, 640], [390, 844], [768, 1024], [1024, 600], [1280, 600]]) {
    const { ctx, p, errs } = await open(b, 'hard', { width: vp[0], height: vp[1] });
    await p.evaluate(() => { const st = document.getElementById('puzzle2Status'); st.textContent = 'SO WÄREN ALLE BEREICHE FERTIG — MIT 25 KANÄLEN. DAS EIS REICHT NUR FÜR 24.'; });
    const m = await p.evaluate(() => {
      const g = document.getElementById('frostGrid').getBoundingClientRect();
      const card = document.querySelector('#puzzle2Modal .puzzle-card');
      const btns = [...document.querySelectorAll('#puzzle2Modal .puzzle-actions button')];
      btns[btns.length - 1].scrollIntoView({ block: 'center' });
      const bOk = btns.every(x => { const r = x.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t === x || x.contains(t); });
      return { gl: Math.round(g.left), gr: Math.round(g.right), w: innerWidth, sx: document.scrollingElement.scrollWidth - innerWidth, cardOverflow: card.scrollWidth - card.clientWidth, bOk };
    });
    check(m.gl >= 0 && m.gr <= m.w && m.sx <= 0 && m.cardOverflow <= 0 && m.bOk, `  ${vp.join('×')}: board ${m.gl}–${m.gr} of ${m.w}, no sideways scroll, buttons reachable`);
    // a real tap on the far bottom-right channel of the tall board
    const e = p.locator('#frostGrid .frost-ch[data-edge="h,5,3"]');
    const f = p.locator('#frostGrid .frost-ch[data-edge="v,4,4"]');
    await f.scrollIntoViewIfNeeded(); const bb = await f.boundingBox();
    if (vp[0] < 500) await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); else await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await p.waitForTimeout(80);
    check(await f.evaluate(x => x.classList.contains('active')) && await e.evaluate(x => x.classList.contains('fixed')), '  a tap on the bottom row channel sets it');
    check(errs.length === 0, '  no page errors'); await ctx.close();
  }

  await b.close(); finish();
})();
