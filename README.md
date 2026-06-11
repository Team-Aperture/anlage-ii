# DIE KALIBRIERUNGSANLAGE II: Die Reaktivierung
### A Team_Aperture Geocaching Project

---

## Project Structure

```
/
├── index.html              ← Title screen (start here)
├── access.html             ← KA-I code gate (8-digit verification)
├── css/
│   ├── global.css          ← Full design system, shared by ALL pages
│   ├── title.css           ← Title screen specific styles
│   └── access.css          ← Code-gate specific styles
├── js/
│   ├── engine.js           ← Game engine (state, dialogue, achievements,
│   │                          signals, scene, puzzle) — load on every page
│   ├── title.js            ← Title screen logic (boot, particles, idle)
│   └── access.js           ← Code-gate verification logic
├── assets/
│   ├── logo.png            ← Title logo
│   └── portraits/          ← Speaker portraits (optional per dialogue line)
├── chapter0/               ← Kapitel 0: Rückkehr (implemented)
├── chapter1/               ← Kapitel 1: Die Wartungseinheiten (implemented)
├── chapter2/               ← Kapitel 2: Wartungsgarten (implemented)
└── chapter3/               ← Kapitel 3: Beobachtungssektor (stub — in Entwicklung)
    (chapter4/ … chapter9/ to follow)
```

Each implemented chapter holds its own `chapterN.html`, `chapterN.js`,
`chapterN.css`, and a `cg/` folder for scene art (with a `CG_PROMPT.txt`
describing the intended image). Missing CGs and audio degrade gracefully:
a CSS placeholder scene is shown and sound calls are wrapped in `try/catch`.

---

## Every Chapter Page Must:

1. Load `../css/global.css` (and its own chapter CSS)
2. Load `../js/engine.js` FIRST, then chapter-specific JS
3. Use `GameEngine.dialogue.load([...])` for all dialogue
4. Use `GameEngine.puzzle.define({...})` for all puzzles
5. Call `GameEngine.state.markChapterComplete('ch0')` on chapter end
6. Call `GameEngine.achievements.unlock('ch0_complete')` on chapter end

---

## Dialogue Line Format

```javascript
GameEngine.dialogue.load([
  {
    speaker:  'R-3MI',
    text:     'Oh. Du bist zurückgekommen. Interessant.',
    portrait: '../assets/portraits/r3mi_neutral.png', // optional
  },
  {
    speaker:  'V-TGM',
    text:     'We have been waiting.',
    subtitle: 'Wir haben gewartet.',            // German subtitle for V-TGM
    portrait: '../assets/portraits/vtgm_calm.png',
  },
  {
    speaker:  'SYSTEM',
    text:     'SEKTOR 01 — ENTSPERRT.',
  },
], () => {
  // onComplete callback
});
```

**Available speakers:** R-3MI, V-TGM, SYSTEM, F-RØ5CHI, L-UX, J4W-A3,
B-RADF1SH, T-FLON14, ASP-1024, AGN-H3R

---

## Puzzle Format

```javascript
GameEngine.puzzle.define({
  id:            'ch1_puzzle1',
  solution:      '42',           // or array: ['42', 'zweiundvierzig']
  hint:          'Denk an den Wartungscodex.',
  achievementId: 'ch1_complete', // optional
  onSolve: () => {
    // open gate, play dialogue, etc.
  },
  onFail: () => {
    // shake animation, R-3MI comment, etc.
  },
});

// Then somewhere:
GameEngine.puzzle.submit(inputField.value);
```

---

## Signal Nische (The Transmission collectible)

Place this in a chapter scene. Player must discover and click it:

```javascript
// When player finds the hidden area:
GameEngine.signals.find('sig_03'); // triggers toast + achievement check
```

---

## State Flags

```javascript
GameEngine.state.setFlag('gate_1_open');
GameEngine.state.hasFlag('gate_1_open'); // → true/false
```

---

## Guest Character Colors (CSS variables)

| Character   | Variable         | Chapter |
|-------------|------------------|---------|
| F-RØ5CHI    | `--accent-g1`    | 2       |
| L-UX        | `--accent-g2`    | 3       |
| J4W-A3      | `--accent-g3`    | 4       |
| B-RADF1SH   | `--accent-g4`    | 5       |
| T-FLON14    | `--accent-g5`    | 6       |
| ASP-1024    | `--accent-g6`    | 7       |
| AGN-H3R     | `--accent-g7`    | 8       |

---

## Geocaching Compliance Checklist

- ✅ No user tracking or analytics
- ✅ No cookies beyond localStorage (progress only, user-controlled)
- ✅ No external data sent anywhere
- ✅ No login required
- ✅ Works fully offline after first load (no backend)
- ✅ Coordinates only revealed after all chapters complete

---

*Sie hätte abgeschaltet bleiben sollen.*

---

**Release-Hinweis:** Alle lokalen CSS/JS-Verweise tragen einen Cache-Buster
(`?v=JJJJMMTT`). Nach inhaltlichen Änderungen vor dem Merge die Version in
allen HTML-Dateien anheben:
`sed -i 's/?v=[0-9]*/?v=NEUES_DATUM/g' *.html chapter*/*.html`
