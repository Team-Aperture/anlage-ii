# ═══════════════════════════════════════════════════════════════
# CG PROMPT BIBLE — DIE KALIBRIERUNGSANLAGE II
# Konsistente Bildgenerierung für ChatGPT / DALL-E / Midjourney / Flux
# ═══════════════════════════════════════════════════════════════

## WIE DU DIESE PROMPTS BENUTZT

1. Kopiere zuerst den **STYLE ANCHOR** unten — der ist für JEDEN Prompt gleich
2. Dann hänge die spezifische Szenenbeschreibung an
3. Generiere als **16:9** (1920×1080 oder ähnlich)
4. Speichere unter dem Dateinamen, der bei jeder Szene angegeben ist
5. Lade die fertige Datei in den entsprechenden `cg/` Ordner

**WICHTIG zur Hotspot-Position:** Die Prozentangaben in jeder Szene
(z.B. "Tür bei 78%/25%") referenzieren wo das Objekt im Bild SEIN MUSS,
damit die klickbaren Bereiche im Spiel dazu passen. Der KI-Generator
hält sich nicht immer perfekt daran — das ist OK, dann kann ich später
die Hotspot-Positionen im Code anpassen.

---

## STYLE ANCHOR (für jeden Prompt voranstellen)

```
Cinematic 16:9 photorealistic 3D render, AAA video game key art quality.
Aesthetic: industrial sci-fi with heavy decay, ivy and moss overgrowth,
weathered steel and concrete, Half-Life 2 / Portal inspired but darker.

Color palette (mandatory):
- Background tones: very dark teal #04080c, near-black shadows
- Steel: weathered gunmetal gray, slight green oxidation
- Ivy/moss: deep natural green, realistic plant detail
- Emergency green light: sickly bright green #2ecf62
- Warning red: dim red #d93333
- Dust haze in light beams

Lighting: dramatic chiaroscuro, hard rim lighting from emergency lamps,
deep black shadows, slight atmospheric haze. NOT bright. NOT colorful.
Mood is ominous, abandoned, slightly post-apocalyptic but PRECISE —
this place was engineered, not just left to rot.

Composition: leave bottom 18% of frame relatively unobstructed for game UI.
NO text in the scene. NO floating UI elements. NO characters unless specified.
Style: photorealistic. NOT illustrated. NOT cartoon. NOT anime.
```

---
---

# ═══════════════════════════════════════════════════════════════
# KAPITEL 0 — RÜCKKEHR
# ═══════════════════════════════════════════════════════════════

## ch0_entrance.png
**Dateipfad:** `chapter0/cg/ch0_entrance.png`

```
[STYLE ANCHOR]

Scene: Interior view of an abandoned industrial calibration facility
entrance foyer. Dominating the center: a massive circular sealed vault
door, ~4 meters diameter, weathered dark steel with riveted edges,
heavy green ivy creeping across its surface.

Around the door's outer ring, FOUR small embossed symbols are visible:
- circle/dot (●) at the TOP of the door
- triangle (▲) on the RIGHT side
- square (■) at the BOTTOM
- hexagon (⬡) on the LEFT

A faint sickly green light bleeds through the door seams.

Around the room, position FOUR distinct interactive objects (visually
clear, but understated, weathered):

  1. Weathered warning placard / sign on the LOWER-LEFT wall
     (target position: ~12% from left, ~60% from top)
  2. Rusted maintenance plaque on the UPPER-RIGHT wall
     (target position: ~78% from left, ~22% from top)
  3. Faded floor markings on the BOTTOM-CENTER floor
     (target position: ~32% from left, ~82% from top)
  4. Ivy-covered wall panel on the RIGHT side, mid-height
     (target position: ~84% from left, ~70% from top)

NO TEXT visible on any of these objects.

The door itself should occupy roughly the center 24% width × 44% height
of the frame, centered horizontally, slightly above center vertically.

Cracked concrete floor with debris. Broken pipes. Fallen warning signs
(no readable text). Faint dust shafts from overhead emergency lighting.
```

---
---

# ═══════════════════════════════════════════════════════════════
# KAPITEL 1 — DIE WARTUNGSEINHEITEN
# ═══════════════════════════════════════════════════════════════

## ch1_hall_empty.png
**Dateipfad:** `chapter1/cg/ch1_hall_empty.png`
**Zweck:** Erste Halle, bevor R-3MI und V-TGM erscheinen

