/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 00 — RÜCKKEHR
 * Tutorial chapter. SYSTEM-only narration (R-3MI / V-TGM appear in CH1).
 *
 * Player flow:
 *   1. Intro dialogue establishes atmosphere
 *   2. Player explores 4 hotspots → SYSTEM reveals clue per hotspot
 *   3. Player clicks the door → puzzle modal opens
 *   4. Solution: ●▲■⬡  (Stufe 1, Zweiter, Position 3, Stufe 4)
 *   5. Door unlocks → transition to chapter 1
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter0 = (() => {
  'use strict';

  // ─── State ────────────────────────────────────────────────────
  const cluesFound = { dot: false, triangle: false, square: false, hexagon: false };
  let puzzleSequence = [];
  let puzzleLocked   = false;

  const SOLUTION = '●▲■⬡';

  // ─── Clue data ───────────────────────────────────────────────
  const CLUES = {
    dot: {
      label: 'WARNTAFEL',
      prop:  'sign',
      pos:   { x: 6, y: 42, w: 13, h: 11 },
      lines: [
        { speaker: 'SYSTEM', text: 'WARNTAFEL // VERWITTERT, DURCH EFEU VERDECKT.' },
        { speaker: 'SYSTEM', text: 'TEXT TEILWEISE LESBAR: »… STUFE 1 … KREIS …«' },
      ],
    },
    triangle: {
      label: 'WARTUNGSPLAKETTE',
      prop:  'panel',
      pos:   { x: 75, y: 17, w: 11, h: 11 },
      lines: [
        { speaker: 'SYSTEM', text: 'METALLPLAKETTE // STARK OXIDIERT.' },
        { speaker: 'SYSTEM', text: 'GRAVUR ERKENNBAR: »ZWEITER — ▲«' },
      ],
    },
    square: {
      label: 'BODENMARKIERUNG',
      prop:  'decal',
      pos:   { x: 38, y: 78, w: 20, h: 13 },
      lines: [
        { speaker: 'SYSTEM', text: 'BODENMARKIERUNG // STARK VERBLASST.' },
        { speaker: 'SYSTEM', text: 'AUFSCHRIFT: »POSITION 3 — VIERECK«' },
      ],
    },
    hexagon: {
      label: 'WANDPANEEL',
      prop:  'panel',
      anim:  'prop-flicker',
      pos:   { x: 85, y: 49, w: 11, h: 11 },
      lines: [
        { speaker: 'SYSTEM', text: 'WANDPANEEL // VOLLSTÄNDIG VON EFEU ÜBERWUCHERT.' },
        { speaker: 'SYSTEM', text: 'PRÄGUNG UNTER DEN RANKEN: »STUFE 4 — HEXAGON«' },
      ],
    },
  };

  const DOOR_HOTSPOT = {
    label: 'SCHLEUSENSTEUERUNG',
    pos:   { x: 37.5, y: 26, w: 24, h: 44 },
    onClick: () => openPuzzle(),
    className: 'door-hotspot',
  };

  // ─── INIT ────────────────────────────────────────────────────
  function init() {
    // Open with system narration
    GameEngine.dialogue.load([
      { speaker: 'SYSTEM', text: 'EINGANGSSEKTOR // SEKTOR 7C — ZUGANGSSCHLEUSE.' },
      { speaker: 'SYSTEM', text: 'STATUS: VERSIEGELT.' },
      { speaker: 'SYSTEM', text: 'LETZTE REGISTRIERTE PRÄSENZ: VOR 2.847 TAGEN.' },
      { speaker: 'SYSTEM', text: 'EINHEITEN R-3MI / V-TGM // STATUS: UNBEKANNT.' },
      { speaker: 'SYSTEM', text: 'BENUTZER ERKANNT. WILLKOMMEN ZURÜCK.' },
      { speaker: 'SYSTEM', text: 'ZUGRIFFSCODE ERFORDERLICH. ARCHIV-DATEN UNVOLLSTÄNDIG. UNTERSUCHE DIE UMGEBUNG.' },
    ], () => {
      loadHotspots();
    });

    // Wire puzzle keys
    document.querySelectorAll('.puzzle-key').forEach(btn => {
      btn.addEventListener('click', () => addSymbol(btn.dataset.symbol));
    });

    // Define puzzle in engine
    GameEngine.puzzle.define({
      id:            'ch0_door',
      solution:      SOLUTION,
      hint:          'Untersuche alle vier Hinweise rund um die Tür.',
      achievementId: 'ch0_complete',
      onSolve:       onSolve,
      onFail:        onFail,
    });

    // Keyboard: ESC closes puzzle
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closePuzzle();
    });
  }

  // ─── HOTSPOTS ────────────────────────────────────────────────
  function loadHotspots() {
    // Decorative set dressing — no onClick, so these render as scenery only.
    // The entrance foyer: overgrown, half-collapsed, long abandoned.
    const hs = [
      { prop:'ivy',    x: 0,  y: 2,  w: 11, h: 42 },
      { prop:'ivy',    x: 89, y: 0,  w: 11, h: 46 },
      { prop:'ivy',    x: 22, y: 0,  w: 9,  h: 26 },
      { prop:'column', x: 12, y: 16, w: 7,  h: 58 },
      { prop:'column', x: 81, y: 16, w: 7,  h: 58 },
      { prop:'pipe',   x: 5,  y: 46, w: 6,  h: 38 },
      { prop:'light',  x: 44, y: 1,  w: 11, h: 7  },
      { prop:'debris', x: 60, y: 80, w: 17, h: 9  },
      { prop:'debris', x: 16, y: 84, w: 14, h: 8  },
      { prop:'crate',  x: 68, y: 66, w: 12, h: 13 },
      { ...DOOR_HOTSPOT.pos, label: DOOR_HOTSPOT.label,
        className: DOOR_HOTSPOT.className, onClick: DOOR_HOTSPOT.onClick },
    ];
    Object.entries(CLUES).forEach(([key, clue]) => {
      hs.push({
        ...clue.pos,
        label:   clue.label,
        prop:    clue.prop,
        anim:    clue.anim,
        onClick: () => examineClue(key),
      });
    });

    GameEngine.scene.load({ hotspots: hs });
  }

  function examineClue(key) {
    if (cluesFound[key]) {
      // Re-read
      GameEngine.dialogue.load(CLUES[key].lines);
      return;
    }
    cluesFound[key] = true;
    updateClueProgress();

    // Mark hotspot as found visually (plain pulse spots AND prop objects)
    document.querySelectorAll('.hotspot, .scene-prop').forEach(el => {
      const lbl = el.querySelector('.hotspot-label, .prop-label');
      if (lbl && lbl.textContent === CLUES[key].label) el.classList.add('found');
    });

    GameEngine.dialogue.load(CLUES[key].lines);
  }

  function updateClueProgress() {
    const found = Object.values(cluesFound).filter(Boolean).length;
    const el = document.getElementById('cluesProgress');
    if (el) el.textContent = `HINWEISE: ${found} / 4`;
  }

  // ─── HINT ─────────────────────────────────────────────────────
  function showHint() {
    const found = Object.values(cluesFound).filter(Boolean).length;

    if (found === 0) {
      GameEngine.dialogue.load([
        { speaker: 'SYSTEM', text: 'TIPP: BEWEGE DEN ZEIGER ÜBER DIE SZENE. INTERAKTIVE PUNKTE PULSIEREN BLAU.' },
      ]);
    } else if (found < 4) {
      GameEngine.dialogue.load([
        { speaker: 'SYSTEM', text: `${found} VON 4 HINWEISEN GEFUNDEN.` },
        { speaker: 'SYSTEM', text: 'UNTERSUCHE DIE UMGEBUNG WEITER.' },
      ]);
    } else {
      GameEngine.dialogue.load([
        { speaker: 'SYSTEM', text: 'ALLE HINWEISE ERFASST.' },
        { speaker: 'SYSTEM', text: 'JEDER HINWEIS NENNT EINE STUFENZAHL UND EIN SYMBOL. ORDNE DIE SYMBOLE NACH IHRER STUFE (1 → 4).' },
      ]);
    }
  }

  // ─── PUZZLE ───────────────────────────────────────────────────
  function openPuzzle() {
    document.getElementById('puzzleModal').classList.remove('hidden');
    resetPuzzle();
  }

  function closePuzzle() {
    document.getElementById('puzzleModal').classList.add('hidden');
  }

  function addSymbol(symbol) {
    if (puzzleLocked) return;
    if (puzzleSequence.length >= 4) return;

    puzzleSequence.push(symbol);
    updateDisplay();
    setStatus(`EINGABE: ${puzzleSequence.length}/4`, '');

    if (puzzleSequence.length === 4) {
      puzzleLocked = true;
      const answer = puzzleSequence.join('');
      const ok = GameEngine.puzzle.submit(answer);
      // engine fires onSolve / onFail
    }
  }

  function resetPuzzle() {
    puzzleSequence = [];
    puzzleLocked   = false;
    const display = document.getElementById('puzzleDisplay');
    display.classList.remove('correct', 'wrong');
    updateDisplay();
    setStatus('BEREIT.', '');
  }

  function updateDisplay() {
    const display = document.getElementById('puzzleDisplay');
    const slots = ['_', '_', '_', '_'];
    puzzleSequence.forEach((s, i) => slots[i] = s);
    display.innerHTML = slots.map(s =>
      `<span class="puzzle-slot${s === '_' ? '' : ' filled'}">${s}</span>`
    ).join('');
  }

  function setStatus(text, type) {
    const el = document.getElementById('puzzleStatus');
    el.textContent = text;
    el.className = 'puzzle-status sys-text' + (type ? ' ' + type : '');
  }

  // ─── SOLVE / FAIL ────────────────────────────────────────────
  function onSolve() {
    const display = document.getElementById('puzzleDisplay');
    display.classList.add('correct');
    setStatus('ZUGRIFFSCODE BESTÄTIGT.', 'success');

    setTimeout(() => {
      closePuzzle();

      GameEngine.dialogue.load([
        { speaker: 'SYSTEM', text: 'SCHLEUSE WIRD ENTRIEGELT…' },
        { speaker: 'SYSTEM', text: 'SEKTOR 1 ERREICHBAR.' },
        { speaker: 'SYSTEM', text: 'WILLKOMMEN ZURÜCK.' },
      ], () => {
        // Mark complete & transition
        GameEngine.state.markChapterComplete('ch0');
        try { GameEngine.audio.fanfare(); } catch(_) {}
        showChapterComplete();
      });
    }, 1100);
  }

  function onFail() {
    const display = document.getElementById('puzzleDisplay');
    display.classList.add('wrong');
    setStatus('ZUGRIFF VERWEIGERT // FALSCHE SEQUENZ.', 'error');

    setTimeout(() => {
      display.classList.remove('wrong');
      resetPuzzle();
    }, 1200);
  }

  // ─── CHAPTER COMPLETE OVERLAY ────────────────────────────────
  function showChapterComplete() {
    const cc = document.getElementById('chapterComplete');
    const prog = document.getElementById('ccProgress');

    const completed = GameEngine.state.get('chaptersCompleted').length;
    if (prog) prog.textContent = `FORTSCHRITT: ${completed} / 9 KAPITEL`;

    cc.classList.remove('hidden');
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
