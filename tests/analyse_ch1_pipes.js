/* Chapter 1's two pipe repairs, lifted from the shipped source and proven
   both ways: by route (every simple path whose tiles can each be turned to
   open towards both neighbours) and by brute force (every rotation of every
   free tile). A repair is fair when exactly one route can ever win.

   GRUNDVERSORGUNG (repair 1): one route from the source to the terminal.
   DUALSIGNAL (repair 2): exactly one pair of routes that never touch — and
   the hint that one signal "has fewer options" must be true of the board.

   The first-run boards are pinned to their known numbers, so NORMAL cannot
   drift; the VERSCHÄRFT boards (NG+) must be single-route, a little larger,
   and must not hand out more winning states than the originals. */
'use strict';
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'chapter1/chapter1.js'), 'utf8');
const arr = name => { const m = SRC.match(new RegExp('const ' + name + '\\s*=\\s*(\\[[\\s\\S]*?\\]);')); if (!m) throw new Error('missing ' + name); return JSON.parse(m[1].replace(/\s+/g, '').replace(/,\]/g, ']')); };
// (terminals share a line: const P2_SRC_A = [0, 0], P2_DST_A = '3,1';)
const str = name => { const m = SRC.match(new RegExp('\\b' + name + '\\s*=\\s*\'([^\']+)\'')); if (!m) throw new Error('missing ' + name); return m[1]; };
const pair = name => { const m = SRC.match(new RegExp('\\b' + name + '\\s*=\\s*(\\[\\d+,\\s*\\d+\\])')); if (!m) throw new Error('missing ' + name); return JSON.parse(m[1]); };

const CONN = { 0: [[], [], [], []], 1: [['N','S'],['E','W'],['N','S'],['E','W']], 2: [['N','E'],['E','S'],['S','W'],['W','N']],
  3: [['N','E','S'],['E','S','W'],['S','W','N'],['W','N','E']], 4: [['N','E','S','W'],['N','E','S','W'],['N','E','S','W'],['N','E','S','W']] };
const DIR = { N: [-1, 0], S: [1, 0], E: [0, 1], W: [0, -1] }, OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
const key = (r, c) => `${r},${c}`;

function board(types, base, fixed) {
  const R = types.length, C = types[0].length;
  const free = []; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (types[r][c] && !fixed[r][c]) free.push([r, c]);
  const rotsOf = (r, c) => (types[r][c] && !fixed[r][c]) ? [0, 1, 2, 3] : [base[r][c]];
  const can = (r, c, need) => rotsOf(r, c).some(k => need.every(d => CONN[types[r][c]][k].includes(d)));
  const inside = (r, c) => r >= 0 && c >= 0 && r < R && c < C;
  // every simple path src → dst that the tiles can realise
  function routes(src, dst, avoid = new Set()) {
    const out = [];
    (function dfs([r, c], came, p) {
      for (const d of 'NESW') {
        if (!can(r, c, came ? [d, came] : [d])) continue;
        const nr = r + DIR[d][0], nc = c + DIR[d][1], k = key(nr, nc);
        if (!inside(nr, nc) || p.includes(k) || avoid.has(k) || !can(nr, nc, [OPP[d]])) continue;
        if (k === dst) { out.push(p.concat(k)); continue; }
        dfs([nr, nc], OPP[d], p.concat(k));
      }
    })(src, null, [key(...src)]);
    return out;
  }
  function reach(rot, sr, sc) {
    const seen = new Set([key(sr, sc)]), q = [[sr, sc]];
    while (q.length) { const [r, c] = q.pop();
      for (const d of CONN[types[r][c]][rot[r][c]]) { const nr = r + DIR[d][0], nc = c + DIR[d][1], k = key(nr, nc);
        if (inside(nr, nc) && !seen.has(k) && CONN[types[nr][nc]][rot[nr][nc]].includes(OPP[d])) { seen.add(k); q.push([nr, nc]); } } }
    return seen;
  }
  // the one simple path inside a connected state (null if there are several)
  function pathIn(rot, s, t) {
    const out = [];
    (function dfs([r, c], p) {
      if (out.length > 1) return;
      if (key(r, c) === t) { out.push(p); return; }
      for (const d of CONN[types[r][c]][rot[r][c]]) { const nr = r + DIR[d][0], nc = c + DIR[d][1], k = key(nr, nc);
        if (inside(nr, nc) && !p.includes(k) && CONN[types[nr][nc]][rot[nr][nc]].includes(OPP[d])) dfs([nr, nc], p.concat(k)); }
    })(s, [key(...s)]);
    return out.length === 1 ? out[0].join(' ') : null;
  }
  function* states() {
    const rot = base.map(row => row.slice()), n = free.length;
    for (let m = 0; m < 4 ** n; m++) { let x = m; for (const [r, c] of free) { rot[r][c] = x & 3; x >>= 2; } yield rot; }
  }
  return { R, C, free, routes, reach, pathIn, states, types, base, fixed };
}