```
[STYLE ANCHOR]

Scene: Long interior corridor of an abandoned calibration facility,
viewed from a first-person perspective. Old cracked concrete floor with
broken displaced floor plates (NOT collapsed, just shifted, as if
something light and metallic jumped across them). Walls have ivy
creeping through seams.

In the distance at the end of the corridor: a dead computer terminal
with a single small RED LED blinking faintly underneath the screen
(target: ~50% from left, ~55% from top — center of frame, mid distance).

On the LEFT wall: an old industrial test sign, weathered and partially
covered with ivy (target: ~18% from left, ~45% from top). Sign should be
visibly there but text not readable.

On the upper-right area of the back wall: closed door, faintly glowing
red around its edges, suggesting it cannot be opened from this side
(target: ~82% from left, ~25% from top).

In the middle-bottom of the floor: visibly displaced concrete plates
(target: ~40% from left, ~72% from top).

The corridor itself stretches into darkness. Far at the very end of the
hall (around 50% horizontal, 30% vertical), there is a darker opening
suggesting another corridor leading deeper into the facility.

Heavy moss and ivy on the walls. Dust particles visible in faint shafts
of dim emergency light. NO characters. NO robots.
```

---

## ch1_hall_robots_distance.png
**Dateipfad:** `chapter1/cg/ch1_hall_robots_distance.png`
**Zweck:** R-3MI und V-TGM springen in der Ferne von Stein zu Stein

```
[STYLE ANCHOR]

Scene: Same long corridor as before, but viewed slightly differently —
now showing a section of broken stone floor plates spanning a slight gap.

Two SMALL ROBOTS (about cat-sized, definitely not humanoid scale) are
mid-jump between two broken stone plates in the MIDDLE-DISTANCE of the
hall, around the center-back of the frame.

The robots:
- LEFT robot: small dark metallic body with a single bright GREEN glowing
  optical lens / camera eye, roughly 1cm visible glow (this is R-3MI)
- RIGHT robot: small dark metallic body with a single bright RED
  glowing optical lens / camera eye (this is V-TGM)

They are caught mid-leap, blurred slightly with motion. They look more
like curious mechanical animals than threatening machines — playful,
small, agile.

Position both robots roughly:
- Green-eyed (R-3MI): ~46% from left, ~58% from top
- Red-eyed (V-TGM): ~55% from left, ~60% from top

Same atmospheric setting: cracked concrete, ivy, dim emergency lighting,
dust haze.
```

---

## ch1_hall_robots_behind.png
**Dateipfad:** `chapter1/cg/ch1_hall_robots_behind.png`
**Zweck:** Die Roboter sind plötzlich direkt hinter dem Spieler — extreme Nahaufnahme

```
[STYLE ANCHOR]

Scene: Looking down a corridor — but now the perspective implies the
viewer has just turned around. Two small robot eyes glow in the
foreground, much closer than before, almost startlingly close — as if
they suddenly appeared right behind the camera.

Just two glowing eye-points in slightly upper-center frame:
- LEFT eye: bright green glow, soft halo (R-3MI)
- RIGHT eye: bright red glow, soft halo (V-TGM)

The bodies of the robots are barely visible in the dim light — small
metallic silhouettes. The eyes dominate. The corridor stretches behind
them into deeper darkness.

Eye positions in frame:
- Green eye (R-3MI): ~43% from left, ~52% from top
- Red eye (V-TGM): ~57% from left, ~52% from top

Depth-of-field: eyes are sharp focus, background blurred slightly.
Tone: ominous but charming, not horror — these are the protagonists,
the surprise should feel like a friendly jump-scare, not a threat.
```

---

## ch1_room_a.png
**Dateipfad:** `chapter1/cg/ch1_room_a.png`
**Zweck:** Erste innere Halle (Raum A) — Spieler und Roboter sind drin, das ist der "Hauptraum" für Rätsel 1

```
[STYLE ANCHOR]

Scene: A medium-sized industrial room, the first interior space of the
facility. Less ivy than the entrance corridor, but still some moss in
corners and seams. The room feels dim but functional.

Visible elements (each at specific position):

1. A computer TERMINAL on the right side, mounted to the wall, screen
   currently dark with a faint red LED blinking. Looks like a
   maintenance workstation with cables running into the wall.
   Position: ~68% from left, ~55% from top

2. A wall SCRATCH on the left wall — a single deliberate-looking line
   carved/scratched into the concrete, beginning sharp and clean,
   becoming wobbly, ending abruptly. Slightly worn.
   Position: ~22% from left, ~40% from top

3. An old industrial test SIGN low on the left wall:
   "TESTEN. MESSEN. VERBESSERN." — but the text should be barely
   legible, weathered, partially obscured.
   Position: ~15% from left, ~60% from top

4. A LARGE INNER GATE/DOOR at the far back-right of the room, visibly
   sealed shut, with a small status panel beside it glowing faint red.
   Position: ~78% from left, ~35% from top

NO characters in scene. NO robots visible — they will be added as
overlay UI elements in the corner.

Atmosphere: cool industrial fluorescent flicker mixed with dim
emergency green. Cracked concrete floor. Pipes running across the
ceiling. Cables on walls.
```

