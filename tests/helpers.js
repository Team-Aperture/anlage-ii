/* Shared harness for the KA-II suites. Run any suite with `node tests/<name>.js`
   against a static server on :8099 (see tests/README.md). */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const BASE = process.env.KAII_BASE || 'http://127.0.0.1:8099';
const ROOT = path.resolve(__dirname, '..');
const ALL  = ['ch0','ch1','ch2','ch3','ch4','ch5','ch6','ch7','ch8'];
const SIG  = ['sig_01','sig_02','sig_03','sig_04','sig_05'];

// A consistent save. chaptersCompleted must be an unbroken chain from ch0 and
// every finished chapter except ch0 carries a calibration entry, or the
// engine's invariants (rightly) normalise the save back down.
function save(over = {}) {
  const chapters = over.chaptersCompleted || [];
  const cal = {};
  chapters.forEach(c => { if (c !== 'ch0') cal[c] = true; });
  return {
    version: '1.1.0', schemaVersion: 4, chaptersCompleted: chapters, puzzlesSolved: {},
    signalsFound: [], achievementsUnlocked: [], flags: { ka1_verified: true },
    chapterState: {}, calibration: cal, settings: { muted: true }, firstPlay: false,
    ...over,
  };
}
const done = n => ALL.slice(0, n);   // ch0..ch(n-1)

// The only secret the suites need: the KA-I access code. Never committed.
function localSecret(key) {
  if (process.env[key]) return process.env[key];
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '.local.json'), 'utf8'))[key]; }
  catch (_) { return null; }
}

async function open(browser, url, sv, opts = {}) {
  const vp = opts.viewport || { width: 1280, height: 800 };
  const ctx = await browser.newContext({
    viewport: vp, hasTouch: !!opts.touch || vp.width < 500, isMobile: !!opts.mobile,
    reducedMotion: opts.reduced ? 'reduce' : 'no-preference',
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_ABORTED|fonts\.g/.test(m.text())) errs.push('console: ' + m.text()); });
  // Seed once per context: a reload must see what the game left behind.
  await p.addInitScript(s => {
    if (sessionStorage.getItem('__seeded')) return;
    sessionStorage.setItem('__seeded', '1');
    localStorage.setItem('ka2_mobile_warning_dismissed', '1');
    if (s !== null) localStorage.setItem('ka2_save_v1', typeof s === 'string' ? s : JSON.stringify(s));
  }, sv === undefined ? null : sv);
  await p.route('**://fonts.g**/**', r => r.abort());
  await p.goto(BASE + url, { waitUntil: 'domcontentloaded' });
  return { ctx, p, errs };
}

// Click through whatever dialogue is showing.
async function drain(p, max = 200) {
  for (let i = 0; i < max; i++) {
    if (!(await p.locator('.dlg-container.visible').count())) return true;
    await p.evaluate(() => document.querySelector('.dlg-container')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await p.waitForTimeout(60);
  }
  return false;
}

// Wait out a cold open or title card, testing what actually paints.
async function settled(p, max = 60) {
  for (let k = 0; k < max; k++) {
    const blocked = await p.evaluate(() => {
      const mid = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      for (let e = mid; e; e = e.parentElement) if (/cold-open|title-card|titleCard/i.test(e.className || e.id || '')) return true;
      return false;
    });
    if (!blocked) return;
    await p.waitForTimeout(500);
  }
}

function checker(name) {
  let fail = 0;
  const check = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fail++; };
  const finish = () => { console.log(`\n${fail === 0 ? 'ALL CHECKS PASSED' : fail + ' CHECK(S) FAILED'}  [${name}]`); process.exit(fail ? 1 : 0); };
  return { check, finish };
}

module.exports = { BASE, ROOT, ALL, SIG, save, done, open, drain, settled, checker, launch: () => chromium.launch(), localSecret, fs, path };
