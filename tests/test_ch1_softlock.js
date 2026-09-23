/* Chapter 1 softlock findings from the total audit, pinned. Drives the real
   chapter: Act 1 evidence → KLONK → corridor → encounter → hall → repairs. */
const H = require('./helpers');
const { check, finish } = H.checker('ch1_softlock');
const src = H.fs.readFileSync(H.path.join(H.ROOT, 'chapter1/chapter1.js'), 'utf8');
const grab = name => JSON.parse(src.match(new RegExp('const ' + name + ' = (\\[[\\s\\S]*?\\]);'))[1].replace(/\s+/g, '').replace(/,\]/g, ']'));
const CONN = { 0: [[], [], [], []], 1: [['N','S'],['E','W'],['N','S'],['E','W']], 2: [['N','E'],['E','S'],['S','W'],['W','N']],
  3: [['N','E','S'],['E','S','W'],['S','W','N'],['W','N','E']], 4: [['N','E','S','W'],['N','E','S','W'],['N','E','S','W'],['N','E','S','W']] };
const P = { p1: { types: grab('P1_TYPES'), base: grab('P1_BASE_ROT'), grid: '#puzzle1Grid' }, p2: { types: grab('P2_TYPES'), base: grab('P2_BASE_ROT'), grid: '#puzzle2Grid' } };
const seed = () => H.save({ chaptersCompleted: ['ch0'] });

const hs = async (p, aria) => { await p.locator(`#sceneHotspots [aria-label="${aria}"]`).first().click({ force: true }); await p.waitForTimeout(120); };
async function drainAll(p, settle = 400) { await H.drain(p); await p.waitForTimeout(settle); await H.drain(p); }

// rotate every free tile until its arms match the base orientation — the grid
// is scrambled at random, so the test reads the DOM instead of guessing
async function solve(p, which) {
  const { types, base, grid } = P[which];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const want = CONN[types[r][c]][base[r][c]].slice().sort().join('');
    for (let k = 0; k < 4; k++) {
      const have = await p.evaluate(([g, i]) => { const t = document.querySelector(g).children[i]; if (t.classList.contains('fixed')) return null;
        return [...t.querySelectorAll('.pipe-arm')].map(a => a.className.match(/arm-(\w)/)[1].toUpperCase()).sort().join(''); }, [grid, r * 4 + c]);
      if (have === null || have === want) break;
      await p.locator(grid).locator('.pipe-tile').nth(r * 4 + c).click({ force: true }); await p.waitForTimeout(40);
    }
  }
}

// title card → Act 1 → evidence → KLONK → corridor → encounter → reaction → hall intro (last line still up)
async function toHallIntro(p) {
  await p.waitForTimeout(3800); await drainAll(p);
  await hs(p, 'Wartungsterminal untersuchen'); await drainAll(p);
  await hs(p, 'Leitungspaneel untersuchen'); await H.drain(p); await p.waitForTimeout(700); await drainAll(p);   // KLONK beat
  await hs(p, 'Dunklen Korridor betreten'); await H.drain(p); await p.waitForTimeout(900); await drainAll(p);   // scene switch + Hiii
  await p.locator('.choice-btn').first().click(); await p.waitForTimeout(150); await H.drain(p);                 // reaction → exposition → hall intro
}