---

## ch1_corridor_ab.png
**Dateipfad:** `chapter1/cg/ch1_corridor_ab.png`
**Zweck:** Schmaler Verbindungskorridor zwischen Raum A und Raum B

```
[STYLE ANCHOR]

Scene: A narrow industrial maintenance corridor, perhaps 1.5 meters
wide, viewed in first person. The walls have flickering strips of
emergency lighting — RED light strips on the LEFT wall, GREEN light
strips on the RIGHT wall, both pulsing slightly.

The light strips are recessed into wall channels and create dramatic
side-lighting on the metal walls.

At the far end of the corridor: a partially-open metal gate/door,
raised about 60% — leaving a gap at the bottom that a person would
have to duck through. Beyond it, a faint warm glow suggests the next
room.

The corridor floor is industrial steel grating with cables running
beneath it. Walls are dark gunmetal panels with rivets.

NO characters. Pure transition shot.

Mood: tense, anticipatory, like passing through a security threshold.
The red/green dual-lighting matches the R-3MI / V-TGM color scheme.
```

---

## ch1_room_b.png
**Dateipfad:** `chapter1/cg/ch1_room_b.png`
**Zweck:** Wartungsknoten — runder Raum für Rätsel 2

```
[STYLE ANCHOR]

Scene: A circular maintenance node room, deeper inside the facility.
Less organic decay here — this is the technical core. The walls are
heavy industrial metal with visible cabling routed in organized channels.

Visible elements:

1. Central CONSOLE / control desk in the middle-center of the room,
   currently locked, with a screen showing static or a "locked" icon.
   The desk has a curved sci-fi industrial design.
   Position: ~46% from left, ~40% from top

2. A RED conduit / power line running vertically along the LEFT wall
   from floor to console, pulsing in an irregular unhealthy rhythm.
   Position: ~12% from left, ~35% from top, vertical strip

3. A GREEN conduit / power line running vertically along the RIGHT wall
   from floor to console, pulsing steadily and cleanly.
   Position: ~82% from left, ~35% from top, vertical strip

4. An old MAINTENANCE POSTER mounted low on the lower-left wall,
   yellowed and worn. (No readable text — text added by game.)
   Position: ~25% from left, ~72% from top

5. A LARGE LOCKED DOOR at the back/upper area of the room, marked with
   a small "02" insignia. This is the door to the next chapter.
   Position: ~58% from left, ~18% from top

6. A small dark VENTILATION SHAFT opening near the floor on the right
   side, square grating, deeply shadowed inside.
   Position: ~88% from left, ~70% from top

NO characters visible.

Atmosphere: this is a "machine heart" room — colder, more technical,
more deliberate than the previous spaces. Slightly ominous because it's
working when nothing else really is.
```

---

## ch1_door_open.png
**Dateipfad:** `chapter1/cg/ch1_door_open.png`
**Zweck:** Gleicher Raum B, aber die Sektor-02-Tür ist jetzt offen — warmer grüner Schein dahinter

```
[STYLE ANCHOR]

Scene: SAME composition as ch1_room_b.png — same circular maintenance
node room, same camera angle, same elements in same positions —
BUT the large locked door at the back has now opened.

Through the open doorway:
- A warmer, more humid green glow bleeds through
- Suggestions of vegetation, hanging vines, water mist in the air
- The light is more saturated green than the cold emergency lighting
- Hints of motion — perhaps a faint silhouette of something hopping
  or moving in the distance (very subtle, do NOT make it scary or
  prominent)

Otherwise the room is identical to ch1_room_b.png. This is essentially
the "after" version of the same scene.

Mood: the contrast between the technical cold room and the lush warm
glow beyond hints at a major environmental shift coming next chapter.
Inviting, not threatening — but also slightly weird.
```

---
---

# ═══════════════════════════════════════════════════════════════
# KAPITEL 2 — WARTUNGSGARTEN (Gast: F-RØ5CHI)
# ═══════════════════════════════════════════════════════════════

## ch2_garden_frozen.png
**Dateipfad:** `chapter2/cg/ch2_garden_frozen.png`
**Zweck:** Überwucherter Wartungsgarten, komplett von Frost überzogen

