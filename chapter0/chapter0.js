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
      pos:   { x: 12, y: 60, w: 6, h: 6 },
      lines: [
        { speaker: 'SYSTEM', text: 'WARNTAFEL // VERWITTERT, DURCH EFEU VERDECKT.' },
        { speaker: 'SYSTEM', text: 'TEXT TEILWEISE LESBAR: »… STUFE 1 … KREIS …«' },
      ],
    },
    triangle: {
      label: 'WARTUNGSPLAKETTE',
      pos:   { x: 78, y: 22, w: 6, h: 6 },
      lines: [
        { speaker: 'SYSTEM', text: 'METALLPLAKETTE // STARK OXIDIERT.' },
        { speaker: 'SYSTEM', text: 'GRAVUR ERKENNBAR: »ZWEITER — ▲«' },
      ],
    },
    square: {
      label: 'BODENMARKIERUNG',
      pos:   { x: 32, y: 82, w: 6, h: 6 },
      lines: [
        { speaker: 'SYSTEM', text: 'BODENMARKIERUNG // STARK VERBLASST.' },
        { speaker: 'SYSTEM', text: 'AUFSCHRIFT: »POSITION 3 — VIERECK«' },
      ],
    },
    hexagon: {
      label: 'WANDPANEEL',
      pos:   { x: 84, y: 70, w: 6, h: 6 },
      lines: [
        { speaker: 'SYSTEM', text: 'WANDPANEEL // VOLLSTÄNDIG VON EFEU ÜBERWUCHERT.' },
        { speaker: 'SYSTEM', text: 'PRÄGUNG UNTER DEN RANKEN: »STUFE 4 — HEXAGON«' },
      ],
    },
  };

  const DOOR_HOTSPOT = {
    label: 'SCHLEUSENSTEUERUNG',
    pos:   { x: 38, y: 30, w: 24, h: 44 },
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
    const hs = [
      { ...DOOR_HOTSPOT.pos, label: DOOR_HOTSPOT.label,
        className: DOOR_HOTSPOT.className, onClick: DOOR_HOTSPOT.onClick },
    ];
    Object.entries(CLUES).forEach(([key, clue]) => {
      hs.push({
        ...clue.pos,
        label:   clue.label,
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

    // Mark hotspot as found visually
    document.querySelectorAll('.hotspot').forEach(el => {
      const lbl = el.querySelector('.hotspot-label');
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
    if (prog) prog.textContent = `FORTSCHRITT: ${completed} / 10 KAPITEL`;

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
