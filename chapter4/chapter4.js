/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 04 — RÄTSELSEKTOR
 * Guest character: B-RADF1SH (Armin) — warm veteran who is always the
 *   first, everywhere, at everything; builder of the facility's hardest,
 *   never-solved lock ("der Würfel"); hosts a monthly Stammtisch.
 *
 * Scene flow:
 *   4.0 Title card
 *   4.1 Arrival — the puzzle vault sector
 *   4.2 Encounter with B-RADF1SH
 *   4.3 Choice 1: first questions (3 to see)
 *   4.4 Exploration (one hotspot hides Signalnische sig_02 — brauner Kasten)
 *   4.5 PUZZLE 1 — PERSPEKTIVE (warm-up: 3×3×3 maze, generous switches)
 *   4.6 PUZZLE 2 — DER WÜRFEL (3×4×4 staircase, min 6 switches)
 *   4.7 Ending → Sektor 05 freigegeben
 *
 * "Der Würfel" is a 3D grid you can only ever see as a flat 2D slice:
 *   FRONT view moves width (X) + height (Y); TOP view moves width (X) +
 *   depth (Z). Goal is at a different height AND depth → you must alternate
 *   views; switches are limited → you must plan. Switching pitches the cube
 *   with a 90° flip so the rotation axis is visible.
 *   Mazes BFS-verified: warm-up min 2 switches, Würfel min 6.
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter4 = (() => {
  'use strict';

  const S = {
    choice1Seen: { who:false, what:false, cube:false },
    hotspots: { cube:0, board:0, kasten:0, r3mi:0, vtgm:0, bradfish:0 },
    sigFound: false,
    p1Solved: false,
    p2Solved: false,
    hints: { r3mi:1, vtgm:1, bradfish:2, active:null }, // 4 total
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
  function showRobots(v)   { document.getElementById('robotIcons').classList.toggle('hidden', !v); }
  function showBradfish(v) { document.getElementById('bradfishIcon').classList.toggle('hidden', !v); }
  function setProgress(pct){ const el = document.getElementById('reactProgress'); if (el) el.textContent = `REAKTIVIERUNG: ${pct}%`; }
  function playSound(src)  { try { const a = new Audio(`audio/${src}`); a.play(); } catch(_) {} }

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

  function withModalDialogue(lines, after) {
    const modal = document.getElementById('persModal');
    const wasOpen = modal && !modal.classList.contains('hidden');
    if (wasOpen) modal.classList.add('hidden');
    GameEngine.dialogue.load(lines, () => {
      if (wasOpen) modal.classList.remove('hidden');
      if (after) after();
    });
  }

  // ─── SCENE 4.0 — TITLE CARD ───────────────────────────────────
  function showTitleCard() {
    const card = document.getElementById('titleCard');
    setTimeout(() => {
      card.classList.add('fading');
      setTimeout(() => { card.style.display = 'none'; scene_4_1_arrival(); }, 700);
    }, 3000);
  }

  // ─── SCENE 4.1 — ARRIVAL ──────────────────────────────────────
  function scene_4_1_arrival() {
    setScene('vault-dim', 'cg/ch4_vault.png');
    clearHotspots();
    showRobots(true);
    showBradfish(false);
    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'SEKTOR 04 — RÄTSELSEKTOR. Hier hat die Anlage ihre schwierigsten Verschlüsse gelagert. Die Wände tragen verwitterte Zeichen. Der Boden ist ein Raster aus alten Steinplatten.' },
      { speaker:'SYSTEM', text:'In der Mitte schwebt ein massiver Würfel aus Stein und Messing. Schaut man ihn an, wirkt er größer von innen als von außen — als wäre er ein Raum, der sich versteckt.' },
      { speaker:'R-3MI',  text:'„Oh nein. Ich kenne diesen Würfel. Den hat… er gebaut."' },
      { speaker:'V-TGM',  text:'"The one no visitor ever solved."', subtitle:'Den nie ein Besucher gelöst hat.' },
      { speaker:'R-3MI',  text:'„Bitte sag mir, dass er nicht—"' },
      { speaker:'B-RADF1SH', text:'„—da ist! Natürlich bin ich da. Wer denn sonst? Ich war zuerst hier. Ich bin immer zuerst da."' },
    ], () => scene_4_2_bradfish());
  }

  // ─── SCENE 4.2 — B-RADF1SH APPEARS ────────────────────────────
  function scene_4_2_bradfish() {
    setScene('vault-lit', 'cg/ch4_bradfish.png');
    playSound('ch4_bradfish.mp3');
    GameEngine.dialogue.load([
      { speaker:'B-RADF1SH', text:'„B-RADF1SH. Aber sag ruhig Armin. Der, der überall zuerst ist, Rätselbauer, und — wenn man ehrlich ist — der Grund, warum dieser Sektor einen so schlechten Ruf hat."' },
      { speaker:'B-RADF1SH', text:'„Gelb ist meine Farbe — wie mein Fisch. Und »zuerst« ist mein Lieblingswort. Egal welche Tür, welches Rätsel, welcher Sektor: Ich bin schon da, bevor du ankommst."' },
      { speaker:'R-3MI',  text:'„Er ruft zu allem als Erster »fertig«. Sogar zu Dingen, die noch gar nicht angefangen haben."' },
      { speaker:'B-RADF1SH', text:'„Zuerst ist zuerst."' },
      { speaker:'V-TGM',  text:'"He is harmless. Mostly."', subtitle:'Er ist harmlos. Meistens.' },
      { speaker:'B-RADF1SH', text:'„Harmlos! Charmant! Und ich mache die besten Rätsel der ganzen Anlage. Eines davon hat noch nie jemand geknackt. Mein Würfel."' },
      { speaker:'B-RADF1SH', text:'„Vielleicht hast du ja Glück. Oder Verstand. Beides hilft. Eines reicht."' },
    ], () => scene_4_3_choice1());
  }

  // ─── SCENE 4.3 — CHOICE 1 ─────────────────────────────────────
  const C1 = {
    who: {
      key:'who', label:'[Wer bist du, Armin?]', seen:false,
      lines:[
        { speaker:'B-RADF1SH', text:'„Ein alter Hase. Ich war schon hier, als die Anlage noch lief. Bei jedem Rätsel zuerst durch. Hinter jeder Tür, die sich öffnen ließ, zuerst."' },
        { speaker:'R-3MI',  text:'„Zuerst, zuerst, zuerst. Er erwähnt das… auffällig oft."' },
        { speaker:'B-RADF1SH', text:'„Die Testperson versteht es. Du hast den Blick von jemandem, der schon mal vor einer Tür gestanden hat, die sich einfach nicht öffnen wollte — und trotzdem geblieben ist."' },
        { speaker:'V-TGM',  text:'"That is oddly specific."', subtitle:'Das ist seltsam genau.' },
        { speaker:'B-RADF1SH', text:'„Ich beobachte. Anders als L-UX rede ich nur nicht die ganze Zeit darüber."' },
      ],
    },
    what: {
      key:'what', label:'[Was ist dieser Sektor?]', seen:false,
      lines:[
        { speaker:'B-RADF1SH', text:'„Das Rätselarchiv. Hier hat die Anlage alles weggeschlossen, was zu wertvoll war, um es offen herumstehen zu lassen."' },
        { speaker:'B-RADF1SH', text:'„Ein einziges Schloss bewacht es: mein Würfel. Und der ist… nun ja. Sagen wir: gründlich."' },
        { speaker:'R-3MI',  text:'„»Gründlich« heißt bei ihm »gemein«."' },
        { speaker:'B-RADF1SH', text:'„Gemein mit Liebe. Das ist ein Unterschied."' },
      ],
    },
    cube: {
      key:'cube', label:'[Erzähl mir von deinem Würfel.]', seen:false,
      lines:[
        { speaker:'B-RADF1SH', text:'„Ah. Mein Würfel. Mein Meisterstück. Keinen Namen hat er, keine Inschrift — Namen verraten zu viel."' },
        { speaker:'B-RADF1SH', text:'„Es ist kein Würfel, den man dreht. Es ist ein Raum, durch den man geht — aber du siehst immer nur eine Seite davon. Mal von vorn, mal von oben."' },
        { speaker:'V-TGM',  text:'"Two flat views of one solid space."', subtitle:'Zwei flache Ansichten eines festen Raums.' },
        { speaker:'B-RADF1SH', text:'„Von vorn kommst du in die Höhe. Von oben in die Tiefe. Und wechseln darfst du nur ein paar Mal. Deshalb hat ihn noch nie jemand geknackt. Niemand."' },
        { speaker:'B-RADF1SH', text:'„Komm trotzdem zum Stammtisch. Gescheiterte sind dort herzlich willkommen — wir sind fast alle welche."' },
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

  // ─── SCENE 4.4 — EXPLORATION ──────────────────────────────────
  function scene_4_4_explore() {
    GameEngine.dialogue.load([
      { speaker:'B-RADF1SH', text:'„Schau dich um. Echte Rätselleute schauen immer erst, bevor sie anfassen. Und dann fassen sie das Falsche an. Das gehört dazu."' },
      { speaker:'SYSTEM', text:'SEKTOR 04 — EIN VERSCHLUSS AKTIV: DER WÜRFEL.' },
    ], () => loadExploreHotspots());
  }

  function loadExploreHotspots() {
    clearHotspots();
    addHotspot({ x:46, y:42, w:14, h:18, cls:'hs-bradfish', label:'WÜRFEL', fn:() => clickExplore('cube') });
    addHotspot({ x:16, y:40, w:7,  h:14, label:'LAGERPLAN',     fn:() => clickExplore('board') });
    addHotspot({ x:85, y:78, w:6,  h:8,  label:'BRAUNER KASTEN', fn:() => clickExplore('kasten') });
  }

  function clickExplore(key) {
    S.hotspots[key]++;

    if (key === 'kasten') {
      if (!S.sigFound) {
        S.sigFound = true;
        GameEngine.dialogue.load([
          { speaker:'SYSTEM', text:'Eine braune Plastikbox, halb unter Geröll, mit Kratzern und alten Wasserflecken. Innen blinkt schwach ein Sender — und sendet noch immer.' },
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

    if (key === 'board') {
      GameEngine.dialogue.load([
        { speaker:'SYSTEM', text:'Ein alter Lagerplan: ein Rechteck mit vier Toren, exakt nach den Himmelsrichtungen ausgerichtet. Die Aufschrift ist verwittert — nur das Wort für eine Königin lässt sich noch erahnen.' },
        { speaker:'B-RADF1SH', text:'„Vier Tore, ein Lager, uralt. Älter als die Anlage — älter als fast alles in der Stadt da draußen. Aber pssst. Namen verraten zu viel."' },
      ]);
      return;
    }

    if (key === 'cube') {
      if (!S.p1Solved) {
        GameEngine.dialogue.load([
          { speaker:'SYSTEM', text:'Der Würfel ist in Wahrheit ein begehbarer Raum aus Zellen — sichtbar nur als flache Schnittbilder: einmal von vorn, einmal von oben.' },
          { speaker:'B-RADF1SH', text:'„Erst die Übung. Klein, harmlos, fast freundlich. Lern den Trick. Dann der echte Würfel — der ist keins von beidem."' },
        ], () => openMaze('warmup'));
      } else if (!S.p2Solved) {
        openMaze('cube');
      } else {
        GameEngine.dialogue.load([{ speaker:'B-RADF1SH', text:'„Gelöst. Mein Würfel. Ich verarbeite das immer noch."' }]);
      }
      return;
    }
  }

  function clickRobot(who) {
    S.hotspots[who]++;
    const n = S.hotspots[who];
    const byWho = {
      r3mi: [
        [{ speaker:'R-3MI', text:'„Armin ist… eigentlich nett. Das ist das Verstörende daran. Nette Leute, die unlösbare Rätsel bauen."' }],
        [{ speaker:'R-3MI', text:'„Vorne Höhe, oben Tiefe. Sag es dir vor wie ein Gebet. Es hilft. Mir nicht, aber dir vielleicht."' }],
      ],
      vtgm: [
        [{ speaker:'V-TGM', text:'"He has waited a long time for someone to finish his cube."', subtitle:'Er hat lange auf jemanden gewartet, der seinen Würfel löst.' }],
        [{ speaker:'V-TGM', text:'"Plan the whole route before you move. Switches are precious."', subtitle:'Plane die ganze Route, bevor du dich bewegst. Wechsel sind kostbar.' }],
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
  // PUZZLE — PERSPEKTIVE / DER WÜRFEL  (2D↔3D dual-projection maze)
  // ═══════════════════════════════════════════════════════════════
  const MAZES = {
    warmup: {
      dims: [3, 3, 3], start: { x:0, y:0, z:0 }, goal: { x:2, y:2, z:2 },
      budget: 5, startView: 'front',
      walls: [[0,1,0],[1,1,0],[2,1,0],[0,2,0],[1,2,0],[2,2,0]],
    },
    cube: {
      dims: [3, 4, 4], start: { x:0, y:0, z:0 }, goal: { x:2, y:3, z:3 },
      budget: 7, startView: 'front',
      walls: [[0,0,2],[0,0,3],[0,1,0],[0,1,3],[0,2,0],[0,2,1],[0,3,0],[0,3,1],[0,3,2],
              [1,0,2],[1,0,3],[1,1,0],[1,1,3],[1,2,0],[1,2,1],[1,3,0],[1,3,1],[1,3,2],
              [2,0,2],[2,0,3],[2,1,0],[2,1,3],[2,2,0],[2,2,1],[2,3,0],[2,3,1],[2,3,2]],
    },
  };

  let pz = null; // { key, x, y, z, view, switches, animating }

  function wallAt(m, x, y, z) {
    return m.walls.some(w => w[0] === x && w[1] === y && w[2] === z);
  }

  function openMaze(key) {
    const m = MAZES[key];
    pz = { key, x:m.start.x, y:m.start.y, z:m.start.z, view:m.startView || 'front', switches:m.budget, animating:false };
    S.hints.active = (key === 'cube') ? 'p2' : 'p1';
    S.hints.r3mi = 1; S.hints.vtgm = 1; S.hints.bradfish = 2;
    updateHintBar();

    document.getElementById('persTitle').textContent = (key === 'cube')
      ? 'DER WÜRFEL' : 'PERSPEKTIVE — ÜBUNG';
    document.getElementById('persSub').textContent = (key === 'cube')
      ? 'NAVIGIERE DEN WÜRFEL — WECHSLE ANSICHTEN, ABER SPARSAM'
      : 'ÜBUNG: ERREICHE DAS ZIEL MIT BEIDEN ANSICHTEN';

    document.getElementById('persModal').classList.remove('hidden');
    document.getElementById('hintBar').classList.remove('hidden');
    const grid = document.getElementById('persGrid');
    if (grid) { grid.style.transition = 'none'; grid.style.transform = 'rotateX(0deg)'; grid.style.opacity = '1'; }
    setPersStatus(key === 'cube' ? 'Plane, bevor du wechselst.' : 'Vorne = Höhe, Oben = Tiefe.', '');
    renderMaze();
  }

  function renderMaze() {
    if (!pz) return;
    const m = MAZES[pz.key];
    const [W, H, D] = m.dims;
    const isFront = pz.view === 'front';

    document.getElementById('persView').textContent =
      isFront ? 'VORDERANSICHT · BREITE × HÖHE' : 'DRAUFSICHT · BREITE × TIEFE';
    const sw = document.getElementById('persSwitches');
    sw.textContent = `WECHSEL: ${pz.switches}`;
    sw.className = 'sys-text' + (pz.switches <= 1 ? ' low' : '');
    document.getElementById('persAxes').textContent =
      isFront ? '◀▶ BREITE   ▲▼ HÖHE' : '◀▶ BREITE   ▲▼ TIEFE';

    const rows = isFront ? H : D;
    const grid = document.getElementById('persGrid');
    grid.style.setProperty('--cols', W);
    grid.innerHTML = '';

    for (let r = rows - 1; r >= 0; r--) {       // highest index at top
      for (let c = 0; c < W; c++) {
        const x = c;
        const y = isFront ? r : pz.y;
        const z = isFront ? pz.z : r;
        const cell = document.createElement('div');
        cell.className = 'mz-cell';
        if (wallAt(m, x, y, z)) cell.classList.add('wall');
        const onGoalPlane = isFront
          ? (x === m.goal.x && y === m.goal.y)
          : (x === m.goal.x && z === m.goal.z);
        const goalInSlice = isFront ? (m.goal.z === pz.z) : (m.goal.y === pz.y);
        if (onGoalPlane) cell.classList.add(goalInSlice ? 'goal' : 'goal-ghost');
        if (x === pz.x && y === pz.y && z === pz.z) cell.classList.add('avatar');
        grid.appendChild(cell);
      }
    }

    document.getElementById('persReadout').textContent =
      `DU ${pz.x}·${pz.y}·${pz.z}   ZIEL ${m.goal.x}·${m.goal.y}·${m.goal.z}   (x·y·z)`;
  }

  function persMove(dir) {
    if (!pz || pz.animating) return;
    const m = MAZES[pz.key];
    const [W, H, D] = m.dims;
    let { x, y, z } = pz;
    if (pz.view === 'front') {
      if (dir === 'left') x--; else if (dir === 'right') x++;
      else if (dir === 'up') y++; else if (dir === 'down') y--;
    } else {
      if (dir === 'left') x--; else if (dir === 'right') x++;
      else if (dir === 'up') z++; else if (dir === 'down') z--;
    }
    if (x < 0 || x >= W || y < 0 || y >= H || z < 0 || z >= D) {
      setPersStatus('Rand — kein Weg.', 'warn'); return;
    }
    if (wallAt(m, x, y, z)) { setPersStatus('Wand. Da geht es nicht.', 'error'); return; }
    pz.x = x; pz.y = y; pz.z = z;
    if (x === m.goal.x && y === m.goal.y && z === m.goal.z) { renderMaze(); return solveMaze(); }
    setPersStatus('', '');
    renderMaze();
  }

  function persSwitch() {
    if (!pz || pz.animating) return;
    if (pz.switches <= 0) {
      setPersStatus('Keine Perspektivwechsel mehr. [ ZURÜCKSETZEN ]?', 'error');
      return;
    }
    pz.switches--;
    const toTop = (pz.view === 'front');
    pz.view = toTop ? 'top' : 'front';
    playSound('ch4_switch.mp3');
    setPersStatus('', '');
    flipTo(toTop);
  }

  // Pitch the cube 90° so the player SEES which way it turns:
  // front→top tilts the top toward you; top→front tilts it back.
  function flipTo(toTop) {
    const grid = document.getElementById('persGrid');
    if (!grid) { renderMaze(); return; }
    pz.animating = true;
    const out = toTop ? -90 : 90;
    grid.style.transition = 'transform 0.16s ease-in, opacity 0.16s ease-in';
    grid.style.transform  = `rotateX(${out}deg)`;
    grid.style.opacity    = '0';
    setTimeout(() => {
      renderMaze();                              // swap to new slice while edge-on
      grid.style.transition = 'none';
      grid.style.transform  = `rotateX(${-out}deg)`;
      grid.style.opacity    = '0';
      requestAnimationFrame(() => {
        grid.style.transition = 'transform 0.24s ease-out, opacity 0.24s ease-out';
        grid.style.transform  = 'rotateX(0deg)';
        grid.style.opacity    = '1';
        setTimeout(() => { if (pz) pz.animating = false; }, 250);
      });
    }, 160);
  }

  function persReset() {
    if (!pz || pz.animating) return;
    const m = MAZES[pz.key];
    pz.x = m.start.x; pz.y = m.start.y; pz.z = m.start.z;
    pz.view = m.startView || 'front'; pz.switches = m.budget;
    const grid = document.getElementById('persGrid');
    if (grid) { grid.style.transition = 'none'; grid.style.transform = 'rotateX(0deg)'; grid.style.opacity = '1'; }
    setPersStatus('Zurückgesetzt.', '');
    renderMaze();
  }

  function setPersStatus(text, type) {
    const el = document.getElementById('persStatus');
    el.textContent = text; el.className = 'puzzle-status sys-text' + (type ? ' ' + type : '');
  }

  function solveMaze() {
    const key = pz.key;
    pz = null;
    document.getElementById('persModal').classList.add('hidden');
    document.getElementById('hintBar').classList.add('hidden');
    playSound('ch4_click.mp3');

    if (key === 'warmup') {
      S.p1Solved = true;
      GameEngine.dialogue.load([
        { speaker:'SYSTEM', text:'ÜBUNG ABGESCHLOSSEN. PERSPEKTIV-PROTOKOLL VERSTANDEN.' },
        { speaker:'B-RADF1SH', text:'„Sauber. Du hast den Dreh raus — vorn Höhe, oben Tiefe. Das war das Kinderzimmer."' },
        { speaker:'B-RADF1SH', text:'„Jetzt der echte Würfel. Sechs Wechsel reichen — keiner mehr, wenn du perfekt spielst. Niemand spielt perfekt. Beweis mir das Gegenteil."' },
      ], () => openMaze('cube'));
    } else {
      S.p2Solved = true;
      setProgress(40);
      GameEngine.dialogue.load([
        { speaker:'SYSTEM', text:'DER WÜRFEL // GELÖST. ERSTE LÖSUNG SEIT INBETRIEBNAHME.' },
        { speaker:'B-RADF1SH', text:'„…du hast ihn geknackt. Meinen Würfel. Den NIEMAND knackt. Den ICH gebaut habe, damit ihn niemand knackt."' },
        { speaker:'R-3MI',  text:'„Er ist gerührt. Sehr."' },
        { speaker:'B-RADF1SH', text:'„Ich bin professionell erschüttert! …und ein bisschen stolz. Wer immer zuerst ist, erkennt einen, der auch zuerst ist."' },
        { speaker:'B-RADF1SH', text:'„Komm zum Stammtisch. Jeden Monat, echter Kaffee, echte Rätsel. Wer meinen Würfel löst, hat dort einen Platz auf Lebenszeit."' },
        { speaker:'V-TGM',  text:'"Sektor 05 is open."', subtitle:'Sektor 05 ist offen.' },
      ], () => endChapter());
    }
  }

  function endChapter() {
    GameEngine.state.markChapterComplete('ch4');
    try { GameEngine.audio.fanfare(); } catch(_) {}
    try { GameEngine.achievements.unlock('ch4_complete'); } catch(_) {}
    document.getElementById('chapterComplete').classList.remove('hidden');
    document.getElementById('ccProgress').textContent =
      `FORTSCHRITT: ${GameEngine.state.get('chaptersCompleted').length} / 9 KAPITEL`;
  }

  // ─── HINT SYSTEM ──────────────────────────────────────────────
  const HINTS = {
    p1: {
      r3mi: ['„Zwei Ansichten, mehr nicht. Vorne bewegst du dich in Breite und Höhe, von oben in Breite und Tiefe."'],
      vtgm: [{ text:'"The goal is at a different height AND depth, so you need both views. Switch only when you must."',
               sub:'Das Ziel hat andere Höhe UND Tiefe, also brauchst du beide Ansichten. Wechsle nur, wenn du musst.' }],
      bradfish: [
        '„Schau auf die Zahlen unten: deine Position und das Ziel. Bring zuerst eine Achse zur Deckung, dann wechsle."',
        '„Plane erst, dann lauf. Jeder Wechsel zählt — auch in der Übung."',
      ],
    },
    p2: {
      r3mi: ['„Es ist eine Treppe, die du nicht ganz sehen kannst. Jede Stufe: erst tiefer, dann höher — immer abwechselnd."'],
      vtgm: [{ text:'"Each rung blocks the same direction twice — you are forced to alternate. Plan all six switches before moving."',
               sub:'Jede Stufe blockiert dieselbe Richtung zweimal — du musst abwechseln. Plane alle sechs Wechsel, bevor du dich bewegst.' }],
      bradfish: [
        '„Der Würfel ist eine Wendeltreppe in drei Achsen. Immer im Wechsel: Tiefe, Höhe, Tiefe, Höhe, Tiefe, Höhe."',
        '„Sechs Wechsel reichen — keiner mehr. Verschwende keinen mit Neugier. Sagt der, der ihn gebaut hat."',
      ],
    },
  };

  function useHint(who) {
    const remaining = S.hints[who];
    if (remaining <= 0) {
      withModalDialogue([{
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
    withModalDialogue([line]);
  }

  function updateHintBar() {
    const total = S.hints.r3mi + S.hints.vtgm + S.hints.bradfish;
    document.getElementById('hintCount').textContent = `HINWEISE: ${total} VERFÜGBAR`;
    document.getElementById('hintBtnR3MI').disabled     = S.hints.r3mi     <= 0;
    document.getElementById('hintBtnVTGM').disabled     = S.hints.vtgm     <= 0;
    document.getElementById('hintBtnBradfish').disabled = S.hints.bradfish <= 0;
  }

  // ─── PUBLIC API ───────────────────────────────────────────────
  return {
    init() { showTitleCard(); },
    clickRobot,
    useHint,
    persMove,
    persSwitch,
    persReset,
  };

})();

document.addEventListener('DOMContentLoaded', () => Chapter4.init());
