/* A modal's action row must stay clickable while a dialogue line is on screen.
   The strip is fixed to the bottom above the modals; without reserved space it
   lands on the buttons — the shape of the Fernrelais beta blocker. Every
   chapter, desktop and 360px. */
const H = require('./helpers');
const { check, finish } = H.checker('dlgspace');
(async () => {
  const b = await H.launch();
  for (const vp of [{ width: 1280, height: 800 }, { width: 360, height: 740 }]) {
    console.log(`\n[${vp.width}px]`);
    for (let n = 0; n <= 9; n++) {
      const sv = H.save({ chaptersCompleted: H.ALL, signalsFound: H.SIG });
      const { ctx, p, errs } = await H.open(b, `/chapter${n}/chapter${n}.html`, sv, { viewport: vp });
      await p.waitForTimeout(3000); await H.settled(p); await p.waitForTimeout(300);
      const r = await p.evaluate(() => new Promise(res => {
        const m = document.querySelector('.puzzle-modal');
        if (!m) return res({ skipped: true });
        const card = m.querySelector('.puzzle-card') || m.firstElementChild || m;
        const filler = document.createElement('div'); filler.style.height = '620px';
        const acts = document.createElement('div'); acts.className = 'puzzle-actions';
        acts.innerHTML = '<button class="ka-btn primary" id="__probe">[ PRÜFEN ]</button>';
        card.appendChild(filler); card.appendChild(acts); m.classList.remove('hidden');
        GameEngine.dialogue.load([{ speaker: 'SYSTEM', text: 'Eine Zeile, die den Dialogstreifen sichtbar macht und ihn über den Modal-Rand legt.' }]);
        setTimeout(() => {
          const btn = document.getElementById('__probe'); btn.scrollIntoView({ block: 'center' });
          setTimeout(() => {
            const r = btn.getBoundingClientRect(), d = document.querySelector('.dlg-container').getBoundingClientRect();
            const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            res({ skipped: false, dlgUp: document.body.classList.contains('dlg-up'),
                  inView: r.top >= 0 && r.bottom <= innerHeight + 1,
                  overlaps: !(r.bottom <= d.top || r.top >= d.bottom),
                  reachable: !!top && (top === btn || btn.contains(top)), hit: top ? (top.id || top.className) : 'nothing' });
          }, 250);
        }, 900);
      }));
      if (r.skipped) { console.log(`  --   ch${n}: no puzzle modal`); await ctx.close(); continue; }
      check(r.dlgUp, `ch${n}: reserves space while a line is up`);
      check(r.inView && !r.overlaps && r.reachable, `  ch${n}: action row reachable under the strip (hit: ${r.hit})`);
      check(errs.length === 0, `  ch${n}: no page errors`);
      await ctx.close();
    }
  }
  await b.close(); finish();
})();
