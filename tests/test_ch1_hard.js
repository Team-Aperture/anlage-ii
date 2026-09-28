/* Chapter 1 VERSCHÄRFT (NG+ hard mode): both repairs get their second
   hand-built board (proven single-route by analyse_ch1_pipes.js). Played in
   the real chapter: the facility says it has re-laid the lines, repair 1 is
   the U-shaped board and still praises a clean solve, repair 2 has both
   terminals bottom left and still refuses touching signals, its hint ladder
   talks about that board — and NORMAL NG+ and a first run keep the
   original boards. Phones: the grids fit and a tap turns a tile. */
const H = require('./helpers');
const { check, finish } = H.checker('ch1_hard');
const src = H.fs.readFileSync(H.path.join(H.ROOT, 'chapter1/chapter1.js'), 'utf8');
const grab = name => JSON.parse(src.match(new RegExp('const ' + name + ' = (\\[[\\s\\S]*?\\]);'))[1].replace(/\s+/g, '').replace(/,\]/g, ']'));
const CONN = { 0: [[], [], [], []], 1: [['N','S'],['E','W'],['N','S'],['E','W']], 2: [['N','E'],['E','S'],['S','W'],['W','N']],
  3: [['N','E','S'],['E','S','W'],['S','W','N'],['W','N','E']], 4: [['N','E','S','W'],['N','E','S','W'],['N','E','S','W'],['N','E','S','W']] };
const HARD1 = { types: grab('P1_HARD_TYPES'), base: grab('P1_HARD_BASE_ROT'), fixed: grab('P1_HARD_FIXED'), grid: '#puzzle1Grid' };
const HARD2 = { types: grab('P2_HARD_TYPES'), base: grab('P2_HARD_BASE_ROT'), fixed: grab('P2_HARD_FIXED'), grid: '#puzzle2Grid' };
const LEGACY = { cycle: 2, earned: [], endings: ['ret'], zieldaten: true, lastEnding: 'ret' };
const seed = (mode, cp) => { const sv = H.save({ chaptersCompleted: ['ch0'], ...(mode != null ? { legacy: LEGACY, mode } : {}) });
  if (cp) sv.chapterState = { ch1: { p1Solved: true, p2Solved: false, talkSeen: {}, clicks: {} } }; return sv; };

const hs = async (p, aria) => { await p.locator(`#sceneHotspots [aria-label="${aria}"]`).first().click({ force: true }); await p.waitForTimeout(120); };
async function drainAll(p, settle = 400) { await H.drain(p); await p.waitForTimeout(settle); await H.drain(p); }
const hist = p => p.evaluate(() => GameEngine.dialogue.history().map(l => l.text));
const arms = (p, grid, i) => p.evaluate(([g, i]) => { const t = document.querySelector(g).children[i]; if (t.classList.contains('fixed')) return null;
  return [...t.querySelectorAll('.pipe-arm')].map(a => a.className.match(/arm-(\w)/)[1].toUpperCase()).sort().join(''); }, [grid, i]);
// turn one tile until its arms are `want` (a sorted direction string)
async function turnTo(p, grid, i, want) {
  for (let k = 0; k < 4; k++) { const have = await arms(p, grid, i); if (have === null || have === want) return k;
    await p.locator(grid).locator('.pipe-tile').nth(i).click({ force: true }); await p.waitForTimeout(40); }
  return 4;
}
const want = (B, r, c) => CONN[B.types[r][c]][B.base[r][c]].slice().sort().join('');
// the tiles the solved base lights from the source: the route
function routeOf(B, sr, sc) {
  const seen = new Set([`${sr},${sc}`]), q = [[sr, sc]], D = { N: [-1, 0], S: [1, 0], E: [0, 1], W: [0, -1] }, O = { N: 'S', S: 'N', E: 'W', W: 'E' };
  while (q.length) { const [r, c] = q.pop(); for (const d of CONN[B.types[r][c]][B.base[r][c]]) { const nr = r + D[d][0], nc = c + D[d][1];
    if (nr < 0 || nc < 0 || nr > 3 || nc > 3 || seen.has(`${nr},${nc}`)) continue;
    if (CONN[B.types[nr][nc]][B.base[nr][nc]].includes(O[d])) { seen.add(`${nr},${nc}`); q.push([nr, nc]); } } }
  return [...seen].map(k => k.split(',').map(Number));
}
async function toRepair1(p) {
  await p.waitForTimeout(3800); await drainAll(p);
  await hs(p, 'Wartungsterminal untersuchen'); await drainAll(p);
  await hs(p, 'Leitungspaneel untersuchen'); await H.drain(p); await p.waitForTimeout(700); await drainAll(p);
  await hs(p, 'Dunklen Korridor betreten'); await H.drain(p); await p.waitForTimeout(900); await drainAll(p);
  await p.locator('.choice-btn').first().click(); await p.waitForTimeout(150);
  for (let i = 0; i < 12 && !(await p.locator('#puzzle1Modal:not(.hidden)').count()); i++) { await drainAll(p); await p.waitForTimeout(300); }
}
async function toRepair2FromHall(p) {
  await p.waitForTimeout(2200); await drainAll(p);
  await hs(p, 'Inneres Tor untersuchen'); await drainAll(p); await drainAll(p);
  await hs(p, 'Zentrale Konsole untersuchen');
}
const board = (p, grid) => p.evaluate(g => { const t = [...document.querySelectorAll(g + ' .pipe-tile')];
  const at = cls => t.findIndex(x => x.classList.contains(cls));
  return { n: t.length, free: t.filter(x => !x.classList.contains('fixed')).length, src: at('source-w'), src2: at('source-g2'), term: at('terminal'), tr: at('terminal2r'), tg: at('terminal2g') }; }, grid);

