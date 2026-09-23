/* DIE ZEHNTE REKONSTRUKTION (Kapitel 8): lift the shipped generator and prove
   every instance has exactly one solution, every archive note is load-bearing,
   and a solved board reads back the identity calibration order — which is
   what lets the save DERIVE the coordinates instead of storing them. */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const file = fs.readFileSync(path.join(ROOT, 'chapter8/chapter8.js'), 'utf8');
const start = file.indexOf('  const CH         = GameEngine.chapter;');
const end = file.indexOf('  // CHAPTER ART — an enormous workshop');
if (start < 0 || end < 0) { console.error('could not locate the chapter block'); process.exit(1); }
const src = file.slice(start, end);
const engineSrc = fs.readFileSync(path.join(ROOT, 'js/engine.js'), 'utf8');
const calSrc = engineSrc.match(/const calibration = \(\(\)[\s\S]*?\n  \}\)\(\);/)[0]
  .replace(/state\.(get|set)\([^)]*\)/g, '({})').replace('const calibration = (() => {', '(function(){')
  .replace(/\n  \}\)\(\);$/, '\nreturn { reconstructMain, commit, has, hasAllMain };})()');
const calibration = eval(calSrc);
const noop = () => {};
const stubEngine = { chapter: {}, state: { get: () => null, set: noop, setFlag: noop, hasFlag: () => false, isChapterComplete: () => false },
  achievements: { unlock: noop }, signals: { ALL: [], isFound: () => false }, dialogue: { load: noop, advance: noop }, audio: {}, fx: {}, props: { register: noop }, progress: { require: () => true }, calibration };
const stubDoc = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ style: {}, classList: { add: noop, remove: noop } }), addEventListener: noop };
const M = new Function('GameEngine', 'document', 'window', src + `
  return { generate, enumerate, holds, noteText, N, isSolved, violations, traceErrors, kalOrder, reconstructZiel,
           setInstance: (p, b) => { P = p; B = b; } };`)(stubEngine, stubDoc, { matchMedia: () => ({ matches: false }), addEventListener: noop });

let fail = 0; const ok = m => console.log('  ok   ' + m), bad = m => { console.log('  FAIL ' + m); fail++; };
const N = 2000;
console.log(`\n[1] ${N} generated instances`);
let notUnique = 0, redundant = 0, nonIdentity = 0, unsolvedSelf = 0;
for (let t = 0; t < N; t++) {
  const inst = M.generate();
  // enumerate() reports { found, sols }; found is capped at the limit
  if (M.enumerate(inst.frags, inst.notes, 2).found !== 1) notUnique++;
  // every note necessary: drop one and the puzzle must open up
  for (let k = 0; k < inst.notes.length; k++) {
    const rest = inst.notes.filter((_, i) => i !== k);
    if (M.enumerate(inst.frags, rest, 2).found < 2) { redundant++; break; }
  }
  M.setInstance(inst, { board: inst.sol.slice(), rot: inst.sol.map(() => 0), sel: null });
  if (!M.isSolved()) unsolvedSelf++;
  const order = M.kalOrder();
  if (!(order.length === 8 && order.every((v, i) => v === i))) nonIdentity++;
}
notUnique ? bad(`${notUnique} instance(s) without a unique solution`) : ok('every instance has exactly one solution');
redundant ? bad(`${redundant} instance(s) with a redundant archive note`) : ok('every archive note is load-bearing');
unsolvedSelf ? bad(`${unsolvedSelf} solution(s) the validator itself rejects`) : ok('the validator accepts every generated solution');
nonIdentity ? bad(`${nonIdentity} solved board(s) with a non-identity calibration order`) : ok('a solved board always reads back as 0..7');

console.log('\n[2] coordinates');
const viaBoard = M.reconstructZiel([0,1,2,3,4,5,6,7]), viaDefault = calibration.reconstructMain();
viaBoard === viaDefault ? ok(`deriving without a board gives the same string: ${viaDefault}`) : bad(`derived (${viaDefault}) ≠ board (${viaBoard})`);
M.reconstructZiel([1,0,2,3,4,5,6,7]) !== viaBoard ? ok('a wrong reading order does not produce the target data') : bad('order does not matter');
console.log(`\n${fail ? fail + ' FINDING(S)' : 'AUDIT CLEAN'}`); process.exit(fail ? 1 : 0);
