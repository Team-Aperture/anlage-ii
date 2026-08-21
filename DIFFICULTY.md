# Difficulty Curve — KA-II

Target feel for the puzzles, so later chapters can be authored straight to a
rating. Chapter 0 is a deliberate hand-held tutorial and sits **outside** the
curve. From Chapter 1 the baseline is **4.5/10**, rising **+0.75 per chapter**.

| Chapter | Target | Status | Puzzles (rough) |
|---------|--------|--------|-----------------|
| Ch0 — Rückkehr            | ~2.0 (tutorial) | done | Symbol door — clues spell out the order |
| Ch1 — Wartungssektor      | **4.5** | done | P1 pipe path ~4 · P2 dual-signal ~5. One shared 3-step hint ladder *per puzzle* (`HINT_MAX` in `chapter1.js`) — observation → relationship → method; either unit can voice the next step, so asking both no longer doubles the budget |
| Ch2 — Wartungsgarten      | **5.25** | done | P1 Tau-Sequenz ~5 (order forced by the ambient shift; exactly one plant order works) · P2 Frostmuster ~5.5–6 (6 pre-carved walls + an 18-cut cap = the minimum possible; **81 valid layouts** remain, so it stays a multi-solution puzzle by design). One shared 4-step hint ladder per puzzle (`HINT_MAX` in `chapter2.js`) — observation → relationship → method → last resort, voiced by whichever of the three you ask |
| Ch3 — Beobachtungssektor  | **6.0** | done | BELICHTUNG, three observation stages, each a step up in *inference* rather than in speed: **1** the array pulses in unison and exactly one blend breaks rank for exactly one beat — say which and when (20 possible answers, nothing to memorise, you either catch it or look again); **2** four traces, one drives and the others follow / oppose / ignore it — name each relationship; **3** the array answers by **rank** (one channel always takes the strongest input, one the middle, one the weakest) and two calibration passes are built as deliberate *complements*: pass A is one peak over two tied lows, so only the strongest channel can be read off it; pass B is two tied highs over one trough, so only the weakest can. Each pass alone leaves exactly 2 rank assignments open; together they always leave exactly 1 — so both are logically required and neither is redundant (`buildCalibration` in `chapter3.js`, verified 200k instances). The passes stay on screen as a permanent EICHPROTOKOLL, and the new stimulus stays visible too — nothing is a memory test. Stage 3 cannot be beaten by copying: a calibration response never happens to be the target's answer (0/200k). Every instance is generated at runtime and rerolled until unambiguous. Pressure is an **observation budget**, not a clock (`COST_OBSERVE` / `COST_WRONG` in `chapter3.js`): the first look at each stage is free, looking again or committing a wrong reading spends reserve, and reading/thinking/hints cost nothing. An incomplete answer is free — only a *wrong* one is charged. Running the reserve out is overexposure: same stage, fresh recording, full reserve, no lost progress. One shared 3-step hint ladder **per stage** (`HINT_MAX`) |
| Ch4 — Rätselsektor (B-RADF1SH) | **6.75** | done | DAS VIERFACH-SCHLOSS: one mechanism, four independently solvable subsystems (MUSTER, GEWICHT, TAKT, AUSRICHTUNG), each producing a reference value for a small final alignment. Difficulty comes from decomposition and integrating four outputs, not from spatial/UI confusion — see the module writeups in `chapter4/chapter4.js` |
| Ch5 — Langstrecke (T-FLON14) | **7.0–7.5** | done | A journey along WARTUNGSROUTE 14, not a room with puzzles in it — the route *is* the mechanic, and difficulty comes from variety and distance rather than one hard finale. **14-D** ABZWEIG: a fork with no wrong answer (both corridors reconnect; the obsolete one costs a longer walk and buys spider-web comedy). **14-E** SCHALTGALERIE ~6: close the forward conduit — read which bundle runs on from the labelled ducts, learn from the relay legend that the line needs sections 1–5, spot the missing section and take the bypass named on the repair plate; several keys fire harmless facility gags instead. **14-F** TIEFSCHACHT: traversal, scale and a rest stop — deliberately no puzzle. **14-G** VERSORGUNG ~7.5: exact-fit pressure budget over six systems where two red lamps are cosmetic, one fault needs the hand crank rather than pressure, and one system is already fine — the schema's three conditions are the whole evidence base; solving it extends the platform the party then walks across. **14-H** MARKIERUNG ~5: after a chapter of seeing ROUTE 14 plates, one of five breaks the grammar on exactly one feature (bolts / code format / arrow / notch / border) — optional sig_03 sits behind it. **14-I** STRECKENENDE ~6: certify five segments of the line you actually walked (the Streckenprotokoll recorded them). Every station instance is generated at runtime. No timer anywhere; progress is checkpointed per beat so a refresh resumes the journey. One shared 3-step hint ladder per station (`HINT_MAX`), plus unlimited practical coaching from T-FLON14 |
| Ch6 — Versuchskammer (ASP-1024) | **8.25** | done | DIE BLACKBOX: one sealed machine, one continuous experiment. Three symbols in, three out; the player never sees inside and never needs to. The transformation is a **primary rearrangement** plus a **conditional second rearrangement** that fires on a visible property of the input (a duplicate, a round symbol in a given position, the parity or majority of round symbols) — 5 × 5 × 5 = 125 curated candidates, every one verified behaviourally unique across all 216 reachable inputs. **Stage 1**: four clean archive runs pin the rearrangement uniquely (verified per instance) — predict one unseen output. **Stage 2**: one archived run never fitted and a fresh diagnostic agrees with it; the machine is not inconsistent, the model was missing a variable. **Stage 3**: free testing plus a control-pair tool that runs two inputs differing in exactly one dimension. Sampling is chosen so the free information *never* determines the rule (≥4 candidates always survive, 0/4000 instances gave it away) — even a perfect solver must design 1–2 experiments, a human rather more. **Final**: predict two unseen outputs, one from each branch (1/36 by guessing, redrawn on failure). No timer, unlimited tests. sig_04 hides in an archived record whose output contains a symbol its input never had — impossible under *any* candidate rule, flagged CHECKSUM: FEHLER, and entirely optional. Rule + archive persist across reload; corrupt state fails closed to a fresh experiment. One shared 3-step hint ladder per stage (`HINT_MAX`) plus unlimited method coaching from ASP |
| Ch7 — Vexiersektor (FAX-N) | **9.0** | done | VEXIERSCHLOSS: a deduction lock (Mastermind-style) — 4 seals · 6 symbols · 8 tries. Feedback ● richtig / ○ verschoben. A lying host, an honest lock. Budget 8 proven crackable by pure logic (20k-trial sim: worst case 8, avg 4.6). First chapter built on the shared `GameEngine.chapter` scaffold |
| Ch8 — Archivsektor (AGN-H3R) | **10** | done | DAS ZEHNTE PUZZLE: a real 4×4 tap-to-swap jigsaw (16 pieces, ≤15 swaps, procedural target-map image, optional VORLAGE peek). Honours the KA-I "nah, don't bother" gag (refusing = the `jigsaw_refused` achievement, then AGN-H3R makes you do it anyway). Last regular chapter — ends at Reaktivierung 100% with the coordinates (`FINAL_COORDS` placeholder in chapter8.js). Built on the shared scaffold |
| Ch9 — BONUS (hidden) | outside curve | done | Access-gated on all 5 Signalnischen. A narrative chamber: an archive of past "projects" (Italian Brainrot/FRIGO → `italian_brainrot`, Crypto Colors, The Transmission) narrated by R-3MI/V-TGM with knowledge they shouldn't have. After all 3 exhibits, a glitching anomaly hotspot triggers the reveal — the player was only ever useful, the calibration was a rebuild, and the two are now the admins. Dialogue box shakes & bleeds red, portraits turn sinister; unlocks `bonus_found`. Entered from the Ch8 end screen (or `chapter9.html`, which redirects if not unlocked) |

