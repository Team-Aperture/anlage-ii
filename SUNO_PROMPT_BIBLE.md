# ═══════════════════════════════════════════════════════════════
# SUNO PROMPT BIBLE — DIE KALIBRIERUNGSANLAGE II
# Der komplette Soundtrack (34 Tracks) für suno.com
# ═══════════════════════════════════════════════════════════════

## WIE DU DIESE PROMPTS BENUTZT

1. Suno öffnen → **Create** → **Custom** Mode einschalten.
2. **„Instrumental"-Schalter AN** bei *allen* Tracks außer wo unten
   ausdrücklich „VOCALS OK" steht. Das Spiel ist deutschsprachig — gesungene
   englische Lyrics würden die Stimmung brechen.
3. Den **Style of Music**-Text aus dem jeweiligen Block kopieren
   (das ist der ganze Prompt — Suno mag kommagetrennte Tags mehr als Prosa).
4. Wenn dein Suno-Plan ein **Exclude Styles**-Feld hat: den `EXCLUDE`-Text
   dort einfügen. Das hält Drums/Vocals raus, wo sie stören.
5. Generieren, **die bessere der zwei Versionen** behalten, als **MP3**
   herunterladen und unter dem angegebenen Dateinamen in `assets/music/`
   ablegen. Fertig — die Engine spielt sie automatisch.

