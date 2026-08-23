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
| Ch7 — Vexiersektor (FAX-N) | **9.0** | done | ECHTHEITSPRÜFUNG. FAX-N tells the truth; his sector does not. The chapter opens by showing a convincing **fake chapter-complete screen** (presentation only — it never touches the save, the achievement or Sektor 08), then breaks it. Difficulty comes from holding an evidence hierarchy while the interface argues with it. Three reference anchors, each a different failure of presentation: **BESCHRIFTUNG** — three doors whose signs are randomised and uncorrelated with usability; a door opens iff bolt retracted AND cable connected AND hinge free, and the light under the door is a deliberate non-clue. **ANZEIGE** — an on-screen schematic that contradicts the real cable routes; two routes are visible, the rest is proved empirically by flipping a switch and watching which terminal lamp actually lights. **RÜCKMELDUNG** — four switches whose presses the system misnames every single time, while the bolt that physically moves stays honest; the player maps switch→bolt by observation and drives the rack to a target pattern. Then the page itself "crashes" (an in-universe KA-II fault screen, once only, in-page, never claiming anything about the real device) and reboots into a corrupted integrity report. The **final** puts a system instruction and a FAX-N guess against the mechanical evidence — and neither speaker names the working exit, so blind loyalty is not a shortcut. No attempt budget; wrong choices are reversible and funny. sig_05 hides in a counterfeit panel FAX-N recognises as not his (one crooked screw), stays optional, and the system tries to talk the player out of opening it. The room visibly calms as anchors return. One shared 3-step hint ladder per anchor (`HINT_MAX`) plus unlimited coaching — the hint system never lies |
| Ch8 — Archivsektor (AGN-H3R) | **10** | done | DIE ZEHNTE REKONSTRUKTION. AGN-H3R is a *reconstruction* archivist — he rebuilds damaged records and is already at work when the player arrives. The KA-I "nah, don't bother" gag pays off: the system finds **36 fragments**, R-3MI refuses, `[ Nein. Wie damals. ]` awards `jigsaw_refused` — and then the archive resolves the 24 trivial joins itself ("Wir sind Archivare. Keine Sadisten."), leaving **12 meaningful groups on a 3×4 table**. Difficulty is synthesis, not tedium: placement is decided by **archive metadata**, orientation by the **calibration trace**, and neither alone finishes it. Three stated filing rules (every level holds each checksum family once; timestamps rise to the right within a level; the core sits inside) leave ~1 700–3 500 valid filings; 4–7 generated ARCHIVNOTIZEN close that to exactly one. Every instance is generated at runtime and verified before it is shown: unique solution, no note contradicts the filing, **every note necessary** (dropping any one reopens the puzzle), and orientation resolves to one closed trace. Visual continuity alone is provably insufficient — identical trace shapes leave ≥17 280 placements consistent with the picture. No correct-piece counter and no solved-image preview: the readout is qualitative (`INSTABIL` / `STEIGEND` / `KONSISTENT`), and a blind swap moves it 0 % of the time, so there is nothing to hill-climb. Tap to select, tap again to swap, `[ DREHEN ]` to turn, `[ ANSEHEN ]` for the fragment's archive card, `[ ARCHIVNOTIZEN ]` always open. Metadata stays upright while the art turns. The finished mosaic **does something**: it is what puts the eight calibration fragments in reading order, and that order reconstructs the Zieldaten (stored as shifted fragments, see `COORDS.md` — no plaintext coordinates in the source). Ends at Reaktivierung 100 %, official ending first, then the archive checks the five Fremdsignale. One shared 3-step hint ladder (method → anchor → one guaranteed adjacency) plus unlimited conflict-spotting from AGN-H3R; solving with no hint at all awards `archivar`. Full checkpoint: a reload returns to the exact board |
| Ch9 — DIE KAMMER, DIE ES NICHT GIBT (hidden) | outside curve | done | Not on the curve and deliberately not a puzzle — Chapter 8 was the climax, this is the reward for curiosity. Gated on **Chapter 8 complete AND all five Signalnischen**; a direct URL gets an in-universe denial with a route to the Signalarchiv and leaks nothing (no title, no coordinates, no reveal). Opens on a black screen that insists the room is not there (`SEKTOR-ID: —` / `ARCHIVSTATUS: NICHT VORHANDEN` / `KAMMER: NICHT REGISTRIERT`) before the title appears. The room is a working evidence chamber, not a creator museum: three records (the KA-I shutdown authorisation, still valid; a movement log putting two mobile units in the Wartungssektor **before** first contact; a restoration path whose lower branch runs player-authorisation → sector reactivation → admin access → two mobile units), plus a five-channel receiver. The old Brainrot/Crypto exhibits are gone; one unlabelled crate keeps `italian_brainrot` obtainable as pure background. **The five Signalnischen finally pay off**: one ceremonial `[ SYNCHRONISIEREN ]` that cannot fail turns five drifting waveforms into a single warning — the shutdown code was never a reactivation code, the two units cannot unlock the Anlage themselves, and it does not authorise the facility, it authorises *you*. Then the room goes quiet and hands control back: the player picks whom to face, and which of ten questions to ask (five shown at a time, three core ones required, the rest optional). The handover is **not** triggered here — the console reports it as already complete, timestamped at Reaktivierung 100 %, which is the Chapter 7 diagnostic paying off. No fake [ STOP ] button. A five-guest comm burst proves the guests were never in on it, then the facility mutes them. There is no second set of coordinates: the remainder of the warning names the **same** place Chapter 8 reconstructed, and that is exactly what makes it worth hearing — it is the only part of the target that does not come from R-3MI/V-TGM, so it is what proves the two of them did not invent it. Mechanically the same string with a different label (`ZIELDATEN · EXTERN BESTÄTIGT`); for the player, a completionist flourish rather than a second prize. One final response (`[ Ich komme zurück. ]` / `[ Ich vertraue euch nie wieder. ]` / `[ …Hiii. ]`), then the player **leaves**: not trapped, not dismissed. A quiet post-credit stinger and `KALIBRIERUNG BEENDET.` Visually restrained on purpose — steel and archive light, one diagnostic blip, no red horror filter, R-3MI and V-TGM stay recognisably themselves throughout. A `[ PROTOKOLL ]` button replays the whole conversation, every signal has a text transcript, and revisit mode returns the coordinates without repeating anything |

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
8. **Evidence hierarchy.** Ch7 has no numeric knob at all — its difficulty is
   how many presentation layers disagree with the hardware at once, and how
   long the player has to hold "mechanism > lamp > screen" in their head.
   Adding a fourth lying layer would raise it; letting any anchor stabilise
   earlier would lower it. The one hard rule is that only fictional in-game UI
   may lie: hints, mute, settings, saves and navigation stay honest.
