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

- **Order of priority for generation:**
  1. ch1_hall_empty.png (most-seen scene)
  2. ch1_room_a.png and ch1_room_b.png (puzzle locations)
  3. ch0_entrance.png (title-related)
  4. ch1_hall_robots_distance.png + ch1_hall_robots_behind.png (story)
  5. ch1_corridor_ab.png + ch1_door_open.png (transitions, reusing similar bases)
  6. Character portraits (last — game works without them)

- If a generated image's interactive object positions differ from my
  coordinates by more than ~15%, send me the image and I'll adjust the
  hotspot coordinates in the JS files instead of regenerating.

- For variant scenes that should match a previous one (like
  ch1_door_open being the "after" of ch1_room_b), generate the base
  image first, then in your prompt for the variant, paste the previous
  image as a reference and ask: "Same scene, same camera, same elements
  in same positions, but [describe what changed]."
