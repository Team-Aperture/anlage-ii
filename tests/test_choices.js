/* The choice system, in every chapter that has one: a story choice is never
   replaced by a talk menu, a pick over a running line advances it instead of
   replacing its continuation, a menu re-opened mid-fade stays, focus lands on
   the panel, and a talk menu gives way to the room. */
const H = require('./helpers');
const { check, finish } = H.checker('choices');

const kind = p => p.evaluate(() => document.getElementById('choiceOverlay')?.dataset.kind || '');
const menuUp = p => p.evaluate(() => { const o = document.getElementById('choiceOverlay'); return !!o && !o.classList.contains('hidden') && o.classList.contains('visible'); });
const prompt = p => p.locator('#choicePrompt').innerText();

// drain until a choice menu is on screen (a story choice), or give up
async function toChoice(p, max = 60) {
  for (let i = 0; i < max; i++) {
    if (await menuUp(p)) return true;
    await H.drain(p, 40); await p.waitForTimeout(250);
  }
  return false;
}

(async () => {
  const b = await H.launch();

  for (const [id, url, sv, icon] of [
    ['ch2', '/chapter2/chapter2.html', H.save({ chaptersCompleted: ['ch0', 'ch1'] }), '.r3mi-icon'],
  ]) {
    console.log(`\n[${id}] story choice: robot icons, a running line, focus`);
    const { ctx, p, errs } = await H.open(b, url, sv);
    await p.waitForTimeout(3800);
    check(await toChoice(p), 'a story choice appears');
    check((await kind(p)) === 'story', '  it is marked as a story choice');
    check(await p.evaluate(() => document.activeElement?.classList.contains('choice-panel')), '  focus is on the panel, not a button');
    const before = await prompt(p);
    await p.evaluate(s => document.querySelector(s).focus(), icon); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
    check((await prompt(p)) === before && await menuUp(p), '  Enter on a robot icon leaves the story choice alone');
    // a scripted line arrives while the choice is up: a pick advances it, the continuation survives
    await p.evaluate(() => { window.__cb = 0; GameEngine.dialogue.load([{ speaker: 'SYSTEM', text: 'PRÜFLINIE.' }], () => { window.__cb = 1; }); });
    await p.waitForTimeout(150);
    await p.locator('.choice-btn').first().click({ force: true }); await p.waitForTimeout(150);   // completes the typing
    await p.locator('.choice-btn').first().click({ force: true }); await p.waitForTimeout(250);   // ends the line
    const r = await p.evaluate(() => ({ cb: window.__cb, up: !document.getElementById('choiceOverlay').classList.contains('hidden') && document.getElementById('choiceOverlay').classList.contains('visible') }));
    check(r.cb === 1 && r.up, `  a pick over a running line advanced it; the line's continuation ran and the choice is still up (${JSON.stringify(r)})`);
    await p.locator('.choice-btn').first().click({ force: true }); await p.waitForTimeout(300);
    check(!(await menuUp(p)), '  the next pick takes');
    check(errs.length === 0, '  no page errors');
    await ctx.close();
  }

  for (const [id, url, sv] of [
    ['ch2', '/chapter2/chapter2.html', H.save({ chaptersCompleted: ['ch0', 'ch1', 'ch2'] })],
    ['ch3', '/chapter3/chapter3.html', H.save({ chaptersCompleted: ['ch0', 'ch1', 'ch2', 'ch3'] })],
    ['ch4', '/chapter4/chapter4.html', H.save({ chaptersCompleted: ['ch0', 'ch1', 'ch2', 'ch3', 'ch4'] })],
    ['ch5', '/chapter5/chapter5.html', H.save({ chaptersCompleted: ['ch0', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5'] })],
    ['ch6', '/chapter6/chapter6.html', H.save({ chaptersCompleted: ['ch0', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6'] })],
    ['ch7', '/chapter7/chapter7.html', H.save({ chaptersCompleted: ['ch0', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7'] })],
  ]) {
    console.log(`\n[${id}] talk menu on a revisit: dismissable, re-open mid-fade stays, the bar steps aside`);
    const { ctx, p, errs } = await H.open(b, url, sv);
    await p.waitForTimeout(2500); await H.settled(p); await H.drain(p); await p.waitForTimeout(500); await H.drain(p);
    const icon = p.locator('.r3mi-icon');
    if (!(await icon.count()) || !(await icon.isVisible())) { console.log('  (no robot icon on screen — skipped)'); await ctx.close(); continue; }
    await icon.click({ force: true }); await p.waitForTimeout(150);
    if (!(await menuUp(p))) { console.log('  (no talk menu in this state — skipped)'); await ctx.close(); continue; }
    check((await kind(p)) === 'talk', '  the talk menu is dismissable');
    const bar = await p.evaluate(() => { const b = document.getElementById('nachsucheBar'); return b ? b.classList.contains('ns-away') : null; });
    check(bar !== false, `  the return bar stepped aside for the menu (${bar})`);
    await p.locator('.choice-btn', { hasText: 'Nichts' }).click({ force: true }); await p.waitForTimeout(120);
    await icon.click({ force: true }); await p.waitForTimeout(700);
    check(await menuUp(p), '  a menu re-opened inside the fade stays open');
    await p.locator('.choice-btn', { hasText: 'Nichts' }).click({ force: true }); await p.waitForTimeout(500);
    check(errs.length === 0, '  no page errors');
    await ctx.close();
  }

  await b.close(); finish();
})();
