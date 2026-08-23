# Musik — KA-II

**Ein Stück pro Kapitel. Plus Hauptmenü und Abspann. Mehr nicht.**

Frühere Fassungen hatten Charakter-Themes, Rätsel-Underscores und
Story-Stingers. Das war in der Produktion nicht zu halten — die Slots sind
bewusst auf zwölf reduziert. Jedes Kapitel läuft auf einem einzigen,
loopbaren Titel, der beim Betreten startet und bis zum Kapitelende
durchläuft.

Dateien gehören nach `assets/music/`. Fehlt eine Datei, bleibt es einfach
still — die Engine bricht nicht ab.

| Slot | Datei | Wo | Charakter |
|------|-------|----|-----------|
| `title` | `title_theme.mp3` | Hauptmenü / Titelbildschirm | Signatur des Spiels, ruhig, erwartungsvoll |
| `ch0_ambient` | `ch0_rueckkehr.mp3` | Kapitel 0 — Rückkehr | leer, staubig, ein Ort der lange geschlafen hat |
| `ch1_ambient` | `ch1_wartung.mp3` | Kapitel 1 — Wartungssektor | warm, mechanisch, erstes Wiedersehen |
| `ch2_ambient` | `ch2_garten.mp3` | Kapitel 2 — Wartungsgarten | gefroren → auftauend, sanft, lebendig werdend |
| `ch3_ambient` | `ch3_beobachtung.mp3` | Kapitel 3 — Beobachtungssektor | aufmerksam, präzise, geduldig |
| `ch4_ambient` | `ch4_werkstatt.mp3` | Kapitel 4 — Rätselsektor | Werkstatt, schwer, unaufgeregt |
| `ch5_ambient` | `ch5_langstrecke.mp3` | Kapitel 5 — Langstrecke | weit, feucht, Katakomben-Hall |
| `ch6_ambient` | `ch6_versuchskammer.mp3` | Kapitel 6 — Versuchskammer | leise, zerebral, Instrumentensummen |
| `ch7_ambient` | `ch7_vexier.mp3` | Kapitel 7 — Vexiersektor | verspielt, leicht daneben, etwas stimmt nicht |
| `ch8_ambient` | `ch8_archiv.mp3` | Kapitel 8 — Archivsektor | groß, endgültig, der letzte reguläre Sektor |
| `ch9_ambient` | `ch9_bonus.mp3` | Kapitel 9 — Bonus | die Wahrheit, unangenehm ruhig |
| `credits` | `credits_theme.mp3` | Abspann | Abschied, warm, ausklingend |

## Stimmung je Kapitel

Die Tabelle nennt die Slots; hier steht, wonach sie klingen sollen. Die
Kapitel haben sich in der Überarbeitung verändert — die Beschreibungen unten
gelten für die finale Fassung.

| Kapitel | Stimmung |
|---|---|
| 01 Wartung | vorsichtige Wärme, erste Gesellschaft nach langer Stille |
| 02 Garten | gefrorene Ruhe, die langsam in einen lebenden Garten übergeht |
| 03 Beobachtung | zurückgenommener optischer Fokus, aufmerksam, geduldig |
| 04 Rätsel | Werkstatt, mechanisch, geduldige Komplexität |
| 05 Langstrecke | Vorwärtsbewegung, weite Wege, Station um Station |
| 06 Versuchskammer | dunkles Labor, analytisch, Instrumentensummen |
| 07 Vexier | verspielte Unzuverlässigkeit, etwas stimmt hier nicht |
| 08 Archiv | großer Archivbau, Rekonstruktion, Kulmination |
| 09 (versteckt) | karg, die Wahrheit, emotionaler Bruch |

Ein optionales Motiv, das in Kapitel 2 (Wiederherstellung), Kapitel 5 (letzte
Etappe) und Kapitel 8 (100 %) leise wiederkehrt, würde die Anlage
zusammenbinden — nötig ist es nicht.

## Verhalten

- Ein Titel pro Kapitel, gestartet beim Betreten (`GameEngine.music.play('chN_ambient')`).
- Loopbar schneiden, **kein Fade-out** am Dateiende.
- Der globale Mute-Zustand gilt für Musik und Effekte gemeinsam und
  überlebt Kapitelwechsel.
- Fehlende Dateien sind kein Fehlerfall. Die Engine spielt, was da ist, und
  schweigt über den Rest — ohne 404-Lärm in der Konsole.
- **Kein Rätsel ist ohne Ton lösbar-abhängig.** Jeder informative Klang hat
  eine sichtbare Entsprechung; das ganze Spiel ist stummgeschaltet spielbar.
- Alte Dateinamen dürfen bleiben. Wird ein Slot umbenannt, wird die alte Datei
  weiterverwendet statt gelöscht — der Slot ist die Semantik, die Datei nicht.
