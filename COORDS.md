# ZIELDATEN — die echten Koordinaten einsetzen

Das Spiel hat **genau einen** Satz Koordinaten. Er wird am Ende von Kapitel 8
rekonstruiert. Kapitel 9 vergibt kein zweites Ziel — es **bestätigt dasselbe**
von außerhalb der Anlage. Im Repository steht dort bewusst nur ein Platzhalter:

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

Die Fragmente liegen an **einer** Stelle: im Modul `GameEngine.calibration`
in `js/engine.js`. Das ist auch der Grund, warum ein fertiger Spielstand seine
Koordinaten selbst wiederherstellen kann, wenn sie einmal verloren gehen.

```js
const MAIN = [
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

3. Die ausgegebene Zeile in `js/engine.js` als Inhalt von `const MAIN = [ … ]`
   einsetzen (die alten Platzhalter-Werte ersetzen).
4. Kapitel 8 einmal durchspielen (oder einen vorhandenen Spielstand mit
   abgeschlossenem Kapitel 8 nehmen) und prüfen, dass unten auf der
   Abschlusskarte genau die gewünschte Zeichenkette steht.

Der Text darf beliebig aussehen — Grad, Minuten, Trennzeichen, Umlaute.
Er wird genau so wieder zusammengesetzt, wie er eingegeben wurde.

**Es gibt nichts Zweites einzusetzen.** Kapitel 9 liest denselben Wert zurück.

## Was Kapitel 9 mit den Koordinaten macht

Die versteckte Kammer vergibt kein eigenes Ziel. Der Rest der Übertragung —
die Stimme aus den fünf Fremdsignalen — nennt **dieselbe Stelle**, und genau
das ist der Punkt: es ist der einzige Teil des Ziels, der nicht von R-3MI und
V-TGM kommt. Erzählerisch ist das die Bestätigung, dass die beiden das Ziel
nicht erfunden haben; spielerisch ist es eine Belohnung für Vollständigkeit,
kein zweiter Weg.

Im Titelterminal steht der Satz danach als
`ZIELDATEN · EXTERN BESTÄTIGT` statt nur `ZIELDATEN` — derselbe Wert, ein
anderes Etikett.

## Der Zugangscode aus Teil I

In `chapter9/chapter9.js` steht `const AUTH = [ … ]` — das ist der
achtstellige Verifizierungscode aus der ersten Anlage, den die
Autorisierungsakte in Kapitel 9 zurückliest. Der Spieler kennt ihn bereits
(er hat ihn selbst eingegeben, um überhaupt anzufangen); er liegt nur deshalb
verschoben vor, damit er nicht beiläufig im Quelltext steht. Der muss **nicht**
ersetzt werden — es sei denn, der Zugangscode in `js/access.js` ändert sich.

## Wo die Zieldaten auftauchen

* **Abschlusskarte in Kapitel 8** — mit `[ KOORDINATEN KOPIEREN ]`.
* **Titelterminal** — nach Abschluss von Kapitel 8 steht dort
  `ZIELDATEN: VERFÜGBAR` samt Wert, damit niemand ein Kapitel noch einmal
  spielen muss, um die Koordinaten nachzulesen.
* **Abschlusskarte in Kapitel 9** — mit `[ KOORDINATEN KOPIEREN ]`, und beim
  erneuten Betreten der Kammer über `[ ZIELDATEN ]`. Derselbe Wert.
* **Spielstand** — als `zieldaten_text` im `localStorage`. Das passiert erst
  nach dem Lösen; im ausgelieferten Code steht der Wert nicht.

`[ SPIELSTAND ]` im Hauptmenü zeigt an, ob die Zieldaten vorhanden sind, und
löscht sie auf Wunsch wieder.

## Checkliste vor der Veröffentlichung

- [ ] `MAIN` in `js/engine.js` enthält die echten Fragmente.
- [x] `KA1_LISTING_URL` und `KA1_GAME_URL` in `js/access.js` zeigen auf die
      erste Anlage.
- [ ] Kapitel 8 einmal komplett durchgespielt, Zeichenkette stimmt.
- [ ] Kapitel 9 einmal durchgespielt — dieselbe Zeichenkette, Etikett
      `EXTERN BESTÄTIGT`.
- [ ] `[ KOORDINATEN KOPIEREN ]` liefert in Kapitel 8 und Kapitel 9 denselben
      Text.
- [ ] Titelterminal zeigt einen Satz, nicht zwei.