```
[STYLE ANCHOR — but add a layer of pale blue frost/ice over everything]

Scene: A large abandoned indoor maintenance garden inside the facility —
a glass-and-steel atrium once used to grow plants, now completely frozen.
Everything is coated in pale blue-white frost and ice (#d6f2ff). Hanging
vines and overgrown plants are frozen mid-droop, encased in ice. Shafts
of cold light fall through a cracked glass ceiling.

Interactive objects (weathered, frosted, no readable text):
1. A frozen PLANTER BED / raised garden trough, center-low
   (target: ~46% from left, ~70% from top)
2. A "WATER ORGAN" — a cluster of vertical brass/steel pipes and valves
   on the LEFT, icicles hanging from them (target: ~10% from left, ~50% top)
3. An ICE-ENCASED TABLET/PLAQUE on the lower-left — a flat engraved panel
   sealed under a thick layer of ice, faintly glowing PINK (#e84a8c) from
   within (target: ~20% from left, ~60% from top). THIS IS THE PUZZLE OBJECT.
4. A maintenance VENT/shaft, lower-right (target: ~88% from left, ~78% top)
5. A frozen decorative ICE SCULPTURE, mid-right (target: ~80% top area)
6. A small frozen FOUNTAIN basin, bottom-center-right

Mood: beautiful but melancholic, a dead winter garden. Pale, cold,
crystalline. The pink glow of the tablet is the only warm-ish accent.
```

---

## ch2_pavilion_frozen.png
**Dateipfad:** `chapter2/cg/ch2_pavilion_frozen.png`
**Zweck:** Näherer Blick auf den zentralen Pavillon, wo F-RØ5CHI sitzt

```
[STYLE ANCHOR — frosted, same garden]

Scene: A closer view of the central pavilion of the frozen garden — a
small ornate steel gazebo encased in ice. Seated on a frozen pedestal in
the center: F-RØ5CHI, a small charming maintenance robot shaped like a
FROG, dark metallic body with PINK (#e84a8c) accent panels and a tiny
crooked CROWN, two large round stalked camera eyes glowing soft pink.
About cat-sized. It looks gentle, old, a little regal and sad.

Position the frog robot center-frame (~50% from left, ~52% from top).
Frost everywhere. Pink eye-glow reflecting off the ice. Soft, intimate,
storybook-melancholic mood.
```

---

## ch2_garden_thawed.png
**Dateipfad:** `chapter2/cg/ch2_garden_thawed.png`
**Zweck:** Gleicher Garten NACH dem Lösen — das Eis schmilzt, Leben kehrt zurück

```
[STYLE ANCHOR — same garden as ch2_garden_frozen, but THAWING]

Scene: SAME composition as ch2_garden_frozen.png — same atrium, same
camera, same objects in the same positions — but the ice is now melting.
Water drips and runs. The frost has retreated. A few real green leaves
and shoots show through where plants are reviving. Warmer, softer light
through the glass ceiling. The pink glow of the tablet is now steady and
calm. Puddles reflect the light. Mood: relief, quiet renewal, the first
warmth this place has felt in years.
```

---
---

# ═══════════════════════════════════════════════════════════════
# KAPITEL 3 — BEOBACHTUNGSSEKTOR (Gast: L-UX)
# ═══════════════════════════════════════════════════════════════

## ch3_observation.png
**Dateipfad:** `chapter3/cg/ch3_observation.png`
**Zweck:** Dunkler Beobachtungssektor, Belichtungsrätsel-Raum

```
[STYLE ANCHOR — very dark, optical instruments]

Scene: A dim observation / optics laboratory inside the facility. Walls
lined with dead monitors, lens housings, calibration mirrors and sensor
arrays. Everything dark and dusty, faint orange standby glow on a few
instruments (#e8893a). A large central optical apparatus dominates.

Interactive objects:
1. A central OBSERVATION ARRAY — a big multi-lens sensor rig / camera
   array on a mount, the main instrument (target: ~50% from left, ~52% top).
   THIS IS THE PUZZLE OBJECT; give it a faint warm orange glow.
2. An ADJUSTMENT MIRROR on an articulated arm, LEFT
   (target: ~17% from left, ~40% from top)
3. A MEASUREMENT-LOG terminal / readout, RIGHT
   (target: ~80% from left, ~55% from top)
4. A single FLICKERING LENS high on the upper-right wall, blinking
   irregularly (target: ~88% from left, ~24% from top)

Mood: clinical, watched, the feeling of optics pointed at YOU. Cold and
precise. Orange is the only living color.
```

---

## ch3_observation_lit.png
**Dateipfad:** `chapter3/cg/ch3_observation_lit.png`
**Zweck:** Gleicher Raum, Instrumente erwachen (warm orange)

