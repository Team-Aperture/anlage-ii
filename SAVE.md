# Der Spielstand — Format, Grenzen, Migration

Dieses Dokument beschreibt, was im Spielstand steht, was beim Import geprüft
wird und — ausdrücklich — **was dieser Ansatz nicht leistet**.

## Was gespeichert wird

Ein Schlüssel, `ka2_save_v1`, im `localStorage`. Nichts verlässt den Browser.
Kein Server, kein Konto, kein Tracking.

| Feld | Inhalt |
|------|--------|
| `schemaVersion` | Formatversion (aktuell **4**), getrennt von der Spielversion |
| `chaptersCompleted` | `ch0`…`ch8`. `ch9` steht hier **nie** drin |
| `signalsFound` | `sig_01`…`sig_05` |
| `achievementsUnlocked` | Erfolgs-IDs |
| `flags` | u. a. `ka1_verified`, `zieldaten`, `truth_revealed` |
| `calibration` | ein Kalibrierungsfragment pro abgeschlossenem Sektor |
| `chapterState` | Wiederaufnahmepunkte einzelner Kapitel |
| `settings` | Spielereinstellungen (Ton) |
| `provenance` | `'beta'` für einen aus der Beta übernommenen Lauf — rein kosmetisch |

**Die Zieldaten stehen nicht im Spielstand.** Sie werden aus den
Kalibrierungsfragmenten rekonstruiert, und nur für einen Lauf, der Sektor 08
tatsächlich abgeschlossen hat (`GameEngine.state.zieldaten()`). Vor Version 1.1
lagen sie als lesbares Feld `zieldaten_text` im Spielstand; die Migration
entfernt es.

## Portabilität ist gewollt — Vertrauen nicht automatisch

Der Spielstand ist absichtlich übertragbar: `[ SPIELSTAND ]` gibt einen Code
aus, den man in einem anderen Browser wieder einspielt. Das heißt aber auch,
dass ein fertiger Spielstand geteilt werden kann.

Deshalb gilt beim Laden **und** beim Import: ein Spielstand ist nur so weit,
wie sein eigener Inhalt das hergibt. Geprüft wird:

* **Kapitelkette.** `ch_n` zählt nur, wenn alle vorherigen Sektoren ebenfalls
  abgeschlossen sind. `ch0` zählt nur mit `ka1_verified`.
* **Fremdsignale.** Ein Signal zählt nur, wenn der Sektor davor abgeschlossen
  ist — man kann es sonst nicht gehört haben.
* **Kalibrierung.** Zu jedem abgeschlossenen Sektor gehört ein Fragment;
  Fragmente ohne zugehörigen Sektor fallen weg.
* **Die versteckte Kammer.** `truth_revealed` verlangt Sektor 08 **und** alle
  fünf Fremdsignale. Ein einzelnes Boolean schaltet sie nie frei.
* **Erfolge.** `chN_complete` verlangt `chN`, `signal_all` verlangt fünf
  Signale, die Kammer-Erfolge verlangen `truth_revealed`.

Widersprüche werden **nach unten normalisiert**, nicht abgelehnt: der nicht
belegte Anspruch fällt weg, der Rest bleibt spielbar. Der Import sagt danach,
was übernommen wurde und was nicht.

Zusätzlich trägt jeder exportierte Code eine **Prüfsumme**. Stimmt sie nicht,
wird der Spielstand trotzdem eingespielt, aber als „nach dem Export verändert"
gekennzeichnet.

## Was das ausdrücklich NICHT leistet

Das ist **keine Kryptographie und keine Sicherheit**, und es wird hier auch
nicht als solche verkauft.

* Die Prüfsummenfunktion steht im selben `js/engine.js` wie alles andere. Wer
  sie lesen kann, kann sie neu berechnen. Sie erkennt Flüchtigkeitsänderungen,
  keine Absicht.
* Ein **echter**, vollständig durchgespielter Spielstand ist in sich schlüssig.
  Wird genau dieser Code öffentlich geteilt, besteht er jede Prüfung hier —
  weil er echt ist. Dagegen hilft ohne Server nichts.
* Die Rekonstruktion der Zieldaten aus den Fragmenten verhindert nur, dass die
  Koordinaten als bequemes Klartextfeld im Spielstand liegen. Wer Sektor 08 im
  Spielstand echt abgeschlossen hat, bekommt sie.

**Ziel ist Casual-Spoiler-Resistance, nicht Kopierschutz:** ein zusammen-
geschriebener „alles auf true"-Spielstand funktioniert nicht mehr, und ein
geteilter Code ist als solcher erkennbar. Mehr ist clientseitig nicht ehrlich
erreichbar, und fragile Scheinsicherheit wäre schlechter als keine.

## Migration Beta → Release

Beta-Spielstände (Schema ≤ 3) werden übernommen, nicht blind vertraut:

1. `migrate()` bringt sie auf Schema 4 und entfernt `zieldaten_text`.
2. Die Invarianten oben laufen darüber.
3. Der Lauf wird mit `provenance: 'beta'` markiert.

Nichts davon schaltet Inhalte frei; `provenance` ist eine Kennzeichnung und
wird nirgends als Prüfung verwendet.

## Wenn gar nichts gespeichert werden kann

Verweigert der Browser `localStorage`, läuft das Spiel weiter und sagt es
einmal per Hinweis, mit Verweis auf den Sicherungscode.
