/* Chapter 4's Prüfwaage, played exhaustively with the shipped code: every
   true order of the four rings × every sequence of pair choices (repeats
   included). Nothing may ever leave the player out of runs while the log
   still allows more than one order, and a repeated pair never costs a run. */
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'chapter4', 'chapter4.js'), 'utf8');
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a); if (a < 0 || b < 0) throw new Error('missing ' + from); return src.slice(a, b); };
const body = cut('  const pairKey =', '  function checkWeight()');
let fail = 0; const check = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fail++; };

const make = new Function('inst', 'setStatus', 'render', 'playSound', 'tone', 'ROMAN', 'WEIGH_MAX',
  body + '\nreturn { runBalance, ordersLeft, pairKey };');
const PAIRS = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
const PERMS = []; (function go(a, r) { if (!r.length) return PERMS.push(a); r.forEach((v, i) => go(a.concat(v), r.filter((_, j) => j !== i))); })([], [0,1,2,3]);

let games = 0, stuck = 0, charged = 0, maxRuns = 0;
for (const order of PERMS) {
  const rankOf = []; order.forEach((ring, i) => { rankOf[ring] = i; });
  // depth-first over every choice the player can make, up to 9 presses
  (function play(known, left, log, used, depth) {
    const inst = { weight: { rankOf, left, log: log.slice(), known: Object.assign({}, known), sel: [], tilt: 0 } };
    const api = make(inst, () => {}, () => {}, () => {}, () => {}, ['I','II','III','IV'], 5);
    const open = api.ordersLeft(inst.weight).length;
    if (open === 1 || depth === 9) { games++; if (open > 1) stuck++; return; }
    for (const [x, y] of PAIRS) {
      const st = { rankOf, left, log: log.slice(), known: Object.assign({}, known), sel: [x, y], tilt: 0 };
      const i2 = { weight: st }; const a2 = make(i2, () => {}, () => {}, () => {}, () => {}, ['I','II','III','IV'], 5);
      const repeat = known[a2.pairKey(x, y)] !== undefined;
      const before = st.left;
      if (!repeat && before <= 0) { stuck++; games++; return; }      // a new pair with no run left = stuck
      a2.runBalance();
      if (repeat && st.left !== before) charged++;
      if (repeat) continue;                                            // a repeat changes nothing; no need to recurse
      maxRuns = Math.max(maxRuns, used + 1);
      play(st.known, st.left, st.log, used + 1, depth + 1);
    }
  })({}, 5, [], 0, 0);
}
console.log(`\n[1] every game: ${games} paths over all 24 true orders`);
check(stuck === 0, `  never out of runs while the order is still open (${stuck} stuck)`);
check(charged === 0, `  a repeated pair never costs a run (${charged} charged)`);
check(maxRuns <= 6, `  at most six distinct weighings are ever needed (${maxRuns})`);
console.log(`\n${fail === 0 ? 'ALL CHECKS PASSED' : fail + ' CHECK(S) FAILED'}  [ch4_weight]`);
process.exit(fail ? 1 : 0);
