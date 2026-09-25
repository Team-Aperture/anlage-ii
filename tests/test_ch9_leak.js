/* Chapter 9 is a secret. Nothing a player can SEE before unlocking it may
   imply anything follows Sector 08. */
const H = require('./helpers');
const { check, finish } = H.checker('ch9_leak');
const BAD = /\b9\s*\/\s*9|\/\s*9\s*(KAPITEL|SEKTOREN)|KAPITEL\s*0?9|SEKTOR\s*0?9|Kammer|BONUS/i;
async function look(b, sv) {
  const { ctx, p, errs } = await H.open(b, '/index.html', sv);
  await p.waitForTimeout(7500);
  const txt = await p.evaluate(() => document.body.innerText);
  const nodes = await p.evaluate(() => [...document.querySelectorAll('.sector-node')].map(n => n.textContent.trim()));
  return { ctx, p, errs, txt, nodes };
}
(async () => {
  const b = await H.launch();
  console.log('\n[A] brand-new game');
  { const r = await look(b, H.save({}));
    check(/FORTSCHRITT: 0 \/ 8 SEKTOREN/.test(r.txt), `counts eight sectors (${(r.txt.match(/FORTSCHRITT[^\n·]*/)||[''])[0].trim()})`);
    check(!BAD.test(r.txt), '  nothing hints at a ninth');
    check(!r.nodes.includes('?'), `  no mystery slot (${r.nodes.join(',')})`);
    await r.p.locator('.title-menu .ka-btn', { hasText: 'ERFOLGE' }).click(); await r.p.waitForTimeout(600);
    const ach = await r.p.locator('#achievementOverlay').innerText();
    check(!/Wahrheit|Kammer|registriert|Hiii|zurück/i.test(ach), '  locked achievements name nothing');
    check(r.errs.length === 0, '  no page errors'); await r.ctx.close(); }
  console.log('\n[B] finished, signals incomplete');
  { const r = await look(b, H.save({ chaptersCompleted: H.ALL, signalsFound: ['sig_01','sig_02'], flags: { ka1_verified: true, zieldaten: true } }));
    check(/FORTSCHRITT: 8 \/ 8 SEKTOREN/.test(r.txt), 'reads as complete');
    check(!BAD.test(r.txt) && !r.nodes.includes('?'), '  and still no ninth'); await r.ctx.close(); }
  console.log('\n[C] legitimately unlocked');
  { const r = await look(b, H.save({ chaptersCompleted: H.ALL, signalsFound: H.SIG, flags: { ka1_verified: true, zieldaten: true } }));
    check(r.nodes.includes('?'), `the cross-reference appears once earned (${r.nodes.join(',')})`);
    check(/FORTSCHRITT: 8 \/ 8 SEKTOREN/.test(r.txt), '  sector count stays at eight'); await r.ctx.close(); }
  console.log('\n[D] completion cards');
  for (const [n, k] of [[1,1],[4,4],[7,7]]) {
    const { ctx, p } = await H.open(b, `/chapter${n}/chapter${n}.html`, H.save({ chaptersCompleted: H.done(k) }));
    await p.waitForTimeout(6000);
    const cards = (await p.evaluate(() => document.documentElement.innerHTML)).match(/FORTSCHRITT:[^<]*/g) || [];
    check(!cards.some(t => /\/\s*9/.test(t)), `ch${n}: no card counts to nine (${cards.map(t=>t.trim()).join(' | ') || 'none yet'})`);
    await ctx.close();
  }
  await b.close(); finish();
})();
