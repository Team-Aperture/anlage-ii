/* One save reaches 100 %. Every listed achievement stays obtainable from a
   finished save — nothing needs a restart, a second run, or knowing that a
   one-time choice was missable:
     · Hiii. / Ich komme zurück are retired: never listed, never counted, a
       save that earned one keeps it as a memento; the endings award nothing.
     · Archivar: on a finished Chapter 8 AGN-H3R deals fresh reconstructions;
       one laid without a hint earns it, one with a hint simply does not.
     · Nein.: offered again at the table — mid-reconstruction and on revisit.
     · Frigo Camelo: the crate is on the Chapter 9 revisit menu. */
const H = require('./helpers');
const { check, finish } = H.checker('achievements_one_save');
const src9 = H.fs.readFileSync(H.path.join(H.ROOT, 'chapter9/chapter9.js'), 'utf8');
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')));
const hs = async (p, aria) => { await p.locator(`#sceneHotspots [aria-label="${aria}"]`).first().click({ force: true }); await p.waitForTimeout(150); };
const pick = async (p, label) => { await p.locator('#choiceOverlay .choice-btn', { hasText: label }).first().click(); await p.waitForTimeout(150); };
const drainAll = async p => { await H.drain(p); await p.waitForTimeout(350); await H.drain(p); };
const hist = p => p.evaluate(() => GameEngine.dialogue.history().map(l => l.text));
// read through lines until a choice menu is up (cold opens and title cards vary)
async function untilMenu(p, max = 40) {
  for (let i = 0; i < max && !(await p.locator('#choiceOverlay.visible .choice-btn').count()); i++) { await H.drain(p); await p.waitForTimeout(400); }
}
const FINISHED = (ach = []) => H.save({ chaptersCompleted: H.ALL, signalsFound: H.SIG, flags: { zieldaten: true, truth_revealed: true }, achievementsUnlocked: ach });

// lay the open practice board, slot by slot, from its target time stamps
async function layPractice(p) {
  const target = await p.evaluate(() => Chapter8.practiceTarget());
  const tsAt = () => p.evaluate(() => [...document.querySelectorAll('.rk-tile')].map(t => +((t.getAttribute('aria-label') || '').match(/Zeitmarke T-(\d+)/) || [])[1]));
  const tile = s => p.locator(`.rk-tile[data-slot="${s}"]`).click();
  // orientation first (every fragment wants 0), then placement — the last swap finishes it
  for (let s = 0; s < 12; s++) {
    const r = await p.evaluate(s => { const m = (document.querySelector(`.rk-tile[data-slot="${s}"] .rk-art`).style.transform || '').match(/rotate\((\d+)deg\)/); return m ? (+m[1] / 90) % 4 : 0; }, s);
    if (!r) continue;
    await tile(s); for (let k = 0; k < 4 - r; k++) await p.locator('#rkRotate').click(); await tile(s);
  }
  for (let s = 0; s < 12; s++) {
    const cur = await tsAt();
    if (cur[s] === target[s]) continue;
    const j = cur.indexOf(target[s]);
    await tile(s); await tile(j); await p.waitForTimeout(30);
    if (await p.locator('#rkModal.hidden').count()) break;
  }
  await p.waitForTimeout(400);
}
async function toArchiveMenu(p) {
  await p.waitForTimeout(2600); await H.settled(p); await drainAll(p);
  for (let i = 0; i < 30 && !(await p.locator('#sceneHotspots [aria-label="Die fertige Rekonstruktion"]').count()); i++) { await H.drain(p); await p.waitForTimeout(400); }
  await hs(p, 'Die fertige Rekonstruktion'); await untilMenu(p);
}