*J4W-A3 (Kartografiesektor) is dropped — the cacher never responded. The main
run is **Ch0 prologue + Ch1–Ch8 → 9 chapters**; Ch9 is a hidden bonus chapter
that does not count toward title-screen progress.*

Within a chapter the first puzzle is usually ~0.5 below the target and the
second ~0.5 above, bracketing it — the chapter *average* is the number above.

## Difficulty knobs (cheapest → most structural)

1. **Hint budget.** Most direct lever. Ch1 = one shared 3-step ladder per puzzle
   (`HINT_MAX` in `chapter1.js`) — the two units are two *voices* on the same
   ladder, not two separate budgets; Ch2 = the same model with a 4-step ladder
   (`HINT_MAX` in `chapter2.js`), voiced by R-3MI / V-TGM / F-RØ5CHI. Fewer
   steps → harder. Only the ladder's final step may state concrete values.
2. **Tolerance / feedback.** e.g. Ch2 Tau-Sequenz uses `TOLERANCE = 1`; tightening
   it or hiding live feedback raises difficulty.
3. **Scramble / fixed tiles.** Ch1 pipe puzzles: more rotatable (non-`*_FIXED`)
   tiles and a wider scramble = more steps.
4. **Problem size / constraints.** Ch2 Frostmuster: 5×5 → six 4-cell regions +
   isolated well. Unconstrained there are 3264 valid partitions; the 6 pre-carved
   `FROST_FIXED` walls cut that to 144, and the 18-cut cap (the minimum any
   layout needs) to **81**. It is deliberately *not* unique — the chapter's
   dialogue leans on that. More fixed walls / a tighter cap → harder.
