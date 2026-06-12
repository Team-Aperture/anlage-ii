/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 07 — VEXIERSEKTOR
 * Guest unit: F-AXN (FAXENMEIER) — the trickster. A grinning red
 *   jack-o'-lantern who turned misdirection into an art: every lever a
 *   gag, every door a fake-out. He lies for sport — but his lock is
 *   honest. Only his mouth isn't.
 *
 * First chapter built entirely on GameEngine.chapter — the shared
 * scaffold (sys-bar, title card, scene, choices, hint bar, complete) is
 * generated from the config below; only the VEXIERSCHLOSS puzzle and the
 * narrative live here.
 *
 * Scene flow:
 *   7.1 Arrival — the trick sector
 *   7.2 F-AXN appears (theatrical, unreliable)
 *   7.3 Choice 1: first questions (3)
 *   7.4 Exploration (his Narrenbuch hides Signalnische sig_05 — the last)
 *   7.5 VEXIERSCHLOSS — a deduction lock: 4 seals, 6 symbols, 8 tries
 *   7.6 Ending → Sektor 08 freigegeben (AGN-H3R)
 *
 * Difficulty target: ~9.0 (pure deduction, tight try budget, a liar host)
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter7 = (() => {
  'use strict';

  const CH = GameEngine.chapter;

  const S = {
    hotspots: { lock:0, lever:0, painting:0, book:0, r3mi:0, vtgm:0, guest:0 },
    sigFound: false,
    solved: false,
  };

  // ─── PUZZLE MARKUP (injected by the scaffold) ─────────────────
  const PUZZLE_HTML = `
    <div class="puzzle-modal hidden" id="vexModal">
      <div class="puzzle-card vex-card">
        <div class="puzzle-card-accent"></div>
        <div class="puzzle-header">
          <p class="puzzle-label sys-text">VEXIERSCHLOSS // F-AXN</p>
          <h2 class="puzzle-title">VIER SIEGEL</h2>
          <p class="puzzle-sub sys-text">KNACKE DEN CODE &nbsp;·&nbsp; <span class="vex-pip exact"></span> RICHTIG &nbsp; <span class="vex-pip misp"></span> VERSCHOBEN</p>
        </div>

        <div class="vex-legend" id="vexLegend"></div>
        <div class="vex-history" id="vexHistory"></div>

        <div class="vex-current">
          <div class="vex-slots" id="vexSlots"></div>
          <div class="vex-attempts sys-text" id="vexAttempts">VERSUCH 1 / 8</div>
        </div>

        <div class="puzzle-status sys-text" id="vexStatus"></div>
        <div class="puzzle-actions">
          <button class="ka-btn primary" id="vexSubmit" onclick="Chapter7.vexSubmit()">[ PRÜFEN ]</button>
          <button class="ka-btn small hidden" id="vexRestart" onclick="Chapter7.vexRestart()">[ NEU MISCHEN ]</button>
        </div>
      </div>
    </div>
  `;

  // ─── CHAPTER CONFIG ───────────────────────────────────────────
  function buildChapter() {
    CH.build({
      title: 'KA-II // Kapitel 7 — Vexiersektor',
      num: '07',
      sector: 'VEXIERSEKTOR',
      reactPct: 64,
      name: 'Vexiersektor',
      subline: '„Das Offensichtliche ist immer die Falle.“',
      emblemDeco: '<div class="ch7-grin"></div>',
      scene: { img: 'cg/ch7_vexier.png', ph: 'vexier-dim' },
      guest: { key: 'faxn', name: 'F-AXN' },
      modals: ['vexModal'],
      puzzleHTML: PUZZLE_HTML,
      completeId: 'ch7',
      completeAch: 'ch7_complete',
      next: { title: 'SEKTOR 08 FREIGEGEBEN', label: 'NÄCHSTER SEKTOR',
              href: '../chapter8/chapter8.html', enter: 'EINTRETEN' },
      onStart: scene_7_1_arrival,
      onRobot: clickRobot,
    });
  }

  // ─── 7.1 ARRIVAL ──────────────────────────────────────────────
  function scene_7_1_arrival() {
    CH.setScene('vexier-dim', 'cg/ch7_vexier.png');
    CH.clearHotspots();
    CH.showRobots(true);
    CH.showGuest(false);
    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'SEKTOR 07 — VEXIERSEKTOR. Türen, die keine sind. Hebel, die nichts tun. Irgendwo im Dunkeln lacht etwas leise vor sich hin.' },
      { speaker:'R-3MI',  text:'„Oh nein. Nicht DIESER Sektor. Hier ist jede zweite Tür aufgemalt und jeder Hebel eine Lüge."' },
      { speaker:'V-TGM',  text:'"Everything here is a joke. Some of the jokes bite."', subtitle:'Alles hier ist ein Scherz. Manche Scherze beißen.' },
      { speaker:'R-3MI',  text:'„Faxenmeier. F-AXN. Er hält die ganze Anlage für seine Bühne — und uns für sein Publikum."' },
      { speaker:'SYSTEM', text:'Ein Kürbiskopf glüht in der Schwärze auf. Knallrot. Grinsend von einem Ohr zum anderen. Er hat auf euch gewartet — oder tut zumindest sehr überzeugend so.' },
    ], () => scene_7_2_faxn());
  }

  // ─── 7.2 F-AXN APPEARS ────────────────────────────────────────
  function scene_7_2_faxn() {
    CH.setScene('vexier-lit', 'cg/ch7_faxn.png');
    CH.showGuest(true);
    GameEngine.dialogue.load([
      { speaker:'F-AXN', text:'„HA! Gäste! Echte, lebendige Gäste! …oder seid ihr auch nur ein Trick? Egal. WILLKOMMEN auf meiner Bühne!"' },
      { speaker:'F-AXN', text:'„Ein Schloss. Vier Siegel. Ich kenne die Lösung — ihr nicht. Ist das nicht herrlich ungerecht?"' },
      { speaker:'R-3MI', text:'„Er lügt in drei von vier Sätzen. Das Problem: man weiß nie, in welchen."' },
      { speaker:'V-TGM', text:'"His lock is honest. Only his mouth lies. Trust the lock."', subtitle:'Sein Schloss ist ehrlich. Nur sein Mund lügt. Vertrau dem Schloss.' },
      { speaker:'F-AXN', text:'„Pssst! Verrate doch nicht die Pointe, du grüner Spielverderber!"' },
    ], () => scene_7_3_choice1());
  }

  // ─── 7.3 CHOICE 1 ─────────────────────────────────────────────
  const C1 = {
    who: {
      key:'who', label:'[Wer bist du?]', seen:false,
      lines:[
        { speaker:'F-AXN', text:'„Faxenmeier! Der Erste. IMMER der Erste. Wo ein Schloss aufgeht, war ich schon da und wieder weg, bevor du »Vexier« sagen kannst."' },
        { speaker:'R-3MI', text:'„Er versteckt nichts und baut kaum was. Er ist einfach… schneller. Vor allen. Bei allem. Ein Veteran."' },
        { speaker:'V-TGM', text:'"The fastest first-solver this place ever had. Then the others stopped coming — and there was no one left to race."', subtitle:'Der schnellste Erstlöser, den dieser Ort je hatte. Dann kam keiner mehr — und es war niemand mehr da, gegen den er rennen konnte.' },
        { speaker:'F-AXN', text:'„Erster zu sein ist nur halb so schön, wenn keiner Zweiter wird. …aber pssst. Das stand nicht im Drehbuch."' },
      ],
    },
    place: {
      key:'place', label:'[Was ist dieser Ort?]', seen:false,
      lines:[
        { speaker:'F-AXN', text:'„Eine Bühne! Jeder Hebel eine Pointe, jede Tür ein Reinfall. Fass bloß nichts an, was offensichtlich aussieht — das Offensichtliche ist IMMER die Falle."' },
        { speaker:'R-3MI', text:'„Drei Hebel an der Wand. Zwei sind aufgemalt. Frag nicht, woher ich das so genau weiß."' },
      ],
    },
    trick: {
      key:'trick', label:'[Warum trickst du alle aus?]', seen:false,
      lines:[
        { speaker:'F-AXN', text:'„Weil die Wahrheit, die man sich erarbeitet, länger bleibt als die, die man geschenkt kriegt. …oder weil’s einfach Spaß macht. Such dir was aus."' },
        { speaker:'V-TGM', text:'"That was almost wisdom. He hates when that happens."', subtitle:'Das war fast Weisheit. Er hasst es, wenn ihm das passiert.' },
        { speaker:'F-AXN', text:'„Ich nehm’s zurück! Streicht das! Vergesst, dass ich je was Kluges gesagt hab!"' },
      ],
    },
  };

  function scene_7_3_choice1() {
    const choices = Object.values(C1);
    CH.showChoices({
      prompt: 'ERSTE FRAGEN — ALLE AUSWÄHLEN:',
      hint: choices.filter(c => !c.seen).length + ' AUSSTEHEND',
      choices,
      onAfterChoice: (key, cfg) => {
        if (CH.allSeen(choices)) setTimeout(scene_7_4_explore, 400);
        else { cfg.hint = `NOCH ${choices.filter(c => !c.seen).length} AUSSTEHEND`; CH.showChoices(cfg); }
      },
    });
  }

  // ─── 7.4 EXPLORATION ──────────────────────────────────────────
  function scene_7_4_explore() {
    GameEngine.dialogue.load([
      { speaker:'F-AXN', text:'„Schau dich ruhig um! Fass alles an! Oder nichts! Eins von beidem ist klug. Viel Glück beim Raten, hähä."' },
      { speaker:'SYSTEM', text:'SEKTOR 07 — EIN VERSCHLUSS AKTIV: VEXIERSCHLOSS.' },
    ], loadExploreHotspots);
  }

  function loadExploreHotspots() {
    CH.clearHotspots();
    CH.addHotspot({ x:44, y:44, w:14, h:22, cls:'hs-guest', label:'VEXIERSCHLOSS', fn:() => clickExplore('lock') });
    CH.addHotspot({ x:22, y:54, w:8,  h:18, label:'HEBEL',          fn:() => clickExplore('lever') });
    CH.addHotspot({ x:64, y:32, w:13, h:18, label:'VEXIER-GEMÄLDE', fn:() => clickExplore('painting') });
    CH.addHotspot({ x:84, y:60, w:7,  h:12, label:'NARRENBUCH',     fn:() => clickExplore('book') });
  }

  function clickExplore(key) {
    S.hotspots[key]++;

    if (key === 'lock') {
      if (!S.solved) {
        GameEngine.dialogue.load([
          { speaker:'SYSTEM', text:'Zwischen all den falschen Türen: ein echtes Schloss. Vier leere Siegelfelder — und ein hämisches Grinsen ins Metall graviert.' },
          { speaker:'F-AXN',  text:'„AH! Das Herzstück meiner Bühne! Vier Siegel, sechs Symbole, acht Versuche. Knack es — wenn du dich traust, Schätzchen."' },
        ], openVex);
      } else {
        GameEngine.dialogue.load([{ speaker:'F-AXN', text:'„Schon offen. Mit reiner Logik. Ich bin immer noch ein bisschen beleidigt."' }]);
      }
      return;
    }

    if (key === 'lever') {
      const bits = [
        [{ speaker:'SYSTEM', text:'Du ziehst am Hebel. Er kommt dir komplett entgegen — er war nie an irgendetwas befestigt.' },
         { speaker:'F-AXN',  text:'„HÄHÄ! Klassiker. Den bau ich in jeden Sektor. Funktioniert IMMER."' }],
        [{ speaker:'F-AXN',  text:'„Nochmal? Der ist immer noch an nichts angeschlossen. Aus Prinzip."' }],
      ];
      GameEngine.dialogue.load(bits[Math.min(S.hotspots.lever - 1, bits.length - 1)]);
      return;
    }

    if (key === 'painting') {
      GameEngine.dialogue.load([
        { speaker:'SYSTEM', text:'Ein gemaltes Schloss an der Wand — täuschend echt, bis hin zu den Schatten. Daneben, winzig, ein echtes.' },
        { speaker:'R-3MI',  text:'„Das große ist Farbe. Das kleine ist echt. Bei ihm ist es immer das, was man übersieht."' },
        { speaker:'F-AXN',  text:'„Tsss. Spielverderber. Aber… ja. Schön, oder? Drei Wochen gemalt."' },
      ]);
      return;
    }

    if (key === 'book') {
      if (!S.sigFound) {
        S.sigFound = true;
        GameEngine.dialogue.load([
          { speaker:'SYSTEM', text:'Ein „Narrenbuch“, randvoll mit Scherzen, Lügen und falschen Lösungen. Doch eine Seite ist anders: ordentlich, ehrlich, fast zärtlich beschrieben. Eine empfangene Frequenz.' },
          { speaker:'F-AXN',  text:'„…die Seite. Die hab ich nicht geschrieben. Die ist einfach… angekommen. Eines Tages. Lies sie. Ich kann’s nicht mehr."' },
        ], () => {
          try { GameEngine.signals.find('sig_05'); } catch(_) {}
          GameEngine.dialogue.load([
            { speaker:'V-TGM', text:'"…SSTV. frequency unknown. please receive. hope remains…"', subtitle:'…SSTV. Frequenz unbekannt. bitte empfangen. Hoffnung verbleibt…' },
            { speaker:'R-3MI', text:'„Das ist die fünfte. Die letzte. …Fünf Fragmente. Und trotzdem fühlt es sich an, als würde noch etwas fehlen."' },
            { speaker:'F-AXN', text:'„Zum ersten Mal seit langer Zeit hab ich keinen Witz parat. …weitergehen. Schnell."' },
          ]);
        });
      } else {
        GameEngine.dialogue.load([{ speaker:'F-AXN', text:'„Die eine ehrliche Seite. Mehr Wahrheit hab ich nicht im Haus."' }]);
      }
      return;
    }
  }

  function clickRobot(who) {
    S.hotspots[who]++;
    const n = S.hotspots[who];
    const byWho = {
      r3mi: [
        [{ speaker:'R-3MI', text:'„Vier Siegel, sechs mögliche Symbole. Das sind… ziemlich viele Kombinationen. Rate nicht. RECHNE."' }],
        [{ speaker:'R-3MI', text:'„Jeder Versuch ist Information. Selbst ein völlig falscher schließt Möglichkeiten aus. Verschwende keinen."' }],
      ],
      vtgm: [
        [{ speaker:'V-TGM', text:'"Read the pips. Filled means right symbol, right place. Hollow means right symbol, wrong place."', subtitle:'Lies die Punkte. Gefüllt = richtiges Symbol, richtiger Platz. Hohl = richtiges Symbol, falscher Platz.' }],
        [{ speaker:'V-TGM', text:'"He will taunt you. The numbers will not. Believe the numbers."', subtitle:'Er wird dich verhöhnen. Die Zahlen nicht. Glaub den Zahlen.' }],
      ],
      guest: [
        [{ speaker:'F-AXN', text:'„Tipp von mir: Es ist auf JEDEN Fall der Stern. …oder nie der Stern. Eins von beidem. Gern geschehen!"' }],
        [{ speaker:'F-AXN', text:'„Na schön, EIN ehrlicher Satz, weil du so süß guckst: Ein Symbol… kommt vielleicht doppelt vor. Vielleicht. PAH!"' }],
        [{ speaker:'F-AXN', text:'„Weißt du, früher bin ich mit jemandem um die Wette gerannt. Schnell. Orange. Ein Fellknäuel mit viel zu viel Strom. …ach. Lange her. Tipp endlich."' }],
      ],
    };
    const arr = byWho[who] || [];
    const line = arr[Math.min(n - 1, arr.length - 1)];
    if (line) GameEngine.dialogue.load(line);
  }

  // ═══════════════════════════════════════════════════════════════
  // VEXIERSCHLOSS — a deduction lock (Mastermind-style)
  //   secret: 4 slots, 6 symbols, repeats allowed (1296 combos)
  //   feedback: ● exact (right symbol+place), ○ misplaced (right symbol)
  //   budget: 8 tries. Provably crackable by deduction within budget.
  // ═══════════════════════════════════════════════════════════════
  const SYMBOLS = ['●','▲','■','◆','★','✚'];
  const N_SYM   = SYMBOLS.length;
  const SLOTS   = 4;
  const BUDGET  = 8;

  let VX = null; // { secret:[], slots:[], history:[], tries:0 }

  function newSecret() {
    return Array.from({ length: SLOTS }, () => Math.floor(Math.random() * N_SYM));
  }

  function scoreGuess(guess, secret) {
    let exact = 0; const sc = {}, gc = {};
    for (let i = 0; i < SLOTS; i++) {
      if (guess[i] === secret[i]) exact++;
      else { sc[secret[i]] = (sc[secret[i]]||0) + 1; gc[guess[i]] = (gc[guess[i]]||0) + 1; }
    }
    let misp = 0;
    for (const k in gc) misp += Math.min(gc[k], sc[k] || 0);
    return { exact, misp };
  }

  function symSpan(v) { return `<span class="vex-sym vex-${v}">${SYMBOLS[v]}</span>`; }

  function openVex() {
    VX = { secret: newSecret(), slots: [0, 0, 0, 0], history: [], tries: 0 };
    S.solved = false;
    CH.initHints({
      counts: { r3mi:1, vtgm:1, guest:2 },
      names:  { guest:'F-AXN' },
      banks: {
        r3mi: ['„Fang mit zwei Paaren an: ●●▲▲. Zähl, wie viele RICHTIG stehen — das verrät dir mehr als jeder wilde Schuss."'],
        vtgm: [{ speaker:'V-TGM',
                 text:'"After each guess, only keep codes that would give the SAME pips. Guess one of those next."',
                 subtitle:'Behalte nach jedem Versuch nur Codes, die DIESELBEN Punkte ergäben. Rate dann einen davon.' }],
        guest: [
          '„Mein heißer Tipp: Das erste Siegel ist ein Herz! …wir haben kein Herz. Hähä. Gern geschehen!"',
          '„Ohh, na GUT. Ein ehrliches Wort: Triff erst die Symbole, dann die Plätze. …igitt, fühlt sich falsch an, ehrlich zu sein."',
        ],
      },
      empty: {
        r3mi:  { speaker:'R-3MI', text:'„Mehr Mathe hab ich nicht. Aber du bist nah dran."' },
        vtgm:  { speaker:'V-TGM', text:'"That is all I have."', subtitle:'Mehr habe ich nicht.' },
        guest: { speaker:'F-AXN', text:'„Aus! Schluss! Keine Tipps mehr! …das war auch wieder gelogen, aber diesmal stimmt’s."' },
      },
    });
    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'VEXIERSCHLOSS // VIER SIEGEL · SECHS SYMBOLE · ACHT VERSUCHE.' },
      { speaker:'F-AXN',  text:'„Tipp deine vier Siegel, druck auf PRÜFEN, und ich sag dir — fast ehrlich — wie nah du dran bist. Die Punkte lügen nie. Ich schon. Viel Spaß!"' },
    ], () => {
      document.getElementById('vexModal').classList.remove('hidden');
      renderLegend();
      renderSlots();
      renderHistory();
      updateAttempts();
      setStatus('Vier Siegel. Acht Versuche. Kein Glück — nur Logik.', '');
    });
  }

  function renderLegend() {
    const el = document.getElementById('vexLegend');
    if (el) el.innerHTML = '<span class="vex-legend-label sys-text">SYMBOLE:</span>' +
      SYMBOLS.map((_, v) => symSpan(v)).join('');
  }

  function renderSlots() {
    const el = document.getElementById('vexSlots');
    if (!el) return;
    el.innerHTML = VX.slots.map((v, i) =>
      `<button class="vex-slot vex-${v}" onclick="Chapter7.vexCycle(${i})" aria-label="Siegel ${i+1}">${SYMBOLS[v]}</button>`
    ).join('');
  }

  function renderHistory() {
    const el = document.getElementById('vexHistory');
    if (!el) return;
    if (!VX.history.length) { el.innerHTML = '<div class="vex-empty sys-text">— noch keine Versuche —</div>'; return; }
    el.innerHTML = VX.history.map((h, idx) => {
      const syms = h.guess.map(symSpan).join('');
      let pips = '';
      for (let i = 0; i < h.exact; i++) pips += '<span class="vex-pip exact"></span>';
      for (let i = 0; i < h.misp;  i++) pips += '<span class="vex-pip misp"></span>';
      for (let i = h.exact + h.misp; i < SLOTS; i++) pips += '<span class="vex-pip blank"></span>';
      return `<div class="vex-row"><span class="vex-row-n sys-text">${idx+1}</span><span class="vex-row-syms">${syms}</span><span class="vex-row-pips">${pips}</span></div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;
  }

  function updateAttempts() {
    const el = document.getElementById('vexAttempts');
    if (el) el.textContent = `VERSUCH ${Math.min(VX.tries + 1, BUDGET)} / ${BUDGET}`;
  }

  function setStatus(text, type) {
    const el = document.getElementById('vexStatus');
    if (el) { el.textContent = text; el.className = 'puzzle-status sys-text' + (type ? ' ' + type : ''); }
  }

  function vexCycle(i) {
    if (!VX || S.solved) return;
    VX.slots[i] = (VX.slots[i] + 1) % N_SYM;
    renderSlots();
  }

  function vexSubmit() {
    if (!VX || S.solved || VX.tries >= BUDGET) return;
    const guess = VX.slots.slice();
    const r = scoreGuess(guess, VX.secret);
    VX.history.push({ guess, exact: r.exact, misp: r.misp });
    VX.tries++;
    renderHistory();

    if (r.exact === SLOTS) {
      S.solved = true;
      updateAttempts();
      setStatus('SCHLOSS GEKNACKT. Alle vier Siegel sitzen.', 'ok');
      try { GameEngine.audio.solve(); } catch(_) {}
      setTimeout(solveVex, 1000);
      return;
    }

    if (VX.tries >= BUDGET) {
      setStatus('Versuche aufgebraucht. F-AXN mischt neu — und grinst.', 'error');
      try { GameEngine.audio.fail(); } catch(_) {}
      const sub = document.getElementById('vexSubmit');
      const re  = document.getElementById('vexRestart');
      if (sub) sub.classList.add('hidden');
      if (re)  re.classList.remove('hidden');
      CH.withModalDialogue([
        { speaker:'F-AXN', text:'„HÄHÄÄ! Aufgebraucht! Keine Sorge, Schätzchen — ich misch neu, und wir spielen NOCHMAL. Ich hab ja Zeit. Unendlich viel."' },
        { speaker:'R-3MI', text:'„Atme durch. Diesmal: jeden Versuch auswerten, bevor du den nächsten tippst."' },
      ]);
      return;
    }

    updateAttempts();
    const taunts = [
      'Kalt. Eiskalt. Herrlich.',
      'Näher… nein, doch nicht. Hähä.',
      'Oho, da zuckt was. Oder ich tu nur so.',
      'Die Punkte sagen mehr als ich. Hör auf sie, nicht auf mich.',
      'Mmh. Interessant. Für dich, nicht für mich.',
    ];
    setStatus(`${r.exact}× richtig, ${r.misp}× verschoben. „${taunts[(VX.tries - 1) % taunts.length]}"`, '');
  }

  function vexRestart() {
    VX.secret = newSecret();
    VX.slots = [0, 0, 0, 0];
    VX.history = [];
    VX.tries = 0;
    S.solved = false;
    const sub = document.getElementById('vexSubmit');
    const re  = document.getElementById('vexRestart');
    if (sub) sub.classList.remove('hidden');
    if (re)  re.classList.add('hidden');
    renderSlots();
    renderHistory();
    updateAttempts();
    setStatus('Neu gemischt. Vier neue Siegel. Diesmal mit System.', '');
  }

  function solveVex() {
    document.getElementById('vexModal').classList.add('hidden');
    CH.showHintBar(false);
    CH.setProgress(76);
    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'VEXIERSCHLOSS ENTRIEGELT. VEXIERSEKTOR FREIGEGEBEN.' },
      { speaker:'F-AXN',  text:'„…du hast es geknackt. Mit LOGIK. Nicht mit Glück. Weißt du, wie selten das ist?"' },
      { speaker:'R-3MI',  text:'„Moment. War das gerade… ein ehrliches Kompliment? Von DIR?"' },
      { speaker:'F-AXN',  text:'„Pssst. Wenn das rauskommt, ist mein Ruf ruiniert. …geh weiter. Sektor acht. Aber pass auf."' },
      { speaker:'V-TGM',  text:'"He is not joking now. AGN-H3R waits in eight. The quiet one. The one that keeps the records."', subtitle:'Er scherzt gerade nicht. AGN-H3R wartet in acht. Der Stille. Der, der die Akten führt.' },
      { speaker:'F-AXN',  text:'„Er lacht nie. Nicht, weil er traurig ist. Sondern weil er etwas WEISS. …viel Glück. Wirklich."' },
    ], () => CH.complete());
  }

  // ─── PUBLIC API ───────────────────────────────────────────────
  function init() {
    buildChapter();
    CH.start();
  }

  return {
    init,
    vexCycle,
    vexSubmit,
    vexRestart,
    openVex,
  };

})();

document.addEventListener('DOMContentLoaded', () => Chapter7.init());
