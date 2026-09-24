/* Fernrelais (Kapitel 5, 14-E): lift the shipped generator and prove the
   information the player can SEE implies exactly the set the validator wants. */
'use strict';
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'chapter5/chapter5.js'), 'utf8');
function grab(name) { const i = SRC.indexOf('function ' + name); if (i < 0) throw new Error('not found: ' + name);
  let d = 0, s = false; for (let j = i; j < SRC.length; j++) { if (SRC[j] === '{') { d++; s = true; } else if (SRC[j] === '}') { d--; if (s && d === 0) return SRC.slice(i, j + 1); } } throw new Error('unbalanced ' + name); }
const line = re => (SRC.match(re) || [''])[0].trim();
const M = new Function(`${line(/^\s*const BUNDLE_ROLE = \[[^\]]*\];/m)} ${line(/^\s*const GAG_KEYS = \[[^\]]*\];/m)}
  ${grab('randInt')} ${grab('pick')} ${grab('shuffle')} ${grab('buildGallery')} ${grab('sameSet')} return { buildGallery, sameSet };`)();
let fail = 0; const bad = m => { if (fail++ < 6) console.log('   !! ' + m); };
const readable = g => { const fwd = Object.keys(g.role).find(L => g.role[L] === 'fwd'); const s = new Set(); for (let i = 1; i <= 5; i++) if (i !== g.gap) s.add(fwd + i); s.add(g.donor); return s; };
const N = 200000; let mismatch = 0, missing = 0, gapOn = 0, dup = 0;
for (let t = 0; t < N; t++) { const g = M.buildGallery(); const fwd = Object.keys(g.role).find(L => g.role[L] === 'fwd'); const wall = new Set(g.btns.map(b => b.id));
  if (!M.sameSet(readable(g), g.answer)) { mismatch++; bad('displayed ≠ validator'); }
  if ([...g.answer].some(id => !wall.has(id))) { missing++; bad('answer button not on the wall'); }
  if (wall.has(fwd + g.gap)) { gapOn++; bad('removed section still on the wall'); }
  if (wall.size !== g.btns.length) { dup++; bad('duplicate switch id'); } }
console.log(`\nFERNRELAIS — ${N} instances\n   displayed ≠ validator: ${mismatch}\n   answer missing from wall: ${missing}\n   removed section present: ${gapOn}\n   duplicate ids: ${dup}`);
let found = null, tries = 0; while (!found && tries++ < 4000000) { const g = M.buildGallery(); if (Object.keys(g.role).find(L => g.role[L] === 'fwd') === 'B' && g.gap === 4 && g.donor === 'D2') found = g; }
const ok = found && M.sameSet(new Set(['B1','B2','B3','D2','B5']), found.answer);
console.log(`\nREPORTED CASE (B / section 4 out / bridge D2): ${ok ? 'accepted' : 'NOT ACCEPTED'}`); if (!ok) fail++;
console.log(`\n${fail ? fail + ' FINDING(S)' : 'AUDIT CLEAN'}`); process.exit(fail ? 1 : 0);