```
[STYLE ANCHOR — same observation lab, now powered/lit]

Scene: SAME composition as ch3_observation.png — same room, same camera,
same objects — but the instruments have woken up. Monitors glow, the
central array hums with warm orange (#e8893a) light, lens rings illuminate.
The dust now drifts through visible warm beams. Mood: a sleeping eye
opening. Still clinical, but alive.
```

---

## ch3_lux.png
**Dateipfad:** `chapter3/cg/ch3_lux.png`
**Zweck:** L-UX erscheint — hyperaktiver oranger Katzen-Roboter

```
[STYLE ANCHOR — observation lab, with character]

Scene: The observation lab, with L-UX present — a small, hyper, agile
maintenance robot shaped like a CAT, dark metallic body with bright
ORANGE (#e8893a) accent panels, pointed antenna-ears, whiskers, and two
round camera eyes glowing vivid orange. About cat-sized. Caught in a
quick, restless pose — perched on an instrument, tail-cable flicking,
mid-motion, slight motion blur. Looks fast, curious, jittery, playful.

Position L-UX ~50% from left, ~50% from top. Bright orange eye-glow
lighting the nearby instruments. Energetic, electric mood.
```

---
---

# ═══════════════════════════════════════════════════════════════
# KAPITEL 4 — RÄTSELSEKTOR / TRESOR (Gast: B-RADF1SH)
# ═══════════════════════════════════════════════════════════════

## ch4_vault.png
**Dateipfad:** `chapter4/cg/ch4_vault.png`
**Zweck:** Tresor-/Rätselraum mit dem zentralen Würfel

```
[STYLE ANCHOR — heavy vault, yellow standby accents]

Scene: A heavy reinforced vault chamber, thick steel walls, the most
secure room so far. In the center sits a large mysterious metal CUBE on
a pedestal — matte dark alloy with faintly glowing YELLOW (#f3c623)
seams running across its faces, like a sealed puzzle box. Cables and
clamps hold it in place.

Interactive objects:
1. The CUBE, center, on its pedestal (target: ~50% from left, ~50% top).
   THIS IS THE PUZZLE OBJECT. Yellow glowing seams.
2. A wall STORAGE PLAN / blueprint panel, LEFT
   (target: ~17% from left, ~42% from top)
3. A weathered BROWN PLASTIC BOX (an ordinary lunchbox-style brown
   container, clearly out of place among the steel — an old hidden cache),
   tucked low on the RIGHT (target: ~86% from left, ~76% from top)
4. Hanging work light up top, heavy pipes along the left wall

Mood: secure, deliberate, archival. The cube is hypnotic. The little
brown box is a deliberate human-scale oddity in an inhuman room.
```

---

## ch4_bradfish.png
**Dateipfad:** `chapter4/cg/ch4_bradfish.png`
**Zweck:** B-RADF1SH erscheint — gelber Fisch-Roboter, Veteran

```
[STYLE ANCHOR — vault, with character]

Scene: The vault chamber, with B-RADF1SH present — a small dignified
maintenance robot shaped like a FISH, dark metallic body with bright
YELLOW (#f3c623) accent panels, a tail fin, and one large round camera
eye glowing warm yellow. About cat-sized. It hovers/floats slightly,
calm and confident, an old veteran who has solved everything here before.

Position B-RADF1SH ~48% from left, ~48% from top, near the cube. Yellow
eye-glow on the steel. Mood: quiet mastery, patience, respect.
```

---
---

# ═══════════════════════════════════════════════════════════════
# KAPITEL 5 — FÖRDERSEKTOR (Gast: T-FLON14)
# ═══════════════════════════════════════════════════════════════

## ch5_trail.png
**Dateipfad:** `chapter5/cg/ch5_trail.png`
**Zweck:** Endlos langer Förderband-Gang ("Strecke")

```
[STYLE ANCHOR — long conveyor corridor, cool blue accents]

Scene: An impossibly long industrial corridor lined on both sides with
idle CONVEYOR BELTS running into the vanishing distance. Hundreds of tiny
sealed lockers/hatches recede down the walls. Cool BLUE (#36b8e8) standby
strips light the track. Strong one-point perspective pulling the eye to
the far end.

Interactive objects:
1. A START-LINE console / starting gate near center
   (target: ~50% from left, ~52% from top). THIS IS THE PUZZLE OBJECT —
   give it a blue glow.
2. A crooked TRACK MARKER sign, LEFT (target: ~16% from left, ~44% top)
3. An old DISPLAY BOARD (leaderboard) mounted RIGHT
   (target: ~82% from left, ~52% from top)
4. Hanging work light up top, pipes left wall

Mood: relentless motion frozen in stillness, the ghost of a busy
production line. Blue, fast-feeling, lonely.
```

