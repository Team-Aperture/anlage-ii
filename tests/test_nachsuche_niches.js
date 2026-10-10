/* Coming back to a finished sector for a Fremdsignal (Nachsuche) on a phone:
   the return bar and the lifted robot icons must leave the signal niche
   tappable. On small phones the bar used to lay out in half the screen
   (left:50% leaves a fixed box only that much room), stacked into a
   105-115 px block, and sat — with the icons above it — on the Chapter 5 and
   7 niches: 9-34 % of the Ch5 niche and 13 % of the Ch7 niche could be hit.
   Every niche is hit-tested on a grid of real points (elementFromPoint), in
   portrait and landscape, with its own signal missing. */
const H = require('./helpers');
const { check, finish } = H.checker('nachsuche_niches');
const NICHES = [
  ['/chapter3/chapter3.html', 'Flackernde Linse untersuchen', 'sig_01'],
  ['/chapter4/chapter4.html', 'Braunen Kasten untersuchen', 'sig_02'],
  ['/chapter5/chapter5.html', 'Hinter der falschen Platte nachsehen', 'sig_03'],
  ['/chapter6/chapter6.html', 'Versuchsprotokoll öffnen', 'sig_04'],
  ['/chapter7/chapter7.html', 'Wandplatte untersuchen', 'sig_05'],
];
const VIEWPORTS = [[320, 568], [360, 640], [375, 667], [667, 375], [844, 390]];
const MIN = 50;      // % of the niche that a finger can reach

(async () => {
  const b = await H.launch();
  const worst = {};
  for (const [w, h] of VIEWPORTS) {
    for (const [url, label, own] of NICHES) {
      const { ctx, p, errs } = await H.open(b, url, H.save({ chaptersCompleted: H.ALL, signalsFound: H.SIG.filter(s => s !== own) }), { viewport: { width: w, height: h }, touch: true, mobile: true });
      await p.waitForTimeout(3000); await H.settled(p);
      for (let i = 0; i < 40 && !(await p.locator(`#sceneHotspots [aria-label="${label}"]`).count()); i++) { await H.drain(p); await p.waitForTimeout(300); }
      await H.drain(p); await p.waitForTimeout(900);
      const r = await p.evaluate(label => {
        const e = document.querySelector(`#sceneHotspots [aria-label="${label}"]`); if (!e) return null;
        const q = e.getBoundingClientRect(); let hit = 0, tot = 0;
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const t = document.elementFromPoint(q.left + q.width * (i + .5) / 8, q.top + q.height * (j + .5) / 8); tot++; if (t && (t === e || e.contains(t))) hit++; }
        const bar = document.getElementById('nachsucheBar');
        return { pct: Math.round(100 * hit / tot), bar: bar ? Math.round(bar.getBoundingClientRect().height) : 0, inView: q.right <= innerWidth && q.bottom <= innerHeight && q.left >= 0 };
      }, label);
      const tag = `${own} ${w}x${h}`;
      check(r && r.pct >= MIN && r.inView, `  ${tag}: ${r ? r.pct + ' % of the niche reachable (bar ' + r.bar + ' px)' : 'niche missing'}`);
      worst[own] = Math.min(worst[own] ?? 100, r ? r.pct : 0);
      if (errs.length) check(false, `  ${tag}: page errors ${errs[0]}`);
      await ctx.close();
    }
  }
  console.log('\n       worst case per niche: ' + Object.entries(worst).map(([k, v]) => `${k} ${v} %`).join(' · '));
  await b.close(); finish();
})();
