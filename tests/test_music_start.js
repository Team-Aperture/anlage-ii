/* A chapter's track starts on the player's first action, whatever it is.
   Browsers block sound until the page is touched; the engine used to retry
   the blocked track only on a click, so a player who went through the
   opening lines with Space/Enter heard nothing for the whole chapter.
   The music also stays under the interface sounds (VOL in the engine). */
const H = require('./helpers');
const { check, finish } = H.checker('music_start');
const SPY = () => { window.__plays = []; const P = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { const r = P.call(this); const src = this.src.split('/').pop();
    if (r && r.then) r.then(() => window.__plays.push({ ok: true, src })).catch(() => window.__plays.push({ ok: false, src })); return r; }; };
(async () => {
  const b = await H.launch();
  for (const how of ['click', 'keyboard', 'touch']) for (const [name, path, sv, file] of [
      ['ch0', '/chapter0/chapter0.html', H.save({ settings: {} }), 'ch0_rueckkehr.mp3'],
      ['ch1', '/chapter1/chapter1.html', H.save({ chaptersCompleted: ['ch0'], settings: {} }), 'ch1_wartung.mp3']]) {
    const { ctx, p, errs } = await H.open(b, path, sv, how === 'touch' ? { viewport: { width: 390, height: 844 }, mobile: true } : {});
    await p.addInitScript(SPY); await p.reload(); await p.waitForTimeout(3500);
    for (let i = 0; i < 4; i++) {
      if (how === 'click') await p.mouse.click(640, 700);
      else if (how === 'keyboard') await p.keyboard.press('Space');
      else await p.touchscreen.tap(195, 780);
      await p.waitForTimeout(400);
    }
    await p.waitForTimeout(1500);
    const plays = await p.evaluate(() => window.__plays);
    check(plays.some(x => x.ok && x.src === file), `${name}, first action by ${how}: ${file} plays (${plays.map(x => (x.ok ? 'ok ' : 'blocked ') + x.src).join(', ')})`);
    check(errs.length === 0, '  no page errors'); await ctx.close();
  }
  const src = H.fs.readFileSync(H.path.join(H.ROOT, 'js/engine.js'), 'utf8');
  const vol = +(/const VOL = ([\d.]+);/.exec(src) || [])[1];
  check(vol > 0 && vol <= 0.25, `the soundtrack sits under the interface sounds (VOL ${vol})`);
  await b.close(); finish();
})();
