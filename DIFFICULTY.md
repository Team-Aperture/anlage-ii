# Difficulty Curve — KA-II

Target feel for the puzzles, so later chapters can be authored straight to a
rating. Chapter 0 is a deliberate hand-held tutorial and sits **outside** the
curve. From Chapter 1 the baseline is **4.5/10**, rising **+0.75 per chapter**.

| Chapter | Target | Status | Puzzles (rough) |
|---------|--------|--------|-----------------|
| Ch0 — Rückkehr            | ~2.0 (tutorial) | done | Symbol door — clues spell out the order |
| Ch1 — Wartungseinheiten   | **4.5** | done | P1 pipe path ~4 · P2 dual-signal ~5 (4 hints) |
| Ch2 — Wartungsgarten      | **5.25** | done | P1 Tau-Sequenz ~5 · P2 Frostmuster ~5.5–6 (6 fixed walls → unique solution, cap 18) |
| Ch3 — Beobachtungssektor  | **6.0** | done | One multi-stage Belichtung puzzle (logic dials → spectrum match) under a draining exposure meter |
| Ch4 — Rätselsektor (Armin/B-RADF1SH) | **6.75** | done | Dual-projection maze (2D↔3D): warm-up ~5 (3×3×3, min 2 switches) · der Würfel ~7.5 (3×4×4 staircase, min 6 switches, budget 7) |
| Ch5 — Fördersektor (T-FLON14) | **7.5** | done | FÖRDERLAUF: 20 rapid mixed micro-tasks (odd-one / match / tap-all / count / odd-colour) under one global clock (FL_TIME=60, −3s per miss). Rounds 11-20 mix look-alike filled/outline twins; odd-colour always uses distinct colours |
| Ch6 — Dunkelkammer (ASP-1024) | **8.25** | done | BILDFORENSIK: one steganography puzzle — a 4-char code hidden in the blue channel (+18 over ±6 noise, math-clean at threshold); isolate R/G/B + invert + threshold, past a loud green decoy code |
| Ch7 — Vexiersektor (FAX-N) | **9.0** | done | VEXIERSCHLOSS: a deduction lock (Mastermind-style) — 4 seals · 6 symbols · 8 tries. Feedback ● richtig / ○ verschoben. A lying host, an honest lock. Budget 8 proven crackable by pure logic (20k-trial sim: worst case 8, avg 4.6). First chapter built on the shared `GameEngine.chapter` scaffold |
| Ch8 — Archivsektor (AGN-H3R) | **10** | done | DAS ZEHNTE PUZZLE: a real 4×4 tap-to-swap jigsaw (16 pieces, ≤15 swaps, procedural target-map image, optional VORLAGE peek). Honours the KA-I "nah, don't bother" gag (refusing = the `jigsaw_refused` achievement, then AGN-H3R makes you do it anyway). Last regular chapter — ends at Reaktivierung 100% with the coordinates (`FINAL_COORDS` placeholder in chapter8.js). Built on the shared scaffold |
| Ch9 — BONUS (hidden) | outside curve | — | Unlocked via all 5 Signalnischen. The story takes a dark turn: R-3MI & V-TGM are revealed as the bad guys |

*J4W-A3 (Kartografiesektor) is dropped — the cacher never responded. The main
run is **Ch0 prologue + Ch1–Ch8 → 9 chapters**; Ch9 is a hidden bonus chapter
that does not count toward title-screen progress.*

Within a chapter the first puzzle is usually ~0.5 below the target and the
second ~0.5 above, bracketing it — the chapter *average* is the number above.

## Difficulty knobs (cheapest → most structural)

1. **Hint budget.** Most direct lever. Ch1 P2 = 4 hints (`P2_HINT_MAX` in
   `chapter1.js`); Ch2 = 4 hints (`S.hints` r3mi/vtgm/froschi in `chapter2.js`).
   Fewer hints → harder.
2. **Tolerance / feedback.** e.g. Ch2 Tau-Sequenz uses `TOLERANCE = 1`; tightening
   it or hiding live feedback raises difficulty.
3. **Scramble / fixed tiles.** Ch1 pipe puzzles: more rotatable (non-`*_FIXED`)
   tiles and a wider scramble = more steps.
4. **Problem size / constraints.** Ch2 Frostmuster: 5×5 → six 4-cell regions +
   isolated well, with 6 pre-frozen `FROST_FIXED` walls that (under the 18 cap)
   force a unique solution. More fixed walls / a tighter cap → harder.
5. **Time pressure (decay).** Ch3 Belichtung: an exposure meter drains while you
   think; correct sensors refill it. Per-stage `STAGES[*].drain`, `REFILL`, and
   `FAIL_FLOOR` in `chapter3.js` are the dials — faster drain / smaller refill =
   harder. This raises difficulty without adding puzzle complexity.
6. **Resource budget.** Ch4 Cubus: a hard cap on `MAZES.cubus.budget`
   (view-switches) in `chapter4.js`. The maze's minimum is 6 (BFS-verified);
   budget 7 = brutal, 8 = one scouting peek. Lower budget → harder.

These are all simple constants — tune, playtest, repeat. Ratings are estimates;
expect to nudge them after a real playthrough.