**Wichtig zum Loopen:** Die Engine loopt jeden Track nahtlos in Endlosschleife.
Damit das gut klingt:
- Ziel-Länge **1:30 – 2:30** für Ambiences (kurz genug, dass Suno nicht
  dramatisch „aufbaut", lang genug dass es nicht nervt)
- Im Prompt steht deshalb überall „**no fade out, no big finish, steady loopable
  texture**" — das ist Absicht, bitte drinlassen
- Nach dem Download in Audacity die letzten Sekunden Stille abschneiden, dann
  loopt es sauber

---

## ═══ DAS KLANG-BIBEL (die gemeinsame Identität) ═══

Alle Tracks teilen sich diese DNA, damit der OST wie **ein** Werk klingt:

| Element | Vorgabe |
|---|---|
| **Grundgenre** | dark ambient / industrial sci-fi score |
| **Referenz-Gefühl** | Portal 2 (Mike Morasky) trifft Half-Life, aber verlassener |
| **Kern-Instrumente** | analog synth pads, detuned bass drones, felt piano, tape hiss, field-recorded metal, sub bass |
| **Tempo** | 60–75 BPM (Ambiences) · 90–140 BPM (Rätsel/Action) |
| **Tonart** | überwiegend **A minor** oder **D minor** — hält alles verwandt |
| **Immer dabei** | leichtes Tape-Rauschen / Vinyl-Knistern = „diese Anlage ist alt" |
| **Nie** | fröhliche Dur-Popmelodien, Gitarren-Rock, moderne EDM-Drops, Gesang |

**Das Transmission-Motiv (wichtig!):** Ein **absteigendes 4-Ton-Motiv**
(z.B. A–G–E–D), langsam, wie ein Funkspruch der sich wiederholt. Es taucht
versteckt in `title`, `transmission`, `signal_found`, `coordinates` und
`bonus_truth` auf. Wenn Suno bei einem dieser Tracks etwas Schönes findet:
**diesen Track als „Extend"-Basis für die anderen nehmen** — dann teilen sie
sich echtes musikalisches Material statt nur einer Beschreibung.

---
---

# ═══════════════════════════════════════════════════════════════
# 1 — RAHMEN / UI  (3 Tracks)
# ═══════════════════════════════════════════════════════════════

## `title_theme.mp3` — Hauptmenü
**Slot:** `title` · **Länge:** ~2:00 · **Instrumental: AN**
```
Dark ambient sci-fi main theme, slow 65 BPM, A minor. Deep detuned synth pad
drone, distant metallic reverb, sparse felt piano playing a slow descending
four-note motif, faint tape hiss and vinyl crackle. Melancholic but with a
thread of hope. Abandoned industrial facility waking up after years of silence.
Cinematic, patient, no drums, steady loopable texture, no fade out, no big finish.
```
`EXCLUDE:` `drums, percussion, vocals, guitar, EDM, upbeat`

## `boot_drone.mp3` — Boot-Sequenz
**Slot:** `boot` · **Länge:** ~1:00 · **Instrumental: AN**
```
Minimal cold hardware boot drone, 60 BPM, single sustained low synth note with
slow phasing, faint CRT electrical hum, occasional soft digital blips like an
old BIOS self-test, deep sub bass floor. Almost silence. Sterile, technical,
slightly ominous. No melody, no drums, steady loopable texture, no fade out.
```
`EXCLUDE:` `melody, drums, vocals, orchestral`

## `credits_theme.mp3` — Abspann
**Slot:** `credits` · **Länge:** ~2:30 · **Instrumental: AN**
```
Warm ambient outro theme, 68 BPM, A minor resolving to A major at the end.
Felt piano lead with soft analog synth pad bed, gentle warm strings, light tape
hiss. Nostalgic, grateful, the calm after a long journey. Emotional but
restrained. No drums, slow, cinematic, gentle.
```
`EXCLUDE:` `drums, vocals, aggressive, distortion`

---
---

# ═══════════════════════════════════════════════════════════════
# 2 — KAPITEL-AMBIENCES  (10 Tracks)
# ═══════════════════════════════════════════════════════════════

## `ch0_rueckkehr.mp3` — Kapitel 0: Rückkehr
**Slot:** `ch0_ambient` · **Länge:** ~1:45 · **Instrumental: AN**
```
Sparse dark ambient, 62 BPM, D minor. Very quiet: low synth drone, distant
dripping water reverb, occasional creak of settling metal, faint wind through
an empty hall. Dust and stillness. The sound of returning to a place that was
abandoned for years. Almost no melody, deep space between sounds.
No drums, steady loopable texture, no fade out.
```
`EXCLUDE:` `drums, vocals, melody, upbeat`

## `ch1_wartung.mp3` — Kapitel 1: Wartungssektor
**Slot:** `ch1_ambient` · **Länge:** ~2:00 · **Instrumental: AN**
```
Industrial ambient with the first signs of life, 70 BPM, A minor. Low synth pad,
soft rhythmic mechanical pulse like a distant pump restarting, tiny electrical
sparks and relay clicks, faint hopeful synth arpeggio far in the background.
Curious, slightly playful, machinery waking up. Warm-cold contrast.
No drums, steady loopable texture, no fade out.
```
`EXCLUDE:` `drums, vocals, guitar, aggressive`

## `ch2_garten.mp3` — Kapitel 2: Wartungsgarten (gefroren)
**Slot:** `ch2_ambient` · **Länge:** ~2:00 · **Instrumental: AN**
```
Frozen ambient, 60 BPM, D minor. Glassy bell tones and icy crystalline textures,
bowed glass harmonica, slow soft synth pad, distant dripping meltwater, subtle
music-box glimmer. Beautiful, cold, melancholic — a winter garden under glass,
sleeping. Fragile and delicate. No drums, steady loopable texture, no fade out.
```
`EXCLUDE:` `drums, vocals, brass, aggressive`

## `ch3_beobachtung.mp3` — Kapitel 3: Beobachtungssektor
**Slot:** `ch3_ambient` · **Länge:** ~2:00 · **Instrumental: AN**
```
Clinical observation ambient, 72 BPM, A minor. Cold analog synth pad, slow
pulsing sonar-like ping, faint lens-servo whirs and shutter clicks, high
tension string harmonic drone. The feeling of being watched and measured.
Precise, sterile, quietly unnerving. No drums, steady loopable texture, no fade out.
```
`EXCLUDE:` `drums, vocals, warm, cheerful`

## `ch4_wuerfel.mp3` — Kapitel 4: Der Würfel
**Slot:** `ch4_ambient` · **Länge:** ~2:00 · **Instrumental: AN**
```
Puzzle-box ambient, 68 BPM, D minor. Deep vault drone, slow rotating metallic
resonance, sparse marimba-like plucks in an unresolved geometric pattern, heavy
steel reverb. Mysterious, architectural, something sealed and waiting. Patient
and intelligent. No drums, steady loopable texture, no fade out.
```
`EXCLUDE:` `drums, vocals, guitar, upbeat`

## `ch5_foerderlauf.mp3` — Kapitel 5: Fördersektor
**Slot:** `ch5_ambient` · **Länge:** ~2:00 · **Instrumental: AN**
```
Driving industrial ambient, 110 BPM, A minor. Steady conveyor-belt rhythm from
mechanical loops and factory foley, pulsing bright blue synth arpeggio, motorik
groove, light electronic percussion. Energetic, relentless, forward motion that
never stops. Upbeat but industrial, not happy. Steady loopable texture, no fade out.
```
`EXCLUDE:` `vocals, guitar, orchestral, ballad`

## `ch6_versuchskammer.mp3` — Kapitel 6: Versuchskammer
**Slot:** `ch6_ambient` · **Länge:** ~2:00 · **Instrumental: AN**
```
Hushed laboratory ambient, 58 BPM, D minor. Extremely quiet, muffled low drone,
faint instrument hum, soft analog tape hiss, a slow irregular relay tick, rare
distant single piano note with long decay. Patient, cerebral, monochrome, very
slightly eerie. The sound of a sealed machine running while nobody speaks.
Minimal, almost silent. No drums, steady loopable texture, no fade out.
```
`EXCLUDE:` `drums, vocals, melody, bright, upbeat`

## `ch7_vexier.mp3` — Kapitel 7: Vexiersektor
**Slot:** `ch7_ambient` · **Länge:** ~2:00 · **Instrumental: AN**
```
Creepy carnival ambient, 88 BPM, A minor. Detuned broken music box and warped
calliope, playful pizzicato strings that keep slipping out of tune, tape wobble,
distant mischievous laughter texture (no words). Playful but wrong, like a
funhouse built inside a factory. Whimsical and unsettling at once.
Light percussion only, steady loopable texture, no fade out.
```
`EXCLUDE:` `vocals, lyrics, heavy drums, EDM`

## `ch8_archiv.mp3` — Kapitel 8: Archivsektor
**Slot:** `ch8_ambient` · **Länge:** ~2:30 · **Instrumental: AN**
```
Vast solemn ambient, 60 BPM, D minor. Cathedral-scale reverb, deep bowed double
bass drone, distant low choir pad (wordless, no lyrics), slow ticking like an
old clock, paper and dust textures. Immense, silent, knowing. The room of
something that remembers everything. Ominous, final, patient.
No drums, steady loopable texture, no fade out.
```
`EXCLUDE:` `lyrics, words, drums, upbeat, bright`

## `ch9_bonus.mp3` — Kapitel 9: Die Kammer, die es nicht gibt
**Slot:** `ch9_ambient` · **Länge:** ~2:00 · **Instrumental: AN**
```
Wrong-room dread ambient, 56 BPM, atonal drifting around D minor. Sickly
detuned drone that slowly bends in pitch, reversed reverb swells, faint distorted
radio static, sub bass pressure, occasional dissonant piano cluster. Deeply
uncomfortable, the feeling of standing somewhere you were never meant to find.
Slow, oppressive. No drums, steady loopable texture, no fade out.
```
`EXCLUDE:` `drums, vocals, melody, resolution, bright`

---
---

# ═══════════════════════════════════════════════════════════════
# 3 — CHARAKTER-THEMEN  (7 Tracks)
# ═══════════════════════════════════════════════════════════════
*Kurze Stücke (~1:00), die beim ersten Auftritt der Figur laufen.
Jede Figur hat ein Instrument, das nur ihr gehört.*

## `theme_froschi.mp3` — F-RØ5CHI (pink, gekrönter Frosch, alt & sanft)
**Slot:** `theme_froschi` · **Länge:** ~1:00 · **Instrumental: AN**
```
Gentle music box theme, 64 BPM, D minor with a warm major lift. Antique music
box lead melody, soft celesta, warm low strings underneath, faint ice crystal
shimmer. Kind, old, a little regal and a little sad. Like a lullaby for someone
who has waited a very long time. Tender, nostalgic, slow.
```
`EXCLUDE:` `drums, vocals, aggressive, electronic`

## `theme_lux.mp3` — L-UX (orange, hyperaktive Katze)
**Slot:** `theme_lux` · **Länge:** ~1:00 · **Instrumental: AN**
```
Hyperactive electronic theme, 138 BPM, A minor. Fast bright plucky synth
arpeggio that keeps darting around, glitchy stutters, quick shuffling
percussion, restless energy that never settles. Playful, jittery, caffeinated.
Like a cat chasing a laser pointer through a laboratory. Fun and frantic.
```
`EXCLUDE:` `vocals, slow, ambient, ballad`

## `theme_bradfisch.mp3` — B-RADF1SH (gelb, Fisch, Veteran)
**Slot:** `theme_bradf1sh` · **Länge:** ~1:00 · **Instrumental: AN**
```
Calm confident theme, 72 BPM, A minor. Warm analog synth lead with a slow
deliberate melody, soft rhodes electric piano, gentle swelling pad. Patient,
experienced, quietly masterful — an old veteran who has solved everything here
before and is in no hurry. Dignified and warm.
```
`EXCLUDE:` `drums, vocals, frantic, aggressive`

## `theme_tflon14.mp3` — T-FLON14 (blau, Pfanne, Dauerlauf)
**Slot:** `theme_tflon` · **Länge:** ~1:00 · **Instrumental: AN**
```
Upbeat motorik theme, 128 BPM, A minor. Bright blue synth pulse, driving
krautrock-style groove, cheerful bouncing bassline, light electronic percussion,
optimistic rising figure. Warm, relentless, encouraging — a coach who never
stops moving and refuses to let you stop either. Energetic and friendly.
```
`EXCLUDE:` `vocals, sad, slow, ambient`

## `theme_asp1024.mp3` — ASP-1024 (hellgrau, Maus, Versuchseinheit)
**Slot:** `theme_asp` · **Länge:** ~1:00 · **Instrumental: AN**
```
Minimal, methodical theme, 54 BPM, D minor. A short sparse piano figure that
repeats with small deliberate variations, as if testing one change at a time;
faint sub drone, tape hiss, a soft periodic tick underneath. Calm, dry, patient,
quietly good-humoured. Unhurried rather than lonely. Restrained, deeply steady.
```
`EXCLUDE:` `drums, vocals, melody development, busy, bright`

## `theme_faxn.mp3` — FAX-N (knallrot, Kürbis, Trickser)
**Slot:** `theme_faxn` · **Länge:** ~1:00 · **Instrumental: AN**
```
Mischievous trickster theme, 96 BPM, A minor. Playful staccato pizzicato
strings, detuned toy piano, sudden comedic stops and restarts, warped tape
wobble, a grin you can hear. Sly, theatrical, always one step ahead. Fun but
never quite trustworthy. Light percussion only.
```
`EXCLUDE:` `vocals, heavy drums, EDM, serious`

## `theme_agnher.mp3` — AGN-H3R (schwarz, Schädel, Archivar)
**Slot:** `theme_agn` · **Länge:** ~1:00 · **Instrumental: AN**
```
Ominous archivist theme, 56 BPM, D minor. Very deep bowed double bass, low
wordless choir pad, slow funeral-march pulse, distant tolling metal. Solemn,
immense, knowing something you do not. Never threatening — just certain.
Heavy, patient, final.
```
`EXCLUDE:` `lyrics, words, drums, bright, upbeat`

---
---

# ═══════════════════════════════════════════════════════════════
# 4 — RÄTSEL-UNTERMALUNG  (7 Tracks)
# ═══════════════════════════════════════════════════════════════

## `puzzle_calm.mp3` — sanftes Rätsel
**Slot:** `puzzle_calm` · **Länge:** ~2:00 · **Instrumental: AN**
```
Calm thinking-music, 68 BPM, A minor. Soft repeating synth pattern, warm pad
bed, subtle rhodes, very low tension. Designed to be ignored while
concentrating. Gentle, unobtrusive, endlessly patient.
No drums, steady loopable texture, no fade out, no dramatic build.
```
`EXCLUDE:` `drums, vocals, build up, climax, dramatic`

## `puzzle_tense.mp3` — schweres Rätsel
**Slot:** `puzzle_tense` · **Länge:** ~2:00 · **Instrumental: AN**
```
Tense concentration underscore, 76 BPM, D minor. Low pulsing drone, quiet
ticking texture, occasional dissonant string harmonic, restrained pressure that
never resolves. Focused and slightly stressful without being loud.
No drums, steady loopable texture, no fade out, no climax.
```
`EXCLUDE:` `drums, vocals, resolution, melody, climax`

## `puzzle_timed.mp3` — FÖRDERLAUF (Kap. 5)
**Slot:** `puzzle_timed` · **Länge:** ~1:30 · **Instrumental: AN**
```
Fast urgent chase underscore, 140 BPM, A minor. Driving sixteenth-note synth
pulse, tight electronic percussion, rising sense of urgency, conveyor-belt
mechanical rhythm. Breathless, relentless, no time to think. Energetic and
pressuring. Steady loopable texture, no fade out.
```
`EXCLUDE:` `vocals, slow, ambient, ballad`

## `puzzle_forensic.mp3` — DIE BLACKBOX (Kap. 6)
**Slot:** `puzzle_forensic` · **Länge:** ~2:00 · **Instrumental: AN**
```
Analytical dark underscore, 64 BPM, D minor. Quiet granular texture, soft
scanning sweep sounds, faint high-frequency shimmer like a signal being tuned,
low drone bed. Meticulous, hushed, searching for something hidden.
No drums, steady loopable texture, no fade out.
```
`EXCLUDE:` `drums, vocals, melody, bright, upbeat`

## `puzzle_deduction.mp3` — VEXIERSCHLOSS (Kap. 7)
**Slot:** `puzzle_deduce` · **Länge:** ~2:00 · **Instrumental: AN**
```
Clockwork logic underscore, 84 BPM, A minor. Interlocking pizzicato and
marimba patterns like gears meshing, light mechanical tick, playful but precise,
a puzzle assembling itself. Curious and clever, slight carnival tint.
Light percussion only, steady loopable texture, no fade out.
```
`EXCLUDE:` `vocals, heavy drums, aggressive, EDM`

## `puzzle_finale.mp3` — Das zehnte Puzzle (Kap. 8)
**Slot:** `puzzle_finale` · **Länge:** ~2:30 · **Instrumental: AN**
```
Solemn final puzzle underscore, 62 BPM, D minor. Deep sustained strings, slow
piano figure, distant low choir pad (wordless), sense of enormous weight and
importance. The last thing you will ever assemble here. Emotional, heavy,
patient. No drums, steady loopable texture, no fade out.
```
`EXCLUDE:` `lyrics, words, drums, upbeat, fast`

## `countdown_panic.mp3` — Uhr unter 25 %
**Slot:** `countdown` · **Länge:** ~1:00 · **Instrumental: AN**
```
Panic countdown, 150 BPM, A minor. Accelerating ticking, harsh pulsing alarm
synth, rising dissonant tension, aggressive sub bass hits. Pure adrenaline,
running out of time. Loud, urgent, stressful. Steady loopable texture, no fade out.
```
`EXCLUDE:` `vocals, calm, ambient, pretty`

---
---

# ═══════════════════════════════════════════════════════════════
# 5 — STORY-MOMENTE  (4 Tracks)
# ═══════════════════════════════════════════════════════════════

## `the_transmission.mp3` — Das Transmission-Motiv
**Slot:** `transmission` · **Länge:** ~1:30 · **Instrumental: AN**
> ⚠️ **Diesen Track ZUERST generieren** — er trägt das 4-Ton-Motiv, das in
> `title`, `signal_found`, `coordinates` und `bonus_truth` wiederkehrt.
> Wenn er gut ist: mit Sunos **„Extend"/„Cover"** die anderen daraus ableiten.
```
Haunting numbers-station ambient, 60 BPM, A minor. A slow descending four-note
motif repeating on a detuned old radio tone, drenched in tape hiss and shortwave
static, distant hollow reverb, faint SSTV data-burst textures. Lonely, pleading,
a message no one ever received. Beautiful and unsettling.
No drums, steady loopable texture, no fade out.
```
`EXCLUDE:` `drums, vocals, lyrics, upbeat, resolution`

## `signal_discovery.mp3` — Signalnische gefunden
**Slot:** `signal_found` · **Länge:** ~0:30 · **Instrumental: AN**
```
Short eerie discovery sting, 60 BPM, A minor. Sudden burst of shortwave static
resolving into two clear descending radio tones, deep reverb tail, faint
whispering texture (no words). Creepy revelation, something reaching out from
far away. Short, atmospheric, unsettling.
```
`EXCLUDE:` `drums, vocals, words, upbeat, long`

## `coordinates_reveal.mp3` — Die Koordinaten
**Slot:** `coordinates` · **Länge:** ~1:30 · **Instrumental: AN**
```
Triumphant but haunted reveal, 66 BPM, A minor lifting toward A major. The
descending four-note motif returns, now played warmly on strings and piano with
a swelling pad, tape hiss still present underneath. Awe, achievement, and a
shadow of doubt. Cinematic, emotional, bittersweet. Slow build, no drums.
```
`EXCLUDE:` `drums, vocals, aggressive, dark only`

## `reactivation_100.mp3` — Reaktivierung 100 %
**Slot:** `reactivation` · **Länge:** ~1:30 · **Instrumental: AN**
```
Powerful systems-online cue, 70 BPM, A minor to A major. Rising synth swell,
deep resonant power-up hum, layered pads blooming into brightness, distant
machinery all starting at once, subtle heroic string line. The whole facility
waking up. Grand, warm, enormous relief. Cinematic, no drums.
```
`EXCLUDE:` `vocals, dark, dissonant, drums`

---
---

# ═══════════════════════════════════════════════════════════════
# 6 — DER BONUS / DIE WAHRHEIT  (3 Tracks)
# ═══════════════════════════════════════════════════════════════

## `bonus_intro.mp3` — Betreten der verborgenen Kammer
**Slot:** `bonus_intro` · **Länge:** ~1:30 · **Instrumental: AN**
```
Forbidden discovery ambient, 58 BPM, D minor. Hushed nostalgic pad with a
sickly undertone, faint music box fragments from earlier themes played wrong and
slowed down, reversed reverb, growing unease. Nostalgia curdling into dread.
Quiet, wrong, fascinating. No drums, steady loopable texture, no fade out.
```
`EXCLUDE:` `drums, vocals, bright, resolution`

## `bonus_truth.mp3` — Die Enthüllung
**Slot:** `bonus_truth` · **Länge:** ~2:00 · **Instrumental: AN**
```
Horrifying revelation, 52 BPM, atonal collapsing into D minor. The familiar
four-note motif returns brutally distorted and detuned, harsh digital glitching,
tape stop effects, crushing sub bass, dissonant string cluster swelling into
overload. Betrayal, dread, the floor falling away. Aggressive, distorted,
terrifying. Heavy and slow.
```
`EXCLUDE:` `vocals, pretty, warm, hopeful, upbeat`

## `bonus_finale.mp3` — Das dunkle Ende
**Slot:** `bonus_finale` · **Länge:** ~2:00 · **Instrumental: AN**
```
Cold empty aftermath, 54 BPM, D minor. Sparse detuned piano over a vast hollow
drone, faint distorted radio static, machinery humming contentedly in the
distance, no warmth anywhere. The villains won and the facility is happy about
it. Bleak, quiet, final. No drums, no resolution, no fade out.
```
`EXCLUDE:` `drums, vocals, hopeful, warm, triumphant`

---
---

## PRIORITÄT (wenn du nicht alle 34 auf einmal machst)

1. **`the_transmission.mp3`** — das Motiv, aus dem die anderen wachsen
2. **`title_theme.mp3`** — hört man am häufigsten
3. Die **Kapitel-Ambiences** `ch0`–`ch9` (10 Stück) — das Rückgrat
4. **`bonus_truth.mp3`** + **`bonus_finale.mp3`** — der Twist lebt von Musik
5. **`credits_theme.mp3`**, **`reactivation_100.mp3`**, **`coordinates_reveal.mp3`**
6. Die **Charakter-Themen** (7) — reines Sahnehäubchen
7. Die **Rätsel-Underscores** (7) — optional, die Ambiences tragen auch allein

## TECHNISCHES

- **Format:** MP3, 128–192 kbps reicht völlig (das ist ein Browser-Spiel —
  jede Datei über ~3 MB verlangsamt den Start)
- **Lautstärke:** Die Engine spielt Musik bei 42 % Lautstärke, damit die
  Sprach-Blips oben drüber hörbar bleiben. Nicht selbst leiser machen.
- **Ablage:** alle Dateien direkt in `assets/music/` — keine Unterordner
- **Fehlende Dateien sind ok:** Was noch nicht existiert, wird stillschweigend
  übersprungen. Du kannst also Track für Track nachliefern.
- **Der `[ TON: AUS ]`-Knopf** schaltet Musik *und* Soundeffekte gemeinsam ab.
