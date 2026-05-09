# DIE KALIBRIERUNGSANLAGE II: Die Reaktivierung
### A Team_Aperture Geocaching Project

---

## Project Structure

```
/
├── index.html              ← Title screen (start here)
├── css/
│   ├── global.css          ← Full design system, shared by ALL pages
│   └── title.css           ← Title screen specific styles
├── js/
│   ├── engine.js           ← Game engine (state, dialogue, achievements,
│   │                          signals, scene, puzzle) — load on every page
│   └── title.js            ← Title screen logic (boot, particles, glitch)
├── assets/
│   └── logo.png            ← Place your logo here
├── chapter0/
│   └── chapter0.html       ← Kapitel 0: Rückkehr (ChatGPT base → migrate here)
│   (chapter1/ … chapter9/ will be added here)
└── bonus/
    └── (hidden — no index link)
```

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