---

## ch5_tflon.png
**Dateipfad:** `chapter5/cg/ch5_tflon.png`
**Zweck:** T-FLON14 erscheint — schneller blauer Pfannen-Roboter

```
[STYLE ANCHOR — conveyor corridor, with character]

Scene: The conveyor corridor, with T-FLON14 present — a small, sleek,
frictionless maintenance robot whose body resembles a non-stick PAN /
disc with a handle, dark metallic with bright BLUE (#36b8e8) accents and
a round screen-face showing a cheerful cyan smiley. About cat-sized.
Shown mid-glide along a conveyor rail, motion-blurred, clearly FAST and
upbeat — a relentless coach who never stops moving.

Position T-FLON14 ~50% from left, ~52% from top. Blue glow streaking.
Mood: energetic, warm, perpetual motion.
```

---
---

# ═══════════════════════════════════════════════════════════════
# KAPITEL 6 — DUNKELKAMMER (Gast: ASP-1024)
# ═══════════════════════════════════════════════════════════════

## ch6_darkroom.png
**Dateipfad:** `chapter6/cg/ch6_darkroom.png`
**Zweck:** Foto-Dunkelkammer / Bildforensik-Labor

```
[STYLE ANCHOR — near-black darkroom, faint grey]

Scene: A photographic darkroom / image-forensics lab, almost completely
dark. Rows of dead screens. Photo prints hang on lines from the ceiling,
light-tight curtains everywhere. A faint cold GREY (#c7ccd6) safelight.
It smells (visually) of chemistry and patience.

Interactive objects:
1. An EXPOSED PLATE under glass, center — a single grainy photographic
   plate on a lit stand (target: ~50% from left, ~50% from top). THIS IS
   THE PUZZLE OBJECT; faint grey glow.
2. An IMAGE ARCHIVE shelf of prints, LEFT (target: ~14% from left, ~42% top)
3. A small LOGBOOK on a stand, RIGHT (target: ~82% from left, ~58% from top)

Mood: hushed, secretive, monochrome. Everything hidden, nothing loud.
The grey safelight is the only color.
```

---

## ch6_asp.png
**Dateipfad:** `chapter6/cg/ch6_asp.png`
**Zweck:** ASP-1024 erscheint — stiller grauer Maus-Roboter

```
[STYLE ANCHOR — darkroom, with character]

Scene: The darkroom, with ASP-1024 present — a small, still, silent
maintenance robot shaped like a MOUSE, light grey/white metallic body
(#c7ccd6), big round ears, a tiny nose, whiskers, and two small round
camera eyes glowing soft pale grey-white. About mouse/cat-sized. Sitting
perfectly motionless before a black screen, having noticed you long ago.

Position ASP-1024 ~50% from left, ~54% from top. Minimal glow. Mood:
profound stillness, quiet legend, the silence of someone who already
knows everything.
```

---
---

# ═══════════════════════════════════════════════════════════════
# KAPITEL 7 — VEXIERSEKTOR (Gast: FAX-N)
# ═══════════════════════════════════════════════════════════════

## ch7_vexier.png
**Dateipfad:** `chapter7/cg/ch7_vexier.png`
**Zweck:** Trick-/Vexiersektor — falsche Türen, lügende Hebel

```
[STYLE ANCHOR — trick stage, red accents, theatrical]

Scene: A bizarre "trick" sector — a hall full of FALSE doors painted onto
the walls, levers that connect to nothing, fake-out fixtures. Some doors
are real, some are flat paintings (subtle, you almost can't tell). Red
(#ff4733) accent light, slightly theatrical, like an abandoned funhouse
built inside an industrial facility.

Interactive objects:
1. A real VEXIER-LOCK panel, center — an ornate trick lock with four
   empty seal-slots and a grin etched into the metal (target: ~50% from
   left, ~52% from top). THIS IS THE PUZZLE OBJECT; red glow.
2. A LEVER on the LEFT wall (target: ~24% from left, ~52% from top)
3. A TRICK PAINTING (a painted-on door/lock, framed) RIGHT-center
   (target: ~68% from left, ~38% from top)
4. A "FOOL'S BOOK" on a stand, far RIGHT (target: ~86% from left, ~52% top)

Mood: playful but unsettling, a prankster's stage. Red, grinning,
deceptive. The eye can't trust what's a door and what's paint.
```

---

## ch7_faxn.png
**Dateipfad:** `chapter7/cg/ch7_faxn.png`
**Zweck:** FAX-N erscheint — knallroter Kürbiskopf-Roboter, Trickster

