/* A page that holds an old copy of the save must never write it back over
   newer progress, and a browser that refuses site data must still carry the
   save from sector to sector.
     [A] the browser's back/forward cache restores the title (or a sector)
         with its old in-memory save: the engine loads it afresh, so the next
         write (here: the TON switch) keeps the newer sector;
     [B] a second tab that saves takes effect in the first;
     [C] the same restore after a door's fade-out no longer leaves the page
         black (fx-leaving);
     [D] localStorage blocked (every read throws): the save travels in the
         tab from sector 00 to 01 to 02 instead of being lost at each page
         change, and says so.
   [A] and [C] need the real back/forward cache, which a plain headless
   Chromium switches off. */
const H = require('./helpers');
const { chromium } = require('playwright');
const { check, finish } = H.checker('stale_pages');
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')));
const dismiss = s => { if (sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded', '1'); localStorage.setItem('ka2_mobile_warning_dismissed', '1'); if (s) localStorage.setItem('ka2_save_v1', JSON.stringify(s)); };
// remember, per tab, that the browser handed back a page from its cache
const WATCH = () => addEventListener('pageshow', e => { if (e.persisted) sessionStorage.setItem('__persisted', String(+(sessionStorage.getItem('__persisted') || 0) + 1)); });

async function cacheBrowser() { return chromium.launch({ channel: 'chromium', ignoreDefaultArgs: ['--disable-back-forward-cache'] }); }
async function seeded(b, save, vp = { width: 390, height: 780 }) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: true });
  const errs = [];
  await ctx.addInitScript(dismiss, save); await ctx.addInitScript(WATCH);
  await ctx.route('**://fonts.g**/**', r => r.abort());
  await ctx.route(/\.(mp3|ogg|wav)(\?.*)?$/, r => r.abort());
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
  return { ctx, p, errs };
}

