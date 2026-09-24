/* Chapter 7's ANZEIGE station (Schaltbild und Verkabelung), the shipped
   buildWires lifted out of the source and run 200 000 times. Every instance
   must be solvable in exactly one way, and that way must follow from what is
   readable - two cable routes plus "each switch feeds exactly one terminal" -
   without the lamps. Believing the screen or the lamp TAGS never wins; the
   lamps themselves stay honest, and some visible cable always shows a tag up. */
'use strict';
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'chapter7', 'chapter7.js'), 'utf8');
function grab(name) { const i = SRC.indexOf('function ' + name); if (i < 0) throw new Error('missing ' + name);
  let d = 0, s = false; for (let j = i; j < SRC.length; j++) { if (SRC[j] === '{') { d++; s = true; } else if (SRC[j] === '}') { d--; if (s && d === 0) return SRC.slice(i, j + 1); } } }
const M = new Function(`${grab('randInt')} ${grab('pick')} ${grab('shuffle')} ${grab('buildWires')} return { buildWires };`)();

let fail = 0; const check = (c, m) => { console.log((c ? '  ok     ' : '  FAIL   ') + m); if (!c) fail++; };
const PERMS = []; (function g(a, r) { if (!r.length) PERMS.push(a); r.forEach((x, i) => g(a.concat(x), r.filter((_, j) => j !== i))); })([], [0, 1, 2, 3]);
const SETS = []; for (let m = 0; m < 16; m++) SETS.push([0, 1, 2, 3].filter(i => m >> i & 1));
const powered = (real, sw) => [...new Set(sw.map(s => real[s]))].sort().join();
const same = (a, b) => a.slice().sort().join() === b.slice().sort().join();

const N = 200000, c = { unique: 0, deducible: 0, lampFollower: 0, screenFollower: 0, hiddenPair: 0, tagShown: 0, lampShape: 0, fakeDiffers: 0, honestLamps: 0 };
for (let n = 0; n < N; n++) {
  const w = M.buildWires(), lamp = w.lamp, want = w.want.slice().sort().join();
  const sols = SETS.filter(S => powered(w.real, S) === want);
  if (sols.length === 1) c.unique++;
  // what the readable cables and the one-to-one rule allow
  const consistent = PERMS.filter(p => w.visible.every(s => p[s] === w.real[s]));
  if (SETS.some(S => consistent.every(p => powered(p, S) === want))) c.deducible++;
  // following the lit TAGS
  const lit = S => [0, 1, 2, 3].filter(t => S.some(s => w.real[s] === lamp[t]));
  const lf = SETS.find(S => same(lit(S), w.want));
  if (lf && powered(w.real, lf) === want) c.lampFollower++;
  // believing the on-screen schematic
  if (powered(w.real, w.want.map(t => w.fake.indexOf(t))) === want) c.screenFollower++;
  // the two switches whose routes are hidden
  if (powered(w.real, [0, 1, 2, 3].filter(s => !w.visible.includes(s))) === want) c.hiddenPair++;
  // some readable cable lights a lamp under a different tag
  if (w.visible.some(s => lamp.indexOf(w.real[s]) !== w.real[s])) c.tagShown++;
  // exactly one swap: a readable-cable terminal with a requested one
  const moved = [0, 1, 2, 3].filter(t => lamp[t] !== t), visT = w.visible.map(s => w.real[s]);
  if (moved.length === 2 && lamp[lamp[moved[0]]] === moved[0] && moved.some(t => visT.includes(t)) && moved.some(t => w.want.includes(t))) c.lampShape++;
  if (w.fake.some((t, s) => t !== w.real[s])) c.fakeDiffers++;
  // every lamp is a real terminal, each exactly once (the lamps light honestly)
  if (same(lamp, [0, 1, 2, 3])) c.honestLamps++;
}
const pc = k => (100 * c[k] / N).toFixed(1) + ' %';
console.log(`\nANZEIGE — ${N} instances of the shipped buildWires`);
check(c.unique === N, `  exactly one switch set works (${pc('unique')})`);
check(c.deducible === N, `  it follows from the two readable cables and the one-to-one rule alone (${pc('deducible')})`);
check(c.hiddenPair === N, `  …and it is always the two switches with hidden routes (${pc('hiddenPair')})`);
check(c.lampFollower === 0, `  lighting the requested lamp TAGS never releases it (${pc('lampFollower')})`);
check(c.screenFollower === 0, `  believing the on-screen schematic never releases it (${pc('screenFollower')})`);
check(c.tagShown === N, `  a readable cable always shows a swapped tag up (${pc('tagShown')})`);
check(c.lampShape === N && c.honestLamps === N, `  one tag pair swapped, every lamp a real terminal (${pc('lampShape')})`);
check(c.fakeDiffers === N, `  the screen always lies somewhere (${pc('fakeDiffers')})`);

console.log('\n[the hint ladder says what the station does]');
const H = new Function(SRC.slice(SRC.indexOf('  const HINTS = {'), SRC.indexOf('function readSpent')).replace(/\/\/[^\n]*\n/g, '\n') + '\nreturn HINTS;')();
check(/hidden/.test(H.wires[2].v.t) && /verdeckter/.test(H.wires[2].v.s) && /Kabel hat recht/.test(H.wires[2].r.t), '  step 3 names the hidden pair and that the cable beats the tag');
check(/Neither visible route/.test(H.wires[1].v.t), '  step 2 states the elimination');

console.log(`\n${fail ? fail + ' CHECK(S) FAILED' : 'ALL CHECKS PASSED'}  [analyse_ch7_wires]`);
process.exit(fail ? 1 : 0);
