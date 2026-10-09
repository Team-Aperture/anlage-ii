/* Sound levels. The interface sounds (character blips, clicks, jingles) are
   synthesised in the page; the soundtrack is mastered hot mp3s played at a
   fixed volume. They used to sit 11-18 dB apart the wrong way round (blips
   far under the music). This pins the balance with MEASUREMENTS, not
   constants:
     [A] every sound of the real engine graph is rendered offline and its peak
         compared with the real soundtrack files (decoded, RMS at the music
         volume in js/engine.js): each blip clearly on top of the hottest track,
         none near the ceiling, jingles included, and a pile-up of every jingle
         at once held by the soft ceiling instead of clipping.
     [B] iPhones ignore HTMLMediaElement.volume (it reads 1 whatever is set):
         simulated here by overriding it. The music must then go through a
         Web-Audio gain at the music volume - start, crossfade, mute, unmute -
         and if that routing cannot be built, still play (as before).
     [C] everywhere else the element's own volume is used, nothing routed.
   If a new, hotter track makes [A] fail, lower VOL in the music module (or
   raise SFX_GAIN in the audio module) - that is exactly what it is for. */
const H = require('./helpers');
const { chromium } = require('playwright');
const { check, finish } = H.checker('sound_levels');
const SRC = H.fs.readFileSync(H.path.join(H.ROOT, 'js/engine.js'), 'utf8');
const VOL = +SRC.match(/const VOL = ([\d.]+);/)[1];
const db = x => 20 * Math.log10(Math.max(1e-9, x));

const SOUNDS = {
  'R-3MI': "GameEngine.audio.blip('R-3MI')", 'V-TGM': "GameEngine.audio.blip('V-TGM')", SYSTEM: "GameEngine.audio.blip('SYSTEM')",
  'F-RØ5CHI': "GameEngine.audio.blip('F-RØ5CHI')", 'L-UX': "GameEngine.audio.blip('L-UX')", 'B-RADF1SH': "GameEngine.audio.blip('B-RADF1SH')",
  'T-FLON14': "GameEngine.audio.blip('T-FLON14')", 'ASP-1024': "GameEngine.audio.blip('ASP-1024')", 'AGN-H3R': "GameEngine.audio.blip('AGN-H3R')", 'FAX-N': "GameEngine.audio.blip('FAX-N')",
  click: 'GameEngine.audio.click()',
  solve: 'GameEngine.audio.solve()', fail: 'GameEngine.audio.fail()', achievement: 'GameEngine.audio.achievement()', fanfare: 'GameEngine.audio.fanfare()', signal: 'GameEngine.audio.signal()',
};
const BLIPS = ['R-3MI', 'V-TGM', 'SYSTEM', 'F-RØ5CHI', 'L-UX', 'B-RADF1SH', 'T-FLON14', 'ASP-1024', 'AGN-H3R', 'FAX-N', 'click'];
const JINGLES = ['solve', 'fail', 'achievement', 'fanfare', 'signal'];

// the peak of one sound through the engine's own graph, rendered offline
async function peakOf(b, code) {
  const { ctx, p, errs } = await H.open(b, '/access.html', H.save({ settings: { muted: true } }));
  await p.waitForTimeout(400);
  await p.evaluate(() => { window.AudioContext = function () { const c = new OfflineAudioContext(1, 44100 * 3, 44100); window.__ctx = c; return c; }; });
  const pk = await p.evaluate(async code => {
    Math.random = () => 0.5;            // blips detune at random; measure the centre pitch, deterministically
    GameEngine.audio.setMuted(false); eval(code);
    const d = (await window.__ctx.startRendering()).getChannelData(0);
    let m = 0; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
    return m;
  }, code);
  await ctx.close();
  return { dB: db(pk), lin: pk, errs };
}

const probe = p => p.evaluate(() => ({
  level: GameEngine.music.level(), routed: GameEngine.music.routed(), ctx: (GameEngine.audio.ensure() || {}).state,
  els: (window.__els || []).map(e => ({ src: e.src.split('/').pop(), paused: e.paused, t: +e.currentTime.toFixed(2), vol: e.volume })),
}));
// real Web Audio needs the autoplay policy relaxed in a headless browser
const IOS_SIM = () => {
  // an iPhone: the element volume cannot be set and always reads 1
  Object.defineProperty(HTMLMediaElement.prototype, 'volume', { get() { return 1; }, set(v) {}, configurable: true });
};
const SPY = () => {
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { (window.__els = window.__els || []).push(this); return play.apply(this, arguments); };
};
async function musicPage(b, init) {
  const r = await H.open(b, '/access.html', H.save({ settings: {} }));
  await r.p.addInitScript(SPY);
  if (init) await r.p.addInitScript(init);
  await r.p.reload({ waitUntil: 'domcontentloaded' }); await r.p.waitForTimeout(500);
  return r;
}

