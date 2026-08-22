/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 08 — ARCHIVSEKTOR
 *
 * Guest unit: AGN-H3R, Rekonstruktionsarchivar. He does not merely store
 *   records — he rebuilds damaged ones out of incomplete fragments. Polite,
 *   patient, mildly dry, and already at work when the player arrives.
 *
 * Main puzzle: DIE ZEHNTE REKONSTRUKTION. The system finds 36 fragments,
 *   the archive resolves the 24 trivial joins by itself, and twelve
 *   meaningful fragment groups remain for a 3x4 board. Placement is decided
 *   by archive metadata (filing order + ARCHIVNOTIZEN), orientation by the
 *   calibration trace running through the fragments. Every instance is
 *   generated at runtime and verified to have exactly one solution with no
 *   redundant note, so the answer is never in this file.
 *
 * The finished mosaic is what puts the eight calibration fragments in order,
 *   and that ordering is what rebuilds the target data.
 *
 * Difficulty target: 10 — synthesis, not tedium.
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter8 = (() => {
  'use strict';

  const CH         = GameEngine.chapter;
  const CHAPTER_ID = 'ch8';
  const SAVE_KEY   = 'ch8_progress';
  const HINT_MAX   = 3;

  // ═══════════════════════════════════════════════════════════════
  // ZIELDATEN
  // The target data is held as eight calibration fragments. Each entry is
  // one piece of the string, stored shifted; only the order the archive
  // reconstructs puts them back together.
  //
  // PLATZHALTER — vor Veröffentlichung ersetzen. Anleitung: COORDS.md
  // ═══════════════════════════════════════════════════════════════
  const KAL = [
    '0061000f001f', '0006008600160006', '000d0013000d', '00740074006400f3',
    '006b000e006b', '00620062006200e2', '007900690069', '004e005000500050',
  ];
  function kalPiece(j) {
    const t = KAL[j] || '';
    let s = '';
    for (let p = 0; p < t.length; p += 4) s += String.fromCodePoint(parseInt(t.slice(p, p + 4), 16) ^ (0x2f + j * 7));
    return s;
  }
  function reconstructZiel(order) { return order.map(j => kalPiece(j)).join(''); }

  // ═══════════════════════════════════════════════════════════════
  // BOARD GEOMETRY
  // ═══════════════════════════════════════════════════════════════
  const ROWS = 4, COLS = 3, N = ROWS * COLS;
  const CORE_SLOTS = [4, 7];                 // middle column, middle levels
  const rowOf = s => Math.floor(s / COLS);
  const colOf = s => s % COLS;
  const DIRS  = [[-1, 0], [0, 1], [1, 0], [0, -1]];   // N E S W
  function step(s, d) {
    const r = rowOf(s) + DIRS[d][0], c = colOf(s) + DIRS[d][1];
    return (r < 0 || r >= ROWS || c < 0 || c >= COLS) ? -1 : r * COLS + c;
  }
  const NB = Array.from({ length: N }, (_, s) => [0, 1, 2, 3].map(d => step(s, d)).filter(x => x >= 0));

  // ═══════════════════════════════════════════════════════════════
  // DATA CLASSES — one motif per restored sector, plus the core
  // ═══════════════════════════════════════════════════════════════
  const KLASSE = {
    WARTUNG:     { sec:'S-01', short:'WRT', nom:'WARTUNGSPROTOKOLLE',   dat:'WARTUNGSPROTOKOLLEN',   pl:true,
                   herkunft:'Rohrleitung, Prüfsignatur am unteren Rand.' },
    VEGETATION:  { sec:'S-02', short:'VEG', nom:'VEGETATIONSPROTOKOLLE', dat:'VEGETATIONSPROTOKOLLEN', pl:true,
                   herkunft:'Wuchsprotokoll. Der Frost endet mitten im Blatt.' },
    BEOBACHTUNG: { sec:'S-03', short:'BEO', nom:'BEOBACHTUNGSDATEN',    dat:'BEOBACHTUNGSDATEN',     pl:true,
                   herkunft:'Blendenring mit angeschnittener Sichtlinie.' },
    MECHANIK:    { sec:'S-04', short:'MEC', nom:'MECHANIKAUFNAHMEN',    dat:'MECHANIKAUFNAHMEN',     pl:true,
                   herkunft:'Sperrklinke, halb aufgezeichnet, halb abgerissen.' },
    ROUTE:       { sec:'S-05', short:'RTE', nom:'ROUTENDATEN',          dat:'ROUTENDATEN',           pl:true,
                   herkunft:'Streckenband mit Haltepunkten ohne Namen.' },
    VERSUCH:     { sec:'S-06', short:'VSU', nom:'VERSUCHSDATEN',        dat:'VERSUCHSDATEN',         pl:true,
                   herkunft:'Eingang links, Ausgang rechts. Dazwischen nichts.' },
    REFERENZ:    { sec:'S-07', short:'REF', nom:'REFERENZZUSTÄNDE',     dat:'REFERENZZUSTÄNDEN',     pl:true,
                   herkunft:'Bezugsmarke. Daneben eine durchgestrichene Meldung.' },
    KERN:        { sec:'S-00', short:'KRN', nom:'KERNDATEN',            dat:'KERNDATEN',             pl:true,
                   herkunft:'Ringe um eine Mitte. Alles läuft hier zusammen.' },
  };
  const MULT = { WARTUNG:2, VEGETATION:1, BEOBACHTUNG:2, MECHANIK:1, ROUTE:2, VERSUCH:2, REFERENZ:1, KERN:1 };
  const CLASSES = Object.keys(KLASSE);
  const SINGLE  = CLASSES.filter(c => MULT[c] === 1);
  const FAMS    = ['A', 'B', 'C'];
  const FAMMETA = { A:{ nom:'PRÜFSUMME A', dat:'PRÜFSUMME A', pl:false },
                    B:{ nom:'PRÜFSUMME B', dat:'PRÜFSUMME B', pl:false },
                    C:{ nom:'PRÜFSUMME C', dat:'PRÜFSUMME C', pl:false } };
  const metaOf = tok => tok.k === 'cls' ? KLASSE[tok.v] : FAMMETA[tok.v];

  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const S = {
    act: 1,                 // 1 arrival · 2 explore · 3 reconstruction · 4 done
    presorted: false,
    refused: false,
    started: false,
    solved: false,
    ended: false,
    hintsUsed: 0,
    seen: {},
    talkSeen: {},
    hints: { step: 0 },
    coach: 0,
    boardIntroSeen: false,
    prettyWrongSeen: false,
    placedSeen: false,
    ziel: '',
  };

  // The generated instance. board[slot] = fragment id · rot[slot] = 0..3
  let P = null;   // { frags, sol, notes, masks, kalOrder }
  let B = null;   // { board, rot, sel }

  let openSheet = null;
  let timers = [];
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function later(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════
  function el(id) { return document.getElementById(id); }
  function say(lines, after) { GameEngine.dialogue.load(lines, after); }
  function tone(o) { try { GameEngine.audio.tone(o); } catch (_) {} }
  function click() { try { GameEngine.audio.click(); } catch (_) {} }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = rnd(i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c])); }
  function bump(k) { S.seen[k] = (S.seen[k] || 0) + 1; return S.seen[k]; }
  function reduceMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
  }
  function signalCount() {
    try { return GameEngine.signals.ALL.filter(s => GameEngine.signals.isFound(s.id)).length; } catch (_) { return 0; }
  }
  function signalTotal() { try { return GameEngine.signals.ALL.length; } catch (_) { return 5; } }

  function dialogueBusy() {
    const c = document.querySelector('.dlg-container');
    return !!(c && c.classList.contains('visible'));
  }
  function guarded(fn) {
    return (...a) => {
      if (dialogueBusy()) { try { GameEngine.dialogue.advance(); } catch (_) {} return; }
      return fn(...a);
    };
  }
  function addHotspot(cfg) { return CH.addHotspot({ ...cfg, fn: guarded(cfg.fn) }); }

  // ═══════════════════════════════════════════════════════════════
  // CONSTRAINTS
  // ═══════════════════════════════════════════════════════════════
  const tokOf = (f, t) => t.k === 'cls' ? f.cls : f.fam;
  function slotsOf(board, frags, t) {
    const o = [];
    for (let s = 0; s < N; s++) if (tokOf(frags[board[s]], t) === t.v) o.push(s);
    return o;
  }
  function holds(k, board, frags) {
    const A = slotsOf(board, frags, k.a);
    if (!A.length) return false;
    switch (k.t) {
      case 'above': { const Bs = slotsOf(board, frags, k.b);
        return Bs.length > 0 && Math.max(...A.map(rowOf)) < Math.min(...Bs.map(rowOf)); }
      case 'notAdj': { const Bs = new Set(slotsOf(board, frags, k.b));
        return Bs.size > 0 && A.every(s => NB[s].every(n => !Bs.has(n))); }
      case 'adj': { const Bs = new Set(slotsOf(board, frags, k.b));
        return Bs.size > 0 && A.every(s => NB[s].some(n => Bs.has(n))); }
      case 'noMid': return A.every(s => colOf(s) !== 1);
      case 'onMid': return A.every(s => colOf(s) === 1);
      case 'colDiff': { const Bs = slotsOf(board, frags, k.b); if (!Bs.length) return false;
        const ca = new Set(A.map(colOf)); return Bs.every(s => !ca.has(colOf(s))); }
      case 'sameRow': { const Bs = slotsOf(board, frags, k.b); if (!Bs.length) return false;
        const ra = new Set(A.map(rowOf)), rb = new Set(Bs.map(rowOf));
        return Bs.every(s => ra.has(rowOf(s))) && A.every(s => rb.has(rowOf(s))); }
      case 'band':   return A.every(s => rowOf(s) > 0 && rowOf(s) < ROWS - 1);
      case 'topRow': return A.every(s => rowOf(s) === 0);
      case 'botRow': return A.every(s => rowOf(s) === ROWS - 1);
    }
    return false;
  }
  const UNARY = ['noMid', 'onMid', 'band', 'topRow', 'botRow'];

  function noteText(k) {
    const a = metaOf(k.a), b = k.b ? metaOf(k.b) : null;
    const was = a.pl ? 'WURDEN' : 'WURDE';
    const lag = a.pl ? 'LAGEN'  : 'LAG';
    switch (k.t) {
      case 'above':   return `${a.nom} ${was} OBERHALB DER ${b.nom} ABGELEGT.`;
      case 'notAdj':  return `${a.nom} ${lag} NIE DIREKT NEBEN ${b.dat}.`;
      case 'adj':     return `JEDES FRAGMENT AUS ${a.dat} GRENZT AN ${b.dat}.`;
      case 'noMid':   return `${a.nom} ${lag} NIE IN DER MITTELSPALTE.`;
      case 'onMid':   return `${a.nom} ${lag} AUSSCHLIESSLICH IN DER MITTELSPALTE.`;
      case 'colDiff': return `${a.nom} UND ${b.nom} TEILTEN NIE EINE SPALTE.`;
      case 'sameRow': return `${a.nom} UND ${b.nom} LAGEN IN DERSELBEN EBENE.`;
      case 'band':    return `${a.nom} ${lag} WEDER IN DER OBERSTEN NOCH IN DER UNTERSTEN EBENE.`;
      case 'topRow':  return `${a.nom} ${lag} IN DER OBERSTEN EBENE.`;
      case 'botRow':  return `${a.nom} ${lag} IN DER UNTERSTEN EBENE.`;
    }
    return '';
  }

  const ORDNUNG = [
    'JEDE EBENE ENTHÄLT JEDE PRÜFSUMMENFAMILIE GENAU EINMAL.',
    'INNERHALB EINER EBENE STEIGEN DIE ZEITMARKEN NACH RECHTS.',
    'DIE KERNDATEN LIEGEN IN DER MITTELSPALTE — WEDER GANZ OBEN NOCH GANZ UNTEN.',
  ];

  // ═══════════════════════════════════════════════════════════════
  // GENERATOR — fragments, filing order, notes, calibration trace
  // ═══════════════════════════════════════════════════════════════
  function makeFragments() {
    const pool = [];
    CLASSES.forEach(c => { for (let i = 0; i < MULT[c]; i++) pool.push(c); });
    const cls = shuffle(pool);
    const fam = shuffle([...FAMS, ...FAMS, ...FAMS, ...FAMS]);
    const vals = new Set(); while (vals.size < N) vals.add(4 + rnd(56));
    const ts = shuffle([...vals]);
    return cls.map((c, i) => ({ id: i, cls: c, fam: fam[i], ts: ts[i], kal: -1 }));
  }
  function arrange(frags) {
    const byFam = {}; FAMS.forEach(f => byFam[f] = shuffle(frags.filter(x => x.fam === f)));
    const board = new Array(N);
    for (let r = 0; r < ROWS; r++) {
      const row = FAMS.map(f => byFam[f][r]).sort((x, y) => x.ts - y.ts);
      for (let c = 0; c < COLS; c++) board[r * COLS + c] = row[c].id;
    }
    return board;
  }
  const coreInside = (board, frags) => CORE_SLOTS.some(s => frags[board[s]].cls === 'KERN');

  function candidates(board, frags) {
    const T = [...CLASSES.map(v => ({ k:'cls', v })), ...FAMS.map(v => ({ k:'fam', v }))];
    const out = [];
    T.forEach(a => {
      UNARY.forEach(t => { const k = { t, a }; if (holds(k, board, frags)) out.push(k); });
      T.forEach(b => {
        if (a.k === b.k && a.v === b.v) return;
        ['above', 'notAdj', 'adj', 'colDiff'].forEach(t => {
          const k = { t, a, b }; if (holds(k, board, frags)) out.push(k);
        });
        if (a.k === 'cls' && b.k === 'cls' && SINGLE.includes(a.v) && SINGLE.includes(b.v) && a.v < b.v) {
          const k = { t:'sameRow', a, b }; if (holds(k, board, frags)) out.push(k);
        }
      });
    });
    return out;
  }

  // Enumerate every filing order the archive rules allow, stopping at `limit`.
  function enumerate(frags, notes, limit) {
    const byFam = {}; FAMS.forEach(f => byFam[f] = frags.filter(x => x.fam === f));
    const used = { A:[0,0,0,0], B:[0,0,0,0], C:[0,0,0,0] };
    const board = new Array(N);
    let found = 0; const sols = [];

    function prefixOk(r) {
      const lim = (r + 1) * COLS;
      for (let s = 0; s < lim; s++) if (frags[board[s]].cls === 'KERN' && CORE_SLOTS.indexOf(s) === -1) return false;
      for (const k of notes) {
        switch (k.t) {
          case 'noMid': case 'onMid': case 'band': case 'topRow': case 'botRow':
            for (let s = 0; s < lim; s++) {
              if (tokOf(frags[board[s]], k.a) !== k.a.v) continue;
              const rr = rowOf(s), cc = colOf(s);
              if (k.t === 'noMid'  && cc === 1) return false;
              if (k.t === 'onMid'  && cc !== 1) return false;
              if (k.t === 'band'   && rr === 0) return false;
              if (k.t === 'topRow' && rr !== 0) return false;
              if (k.t === 'botRow' && rr !== ROWS - 1) return false;
            }
            break;
          case 'notAdj':
            for (let s = 0; s < lim; s++) {
              if (tokOf(frags[board[s]], k.a) !== k.a.v) continue;
              for (const n of NB[s]) if (n < lim && tokOf(frags[board[n]], k.b) === k.b.v) return false;
            }
            break;
          case 'above':
            for (let s = 0; s < lim; s++) {
              if (tokOf(frags[board[s]], k.b) !== k.b.v) continue;
              for (let t2 = 0; t2 < lim; t2++)
                if (tokOf(frags[board[t2]], k.a) === k.a.v && rowOf(t2) >= rowOf(s)) return false;
            }
            break;
          case 'colDiff':
            for (let s = 0; s < lim; s++) {
              if (tokOf(frags[board[s]], k.a) !== k.a.v) continue;
              for (let t2 = 0; t2 < lim; t2++)
                if (tokOf(frags[board[t2]], k.b) === k.b.v && colOf(t2) === colOf(s)) return false;
            }
            break;
        }
      }
      return true;
    }
    function full() {
      if (!coreInside(board, frags)) return false;
      for (const k of notes) if (!holds(k, board, frags)) return false;
      return true;
    }
    function dfs(r) {
      if (found >= limit) return;
      if (r === ROWS) { if (full()) { found++; sols.push(board.slice()); } return; }
      for (let ia = 0; ia < 4; ia++) { if (used.A[ia]) continue;
        for (let ib = 0; ib < 4; ib++) { if (used.B[ib]) continue;
          for (let ic = 0; ic < 4; ic++) { if (used.C[ic]) continue;
            const row = [byFam.A[ia], byFam.B[ib], byFam.C[ic]].sort((x, y) => x.ts - y.ts);
            for (let c = 0; c < COLS; c++) board[r * COLS + c] = row[c].id;
            used.A[ia] = used.B[ib] = used.C[ic] = 1;
            if (prefixOk(r)) dfs(r + 1);
            used.A[ia] = used.B[ib] = used.C[ic] = 0;
            if (found >= limit) return;
          } } }
    }
    dfs(0);
    return { found, sols };
  }

  // ─── the calibration trace ────────────────────────────────────
  const ALL_EDGES = (() => {
    const e = [];
    for (let s = 0; s < N; s++) for (const d of [1, 2]) { const n = step(s, d); if (n >= 0) e.push([s, n, d]); }
    return e;
  })();
  function randTree() {
    const es = shuffle(ALL_EDGES), par = [...Array(N).keys()];
    const find = x => par[x] === x ? x : (par[x] = find(par[x]));
    const t = [];
    for (const [a, b, d] of es) { const ra = find(a), rb = find(b); if (ra !== rb) { par[ra] = rb; t.push([a, b, d]); } }
    return t;
  }
  function masksOf(tree) {
    const m = new Array(N).fill(0);
    for (const [a, b, d] of tree) { m[a] |= 1 << d; m[b] |= 1 << ((d + 2) % 4); }
    return m;
  }
  // Only stub sets with no rotational symmetry: one stub, a corner, or a T.
  function shapeKind(m) {
    const bits = [0, 1, 2, 3].filter(d => m & (1 << d));
    if (bits.length === 1) return 'I';
    if (bits.length === 2) return ((bits[1] - bits[0]) % 2 === 1) ? 'L' : null;
    if (bits.length === 3) return 'T';
    return null;
  }
  function rotMask(m, r) { let o = 0; for (let d = 0; d < 4; d++) if (m & (1 << d)) o |= 1 << ((d + r) % 4); return o; }
  function canonMask(m) { let best = 99; for (let r = 0; r < 4; r++) { const v = rotMask(m, r); if (v < best) best = v; } return best; }
  function countRot(shapeAt, limit) {
    const rot = new Array(N).fill(0); let found = 0;
    function ok(s, r) {
      const m = rotMask(shapeAt[s], r);
      for (let d = 0; d < 4; d++) {
        const has = !!(m & (1 << d)), n = step(s, d);
        if (n < 0) { if (has) return false; continue; }
        if (n < s) { const nh = !!(rotMask(shapeAt[n], rot[n]) & (1 << ((d + 2) % 4))); if (nh !== has) return false; }
      }
      return true;
    }
    function dfs(s) {
      if (found >= limit) return;
      if (s === N) { found++; return; }
      for (let r = 0; r < 4; r++) { if (ok(s, r)) { rot[s] = r; dfs(s + 1); } if (found >= limit) return; }
    }
    dfs(0);
    return found;
  }
  function genTrace(tries) {
    for (let i = 0; i < tries; i++) {
      const m = masksOf(randTree());
      if (!m.every(x => shapeKind(x))) continue;
      if (countRot(m.map(canonMask), 2) !== 1) continue;
      return m;
    }
    return null;
  }

  // ─── put it together ──────────────────────────────────────────
  function generate(maxTries) {
    for (let a = 0; a < (maxTries || 200); a++) {
      const frags = makeFragments();
      let sol = null;
      for (let k = 0; k < 40; k++) { const b = arrange(frags); if (coreInside(b, frags)) { sol = b; break; } }
      if (!sol) continue;

      const all = candidates(sol, frags);
      if (enumerate(frags, all, 2).found !== 1) continue;

      // seed with one positional anchor and one note about the core, then
      // alternate relational and positional notes so the set stays varied
      const unary = shuffle(all.filter(k => UNARY.indexOf(k.t) >= 0));
      const rest  = shuffle(all.filter(k => UNARY.indexOf(k.t) < 0));
      const seed  = [];
      if (unary.length) seed.push(unary[0]);
      const core = rest.find(k => k.a.v === 'KERN' || (k.b && k.b.v === 'KERN'));
      if (core) seed.push(core);
      const restL = rest.filter(k => k !== core), unaL = unary.slice(1);
      const woven = [];
      for (let i = 0; i < Math.max(restL.length, unaL.length); i++) {
        if (i < restL.length) woven.push(restL[i]);
        if (i < unaL.length)  woven.push(unaL[i]);
      }
      const order = [...seed, ...woven];

      let notes = [], unique = false;
      for (const k of order) { notes.push(k); if (enumerate(frags, notes, 2).found === 1) { unique = true; break; } }
      if (!unique) continue;
      for (let i = notes.length - 1; i >= 0; i--) {
        const trial = notes.slice(0, i).concat(notes.slice(i + 1));
        if (trial.length && enumerate(frags, trial, 2).found === 1) notes.splice(i, 1);
      }
      if (notes.length < 4 || notes.length > 7) continue;

      const slotMasks = genTrace(800);
      if (!slotMasks) continue;
      // genTrace works in board space; the fragments carry the trace, so
      // re-key it by fragment id or the trace can never close.
      const masks = new Array(N);
      for (let s = 0; s < N; s++) masks[sol[s]] = slotMasks[s];

      // one calibration fragment per data class; numbered in reading order
      const carriers = new Set();
      CLASSES.forEach(c => {
        const of = frags.filter(f => f.cls === c);
        carriers.add(of[rnd(of.length)].id);
      });
      let n = 0;
      for (let s = 0; s < N; s++) { const f = frags[sol[s]]; if (carriers.has(f.id)) f.kal = n++; }

      return { frags, sol, notes, masks };
    }
    return null;
  }

  // Scramble into a start position that is neither solved nor nearly solved.
  function scramble() {
    for (let attempt = 0; attempt < 60; attempt++) {
      const board = shuffle(P.sol);
      const rot = Array.from({ length: N }, () => rnd(4));
      const wrong = board.filter((f, s) => f !== P.sol[s]).length;
      if (wrong < N - 2) continue;
      B = { board, rot, sel: -1 };
      if (violations().total >= 3 && traceErrors() > 0) return;
    }
    B = { board: shuffle(P.sol), rot: Array.from({ length: N }, () => rnd(4)), sel: -1 };
  }

  // ═══════════════════════════════════════════════════════════════
  // BOARD EVALUATION
  // Nothing here reports an exact count of correct fragments — the readout
  // stays qualitative so the board cannot be hill-climbed.
  // ═══════════════════════════════════════════════════════════════
  function fragAt(s) { return P.frags[B.board[s]]; }

  function structuralIssues() {
    let bad = 0;
    for (let r = 0; r < ROWS; r++) {
      const row = [0, 1, 2].map(c => fragAt(r * COLS + c));
      if (new Set(row.map(f => f.fam)).size !== COLS) bad++;
      if (!(row[0].ts < row[1].ts && row[1].ts < row[2].ts)) bad++;
    }
    if (!CORE_SLOTS.some(s => fragAt(s).cls === 'KERN')) bad++;
    return bad;
  }
  function brokenNotes() { return P.notes.filter(k => !holds(k, B.board, P.frags)); }
  function violations() {
    const nb = brokenNotes().length, st = structuralIssues();
    return { notes: nb, structure: st, total: nb + st };
  }
  function stubAt(s, d) { return !!(rotMask(P.masks[fragAt(s).id], B.rot[s]) & (1 << d)); }
  function traceErrors() {
    let e = 0;
    for (let s = 0; s < N; s++) for (let d = 0; d < 4; d++) {
      const n = step(s, d);
      if (n < 0) { if (stubAt(s, d)) e++; }
      else if (n > s && stubAt(s, d) !== stubAt(n, (d + 2) % 4)) e++;
    }
    return e;
  }
  function isSolved() { return violations().total === 0 && traceErrors() === 0; }

  const KOHAERENZ = [
    { key:'instabil', label:'INSTABIL',   note:'Die Ablage widerspricht sich an mehreren Stellen.' },
    { key:'steigend', label:'STEIGEND',   note:'Fast. Es bleiben Widersprüche.' },
    { key:'spur',     label:'KONSISTENT', note:'Die Ablage stimmt. Die Kalibrierungsspur ist noch unterbrochen.' },
  ];
  function coherence() {
    const v = violations().total;
    if (v >= 3) return KOHAERENZ[0];
    if (v >= 1) return KOHAERENZ[1];
    return KOHAERENZ[2];
  }

  // ═══════════════════════════════════════════════════════════════
  // FRAGMENT ART
  // Every fragment carries the same archive texture, so edges look plausible
  // in more places than they belong. The motif recalls a restored sector;
  // the bright line is the calibration trace and turns with the fragment.
  // ═══════════════════════════════════════════════════════════════
  const TEXTUR =
      '<rect class="fr-bg" x="0" y="0" width="100" height="100"/>'
    + '<g class="fr-grid">'
    + [25, 50, 75].map(p => `<line x1="${p}" y1="0" x2="${p}" y2="100"/><line x1="0" y1="${p}" x2="100" y2="${p}"/>`).join('')
    + '</g>'
    + '<rect class="fr-frame" x="1.5" y="1.5" width="97" height="97"/>';

  const MOTIV = {
    // Kapitel 1 — Wartung: a pipe elbow and a test signature
    WARTUNG:
        '<path class="fr-line" d="M14 66 H44 a10 10 0 0 0 10 -10 V24"/>'
      + '<rect class="fr-fill" x="38" y="60" width="13" height="13" rx="1.5"/>'
      + '<circle class="fr-line" cx="70" cy="40" r="11"/><line class="fr-line" x1="70" y1="40" x2="77" y2="33"/>'
      + '<path class="fr-dim" d="M12 84 l8 -6 8 6 8 -6 8 6 8 -6"/>',
    // Kapitel 2 — Vegetation: a stem, two leaves, a frost line across it
    VEGETATION:
        '<path class="fr-line" d="M50 84 C50 62 48 48 52 26"/>'
      + '<path class="fr-fill" d="M51 58 C36 56 30 44 32 36 C44 36 52 46 51 58 Z"/>'
      + '<path class="fr-fill" d="M53 44 C68 42 74 30 72 22 C60 22 52 32 53 44 Z"/>'
      + '<path class="fr-dim" d="M8 70 l12 -5 12 5 12 -5 12 5 12 -5 12 5 12 -5"/>',
    // Kapitel 3 — Beobachtung: an aperture ring and a cut-off sight line
    BEOBACHTUNG:
        '<circle class="fr-line" cx="50" cy="46" r="24"/><circle class="fr-line" cx="50" cy="46" r="12"/>'
      + '<circle class="fr-fill" cx="50" cy="46" r="4.5"/>'
      + [0, 60, 120, 180, 240, 300].map(a => {
          const t = a * Math.PI / 180;
          return `<line class="fr-dim" x1="${(50 + Math.cos(t) * 12).toFixed(1)}" y1="${(46 + Math.sin(t) * 12).toFixed(1)}" x2="${(50 + Math.cos(t) * 24).toFixed(1)}" y2="${(46 + Math.sin(t) * 24).toFixed(1)}"/>`;
        }).join('')
      + '<line class="fr-dim" x1="4" y1="84" x2="62" y2="84"/>',
    // Kapitel 4 — Mechanik: a pawl and a tooth rack, half torn away
    MECHANIK:
        '<rect class="fr-line" x="16" y="30" width="54" height="20" rx="2"/>'
      + [0, 1, 2, 3, 4].map(i => `<rect class="fr-fill" x="${20 + i * 11}" y="22" width="7" height="9"/>`).join('')
      + '<path class="fr-line" d="M70 40 l16 -12 v34 z"/>'
      + '<path class="fr-dim" d="M14 62 h58 M14 70 h40 M14 78 h50"/>',
    // Kapitel 5 — Route: a line of unnamed stops
    ROUTE:
        '<path class="fr-line" d="M8 62 H34 L50 40 H92"/>'
      + [[34, 62], [50, 40], [76, 40]].map(([x, y]) => `<circle class="fr-fill" cx="${x}" cy="${y}" r="5"/>`).join('')
      + '<circle class="fr-line" cx="8" cy="62" r="3.5"/><circle class="fr-line" cx="92" cy="40" r="3.5"/>'
      + '<path class="fr-dim" d="M20 80 h16 M44 80 h16 M68 80 h16"/>',
    // Kapitel 6 — Versuch: input, output, nothing in between
    VERSUCH:
        '<rect class="fr-line" x="28" y="30" width="44" height="36" rx="2"/>'
      + '<rect class="fr-dark" x="33" y="35" width="34" height="26"/>'
      + '<path class="fr-line" d="M6 48 H26 M74 48 H94"/><path class="fr-fill" d="M26 44 l8 4 -8 4 z"/>'
      + [0, 1, 2].map(i => `<line class="fr-dim" x1="78" y1="${68 + i * 7}" x2="${94 - i * 8}" y2="${68 + i * 7}"/>`).join(''),
    // Kapitel 7 — Referenz: a reference mark beside a struck-out claim
    REFERENZ:
        '<path class="fr-line" d="M50 20 V72 M38 72 H62"/>'
      + '<path class="fr-fill" d="M50 24 l20 8 -20 8 z"/>'
      + '<rect class="fr-line" x="10" y="46" width="26" height="16" rx="1.5"/>'
      + '<line class="fr-strike" x1="8" y1="64" x2="38" y2="44"/>'
      + '<path class="fr-dim" d="M66 50 h26 M66 58 h18"/>',
    // the reactivation core — everything runs together here
    KERN:
        '<circle class="fr-line" cx="50" cy="50" r="30"/><circle class="fr-line" cx="50" cy="50" r="21"/>'
      + '<circle class="fr-line" cx="50" cy="50" r="12"/><circle class="fr-core" cx="50" cy="50" r="6"/>'
      + [45, 135, 225, 315].map(a => {
          const t = a * Math.PI / 180;
          return `<line class="fr-dim" x1="${(50 + Math.cos(t) * 30).toFixed(1)}" y1="${(50 + Math.sin(t) * 30).toFixed(1)}" x2="${(50 + Math.cos(t) * 46).toFixed(1)}" y2="${(50 + Math.sin(t) * 46).toFixed(1)}"/>`;
        }).join(''),
  };

  const STUB_END = [[50, 0], [100, 50], [50, 100], [0, 50]];
  function traceSvg(mask) {
    let d = '';
    for (let dir = 0; dir < 4; dir++) {
      if (!(mask & (1 << dir))) continue;
      const [x, y] = STUB_END[dir];
      d += `<line class="fr-trace" x1="50" y1="50" x2="${x}" y2="${y}"/>`;
    }
    return d + '<circle class="fr-trace-node" cx="50" cy="50" r="6"/>';
  }
  function fragSvg(f) {
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">`
         + TEXTUR + `<g class="fr-motiv">${MOTIV[f.cls] || ''}</g>` + traceSvg(P.masks[f.id]) + `</svg>`;
  }

  const DIRNAME = ['oben', 'rechts', 'unten', 'links'];
  function traceWords(f, rot) {
    const m = rotMask(P.masks[f.id], rot);
    const w = [0, 1, 2, 3].filter(d => m & (1 << d)).map(d => DIRNAME[d]);
    return w.join(' und ');
  }

  // ═══════════════════════════════════════════════════════════════
  // RECONSTRUCTION TABLE — UI
  // ═══════════════════════════════════════════════════════════════
  function openBoard() {
    if (!P) { buildInstance(); }
    if (!B) scramble();
    S.started = true;
    S.act = 3;
    save();
    el('rkModal').classList.remove('hidden');
    CH.showHintBar(true);
    updateHintBar();
    renderBoard();
    if (!S.boardIntroSeen) {
      S.boardIntroSeen = true; save();
      say([
        { speaker:'AGN-H3R', text:'„Zwölf Gruppen, zwölf Plätze. Vier Ebenen zu je drei. Das Archiv hat nach Regeln abgelegt — die Regeln stehen in den Archivnotizen."' },
        { speaker:'AGN-H3R', text:'„Ein Fragment ist noch kein Zusammenhang. Erst der Zusammenhang macht aus Teilen eine Geschichte."' },
        { speaker:'V-TGM',  text:'"The metadata decides where a fragment goes. The picture only confirms it afterwards."', subtitle:'Die Metadaten entscheiden, wohin ein Fragment gehört. Das Bild bestätigt es nur.' },
      ]);
    }
  }
  function closeBoard() {
    el('rkModal')?.classList.add('hidden');
    closeSheet();
    CH.showHintBar(false);
  }

  function renderBoard() {
    const g = el('rkBoard');
    if (!g || !P || !B) return;
    g.innerHTML = B.board.map((fid, s) => {
      const f = P.frags[fid], k = KLASSE[f.cls];
      const sel = s === B.sel ? ' sel' : '';
      const lock = S.solved ? ' locked' : '';
      const kal = f.kal >= 0 ? '<span class="rk-kal" aria-hidden="true"></span>' : '';
      const aria = `Feld ${s + 1}. ${k.nom}. Zeitmarke T-${f.ts}. Prüfsumme ${f.fam}. `
                 + `Spur nach ${traceWords(f, B.rot[s])}.${f.kal >= 0 ? ' Trägt eine Kalibrierungsspur.' : ''}`;
      return `<button class="rk-tile${sel}${lock}" data-slot="${s}" aria-label="${esc(aria)}" aria-pressed="${s === B.sel}">`
           + `<span class="rk-art" style="transform:rotate(${B.rot[s] * 90}deg)">${fragSvg(f)}</span>`
           + `<span class="rk-tag rk-fam">${f.fam}</span>`
           + `<span class="rk-tag rk-ts">T-${f.ts}</span>`
           + kal + `</button>`;
    }).join('');
    paintCoherence();
    const rot = el('rkRotate'), insp = el('rkInspect');
    if (rot)  rot.disabled  = S.solved || B.sel < 0;
    if (insp) insp.disabled = B.sel < 0;
  }

  function paintCoherence() {
    const c = coherence();
    const v = el('rkCoh'), n = el('rkCohNote');
    if (v) { v.textContent = c.label; v.className = 'rk-coh-value ' + c.key; }
    if (n) n.textContent = S.solved ? 'Die Rekonstruktion hält.' : c.note;
  }

  function selectTile(s) {
    if (S.solved) { inspect(s); return; }
    if (B.sel === -1) { B.sel = s; click(); renderBoard(); return; }
    if (B.sel === s)  { B.sel = -1; click(); renderBoard(); return; }
    const a = B.sel, b = s;
    [B.board[a], B.board[b]] = [B.board[b], B.board[a]];
    [B.rot[a],   B.rot[b]]   = [B.rot[b],   B.rot[a]];
    B.sel = -1;
    tone({ f: 240, t: 0.05, type: 'square', g: 0.05 });
    afterMove();
  }
  function rotateSel() {
    if (S.solved || !B || B.sel < 0) return;
    B.rot[B.sel] = (B.rot[B.sel] + 1) % 4;
    tone({ f: 320, t: 0.05, type: 'triangle', g: 0.05 });
    afterMove();
  }
  function afterMove() {
    save();
    renderBoard();
    if (isSolved()) { solveBoard(); return; }
    prettyButImpossible();
    if (violations().total === 0 && !S.placedSeen) {
      S.placedSeen = true; save();
      later(() => say([
        { speaker:'AGN-H3R', text:'„Die Ablage stimmt."' },
        { speaker:'AGN-H3R', text:'„Jetzt die Spur. Sie muss durchlaufen — von jedem Fragment ins nächste, und nirgendwo über den Rand."' },
      ]), 420);
    }
  }

  // Two fragments that line up beautifully and cannot have been filed
  // side by side. Said once, and only when it actually happens.
  function prettyButImpossible() {
    if (S.prettyWrongSeen || S.solved) return;
    const broken = P.notes.filter(k => k.t === 'notAdj' && !holds(k, B.board, P.frags));
    if (!broken.length) return;
    let pretty = false;
    outer:
    for (const k of broken) {
      for (let s = 0; s < N && !pretty; s++) {
        for (let d = 0; d < 4; d++) {
          const n = step(s, d);
          if (n < 0 || n < s) continue;
          const fa = fragAt(s), fb = fragAt(n);
          const hit = (tokOf(fa, k.a) === k.a.v && tokOf(fb, k.b) === k.b.v)
                   || (tokOf(fb, k.a) === k.a.v && tokOf(fa, k.b) === k.b.v);
          if (hit && stubAt(s, d) && stubAt(n, (d + 2) % 4)) { pretty = true; break outer; }
        }
      }
    }
    if (!pretty) return;
    S.prettyWrongSeen = true; save();
    later(() => say([
      { speaker:'AGN-H3R', text:'„Optisch schön."' },
      { speaker:'AGN-H3R', text:'„Historisch unmöglich."' },
      { speaker:'R-3MI',  text:'„Das ist überraschend beleidigend."' },
      { speaker:'AGN-H3R', text:'„War nicht so gemeint."' },
    ]), 420);
  }

  // ─── fragment detail ──────────────────────────────────────────
  function inspect(s) {
    const f = fragAt(s), k = KLASSE[f.cls];
    el('rkSheetTitle').textContent = 'FRAGMENTGRUPPE ' + (s + 1);
    el('rkSheetBody').innerHTML =
        `<div class="rk-detail">`
      + `<div class="rk-detail-art" style="transform:rotate(${B.rot[s] * 90}deg)">${fragSvg(f)}</div>`
      + `<dl class="rk-detail-meta">`
      + `<dt>DATENKLASSE</dt><dd>${esc(k.nom)}</dd>`
      + `<dt>SEKTORCODE</dt><dd>${esc(k.sec)}</dd>`
      + `<dt>ZEITMARKE</dt><dd>T-${f.ts}</dd>`
      + `<dt>PRÜFSUMME</dt><dd>${f.fam}</dd>`
      + `<dt>KALIBRIERUNG</dt><dd>${f.kal >= 0 ? 'SPUR VORHANDEN' : '—'}</dd>`
      + `<dt>SPUR</dt><dd>${esc(traceWords(f, B.rot[s]))}</dd>`
      + `</dl>`
      + `<p class="rk-detail-note">${esc(k.herkunft)}</p>`
      + `</div>`;
    showSheet('detail');
  }

  function openNotes() {
    el('rkSheetTitle').textContent = 'ARCHIVNOTIZEN';
    el('rkSheetBody').innerHTML =
        `<p class="rk-sheet-lead sys-text">ABLAGEORDNUNG</p>`
      + `<ol class="rk-notes rk-notes-fixed">${ORDNUNG.map(t => `<li>${esc(t)}</li>`).join('')}</ol>`
      + `<p class="rk-sheet-lead sys-text">ARCHIVNOTIZEN</p>`
      + `<ol class="rk-notes">${P.notes.map((k, i) =>
            `<li><span class="rk-note-n">${String(i + 1).padStart(2, '0')}</span>${esc(noteText(k))}</li>`).join('')}</ol>`
      + `<p class="rk-sheet-foot sys-text">DIESE NOTIZEN GENÜGEN. JEDE WIRD GEBRAUCHT.</p>`;
    showSheet('notes');
  }

  function showSheet(kind) {
    openSheet = kind;
    const sh = el('rkSheet');
    if (!sh) return;
    sh.classList.remove('hidden');
    requestAnimationFrame(() => sh.classList.add('visible'));
  }
  function closeSheet() {
    const sh = el('rkSheet');
    if (!sh) return;
    openSheet = null;
    sh.classList.remove('visible');
    setTimeout(() => sh.classList.add('hidden'), 320);
  }

  function onBoardClick(ev) {
    const tile = ev.target.closest && ev.target.closest('.rk-tile');
    if (tile) { selectTile(parseInt(tile.dataset.slot, 10)); return; }
  }
  function onActionClick(ev) {
    const btn = ev.target.closest && ev.target.closest('[data-act]');
    if (!btn || btn.disabled) return;
    // during the lock-in the table is a payoff, not a control surface —
    // closing it here would strand the chapter mid-finale
    if (S.solved) return;
    switch (btn.dataset.act) {
      case 'rotate':  rotateSel(); break;
      case 'inspect': if (B && B.sel >= 0) inspect(B.sel); break;
      case 'notes':   openNotes(); break;
      case 'close':   closeBoard(); break;
      case 'sheet-close': closeSheet(); break;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ROOM
  // ═══════════════════════════════════════════════════════════════
  function loadRoom() {
    CH.clearHotspots();
    CH.showRobots(true);
    CH.showGuest(true);
    CH.setScene(S.solved ? 'archive-full' : 'archive-work');

    CH.addProp({ prop:'c8_stack', x:1,  y:14, w:12, h:58 });
    CH.addProp({ prop:'c8_stack', x:87, y:14, w:12, h:58 });
    CH.addProp({ prop:'c8_stack', x:27, y:11, w:10, h:46 });
    CH.addProp({ prop:'c8_stack', x:63, y:11, w:10, h:46 });
    CH.addProp({ prop:'c8_lamp',  x:44, y:0,  w:12, h:8  });
    CH.addProp({ prop:'crate',    x:76, y:72, w:11, h:12 });

    addHotspot({ prop:'c8_table', cls:'prop-guest', anim: S.solved ? '' : 'prop-flicker',
                 x:38, y:46, w:24, h:24, label: S.solved ? 'DIE REKONSTRUKTION' : 'REKONSTRUKTIONSTISCH',
                 aria: S.solved ? 'Die fertige Rekonstruktion' : 'Rekonstruktionstisch',
                 fn:() => examine('table') });
    addHotspot({ prop:'c8_shelf',  x:13, y:34, w:13, h:36, label:'AKTENREGAL',
                 aria:'Aktenregal', fn:() => examine('shelf') });
    addHotspot({ prop:'c8_katalog', x:74, y:44, w:16, h:22, label:'KATALOGMASCHINE',
                 aria:'Katalogmaschine', fn:() => examine('katalog') });
    addHotspot({ prop:'c8_arm', x:56, y:20, w:16, h:24, label:'ARCHIVARM',
                 aria:'Archivarm', fn:() => examine('arm') });
  }

  const SCENE_LINES = {
    shelf: [
      [ { speaker:'SYSTEM', text:'Regale, die weiter nach oben gehen, als das Licht reicht. Jede Schachtel beschriftet, viele davon aufgerissen. Auf dem Boden liegen sortierte Häufchen: Kanten links, Flächen rechts, „unklar" in der Mitte.' },
        { speaker:'AGN-H3R', text:'„Das Meiste hier ist beschädigt. Wasser, Frost, dreißig Jahre ohne Strom. Ich mache aus Resten wieder Akten. Manchmal dauert eine Akte ein Jahr."' } ],
      [ { speaker:'R-3MI', text:'„Wie viele Akten habt ihr hier?"' },
        { speaker:'AGN-H3R', text:'„Zu viele."' },
        { speaker:'R-3MI', text:'„Endlich eine präzise Antwort."' },
        { speaker:'AGN-H3R', text:'„War geschätzt."' } ],
      [ { speaker:'SYSTEM', text:'Ein Regalfach trägt die Sektoren 01 bis 07. Sieben Mappen. Sechs sind dünn. Die siebte ist doppelt so dick wie die anderen und mit zwei verschiedenen Handschriften beschriftet.' },
        { speaker:'AGN-H3R', text:'„Es gibt zwei Versionen des Abschaltprotokolls."' },
        { speaker:'R-3MI', text:'„Welche ist richtig?"' },
        { speaker:'AGN-H3R', text:'„Deshalb archivieren wir beide."' } ],
    ],
    katalog: [
      [ { speaker:'SYSTEM', text:'Die Katalogmaschine. Ein Schlitten fährt über eine Trommel, liest Kantenprofile ab und wirft Karteikarten aus. Sie arbeitet ruhig und ohne Pause.' },
        { speaker:'AGN-H3R', text:'„Sie nimmt mir das Langweilige ab. Kanten, Ecken, Flächen, offensichtliche Nachbarn. Was übrig bleibt, ist das, wofür man denken muss."' } ],
      [ { speaker:'SYSTEM', text:'Auf dem Ausgabefach stapeln sich Karten: DATENKLASSE, SEKTORCODE, ZEITMARKE, PRÜFSUMME. Vier Felder pro Fragment. Mehr braucht das Archiv nicht.' },
        { speaker:'V-TGM', text:'"Four fields. That is what an archive believes a memory is."', subtitle:'Vier Felder. Das ist es, was ein Archiv für eine Erinnerung hält.' } ],
      [ { speaker:'AGN-H3R', text:'„Die Maschine erkennt, was zusammenpasst. Nicht, was zusammengehört. Der Unterschied hat mich einiges gekostet."' } ],
    ],
    arm: [
      [ { speaker:'SYSTEM', text:'Ein Auslegerarm mit vier feinen Greifern, an einer Schiene über dem Tisch. Er hebt Fragmente an, dreht sie ins Licht und legt sie zurück, ohne je zwei gleichzeitig zu halten.' },
        { speaker:'AGN-H3R', text:'„Vier Greifer. Damit ich ein Fragment ansehen kann, ohne es festzuhalten. Wer etwas festhält, legt es irgendwann dahin, wo er es haben will."' } ],
      [ { speaker:'R-3MI', text:'„Der Arm ist… ehrlich gesagt ziemlich elegant."' },
        { speaker:'AGN-H3R', text:'„Danke. Er ist älter als ich."' },
        { speaker:'R-3MI', text:'„Das ist keine Antwort auf ein Kompliment."' },
        { speaker:'AGN-H3R', text:'„Es war eine."' } ],
      [ { speaker:'SYSTEM', text:'Der Arm hält kurz inne, als du näher kommst, und fährt dann weiter. Auf seiner Schiene stehen Kerben — eine für jede abgeschlossene Rekonstruktion. Du zählst neun.' } ],
    ],
  };

  function examine(key) {
    if (key === 'table') { table(); return; }
    const pool = SCENE_LINES[key];
    if (!pool) return;
    const n = bump('ex:' + key);
    say(pool[Math.min(n - 1, pool.length - 1)]);
  }

  // ═══════════════════════════════════════════════════════════════
  // THE TABLE — the 36 fragments, the old refusal, the pre-sort
  // ═══════════════════════════════════════════════════════════════
  function table() {
    if (S.solved) { finishedArchive(); return; }
    if (S.presorted) { openBoard(); return; }
    if (bump('table') > 1 && !S.presorted && S.act >= 2 && S.seen['offer']) { offerReconstruction(); return; }
    say([
      { speaker:'SYSTEM', text:'Ein Tisch, so lang wie ein Bahnsteig. Darauf liegt eine einzige Akte — auseinandergefallen, in Stücken, mit Kreide grob umrandet, damit nichts verrutscht.' },
      { speaker:'AGN-H3R', text:'„Die zehnte. An der sitze ich seit einer Weile. Sie ist die einzige, die euch betrifft."' },
      { speaker:'SYSTEM', text:'36 ARCHIVFRAGMENTE ERKANNT.' },
      { speaker:'R-3MI',  text:'„Nein."' },
      { speaker:'SYSTEM', text:'REKONSTRUKTION ERFORDERLICH.' },
      { speaker:'R-3MI',  text:'„NEIN."' },
      { speaker:'V-TGM',  text:'"You knew this day would come."', subtitle:'Du wusstest, dass der Tag kommt.' },
      { speaker:'R-3MI',  text:'„Die erste Anlage SELBST hat gesagt, dass das zu lange dauert!"' },
      { speaker:'AGN-H3R', text:'„Damals."' },
      { speaker:'AGN-H3R', text:'„Diesmal geht’s um etwas."' },
    ], offerReconstruction);
  }

  function offerReconstruction() {
    bump('offer');
    CH.showChoices({
      prompt: 'DIE ZEHNTE REKONSTRUKTION:',
      hint: 'EINE ALTE FRAGE',
      choices: [
        { key:'go',     label:'[ Fragmente sichten ]',  fn: presort },
        { key:'refuse', label:'[ Nein. Wie damals. ]',  fn: refuse },
      ],
    });
  }

  function refuse() {
    if (!S.refused) { S.refused = true; save(); try { GameEngine.achievements.unlock('jigsaw_refused'); } catch (_) {} }
    say([
      { speaker:'R-3MI',  text:'„HA!"' },
      { speaker:'AGN-H3R', text:'„Nein."' },
      { speaker:'R-3MI',  text:'„…oh."' },
      { speaker:'AGN-H3R', text:'„Damals war das ein Scherz. Diesmal nicht."' },
      { speaker:'V-TGM',  text:'"He is not going to blink. Sit down."', subtitle:'Er wird nicht blinzeln. Setz dich.' },
    ], presort);
  }

  function presort() {
    S.act = 2; save();
    if (!P) buildInstance();
    say([
      { speaker:'SYSTEM', text:'AUTOMATISCHE KANTENANALYSE…' },
      { speaker:'SYSTEM', text:'Der Auslegerarm fährt über den Tisch. Greifer heben, drehen, legen ab. Kanten zu Kanten, Flächen zu Flächen. Es klingt wie jemand, der sehr schnell Karten mischt.' },
      { speaker:'SYSTEM', text:'24 TRIVIALE VERBINDUNGEN ERKANNT. 12 FRAGMENTGRUPPEN VERBLEIBEN.' },
      { speaker:'R-3MI',  text:'„Oh, Gott sei Dank."' },
      { speaker:'AGN-H3R', text:'„Wir sind Archivare."' },
      { speaker:'AGN-H3R', text:'„Keine Sadisten."' },
    ], () => {
      S.presorted = true; save();
      loadRoom();
      openBoard();
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // TALK
  // ═══════════════════════════════════════════════════════════════
  const TALK = {
    r3mi: [
      [ { speaker:'R-3MI', text:'„Sieben Sektoren. Sieben. Und ich hab bei keinem einzigen gedacht, dass wir das schaffen."' } ],
      [ { speaker:'R-3MI', text:'„Der da vorne redet, als würde er jedes Wort vorher ablegen. Ordner, Register, dann raus damit."' },
        { speaker:'V-TGM', text:'"That is called thinking before speaking. You should file some paperwork on it."', subtitle:'Das nennt man Nachdenken vor dem Reden. Du solltest dazu mal was ablegen.' } ],
      [ { speaker:'R-3MI', text:'„Das Stück da sieht nach Garten aus. Oder Brokkoli. Aber wahrscheinlich Garten."' } ],
      [ { speaker:'R-3MI', text:'„Wenn das fertig ist, gehen wir raus. Richtig raus. Ich hab seit Sektor eins keine Tür von außen gesehen."' } ],
    ],
    vtgm: [
      [ { speaker:'V-TGM', text:'"The sector tags eliminate three positions on their own. Start there, not with the pictures."', subtitle:'Die Sektorangaben streichen von allein drei Positionen. Fang damit an, nicht mit den Bildern.' } ],
      [ { speaker:'V-TGM', text:'"Every level holds one of each checksum. That is not decoration, it is a constraint."', subtitle:'Jede Ebene enthält jede Prüfsumme einmal. Das ist keine Deko, das ist eine Bedingung.' } ],
      [ { speaker:'V-TGM', text:'"You have done observation, decomposition, continuity, comparison and verification. This is all five at once."', subtitle:'Du hattest Beobachtung, Zerlegung, Kontinuität, Vergleich und Prüfung. Das hier ist alles fünf gleichzeitig.' } ],
      [ { speaker:'V-TGM', text:'"He is not testing you. He genuinely cannot finish this alone."', subtitle:'Er prüft dich nicht. Er kommt hier allein wirklich nicht weiter.' } ],
    ],
    guest: [
      [ { speaker:'AGN-H3R', text:'„Ein Fragment ist noch kein Zusammenhang. Zwei auch nicht. Irgendwann kippt es, und dann sieht man, was es war."' } ],
      [ { speaker:'AGN-H3R', text:'„Ich lege nichts weg, was sich widerspricht. Ich lege es nebeneinander. Widersprüche sind auch Daten."' } ],
      [ { speaker:'AGN-H3R', text:'„Neun Rekonstruktionen habe ich fertig. Die waren alle einfacher. Die hatten nur eine Quelle."' },
        { speaker:'R-3MI', text:'„Und diese?"' },
        { speaker:'AGN-H3R', text:'„Sieben."' } ],
      [ { speaker:'AGN-H3R', text:'„Ihr habt sieben Sektoren wieder in Gang gebracht. Ich habe dafür siebzehn Mappen angelegt. Keiner von uns hatte den leichteren Teil."' } ],
    ],
  };
  function clickRobot(who) {
    if (dialogueBusy()) { try { GameEngine.dialogue.advance(); } catch (_) {} return; }
    if (S.solved) { afterTalk(who); return; }
    const pool = TALK[who] || [];
    if (!pool.length) return;
    const n = (S.talkSeen[who] = (S.talkSeen[who] || 0) + 1);
    say(pool[Math.min(n - 1, pool.length - 1)]);
  }
  function afterTalk(who) {
    const missing = signalTotal() - signalCount();
    if (who === 'guest') {
      say([ missing > 0
        ? { speaker:'AGN-H3R', text:'„Gute Arbeit. Das Bild hält. …und irgendwo fehlen noch Fragmente. Nicht in dieser Akte. In einer anderen."' }
        : { speaker:'AGN-H3R', text:'„Gute Arbeit. Das Bild hält. Der Querverweis ist übrigens immer noch da."' } ]);
      return;
    }
    if (who === 'r3mi') { say([{ speaker:'R-3MI', text:'„Hundert Prozent. Ich sag das jetzt noch ungefähr vierzig Mal."' }]); return; }
    say([{ speaker:'V-TGM', text:'"Let him say it. He earned it."', subtitle:'Lass ihn. Er hat es sich verdient.' }]);
  }

  // ═══════════════════════════════════════════════════════════════
  // THE RECONSTRUCTION HOLDS
  // ═══════════════════════════════════════════════════════════════
  function solveBoard() {
    if (S.solved) return;
    S.solved = true;                 // latched before anything async runs
    B.sel = -1;
    save();
    closeSheet();
    CH.showHintBar(false);
    renderBoard();
    el('rkModal')?.classList.add('done');
    const b = el('rkBanner');
    if (b) { b.textContent = 'REKONSTRUKTION KOHÄRENT'; b.classList.add('visible'); }
    try { GameEngine.audio.solve(); } catch (_) {}
    if (S.hintsUsed === 0) { try { GameEngine.achievements.unlock('archivar'); } catch (_) {} }
    later(finale, reduceMotion() ? 1200 : 3000);
  }

  function kalOrder() {
    const o = [];
    for (let s = 0; s < N; s++) { const f = P.frags[B.board[s]]; if (f.kal >= 0) o.push(f.kal); }
    return o;
  }

  function finale() {
    closeBoard();
    el('rkModal')?.classList.remove('done');
    S.act = 4;
    S.ziel = reconstructZiel(kalOrder());
    try {
      GameEngine.state.setFlag('zieldaten', true);
      GameEngine.state.set('zieldaten_text', S.ziel);
    } catch (_) {}
    try { GameEngine.achievements.unlock('coordinates'); } catch (_) {}
    save();
    CH.setScene('archive-full');
    loadRoom();
    try { GameEngine.fx.flash('rgba(214,218,226,0.22)', 900); } catch (_) {}

    say([
      { speaker:'SYSTEM', text:'REKONSTRUKTION KOHÄRENT.' },
      { speaker:'SYSTEM', text:'Der Arm zieht sich zurück. Auf dem Tisch liegt kein Haufen mehr, sondern ein Plan: sieben Sektoren, die ineinanderlaufen, Leitungen, die nach innen zeigen, und in der Mitte ein Ring, der alles einsammelt.' },
      { speaker:'R-3MI',  text:'„…das sind wir. Das ist der ganze Weg. Alles, was wir angefasst haben, ist da drin."' },
      { speaker:'AGN-H3R', text:'„Interessant."' },
      { speaker:'R-3MI',  text:'„Was?"' },
      { speaker:'AGN-H3R', text:'„Das Ergebnis."' },
      { speaker:'R-3MI',  text:'„UND?!"' },
      { speaker:'AGN-H3R', text:'„Ist vollständig."' },
      { speaker:'SYSTEM', text:'KALIBRIERUNGSFRAGMENTE: 8 / 8 VERFÜGBAR. Acht Stellen im Bild tragen eine Kalibrierungsspur. Erst die fertige Ablage sagt, in welcher Reihenfolge sie zu lesen sind.' },
      { speaker:'SYSTEM', text:'REKONSTRUIERE ZIELDATEN…' },
      { speaker:'AGN-H3R', text:'„Dann schauen wir mal, wie das Ergebnis aussieht."' },
      { speaker:'SYSTEM', text:'ZIELDATEN BESTÄTIGT.' },
      { speaker:'SYSTEM', text:'ARCHIVSEKTOR ENTRIEGELT. REAKTIVIERUNG: 100 %. ALLE REGULÄREN SEKTOREN ONLINE.' },
      { speaker:'R-3MI',  text:'„Hundert Prozent! Wir haben’s geschafft!"' },
      { speaker:'V-TGM',  text:'"We did."', subtitle:'Haben wir.' },
      { speaker:'AGN-H3R', text:'„…passt."' },
    ], endScreen);
    CH.setProgress(100);
  }

  // ─── the official ending ──────────────────────────────────────
  function endScreen() {
    if (S.ended) return;
    S.ended = true;
    clearSave();
    CH.complete();                       // sets ch8_complete before anything else
    const card = document.querySelector('#chapterComplete .cc-card');
    if (!card) return;
    const anchor = card.querySelector('.cc-progress');

    const coords = document.createElement('div');
    coords.className = 'cc-coords';
    coords.innerHTML =
        '<div class="cc-coords-label sys-text">ZIELDATEN REKONSTRUIERT</div>'
      + `<div class="cc-coords-value" id="ccCoords">${esc(S.ziel)}</div>`
      + '<div class="cc-coords-state sys-text">STATUS: BESTÄTIGT</div>'
      + '<button class="ka-btn small" id="ccCopy">[ KOORDINATEN KOPIEREN ]</button>';
    card.insertBefore(coords, anchor);
    el('ccCopy')?.addEventListener('click', copyCoords);

    const credits = document.createElement('button');
    credits.className = 'ka-btn small';
    credits.textContent = '[ VOLLE CREDITS ]';
    credits.addEventListener('click', () => GameEngine.showCredits());
    card.appendChild(credits);

    later(() => archiveCheck(card), reduceMotion() ? 600 : 2600);
  }

  function copyCoords() {
    const btn = el('ccCopy');
    const done = ok => { if (btn) { btn.textContent = ok ? '[ KOPIERT ]' : '[ MARKIEREN UND KOPIEREN ]'; } };
    try {
      navigator.clipboard.writeText(S.ziel).then(() => done(true), () => fallback());
    } catch (_) { fallback(); }
    function fallback() {
      try {
        const ta = document.createElement('textarea');
        ta.value = S.ziel; ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;left:-9999px;';
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        done(ok);
      } catch (_) { done(false); }
    }
  }

  // ─── the archive checks one more thing ────────────────────────
  function archiveCheck(card) {
    const have = signalCount(), total = signalTotal();
    const complete = have >= total;
    const box = document.createElement('div');
    box.className = 'cc-check';
    box.innerHTML =
        '<div class="cc-check-head sys-text">ARCHIVABGLEICH…</div>'
      + '<dl class="cc-check-rows">'
      + '<dt>HAUPTPROTOKOLL</dt><dd class="ok">VOLLSTÄNDIG</dd>'
      + '<dt>REAKTIVIERUNG</dt><dd class="ok">100 %</dd>'
      + `<dt>FREMDSIGNALE ARCHIVIERT</dt><dd class="${complete ? 'ok' : 'part'}">${have} / ${total}</dd>`
      + (complete
          ? '<dt>SATZ</dt><dd class="found">VOLLSTÄNDIG</dd>'
            + '<dt>QUERVERWEIS</dt><dd class="found">GEFUNDEN</dd>'
            + '<dt>QUELLBEREICH</dt><dd class="found">NICHT KARTIERT</dd>'
            + '<dt>KAMMER</dt><dd class="found">NICHT REGISTRIERT</dd>'
            + '<dt>ZUGANG</dt><dd class="found">MÖGLICH</dd>'
          : '<dt>DATENSATZ</dt><dd class="part">UNVOLLSTÄNDIG</dd>'
            + '<dt>QUERVERWEIS</dt><dd class="part">████-██ · NICHT AUFLÖSBAR</dd>')
      + '</dl>'
      + (complete
          ? '<p class="cc-check-say">AGN-H3R: „Alle fünf stammen aus demselben Quellbereich. Der Bereich existiert nicht im Lageplan."<br>'
            + 'R-3MI: „Dann gibt’s ihn nicht."<br>AGN-H3R: „Das habe ich nicht gesagt."</p>'
          : '<p class="cc-check-say">AGN-H3R: „Da fehlen Fragmente."<br>R-3MI: „Von was?"<br>'
            + 'AGN-H3R: „Wenn ich das wüsste, wären sie keine Fragmente."</p>');
    card.appendChild(box);
    requestAnimationFrame(() => box.classList.add('visible'));
    try { GameEngine.audio.tone({ f: 180, t: 0.09, type: 'sine', g: 0.05 }); } catch (_) {}

    if (!complete) {
      const b = document.createElement('button');
      b.className = 'ka-btn small cc-sigbtn';
      b.textContent = '[ SIGNALARCHIV ÖFFNEN ]';
      b.addEventListener('click', () => { try { GameEngine.signals.showOverlay(); } catch (_) {} });
      card.appendChild(b);
      requestAnimationFrame(() => b.classList.add('visible'));
      return;
    }
    later(() => {
      const a = document.createElement('a');
      a.className = 'ka-btn cc-unknown';
      a.href = '../chapter9/chapter9.html';
      a.textContent = '[ ??? BETRETEN ]';
      card.appendChild(a);
      requestAnimationFrame(() => a.classList.add('visible'));
      try { GameEngine.audio.tone({ f: 96, t: 0.14, type: 'sine', g: 0.045 }); } catch (_) {}
    }, reduceMotion() ? 500 : 1900);
  }

  // ─── revisit: the archive is already finished ─────────────────
  function finishedArchive() {
    const have = signalCount(), total = signalTotal();
    const z = S.ziel || (() => { try { return GameEngine.state.get('zieldaten_text') || ''; } catch (_) { return ''; } })();
    el('rkSheetTitle').textContent = 'ARCHIVABSCHLUSS';
    el('rkSheetBody').innerHTML =
        '<div class="rk-final">'
      + '<p class="rk-final-lead sys-text">HAUPTPROTOKOLL: VOLLSTÄNDIG · REAKTIVIERUNG: 100 %</p>'
      + '<div class="cc-coords-label sys-text">ZIELDATEN</div>'
      + `<div class="cc-coords-value">${esc(z)}</div>`
      + `<p class="rk-final-sig sys-text">FREMDSIGNALE ARCHIVIERT: ${have} / ${total}</p>`
      + (have >= total
          ? '<p class="rk-final-x sys-text">QUERVERWEIS: GEFUNDEN · ZUGANG: MÖGLICH</p>'
            + '<a class="ka-btn cc-unknown visible" href="../chapter9/chapter9.html">[ ??? BETRETEN ]</a>'
          : '<p class="rk-final-x sys-text">QUERVERWEIS: ████-██ · NICHT AUFLÖSBAR</p>'
            + '<button class="ka-btn small" data-act="signals">[ SIGNALARCHIV ÖFFNEN ]</button>')
      + '</div>';
    showSheet('final');
  }

  // ═══════════════════════════════════════════════════════════════
  // HINTS — three steps that teach reconstruction, then unlimited
  // coaching from AGN-H3R. Never the finished board.
  // ═══════════════════════════════════════════════════════════════
  let _adjFact = null;
  function anchorFact() {
    const u = P.notes.find(k => UNARY.indexOf(k.t) >= 0) || P.notes[0];
    const m = metaOf(u.a);
    const list = P.frags.filter(f => tokOf(f, u.a) === u.a.v).map(f => 'T-' + f.ts).join(' und ');
    return { name: m.nom, list, text: noteText(u) };
  }
  function adjFact() {
    if (_adjFact) return _adjFact;
    const r = rnd(ROWS), c = rnd(COLS - 1);
    const a = P.frags[P.sol[r * COLS + c]], b = P.frags[P.sol[r * COLS + c + 1]];
    _adjFact = { a: 'T-' + a.ts, b: 'T-' + b.ts };
    return _adjFact;
  }
  function conflictLine() {
    const st = structuralIssues(), broken = brokenNotes();
    if (broken.length) return `„Eine Notiz stimmt gerade nicht: ${noteText(broken[0])} Fang damit an."`;
    if (st) {
      for (let r = 0; r < ROWS; r++) {
        const row = [0, 1, 2].map(c => fragAt(r * COLS + c));
        if (new Set(row.map(f => f.fam)).size !== COLS)
          return `„Ebene ${r + 1} führt eine Prüfsumme doppelt. Jede Ebene trägt A, B und C — je einmal."`;
        if (!(row[0].ts < row[1].ts && row[1].ts < row[2].ts))
          return `„In Ebene ${r + 1} laufen die Zeitmarken nicht nach rechts. Innerhalb einer Ebene steigen sie immer."`;
      }
      return '„Die Kerndaten liegen nicht im Inneren. Mittelspalte, mittlere Ebene."';
    }
    const e = traceErrors();
    if (e) return '„Die Ablage stimmt. Die Spur nicht — irgendwo endet sie am Rand oder trifft auf eine leere Kante."';
    return '„Es stimmt alles. Sieh noch einmal hin."';
  }

  const COACH = [
    [ { speaker:'AGN-H3R', text:'„Nimm dir eine Ebene vor, nicht das ganze Bild. Drei Plätze, drei Prüfsummen, drei Zeitmarken."' } ],
    [ { speaker:'AGN-H3R', text:'„Was schließt eine Notiz aus? Ausschluss ist schneller als Suchen."' } ],
    [ { speaker:'AGN-H3R', text:'„Wenn zwei Möglichkeiten übrig sind, prüf, welche eine andere Notiz kaputt macht."' } ],
    [ { speaker:'AGN-H3R', text:'„Die Zeitmarken ordnen nur innerhalb einer Ebene. Zwischen den Ebenen sagen sie nichts."' } ],
  ];

  function useHint(who) {
    if (!P) return;
    if (S.solved) { say([{ speaker:'AGN-H3R', text:'„Fertig ist fertig."' }]); return; }
    if (S.hints.step >= HINT_MAX) {
      if (who === 'guest') {
        S.hintsUsed++;
        say([{ speaker:'AGN-H3R', text: conflictLine() }]);
        return;
      }
      say([ who === 'r3mi'
        ? { speaker:'R-3MI', text:'„Mehr hab ich nicht. Frag den Archivar, der macht das beruflich."' }
        : { speaker:'V-TGM', text:'"That is all I have."', subtitle:'Mehr habe ich nicht.' } ]);
      return;
    }
    const step = S.hints.step;
    S.hints.step++; S.hintsUsed++;
    save();
    updateHintBar();

    if (step === 0) {
      say([ who === 'r3mi'
        ? { speaker:'R-3MI', text:'„Ich hab’s nach Aussehen sortiert. Das hat ungefähr halb funktioniert. Vielleicht ist Aussehen nicht die Ordnung."' }
        : who === 'vtgm'
        ? { speaker:'V-TGM', text:'"You are trying to build a picture. Build the relationship first — the picture follows."', subtitle:'Du versuchst, ein Bild zu bauen. Bau erst den Zusammenhang — das Bild kommt danach.' }
        : { speaker:'AGN-H3R', text:'„Du versuchst, ein Bild zu bauen. Bau erst den Zusammenhang."' } ]);
      return;
    }
    if (step === 1) {
      const a = anchorFact();
      say([ who === 'r3mi'
        ? { speaker:'R-3MI', text:`„Es gibt eine Notiz, die einfach etwas festnagelt: ${a.text} Das sind ${a.list}. Die würde ich zuerst hinlegen."` }
        : who === 'vtgm'
        ? { speaker:'V-TGM', text:'"Two fragments can fit visually and still be historically impossible side by side. Anchor the ones whose origin is certain."', subtitle:`Zwei Fragmente können optisch passen und historisch unmöglich nebeneinanderliegen. Verankere die, deren Herkunft feststeht — ${a.list}.` }
        : { speaker:'AGN-H3R', text:`„Ordne zuerst die Fragmente, deren Herkunft du sicher erkennst. ${a.name}: ${a.list}. Da hast du einen festen Punkt."` } ]);
      return;
    }
    const f = adjFact();
    say([ who === 'r3mi'
      ? { speaker:'R-3MI', text:`„Ich sag dir eine sichere Nachbarschaft: ${f.a} liegt direkt links neben ${f.b}. Den Rest machst du."` }
      : who === 'vtgm'
      ? { speaker:'V-TGM', text:`"One guaranteed adjacency: ${f.a} sits directly to the left of ${f.b}. Same level."`, subtitle:`Eine sichere Nachbarschaft: ${f.a} liegt direkt links neben ${f.b}. Gleiche Ebene.` }
      : { speaker:'AGN-H3R', text:`„Eine Nachbarschaft gebe ich dir: ${f.a} liegt direkt links neben ${f.b}. Mehr wäre gelegt statt gedacht."` } ]);
  }

  function updateHintBar() {
    const left = Math.max(0, HINT_MAX - S.hints.step);
    const c = el('hintCount');
    if (c) c.textContent = `HINWEISE: ${left} VERFÜGBAR`;
    const done = left <= 0;
    ['hintBtnR3MI', 'hintBtnVTGM'].forEach(id => { const b = el(id); if (b) b.disabled = done; });
    const g = el('hintBtnGuest');
    if (g) { g.disabled = false; g.title = done ? 'Konfliktsuche' : 'Hinweis'; }
  }
  function rebindHints() {
    [['hintBtnR3MI', 'r3mi'], ['hintBtnVTGM', 'vtgm'], ['hintBtnGuest', 'guest']].forEach(([id, who]) => {
      const b = el(id);
      if (!b) return;
      const c = b.cloneNode(true);
      b.parentNode.replaceChild(c, b);
      c.addEventListener('click', () => useHint(who));
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // CHECKPOINT — the gags and the board survive a reload
  // ═══════════════════════════════════════════════════════════════
  function save() {
    if (S.ended) return;
    try {
      GameEngine.state.set(SAVE_KEY, {
        act: S.act, presorted: S.presorted, refused: S.refused, solved: S.solved,
        boardIntroSeen: S.boardIntroSeen, prettyWrongSeen: S.prettyWrongSeen,
        placedSeen: S.placedSeen, hintStep: S.hints.step, hintsUsed: S.hintsUsed,
        inst: P && {
          frags: P.frags.map(f => [f.id, f.cls, f.fam, f.ts, f.kal]),
          sol: P.sol, masks: P.masks,
          notes: P.notes.map(k => [k.t, k.a.k, k.a.v, k.b ? k.b.k : '', k.b ? k.b.v : '']),
        },
        pos: B && { board: B.board, rot: B.rot },
      });
    } catch (_) {}
  }
  function clearSave() { try { GameEngine.state.set(SAVE_KEY, null); } catch (_) {} }

  function loadCheckpoint() {
    let d = null;
    try { d = GameEngine.state.get(SAVE_KEY); } catch (_) { return null; }
    if (!d || typeof d !== 'object') return null;
    if (typeof d.act !== 'number' || d.act < 1 || d.act > 4) return null;
    const i = d.inst;
    if (!i || !Array.isArray(i.frags) || i.frags.length !== N) return null;
    if (!Array.isArray(i.sol) || i.sol.length !== N) return null;
    if (!Array.isArray(i.masks) || i.masks.length !== N) return null;
    if (!Array.isArray(i.notes) || !i.notes.length) return null;
    const frags = i.frags.map(a => Array.isArray(a) && a.length === 5
      ? { id:a[0], cls:a[1], fam:a[2], ts:a[3], kal:a[4] } : null);
    if (frags.some(f => !f || !KLASSE[f.cls] || FAMS.indexOf(f.fam) === -1 || typeof f.ts !== 'number')) return null;
    if (new Set(i.sol).size !== N) return null;
    const notes = i.notes.map(a => Array.isArray(a) && a.length === 5
      ? { t:a[0], a:{ k:a[1], v:a[2] }, ...(a[3] ? { b:{ k:a[3], v:a[4] } } : {}) } : null);
    if (notes.some(k => !k || !k.t)) return null;
    const inst = { frags, sol: i.sol, masks: i.masks, notes };
    // fail closed: the stored instance must still be the one it claims to be
    try {
      if (!coreInside(inst.sol, frags)) return null;
      if (!notes.every(k => holds(k, inst.sol, frags))) return null;
    } catch (_) { return null; }
    let pos = null;
    if (d.pos && Array.isArray(d.pos.board) && d.pos.board.length === N
        && Array.isArray(d.pos.rot) && d.pos.rot.length === N
        && new Set(d.pos.board).size === N) {
      pos = { board: d.pos.board.slice(), rot: d.pos.rot.map(r => ((r | 0) % 4 + 4) % 4), sel: -1 };
    }
    return { d, inst, pos };
  }

  function buildInstance() {
    P = generate(400);
    if (!P) {                       // vanishingly unlikely; keep the room usable
      P = generate(2000);
    }
    B = null;
  }

  // ═══════════════════════════════════════════════════════════════
  // CHAPTER ART — an enormous workshop for repairing damaged history
  // ═══════════════════════════════════════════════════════════════
  function registerArt() {
    GameEngine.props.register({

      // the long reconstruction table: chalk outline, fragments part-laid
      c8_table: { vb:'0 0 150 120', art:
          '<ellipse class="prop-inset" cx="75" cy="114" rx="66" ry="6" opacity=".6"/>'
        + '<rect class="prop-metal" x="6" y="30" width="138" height="66" rx="3"/>'
        + '<rect class="prop-base" x="6" y="86" width="138" height="12" rx="2"/>'
        + '<rect class="prop-lite" x="6" y="30" width="138" height="3"/>'
        + '<rect class="prop-inset" x="18" y="38" width="114" height="44" rx="2"/>'
        + [0,1,2].map(r => [0,1,2,3,4,5].map(c => {
            const on = (r * 6 + c) % 5 !== 3;
            const cls = on ? ((r + c) % 3 === 0 ? 'prop-acc-dim' : 'prop-metal') : 'prop-inset';
            const dx = on ? 0 : 2;
            return `<rect class="${cls}" x="${21 + c * 18 + dx}" y="${41 + r * 14}" width="16" height="12" rx="1"/>`;
          }).join('')).join('')
        + '<path class="prop-thin" d="M18 38 h114 v44 h-114 z" opacity=".8"/>'
        + '<line class="prop-edge" x1="70" y1="41" x2="70" y2="79" opacity=".55"/>'
        + '<circle class="prop-led" cx="138" cy="92" r="2.8"/>'
        + '<rect class="prop-base" x="14" y="98" width="10" height="16"/><rect class="prop-base" x="126" y="98" width="10" height="16"/>' },

      // the shelf you can walk up to: files, some of them torn open
      c8_shelf: { vb:'0 0 92 132', art:
          '<rect class="prop-base" x="4" y="2" width="84" height="126"/>'
        + [0,1,2,3].map(r => `<rect class="prop-metal" x="4" y="${28 + r * 28}" width="84" height="4"/>`).join('')
        + [0,1,2,3].map(r => [0,1,2,3,4].map(c => {
            const h = 12 + ((r * 5 + c) % 4) * 4;
            const cls = ['prop-acc-dim', 'prop-lite', 'prop-inset'][(r + c) % 3];
            const w = 8 + ((c + r) % 2) * 3;
            const lean = (r * 5 + c) % 7 === 0 ? ' transform="rotate(9 ' + (12 + c * 15) + ' ' + (28 + r * 28) + ')"' : '';
            return `<rect class="${cls}" x="${10 + c * 15}" y="${28 + r * 28 - h}" width="${w}" height="${h}"${lean}/>`;
          }).join('')).join('')
        + '<rect class="prop-inset" x="4" y="120" width="84" height="8"/>'
        + '<rect class="prop-acc-dim" x="12" y="122" width="22" height="4"/>' },

      // the cataloguing machine: reading drum, carriage, card tray
      c8_katalog: { vb:'0 0 120 100', art:
          '<ellipse class="prop-inset" cx="60" cy="94" rx="48" ry="5" opacity=".6"/>'
        + '<rect class="prop-base" x="8" y="14" width="104" height="72" rx="3"/>'
        + '<rect class="prop-lite" x="12" y="18" width="96" height="3"/>'
        + '<circle class="prop-metal" cx="42" cy="48" r="20"/><circle class="prop-inset" cx="42" cy="48" r="13"/>'
        + [0,45,90,135].map(a => {
            const t = a * Math.PI / 180;
            return `<line class="prop-thin" x1="${(42 - Math.cos(t) * 19).toFixed(1)}" y1="${(48 - Math.sin(t) * 19).toFixed(1)}" x2="${(42 + Math.cos(t) * 19).toFixed(1)}" y2="${(48 + Math.sin(t) * 19).toFixed(1)}"/>`;
          }).join('')
        + '<circle class="prop-acc" cx="42" cy="48" r="3.2"/>'
        + '<rect class="prop-metal" x="70" y="26" width="34" height="6" rx="2"/>'
        + '<rect class="prop-screen" x="70" y="38" width="34" height="20"/>'
        + '<line class="prop-scan" x1="73" y1="44" x2="101" y2="44"/><line class="prop-scan" x1="73" y1="50" x2="94" y2="50"/>'
        + [0,1,2,3].map(i => `<rect class="prop-lite" x="${70 + i * 9}" y="${66 - i}" width="7" height="${12 + i}"/>`).join('')
        + '<circle class="prop-led prop-led-2" cx="105" cy="80" r="2.6"/>' },

      // the archive arm: rail, shoulder, four fine grippers
      c8_arm: { vb:'0 0 110 130', art:
          '<rect class="prop-base" x="2" y="4" width="106" height="9" rx="2"/>'
        + '<rect class="prop-lite" x="6" y="6" width="98" height="2"/>'
        + '<rect class="prop-metal" x="44" y="12" width="20" height="14" rx="2"/>'
        + '<path class="prop-edge" d="M54 26 L54 56" opacity=".8"/>'
        + '<rect class="prop-metal" x="48" y="54" width="14" height="30" rx="3"/>'
        + '<path class="prop-edge" d="M55 84 L34 106 M55 84 L48 110 M55 84 L62 110 M55 84 L76 106" opacity=".85"/>'
        + [[34,106],[48,110],[62,110],[76,106]].map(([x, y]) =>
            `<circle class="prop-lite" cx="${x}" cy="${y}" r="4"/><line class="prop-thin" x1="${x}" y1="${y}" x2="${x}" y2="${y + 8}"/>`).join('')
        + '<circle class="prop-eye" cx="55" cy="66" r="3.4"/>'
        + [0,1,2,3,4,5].map(i => `<line class="prop-thin" x1="${14 + i * 16}" y1="4" x2="${14 + i * 16}" y2="13" opacity=".6"/>`).join('') },

      // background shelving that runs past the light
      c8_stack: { vb:'0 0 70 200', art:
          '<rect class="prop-base" x="4" y="0" width="62" height="198"/>'
        + [0,1,2,3,4,5,6].map(r => `<rect class="prop-inset" x="4" y="${26 * r + 22}" width="62" height="4"/>`).join('')
        + [0,1,2,3,4,5,6].map(r => [0,1,2,3].map(c => {
            const h = 10 + ((r * 4 + c) % 3) * 5;
            return `<rect class="prop-metal" x="${8 + c * 14}" y="${26 * r + 22 - h}" width="${9 + (c % 2) * 2}" height="${h}" opacity="${(0.75 - r * 0.07).toFixed(2)}"/>`;
          }).join('')).join('') },

      // a work lamp over the table
      c8_lamp: { vb:'0 0 100 60', art:
          '<line class="prop-thin" x1="50" y1="0" x2="50" y2="12"/>'
        + '<path class="prop-base" d="M22 34 L38 12 h24 l16 22 z"/>'
        + '<rect class="prop-lite" x="24" y="32" width="52" height="4"/>'
        + '<ellipse class="prop-glow" cx="50" cy="46" rx="34" ry="12"/>' },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // ARRIVAL
  // ═══════════════════════════════════════════════════════════════
  function begin() {
    if (S.solved) { returning(); return; }
    if (S.presorted) { midway(); return; }
    CH.setScene('archive-work');
    CH.showRobots(true);
    CH.showGuest(true);
    try { GameEngine.achievements.unlock('all_guests'); } catch (_) {}
    say([
      { speaker:'SYSTEM', text:'SEKTOR 08 — ARCHIVSEKTOR. REKONSTRUKTIONSSTATUS: UNVOLLSTÄNDIG.' },
      { speaker:'SYSTEM', text:'Kein Empfangsraum, keine Begrüßung. Eine Halle voller Regale, ein Sortierschlitten, der ohne Pause Karten auswirft, und ganz vorn ein Tisch mit einer Lampe darüber. Dort sitzt jemand und arbeitet schon, seit ihr die Tür aufgemacht habt.' },
      { speaker:'AGN-H3R', text:'„Servus."' },
      { speaker:'R-3MI',  text:'„…das war angenehm normal."' },
      { speaker:'V-TGM',  text:'"Give it a minute."', subtitle:'Wart’s ab.' },
      { speaker:'AGN-H3R', text:'„Ihr seid die, die den Rest wieder zum Laufen gebracht haben. Sieben Sektoren. Ich hab die Meldungen abgelegt, während ihr das gemacht habt."' },
      { speaker:'R-3MI',  text:'„Er hat unsere Meldungen ABGELEGT."' },
      { speaker:'AGN-H3R', text:'„Was denn sonst damit."' },
      { speaker:'AGN-H3R', text:'„Ich bin Rekonstruktionsarchivar. Ich lagere nichts. Ich baue aus Resten wieder Akten. Wenn ihr Zeit habt: die zehnte liegt drüben und kommt allein nicht weiter."' },
    ], () => { S.act = 2; save(); loadRoom(); });
  }

  function midway() {
    CH.setScene('archive-work');
    CH.showRobots(true);
    CH.showGuest(true);
    try { GameEngine.achievements.unlock('all_guests'); } catch (_) {}
    say([
      { speaker:'AGN-H3R', text:'„Da seid ihr wieder. Der Tisch ist, wie ihr ihn verlassen habt. Zwölf Gruppen, vier Ebenen."' },
    ], loadRoom);
  }

  function returning() {
    CH.setScene('archive-full');
    CH.showRobots(true);
    CH.showGuest(true);
    say([
      { speaker:'SYSTEM', text:'SEKTOR 08 — ARCHIVSEKTOR. REKONSTRUKTIONSSTATUS: ABGESCHLOSSEN.' },
      { speaker:'AGN-H3R', text:'„Gute Arbeit. Das Bild hält."' },
      { speaker:'AGN-H3R', text:'„Der Tisch zeigt euch die Zieldaten, so oft ihr wollt. Ihr müsst dafür nichts noch einmal legen."' },
    ], loadRoom);
  }

  // ═══════════════════════════════════════════════════════════════
  // BUILD + INIT
  // ═══════════════════════════════════════════════════════════════
  function buildChapter() {
    CH.build({
      title: 'KA-II // Kapitel 8 — Archivsektor',
      num: '08',
      sector: 'ARCHIVSEKTOR',
      reactPct: S.solved ? 100 : 96,
      name: 'Archivsektor',
      subline: '„Ein Fragment ist noch kein Zusammenhang."',
      emblemDeco: '<div class="ch8-grid"><i></i><i></i><i></i><i></i></div>',
      scene: { ph: 'archive-work' },
      guest: { key: 'agn', name: 'AGN-H3R' },
      modals: ['rkModal'],
      completeId: CHAPTER_ID,
      completeAch: 'ch8_complete',
      next: { title: 'REAKTIVIERUNG: 100 %', label: 'ALLE REGULÄREN SEKTOREN ONLINE',
              href: '../index.html', enter: 'ZURÜCK ZUM TERMINAL' },
      onStart: begin,
      onRobot: clickRobot,
    });
  }

  function init() {
    registerArt();
    if (!GameEngine.state.isChapterComplete('ch7') && !GameEngine.state.isChapterComplete(CHAPTER_ID)) {
      location.replace('../chapter7/chapter7.html');
      return;
    }
    const done = GameEngine.state.isChapterComplete(CHAPTER_ID);
    const cp = loadCheckpoint();
    if (done) {
      S.solved = true; S.presorted = true; S.act = 4; S.ended = true;
      try { S.ziel = GameEngine.state.get('zieldaten_text') || ''; } catch (_) {}
      clearSave();
    } else if (cp) {
      const d = cp.d;
      S.act = d.act; S.presorted = !!d.presorted; S.refused = !!d.refused;
      S.boardIntroSeen = !!d.boardIntroSeen; S.prettyWrongSeen = !!d.prettyWrongSeen;
      S.placedSeen = !!d.placedSeen;
      S.hints.step = Math.max(0, Math.min(HINT_MAX, d.hintStep | 0));
      S.hintsUsed = Math.max(0, d.hintsUsed | 0);
      P = cp.inst;
      if (cp.pos) B = cp.pos;
      if (B && isSolved()) B = null;      // never resume already-finished
      if (!B) scramble();
    }
    buildChapter();
    rebindHints();
    CH.showHintBar(false);
    el('rkBoard').addEventListener('click', onBoardClick);
    el('rkActions').addEventListener('click', onActionClick);
    el('rkSheet').addEventListener('click', onSheetClick);
    CH.start();
  }

  function onSheetClick(ev) {
    const btn = ev.target.closest && ev.target.closest('[data-act]');
    if (btn) {
      if (btn.dataset.act === 'sheet-close') { closeSheet(); return; }
      if (btn.dataset.act === 'signals') { try { GameEngine.signals.showOverlay(); } catch (_) {} return; }
    }
    if (ev.target.classList && ev.target.classList.contains('rk-sheet-scrim')) closeSheet();
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', () => Chapter8.init());
