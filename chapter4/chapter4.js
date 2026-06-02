/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 04 — RÄTSELSEKTOR
 * Guest character: B-RADF1SH (Armin) — Team_Bradfisch, Regensburg.
 *   Legendary Erstfinder (FTF), maker of fiendish Mystery caches
 *   (the infamous "Castra Enigma — Cubus", still unsolved), warm
 *   veteran who hosts a monthly Stammtisch.
 *
 * Scene flow:
 *   4.0 Title card
 *   4.1 Arrival — the puzzle vault sector
 *   4.2 Encounter with B-RADF1SH
 *   4.3 Choice 1: first questions (3 to see)
 *   4.4 Exploration (one hotspot hides Signalnische sig_02 — brauner Kasten)
 *   4.5 PUZZLE 1 — CUBUS-NETZ (fold a cube net, find opposite faces)
 *   4.6 PUZZLE 2 — CASTRA-CHIFFRE (Caesar cipher wheel → Stammtisch)
 *   4.7 Ending → Sektor 05 freigegeben
 *
 * Difficulty target: ~6.75  (P1 ~6.25 spatial · P2 ~7.25 cipher+riddle)
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter4 = (() => {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const S = {
    choice1Seen: { who:false, what:false, cubus:false },
    hotspots: { cubus:0, tablet:0, board:0, kasten:0, r3mi:0, vtgm:0, bradfish:0 },
    sigFound: false,
    p1Solved: false,
    p2Solved: false,
    hints: { r3mi:1, vtgm:1, bradfish:2, active:null }, // 4 total
  };

  // ═══════════════════════════════════════════════════════════════
  // SCENE HELPERS
  // ═══════════════════════════════════════════════════════════════
  function setScene(key, imgSrc) {
    const ph  = document.getElementById('scenePh');
    const img = document.getElementById('sceneBg');
    if (ph)  ph.dataset.scene = key;
    if (img && imgSrc) { img.src = imgSrc; img.style.display = ''; }
  }
  function clearHotspots() { document.getElementById('sceneHotspots').innerHTML = ''; }
  function addHotspot(cfg) {
    const el = document.createElement('button');
    el.className = 'hotspot' + (cfg.cls ? ' ' + cfg.cls : '');
    el.setAttribute('aria-label', cfg.label || 'Interagieren');
    el.style.cssText = `left:${cfg.x}%;top:${cfg.y}%;width:${cfg.w||7}%;height:${cfg.h||7}%;`;
    if (cfg.label) {
      const lbl = document.createElement('span');
      lbl.className = 'hotspot-label'; lbl.textContent = cfg.label; el.appendChild(lbl);
    }
    el.addEventListener('click', cfg.fn);
    document.getElementById('sceneHotspots').appendChild(el);
    return el;
  }
  function showRobots(v)   { document.getElementById('robotIcons').classList.toggle('hidden', !v); }
  function showBradfish(v) { document.getElementById('bradfishIcon').classList.toggle('hidden', !v); }
  function setProgress(pct){ const el = document.getElementById('reactProgress'); if (el) el.textContent = `REAKTIVIERUNG: ${pct}%`; }
  function playSound(src)  { try { const a = new Audio(`audio/${src}`); a.play(); } catch(_) {} }

  // ═══════════════════════════════════════════════════════════════
  // CHOICE SYSTEM
  // ═══════════════════════════════════════════════════════════════
  function showChoices(cfg) {
    const overlay = document.getElementById('choiceOverlay');
    const btns    = document.getElementById('choiceButtons');
    const prompt  = document.getElementById('choicePrompt');
    const hint    = document.getElementById('choiceHint');
    prompt.textContent = cfg.prompt || 'WÄHLE EINE ANTWORT:';
    hint.textContent   = cfg.hint   || '';
    btns.innerHTML     = '';
    cfg.choices.forEach(c => {
      const btn = document.createElement('button');
      btn.className   = 'choice-btn' + (c.seen ? ' seen' : '');
      btn.textContent = c.label;
      btn.addEventListener('click', () => {
        c.seen = true;
        hideChoices();
        if (c.fn) { c.fn(); return; }
        GameEngine.dialogue.load(c.lines, () => { if (cfg.onAfterChoice) cfg.onAfterChoice(c.key, cfg); });
      });
      btns.appendChild(btn);
    });
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => overlay.classList.add('visible'));
  }
  function hideChoices() {
    const overlay = document.getElementById('choiceOverlay');
    overlay.classList.remove('visible');
    setTimeout(() => overlay.classList.add('hidden'), 410);
  }
  function allSeen(choices) { return choices.every(c => c.seen); }

  // The puzzle modal (z-index 200) covers the dialogue box (z-index 50),
  // so hide whichever modal is open while mid-puzzle dialogue plays.
  function withModalDialogue(modalId, lines, after) {
    const modal = document.getElementById(modalId);
    const wasOpen = modal && !modal.classList.contains('hidden');
    if (wasOpen) modal.classList.add('hidden');
    GameEngine.dialogue.load(lines, () => {
      if (wasOpen) modal.classList.remove('hidden');
      if (after) after();
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 4.0 — TITLE CARD
  // ═══════════════════════════════════════════════════════════════
  function showTitleCard() {
    const card = document.getElementById('titleCard');
    setTimeout(() => {
      card.classList.add('fading');
      setTimeout(() => { card.style.display = 'none'; scene_4_1_arrival(); }, 700);
    }, 3000);
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 4.1 — ARRIVAL
  // ═══════════════════════════════════════════════════════════════
  function scene_4_1_arrival() {
    setScene('vault-dim', 'cg/ch4_vault.png');
    clearHotspots();
    showRobots(true);
    showBradfish(false);

    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'SEKTOR 04 — RÄTSELSEKTOR. Hier hat die Anlage ihre schwierigsten Verschlüsse gelagert. Die Wände tragen römische Ziffern. Der Boden ist ein Raster aus alten Steinplatten — fast wie ein Lagerplan.' },
      { speaker:'SYSTEM', text:'In der Mitte steht ein massiver Würfel aus Stein und Messing. Auf jeder sichtbaren Fläche eine Zahl. Daneben eine Tafel voller wirrer Buchstaben.' },
      { speaker:'R-3MI',  text:'„Oh nein. Ich kenne diesen Würfel. Den hat… er gebaut."' },
      { speaker:'V-TGM',  text:'"The one no visitor ever solved."', subtitle:'Den nie ein Besucher gelöst hat.' },
      { speaker:'R-3MI',  text:'„Bitte sag mir, dass er nicht—"' },
      { speaker:'B-RADF1SH', text:'„—da ist! Natürlich bin ich da. Wer denn sonst? Ich war zuerst hier. Ich bin immer zuerst da."' },
    ], () => scene_4_2_bradfish());
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 4.2 — B-RADF1SH APPEARS
  // ═══════════════════════════════════════════════════════════════
  function scene_4_2_bradfish() {
    setScene('vault-lit', 'cg/ch4_bradfish.png');
    playSound('ch4_bradfish.mp3');

    GameEngine.dialogue.load([
      { speaker:'B-RADF1SH', text:'„B-RADF1SH. Aber sag ruhig Armin. Erstfinder, Rätselbauer, und — wenn man ehrlich ist — der Grund, warum dieser Sektor einen so schlechten Ruf hat."' },
      { speaker:'B-RADF1SH', text:'„Magenta ist meine Farbe. Wie der Stempel im Logbuch, wenn man als Erster da war. FTF. Mein Lieblingswort."' },
      { speaker:'R-3MI',  text:'„Er hat zu allem als Erster »gefunden« gerufen. Sogar zu Dingen, die niemand verloren hatte."' },
      { speaker:'B-RADF1SH', text:'„Gefunden ist gefunden."' },
      { speaker:'V-TGM',  text:'"He is harmless. Mostly."', subtitle:'Er ist harmlos. Meistens.' },
      { speaker:'B-RADF1SH', text:'„Harmlos! Charmant! Und ich mache die besten Rätsel der ganzen Anlage. Eines davon hat noch nie jemand geknackt. Es heißt Cubus."' },
      { speaker:'B-RADF1SH', text:'„Vielleicht hast du ja Glück. Oder Verstand. Beides hilft. Eines reicht."' },
    ], () => scene_4_3_choice1());
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 4.3 — CHOICE 1
  // ═══════════════════════════════════════════════════════════════
  const C1 = {
    who: {
      key:'who', label:'[Wer bist du, Armin?]', seen:false,
      lines:[
        { speaker:'B-RADF1SH', text:'„Ein alter Hase. Ich war schon hier, als die Anlage noch lief. Habe jede Dose zuerst gefunden, jedes Logbuch zuerst unterschrieben."' },
        { speaker:'R-3MI',  text:'„»Dose«. »Logbuch«. Versteht ihr Menschen das?"' },
        { speaker:'B-RADF1SH', text:'„Die Testperson versteht es. Das sieht man. Du hast den Blick von jemandem, der schon mal nachts mit einer Taschenlampe im Gebüsch gestanden hat."' },
        { speaker:'V-TGM',  text:'"That is oddly specific."', subtitle:'Das ist seltsam genau.' },
        { speaker:'B-RADF1SH', text:'„Ich beobachte. Anders als L-UX rede ich nur nicht die ganze Zeit darüber."' },
      ],
    },
    what: {
      key:'what', label:'[Was ist dieser Sektor?]', seen:false,
      lines:[
        { speaker:'B-RADF1SH', text:'„Das Rätselarchiv. Hier hat die Anlage alles weggeschlossen, was sie für zu wertvoll hielt, um es einfach offen herumstehen zu lassen."' },
        { speaker:'B-RADF1SH', text:'„Zwei Schlösser. Ein Würfel und eine Chiffre. Beide von mir. Beide… nun ja. Sagen wir: gründlich."' },
        { speaker:'R-3MI',  text:'„»Gründlich« heißt bei ihm »gemein«."' },
        { speaker:'B-RADF1SH', text:'„Gemein mit Liebe. Das ist ein Unterschied."' },
      ],
    },
    cubus: {
      key:'cubus', label:'[Erzähl mir vom Cubus.]', seen:false,
      lines:[
        { speaker:'B-RADF1SH', text:'„Ah. Der Cubus. Mein Meisterstück. Castra Enigma — Cubus. Benannt nach dem alten Lager, auf dem alles hier steht."' },
        { speaker:'B-RADF1SH', text:'„Sechs Flächen. Sechs Zahlen. Aufgefaltet liegt er da wie ein Schnittmuster. Die Kunst ist, ihn im Kopf wieder zusammenzufalten — und zu wissen, was wem gegenüberliegt."' },
        { speaker:'V-TGM',  text:'"No one has done it."', subtitle:'Niemand hat es geschafft.' },
        { speaker:'B-RADF1SH', text:'„Noch niemand. Ich sage das ohne Stolz." …' },
        { speaker:'B-RADF1SH', text:'„Das war gelogen. Mit sehr viel Stolz. Komm zum Stammtisch, dann erzähl ich dir, wie viele es probiert haben."' },
      ],
    },
  };

  function scene_4_3_choice1() {
    showBradfish(true);
    const choices = Object.values(C1);
    showChoices({
      prompt: 'ERSTE FRAGEN — ALLE AUSWÄHLEN:',
      hint: choices.filter(c => !c.seen).length + ' AUSSTEHEND',
      choices,
      onAfterChoice: (key, cfg) => {
        S.choice1Seen[key] = true;
        if (allSeen(choices)) setTimeout(() => scene_4_4_explore(), 400);
        else { cfg.hint = `NOCH ${choices.filter(c => !c.seen).length} AUSSTEHEND`; showChoices(cfg); }
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 4.4 — EXPLORATION
  // ═══════════════════════════════════════════════════════════════
  function scene_4_4_explore() {
    GameEngine.dialogue.load([
      { speaker:'B-RADF1SH', text:'„Schau dich um. Echte Rätselleute schauen immer erst, bevor sie anfassen. Und dann fassen sie das Falsche an. Das gehört dazu."' },
      { speaker:'SYSTEM', text:'SEKTOR 04 — ZWEI VERSCHLÜSSE AKTIV. CUBUS-NETZ // CASTRA-CHIFFRE.' },
    ], () => loadExploreHotspots());
  }

  function loadExploreHotspots() {
    clearHotspots();
    addHotspot({ x:46, y:44, w:13, h:16, cls:'hs-bradfish', label:'CUBUS', fn:() => clickExplore('cubus') });
    addHotspot({ x:78, y:50, w:9, h:12,  label:'CASTRA-TAFEL', fn:() => clickExplore('tablet') });
    addHotspot({ x:16, y:40, w:7, h:14,  label:'LAGERPLAN',    fn:() => clickExplore('board') });
    addHotspot({ x:85, y:78, w:6, h:8,   label:'BRAUNER KASTEN', fn:() => clickExplore('kasten') });
  }

  function clickExplore(key) {
    S.hotspots[key]++;
    const n = S.hotspots[key];

    if (key === 'kasten') {
      if (!S.sigFound) {
        S.sigFound = true;
        GameEngine.dialogue.load([
          { speaker:'SYSTEM', text:'Ein brauner Metallkasten, halb unter Geröll. Ein Munitionskasten, wie man ihn als Versteck benutzt. Innen blinkt schwach ein Sender — und sendet noch immer.' },
          { speaker:'B-RADF1SH', text:'„Den hab ich hier vergessen. Vor… langer Zeit. Er sendet noch? Nach all den Jahren?"' },
        ], () => {
          try { GameEngine.signals.find('sig_02'); } catch(_) {}
          GameEngine.dialogue.load([
            { speaker:'V-TGM', text:'"…the brown box still transmits. no one receives anymore."', subtitle:'…der braune Kasten sendet noch. niemand empfängt mehr.' },
            { speaker:'B-RADF1SH', text:'„…jemand empfängt jetzt. Du. Behalt das im Hinterkopf."' },
          ]);
        });
      } else {
        GameEngine.dialogue.load([{ speaker:'B-RADF1SH', text:'„Der alte Kasten. Sendet treu vor sich hin. So bin ich auch."' }]);
      }
      return;
    }

    const lines = {
      cubus: [[
        { speaker:'SYSTEM', text:'Der Würfel ist aufgeklappt — sechs Flächen liegen flach in einer Treppenform. Jede trägt eine römische Ziffer von I bis VI.' },
        { speaker:'B-RADF1SH', text:'„Falte ihn im Kopf zusammen. Sag mir, was jeder Zahl gegenüberliegt. Tipp: Nachbarn im Netz sind nie Gegenüber."' },
      ]],
      tablet: [[
        { speaker:'SYSTEM', text:'Die Castra-Tafel: ein Ring aus Buchstaben um einen zweiten, drehbaren Ring. Darunter eine Reihe wirrer Lettern.' },
        { speaker:'B-RADF1SH', text:'„Erst der Würfel, dann die Chiffre. Eins nach dem anderen. Wie beim Cachen: man unterschreibt nicht, bevor man die Dose hat."' },
      ]],
      board: [[
        { speaker:'SYSTEM', text:'Ein alter Lagerplan: ein Rechteck mit vier Toren und der Aufschrift CASTRA REGINA. Das römische Lager, auf dem die Anlage steht.' },
        { speaker:'B-RADF1SH', text:'„Castra Regina. Regensburg, für die Daheimgebliebenen. Alles hier steht auf etwas sehr Altem."' },
      ]],
    };
    const bucket = lines[key];
    if (!bucket) return;
    const line = bucket[Math.min(n - 1, bucket.length - 1)];

    if (key === 'cubus' && n === 1 && !S.p1Solved) {
      GameEngine.dialogue.load(line, () => openCubus());
    } else if (key === 'tablet' && S.p1Solved && !S.p2Solved) {
      GameEngine.dialogue.load(line, () => openChiffre());
    } else if (key === 'tablet' && !S.p1Solved) {
      GameEngine.dialogue.load([{ speaker:'B-RADF1SH', text:'„Erst der Cubus. Die Chiffre läuft dir nicht weg."' }]);
    } else {
      GameEngine.dialogue.load(line);
    }
  }

  function clickRobot(who) {
    S.hotspots[who]++;
    const n = S.hotspots[who];
    const byWho = {
      r3mi: [
        [{ speaker:'R-3MI', text:'„Armin ist… eigentlich nett. Das ist das Verstörende daran. Nette Leute, die unlösbare Rätsel bauen."' }],
        [{ speaker:'R-3MI', text:'„Wenn er »leicht« sagt, meint er »ich habe es in vier Sekunden gelöst, weil ich es gebaut habe«."' }],
      ],
      vtgm: [
        [{ speaker:'V-TGM', text:'"He has waited a long time for someone to finish the Cubus."', subtitle:'Er hat lange auf jemanden gewartet, der den Cubus löst.' }],
        [{ speaker:'V-TGM', text:'"Do not tell him, but he is proud of you already."', subtitle:'Sag es ihm nicht, aber er ist jetzt schon stolz auf dich.' }],
      ],
      bradfish: [
        [{ speaker:'B-RADF1SH', text:'„Brauchst du einen Tipp? Ich gebe gute Tipps. Sie führen nur selten direkt zur Lösung. Das ist Absicht. Mit Liebe."' }],
        [{ speaker:'B-RADF1SH', text:'„Wenn du das hier schaffst, lade ich dich zum Stammtisch ein. Jeden Monat. Echte Leute, echter Kaffee, echte Rätsel. Du würdest reinpassen."' }],
      ],
    };
    const arr = byWho[who] || [];
    const line = arr[Math.min(n - 1, arr.length - 1)];
    if (line) GameEngine.dialogue.load(line);
  }

  // ═══════════════════════════════════════════════════════════════
  // PUZZLE 1 — CUBUS-NETZ  (fold the net, name the opposite face)
  // ═══════════════════════════════════════════════════════════════
  /*
   * Staircase net (verified by a rolling-cube simulation):
   *   (0,0)=I (0,1)=II
   *           (1,1)=III (1,2)=IV
   *                     (2,2)=V (2,3)=VI
   * Opposite pairs: I–IV, II–V, III–VI.
   */
  const NET = [
    { r:0, c:0, f:'I'  }, { r:0, c:1, f:'II' },
    { r:1, c:1, f:'III'}, { r:1, c:2, f:'IV' },
    { r:2, c:2, f:'V'  }, { r:2, c:3, f:'VI' },
  ];
  const OPP = { 'I':'IV', 'IV':'I', 'II':'V', 'V':'II', 'III':'VI', 'VI':'III' };
  const CUBUS_QUERIES = ['I', 'III', 'II']; // ask opposite of each (→ IV, VI, V)
  let p1 = { qi:0, solvedFaces:[] };

  function openCubus() {
    p1 = { qi:0, solvedFaces:[] };
    S.hints.active = 'p1';
    S.hints.r3mi = 1; S.hints.vtgm = 1; S.hints.bradfish = 2;
    updateHintBar();
    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'CUBUS-VERSCHLUSS // FALTE DAS NETZ.' },
      { speaker:'B-RADF1SH', text:'„Drei Fragen. Welche Fläche liegt der gefragten gegenüber? Tipp die richtige im Netz an. Keine Hektik — der Würfel hat ewig gewartet."' },
    ], () => {
      document.getElementById('cubusModal').classList.remove('hidden');
      document.getElementById('hintBar').classList.remove('hidden');
      renderCubus();
    });
  }

  function renderCubus() {
    const grid = document.getElementById('cubusGrid');
    grid.innerHTML = '';
    const byPos = {};
    NET.forEach(n => byPos[`${n.r},${n.c}`] = n);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const cell = byPos[`${r},${c}`];
        const el = document.createElement(cell ? 'button' : 'div');
        el.className = 'cube-face' + (cell ? '' : ' empty');
        if (cell) {
          el.textContent = cell.f;
          if (p1.solvedFaces.includes(cell.f)) el.classList.add('done');
          el.addEventListener('click', () => answerCubus(cell.f));
        }
        grid.appendChild(el);
      }
    }
    const q = CUBUS_QUERIES[p1.qi];
    document.getElementById('cubusPrompt').textContent =
      `Frage ${p1.qi + 1} / 3 — Welche Fläche liegt »${q}« gegenüber?`;
  }

  function answerCubus(face) {
    if (S.p1Solved) return;
    const q = CUBUS_QUERIES[p1.qi];
    if (face === q) { setCubusStatus('Das ist die gefragte Fläche — tippe ihr GEGENÜBER an.', 'warn'); return; }
    if (face === OPP[q]) {
      p1.solvedFaces.push(q, face);
      p1.qi++;
      playSound('ch4_click.mp3');
      if (p1.qi >= CUBUS_QUERIES.length) {
        S.p1Solved = true;
        setCubusStatus('CUBUS GELÖST. ALLE GEGENÜBER KORREKT.', 'ok');
        renderCubus();
        setTimeout(() => solveCubus(), 900);
      } else {
        setCubusStatus('Richtig. Nächste Fläche.', 'ok');
        renderCubus();
      }
    } else {
      setCubusStatus(`Nein — »${face}« grenzt an »${q}« an oder liegt daneben. Falte sorgfältiger.`, 'error');
    }
  }

  function setCubusStatus(text, type) {
    const el = document.getElementById('cubusStatus');
    el.textContent = text; el.className = 'puzzle-status sys-text' + (type ? ' ' + type : '');
  }

  function cubusReset() {
    if (S.p1Solved) return;
    p1 = { qi:0, solvedFaces:[] };
    setCubusStatus('ZURÜCKGESETZT.', '');
    renderCubus();
  }

  function solveCubus() {
    document.getElementById('cubusModal').classList.add('hidden');
    document.getElementById('hintBar').classList.add('hidden');
    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'CUBUS ENTRIEGELT. ERSTE LÖSUNG SEIT INBETRIEBNAHME.' },
      { speaker:'B-RADF1SH', text:'„…du hast ihn gelöst."' },
      { speaker:'B-RADF1SH', text:'„Den Cubus. Den niemand löst. Den ICH gebaut habe, damit ihn niemand löst."' },
      { speaker:'R-3MI',  text:'„Ich glaube, er ist gerührt."' },
      { speaker:'B-RADF1SH', text:'„Ich bin nicht gerührt! Ich bin… professionell beeindruckt. Weiter zur Chiffre, bevor ich etwas Peinliches sage."' },
    ], () => {
      // unlock the tablet for puzzle 2
      GameEngine.dialogue.load([
        { speaker:'SYSTEM', text:'ZWEITER VERSCHLUSS AKTIV: CASTRA-CHIFFRE. UNTERSUCHE DIE TAFEL.' },
      ], () => { /* player clicks CASTRA-TAFEL to begin P2 */ });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // PUZZLE 2 — CASTRA-CHIFFRE  (Caesar wheel → read riddle → answer)
  // ═══════════════════════════════════════════════════════════════
  const CIPHER_PLAIN  = 'MONATLICHES TREFFEN DER ERSTFINDER';
  const CIPHER_SHIFT  = 5;                 // secret shift used to encode
  const CIPHER_ANSWER = ['stammtisch'];    // accepted answers (normalised)
  let p2 = { shift:0, cipher:'' };

  function caesar(str, shift) {
    return str.replace(/[A-Z]/g, ch =>
      String.fromCharCode((ch.charCodeAt(0) - 65 + shift + 26) % 26 + 65));
  }

  function openChiffre() {
    p2 = { shift: 0, cipher: caesar(CIPHER_PLAIN, CIPHER_SHIFT) };
    S.hints.active = 'p2';
    S.hints.r3mi = 1; S.hints.vtgm = 1; S.hints.bradfish = 2;
    updateHintBar();
    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'CASTRA-CHIFFRE // RING DREHEN, BIS DER TEXT SPRICHT.' },
      { speaker:'B-RADF1SH', text:'„Eine Caesar-Verschiebung. Alt wie das Lager selbst. Dreh den Ring, bis aus dem Kauderwelsch Deutsch wird — dann beantworte, wonach der Text fragt."' },
      { speaker:'V-TGM', text:'"Read it. Then answer in the field."', subtitle:'Lies es. Dann antworte im Feld.' },
    ], () => {
      document.getElementById('chiffreModal').classList.remove('hidden');
      document.getElementById('hintBar').classList.remove('hidden');
      renderChiffre();
      const inp = document.getElementById('chiffreInput');
      if (inp) inp.value = '';
    });
  }

  function renderChiffre() {
    document.getElementById('chiffreShift').textContent = p2.shift.toString().padStart(2, '0');
    // decode the ciphertext by the player's current shift
    document.getElementById('chiffreOut').textContent = caesar(p2.cipher, 26 - (p2.shift % 26));
  }

  function chiffreRotate(dir) {
    if (S.p2Solved) return;
    p2.shift = (p2.shift + dir + 26) % 26;
    renderChiffre();
  }

  function chiffreSubmit() {
    if (S.p2Solved) return;
    const raw = (document.getElementById('chiffreInput').value || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!raw) { setChiffreStatus('Gib eine Antwort ein.', 'warn'); return; }
    if (CIPHER_ANSWER.includes(raw)) {
      S.p2Solved = true;
      setChiffreStatus('CHIFFRE GELÖST.', 'ok');
      playSound('ch4_click.mp3');
      setTimeout(() => solveChiffre(), 900);
    } else {
      setChiffreStatus('Das passt noch nicht. Lies die entschlüsselte Tafel genau.', 'error');
    }
  }

  function setChiffreStatus(text, type) {
    const el = document.getElementById('chiffreStatus');
    el.textContent = text; el.className = 'puzzle-status sys-text' + (type ? ' ' + type : '');
  }

  function solveChiffre() {
    document.getElementById('chiffreModal').classList.add('hidden');
    document.getElementById('hintBar').classList.add('hidden');
    setProgress(40);
    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'CASTRA-CHIFFRE GELÖST. RÄTSELSEKTOR ENTRIEGELT.' },
      { speaker:'B-RADF1SH', text:'„Stammtisch. Genau. Jeden Monat, immer derselbe Tisch, immer dieselben verrückten Rätselleute."' },
      { speaker:'B-RADF1SH', text:'„Und jetzt gehörst du dazu. Erstfinder-Ehrenwort. Der Erste, der beide Schlösser geknackt hat."' },
      { speaker:'R-3MI',  text:'„Sag es. Du weißt, dass du es sagen willst."' },
      { speaker:'B-RADF1SH', text:'„…ich bin stolz auf dich. Da. Gesagt. Bitte nicht weitererzählen."' },
      { speaker:'V-TGM',  text:'"Sektor 05 is open."', subtitle:'Sektor 05 ist offen.' },
      { speaker:'B-RADF1SH', text:'„Geh ruhig. Aber komm zum Stammtisch. Du weißt jetzt, wie er heißt."' },
    ], () => endChapter());
  }

  function endChapter() {
    GameEngine.state.markChapterComplete('ch4');
    try { GameEngine.achievements.unlock('ch4_complete'); } catch(_) {}
    document.getElementById('chapterComplete').classList.remove('hidden');
    document.getElementById('ccProgress').textContent =
      `FORTSCHRITT: ${GameEngine.state.get('chaptersCompleted').length} / 10 KAPITEL`;
  }

  // ═══════════════════════════════════════════════════════════════
  // HINT SYSTEM
  // ═══════════════════════════════════════════════════════════════
  const HINTS = {
    p1: {
      r3mi: ['„Im Netz benachbarte Flächen können NIE gegenüber liegen. Streich erst mal alle Nachbarn weg."'],
      vtgm: [{ text:'"Fold it step by step. I and IV never touch in the net — that is the giveaway pair."',
               sub:'Falte Schritt für Schritt. I und IV berühren sich im Netz nie — das ist das verräterische Paar.' }],
      bradfish: [
        '„Treppenform. Geh von einer Fläche zwei Schritte am Netz entlang — meistens landest du beim Gegenüber. Meistens."',
        '„Gut. Zwischen dir und der Lösung steht nur noch ein bisschen Mut. Die Paare sind I–IV, II–V, III–VI. Aber das hast du nicht von mir."',
      ],
    },
    p2: {
      r3mi: ['„Dreh einfach den Ring durch, bis Wörter auftauchen, die du erkennst. Geduld schlägt Raten."'],
      vtgm: [{ text:'"The text asks for a place that meets once a month. Armin keeps mentioning it."',
               sub:'Der Text fragt nach einem Ort, der sich einmal im Monat trifft. Armin erwähnt ihn ständig.' }],
      bradfish: [
        '„Caesar mag kleine Verschiebungen. Probier es um die fünf herum, dann wird es lesbar."',
        '„Die Antwort ist mein Lieblingstermin. Monatlich. Mit Kaffee. Du warst quasi schon eingeladen."',
      ],
    },
  };

  function useHint(who) {
    const remaining = S.hints[who];
    const modalId = (S.hints.active === 'p2') ? 'chiffreModal' : 'cubusModal';
    if (remaining <= 0) {
      withModalDialogue(modalId, [{
        speaker: who === 'r3mi' ? 'R-3MI' : who === 'vtgm' ? 'V-TGM' : 'B-RADF1SH',
        text: who === 'r3mi' ? '„Mehr habe ich nicht. Kopf hoch."'
            : who === 'vtgm' ? '"That is all I have."'
            : '„Mehr verrate ich nicht. Sonst ist es ja kein Rätsel mehr — und Rätsel sind heilig."',
        subtitle: who === 'vtgm' ? 'Mehr habe ich nicht.' : undefined,
      }]);
      return;
    }
    const bank  = HINTS[S.hints.active] || HINTS.p1;
    const total = (who === 'bradfish') ? 2 : 1;
    const idx   = Math.min(total - remaining, (bank[who] ? bank[who].length : 1) - 1);
    S.hints[who]--;
    updateHintBar();
    const entry = bank[who] ? bank[who][idx] : null;
    if (!entry) return;
    const line = (typeof entry === 'string')
      ? { speaker: who === 'r3mi' ? 'R-3MI' : 'B-RADF1SH', text: entry }
      : { speaker: 'V-TGM', text: entry.text, subtitle: entry.sub };
    withModalDialogue(modalId, [line]);
  }

  function updateHintBar() {
    const total = S.hints.r3mi + S.hints.vtgm + S.hints.bradfish;
    document.getElementById('hintCount').textContent = `HINWEISE: ${total} VERFÜGBAR`;
    document.getElementById('hintBtnR3MI').disabled     = S.hints.r3mi     <= 0;
    document.getElementById('hintBtnVTGM').disabled     = S.hints.vtgm     <= 0;
    document.getElementById('hintBtnBradfish').disabled = S.hints.bradfish <= 0;
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════
  return {
    init() { showTitleCard(); },
    clickRobot,
    useHint,
    cubusReset,
    chiffreRotate,
    chiffreSubmit,
  };

})();

document.addEventListener('DOMContentLoaded', () => Chapter4.init());
