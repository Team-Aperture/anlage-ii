/* Beta hotfix batch #01 — Ch8/Ch9 defects, pinned. */
const H = require('./helpers');
const { check, finish } = H.checker('hotfix01');
(async () => {
  const b = await H.launch();
  console.log('\n[A] an overlay opened from a full-screen card is visible');
  { const { ctx, p, errs } = await H.open(b, '/index.html', H.save({ chaptersCompleted: H.ALL, signalsFound: H.SIG })); await p.waitForTimeout(6500);
    const r = await p.evaluate(() => { const cc = document.createElement('div'); cc.className = 'chapter-complete'; cc.style.cssText = 'position:fixed;inset:0;background:#04080c;z-index:400;'; document.body.appendChild(cc);
      GameEngine.signals.showOverlay(); const panel = document.querySelector('#signalOverlay'); const pz = +getComputedStyle(panel).zIndex, cz = +getComputedStyle(cc).zIndex;
      const rect = panel.getBoundingClientRect(); const top = document.elementFromPoint(rect.width/2, rect.height/2); cc.remove();
      return { pz, cz, inPanel: !!top && (panel === top || panel.contains(top)) }; });
    check(r.pz > r.cz && r.inPanel, `signal panel sits above a completion card and takes the pointer (${r.pz} > ${r.cz})`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }
  console.log('\n[B] chapter 9 resumes mid-conversation');
  for (const [label, cp, want] of [
    ['act 4, unit faced',   { act:4, records:{}, signalDone:true, facedFirst:'r3mi', asked:{}, consoleSeen:false, burstSeen:false, optional:{} }, 'choices'],
    ['act 4, none faced',   { act:4, records:{}, signalDone:true, facedFirst:null,   asked:{}, consoleSeen:false, burstSeen:false, optional:{} }, 'faceBar'],
    ['act 5, burst seen',   { act:5, records:{}, signalDone:true, facedFirst:'r3mi', asked:{used:1,why:1,others:1}, consoleSeen:true, burstSeen:true, optional:{} }, 'choices'],
  ]) {
    const { ctx, p, errs } = await H.open(b, '/chapter9/chapter9.html', H.save({ chaptersCompleted: H.ALL, signalsFound: H.SIG, ch9_progress: cp }));
    await p.waitForTimeout(3000); await H.settled(p); await H.drain(p); await p.waitForTimeout(600); await H.drain(p);
    const st = await p.evaluate(() => ({ choices: !!document.querySelector('#choiceOverlay.visible'), faceBar: !!document.querySelector('#faceBar:not(.hidden)'),
      revisit: /DIESE KAMMER/.test(document.getElementById('choicePrompt')?.textContent || '') }));
    check(st[want] && !st.revisit, `${label}: the way forward is offered, not the epilogue (${JSON.stringify(st)})`);
    check(errs.length === 0, '  no page errors'); await ctx.close();
  }
  console.log('\n[C] a genuine revisit still gets the epilogue, and copy reports on itself');
  { const { ctx, p, errs } = await H.open(b, '/chapter9/chapter9.html', H.save({ chaptersCompleted: H.ALL, signalsFound: H.SIG, flags:{ ka1_verified:true, truth_revealed:true, zieldaten:true } }));
    await p.waitForTimeout(3000); await H.settled(p); await H.drain(p); await p.waitForTimeout(600); await H.drain(p);
    check(/DIESE KAMMER/.test(await p.evaluate(() => document.getElementById('choicePrompt')?.textContent || '')), 'finished run lands on the revisit menu');
    await p.locator('.choice-btn', { hasText: 'ZIELDATEN' }).first().click({ force: true }); await p.waitForTimeout(500);
    await p.evaluate(() => document.querySelector('#evBody [data-act="copy-bonus"]')?.click()); await p.waitForTimeout(600);
    const l = await p.evaluate(() => ({ clicked: document.querySelector('#evBody [data-act="copy-bonus"]')?.textContent.trim(), end: document.getElementById('endCopy')?.textContent.trim() }));
    check(/KOPIERT|MARKIEREN/.test(l.clicked || '') && !/KOPIERT|MARKIEREN/.test(l.end || ''), `  copy feedback lands on the clicked button (${l.clicked})`);
    check(errs.length === 0, '  no page errors'); await ctx.close(); }
  await b.close(); finish();
})();
