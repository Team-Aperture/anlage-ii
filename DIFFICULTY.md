# Difficulty Curve — KA-II

Target feel for the puzzles, so later chapters can be authored straight to a
rating. Chapter 0 is a deliberate hand-held tutorial and sits **outside** the
curve. From Chapter 1 the baseline is **4.5/10**, rising **+0.75 per chapter**.

| Chapter | Target | Status | Puzzles (rough) |
|---------|--------|--------|-----------------|
| Ch0 — Rückkehr            | ~2.0 (tutorial) | done | Symbol door — clues spell out the order |
| Ch1 — Wartungseinheiten   | **4.5** | done | P1 pipe path ~4 · P2 dual-signal ~5 (4 hints) |
| Ch2 — Wartungsgarten      | **5.25** | done | P1 Tau-Sequenz ~5 · P2 Frostmuster ~5.5 |
| Ch3 — Beobachtungssektor  | 6.0  | stub | — |
| Ch4 | 6.75 | — | — |
| Ch5 | 7.5  | — | — |
| Ch6 | 8.25 | — | — |
| Ch7 | 9.0  | — | — |
| Ch8 | ~9.75 (cap 10) | — | — |
| Ch9 | 10 (finale) | — | — |

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
   isolated well. Larger boards, more regions, or pre-placed locked channels
   (none today — "as specified") push it higher.

These are all simple constants — tune, playtest, repeat. Ratings are estimates;
expect to nudge them after a real playthrough.
