/* Chapter 2's Frostmuster, pinned in the page: nothing promises several
   solutions, the card and F-RØ5CHI state the ice budget (18, pink included),
   the one layout wins with exactly 18, and running out of ice says WHY — a
   valid grouping that needs 19, a channel that separates nothing, or simply
   "the right answer fits in exactly 18". The layouts come from
   analyse_ch2_frost.js, which enumerates them from the shipped constants. */
const H = require('./helpers');
const FIT = require('./analyse_ch2_frost.js').layouts;
const { check, finish } = H.checker('ch2_frost');
const seed = ch2 => { const sv = H.save({ chaptersCompleted: ['ch0', 'ch1'] }); sv.chapterState = { ch2 }; return sv; };
const base = { thawState: 1, metFroschi: true, plantsStudied: true, orgelNudged: true, wellRevealed: true, p1Solved: true, p2Solved: false, bayernPMOFound: false, seen: {}, talkSeen: {}, react: { p1: {}, p2: {} }, p1Fails: 0 };

async function open(b, ch2 = base, vp = { width: 1280, height: 800 }) {
  const r = await H.open(b, '/chapter2/chapter2.html', seed(ch2), { viewport: vp, mobile: vp.width < 500 });
  await r.p.waitForTimeout(2200); await H.drain(r.p); await r.p.waitForTimeout(200);
  await r.p.locator('#sceneHotspots [aria-label="Eisbrunnen untersuchen"]').first().click({ force: true });
  await r.p.waitForTimeout(200); await H.drain(r.p); await r.p.waitForTimeout(250);
  return r;
}
const status = p => p.evaluate(() => { const e = document.getElementById('puzzle2Status'); return { cls: e.className, text: e.textContent }; });
const cut = async (p, e) => { await p.locator(`#frostGrid .frost-ch[data-edge="${e}"]`).click({ force: true }); await p.waitForTimeout(25); };
const hist = p => p.evaluate(() => GameEngine.dialogue.history().map(l => l.text));
const cp = p => p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')).chapterState.ch2);
const visible = p => p.locator('.dlg-container.visible').count();

