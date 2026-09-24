/* The front door and the veteran Easter egg.
   Part II needs nothing from Part I: a fresh player walks in without a code.
   The old Part-I code only throws a party on the title screen (js/archiv.js)
   and awards one secret achievement — nothing else in the save changes.
   The real code comes from tests/.local.json or KA1_CODE; without it the
   party itself is skipped, everything else still runs. */
const H = require('./helpers');
const { check, finish } = H.checker('access');
const CODE = H.localSecret('KA1_CODE');
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1') || 'null'));
const FRESH = () => ({ version: '1.0.0-pre', schemaVersion: 4, chaptersCompleted: [], signalsFound: [], achievementsUnlocked: [], puzzlesSolved: {}, flags: {}, chapterState: {}, calibration: {}, settings: {} });
// everything the game could ever read, minus the one thing the egg may add
const gameplay = s => JSON.stringify({ c: s.chaptersCompleted, g: s.signalsFound, f: s.flags, st: s.chapterState, cal: s.calibration, pz: s.puzzlesSolved,
  a: s.achievementsUnlocked.filter(a => a !== 'ka1_veteran' && a !== 'first_boot').sort(),
  p: Object.keys(s).filter(k => /^ch\d_progress$/.test(k)).map(k => [k, s[k]]) });
const typeIn = async (p, code) => { for (let i = 0; i < code.length; i++) { await p.locator('.archiv-digit').nth(i).fill(code[i]); await p.waitForTimeout(30); } };