let fail = 0; const ok = m => console.log('  ok   ' + m), bad = m => { console.log('  FAIL ' + m); fail++; };
const draw = (B, marks = new Set()) => B.types.map((row, r) => '     ' + row.map((t, c) => {
  const g = t === 0 ? '·' : t === 4 ? '┼' : t === 1 ? (B.base[r][c] % 2 ? '─' : '│') : t === 2 ? '└┌┐┘'[B.base[r][c]] : '├┬┤┴'[B.base[r][c]];
  return (marks.has(key(r, c)) ? '•' : ' ') + g + (B.fixed[r][c] && t ? '*' : ' ');
}).join(' ')).join('\n');

function repair1(label, types, base, fixed, src, dst, expect) {
  const B = board(types, base, fixed);
  const rs = B.routes(src, dst);
  let total = 0, win = 0, offRoute = 0;
  const route = rs[0] || [];
  for (const rot of B.states()) {
    total++;
    if (!B.reach(rot, ...src).has(dst)) continue;
    win++;
    if (B.pathIn(rot, src, dst) !== route.join(' ')) offRoute++;
  }
  const base_ok = B.reach(base, ...src).has(dst);
  console.log(`\n${label}: ${B.free.length} free tiles, route through ${route.length - 2} of them`);
  console.log(draw(B, new Set(route)));
  rs.length === 1 ? ok('exactly one route can ever connect source and terminal') : bad(`${rs.length} routes can connect: ${rs.map(x => x.join(' ')).join(' | ')}`);
  offRoute ? bad(`${offRoute} winning state(s) connect some other way`) : ok(`every winning state (${win} of ${total}) runs along that route`);
  base_ok ? ok('the base orientation the scramble offsets from is itself a solution') : bad('the base orientation does not connect');
  // minRotations() counts clicks over the tiles the base lights: that must be the route and nothing else
  const lit = [...B.reach(base, ...src)].sort().join(' ');
  lit === route.slice().sort().join(' ') ? ok('in the base orientation only the route is lit (the clean-solve count covers exactly it)') : bad(`the base lights more than the route: ${lit}`);
  const tOnRoute = route.slice(1, -1).filter(k => { const [r, c] = k.split(',').map(Number); return types[r][c] === 3; });
  tOnRoute.length ? bad('a T-piece on the route: the clean-solve count (minRotations) assumes exact orientations') : ok('only straights and corners on the route: the clean-solve count stays exact');
  if (expect) {
    (B.free.length === expect.free && win === expect.win && route.length - 2 === expect.len) ? ok(`unchanged: ${expect.free} free tiles, ${expect.win} winning states, route of ${expect.len}`)
      : bad(`changed: ${B.free.length} free, ${win} winning, route ${route.length - 2} (was ${expect.free}/${expect.win}/${expect.len})`);
  }
  return { free: B.free.length, win, total, len: route.length - 2 };
}

function repair2(label, types, base, fixed, A, DA, Bs, DB, expect) {
  const B = board(types, base, fixed);
  let total = 0, win = 0, bridged = 0; const pairs = new Set(); let multi = 0;
  for (const rot of B.states()) {
    total++;
    const a = B.reach(rot, ...A), b = B.reach(rot, ...Bs);
    const br = [...a].some(k => b.has(k)) || a.has(DB) || b.has(DA);
    if (br) { bridged++; continue; }
    if (!(a.has(DA) && b.has(DB))) continue;
    win++;
    const pa = B.pathIn(rot, A, DA), pb = B.pathIn(rot, Bs, DB);
    if (!pa || !pb) multi++; else pairs.add(pa + ' / ' + pb);
  }
  const ra = B.routes(A, DA, new Set([key(...Bs), DB])), rb = B.routes(Bs, DB, new Set([key(...A), DA]));
  const baseA = B.reach(base, ...A), baseB = B.reach(base, ...Bs);
  const baseWin = baseA.has(DA) && baseB.has(DB) && ![...baseA].some(k => baseB.has(k));
  const onRoute = new Set([...pairs].flatMap(p => p.split(/ \/ | /)));
  console.log(`\n${label}: ${B.free.length} free tiles`);
  console.log(draw(B, onRoute));
  (pairs.size === 1 && !multi) ? ok(`exactly one pair of routes wins (${win} winning state(s) of ${total})`) : bad(`${pairs.size} route pairs win${multi ? `, ${multi} state(s) with a loop` : ''}`);
  bridged ? ok(`${bridged} states bridge the signals — the rule matters`) : bad('no state ever bridges: the "must not touch" rule is decoration');
  baseWin ? ok('the base orientation is a clean solution') : bad('the base orientation is not a solution');
  console.log(`       alone, R-3MI's signal has ${ra.length} route(s), V-TGM's has ${rb.length}`);
  if (expect) {
    (B.free.length === expect.free && win === expect.win && bridged === expect.bridged) ? ok(`unchanged: ${expect.free} free tiles, ${expect.win} winning, ${expect.bridged} bridged`)
      : bad(`changed: ${B.free.length} free, ${win} winning, ${bridged} bridged (was ${expect.free}/${expect.win}/${expect.bridged})`);
  }
  return { free: B.free.length, win, total, bridged, ra: ra.length, rb: rb.length };
}

