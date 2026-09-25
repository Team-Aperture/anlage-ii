/* The title screen's sound: the boot types with a little terminal chatter
   (one sound per line, by line type, and a rising tone when the interface
   comes up), and the title theme starts only once the menu is up — never
   under the boot. With sound still blocked by the browser, nothing queues up
   and nothing breaks. */
const H = require('./helpers');
const { chromium } = require('playwright');
const { check, finish } = H.checker('title_audio');

// record every tone and every music start, with the time and the boot state
const SPY = () => {
  window.__log = [];
  const t0 = performance.now();
  const boot = () => !!document.getElementById('bootSequence');
  const wrap = () => {
    if (!window.GameEngine) return setTimeout(wrap, 5);
    const A = GameEngine.audio, M = GameEngine.music;
    const tone = A.tone, play = M.play;
    A.tone = o => { window.__log.push({ k: 'tone', t: performance.now() - t0, boot: boot(), f: o && o.freq }); return tone(o); };
    M.play = (id, o) => { window.__log.push({ k: 'music', id, t: performance.now() - t0, boot: boot() }); return play(id, o); };
  };
  wrap();
};

(async () => {
  for (const [label, args] of [['sound allowed', ['--autoplay-policy=no-user-gesture-required']], ['sound blocked (browser default)', []]]) {
    console.log(`\n[${label}]`);
    const b = await chromium.launch({ args });
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    await p.addInitScript(s => { localStorage.setItem('ka2_mobile_warning_dismissed', '1'); localStorage.setItem('ka2_save_v1', JSON.stringify(s)); }, H.save({}));
    await p.addInitScript(SPY);
    await p.goto(H.BASE + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => !document.getElementById('bootSequence'), null, { timeout: 15000 });
    await p.waitForTimeout(500);
    const log = await p.evaluate(() => window.__log);
    const tones = log.filter(e => e.k === 'tone' && e.boot), music = log.filter(e => e.k === 'music');
    if (args.length) {
      check(tones.length >= 10, `  the boot makes sounds as it types (${tones.length} tones)`);
      check(tones.some(t => t.f === 150) && tones.some(t => t.f === 880) && tones.some(t => t.f === 440), '  errors, successes and the final line each sound different');
    } else {
      check(tones.length === 0, `  with sound blocked the boot stays silent instead of saving blips up (${tones.length})`);
    }
    check(music.length === 1 && music[0].id === 'title' && !music[0].boot, `  the title theme starts once, after the boot (${JSON.stringify(music.map(m => ({ id: m.id, underBoot: m.boot })))})`);
    check(errs.length === 0, '  no page errors' + (errs.length ? ': ' + errs[0] : ''));
    await ctx.close(); await b.close();
  }
  // skipping the boot also brings the music straight in
  console.log('\n[boot skipped]');
  { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage();
    await p.addInitScript(s => { localStorage.setItem('ka2_mobile_warning_dismissed', '1'); localStorage.setItem('ka2_save_v1', JSON.stringify(s)); }, H.save({}));
    await p.addInitScript(SPY);
    await p.goto(H.BASE + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(900); await p.keyboard.press('Escape'); await p.waitForTimeout(800);
    const music = await p.evaluate(() => window.__log.filter(e => e.k === 'music'));
    check(music.length === 1 && music[0].id === 'title' && music[0].t < 2500, `  the theme starts as soon as the boot is skipped (${music.length && Math.round(music[0].t)} ms)`);
    await ctx.close(); await b.close(); }
  finish();
})();