(async () => {
  const b = await H.launch();

  console.log('\n[A] a fresh player: STARTEN → entrance without any code → Sektor 00');
  { const { ctx, p, errs } = await H.open(b, '/index.html', FRESH());
    await p.waitForTimeout(5200);
    await p.locator('#startBtn').click(); await p.waitForTimeout(900);
    check(/access\.html/.test(p.url()), '  STARTEN leads to the entrance');
    check(await p.locator('.code-digit, input').count() === 0, '  the entrance asks for no code at all');
    await p.locator('#verifyBtn').click();
    await p.waitForSelector('.access-go.visible', { timeout: 8000 }).catch(() => {});
    check(await p.locator('.access-go.visible').count() === 1, '  [ SIGNATUR ERFASSEN ] reveals the reactivation offer');
    await p.locator('#accessGo').click(); await p.waitForTimeout(2600);
    check(/chapter0\/chapter0\.html/.test(p.url()) && await p.locator('.sector-lock').count() === 0, `  the facility starts (${p.url().split('/').slice(-2).join('/')})`);
    // and Sektor 00 can be finished on that save, which opens Sektor 01
    await p.waitForTimeout(2000); await H.drain(p);
    for (let i = 0; i < 25 && !(await p.locator('#puzzleModal:not(.hidden)').count()); i++) {
      const d = p.locator('.door-hotspot'); if (await d.count()) await d.first().click({ force: true });
      await p.waitForTimeout(200); await H.drain(p);
    }
    for (const sym of ['●', '▲', '■', '⬡']) { await p.locator(`.puzzle-key[data-symbol="${sym}"]`).click({ force: true }); await p.waitForTimeout(80); }
    await p.waitForTimeout(800);
    const st = await saved(p);
    check(st.chaptersCompleted.includes('ch0') && !st.flags.ka1_verified && !st.achievementsUnlocked.includes('ka1_veteran'), '  Sektor 00 is completed without anything from Part I in the save');
    await p.goto(H.BASE + '/chapter1/chapter1.html', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1500);
    check(/chapter1/.test(p.url()) && !/ZUGANG VERWEIGERT/.test(await p.evaluate(() => document.body.innerText)), '  and Sektor 01 opens');
    check(errs.length === 0, '  no page errors' + (errs.length ? ': ' + errs[0] : '')); await ctx.close(); }
  { const { ctx, p, errs } = await H.open(b, '/chapter0/chapter0.html', FRESH());
    await p.waitForTimeout(2500);
    check(/chapter0/.test(p.url()) && await p.locator('.sector-lock').count() === 0, '  Sektor 00 opens directly on a brand-new save, no flag needed');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }
  { const src = [0,1,2,3,4,5,6,7,8].map(n => H.fs.readFileSync(H.path.join(H.ROOT, `chapter${n}/chapter${n}.js`), 'utf8')).join('\n');
    const c9 = H.fs.readFileSync(H.path.join(H.ROOT, 'chapter9/chapter9.js'), 'utf8');
    const eng = H.fs.readFileSync(H.path.join(H.ROOT, 'js/engine.js'), 'utf8');
    check(!/ka1_verified|ka1_veteran/.test(src), '  no chapter 0–8 reads anything from Part I');
    const uses9 = c9.match(/ka1_\w+/g) || [], auth = c9.slice(c9.indexOf('auth: {'), c9.indexOf('movement: {'));
    check(!/ka1_verified/.test(c9) && uses9.length === 1 && /ka1_veteran/.test(auth), '  chapter 9 only uses it to decide whether an archive record shows the eight digits or a redaction');
    check(!/hasFlag\('ka1_verified'\)/.test(eng) && !/ka1_verified\)\s*\)\s*\{\s*drop/.test(eng), '  the engine gates nothing on it'); }

  console.log('\n[B] the Archivabgleich: faint, optional, and wrong codes are harmless');
  { const { ctx, p, errs } = await H.open(b, '/index.html', H.save({ chaptersCompleted: H.done(3) }));
    await p.waitForTimeout(5200);
    check(await p.locator('#archivSlot').count() === 1, '  eight faint slots sit beside the version tag');
    const before = gameplay(await saved(p));
    await p.locator('#archivSlot').click(); await p.waitForTimeout(300);
    check(await p.locator('#archivOverlay:not(.hidden)').count() === 1, '  they open the Archivabgleich');
    for (const wrong of ['00000000', '12345678', '31415926']) {
      await typeIn(p, wrong); await p.waitForTimeout(700);
      const st = await p.locator('#archivStatus').innerText();
      check(/KEIN TREFFER|NEIN|NICHT DER CODE/.test(st), `  ${wrong}: "${st}"`);
      await p.waitForTimeout(1000);
    }
    const after = await saved(p);
    check(gameplay(after) === before && !after.achievementsUnlocked.includes('ka1_veteran'), '  wrong codes change nothing in the save');
    check(await p.locator('.vet-party').count() === 0, '  and throw no party');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    check(await p.locator('#archivOverlay.hidden').count() === 1, '  Escape closes it');
    await p.evaluate(() => GameEngine.achievements.showOverlay()); await p.waitForTimeout(200);
    const listed = await p.evaluate(() => ({ n: document.querySelectorAll('#achievementList .ach-item').length, all: GameEngine.achievements.ALL.length }));
    check(listed.n === listed.all - 1, `  the secret achievement is not even listed before it is earned (${listed.n} of ${listed.all})`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  if (!CODE) { console.log('  --   KA1_CODE not provided; the party itself is skipped (see tests/README.md)'); }
  else {
    console.log('\n[C] the real old code: a party, one secret achievement, nothing else');
    for (const [label, sv] of [['fresh save', FRESH()], ['mid-game save', H.save({ chaptersCompleted: H.done(5), signalsFound: ['sig_01'] })], ['finished save', H.save({ chaptersCompleted: H.ALL, signalsFound: H.SIG, flags: { zieldaten: true } })]]) {
      const { ctx, p, errs } = await H.open(b, '/index.html', sv);
      await p.waitForTimeout(5200);
      const before = gameplay(await saved(p)), nav = await p.evaluate(() => [document.getElementById('continueBtn').href, document.getElementById('continueBtn').className]);
      await p.locator('#archivSlot').click(); await p.waitForTimeout(300);
      await typeIn(p, CODE);
      await p.waitForSelector('.vet-party', { timeout: 4000 }).catch(() => {});
      check(await p.locator('.vet-party').count() === 1, `  ${label}: the facility throws a party`);
      await p.waitForTimeout(5500);
      check(await p.locator('.vet-bit').count() > 20, '  with confetti');
      const st = await saved(p);
      check(st.achievementsUnlocked.includes('ka1_veteran'), '  "Wiederholungstäter" is unlocked');
      check(gameplay(st) === before, '  and nothing a chapter could ever read has changed');
      await p.locator('.vet-done').click(); await p.waitForTimeout(600);
      check(await p.locator('.vet-party').count() === 0, '  [ DANKE, ANLAGE ] ends it');
      await p.reload(); await p.waitForTimeout(5200);
      const nav2 = await p.evaluate(() => [document.getElementById('continueBtn').href, document.getElementById('continueBtn').className]);
      check(JSON.stringify(nav) === JSON.stringify(nav2), '  the menu offers exactly the same way on');
      check(errs.length === 0, '  no page errors' + (errs.length ? ': ' + errs[0] : '')); await ctx.close();
    }
    { // a second time is a smaller party, and still changes nothing
      const { ctx, p, errs } = await H.open(b, '/index.html', H.save({ chaptersCompleted: H.done(2), achievementsUnlocked: ['ka1_veteran'] }));
      await p.waitForTimeout(5200);
      await p.locator('#archivSlot').click(); await p.waitForTimeout(300); await typeIn(p, CODE);
      await p.waitForSelector('.vet-party', { timeout: 4000 }).catch(() => {});
      check(/SCHON WIEDER/.test(await p.locator('.vet-title').innerText()), '  a repeat visit is recognised as one');
      await p.keyboard.press('Escape'); await p.waitForTimeout(500);
      check(await p.locator('.vet-party').count() === 0, '  Escape ends the party at any moment');
      check(errs.length === 0, '  no page errors'); await ctx.close();
    }
    // Not in ANY committed file — GitHub Pages serves the whole repository,
    // tests included. The code only ever lives in the git-ignored .local.json.
    { const tracked = require('child_process').execSync('git ls-files -co --exclude-standard', { cwd: H.ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
      const hits = tracked.filter(f => { try { return H.fs.readFileSync(H.path.join(H.ROOT, f), 'utf8').includes(CODE); } catch (_) { return false; } });
      check(hits.length === 0, `  the code is in no shipped file (${hits.join(', ') || 'none'})`); }
  }

  console.log('\n[E] Chapter 9\'s archive record shows the old digits only to a recognised veteran');
  for (const vet of [false, true]) {
    const cp = { act: 2, records: {}, signalDone: false, facedFirst: null, asked: {}, consoleSeen: false, burstSeen: false, optional: {} };
    const { ctx, p, errs } = await H.open(b, '/chapter9/chapter9.html', H.save({ chaptersCompleted: H.ALL, signalsFound: H.SIG, achievementsUnlocked: vet ? ['ka1_veteran'] : [], ch9_progress: cp }));
    await p.waitForTimeout(3000); await H.settled(p); await H.drain(p); await p.waitForTimeout(400);
    for (let i = 0; i < 6 && !(await p.locator('#evModal:not(.hidden)').count()); i++) {
      await p.locator('#sceneHotspots [aria-label="Autorisierungsakte"]').first().click({ force: true }).catch(() => {}); await p.waitForTimeout(400); await H.drain(p);
    }
    const body = await p.locator('#evBody').innerText().catch(() => '');
    if (!vet) check(/████ · ████/.test(body) && !/\d{4} · \d{4}/.test(body), '  a player who never presented it sees the redaction');
    else check(/\d{4} · \d{4}/.test(body) && (!CODE || body.replace(/\D/g, '').includes(CODE)), '  a recognised veteran sees the digits they already know');
    check(errs.length === 0, '  no page errors'); await ctx.close();
  }

  console.log('\n[D] the save manager counts only listed achievements');
  { const { ctx, p } = await H.open(b, '/index.html', H.save({ chaptersCompleted: H.done(1) }));
    await p.waitForTimeout(5200);
    await p.evaluate(() => GameEngine.showSaveManager()); await p.waitForTimeout(300);
    const t = await p.locator('#saveOverlay').innerText();
    const m = /Freigeschaltete Erfolge:\s*(\d+)\s*\/\s*(\d+)/.exec(t);
    const all = await p.evaluate(() => GameEngine.achievements.ALL.length);
    check(m && +m[2] === all - 1, `  "${m && m[0]}" (the secret one is not part of the total)`);
    await ctx.close(); }

  await b.close(); finish();
})();