console.log('\nFIRST RUN / NORMAL');
const n1 = repair1('GRUNDVERSORGUNG', arr('P1_TYPES'), arr('P1_BASE_ROT'), arr('P1_FIXED'), pair('P1_SRC'), str('P1_DST'), { free: 8, win: 256, len: 5 });
const n2 = repair2('DUALSIGNAL', arr('P2_TYPES'), arr('P2_BASE_ROT'), arr('P2_FIXED'), pair('P2_SRC_A'), str('P2_DST_A'), pair('P2_SRC_B'), str('P2_DST_B'), { free: 6, win: 12, bridged: 256 });

console.log('\nVERSCHÄRFT (NG+)');
const h1 = repair1('GRUNDVERSORGUNG', arr('P1_HARD_TYPES'), arr('P1_HARD_BASE_ROT'), arr('P1_HARD_FIXED'), pair('P1_HARD_SRC'), str('P1_HARD_DST'));
const h2 = repair2('DUALSIGNAL', arr('P2_HARD_TYPES'), arr('P2_HARD_BASE_ROT'), arr('P2_HARD_FIXED'), pair('P2_HARD_SRC_A'), str('P2_HARD_DST_A'), pair('P2_HARD_SRC_B'), str('P2_HARD_DST_B'));
console.log('\n  the step up');
const more = (a, b) => b.free - a.free;
(more(n1, h1) >= 1 && more(n1, h1) <= 2) ? ok(`repair 1: ${h1.free} free tiles (${n1.free} before), route ${h1.len} (${n1.len} before)`) : bad(`repair 1 should add 1–2 free tiles, adds ${more(n1, h1)}`);
h1.len > n1.len ? ok('repair 1: the route is longer') : bad('repair 1: the route is not longer');
(h1.win / h1.total) < (n1.win / n1.total) ? ok(`repair 1: blind turning wins less often (${(100 * h1.win / h1.total).toFixed(3)} % vs ${(100 * n1.win / n1.total).toFixed(3)} %)`) : bad('repair 1: blind turning wins as often as before');
(more(n2, h2) >= 1 && more(n2, h2) <= 2) ? ok(`repair 2: ${h2.free} free tiles (${n2.free} before)`) : bad(`repair 2 should add 1–2 free tiles, adds ${more(n2, h2)}`);
(h2.win / h2.total) < (n2.win / n2.total) ? ok(`repair 2: blind turning wins less often (${(100 * h2.win / h2.total).toFixed(3)} % vs ${(100 * n2.win / n2.total).toFixed(3)} %)`) : bad('repair 2: blind turning wins as often as before');
((h2.ra === 1) !== (h2.rb === 1)) ? ok('repair 2: one signal alone has a single route, the other has a choice — "one has fewer options" is true') : bad(`repair 2: the fewer-options hint is not true of the board (${h2.ra} vs ${h2.rb})`);
// the VERSCHÄRFT ladder describes this board, so it must stay true of it
console.log('\n  the VERSCHÄRFT hints match the board');
const ladder = SRC.slice(SRC.indexOf('if (HARD) HINTS.p2'), SRC.indexOf('// A ladder is walked once'));
const tight = h2.rb === 1 ? 'V-TGMs Signal hat genau einen' : 'R-3MIs Signal hat genau einen';
ladder.includes(tight) ? ok(`step 3 names the tight signal ("${tight} …")`) : bad(`step 3 must name the tight signal: "${tight}"`);
const [dA, dB] = [str('P2_HARD_DST_A'), str('P2_HARD_DST_B')].map(k => k.split(',').map(Number));
(dA[0] === 3 && dB[0] === 3 && dA[1] <= 1 && dB[1] <= 1 && /beide Ziele links unten/.test(ladder)) ? ok('step 1: both terminals really are bottom left') : bad('step 1 says both terminals are bottom left — the board disagrees');
/Oder ein Test|LEITUNGSPLAN ANGEPASST/.test(SRC) ? ok('the adapted-routing line is in the chapter') : bad('no line tells the tester the routing was changed');
console.log(`\n${fail ? fail + ' FINDING(S)' : 'AUDIT CLEAN'}`); process.exit(fail ? 1 : 0);
