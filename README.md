# DIE KALIBRIERUNGSANLAGE II: Die Reaktivierung

A browser puzzle adventure that ends in a set of coordinates. Static HTML, CSS
and JavaScript — no build step, no framework, no backend. It runs from any
static host, GitHub Pages included, and stores nothing anywhere but the
player's own browser.

A sequel: the player is the same test subject who shut the first Anlage down,
and the eight digits they carry over are what gets them back in.

---

## Structure

```
/
├── index.html            Title terminal — boot, sector map, overlays
├── access.html           The KA-I authorisation gate
├── css/
│   ├── global.css        Design system, shared by every page
│   ├── chapter.css       Shared chapter chrome (scaffold chapters)
│   ├── title.css         Title terminal
│   └── access.css        Access gate
├── js/
│   ├── engine.js         GameEngine — load on every page
│   ├── title.js          Title terminal
│   ├── access.js         Authorisation gate
│   └── mobile-warning.js Two-step "better on a bigger screen" notice
├── assets/
│   ├── logo.png
│   ├── portraits/        Optional per-line speaker portraits
│   └── music/            One track per chapter (see MUSIC.md)
└── chapter0/ … chapter9/ chapterN.html · chapterN.js · chapterN.css
```

Every room is drawn in code as inline SVG through `GameEngine.props` — there
are no scene images to ship or lose. Missing audio is not an error: the engine
plays what exists and stays quiet about the rest.

---

## The chapters

| | Sector | Guest | What it asks of you |
|---|---|---|---|
| 00 | Rückkehr | — | Getting back inside |
| 01 | Wartung | R-3MI · V-TGM | Meeting whoever is still here |
| 02 | Garten | F-RØ5CHI | One place, changing as you work |
| 03 | Beobachtung | L-UX | Looking properly, not quickly |
| 04 | Rätsel | B-RADF1SH | Breaking something large into parts |
| 05 | Langstrecke | T-FLON14 | Keeping a route straight, station by station |
| 06 | Versuchskammer | ASP-1024 | Understanding a box without opening it |
| 07 | Vexier | FAX-N | Believing the hardware, not the screen |
| 08 | Archiv | AGN-H3R | Rebuilding a record from its fragments |
| 09 | — | — | Hidden. Not part of the regular route. |

Chapters 00–08 are the game: nine sectors, and the reactivation runs
12 → 24 → 37 → 51 → 68 → 82 → 96 → 100 %. Chapter 9 is bonus content and does
not count towards that.

`DIFFICULTY.md` describes what each chapter actually does, without giving
answers away.

---

## Progression

`GameEngine.progress` owns the running order. A chapter asks
`progress.require('chN')` as the first thing it does; if the player has not got
there yet they get an in-universe refusal and a route to the sector they are
actually up to, rather than a redirect chain or a blank page.

- `access.html` needs the eight digits from the first Anlage.
- Each chapter needs the one before it — and a finished chapter can always be
  entered again.
- Chapter 9 needs Chapter 8 finished **and** all five Signalnischen.

Walking back into a finished sector opens **Nachsuche**: the room in its final
state, the puzzle already solved, the optional things still there, and a way
out that does not run through a door you already opened. Nothing points at what
you missed — you still have to look. All nine sectors have one, and none of
them replays an ending or hands out a completion twice: the object that
finished the chapter answers with a line instead, and a door that promised
the next sector simply leads there, because it is already open. What is
still worth finding — an unheard Signalnische, an archive row nobody
inspected — is still exactly where it was.

First contact in Sector 01 happens exactly once: the empty hall, the KLONK and
the eleven-minute repair belong to that first walk-in and stay there.

Sectors 02, 03 and 04 also survive a reload mid-chapter. What the player has
actually earned — the thaw state, the exposure level, the finished subsystems
and their reference values — is written into `chapterState` and picked back
up on the next load. Live puzzle instances are always generated fresh, so
nothing that was meant to be observed is remembered on the player's behalf.

---

## Signalnischen

Five optional fragments, one each in chapters 3–7. Alone each is a scrap of a
degraded transmission; together they are a single warning, and Chapter 9 is
where they become one. They are never required for the main coordinates.

---

## Coordinates

The main Zieldaten are reconstructed at the end of Chapter 8, regardless of how
many fragments were found. The Bonuszieldaten belong to Chapter 9 and come from
somewhere else entirely. The two are stored separately and neither ever
overwrites the other; both persist, so nothing has to be replayed to read them
back.

Neither set is a readable string in the source. Both live in
`GameEngine.calibration` as shifted fragments that are put back together at the
moment they are earned. This is not security — static JavaScript never is — it
only keeps the answer from falling out of a search. **`COORDS.md` is the one
document you need before release.**

---

## Saves

One key, `ka2_save_v1`, in `localStorage`. Nothing leaves the browser.

`migrate()` carries older saves forward: chapters, signals, achievements and
flags are never dropped, loose per-chapter keys move into their bucket, and
wrong shapes are repaired rather than discarded. The schema version is separate
from the version the game calls itself, so releasing a new build never resets
anybody. A finished run that has somehow lost its coordinates rebuilds them.

`[ SPIELSTAND ]` on the title screen is where a player meets all of this:
what the save holds, a code to copy out and paste into another browser
(`GameEngine.state.exportSave()` / `importSave()` underneath), and an erase
that names what it erases before it takes the second tap.

If `localStorage` is unavailable the game still plays; it simply cannot
remember — and it says so, once, in a toast that points at the backup code
rather than letting the player find out at the end of the evening.

Player preferences live in `settings`. Progress lives in the arrays and in
`chapterState`. Nothing sits loose at the top level any more.

---

## Writing a chapter page

1. Load `css/global.css`, then the chapter's own CSS.
2. Load `js/engine.js` before the chapter script.
3. First line of `init()`: `if (!GameEngine.progress.require('chN')) return;`
4. Register the chapter's art with `GameEngine.props.register({ … })` before
   any hotspot that uses it.
5. Chapters 5–9 build their chrome with `GameEngine.chapter.build({ … })`;
   0–4 predate it and build their own. Both are fine — the point of the
   redesign was that the sectors should not all feel the same.

Puzzles are validated by a solver, not by comparing against a stored answer, so
there is nothing in the source to read off. Generated instances are checked for
a unique solution before the player ever sees them.

---

## Accessibility

- V-TGM speaks English; every line carries a German subtitle.
- Nothing is solvable only by ear. Every audio cue has a visible equivalent.
- `prefers-reduced-motion` is respected throughout; no content is removed with
  it, only the motion.
- No puzzle answer depends on colour alone. Chapter 8's fragments carry their
  metadata and their orientation as words, not as a hue.
- Dialogue can be replayed — Chapter 9 keeps a full `[ PROTOKOLL ]`.
- Overlays open from the keyboard, take focus, close on Escape or on a click
  beside the card, and hand focus back to whatever opened them.
- Under `prefers-reduced-motion` a line of dialogue arrives whole instead of
  typing itself out.
- The dialogue box keeps clear of the phone gesture bar.

---

## Credits

Made by Team_Aperture — R-3MI and V-TGM. ChatGPT (Nova) and Claude were used
as development tools. The full breakdown is in the game's own credits, which
is where it belongs.

*Ein Team_Aperture Geocaching-Projekt.*
