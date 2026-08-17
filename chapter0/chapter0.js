/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 00 — RÜCKKEHR
 * Prologue: manual entrance release, after the archived authorisation from
 * KA-I has already been verified on the access page.
 *
 * The entrance drive is dead, so the seal has to be operated by hand. The
 * player reads what is left of the old markings around the threshold and
 * reconstructs the facility's manual reference rule from them.
 *
 * Narration is SYSTEM only.
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter0 = (() => {
  'use strict';

  const PUZZLE_ID  = 'ch0_door';
  const CHAPTER_ID = 'ch0';
  const DOOR_FLAG  = 'ch0_door_open';

  const A = () => GameEngine.audio;

  // ─── The ring's reference marks ──────────────────────────────
  // Each mark carries a form value. The mechanism steps through the marks in
  // test order; nothing about a mark's position on the ring encodes that order.
  const FORM_VALUE = new Map([
    ['●', 1],
    ['▲', 3],
    ['■', 4],
    ['⬡', 6],
  ]);
  const SEQUENCE_LENGTH = 4;

  function getFormValue(mark) {
    return FORM_VALUE.has(mark) ? FORM_VALUE.get(mark) : null;
  }

  /** A sequence is accepted when every mark is used exactly once and the form
   *  values run strictly upwards. Duplicates are rejected outright. */
  function validateReferenceSequence(input) {
    const marks = Array.isArray(input) ? input : String(input).split('');
    if (marks.length !== SEQUENCE_LENGTH) return false;
    if (new Set(marks).size !== marks.length) return false;
    const values = marks.map(getFormValue);
    if (values.some(v => v === null)) return false;
    return values.every((v, i) => i === 0 || v > values[i - 1]);
  }

  // ─── State ────────────────────────────────────────────────────
  const S = {
    referencesFound: { warning: false, plaque: false, floor: false, ring: false },
    sequence:   [],
    inputLocked: false,
    attempts:   0,
    hintStep:   0,
    doorRead:   false,
    unlocked:   false,
    introDone:  false,
  };

  // ═══════════════════════════════════════════════════════════════
  // REQUIRED REFERENCES
  // Four complementary fragments of one operating rule: direction, mapping,
  // expected values, available marks. No single fragment is the answer.
  // ═══════════════════════════════════════════════════════════════
  const REFERENCES = {
    warning: {
      label:   'WARNTAFEL',
      aria:    'Verwitterte Warntafel untersuchen',
      prop:    'sign',
      pos:     { x: 1, y: 47, w: 12, h: 11 },
      lines: [
        { speaker: 'SYSTEM', text: 'WARNTAFEL // VERWITTERT, TEILWEISE VON EFEU VERDECKT.' },
        { speaker: 'SYSTEM', text: 'TEXTFRAGMENT LESBAR: »… MANUELLE REFERENZFOLGE … AUFSTEIGEND …«' },
      ],
      reread: [
        { speaker: 'SYSTEM', text: 'WARNTAFEL // »… MANUELLE REFERENZFOLGE … AUFSTEIGEND …«' },
      ],
    },
    plaque: {
      label:   'WARTUNGSPLAKETTE',
      aria:    'Wartungsplakette untersuchen',
      prop:    'panel',
      pos:     { x: 67, y: 15, w: 11, h: 11 },
      lines: [
        { speaker: 'SYSTEM', text: 'METALLPLAKETTE // STARK OXIDIERT. FORMTABELLE TEILWEISE ERHALTEN.' },
        { speaker: 'SYSTEM', text: 'GRAVUR: »FORMKENNZAHL = MARKIERTE ECKPUNKTE«' },
        { speaker: 'SYSTEM', text: 'ZUSATZZEILE: »REFERENZPUNKT ● = 1«' },
      ],
      reread: [
        { speaker: 'SYSTEM', text: 'FORMTABELLE // »FORMKENNZAHL = MARKIERTE ECKPUNKTE«, »REFERENZPUNKT ● = 1«' },
      ],
    },
    floor: {
      label:   'BODENMARKIERUNG',
      aria:    'Bodenmarkierung untersuchen',
      prop:    'decal',
      pos:     { x: 40, y: 76, w: 20, h: 12 },
      lines: [
        { speaker: 'SYSTEM', text: 'BODENMARKIERUNG // SCHABLONE, STARK VERBLASST.' },
        { speaker: 'SYSTEM', text: 'PRÜFREIHENFOLGE LESBAR: 1 · 3 · 4 · 6' },
      ],
      reread: [
        { speaker: 'SYSTEM', text: 'BODENMARKIERUNG // PRÜFREIHENFOLGE: 1 · 3 · 4 · 6' },
      ],
    },
    ring: {
      label:   'SCHLEUSENRING',
      aria:    'Schleusenring untersuchen',
      pos:     { x: 37.5, y: 26, w: 24, h: 44 },
      lines: [
        { speaker: 'SYSTEM', text: 'EXTERNE TESTSIGNATUR // GÜLTIG.' },
        { speaker: 'SYSTEM', text: 'SCHLEUSENRING // MANUELL VERRIEGELT.' },
        { speaker: 'SYSTEM', text: 'GEOMETRISCHE REFERENZEN AM RING ERKANNT: ● ▲ ■ ⬡' },
        { speaker: 'SYSTEM', text: 'REFERENZFOLGE // NICHT VERFÜGBAR.' },
      ],
    },
  };

  const REFERENCE_ORDER = ['warning', 'plaque', 'floor', 'ring'];

  // ═══════════════════════════════════════════════════════════════
  // OPTIONAL ENVIRONMENT
  // Curiosity, not clues. Nothing here is needed to open the door.
  // ═══════════════════════════════════════════════════════════════
  const ENVIRONMENT = [
    {
      key: 'terminal', label: 'ARCHIVTERMINAL', aria: 'Archivterminal untersuchen',
      prop: 'terminal', pos: { x: 88, y: 46, w: 11, h: 22 },
      lines: [
        { speaker: 'SYSTEM', text: 'ARCHIVTERMINAL // RESTDATEN LESBAR.' },
        { speaker: 'SYSTEM', text: 'LETZTES ABGESCHLOSSENES HAUPTPROTOKOLL: SYSTEMABSCHALTUNG.' },
        { speaker: 'SYSTEM', text: 'AUSFÜHRENDE AUTORISIERUNG: EXTERNE TESTSIGNATUR.' },
        { speaker: 'SYSTEM', text: 'TESTSIGNATUR // WIEDERERKANNT.' },
        { speaker: 'SYSTEM', text: 'WILLKOMMEN ZURÜCK.' },
      ],
      reread: [{ speaker: 'SYSTEM', text: 'ARCHIVTERMINAL // RESTDATEN UNVERÄNDERT.' }],
    },
    {
      key: 'dust', label: 'STAUBSCHICHT', aria: 'Staubschicht am Boden untersuchen',
      prop: 'scratch', pos: { x: 20, y: 85, w: 15, h: 8 },
      lines: [
        { speaker: 'SYSTEM', text: 'STAUBSCHICHT // UNGESTÖRT.' },
        { speaker: 'SYSTEM', text: 'KEINE FRISCHEN SPUREN.' },
      ],
      reread: [{ speaker: 'SYSTEM', text: 'STAUBSCHICHT // UNVERÄNDERT.' }],
    },
    {
      key: 'light', label: 'NOTBELEUCHTUNG', aria: 'Notbeleuchtung untersuchen',
      prop: 'light', pos: { x: 44, y: 1, w: 11, h: 7 },
      lines: [
        { speaker: 'SYSTEM', text: 'NOTBELEUCHTUNG // OFFLINE.' },
        { speaker: 'SYSTEM', text: 'ENERGIEVERSORGUNG: UNZUREICHEND.' },
      ],
      // the room remembers: after the release this fixture is alive
      awakeLines: [
        { speaker: 'SYSTEM', text: 'NOTBELEUCHTUNG // AKTIV.' },
      ],
    },
    {
      key: 'ivy', label: 'VEGETATION', aria: 'Bewuchs untersuchen',
      prop: 'ivy', pos: { x: 22, y: 0, w: 9, h: 26 },
      lines: [
        { speaker: 'SYSTEM', text: 'VEGETATION // UNKONTROLLIERT.' },
        { speaker: 'SYSTEM', text: 'WARTUNGSINTERVALL // DEUTLICH ÜBERSCHRITTEN.' },
      ],
      reread: [{ speaker: 'SYSTEM', text: 'VEGETATION // UNVERÄNDERT.' }],
    },
    {
      key: 'crate', label: 'WARTUNGSKISTE', aria: 'Wartungskiste untersuchen',
      prop: 'crate', pos: { x: 62, y: 65, w: 12, h: 13 },
      lines: [
        { speaker: 'SYSTEM', text: 'WARTUNGSMATERIAL // VERSIEGELUNG BESCHÄDIGT.' },
        { speaker: 'SYSTEM', text: 'HALTBARKEIT ÜBERSCHRITTEN: 2.701 TAGE.' },
      ],
      reread: [{ speaker: 'SYSTEM', text: 'WARTUNGSMATERIAL // STATUS UNVERÄNDERT.' }],
    },
  ];

  const envSeen = {};

  // Pure set dressing — no pointer events, no labels.
  const DECOR = [
    { prop: 'ivy',    x: 0,  y: 2,  w: 11, h: 42 },
    { prop: 'ivy',    x: 89, y: 0,  w: 11, h: 44 },
    { prop: 'column', x: 14, y: 16, w: 7,  h: 58 },
    { prop: 'column', x: 80, y: 16, w: 7,  h: 56 },
    { prop: 'pipe',   x: 75, y: 40, w: 5,  h: 34 },
    { prop: 'debris', x: 62, y: 82, w: 16, h: 8  },
    { prop: 'debris', x: 3,  y: 87, w: 13, h: 7  },
  ];

  // ═══════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════
  function init() {
    // Authorisation gate — the head script redirects first; this is the
    // in-engine backstop in case the save was cleared between the two.
    if (!GameEngine.state.hasFlag('ka1_verified')) {
      location.replace('../access.html');
      return;
    }

    try {
      wireControls();

      GameEngine.puzzle.define({
        id:       PUZZLE_ID,
        validate: validateReferenceSequence,
        hint:     'Die Markierungen rund um die Schleuse beschreiben eine Bedienvorschrift.',
        onSolve:  onSolve,
        onFail:   onFail,
      });

      try { GameEngine.music.play('ch0_ambient'); } catch (_) {}

      const alreadyOpen = GameEngine.state.isPuzzleSolved(PUZZLE_ID)
                       || GameEngine.state.isChapterComplete(CHAPTER_ID);

      if (alreadyOpen) startReturning();
      else            startFirstVisit();

    } catch (err) {
      console.error('[KA-II] Kapitel 0 konnte nicht starten.', err);
      document.getElementById('ch0Fault')?.classList.remove('hidden');
    }
  }

  function startFirstVisit() {
    GameEngine.dialogue.load([
      { speaker: 'SYSTEM', text: 'REAKTIVIERUNGSPROTOKOLL // INITIALISIERT.' },
      { speaker: 'SYSTEM', text: 'EINGANGSSEKTOR 7C.' },
      { speaker: 'SYSTEM', text: 'LETZTE VOLLSYNCHRONISIERUNG: VOR 2.847 TAGEN.' },
      { speaker: 'SYSTEM', text: 'SCHLEUSENANTRIEB // KEINE ANTWORT.' },
      { speaker: 'SYSTEM', text: 'MOBILE EINHEITEN // KEINE ANTWORT.' },
      { speaker: 'SYSTEM', text: 'MANUELLE FREIGABE ERFORDERLICH.' },
    ], () => {
      S.introDone = true;
      loadHotspots();
      updateProgress();
    });
  }

  /** Revisit after the seal is already open: no re-lock, no repeated prologue. */
  function startReturning() {
    S.unlocked = true;
    setAwake(true);
    // Safety net: if a prior visit solved the ring but the tab closed before
    // the (delayed, queued-after-the-quiet-moment) achievement toast fired,
    // this catches it on return. unlock() is idempotent — no-op if already
    // unlocked — so it's safe to call unconditionally on every revisit.
    GameEngine.achievements.unlock('ch0_complete');
    GameEngine.dialogue.load([
      { speaker: 'SYSTEM', text: 'EINGANGSSEKTOR 7C.' },
      { speaker: 'SYSTEM', text: 'SCHLEUSE // BETRIEBSBEREIT.' },
    ], () => {
      S.introDone = true;
      loadHotspots();
      updateProgress();
    });
  }

  function wireControls() {
    document.getElementById('hintBtn')?.addEventListener('click', showHint);
    document.getElementById('puzzleResetBtn')?.addEventListener('click', resetPuzzle);
    document.getElementById('puzzleCloseBtn')?.addEventListener('click', closePuzzle);

    document.querySelectorAll('.puzzle-key').forEach(btn => {
      btn.addEventListener('click', () => addSymbol(btn));
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isPuzzleOpen() && !S.unlocked) closePuzzle();
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE
  // ═══════════════════════════════════════════════════════════════
  function loadHotspots() {
    const hs = DECOR.slice();

    // required markings — a visible pulse, because this is the tutorial
    REFERENCE_ORDER.forEach(key => {
      const ref = REFERENCES[key];
      if (key === 'ring') return;   // the door itself is added below
      hs.push({
        ...ref.pos,
        label:     ref.label,
        aria:      ref.aria,
        prop:      ref.prop,
        className: 'req-hotspot ref-' + key,
        onClick:   () => examineReference(key),
      });
    });

    // the seal itself
    hs.push({
      ...REFERENCES.ring.pos,
      label:     REFERENCES.ring.label,
      aria:      S.unlocked ? 'Sektor 01 betreten' : 'Schleusenring untersuchen',
      className: 'door-hotspot ref-ring',
      onClick:   clickDoor,
    });

    // optional atmosphere — quieter markers, no pulse
    ENVIRONMENT.forEach(env => {
      hs.push({
        ...env.pos,
        label:     env.label,
        aria:      env.aria,
        prop:      env.prop,
        className: 'env-hotspot env-' + env.key,
        onClick:   () => examineEnvironment(env),
      });
    });

    GameEngine.scene.load({ hotspots: hs });
    if (S.unlocked) document.querySelector('.env-light')?.classList.add('ch0-lit');
  }

  function examineReference(key) {
    const ref = REFERENCES[key];
    if (S.referencesFound[key]) {
      GameEngine.dialogue.load(ref.reread || ref.lines);
      return;
    }
    S.referencesFound[key] = true;
    markFound(key);
    updateProgress();
    GameEngine.dialogue.load(ref.lines);
  }

  function examineEnvironment(env) {
    const seen = !!envSeen[env.key];
    envSeen[env.key] = true;
    document.querySelector('.env-' + env.key)?.classList.add('found');

    if (S.unlocked && env.awakeLines) { GameEngine.dialogue.load(env.awakeLines); return; }
    GameEngine.dialogue.load(seen ? (env.reread || env.lines) : env.lines);
  }

  function markFound(key) {
    const el = document.querySelector('.ref-' + key);
    if (el) el.classList.add('found');
  }

  function clickDoor() {
    if (S.unlocked) {
      GameEngine.dialogue.load([
        { speaker: 'SYSTEM', text: 'SCHLEUSE // FREIGEGEBEN.' },
        { speaker: 'SYSTEM', text: 'SEKTOR 01 // ERREICHBAR.' },
      ], showChapterComplete);
      return;
    }

    // First look at the ring establishes the distinction the whole prologue
    // rests on: the authorisation is fine, the mechanism is not.
    if (!S.doorRead) {
      S.doorRead = true;
      S.referencesFound.ring = true;
      markFound('ring');
      updateProgress();
      GameEngine.dialogue.load(REFERENCES.ring.lines, openPuzzle);
      return;
    }
    openPuzzle();
  }

  // ═══════════════════════════════════════════════════════════════
  // HUD
  // ═══════════════════════════════════════════════════════════════
  function countReferences() {
    return Object.values(S.referencesFound).filter(Boolean).length;
  }

  function updateProgress() {
    const found = countReferences();
    const counter   = document.getElementById('cluesProgress');
    const objective = document.getElementById('objectiveText');

    if (counter) {
      if (S.unlocked)        counter.textContent = 'SCHLEUSE FREIGEGEBEN';
      else if (found >= 4)   counter.textContent = 'REFERENZEN: VOLLSTÄNDIG';
      else                   counter.textContent = `REFERENZEN: ${found} / 4`;
    }
    if (objective) {
      if (S.unlocked)      objective.textContent = 'SEKTOR 01 BETRETEN';
      else if (found > 0)  objective.textContent = 'REFERENZFOLGE REKONSTRUIEREN';
      else                 objective.textContent = 'SCHLEUSE MANUELL FREIGEBEN';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HINTS — free, progressive, SYSTEM only
  // ═══════════════════════════════════════════════════════════════
  function showHint() {
    const found = countReferences();

    if (S.unlocked) {
      GameEngine.dialogue.load([{ speaker: 'SYSTEM', text: 'SCHLEUSE // FREIGEGEBEN. SEKTOR 01 ERREICHBAR.' }]);
      return;
    }

    // The method hints open up once the markings are largely gathered, or once
    // the ring has actually been tried a couple of times.
    const deep = found >= 4 || S.attempts >= 2;

    if (!deep && found === 0) {
      GameEngine.dialogue.load([
        { speaker: 'SYSTEM', text: 'INTERAKTIVE BEREICHE SIND MARKIERT.' },
        { speaker: 'SYSTEM', text: 'DIE SCHLEUSE WURDE FRÜHER VON HAND BEDIENT. RESTE DER ALTEN BESCHRIFTUNG SIND NOCH LESBAR.' },
      ]);
      return;
    }

    if (!deep && found < 3) {
      GameEngine.dialogue.load([
        { speaker: 'SYSTEM', text: `REFERENZEN: ${found} / 4.` },
        { speaker: 'SYSTEM', text: 'DIE FRAGMENTE GEHÖREN ZUSAMMEN. KEINES DAVON IST FÜR SICH GENOMMEN DIE ANTWORT.' },
      ]);
      return;
    }

    if (!deep) {
      const missing = REFERENCE_ORDER.find(k => !S.referencesFound[k]);
      GameEngine.dialogue.load([
        { speaker: 'SYSTEM', text: 'EINE REFERENZ FEHLT.' },
        { speaker: 'SYSTEM', text: `${REFERENCES[missing].label} // NICHT ERFASST.` },
      ]);
      return;
    }

    S.hintStep = Math.min(S.hintStep + 1, 3);
    if (S.hintStep === 1) {
      GameEngine.dialogue.load([
        { speaker: 'SYSTEM', text: 'DIE BODENMARKIERUNG NENNT VIER ZAHLEN. DER RING TRÄGT VIER FORMEN.' },
        { speaker: 'SYSTEM', text: 'ES SIND GENAU SO VIELE.' },
      ]);
    } else if (S.hintStep === 2) {
      GameEngine.dialogue.load([
        { speaker: 'SYSTEM', text: 'DIE ZAHLEN BESCHREIBEN NICHT DIE POSITION DER TASTEN.' },
        { speaker: 'SYSTEM', text: 'SIE BESCHREIBEN DIE FORMEN.' },
      ]);
    } else {
      GameEngine.dialogue.load([
        { speaker: 'SYSTEM', text: 'FORMKENNZAHL = ANZAHL DER MARKIERTEN ECKPUNKTE. DER REFERENZPUNKT ZÄHLT ALS EINE.' },
        { speaker: 'SYSTEM', text: 'ORDNUNG: AUFSTEIGEND.' },
      ]);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SCHLEUSENRING — manual release
  // ═══════════════════════════════════════════════════════════════
  function isPuzzleOpen() {
    const m = document.getElementById('puzzleModal');
    return !!m && !m.classList.contains('hidden');
  }

  function openPuzzle() {
    if (S.unlocked) { showChapterComplete(); return; }
    const modal = document.getElementById('puzzleModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    resetPuzzle();
    setTimeout(() => modal.querySelector('.puzzle-key')?.focus(), 60);
  }

  function closePuzzle() {
    if (S.unlocked) return;                     // never close mid-release
    document.getElementById('puzzleModal')?.classList.add('hidden');
    document.querySelector('.door-hotspot')?.focus();
  }

  function addSymbol(btn) {
    if (S.inputLocked || S.sequence.length >= SEQUENCE_LENGTH) return;

    btn.classList.add('hit');
    setTimeout(() => btn.classList.remove('hit'), 160);

    S.sequence.push(btn.dataset.symbol);
    updateDisplay();
    setStatus(`REFERENZEN: ${S.sequence.length} / ${SEQUENCE_LENGTH}`, '');

    if (S.sequence.length === SEQUENCE_LENGTH) {
      S.inputLocked = true;                     // one validation per sequence
      GameEngine.puzzle.submit(S.sequence.join(''));
    }
  }

  function resetPuzzle() {
    if (S.unlocked) return;
    S.sequence = [];
    S.inputLocked = false;
    const display = document.getElementById('puzzleDisplay');
    display?.classList.remove('correct', 'wrong');
    updateDisplay();
    setStatus('BEREIT.', '');
  }

  function updateDisplay() {
    const display = document.getElementById('puzzleDisplay');
    if (!display) return;
    const slots = ['_', '_', '_', '_'];
    S.sequence.forEach((s, i) => { slots[i] = s; });
    display.innerHTML = slots
      .map(s => `<span class="puzzle-slot${s === '_' ? '' : ' filled'}">${s}</span>`)
      .join('');
  }

  function setStatus(text, type) {
    const el = document.getElementById('puzzleStatus');
    if (!el) return;
    el.textContent = text;
    el.className = 'puzzle-status sys-text' + (type ? ' ' + type : '');
  }

  function setNote(text) {
    const el = document.getElementById('puzzleNote');
    if (el) el.textContent = text || '';
  }

  // ─── FAIL ─────────────────────────────────────────────────────
  function onFail() {
    S.attempts++;
    const display = document.getElementById('puzzleDisplay');
    display?.classList.add('wrong');
    setStatus('REFERENZFOLGE NICHT ERKANNT.', 'error');
    try { A().fail(); } catch (_) {}
    GameEngine.fx.shake('.puzzle-card');

    // The mechanism stays neutral. It just doesn't move.
    if (S.attempts === 2) setNote('REFERENZFOLGE // AUFSTEIGEND.');
    if (S.attempts === 3) {
      const hb = document.getElementById('hintBtn');
      hb?.classList.add('nudge');
      setTimeout(() => hb?.classList.remove('nudge'), 1800);
    }
    if (S.attempts >= 4) setNote('SCHLEUSENRING // WEITERHIN GEDULDIG.');

    setTimeout(() => {
      display?.classList.remove('wrong');
      setStatus('MECHANIK ZURÜCKGESETZT.', '');
      S.sequence = [];
      S.inputLocked = false;
      updateDisplay();
      setTimeout(() => { if (!S.sequence.length && !S.unlocked) setStatus('BEREIT.', ''); }, 700);
    }, 780);
  }

  // ─── SOLVE ────────────────────────────────────────────────────
  function onSolve() {
    S.unlocked = true;

    // Persist first, then play. If the tab dies during the cinematic, the
    // chapter still counts as finished.
    GameEngine.state.setFlag(DOOR_FLAG);
    GameEngine.state.markChapterComplete(CHAPTER_ID);

    document.getElementById('puzzleDisplay')?.classList.add('correct');
    setNote('');
    setStatus('REFERENZFOLGE BESTÄTIGT.', 'success');
    cueMechanism();

    setTimeout(() => {
      document.getElementById('puzzleModal')?.classList.add('hidden');
      setAwake(true);
      // #sceneCanvas, not #sceneWrapper — the wrapper's own sceneFadeIn rule
      // (chapter0.css, loaded after global.css) would win the cascade over
      // .fx-shake at equal specificity and silently swallow the shake.
      GameEngine.fx.shake('#sceneCanvas');
      updateProgress();
    }, 900);

    // one deep strike, somewhere far inside
    setTimeout(() => { cueKlang(); klangCaption(); }, 1900);

    // the toast lands in the quiet, not over the door text
    setTimeout(() => GameEngine.achievements.unlock('ch0_complete'), 2600);

    setTimeout(() => {
      GameEngine.dialogue.load([
        { speaker: 'SYSTEM', text: 'SCHLEUSENRING // FREIGEGEBEN.' },
        { speaker: 'SYSTEM', text: 'REAKTIVIERUNGSPROTOKOLL // AKTIV.' },
        { speaker: 'SYSTEM', text: 'NETZSEGMENT 01 // STARTVORGANG.' },
        { speaker: 'SYSTEM', text: 'SEKTOR 01 // ERREICHBAR.' },
      ], showChapterComplete);
    }, 3400);
  }

  /** The room wakes: ring turns, dust falls, one fixture comes back. */
  function setAwake(on) {
    document.body.classList.toggle('ch0-awake', !!on);
    document.getElementById('phDoor')?.classList.toggle('door-unlocked', !!on);
    document.querySelector('.env-light')?.classList.toggle('ch0-lit', !!on);
    // the door's behaviour changes on unlock — its screen-reader label should too
    document.querySelector('.door-hotspot')
      ?.setAttribute('aria-label', on ? 'Sektor 01 betreten' : 'Schleusenring untersuchen');
    const dust = document.getElementById('phDust');
    if (on && dust) {
      dust.classList.remove('falling');
      void dust.offsetWidth;
      dust.classList.add('falling');
    }
  }

  function klangCaption() {
    const canvas = document.getElementById('sceneCanvas');
    if (!canvas) return;
    const el = document.createElement('div');
    el.className = 'ch0-klang';
    el.textContent = '*KLANG.*';
    canvas.appendChild(el);
    setTimeout(() => el.remove(), 3400);
  }

  // ─── AUDIO CUES ───────────────────────────────────────────────
  // Deliberately low and mechanical rather than a bright fanfare — this is a
  // threshold, not a victory.
  function cueMechanism() {
    try {
      A().tone({ freq: 54, type: 'sawtooth', dur: 1.7, vol: 0.13, glideTo: 96 });
      A().tone({ freq: 82, type: 'triangle', dur: 1.7, vol: 0.06 });
    } catch (_) {}
  }

  function cueKlang() {
    try {
      A().tone({ freq: 78, type: 'sine',     dur: 2.4, vol: 0.17, glideTo: 40 });
      A().tone({ freq: 155, type: 'triangle', dur: 1.2, vol: 0.06 });
    } catch (_) {}
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPLETE
  // ═══════════════════════════════════════════════════════════════
  function showChapterComplete() {
    const cc   = document.getElementById('chapterComplete');
    const prog = document.getElementById('ccProgress');
    if (!cc) return;

    const completed = (GameEngine.state.get('chaptersCompleted') || []).length;
    if (prog) prog.textContent = `FORTSCHRITT: ${completed} / 9`;

    cc.classList.remove('hidden');
    setTimeout(() => document.getElementById('ccEnter')?.focus(), 700);
  }

  // ─── PUBLIC API ──────────────────────────────────────────────
  return {
    init,
    showHint,
    openPuzzle,
    closePuzzle,
    resetPuzzle,
  };

})();

document.addEventListener('DOMContentLoaded', () => Chapter0.init());
