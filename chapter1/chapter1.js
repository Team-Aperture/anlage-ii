/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 01 — WARTUNGSSEKTOR
 *
 * The encounter chapter, in three acts:
 *   1. SOMETHING IS HERE  — the hall reads as abandoned until the
 *      evidence says otherwise (old log vs. an 11-minute-old repair).
 *   2. THE ENCOUNTER      — two units reveal themselves. One reaction
 *      choice; everything deeper is optional.
 *   3. FIRST COLLABORATION— two repairs that visibly wake the sector.
 *
 * Puzzle win conditions are computed by flood-fill over the live grid,
 * never compared against a stored answer.
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter1 = (() => {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const S = {
    // Act 1 discovery tracking
    act1Seen:   {},          // hotspot key -> times examined
    klonkDone:  false,
    corridorOpen: false,

    // Act 2/3
    metRobots:  false,
    p1Solved:   false,
    p2Solved:   false,
    sectorAwake:false,

    // per-room examine counters (drive the "it has not changed" beats)
    clicks: {},

    // optional-conversation tracking
    talkSeen:   {},

    // hint budget: a single 3-step ladder per puzzle. Whichever unit you
    // ask voices the *next* step, so the choice is personality, not quantity.
    hints: { step: 0, max: 3, active: null },

    // reactive puzzle chatter (each beat fires at most once per puzzle)
    react: { p1: {}, p2: {} },
    rotations: { p1: 0, p2: 0 },
  };

  const HINT_MAX = 3;

  // ═══════════════════════════════════════════════════════════════
  // SCENE HELPERS
  // ═══════════════════════════════════════════════════════════════
  function setScene(key) {
    const ph = document.getElementById('scenePh');
    if (ph) ph.dataset.scene = key;
  }

  function clearHotspots() {
    document.getElementById('sceneHotspots').innerHTML = '';
  }

  function addHotspot(cfg) {
    // A code-drawn prop you click directly (no images).
    if (cfg.prop && window.GameEngine && GameEngine.props) {
      const p = GameEngine.props.el(cfg.prop, {
        x:cfg.x, y:cfg.y, w:cfg.w, h:cfg.h,
        label:cfg.label, aria:cfg.aria, onClick:cfg.fn, cls:cfg.cls, anim:cfg.anim,
      });
      document.getElementById('sceneHotspots').appendChild(p);
      return p;
    }
    const el = document.createElement('button');
    el.className = 'hotspot' + (cfg.cls ? ' ' + cfg.cls : '');
    el.setAttribute('aria-label', cfg.aria || cfg.label || 'Interagieren');
    el.style.cssText = `left:${cfg.x}%;top:${cfg.y}%;width:${cfg.w||7}%;height:${cfg.h||7}%;`;
    if (cfg.label) {
      const lbl = document.createElement('span');
      lbl.className = 'hotspot-label'; lbl.textContent = cfg.label; el.appendChild(lbl);
    }
    el.addEventListener('click', cfg.fn);
    document.getElementById('sceneHotspots').appendChild(el);
    return el;
  }

  // Decorative (non-interactive) code-drawn scenery.
  function addProp(cfg) {
    if (!(window.GameEngine && GameEngine.props)) return;
    document.getElementById('sceneHotspots').appendChild(
      GameEngine.props.el(cfg.prop, { x:cfg.x, y:cfg.y, w:cfg.w, h:cfg.h, cls:cfg.cls, anim:cfg.anim }));
  }

  function showRobots(v) {
    document.getElementById('robotIcons').classList.toggle('hidden', !v);
  }

  function playSound(src) { try { GameEngine.audio.sfx(src); } catch(_) {} }
  function tone(o)        { try { GameEngine.audio.tone(o); } catch(_) {} }

  function setProgress(pct) {
    const el = document.getElementById('reactProgress');
    if (el) el.textContent = `REAKTIVIERUNG: ${pct}%`;
  }

  function say(lines, after) { GameEngine.dialogue.load(lines, after); }

  /** Count an examine and return how many times this thing has been looked at. */
  function bump(key) {
    S.clicks[key] = (S.clicks[key] || 0) + 1;
    return S.clicks[key];
  }

  /** Pick the entry for click n from a 1-indexed bucket, clamping to the last. */
  function pick(bucket, n) {
    const keys = Object.keys(bucket).map(Number).sort((a, b) => a - b);
    const use  = keys.filter(k => k <= n).pop() ?? keys[0];
    return bucket[use];
  }

  // ═══════════════════════════════════════════════════════════════
  // CHOICE SYSTEM
  // ═══════════════════════════════════════════════════════════════
  /**
   * One-shot choice: the player picks a single option and the story moves on.
   * Nothing here re-opens the panel — Chapter 1 never asks you to exhaust a list.
   */
  function askOnce(cfg) {
    const overlay = document.getElementById('choiceOverlay');
    const btns    = document.getElementById('choiceButtons');
    const prompt  = document.getElementById('choicePrompt');
    const hint    = document.getElementById('choiceHint');

    prompt.textContent = cfg.prompt || 'DEINE REAKTION:';
    hint.textContent   = cfg.hint   || '';
    btns.innerHTML     = '';

    cfg.choices.forEach(c => {
      const btn = document.createElement('button');
      btn.className   = 'choice-btn' + (c.seen ? ' seen' : '');
      btn.textContent = c.label;
      btn.addEventListener('click', () => {
        c.seen = true;
        hideChoices();
        say(c.lines, () => { if (cfg.onPick) cfg.onPick(c.key); });
      }, { once: true });
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

  // ═══════════════════════════════════════════════════════════════
  // TITLE CARD
  // ═══════════════════════════════════════════════════════════════
  function showTitleCard() {
    const card = document.getElementById('titleCard');
    card.classList.remove('fading');
    setTimeout(() => {
      card.classList.add('fading');
      setTimeout(() => {
        card.style.display = 'none';
        act1_hallEmpty();
      }, 700);
    }, 2800);
  }

  // ═══════════════════════════════════════════════════════════════
  // ACT 1 — SOMETHING IS HERE
  // The hall must read as empty first. No unit names, no portraits.
  // ═══════════════════════════════════════════════════════════════
  function act1_hallEmpty() {
    setScene('hall-empty');
    clearHotspots();
    showRobots(false);
    try { GameEngine.music.play('ch1_ambient'); } catch(_) {}

    say([
      { speaker:'SYSTEM', text:'Die Schleuse hinter dir ist zugefallen. Vor dir liegt die erste Halle der Anlage.' },
      { speaker:'SYSTEM', text:'Innen ist es noch stiller als draußen. Nicht friedlicher. Nur kontrollierter.' },
      { speaker:'SYSTEM', text:'Die Wände sind überwuchert, aber nicht vollständig zerstört. Unter den Ranken erkennst du alte Pfeile, Testnummern und verblasste Warnsymbole.' },
      { speaker:'SYSTEM', text:'Die Kalibrierungsanlage wirkt nicht verlassen. Sie wirkt angehalten.' },
    ], () => loadAct1Hotspots());
  }

  function loadAct1Hotspots() {
    clearHotspots();
    // ── set dressing: ceiling → walls → floor (unchanged room layout)
    addProp({ prop:'duct',   x:10, y:0,  w:56, h:7, cls:'prop-far' });
    addProp({ prop:'light',  x:26, y:4,  w:11, h:8  });
    addProp({ prop:'light',  x:58, y:4,  w:11, h:8  });
    addProp({ prop:'column', x:1,  y:14, w:7,  h:60 });
    addProp({ prop:'pipe',   x:9,  y:10, w:6,  h:50 });
    addProp({ prop:'ivy',    x:17, y:4,  w:9,  h:30, cls:'prop-far' });
    addProp({ prop:'ivy',    x:90, y:4,  w:10, h:40, cls:'prop-far' });
    addProp({ prop:'cables', x:70, y:6,  w:10, h:28, cls:'prop-far' });
    addProp({ prop:'crate',  x:64, y:58, w:14, h:15 });
    addProp({ prop:'barrel', x:88, y:64, w:8,  h:15 });

    // ── interactive: the evidence trail plus ordinary scenery
    addHotspot({ prop:'terminal', anim:'prop-flicker', x:31, y:40, w:13, h:26,
      label:'TERMINAL', aria:'Wartungsterminal untersuchen', fn:() => examineAct1('log') });
    addHotspot({ prop:'panel', anim:'prop-flicker', x:64, y:36, w:12, h:11,
      label:'LEITUNGSPANEEL', aria:'Leitungspaneel untersuchen', fn:() => examineAct1('repair') });
    addHotspot({ prop:'debris', x:19, y:78, w:16, h:8,
      label:'WERKZEUG', aria:'Werkzeug am Boden untersuchen', fn:() => examineAct1('tool') });
    addHotspot({ prop:'sign',  x:15, y:52, w:14, h:12,
      label:'TESTSCHILD', aria:'Testschild untersuchen', fn:() => examineAct1('sign') });
    addHotspot({ prop:'door',  x:80, y:24, w:12, h:38,
      label:'TÜR', aria:'Verschlossene Tür untersuchen', fn:() => examineAct1('door') });
    addHotspot({ prop:'decal', x:42, y:74, w:20, h:13,
      label:'BODENPLATTEN', aria:'Bodenplatten untersuchen', fn:() => examineAct1('floor') });

    if (S.corridorOpen) addCorridorHotspot();
  }

  function addCorridorHotspot() {
    addHotspot({ prop:'opening', x:46, y:24, w:14, h:30,
      label:'DUNKLER KORRIDOR', aria:'Dunklen Korridor betreten', fn:() => act2_distant() });
  }

  const ACT1_LINES = {
    log: {
      1: [
        { speaker:'SYSTEM', text:'Das Terminal ist schwarz, aber nicht tot. Auf Tastendruck zeigt es genau eine gespeicherte Zeile.' },
        { speaker:'SYSTEM', text:'WARTUNGSPROTOKOLL. LETZTER AUTOMATISCHER WARTUNGSZYKLUS: VOR 2.847 TAGEN.' },
        { speaker:'SYSTEM', text:'Seitdem hat sich hier offiziell nichts mehr bewegt.' },
      ],
      2: [
        { speaker:'SYSTEM', text:'WARTUNGSPROTOKOLL. LETZTER AUTOMATISCHER WARTUNGSZYKLUS: VOR 2.847 TAGEN.' },
        { speaker:'SYSTEM', text:'Das Wort „automatisch" steht auffällig weit vorne.' },
      ],
    },
    repair: {
      1: [
        { speaker:'SYSTEM', text:'An der Wand hängt ein geöffnetes Leitungspaneel. Zwei Kabel wurden aus ihrer Halterung genommen und neu zusammengesteckt.' },
        { speaker:'SYSTEM', text:'MANUELLE INTERVENTION ERKANNT. LEITUNG 03-B WURDE NEU VERBUNDEN.' },
        { speaker:'SYSTEM', text:'ZEITSTEMPEL: VOR 11 MINUTEN.' },
      ],
      2: [
        { speaker:'SYSTEM', text:'DIE VERBINDUNG IST IMPROVISIERT. NICHT BESONDERS ELEGANT.' },
        { speaker:'SYSTEM', text:'ABER FRISCH.' },
      ],
    },
    tool: {
      1: [
        { speaker:'SYSTEM', text:'Ein Werkzeug liegt auf dem Boden. Darauf klebt etwas, das einmal ein Namensschild gewesen sein könnte.' },
      ],
      2: [
        { speaker:'SYSTEM', text:'Die Oberfläche ist noch warm.' },
      ],
      3: [
        { speaker:'SYSTEM', text:'Immer noch warm.' },
      ],
    },
    sign: {
      1: [
        { speaker:'SYSTEM', text:'Auf einem alten Schild steht: TESTEN. MESSEN. VERBESSERN.' },
        { speaker:'SYSTEM', text:'Darunter hat jemand später etwas eingeritzt: NICHT ALLES VERBESSERT SICH.' },
      ],
    },
    door: {
      1: [
        { speaker:'SYSTEM', text:'Die Tür, durch die du gekommen bist, reagiert nicht mehr. Kein Griff. Kein Signal. Kein Rückweg.' },
        { speaker:'SYSTEM', text:'Das fühlt sich unnötig endgültig an.' },
      ],
      2: [
        { speaker:'SYSTEM', text:'Die Anlage war schon immer besser im Hineinlassen als im Herauslassen.' },
      ],
    },
    floor: {
      1: [
        { speaker:'SYSTEM', text:'Einige Bodenplatten sind verschoben. Nicht eingestürzt. Verschoben.' },
        { speaker:'SYSTEM', text:'Als wäre etwas Leichtes, aber Metallisches darübergesprungen.' },
      ],
    },
  };

  // The three pieces of evidence that carry Act 1's turn.
  const EVIDENCE = ['log', 'repair', 'tool'];

  function examineAct1(key) {
    const n = bump('a1_' + key);
    S.act1Seen[key] = n;

    const lines = pick(ACT1_LINES[key], n);
    const distinct = Object.keys(S.act1Seen).length;

    // After enough poking around, something in the next room answers.
    const shouldKlonk = !S.klonkDone && distinct >= 3;

    say(lines, () => {
      if (shouldKlonk) ambientKlonk();
    });
  }

  /** The "wait, what?" beat — no jumpscare, no explanation. */
  function ambientKlonk() {
    S.klonkDone = true;
    setTimeout(() => {
      playSound('ch1_metal_jump_01.mp3');
      tone({ freq: 92, type:'sine', dur: 0.9, vol: 0.16, glideTo: 55 });
      try { GameEngine.fx.shake('#sceneHotspots'); } catch(_) {}

      say([
        { speaker:'SYSTEM', text:'*KLONK.*' },
        { speaker:'SYSTEM', text:'Metallisches Klackern aus dem Nebenraum. Kurz. Dann nichts mehr.' },
        { speaker:'SYSTEM', text:'Es klang nicht, als wäre etwas heruntergefallen. Es klang, als hätte etwas aufgehört, sich zu bewegen.' },
      ], () => {
        S.corridorOpen = true;
        addCorridorHotspot();
      });
    }, 420);
  }

  // ═══════════════════════════════════════════════════════════════
  // ACT 2 — THE ENCOUNTER
  // ═══════════════════════════════════════════════════════════════
  function act2_distant() {
    clearHotspots();
    playSound('ch1_metal_jump_01.mp3');
    setScene('hall-robots-dist');

    say([
      { speaker:'SYSTEM', text:'Der Gang führt weiter in die Anlage. Auf einer erhöhten Plattform bewegt sich etwas.' },
      { speaker:'SYSTEM', text:'Zwei kleine Gestalten springen von einer gebrochenen Platte zur nächsten. Eine etwas größer. Eine deutlich kleiner.' },
      { speaker:'SYSTEM', text:'Nicht wie Tiere. Nicht wie Menschen. Zu präzise für Zufall. Zu verspielt für eine Maschine.' },
      { speaker:'SYSTEM', text:'Eine rote Linse blitzt auf. Dann eine grüne.' },
    ], () => {
      playSound('ch1_robot_appear_glitch.mp3');

      const wrapper = document.getElementById('sceneWrapper');
      wrapper.style.animation = 'none';
      wrapper.style.opacity = '0';
      setTimeout(() => {
        setScene('hall-robots-close');
        wrapper.style.opacity = '1';
        setTimeout(() => act2_hiii(), 300);
      }, 180);
    });
  }

  function act2_hiii() {
    say([
      { speaker:'SYSTEM',text:'Du blinzelst. Sie sind weg. Für genau eine Sekunde ist alles still.' },
      { speaker:'SYSTEM',text:'Dann hörst du direkt hinter dir ein viel zu fröhliches Geräusch.' },
      { speaker:'R-3MI', text:'„Hiii!"' },
      { speaker:'V-TGM', text:'"Hi there."', subtitle:'Hallo.' },
      { speaker:'SYSTEM',text:'Dein Körper entscheidet sich für eine sehr wissenschaftliche Reaktion: absolute Panik.' },
      { speaker:'SYSTEM',text:'MOBILE EINHEITEN ERKANNT.' },
      { speaker:'SYSTEM',text:'KLASSIFIKATION NICHT MÖGLICH.' },
    ], () => act2_reaction());
  }

  // ─── ONE genuine reaction choice. All options move forward. ────
  const REACTIONS = [
    {
      key:'who', label:'[ Wer zum Teufel seid ihr?! ]',
      lines:[
        { speaker:'R-3MI', text:'„R-3MI!"' },
        { speaker:'V-TGM', text:'"V-TGM."', subtitle:'V-TGM.' },
        { speaker:'R-3MI', text:'„Siehst du? Sehr effiziente Vorstellung."' },
        { speaker:'V-TGM', text:'"You screamed through most of it."', subtitle:'Du hast durch den größten Teil davon geschrien.' },
      ],
    },
    {
      key:'killed', label:'[ Ihr habt mich gerade fast umgebracht. ]',
      lines:[
        { speaker:'R-3MI', text:'„Aber nur fast!"' },
        { speaker:'V-TGM', text:'"That is not helping."', subtitle:'Das hilft nicht.' },
        { speaker:'R-3MI', text:'„Ich bin R-3MI. Das ist V-TGM. Und wir üben gerade Erstkontakt."' },
        { speaker:'V-TGM', text:'"Badly."', subtitle:'Schlecht.' },
      ],
    },
    {
      key:'hiii', label:'[ ...Hiii? ]',
      lines:[
        { speaker:'R-3MI', text:'„Hiii! :D"' },
        { speaker:'V-TGM', text:'"Oh no. There are two of you now."', subtitle:'Oh nein. Jetzt gibt es zwei von der Sorte.' },
        { speaker:'R-3MI', text:'„R-3MI, übrigens. Und das ist V-TGM."' },
        { speaker:'R-3MI', text:'„Sie freut sich auch. Innerlich. Sehr weit innerlich."' },
      ],
    },
    {
      key:'subject', label:'[ Seid ihr auch Testpersonen? ]',
      lines:[
        { speaker:'SYSTEM', text:'Eine kurze Pause.' },
        { speaker:'V-TGM', text:'"Something like that."', subtitle:'So etwas in der Art.' },
        { speaker:'R-3MI', text:'„R-3MI! Sehr erfreut! Wir sollten uns unbedingt über etwas anderes unterhalten."' },
        { speaker:'V-TGM', text:'"V-TGM."', subtitle:'V-TGM.' },
      ],
    },
  ];

  function act2_reaction() {
    askOnce({
      prompt: 'DEINE REAKTION:',
      hint:   'WÄHLE EINE.',
      choices: REACTIONS,
      onPick: () => act2_minimumExposition(),
    });
  }

  /** Only what the player needs to keep going. Everything else is optional. */
  function act2_minimumExposition() {
    S.metRobots = true;
    showRobots(true);

    say([
      { speaker:'R-3MI', text:'„Wir waren schon hier, als alles ausging."' },
      { speaker:'V-TGM', text:'"We\'ve been trying to keep parts of the facility operational."', subtitle:'Wir haben versucht, Teile der Anlage funktionsfähig zu halten.' },
      { speaker:'R-3MI', text:'„Betonung auf versuchen."' },
      { speaker:'SYSTEM', text:'Sie stehen einfach da. Rotes Licht. Grünes Licht. Zu freundlich für diesen Ort. Oder genau freundlich genug.' },
    ], () => act3_maintenanceHall());
  }

  // ═══════════════════════════════════════════════════════════════
  // OPTIONAL CONVERSATIONS — reward curiosity, never block progress
  // ═══════════════════════════════════════════════════════════════
  const TALK = {
    r3mi: [
      { key:'howlong', label:'[ Wie lange seid ihr schon hier? ]',
        lines:[
          { speaker:'R-3MI', text:'„Lange genug, um jede Schraube hier persönlich zu hassen."' },
        ],
        again:[
          { speaker:'R-3MI', text:'„Schraube 4-C weiß, was sie getan hat."' },
        ] },
      { key:'what', label:'[ Was ist hier passiert? ]',
        lines:[
          { speaker:'R-3MI', text:'„Anlage aus. Türen zu. Licht weg."' },
          { speaker:'R-3MI', text:'„War kein besonders guter Dienstag."' },
          { speaker:'V-TGM', text:'"It was Thursday."', subtitle:'Es war ein Donnerstag.' },
          { speaker:'R-3MI', text:'„Noch schlimmer."' },
        ] },
      { key:'you', label:'[ Was machst du hier eigentlich? ]',
        lines:[
          { speaker:'R-3MI', text:'„Ich halte Dinge am Laufen. Manchmal repariere ich sie sogar dabei."' },
          { speaker:'V-TGM', text:'"Manchmal."', subtitle:'Manchmal.' },
          { speaker:'R-3MI', text:'„Sie hat gerade Deutsch gesprochen. Das macht sie nur, wenn sie mich ärgern will."' },
        ] },
    ],
    vtgm: [
      { key:'leave', label:'[ Warum seid ihr nicht gegangen? ]',
        lines:[
          { speaker:'V-TGM', text:'"We couldn\'t."', subtitle:'Wir konnten nicht.' },
          { speaker:'SYSTEM', text:'Eine kurze Pause.' },
          { speaker:'V-TGM', text:'"Some doors remained locked after shutdown."', subtitle:'Manche Türen blieben nach der Abschaltung verriegelt.' },
        ] },
      { key:'role', label:'[ Und du? Was machst du? ]',
        lines:[
          { speaker:'V-TGM', text:'"I watch. I keep track of what changes."', subtitle:'Ich beobachte. Ich merke mir, was sich verändert.' },
          { speaker:'R-3MI', text:'„Das klingt langweiliger, als es ist."' },
          { speaker:'V-TGM', text:'"It is exactly as boring as it sounds."', subtitle:'Es ist genau so langweilig, wie es klingt.' },
        ] },
      { key:'him', label:'[ Ist er immer so? ]',
        lines:[
          { speaker:'V-TGM', text:'"Yes."', subtitle:'Ja.' },
          { speaker:'R-3MI', text:'„Ich stehe direkt daneben!"' },
          { speaker:'V-TGM', text:'"I know."', subtitle:'Ich weiß.' },
        ] },
    ],
  };

  function clickRobot(who) {
    if (!S.metRobots) return;
    const topics = TALK[who] || [];
    const choices = topics.map(t => {
      const seen = !!S.talkSeen[who + ':' + t.key];
      return {
        key: t.key,
        label: t.label,
        seen,
        lines: (seen && t.again) ? t.again : t.lines,
      };
    });

    choices.push({
      key: '__leave', label:'[ Nichts. Weiter. ]', seen:false,
      lines: [], // handled below — no dialogue, just close
    });

    askOnce({
      prompt: who === 'r3mi' ? 'R-3MI ANSPRECHEN:' : 'V-TGM ANSPRECHEN:',
      hint:   'OPTIONAL.',
      choices,
      onPick: (key) => {
        if (key === '__leave') return;
        S.talkSeen[who + ':' + key] = true;
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // ACT 3 — FIRST COLLABORATION
  // ═══════════════════════════════════════════════════════════════
  function act3_maintenanceHall() {
    setScene('room-a');
    clearHotspots();
    showRobots(true);

    say([
      { speaker:'SYSTEM', text:'Sie führen dich nicht. Sie laufen einfach los und gehen davon aus, dass du mitkommst.' },
      { speaker:'SYSTEM', text:'Der nächste Raum ist die eigentliche Wartungshalle. Hier hängen mehr Kabel als Ranken.' },
      { speaker:'R-3MI', text:'„Also. Solange du sowieso hier bist."' },
      { speaker:'V-TGM', text:'"Don\'t."', subtitle:'Lass es.' },
      { speaker:'R-3MI', text:'„Ich mache gar nichts. Ich schaue nur kurz nach der Grundversorgung."' },
    ], () => act3_r3miBreaksIt());
  }

  /** The puzzle arrives as a maintenance problem, not as "PUZZLE ONE". */
  function act3_r3miBreaksIt() {
    // Scenery only for now — the room shouldn't accept clicks during the
    // scripted beat, or a stray tap would talk over it.
    loadHallHotspots(false);

    setTimeout(() => {
      playSound('ch1_metal_jump_01.mp3');
      tone({ freq: 140, type:'square', dur: 0.12, vol: 0.13 });
      try { GameEngine.fx.shake('#sceneHotspots'); } catch(_) {}

      say([
        { speaker:'SYSTEM', text:'*KLONK*' },
        { speaker:'SYSTEM', text:'*SPARK*' },
        { speaker:'V-TGM', text:'"You made it worse."', subtitle:'Du hast es schlimmer gemacht.' },
        { speaker:'R-3MI', text:'„Ich habe den Fehlerbereich präzisiert."' },
        { speaker:'V-TGM', text:'"You broke another pipe."', subtitle:'Du hast noch ein Rohr kaputt gemacht.' },
        { speaker:'R-3MI', text:'„…den Fehlerbereich sehr präzisiert."' },
        { speaker:'SYSTEM', text:'VERIFIZIERTE TESTSIGNATUR ERKANNT.' },
        { speaker:'R-3MI', text:'„Siehst du? Qualifiziert!"' },
        { speaker:'V-TGM', text:'"That is the facility talking, not an endorsement."', subtitle:'Das ist die Anlage, keine Empfehlung.' },
        { speaker:'R-3MI', text:'„Leitung A muss nach C. Leitung B darf dabei nicht—"' },
        { speaker:'V-TGM', text:'"Don\'t explain it incorrectly."', subtitle:'Erklär es nicht falsch.' },
        { speaker:'R-3MI', text:'„Ich war bei der spannenden Version."' },
      ], () => openPuzzle1());
    }, 600);
  }

  function loadHallHotspots(interactive = true) {
    clearHotspots();
    // ── set dressing (unchanged room layout)
    addProp({ prop:'duct',    x:14, y:0,  w:52, h:7, cls:'prop-far' });
    addProp({ prop:'light',   x:40, y:4,  w:12, h:8  });
    addProp({ prop:'light',   x:8,  y:5,  w:10, h:7  });
    addProp({ prop:'column',  x:88, y:12, w:8,  h:58 });
    addProp({ prop:'cables',  x:56, y:6,  w:9,  h:26, cls:'prop-far' });
    addProp({ prop:'monitors',x:36, y:32, w:17, h:15 });
    addProp({ prop:'ivy',     x:0,  y:6,  w:9,  h:28, cls:'prop-far' });
    addProp({ prop:'crate',   x:26, y:62, w:15, h:16 });
    addProp({ prop:'railing', x:56, y:70, w:24, h:11 });
    addProp({ prop:'debris',  x:66, y:80, w:15, h:8  });
    if (!interactive) {
      // draw the clickable objects as plain scenery so the room still looks full
      addProp({ prop:'terminal', anim:'prop-flicker', x:62, y:44, w:13, h:26 });
      addProp({ prop:'door',     x:76, y:24, w:12, h:38 });
      addProp({ prop:'sign',     x:10, y:56, w:14, h:12 });
      addProp({ prop:'scratch',  x:12, y:38, w:18, h:13 });
      addProp({ prop:'barrel',   x:44, y:64, w:8,  h:15 });
      return;
    }
    // ── interactive
    addHotspot({ prop:'terminal', anim:'prop-flicker', x:62, y:44, w:13, h:26,
      label:'TERMINAL', aria:'Terminal untersuchen', fn:() => clickHall('terminal') });
    addHotspot({ prop:'door',     x:76, y:24, w:12, h:38,
      label:'INNERES TOR', aria:'Inneres Tor untersuchen', fn:() => clickHall('gate') });
    addHotspot({ prop:'sign',     x:10, y:56, w:14, h:12,
      label:'TESTSCHILD', aria:'Testschild untersuchen', fn:() => clickHall('sign') });
    addHotspot({ prop:'scratch',  x:12, y:38, w:18, h:13,
      label:'WANDKRATZER', aria:'Kratzer in der Wand untersuchen', fn:() => clickHall('scratch') });
    // deliberately pointless — clicking it is its own punchline
    addHotspot({ prop:'barrel',   x:44, y:64, w:8,  h:15,
      label:'FASS', aria:'Fass untersuchen', fn:() => clickHall('barrel') });
  }

  const HALL_LINES = {
    terminal: {
      1: [
        { speaker:'SYSTEM', text:'Der Bildschirm ist schwarz, aber nicht leblos. Eine rote LED blinkt unter dem Rahmen.' },
        { speaker:'V-TGM',  text:'"It cannot wake without routed power."', subtitle:'Es kann ohne geleitete Energie nicht starten.' },
      ],
      2: [
        { speaker:'SYSTEM', text:'Das Terminal läuft jetzt. Es sieht selbstzufrieden aus, soweit ein Terminal das kann.' },
        { speaker:'R-3MI',  text:'„Ich finde, es wirkt dankbar."' },
        { speaker:'V-TGM',  text:'"It is a terminal."', subtitle:'Es ist ein Terminal.' },
        { speaker:'R-3MI',  text:'„Terminals haben Gefühle. Schlechte meistens."' },
      ],
    },
    scratch: {
      1: [
        { speaker:'SYSTEM', text:'Eine Linie wurde in die Wand geritzt. Sie beginnt sauber, wird dann unruhiger und endet plötzlich.' },
        { speaker:'R-3MI',  text:'„Alte Kratzer. Die Anlage hat viele davon."' },
        { speaker:'V-TGM',  text:'"Some scratches are not accidental."', subtitle:'Manche Kratzer sind nicht zufällig.' },
        { speaker:'R-3MI',  text:'„Stimmt. Manche sind dekorativ."' },
      ],
    },
    sign: {
      1: [
        { speaker:'SYSTEM', text:'TESTEN. MESSEN. VERBESSERN. Du bist dir nicht sicher, ob das ein Motto oder eine Drohung ist.' },
        { speaker:'R-3MI',  text:'„Beides! Effizientes Design."' },
      ],
      2: [
        { speaker:'V-TGM',  text:'"Improve what?"', subtitle:'Was verbessern?' },
        { speaker:'R-3MI',  text:'„Die Stimmung, hoffentlich."' },
      ],
    },
    gate: {
      1: [
        { speaker:'SYSTEM', text:'Das Tor führt tiefer in die Anlage. Daneben leuchtet: GRUNDVERSORGUNG FEHLT.' },
        { speaker:'V-TGM',  text:'"Power first. Door after."', subtitle:'Erst Strom. Dann Tür.' },
        { speaker:'R-3MI',  text:'„Sie ist sehr gut darin, traurige Dinge kurz zu sagen."' },
      ],
      2: [
        { speaker:'SYSTEM', text:'Die Tür bleibt geschlossen.' },
        { speaker:'R-3MI',  text:'„Sie ignoriert uns."' },
      ],
    },
    barrel: {
      1: [
        { speaker:'SYSTEM', text:'Ein Fass. Verschlossen. Unbeschriftet. Vollkommen unauffällig.' },
        { speaker:'R-3MI',  text:'„Warum klickst du überhaupt DA drauf?!"' },
      ],
      2: [
        { speaker:'V-TGM',  text:'"Let them. It is the most harmless thing in this room."', subtitle:'Lass sie. Es ist das Harmloseste in diesem Raum.' },
        { speaker:'R-3MI',  text:'„Das stimmt sogar. Beunruhigenderweise."' },
      ],
    },
  };

  function clickHall(key) {
    const n = bump('hall_' + key);

    // "Powered" variants once the sector has electricity again.
    if (key === 'terminal' && S.p1Solved) {
      if (repeatReaction('hall_' + key, n)) return;
      say(HALL_LINES.terminal[2]);
      return;
    }
    if (key === 'gate' && S.p1Solved) {
      say([
        { speaker:'SYSTEM', text:'Das innere Tor steht jetzt einen Spalt offen. Dahinter wird die Anlage lauter.' },
        { speaker:'R-3MI',  text:'„Nach dir. Ich war schon dreimal drin."' },
      ], () => act3_toNode());
      return;
    }

    if (repeatReaction('hall_' + key, n)) return;
    const bucket = HALL_LINES[key];
    if (bucket) say(pick(bucket, n));
  }

  /** §20 — examining the same thing too often gets noticed. */
  function repeatReaction(key, n) {
    if (n < 4 || !S.metRobots) return false;
    if (S.clicks['react_' + key]) return false;
    S.clicks['react_' + key] = 1;
    say([
      { speaker:'V-TGM', text:'"It has not changed."', subtitle:'Es hat sich nicht verändert.' },
      { speaker:'R-3MI', text:'„Noch nicht."' },
      { speaker:'V-TGM', text:'"R-3MI."', subtitle:'R-3MI.' },
      { speaker:'R-3MI', text:'„Was? Ich bleibe optimistisch."' },
    ]);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPE ENGINE (shared by both repairs)
  // Direction sets per tile type and rotation. A grid is "connected"
  // when a flood-fill from the source reaches the target — the answer
  // is never stored anywhere.
  // ═══════════════════════════════════════════════════════════════
  const CONN = {
    0: [[], [], [], []],
    1: [['N','S'],['E','W'],['N','S'],['E','W']],
    2: [['N','E'],['E','S'],['S','W'],['W','N']],
    3: [['N','E','S'],['E','S','W'],['S','W','N'],['W','N','E']],
    4: [['N','E','S','W'],['N','E','S','W'],['N','E','S','W'],['N','E','S','W']],
  };

  function bfsReach(grid, sr, sc) {
    const ROWS = grid.length, COLS = grid[0].length;
    const visited = new Set();
    const queue = [[sr, sc]];
    const OPP = { N:'S', S:'N', E:'W', W:'E' };
    const DR  = { N:-1, S:1, E:0, W:0 };
    const DC  = { N:0,  S:0, E:1, W:-1 };

    while (queue.length) {
      const [r, c] = queue.shift();
      const key = `${r},${c}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const dirs = CONN[grid[r][c].type][grid[r][c].rot];
      dirs.forEach(d => {
        const nr = r + DR[d], nc = c + DC[d];
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
        const nDirs = CONN[grid[nr][nc].type][grid[nr][nc].rot];
        if (nDirs.includes(OPP[d])) queue.push([nr, nc]);
      });
    }
    return visited;
  }

  /**
   * Build a scrambled grid. `baseRot` is only the orientation the scrambler
   * offsets from, so every tile is guaranteed reachable by rotation; it is
   * never used to decide whether the player has finished.
   */
  function buildGrid(types, baseRot, fixed) {
    return types.map((row, r) => row.map((type, c) => {
      const isFixed = !!fixed[r][c];
      const base    = baseRot[r][c];
      return {
        type,
        rot: isFixed ? base : (base + 1 + Math.floor(Math.random() * 2)) % 4,
        fixed: isFixed,
      };
    }));
  }

  /** Scramble again if we happened to hand the player a finished grid. */
  function scramble(types, baseRot, fixed, isDone) {
    let grid, guard = 0;
    do { grid = buildGrid(types, baseRot, fixed); } while (isDone(grid) && ++guard < 40);
    return grid;
  }

  function renderGrid(gridEl, grid, decorate, onRotate) {
    gridEl.innerHTML = '';
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        const tile = document.createElement('div');
        tile.className = 'pipe-tile';
        if (cell.fixed) tile.classList.add('fixed');

        decorate(tile, r, c);

        const dirs = CONN[cell.type][cell.rot];
        if (dirs.length) {
          const center = document.createElement('div');
          center.className = 'pipe-center'; tile.appendChild(center);
          dirs.forEach(d => {
            const arm = document.createElement('div');
            arm.className = `pipe-arm arm-${d.toLowerCase()}`;
            tile.appendChild(arm);
          });
        }
        if (!cell.fixed) tile.addEventListener('click', () => onRotate(r, c));
        gridEl.appendChild(tile);
      }
    }
  }

  function spinTile(gridEl, idx) {
    const tile = gridEl.children[idx];
    if (!tile) return;
    tile.classList.add('rotating');
    setTimeout(() => tile.classList.remove('rotating'), 160);
  }

  // ═══════════════════════════════════════════════════════════════
  // REPAIR 1 — route power back to the terminal
  // ═══════════════════════════════════════════════════════════════
  const P1_TYPES = [
    [4, 1, 2, 1],
    [0, 0, 1, 0],
    [1, 1, 2, 2],
    [0, 0, 0, 4],
  ];
  const P1_BASE_ROT = [
    [0, 1, 2, 1],
    [0, 0, 0, 0],
    [1, 1, 0, 2],
    [0, 0, 0, 0],
  ];
  const P1_FIXED = [
    [1, 0, 0, 0],
    [1, 1, 0, 1],
    [0, 0, 0, 0],
    [1, 1, 1, 1],
  ];
  const P1_SRC = [0, 0];
  const P1_DST = '3,3';

  let p1Grid = [];

  const p1Done = g => bfsReach(g, P1_SRC[0], P1_SRC[1]).has(P1_DST);

  function initP1Grid() {
    p1Grid = scramble(P1_TYPES, P1_BASE_ROT, P1_FIXED, p1Done);
  }

  function renderP1() {
    const gridEl  = document.getElementById('puzzle1Grid');
    const reached = bfsReach(p1Grid, P1_SRC[0], P1_SRC[1]);
    renderGrid(gridEl, p1Grid, (tile, r, c) => {
      const key = `${r},${c}`;
      const isSource   = r === P1_SRC[0] && c === P1_SRC[1];
      const isTerminal = key === P1_DST;
      if (isSource)   tile.classList.add('source-w');
      if (isTerminal) tile.classList.add('terminal');
      if (reached.has(key) && !isSource) tile.classList.add('conn');
    }, rotateP1Tile);
  }

  function rotateP1Tile(r, c) {
    if (S.p1Solved) return;
    p1Grid[r][c].rot = (p1Grid[r][c].rot + 1) % 4;
    S.rotations.p1++;
    spinTile(document.getElementById('puzzle1Grid'), r * 4 + c);
    renderP1();
    checkP1();
  }

  function checkP1() {
    const status = document.getElementById('puzzle1Status');
    if (p1Done(p1Grid)) {
      status.textContent = 'VERBINDUNG HERGESTELLT.';
      status.className   = 'puzzle-status sys-text ok';
      S.p1Solved = true;
      const fast = S.rotations.p1 <= 8;
      setTimeout(() => solvePuzzle1(fast), 700);
    } else {
      status.textContent = 'LEITUNG UNTERBROCHEN.';
      status.className   = 'puzzle-status sys-text';
      reactP1();
    }
  }

  /** §13 — occasional, surprising, never spam. Each beat fires once. */
  function reactP1() {
    const n = S.rotations.p1;
    if (n === 4 && !S.react.p1.first) {
      S.react.p1.first = true;
      say([{ speaker:'R-3MI', text:'„Das sah absichtlich aus."' }]);
    } else if (n === 14 && !S.react.p1.stuck) {
      S.react.p1.stuck = true;
      say([
        { speaker:'V-TGM', text:'"Ignore him. Look at where the pressure actually has to go."', subtitle:'Ignorier ihn. Schau, wo der Druck tatsächlich hin muss.' },
      ]);
    }
  }

  function openPuzzle1() {
    S.hints.active = 'p1';
    S.hints.step   = 0;
    updateHintBar();
    initP1Grid();
    renderP1();
    checkP1();
    document.getElementById('puzzle1Modal').classList.remove('hidden');
    document.getElementById('hintBar').classList.remove('hidden');
  }

  function resetPuzzle1() {
    if (S.p1Solved) return;
    initP1Grid(); renderP1(); checkP1();
  }

  function solvePuzzle1(fast) {
    renderP1();
    document.getElementById('puzzle1Modal').classList.add('hidden');
    document.getElementById('hintBar').classList.add('hidden');
    playSound('ch1_terminal_power_on.mp3');
    try { GameEngine.fx.flash('rgba(46,207,98,0.22)'); } catch(_) {}
    setProgress(5);
    S.sectorAwake = true;

    const intro = fast
      ? [
          { speaker:'R-3MI', text:'„...okay."' },
          { speaker:'SYSTEM',text:'Kurze Pause.' },
          { speaker:'R-3MI', text:'„Ich wollte das genauso machen."' },
          { speaker:'V-TGM', text:'"No you didn\'t."', subtitle:'Nein, wolltest du nicht.' },
          { speaker:'R-3MI', text:'„Ich hatte dafür eine ganze Erklärung vorbereitet."' },
        ]
      : [
          { speaker:'R-3MI', text:'„Siehst du? Kaum gefährlich."' },
          { speaker:'V-TGM', text:'"That was stable enough."', subtitle:'Das war stabil genug.' },
          { speaker:'R-3MI', text:'„Stabil genug ist hier praktisch Luxus."' },
        ];

    say([
      { speaker:'SYSTEM', text:'GRUNDVERSORGUNG HERGESTELLT. TERMINAL 01 AKTIV.' },
      { speaker:'SYSTEM', text:'Ein dünnes Licht läuft durch die Wandlinien. Erst rot. Dann grün. Die Halle atmet elektrisch ein.' },
      ...intro,
      { speaker:'SYSTEM', text:'PERSONENREGISTER: 3 AKTIVE SIGNATUREN.' },
      { speaker:'R-3MI',  text:'„Drei! Das ist die höchste Zahl seit Jahren."' },
      { speaker:'V-TGM',  text:'"It is also the smallest number that counts as a group."', subtitle:'Es ist auch die kleinste Zahl, die als Gruppe zählt.' },
      { speaker:'SYSTEM', text:'ZUGANG ZUM WARTUNGSKNOTEN FREIGEGEBEN.' },
      { speaker:'SYSTEM', text:'Das innere Tor entriegelt sich. Es hat keine Eile.' },
    ], () => {
      // §15 — let the room breathe. The player leaves when they want to.
      loadHallHotspots();
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // WARTUNGSKNOTEN
  // ═══════════════════════════════════════════════════════════════
  function act3_toNode() {
    setScene('corridor-ab');
    clearHotspots();

    say([
      { speaker:'SYSTEM', text:'Das innere Tor öffnet sich nur halb. R-3MI schlüpft sofort darunter hindurch.' },
      { speaker:'V-TGM', text:'"After you."', subtitle:'Nach dir.' },
      { speaker:'R-3MI', text:'„Nicht nach mir, ich bin schon hier!"' },
      { speaker:'V-TGM', text:'"Obviously."', subtitle:'Offensichtlich.' },
      { speaker:'SYSTEM', text:'Du duckst dich unter dem Tor hindurch. Dahinter wird die Anlage lauter.' },
    ], () => scene_node());
  }

  function scene_node() {
    setScene('room-b');
    clearHotspots();

    say([
      { speaker:'SYSTEM', text:'Der Wartungsknoten liegt tiefer in der Anlage. Weniger Grün. Weniger Natur. Dafür mehr Maschine.' },
      { speaker:'SYSTEM', text:'Kabel laufen in geordneten Bahnen durch die Wände. Einige leuchten schwach. Andere zucken, als würden sie träumen.' },
      { speaker:'R-3MI',  text:'„Willkommen im Wartungsknoten. Nicht schön, aber wichtig."' },
      { speaker:'V-TGM',  text:'"This room decides what can speak to what."', subtitle:'Dieser Raum entscheidet, was mit was sprechen darf.' },
      // §16 — they hang back this time. The player gets to look first.
      { speaker:'R-3MI',  text:'„Wir sagen diesmal nichts. Schau dich in Ruhe um."' },
      { speaker:'V-TGM',  text:'"He will last about forty seconds."', subtitle:'Er hält ungefähr vierzig Sekunden durch.' },
    ], () => loadNodeHotspots());
  }

  function loadNodeHotspots() {
    clearHotspots();
    // ── set dressing (unchanged room layout)
    addProp({ prop:'duct',    x:16, y:0,  w:52, h:7, cls:'prop-far' });
    addProp({ prop:'light',   x:42, y:4,  w:12, h:8  });
    addProp({ prop:'monitors',x:20, y:20, w:18, h:16 });
    addProp({ prop:'cables',  x:74, y:6,  w:9,  h:24, cls:'prop-far' });
    addProp({ prop:'column',  x:0,  y:10, w:7,  h:62 });
    addProp({ prop:'column',  x:93, y:10, w:7,  h:62 });
    addProp({ prop:'railing', x:22, y:66, w:26, h:12 });
    addProp({ prop:'barrel',  x:64, y:62, w:8,  h:15 });
    addProp({ prop:'debris',  x:48, y:82, w:15, h:8  });
    // ── interactive. The two conduits are the units' own signal lines:
    //    R-3MI's runs green, V-TGM's runs red (canonical unit colours).
    addHotspot({ prop:'console', x:39, y:44, w:22, h:23,
      label:'ZENTRALE KONSOLE', aria:'Zentrale Konsole untersuchen', fn:() => clickNode('console') });
    addHotspot({ prop:'pipe', cls:'prop-red',   x:9,  y:24, w:9, h:46,
      label:'ROTE LEITUNG', aria:'Rote Leitung untersuchen', fn:() => clickNode('red') });
    addHotspot({ prop:'pipe', cls:'prop-green', x:83, y:24, w:9, h:46,
      label:'GRÜNE LEITUNG', aria:'Grüne Leitung untersuchen', fn:() => clickNode('green') });
    addHotspot({ prop:'door',    x:62, y:12, w:13, h:32,
      label:'SEKTOR-02-TÜR', aria:'Tür zu Sektor 02 untersuchen', fn:() => clickNode('door') });
    addHotspot({ prop:'vent',    x:82, y:74, w:12, h:12,
      label:'LÜFTUNGSSCHACHT', aria:'Lüftungsschacht untersuchen', fn:() => clickNode('vent') });
    addHotspot({ prop:'poster',  x:24, y:38, w:12, h:22,
      label:'ALTES POSTER', aria:'Altes Poster untersuchen', fn:() => clickNode('poster') });
  }

  const NODE_LINES = {
    console: {
      1: [
        { speaker:'SYSTEM', text:'Die zentrale Konsole ist aktiv, aber gesperrt. Auf dem Bildschirm steht: HILFSPROTOKOLL NICHT KALIBRIERT.' },
        { speaker:'SYSTEM', text:'Zwei Signalwege laufen hier zusammen. Beide müssen getrennt und sauber ankommen.' },
      ],
    },
    red: {
      1: [
        { speaker:'SYSTEM', text:'Eine rote Leitung läuft vom Boden bis zur Konsole. Sie pulsiert in einem unruhigen Rhythmus.' },
        { speaker:'V-TGM',  text:'"That one is mine."', subtitle:'Die gehört mir.' },
        { speaker:'R-3MI',  text:'„Sie pulsiert völlig undiszipliniert. Das passt überhaupt nicht zu dir."' },
        { speaker:'V-TGM',  text:'"I know. It is the one thing about me that panics."', subtitle:'Ich weiß. Sie ist das Einzige an mir, das in Panik gerät.' },
      ],
    },
    green: {
      1: [
        { speaker:'SYSTEM', text:'Eine grüne Leitung führt sauber an der Wand entlang. Im Vergleich zur roten wirkt sie fast höflich.' },
        { speaker:'R-3MI',  text:'„Und die hier ist meine. Ordentlich. Höflich. Vorbildlich."' },
        { speaker:'V-TGM',  text:'"It is the calmest thing about you."', subtitle:'Sie ist das Ruhigste an dir.' },
        { speaker:'R-3MI',  text:'„Das nehme ich als Kompliment."' },
      ],
    },
    poster: {
      1: [
        { speaker:'SYSTEM', text:'Auf einem alten Poster steht: HINWEISE SIND HILFE, KEINE LÖSUNGEN. Darunter: DENK SELBST. ABER NICHT ALLEIN.' },
        { speaker:'R-3MI',  text:'„Das ist überraschend nett für ein Poster aus dieser Anlage."' },
        { speaker:'V-TGM',  text:'"It is also an instruction."', subtitle:'Es ist auch eine Anweisung.' },
      ],
    },
    door: {
      1: [
        { speaker:'SYSTEM', text:'Die Tür ist deutlich stabiler als die erste. Daneben: SEKTOR 02 — WARTUNGSGARTEN. ZUGANG NACH HILFSPROTOKOLL-KALIBRIERUNG.' },
        { speaker:'R-3MI',  text:'„Wartungsgarten. Oh. Sie wird sich freuen."' },
        { speaker:'V-TGM',  text:'"She?"', subtitle:'Sie?' },
        { speaker:'R-3MI',  text:'„Niemand. Nichts. Ein völlig normaler Garten ohne Persönlichkeit."' },
        { speaker:'R-3MI',  text:'„Weiter!"' },
      ],
      2: [
        { speaker:'SYSTEM', text:'Die Tür bleibt verschlossen.' },
      ],
    },
    vent: {
      1: [
        { speaker:'SYSTEM', text:'Ein kleiner Lüftungsschacht sitzt tief in der Wand. Er ist zu eng für dich.' },
        { speaker:'R-3MI',  text:'„Da passt niemand rein."' },
        { speaker:'V-TGM',  text:'"Not now."', subtitle:'Jetzt nicht.' },
        { speaker:'R-3MI',  text:'„Genau. Nicht jetzt. Sehr normale Formulierung."' },
      ],
      2: [
        { speaker:'SYSTEM', text:'Der Schacht bleibt dunkel.' },
        { speaker:'V-TGM',  text:'"Something moved."', subtitle:'Etwas hat sich bewegt.' },
        { speaker:'R-3MI',  text:'„Staub. Staub bewegt sich. Sehr lebendiger Staub."' },
      ],
    },
  };

  function clickNode(key) {
    const n = bump('node_' + key);

    if (key === 'console' && !S.p2Solved) {
      say(NODE_LINES.console[1], () => openPuzzle2());
      return;
    }
    if (key === 'door' && S.p2Solved) { finishChapter(); return; }

    if (repeatReaction('node_' + key, n)) return;
    const bucket = NODE_LINES[key];
    if (bucket) say(pick(bucket, n));
  }

  // ═══════════════════════════════════════════════════════════════
  // REPAIR 2 — two signal paths that must not touch
  // ═══════════════════════════════════════════════════════════════
  const P2_TYPES = [
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [2, 2, 2, 2],
    [0, 1, 1, 0],
  ];
  const P2_BASE_ROT = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 2, 1, 3],
    [0, 0, 0, 0],
  ];
  const P2_FIXED = [
    [1, 0, 0, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 1, 1, 0],
  ];

  // "A" is R-3MI's line (renders green), "B" is V-TGM's (renders red).
  const P2_SRC_A = [0, 0], P2_DST_A = '3,1';
  const P2_SRC_B = [0, 3], P2_DST_B = '3,2';

  let p2Grid = [];

  function p2Evaluate(g) {
    const a = bfsReach(g, P2_SRC_A[0], P2_SRC_A[1]);
    const b = bfsReach(g, P2_SRC_B[0], P2_SRC_B[1]);
    const bridged = [...a].some(t => b.has(t)) || a.has(P2_DST_B) || b.has(P2_DST_A);
    return { a, b, bridged, okA: a.has(P2_DST_A), okB: b.has(P2_DST_B) };
  }
  const p2Done = g => { const e = p2Evaluate(g); return e.okA && e.okB && !e.bridged; };

  function initP2Grid() {
    p2Grid = scramble(P2_TYPES, P2_BASE_ROT, P2_FIXED, p2Done);
  }

  function renderP2() {
    const gridEl = document.getElementById('puzzle2Grid');
    const { a, b } = p2Evaluate(p2Grid);
    renderGrid(gridEl, p2Grid, (tile, r, c) => {
      const key = `${r},${c}`;
      if      (key === `${P2_SRC_A[0]},${P2_SRC_A[1]}`) tile.classList.add('source-w');
      else if (key === `${P2_SRC_B[0]},${P2_SRC_B[1]}`) tile.classList.add('source-g2');
      else if (key === P2_DST_A) tile.classList.add('terminal2r');
      else if (key === P2_DST_B) tile.classList.add('terminal2g');
      else if (a.has(key))       tile.classList.add('conn-r');
      else if (b.has(key))       tile.classList.add('conn-g');
    }, rotateP2Tile);
  }

  function rotateP2Tile(r, c) {
    if (S.p2Solved) return;
    p2Grid[r][c].rot = (p2Grid[r][c].rot + 1) % 4;
    S.rotations.p2++;
    spinTile(document.getElementById('puzzle2Grid'), r * 4 + c);
    renderP2();
    checkP2();
  }

  function checkP2() {
    const status = document.getElementById('puzzle2Status');
    const { bridged, okA, okB } = p2Evaluate(p2Grid);

    if (bridged) {
      status.textContent = 'SIGNALE INTERFERIEREN — PFADE MÜSSEN GETRENNT BLEIBEN.';
      status.className   = 'puzzle-status sys-text error';
      reactP2();
      return;
    }
    if (okA && okB) {
      status.textContent = 'BEIDE SIGNALE VERBUNDEN.';
      status.className   = 'puzzle-status sys-text ok';
      S.p2Solved = true;
      setTimeout(() => solvePuzzle2(), 700);
      return;
    }
    if (okA)      status.textContent = 'R-3MI-SIGNAL: AKTIV. V-TGM-SIGNAL: UNTERBROCHEN.';
    else if (okB) status.textContent = 'V-TGM-SIGNAL: AKTIV. R-3MI-SIGNAL: UNTERBROCHEN.';
    else          status.textContent = 'BEIDE SIGNALE INAKTIV.';
    status.className = 'puzzle-status sys-text';
    reactP2();
  }

  /** §16 — in the second repair they only speak up after the player acts. */
  function reactP2() {
    const n = S.rotations.p2;
    if (n === 10 && !S.react.p2.first) {
      S.react.p2.first = true;
      say([
        { speaker:'R-3MI', text:'„Ich sage nichts. Ich habe versprochen, nichts zu sagen."' },
        { speaker:'V-TGM', text:'"You are saying it out loud."', subtitle:'Du sagst es gerade laut.' },
      ]);
    } else if (n === 22 && !S.react.p2.stuck) {
      S.react.p2.stuck = true;
      say([
        { speaker:'V-TGM', text:'"Two signals. One of them has fewer options than the other."', subtitle:'Zwei Signale. Eines davon hat weniger Möglichkeiten als das andere.' },
      ]);
    }
  }

  function openPuzzle2() {
    S.hints.active = 'p2';
    S.hints.step   = 0;
    updateHintBar();
    initP2Grid();
    renderP2();
    checkP2();
    document.getElementById('puzzle2Modal').classList.remove('hidden');
    document.getElementById('hintBar').classList.remove('hidden');
  }

  function resetPuzzle2() {
    if (S.p2Solved) return;
    initP2Grid(); renderP2(); checkP2();
  }

  function solvePuzzle2() {
    renderP2();
    document.getElementById('puzzle2Modal').classList.add('hidden');
    document.getElementById('hintBar').classList.add('hidden');
    playSound('ch1_terminal_power_on.mp3');
    try { GameEngine.fx.flash('rgba(46,207,98,0.24)'); } catch(_) {}
    setProgress(12);

    // Persist before any navigation is possible.
    GameEngine.state.markChapterComplete('ch1');
    GameEngine.achievements.unlock('ch1_complete');

    say([
      { speaker:'SYSTEM', text:'HILFSPROTOKOLL KALIBRIERT. BETREUUNGSEINHEITEN AKTIV.' },
      { speaker:'SYSTEM', text:'WARTUNGSSEKTOR REAKTIVIERT.' },
      { speaker:'SYSTEM', text:'KALIBRIERUNGSDATEN GESPEICHERT.' },
      { speaker:'R-3MI',  text:'„Ha!"' },
      { speaker:'V-TGM',  text:'"You did literally none of that."', subtitle:'Du hast daran buchstäblich nichts gemacht.' },
      { speaker:'R-3MI',  text:'„Moralische Unterstützung."' },
      { speaker:'SYSTEM', text:'REAKTIVIERUNG: 12 %' },
      { speaker:'R-3MI',  text:'„Zwölf Prozent! Das ist mehr als zehn."' },
      { speaker:'V-TGM',  text:'"That is how numbers work."', subtitle:'So funktionieren Zahlen.' },
      { speaker:'R-3MI',  text:'„Und trotzdem sagst du es so, als wäre es eine Kritik."' },
      { speaker:'SYSTEM', text:'SEKTOR 02 FREIGEGEBEN.' },
    ], () => act3_theyComeAlong());
  }

  // ═══════════════════════════════════════════════════════════════
  // ENDING — they decide to come along
  // ═══════════════════════════════════════════════════════════════
  function act3_theyComeAlong() {
    setScene('room-b');
    clearHotspots();
    playSound('ch1_gate_unlock.mp3');

    say([
      { speaker:'SYSTEM', text:'Die Tür zum nächsten Sektor öffnet sich. Dahinter ist die Luft wärmer. Feuchter. Etwas tropft. Etwas raschelt.' },
      { speaker:'SYSTEM', text:'Und irgendwo in der Tiefe macht etwas ein Geräusch, das verdächtig nach einem mechanischen Quaken klingt.' },
      { speaker:'R-3MI',  text:'„Oh nein."' },
      { speaker:'V-TGM',  text:'"What?"', subtitle:'Was?' },
      { speaker:'R-3MI',  text:'„Nichts."' },
      { speaker:'R-3MI',  text:'„Okay. Nicht nichts."' },
      { speaker:'R-3MI',  text:'„Du gehst weiter?"' },
    ], () => {
      askOnce({
        prompt: 'DEINE ANTWORT:',
        hint:   'WÄHLE EINE.',
        choices: [
          { key:'ofcourse', label:'[ Natürlich. ]', lines:[
            { speaker:'R-3MI', text:'„Natürlich. Er sagt das, als wäre es offensichtlich."' },
          ] },
          { key:'know', label:'[ Ich will wissen, was hier passiert ist. ]', lines:[
            { speaker:'V-TGM', text:'"That is a better reason than most."', subtitle:'Das ist ein besserer Grund als die meisten.' },
          ] },
          { key:'peek', label:'[ Eigentlich wollte ich nur kurz reinschauen... ]', lines:[
            { speaker:'R-3MI', text:'„Das sagen sie alle. Und dann stehen sie zwölf Prozent später immer noch hier."' },
          ] },
        ],
        onPick: () => {
          say([
            { speaker:'V-TGM', text:'"Then we\'re coming with you."', subtitle:'Dann kommen wir mit.' },
            { speaker:'R-3MI', text:'„Ja."' },
            { speaker:'SYSTEM',text:'Kurze Pause.' },
            { speaker:'R-3MI', text:'„Du weißt nämlich offensichtlich, wie man Türen öffnet."' },
            { speaker:'V-TGM', text:'"And we very obviously do not."', subtitle:'Und wir offensichtlich nicht.' },
          ], () => {
            clearHotspots();
            addHotspot({ prop:'door', x:42, y:16, w:16, h:54,
              label:'SEKTOR 02 BETRETEN', aria:'Sektor 02 betreten', fn:finishChapter });
          });
        },
      });
    });
  }

  function finishChapter() {
    // Already persisted at solvePuzzle2; safe to repeat (both are idempotent).
    GameEngine.state.markChapterComplete('ch1');
    GameEngine.achievements.unlock('ch1_complete');
    try { GameEngine.audio.fanfare(); } catch(_) {}
    document.getElementById('chapterComplete').classList.remove('hidden');
    document.getElementById('ccProgress').textContent =
      `FORTSCHRITT: ${GameEngine.state.get('chaptersCompleted').length} / 9 KAPITEL`;
    setTimeout(() => document.getElementById('ccEnter')?.focus(), 700);
  }

  // ═══════════════════════════════════════════════════════════════
  // HINTS — one 3-step ladder per repair.
  // Step 1 points at something, step 2 names a relationship,
  // step 3 describes a method. None of them state an answer.
  // ═══════════════════════════════════════════════════════════════
  const HINTS = {
    p1: {
      r3mi: [
        '„Schau erst mal, welche Teile du überhaupt drehen kannst. Die festen sind nicht dein Problem — die sind dein Gerüst."',
        '„Ein Rohr zählt nur, wenn beide offenen Enden auf ein anderes offenes Ende treffen. Alles andere ist Dekoration."',
        '„Fang an der Quelle an und arbeite dich vor. Wenn ein Weg in eine Sackgasse läuft, war die letzte Drehung schuld — nicht die erste."',
      ],
      vtgm: [
        { t:'"Notice which tiles are fixed. They are not obstacles. They are the frame."',
          s:'Achte darauf, welche Felder fest sind. Sie sind keine Hindernisse. Sie sind der Rahmen.' },
        { t:'"A connection exists only where two open ends meet. Follow the line outward from the source, one tile at a time."',
          s:'Eine Verbindung entsteht nur dort, wo zwei offene Enden aufeinandertreffen. Folge der Linie von der Quelle aus, Feld für Feld.' },
        { t:'"When a branch dead-ends, step back one tile and rotate that one instead of starting over."',
          s:'Wenn ein Zweig in eine Sackgasse läuft, geh ein Feld zurück und dreh dieses — statt neu anzufangen.' },
      ],
    },
    p2: {
      r3mi: [
        '„Zwei Signale. Zwei Ziele. Und genau eine Reihe in der Mitte, die beide gerne hätten."',
        '„Wenn sich die beiden Wege auch nur ein einziges Feld teilen, zählt das schon als Streit."',
        '„Leg den engeren Weg zuerst. Der andere hat mehr Platz zum Ausweichen."',
      ],
      vtgm: [
        { t:'"There are two sources and two terminals. Only the middle row is contested."',
          s:'Es gibt zwei Quellen und zwei Ziele. Nur die mittlere Reihe ist umkämpft.' },
        { t:'"The paths may not share a single tile. If one signal can reach the other\'s terminal, they are already bridged."',
          s:'Die Pfade dürfen sich kein einziges Feld teilen. Wenn ein Signal das Ziel des anderen erreichen kann, sind sie bereits verbunden.' },
        { t:'"Commit the more constrained path first, then route the second one around it."',
          s:'Leg den stärker eingeschränkten Pfad zuerst fest und führe den zweiten dann darum herum.' },
      ],
    },
  };

  function useHint(who) {
    const set = HINTS[S.hints.active];
    if (!set) return;

    if (S.hints.step >= HINT_MAX) {
      say([ who === 'r3mi'
        ? { speaker:'R-3MI', text:'„Mehr darf ich nicht sagen. Also, ich könnte. Aber dann würde das System mich vermutlich anschreien."' }
        : { speaker:'V-TGM', text:'"You have enough."', subtitle:'Du hast genug.' } ]);
      return;
    }

    const idx = S.hints.step;
    S.hints.step++;
    updateHintBar();

    if (who === 'r3mi') {
      say([{ speaker:'R-3MI', text: set.r3mi[idx] }]);
    } else {
      const h = set.vtgm[idx];
      say([{ speaker:'V-TGM', text: h.t, subtitle: h.s }]);
    }
  }

  function updateHintBar() {
    const left = Math.max(0, HINT_MAX - S.hints.step);
    document.getElementById('hintCount').textContent = `HINWEISE: ${left} VERFÜGBAR`;
    const done = left <= 0;
    document.getElementById('hintBtnR3MI').disabled = done;
    document.getElementById('hintBtnVTGM').disabled = done;
  }

  // ═══════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════
  function init() {
    // Progression guard: the maintenance sector is only reachable once the
    // entrance has actually been opened.
    if (!GameEngine.state.isChapterComplete('ch0')) {
      location.replace('../chapter0/chapter0.html');
      return;
    }
    setProgress(0);
    showTitleCard();
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════
  return {
    init,
    clickRobot,
    useHint,
    resetPuzzle1() { resetPuzzle1(); },
    resetPuzzle2() { resetPuzzle2(); },
  };

})();

document.addEventListener('DOMContentLoaded', () => Chapter1.init());
