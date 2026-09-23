/* The Nachsuche contract in every finished sector: the room answers, nothing
   replays the ending, nothing hands out the puzzle twice. */
const H = require('./helpers');
const { check, finish } = H.checker('nachsuche_all');
const SCOPE = '#sceneHotspots [aria-label], .scene-canvas > [aria-label]';
(async () => {
  const b = await H.launch();
  for (const n of [0,1,2,3,4,5,6,7,8]) {
    console.log(`\n[sector 0${n}]`);
    const { ctx, p, errs } = await H.open(b, `/chapter${n}/chapter${n}.html`, H.save({ chaptersCompleted: H.ALL, signalsFound: H.SIG }));
    await p.waitForTimeout(2800); await H.drain(p); await p.waitForTimeout(300);
    check(await p.locator('#nachsucheBar').count() === 1, 'opens its Nachsuche');
    const labels = await p.evaluate(s => [...new Set([...document.querySelectorAll(s)].map(e => e.getAttribute('aria-label')))], SCOPE);
    check(labels.length > 0, `  the room has objects (${labels.length})`);
    const here = p.url(); let replayed = false, puzzle = null, left = false;
    for (let round = 0; round < 2 && !replayed && !puzzle && !left; round++) for (const l of labels) {
      if (p.url() !== here) { left = true; break; }
      const el = p.locator(SCOPE.split(', ').map(x => x + `[aria-label="${l.replace(/"/g,'\\"')}"]`).join(', '));
      if (!(await el.count())) continue;
      await el.first().click({ force: true }).catch(() => {}); await p.waitForTimeout(180); await H.drain(p, 40);
      if (await p.locator('.chapter-complete:not(.hidden), #chapterComplete:not(.hidden)').count()) { replayed = true; break; }
      puzzle = await p.evaluate(() => { const m = [...document.querySelectorAll('.puzzle-modal')].find(e => !e.classList.contains('hidden')); if (!m) return null;
        const s = [...m.querySelectorAll('button')].find(x => /(check|commit)$/.test(x.dataset.act || '') || (x.closest('.puzzle-actions') && /PRÜFEN|BESTÄTIGEN|ÜBERNEHMEN|AUSWERTEN|BEOBACHTEN|SYNCHRONISIEREN/i.test(x.textContent || '')));
        return s ? (m.id || m.className) + ' → ' + s.textContent.trim() : null; });
      if (puzzle) break;
    }
    check(!replayed, '  clicking around never replays the ending');
    check(!puzzle, `  nor re-offers a solved puzzle${puzzle ? ' (' + puzzle + ')' : ''}`);
    check(errs.length === 0, `  no page errors${errs.length ? ': ' + errs[0] : ''}`); await ctx.close();
  }
  await b.close(); finish();
})();