```
[STYLE ANCHOR — trick stage, with character]

Scene: The trick hall, with FAX-N present — a small mischievous
maintenance robot whose head is a glowing bright RED (#ff4733) carved
JACK-O'-LANTERN / pumpkin, dark metallic body, jagged grinning mouth and
triangular eyes that FLICKER like a candle. About cat-sized. Posed
theatrically mid-gesture, presenting the trick lock like a showman,
grinning ear to ear.

Position FAX-N ~50% from left, ~50% from top. Flickering red glow casting
dancing shadows on the false doors. Mood: gleeful, sly, a little eerie —
a friendly trickster who is always, always first.
```

---
---

# ═══════════════════════════════════════════════════════════════
# KAPITEL 8 — ARCHIVSEKTOR (Gast: AGN-H3R) — Finale
# ═══════════════════════════════════════════════════════════════

## ch8_archive.png
**Dateipfad:** `chapter8/cg/ch8_archive.png`
**Zweck:** Endloses Archiv — Regale bis ins Dunkel

```
[STYLE ANCHOR — vast archive, bone-white accents]

Scene: An immense archive hall — towering shelves of files, boxes and
records receding up into darkness and back into a vanishing point. Every
file labelled, every box dated; nothing here was ever thrown away. Cold
BONE-WHITE (#d6dae2) light. Dust hangs in the still air. Cathedral-like,
solemn.

Interactive objects:
1. THE TENTH PUZZLE — a framed record / lightbox in the center showing a
   half-assembled image in scattered tiles (target: ~50% from left, ~52%
   from top). THIS IS THE PUZZLE OBJECT; bone-white glow.
2. A FILE SHELF, LEFT (target: ~18% from left, ~46% from top)
3. A large LEDGER / master book on a lectern, RIGHT
   (target: ~82% from left, ~56% from top)
4. Tall archive shelves framing both far edges of the frame

Mood: vast, silent, knowing. The room of someone who remembers everything.
Solemn, final, slightly oppressive.
```

---

## ch8_agn.png
**Dateipfad:** `chapter8/cg/ch8_agn.png`
**Zweck:** AGN-H3R erscheint — schwarzer Schädel-Roboter, Archivar

```
[STYLE ANCHOR — archive, with character]

Scene: The archive, with AGN-H3R present — a small, utterly still
maintenance robot whose head is a matte BLACK SKULL with bone-white
(#d6dae2) markings and crossbones motif, dark body, two deep round eye
sockets glowing faint cold white. About cat-sized. Seated motionless at
the end of the central aisle before nine finished framed pictures and one
scattered tenth. It never laughs — not from sadness, but because it KNOWS.

Position AGN-H3R ~50% from left, ~52% from top. Faint white eye-glow.
Mood: ominous, patient, the keeper of an unwelcome truth.
```

---
---

# ═══════════════════════════════════════════════════════════════
# KAPITEL 9 — DIE KAMMER, DIE ES NICHT GIBT (versteckter Bonus)
# ═══════════════════════════════════════════════════════════════

## ch9_chamber.png
**Dateipfad:** `chapter9/cg/ch9_chamber.png`
**Zweck:** Versteckte Kammer — Archiv vergangener "Projekte", vor dem Twist

```
[STYLE ANCHOR — hidden vault, oppressive red-violet undertone]

Scene: A small hidden chamber that appears on no map — a private "trophy"
archive. Three faintly glowing display cases / exhibits stand in a row on
plinths, holding strange old objects under glass. The walls are near-black
with a sickly red-violet undertone. A subtle wrongness in the air; this
room should NOT exist.

Interactive objects (display cases):
1. A case holding a derpy object — a small fridge with camel humps and a
   camel face (the "Italian Brainrot" relic) — LEFT
   (target: ~22% from left, ~56% from top)
2. A case of COLOUR-SWATCH plates / a colour-cipher key — CENTER
   (target: ~50% from left, ~50% from top)
3. A case holding a brown plastic box, cut open, with five paper strips
   beside it ("The Transmission") — RIGHT
   (target: ~78% from left, ~56% from top)

Leave the CENTER-LOWER area empty/clean (a glitch hotspot appears there
in-game). Mood: secret, nostalgic, then quietly dreadful — a shrine you
were never meant to find.
```

---
---

# ═══════════════════════════════════════════════════════════════
# CHARAKTERPORTRAITS (für das Dialogsystem — optional aber sehr nice)
# ═══════════════════════════════════════════════════════════════