(async () => {
  const b = await H.launch();
  const SOL = FIT.find(f => f.ice === 18);
  check(FIT.length === 9 && FIT.filter(f => f.ice === 18).length === 1 && !SOL.player.includes('h,0,2'), `(nine layouts fit the carved channels, one fits the ice)`);

  console.log('\n[A] the intro and the card state the budget; nothing promises several solutions');
  { const { ctx, p, errs } = await open(b);
    const h = (await hist(p)).join(' | ');
    check(!/mehrere L(ö|oe)sungen/i.test(h), '  no line claims several solutions');
    check(/Achtzehn Kanäl, de pinkn/.test(h) && /bloß oane kummt mitm Eis aus/.test(h), '  F-RØ5CHI names 18 (pink included) and that only one layout fits the ice');
    check(/Eindeutig genial/.test(h), '  R-3MI lands the beat');
    const sub = await p.locator('#puzzle2Modal .puzzle-sub').innerText();
    check(/GENAU 18/.test(sub) && /PINKE ZÄHLEN MIT/.test(sub), `  card rule line: ${sub}`);
    check(/EIS 6\/18/.test((await status(p)).text), '  counter starts at 6/18 (the carved channels count)');
    check(errs.length === 0, '  no page errors ' + errs.join(';')); await ctx.close(); }

  console.log('\n[B] the one layout wins with exactly 18');
  { const { ctx, p, errs } = await open(b);
    for (const e of SOL.player) await cut(p, e);
    const s = await status(p);
    check(/ok/.test(s.cls) && /6 \/ 6 BEREICHE · BRUNNEN ISOLIERT · EIS 18\/18/.test(s.text), '  ' + s.text);
    await p.waitForTimeout(1300);
    check(/FROSTMUSTER GELÖST/.test(await H.lastLine(p)), '  the restoration plays');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[C] a valid grouping that needs 19: the refused channel names the ice, once, latched first');
  for (const f of FIT.filter(f => f.ice === 19)) {
    const { ctx, p, errs } = await open(b);
    for (const e of f.player.slice(0, -1)) await cut(p, e);
    const before = (await hist(p)).length;
    await cut(p, f.player[f.player.length - 1]);
    const s = await status(p);
    check(/error/.test(s.cls) && /SO WÄREN ALLE BEREICHE FERTIG — MIT 19 KANÄLEN\. DAS EIS REICHT NUR FÜR 18\./.test(s.text), '  ' + s.text);
    check(await p.evaluate(() => document.querySelectorAll('#frostGrid .frost-ch.active').length) === 12, '  the 19th channel was not placed');
    const h = await hist(p);
    check(h.length === before + 1 && /De Gruppn passn scho/.test(h[h.length - 1]), '  F-RØ5CHI: ' + h[h.length - 1]);
    check((await cp(p))?.react?.p2?.over === true, '  react.p2.over is in the checkpoint');
    await H.drain(p); const n = (await hist(p)).length;
    await cut(p, f.player[f.player.length - 1]);
    check((await hist(p)).length === n && /SO WÄREN/.test((await status(p)).text), '  a second refusal repeats the status, not the line');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[D] a grouping that needs 20: refused two short, the generic line says the answer fits 18');
  for (const f of FIT.filter(f => f.ice === 20).slice(0, 2)) {
    const { ctx, p, errs } = await open(b);
    for (const e of f.player.slice(0, 12)) await cut(p, e);
    await cut(p, f.player[12]);
    const s = await status(p);
    check(/error/.test(s.cls) && /KEIN EIS MEHR\. DIE RICHTIGE AUFTEILUNG KOMMT MIT GENAU 18 KANÄLEN AUS\./.test(s.text), '  ' + s.text);
    check(/Aus is mitm Eis/.test(await H.lastLine(p)), '  F-RØ5CHI: ' + await H.lastLine(p));
    check((await cp(p))?.react?.p2?.empty === true, '  react.p2.empty is in the checkpoint');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[E] the right grouping with one wasted channel inside a square');
  { const { ctx, p, errs } = await open(b);
    await cut(p, 'h,0,2');                         // inside square B: separates nothing
    for (const e of SOL.player.slice(0, -1)) await cut(p, e);
    await cut(p, SOL.player[SOL.player.length - 1]);
    const s = await status(p);
    check(/EIN KANAL TRENNT NICHTS/.test(s.text), '  ' + s.text);
    await H.drain(p);
    await cut(p, 'h,0,2'); await cut(p, SOL.player[SOL.player.length - 1]);
    check(/ok/.test((await status(p)).cls), '  removing it and cutting the last border wins');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[F] hint ladder: step 2 names the budget, step 3 the squares; a tap mid-line never spends a hint');
  { const { ctx, p, errs } = await open(b);
    await p.locator('#hintBtnFroschi').click(); await H.drain(p);
    await p.locator('#hintBtnVTGM').click(); await p.waitForTimeout(50);
    check(/Eighteen channels, the pink ones included/.test(await H.lastLine(p)), '  step 2: ' + await H.lastLine(p));
    await p.locator('#hintBtnVTGM').click(); await p.waitForTimeout(50);   // mid-line tap
    check(/2 VERFÜGBAR/.test(await p.locator('#hintCount').innerText()), '  ' + await p.locator('#hintCount').innerText());
    await H.drain(p);
    await p.locator('#hintBtnR3MI').click(); await p.waitForTimeout(50);
    check(/vier Nähte/.test(await H.lastLine(p)), '  step 3: ' + await H.lastLine(p));
    // a hint line still up: the out-of-ice reaction must not replace it
    for (const e of FIT.find(f => f.ice === 20).player.slice(0, 13)) await cut(p, e);
    check(/vier Nähte/.test(await H.lastLine(p)), '  the hint line was not talked over');
    check(!(await cp(p))?.react?.p2?.empty, '  and nothing was latched for it');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[G] an older checkpoint without react.p2 does not break the reaction');
  { const { ctx, p, errs } = await open(b, { ...base, react: { p1: {} } });
    for (const e of FIT.find(f => f.ice === 20).player.slice(0, 13)) await cut(p, e);
    check(/Aus is mitm Eis/.test(await H.lastLine(p)), '  reaction plays');
    check(errs.length === 0, '  no page errors ' + errs.join(';')); await ctx.close(); }

  console.log('\n[H] phone 360×640: the longest new status keeps the card on screen');
  { const { ctx, p, errs } = await open(b, base, { width: 360, height: 640 });
    const m = await p.evaluate(() => { const st = document.getElementById('puzzle2Status');
      const L = ['SO WÄREN ALLE BEREICHE FERTIG — ABER EIN KANAL TRENNT NICHTS.', 'SO WÄREN ALLE BEREICHE FERTIG — MIT 19 KANÄLEN. DAS EIS REICHT NUR FÜR 18.', 'KEIN EIS MEHR. DIE RICHTIGE AUFTEILUNG KOMMT MIT GENAU 18 KANÄLEN AUS.'];
      return L.map(t => { st.textContent = t; const r = document.querySelector('#puzzle2Modal .puzzle-card').getBoundingClientRect(); return { h: Math.round(st.getBoundingClientRect().height), bottom: Math.round(r.bottom), vh: innerHeight }; }); });
    m.forEach(x => check(x.h <= 36 && x.bottom <= x.vh, `  status ${x.h}px (≤2 lines), card bottom ${x.bottom} ≤ ${x.vh}`));
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  await b.close(); finish();
})();
