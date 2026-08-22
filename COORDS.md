# ZIELDATEN — die echten Koordinaten einsetzen

Kapitel 8 zeigt am Ende die **Zieldaten** (die Koordinaten des offiziellen
Ziels). Im Repository steht dort bewusst nur ein Platzhalter:

```
N 00° 00.000 · E 000° 00.000
```

Das ist erkennbar keine echte Position — es soll niemand versehentlich
losfahren. Vor der Veröffentlichung wird der Platzhalter ersetzt.

## Warum die Koordinaten nicht als Klartext im Code stehen

Statisches JavaScript lässt sich immer lesen; das ist keine Sicherheit und
soll auch keine sein. Es geht nur darum, dass ein beiläufiges `Strg+F` im
Quelltext die Lösung nicht sofort ausspuckt.

Deshalb liegen die Zieldaten als **acht Kalibrierungsfragmente** vor. Jedes
Fragment ist ein Teilstück der Zeichenkette, zeichenweise verschoben abgelegt.
Erst die Reihenfolge, die die fertige Rekonstruktion in Kapitel 8 ergibt,
setzt sie wieder zusammen — eine falsche Reihenfolge ergibt Buchstabensalat.

Im Quelltext (`chapter8/chapter8.js`) sieht das so aus:

```js
const KAL = [
  '0061000f001f', '0006008600160006', ...
];
```

## Ersetzen

1. Browser öffnen, Entwicklerkonsole aufmachen (F12 → Konsole).
2. Folgenden Block einfügen, **die eigenen Koordinaten in `ZIEL` eintragen**
   und Enter drücken:

```js
const ZIEL = 'N 49° 00.000 · E 012° 00.000';     // <— hier die echten Zieldaten

const ch = [...ZIEL], n = ch.length, out = [];
for (let j = 0; j < 8; j++) {
  const teil = ch.slice(Math.floor(j * n / 8), Math.floor((j + 1) * n / 8));
  out.push(teil.map(c => ((c.codePointAt(0) ^ (0x2f + j * 7)) & 0xffff)
                          .toString(16).padStart(4, '0')).join(''));
}
console.log("  '" + out.join("', '") + "',");
```

3. Die ausgegebene Zeile in `chapter8/chapter8.js` als Inhalt von `const KAL = [ … ]`
   einsetzen (die alten Platzhalter-Werte ersetzen).
4. Kapitel 8 einmal durchspielen (oder einen vorhandenen Spielstand mit
   abgeschlossenem Kapitel 8 nehmen) und prüfen, dass unten auf der
   Abschlusskarte genau die gewünschte Zeichenkette steht.

Der Text darf beliebig aussehen — Grad, Minuten, Trennzeichen, Umlaute.
Er wird genau so wieder zusammengesetzt, wie er eingegeben wurde.

## Wo die Zieldaten sonst noch auftauchen

* **Abschlusskarte in Kapitel 8** — mit `[ KOORDINATEN KOPIEREN ]`.
* **Titelterminal** — nach Abschluss von Kapitel 8 steht dort
  `ZIELDATEN: VERFÜGBAR` samt Wert, damit niemand ein Kapitel noch einmal
  spielen muss, um die Koordinaten nachzulesen.
* **Spielstand** — als `zieldaten_text` im `localStorage`. Das passiert erst
  nach dem Lösen; im ausgelieferten Code steht der Wert nicht.

Ein `[ SPIELSTAND LÖSCHEN ]` im Hauptmenü entfernt ihn wieder.

## Checkliste vor der Veröffentlichung

- [ ] `KAL` in `chapter8/chapter8.js` enthält die echten Fragmente.
- [ ] Kapitel 8 einmal komplett durchgespielt, Zeichenkette stimmt.
- [ ] `[ KOORDINATEN KOPIEREN ]` liefert denselben Text.
- [ ] Titelterminal zeigt denselben Text.