9. **Note count and note kind.** Ch8's reconstruction is tuned by how many
   ARCHIVNOTIZEN survive generation (`notes.length < 4 || notes.length > 7`
   rejects an instance in `chapter8.js`) and by the class multiplicities in
   `MULT`. Fewer notes means more of the ~1 700–3 500 valid filings have to be
   eliminated by hand; more notes means the deduction chain is shorter. The
   generator already guarantees the two properties that matter more than the
   count — the solution is unique and *every* note is necessary — so raising
   the ceiling makes it easier, not sloppier. `CORE_SLOTS` (where the core may
   be filed) is the cheapest single lever: widening it multiplies the space.
10. **Slack in a budget.** Ch5's 14-G gives exactly the pressure the two
   required systems need (`buildSupply` derives the budget from them), so any
   unit spent on a decoy makes the crossing impossible — that exactness is
   what forces "read the function, not the lamp". Widening the budget by one
   unit would let a careless player brute-force it. Ch5's difficulty otherwise
   lives in *variety and distance*, not in any single constant: the chapter is
   deliberately not tuned by making one station harder.

These are all simple constants — tune, playtest, repeat. Ratings are estimates;
expect to nudge them after a real playthrough.

---

## After the integration pass

The curve above is unchanged, but three things now hold across all of it.

**Nothing is gated on a secret.** The main Zieldaten come out of Chapter 8
whatever the signal count. Only Chapter 9 needs the five fragments, and only
Chapter 9 is optional.

**A finished sector is not a wall.** Walking back into one opens Nachsuche: the
final room, the puzzle already solved, the optional things still there, and a
way out that does not run through a door you already opened. Nothing points at
what was missed — the search is still a search, only the repetition is gone.
This is what stops a missed Signalnische from costing a whole chapter.

**Difficulty is never the interface.** Every hard thing in the game is hard
because of what it asks you to work out. Where a chapter randomises an
instance, the instance is verified solvable and unique before the player sees
it; where a chapter gives feedback, it is qualitative rather than a number that
can be climbed. If a player is confused about *what they can do* rather than
*what the answer is*, that is a bug in the chapter, not its rating.

**A closed tab is not a penalty.** Sectors 02, 03 and 04 keep the work already
done across a reload — the thaw state, the exposure level, the finished
subsystems — so the only thing a refresh costs is the instance currently on
screen, which regenerates. This matters for the rated chapters more than the
easy ones: nobody should think twice about closing a tab in the middle of the
Vierfach-Schloss.
