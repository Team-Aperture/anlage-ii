/* The front door. Needs the KA-I code from tests/.local.json or KA1_CODE. */
const H = require('./helpers');
const { check, finish } = H.checker('access');
const CODE = H.localSecret('KA1_CODE');
(async () => {
  if (!CODE) { console.log('  --   KA1_CODE not provided; skipping (see tests/README.md)'); console.log('\nALL CHECKS PASSED  [access: skipped]'); process.exit(0); }
  const b = await H.launch();
  const type = async (p, code) => { for (let i = 0; i < code.length; i++) { await p.locator('.code-digit').nth(i).fill(code[i]); await p.waitForTimeout(40); } };
  console.log('\n[A] wrong code');
  { const { ctx, p, errs } = await H.open(b, '/access.html', undefined); await type(p, '00000000'); await p.waitForTimeout(1500);
    check(!/chapter0/.test(p.url()) && !(await p.locator('.access-go.visible').count()), 'a wrong code opens nothing');
    check(!/83162947|ABSCHALTCODE ERKANNT/.test(await p.evaluate(() => document.body.innerText)), '  and reveals nothing');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }
  console.log('\n[B] the real code');
  { const { ctx, p, errs } = await H.open(b, '/access.html', undefined); await type(p, CODE);
    await p.waitForSelector('.access-go.visible', { timeout: 8000 }).catch(() => {});
    check(await p.locator('.access-go.visible').count() === 1, 'the reactivation offer appears');
    check(/access\.html/.test(p.url()), '  and does not redirect on its own');
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('ka2_save_v1')));
    check(st.flags.ka1_verified === true && st.achievementsUnlocked.includes('ka1_veteran'), '  flag and veteran achievement set');
    await p.locator('#accessGo').click(); await p.waitForTimeout(1800);
    check(/chapter0/.test(p.url()), '  the facility starts only on the player\'s choice');
    check(!/83162947/.test(H.fs.readFileSync(H.path.join(H.ROOT,'js/access.js'),'utf8') + H.fs.readFileSync(H.path.join(H.ROOT,'access.html'),'utf8')), '  the code is not in the shipped source');
    check(errs.length === 0, '  no page errors'); await ctx.close(); }
  await b.close(); finish();
})();
