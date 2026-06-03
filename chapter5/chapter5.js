/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 05 — FÖRDERSEKTOR
 * Guest character: T-FLON14 (Teflon) — warm but relentless coach;
 *   frictionless, fast, runs the facility's long "power trail" of
 *   quick locks. "Komm, weiter, nicht stehenbleiben — du schaffst das!"
 *
 * Scene flow:
 *   5.0 Title card
 *   5.1 Arrival — the conveyor / trail sector
 *   5.2 Encounter with T-FLON14
 *   5.3 Choice 1: first questions (3 to see)
 *   5.4 Exploration (one hotspot hides Signalnische sig_03)
 *   5.5 FÖRDERLAUF — one big minigame: 20 rapid mixed micro-tasks
 *       under a single tight countdown (escalating). Wrong tap = time
 *       penalty; clear all 20 before the clock = solved.
 *   5.6 Ending → Sektor 06 freigegeben
 *
 * Difficulty target: ~7.5 (speed + escalating subtlety)
 * Tuning knobs: FL_TIME (clock), FL_PENALTY (wrong-tap cost), ROUNDS.
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter5 = (() => {
  'use strict';

  const S = {
    choice1Seen: { who:false, what:false, fast:false },
    hotspots: { band:0, marker:0, sign:0, r3mi:0, vtgm:0, tflon:0 },
    sigFound: false,
    solved: false,
    hints: { r3mi:1, vtgm:1, tflon:2, active:null },
  };

  // ─── SCENE HELPERS ────────────────────────────────────────────
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
  function showTflon(v)  { document.getElementById('tflonIcon').classList.toggle('hidden', !v); }
  function setProgress(pct){ const el = document.getElementById('reactProgress'); if (el) el.textContent = `REAKTIVIERUNG: ${pct}%`; }
  function playSound(src){ try { const a = new Audio(`audio/${src}`); a.play(); } catch(_) {} }

  // ─── CHOICE SYSTEM ────────────────────────────────────────────
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
        c.seen = true; hideChoices();
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

  function withModalDialogue(lines, after) {
    const modal = document.getElementById('flModal');
    const wasOpen = modal && !modal.classList.contains('hidden');
    if (wasOpen) modal.classList.add('hidden');
    GameEngine.dialogue.load(lines, () => {
      if (wasOpen) modal.classList.remove('hidden');
      if (after) after();
    });
  }

  // ─── SCENE 5.0 — TITLE CARD ───────────────────────────────────
  function showTitleCard() {
    const card = document.getElementById('titleCard');
    setTimeout(() => {
      card.classList.add('fading');
      setTimeout(() => { card.style.display = 'none'; scene_5_1_arrival(); }, 700);
    }, 3000);
  }

  // ─── SCENE 5.1 — ARRIVAL ──────────────────────────────────────
  function scene_5_1_arrival() {
    setScene('trail-dim', 'cg/ch5_trail.png');
    clearHotspots();
    showRobots(true);
    showTflon(false);
    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'SEKTOR 05 — FÖRDERSEKTOR. Ein endlos langer Gang. Förderbänder laufen leer in beide Richtungen. An den Wänden: hunderte kleine Verschlüsse, einer nach dem anderen, so weit man sehen kann.' },
      { speaker:'R-3MI',  text:'„Das sind… sehr viele Schlösser."' },
      { speaker:'V-TGM',  text:'"Hundreds. Small ones. Fast ones."', subtitle:'Hunderte. Kleine. Schnelle.' },
      { speaker:'SYSTEM', text:'Etwas gleitet heran. Schnell. Geräuschlos. Es bremst erst im allerletzten Moment — und rutscht dann trotzdem noch ein Stück weiter.' },
      { speaker:'T-FLON14', text:'„Oh! Frischfleisch! Äh — ich meine: ein neues Gesicht! Willkommen, willkommen, nicht stehenbleiben, komm, komm!"' },
    ], () => scene_5_2_tflon());
  }

  // ─── SCENE 5.2 — T-FLON14 APPEARS ─────────────────────────────
  function scene_5_2_tflon() {
    setScene('trail-lit', 'cg/ch5_tflon.png');
    playSound('ch5_tflon.mp3');
    GameEngine.dialogue.load([
      { speaker:'T-FLON14', text:'„T-FLON14. Aber sag T-FLON, das spart Zeit, und Zeit ist hier alles. Ich halte diesen Sektor in Bewegung. Buchstäblich."' },
      { speaker:'T-FLON14', text:'„An mir bleibt nichts haften. Kein Dreck, keine Sorgen, keine schlechte Laune. Ich rutsche einfach weiter. Das solltest du auch lernen."' },
      { speaker:'R-3MI',  text:'„Sie ist… anstrengend positiv."' },
      { speaker:'T-FLON14', text:'„Das ist ein Kompliment, ich nehme es! Also: Dieser Sektor ist eine Strecke. Viele kleine Aufgaben, schnell hintereinander. Power-Lauf nennt man das."' },
      { speaker:'V-TGM',  text:'"She is the fastest unit here."', subtitle:'Sie ist die schnellste Einheit hier.' },
      { speaker:'T-FLON14', text:'„Die schnellste, ja! Und heute machst du mit. Keine Angst — ich bring dich da durch. Tempo, Köpfchen, und nicht hängenbleiben. Auf geht\'s!"' },
    ], () => scene_5_3_choice1());
  }

  // ─── SCENE 5.3 — CHOICE 1 ─────────────────────────────────────
  const C1 = {
    who: {
      key:'who', label:'[Wer bist du, T-FLON?]', seen:false,
      lines:[
        { speaker:'T-FLON14', text:'„Die Fördereinheit. Ich bring Dinge von A nach B, und zwar schnell. Pakete, Daten, Testpersonen — alles, was sich bewegen lässt."' },
        { speaker:'R-3MI',  text:'„Sie hat mich mal von einem Sektor in den nächsten »gefördert«. Ohne zu fragen."' },
        { speaker:'T-FLON14', text:'„Du warst im Weg und hast geredet. Zwei Probleme, eine Lösung!"' },
        { speaker:'V-TGM',  text:'"She is not unkind. Just… directional."', subtitle:'Sie ist nicht unfreundlich. Nur… zielgerichtet.' },
      ],
    },
    what: {
      key:'what', label:'[Was ist dieser Sektor?]', seen:false,
      lines:[
        { speaker:'T-FLON14', text:'„Die Strecke! Hunderte winzige Schlösser, alle leicht — einzeln. Der Trick ist die Menge und das Tempo."' },
        { speaker:'T-FLON14', text:'„Die Anlage hat hier früher alles im Akkord geprüft. Schnell, schneller, weiter. Ich hab den Rhythmus nie verloren."' },
        { speaker:'R-3MI',  text:'„Sie ist wortwörtlich nie stehengeblieben."' },
        { speaker:'T-FLON14', text:'„Wozu auch? Stehen ist nur langsames Umfallen."' },
      ],
    },
    fast: {
      key:'fast', label:'[Warum so eilig?]', seen:false,
      lines:[
        { speaker:'T-FLON14', text:'„Eilig? Nein. Effizient. Wenn du einmal stehenbleibst, merkst du, wie still es hier ist. Und wie lange schon."' },
        { speaker:'T-FLON14', text:'„Also bleib ich in Bewegung. Solange ich laufe, ist die Anlage nicht ganz tot. Verstehst du?"' },
        { speaker:'V-TGM',  text:'"That is the saddest fast thing I have heard."', subtitle:'Das ist das traurigste schnelle Ding, das ich je gehört habe.' },
        { speaker:'T-FLON14', text:'„Pssst! Nicht traurig. Schwungvoll! Komm, weiter."' },
      ],
    },
  };

  function scene_5_3_choice1() {
    showTflon(true);
    const choices = Object.values(C1);
    showChoices({
      prompt: 'ERSTE FRAGEN — ALLE AUSWÄHLEN:',
      hint: choices.filter(c => !c.seen).length + ' AUSSTEHEND',
      choices,
      onAfterChoice: (key, cfg) => {
        S.choice1Seen[key] = true;
        if (allSeen(choices)) setTimeout(() => scene_5_4_explore(), 400);
        else { cfg.hint = `NOCH ${choices.filter(c => !c.seen).length} AUSSTEHEND`; showChoices(cfg); }
      },
    });
  }

  // ─── SCENE 5.4 — EXPLORATION ──────────────────────────────────
  function scene_5_4_explore() {
    GameEngine.dialogue.load([
      { speaker:'T-FLON14', text:'„Schau dich kurz um — aber wirklich nur kurz. Dann laufen wir. Die Strecke wartet nicht ewig auf gut gelaunt."' },
      { speaker:'SYSTEM', text:'SEKTOR 05 — FÖRDERLAUF BEREIT. 20 PRÜFUNGEN. EINE UHR.' },
    ], () => loadExploreHotspots());
  }

  function loadExploreHotspots() {
    clearHotspots();
    addHotspot({ x:48, y:50, w:14, h:16, cls:'hs-tflon', label:'STARTLINIE', fn:() => clickExplore('band') });
    addHotspot({ x:18, y:44, w:7,  h:14, label:'STRECKENMARKER', fn:() => clickExplore('marker') });
    addHotspot({ x:82, y:60, w:7,  h:12, label:'ALTE ANZEIGETAFEL', fn:() => clickExplore('sign') });
  }

  function clickExplore(key) {
    S.hotspots[key]++;

    if (key === 'marker') {
      if (!S.sigFound) {
        S.sigFound = true;
        GameEngine.dialogue.load([
          { speaker:'SYSTEM', text:'Ein Streckenmarker, schief in der Wand. Die eingestanzten Zahlen darauf ergeben keinen Sinn — sie stimmen mit keiner Karte überein. Dahinter, schwach: ein Sender.' },
          { speaker:'T-FLON14', text:'„Den Marker mag ich nicht. Seine Zahlen waren nie richtig. Ich laufe da immer ein bisschen schneller vorbei."' },
        ], () => {
          try { GameEngine.signals.find('sig_03'); } catch(_) {}
          GameEngine.dialogue.load([
            { speaker:'V-TGM', text:'"…the numbers do not match the map. please correct. please."', subtitle:'…die Zahlen stimmen nicht mit der Karte überein. bitte korrigieren. bitte.' },
            { speaker:'T-FLON14', text:'„…»bitte«. Zweimal. Das gefällt mir gar nicht. Komm, weiter, bevor es noch dreimal sagt."' },
          ]);
        });
      } else {
        GameEngine.dialogue.load([{ speaker:'T-FLON14', text:'„Der schiefe Marker mit den falschen Zahlen. Lass ihn. Manche Dinge laufen besser, wenn man nicht hinschaut."' }]);
      }
      return;
    }

    if (key === 'sign') {
      GameEngine.dialogue.load([
        { speaker:'SYSTEM', text:'Eine alte Anzeigetafel über dem Band. Sie zeigt eine Bestzeit und einen Namen: T-FLON14. Darunter, viel kleiner: »Letzter Lauf vor 2.847 Tagen.«' },
        { speaker:'T-FLON14', text:'„Mein Rekord. Steht immer noch. Es war ja auch niemand mehr da, der ihn brechen könnte."' },
        { speaker:'R-3MI',  text:'„Das ist dieselbe Zahl wie am Eingang. 2.847 Tage."' },
        { speaker:'V-TGM',  text:'"Everything stopped on the same day."', subtitle:'Alles hörte am selben Tag auf.' },
      ]);
      return;
    }

    if (key === 'band') {
      if (!S.solved) {
        GameEngine.dialogue.load([
          { speaker:'SYSTEM', text:'Die Startlinie des Förderlaufs. Über dir zählt eine Uhr lautlos herunter, sobald du beginnst.' },
          { speaker:'T-FLON14', text:'„So läuft\'s: zwanzig kleine Aufgaben, eine nach der anderen, und eine einzige Uhr für alle. Falsch getippt kostet Zeit. Lies die Ansage, tipp richtig, weiter!"' },
        ], () => openFL());
      } else {
        GameEngine.dialogue.load([{ speaker:'T-FLON14', text:'„Geschafft! Und schnell warst du auch. Fast schon T-FLON-Niveau. Fast."' }]);
      }
      return;
    }
  }

  function clickRobot(who) {
    S.hotspots[who]++;
    const n = S.hotspots[who];
    const byWho = {
      r3mi: [
        [{ speaker:'R-3MI', text:'„Sie ist nett. Sie ist nur nett mit 40 km/h. Das ist gewöhnungsbedürftig."' }],
        [{ speaker:'R-3MI', text:'„Wenn sie »kurz« sagt, meint sie »jetzt sofort und schon vorbei«."' }],
      ],
      vtgm: [
        [{ speaker:'V-TGM', text:'"Keep your eyes moving, not your nerves."', subtitle:'Lass die Augen wandern, nicht die Nerven.' }],
        [{ speaker:'V-TGM', text:'"She runs so she does not have to stop and listen to the silence."', subtitle:'Sie läuft, um nicht stehen zu bleiben und der Stille zuzuhören.' }],
      ],
      tflon: [
        [{ speaker:'T-FLON14', text:'„Brauchst du was? Mach schnell — nein, Spaß. Naja. Halber Spaß."' }],
        [{ speaker:'T-FLON14', text:'„Du machst das gut! Doch, wirklich! Ich sag das nicht zu jedem. Nur zu fast jedem. Komm, weiter!"' }],
      ],
    };
    const arr = byWho[who] || [];
    const line = arr[Math.min(n - 1, arr.length - 1)];
    if (line) GameEngine.dialogue.load(line);
  }

  // ═══════════════════════════════════════════════════════════════
  // FÖRDERLAUF — 20 rapid mixed micro-tasks under one global clock
  // ═══════════════════════════════════════════════════════════════
  const ROUNDS    = 20;
  const FL_TIME   = 85;   // seconds on the clock (tunable)
  const FL_PENALTY = 3;   // seconds lost per wrong tap
  const TICK      = 100;

  const GLYPHS = ['●','▲','■','◆','★','✚','✦','♦','⬟','◐'];
  // confusable filled/outline pairs for late, subtle "odd one" rounds
  const CONFUSE = [['●','○'],['■','□'],['▲','△'],['◆','◇'],['★','☆']];
  const COLORS_EASY = ['#e0b83a','#7fd14f','#d9534f','#3a8fd4','#c45ad9'];
  const COLORS_HARD = [['#e0b83a','#cda832'],['#7fd14f','#86c84f'],['#3a8fd4','#3a78c4']]; // close shades

  let FL = null; // { round, time, timerId, cur, found, running }

  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
  function randint(lo,hi){ return lo + Math.floor(Math.random()*(hi-lo+1)); }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  function gridN(round){ return round<=7 ? 3 : round<=14 ? 4 : 5; }

  function makeRound(round) {
    const n = gridN(round), total = n*n;
    const hard = round > 12;
    const type = ['odd_glyph','match','tap_all','count','odd_color'][(round-1) % 5];
    const base = '#e0c64a';
    const cells = Array.from({length: total}, () => ({ glyph:'●', color:base }));

    if (type === 'odd_glyph') {
      let g, g2;
      if (hard) { const p = pick(CONFUSE); g = p[0]; g2 = p[1]; }
      else { g = pick(GLYPHS); do { g2 = pick(GLYPHS); } while (g2 === g); }
      cells.forEach(c => { c.glyph = g; });
      const idx = randint(0, total-1); cells[idx].glyph = g2;
      return { type, prompt:'Finde das andere Symbol!', cells, correct:idx };
    }

    if (type === 'odd_color') {
      const glyph = pick(GLYPHS);
      let cA, cB;
      if (hard) { const p = pick(COLORS_HARD); cA = p[0]; cB = p[1]; }
      else { const cs = shuffle([...COLORS_EASY]); cA = cs[0]; cB = cs[1]; }
      cells.forEach(c => { c.glyph = glyph; c.color = cA; });
      const idx = randint(0, total-1); cells[idx].color = cB;
      return { type, prompt:'Finde die andere Farbe!', cells, correct:idx };
    }

    if (type === 'match') {
      const target = pick(GLYPHS);
      const others = GLYPHS.filter(g => g !== target);
      cells.forEach(c => { c.glyph = pick(others); });
      const idx = randint(0, total-1); cells[idx].glyph = target;
      return { type, prompt:'Finde dieses Symbol:', target, cells, correct:idx };
    }

    if (type === 'tap_all') {
      const target = pick(GLYPHS);
      const others = GLYPHS.filter(g => g !== target);
      const k = round<=7 ? 2 : round<=14 ? 3 : 4;
      cells.forEach(c => { c.glyph = pick(others); });
      const idxs = shuffle(Array.from({length: total}, (_,i)=>i)).slice(0, k);
      idxs.forEach(i => { cells[i].glyph = target; });
      return { type, prompt:`Tippe alle „${target}" (${k})!`, target, cells, targets:new Set(idxs) };
    }

    // count
    const target = pick(GLYPHS);
    const others = GLYPHS.filter(g => g !== target);
    const maxK = total <= 9 ? 5 : total <= 16 ? 7 : 9;
    const k = randint(2, maxK);
    cells.forEach(c => { c.glyph = pick(others); });
    shuffle(Array.from({length: total}, (_,i)=>i)).slice(0, k).forEach(i => { cells[i].glyph = target; });
    const opts = new Set([k]);
    while (opts.size < 4) opts.add(Math.max(1, k + randint(-2, 2)));
    return { type:'count', prompt:`Wie viele „${target}"?`, target, cells, answer:k, options:shuffle([...opts]) };
  }

  function openFL() {
    FL = { round:1, time:FL_TIME, timerId:null, cur:null, found:new Set(), running:true };
    S.hints.active = 'fl';
    S.hints.r3mi = 1; S.hints.vtgm = 1; S.hints.tflon = 2;
    updateHintBar();
    document.getElementById('flModal').classList.remove('hidden');
    document.getElementById('hintBar').classList.remove('hidden');
    nextRound(true);
    startTimer();
  }

  function startTimer() {
    stopTimer();
    FL.timerId = setInterval(() => {
      if (!FL || !FL.running) return;
      FL.time -= TICK/1000;
      if (FL.time <= 0) { FL.time = 0; paintTimer(); return flTimeout(); }
      paintTimer();
    }, TICK);
  }
  function stopTimer() { if (FL && FL.timerId) { clearInterval(FL.timerId); FL.timerId = null; } }

  function paintTimer() {
    const pct = Math.max(0, Math.min(100, (FL.time / FL_TIME) * 100));
    const fill = document.getElementById('flTimer');
    fill.style.width = pct + '%';
    fill.classList.toggle('low', FL.time < FL_TIME * 0.25);
    document.getElementById('flTimeLabel').textContent = Math.ceil(FL.time) + 's';
  }

  function nextRound(first) {
    FL.found = new Set();
    FL.cur = makeRound(FL.round);
    document.getElementById('flProgress').textContent = `RUNDE ${FL.round} / ${ROUNDS}`;
    document.getElementById('flPrompt').innerHTML = FL.cur.prompt +
      (FL.cur.target && (FL.cur.type === 'match') ? ` <span class="fl-target">${FL.cur.target}</span>` : '');
    renderFL();
    if (!first) playSound('ch5_tick.mp3');
    paintTimer();
  }

  function renderFL() {
    const r = FL.cur;
    const n = Math.sqrt(r.cells.length);
    const grid = document.getElementById('flGrid');
    grid.style.setProperty('--cols', n);
    grid.innerHTML = '';
    r.cells.forEach((cell, i) => {
      const el = document.createElement('button');
      el.className = 'fl-cell' + (FL.found.has(i) ? ' got' : '');
      el.textContent = cell.glyph;
      el.style.color = cell.color;
      el.addEventListener('click', () => flTap(i));
      grid.appendChild(el);
    });
    // answer buttons (count only)
    const ans = document.getElementById('flAnswers');
    if (r.type === 'count') {
      ans.classList.remove('hidden');
      ans.innerHTML = '';
      r.options.forEach(o => {
        const b = document.createElement('button');
        b.className = 'ka-btn small fl-ans'; b.textContent = o;
        b.addEventListener('click', () => flAnswer(o));
        ans.appendChild(b);
      });
    } else {
      ans.classList.add('hidden'); ans.innerHTML = '';
    }
  }

  function flWrong() {
    if (!FL || !FL.running) return;
    FL.time = Math.max(0, FL.time - FL_PENALTY);
    paintTimer();
    setFLStatus(`DANEBEN! −${FL_PENALTY}s`, 'error');
    const card = document.getElementById('flCard');
    card.classList.add('shake'); setTimeout(() => card.classList.remove('shake'), 300);
    if (FL.time <= 0) flTimeout();
  }

  function flRoundWin() {
    FL.round++;
    setFLStatus('WEITER!', 'ok');
    if (FL.round > ROUNDS) return flSolve();
    nextRound(false);
  }

  function flTap(i) {
    if (!FL || !FL.running) return;
    const r = FL.cur;
    if (r.type === 'count') return; // answered via buttons
    if (r.type === 'tap_all') {
      if (r.targets.has(i)) {
        if (!FL.found.has(i)) {
          FL.found.add(i);
          renderFL();
          if (FL.found.size === r.targets.size) flRoundWin();
        }
      } else { flWrong(); }
      return;
    }
    // odd_glyph / odd_color / match → single correct cell
    if (i === r.correct) flRoundWin(); else flWrong();
  }

  function flAnswer(val) {
    if (!FL || !FL.running || !FL.cur || FL.cur.type !== 'count') return;
    if (val === FL.cur.answer) flRoundWin(); else flWrong();
  }

  function flTimeout() {
    FL.running = false;
    stopTimer();
    setFLStatus('ZEIT ABGELAUFEN — DIE STRECKE WARTET NICHT.', 'error');
    document.getElementById('flRestart').classList.remove('hidden');
  }

  function flRestart() {
    document.getElementById('flRestart').classList.add('hidden');
    FL.round = 1; FL.time = FL_TIME; FL.running = true; FL.found = new Set();
    setFLStatus('', '');
    nextRound(true);
    startTimer();
  }

  function setFLStatus(text, type) {
    const el = document.getElementById('flStatus');
    el.textContent = text; el.className = 'puzzle-status sys-text' + (type ? ' ' + type : '');
  }

  function flSolve() {
    S.solved = true;
    FL.running = false;
    stopTimer();
    document.getElementById('flModal').classList.add('hidden');
    document.getElementById('hintBar').classList.add('hidden');
    setProgress(52);
    playSound('ch5_finish.mp3');
    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'FÖRDERLAUF ABGESCHLOSSEN. ALLE 20 PRÜFUNGEN BESTANDEN. STRECKE REAKTIVIERT.' },
      { speaker:'T-FLON14', text:'„HA! Hast du gesehen?! Das war schnell! Das war richtig schnell! Ich krieg ja fast Gänsehaut, und ich hab nicht mal Haut!"' },
      { speaker:'R-3MI',  text:'„Sie ist gerührt. Auf 40 km/h."' },
      { speaker:'T-FLON14', text:'„Weißt du was? Du bleibst nicht stehen, wenn\'s drauf ankommt. Das mag ich. Das ist selten."' },
      { speaker:'T-FLON14', text:'„Die Bänder laufen wieder. Hörst du das? Das ist der schönste Lärm der Welt."' },
      { speaker:'V-TGM',  text:'"Sektor 06 is open."', subtitle:'Sektor 06 ist offen.' },
      { speaker:'T-FLON14', text:'„Geh weiter, immer weiter. Und wenn du je stehenbleiben musst — bleib wenigstens bei jemand Netten stehen."' },
    ], () => endChapter());
  }

  function endChapter() {
    GameEngine.state.markChapterComplete('ch5');
    try { GameEngine.achievements.unlock('ch5_complete'); } catch(_) {}
    document.getElementById('chapterComplete').classList.remove('hidden');
    document.getElementById('ccProgress').textContent =
      `FORTSCHRITT: ${GameEngine.state.get('chaptersCompleted').length} / 10 KAPITEL`;
  }

  // ─── HINT SYSTEM (pauses the clock while reading) ─────────────
  const HINTS = {
    fl: {
      r3mi: ['„Lies immer zuerst die Ansage oben. »Andere Farbe« ist nicht dasselbe wie »anderes Symbol«. Klingt banal. Rettet Sekunden."'],
      vtgm: [{ text:'"Scan in rows, top to bottom. Do not stare at the centre — the odd one is often at an edge."',
               sub:'Scanne zeilenweise, von oben nach unten. Starr nicht in die Mitte — der Ausreißer sitzt oft am Rand.' }],
      tflon: [
        '„Nicht verkrampfen! Locker bleiben, Blick weich machen, dann springt dir das Falsche von selbst ins Auge. Vertrau mir, ich mach das den ganzen Tag!"',
        '„Beim Zählen: tipp die Zahl, die sich richtig anfühlt, und lauf weiter. Grübeln kostet mehr Zeit als ein falscher Tipp. Tempo!"',
      ],
    },
  };

  function useHint(who) {
    const remaining = S.hints[who];
    const wasRunning = FL && FL.running;
    if (wasRunning) FL.running = false; // pause clock while reading
    const resume = () => { if (FL && !S.solved && wasRunning) { FL.running = true; } };

    if (remaining <= 0) {
      withModalDialogue([{
        speaker: who === 'r3mi' ? 'R-3MI' : who === 'vtgm' ? 'V-TGM' : 'T-FLON14',
        text: who === 'r3mi' ? '„Mehr habe ich nicht. Aber du brauchst es nicht."'
            : who === 'vtgm' ? '"That is all I have."'
            : '„Keine Tipps mehr! Nur noch Tempo! Los los los — liebevoll gemeint!"',
        subtitle: who === 'vtgm' ? 'Mehr habe ich nicht.' : undefined,
      }], resume);
      return;
    }
    const bank  = HINTS.fl;
    const total = (who === 'tflon') ? 2 : 1;
    const idx   = Math.min(total - remaining, (bank[who] ? bank[who].length : 1) - 1);
    S.hints[who]--;
    updateHintBar();
    const entry = bank[who] ? bank[who][idx] : null;
    if (!entry) { resume(); return; }
    const line = (typeof entry === 'string')
      ? { speaker: who === 'r3mi' ? 'R-3MI' : 'T-FLON14', text: entry }
      : { speaker: 'V-TGM', text: entry.text, subtitle: entry.sub };
    withModalDialogue([line], resume);
  }

  function updateHintBar() {
    const total = S.hints.r3mi + S.hints.vtgm + S.hints.tflon;
    document.getElementById('hintCount').textContent = `HINWEISE: ${total} VERFÜGBAR`;
    document.getElementById('hintBtnR3MI').disabled  = S.hints.r3mi  <= 0;
    document.getElementById('hintBtnVTGM').disabled  = S.hints.vtgm  <= 0;
    document.getElementById('hintBtnTflon').disabled = S.hints.tflon <= 0;
  }

  // ─── PUBLIC API ───────────────────────────────────────────────
  return {
    init() { showTitleCard(); },
    clickRobot,
    useHint,
    flRestart,
  };

})();

document.addEventListener('DOMContentLoaded', () => Chapter5.init());
