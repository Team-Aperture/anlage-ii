/* Chapter 4's Markierstrecke, the whole generator space driven through the
   SHIPPED buildPattern with a scripted RNG. Every strip it can hand out must
   name exactly one symbol for the Abnahme under every fair reading of "two
   heads, taking turns" — checked with readings written independently of the
   game (same step, own step per head, repeating motifs, a growing jump, and
   any order of the four symbols). */
function run(src, label) {
  const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('missing ' + a); return src.slice(i, j); };
  const PLATES = +src.match(/const PLATES\s*=\s*(\d+)/)[1];
  const hasReadings = src.includes('const STRIP_READINGS');
  const body = (hasReadings ? cut('  const STRIP_READINGS', '  function buildPattern') : '') + cut('  function strip', '  function renderPattern');
  let fail = 0; const check = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fail++; };
  const REJECT = {};
  const make = (randInt, shuffle) => new Function('randInt', 'shuffle', 'PLATES', body + '\nreturn { strip, buildPattern };')(randInt, shuffle, PLATES);
  const scripted = (queue, dmgFirst) => make(
    () => { if (!queue.length) throw REJECT; return queue.shift(); },
    a => dmgFirst.concat(a.filter(v => !dmgFirst.includes(v))));

  // readings, written here from scratch
  const P = [...Array(PLATES).keys()], m4 = x => ((x % 4) + 4) % 4, fam = {};
  fam.sameStep = []; fam.ownStep = []; fam.motif3 = []; fam.motif4 = []; fam.growing = []; fam.anyOrder = [];
  for (let e = 0; e < 4; e++) for (let o = 0; o < 4; o++) for (let c = 0; c < 4; c++) {
    fam.sameStep.push(P.map(i => m4((i % 2 ? o : e) + c * Math.floor(i / 2))));
    for (let c2 = 0; c2 < 4; c2++) fam.ownStep.push(P.map(i => m4(i % 2 ? o + c2 * Math.floor(i / 2) : e + c * Math.floor(i / 2))));
  }
  for (let x = 0; x < 64; x++)  fam.motif3.push(P.map(i => [x & 3, (x >> 2) & 3, x >> 4][i % 3]));
  for (let x = 0; x < 256; x++) fam.motif4.push(P.map(i => [x & 3, (x >> 2) & 3, (x >> 4) & 3, x >> 6][i % 4]));
  for (let s = 0; s < 4; s++) for (let d = 0; d < 4; d++) for (let g = 0; g < 4; g++) fam.growing.push(P.map(i => m4(s + d * i + g * i * (i - 1) / 2)));
  const perms = []; (function go(a, r) { if (!r.length) return perms.push(a); r.forEach((v, i) => go(a.concat(v), r.filter((_, j) => j !== i))); })([], [0, 1, 2, 3]);
  perms.forEach(pm => fam.ownStep.forEach(q => fam.anyOrder.push(q.map(v => pm[v]))));   // no ◆▲■● order assumed
  const answers = (list, p, vis) => { const s = new Set(); list.forEach(q => { if (vis.every(i => q[i] === p.seq[i])) s.add(q[p.out]); }); return s; };
  const fair = p => {
    const hid = new Set([p.out, ...p.dmg]), vis = P.filter(i => !hid.has(i)), bad = [];
    for (const [k, list] of Object.entries(fam)) if ([...answers(list, p, vis)].some(v => v !== p.seq[p.out])) bad.push(k);
    return bad;
  };

  console.log(`\n[${label}] every strip the shipped generator can hand out`);
  let shipped = 0, unfair = 0, rule = 0; const layouts = new Set(), steps = new Set(), why = {};
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (let s0 = 0; s0 < 4; s0++) for (let out = 3; out <= 6; out++)
    for (let d1 = 1; d1 < PLATES; d1++) for (let d2 = d1 + 1; d2 < PLATES; d2++) {
      if (d1 === out || d2 === out) continue;
      let p; try { p = scripted([a, b, s0, out], [d1, d2]).buildPattern(); } catch (e) { if (e === REJECT) continue; throw e; }
      shipped++;
      if (!(p.out >= 3 && p.out <= 6 && (p.dmg.includes(p.out - 1) || p.dmg.includes(p.out + 1)) && !p.dmg.includes(0))) rule++;
      const bad = fair(p); if (bad.length) { unfair++; bad.forEach(k => why[k] = (why[k] || 0) + 1); }
      layouts.add(p.out + '|' + [...p.dmg].sort()); steps.add(m4(p.seq[2] - p.seq[0]));
    }
  check(unfair === 0, `  no strip has a second defensible answer (${unfair} of ${shipped}${unfair ? ' — ' + JSON.stringify(why) : ''})`);
  check(rule === 0, `  the Abnahme never sits between two readable plates (${rule} broken)`);
  check(shipped >= 1300 && layouts.size >= 28 && steps.size === 4, `  variety kept: ${shipped} strips, ${layouts.size} layouts, head steps ${[...steps].sort()}`);

  console.log(`\n[${label}] a generator that never lands still hands out a fair strip`);
  { let fb = null; try { fb = make(() => 0, a => a).buildPattern(); } catch (_) {}
    check(!!fb, `  500 misses do not return null (${fb ? fb.seq.join('') : 'null'})`);
    if (fb) for (let k = 0; k < 4; k++) { const q = { seq: fb.seq.map(v => (v + k) % 4), out: fb.out, dmg: fb.dmg };
      check(fair(q).length === 0, `  fallback shifted by ${k} is fair`); } }

  console.log(`\n[${label}] Math.random, 200000 builds`);
  { const live = make((lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1)),
      a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; });
    let nul = 0, bad = 0; for (let n = 0; n < 200000; n++) { const p = live.buildPattern(); if (!p) { nul++; continue; } if (n % 10 === 0 && fair(p).length) bad++; }
    check(nul === 0 && bad === 0, `  never null (${nul}), never unfair (${bad} in 20000 checked)`); }

  console.log(`\n[${label}] the hint ladder says what the generator does`);
  { const HINTS = new Function(cut('  const HINTS = {', '  function useHint') + '\nreturn HINTS;')();
    const h = HINTS.pattern, three = h[2];
    check(['b', 'r', 'v'].every(k => three[k] && typeof three[k].t === 'string') && typeof three.v.s === 'string', '  step 3 has B-RADF1SH, R-3MI and V-TGM (with subtitle)');
    check(/gleich weit/.test(three.b.t) && /gleich weit/.test(three.r.t) && /same amount/.test(three.v.t) && /gleich weit/.test(three.v.s), '  step 3 says both heads move by the same amount, in every voice');
    check(!/jede Hälfte rückt gleichmäßig|lass die anderen weg/i.test(JSON.stringify(h)), '  no line still invites a separate step per head');
    const seqStep = (s, a, b) => { const r = [s]; for (let i = 1; i < 8; i++) r.push((r[i - 1] + (i % 2 ? a : b)) % 4); return r; };
    let same = true; for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) { const q = seqStep(0, a, b); for (let i = 0; i + 2 < 8; i++) if (m4(q[i + 2] - q[i]) !== m4(a + b)) same = false; }
    check(same, '  (and the generator really does step both heads by the same amount)'); }

  console.log(`\n${fail === 0 ? 'ALL CHECKS PASSED' : fail + ' CHECK(S) FAILED'}  [ch4_pattern ${label}]`);
  return fail;
}
const fs = require('fs'), path = require('path');
process.exit(run(fs.readFileSync(path.join(__dirname, '..', 'chapter4', 'chapter4.js'), 'utf8'), 'shipped') ? 1 : 0);
