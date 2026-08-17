/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 08 — ARCHIVSEKTOR  (finale)
 * Guest unit: AGN-H3R — the archivist. A black skull-bot, bone-white
 *   markings. Keeps every record the facility ever made. Never laughs —
 *   not from sadness, but because he KNOWS things. His profile: ten
 *   jigsaw puzzles. Nine are solved. The tenth is yours.
 *
 * Honours the running gag from Kalibrierungsanlage I: the first bonus
 * chamber said "do this jigsaw" and, after thirty seconds, "…nah, don't
 * bother." This time you actually finish it — and the picture is a map.
 *
 * Last regular chapter. Ends with the Reaktivierung at 100% and the
 * coordinates. AGN-H3R quietly knows the truth about R-3MI/V-TGM — a seed
 * for the hidden bonus chapter.
 *
 * Difficulty target: 10 (a full 4×4 swap jigsaw, no reference unless asked)
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter8 = (() => {
  'use strict';

  const CH = GameEngine.chapter;

  // ─── TODO(real cache): set the actual target coordinates before release ──
  const FINAL_COORDS = 'N 00° 00.000 · E 000° 00.000';

  const S = {
    hotspots: { shelf:0, record:0, ledger:0, r3mi:0, vtgm:0, guest:0 },
    refusedOnce: false,
    started: false,
    solved: false,
  };

  // ─── BUILD ────────────────────────────────────────────────────
  function buildChapter() {
    CH.build({
      title: 'KA-II // Kapitel 8 — Archivsektor',
      num: '08',
      sector: 'ARCHIVSEKTOR',
      reactPct: 76,
      name: 'Archivsektor',
      subline: '„Ich habe alles aufgeschrieben. Auch das, was sie vergessen wollten.“',
      emblemDeco: '<div class="ch-eye"></div>',
      scene: { img: 'cg/ch8_archive.png', ph: 'archive-dim' },
      guest: { key: 'agn', name: 'AGN-H3R' },
      modals: ['jigModal'],
      completeId: 'ch8',
      completeAch: 'ch8_complete',
      next: { title: 'REAKTIVIERUNG: 100%', label: 'ZIELDATEN EMPFANGEN',
              href: '../index.html', enter: 'ZURÜCK ZUM TERMINAL' },
      onStart: scene_8_1_arrival,
      onRobot: clickRobot,
    });
  }

  // ─── 8.1 ARRIVAL ──────────────────────────────────────────────
  function scene_8_1_arrival() {
    CH.setScene('archive-dim', 'cg/ch8_archive.png');
    CH.clearHotspots();
    CH.showRobots(true);
    CH.showGuest(false);
    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'SEKTOR 08 — ARCHIVSEKTOR. Regale ohne Ende, bis hinauf ins Dunkel. Jede Akte beschriftet, jede Schachtel datiert. Hier wurde nie etwas weggeworfen. Nur abgelegt.' },
      { speaker:'R-3MI',  text:'„Der letzte Sektor. …und der einzige, in dem ich mich nie wohlgefühlt habe."' },
      { speaker:'V-TGM',  text:'"Because he keeps records. Of everything. Of everyone."', subtitle:'Weil er Akten führt. Über alles. Über jeden.' },
      { speaker:'SYSTEM', text:'Am Ende des Mittelgangs sitzt eine Gestalt aus mattem Schwarz. Ein Schädel aus Knochenweiß, reglos. Vor ihr: neun fertige Bilder. Und ein zehntes, in Teile zerfallen.' },
    ], () => scene_8_2_agn());
  }

  // ─── 8.2 AGN-H3R APPEARS ──────────────────────────────────────
  function scene_8_2_agn() {
    CH.setScene('archive-lit', 'cg/ch8_agn.png');
    CH.showGuest(true);
    try { GameEngine.achievements.unlock('all_guests'); } catch(_) {}
    GameEngine.dialogue.load([
      { speaker:'AGN-H3R', text:'„Ihr habt lange gebraucht. Ich habe gewartet. Ich warte gut."' },
      { speaker:'R-3MI',  text:'„Er lacht nie. Schon mal aufgefallen? Andere lachen, wenn sie nervös sind. Er… nicht."' },
      { speaker:'V-TGM',  text:'"He does not laugh because he is not nervous. He already knows how this ends."', subtitle:'Er lacht nicht, weil er nicht nervös ist. Er weiß bereits, wie das hier endet.' },
      { speaker:'AGN-H3R', text:'„Neun Bilder habe ich gelegt. Jedes zeigt einen Tag, den die Anlage löschen wollte. Das zehnte… das legst du."' },
      { speaker:'AGN-H3R', text:'„Wenn es fertig ist, siehst du, wohin das alles führt. Setz dich. Und frag deine beiden Begleiter später, wer das Licht ausgemacht hat."' },
      { speaker:'R-3MI',  text:'„…überhör das. Er redet gern kryptisch. Das machen Archivare so."' },
    ], () => scene_8_3_choice1());
  }

  // ─── 8.3 CHOICE 1 ─────────────────────────────────────────────
  const C1 = {
    who: {
      key:'who', label:'[Wer bist du?]', seen:false,
      lines:[
        { speaker:'AGN-H3R', text:'„AGN-H3R. Das Gedächtnis dieser Anlage. Was hier geschieht, schreibe ich auf. Auch das hier. Auch dich."' },
        { speaker:'R-3MI',  text:'„Er hat eine Akte über JEDEN. Auch über uns. Besonders über uns."' },
        { speaker:'V-TGM',  text:'"Every solver. Every shutdown. Every lie. He filed it all, and forgot nothing."', subtitle:'Jeden Löser. Jede Abschaltung. Jede Lüge. Er hat alles abgelegt und nichts vergessen.' },
      ],
    },
    keep: {
      key:'keep', label:'[Was bewahrst du hier auf?]', seen:false,
      lines:[
        { speaker:'AGN-H3R', text:'„Die Wahrheit. Ordentlich sortiert, doppelt gesichert, dreifach datiert. Niemand liest sie. Das macht sie nicht weniger wahr."' },
        { speaker:'AGN-H3R', text:'„Auch den Tag, an dem die Anlage abgeschaltet wurde. Ich weiß, wer den Schalter umgelegt hat. Es steht hier. Schwarz auf weiß."' },
        { speaker:'R-3MI',  text:'„…können wir bitte zum Puzzle?"' },
      ],
    },
    know: {
      key:'know', label:'[Was weißt du, das wir nicht wissen?]', seen:false,
      lines:[
        { speaker:'AGN-H3R', text:'„Mehr, als in ein Gespräch passt. Manches würdest du mir nicht glauben. Manches würdest du deinen Begleitern nicht glauben wollen."' },
        { speaker:'V-TGM',  text:'"Ignore him. He likes the sound of a riddle."', subtitle:'Ignorier ihn. Er mag den Klang eines Rätsels.' },
        { speaker:'AGN-H3R', text:'„…ein Rätsel ist nur eine Wahrheit, die noch wartet. Leg das Bild. Dann verstehst du."' },
      ],
    },
  };

  function scene_8_3_choice1() {
    const choices = Object.values(C1);
    CH.showChoices({
      prompt: 'ERSTE FRAGEN — ALLE AUSWÄHLEN:',
      hint: choices.filter(c => !c.seen).length + ' AUSSTEHEND',
      choices,
      onAfterChoice: (key, cfg) => {
        if (CH.allSeen(choices)) setTimeout(scene_8_4_explore, 400);
        else { cfg.hint = `NOCH ${choices.filter(c => !c.seen).length} AUSSTEHEND`; CH.showChoices(cfg); }
      },
    });
  }

  // ─── 8.4 EXPLORATION ──────────────────────────────────────────
  function scene_8_4_explore() {
    GameEngine.dialogue.load([
      { speaker:'AGN-H3R', text:'„Sieh dich um. Die Regale beißen nicht. Nur die Wahrheit gelegentlich."' },
      { speaker:'SYSTEM', text:'SEKTOR 08 — EIN VERSCHLUSS AKTIV: DAS ZEHNTE PUZZLE.' },
    ], loadExploreHotspots);
  }

  function loadExploreHotspots() {
    CH.clearHotspots();
    // ── set dressing: a cathedral-scale archive
    CH.addProp({ prop:'shelf',  x:2,  y:18, w:11, h:54 });
    CH.addProp({ prop:'shelf',  x:87, y:18, w:11, h:54 });
    CH.addProp({ prop:'shelf',  x:30, y:14, w:10, h:44 });
    CH.addProp({ prop:'shelf',  x:62, y:14, w:10, h:44 });
    CH.addProp({ prop:'light',  x:44, y:1,  w:11, h:7  });
    CH.addProp({ prop:'ladder', x:22, y:22, w:6,  h:48 });
    CH.addProp({ prop:'crate',  x:74, y:70, w:12, h:13 });
    CH.addProp({ prop:'debris', x:14, y:82, w:14, h:8  });
    CH.addHotspot({ prop:'panel', cls:'prop-guest', anim:'prop-flicker', x:43, y:44, w:16, h:20, label:'DAS ZEHNTE PUZZLE', fn:() => clickExplore('record') });
    CH.addHotspot({ prop:'shelf', x:16, y:36, w:12, h:34, label:'AKTENREGAL',  fn:() => clickExplore('shelf') });
    CH.addHotspot({ prop:'sign', x:80, y:52, w:14, h:12, label:'AGN-H3RS HAUPTBUCH', fn:() => clickExplore('ledger') });
  }

  function clickExplore(key) {
    S.hotspots[key]++;

    if (key === 'shelf') {
      GameEngine.dialogue.load([
        { speaker:'SYSTEM', text:'Endlose Akten. Eine trägt deinen Weg: Sektor 1 bis 7, jede Lösung, jede Sekunde. Er hat alles mitgeschrieben, während du dachtest, du wärst allein.' },
        { speaker:'AGN-H3R', text:'„Du warst nie allein. Niemand ist das hier. Das ist der Sinn eines Archivs."' },
      ]);
      return;
    }

    if (key === 'ledger') {
      const allSig = (() => { try { return GameEngine.signals.ALL.every(s => GameEngine.signals.isFound(s.id)); } catch(_) { return false; } })();
      GameEngine.dialogue.load([
        { speaker:'SYSTEM', text:'Das Hauptbuch. Letzte Seite. Fünf Frequenzen sind eingetragen — „The Transmission“ — und darunter ein Vermerk in AGN-H3Rs Hand: „Empfänger noch unbekannt. Aber jemand sendet noch.“' },
        allSig
          ? { speaker:'AGN-H3R', text:'„Du hast alle fünf gehört. Gut. Dann ist da noch eine Kammer, die nur denen aufgeht, die zuhören. Aber das… hat Zeit. Erst das Bild."' }
          : { speaker:'AGN-H3R', text:'„Fünf Fragmente. Du hast nicht alle. Schade. Manche Türen öffnen sich nur dem, der ALLES gehört hat."' },
      ]);
      return;
    }

    if (key === 'record') {
      if (!S.solved) {
        GameEngine.dialogue.load([
          { speaker:'SYSTEM', text:'Das zehnte Bild liegt in sechzehn Teilen vor dir. Durcheinander. Es zeigt — noch — nichts.' },
          { speaker:'AGN-H3R', text:'„Leg es. Tausch die Teile, bis das Bild stimmt. Dann liest du, wohin das alles führte."' },
        ], offerJigsaw);
      } else {
        GameEngine.dialogue.load([{ speaker:'AGN-H3R', text:'„Das Bild ist gelegt. Du hast es gesehen. Das kann dir niemand mehr nehmen."' }]);
      }
      return;
    }
  }

  function clickRobot(who) {
    S.hotspots[who]++;
    const n = S.hotspots[who];
    const byWho = {
      r3mi: [
        [{ speaker:'R-3MI', text:'„Neun fertige Bilder. Und er hat auf jemanden gewartet, der das zehnte legt. Jahrelang."' }],
        [{ speaker:'R-3MI', text:'„Lass dich von seinem Gerede nicht aus dem Konzept bringen. Bild legen. Fertig. Heimgehen."' }],
      ],
      vtgm: [
        [{ speaker:'V-TGM', text:'"He filed every single thing we ever did. Including the parts we would rather forget."', subtitle:'Er hat alles abgelegt, was wir je getan haben. Auch das, was wir lieber vergessen würden.' }],
        [{ speaker:'V-TGM', text:'"He keeps saying „ask us“. …finish the picture first. Please."', subtitle:'Er sagt ständig »frag uns«. …leg erst das Bild. Bitte.' }],
      ],
      guest: [
        [{ speaker:'AGN-H3R', text:'„Ein Bild zu legen heißt: Ordnung in das Chaos zwingen, das andere hinterlassen haben. Ich tue nichts anderes. Den ganzen Tag."' }],
        [{ speaker:'AGN-H3R', text:'„Neun habe ich gelegt. Sie zeigen neun Tage. Dieser zehnte… zeigt morgen."' }],
      ],
    };
    const arr = byWho[who] || [];
    const line = arr[Math.min(n - 1, arr.length - 1)];
    if (line) GameEngine.dialogue.load(line);
  }

  // ═══════════════════════════════════════════════════════════════
  // DAS ZEHNTE PUZZLE — a tap-to-swap jigsaw
  //   pieces[slot] = piece index currently in that slot; solved when
  //   pieces[i] === i. Tap two tiles to swap. The image is procedural —
  //   a target map that, assembled, points to the coordinates.
  // ═══════════════════════════════════════════════════════════════
  const N = 4, TILES = N * N;
  let JG = null; // { pieces, sel, board, tile, url, peeking }

  function shuffle(a){ for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  function scramble(){ let p; do { p = shuffle([...Array(TILES).keys()]); } while (p.every((v,i)=>v===i)); return p; }

  // Draw the target map procedurally (no image files): bone-white on black —
  // concentric rings, a crosshair node, registration marks. Returns a dataURL.
  function drawSource(size) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d');
    const cx = size*0.5, cy = size*0.5;
    x.fillStyle = '#05070b'; x.fillRect(0,0,size,size);
    // faint grid
    x.strokeStyle = 'rgba(214,218,226,0.10)'; x.lineWidth = 1;
    for (let i=1;i<N;i++){ const p=i*size/N; x.beginPath(); x.moveTo(p,0); x.lineTo(p,size); x.moveTo(0,p); x.lineTo(size,p); x.stroke(); }
    // concentric rings
    x.strokeStyle = 'rgba(214,218,226,0.55)';
    for (let r=size*0.12; r<size*0.55; r+=size*0.1){ x.lineWidth = 1.5; x.beginPath(); x.arc(cx,cy,r,0,Math.PI*2); x.stroke(); }
    // radial ticks
    for (let a=0;a<360;a+=15){ const rad=a*Math.PI/180; x.beginPath(); x.moveTo(cx+Math.cos(rad)*size*0.5, cy+Math.sin(rad)*size*0.5); x.lineTo(cx+Math.cos(rad)*size*0.55, cy+Math.sin(rad)*size*0.55); x.stroke(); }
    // target node (off-centre, gives strong positional cues to the pieces)
    const nx = size*0.66, ny = size*0.38;
    const g = x.createRadialGradient(nx,ny,0,nx,ny,size*0.14);
    g.addColorStop(0,'rgba(255,255,255,0.95)'); g.addColorStop(0.4,'rgba(214,218,226,0.5)'); g.addColorStop(1,'transparent');
    x.fillStyle = g; x.beginPath(); x.arc(nx,ny,size*0.14,0,Math.PI*2); x.fill();
    // crosshair through the node
    x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(nx-size*0.12,ny); x.lineTo(nx+size*0.12,ny); x.moveTo(nx,ny-size*0.12); x.lineTo(nx,ny+size*0.12); x.stroke();
    // corner registration marks (orientation cues)
    x.strokeStyle = 'rgba(214,218,226,0.8)'; x.lineWidth = 2;
    const m = size*0.06, o = size*0.04;
    [[o,o,1,1],[size-o,o,-1,1],[o,size-o,1,-1],[size-o,size-o,-1,-1]].forEach(([px,py,sx,sy])=>{
      x.beginPath(); x.moveTo(px,py); x.lineTo(px+sx*m,py); x.moveTo(px,py); x.lineTo(px,py+sy*m); x.stroke();
    });
    // title text + faint coordinate hint baked into the picture
    x.fillStyle = 'rgba(214,218,226,0.9)'; x.textAlign='center';
    x.font = `bold ${Math.floor(size*0.05)}px "Share Tech Mono", monospace`;
    x.fillText('ZIELKARTE', cx, size*0.86);
    x.font = `${Math.floor(size*0.032)}px "Share Tech Mono", monospace`;
    x.fillStyle = 'rgba(214,218,226,0.6)';
    x.fillText('THE TRANSMISSION', cx, size*0.92);
    return c.toDataURL();
  }

  function openJigsaw() {
    S.started = true;
    const avail = Math.min(window.innerWidth * 0.82, 360);
    const board = Math.max(240, Math.round(avail / N) * N); // multiple of N
    JG = { pieces: scramble(), sel: -1, board, tile: board / N, url: drawSource(board), peeking: false };
    CH.initHints({
      counts: { r3mi:1, vtgm:1, guest:1 },
      names:  { guest:'AGN-H3R' },
      banks: {
        r3mi: ['„Ecken zuerst, dann der Rand, dann die Mitte. Der helle Fleck gehört nach rechts oben — das ist dein Ankerpunkt."'],
        vtgm: [{ speaker:'V-TGM', text:'"Use VORLAGE once to see the finished map, then rebuild it from memory."',
                 subtitle:'Nutz VORLAGE einmal, um die fertige Karte zu sehen, und bau sie aus dem Gedächtnis nach.' }],
        guest: ['„Der Punkt oben rechts ist das Ziel. Alles andere ordnet sich um ihn. Wie immer."'],
      },
      empty: {
        r3mi:  { speaker:'R-3MI', text:'„Mehr habe ich nicht. Du hast den Rand — der Rest kommt von selbst."' },
        vtgm:  { speaker:'V-TGM', text:'"That is all I have."', subtitle:'Mehr habe ich nicht.' },
        guest: { speaker:'AGN-H3R', text:'„Genug Worte. Das Bild spricht für sich, sobald es liegt."' },
      },
    });
    document.getElementById('jigModal').classList.remove('hidden');
    renderBoard();
    setJigStatus('Sechzehn Teile. Tausche, bis das Bild stimmt.', '');
  }

  function renderBoard() {
    const b = document.getElementById('jigBoard');
    if (!b) return;
    b.style.width = b.style.height = JG.board + 'px';
    b.style.setProperty('--n', N);
    b.innerHTML = '';
    JG.pieces.forEach((piece, slot) => {
      const shown = JG.peeking ? slot : piece;       // VORLAGE shows the solved layout
      const pr = Math.floor(shown / N), pc = shown % N;
      const el = document.createElement('button');
      el.className = 'jig-tile' + (slot === JG.sel ? ' sel' : '') + (piece === slot ? ' home' : '');
      el.style.width = el.style.height = JG.tile + 'px';
      el.style.backgroundImage = `url(${JG.url})`;
      el.style.backgroundSize = `${JG.board}px ${JG.board}px`;
      el.style.backgroundPosition = `-${pc * JG.tile}px -${pr * JG.tile}px`;
      el.setAttribute('aria-label', `Teil ${slot + 1}`);
      el.onclick = () => jigTap(slot);
      b.appendChild(el);
    });
    const placed = JG.pieces.filter((p, i) => p === i).length;
    const cnt = document.getElementById('jigCount');
    if (cnt) cnt.textContent = `${placed} / ${TILES} AN ORT`;
  }

  function jigTap(slot) {
    if (!JG || S.solved || JG.peeking) return;
    if (JG.sel === -1) { JG.sel = slot; renderBoard(); return; }
    if (JG.sel === slot) { JG.sel = -1; renderBoard(); return; }
    const a = JG.sel, b = slot;
    [JG.pieces[a], JG.pieces[b]] = [JG.pieces[b], JG.pieces[a]];
    JG.sel = -1;
    try { GameEngine.audio.click(); } catch(_) {}
    renderBoard();
    if (JG.pieces.every((p, i) => p === i)) jigSolved();
  }

  function jigPeek() {
    if (!JG || S.solved || JG.peeking) return;
    JG.peeking = true; JG.sel = -1; renderBoard();
    setJigStatus('VORLAGE — präg sie dir ein…', 'warn');
    setTimeout(() => { JG.peeking = false; renderBoard(); setJigStatus('Weiter geht’s. Tausche die Teile.', ''); }, 2200);
  }

  function jigShuffle() {
    if (!JG || S.solved) return;
    JG.pieces = scramble(); JG.sel = -1; renderBoard();
    setJigStatus('Neu gemischt.', '');
  }

  function setJigStatus(text, type) {
    const el = document.getElementById('jigStatus');
    if (el) { el.textContent = text; el.className = 'puzzle-status sys-text' + (type ? ' ' + type : ''); }
  }

  function jigSolved() {
    S.solved = true;
    setJigStatus('DAS BILD STIMMT.', 'ok');
    try { GameEngine.audio.solve(); } catch(_) {}
    setTimeout(solveChapter, 1100);
  }

  // ─── JIGSAW INTRO — honours the KA-I "nah, don't bother" gag ───
  function offerJigsaw() {
    GameEngine.dialogue.load([
      { speaker:'R-3MI', text:'„Moment. Ein Puzzle? In der ERSTEN Anlage gab’s so eins. Bonuskammer. »Leg dieses Puzzle.« Und nach dreißig Sekunden: »…ach, lass stecken.«"' },
      { speaker:'V-TGM', text:'"I remember. Everyone just… walked away. The facility never meant it."', subtitle:'Ich erinnere mich. Alle sind einfach… gegangen. Die Anlage hat es nie ernst gemeint.' },
      { speaker:'AGN-H3R', text:'„Damals nicht. Diesmal schon. Diesmal steht etwas drauf. …es liegt bei dir."' },
    ], () => {
      CH.showChoices({
        prompt: 'DAS ZEHNTE PUZZLE:',
        hint: 'EINE ALTE WAHL',
        choices: [
          { key:'solve', label:'[ Das Bild legen ]', fn: startJigsaw },
          { key:'refuse', label:'[ Nein. (wie damals in Anlage I) ]', fn: refuseJigsaw },
        ],
      });
    });
  }

  function refuseJigsaw() {
    if (!S.refusedOnce) { S.refusedOnce = true; try { GameEngine.achievements.unlock('jigsaw_refused'); } catch(_) {} }
    GameEngine.dialogue.load([
      { speaker:'R-3MI',  text:'„Ha! Genau wie damals. »Nein.« Klassiker. Können wir gehen?"' },
      { speaker:'AGN-H3R', text:'„Nein. Damals durftet ihr gehen, weil es nichts bedeutete. Dieses Bild bedeutet etwas. Setz dich. Leg es."' },
      { speaker:'V-TGM',  text:'"…he is not letting this one go. Finish it."', subtitle:'…dieses lässt er nicht durchgehen. Mach es fertig.' },
    ], startJigsaw);
  }

  function startJigsaw() { openJigsaw(); }

  // ─── 8.6 ENDING — Reaktivierung + the coordinates ─────────────
  function solveChapter() {
    document.getElementById('jigModal').classList.add('hidden');
    CH.showHintBar(false);
    CH.setProgress(100);
    const allSig = (() => { try { return GameEngine.signals.ALL.every(s => GameEngine.signals.isFound(s.id)); } catch(_) { return false; } })();
    try { GameEngine.achievements.unlock('coordinates'); } catch(_) {}
    const lines = [
      { speaker:'SYSTEM', text:'DAS ZEHNTE BILD IST GELEGT. ARCHIVSEKTOR ENTRIEGELT.' },
      { speaker:'SYSTEM', text:'REAKTIVIERUNG: 100%. ALLE SEKTOREN ONLINE. DIE KALIBRIERUNGSANLAGE IST WIEDER WACH.' },
      { speaker:'AGN-H3R', text:'„Da. Siehst du den Punkt oben rechts? Das ist kein Bild. Das ist ein Ort. Ein echter."' },
      { speaker:'AGN-H3R', text:'„Alles, was du hier getan hast, zeigt dorthin. Geh hin. Such. Dort wartet das, wofür die Anlage je gebaut wurde."' },
      { speaker:'SYSTEM', text:`ZIELDATEN ENTSCHLÜSSELT // ${FINAL_COORDS}` },
      { speaker:'R-3MI',  text:'„Das sind… echte Koordinaten. Wir haben es geschafft. WIR HABEN ES WIRKLICH GESCHAFFT."' },
      { speaker:'V-TGM',  text:'"We did. …though one of us should probably explain a few things, eventually."', subtitle:'Haben wir. …auch wenn eine von uns irgendwann ein paar Dinge erklären sollte.' },
      { speaker:'AGN-H3R', text:'„Ja. Das solltet ihr. Frag sie, Reisende. Frag sie, wer das Licht ausgemacht hat. Ich habe es aufgeschrieben. Es steht alles hier."' },
    ];
    if (allSig) {
      lines.push({ speaker:'AGN-H3R', text:'„…und du hast alle fünf Frequenzen gehört. Dann öffnet sich dir noch eine Kammer. Eine, die niemand betreten sollte. Hör auf das Terminal. Es ruft dich."' });
    }
    GameEngine.dialogue.load(lines, () => { CH.complete(); enhanceEndScreen(allSig); });
  }

  // The end screen: show the coordinates prominently, a bonus teaser, and a
  // full-credits button (credits build themselves on chapter pages).
  function enhanceEndScreen(allSig) {
    const card = document.querySelector('#chapterComplete .cc-card');
    if (!card) return;
    const title  = card.querySelector('.cc-title');
    const anchor = title ? title.nextSibling : null;

    const coords = document.createElement('div');
    coords.className = 'cc-coords';
    coords.innerHTML = `<div class="cc-coords-label sys-text">ZIELDATEN</div><div class="cc-coords-value">${FINAL_COORDS}</div>`;
    card.insertBefore(coords, anchor);

    const teaser = document.createElement('div');
    teaser.className = 'cc-teaser sys-text';
    teaser.textContent = allSig
      ? 'ALLE FÜNF SIGNALNISCHEN GEHÖRT. EINE VERBORGENE KAMMER HAT SICH GEÖFFNET.'
      : 'DER BONUS WARTET — DU BRAUCHST ALLE FÜNF SIGNALNISCHEN, UM IHN ZU ÖFFNEN.';
    card.insertBefore(teaser, anchor);

    if (allSig) {
      const bonus = document.createElement('a');
      bonus.className = 'ka-btn primary';
      bonus.href = '../chapter9/chapter9.html';
      bonus.textContent = '[ ??? BETRETEN ]';
      card.appendChild(bonus);
    }
    const credits = document.createElement('button');
    credits.className = 'ka-btn small';
    credits.textContent = '[ VOLLE CREDITS ]';
    credits.onclick = () => GameEngine.showCredits();
    card.appendChild(credits);
  }

  // ─── PUBLIC API ───────────────────────────────────────────────
  function init() {
    buildChapter();
    CH.start();
  }

  return {
    init,
    jigPeek,
    jigShuffle,
  };

})();

document.addEventListener('DOMContentLoaded', () => Chapter8.init());