(async () => {
  const b = await H.launch();

  console.log('\n[A] Hiii. and Ich komme zurück are retired: unlisted, uncounted, kept if earned');
  { const { ctx, p, errs } = await H.open(b, '/index.html', FINISHED(['truth', 'said_hiii']));
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => ({ listed: GameEngine.achievements.listed().map(a => a.id), has: GameEngine.achievements.isUnlocked('said_hiii') }));
    check(!r.listed.includes('said_hiii') && !r.listed.includes('will_return'), `  neither is listed (${r.listed.length} listed)`);
    check(r.has && (await saved(p)).achievementsUnlocked.includes('said_hiii'), '  a save that earned Hiii. keeps it as a memento');
    await p.evaluate(() => GameEngine.achievements.unlock('will_return')); await p.waitForTimeout(200);
    check(!(await saved(p)).achievementsUnlocked.includes('will_return'), '  and a retired one can no longer be unlocked');
    check(!/ach:\s*'(said_hiii|will_return)'/.test(src9) && !/unlock\(f\.ach\)/.test(src9), '  none of the three final lines awards an achievement');
    check(/\[ Ich komme zurück\. \]/.test(src9) && /\[ Ich vertraue euch nie wieder\. \]/.test(src9) && /\[ …Hiii\. \]/.test(src9), '  all three final lines are still there');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[B] Chapter 9 revisit: the crate is still in its corner');
  { const { ctx, p, errs } = await H.open(b, '/chapter9/chapter9.html', FINISHED());
    await untilMenu(p);
    check(await p.locator('#choiceOverlay .choice-btn', { hasText: 'KISTE' }).count() === 1, '  the revisit menu offers [ KISTE IN DER ECKE ]');
    await pick(p, 'KISTE'); await p.waitForTimeout(300);
    check((await hist(p)).some(t => /F — R — I — G — O/.test(t)), '  it opens the crate');
    await untilMenu(p); await p.waitForTimeout(600);
    check((await saved(p)).achievementsUnlocked.includes('italian_brainrot'), '  Frigo Camelo is earned on a finished save');
    check(await p.locator('#choiceOverlay .choice-btn', { hasText: 'ZIELDATEN' }).count() === 1, '  and the menu comes back');
    check(errs.length === 0, '  no page errors ' + errs.join(';')); await ctx.close(); }

  console.log('\n[C] Chapter 8 revisit: Nein. again; a fresh reconstruction with a hint does not earn Archivar, one without does');
  { const { ctx, p, errs } = await H.open(b, '/chapter8/chapter8.html', FINISHED());
    await toArchiveMenu(p);
    const labels = await p.locator('#choiceOverlay .choice-btn').allInnerTexts();
    check(labels.some(l => /Neue Rekonstruktion/.test(l)) && labels.some(l => /Nein\. Wie damals/.test(l)) && labels.some(l => /zehnte ansehen/.test(l)), `  the table offers: ${labels.join(' · ')}`);
    await pick(p, 'Nein. Wie damals'); await drainAll(p); await p.waitForTimeout(1200);
    check((await saved(p)).achievementsUnlocked.includes('jigsaw_refused'), '  Nein. is earned on a finished save');

    await hs(p, 'Die fertige Rekonstruktion'); await untilMenu(p); await pick(p, 'Neue Rekonstruktion');
    await drainAll(p);
    const intro = (await hist(p)).join(' | ');
    check(/ohne einen einzigen Hinweis legt, darf sich Archivar nennen/.test(intro), '  AGN-H3R says up front what earns Archivar');
    check(await p.locator('#rkModal:not(.hidden)').count() === 1 && await p.evaluate(() => !!Chapter8.practiceTarget()), '  a fresh board is open');
    await p.locator('#hintBtnR3MI').click(); await p.waitForTimeout(100); await drainAll(p);
    const first = await p.evaluate(() => Chapter8.practiceTarget().join());
    await layPractice(p); await p.waitForTimeout(2600); await drainAll(p);
    check(await p.locator('#rkModal.hidden').count() === 1 && (await hist(p)).some(t => /zählt fürs Archiv, nicht für den Titel/.test(t)), '  laid with a hint: it holds, AGN-H3R says it does not count for the title');
    check(!(await saved(p)).achievementsUnlocked.includes('archivar'), '  no Archivar for that one');
    check((await saved(p)).chaptersCompleted.includes('ch8') && !(await hist(p)).some(t => /ZIELDATEN/.test(t) && /REKONSTRUIERT/.test(t)), '  the sector, its finale and coordinates are untouched');

    await hs(p, 'Die fertige Rekonstruktion'); await untilMenu(p); await pick(p, 'Neue Rekonstruktion'); await drainAll(p);
    const second = await p.evaluate(() => Chapter8.practiceTarget().join());
    check(second !== first, '  the next file is a different board');
    check(/3 VERFÜGBAR/.test(await p.locator('#hintCount').innerText()), '  with the full hint ladder again');
    await layPractice(p); await p.waitForTimeout(2600); await drainAll(p);
    check((await saved(p)).achievementsUnlocked.includes('archivar'), '  laid without a hint: Archivar');
    check((await hist(p)).some(t => /Das ist Archivarbeit/.test(t)), '  AGN-H3R: „Ohne eine einzige Frage. Das ist Archivarbeit."');
    check(errs.length === 0, '  no page errors ' + errs.join(';')); await ctx.close(); }

  console.log('\n[D] first visit: after „Fragmente sichten", Nein. is still offered back at the table — until it is said');
  { const { ctx, p, errs } = await H.open(b, '/chapter8/chapter8.html', H.save({ chaptersCompleted: H.done(8) }));
    await p.waitForTimeout(3000); await H.settled(p); await drainAll(p); await p.waitForTimeout(300); await drainAll(p);
    await hs(p, 'Rekonstruktionstisch'); await untilMenu(p);
    await pick(p, 'Fragmente sichten'); for (let i = 0; i < 6; i++) { await H.drain(p); await p.waitForTimeout(200); }
    check(await p.locator('#rkModal:not(.hidden)').count() === 1, '  (the board is open)');
    await p.locator('#rkActions [data-act="close"]').first().click(); await p.waitForTimeout(200);
    await hs(p, 'Rekonstruktionstisch'); await untilMenu(p, 5);
    const labels = await p.locator('#choiceOverlay .choice-btn').allInnerTexts();
    check(labels.some(l => /Nein\. Wie damals/.test(l)) && labels.some(l => /Weiter rekonstruieren/.test(l)), `  back at the table: ${labels.join(' · ')}`);
    await pick(p, 'Nein. Wie damals'); await drainAll(p); await p.waitForTimeout(600);
    check((await saved(p)).achievementsUnlocked.includes('jigsaw_refused') && await p.locator('#rkModal:not(.hidden)').count() === 1, '  Nein. earned, and the board comes back');
    await p.locator('#rkActions [data-act="close"]').first().click(); await p.waitForTimeout(200);
    await hs(p, 'Rekonstruktionstisch'); await p.waitForTimeout(200);
    check(await p.locator('#rkModal:not(.hidden)').count() === 1 && !(await p.evaluate(() => document.getElementById('choiceOverlay').classList.contains('visible'))), '  once said, the table opens straight to the board');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  await b.close(); finish();
})();