Wenn du Portraits machst: jedes als **separate transparente PNG**,
quadratisches Format, Kopf/Schulter-Frame, 256×256 oder 512×512px.

## Portrait — R-3MI
**Dateipfad:** `assets/portraits/r3mi_neutral.png`

```
A small, charming maintenance robot character portrait, head and
shoulders frame, transparent background, square 1:1 ratio.

The robot has a sleek but slightly weathered industrial design — small
in scale (cat-sized in lore but the portrait shows them stylized
larger). Body is dark metallic gray with faint green accent panels.

Single round LARGE camera eye/lens GLOWING BRIGHT GREEN (#2ecf62) —
expressive, almost cartoon-like in how the eye conveys emotion.
The eye should look slightly mischievous, sarcastic, charming —
think a friendly but tricky character.

Style: stylized 3D render with clean lines, NOT photorealistic for
the character (but in same world as the photorealistic environments).
A bit like Wall-E meets Portal turret aesthetics but smaller and
quicker-feeling.

NO body damage. NO ivy. Clean portrait shot for UI.

Other variants to make later (same character, different expressions):
- r3mi_happy.png    — eye slightly squinted, "smiling"
- r3mi_panic.png    — eye wider, slight glitch effect
- r3mi_curious.png  — eye tilted, head slightly cocked
- r3mi_proud.png    — eye narrow and confident
- r3mi_neutral.png  — default expression
- r3mi_annoyed.png  — eye half-lidded
- r3mi_suspicious.png — eye narrowed
```

## Portrait — V-TGM
**Dateipfad:** `assets/portraits/vtgm_neutral.png`

```
A small, elegant maintenance robot character portrait, head and
shoulders frame, transparent background, square 1:1 ratio.

Similar scale and aesthetic to R-3MI but distinctly different — more
refined, calmer silhouette, slightly more rounded forms. Body is dark
metallic gray with faint red accent panels.

Single round LARGE camera eye/lens GLOWING BRIGHT RED (#d93333) —
expressive but more composed than R-3MI. The eye conveys careful
observation, quiet intelligence, occasional gentle amusement.

Style: matches R-3MI portrait style — same world, same stylization
level. The visual contrast between R-3MI's green and V-TGM's red
should be the immediate read.

Variants to make later:
- vtgm_neutral.png   — default
- vtgm_happy.png     — eye softly bright
- vtgm_curious.png   — head slightly tilted
- vtgm_proud.png     — eye steady and confident
- vtgm_suspicious.png — eye narrowed slightly
- vtgm_annoyed.png   — flat eye expression
```

---

## NOTES FOR REMI

- **This list is now COMPLETE** — every scene in the game (Ch0–Ch9, all
  23 scene files) has a prompt. Realism is the goal: photoreal 3D render,
  cinematic, NOT illustrated. Aspect **16:9** for all of them.

- **Generation priority (most-seen first):**
  1. The **dim/establishing** scene of each chapter (ch1_hall_empty,
     ch2_garden_frozen, ch3_observation, ch4_vault, ch5_trail,
     ch6_darkroom, ch7_vexier, ch8_archive, ch9_chamber, ch0_entrance)
  2. The **guest-present** scene of each chapter (ch3_lux, ch4_bradfish,
     ch5_tflon, ch6_asp, ch7_faxn, ch8_agn, ch2_pavilion)
  3. The **variant/transition** scenes (ch1_room/corridor/door_open,
     ch2_thawed, ch3_observation_lit) — generate the base first, then ask
     for "same scene, same camera, but [what changed]"
  4. Character portraits are optional — the SVG faces already work in-game.

- **One file per name:** drop each finished PNG into the `cg/` folder shown
  under its prompt (e.g. `chapter7/cg/ch7_vexier.png`). The image system is
  currently OFF (rooms render in code) — when you send me the CGs **and your
  pinpoint hotspot list**, I re-enable the image layer and align every hotspot
  in one pass. Until then nothing displays the PNGs, so don't worry if a
  dropped file doesn't show yet.

- The robot guests (F-RØ5CHI, L-UX, B-RADF1SH, T-FLON14, ASP-1024, FAX-N,
  AGN-H3R) are described in their guest-present prompts to match the designs
  you already have — keep their colour + form consistent with the portrait
  sheets.

- If a generated image's object positions differ from the targets, that is
  fine — send me the image (or just the positions) and I adjust the hotspot
  coordinates in code instead of you regenerating.

- For variant scenes that should match a previous one (like
  ch1_door_open being the "after" of ch1_room_b), generate the base
  image first, then in your prompt for the variant, paste the previous
  image as a reference and ask: "Same scene, same camera, same elements
  in same positions, but [describe what changed]."
