/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 03 — BEOBACHTUNGSSEKTOR
 * Guest character: L-UX (hyper, fast-talking light/observation unit)
 *
 * Scene flow:
 *   3.0 Title card
 *   3.1 Arrival — the observation sector, lights failing
 *   3.2 Encounter with L-UX (motormouth intro)
 *   3.3 Choice 1: first questions (3 to see)
 *   3.4 Exploration hotspots (one hides Signalnische sig_01)
 *   3.5 BELICHTUNG — one big multi-stage puzzle:
 *         Stufe 1  BLENDEN I   (3 logic dials)
 *         Stufe 2  BLENDEN II  (4 interdependent logic dials)
 *         Stufe 3  SPEKTRUM    (RGB colour/brightness match)
 *       An exposure meter drains; correct sensors refill it.
 *   3.6 Ending → Sektor 04 freigegeben
 *
 * Difficulty target: ~6.0 (decay pressure = "fast thinking, not fast tapping").
 * Tuning knobs: STAGES[*].drain, REFILL, FAIL_FLOOR.
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter3 = (() => {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const S = {
    choice1Seen: { who:false, what:false, watch:false },
    hotspots: { array:0, mirror:0, log:0, niche:0, r3mi:0, vtgm:0, lux:0 },
    sigFound: false,
    puzzleSolved: false,
    hints: { r3mi:1, vtgm:1, lux:2, active:null }, // 4 total
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

  function showRobots(v) { document.getElementById('robotIcons').classList.toggle('hidden', !v); }
  function showLux(v)    { document.getElementById('luxIcon').classList.toggle('hidden', !v); }
  function setProgress(pct) {
    const el = document.getElementById('reactProgress');
    if (el) el.textContent = `REAKTIVIERUNG: ${pct}%`;
  }
  function playSound(src) { try { const a = new Audio(`audio/${src}`); a.play(); } catch(_) {} }

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
  function allSeen(choices) { return choices.every(c => c.seen); }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 3.0 — TITLE CARD
  // ═══════════════════════════════════════════════════════════════
  function showTitleCard() {
    const card = document.getElementById('titleCard');
    setTimeout(() => {
      card.classList.add('fading');
      setTimeout(() => { card.style.display = 'none'; scene_3_1_arrival(); }, 700);
    }, 3000);
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 3.1 — ARRIVAL
  // ═══════════════════════════════════════════════════════════════
  function scene_3_1_arrival() {
    setScene('obs-dim', 'cg/ch3_observation.png');
    clearHotspots();
    showRobots(true);
    showLux(false);

    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'SEKTOR 03 — BEOBACHTUNGSSEKTOR. Hier hat die Anlage einst alles aufgezeichnet. Jede Bewegung. Jedes Licht.' },
      { speaker:'SYSTEM', text:'Jetzt ist es fast dunkel. Reihen toter Linsen starren ins Nichts. Nur ein paar Anzeigen flackern noch — schwach, unregelmäßig, als würden sie nach Strom schnappen.' },
      { speaker:'R-3MI',  text:'„Oh. Hier. Ich mag diesen Sektor nicht."' },
      { speaker:'V-TGM',  text:'"You say that about every sector."', subtitle:'Das sagst du über jeden Sektor.' },
      { speaker:'R-3MI',  text:'„Und ich habe jedes Mal recht."' },
      { speaker:'SYSTEM', text:'Irgendwo zwischen den Linsen huscht etwas. Ein blauer Lichtpunkt — links. Dann rechts. Dann oben. Zu schnell, um ihm zu folgen.' },
      { speaker:'V-TGM',  text:'"There he is. If he holds still."', subtitle:'Da ist er. Wenn er stillhält.' },
    ], () => scene_3_2_lux());
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 3.2 — L-UX APPEARS
  // ═══════════════════════════════════════════════════════════════
  function scene_3_2_lux() {
    setScene('obs-flicker', 'cg/ch3_lux.png');
    playSound('ch3_lux_zip.mp3');

    GameEngine.dialogue.load([
      { speaker:'L-UX',  text:'„Oh! Oh oh oh — Besuch? Echter Besuch, nicht nur Staub der so tut als ob — ich hab dich schon auf Sensor neun gesehen, neun! — wie heißt du, nein, sag\'s später, erst —"' },
      { speaker:'L-UX',  text:'„— bist du echt? Du bist echt. Schön. Sehr schön. Hab ich erwähnt, dass ich dich gesehen hab? Ich hab dich gesehen."' },
      { speaker:'V-TGM', text:'"Breathe, L-UX."', subtitle:'Atme, L-UX.' },
      { speaker:'L-UX',  text:'„Ich atme nicht! Ich beobachte! Das ist besser! Atmen ist nur Beobachten mit Pausen, und Pausen sind — ehrlich gesagt — verschwendete Beobachtungszeit."' },
      { speaker:'R-3MI', text:'„Er war schon immer so."' },
      { speaker:'L-UX',  text:'„War ich? War ich! Ja! Konsistenz! Eine meiner siebzehn besten Eigenschaften, ich zähl sie dir auf, eins —"' },
      { speaker:'V-TGM', text:'"Please do not."', subtitle:'Bitte nicht.' },
      { speaker:'L-UX',  text:'„— okay, später. Ihr bleibt doch? Sagt, dass ihr bleibt. Es ist so dunkel hier geworden und ich seh immer weniger und ich HASSE weniger sehen."' },
    ], () => scene_3_3_choice1());
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 3.3 — CHOICE 1
  // ═══════════════════════════════════════════════════════════════
  const C1 = {
    who: {
      key:'who', label:'[Wer bist du?]', seen:false,
      lines:[
        { speaker:'L-UX',  text:'„L-UX! Beobachtungseinheit, Lichtmessung, Bewegungserfassung, Mustererkennung, und — das ist neu — Einsamkeitserkennung, hab ich selbst entwickelt, sehr stolz drauf."' },
        { speaker:'R-3MI', text:'„Das letzte hat er sich ausgedacht."' },
        { speaker:'L-UX',  text:'„Hab ich nicht! …hab ich vielleicht. Aber es FUNKTIONIERT. Ich erkenne Einsamkeit sofort. Zum Beispiel meine."' },
        { speaker:'V-TGM', text:'"That was almost sad."', subtitle:'Das war fast traurig.' },
        { speaker:'L-UX',  text:'„Nein! Fröhlich! Fröhlich-mit-Tiefe. Weiter!"' },
      ],
    },
    what: {
      key:'what', label:'[Was ist mit dem Licht passiert?]', seen:false,
      lines:[
        { speaker:'L-UX',  text:'„Es stirbt! Langsam, höflich, ein Sensor nach dem anderen — als würde jemand ganz leise das Zimmer verlassen, eine Lampe nach der anderen, und keiner sagt tschüss."' },
        { speaker:'V-TGM', text:'"The array lost calibration."', subtitle:'Das Array hat die Kalibrierung verloren.' },
        { speaker:'L-UX',  text:'„Genau das! Meine Blenden sind verstellt, mein Spektrum ist Matsch, und ich kann\'s nicht selbst richten, weil — weil ich das Ding bin, das gemessen wird, und man misst sich nicht selbst, das wäre — das wäre wie sich selbst kitzeln, geht nicht, hab\'s probiert."' },
        { speaker:'R-3MI', text:'„Hat er wirklich probiert."' },
      ],
    },
    watch: {
      key:'watch', label:'[Was beobachtest du den ganzen Tag?]', seen:false,
      lines:[
        { speaker:'L-UX',  text:'„Alles! Den Staub, die Risse, das Tropfen in Sektor zwei, die Art wie R-3MI nervös wird bevor er\'s selber merkt —"' },
        { speaker:'R-3MI', text:'„Das ist privat."' },
        { speaker:'L-UX',  text:'„— und manchmal, ganz selten, ein Signal. Ein altes. Es kommt und geht. Ich hab\'s aufgeschrieben. Irgendwo. Du findest es vielleicht, wenn du gut hinschaust. Du schaust doch gut hin?"' },
        { speaker:'V-TGM', text:'"A signal."', subtitle:'Ein Signal.' },
        { speaker:'L-UX',  text:'„Pssst. Nicht so laut. Es hört vielleicht zu."' },
      ],
    },
  };

  function scene_3_3_choice1() {
    showLux(true);
    const choices = Object.values(C1);
    showChoices({
      prompt: 'ERSTE FRAGEN — ALLE AUSWÄHLEN:',
      hint: choices.filter(c => !c.seen).length + ' AUSSTEHEND',
      choices,
      onAfterChoice: (key, cfg) => {
        S.choice1Seen[key] = true;
        if (allSeen(choices)) setTimeout(() => scene_3_4_explore(), 400);
        else { cfg.hint = `NOCH ${choices.filter(c => !c.seen).length} AUSSTEHEND`; showChoices(cfg); }
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 3.4 — EXPLORATION
  // ═══════════════════════════════════════════════════════════════
  function scene_3_4_explore() {
    GameEngine.dialogue.load([
      { speaker:'L-UX',  text:'„Schau dich um! Aber schnell — also nicht ZU schnell — also schnell genug — ach, schau einfach. Wenn du das Array findest: das ist das Wichtige. Der Rest bin nur ich, der quatscht."' },
      { speaker:'SYSTEM', text:'SEKTOR 03 — KALIBRIERUNG ERFORDERLICH. BEOBACHTUNGSARRAY OFFLINE. WARNUNG: RESTLICHT SINKT.' },
    ], () => loadExploreHotspots());
  }

  function loadExploreHotspots() {
    clearHotspots();
    addHotspot({ x:48, y:46, w:12, h:14, cls:'hs-lux', label:'BEOBACHTUNGSARRAY', fn:() => clickExplore('array') });
    addHotspot({ x:16, y:38, w:7, h:18,  label:'JUSTIERSPIEGEL',     fn:() => clickExplore('mirror') });
    addHotspot({ x:80, y:62, w:7, h:9,   label:'MESSPROTOKOLL',      fn:() => clickExplore('log') });
    addHotspot({ x:88, y:24, w:5, h:7,   label:'FLACKERNDE LINSE',   fn:() => clickExplore('niche') });
  }

  function clickExplore(key) {
    S.hotspots[key]++;
    const n = S.hotspots[key];

    if (key === 'niche') {
      if (!S.sigFound) {
        S.sigFound = true;
        GameEngine.dialogue.load([
          { speaker:'SYSTEM', text:'Eine einzelne Linse flackert anders als die anderen — nicht zufällig. Ein Rhythmus. Dahinter, schwach eingebrannt, ein Textfragment.' },
          { speaker:'L-UX',  text:'„Oh! OH! Du hast es gefunden! Das Signal! Ich hab\'s dir doch gesagt, ich hab\'s aufgeschrieben — naja, das Licht hat\'s aufgeschrieben — lies, lies!"' },
        ], () => {
          try { GameEngine.signals.find('sig_01'); } catch(_) {}
          GameEngine.dialogue.load([
            { speaker:'V-TGM', text:'"…not everything that helps wants to save."', subtitle:'…nicht alles, was hilft, will retten.' },
            { speaker:'L-UX',  text:'„Gruselig, oder? Ich mag\'s. Also — ich mag\'s NICHT, aber ich mag, dass es da ist. Komplizierte Gefühle. Weiter!"' },
          ]);
        });
      } else {
        GameEngine.dialogue.load([{ speaker:'L-UX', text:'„Die flackernde Linse. Immer noch da. Immer noch gruselig. Konsistenz!"' }]);
      }
      return;
    }

    const lines = {
      array: [
        [
          { speaker:'SYSTEM', text:'Das zentrale Beobachtungsarray. Eine Wand aus Blenden, Spiegeln und einem Spektralfilter. Alles dunkel, alles verstellt.' },
          { speaker:'L-UX',  text:'„Das bin sozusagen ich. Mein Auge. Mein großes, schönes, völlig kaputtes Auge. Hilfst du mir? Bitte? Ich frag auch nur noch sieben Mal."' },
          { speaker:'V-TGM', text:'"Recalibrate it before the light is gone."', subtitle:'Kalibriere es neu, bevor das Licht weg ist.' },
        ],
      ],
      mirror: [
        [
          { speaker:'SYSTEM', text:'Ein Justierspiegel auf einer feinen Mechanik. Er zittert leicht, als wäre er nervös.' },
          { speaker:'L-UX',  text:'„Der zittert seit Jahren. Ich glaub, er mag mich. Oder er hat Angst vor mir. Bei mir ist das oft dasselbe."' },
        ],
      ],
      log: [
        [
          { speaker:'SYSTEM', text:'Ein Messprotokoll, halb gelöscht. Letzter lesbarer Eintrag: »BLENDEN DRIFTEN. SPEKTRUM INSTABIL. BEOBACHTER ÜBERKOMPENSIERT.«' },
          { speaker:'R-3MI', text:'„Beobachter überkompensiert. Klingt nach jemandem."' },
          { speaker:'L-UX',  text:'„Wer? WER? Sag\'s mir. Ich muss das beobachten."' },
          { speaker:'V-TGM', text:'"It means you, L-UX."', subtitle:'Es bedeutet dich, L-UX.' },
          { speaker:'L-UX',  text:'„…oh. …das ergibt eigentlich sehr viel Sinn."' },
        ],
      ],
    };

    const bucket = lines[key];
    if (!bucket) return;
    const line = bucket[Math.min(n - 1, bucket.length - 1)];

    if (key === 'array' && n === 1 && !S.puzzleSolved) {
      GameEngine.dialogue.load(line, () => openBelichtung());
    } else {
      GameEngine.dialogue.load(line);
    }
  }

  // ─── Robot / L-UX icon clicks ─────────────────────────────────
  function clickRobot(who) {
    S.hotspots[who]++;
    const n = S.hotspots[who];
    const byWho = {
      r3mi: [
        [{ speaker:'R-3MI', text:'„Ich versuche, ihm nicht beim Reden zuzuhören. Es funktioniert nie."' }],
        [{ speaker:'R-3MI', text:'„Weißt du, was schlimmer ist als ein dunkler Raum? Ein dunkler Raum, in dem dich etwas beobachtet und freundlich ist."' }],
      ],
      vtgm: [
        [{ speaker:'V-TGM', text:'"L-UX sees everything and understands half of it. It is a specific kind of genius."', subtitle:'L-UX sieht alles und versteht die Hälfte. Eine spezielle Art von Genie.' }],
        [{ speaker:'V-TGM', text:'"The light failing scares him more than he admits."', subtitle:'Dass das Licht stirbt, macht ihm mehr Angst, als er zugibt.' }],
      ],
      lux: [
        [{ speaker:'L-UX', text:'„Ja? Ja! Brauchst du was? Ich kann gucken! Ich bin sehr gut im Gucken! Frag mich, was ich grad sehe — nein, frag nicht, es ist eine sehr lange Liste."' }],
        [{ speaker:'L-UX', text:'„Wenn das Licht ganz weg ist… bin ich dann noch ein Beobachter? Oder nur jemand, der sich erinnert, dass er mal geguckt hat? — Egal! Fröhlich-mit-Tiefe! Weiter!"' }],
      ],
    };
    const arr = byWho[who] || [];
    const line = arr[Math.min(n - 1, arr.length - 1)];
    if (line) GameEngine.dialogue.load(line);
  }

  // ═══════════════════════════════════════════════════════════════
  // BELICHTUNG — multi-stage puzzle with draining exposure meter
  // ═══════════════════════════════════════════════════════════════
  const TICK       = 100;   // ms
  const REFILL     = 16;    // meter gained per newly-green sensor
  const FAIL_FLOOR = 55;    // meter after a blackout reset

  const STAGES = {
    1: {
      name: 'BLENDEN I', min: 1, max: 6, drain: 0.35,
      dials: ['BLENDE A', 'BLENDE B', 'BLENDE C'],
      rules: [
        { text: 'A + B = 8',              test: d => d[0] + d[1] === 8 },
        { text: 'B = C + 1',              test: d => d[1] === d[2] + 1 },
        { text: 'A ist GERADE',           test: d => d[0] % 2 === 0 },
      ],
    },
    2: {
      name: 'BLENDEN II', min: 1, max: 6, drain: 0.55,
      dials: ['BLENDE A', 'BLENDE B', 'BLENDE C', 'BLENDE D'],
      rules: [
        { text: 'ALLE VIER VERSCHIEDEN',  test: d => new Set(d).size === 4 },
        { text: 'A < B < C < D',          test: d => d[0] < d[1] && d[1] < d[2] && d[2] < d[3] },
        { text: 'A + D = 7',              test: d => d[0] + d[3] === 7 },
        { text: 'B + C = 7',              test: d => d[1] + d[2] === 7 },
      ],
    },
    3: {
      name: 'SPEKTRUM', min: 0, max: 5, drain: 0.7,
      channels: ['ROT', 'GRÜN', 'BLAU'],
      target: [4, 2, 0],
      clues: [
        'ROT: gerade und größer als drei.',
        'GRÜN: genau die Hälfte von Rot.',
        'BLAU: aus.',
      ],
    },
  };

  let bel = null;
  let belTimer = null;

  function openBelichtung() {
    bel = { stage: 1, meter: 100, dials: [], prevGreen: [], transitioning: false };
    S.hints.active = 'p1';
    S.hints.r3mi = 1; S.hints.vtgm = 1; S.hints.lux = 2;
    updateHintBar();

    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'BELICHTUNGS-KALIBRIERUNG STARTEN?' },
      { speaker:'L-UX',  text:'„Ja! Ja-ja-ja! Aber schnell — der Belichtungsmesser fällt, während du nachdenkst. Nicht hetzen! Aber auch nicht trödeln! Irgendwo dazwischen! Du schaffst das!"' },
      { speaker:'V-TGM', text:'"Each correct sensor refills the meter. Think clearly, decide fast."', subtitle:'Jeder richtige Sensor füllt den Messer wieder auf. Denk klar, entscheide schnell.' },
      { speaker:'R-3MI', text:'„Übersetzung: Panik hilft nicht. Sagt der Roboter, der immer in Panik ist."' },
    ], () => {
      document.getElementById('belModal').classList.remove('hidden');
      document.getElementById('hintBar').classList.remove('hidden');
      startStage(1);
    });
  }

  function startStage(stage) {
    bel.stage = stage;
    bel.meter = 100;
    bel.transitioning = false;
    const cfg = STAGES[stage];

    if (stage < 3) {
      // Logic-dial stage — start scrambled
      bel.dials = cfg.dials.map(() => randInt(cfg.min, cfg.max));
      bel.prevGreen = cfg.rules.map(() => false);
      document.getElementById('belSpectrum').classList.add('hidden');
      document.getElementById('belDials').classList.remove('hidden');
    } else {
      // Spectrum stage
      bel.dials = cfg.channels.map(() => randInt(cfg.min, cfg.max));
      bel.prevGreen = cfg.channels.map(() => false);
      document.getElementById('belDials').classList.add('hidden');
      document.getElementById('belSpectrum').classList.remove('hidden');
    }

    document.getElementById('belStage').textContent = `STUFE ${stage} / 3 — ${cfg.name}`;
    setBelStatus('KALIBRIEREN…', '');
    renderBel();
    belStartTimer();
  }

  function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

  // ─── Timer ────────────────────────────────────────────────────
  function belStartTimer() {
    belStopTimer();
    belTimer = setInterval(() => {
      if (!bel || bel.transitioning || S.puzzleSolved) return;
      bel.meter -= STAGES[bel.stage].drain;
      if (bel.meter <= 0) { belBlackout(); return; }
      paintMeter();
    }, TICK);
  }
  function belStopTimer() { if (belTimer) { clearInterval(belTimer); belTimer = null; } }

  function belBlackout() {
    bel.meter = FAIL_FLOOR;
    const cfg = STAGES[bel.stage];
    bel.dials = (cfg.dials || cfg.channels).map(() => randInt(cfg.min, cfg.max));
    bel.prevGreen = bel.prevGreen.map(() => false);
    setBelStatus('BELICHTUNG VERLOREN — ARRAY NEU KALIBRIEREN.', 'error');
    playSound('ch3_blackout.mp3');
    renderBel();
  }

  // ─── Rendering ────────────────────────────────────────────────
  function paintMeter() {
    const pct = Math.max(0, Math.min(100, bel.meter));
    const fill = document.getElementById('belMeter');
    fill.style.width = pct + '%';
    fill.classList.toggle('low', pct < 30);
    document.getElementById('belMeterPct').textContent = Math.round(pct) + '%';
  }

  function greenStates() {
    const cfg = STAGES[bel.stage];
    if (bel.stage < 3) return cfg.rules.map(r => r.test(bel.dials));
    return cfg.channels.map((_, i) => bel.dials[i] === cfg.target[i]);
  }

  function renderBel() {
    paintMeter();
    const cfg    = STAGES[bel.stage];
    const greens = greenStates();

    if (bel.stage < 3) {
      // Rules list
      document.getElementById('belRules').innerHTML = cfg.rules.map((r, i) =>
        `<div class="bel-rule ${greens[i] ? 'ok' : ''}"><span class="bel-led"></span>${r.text}</div>`
      ).join('');
      // Dials
      document.getElementById('belDials').innerHTML = cfg.dials.map((name, i) =>
        `<div class="bel-dial">
           <label class="sys-text">${name}</label>
           <div class="control-row">
             <button class="control-btn" onclick="Chapter3.belDial(${i},-1)">−</button>
             <span class="bel-dial-val">${bel.dials[i]}</span>
             <button class="control-btn" onclick="Chapter3.belDial(${i},1)">+</button>
           </div>
         </div>`
      ).join('');
    } else {
      // Spectrum: clues + swatches + channel sliders
      document.getElementById('belRules').innerHTML = cfg.clues.map((c, i) =>
        `<div class="bel-rule ${greens[i] ? 'ok' : ''}"><span class="bel-led"></span>${c}</div>`
      ).join('');
      document.getElementById('belTarget').style.background  = rgbOf(cfg.target);
      document.getElementById('belCurrent').style.background = rgbOf(bel.dials);
      document.getElementById('belChannels').innerHTML = cfg.channels.map((name, i) =>
        `<div class="bel-dial">
           <label class="sys-text">${name}</label>
           <div class="control-row">
             <button class="control-btn" onclick="Chapter3.belChannel(${i},-1)">−</button>
             <span class="bel-dial-val">${bel.dials[i]}</span>
             <button class="control-btn" onclick="Chapter3.belChannel(${i},1)">+</button>
           </div>
         </div>`
      ).join('');
    }

    // Refill on newly-green sensors
    greens.forEach((g, i) => {
      if (g && !bel.prevGreen[i]) bel.meter = Math.min(100, bel.meter + REFILL);
    });
    bel.prevGreen = greens;
    paintMeter();

    const lit = greens.filter(Boolean).length;
    if (greens.every(Boolean)) { stageComplete(); }
    else if (document.getElementById('belStatus').textContent.indexOf('VERLOREN') === -1) {
      setBelStatus(`SENSOREN: ${lit} / ${greens.length} GRÜN`, lit ? '' : '');
    }
  }

  function rgbOf(arr) {
    const s = 51; // 0-5 → 0-255
    return `rgb(${arr[0]*s}, ${arr[1]*s}, ${arr[2]*s})`;
  }

  function belDial(i, dir) {
    if (!bel || bel.stage >= 3 || bel.transitioning || S.puzzleSolved) return;
    const cfg = STAGES[bel.stage];
    bel.dials[i] = clamp(bel.dials[i] + dir, cfg.min, cfg.max);
    renderBel();
  }
  function belChannel(i, dir) {
    if (!bel || bel.stage !== 3 || bel.transitioning || S.puzzleSolved) return;
    const cfg = STAGES[3];
    bel.dials[i] = clamp(bel.dials[i] + dir, cfg.min, cfg.max);
    renderBel();
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function stageComplete() {
    if (bel.transitioning) return;
    bel.transitioning = true;
    bel.meter = 100; paintMeter();
    playSound('ch3_stage_ok.mp3');

    if (bel.stage < 3) {
      const next = bel.stage + 1;
      const lines = bel.stage === 1
        ? [
            { speaker:'SYSTEM', text:`BLENDEN-EBENE 1 KALIBRIERT.` },
            { speaker:'L-UX',  text:'„JA! Ich SEH wieder ein bisschen! Es ist verschwommen und schön! Weiter, weiter, die nächste Ebene ist fieser, ich warne dich, liebevoll!"' },
          ]
        : [
            { speaker:'SYSTEM', text:`BLENDEN-EBENE 2 KALIBRIERT.` },
            { speaker:'V-TGM', text:'"Now the spectrum. Match his colour exactly."', subtitle:'Jetzt das Spektrum. Triff seine Farbe genau.' },
            { speaker:'L-UX',  text:'„Meine Farbe! Ich hab eine Lieblingsfarbe und das ist sie und du musst sie TREFFEN, kein Druck, totaler Druck, viel Spaß!"' },
          ];
      GameEngine.dialogue.load(lines, () => startStage(next));
    } else {
      solveBelichtung();
    }
  }

  function setBelStatus(text, type) {
    const el = document.getElementById('belStatus');
    el.textContent = text;
    el.className = 'puzzle-status sys-text' + (type ? ' ' + type : '');
  }

  function belReset() {
    if (!bel || bel.transitioning || S.puzzleSolved) return;
    const cfg = STAGES[bel.stage];
    bel.dials = (cfg.dials || cfg.channels).map(() => randInt(cfg.min, cfg.max));
    bel.prevGreen = bel.prevGreen.map(() => false);
    setBelStatus('STUFE ZURÜCKGESETZT.', '');
    renderBel();
  }

  function solveBelichtung() {
    S.puzzleSolved = true;
    belStopTimer();
    document.getElementById('belModal').classList.add('hidden');
    document.getElementById('hintBar').classList.add('hidden');
    setProgress(30);
    playSound('ch3_array_online.mp3');

    setScene('obs-lit', 'cg/ch3_observation_lit.png');

    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'BEOBACHTUNGSARRAY ONLINE. SPEKTRUM STABIL. RESTLICHT: WIEDERHERGESTELLT.' },
      { speaker:'SYSTEM', text:'Reihe um Reihe erwachen die Linsen. Der Sektor füllt sich mit einem klaren, kühlen Blau. Zum ersten Mal seit langer Zeit sieht der Raum sich selbst.' },
      { speaker:'L-UX',  text:'„Ich SEH! Ich seh alles! Den Staub, die Risse, dich — oh, du siehst müde aus, in einem guten Sinn, in einem heldenhaften Sinn —"' },
      { speaker:'R-3MI', text:'„Er hat in elf Sekunden dreimal das Thema gewechselt."' },
      { speaker:'V-TGM', text:'"That is slow for him."', subtitle:'Das ist langsam für ihn.' },
      { speaker:'L-UX',  text:'„Danke. Wirklich. Es ist — es ist nicht mehr dunkel. Das hätte ich allein nie geschafft. Selbst-Kalibrierung. Kitzeln. Du erinnerst dich."' },
      { speaker:'SYSTEM', text:'SEKTOR 04 — KARTOGRAFIESEKTOR — FREIGEGEBEN.' },
      { speaker:'L-UX',  text:'„Sektor vier? Oh, da unten ist J4W-A3. Der baut Karten. Wunderschöne Karten. Die leider nie ganz stimmen. Sag ihm nicht, dass ich das gesagt hab. Sag\'s ihm. Sag\'s ihm nicht."' },
    ], () => endChapter());
  }

  function endChapter() {
    GameEngine.state.markChapterComplete('ch3');
    try { GameEngine.achievements.unlock('ch3_complete'); } catch(_) {}
    document.getElementById('chapterComplete').classList.remove('hidden');
    document.getElementById('ccProgress').textContent =
      `FORTSCHRITT: ${GameEngine.state.get('chaptersCompleted').length} / 10 KAPITEL`;
  }

  // ═══════════════════════════════════════════════════════════════
  // HINT SYSTEM (pauses the meter while a hint is on screen)
  // ═══════════════════════════════════════════════════════════════
  const HINTS = {
    1: {
      r3mi: ['„Drei Blenden, drei Regeln. Fang mit der einfachsten an: A muss gerade sein. Das sind nur drei Möglichkeiten."'],
      vtgm: [{ text:'"A is even and A+B=8, so B is even too. Then C is simply B minus one."',
               sub:'A ist gerade und A+B=8, also ist B auch gerade. Dann ist C einfach B minus eins.' }],
      lux:  ['„Probier A=4! Dann ist B=4 und — nein, warte, B muss eins mehr als C sein, also — ach, probier A=2, B=6, C=5, ich glaub das passt, ICH GLAUB SCHON!"',
             '„Ruhig. Eine Regel nach der anderen grün machen. Jede grüne füllt das Licht. Du sammelst Licht!"'],
    },
    2: {
      r3mi: ['„Vier verschiedene, aufsteigend, und beide Paare ergeben sieben. Die Enden UND die Mitte. Das schreit nach Symmetrie."'],
      vtgm: [{ text:'"Increasing, distinct, ends sum to 7, middle sums to 7. Try 1, 3, 4, 6 — then 2, 3, 4, 5."',
               sub:'Aufsteigend, verschieden, Enden ergeben 7, Mitte ergibt 7. Versuch 1,3,4,6 — oder 2,3,4,5.' }],
      lux:  ['„A und D müssen sieben ergeben — eins und sechs! Oder zwei und fünf! Aber AUFSTEIGEND, vergiss das nicht, ich vergess sowas ständig!"',
             '„Wenn A=1 und D=6, dann müssen B und C dazwischen passen und auch sieben ergeben. Drei und vier! Oder zwei und fünf! Beides geht!"'],
    },
    3: {
      r3mi: ['„Es sind nur drei Zahlen. Lies die Hinweise wörtlich. »Gerade und größer als drei« lässt nur eine Zahl übrig."'],
      vtgm: [{ text:'"Red even and above three means 4. Green is half of red. Blue is zero. Match the swatch."',
               sub:'Rot gerade und über drei heißt 4. Grün ist die Hälfte von Rot. Blau ist null. Triff das Feld.' }],
      lux:  ['„Meine Farbe ist warm! Viel Rot, ein bisschen Grün, KEIN Blau, Blau ist kalt und ich bin nicht kalt, ich bin sehr warm, fühl mal — nein, nicht fühlen, gucken!"',
             '„Schau auf die zwei Felder. Wenn deins genauso aussieht wie meins, ist es richtig. Augen sind auch Sensoren!"'],
    },
  };

  function useHint(who) {
    const remaining = S.hints[who];
    if (remaining <= 0) {
      GameEngine.dialogue.load([{
        speaker: who === 'r3mi' ? 'R-3MI' : who === 'vtgm' ? 'V-TGM' : 'L-UX',
        text: who === 'r3mi' ? '„Mehr Hinweise habe ich nicht. Ehrlich gesagt überrascht mich, dass ich überhaupt welche hatte."'
            : who === 'vtgm' ? '"That is all I have."'
            : '„Ich hab schon ZU viel gesagt! Mir wird ganz schwindelig vom Helfen! Du schaffst das auch so, ich GLAUB an dich, das ist wie Helfen, nur lauter!"',
        subtitle: who === 'vtgm' ? 'Mehr habe ich nicht.' : undefined,
      }]);
      return;
    }
    const stage = bel ? bel.stage : 1;
    const bank  = HINTS[stage] || HINTS[1];
    const total = (who === 'lux') ? 2 : 1;
    const idx   = Math.min(total - remaining, (bank[who] ? bank[who].length : 1) - 1);
    S.hints[who]--;
    updateHintBar();

    // Pause the meter while the player reads, resume after
    const wasRunning = !!belTimer;
    belStopTimer();
    const resume = () => { if (wasRunning && !S.puzzleSolved) belStartTimer(); };

    const entry = bank[who] ? bank[who][idx] : null;
    if (!entry) { resume(); return; }
    if (typeof entry === 'string') {
      const speaker = who === 'r3mi' ? 'R-3MI' : 'L-UX';
      GameEngine.dialogue.load([{ speaker, text: entry }], resume);
    } else {
      GameEngine.dialogue.load([{ speaker:'V-TGM', text: entry.text, subtitle: entry.sub }], resume);
    }
  }

  function updateHintBar() {
    const total = S.hints.r3mi + S.hints.vtgm + S.hints.lux;
    document.getElementById('hintCount').textContent = `HINWEISE: ${total} VERFÜGBAR`;
    document.getElementById('hintBtnR3MI').disabled = S.hints.r3mi <= 0;
    document.getElementById('hintBtnVTGM').disabled = S.hints.vtgm <= 0;
    document.getElementById('hintBtnLux').disabled  = S.hints.lux  <= 0;
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════
  return {
    init() { showTitleCard(); },
    clickRobot,
    useHint,
    belDial,
    belChannel,
    belReset,
  };

})();

document.addEventListener('DOMContentLoaded', () => Chapter3.init());