(async () => {
  const b = await H.launch();

  console.log('\n[A] VERSCHÄRFT, repair 1: the facility re-laid the lines; the U-board; a clean solve is still praised');
  { const { ctx, p, errs } = await H.open(b, '/chapter1/chapter1.html', seed('hard'));
    await toRepair1(p);
    check(await p.locator('#puzzle1Modal:not(.hidden)').count() === 1, '  (repair 1 is open)');
    const h = (await hist(p)).join(' | ');
    check(/LEITUNGSPLAN ANGEPASST: TESTPERSON BEKANNT\./.test(h) && /Oder ein Test|Or a test/.test(h), '  the facility says it has re-laid the lines for a known tester');
    const g = await board(p, '#puzzle1Grid');
    check(g.n === 16 && g.src === 0 && g.term === 12 && g.free === 10, `  source top left, terminal bottom left, 10 free tiles (${JSON.stringify(g)})`);
    // only the route tiles, each with the fewest turns: the cleanest solve there is
    for (const [r, c] of routeOf(HARD1, 0, 0)) if (!HARD1.fixed[r][c]) await turnTo(p, '#puzzle1Grid', r * 4 + c, want(HARD1, r, c));
    await p.waitForTimeout(1100);
    check(await p.locator('#puzzle1Modal:not(.hidden)').count() === 0, '  laying the one route connects it');
    await drainAll(p);
    check((await hist(p)).some(t => t === '„…okay."'), '  a clean solve still gets R-3MI\'s „…okay."');
    check(await p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')).chapterState.ch1?.p1Solved === true), '  checkpoint written');
    check(errs.length === 0, '  no page errors' + (errs.length ? ': ' + errs.join(' | ') : '')); await ctx.close(); }

  console.log('\n[B] VERSCHÄRFT, repair 2: named once, both terminals bottom left, touching still refused, the one pair wins');
  { const { ctx, p, errs } = await H.open(b, '/chapter1/chapter1.html', seed('hard', true));
    await toRepair2FromHall(p); await drainAll(p);
    const h = (await hist(p)).join(' | ');
    check(/SIGNALPFADE NEU VERLEGT/.test(h) && /Mine takes the long way now/.test(h), '  the console names the new routing (and V-TGM\'s long way)');
    check(await p.locator('#puzzle2Modal:not(.hidden)').count() === 1, '  repair 2 opens');
    const g = await board(p, '#puzzle2Grid');
    check(g.src === 0 && g.src2 === 3 && g.tr === 12 && g.tg === 13 && g.free === 8, `  R-3MI's terminal (3,0), V-TGM's (3,1), 8 free tiles (${JSON.stringify(g)})`);
    // R-3MI's lower T with its spare arm into V-TGM's T: both lines connect, and touch
    await turnTo(p, '#puzzle2Grid', 8, 'ENS');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!(r === 2 && c === 0) && HARD2.types[r][c] && !HARD2.fixed[r][c]) await turnTo(p, '#puzzle2Grid', r * 4 + c, want(HARD2, r, c));
    const st = await p.locator('#puzzle2Status').innerText();
    check(/INTERFERIEREN/.test(st) && await p.locator('#puzzle2Modal:not(.hidden)').count() === 1, `  open ends facing each other bridge the signals: ${st}`);
    await drainAll(p);
    await turnTo(p, '#puzzle2Grid', 8, want(HARD2, 2, 0));
    await p.waitForTimeout(1100);
    check(await p.locator('#puzzle2Modal:not(.hidden)').count() === 0, '  turning that spare arm to the wall: both signals clean, repair solved');
    const sv = await p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')));
    check(sv.chaptersCompleted.includes('ch1') && sv.achievementsUnlocked.includes('ch1_complete') && sv.mode === 'hard' && sv.legacy?.cycle === 2,
          '  sector complete, achievement earned, NG+ record and mode untouched');
    check(errs.length === 0, '  no page errors' + (errs.length ? ': ' + errs.join(' | ') : '')); await ctx.close(); }

  console.log('\n[C] VERSCHÄRFT, repair 2 hints describe this board; the console line is not repeated');
  { const { ctx, p, errs } = await H.open(b, '/chapter1/chapter1.html', seed('hard', true));
    await toRepair2FromHall(p); await drainAll(p);
    await p.locator('#hintBtnR3MI').click(); await p.waitForTimeout(80);
    check(/beide Ziele links unten/.test(await H.lastLine(p)), '  step 1: ' + await H.lastLine(p)); await drainAll(p);
    await p.locator('#hintBtnVTGM').click(); await p.waitForTimeout(80);
    check(/third arm of a T-piece counts/.test(await H.lastLine(p)), '  step 2: ' + await H.lastLine(p)); await drainAll(p);
    await p.locator('#hintBtnR3MI').click(); await p.waitForTimeout(80);
    check(/V-TGMs Signal hat genau einen möglichen Weg/.test(await H.lastLine(p)), '  step 3: ' + await H.lastLine(p)); await drainAll(p);
    await p.locator('#puzzle2Modal button[onclick="Chapter1.closePuzzle(2)"]').click(); await p.waitForTimeout(200);
    const before = (await hist(p)).length;
    await hs(p, 'Zentrale Konsole untersuchen'); await drainAll(p);
    const again = (await hist(p)).slice(before).join(' | ');
    check(!/SIGNALPFADE NEU VERLEGT/.test(again) && await p.locator('#puzzle2Modal:not(.hidden)').count() === 1, '  back at the console: the repair reopens without the routing line again');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[D] NORMAL NG+ and a first run keep the original boards and say nothing new');
  for (const [label, mode] of [['NORMAL NG+', ''], ['first run', null]]) {
    { const { ctx, p, errs } = await H.open(b, '/chapter1/chapter1.html', seed(mode));
      await toRepair1(p);
      const g = await board(p, '#puzzle1Grid'), h = (await hist(p)).join(' | ');
      check(g.term === 15 && g.free === 8 && !/LEITUNGSPLAN ANGEPASST/.test(h), `  ${label}, repair 1: terminal bottom right, 8 free tiles, no new line`);
      check(errs.length === 0, '  no page errors'); await ctx.close(); }
    { const { ctx, p, errs } = await H.open(b, '/chapter1/chapter1.html', seed(mode, true));
      await toRepair2FromHall(p); await drainAll(p); const h = (await hist(p)).join(' | ');
      const g = await board(p, '#puzzle2Grid');
      check(g.tr === 13 && g.tg === 14 && g.free === 6 && !/SIGNALPFADE/.test(h), `  ${label}, repair 2: terminals (3,1)/(3,2), 6 free tiles, no new line`);
      await p.locator('#hintBtnR3MI').click(); await p.waitForTimeout(80);
      check(/eine Reihe in der Mitte/.test(await H.lastLine(p)), `  ${label}: the original hint ladder`);
      check(errs.length === 0, '  no page errors'); await ctx.close(); }
  }

  console.log('\n[E] phones: the hard boards fit and a tap turns a tile');
  for (const vp of [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 844 }]) {
    const { ctx, p, errs } = await H.open(b, '/chapter1/chapter1.html', seed('hard', true), { viewport: vp, mobile: true });
    await toRepair2FromHall(p); await drainAll(p);
    const m = await p.evaluate(() => { const g = document.getElementById('puzzle2Grid').getBoundingClientRect();
      const btns = [...document.querySelectorAll('#puzzle2Modal .puzzle-actions button')];
      btns[btns.length - 1].scrollIntoView({ block: 'center' });
      const bOk = btns.every(x => { const r = x.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t === x || x.contains(t); });
      return { l: Math.round(g.left), r: Math.round(g.right), w: innerWidth, sx: document.scrollingElement.scrollWidth - innerWidth, bOk }; });
    check(m.l >= 0 && m.r <= m.w && m.sx <= 0 && m.bOk, `  ${vp.width}×${vp.height}: grid ${m.l}–${m.r} of ${m.w}, no sideways scroll, buttons reachable`);
    const t = p.locator('#puzzle2Grid .pipe-tile').nth(9); await t.scrollIntoViewIfNeeded();
    const before = await arms(p, '#puzzle2Grid', 9); const bb = await t.boundingBox();
    await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(120);
    check(await arms(p, '#puzzle2Grid', 9) !== before, '  a tap turns the tile');
    check(errs.length === 0, '  no page errors'); await ctx.close();
  }

  await b.close(); finish();
})();
