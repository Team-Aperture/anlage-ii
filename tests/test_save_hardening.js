/* Portability without trust: a save is only as far along as its own evidence. */
const H = require('./helpers');
const { check, finish } = H.checker('save_hardening');
const boot = async (b, sv) => { const r = await H.open(b, '/index.html', sv); await r.p.waitForTimeout(6500); return r; };
const read = p => p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')));
(async () => {
  const b = await H.launch();
  console.log('\n[A] a forged "everything done" save is normalised');
  { const forged = { version:'1.0.0-pre', schemaVersion:4, chaptersCompleted:['ch0','ch8'], puzzlesSolved:{}, signalsFound:[],
      achievementsUnlocked:['ch8_complete','signal_all','bonus_found','truth'], flags:{ truth_revealed:true, zieldaten:true },
      chapterState:{}, calibration:{}, settings:{}, firstPlay:false };
    const { ctx, p, errs } = await boot(b, forged); const st = await read(p);
    check(!st.chaptersCompleted.includes('ch8'), 'ch8 dropped: the chain is missing');
    check(!st.flags.truth_revealed && !st.flags.zieldaten, '  chamber and coordinates not marked earned');
    check(!st.achievementsUnlocked.includes('bonus_found') && !st.achievementsUnlocked.includes('signal_all'), '  unsupported achievements dropped');
    check((await p.evaluate(() => GameEngine.state.zieldaten())) === '', '  coordinates cannot be read out');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }
  console.log('\n[B] a legitimate finished run survives');
  { const { ctx, p, errs } = await boot(b, H.save({ chaptersCompleted: H.ALL, signalsFound: H.SIG,
      achievementsUnlocked:['ch8_complete','signal_all','bonus_found','truth'], flags:{ truth_revealed:true, zieldaten:true } }));
    const st = await read(p);
    check(st.chaptersCompleted.length === 9 && st.signalsFound.length === 5 && st.flags.truth_revealed === true, 'everything kept');
    const z = await p.evaluate(() => GameEngine.state.zieldaten());
    check(/^N .*E /.test(z) && !('zieldaten_text' in st), `  coordinates derived, never stored (${z})`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }
  console.log('\n[C] a signal cannot be claimed for a sector never reached');
  { const { ctx, p } = await boot(b, H.save({ chaptersCompleted: H.done(2), signalsFound: H.SIG }));
    check((await read(p)).signalsFound.length === 0, 'all five dropped behind sector 01'); await ctx.close(); }
  console.log('\n[D] export → import, honest report');
  { let r = await boot(b, H.save({ chaptersCompleted: H.done(6), signalsFound:['sig_01','sig_02','sig_03'] }));
    const code = await r.p.evaluate(() => GameEngine.state.exportSave()); await r.ctx.close();
    r = await boot(b, undefined);
    const rep = await r.p.evaluate(c => GameEngine.state.importSave(c), code);
    check(rep.ok && rep.chapters === 6 && rep.signals === 3 && rep.edited === false && !rep.dropped.length, `clean import reports 6/3, unedited (${JSON.stringify(rep)})`);
    await r.ctx.close();
    r = await boot(b, undefined);
    const rep2 = await r.p.evaluate(c => { const o = JSON.parse(decodeURIComponent(escape(atob(c)))); o.chaptersCompleted = ['ch0','ch1','ch2','ch3','ch4','ch5','ch6','ch7','ch8']; o.flags.truth_revealed = true;
      return GameEngine.state.importSave(btoa(unescape(encodeURIComponent(JSON.stringify(o))))); }, code);
    check(rep2.ok && rep2.edited === true && rep2.dropped.includes('truth_revealed'), `tampered code imports, flagged, claims dropped (${rep2.dropped.join(',')})`);
    await r.ctx.close(); }
  console.log('\n[E] a beta save carries across, marked');
  { const beta = { version:'1.0.0', schemaVersion:3, chaptersCompleted:H.done(4), puzzlesSolved:{}, signalsFound:['sig_01'], achievementsUnlocked:[],
      flags:{}, chapterState:{}, calibration:{ch1:true,ch2:true,ch3:true}, settings:{}, firstPlay:false, zieldaten_text:'N 99° 99.999 · E 099° 99.999' };
    const { ctx, p } = await boot(b, beta); const st = await read(p);
    check(st.schemaVersion === 4 && st.chaptersCompleted.length === 4 && st.provenance === 'beta', 'migrated to schema 4, progress kept, marked beta');
    check(!('zieldaten_text' in st) && (await p.evaluate(() => GameEngine.state.zieldaten())) === '', '  plaintext field gone; unfinished run gets no coordinates');
    await ctx.close(); }
  console.log('\n[F] a save the previous build stripped of ch0 keeps its progress; saves with progress stay readable by it');
  { // the previous build drops ch0 from any save without the legacy flag and keeps ch1…; this build must not then drop the rest
    const { ctx, p } = await boot(b, H.save({ chaptersCompleted: ['ch1', 'ch2', 'ch3'], flags: {}, achievementsUnlocked: ['ch1_complete'] }));
    const st = await read(p);
    check(['ch0', 'ch1', 'ch2', 'ch3'].every(c => st.chaptersCompleted.includes(c)), `  ch0 restored, ch1–ch3 kept (${st.chaptersCompleted.join(',')})`);
    check(st.flags.ka1_verified === true, '  the save carries the legacy flag the previous build needs to keep ch0');
    await ctx.close(); }
  { const { ctx, p } = await boot(b, H.save({ chaptersCompleted: [], flags: {} }));
    check(!(await read(p)).flags.ka1_verified, '  a brand-new save gets no flag at all');
    await ctx.close(); }
  { const { ctx, p } = await boot(b, H.save({ chaptersCompleted: ['ch2', 'ch3'], flags: {} }));
    check((await read(p)).chaptersCompleted.length === 0, '  the chain rule still holds otherwise (ch2 without ch1 is dropped)');
    await ctx.close(); }
  await b.close(); finish();
})();
