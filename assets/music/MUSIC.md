# Soundtrack — track slots & cues

Placeholder manifest for the KA‑II soundtrack. The engine
(`GameEngine.music`) crossfades looping tracks from this folder. **Right now
no audio files exist** — every cue fails silently until you drop a real
`.mp3` in with the matching filename. Nothing breaks in the meantime.

Compose freely — there's room for up to ~60 tracks. The slots below are the
ones the engine already references (id → filename); add or rename in the
`TRACKS` table at the top of `js/engine.js` if you want more.

## How it works
- `GameEngine.music.play('id')` starts a track (looping, ~0.9 s crossfade).
- It respects the **TON: AN/AUS** toggle (muting pauses music; unmuting resumes).
- Browsers block autoplay until the first interaction, so a track requested on
  page load starts on the **first click/tap** (the engine retries automatically).
- Files are resolved from `assets/music/` (root pages) or `../assets/music/`
  (chapter pages) — handled automatically.

## Where each track is triggered today
| id | filename | when it plays | mood |
|----|----------|---------------|------|
| `title` | `title_theme.mp3` | main menu | eerie but hopeful; the main motif |
| `boot` | `boot_drone.mp3` | boot sequence | low BIOS hum |
| `credits` | `credits_theme.mp3` | credits roll | warm, end-of-journey |
| `ch0_ambient` | `ch0_rueckkehr.mp3` | Kapitel 0 | quiet return, dust settling |
| `ch1_ambient` | `ch1_wartung.mp3` | Kapitel 1 | first sparks of life |
| `ch2_ambient` | `ch2_garten.mp3` | Kapitel 2 | overgrown garden calm |
| `ch3_ambient` | `ch3_beobachtung.mp3` | Kapitel 3 | watched, clinical |
| `ch4_ambient` | `ch4_wuerfel.mp3` | Kapitel 4 | spatial, puzzle-box |
| `ch5_ambient` | `ch5_foerderlauf.mp3` | Kapitel 5 | upbeat, relentless motion |
| `ch6_ambient` | `ch6_dunkelkammer.mp3` | Kapitel 6 | hushed, chemical, tense |
| `ch7_ambient` | `ch7_vexier.mp3` | Kapitel 7 | playful-creepy carnival |
| `ch8_ambient` | `ch8_archiv.mp3` | Kapitel 8 | vast, ominous, knowing |
| `ch9_ambient` | `ch9_bonus.mp3` | bonus chamber | dread / the dark turn |

The cues below are **defined but not yet wired** — call `GameEngine.music.play('id')`
at the moment you want them (e.g. when a guest first appears, when a timed
puzzle opens, when a Signalnische is found). Suggested moments in brackets.

| id | filename | suggested cue |
|----|----------|---------------|
| `theme_froschi` | `theme_froschi.mp3` | F‑RØ5CHI appears |
| `theme_lux` | `theme_lux.mp3` | L‑UX appears |
| `theme_bradf1sh` | `theme_bradfisch.mp3` | B‑RADF1SH appears |
| `theme_tflon` | `theme_tflon14.mp3` | T‑FLON14 appears |
| `theme_asp` | `theme_asp1024.mp3` | ASP‑1024 appears |
| `theme_faxn` | `theme_faxenmeier.mp3` | F‑AXN appears |
| `theme_agn` | `theme_agnher.mp3` | AGN‑H3R appears |
| `puzzle_calm` | `puzzle_calm.mp3` | gentle puzzle underscore |
| `puzzle_tense` | `puzzle_tense.mp3` | hard puzzle underscore |
| `puzzle_timed` | `puzzle_timed.mp3` | FÖRDERLAUF (Ch5) |
| `puzzle_forensic` | `puzzle_forensic.mp3` | BILDFORENSIK (Ch6) |
| `puzzle_deduce` | `puzzle_deduction.mp3` | VEXIERSCHLOSS (Ch7) |
| `puzzle_finale` | `puzzle_finale.mp3` | the jigsaw (Ch8) |
| `countdown` | `countdown_panic.mp3` | clock < 25 % |
| `transmission` | `the_transmission.mp3` | recurring "Transmission" motif |
| `signal_found` | `signal_discovery.mp3` | a Signalnische is found |
| `coordinates` | `coordinates_reveal.mp3` | the coordinates appear (Ch8) |
| `reactivation` | `reactivation_100.mp3` | Reaktivierung hits 100 % |
| `bonus_intro` | `bonus_intro.mp3` | entering the bonus chamber |
| `bonus_truth` | `bonus_truth.mp3` | the R‑3MI/V‑TGM reveal |
| `bonus_finale` | `bonus_finale.mp3` | bonus chamber finale |

## Adding a track
1. Compose/export an `.mp3` (loopable for ambiences).
2. Name it exactly as in the table and drop it in `assets/music/`.
3. Bump the cache-buster (`?v=`) only matters for code, not these mp3s.
4. To add a brand-new slot, add `id: 'filename.mp3'` to `TRACKS` in `js/engine.js`.