(async () => {
  const b = await H.launch();

  console.log('\n[A] a talk menu opened in the 600 ms before the *KLONK* beat cannot steal the repair');
  { const { ctx, p, errs } = await H.open(b, '/chapter1/chapter1.html', seed());
    await toHallIntro(p);                                                   // the hall intro's last line just closed; the beat is 600 ms out
    check(await p.evaluate(() => document.getElementById('robotIcons').classList.contains('hidden')), 'the units step out of the way for the pause (no menu can open in it)');
    await p.waitForTimeout(1200);                                           // the beat lands
    check(await p.evaluate(() => !document.getElementById('robotIcons').classList.contains('hidden')), '  the units are back with the beat');
    check(await p.locator('#sceneHotspots .prop-interactive').count() >= 5, '  the hall is clickable during the beat');
    await drainAll(p);
    check(await p.locator('#puzzle1Modal:not(.hidden)').count() === 1, '  repair 1 opened after the beat');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[B] the lit hall exists before its lines; a reload resumes there; the corridor and node exist before theirs');
  { const { ctx, p, errs } = await H.open(b, '/chapter1/chapter1.html', seed());
    await toHallIntro(p); await p.waitForTimeout(1200); await drainAll(p);
    check(await p.locator('#puzzle1Modal:not(.hidden)').count() === 1, 'repair 1 is open');
    await solve(p, 'p1'); await p.waitForTimeout(1000);
    check(await p.locator('#puzzle1Modal:not(.hidden)').count() === 0, '  repair 1 solved');
    check(await p.locator('.dlg-container.visible').count() === 1 && await p.locator('#sceneHotspots [aria-label="Inneres Tor untersuchen"]').count() === 1, '  the inner gate is there while the lines still run');
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')).chapterState.ch1);
    check(st && st.p1Solved === true, '  checkpoint written');
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2200);
    const first = await H.lastLine(p).catch(() => '');
    check(/WARTUNGSHALLE/.test(first) && await p.locator('#sceneHotspots [aria-label="Inneres Tor untersuchen"]').count() === 1, `  reload resumes in the lit hall ("${first.slice(0, 40)}…")`);
    check(/5 ?%/.test(await p.locator('#reactProgress').innerText()), '  progress reads 5 %');
    await drainAll(p);
    await hs(p, 'Inneres Tor untersuchen'); await H.step(p, 2);              // the gate's two lines → corridor line 1
    check(await p.locator('.dlg-container.visible').count() === 1 && await p.locator('#sceneHotspots [aria-label="Weiter zum Wartungsknoten"]').count() === 1, '  the corridor has a way on while its lines run');
    await H.step(p, 5);                                                      // corridor lines → node line 1
    check(await p.locator('.dlg-container.visible').count() === 1 && await p.locator('#sceneHotspots [aria-label="Zentrale Konsole untersuchen"]').count() === 1, '  the node room is built while its lines still run');
    await drainAll(p);
    await hs(p, 'Zentrale Konsole untersuchen'); await drainAll(p);
    check(await p.locator('#puzzle2Modal:not(.hidden)').count() === 1, '  repair 2 opens');
    await solve(p, 'p2'); await p.waitForTimeout(1000);
    check(await p.locator('#puzzle2Modal:not(.hidden)').count() === 0, '  repair 2 solved');
    check(await p.locator('#sceneHotspots [aria-label="Tür zu Sektor 02 untersuchen"]').count() === 1, '  the ending keeps the room (door still there)');
    check(await p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')).chapterState.ch1?.p2Solved === true), '  the checkpoint holds the ending until the card shows');
    await drainAll(p);                                                      // ending lines → answer menu
    check(await p.evaluate(() => !document.getElementById('choiceOverlay').classList.contains('hidden')), '  the answer menu is up');
    await p.locator('#sceneHotspots [aria-label="Tür zu Sektor 02 untersuchen"]').click({ force: true }); await p.waitForTimeout(200);
    check(await p.locator('#chapterComplete:not(.hidden)').count() === 0, '  a tap on the room while the menu is up does nothing');
    await p.locator('.choice-btn').first().click(); await p.waitForTimeout(150); await drainAll(p);
    check(await p.locator('#sceneHotspots [aria-label="Sektor 02 betreten"]').count() === 1, '  the labelled exit appears after the answer');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[C] a talk menu re-opened within 410 ms of a pick stays open');
  { const { ctx, p } = await H.open(b, '/chapter1/chapter1.html', seed());
    await toHallIntro(p); await p.waitForTimeout(1200); await drainAll(p); await solve(p, 'p1'); await p.waitForTimeout(1000); await drainAll(p);
    await p.locator('.r3mi-icon').click(); await p.waitForTimeout(100);
    await p.locator('.choice-btn', { hasText: 'Nichts' }).click(); await p.waitForTimeout(120);
    await p.locator('.r3mi-icon').click(); await p.waitForTimeout(700);
    check(await p.evaluate(() => { const o = document.getElementById('choiceOverlay'); return !o.classList.contains('hidden') && o.classList.contains('visible'); }), 'a menu re-opened inside the fade stays open');
    await ctx.close(); }

  console.log('\n[D] revisit: the open Sektor-02 door actually leads to Sektor 02; the console reads calibrated');
  { const { ctx, p } = await H.open(b, '/chapter1/chapter1.html', H.save({ chaptersCompleted: ['ch0', 'ch1'] }));
    await p.waitForTimeout(2000); await drainAll(p);
    await hs(p, 'Inneres Tor untersuchen'); await drainAll(p); await drainAll(p);
    await hs(p, 'Zentrale Konsole untersuchen'); await p.waitForTimeout(150);
    check(/KALIBRIERT\./.test(await H.lastLine(p)), 'the console reads HILFSPROTOKOLL KALIBRIERT');
    await drainAll(p);
    check(await p.locator('#sceneHotspots [aria-label="Sektor 02 betreten"]').count() === 1, '  the door is labelled as an exit');
    await hs(p, 'Sektor 02 betreten'); await drainAll(p); await p.waitForTimeout(900);
    check(/chapter2\/chapter2\.html/.test(p.url()), `  the door led to Sektor 02 (${p.url().split('/').slice(-2).join('/')})`);
    await ctx.close(); }

  console.log('\n[E] an examine inside the KLONK window is ignored instead of cut off');
  { const { ctx, p } = await H.open(b, '/chapter1/chapter1.html', seed());
    await p.waitForTimeout(3800); await drainAll(p);
    await hs(p, 'Wartungsterminal untersuchen'); await drainAll(p);
    await hs(p, 'Leitungspaneel untersuchen'); await H.drain(p);                 // KLONK latched, 420 ms pending
    await hs(p, 'Testschild untersuchen'); await p.waitForTimeout(700);
    check(/KLONK/.test(await H.lastLine(p)), 'the beat plays uncut');
    await drainAll(p);
    await hs(p, 'Testschild untersuchen'); await p.waitForTimeout(150);
    check(/TESTEN/.test(await H.lastLine(p)), '  the sign reads afterwards');
    await ctx.close(); }

  console.log('\n[F] interaction: keyboard tiles, press feedback, hint double-tap, icons vs menus, subtitle echo');
  { const { ctx, p, errs } = await H.open(b, '/chapter1/chapter1.html', seed());
    await toHallIntro(p); await p.waitForTimeout(1200); await drainAll(p);
    const tiles = await p.evaluate(() => { const t = [...document.querySelectorAll('#puzzle1Grid .pipe-tile')]; return { n: t.length, buttons: t.every(x => x.tagName === 'BUTTON'), fixedDisabled: t.filter(x => x.classList.contains('fixed')).every(x => x.disabled), labelled: t.every(x => /Rohrstück/.test(x.getAttribute('aria-label') || '')) }; });
    check(tiles.n === 16 && tiles.buttons && tiles.fixedDisabled && tiles.labelled, `  16 tiles are labelled buttons, fixed ones disabled (${JSON.stringify(tiles)})`);
    check(await p.evaluate(() => document.activeElement?.classList.contains('puzzle-card')), '  the modal took focus on its card');
    const free = p.locator('#puzzle1Grid .pipe-tile:not(.fixed)').first();
    await free.click(); const spun = await p.evaluate(() => document.querySelectorAll('#puzzle1Grid .pipe-tile.rotating').length);
    check(spun === 1, '  the pressed tile carries the press animation');
    await p.locator('#hintBtnR3MI').click(); await p.waitForTimeout(40); await p.locator('#hintBtnR3MI').click(); await p.waitForTimeout(300);
    check((await p.locator('#hintCount').innerText()).includes('2 VERFÜGBAR'), '  a double-tap on the hint button consumes one hint');
    await drainAll(p); await solve(p, 'p1'); await p.waitForTimeout(1000); await drainAll(p);
    // talk menu open → the other icon switches the menu; the room closes it and acts
    await p.locator('.r3mi-icon').click(); await p.waitForTimeout(120);
    await p.locator('.vtgm-icon').click(); await p.waitForTimeout(120);
    check(/V-TGM ANSPRECHEN/.test(await p.locator('#choicePrompt').innerText()), '  the other icon switches an open talk menu');
    await hs(p, 'Kratzer in der Wand untersuchen'); await p.waitForTimeout(500);   // an object above the panel (the barrel sits behind it)
    check(await p.evaluate(() => document.getElementById('choiceOverlay').classList.contains('hidden')) && /Linie/.test(await H.lastLine(p)), '  a tap on the room closes a talk menu and acts');
    await drainAll(p);
    // subtitle echo: pick the V-TGM 'Ist er immer so?' topic → "Yes." / Ja. keeps its subtitle; one-word echo case checked via the engine directly
    const echo = await p.evaluate(() => { GameEngine.dialogue.load([{ speaker:'V-TGM', text:'"V-TGM."', subtitle:'V-TGM.' }]); return document.getElementById('dlgSub').textContent; });
    check(echo === '', '  a subtitle identical to the line is not echoed');
    const kept = await p.evaluate(() => { GameEngine.dialogue.load([{ speaker:'V-TGM', text:'"Yes."', subtitle:'Ja.' }]); return document.getElementById('dlgSub').textContent; });
    check(kept === 'Ja.', '  a real subtitle stays'); await drainAll(p);
    // ending choice: Enter on a robot icon must not replace it
    await hs(p, 'Inneres Tor untersuchen'); await drainAll(p); await drainAll(p);
    await hs(p, 'Zentrale Konsole untersuchen'); await drainAll(p); await solve(p, 'p2'); await p.waitForTimeout(1000); await drainAll(p);
    check(/DEINE ANTWORT/.test(await p.locator('#choicePrompt').innerText()), '  the ending choice is up');
    await p.evaluate(() => document.querySelector('.r3mi-icon').focus()); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    check(/DEINE ANTWORT/.test(await p.locator('#choicePrompt').innerText()) && await p.locator('.choice-btn').count() === 3, '  Enter on a robot icon leaves the story choice alone');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[G] phone: revisit icons clear the return bar; a docked modal clears the hint bar');
  { const { ctx, p } = await H.open(b, '/chapter1/chapter1.html', H.save({ chaptersCompleted: ['ch0', 'ch1'] }), { viewport: { width: 360, height: 640 }, mobile: true });
    await p.waitForTimeout(2000); await drainAll(p); await p.waitForTimeout(400);
    const hit = await p.evaluate(() => { const i = document.querySelector('.r3mi-icon'); const r = i.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { hit: !!t && (t === i || i.contains(t)), bottom: innerHeight - r.bottom }; });
    check(hit.hit, `  the R-3MI icon takes the tap above the return bar (${hit.bottom|0}px up)`);
    await ctx.close();
    const r2 = await H.open(b, '/chapter1/chapter1.html', seed(), { viewport: { width: 360, height: 640 }, mobile: true });
    await toHallIntro(r2.p); await r2.p.waitForTimeout(1200); await drainAll(r2.p);
    await r2.p.locator('#hintBtnR3MI').click({ force: true }); await r2.p.waitForTimeout(400);
    const lay = await r2.p.evaluate(() => { const bar = document.getElementById('hintBar').getBoundingClientRect(), head = document.querySelector('#puzzle1Modal .puzzle-header').getBoundingClientRect(); return { barBottom: bar.bottom, headTop: head.top }; });
    check(lay.headTop >= lay.barBottom, `  the docked card starts below the hint bar (${lay.headTop|0} ≥ ${lay.barBottom|0})`);
    await r2.ctx.close(); }

  console.log('\n[H] text: one spelling of the figure, one stage direction, no three-dot ellipsis');
  { const bad = [/Kurze Pause\./, /\.\.\. \]/, /genau so langweilig/, /hin muss\./, /\*SPARK\*/, /Er sagt das, als/, /Lass sie\./, /REAKTIVIERUNG: \$\{\w+\}%/].filter(rx => rx.test(src));
    check(bad.length === 0, `  chapter1.js is clean (${bad.map(String).join(', ') || 'no hits'})`);
    const html = H.fs.readFileSync(H.path.join(H.ROOT, 'chapter1/chapter1.html'), 'utf8');
    check(/REAKTIVIERUNG: 0 %/.test(html), '  the bar starts as "0 %"'); }

  console.log('\n[I] gameplay: leaving a repair and coming back, settled objects, powered lamps, DUALSIGNAL, the ending survives a reload');
  { const { ctx, p, errs } = await H.open(b, '/chapter1/chapter1.html', seed());
    await toHallIntro(p); await p.waitForTimeout(1200); await drainAll(p);
    check(await p.locator('#puzzle1Modal:not(.hidden)').count() === 1, 'repair 1 is open');
    const sig = () => p.evaluate(() => [...document.querySelectorAll('#puzzle1Grid .pipe-tile')].map(t => [...t.querySelectorAll('.pipe-arm')].map(a => a.className.slice(-1)).join('')).join('|'));
    await p.locator('#puzzle1Grid .pipe-tile:not(.fixed)').first().click(); await p.waitForTimeout(100);
    const before = await sig();
    const cardTop = await p.evaluate(() => document.querySelector('#puzzle1Modal .puzzle-card').getBoundingClientRect().top);
    await p.locator('#hintBtnR3MI').click(); await p.waitForTimeout(300);
    const cardTop2 = await p.evaluate(() => document.querySelector('#puzzle1Modal .puzzle-card').getBoundingClientRect().top);
    check(Math.abs(cardTop - cardTop2) < 1, `  the card does not move when a line appears (${cardTop|0} → ${cardTop2|0})`);
    await drainAll(p);
    await p.locator('#puzzle1Modal .ka-btn', { hasText: 'ZURÜCK ]' }).click(); await p.waitForTimeout(150);
    check(await p.locator('#puzzle1Modal:not(.hidden)').count() === 0 && await p.locator('#hintBar:not(.hidden)').count() === 0, '  [ ZURÜCK ] leaves the repair');
    await hs(p, 'Kratzer in der Wand untersuchen'); await p.waitForTimeout(150);
    check(await p.evaluate(() => document.querySelector('[data-prop="c1_wallscratch"]').classList.contains('found')), '  an examined object settles');
    await drainAll(p);
    await hs(p, 'Terminal untersuchen'); await drainAll(p);
    check(await p.locator('#puzzle1Modal:not(.hidden)').count() === 1 && (await sig()) === before, '  the terminal re-opens the same grid, unscrambled');
    check((await p.locator('#hintCount').innerText()).includes('2 VERFÜGBAR'), '  the hint already used stays used');
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    check(await p.locator('#puzzle1Modal:not(.hidden)').count() === 0, '  Escape leaves it too');
    await hs(p, 'Terminal untersuchen'); await drainAll(p);
    for (let i = 0; i < 2; i++) { await p.locator('#hintBtnVTGM').click(); await drainAll(p); }
    await p.locator('#hintBtnR3MI').click(); await p.waitForTimeout(200);
    check(/Mehr darf ich nicht sagen/.test(await H.lastLine(p)), '  a fourth hint press gets the unit\'s refusal');
    await drainAll(p);
    await solve(p, 'p1'); await p.waitForTimeout(1000);
    const lamp = await p.evaluate(() => getComputedStyle(document.querySelector('[data-prop="c1_hallterminal"] .prop-led')).fill);
    check(/46, 207, 98/.test(lamp), `  the terminal's lamp is green once the hall has power (${lamp})`);
    await drainAll(p);
    await hs(p, 'Inneres Tor untersuchen'); await drainAll(p); await drainAll(p);
    await hs(p, 'Zentrale Konsole untersuchen'); await drainAll(p);
    const d = await p.evaluate(() => ({ disabled: document.querySelectorAll('#puzzle2Grid .pipe-tile:disabled').length, tees: [...document.querySelectorAll('#puzzle2Grid .pipe-tile')].filter(t => t.querySelectorAll('.pipe-arm').length === 3).length }));
    check(d.disabled === 10 && d.tees === 2, `  DUALSIGNAL: blanks and ends are inert, two T-pieces can bridge (${JSON.stringify(d)})`);
    await solve(p, 'p2'); await p.waitForTimeout(400);
    check(await p.locator('#puzzle2Grid .pipe-tile.terminal2r.conn-r').count() === 1 && await p.locator('#puzzle2Grid .pipe-tile.terminal2g.conn-g').count() === 1, '  both terminals light their own arm');
    await p.waitForTimeout(800);
    check(await p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')).chapterState.ch1?.p2Solved === true), '  the ending is checkpointed');
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2200); await drainAll(p); await p.waitForTimeout(300);
    check(/DEINE ANTWORT/.test(await p.locator('#choicePrompt').innerText().catch(() => '')), '  a reload mid-ending resumes the ending, not a Nachsuche');
    await p.locator('.choice-btn').first().click(); await p.waitForTimeout(150); await drainAll(p);
    await hs(p, 'Sektor 02 betreten'); await p.waitForTimeout(300);
    check(await p.locator('#chapterComplete:not(.hidden)').count() === 1 && await p.evaluate(() => !JSON.parse(localStorage.getItem('ka2_save_v1')).chapterState.ch1), '  the card shows and the checkpoint is gone');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  await b.close(); finish();
})();