5. **Information budget (not time).** Ch3 BELICHTUNG charges for *looking*,
   never for thinking: `COST_OBSERVE` (each replay after the first of a stage)
   and `COST_WRONG` (a committed reading that doesn't hold) in `chapter3.js`.
   Raising either, or shortening `BEAT`, makes the chapter harder by forcing
   the player to get more out of a single viewing. Deliberately **not** a
   decaying timer — that taught "click faster", which is the opposite of this
   chapter's lesson. Anything that punishes reading belongs nowhere in Ch3.
6. **Constraint count.** Ch4's TAKT module prunes its generated clue set down
   to the minimum that still pins a unique piston order (`buildTiming` in
   `chapter4.js`); GEWICHT caps weighings at `WEIGH_MAX` (5 — the
   information-theoretic minimum to fully order 4 items). Fewer clues /
   weighings → harder, down to the point where the puzzle stops being
   uniquely solvable.
7. **Free-information budget.** Ch6's Blackbox is tuned by how much it hands
   over before the player experiments: `ARCHIVE_CLEAN` (clean archive runs),
   `MIN_OPEN_ARCHIVE` and `MIN_OPEN_DIAG` (how many of the 125 candidate rules
   must still stand after the archive, and after the stage-2 diagnostic) in
   `chapter6.js`. Raising the minimums forces more player-designed tests;
   dropping them below 2 would let a rigorous player solve it without ever
   touching the machine, which is the one thing this chapter must not allow.
8. **Slack in a budget.** Ch5's 14-G gives exactly the pressure the two
   required systems need (`buildSupply` derives the budget from them), so any
   unit spent on a decoy makes the crossing impossible — that exactness is
   what forces "read the function, not the lamp". Widening the budget by one
   unit would let a careless player brute-force it. Ch5's difficulty otherwise
   lives in *variety and distance*, not in any single constant: the chapter is
   deliberately not tuned by making one station harder.

These are all simple constants — tune, playtest, repeat. Ratings are estimates;
expect to nudge them after a real playthrough.