(async () => {
  const b = await cacheBrowser();

  console.log('\n[A] back/forward cache: the restored title is loaded afresh, and a write from it keeps the newer sector');
  { const { ctx, p, errs } = await seeded(b, H.save({ chaptersCompleted: H.done(3) }));
    await p.goto(H.BASE + '/index.html'); await p.waitForTimeout(6500);
    check(/KAP\. 03/.test(await p.textContent('#continueBtn')), `  title offers Sektor 03 (${(await p.textContent('#continueBtn')).trim()})`);
    await p.goto(H.BASE + '/chapter3/chapter3.html'); await p.waitForTimeout(1500);
    await p.evaluate(() => GameEngine.state.markChapterComplete('ch3'));                 // the player finishes it …
    await p.goBack({ waitUntil: 'commit' }); await p.waitForTimeout(3000);   // a page restored from the cache fires no load event                                      // … and presses Back to the title
    check(+(await p.evaluate(() => sessionStorage.getItem('__persisted') || 0)) >= 1, '  (the browser really restored the page from its cache)');
    check(/KAP\. 04/.test(await p.textContent('#continueBtn')), `  the title shows the new state, not the old (${(await p.textContent('#continueBtn')).trim()})`);
    await p.click('#audioToggle'); await p.waitForTimeout(300);
    const sv = await saved(p);
    check(sv.chaptersCompleted.includes('ch3') && sv.calibration.ch3 && sv.achievementsUnlocked.includes('ch3_complete'), `  one tap on TON: Sektor 03, its fragment and its achievement are still there (${sv.chaptersCompleted.length} sectors)`);
    check(errs.length === 0, '  no page errors ' + errs.join(';')); await ctx.close(); }

  console.log('\n[B] a second tab that saves takes effect in the first');
  { const { ctx, p, errs } = await seeded(b, H.save({ chaptersCompleted: H.done(3) }));
    await p.goto(H.BASE + '/index.html'); await p.waitForTimeout(6000);
    const q = await ctx.newPage(); await q.goto(H.BASE + '/chapter3/chapter3.html'); await q.waitForTimeout(1500);
    await q.evaluate(() => { GameEngine.state.markChapterComplete('ch3'); GameEngine.signals.find('sig_01'); });
    await p.waitForTimeout(400);
    check(await p.evaluate(() => GameEngine.state.isChapterComplete('ch3') && GameEngine.signals.isFound('sig_01')), '  tab one now knows what tab two saved');
    await p.click('#audioToggle'); await p.waitForTimeout(300);
    const sv = await saved(p);
    check(sv.chaptersCompleted.includes('ch3') && sv.signalsFound.includes('sig_01') && sv.achievementsUnlocked.includes('signal_first'), `  a write from tab one keeps Sektor 03 and the Frequenz (${sv.chaptersCompleted.length} sectors, ${sv.signalsFound.length} signal)`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }

  console.log('\n[C] Back after a door\'s fade-out: not a black page');
  { const { ctx, p, errs } = await seeded(b, H.save({ chaptersCompleted: H.done(3) }));
    await p.goto(H.BASE + '/chapter2/chapter2.html'); await p.waitForTimeout(2500);
    await p.evaluate(base => GameEngine.fx.leave(base + '/index.html'), H.BASE);
    await p.waitForURL('**/index.html', { waitUntil: 'commit' }); await p.waitForTimeout(1500);
    await p.goBack({ waitUntil: 'commit' }); await p.waitForTimeout(3000);   // a page restored from the cache fires no load event
    const r = await p.evaluate(() => ({ cls: document.body.className, op: getComputedStyle(document.body).opacity }));
    check(/chapter2/.test(p.url()) && !/fx-leaving/.test(r.cls) && r.op === '1', `  the sector is visible again (opacity ${r.op}, "${r.cls}")`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }
  await b.close();

  console.log('\n[D] storage refused: the save travels in the tab');
  { const b2 = await H.launch();
    const ctx = await b2.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true });
    await ctx.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); }, configurable: true }); });
    await ctx.route('**://fonts.g**/**', r => r.abort());
    const errs = []; const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
    const t = await ctx.newPage();                       // the title: no chapter holds its toasts back
    await t.goto(H.BASE + '/index.html'); await t.waitForTimeout(9000);   // queued behind the Erstkontakt card
    check(/nur in diesem Tab erhalten/.test(await t.evaluate(() => document.body.innerText)), '  the warning says what is true: the progress stays in this tab');
    await t.close();
    await p.goto(H.BASE + '/chapter0/chapter0.html'); await p.waitForTimeout(1800);
    check(!(await p.evaluate(() => { try { localStorage.getItem('x'); return true; } catch (_) { return false; } })), '  (storage really is refused)');
    await p.evaluate(() => GameEngine.state.markChapterComplete('ch0'));
    await p.goto(H.BASE + '/chapter1/chapter1.html'); await p.waitForTimeout(2500);
    let s = await p.evaluate(() => ({ ch0: GameEngine.state.isChapterComplete('ch0'), persist: GameEngine.state.canPersist(), lock: /ZUGANG VERWEIGERT|NOCH NICHT ERREICHBAR/.test(document.body.innerText) }));
    check(s.ch0 && !s.persist && !s.lock, `  Sektor 00 is still finished in Sektor 01, which opens (finished ${s.ch0}, locked ${s.lock})`);
    await p.evaluate(() => GameEngine.state.markChapterComplete('ch1'));
    await p.goto(H.BASE + '/chapter2/chapter2.html'); await p.waitForTimeout(2500);
    s = await p.evaluate(() => ({ chs: GameEngine.state.get('chaptersCompleted').join(','), lock: /ZUGANG VERWEIGERT|NOCH NICHT ERREICHBAR/.test(document.body.innerText), ach: GameEngine.state.get('achievementsUnlocked').includes('ch1_complete') }));
    check(s.chs === 'ch0,ch1' && !s.lock && s.ach, `  and Sektor 02 opens with both behind it (${s.chs})`);
    check(errs.length === 0, '  no page errors ' + errs.join(';'));
    await ctx.close(); await b2.close(); }

  console.log('\n[D2] storage that can be read but not written: the tab carries the save, and hands it back when writing works again');
  { const b3 = await H.launch();
    const ctx = await b3.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true });
    await ctx.addInitScript(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {                 // only localStorage refuses, and only until the test says so
        if (this === window.localStorage && sessionStorage.getItem('__allow') !== '1') throw new DOMException('full', 'QuotaExceededError');
        return set.call(this, k, v);
      };
    });
    await ctx.route('**://fonts.g**/**', r => r.abort());
    const errs = []; const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
    await p.goto(H.BASE + '/chapter0/chapter0.html'); await p.waitForTimeout(1800);
    await p.evaluate(() => GameEngine.state.markChapterComplete('ch0'));
    await p.goto(H.BASE + '/chapter1/chapter1.html'); await p.waitForTimeout(2200);
    let s = await p.evaluate(() => ({ ch0: GameEngine.state.isChapterComplete('ch0'), lock: /ZUGANG VERWEIGERT|NOCH NICHT ERREICHBAR/.test(document.body.innerText), persist: GameEngine.state.canPersist() }));
    check(s.ch0 && !s.lock && !s.persist, `  Sektor 00 survives the move to Sektor 01 (finished ${s.ch0}, locked ${s.lock})`);
    await p.evaluate(() => { GameEngine.state.markChapterComplete('ch1'); sessionStorage.setItem('__allow', '1'); });   // the quota frees up
    await p.goto(H.BASE + '/chapter2/chapter2.html'); await p.waitForTimeout(2200);
    s = await p.evaluate(() => ({ lock: /ZUGANG VERWEIGERT|NOCH NICHT ERREICHBAR/.test(document.body.innerText), stored: (JSON.parse(localStorage.getItem('ka2_save_v1') || 'null') || {}).chaptersCompleted, name: window.name, persist: GameEngine.state.canPersist() }));
    check(!s.lock && s.stored && s.stored.join() === 'ch0,ch1' && s.name === '' && s.persist, `  once writing works the save moves back into storage and the tab copy is dropped (stored ${s.stored}, window.name "${s.name}")`);
    check(errs.length === 0, '  no page errors ' + errs.join(';'));
    await ctx.close(); await b3.close(); }

  finish();
})();
