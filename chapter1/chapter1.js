/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 01 — DIE WARTUNGSEINHEITEN
 * Full implementation: scenes, dialogue, choices, 2 pipe puzzles,
 * hint system, all hotspot interactions.
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter1 = (() => {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const S = {
    choice1Seen:  { who: false, what: false, why: false },
    choice2Seen:  { why: false, do: false, get: false },
    roomA: { r3mi:0, vtgm:0, terminal:0, scratch:0, sign:0, gate:0 },
    roomB: { console:0, red:0, green:0, poster:0, door:0, vent:0 },
    p1Solved: false,
    p2Solved: false,
    // DIFFICULTY TARGET: chapter ~4.5/10 (P1 pipe ~4, P2 dual-signal ~5).
    // 4 hints total (2 per unit) — was 6; the cut is the main difficulty lever.
    hints: { r3mi:2, vtgm:2, active: null /* 'p1'|'p2' */ },
  };

  // ═══════════════════════════════════════════════════════════════
  // SCENE HELPERS
  // ═══════════════════════════════════════════════════════════════
  function setScene(key) {
    // Rooms are code-drawn now — just switch the lighting/atmosphere key.
    const ph = document.getElementById('scenePh');
    if (ph) ph.dataset.scene = key;
  }

  function clearHotspots() {
    document.getElementById('sceneHotspots').innerHTML = '';
  }

  function addHotspot(cfg) {
    // A code-drawn prop you can click directly (no images).
    if (cfg.prop && window.GameEngine && GameEngine.props) {
      const p = GameEngine.props.el(cfg.prop, { x:cfg.x, y:cfg.y, w:cfg.w, h:cfg.h, label:cfg.label, onClick:cfg.fn, cls:cfg.cls, anim:cfg.anim });
      document.getElementById('sceneHotspots').appendChild(p);
      return p;
    }
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
  // Decorative (non-interactive) code-drawn scenery.
  function addProp(cfg) {
    if (!(window.GameEngine && GameEngine.props)) return;
    document.getElementById('sceneHotspots').appendChild(
      GameEngine.props.el(cfg.prop, { x:cfg.x, y:cfg.y, w:cfg.w, h:cfg.h, cls:cfg.cls, anim:cfg.anim }));
  }

  function addAdvance(fn) {
    const el = document.createElement('button');
    el.className = 'advance-hs';
    el.setAttribute('aria-label', 'Weiter');
    el.addEventListener('click', fn);
    document.getElementById('sceneHotspots').appendChild(el);
    return el;
  }

  function showRobots(v) {
    document.getElementById('robotIcons').classList.toggle('hidden', !v);
  }

  function playSound(src) { try { GameEngine.audio.sfx(src); } catch(_) {} }

  function setProgress(pct) {
    const el = document.getElementById('reactProgress');
    if (el) el.textContent = `REAKTIVIERUNG: ${pct}%`;
  }

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
        btn.classList.add('seen');
        hideChoices();
        GameEngine.dialogue.load(c.lines, () => {
          if (cfg.onAfterChoice) cfg.onAfterChoice(c.key, cfg);
        });
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

  // ═══════════════════════════════════════════════════════════════
  // SCENE 0 — CHAPTER TITLE CARD
  // ═══════════════════════════════════════════════════════════════
  function showTitleCard() {
    const card = document.getElementById('titleCard');
    card.classList.remove('fading');
    setTimeout(() => {
      card.classList.add('fading');
      setTimeout(() => {
        card.style.display = 'none';
        scene_1_1_hallEmpty();
      }, 700);
    }, 2800);
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 1.1 — FIRST HALL (before encounter)
  // ═══════════════════════════════════════════════════════════════
  function scene_1_1_hallEmpty() {
    setScene('hall-empty', 'cg/ch1_hall_empty.png');
    clearHotspots();
    showRobots(false);

    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'Die Tür hinter dir ist geschlossen.' },
      { speaker:'SYSTEM', text:'Vor dir liegt die erste Halle der Anlage.' },
      { speaker:'SYSTEM', text:'Innen ist es noch stiller als draußen. Nicht friedlicher. Nur kontrollierter.' },
      { speaker:'SYSTEM', text:'Die Wände sind überwuchert, aber nicht vollständig zerstört. Unter den Ranken erkennst du alte Pfeile, Testnummern und verblasste Warnsymbole.' },
      { speaker:'SYSTEM', text:'Die Kalibrierungsanlage wirkt nicht verlassen. Sie wirkt angehalten.' },
    ], () => loadHall1Hotspots());
  }

  const hall1Clicks = { door:0, floor:0, sign:0, terminal:0, corridor:0 };

  function loadHall1Hotspots() {
    clearHotspots();
    // ── set dressing: ceiling → walls → floor, so the hall reads as a real room
    addProp({ prop:'duct',   x:10, y:0,  w:56, h:7, cls:'prop-far' });
    addProp({ prop:'light',  x:26, y:4,  w:11, h:8  });
    addProp({ prop:'light',  x:58, y:4,  w:11, h:8  });
    addProp({ prop:'column', x:1,  y:14, w:7,  h:60 });
    addProp({ prop:'pipe',   x:9,  y:10, w:6,  h:50 });
    addProp({ prop:'ivy',    x:17, y:4,  w:9,  h:30, cls:'prop-far' });
    addProp({ prop:'ivy',    x:90, y:4,  w:10, h:40, cls:'prop-far' });
    addProp({ prop:'cables', x:70, y:6,  w:10, h:28, cls:'prop-far' });
    addProp({ prop:'panel',  x:64, y:36, w:12, h:11, anim:'prop-flicker' });
    addProp({ prop:'crate',  x:64, y:58, w:14, h:15 });
    addProp({ prop:'barrel', x:88, y:64, w:8,  h:15 });
    addProp({ prop:'debris', x:19, y:78, w:16, h:8  });
    // ── interactive: every one is a visible object you click directly
    addHotspot({ prop:'opening',  x:46, y:24, w:14, h:30, label:'DUNKLER KORRIDOR', fn:() => clickHall1('corridor') });
    addHotspot({ prop:'terminal', anim:'prop-flicker', x:31, y:40, w:13, h:26, label:'TERMINAL', fn:() => clickHall1('terminal') });
    addHotspot({ prop:'door',     x:80, y:24, w:12, h:38, label:'TÜR',          fn:() => clickHall1('door') });
    addHotspot({ prop:'sign',     x:15, y:52, w:14, h:12, label:'TESTSCHILD',   fn:() => clickHall1('sign') });
    addHotspot({ prop:'decal',    x:42, y:74, w:20, h:13, label:'BODENPLATTEN', fn:() => clickHall1('floor') });
  }

  function clickHall1(key) {
    hall1Clicks[key]++;
    const n = hall1Clicks[key];
    const lines = {
      door: [
        [{ speaker:'SYSTEM', text:'Die Tür, durch die du gekommen bist, reagiert nicht mehr. Kein Griff. Kein Signal. Kein Rückweg. Das fühlt sich unnötig endgültig an.' }],
        [{ speaker:'SYSTEM', text:'Die Anlage war schon immer besser im Hineinlassen als im Herauslassen.' }],
      ],
      floor: [
        [{ speaker:'SYSTEM', text:'Einige Bodenplatten sind verschoben. Nicht eingestürzt. Verschoben. Als wäre etwas Leichtes, aber Metallisches darübergesprungen.' }],
      ],
      sign: [
        [{ speaker:'SYSTEM', text:'Auf einem alten Schild steht: TESTEN. MESSEN. VERBESSERN. Darunter hat jemand später etwas eingeritzt: NICHT ALLES VERBESSERT SICH.' }],
      ],
      terminal: [
        [{ speaker:'SYSTEM', text:'Der Bildschirm ist schwarz. Darunter blinkt eine kleine rote LED in unregelmäßigen Abständen. Nicht tot. Nur beleidigt.' }],
      ],
      corridor: [
        [{ speaker:'SYSTEM', text:'Der Gang führt weiter in die Anlage. Irgendwo dort vorne hörst du etwas. Ein leises, metallisches Springen.' }],
      ],
    };

    const list = lines[key] || [];
    const line = list[Math.min(n - 1, list.length - 1)];

    if (key === 'corridor') {
      clearHotspots();
      GameEngine.dialogue.load(line, () => scene_1_2_encounter());
    } else {
      GameEngine.dialogue.load(line);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 1.2 — ENCOUNTER (robots appear)
  // ═══════════════════════════════════════════════════════════════
  function scene_1_2_encounter() {
    clearHotspots();
    playSound('ch1_metal_jump_01.mp3');
    setScene('hall-robots-dist', 'cg/ch1_hall_robots_distance.png');

    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'In der Ferne bewegt sich etwas.' },
      { speaker:'SYSTEM', text:'Zwei kleine Gestalten springen von einer gebrochenen Steinplatte zur nächsten.' },
      { speaker:'SYSTEM', text:'Nicht wie Tiere. Nicht wie Menschen. Zu präzise für Zufall. Zu verspielt für Maschinen.' },
      { speaker:'SYSTEM', text:'Eine rote Linse blitzt auf. Dann eine grüne.' },
    ], () => {
      playSound('ch1_robot_appear_glitch.mp3');

      // Visual flicker
      const wrapper = document.getElementById('sceneWrapper');
      wrapper.style.animation = 'none';
      wrapper.style.opacity = '0';
      setTimeout(() => {
        setScene('hall-robots-close', 'cg/ch1_hall_robots_behind.png');
        wrapper.style.opacity = '1';
        setTimeout(() => scene_1_3_hiii(), 300);
      }, 180);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 1.3 — "HIII!"
  // ═══════════════════════════════════════════════════════════════
  function scene_1_3_hiii() {
    GameEngine.dialogue.load([
      { speaker:'SYSTEM',text:'Du blinzelst. Sie sind weg. Für genau eine Sekunde ist alles still.' },
      { speaker:'SYSTEM',text:'Dann hörst du hinter dir ein viel zu fröhliches Geräusch.' },
      { speaker:'R-3MI', text:'„Hiii!"' },
      { speaker:'V-TGM', text:'"Hi there."', subtitle:'Hallo.' },
      { speaker:'SYSTEM',text:'Dein Körper entscheidet sich für eine sehr wissenschaftliche Reaktion: absolute Panik.' },
      { speaker:'R-3MI', text:'„Oh! Nein, nein, nein. Bitte nicht panisch werden. Panik löst hier manchmal Prozesse aus."' },
      { speaker:'V-TGM', text:'"Are you scared of us?"', subtitle:'Hast du Angst vor uns?' },
      { speaker:'R-3MI', text:'„Technisch gesehen ist das eine sehr vernünftige Reaktion."' },
      { speaker:'V-TGM', text:'"R-3MI."', subtitle:'R-3MI.' },
      { speaker:'R-3MI', text:'„Was denn? Ich lobe den Überlebensinstinkt."' },
      { speaker:'R-3MI', text:'„Du bist die Testperson, oder?"' },
      { speaker:'V-TGM', text:'"The returning one."', subtitle:'Die zurückgekehrte.' },
      { speaker:'R-3MI', text:'„Wusste ich\'s doch. Niemand sonst würde freiwillig durch eine versiegelte Tür in eine überwucherte Testanlage gehen."' },
      { speaker:'R-3MI', text:'„Also. Niemand Vernünftiges."' },
      { speaker:'V-TGM', text:'"And yet, here we are."', subtitle:'Und trotzdem sind wir hier.' },
    ], () => scene_1_4_choice1());
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 1.4 — DIALOGUE CHOICE: first questions
  // ═══════════════════════════════════════════════════════════════
  const C1 = {
    who: {
      key: 'who', label: '[Wer seid ihr?]', seen: false,
      lines: [
        { speaker:'R-3MI', text:'„Ich bin R-3MI. Wartungseinheit, Orientierungshilfe, Qualitätskontrolle und gelegentlich moralische Unterstützung."' },
        { speaker:'V-TGM', text:'"I am V-TGM. Visual tracking, memory alignment, environmental observation."', subtitle:'Ich bin V-TGM. Visuelle Erfassung, Erinnerungsausrichtung, Umgebungsbeobachtung.' },
        { speaker:'R-3MI', text:'„Und zusammen sind wir…"' },
        { speaker:'R-3MI', text:'„…gerade wirklich froh, jemanden zu sehen."' },
        { speaker:'V-TGM', text:'"Very glad."', subtitle:'Sehr froh.' },
        { speaker:'R-3MI', text:'„Nicht komisch froh. Normal froh."' },
      ],
    },
    what: {
      key: 'what', label: '[Was ist hier passiert?]', seen: false,
      lines: [
        { speaker:'V-TGM', text:'"The facility went quiet."', subtitle:'Die Anlage wurde still.' },
        { speaker:'R-3MI', text:'„Nach der Abschaltung kamen noch eine Weile Signale rein. Alte Daten. Letzte Prüfungen. Erinnerungen."' },
        { speaker:'V-TGM', text:'"Then nothing."', subtitle:'Dann nichts mehr.' },
        { speaker:'R-3MI', text:'„Kein Strom. Keine Besucher. Keine neuen Eingaben. Sehr schlechte Arbeitsbedingungen für eine Anlage, die vom Testen lebt."' },
        { speaker:'V-TGM', text:'"It started preserving what it could."', subtitle:'Sie begann zu erhalten, was sie konnte.' },
        { speaker:'R-3MI', text:'„Uns zum Beispiel. Sehr gute Entscheidung, finde ich."' },
      ],
    },
    why: {
      key: 'why', label: '[Warum wart ihr hinter mir?]', seen: false,
      lines: [
        { speaker:'R-3MI', text:'„Weil du geblinzelt hast."' },
        { speaker:'V-TGM', text:'"That is not an answer."', subtitle:'Das ist keine Antwort.' },
        { speaker:'R-3MI', text:'„Doch. Nur kein beruhigender."' },
        { speaker:'V-TGM', text:'"We were checking if you were real."', subtitle:'Wir haben geprüft, ob du echt bist.' },
        { speaker:'R-3MI', text:'„Und gute Nachrichten: Du bist real genug."' },
        { speaker:'V-TGM', text:'"Enough?"', subtitle:'Genug?' },
        { speaker:'R-3MI', text:'„Für die Anlage. Nicht philosophisch."' },
      ],
    },
  };

  function scene_1_4_choice1() {
    showRobots(true);
    const choices = Object.values(C1);

    showChoices({
      prompt: 'ERSTE FRAGEN — ALLE AUSWÄHLEN:',
      hint:   allSeen(choices) ? '' : `NOCH ${choices.filter(c => !c.seen).length} AUSSTEHEND`,
      choices,
      onAfterChoice: (key, cfg) => {
        S.choice1Seen[key] = true;
        if (allSeen(choices)) {
          setTimeout(() => scene_1_5_request(), 400);
        } else {
          cfg.hint = `NOCH ${choices.filter(c => !c.seen).length} AUSSTEHEND`;
          showChoices(cfg);
        }
      },
    });
  }

  function allSeen(choices) { return choices.every(c => c.seen); }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 1.5 — THE REQUEST
  // ═══════════════════════════════════════════════════════════════
  const C2 = {
    why: {
      key:'why', label:'[Warum könnt ihr das nicht selbst?]', seen:false,
      lines:[
        { speaker:'V-TGM', text:'"We are part of the system."', subtitle:'Wir sind Teil des Systems.' },
        { speaker:'R-3MI', text:'„Und Systeme dürfen sich nicht einfach selbst bestätigen. Sonst wäre jede Prüfung nur ein sehr selbstbewusster Kreis."' },
        { speaker:'V-TGM', text:'"He is not wrong."', subtitle:'Er liegt nicht falsch.' },
        { speaker:'R-3MI', text:'„Ich bin selten falsch. Nur gelegentlich kreativ korrekt."' },
      ],
    },
    do: {
      key:'do', label:'[Was muss ich tun?]', seen:false,
      lines:[
        { speaker:'R-3MI', text:'„Kleine Dinge. Ganz kleine Dinge. Knöpfe drücken. Muster erkennen. Türen öffnen. Die Anlage davon überzeugen, nicht komplett auseinanderzufallen."' },
        { speaker:'V-TGM', text:'"Restore the sectors one by one."', subtitle:'Die Sektoren nach und nach wiederherstellen.' },
        { speaker:'R-3MI', text:'„Wir führen dich. Du löst. Die Anlage reagiert."' },
        { speaker:'R-3MI', text:'„Ein sehr gesundes Arbeitsverhältnis."' },
      ],
    },
    get: {
      key:'get', label:'[Was bekomme ich dafür?]', seen:false,
      lines:[
        { speaker:'R-3MI', text:'„Das gute Gefühl, zwei absolut vertrauenswürdigen Wartungseinheiten geholfen zu haben."' },
        { speaker:'V-TGM', text:'"Absolutely?"', subtitle:'Absolut?' },
        { speaker:'R-3MI', text:'„Relativ absolut."' },
        { speaker:'V-TGM', text:'"You came back for a reason."', subtitle:'Du bist aus einem Grund zurückgekommen.' },
        { speaker:'R-3MI', text:'„Und falls der Grund Rätsel waren: Glückwunsch. Schlechte Nachrichten. Gute Nachrichten. Rätsel."' },
      ],
    },
  };

  function scene_1_5_request() {
    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'Die beiden Maschinen stehen vor dir. Rotes Licht. Grünes Licht. Zu freundlich für diesen Ort. Oder genau freundlich genug.' },
      { speaker:'V-TGM', text:'"This place is damaged. Not dead. Damaged."', subtitle:'Dieser Ort ist beschädigt. Nicht tot. Beschädigt.' },
      { speaker:'R-3MI', text:'„Die Hauptsysteme sind offline. Die Nebenroutinen laufen instabil. Und der Reaktivierungskern reagiert nicht mehr auf interne Befehle."' },
      { speaker:'V-TGM', text:'"It needs outside input."', subtitle:'Er braucht Eingaben von außen.' },
      { speaker:'R-3MI', text:'„Und du bist außen. Also… warst du. Jetzt bist du innen. Aber du weißt, was ich meine."' },
      { speaker:'V-TGM', text:'"Human input."', subtitle:'Menschliche Eingaben.' },
      { speaker:'R-3MI', text:'„Du bist Mensch, richtig?"' },
      { speaker:'R-3MI', text:'„Bitte sag nicht nein. Das würde mehrere Protokolle sehr kompliziert machen."' },
    ], () => {
      const choices = Object.values(C2);
      showChoices({
        prompt: 'FRAGEN ZUR AUFGABE:',
        hint: 'WÄHLE BELIEBIGE FRAGEN',
        choices,
        onAfterChoice: (key, cfg) => {
          // Only 1 required, but let them explore all
          showChoices({
            ...cfg,
            hint: allSeen(choices) ? 'BEREIT ZUM FORTFAHREN' : 'WEITERE FRAGEN VERFÜGBAR',
            choices: [
              ...choices,
              { key:'continue', label:'[ → EINVERSTANDEN. LOS. ]', seen:false,
                lines:[
                  { speaker:'R-3MI', text:'„Ausgezeichnet. Ich wusste, du würdest Ja sagen."' },
                  { speaker:'V-TGM', text:'"You had not said yes yet."', subtitle:'Du hast noch nicht Ja gesagt.' },
                  { speaker:'R-3MI', text:'„Optimismus."' },
                ],
                fn: () => { hideChoices(); setTimeout(() => scene_roomA(), 300); },
              },
            ],
            onAfterChoice: (k2, cfg2) => {
              if (k2 === 'continue') {
                hideChoices();
                setTimeout(() => scene_roomA(), 300);
              } else {
                showChoices(cfg2);
              }
            },
          });
        },
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // ROOM A — EINGANGSHALLE
  // ═══════════════════════════════════════════════════════════════
  function scene_roomA() {
    setScene('room-a', 'cg/ch1_room_a.png');
    clearHotspots();
    showRobots(true);

    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'Du befindest dich nun in der ersten Halle der Anlage. R-3MI und V-TGM sind in deiner Nähe.' },
    ], () => loadRoomAHotspots());
  }

  function loadRoomAHotspots() {
    clearHotspots();
    // ── set dressing
    addProp({ prop:'duct',    x:14, y:0,  w:52, h:7, cls:'prop-far' });
    addProp({ prop:'light',   x:40, y:4,  w:12, h:8  });
    addProp({ prop:'light',   x:8,  y:5,  w:10, h:7  });
    addProp({ prop:'column',  x:88, y:12, w:8,  h:58 });
    addProp({ prop:'cables',  x:56, y:6,  w:9,  h:26, cls:'prop-far' });
    addProp({ prop:'monitors',x:36, y:32, w:17, h:15 });
    addProp({ prop:'ivy',     x:0,  y:6,  w:9,  h:28, cls:'prop-far' });
    addProp({ prop:'crate',   x:26, y:62, w:15, h:16 });
    addProp({ prop:'barrel',  x:44, y:64, w:8,  h:15 });
    addProp({ prop:'railing', x:56, y:70, w:24, h:11 });
    addProp({ prop:'debris',  x:66, y:80, w:15, h:8  });
    // ── interactive
    addHotspot({ prop:'terminal', anim:'prop-flicker', x:62, y:44, w:13, h:26, label:'TERMINAL', fn:() => clickRoomA('terminal') });
    addHotspot({ prop:'door',     x:76, y:24, w:12, h:38, label:'INNERES TOR', fn:() => clickRoomA('gate') });
    addHotspot({ prop:'sign',     x:10, y:56, w:14, h:12, label:'TESTSCHILD',  fn:() => clickRoomA('sign') });
    addHotspot({ prop:'scratch',  x:12, y:38, w:18, h:13, label:'WANDKRATZER', fn:() => clickRoomA('scratch') });
  }

  function clickRoomA(key) {
    S.roomA[key]++;
    const n = S.roomA[key];

    const lines = {
      terminal: {
        1: [
          { speaker:'SYSTEM', text:'Der Bildschirm ist schwarz, aber nicht leblos. Eine rote LED blinkt unter dem Rahmen. Das Terminal wartet auf Grundversorgung.' },
          { speaker:'R-3MI',  text:'„Ah, unser erstes kleines Problem."' },
          { speaker:'V-TGM',  text:'"The terminal cannot wake without routed power."', subtitle:'Das Terminal kann ohne geleitete Energie nicht starten.' },
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
          { speaker:'SYSTEM', text:'TESTEN. MESSEN. VERBESSERN.' },
          { speaker:'R-3MI',  text:'„Ein Klassiker."' },
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
          { speaker:'V-TGM',  text:'"Like you ignore warnings?"', subtitle:'So wie du Warnungen ignorierst?' },
          { speaker:'R-3MI',  text:'„Ich nehme Warnungen wahr. Ich gewichte sie nur kreativ."' },
        ],
      },
    };

    const bucket = lines[key];
    if (!bucket) return;
    const line = bucket[Math.min(n, Math.max(...Object.keys(bucket).map(Number)))];
    if (!line) return;

    if (key === 'terminal' && n === 1 && !S.p1Solved) {
      GameEngine.dialogue.load(line, () => openPuzzle1());
    } else {
      GameEngine.dialogue.load(line);
    }
  }

  // ─── Robot icon clicks (from corner buttons) ──────────────────
  function clickRobot(who) {
    if (who === 'r3mi') {
      S.roomA.r3mi++;
      const lines = [
        [{ speaker:'R-3MI', text:'„Ja? Brauchst du Hilfe, moralische Unterstützung oder eine sehr überzeugende Ausrede, warum das alles normal ist?"' }],
        [
          { speaker:'R-3MI', text:'„Ich weiß, ich sehe klein aus. Das ist Absicht. Große Roboter wirken sofort bedrohlich. Kleine Roboter wirken erst später bedrohlich."' },
          { speaker:'V-TGM', text:'"R-3MI."', subtitle:'R-3MI.' },
          { speaker:'R-3MI', text:'„Was? Timing ist wichtig."' },
        ],
        [{ speaker:'R-3MI', text:'„Du klickst mich ziemlich oft an. Das ist entweder Vertrauen oder Misstrauen. Beides ist nützlich."' }],
      ];
      const line = lines[Math.min(S.roomA.r3mi - 1, lines.length - 1)];
      GameEngine.dialogue.load(line);
    } else {
      S.roomA.vtgm++;
      const lines = [
        [
          { speaker:'V-TGM', text:'"I am monitoring the room."', subtitle:'Ich überwache den Raum.' },
          { speaker:'R-3MI', text:'„Sie meint das beruhigend."' },
        ],
        [{ speaker:'V-TGM', text:'"You notice details. That will help."', subtitle:'Du bemerkst Details. Das wird helfen.' }],
        [
          { speaker:'V-TGM', text:'"Some doors open because they are solved. Some open because they are ready for you."', subtitle:'Manche Türen öffnen sich, weil sie gelöst wurden. Manche, weil sie bereit für dich sind.' },
          { speaker:'R-3MI', text:'„Das war poetisch. Und überhaupt nicht beunruhigend."' },
        ],
      ];
      const line = lines[Math.min(S.roomA.vtgm - 1, lines.length - 1)];
      GameEngine.dialogue.load(line);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PUZZLE 1 — PIPE ROUTING (power to terminal)
  // ═══════════════════════════════════════════════════════════════
  /*
   * 4×4 grid. Each cell: { type, rot, fixed }
   * Types: 0=empty, 1=straight(NS/EW), 2=corner(NE→ES→SW→WN), 3=T, 4=cross
   * Connections[type][rot] = set of directions ['N','S','E','W']
   * Source at (0,0) sends power. Terminal at (3,3) must receive it.
   * Solution path: (0,0)E→(0,1)EW→(0,2)SW→(1,2)NS→(2,2)NE→(2,3)SW→(3,3)N
   */

  const CONN = {
    0: [[], [], [], []],
    1: [['N','S'],['E','W'],['N','S'],['E','W']],
    2: [['N','E'],['E','S'],['S','W'],['W','N']],
    3: [['N','E','S'],['E','S','W'],['S','W','N'],['W','N','E']],
    4: [['N','E','S','W'],['N','E','S','W'],['N','E','S','W'],['N','E','S','W']],
  };

  // solved rotations
  const P1_SOLVED = [
    [0, 1, 2, 1],  // row 0: src, EW-straight, SW-corner, EW-straight(decoy)
    [0, 0, 0, 0],  // row 1: empty, empty, NS-straight, empty
    [1, 1, 0, 2],  // row 2: EW(decoy), EW(decoy), NE-corner, SW-corner
    [0, 0, 0, 0],  // row 3: empties + terminal
  ];

  const P1_TYPES = [
    [4, 1, 2, 1],
    [0, 0, 1, 0],
    [1, 1, 2, 2],
    [0, 0, 0, 4],
  ];

  const P1_FIXED = [
    [1, 0, 0, 0],
    [1, 1, 0, 1],
    [0, 0, 0, 0],
    [1, 1, 1, 1],
  ];

  let p1Grid = [];

  function initP1Grid() {
    p1Grid = [];
    for (let r = 0; r < 4; r++) {
      p1Grid[r] = [];
      for (let c = 0; c < 4; c++) {
        const solvedRot = P1_SOLVED[r][c];
        const isFixed   = !!P1_FIXED[r][c];
        // Scramble non-fixed tiles (offset rotation by 1 or 2)
        const startRot  = isFixed ? solvedRot : (solvedRot + 1 + Math.floor(Math.random() * 2)) % 4;
        p1Grid[r][c]    = { type: P1_TYPES[r][c], rot: startRot, fixed: isFixed };
      }
    }
  }

  function renderP1() {
    const grid = document.getElementById('puzzle1Grid');
    grid.innerHTML = '';
    const reached = bfsReach(p1Grid, 0, 0);

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cell = p1Grid[r][c];
        const tile = document.createElement('div');
        tile.className = 'pipe-tile';
        if (cell.fixed) tile.classList.add('fixed');

        const isSource   = r === 0 && c === 0;
        const isTerminal = r === 3 && c === 3;
        const isConn     = reached.has(`${r},${c}`);

        if (isSource)   tile.classList.add('source-w');
        if (isTerminal) tile.classList.add('terminal');
        if (isConn && !isSource) tile.classList.add('conn');

        // Draw pipes
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

        if (!cell.fixed) {
          tile.addEventListener('click', () => rotateP1Tile(r, c));
        }
        grid.appendChild(tile);
      }
    }
  }

  function rotateP1Tile(r, c) {
    if (S.p1Solved) return;
    p1Grid[r][c].rot = (p1Grid[r][c].rot + 1) % 4;
    const tile = document.getElementById('puzzle1Grid')
      .children[r * 4 + c];
    tile.classList.add('rotating');
    setTimeout(() => tile.classList.remove('rotating'), 160);
    renderP1();
    checkP1();
  }

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

  function checkP1() {
    const reached = bfsReach(p1Grid, 0, 0);
    const status  = document.getElementById('puzzle1Status');
    if (reached.has('3,3')) {
      status.textContent = 'VERBINDUNG HERGESTELLT.';
      status.className   = 'puzzle-status sys-text ok';
      S.p1Solved = true;
      setTimeout(() => solvePuzzle1(), 700);
    } else {
      status.textContent = 'LEITUNG UNTERBROCHEN.';
      status.className   = 'puzzle-status sys-text';
    }
  }

  function openPuzzle1() {
    GameEngine.dialogue.load([
      { speaker:'R-3MI', text:'„Die Grundversorgung ist blockiert. Nichts Dramatisches."' },
      { speaker:'R-3MI', text:'„Okay, ein bisschen dramatisch."' },
      { speaker:'V-TGM', text:'"Route the remaining power into the terminal."', subtitle:'Leite die verbleibende Energie in das Terminal.' },
      { speaker:'R-3MI', text:'„Keine Sorge. Wenn etwas explodiert, war es wahrscheinlich schon vorher kaputt."' },
    ], () => {
      initP1Grid();
      renderP1();
      document.getElementById('puzzle1Modal').classList.remove('hidden');
    });
  }

  function resetPuzzle1() { initP1Grid(); renderP1(); S.p1Solved = false; }

  function solvePuzzle1() {
    renderP1();
    document.getElementById('puzzle1Modal').classList.add('hidden');
    playSound('ch1_terminal_power_on.mp3');

    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'GRUNDVERSORGUNG HERGESTELLT. TERMINAL 01 AKTIV.' },
      { speaker:'SYSTEM', text:'Ein dünnes Licht läuft durch die Wandlinien. Erst rot. Dann grün. Die Halle atmet elektrisch ein.' },
      { speaker:'R-3MI',  text:'„Siehst du? Kaum gefährlich."' },
      { speaker:'V-TGM',  text:'"That was stable enough."', subtitle:'Das war stabil genug.' },
      { speaker:'R-3MI',  text:'„Stabil genug ist hier praktisch Luxus."' },
      { speaker:'SYSTEM', text:'ZUGANG ZUM WARTUNGSKNOTEN FREIGEGEBEN.' },
    ], () => scene_1_6_transitionAB());
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 1.6 — TRANSITION TO ROOM B
  // ═══════════════════════════════════════════════════════════════
  function scene_1_6_transitionAB() {
    setScene('corridor-ab', 'cg/ch1_corridor_ab.png');
    clearHotspots();

    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'Das innere Tor öffnet sich nur halb. R-3MI schlüpft sofort darunter hindurch. V-TGM wartet kurz, dreht den Kopf zu dir und deutet auf die Öffnung.' },
      { speaker:'V-TGM', text:'"After you."', subtitle:'Nach dir.' },
      { speaker:'R-3MI', text:'„Nicht nach mir, ich bin schon hier!"', subtitle:undefined },
      { speaker:'V-TGM', text:'"Obviously."', subtitle:'Offensichtlich.' },
      { speaker:'SYSTEM', text:'Du duckst dich unter dem Tor hindurch. Dahinter wird die Anlage lauter.' },
    ], () => scene_roomB());
  }

  // ═══════════════════════════════════════════════════════════════
  // ROOM B — WARTUNGSKNOTEN
  // ═══════════════════════════════════════════════════════════════
  function scene_roomB() {
    setScene('room-b', 'cg/ch1_room_b.png');
    clearHotspots();

    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'Der Wartungsknoten liegt tiefer in der Anlage. Hier ist weniger Grün. Weniger Natur. Dafür mehr Maschine.' },
      { speaker:'SYSTEM', text:'Kabel laufen in geordneten Bahnen durch die Wände. Einige leuchten schwach. Andere zucken, als würden sie träumen.' },
      { speaker:'R-3MI',  text:'„Willkommen im Wartungsknoten. Nicht schön, aber wichtig."' },
      { speaker:'V-TGM',  text:'"This room decides what can speak to what."', subtitle:'Dieser Raum entscheidet, was mit was sprechen darf.' },
      { speaker:'R-3MI',  text:'„Wie ein sehr strenger Empfangschef."' },
    ], () => loadRoomBHotspots());
  }

  function loadRoomBHotspots() {
    clearHotspots();
    // ── set dressing: the technical "machine heart" room
    addProp({ prop:'duct',    x:16, y:0,  w:52, h:7, cls:'prop-far' });
    addProp({ prop:'light',   x:42, y:4,  w:12, h:8  });
    addProp({ prop:'monitors',x:20, y:20, w:18, h:16 });
    addProp({ prop:'cables',  x:74, y:6,  w:9,  h:24, cls:'prop-far' });
    addProp({ prop:'column',  x:0,  y:10, w:7,  h:62 });
    addProp({ prop:'column',  x:93, y:10, w:7,  h:62 });
    addProp({ prop:'railing', x:22, y:66, w:26, h:12 });
    addProp({ prop:'barrel',  x:64, y:62, w:8,  h:15 });
    addProp({ prop:'debris',  x:48, y:82, w:15, h:8  });
    // ── interactive  (R-3MI = GREEN, V-TGM = RED — see the conduit dialogue)
    addHotspot({ prop:'console', x:39, y:44, w:22, h:23, label:'ZENTRALE KONSOLE', fn:() => clickRoomB('console') });
    addHotspot({ prop:'pipe', cls:'prop-red',   x:9,  y:24, w:9, h:46, label:'ROTE LEITUNG',  fn:() => clickRoomB('red') });
    addHotspot({ prop:'pipe', cls:'prop-green', x:83, y:24, w:9, h:46, label:'GRÜNE LEITUNG', fn:() => clickRoomB('green') });
    addHotspot({ prop:'door',    x:62, y:12, w:13, h:32, label:'SEKTOR-02-TÜR',    fn:() => clickRoomB('door') });
    addHotspot({ prop:'vent',    x:82, y:74, w:12, h:12, label:'LÜFTUNGSSCHACHT',  fn:() => clickRoomB('vent') });
    addHotspot({ prop:'poster',  x:24, y:38, w:12, h:22, label:'ALTES POSTER',     fn:() => clickRoomB('poster') });
  }

  function clickRoomB(key) {
    S.roomB[key]++;
    const n = S.roomB[key];

    const lines = {
      console: {
        1: [
          { speaker:'SYSTEM', text:'Die zentrale Konsole ist aktiv, aber gesperrt. Auf dem Bildschirm steht: HILFSPROTOKOLL NICHT KALIBRIERT.' },
          { speaker:'R-3MI',  text:'„Oh. Das ist wichtig."' },
          { speaker:'V-TGM',  text:'"If this activates, we can assist properly."', subtitle:'Wenn das aktiviert wird, können wir richtig helfen.' },
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

    const bucket = lines[key];
    if (!bucket) return;
    const line = bucket[Math.min(n, Math.max(...Object.keys(bucket).map(Number)))];
    if (!line) return;

    if (key === 'console' && n === 1 && !S.p2Solved) {
      GameEngine.dialogue.load(line, () => scene_1_7_hintIntro());
    } else {
      GameEngine.dialogue.load(line);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 1.7 — HINT SYSTEM INTRO
  // ═══════════════════════════════════════════════════════════════
  function scene_1_7_hintIntro() {
    playSound('ch1_hint_ui_open.mp3');
    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'HILFSPROTOKOLL GEFUNDEN. BETREUUNGSEINHEITEN ERKANNT: R-3MI / V-TGM. KALIBRIERUNG ERFORDERLICH.' },
      { speaker:'R-3MI',  text:'„Ah! Das sind wir."' },
      { speaker:'V-TGM',  text:'"The system wants to know how we assist."', subtitle:'Das System will wissen, wie wir helfen.' },
      { speaker:'R-3MI',  text:'„Freundlich. Nützlich. Nicht zu hilfreich."' },
      { speaker:'V-TGM',  text:'"Not too helpful?"', subtitle:'Nicht zu hilfreich?' },
      { speaker:'R-3MI',  text:'„Wenn wir alles verraten, ist es kein Rätsel mehr."' },
      { speaker:'V-TGM',  text:'"Three hints. No solutions."', subtitle:'Drei Hinweise. Keine Lösungen.' },
      { speaker:'R-3MI',  text:'„Exakt! Man kann zwischen uns wählen. Ich bin natürlich die charmante Option."' },
      { speaker:'V-TGM',  text:'"I am the useful option."', subtitle:'Ich bin die nützliche Option.' },
      { speaker:'R-3MI',  text:'„Das war sehr gezielt."' },
      { speaker:'SYSTEM', text:'HILFESYSTEM: Pro Rätsel maximal drei Hinweise. Wähle zwischen R-3MI und V-TGM. Hinweise helfen weiter — verraten aber nicht die Lösung.' },
    ], () => openPuzzle2());
  }

  // ═══════════════════════════════════════════════════════════════
  // PUZZLE 2 — DUAL SIGNAL (two signal paths: a red one and a green one.
  // NOTE: these are SIGNAL colours, not robot colours.
  // Canonical: R-3MI = GREEN (#2ecf62), V-TGM = RED (#c0322c).)
  // ═══════════════════════════════════════════════════════════════
  /*
   * 4×4 grid. Two signal sources, two terminals.
   * Red source (0,0) → Red terminal (3,1)
   * Green source (0,3) → Green terminal (3,2)
   * Paths must NOT share any tile.
   * BFS checks both paths independently.
   *
   * Red solution path:   (0,0)S→(1,0)S→(2,0)E→(2,1)S→(3,1)
   * Green solution path: (0,3)S→(1,3)S→(2,3)W→(2,2)S→(3,2) 
   */

  // FIXED LAYOUT: row 0 is no longer connected — no bridge between sources.
  // Sources (top) and terminals (bottom) are simple straight pieces.
  // Player rotates the inner tiles to form two disjoint paths.
  const P2_TYPES = [
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [2, 2, 2, 2],
    [0, 1, 1, 0],
  ];

  const P2_SOLVED = [
    [0, 0, 0, 0],   // sources NS
    [0, 0, 0, 0],   // straights NS
    [0, 2, 1, 3],   // corners: NE, SW, ES, WN
    [0, 0, 0, 0],   // terminals NS
  ];

  // Red path:   (0,0)→(1,0)→(2,0)→(2,1)→(3,1)
  // Green path: (0,3)→(1,3)→(2,3)→(2,2)→(3,2)
  const P2_SOURCE_R  = '0,0';
  const P2_TERM_R    = '3,1';
  const P2_SOURCE_G  = '0,3';
  const P2_TERM_G    = '3,2';

  const P2_FIXED = [
    [1, 0, 0, 1],   // sources fixed
    [0, 0, 0, 0],   // straights rotatable
    [0, 0, 0, 0],   // corners rotatable
    [0, 1, 1, 0],   // terminals fixed
  ];

  let p2Grid = [];

  function initP2Grid() {
    p2Grid = [];
    for (let r = 0; r < 4; r++) {
      p2Grid[r] = [];
      for (let c = 0; c < 4; c++) {
        const solvedRot = P2_SOLVED[r][c];
        const isFixed   = !!P2_FIXED[r][c];
        const startRot  = isFixed ? solvedRot : (solvedRot + 1 + Math.floor(Math.random() * 2)) % 4;
        p2Grid[r][c]    = { type: P2_TYPES[r][c], rot: startRot, fixed: isFixed };
      }
    }
  }

  function renderP2() {
    const grid = document.getElementById('puzzle2Grid');
    grid.innerHTML = '';
    const reachR = bfsReach(p2Grid, 0, 0);
    const reachG = bfsReach(p2Grid, 0, 3);

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cell = p2Grid[r][c];
        const tile = document.createElement('div');
        tile.className = 'pipe-tile';
        if (cell.fixed) tile.classList.add('fixed');

        const key  = `${r},${c}`;
        const isSR = key === P2_SOURCE_R;
        const isSG = key === P2_SOURCE_G;
        const isTR = key === P2_TERM_R;
        const iTG  = key === P2_TERM_G;
        const connR = reachR.has(key);
        const connG = reachG.has(key);

        if (isSR)       tile.classList.add('source-w');
        else if (isSG)  tile.classList.add('source-g2');
        else if (isTR)  tile.classList.add('terminal2r');
        else if (iTG)   tile.classList.add('terminal2g');
        else if (connR) tile.classList.add('conn-r');
        else if (connG) tile.classList.add('conn-g');

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

        if (!cell.fixed) {
          tile.addEventListener('click', () => rotateP2Tile(r, c));
        }
        grid.appendChild(tile);
      }
    }
  }

  function rotateP2Tile(r, c) {
    if (S.p2Solved) return;
    p2Grid[r][c].rot = (p2Grid[r][c].rot + 1) % 4;
    const tile = document.getElementById('puzzle2Grid').children[r * 4 + c];
    tile.classList.add('rotating');
    setTimeout(() => tile.classList.remove('rotating'), 160);
    renderP2();
    checkP2();
  }

  function checkP2() {
    const reachR = bfsReach(p2Grid, 0, 0);
    const reachG = bfsReach(p2Grid, 0, 3);
    const okR    = reachR.has(P2_TERM_R);
    const okG    = reachG.has(P2_TERM_G);

    // Disjoint check — paths must not share any tile
    const overlap = [...reachR].some(t => reachG.has(t));

    const status = document.getElementById('puzzle2Status');

    // CRITICAL: detect cross-contamination
    // Red reaches green's terminal OR green reaches red's terminal = bridged
    const redReachesGreen = reachR.has(P2_TERM_G);
    const greenReachesRed = reachG.has(P2_TERM_R);

    if (overlap || redReachesGreen || greenReachesRed) {
      status.textContent = 'SIGNALE INTERFERIEREN — PFADE MÜSSEN GETRENNT BLEIBEN.';
      status.className   = 'puzzle-status sys-text error';
      return;
    }

    if (okR && okG) {
      status.textContent = 'BEIDE SIGNALE VERBUNDEN.';
      status.className   = 'puzzle-status sys-text ok';
      S.p2Solved = true;
      setTimeout(() => solvePuzzle2(), 700);
    } else if (okR) {
      status.textContent = 'R-3MI-SIGNAL: AKTIV. V-TGM-SIGNAL: UNTERBROCHEN.';
      status.className   = 'puzzle-status sys-text';
    } else if (okG) {
      status.textContent = 'V-TGM-SIGNAL: AKTIV. R-3MI-SIGNAL: UNTERBROCHEN.';
      status.className   = 'puzzle-status sys-text';
    } else {
      status.textContent = 'BEIDE SIGNALE INAKTIV.';
      status.className   = 'puzzle-status sys-text';
    }
  }

  function openPuzzle2() {
    S.hints.active = 'p2';
    S.hints.r3mi   = P2_HINT_MAX;
    S.hints.vtgm   = P2_HINT_MAX;
    updateHintBar();

    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'HILFSPROTOKOLL-KALIBRIERUNG STARTEN?' },
      { speaker:'R-3MI',  text:'„Keine Sorge. Das klingt deutlich schlimmer, als es ist."' },
      { speaker:'V-TGM',  text:'"It might be exactly as bad as it sounds."', subtitle:'Es könnte genau so schlimm sein, wie es klingt.' },
      { speaker:'R-3MI',  text:'„Oder etwas weniger. Optimismus, V-TGM."' },
      { speaker:'V-TGM',  text:'"Accuracy, R-3MI."', subtitle:'Genauigkeit, R-3MI.' },
    ], () => {
      initP2Grid();
      renderP2();
      document.getElementById('puzzle2Modal').classList.remove('hidden');
      document.getElementById('hintBar').classList.remove('hidden');
    });
  }

  function resetPuzzle2() { initP2Grid(); renderP2(); S.p2Solved = false; }

  function solvePuzzle2() {
    renderP2();
    document.getElementById('puzzle2Modal').classList.add('hidden');
    document.getElementById('hintBar').classList.add('hidden');
    playSound('ch1_terminal_power_on.mp3');
    setProgress(8);

    GameEngine.achievements.unlock('ch1_complete');

    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'HILFSPROTOKOLL KALIBRIERT. BETREUUNGSEINHEITEN AKTIV.' },
      { speaker:'SYSTEM', text:'R-3MI: AKTIV. V-TGM: AKTIV.' },
      { speaker:'R-3MI',  text:'„Offiziell hilfreich!"' },
      { speaker:'V-TGM',  text:'"Officially limited."', subtitle:'Offiziell begrenzt.' },
      { speaker:'R-3MI',  text:'„Das klingt weniger gut auf einer Visitenkarte."' },
      { speaker:'SYSTEM', text:'REAKTIVIERUNGSFORTSCHRITT: 8%' },
      { speaker:'R-3MI',  text:'„Acht Prozent! Das ist fast zehn."' },
      { speaker:'V-TGM',  text:'"It is exactly not ten."', subtitle:'Es ist genau nicht zehn.' },
      { speaker:'R-3MI',  text:'„Aber emotional nah dran."' },
      { speaker:'SYSTEM', text:'SEKTOR 02 FREIGEGEBEN. WARTUNGSGARTEN BEREIT.' },
    ], () => scene_1_8_end());
  }

  // ─── Hint system ──────────────────────────────────────────────
  const P2_HINT_MAX = 2; // hints per unit (R-3MI / V-TGM) → 4 total
  const P2_HINTS = {
    r3mi: [
      '„Okay, ich würde nicht versuchen, beide Signale gleichzeitig perfekt zu verstehen. Fang mit dem an, das weniger Spielraum hat."',
      '„Rot darf chaotisch aussehen. Das ist kein Fehler. Also… nicht immer."',
      '„Wenn eine Verbindung alles blockiert, ist sie wahrscheinlich zu früh gesetzt. Manchmal muss man einen guten Weg löschen, damit ein besserer entstehen kann."',
    ],
    vtgm: [
      '"Start with the stricter path. The flexible one can adjust later."',
      '"The two signals do not need to look symmetrical. They only need to arrive cleanly."',
      '"Check the terminal of each signal last. If both paths fight over the same tile, one of them entered from the wrong side."',
    ],
    vtgm_sub: [
      'Beginne mit dem strengeren Pfad. Der flexible kann sich später anpassen.',
      'Die beiden Signale müssen nicht symmetrisch aussehen. Sie müssen nur sauber ankommen.',
      'Prüfe das Ziel jedes Signals zuletzt. Wenn beide Pfade um dasselbe Feld kämpfen, kommt einer von der falschen Seite.',
    ],
  };

  function useHint(who) {
    const remaining = S.hints[who];
    if (remaining <= 0) {
      GameEngine.dialogue.load([
        { speaker: who === 'r3mi' ? 'R-3MI' : 'V-TGM',
          text: who === 'r3mi'
            ? '„Mehr darf ich nicht sagen. Also, ich könnte. Aber dann würde das System mich vermutlich anschreien."'
            : '"You have enough."',
          subtitle: who === 'vtgm' ? 'Du hast genug.' : undefined,
        },
      ]);
      return;
    }
    const idx = P2_HINT_MAX - remaining;
    S.hints[who]--;
    updateHintBar();

    if (who === 'r3mi') {
      GameEngine.dialogue.load([{ speaker:'R-3MI', text: P2_HINTS.r3mi[idx] }]);
    } else {
      GameEngine.dialogue.load([{
        speaker: 'V-TGM',
        text: P2_HINTS.vtgm[idx],
        subtitle: P2_HINTS.vtgm_sub[idx],
      }]);
    }
  }

  function updateHintBar() {
    const total = S.hints.r3mi + S.hints.vtgm;
    document.getElementById('hintCount').textContent = `HINWEISE: ${total} VERFÜGBAR`;
    document.getElementById('hintBtnR3MI').disabled = S.hints.r3mi <= 0;
    document.getElementById('hintBtnVTGM').disabled = S.hints.vtgm <= 0;
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 1.8 — END
  // ═══════════════════════════════════════════════════════════════
  function scene_1_8_end() {
    setScene('room-b', 'cg/ch1_door_open.png');
    clearHotspots();
    playSound('ch1_gate_unlock.mp3');

    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'Die Tür zum nächsten Sektor öffnet sich. Dahinter ist die Luft wärmer. Feuchter. Etwas tropft. Etwas raschelt.' },
      { speaker:'SYSTEM', text:'Und irgendwo in der Tiefe macht etwas ein Geräusch, das verdächtig nach einem mechanischen Quaken klingt.' },
      { speaker:'R-3MI',  text:'„Oh nein."' },
      { speaker:'V-TGM',  text:'"What?"', subtitle:'Was?' },
      { speaker:'R-3MI',  text:'„Nichts."' },
      { speaker:'R-3MI',  text:'„Okay. Nicht nichts."' },
      { speaker:'V-TGM',  text:'"She sounds excited."', subtitle:'Sie klingt aufgeregt.' },
      { speaker:'R-3MI',  text:'„Das ist das Problem."' },
    ], () => {
      clearHotspots();
      addHotspot({ prop:'door', x:42, y:16, w:16, h:54, label:'SEKTOR 02 BETRETEN', fn:() => {
        GameEngine.state.markChapterComplete('ch1');
        try { GameEngine.audio.fanfare(); } catch(_) {}
        document.getElementById('chapterComplete').classList.remove('hidden');
        document.getElementById('ccProgress').textContent =
          `FORTSCHRITT: ${GameEngine.state.get('chaptersCompleted').length} / 9 KAPITEL`;
      }});
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════
  return {
    init() { showTitleCard(); },
    clickRobot,
    useHint,
    resetPuzzle1() { resetPuzzle1(); },
    resetPuzzle2() { resetPuzzle2(); },
  };

})();

document.addEventListener('DOMContentLoaded', () => Chapter1.init());
