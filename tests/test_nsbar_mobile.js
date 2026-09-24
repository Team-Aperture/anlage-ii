/* The return bar fits a phone, covers nothing, is covered by nothing, and
   steps aside while a line is on screen. */
const H = require('./helpers');
const { check, finish } = H.checker('nsbar_mobile');
(async () => {
  const b = await H.launch();
  for (const n of [0,1,2,3,4,5,6,7,8]) {
    const { ctx, p, errs } = await H.open(b, `/chapter${n}/chapter${n}.html`, H.save({ chaptersCompleted: H.ALL, signalsFound: H.SIG, achievementsUnlocked:['ch0_complete'] }), { viewport:{width:360,height:740}, mobile:true });
    await p.waitForTimeout(2600); await H.drain(p); await p.waitForTimeout(400);
    const r = await p.evaluate(() => { const bar = document.getElementById('nachsucheBar'); if (!bar) return { missing:true }; const b = bar.getBoundingClientRect();
      const others = new Set(); for (let fx=.08; fx<=.92; fx+=.12) for (let fy=.25; fy<=.75; fy+=.25) { const t = document.elementFromPoint(b.left+b.width*fx, b.top+b.height*fy); if (t && t!==bar && !bar.contains(t)) others.add(t.id||t.className||t.tagName); }
      const covered = []; document.querySelectorAll('body *').forEach(e => { if (e===bar||bar.contains(e)||e.contains(bar)) return; const cs=getComputedStyle(e); if (cs.position!=='fixed'||cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)===0) return;
        const q=e.getBoundingClientRect(); if (!q.width||!q.height||q.height>innerHeight*.6||q.bottom<innerHeight-28||q.top>innerHeight) return; if (!(q.right<=b.left||q.left>=b.right||q.bottom<=b.top||q.top>=b.bottom)) covered.push(e.id||e.className); });
      return { missing:false, inView: b.left>=-1&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1, overlaps:[...others], covered }; });
    check(!r.missing && r.inView && !r.overlaps.length && !r.covered.length, `ch${n}: bar present, fits, uncovered, covers nothing${r.overlaps?.length||r.covered?.length ? ' ('+[...(r.overlaps||[]),...(r.covered||[])].join(',')+')' : ''}`);
    const away = await p.evaluate(() => new Promise(res => { GameEngine.dialogue.load([{ speaker:'SYSTEM', text:'Eine Zeile.' }]);
      setTimeout(() => { const bar = document.getElementById('nachsucheBar'); res(!!bar && bar.classList.contains('ns-away') && getComputedStyle(bar).opacity === '0'); }, 700); }));
    check(away, `  ch${n}: steps aside while a line is on screen`);
    check(errs.length === 0, `  ch${n}: no page errors`); await ctx.close();
  }
  await b.close(); finish();
})();