(async () => {
  const b = await H.launch();

  console.log('\n[A] every sound against the real soundtrack');
  // the hottest real track, at the music volume
  const { ctx: c0, p: p0 } = await H.open(b, '/access.html', H.save({ settings: { muted: true } }));
  await p0.waitForTimeout(300);
  const music = await p0.evaluate(async () => {
    const out = {};
    for (const [id, f] of Object.entries(GameEngine.music.TRACKS)) {
      const r = await fetch('assets/music/' + f); if (!r.ok) continue;
      const a = await new OfflineAudioContext(1, 44100, 44100).decodeAudioData(await r.arrayBuffer()), d = a.getChannelData(0);
      let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * d[i];
      out[id] = Math.sqrt(s / d.length);
    }
    return out;
  });
  await c0.close();
  const ids = Object.keys(music);
  check(ids.length >= 1, `  ${ids.length} real track(s) measured`);
  const hottest = Math.max(...Object.values(music)), musicRms = db(hottest * VOL);
  console.log(`       hottest track ${db(hottest).toFixed(1)} dBFS RMS × volume ${VOL} = ${musicRms.toFixed(1)} dBFS`);

  const pk = {};
  for (const name of Object.keys(SOUNDS)) { const r = await peakOf(b, SOUNDS[name]); pk[name] = r; if (r.errs.length) check(false, `  page errors on ${name}: ${r.errs[0]}`); }
  console.log('       peaks (dBFS): ' + Object.entries(pk).map(([k, v]) => `${k} ${v.dB.toFixed(1)}`).join(' · '));
  const quiet = BLIPS.reduce((m, k) => Math.min(m, pk[k].dB), 0);
  check(quiet >= musicRms + 8, `  the quietest blip (${quiet.toFixed(1)}) is at least 8 dB above the hottest track's average (${musicRms.toFixed(1)})`);
  check(BLIPS.every(k => pk[k].dB <= -6), `  no blip or click peaks above -6 dBFS (loudest ${Math.max(...BLIPS.map(k => pk[k].dB)).toFixed(1)})`);
  check(JINGLES.every(k => pk[k].dB <= -3 && pk[k].dB >= -14), `  jingles sit between -14 and -3 dBFS (${JINGLES.map(k => pk[k].dB.toFixed(1)).join(', ')})`);
  check(Math.abs((pk['V-TGM'].dB - pk.SYSTEM.dB) - 4.6) <= 2, `  the voices keep their balance: V-TGM is ${(pk['V-TGM'].dB - pk.SYSTEM.dB).toFixed(1)} dB over SYSTEM (4.6 before)`);
  const pile = await peakOf(b, 'GameEngine.audio.fanfare(); GameEngine.audio.solve(); GameEngine.audio.achievement(); GameEngine.audio.signal(); GameEngine.audio.fail()');
  check(pile.lin <= 0.90 && pile.lin > 0.5, `  everything at once is held by the ceiling (${pile.lin.toFixed(3)}, ceiling 0.89 + a hair of oversampling), not clipped`);

  console.log('\n[B] an iPhone (element volume cannot be set): the music goes through a Web-Audio gain');
  const bi = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  { const { ctx, p, errs } = await musicPage(bi, IOS_SIM);
    check(await p.evaluate(() => { const a = new Audio(); a.volume = 0.3; return a.volume === 1; }), '  (the simulation holds: volume reads 1 whatever is set)');
    await p.evaluate(() => GameEngine.music.play('title')); await p.waitForTimeout(1900);
    let s = await probe(p);
    check(s.routed && Math.abs(s.level - VOL) < 0.02, `  routed through a gain at the music volume (level ${s.level.toFixed(3)}, routed ${s.routed})`);
    check(s.ctx === 'running' && s.els.length === 1 && !s.els[0].paused && s.els[0].vol === 1, `  the track plays, context running, element left at 1 (${JSON.stringify(s.els[0])})`);
    await p.evaluate(() => GameEngine.music.play('ch1_ambient')); await p.waitForTimeout(1900);
    s = await probe(p);
    check(s.routed && Math.abs(s.level - VOL) < 0.02 && s.els.length === 2 && s.els[0].paused && !s.els[1].paused, `  a crossfade to the next track: the old one stops, the new one is at the music volume (${s.level.toFixed(3)})`);
    await p.evaluate(() => GameEngine.audio.toggleMute()); await p.waitForTimeout(900);
    s = await probe(p);
    check(s.level === 0 && s.els.every(e => e.paused), '  mute: silent and paused');
    await p.evaluate(() => GameEngine.audio.toggleMute()); await p.waitForTimeout(1900);
    s = await probe(p);
    check(s.routed && Math.abs(s.level - VOL) < 0.02 && s.els.some(e => !e.paused), `  unmute: back at the music volume (${s.level.toFixed(3)})`);
    check(errs.length === 0, '  no page errors ' + errs.join(';')); await ctx.close(); }

  console.log('\n[B2] …and if the routing cannot be built, the track still plays (the old behaviour)');
  { const { ctx, p, errs } = await musicPage(bi, () => {
      Object.defineProperty(HTMLMediaElement.prototype, 'volume', { get() { return 1; }, set(v) {}, configurable: true });
      AudioContext.prototype.createMediaElementSource = function () { throw new Error('refused'); };
    });
    await p.evaluate(() => GameEngine.music.play('title')); await p.waitForTimeout(1500);
    const s = await probe(p);
    check(!s.routed && s.els.length === 1 && !s.els[0].paused, `  plays plain, not routed (${JSON.stringify(s.els[0])})`);
    check(errs.length === 0, '  and raises nothing ' + errs.join(';')); await ctx.close(); }

  console.log('\n[C] everywhere else the element\'s own volume is used, nothing is routed');
  { const { ctx, p, errs } = await musicPage(bi, null);
    await p.evaluate(() => GameEngine.music.play('title')); await p.waitForTimeout(1900);
    const s = await probe(p);
    check(!s.routed && Math.abs(s.level - VOL) < 0.02 && Math.abs(s.els[0].vol - VOL) < 0.02 && !s.els[0].paused, `  element volume ${s.els[0] && s.els[0].vol} (level ${s.level.toFixed(3)}), not routed`);
    check(errs.length === 0, '  no page errors ' + errs.join(';')); await ctx.close(); }
  await bi.close();

  await b.close(); finish();
})();
