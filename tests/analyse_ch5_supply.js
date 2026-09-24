/* Chapter 5's Versorgungspult (14-G), lifted from the shipped source. The
   pressure reserve must say HOW MANY systems can run, never WHICH: with
   unequal costs the one set that emptied the reserve was the answer, so
   "crank, then spend it all" solved the station unread. */
'use strict';
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'chapter5', 'chapter5.js'), 'utf8');
const cut = (a, b) => { const i = SRC.indexOf(a), j = SRC.indexOf(b, i); if (i < 0 || j < 0) throw new Error('missing ' + a); return SRC.slice(i, j); };
const SYS_DEF = new Function(cut('  const SYS_DEF = [', '  function buildSupply') + '\nreturn SYS_DEF;')();
let fail = 0; const check = (c, m) => { console.log((c ? '  ok     ' : '  FAIL   ') + m); if (!c) fail++; };

const need = SYS_DEF.filter(d => d.need), budget = need.reduce((n, d) => n + d.cost, 0);
const rows = SYS_DEF.filter(d => d.status === 'stoerung');          // the ones with a [ VERSORGEN ] button
const sets = []; for (let m = 0; m < 1 << rows.length; m++) sets.push(rows.filter((_, i) => m >> i & 1));
const cost = s => s.reduce((n, d) => n + d.cost, 0);
const reachable = sets.filter(s => cost(s) <= budget);
const emptying = reachable.filter(s => cost(s) === budget);
const isAnswer = s => s.length === need.length && need.every(d => s.includes(d));

console.log('\n[14-G] the reserve counts, the schema decides');
check(budget === 6 && /const budget = SYS_DEF\.filter\(d => d\.need\)/.test(SRC), `  the budget is exactly what the needed systems take (${budget})`);
check(new Set(rows.map(d => d.cost)).size === 1, `  every pressure line costs the same (${rows.map(d => d.pre + ' ' + d.cost).join(', ')})`);
check(reachable.length === 11, `  ${reachable.length} supply sets fit the reserve`);
check(emptying.length > 1 && emptying.filter(isAnswer).length === 1, `  ${emptying.length} of them empty it, one is right — spending it all no longer names the answer`);
check(!reachable.some(s => s.length > need.length && need.every(d => s.includes(d))), '  no extra system ever fits next to the right two');

console.log('\n[14-I] the last terminal hint is right on both routes');
check(!/stabile Trasse/.test(SRC) && /bestätige nur, was ihr selbst gelaufen seid/.test(SRC), '  T-FLON14 no longer points side-passage walkers at the main line');

console.log(`\n${fail ? fail + ' CHECK(S) FAILED' : 'ALL CHECKS PASSED'}  [analyse_ch5_supply]`);
process.exit(fail ? 1 : 0);
