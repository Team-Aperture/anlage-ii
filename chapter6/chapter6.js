/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 06 — SEKTOR 06 // VERSUCHSKAMMER
 * Guest: ASP-1024 — VERSUCHSEINHEIT / SYSTEMANALYST. Analytical, calm,
 *        direct, dryly funny. When something is unknown, ASP runs it.
 *        Not because being first matters — because testing is how you
 *        find out.
 *
 * ÄNDERE EINE SACHE. SCHAU, WAS SICH MITÄNDERT.
 *
 * The chapter is ONE continuous experiment on a sealed machine. The
 * player never sees inside it and never needs to:
 *
 *   DIAGNOSESTUFE 1  the archive shows clean runs. A simple rearrangement
 *                    explains them. Predict one unseen output.
 *   DIAGNOSESTUFE 2  one archived run never fitted, and fresh diagnostics
 *                    agree with it. The machine is not inconsistent — the
 *                    model was missing a variable.
 *   ABSCHLUSS        predict two unseen outputs, one from each branch.
 *
 * The transformation is generated per playthrough from a curated family
 * and validated before use: it must be behaviourally distinct from every
 * other candidate, its condition must fire often enough to be findable,
 * and both branches must actually disagree. The rule persists, so a
 * reload never invalidates recorded tests.
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter6 = (() => {
  'use strict';

  const CH         = GameEngine.chapter;
  const CHAPTER_ID = 'ch6';
  const SAVE_KEY   = 'ch6_progress';
  const HINT_MAX   = 3;
  const SERIES     = '1024';

  // ── Symbols. Two visible classes, each symbol individually distinct,
  //    every one carries a text name — nothing here is colour-coded.
  const SYMS = [
    { g:'▲', name:'DREIECK', cls:'eckig' },
    { g:'■', name:'QUADRAT', cls:'eckig' },
    { g:'◆', name:'RAUTE',   cls:'eckig' },
    { g:'○', name:'KREIS',   cls:'rund'  },
    { g:'◎', name:'RING',    cls:'rund'  },
    { g:'●', name:'PUNKT',   cls:'rund'  },
  ];
  const N_SYM = SYMS.length;
  const isRound = i => i >= 3;

  // ── Rule families. out[k] = in[perm[k]].
  const PERMS = { pa:[1,2,0], pb:[2,0,1], pc:[2,1,0], pd:[1,0,2], pe:[0,2,1] };
  const PERM_KEYS = Object.keys(PERMS);

  const CONDS = {
    ca: x => new Set(x).size < 3,
    cb: x => isRound(x[0]),
    cc: x => isRound(x[2]),
    cd: x => x.filter(isRound).length % 2 === 1,
    ce: x => x.filter(isRound).length >= 2,
  };
  const COND_KEYS = Object.keys(CONDS);

  function applyPerm(x, p) { return [x[p[0]], x[p[1]], x[p[2]]]; }
  function evalRule(x, r) {
    const base = applyPerm(x, PERMS[r.p1]);
    return CONDS[r.cond](x) ? applyPerm(base, PERMS[r.p2]) : base;
  }

  const ALL_INPUTS = (() => {
    const out = [];
    for (let a = 0; a < N_SYM; a++) for (let b = 0; b < N_SYM; b++) for (let c = 0; c < N_SYM; c++) out.push([a,b,c]);
    return out;
  })();

  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const S = {
    rule: null,
    archive: [],        // pre-existing records incl. the one that never fitted
    tests: [],          // everything run during this playthrough
    phase: 1,
    metAsp: false,
    predictInput: null,
    finalInputs: null,
    sigFound: false,
    anomalySeen: false,
    solved: false,
    ended: false,
    wildRuns: 0,
    seen: {},
    talkSeen: {},
    hints: { active:null, step:0 },
    coach: 0,
    excuse: 0,
  };

  let openModal = null;   // 'bb' | 'vp' | null
  let bbMode = 'test';    // 'test' | 'predict' | 'final'
  let draft = [0,1,3];    // current input under the player's hand
  let lastRun = null;
  let predictOut = [0,0,0];
  let finalOut = [[0,0,0],[0,0,0]];
  let compare = [];       // selected protocol rows
  let timers = [];

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════
  function el(id) { return document.getElementById(id); }
  function playSound(src) { try { GameEngine.audio.sfx(src); } catch (_) {} }
  function tone(o)        { try { GameEngine.audio.tone(o); } catch (_) {} }
  function say(lines, after) { GameEngine.dialogue.load(lines, after); }
  function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [r[i],r[j]] = [r[j],r[i]]; }
    return r;
  }
  function sameSeq(a, b) { return a.length === b.length && a.every((v,i) => v === b[i]); }
  function bump(k) { S.seen[k] = (S.seen[k] || 0) + 1; return S.seen[k]; }
  function distinct(x) { return new Set(x).size === 3; }

  function dialogueBusy() {
    const c = document.querySelector('.dlg-container');
    return !!(c && c.classList.contains('visible'));
  }
  /** A tap in the scene advances running dialogue instead of starting a new
   *  interaction underneath it — the engine keeps one completion callback. */
  function guarded(fn) {
    return (...a) => {
      if (dialogueBusy()) { try { GameEngine.dialogue.advance(); } catch (_) {} return; }
      return fn(...a);
    };
  }
  function addHotspot(cfg) { return CH.addHotspot({ ...cfg, fn: guarded(cfg.fn) }); }

  // ═══════════════════════════════════════════════════════════════
  // RULE GENERATION + VALIDATION
  // The generator never ships an instance it has not proved solvable:
  // behaviourally unique among all candidates, condition findable, both
  // branches genuinely different.
  // ═══════════════════════════════════════════════════════════════
  function behaviour(r) {
    return ALL_INPUTS.map(x => evalRule(x, r).join('')).join('|');
  }

  function candidateSet() {
    const out = [];
    PERM_KEYS.forEach(p1 => COND_KEYS.forEach(cond => PERM_KEYS.forEach(p2 => out.push({ p1, cond, p2 }))));
    return out;
  }

  function ruleUsable(r, sigs) {
    const fires = ALL_INPUTS.filter(x => CONDS[r.cond](x));
    const rate  = fires.length / ALL_INPUTS.length;
    if (rate < 0.2 || rate > 0.8) return false;               // findable, not omnipresent
    // when the condition fires the two branches must visibly disagree
    const differ = fires.filter(x => !sameSeq(applyPerm(x, PERMS[r.p1]), evalRule(x, r)));
    if (differ.length / fires.length < 0.6) return false;
    // and no other candidate may behave identically on every reachable input
    const mine = behaviour(r);
    return sigs.filter(s => s === mine).length === 1;
  }

  /** How many rules in the family still explain everything shown so far?
   *  The chapter is only worth playing while this is greater than one. */
  function stillOpen(rows, cands) {
    return (cands || candidateSet()).filter(c => rows.every(r => sameSeq(evalRule(r.inp, c), r.out)));
  }

  function buildRule() {
    const cands = candidateSet();
    const sigs = cands.map(behaviour);
    const order = shuffle(cands.map((c, i) => i));
    for (const i of order) {
      if (ruleUsable(cands[i], sigs)) return cands[i];
    }
    return null;
  }

  // ── sample pickers ───────────────────────────────────────────
  function inputsWhere(fn) { return ALL_INPUTS.filter(fn); }
  function freshInput(fn, used) {
    const all = inputsWhere(fn);
    if (!all.length) return pick(ALL_INPUTS);          // predicate satisfied by nothing
    const pool = all.filter(x => !used.some(u => sameSeq(u, x)));
    return pick(pool.length ? pool : all);
  }
  function usedInputs() {
    return S.archive.filter(a => !a.foreign).map(a => a.inp)
      .concat(S.tests.map(t => t.inp))
      .concat(S.predictInput ? [S.predictInput] : [])
      .concat(S.finalInputs || []);
  }

  const ARCHIVE_CLEAN = 4;    // enough to pin the rearrangement, not the condition
  const MIN_OPEN_ARCHIVE = 4;  // rules still standing once the archive is read
  const MIN_OPEN_DIAG    = 3;  // …and once the stage-2 diagnostic has run

  function buildArchive(rule) {
    const r = rule;
    const cands = candidateSet();
    const cleanPool = ALL_INPUTS.filter(x => !CONDS[r.cond](x) && distinct(x));
    const firePool  = ALL_INPUTS.filter(x => CONDS[r.cond](x)
                        && !sameSeq(applyPerm(x, PERMS[r.p1]), evalRule(x, r)));
    const nums = ['04', '07', '12', '23'];

    let clean = shuffle(cleanPool).slice(0, ARCHIVE_CLEAN);
    let odd   = pick(firePool);
    for (let t = 0; t < 300; t++) {
      const c = shuffle(cleanPool).slice(0, ARCHIVE_CLEAN);
      const o = pick(firePool);
      // stage 1 must stay fair: the rearrangement alone explains the clean
      // runs and exactly one rearrangement does
      const fits = PERM_KEYS.filter(pk => c.every(x => sameSeq(applyPerm(x, PERMS[pk]), evalRule(x, r))));
      if (fits.length !== 1) continue;
      const shown = c.concat([o]).map(x => ({ inp:x, out:evalRule(x, r) }));
      if (stillOpen(shown, cands).length < MIN_OPEN_ARCHIVE) continue;
      clean = c; odd = o;
      break;
    }

    const used = clean.slice();
    const rows = clean.map((x, i) => ({ n: `${SERIES}-${nums[i]}`, inp: x, out: evalRule(x, r) }));
    // the run that never fitted — present from the start, set aside, not hidden
    used.push(odd);
    rows.push({ n: `${SERIES}-31`, inp: odd, out: evalRule(odd, r), odd: true });

    // ── the record that is not ASP's at all: its output carries a symbol the
    //    input never contained, so it cannot be any rearrangement
    const fx = freshInput(distinct, used);
    const missing = [0,1,2,3,4,5].filter(s => !fx.includes(s));
    const fout = applyPerm(fx, PERMS[pick(PERM_KEYS)]).slice();
    fout[randInt(0,2)] = pick(missing);
    rows.push({ n: `${SERIES}-???`, inp: fx, out: fout, foreign: true });

    return shuffle(rows.slice(0, ARCHIVE_CLEAN)).concat(rows.slice(ARCHIVE_CLEAN));
  }

  // ═══════════════════════════════════════════════════════════════
  // CHECKPOINT — the rule must survive a reload or the log is worthless
  // ═══════════════════════════════════════════════════════════════
  function save() {
    try {
      GameEngine.state.set(SAVE_KEY, {
        rule: S.rule, archive: S.archive, tests: S.tests, phase: S.phase,
        metAsp: S.metAsp, predictInput: S.predictInput, finalInputs: S.finalInputs,
        sigFound: S.sigFound, anomalySeen: S.anomalySeen, wildRuns: S.wildRuns,
      });
    } catch (_) {}
  }
  function clearSave() { try { GameEngine.state.set(SAVE_KEY, null); } catch (_) {} }

  function loadCheckpoint() {
    let d = null;
    try { d = GameEngine.state.get(SAVE_KEY); } catch (_) { return null; }
    if (!d || typeof d !== 'object') return null;
    const r = d.rule;
    // Fail closed: an unrecognised rule means a fresh experiment, never a
    // half-restored one whose recorded outputs no longer mean anything.
    if (!r || !PERMS[r.p1] || !CONDS[r.cond] || !PERMS[r.p2]) return null;
    if (!Array.isArray(d.archive) || !d.archive.length) return null;
    const okRow = t => t && Array.isArray(t.inp) && Array.isArray(t.out)
                    && t.inp.length === 3 && t.out.length === 3
                    && t.inp.every(v => v >= 0 && v < N_SYM) && t.out.every(v => v >= 0 && v < N_SYM);
    if (!d.archive.every(okRow)) return null;
    if (!Array.isArray(d.tests) || !d.tests.every(okRow)) return null;
    return d;
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST RUNS
  // ═══════════════════════════════════════════════════════════════
  function nextNum() {
    return `${SERIES}-${String(32 + S.tests.length).padStart(2, '0')}`;
  }
  function runTest(inp, tag) {
    const out = evalRule(inp, S.rule);
    const rec = { n: nextNum(), inp: inp.slice(), out, tag: tag || '' };
    S.tests.push(rec);
    save();
    return rec;
  }
  function allRows() { return S.archive.concat(S.tests); }

  /** Inputs the chamber is currently asking the player to predict. Running
   *  one of these would answer the question instead of testing a model. */
  function lockedInputs() {
    const out = [];
    if (S.predictInput) out.push(S.predictInput);
    if (S.finalInputs) out.push(...S.finalInputs);
    return out;
  }
  function isLocked(x) { return lockedInputs().some(u => sameSeq(u, x)); }

  // ═══════════════════════════════════════════════════════════════
  // ROOM
  // ═══════════════════════════════════════════════════════════════
  function loadRoom() {
    CH.setScene(S.solved ? 'lab-stable' : 'lab-dim');
    CH.clearHotspots();
    CH.showRobots(true);
    CH.showGuest(S.metAsp);

    CH.addProp({ prop:'duct',     x:14, y:0,  w:56, h:6, cls:'prop-far' });
    CH.addProp({ prop:'cables',   x:70, y:2,  w:9,  h:24, cls:'prop-far' });
    CH.addProp({ prop:'pipe',     x:2,  y:14, w:6,  h:48, cls:'prop-far' });
    CH.addProp({ prop:'crate',    x:86, y:70, w:12, h:14 });
    CH.addProp({ prop:'barrel',   x:4,  y:68, w:8,  h:14 });

    addHotspot({ prop:'reactor', cls:'prop-guest hs-bb' + (S.solved ? ' hs-stable' : ''),
      x:41, y:32, w:19, h:25,
      label: S.solved ? 'BLACKBOX · MODELL BESTÄTIGT' : 'BLACKBOX',
      aria:'Blackbox bedienen', fn:() => openBlackbox() });
    addHotspot({ prop:'monitors', x:66, y:28, w:18, h:16,
      label:'VERSUCHSARCHIV', aria:'Versuchsprotokoll öffnen', fn:() => openProtocol() });
    addHotspot({ prop:'console', x:10, y:36, w:18, h:18,
      label:'WERKBANK', aria:'ASPs Werkbank ansehen', fn:() => examine('bench') });
    addHotspot({ prop:'shelf', x:30, y:58, w:11, h:26,
      label:'KARTUSCHENFACH', aria:'Testkartuschen ansehen', fn:() => examine('cart') });
    addHotspot({ prop:'panel', x:74, y:52, w:14, h:14,
      label:'DIAGNOSERACK', aria:'Diagnoserack ansehen', fn:() => examine('rack') });

    if (S.solved) {
      addHotspot({ prop:'door', x:44, y:60, w:13, h:34,
        label:'SEKTOR 07', aria:'Sektor 07 betreten', fn:() => finishChapter() });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // OPENING — the experiment is already running
  // ═══════════════════════════════════════════════════════════════
  function begin() {
    const d = loadCheckpoint();
    if (d) {
      S.rule = d.rule; S.archive = d.archive; S.tests = d.tests;
      S.phase = (d.phase === 2 ? 2 : 1);
      S.metAsp = !!d.metAsp; S.predictInput = d.predictInput || null;
      S.finalInputs = Array.isArray(d.finalInputs) ? d.finalInputs : null;
      S.sigFound = !!d.sigFound; S.anomalySeen = !!d.anomalySeen; S.wildRuns = +d.wildRuns || 0;
      loadRoom();
      say([
        { speaker:'SYSTEM', text:`VERSUCHSREIHE ${SERIES} // PROTOKOLL WIEDERHERGESTELLT.` },
        { speaker:'ASP-1024', text:'„Moin."' },
        { speaker:'R-3MI',  text:'„Wir waren nur kurz weg."' },
        { speaker:'ASP-1024', text:'„Die Daten auch nicht."' },
      ]);
      return;
    }

    S.rule = buildRule();
    if (!S.rule) {                       // never observed; the family is small
      S.rule = { p1:'pa', cond:'ca', p2:'pc' };
    }
    S.archive = buildArchive(S.rule);
    save();
    loadRoom();

    try { GameEngine.music.play('ch6_ambient'); } catch (_) {}
    say([
      { speaker:'SYSTEM', text:'SEKTOR 06 — VERSUCHSKAMMER. Dunkles Glas, Instrumententafeln, ein Raum voller Geräte, die alle exakt so viel Licht abgeben, wie sie zum Ablesen brauchen. Es ist sehr ruhig hier.' },
      { speaker:'SYSTEM', text:'VERSUCH 1024-31' },
      { speaker:'SYSTEM', text:'STATUS: LAUFEND' },
      { speaker:'SYSTEM', text:'In der Mitte steht ein versiegelter schwarzer Kasten. Er summt. An einem Pult davor steht eine Einheit und tippt eine Eingabe.' },
      { speaker:'R-3MI',  text:'„Was macht er?"' },
      { speaker:'SYSTEM', text:'Die Einheit drückt eine Taste.' },
      { speaker:'SYSTEM', text:'*K-THUNK.*' },
      { speaker:'SYSTEM', text:'VERSUCH 1024-31 ABGESCHLOSSEN. ERGEBNIS: UNERWARTET.' },
      { speaker:'ASP-1024', text:'„Deshalb."' },
      { speaker:'R-3MI',  text:'„Deshalb WAS?"' },
      { speaker:'ASP-1024', text:'„Teste ich."' },
    ], meetAsp);
  }

  function meetAsp() {
    S.metAsp = true;
    save();
    CH.showGuest(true);
    playSound('ch6_asp.mp3');
    say([
      { speaker:'SYSTEM', text:'Die Einheit sieht kurz herüber.' },
      { speaker:'ASP-1024', text:'„Moin."' },
      { speaker:'R-3MI',  text:'„Moin?"' },
      { speaker:'ASP-1024', text:'„Moin."' },
      { speaker:'V-TGM',  text:'"That seems sufficient."', subtitle:'Das scheint zu genügen.' },
      { speaker:'SYSTEM', text:'ASP-1024. VERSUCHSEINHEIT. Am Pult liegen Prüfkabel, ein Notizblock ohne Notizen und drei Tassen.' },
      { speaker:'R-3MI',  text:'„Was ist das für ein Kasten?"' },
      { speaker:'ASP-1024', text:'„Weiß ich nicht."' },
      { speaker:'R-3MI',  text:'„…und was macht er?"' },
      { speaker:'ASP-1024', text:'„Genau das finden wir raus."' },
      { speaker:'SYSTEM', text:'Er schiebt euch das Pult ein Stück zu.' },
      { speaker:'ASP-1024', text:'„Du gibst was rein. Er gibt was raus. Der Rest ist Arbeit."' },
      { speaker:'ASP-1024', text:'„Im Archiv liegen ein paar Läufe von vorhin. Einer passt nicht zu den anderen. Den lassen wir erst mal liegen."' },
    ]);
  }

  // ═══════════════════════════════════════════════════════════════
  // BLACKBOX PANEL
  // ═══════════════════════════════════════════════════════════════
  function symBtn(idx, act, extra) {
    const s = SYMS[idx];
    return `<button class="bb-sym ${extra || ''}" data-act="${act}" aria-label="${s.name} (${s.cls})">
        <span class="bb-glyph">${s.g}</span><span class="bb-name sys-text">${s.name}</span>
      </button>`;
  }
  function symRow(seq, act, cls) {
    return `<div class="bb-row ${cls || ''}">` + seq.map((v, i) => {
      const s = SYMS[v];
      return `<button class="bb-slot" data-act="${act}" data-i="${i}"
                 aria-label="Stelle ${i+1}: ${s.name} (${s.cls}) — antippen zum Weiterschalten">
          <span class="bb-pos sys-text">${i+1}</span>
          <span class="bb-glyph">${s.g}</span>
          <span class="bb-name sys-text">${s.name}</span>
        </button>`;
    }).join('') + `</div>`;
  }
  function symStatic(seq, cls) {
    return `<div class="bb-row ${cls || ''}">` + seq.map((v, i) => {
      const s = SYMS[v];
      return `<div class="bb-slot fixed" aria-label="Stelle ${i+1}: ${s.name}">
          <span class="bb-pos sys-text">${i+1}</span>
          <span class="bb-glyph">${s.g}</span>
          <span class="bb-name sys-text">${s.name}</span>
        </div>`;
    }).join('') + `</div>`;
  }

  function renderBlackbox() {
    if (bbMode === 'predict') {
      return `
        <p class="bb-task sys-text">DIAGNOSESTUFE 1 — PROGNOSE</p>
        <p class="bb-note">Die Kammer gibt eine Eingabe vor, die noch nicht gelaufen ist. Stell die Ausgabe ein, die du erwartest.</p>
        <p class="bb-cap sys-text">EINGABE</p>
        ${symStatic(S.predictInput, 'in')}
        <div class="bb-arrow" aria-hidden="true">▼</div>
        <p class="bb-cap sys-text">DEINE PROGNOSE</p>
        ${symRow(predictOut, 'p-slot', 'out')}`;
    }
    if (bbMode === 'final') {
      return `
        <p class="bb-task sys-text">ABSCHLUSSVALIDIERUNG</p>
        <p class="bb-note">Zwei Eingaben, beide neu. Stell beide Ausgaben ein.</p>
        ${[0,1].map(k => `
          <div class="bb-final-block">
            <p class="bb-cap sys-text">EINGABE ${k+1}</p>
            ${symStatic(S.finalInputs[k], 'in')}
            <div class="bb-arrow" aria-hidden="true">▼</div>
            <p class="bb-cap sys-text">PROGNOSE ${k+1}</p>
            ${symRow(finalOut[k], 'f-slot-' + k, 'out')}
          </div>`).join('')}`;
    }

    const lr = lastRun
      ? `<p class="bb-cap sys-text">AUSGABE · ${lastRun.n}</p>${symStatic(lastRun.out, 'out')}`
      : `<p class="bb-cap sys-text">AUSGABE</p><div class="bb-row out bb-empty"><span class="sys-text">NOCH KEIN LAUF</span></div>`;

    const hypo = S.phase >= 2 ? `
      <div class="bb-hypo">
        <p class="bb-cap sys-text">KONTROLLVERSUCH — WAS SOLL SICH UNTERSCHEIDEN?</p>
        <div class="bb-hypo-row">
          <button class="bb-hbtn" data-act="hyp" data-k="order">[ REIHENFOLGE ]</button>
          <button class="bb-hbtn" data-act="hyp" data-k="kind">[ SYMBOLART ]</button>
          <button class="bb-hbtn" data-act="hyp" data-k="dupe">[ DOPPELUNG ]</button>
          <button class="bb-hbtn" data-act="hyp" data-k="count">[ ANZAHL RUNDER ]</button>
        </div>
        <p class="bb-hypo-note">Die Kammer fährt zwei Läufe, die sich nur darin unterscheiden.</p>
      </div>` : '';

    return `
      <p class="bb-task sys-text">DIAGNOSESTUFE ${S.phase} — FREIER VERSUCH</p>
      <p class="bb-cap sys-text">EINGABE — ANTIPPEN SCHALTET WEITER</p>
      ${symRow(draft, 'd-slot', 'in')}
      <div class="bb-inline">
        <button class="ka-btn small" data-act="rand">[ ZUFALLSEINGABE ]</button>
      </div>
      <div class="bb-arrow" aria-hidden="true">▼</div>
      ${lr}
      ${hypo}`;
  }

  function bbActions() {
    if (bbMode === 'predict') {
      return `<button class="ka-btn primary" data-act="p-commit">[ PROGNOSE BESTÄTIGEN ]</button>
              <button class="ka-btn small" data-act="p-cancel">[ ZURÜCK ZUM VERSUCH ]</button>`;
    }
    if (bbMode === 'final') {
      return `<button class="ka-btn primary" data-act="f-commit">[ MODELL EINREICHEN ]</button>
              <button class="ka-btn small" data-act="p-cancel">[ ZURÜCK ZUM VERSUCH ]</button>`;
    }
    const gate = S.phase === 1
      ? `<button class="ka-btn small" data-act="p-open">[ PROGNOSE ]</button>`
      : `<button class="ka-btn small" data-act="f-open">[ MODELL BESTÄTIGEN ]</button>`;
    return `<button class="ka-btn primary" data-act="run">[ TESTLAUF ]</button>
            <button class="ka-btn small" data-act="proto">[ PROTOKOLL ]</button>
            ${gate}
            <button class="ka-btn small" data-act="close">[ ZURÜCK ]</button>`;
  }

  function openBlackbox() {
    if (S.solved) { finishChapter(); return; }
    if (openModal === 'vp') closeModal();
    openModal = 'bb';
    bbMode = 'test';
    S.hints.active = 'phase' + S.phase;
    S.hints.step = 0;
    updateHintBar();
    CH.showHintBar(true);
    el('bbModal').classList.remove('hidden');
    renderBB();
    if (bump('bb') === 1) {
      say([
        { speaker:'SYSTEM', text:'Das Pult nimmt drei Zeichen an. Der Kasten gibt drei zurück. Mehr Bedienelemente gibt es nicht.' },
        { speaker:'R-3MI',  text:'„Kann man die nicht einfach aufschrauben?"' },
        { speaker:'ASP-1024', text:'„Kann man."' },
        { speaker:'R-3MI',  text:'„Und?"' },
        { speaker:'ASP-1024', text:'„Dann testen wir nicht mehr die Blackbox."' },
        { speaker:'V-TGM',  text:'"He has a point."', subtitle:'Er hat recht.' },
      ]);
    }
  }

  function renderBB() {
    if (openModal !== 'bb') return;
    el('bbTitle').textContent = bbMode === 'final' ? 'ABSCHLUSS' : 'DIE BLACKBOX';
    el('bbSub').textContent   = bbMode === 'test' ? 'EINGABE → AUSGABE' : 'VORHERSAGE';
    el('bbBody').innerHTML    = renderBlackbox();
    el('bbActions').innerHTML = bbActions();
  }

  function closeModal() {
    clearTimers();
    openModal = null;
    S.hints.active = null;
    el('bbModal')?.classList.add('hidden');
    el('vpModal')?.classList.add('hidden');
    CH.showHintBar(false);
  }

  function setStatus(id, text, type) {
    const s = el(id);
    if (!s) return;
    s.textContent = text;
    s.className = 'puzzle-status sys-text' + (type ? ' ' + type : '');
  }

  // ═══════════════════════════════════════════════════════════════
  // VERSUCHSPROTOKOLL — a data table, with a compare mode
  // ═══════════════════════════════════════════════════════════════
  function rowHTML(r, idx) {
    const seq = s => s.map(v => `<span class="vp-sym" title="${SYMS[v].name}">${SYMS[v].g}</span>`).join('');
    const io  = `<span class="vp-n sys-text">${r.n}</span>
        <span class="vp-io">${seq(r.inp)}<span class="vp-to">→</span>${seq(r.out)}</span>`;
    const label = `Versuch ${r.n}: Eingabe ${r.inp.map(v=>SYMS[v].name).join(', ')} — Ausgabe ${r.out.map(v=>SYMS[v].name).join(', ')}`;

    if (r.foreign) {
      // not a row you model against, so not a row you select for comparison
      return `<div class="vp-row foreign" aria-label="${label} — Quelle unbekannt">
          ${io}
          <span class="vp-flag bad">QUELLE: UNBEKANNT · CHECKSUM: FEHLER</span>
          <button class="vp-inspect" data-act="vp-sig" aria-label="Fremden Datensatz prüfen">[ PRÜFEN ]</button>
        </div>`;
    }
    const sel  = compare.includes(idx);
    const flag = r.odd ? `<span class="vp-flag warn">ERGEBNIS: UNERWARTET</span>`
               : r.tag ? `<span class="vp-flag">${r.tag}</span>` : '';
    return `<button class="vp-row${sel ? ' sel' : ''}${r.odd ? ' odd' : ''}"
              data-act="vp-pick" data-i="${idx}" aria-pressed="${sel}" aria-label="${label}">
        ${io}${flag}
      </button>`;
  }

  function compareHTML() {
    if (compare.length !== 2) return '';
    const rows = allRows();
    const a = rows[compare[0]], b = rows[compare[1]];
    if (!a || !b) return '';
    const cell = (x, y, i) => `<span class="vp-sym${x[i] !== y[i] ? ' diff' : ''}" title="${SYMS[x[i]].name}">${SYMS[x[i]].g}</span>`;
    const line = (lab, x, y) =>
      `<div class="vp-cmp-line"><span class="sys-text">${lab}</span>
         <span class="vp-io">${[0,1,2].map(i => cell(x, y, i)).join('')}</span></div>`;
    const dIn  = [0,1,2].filter(i => a.inp[i] !== b.inp[i]);
    const dOut = [0,1,2].filter(i => a.out[i] !== b.out[i]);
    return `
      <div class="vp-compare">
        <p class="vp-cmp-h sys-text">VERGLEICH · ${a.n} ↔ ${b.n}</p>
        <div class="vp-cmp-grid">
          <div>${line('EIN ' + a.n, a.inp, b.inp)}${line('AUS ' + a.n, a.out, b.out)}</div>
          <div>${line('EIN ' + b.n, b.inp, a.inp)}${line('AUS ' + b.n, b.out, a.out)}</div>
        </div>
        <p class="vp-cmp-sum sys-text">EINGABE ABWEICHEND AN: ${dIn.length ? dIn.map(i=>i+1).join(', ') : '—'}
           · AUSGABE ABWEICHEND AN: ${dOut.length ? dOut.map(i=>i+1).join(', ') : '—'}</p>
      </div>`;
  }

  function renderVP() {
    const rows = allRows();
    el('vpBody').innerHTML =
      `<p class="vp-hint sys-text">ZWEI ZEILEN ANTIPPEN VERGLEICHT SIE.</p>` +
      compareHTML() +
      `<div class="vp-list">` + rows.map((r, i) => rowHTML(r, i)).join('') + `</div>`;
    el('vpActions').innerHTML =
      `<button class="ka-btn small" data-act="vp-clear">[ VERGLEICH LÖSCHEN ]</button>
       <button class="ka-btn small" data-act="close">[ ZURÜCK ]</button>`;
  }

  function openProtocol() {
    if (openModal === 'bb') closeModal();
    openModal = 'vp';
    el('vpModal').classList.remove('hidden');
    renderVP();
    if (bump('vp') === 1) {
      say([
        { speaker:'SYSTEM', text:'Das Archiv listet die Läufe der Reihe 1024. Die Nummerierung springt mehrfach.' },
        { speaker:'R-3MI',  text:'„Fehlen welche?"' },
        { speaker:'ASP-1024', text:'„Nein."' },
        { speaker:'R-3MI',  text:'„Warum springt die Nummerierung?"' },
        { speaker:'ASP-1024', text:'„Lange Geschichte."' },
      ]);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INPUT HANDLING
  // ═══════════════════════════════════════════════════════════════
  function onPanelClick(ev) {
    const btn = ev.target.closest('[data-act]');
    if (!btn || btn.disabled) return;
    const act = btn.dataset.act;
    if (act === 'close') { closeModal(); loadRoom(); return; }

    switch (act) {
      case 'd-slot':  draft[+btn.dataset.i] = (draft[+btn.dataset.i] + 1) % N_SYM; setStatus('bbStatus','',''); renderBB(); break;
      case 'p-slot':  predictOut[+btn.dataset.i] = (predictOut[+btn.dataset.i] + 1) % N_SYM; setStatus('bbStatus','',''); renderBB(); break;
      case 'f-slot-0': finalOut[0][+btn.dataset.i] = (finalOut[0][+btn.dataset.i] + 1) % N_SYM; setStatus('bbStatus','',''); renderBB(); break;
      case 'f-slot-1': finalOut[1][+btn.dataset.i] = (finalOut[1][+btn.dataset.i] + 1) % N_SYM; setStatus('bbStatus','',''); renderBB(); break;
      case 'rand':    draft = [randInt(0,N_SYM-1), randInt(0,N_SYM-1), randInt(0,N_SYM-1)]; renderBB(); break;
      case 'run':     doRun(); break;
      case 'proto':   openProtocol(); break;
      case 'hyp':     doControl(btn.dataset.k); break;
      case 'p-open':  openPredict(); break;
      case 'p-cancel': bbMode = 'test'; setStatus('bbStatus','',''); renderBB(); break;
      case 'p-commit': commitPredict(); break;
      case 'f-open':  openFinal(); break;
      case 'f-commit': commitFinal(); break;
      case 'vp-pick': {
        const i = +btn.dataset.i;
        const at = compare.indexOf(i);
        if (at >= 0) compare.splice(at, 1);
        else { compare.push(i); if (compare.length > 2) compare.shift(); }
        renderVP();
        break;
      }
      case 'vp-clear': compare = []; renderVP(); break;
      case 'vp-sig':   inspectForeign(); break;
    }
  }

  function doRun() {
    if (isLocked(draft)) { refuseLocked(); return; }
    const rec = runTest(draft, '');
    lastRun = rec;
    playSound('ch6_thunk.mp3');
    tone({ freq: 150, type:'sine', dur: 0.22, vol: 0.09, glideTo: 90 });
    setStatus('bbStatus', `${rec.n} ABGESCHLOSSEN.`, 'ok');
    renderBB();

    // §88 — wildly unrelated tests are a method problem, said kindly
    const prev = S.tests[S.tests.length - 2];
    if (prev && prev.inp.filter((v, i) => v !== rec.inp[i]).length === 3) S.wildRuns++;
    else S.wildRuns = 0;
    if (S.wildRuns === 3) {
      S.wildRuns = 0;
      save();
      say([
        { speaker:'ASP-1024', text:'„Du änderst zu viel."' },
        { speaker:'R-3MI',  text:'„Kreative Freiheit."' },
        { speaker:'ASP-1024', text:'„Schlechte Statistik."' },
      ]);
      return;
    }
    if (S.tests.length === 1) {
      say([
        { speaker:'ASP-1024', text:'„Ändere immer nur eine Sache."' },
        { speaker:'R-3MI',  text:'„Ich ändere grundsätzlich mindestens fünf."' },
        { speaker:'ASP-1024', text:'„Hab ich bemerkt."' },
      ]);
    }
  }

  function refuseLocked() {
    setStatus('bbStatus', 'EINGABE FÜR DIE VALIDIERUNG GESPERRT. DIE KAMMER FÄHRT SIE NICHT.', 'warn');
    tone({ freq: 160, type:'square', dur: 0.12, vol: 0.05 });
    if (bump('locked') === 1) {
      say([
        { speaker:'ASP-1024', text:'„Den fährt die Kammer nicht für dich."' },
        { speaker:'R-3MI',  text:'„Wäre aber praktisch gewesen."' },
        { speaker:'ASP-1024', text:'„Wäre kein Modell gewesen."' },
      ]);
    }
  }

  /** A control pair: two runs that differ in exactly the chosen dimension. */
  function doControl(kind) {
    if (isLocked(draft)) { refuseLocked(); return; }
    const base = draft.slice();
    let other = base.slice();
    if (kind === 'order') {
      const b = base.slice();
      if (distinct(b)) { other = [b[1], b[0], b[2]]; }
      else { other = [randInt(0,2), randInt(3,5), randInt(0,2)]; other = [other[1], other[0], other[2]]; }
      if (sameSeq(other, base)) other = [base[2], base[1], base[0]];
    } else if (kind === 'kind') {
      const i = randInt(0, 2);
      other[i] = isRound(base[i]) ? randInt(0, 2) : randInt(3, 5);
    } else if (kind === 'dupe') {
      other = [base[0], base[1], base[0]];
      if (sameSeq(other, base)) other = [base[0], base[0], base[1]];
    } else {
      const i = [0,1,2].find(k => isRound(base[k]) === isRound(base[0])) ?? 0;
      other[i] = isRound(base[i]) ? randInt(0, 2) : randInt(3, 5);
      if (sameSeq(other, base)) other[0] = (base[0] + 3) % N_SYM;
    }
    if (sameSeq(other, base)) other[randInt(0,2)] = (base[0] + 1) % N_SYM;
    if (isLocked(other)) { refuseLocked(); return; }

    const label = { order:'KONTROLLE · REIHENFOLGE', kind:'KONTROLLE · SYMBOLART',
                    dupe:'KONTROLLE · DOPPELUNG', count:'KONTROLLE · ANZAHL RUNDER' }[kind];
    const a = runTest(base, label);
    const b = runTest(other, label);
    lastRun = b;
    compare = [];
    playSound('ch6_thunk.mp3');
    setStatus('bbStatus', `${a.n} UND ${b.n} ABGESCHLOSSEN — IM PROTOKOLL VERGLEICHEN.`, 'ok');
    renderBB();
    if (bump('ctrl') === 1) {
      say([
        { speaker:'ASP-1024', text:'„Testen."' },
        { speaker:'SYSTEM', text:'Zwei Läufe. Sie unterscheiden sich in genau einer Sache.' },
        { speaker:'ASP-1024', text:'„Wenn sich nur eine Eingabe ändert, weißt du hinterher, welche Ausgabe darauf reagiert hat."' },
      ]);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 1 — predict one clean output
  // ═══════════════════════════════════════════════════════════════
  function drawPredictInput() {
    const r = S.rule;
    S.predictInput = freshInput(x => !CONDS[r.cond](x) && distinct(x), usedInputs());
    predictOut = [0,0,0];
    save();
  }

  function openPredict() {
    if (!S.predictInput) drawPredictInput();
    bbMode = 'predict';
    setStatus('bbStatus', '', '');
    renderBB();
  }

  function commitPredict() {
    const want = evalRule(S.predictInput, S.rule);
    if (!sameSeq(predictOut, want)) {
      setStatus('bbStatus', 'MODELL NICHT BESTÄTIGT.', 'error');
      tone({ freq: 120, type:'sawtooth', dur: 0.2, vol: 0.07 });
      drawPredictInput();               // a fresh input, so guessing gains nothing
      renderBB();
      sayFail();
      return;
    }
    enterPhase2();
  }

  const FAILS = [
    [ { speaker:'SYSTEM', text:'MODELL NICHT BESTÄTIGT.' },
      { speaker:'ASP-1024', text:'„Gut."' },
      { speaker:'R-3MI',  text:'„GUT?!"' },
      { speaker:'ASP-1024', text:'„Jetzt wissen wir, dass es falsch war."' } ],
    [ { speaker:'ASP-1024', text:'„War eine Hypothese."' },
      { speaker:'SYSTEM', text:'Pause.' },
      { speaker:'ASP-1024', text:'„Jetzt ist es eine falsche Hypothese."' },
      { speaker:'R-3MI',  text:'„Das hilft erstaunlich wenig."' },
      { speaker:'ASP-1024', text:'„Hilft mehr als vorher."' } ],
    [ { speaker:'ASP-1024', text:'„Noch ein Versuch."' } ],
    [ { speaker:'R-3MI',  text:'„Was, wenn die Regel gar keinen Sinn ergibt?"' },
      { speaker:'ASP-1024', text:'„Dann ist das auch eine Regel."' },
      { speaker:'V-TGM',  text:'"Not a useful one."', subtitle:'Keine nützliche.' },
      { speaker:'ASP-1024', text:'„Noch nicht."' } ],
  ];
  function sayFail() { say(FAILS[S.excuse++ % FAILS.length]); }

  function enterPhase2() {
    if (S.phase >= 2) return;
    // Latch the stage before anything narrative runs.
    S.phase = 2;
    S.predictInput = null;
    bbMode = 'test';
    S.hints.active = 'phase2';
    S.hints.step = 0;
    updateHintBar();

    // a fresh diagnostic that fires the condition — the archive's odd run was
    // not a fluke. It is chosen to confirm that without handing over the rule:
    // the player still has to design experiments of their own.
    const r = S.rule;
    const fired = x => CONDS[r.cond](x)
                    && !sameSeq(applyPerm(x, PERMS[r.p1]), evalRule(x, r));
    const used = usedInputs();
    const seen = allRows().filter(x => !x.foreign).map(x => ({ inp:x.inp, out:x.out }));
    const cands = candidateSet();
    const pool = ALL_INPUTS.filter(x => fired(x) && !used.some(u => sameSeq(u, x)));
    let d1 = pool.length ? pool[0] : freshInput(fired, used);
    for (const x of shuffle(pool).slice(0, 80)) {
      if (stillOpen(seen.concat([{ inp:x, out:evalRule(x, r) }]), cands).length >= MIN_OPEN_DIAG) { d1 = x; break; }
    }
    runTest(d1, 'DIAGNOSE');
    lastRun = S.tests[S.tests.length - 1];
    save();
    renderBB();

    playSound('ch6_chirp.mp3');
    tone({ freq: 420, type:'sine', dur: 0.4, vol: 0.09, glideTo: 300 });
    say([
      { speaker:'SYSTEM', text:'PROGNOSE BESTÄTIGT. DIAGNOSESTUFE 2 FREIGEGEBEN.' },
      { speaker:'ASP-1024', text:'„Passt."' },
      { speaker:'R-3MI',  text:'„Das ist alles?"' },
      { speaker:'ASP-1024', text:'„Soll ich klatschen?"' },
      { speaker:'R-3MI',  text:'„Ja."' },
      { speaker:'ASP-1024', text:'„Nein."' },
      { speaker:'SYSTEM', text:'Die Kammer fährt noch einen Lauf.' },
      { speaker:'SYSTEM', text:'*K-THUNK.*' },
      { speaker:'R-3MI',  text:'„…der passt auch nicht."' },
      { speaker:'ASP-1024', text:'„Nein."' },
      { speaker:'R-3MI',  text:'„Dann war unser Modell falsch."' },
      { speaker:'ASP-1024', text:'„Oder unvollständig."' },
      { speaker:'SYSTEM', text:'Pause.' },
      { speaker:'ASP-1024', text:'„Der Kasten macht keinen Unsinn. Wir übersehen etwas an der Eingabe."' },
      { speaker:'V-TGM',  text:'"Then we are looking for a second rule."', subtitle:'Dann suchen wir eine zweite Regel.' },
      { speaker:'ASP-1024', text:'„Wahrscheinlich."' },
    ]);
  }

  // ═══════════════════════════════════════════════════════════════
  // FINAL — two unseen inputs, one from each branch
  // ═══════════════════════════════════════════════════════════════
  function drawFinal() {
    const r = S.rule;
    const used = usedInputs();
    const off = freshInput(x => !CONDS[r.cond](x) && distinct(x), used);
    used.push(off);
    const on = freshInput(x => CONDS[r.cond](x)
                            && !sameSeq(applyPerm(x, PERMS[r.p1]), evalRule(x, r)), used);
    S.finalInputs = shuffle([off, on]);
    finalOut = [[0,0,0],[0,0,0]];
    save();
  }

  function openFinal() {
    if (!S.finalInputs) drawFinal();
    bbMode = 'final';
    setStatus('bbStatus', '', '');
    renderBB();
    if (bump('final') === 1) {
      say([
        { speaker:'SYSTEM', text:'ABSCHLUSSVALIDIERUNG BEREIT. ZWEI EINGABEN. KEINE DAVON IST BISHER GELAUFEN.' },
        { speaker:'ASP-1024', text:'„Wenn das Modell stimmt, brauchst du den Kasten dafür nicht mehr."' },
      ]);
    }
  }

  function commitFinal() {
    const ok = S.finalInputs.every((inp, k) => sameSeq(finalOut[k], evalRule(inp, S.rule)));
    if (!ok) {
      setStatus('bbStatus', 'MODELL NICHT BESTÄTIGT.', 'error');
      tone({ freq: 120, type:'sawtooth', dur: 0.2, vol: 0.07 });
      drawFinal();
      renderBB();
      sayFail();
      return;
    }
    solveBlackbox();
  }

  function solveBlackbox() {
    if (S.solved) return;
    // Persist before any narration runs.
    S.solved = true;
    try { GameEngine.state.markChapterComplete(CHAPTER_ID); } catch (_) {}
    save();
    closeModal();
    CH.setProgress(82);
    loadRoom();
    playSound('ch6_confirm.mp3');
    tone({ freq: 200, type:'sine', dur: 1.3, vol: 0.11, glideTo: 460 });
    try { GameEngine.fx.flash('rgba(199,204,214,0.22)'); } catch (_) {}

    say([
      { speaker:'SYSTEM', text:'TRANSFORMATIONSMODELL BESTÄTIGT.' },
      { speaker:'SYSTEM', text:'VALIDIERUNG ABGESCHLOSSEN. SEKTOR 06 STABIL.' },
      { speaker:'SYSTEM', text:'Überall im Raum hören Anzeigen auf zu blinken. Das Summen des Kastens wird gleichmäßig. Er sieht genauso aus wie vorher.' },
      { speaker:'R-3MI',  text:'„Und jetzt wissen wir, was drin ist."' },
      { speaker:'ASP-1024', text:'„Nein."' },
      { speaker:'R-3MI',  text:'„…was?"' },
      { speaker:'ASP-1024', text:'„Wir wissen, was es tut."' },
      { speaker:'V-TGM',  text:'"That\'s enough."', subtitle:'Das genügt.' },
      { speaker:'R-3MI',  text:'„Und jetzt machen wir sie auf?"' },
      { speaker:'ASP-1024', text:'„Warum?"' },
      { speaker:'SYSTEM', text:'Er stellt bereits die nächste Eingabe.' },
      { speaker:'ASP-1024', text:'„Du musst nicht wissen, was drin ist."' },
      { speaker:'SYSTEM', text:'Pause.' },
      { speaker:'ASP-1024', text:'„Nur, was es tut."' },
      { speaker:'SYSTEM', text:'SEKTOR 07 FREIGEGEBEN.' },
      { speaker:'R-3MI',  text:'„Kommst du?"' },
      { speaker:'ASP-1024', text:'„Noch ein Test."' },
      { speaker:'SYSTEM', text:'VERSUCH 1025 GESTARTET.' },
      { speaker:'R-3MI',  text:'„Natürlich."' },
      { speaker:'ASP-1024', text:'„Glück auf."' },
    ], finishChapter);
  }

  function finishChapter() {
    if (S.ended) return;
    S.ended = true;
    clearSave();
    CH.showHintBar(false);
    CH.complete();
  }

  // ═══════════════════════════════════════════════════════════════
  // ROOM FLAVOUR + sig_04
  // ═══════════════════════════════════════════════════════════════
  const SCENE_LINES = {
    bench: {
      1: [
        { speaker:'SYSTEM', text:'ASPs Werkbank. Werkzeuge, Prüfkabel, drei leere Tassen.' },
        { speaker:'R-3MI',  text:'„Drei?"' },
        { speaker:'ASP-1024', text:'„Eine ist alt."' },
      ],
      2: [
        { speaker:'SYSTEM', text:'Zwischen den Kabeln liegt ein Notizblock. Er ist leer.' },
        { speaker:'R-3MI',  text:'„Du schreibst nichts auf?"' },
        { speaker:'ASP-1024', text:'„Doch. Da drüben."' },
        { speaker:'SYSTEM', text:'Er zeigt auf das Archiv.' },
      ],
      4: [
        { speaker:'R-3MI',  text:'„Kannst du das einfacher erklären?"' },
        { speaker:'ASP-1024', text:'„Ja."' },
        { speaker:'SYSTEM', text:'Pause.' },
        { speaker:'R-3MI',  text:'„Und?"' },
        { speaker:'ASP-1024', text:'„Du hast gefragt, ob ich kann."' },
      ],
    },
    cart: {
      1: [
        { speaker:'SYSTEM', text:'TESTKARTUSCHE 17 — STATUS: UNBEKANNT' },
        { speaker:'R-3MI',  text:'„Was passiert, wenn wir die reinstecken?"' },
        { speaker:'ASP-1024', text:'„Weiß ich nicht."' },
        { speaker:'R-3MI',  text:'„Das beruhigt mich überhaupt nicht."' },
        { speaker:'ASP-1024', text:'„Mich schon."' },
      ],
      2: [
        { speaker:'SYSTEM', text:'Die übrigen Kartuschen sind sauber beschriftet und alle abgehakt.' },
        { speaker:'R-3MI',  text:'„Und die 17?"' },
        { speaker:'ASP-1024', text:'„Kommt noch."' },
      ],
    },
    rack: {
      1: [
        { speaker:'SYSTEM', text:'ASP-1024 — ABGESCHLOSSENE TESTZYKLEN:' },
        { speaker:'SYSTEM', text:'██████████████████████████' },
        { speaker:'SYSTEM', text:'ANZEIGEÜBERLAUF' },
        { speaker:'R-3MI',  text:'„Wie viele waren das?"' },
        { speaker:'ASP-1024', text:'„Genug."' },
      ],
      2: [
        { speaker:'R-3MI',  text:'„Du hast wirklich freiwillig so viele Testzyklen gemacht?"' },
        { speaker:'ASP-1024', text:'„Ja."' },
        { speaker:'R-3MI',  text:'„Warum?"' },
        { speaker:'ASP-1024', text:'„Nach dem ersten war unklar, ob\'s Zufall war."' },
        { speaker:'R-3MI',  text:'„Und nach dem zweiten?"' },
        { speaker:'ASP-1024', text:'„Dann wollte ich wissen, ob der erste Zufall war."' },
        { speaker:'V-TGM',  text:'"And after the thousandth?"', subtitle:'Und nach dem tausendsten?' },
        { speaker:'ASP-1024', text:'„Da war ich schon dabei."' },
      ],
      3: [
        { speaker:'R-3MI',  text:'„Der testet grundsätzlich alles zuerst."' },
        { speaker:'ASP-1024', text:'„Nicht alles."' },
        { speaker:'V-TGM',  text:'"Almost everything."', subtitle:'Fast alles.' },
        { speaker:'ASP-1024', text:'„Fast."' },
      ],
    },
  };

  function examine(key) {
    const n = bump(key);
    const b = SCENE_LINES[key];
    if (!b) return;
    const keys = Object.keys(b).map(Number).sort((x,y) => x-y);
    const lines = b[keys.filter(k => k <= n).pop() ?? keys[0]];
    if (lines) say(lines);
  }

  /** The record that is not ASP's. Flagged from the start, excluded from
   *  modelling, never required — curiosity is the only thing that finds it. */
  function inspectForeign() {
    if (S.sigFound) {
      say([
        { speaker:'SYSTEM', text:'Der fremde Datensatz liegt weiter im Archiv. Ausgeklammert.' },
        { speaker:'ASP-1024', text:'„Der bleibt draußen. Bis jemand erklärt, wo er herkommt."' },
      ]);
      return;
    }
    S.sigFound = true;
    S.anomalySeen = true;
    save();
    try { GameEngine.signals.find('sig_04'); } catch (_) {}
    say([
      { speaker:'SYSTEM', text:'DATENSATZ BESCHÄDIGT. QUELLE: EXTERN.' },
      { speaker:'SYSTEM', text:'Die Ausgabe dieses Laufs enthält ein Zeichen, das in der Eingabe nie vorkam. Das kann keine Umstellung sein.' },
      { speaker:'ASP-1024', text:'„Der ist nicht von mir."' },
      { speaker:'V-TGM',  text:'"Delete it."', subtitle:'Lösch ihn.' },
      { speaker:'R-3MI',  text:'„Warum so schnell?"' },
      { speaker:'SYSTEM', text:'V-TGM antwortet nicht. Der Datensatz gibt ein Fragment aus.' },
      { speaker:'V-TGM',  text:'"…they are listening. both. from the start."', subtitle:'…sie hören zu. beide. seit anfang an.' },
      { speaker:'SYSTEM', text:'Stille in der Kammer.' },
      { speaker:'R-3MI',  text:'„Wessen Test war das?"' },
      { speaker:'ASP-1024', text:'„Gute Frage."' },
      { speaker:'V-TGM',  text:'"We should continue."', subtitle:'Wir sollten weitermachen.' },
      { speaker:'SYSTEM', text:'ASP klammert den Datensatz aus der Auswertung aus und sagt dazu nichts weiter.' },
    ]);
  }

  // ═══════════════════════════════════════════════════════════════
  // TALKING
  // ═══════════════════════════════════════════════════════════════
  const TALK = {
    guest: [
      { key:'box', label:'[ Was macht die Blackbox? ]', lines:[
        { speaker:'ASP-1024', text:'„Genau das finden wir raus."' },
      ] },
      { key:'wrong', label:'[ Was, wenn du dich irrst? ]', lines:[
        { speaker:'ASP-1024', text:'„Dann irre ich mich."' },
        { speaker:'R-3MI',  text:'„Das stört dich gar nicht?"' },
        { speaker:'ASP-1024', text:'„Jetzt hab ich bessere Daten."' },
      ] },
      { key:'math', label:'[ Warum immer Zahlen und Regeln? ]', lines:[
        { speaker:'ASP-1024', text:'„Mathematik ist praktisch."' },
        { speaker:'SYSTEM', text:'Pause.' },
        { speaker:'ASP-1024', text:'„Sie beschwert sich selten."' },
      ] },
      { key:'first', label:'[ Testest du immer als Erster? ]', lines:[
        { speaker:'ASP-1024', text:'„Irgendwer muss."' },
        { speaker:'R-3MI',  text:'„Und wenn es schiefgeht?"' },
        { speaker:'ASP-1024', text:'„Dann weiß ich das vorher als Erster. Ist auch was."' },
      ] },
    ],
    r3mi: [
      { key:'him', label:'[ Was hältst du von ASP? ]', lines:[
        { speaker:'R-3MI', text:'„Er redet wenig. Aber wenn man ihn was fragt, kriegt man eine Antwort. Das ist hier nicht selbstverständlich."' },
      ], again:[
        { speaker:'R-3MI', text:'„Mach dreimal dasselbe Symbol. Wenn\'s explodiert, wissen wir auch was."' },
        { speaker:'V-TGM', text:'"That is not a good criterion."', subtitle:'Das ist kein gutes Kriterium.' },
        { speaker:'ASP-1024', text:'„Aber ein Test."' },
      ] },
      { key:'lost', label:'[ Verstehst du irgendwas davon? ]', lines:[
        { speaker:'R-3MI', text:'„Nein. Aber ich merke, wann sich was ändert. Das ist schon die halbe Miete, sagt er."' },
        { speaker:'ASP-1024', text:'„Sag ich nicht."' },
        { speaker:'R-3MI', text:'„Denkst du aber."' },
      ] },
    ],
    vtgm: [
      { key:'read', label:'[ Wie liest du das hier? ]', lines:[
        { speaker:'V-TGM', text:'"Compare two runs where only one input position changed."', subtitle:'Vergleiche zwei Läufe, bei denen sich nur eine Eingabestelle geändert hat.' },
        { speaker:'V-TGM', text:'"Everything else is noise until then."', subtitle:'Alles andere ist bis dahin Rauschen.' },
      ] },
      { key:'him', label:'[ Und was hältst du von ASP? ]', lines:[
        { speaker:'V-TGM', text:'"He has been testing things here for a very long time."', subtitle:'Er testet hier seit sehr langer Zeit Dinge.' },
        { speaker:'V-TGM', text:'"He has never once claimed that made him important."', subtitle:'Er hat nie behauptet, das mache ihn wichtig.' },
      ] },
    ],
  };

  function clickRobot(who) {
    if (dialogueBusy()) { try { GameEngine.dialogue.advance(); } catch (_) {} return; }
    if (who === 'guest' && !S.metAsp) return;
    const topics = TALK[who] || [];
    const choices = topics.map(t => {
      const seen = !!S.talkSeen[who + ':' + t.key];
      return { key:t.key, label:t.label, seen, lines:(seen && t.again) ? t.again : t.lines };
    });
    if (who === 'guest') choices.unshift({ key:'__coach', label:'[ Wie geht man das an? ]', seen:false, lines: coachLines() });
    choices.push({ key:'__leave', label:'[ Nichts. Weiter. ]', seen:false, lines: [] });
    CH.showChoices({
      prompt: who === 'guest' ? 'ASP-1024 ANSPRECHEN:' : who === 'r3mi' ? 'R-3MI ANSPRECHEN:' : 'V-TGM ANSPRECHEN:',
      hint: 'OPTIONAL.',
      choices,
      onAfterChoice: (key) => {
        if (key === '__leave' || key === '__coach') return;
        S.talkSeen[who + ':' + key] = true;
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // COACHING — method, never the rule
  // ═══════════════════════════════════════════════════════════════
  const COACH = [
    [ { speaker:'ASP-1024', text:'„Teste zweimal fast dasselbe."' } ],
    [ { speaker:'ASP-1024', text:'„Halte zwei Stellen gleich. Änder nur die dritte."' } ],
    [ { speaker:'ASP-1024', text:'„Wenn zwei Dinge gleichzeitig anders sind, weißt du hinterher nicht, welches davon wichtig war."' } ],
    [ { speaker:'ASP-1024', text:'„War vielleicht Zufall."' },
      { speaker:'SYSTEM', text:'Pause.' },
      { speaker:'ASP-1024', text:'„Dann testen wir\'s nochmal."' } ],
    [ { speaker:'ASP-1024', text:'„Gute Idee. Testen wir."' } ],
  ];
  function coachLines() { return COACH[S.coach++ % COACH.length]; }

  // ═══════════════════════════════════════════════════════════════
  // HINTS — one shared 3-step ladder per stage
  // ═══════════════════════════════════════════════════════════════
  const HINTS = {
    phase1: [
      { r:{ t:'„Die Zeichen, die rauskommen, sind dieselben, die reingehen. Nur… anders einsortiert."' },
        v:{ t:'"The output is never a new symbol. It is the input, rearranged."', s:'Die Ausgabe enthält nie ein neues Zeichen. Es ist die Eingabe, umsortiert.' },
        g:{ t:'„Schau dir die sauberen Läufe an. Nicht den, der nicht passt."' } },
      { r:{ t:'„Stelle eins wandert nach hinten? Oder war es andersrum? Ich schau nochmal."' },
        v:{ t:'"Number the positions and track where each one ends up. It is the same move every time."', s:'Nummeriere die Stellen und verfolge, wo jede landet. Es ist jedes Mal dieselbe Bewegung.' },
        g:{ t:'„Eine Stelle nach der anderen. Wo geht die Eins hin?"' } },
      { r:{ t:'„Also immer dieselbe Umstellung. Dann kann ich die nächste ausrechnen."' },
        v:{ t:'"One fixed rearrangement explains every clean run. Apply it to the new input."', s:'Eine feste Umstellung erklärt jeden sauberen Lauf. Wende sie auf die neue Eingabe an.' },
        g:{ t:'„Nimm die Umstellung aus dem Archiv und wende sie an. Mehr ist es auf dieser Stufe nicht."' } },
    ],
    phase2: [
      { r:{ t:'„Manche Läufe machen was anderes. Aber nicht zufällig — es sind immer dieselben, oder?"' },
        v:{ t:'"The machine is consistent. Some inputs simply take a different path."', s:'Die Maschine ist konsistent. Manche Eingaben nehmen einfach einen anderen Weg.' },
        g:{ t:'„Du suchst eine Regel. Vielleicht sind es zwei."' } },
      { r:{ t:'„Was haben die komischen Läufe gemeinsam? Ich seh nur Dreiecke und Kreise."' },
        v:{ t:'"Sort the runs into two groups: those that follow stage one, and those that do not. Then look at the inputs only."', s:'Teile die Läufe in zwei Gruppen: die, die Stufe eins folgen, und die anderen. Dann schau nur auf die Eingaben.' },
        g:{ t:'„Nicht die Ausgabe. Die Eingabe. Was ist bei denen anders?"' } },
      { r:{ t:'„Eckig oder rund. Doppelte Zeichen. Welche Stelle. Irgendwas davon schaltet um."' },
        v:{ t:'"Hold two positions fixed and change only the third. The group a run falls into will flip at some point — that tells you the condition."', s:'Halte zwei Stellen fest und ändere nur die dritte. Irgendwann kippt die Gruppe — das verrät die Bedingung.' },
        g:{ t:'„Halte zwei Stellen gleich. Änder nur die dritte. Dann siehst du, woran es hängt."' } },
    ],
  };

  function useHint(who) {
    const ladder = HINTS[S.hints.active] || HINTS.phase1;
    if (S.hints.step >= HINT_MAX) {
      if (who === 'guest') { say(coachLines()); return; }
      say([ who === 'r3mi'
        ? { speaker:'R-3MI', text:'„Mehr hab ich nicht. Frag ihn, der hat noch was."' }
        : { speaker:'V-TGM', text:'"That is all I have."', subtitle:'Mehr habe ich nicht.' } ]);
      return;
    }
    const step = ladder[S.hints.step];
    S.hints.step++;
    updateHintBar();
    const e = who === 'r3mi' ? step.r : who === 'vtgm' ? step.v : step.g;
    const speaker = who === 'r3mi' ? 'R-3MI' : who === 'vtgm' ? 'V-TGM' : 'ASP-1024';
    say([{ speaker, text: e.t, subtitle: e.s }]);
  }

  function updateHintBar() {
    const left = Math.max(0, HINT_MAX - S.hints.step);
    const c = el('hintCount');
    if (c) c.textContent = `HINWEISE: ${left} VERFÜGBAR`;
    const done = left <= 0;
    ['hintBtnR3MI','hintBtnVTGM'].forEach(id => { const b = el(id); if (b) b.disabled = done; });
    const g = el('hintBtnGuest');
    if (g) { g.disabled = false; g.title = done ? 'Methodenhilfe' : 'Hinweis'; }
  }

  /** Move the hint buttons off the scaffold's per-speaker budget and onto the
   *  project's shared ladder. Cloning drops the scaffold listeners cleanly. */
  function rebindHints() {
    [['hintBtnR3MI','r3mi'], ['hintBtnVTGM','vtgm'], ['hintBtnGuest','guest']].forEach(([id, who]) => {
      const b = el(id);
      if (!b) return;
      const c = b.cloneNode(true);
      b.parentNode.replaceChild(c, b);
      c.addEventListener('click', () => useHint(who));
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // BUILD + INIT
  // ═══════════════════════════════════════════════════════════════
  function buildChapter() {
    CH.build({
      title: 'KA-II // Kapitel 6 — Versuchskammer',
      num: '06',
      sector: 'VERSUCHSKAMMER',
      reactPct: 68,
      name: 'Versuchskammer',
      subline: '„Eine Variable nach der anderen."',
      emblemDeco: '<div class="ch6-box"><i></i></div>',
      scene: { ph: 'lab-dim' },
      guest: { key: 'asp', name: 'ASP-1024' },
      modals: ['bbModal', 'vpModal'],
      completeId: CHAPTER_ID,
      completeAch: 'ch6_complete',
      next: { title: 'SEKTOR 07 FREIGEGEBEN', label: 'VEXIERSEKTOR',
              href: '../chapter7/chapter7.html', enter: 'EINTRETEN' },
      onStart: begin,
      onRobot: clickRobot,
    });
  }

  function init() {
    buildChapter();
    rebindHints();
    CH.showHintBar(false);
    ['bbBody','bbActions','vpBody','vpActions'].forEach(id =>
      el(id).addEventListener('click', onPanelClick));
    CH.start();
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', () => Chapter6.init());
