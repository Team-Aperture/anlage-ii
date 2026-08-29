/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 03 — BEOBACHTUNGSSEKTOR
 * Guest: L-UX — a mobile observation unit. Calm, precise, dry.
 *        Fast because he perceives quickly, not because he hurries.
 *
 * DON'T BE FASTER. SEE SOONER.
 *
 *   ACT 1  arrival · L-UX · one reaction choice
 *   ACT 2  explore the failing sector (sig_01 hides here, optional)
 *   ACT 3  BELICHTUNG 1/3 — BLENDEN I   · what changed, and in what order
 *   ACT 4  BELICHTUNG 2/3 — BLENDEN II  · who follows whom
 *   ACT 5  BELICHTUNG 3/3 — SPEKTRUM    · rebuild a colour from its channels
 *   ACT 6  the observation network comes back
 *   ACT 7  a quiet moment · L-UX stays behind
 *
 * The reserve is an observation budget, not a clock: it only moves when the
 * player asks to look again or commits a wrong reading. Reading, thinking and
 * inspecting cost nothing. Every stage's answer is generated at runtime.
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter3 = (() => {
  'use strict';

  const CHAPTER_ID = 'ch3';
  const HINT_MAX   = 3;      // one shared ladder per stage

  // Observation budget
  const RESERVE_MAX   = 100;
  const COST_OBSERVE  = 18;  // every look after the first of a stage
  const COST_WRONG    = 25;  // committing a reading that doesn't hold

  const BEAT = 700;          // ms per observation beat — long enough to read

  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const S = {
    seen:      {},           // "key:phase" -> examine count
    talkSeen:  {},
    metLux:    false,
    sigFound:  false,
    solved:    false,
    lit:       false,        // observation network restored
    logsRead:  0,
    sawWestgang: false,      // enables the ending callback
    hints:     { step: 0, active: null },
    react:     {},

    // A second walk through the rows: nothing may re-run the ending.
    revisit:   false,
  };

  // ═══════════════════════════════════════════════════════════════
  // SCENE HELPERS
  // ═══════════════════════════════════════════════════════════════
  function setScene(key) {
    const ph = document.getElementById('scenePh');
    if (ph) ph.dataset.scene = key;
  }
  function clearHotspots() { document.getElementById('sceneHotspots').innerHTML = ''; }

  function dialogueBusy() {
    const c = document.querySelector('.dlg-container');
    return !!(c && c.classList.contains('visible'));
  }

  /**
   * While dialogue runs, a tap in the scene advances it instead of starting a
   * new interaction — the dialogue box only covers the bottom strip and the
   * engine keeps a single completion callback, so a new line started here
   * would silently discard whatever the running dialogue was going to do.
   */
  function guarded(fn) {
    return (...args) => {
      if (dialogueBusy()) { try { GameEngine.dialogue.advance(); } catch(_) {} return; }
      return fn(...args);
    };
  }

  function addHotspot(cfg) {
    if (cfg.prop && window.GameEngine && GameEngine.props) {
      const p = GameEngine.props.el(cfg.prop, {
        x:cfg.x, y:cfg.y, w:cfg.w, h:cfg.h,
        label:cfg.label, aria:cfg.aria, onClick:guarded(cfg.fn), cls:cfg.cls, anim:cfg.anim,
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
    el.addEventListener('click', guarded(cfg.fn));
    document.getElementById('sceneHotspots').appendChild(el);
    return el;
  }

  function addProp(cfg) {
    if (!(window.GameEngine && GameEngine.props)) return;
    document.getElementById('sceneHotspots').appendChild(
      GameEngine.props.el(cfg.prop, { x:cfg.x, y:cfg.y, w:cfg.w, h:cfg.h, cls:cfg.cls, anim:cfg.anim }));
  }

  function showRobots(v) { document.getElementById('robotIcons').classList.toggle('hidden', !v); }
  function showLux(v)    { document.getElementById('luxIcon').classList.toggle('hidden', !v); }
  function setProgress(pct) {
    const el = document.getElementById('reactProgress');
    if (el) el.textContent = `REAKTIVIERUNG: ${pct}%`;
  }
  function playSound(src) { try { GameEngine.audio.sfx(src); } catch(_) {} }
  function tone(o)        { try { GameEngine.audio.tone(o); } catch(_) {} }
  function say(lines, after) { GameEngine.dialogue.load(lines, after); }

  function bump(key) {
    const k = key + ':' + (S.lit ? 'lit' : 'dim');
    S.seen[k] = (S.seen[k] || 0) + 1;
    return S.seen[k];
  }
  function pick(bucket, n) {
    if (!bucket) return null;
    const keys = Object.keys(bucket).map(Number).sort((a,b) => a-b);
    if (!keys.length) return null;
    return bucket[keys.filter(k => k <= n).pop() ?? keys[0]];
  }
  function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [r[i],r[j]] = [r[j],r[i]]; }
    return r;
  }

  // ═══════════════════════════════════════════════════════════════
  // CHOICE — one shot, never an exhaust-all list
  // ═══════════════════════════════════════════════════════════════
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
        say(c.lines || [], () => { if (cfg.onPick) cfg.onPick(c.key); });
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
  // RESUME
  // A reload must not send the player back through two calibrated levels.
  // The stage that was reached is kept; the recording itself is generated
  // fresh, so nothing is remembered that was meant to be observed.
  // ═══════════════════════════════════════════════════════════════
  function saveState() {
    if (S.solved) return;
    try {
      GameEngine.state.chapter(CHAPTER_ID, {
        stage: bel ? bel.stage : 0,
        metLux: S.metLux, sigFound: S.sigFound, logsRead: S.logsRead,
        sawWestgang: S.sawWestgang, seen: S.seen, talkSeen: S.talkSeen, react: S.react,
      });
    } catch (_) {}
  }
  function clearSavedState() {
    try { GameEngine.state.chapter(CHAPTER_ID, null); } catch (_) {}
  }
  // Returns the stage to pick the exposure array back up on, or 0 for a
  // player who never got that far.
  function restoreState() {
    let d = null;
    try { d = GameEngine.state.chapter(CHAPTER_ID); } catch (_) {}
    if (!d || typeof d !== 'object' || !d.metLux) return 0;
    S.metLux      = true;
    S.sigFound    = !!d.sigFound;
    S.logsRead    = d.logsRead | 0;
    S.sawWestgang = !!d.sawWestgang;
    S.seen        = (d.seen && typeof d.seen === 'object') ? d.seen : {};
    S.talkSeen    = (d.talkSeen && typeof d.talkSeen === 'object') ? d.talkSeen : {};
    S.react       = (d.react && typeof d.react === 'object') ? d.react : {};
    const st = d.stage | 0;
    return st >= 1 && st <= 3 ? st : 0;
  }

  // ═══════════════════════════════════════════════════════════════
  // TITLE CARD
  // ═══════════════════════════════════════════════════════════════
  function showTitleCard() {
    const card = document.getElementById('titleCard');
    const revisit = GameEngine.progress.isRevisit(CHAPTER_ID);
    const stage   = revisit ? 0 : restoreState();
    const resume  = !revisit && S.metLux;
    setTimeout(() => {
      card.classList.add('fading');
      setTimeout(() => {
        card.style.display = 'none';
        if (revisit) nachsuche();
        else if (resume) resumeWatch(stage);
        else act1_arrival();
      }, 700);
    }, (revisit || resume) ? 900 : 3000);
  }

  // Back in the observation rows after a reload. L-UX has not moved, and the
  // exposure array picks up on the level that was already reached.
  function resumeWatch(stage) {
    setScene('obs-dark');
    setProgress(24);
    showRobots(true);
    showLux(true);
    try { GameEngine.music.play('ch3_ambient'); } catch (_) {}
    loadHotspots();
    // Latch the array open before any dialogue runs: a lost completion
    // callback must never cost the level that was already reached.
    if (stage) {
      bel = { stage: 0, reserve: RESERVE_MAX, busy: false, observedOnce: false, answer: null, event: null, wrong: 0 };
      document.getElementById('belModal').classList.remove('hidden');
      document.getElementById('hintBar').classList.remove('hidden');
      startStage(stage);
    }
    say([
      { speaker:'SYSTEM', text:'SEKTOR 03 — BEOBACHTUNGSSEKTOR. Die Reihen sind noch dunkel.' },
      { speaker:'L-UX',   text: stage > 1 ? '„Du warst weg. Die Ebenen darunter stehen noch."'
                                          : '„Du warst weg. Das Array wartet."' },
    ]);
  }


  // On a second visit the way on is just a way on: the next sector is already
  // open, so the door leads there instead of handing out an ending the player
  // has already been given.
  function onward(id) {
    const href = (() => {
      try { return GameEngine.progress.href(id); } catch (_) {
        const n = id.replace('ch', '');
        return `../chapter${n}/chapter${n}.html`;
      }
    })();
    try { GameEngine.fx.leave(href); } catch (_) { location.href = href; }
  }

  // Coming back to a sector that can see again. The network is up, L-UX is
  // where L-UX always is, and everything worth a closer look is still here —
  // including the lens that never settles.
  function nachsuche() {
    S.revisit = true;
    S.metLux = true;
    S.solved = true;
    S.lit = true;
    try { S.sigFound = GameEngine.signals.isFound('sig_01'); } catch (_) {}
    setScene('obs-lit');
    setProgress(37);
    showRobots(true);
    showLux(true);
    try { GameEngine.music.play('ch3_ambient'); } catch (_) {}
    loadHotspots();
    GameEngine.progress.returnBar(CHAPTER_ID);
    say([
      { speaker:'SYSTEM', text:'SEKTOR 03 — BEOBACHTUNGSSEKTOR. Die Reihen sind hell. Was hier steht, wird wieder gesehen.' },
      { speaker:'L-UX',   text:'„Ihr seid nochmal da."' },
      { speaker:'R-3MI',  text:'„Wir schauen uns nur um."' },
      { speaker:'L-UX',   text:'„Gut. Genau dafür ist der Sektor gebaut."' },
    ]);
  }

  // ═══════════════════════════════════════════════════════════════
  // ACT 1 — ARRIVAL
  // ═══════════════════════════════════════════════════════════════
  function act1_arrival() {
    setScene('obs-dim');
    clearHotspots();
    showRobots(true);
    showLux(false);
    try { GameEngine.music.play('ch3_ambient'); } catch(_) {}

    say([
      { speaker:'SYSTEM', text:'SEKTOR 03 — BEOBACHTUNGSSEKTOR. Hier hat die Anlage einst alles aufgezeichnet. Jede Bewegung. Jedes Licht.' },
      { speaker:'SYSTEM', text:'Jetzt ist es fast dunkel. Reihen toter Linsen starren ins Nichts. Eine Anzeige flackert, verliert das Signal, findet es wieder.' },
      { speaker:'SYSTEM', text:'Irgendwo tickt Mechanik gegen sich selbst. Der Sektor hält sich gerade noch zusammen.' },
      { speaker:'R-3MI',  text:'„Hier drin war früher mehr Licht."' },
      { speaker:'V-TGM',  text:'"Considerably more."', subtitle:'Deutlich mehr.' },
      { speaker:'R-3MI',  text:'„L-UX?"' },
      { speaker:'SYSTEM', text:'Keine Antwort.' },
      { speaker:'R-3MI',  text:'„L-UX!"' },
    ], () => act1_lux());
  }

  function act1_lux() {
    setScene('obs-flicker');
    playSound('ch3_lux_zip.mp3');

    say([
      { speaker:'SYSTEM', text:'Von oben, ruhig, ohne Eile:' },
      { speaker:'L-UX',   text:'„Hab dich gehört."' },
      { speaker:'SYSTEM', text:'Auf einer erhöhten Plattform sitzt eine schmale Gestalt vor dem einzigen Array, das noch ein Bild liefert. Zwei bernsteinfarbene Punkte drehen sich langsam zu euch.' },
      { speaker:'V-TGM',  text:'"Good to see you."', subtitle:'Schön, dich zu sehen.' },
      { speaker:'L-UX',   text:'„Euch auch."' },
      { speaker:'R-3MI',  text:'„Das war\'s? Wir haben uns seit—"' },
      { speaker:'L-UX',   text:'„Ja."' },
      { speaker:'SYSTEM', text:'R-3MI wartet auf mehr. Es kommt nicht mehr.' },
      { speaker:'L-UX',   text:'„Dich kenn ich nicht."' },
      { speaker:'R-3MI',  text:'„Neue Bekanntschaft."' },
      { speaker:'SYSTEM', text:'L-UX sieht dich kurz an. Nicht lange. Es wirkt trotzdem gründlich.' },
      { speaker:'L-UX',   text:'„Hm."' },
      { speaker:'L-UX',   text:'„Du schaust viel."' },
    ], () => act1_reaction());
  }

  const REACTIONS = [
    { key:'you', label:'[ Du offenbar auch. ]', lines:[
      { speaker:'L-UX',  text:'„Berufskrankheit."' },
      { speaker:'R-3MI', text:'„Er meint das positiv."' },
      { speaker:'L-UX',  text:'„Ja."' },
    ] },
    { key:'name', label:'[ Bist du L-UX? ]', lines:[
      { speaker:'L-UX',  text:'„Ja."' },
      { speaker:'SYSTEM',text:'Pause.' },
      { speaker:'R-3MI', text:'„Er ist heute sehr gesprächig."' },
    ] },
    { key:'fire', label:'[ Brennt das hinter dir? ]', lines:[
      { speaker:'SYSTEM',text:'L-UX schaut kurz nach hinten.' },
      { speaker:'L-UX',  text:'„Ja."' },
      { speaker:'SYSTEM',text:'Pause.' },
      { speaker:'L-UX',  text:'„Schon seit vorhin."' },
      { speaker:'R-3MI', text:'„UND DAS STÖRT DICH NICHT?!"' },
      { speaker:'L-UX',  text:'„Doch."' },
    ] },
    { key:'what', label:'[ Was genau beobachtest du? ]', lines:[
      { speaker:'L-UX',  text:'„Im Moment?"' },
      { speaker:'SYSTEM',text:'Pause.' },
      { speaker:'L-UX',  text:'„Euch."' },
      { speaker:'R-3MI', text:'„Das war ein Scherz. Sag, dass das ein Scherz war."' },
      { speaker:'L-UX',  text:'„Teilweise."' },
    ] },
  ];

  function act1_reaction() {
    askOnce({
      prompt: 'DEINE REAKTION:',
      hint:   'WÄHLE EINE.',
      choices: REACTIONS,
      onPick: () => act2_explore(),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // ACT 2 — EXPLORE THE FAILING SECTOR
  // ═══════════════════════════════════════════════════════════════
  function act2_explore() {
    S.metLux = true;
    showLux(true);
    setScene('obs-dim');

    say([
      { speaker:'SYSTEM', text:'SEKTOR 03 — BEOBACHTUNGSARRAY OFFLINE. KALIBRIERUNG ERFORDERLICH.' },
      { speaker:'L-UX',   text:'„Schau dich um. Das Array kannst du danach immer noch anfassen."' },
      { speaker:'R-3MI',  text:'„Er sagt das, als wäre das Array nicht das Einzige, was hier zählt."' },
      { speaker:'L-UX',   text:'„Ist es nicht."' },
    ], () => loadHotspots());
  }

  function loadHotspots() {
    saveState();
    clearHotspots();
    // ── set dressing (room layout unchanged)
    addProp({ prop:'light',    x:43, y:2,  w:12, h:8  });
    addProp({ prop:'duct',     x:8,  y:0,  w:46, h:6, cls:'prop-far' });
    addProp({ prop:'monitors', x:26, y:22, w:17, h:15 });
    addProp({ prop:'cables',   x:64, y:6,  w:9,  h:24, cls:'prop-far' });
    addProp({ prop:'column',   x:0,  y:12, w:7,  h:58 });
    addProp({ prop:'railing',  x:24, y:70, w:26, h:12 });
    addProp({ prop:'crate',    x:60, y:70, w:13, h:14 });
    addProp({ prop:'barrel',   x:6,  y:66, w:8,  h:15 });
    // ── interactive
    addHotspot({ prop:'c3_array', cls:'prop-guest', x:42, y:44, w:20, h:22,
      label:'BEOBACHTUNGSARRAY', aria:'Beobachtungsarray untersuchen', fn:() => examine('array') });
    addHotspot({ prop:'c3_mirror', x:13, y:34, w:13, h:13,
      label:'JUSTIERSPIEGEL', aria:'Justierspiegel untersuchen', fn:() => examine('mirror') });
    addHotspot({ prop:'c3_logterm', anim:'prop-flicker', x:78, y:48, w:13, h:24,
      label:'BEOBACHTUNGSPROTOKOLLE', aria:'Beobachtungsprotokolle lesen', fn:() => examine('log') });
    addHotspot({ prop:'c3_lens', anim:'prop-flicker', x:86, y:20, w:6, h:8,
      label:'FLACKERNDE LINSE', aria:'Flackernde Linse untersuchen', fn:() => examine('niche') });
    addHotspot({ prop:'c3_board', x:6, y:40, w:12, h:11,
      label:'SEKTORTAFEL', aria:'Sektortafel untersuchen', fn:() => examine('map') });

    // Once the network is back, the way on is an object in the room — this
    // also guarantees the ending stays reachable no matter what.
    if (S.solved) {
      addHotspot({ prop:'c3_obsdoor', x:66, y:24, w:12, h:34,
        label:'SEKTOR 04', aria:'Sektor 04 betreten',
        fn: () => S.revisit ? onward('ch4') : finishChapter() });
    }
  }

  // L-UX's logs: facility records written by someone who actually looked.
  const LOGS = [
    [
      { speaker:'SYSTEM', text:'BEOBACHTUNGSPROTOKOLL 117' },
      { speaker:'SYSTEM', text:'Das Licht im Westgang fällt jeden Abend zuerst an der dritten Lampe aus.' },
      { speaker:'SYSTEM', text:'Danach folgt die zweite. Nie die vierte.' },
      { speaker:'SYSTEM', text:'Kurz davor wird die Anlage still. Nicht ausgeschaltet. Wartend.' },
      { speaker:'R-3MI',  text:'„Du schreibst immer noch so."' },
      { speaker:'L-UX',   text:'„Wie?"' },
      { speaker:'R-3MI',  text:'„Als hätte ein Wartungsprotokoll Gefühle."' },
      { speaker:'L-UX',   text:'„Hat es nicht."' },
      { speaker:'SYSTEM', text:'Pause.' },
      { speaker:'L-UX',   text:'„Der Gang vielleicht."' },
    ],
    [
      { speaker:'SYSTEM', text:'BEOBACHTUNGSPROTOKOLL 084' },
      { speaker:'SYSTEM', text:'NORDFLÜGEL. SEKTOR OHNE NUMMER.' },
      { speaker:'SYSTEM', text:'DREI TÜREN. KEINE LIESS SICH ÖFFNEN.' },
      { speaker:'SYSTEM', text:'HINTER DER MITTLEREN: WASSER.' },
      { speaker:'R-3MI',  text:'„Wasser?"' },
      { speaker:'L-UX',   text:'„Viel."' },
      { speaker:'V-TGM',  text:'"You never mentioned that."', subtitle:'Das hast du nie erwähnt.' },
      { speaker:'L-UX',   text:'„Steht doch da."' },
    ],
    [
      { speaker:'SYSTEM', text:'BEOBACHTUNGSPROTOKOLL 203' },
      { speaker:'SYSTEM', text:'ÖSTLICHER VERBINDUNGSGANG. ZWEI LEUCHTEN AUSSER TAKT.' },
      { speaker:'SYSTEM', text:'DIE LINKE FOLGT DER RECHTEN. IMMER MIT EINER SEKUNDE VERSPÄTUNG.' },
      { speaker:'SYSTEM', text:'NIEMAND HAT SIE SO GEBAUT.' },
      { speaker:'L-UX',   text:'„Das war der erste Hinweis, dass hier etwas nicht mehr stimmt."' },
      { speaker:'L-UX',   text:'„Vier Jahre bevor es jemand bemerkt hat."' },
    ],
    [
      { speaker:'SYSTEM', text:'BEOBACHTUNGSPROTOKOLL 041' },
      { speaker:'SYSTEM', text:'WESTLICHER VERSORGUNGSGANG.' },
      { speaker:'SYSTEM', text:'HÄSSLICH. ZWECKMÄSSIG. ZU LAUT.' },
      { speaker:'SYSTEM', text:'ABER UM 17 UHR STEHT DAS LICHT GENAU RICHTIG.' },
      { speaker:'L-UX',   text:'„Das ist kein Protokoll mehr, oder?"' },
      { speaker:'V-TGM',  text:'"It stopped being one around entry sixty."', subtitle:'Das hat es ungefähr ab Eintrag sechzig aufgehört.' },
    ],
  ];

  const SCENE_LINES = {
    array: {
      1: [
        { speaker:'SYSTEM', text:'Das zentrale Beobachtungsarray. Eine Wand aus Blenden, Spiegeln und einem Spektralfilter. Alles dunkel, alles verstellt.' },
        { speaker:'L-UX',   text:'„Das Array misst nicht mehr richtig. Es zeigt noch was — nur nicht das, was da ist."' },
        { speaker:'V-TGM',  text:'"It needs recalibrating from outside."', subtitle:'Es muss von außen neu kalibriert werden.' },
        { speaker:'L-UX',   text:'„Von mir aus geht das nicht. Ich bin Teil der Messung."' },
      ],
    },
    mirror: {
      1: [
        { speaker:'SYSTEM', text:'Ein Justierspiegel auf feiner Mechanik. Er zittert leicht.' },
        { speaker:'L-UX',   text:'„Kaputt."' },
      ],
      2: [
        { speaker:'L-UX',   text:'„Immer noch."' },
      ],
      4: [
        { speaker:'L-UX',   text:'„Du hoffst, dass sich was ändert."' },
        { speaker:'SYSTEM', text:'Pause.' },
        { speaker:'L-UX',   text:'„Versteh ich."' },
      ],
    },
    map: {
      1: [
        { speaker:'SYSTEM', text:'Eine Sektortafel. Weit mehr Einträge, als es begehbare Sektoren gibt. Viele sind durchgestrichen. Einige haben nie eine Nummer bekommen.' },
        { speaker:'R-3MI',  text:'„Ich kenne die Hälfte davon nicht."' },
        { speaker:'L-UX',   text:'„Ich schon."' },
        { speaker:'V-TGM',  text:'"More sectors than either of us."', subtitle:'Mehr Sektoren als wir beide.' },
      ],
      2: [
        { speaker:'SYSTEM', text:'Zwischen den Einträgen kleben handschriftliche Korrekturen. Dieselbe Handschrift wie in den Protokollen.' },
      ],
    },
  };

  function examine(key) {
    if (key === 'array')  return openBelichtung();
    if (key === 'niche')  return examineNiche();
    if (key === 'log')    return readLog();

    const n = bump(key);
    const lines = pick(SCENE_LINES[key], n);
    if (lines) say(lines);
  }

  function readLog() {
    const n = bump('log');
    if (n === 1) {
      say([
        { speaker:'SYSTEM', text:'Ein Terminal voller Beobachtungsprotokolle. Hunderte. Alle von derselben Einheit.' },
        ...LOGS[0],
      ]);
      S.logsRead = 1;
      return;
    }
    const idx = Math.min(n - 1, LOGS.length - 1);
    S.logsRead = Math.max(S.logsRead, idx + 1);
    if (idx === 3) S.sawWestgang = true;   // enables the ending callback
    say(LOGS[idx]);
  }

  function examineNiche() {
    const n = bump('niche');
    if (S.sigFound) {
      say([{ speaker:'L-UX', text:'„Die flackert immer noch anders als die anderen."' }]);
      return;
    }
    // Latch the discovery before the dialogue so a lost callback can't undo it.
    S.sigFound = true;
    saveState();
    try { GameEngine.signals.find('sig_01'); } catch(_) {}
    say([
      { speaker:'SYSTEM', text:'Eine einzelne Linse flackert anders als die anderen. Nicht zufällig. Ein Rhythmus.' },
      { speaker:'SYSTEM', text:'Dahinter, schwach eingebrannt, ein Textfragment.' },
      { speaker:'V-TGM',  text:'"…not everything that helps wants to save. two units are listening in…"', subtitle:'…nicht alles, was hilft, will retten. zwei Einheiten hören mit.' },
      { speaker:'SYSTEM', text:'Kurze Stille.' },
      { speaker:'L-UX',   text:'„Das ist neu."' },
      { speaker:'R-3MI',  text:'„Neu?"' },
      { speaker:'L-UX',   text:'„Für dich."' },
    ]);
  }

  // ═══════════════════════════════════════════════════════════════
  // OPTIONAL CONVERSATIONS
  // ═══════════════════════════════════════════════════════════════
  const TALK = {
    lux: [
      { key:'whole', label:'[ Kennst du die ganze Anlage? ]', lines:[
        { speaker:'L-UX',  text:'„Nicht die ganze."' },
        { speaker:'R-3MI', text:'„Er war fast überall."' },
        { speaker:'L-UX',  text:'„Fast."' },
        { speaker:'V-TGM', text:'"More sectors than either of us."', subtitle:'Mehr Sektoren als wir beide.' },
      ] },
      { key:'fav', label:'[ Was war dein Lieblingsort? ]', lines:[
        { speaker:'SYSTEM',text:'L-UX überlegt kurz.' },
        { speaker:'L-UX',  text:'„Westlicher Versorgungsgang."' },
        { speaker:'R-3MI', text:'„Der? Der ist hässlich."' },
        { speaker:'L-UX',  text:'„Gutes Licht."' },
      ], onPick: () => { S.sawWestgang = true; } },
      { key:'stay', label:'[ Bleibst du immer hier? ]', lines:[
        { speaker:'L-UX',  text:'„Jetzt schon."' },
        { speaker:'SYSTEM',text:'Pause.' },
        { speaker:'R-3MI', text:'„Früher nicht."' },
      ] },
      { key:'writing', label:'[ Warum schreibst du so? ]', lines:[
        { speaker:'L-UX',  text:'„Wie schreib ich denn?"' },
        { speaker:'V-TGM', text:'"Like the corridors owe you something."', subtitle:'Als schuldeten dir die Gänge etwas.' },
        { speaker:'L-UX',  text:'„Tun sie."' },
      ] },
    ],
    r3mi: [
      { key:'him', label:'[ Wie ist er so? ]', lines:[
        { speaker:'R-3MI', text:'„Anstrengend ruhig. Man redet, und er wartet einfach, bis man fertig ist."' },
        { speaker:'R-3MI', text:'„Manchmal antwortet er dann. Manchmal nicht."' },
      ], again:[
        { speaker:'R-3MI', text:'„Wenn das Licht ausgeht, sterben wir dann?"' },
        { speaker:'L-UX',  text:'„Nein."' },
        { speaker:'R-3MI', text:'„Oh, gut."' },
        { speaker:'L-UX',  text:'„Das andere System bringt uns um."' },
        { speaker:'R-3MI', text:'„L-UX."' },
      ] },
    ],
    vtgm: [
      { key:'read', label:'[ Was hältst du von ihm? ]', lines:[
        { speaker:'V-TGM', text:'"He noticed this sector was failing years before it did."', subtitle:'Er hat Jahre vorher bemerkt, dass dieser Sektor ausfällt.' },
        { speaker:'V-TGM', text:'"Nobody read the reports."', subtitle:'Niemand hat die Berichte gelesen.' },
      ] },
    ],
  };

  function clickRobot(who) {
    if (who === 'lux' && !S.metLux) return;
    if (dialogueBusy()) { try { GameEngine.dialogue.advance(); } catch(_) {} return; }

    const topics = TALK[who] || [];
    const choices = topics.map(t => {
      const seen = !!S.talkSeen[who + ':' + t.key];
      return { key:t.key, label:t.label, seen, lines:(seen && t.again) ? t.again : t.lines };
    });
    choices.push({ key:'__leave', label:'[ Nichts. Weiter. ]', seen:false, lines: [] });

    const title = who === 'lux' ? 'L-UX ANSPRECHEN:' : who === 'r3mi' ? 'R-3MI ANSPRECHEN:' : 'V-TGM ANSPRECHEN:';
    askOnce({
      prompt: title, hint: 'OPTIONAL.', choices,
      onPick: (key) => {
        if (key === '__leave') return;
        S.talkSeen[who + ':' + key] = true;
        const t = topics.find(x => x.key === key);
        if (t && t.onPick) t.onPick();
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // BELICHTUNG
  // Three stages, one grammar: watch a short event, work out what it
  // told you, then set the array. Looking again costs reserve; looking
  // carefully costs nothing.
  // ═══════════════════════════════════════════════════════════════
  let bel = null;
  let belTimers = [];

  function clearBelTimers() {
    belTimers.forEach(clearTimeout);
    belTimers = [];
    if (bel) bel.busy = false;          // never leave input wedged
  }
  function later(fn, ms) { belTimers.push(setTimeout(fn, ms)); }

  function openBelichtung() {
    if (S.revisit) {
      say([
        { speaker:'SYSTEM', text:'BELICHTUNGSARRAY // KALIBRIERT. DAS BEOBACHTUNGSNETZ LÄUFT.' },
        { speaker:'L-UX',   text:'„Das steht. Da musst du nichts mehr sehen."' },
        { speaker:'R-3MI',  text:'„Ich schaue trotzdem gern hin."' },
        { speaker:'L-UX',   text:'„Das ist der Sinn davon."' },
      ]);
      return;
    }
    if (S.solved) { finishChapter(); return; }
    if (bel) {                           // already open — just re-focus it
      document.getElementById('belModal').classList.remove('hidden');
      return;
    }
    bel = { stage: 0, reserve: RESERVE_MAX, busy: false, observedOnce: false, answer: null, event: null, wrong: 0 };

    say([
      { speaker:'L-UX',  text:'„Das Array macht kurze Aufnahmen. Danach ist wieder alles neutral."' },
      { speaker:'L-UX',  text:'„Nicht merken, was geleuchtet hat."' },
      { speaker:'SYSTEM',text:'Pause.' },
      { speaker:'L-UX',  text:'„Merken, was sich verändert hat."' },
      { speaker:'R-3MI', text:'„Und wenn ich zu langsam bin?"' },
      { speaker:'L-UX',  text:'„Dann bist du langsam. Das kostet nichts."' },
      { speaker:'L-UX',  text:'„Nochmal hinschauen kostet."' },
    ], () => {
      document.getElementById('belModal').classList.remove('hidden');
      document.getElementById('hintBar').classList.remove('hidden');
      startStage(1);
    });
  }

  function startStage(stage) {
    clearBelTimers();
    bel.stage        = stage;
    bel.reserve      = RESERVE_MAX;
    bel.busy         = false;
    bel.observedOnce = false;
    bel.wrong        = 0;
    bel.logReady     = false;     // stage 3's calibration log, once it has played
    bel.event        = buildEvent(stage);
    bel.answer       = blankAnswer(stage);

    S.hints.active = 'stage' + stage;
    S.hints.step   = 0;
    updateHintBar();

    document.getElementById('belStage').textContent =
      `STUFE ${stage} / 3 — ${['', 'BLENDEN I', 'BLENDEN II', 'SPEKTRUM'][stage]}`;
    document.getElementById('belTask').textContent = TASK_TEXT[stage];
    saveState();

    paintReserve();
    renderScope(null);
    renderAnswer();
    setBelStatus('BEREIT — [ BEOBACHTEN ] STARTET DIE AUFNAHME.', '');
    setObserveLabel();
  }

  const TASK_TEXT = {
    1: 'Das Array pulst im Gleichtakt — bis auf eine Ausnahme. Welche Blende ist wann ausgeschert?',
    2: 'Wie verhalten sich B, C und D zu A?',
    3: 'Zwei Eichmessungen — keine reicht für sich allein. Wende die Regel auf die neue Messung an.',
  };

  // ─── The observable event for each stage (generated per attempt) ───
  function buildEvent(stage) {
    if (stage === 1) {
      // The whole array pulses in unison; exactly one blend drops out of step
      // for exactly one beat. Nothing has to be memorised — it has to be SEEN.
      // Rerolled until the rhythm actually reads as a rhythm, and never on the
      // opening beat (the player is still settling into the recording).
      const BEATS = 6;
      let unison, tries = 0;
      do {
        unison = Array.from({ length: BEATS }, () => Math.random() < 0.5);
        tries++;
      } while (tries < 60 && transitions(unison) < 2);
      return {
        unison,
        deviant: randInt(0, 3),          // which blend breaks ranks
        deviantBeat: randInt(1, BEATS - 1),
      };
    }
    if (stage === 2) {
      // A drives; the other three each take one role. The event is only
      // usable if the three roles are actually TELLABLE APART from it, so
      // reroll until every pair differs on at least two beats — otherwise a
      // careful observer could still be left guessing.
      const BEATS = 5, MIN_DIFF = 2;
      let drive, noise, tries = 0;
      do {
        drive = Array.from({ length: BEATS }, () => randInt(1, 5));
        noise = Array.from({ length: BEATS }, () => randInt(1, 5));
        tries++;
      } while (tries < 60 && !readable(drive, noise, MIN_DIFF));
      return { drive, roles: shuffle(['follow', 'against', 'free']), noise };
    }
    // Stage 3 — the array answers a stimulus by RANK, not by position: one
    // channel always takes the strongest of the three inputs, one the middle,
    // one the weakest. Which channel takes which rank is what the calibration
    // passes reveal. The player then applies that rule to a stimulus they have
    // never seen a response for, so nothing can be copied.
    const rank = shuffle([0, 1, 2]);      // rank[channel] → 0 strongest · 2 weakest
    const { examples, target } = buildCalibration();
    return { rank, examples, target };
  }

  /**
   * The two calibration passes are built as deliberate complements, not as two
   * independent samples. Each one is readable on its own but incomplete on its
   * own, so both are needed and neither is redundant:
   *
   *   pass A — one clear peak over two EQUAL lower inputs. Because the lower
   *            two are tied, the middle and weakest ranks answer with the same
   *            number and cannot be told apart; only the channel holding the
   *            strongest rank stands out.
   *   pass B — two EQUAL higher inputs over one clear trough. The mirror case:
   *            only the channel holding the weakest rank stands out.
   *
   * Strongest from A, weakest from B, and the channel left over is the middle.
   * The tie inside each pass is the whole point — it is what keeps a single
   * pass from giving the answer away.
   */
  const LVL_MIN = 1, LVL_MAX = 5;   // 0 would render as an unreadable empty bar
  const TIE_LO_MAX = 3;             // leaves room for a clearly separated peak
  const GAP_MIN = 2;                // peak/trough must be visibly, countably apart

  function buildCalibration() {
    let a = calibPair(), b = calibPair(), target = targetLevels();
    for (let t = 0; t < 400 && !calibUsable(a, b, target); t++) {
      a = calibPair(); b = calibPair(); target = targetLevels();
    }
    return {
      // shape is guaranteed regardless of how the search above ended
      examples: [shuffle([a.hi, a.lo, a.lo]), shuffle([b.hi, b.hi, b.lo])],
      target,
    };
  }

  function calibPair() {
    const lo = randInt(LVL_MIN, TIE_LO_MAX);
    return { hi: randInt(lo + GAP_MIN, LVL_MAX), lo };
  }

  /** Cosmetic guards: two passes that read as one, or a new stimulus that
   *  shows nothing the passes did not already show, both feel like bugs. */
  function calibUsable(a, b, target) {
    if (a.hi === b.hi && a.lo === b.lo) return false;
    const shown = new Set([a.hi, a.lo, b.hi, b.lo]);
    return target.some(v => !shown.has(v));
  }

  /** Three different levels, so "strongest / middle / weakest" is well defined
   *  and the response has three distinct values — one unambiguous answer. */
  function targetLevels() {
    const pool = [];
    for (let v = LVL_MIN; v <= LVL_MAX; v++) pool.push(v);
    return shuffle(shuffle(pool).slice(0, 3));
  }
  /** Apply the array's rank rule to a stimulus. */
  function rankResponse(levels, rank) {
    const desc = levels.slice().sort((x, y) => y - x);   // strongest first
    return rank.map(r => desc[r]);
  }
  function transitions(bits) {
    let n = 0;
    for (let i = 1; i < bits.length; i++) if (bits[i] !== bits[i-1]) n++;
    return n;
  }

  /**
   * Can a viewer separate "follows A", "goes against A" and "ignores A"?
   * Each pair of the three resulting traces must differ on at least `min`
   * beats; otherwise the recording is ambiguous and gets rerolled.
   */
  function readable(drive, noise, min) {
    const follow  = drive;
    const against = drive.map(v => 6 - v);
    const diff = (x, y) => x.reduce((n, v, i) => n + (v !== y[i] ? 1 : 0), 0);
    return diff(follow, against) >= min
        && diff(noise,  follow)  >= min
        && diff(noise,  against) >= min;
  }

  function blankAnswer(stage) {
    if (stage === 1) return { blend: null, beat: null };
    if (stage === 2) return [null, null, null];        // role per B, C, D
    return [0, 0, 0];                                  // RGB 0..5
  }

  // ─── Observation playback ───────────────────────────────────────
  function observe() {
    if (!bel || bel.busy || S.solved) return;

    if (bel.observedOnce) {
      if (bel.reserve - COST_OBSERVE < 0) { overexpose(); return; }
      bel.reserve -= COST_OBSERVE;
      paintReserve();
      reactObserve();
    }
    bel.observedOnce = true;

    bel.busy = true;
    setObserveLabel();
    setBelStatus('AUFNAHME LÄUFT…', '');
    playSound('ch3_observe.mp3');

    // Frames may hold longer than one beat — a calibration pass carries far
    // more to read than a single pulse, and nothing here should reward haste.
    const beats = buildBeats(bel.stage, bel.event);
    let at = 0;
    beats.forEach((frame, i) => {
      const start = at;
      later(() => {
        renderScope(frame);
        tone({ freq: 300 + i * 40, type:'sine', dur: 0.09, vol: 0.07 });
      }, start);
      at += BEAT * (frame.hold || 1);
    });

    later(() => {
      // Stage 3 keeps its calibration passes on screen from here on. Looking
      // costs reserve; remembering must not — the log is the record so the
      // player can reason about it for as long as they like.
      if (bel.stage === 3) bel.logReady = true;
      renderScope(null);
      bel.busy = false;
      setObserveLabel();
      setBelStatus(bel.stage === 3
        ? 'EICHPROTOKOLL GESICHERT. STELL DAS ARRAY EIN.'
        : 'AUFNAHME BEENDET. STELL DAS ARRAY EIN.', '');
    }, at + 260);
  }

  /** Turn an event into the frames the scope shows, one per beat. */
  function buildBeats(stage, ev) {
    if (stage === 1) {
      return ev.unison.map((on, beat) => ({
        kind: 'pulse',
        on: [0,1,2,3].map(b => (b === ev.deviant && beat === ev.deviantBeat) ? !on : on),
        beat: beat + 1,
        total: ev.unison.length,
      }));
    }
    if (stage === 2) {
      return ev.drive.map((a, beat) => {
        const vals = [a];
        ev.roles.forEach((role, k) => {
          vals.push(role === 'follow' ? a : role === 'against' ? (6 - a) : ev.noise[beat]);
        });
        return { kind:'bars', levels: vals, beat: beat + 1, total: ev.drive.length };
      });
    }
    // Stage 3 — the calibration passes. Each shows a stimulus and the response
    // it produced. The stimulus the player must answer for is NOT in here; it
    // sits in the answer panel, so this is a rule to learn, not a value to copy.
    return ev.examples.map((levels, i) => ({
      kind: 'calib',
      idx: i + 1,
      total: ev.examples.length,
      levels,
      out: rankResponse(levels, ev.rank),
      hold: 3,                                  // a pass needs real reading time
    }));
  }

  // ─── Scope rendering ────────────────────────────────────────────
  function renderScope(frame) {
    const scope = document.getElementById('belScope');
    if (!scope) return;

    if (!frame) {
      if (bel && bel.stage === 3 && bel.logReady) { scope.innerHTML = calibLogHTML(); return; }
      scope.innerHTML = `<div class="bel-scope-idle sys-text">ARRAY NEUTRAL</div>`;
      return;
    }

    if (frame.kind === 'pulse') {
      scope.innerHTML =
        `<div class="bel-beat sys-text">TAKT ${frame.beat} / ${frame.total}</div>` +
        `<div class="bel-shutters">` + frame.on.map((on, i) =>
        `<div class="bel-shutter ${on ? 'flare' : ''}">
           <div class="bel-shutter-glow" style="opacity:${on ? 0.95 : 0.08}"></div>
           <span class="bel-shutter-state sys-text">${on ? '●' : '○'}</span>
           <span class="bel-shutter-name sys-text">${'ABCD'[i]}</span>
         </div>`).join('') + `</div>`;
      return;
    }

    if (frame.kind === 'bars') {
      scope.innerHTML =
        `<div class="bel-beat sys-text">TAKT ${frame.beat} / ${frame.total}</div>` +
        `<div class="bel-bars">` + frame.levels.map((lv, i) =>
        `<div class="bel-bar-wrap">
           <div class="bel-bar">${segs(lv, 5)}</div>
           <span class="bel-bar-name sys-text">${'ABCD'[i]}</span>
         </div>`).join('') + `</div>`;
      return;
    }

    // A calibration pass: a stimulus and the response it produced. Both sides
    // are readable without colour (countable segments), because the whole
    // point is to work out the relation between them.
    scope.innerHTML =
      `<div class="bel-beat sys-text">EICHMESSUNG ${frame.idx} / ${frame.total}</div>` +
      `<div class="bel-calib">
         <div class="bel-calib-side">
           <span class="bel-calib-cap sys-text">REIZ</span>
           ${stimulusHTML(frame.levels)}
         </div>
         <div class="bel-calib-arrow sys-text">&rarr;</div>
         <div class="bel-calib-side">
           <span class="bel-calib-cap sys-text">ANTWORT</span>
           ${responseHTML(frame.out)}
         </div>
       </div>`;
  }

  /**
   * The permanent record of both calibration passes. It replaces "ARRAY
   * NEUTRAL" for stage 3 once the recording has played all the way through,
   * and stays until the stage is solved or regenerated. Reading it back costs
   * nothing — only asking the array for a fresh look does.
   */
  function calibLogHTML() {
    const ev = bel.event;
    return `<div class="bel-log">
        <div class="bel-log-h sys-text">EICHPROTOKOLL</div>
        <div class="bel-log-rows">` +
      ev.examples.map((levels, i) =>
        `<div class="bel-log-row">
           <span class="bel-log-idx sys-text">EICHMESSUNG ${i + 1}</span>
           <div class="bel-calib compact">
             <div class="bel-calib-side">
               <span class="bel-calib-cap sys-text">REIZ</span>
               ${stimulusHTML(levels)}
             </div>
             <div class="bel-calib-arrow sys-text">&rarr;</div>
             <div class="bel-calib-side">
               <span class="bel-calib-cap sys-text">ANTWORT</span>
               ${responseHTML(rankResponse(levels, ev.rank))}
             </div>
           </div>
         </div>`).join('') +
      `</div>
      </div>`;
  }

  const CH_NAMES = ['ROT', 'GRÜN', 'BLAU'];
  const CH_COLS  = ['#e0483c', '#3ec27a', '#3a8fd4'];

  function stimulusHTML(levels) {
    return `<div class="bel-stim">` + levels.map((lv, i) =>
      `<div class="bel-stim-item">
         <span class="bel-stim-name sys-text">${['I','II','III'][i]}</span>
         <div class="bel-bar">${segs(lv, 5)}</div>
       </div>`).join('') + `</div>`;
  }

  function responseHTML(out) {
    const c = out.map(v => v * 51);
    return `<div class="bel-resp">` + out.map((lv, i) =>
      `<div class="bel-resp-item" style="--chan:${CH_COLS[i]}">
         <span class="bel-resp-name sys-text">${CH_NAMES[i]}</span>
         <div class="bel-bar chan">${segs(lv, 5)}</div>
       </div>`).join('') +
      `<div class="bel-mix small" style="background:rgb(${c[0]},${c[1]},${c[2]})"></div></div>`;
  }

  function segs(n, total) {
    let out = '';
    for (let i = 0; i < total; i++) out += `<span class="bel-seg ${i < n ? 'on' : ''}"></span>`;
    return out;
  }

  // ─── Answer controls ────────────────────────────────────────────
  function renderAnswer() {
    const host = document.getElementById('belAnswer');
    if (!host || !bel) return;

    if (bel.stage === 1) {
      const total = bel.event.unison.length;
      const beats = Array.from({ length: total }, (_, i) => i + 1);
      host.innerHTML =
        `<div class="bel-roles">
           <div class="bel-role-row">
             <span class="bel-role-name sys-text">BLENDE</span>
             <div class="bel-role-opts compact">` + [0,1,2,3].map(i =>
               `<button class="bel-role-btn ${bel.answer.blend === i ? 'on' : ''}"
                        data-pick="blend" data-v="${i}"
                        aria-label="Blende ${'ABCD'[i]} ist ausgeschert"
                        aria-pressed="${bel.answer.blend === i}">${'ABCD'[i]}</button>`).join('') +
        `    </div>
           </div>
           <div class="bel-role-row">
             <span class="bel-role-name sys-text">TAKT</span>
             <div class="bel-role-opts compact">` + beats.map(n =>
               `<button class="bel-role-btn ${bel.answer.beat === n ? 'on' : ''}"
                        data-pick="beat" data-v="${n}"
                        aria-label="Im Takt ${n}"
                        aria-pressed="${bel.answer.beat === n}">${n}</button>`).join('') +
        `    </div>
           </div>
         </div>`;
      host.querySelectorAll('.bel-role-btn').forEach(b =>
        b.addEventListener('click', () => {
          if (!bel || bel.busy || S.solved) return;
          bel.answer[b.dataset.pick] = +b.dataset.v;
          renderAnswer();
        }));
      return;
    }

    if (bel.stage === 2) {
      const roles = [['follow','FOLGT A'], ['against','GEGEN A'], ['free','UNABHÄNGIG']];
      host.innerHTML = `<div class="bel-roles">` + [0,1,2].map(i =>
        `<div class="bel-role-row">
           <span class="bel-role-name sys-text">${'BCD'[i]}</span>
           <div class="bel-role-opts">` + roles.map(([val, label]) =>
             `<button class="bel-role-btn ${bel.answer[i] === val ? 'on' : ''}"
                      data-i="${i}" data-v="${val}"
                      aria-label="${'BCD'[i]} ${label}"
                      aria-pressed="${bel.answer[i] === val}">${label}</button>`).join('') +
        `   </div>
         </div>`).join('') + `</div>`;
      host.querySelectorAll('.bel-role-btn').forEach(b =>
        b.addEventListener('click', () => {
          if (!bel || bel.busy || S.solved) return;
          bel.answer[+b.dataset.i] = b.dataset.v;
          renderAnswer();
        }));
      return;
    }

    // The stimulus to answer for stays on screen the whole time — the player
    // is meant to transfer a rule, not to remember three numbers.
    const cur = `rgb(${bel.answer[0]*51},${bel.answer[1]*51},${bel.answer[2]*51})`;
    host.innerHTML =
      `<div class="bel-newstim">
         <span class="bel-calib-cap sys-text">NEUE MESSUNG — REIZ</span>
         ${stimulusHTML(bel.event.target)}
       </div>
       <div class="bel-swatches">
         <div class="bel-swatch-wrap"><span class="sys-text">DEINE ANTWORT</span>
           <div class="bel-sw" style="background:${cur}"></div></div>
       </div>
       <div class="bel-dials">` + [0,1,2].map(i =>
        `<div class="bel-dial">
           <label class="sys-text">${CH_NAMES[i]}</label>
           <div class="control-row">
             <button class="control-btn" data-a="${i}" data-d="-1" aria-label="${CH_NAMES[i]} verringern">−</button>
             <span class="bel-dial-val">${bel.answer[i]}</span>
             <button class="control-btn" data-a="${i}" data-d="1" aria-label="${CH_NAMES[i]} erhöhen">+</button>
           </div>
           <div class="bel-bar mini">${segs(bel.answer[i], 5)}</div>
         </div>`).join('') + `</div>`;
    host.querySelectorAll('.control-btn').forEach(b =>
      b.addEventListener('click', () => nudge(+b.dataset.a, +b.dataset.d, 0, 5)));
  }

  function nudge(i, dir, lo, hi) {
    if (!bel || bel.busy || S.solved) return;
    bel.answer[i] = Math.max(lo, Math.min(hi, (bel.answer[i] || 0) + dir));
    renderAnswer();
  }

  // ─── Commit ─────────────────────────────────────────────────────
  function submit() {
    if (!bel || bel.busy || S.solved) return;
    if (!bel.observedOnce) {
      setBelStatus('NOCH KEINE AUFNAHME. ZUERST BEOBACHTEN.', 'warn');
      return;
    }

    const { ok, why } = checkAnswer();
    if (ok) { stageSolved(); return; }

    if (bel.reserve - COST_WRONG < 0) { overexpose(); return; }
    bel.reserve -= COST_WRONG;
    bel.wrong++;
    paintReserve();
    setBelStatus(why || 'EINSTELLUNG PASST NICHT ZUR AUFNAHME.', 'error');
    playSound('ch3_bad.mp3');
    tone({ freq: 180, type:'sawtooth', dur: 0.2, vol: 0.12, glideTo: 110 });
    reactWrong();
  }

  function checkAnswer() {
    const a = bel.answer, ev = bel.event;

    if (bel.stage === 1) {
      if (a.blend == null || a.beat == null) return { ok:false, why:'BLENDE UND TAKT AUSWÄHLEN.' };
      return { ok: a.blend === ev.deviant && a.beat === ev.deviantBeat + 1 };
    }

    if (bel.stage === 2) {
      if (a.some(v => !v)) return { ok:false, why:'JEDE BLENDE BRAUCHT EINE ZUORDNUNG.' };
      return { ok: ev.roles.every((role, i) => a[i] === role) };
    }

    const want = rankResponse(ev.target, ev.rank);
    return { ok: want.every((v, i) => a[i] === v) };
  }

  function stageSolved() {
    clearBelTimers();
    bel.busy = true;
    playSound('ch3_stage_ok.mp3');
    tone({ freq: 520, type:'triangle', dur: 0.45, vol: 0.12, glideTo: 820 });
    setBelStatus('AUFNAHME BESTÄTIGT.', 'ok');

    const first = bel.wrong === 0;
    const stage = bel.stage;

    if (stage < 3) {
      const lines = stage === 1
        ? (first
            ? [ { speaker:'L-UX',  text:'„Gut."' },
                { speaker:'R-3MI', text:'„Das ist bei ihm ungefähr eine Parade."' },
                { speaker:'L-UX',  text:'„Nächste Ebene. Da reagieren sie aufeinander."' } ]
            : [ { speaker:'SYSTEM',text:'BLENDEN-EBENE 1 KALIBRIERT.' },
                { speaker:'L-UX',  text:'„Siehst du. Ging doch."' },
                { speaker:'L-UX',  text:'„Nächste Ebene. Da reagieren sie aufeinander."' } ])
        : [ { speaker:'SYSTEM',text:'BLENDEN-EBENE 2 KALIBRIERT.' },
            { speaker:'V-TGM', text:'"Now the spectrum."', subtitle:'Jetzt das Spektrum.' },
            { speaker:'L-UX',  text:'„Farbe ist selten nur Farbe."' } ];
      say(lines, () => startStage(stage + 1));
    } else {
      solveBelichtung();
    }
  }

  /** Running the reserve out is overexposure, not lateness. */
  function overexpose() {
    clearBelTimers();
    bel.busy = true;
    bel.reserve = 0;
    paintReserve();
    playSound('ch3_blackout.mp3');
    try { GameEngine.fx.flash('rgba(255,255,255,0.55)'); } catch(_) {}
    setBelStatus('AUFNAHME ÜBERBELICHTET.', 'error');

    const firstFail = !S.react.failedOnce;
    S.react.failedOnce = true;

    say([
      { speaker:'SYSTEM', text:'AUFNAHME ÜBERBELICHTET. BEOBACHTUNG UNBRAUCHBAR.' },
      ...(firstFail
        ? [ { speaker:'L-UX', text:'„Alles gut."' },
            { speaker:'L-UX', text:'„Du hast gesehen, was passiert ist. Beim nächsten Mal siehst du es früher."' } ]
        : [ { speaker:'L-UX', text:'„Zu viel geschaut. Zu wenig gesehen."' },
            { speaker:'SYSTEM',text:'Pause.' },
            { speaker:'L-UX', text:'„Nochmal."' } ]),
    ], () => startStage(bel.stage));      // same stage, fresh event, full reserve
  }

  function paintReserve() {
    const pct = Math.max(0, Math.min(100, bel ? bel.reserve : 0));
    const fill = document.getElementById('belMeter');
    if (fill) {
      fill.style.width = pct + '%';
      fill.classList.toggle('low', pct < 30);
    }
    const lbl = document.getElementById('belMeterPct');
    if (lbl) lbl.textContent = Math.round(pct) + '%';
  }

  function setObserveLabel() {
    const btn = document.getElementById('belObserveBtn');
    if (!btn || !bel) return;
    btn.disabled = bel.busy;
    btn.textContent = bel.observedOnce
      ? `[ ERNEUT BEOBACHTEN · −${COST_OBSERVE}% ]`
      : '[ BEOBACHTEN ]';
  }

  function setBelStatus(text, type) {
    const el = document.getElementById('belStatus');
    if (!el) return;
    el.textContent = text;
    el.className = 'puzzle-status sys-text' + (type ? ' ' + type : '');
  }

  function belReset() {
    if (!bel || bel.busy || S.solved) return;
    bel.answer = blankAnswer(bel.stage);
    renderAnswer();
    setBelStatus('EINSTELLUNG ZURÜCKGESETZT. DIE AUFNAHME BLEIBT.', '');
  }

  // ─── Occasional reactions ───────────────────────────────────────
  function reactObserve() {
    S.react.observes = (S.react.observes || 0) + 1;
    if (S.react.observes === 3 && !S.react.sureNoted) {
      S.react.sureNoted = true;
      say([
        { speaker:'L-UX',  text:'„Du willst sicher sein."' },
        { speaker:'SYSTEM',text:'Pause.' },
        { speaker:'L-UX',  text:'„Versteh ich."' },
      ]);
    }
  }

  function reactWrong() {
    if (bel.wrong === 2 && !S.react.guessNoted) {
      S.react.guessNoted = true;
      say([
        { speaker:'L-UX',  text:'„Du rätst."' },
        { speaker:'R-3MI', text:'„Ich nenne das experimentelle Forschung."' },
        { speaker:'L-UX',  text:'„Du rätst auch."' },
      ]);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ACT 6 — THE NETWORK COMES BACK
  // ═══════════════════════════════════════════════════════════════
  function solveBelichtung() {
    clearBelTimers();
    S.solved = true;
    S.lit    = true;

    // Persist before anything narrative runs.
    GameEngine.state.markChapterComplete(CHAPTER_ID);
    clearSavedState();

    document.getElementById('belModal').classList.add('hidden');
    document.getElementById('hintBar').classList.add('hidden');
    bel = null;

    setScene('obs-lit');
    setProgress(37);
    loadHotspots();
    playSound('ch3_array_online.mp3');
    try { GameEngine.fx.flash('rgba(255,190,120,0.26)'); } catch(_) {}
    tone({ freq: 260, type:'sine', dur: 1.8, vol: 0.12, glideTo: 520 });

    say([
      { speaker:'SYSTEM', text:'BEOBACHTUNGSARRAY ONLINE. SPEKTRUM STABIL.' },
      { speaker:'SYSTEM', text:'Reihe um Reihe erwachen die Linsen. Der Sektor füllt sich mit warmem, bernsteinfarbenem Licht.' },
      { speaker:'SYSTEM', text:'Auf den Wandmonitoren erscheinen Bilder. Ein Gang. Noch einer. Eine Halle, die niemand von euch je betreten hat.' },
      { speaker:'SYSTEM', text:'Ein Dutzend Orte, gleichzeitig, zum ersten Mal seit Jahren.' },
    ], () => act7_quiet());
  }

  function act7_quiet() {
    say([
      { speaker:'SYSTEM', text:'L-UX sagt eine Weile nichts. Er schaut nur.' },
      { speaker:'V-TGM',  text:'"You missed it."', subtitle:'Du hast es vermisst.' },
      { speaker:'L-UX',   text:'„Ja."' },
      { speaker:'SYSTEM', text:'Auf einem der Monitore läuft ein schmaler, hässlicher Versorgungsgang. Das Licht darin steht schräg und golden.' },
      ...(S.sawWestgang
        ? [ { speaker:'L-UX',  text:'„Westgang lebt noch."' },
            { speaker:'R-3MI', text:'„Der hässliche?"' },
            { speaker:'L-UX',  text:'„Gutes Licht."' } ]
        : [ { speaker:'L-UX',  text:'„Der da lebt noch."' },
            { speaker:'R-3MI', text:'„Der ist hässlich."' },
            { speaker:'L-UX',  text:'„Gutes Licht."' } ]),
    ], () => act7_goodbye());
  }

  function act7_goodbye() {
    say([
      { speaker:'SYSTEM', text:'SEKTOR 04 — RÄTSELSEKTOR — FREIGEGEBEN.' },
      { speaker:'R-3MI',  text:'„Kommst mit?"' },
      { speaker:'SYSTEM', text:'L-UX sieht auf die Monitore. Zwölf Orte, die er seit Jahren nicht gesehen hat.' },
      { speaker:'L-UX',   text:'„Noch nicht."' },
      { speaker:'SYSTEM', text:'Pause.' },
      { speaker:'L-UX',   text:'„Hab einiges nachzusehen."' },
      { speaker:'R-3MI',  text:'„Er bleibt freiwillig in einem Raum. Das ist neu."' },
      { speaker:'L-UX',   text:'„Der Raum ist neu."' },
      { speaker:'V-TGM',  text:'"We will come back."', subtitle:'Wir kommen wieder.' },
      { speaker:'L-UX',   text:'„Ich seh euch kommen."' },
    ], finishChapter);
  }

  function finishChapter() {
    GameEngine.state.markChapterComplete(CHAPTER_ID);
    clearSavedState();
    try { GameEngine.achievements.unlock('ch3_complete'); } catch(_) {}
    try { GameEngine.audio.fanfare(); } catch(_) {}
    document.getElementById('chapterComplete').classList.remove('hidden');
    document.getElementById('ccProgress').textContent =
      `FORTSCHRITT: ${GameEngine.progress.mainProgress().done} / ${GameEngine.progress.mainProgress().total} SEKTOREN`;
    setTimeout(() => document.getElementById('ccEnter')?.focus(), 700);
  }

  // ═══════════════════════════════════════════════════════════════
  // HINTS — one shared 3-step ladder per stage.
  // L-UX redirects attention and never states values. R-3MI comes at it
  // sideways. V-TGM names the relationship plainly.
  // ═══════════════════════════════════════════════════════════════
  const HINTS = {
    stage1: [
      { lux:  { t:'„Sie machen alle dasselbe."' },
        r3mi: { t:'„Vier Blenden, ein Takt. Ehrlich gesagt ganz hübsch anzuschauen."' },
        vtgm: { t:'"The array pulses as one. That is the baseline."', s:'Das Array pulst als eines. Das ist die Grundlinie.' } },
      { lux:  { t:'„Fast alle."' },
        r3mi: { t:'„Einmal hat einer nicht mitgemacht. Nur einmal."' },
        vtgm: { t:'"Exactly one blend is out of step, on exactly one beat."', s:'Genau eine Blende ist aus dem Takt, in genau einem Takt.' } },
      { lux:  { t:'„Du musst dir nichts merken. Du musst nur den einen Moment erwischen, in dem die Reihe nicht mehr stimmt."' },
        r3mi: { t:'„Nicht auf eine einzelne Blende starren. Auf die Reihe schauen — der Ausreißer springt raus."' },
        vtgm: { t:'"Watch all four at once and wait for the row to break. Note which one broke it and when."', s:'Schau alle vier gleichzeitig an und warte, bis die Reihe bricht. Merk dir, welche sie gebrochen hat und wann.' } },
    ],
    stage2: [
      { lux:  { t:'„Du beobachtest vier Anzeigen."' },
        r3mi: { t:'„Vier Balken. Einer davon ist der Chef, glaube ich."' },
        vtgm: { t:'"Watch A first. The others answer to it."', s:'Beobachte zuerst A. Die anderen reagieren darauf.' } },
      { lux:  { t:'„Zwei davon erzählen dieselbe Geschichte."' },
        r3mi: { t:'„Einer macht immer dasselbe wie A. Einer macht immer das Gegenteil. Und einer macht, was er will."' },
        vtgm: { t:'"One mirrors A, one inverts A, one ignores A entirely."', s:'Einer spiegelt A, einer kehrt A um, einer ignoriert A völlig.' } },
      { lux:  { t:'„Beobachte nicht die Position. Beobachte, wer wem folgt."' },
        r3mi: { t:'„Wenn A hoch geht und der andere auch: folgt. Wenn A hoch geht und der andere runter: dagegen. Sonst: unabhängig."' },
        vtgm: { t:'"Compare each bar to A on two different beats. Two beats are enough to tell all three apart."', s:'Vergleiche jeden Balken bei zwei verschiedenen Takten mit A. Zwei Takte reichen, um alle drei zu unterscheiden.' } },
    ],
    stage3: [
      // OBSERVATION — what is actually on screen in each pass
      { lux:  { t:'„In jeder Eichmessung antworten zwei Kanäle mit derselben Zahl. Das ist kein Fehler."' },
        r3mi: { t:'„Bei beiden Messungen sind zwei Antworten gleich hoch und eine tanzt aus der Reihe. Bloß nicht dieselbe."' },
        vtgm: { t:'"In each pass exactly one channel stands apart. The other two are tied."', s:'In jeder Eichmessung steht genau ein Kanal allein. Die anderen beiden sind gleichauf.' } },
      // RELATIONSHIP — what the standout channel means
      { lux:  { t:'„Nicht welcher Regler. Welcher Rang."' },
        r3mi: { t:'„Die eine Messung hat genau eine Spitze. Die andere genau einen Tiefpunkt. Das verrät nicht dasselbe."' },
        vtgm: { t:'"One pass has a single peak, the other a single trough. Each names exactly one rank — and hides the other two behind the tie."', s:'Eine Messung hat genau eine Spitze, die andere genau einen Tiefpunkt. Jede benennt genau einen Rang — die anderen beiden versteckt der Gleichstand.' } },
      // METHOD — how to combine them and carry it over
      { lux:  { t:'„Zwei Ränge kannst du ablesen. Der dritte bleibt übrig."' },
        r3mi: { t:'„Den Ausreißer nach oben aus der einen Messung, den Ausreißer nach unten aus der anderen. Wer übrig bleibt, ist die Mitte."' },
        vtgm: { t:'"Take the standout channel from each pass to fix two ranks, give the leftover channel the remaining one, then sort the new stimulus and hand each channel its rank."', s:'Nimm aus jeder Eichmessung den herausstehenden Kanal, um zwei Ränge festzulegen, gib dem übrigen Kanal den letzten, sortiere dann den neuen Reiz und gib jedem Kanal seinen Rang.' } },
    ],
  };

  function useHint(who) {
    const ladder = HINTS[S.hints.active];
    if (!ladder) return;

    if (S.hints.step >= HINT_MAX) {
      const done = {
        r3mi: { speaker:'R-3MI', text:'„Mehr habe ich nicht. Und ich habe erschreckend viel geredet."' },
        vtgm: { speaker:'V-TGM', text:'"That is all I have."', subtitle:'Mehr habe ich nicht.' },
        lux:  { speaker:'L-UX',  text:'„Schau nochmal hin. Diesmal weißt du, worauf."' },
      };
      say([done[who]]);
      return;
    }

    const step = ladder[S.hints.step];
    S.hints.step++;
    updateHintBar();
    const entry = step[who] || step.vtgm;
    const speaker = who === 'r3mi' ? 'R-3MI' : who === 'vtgm' ? 'V-TGM' : 'L-UX';
    say([{ speaker, text: entry.t, subtitle: entry.s }]);
  }

  function updateHintBar() {
    const left = Math.max(0, HINT_MAX - S.hints.step);
    const el = document.getElementById('hintCount');
    if (el) el.textContent = `HINWEISE: ${left} VERFÜGBAR`;
    const done = left <= 0;
    ['hintBtnR3MI','hintBtnVTGM','hintBtnLux'].forEach(id => {
      const b = document.getElementById(id);
      if (b) b.disabled = done;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════

  // ─── CHAPTER ART ──────────────────────────────────────────────
  // An optical sector. Everything here either looks at something or is
  // used to aim something that does.
  const CH3_ART = {
    // the observation array: a bank of shutters behind a wide aperture
    c3_array: { vb:'0 0 140 100', art:
      '<ellipse class="prop-inset" cx="70" cy="94" rx="56" ry="5" opacity=".6"/>'
    + '<path class="prop-base" d="M8 90 L18 16 h104 l10 74 Z"/>'
    + '<rect class="prop-metal" x="20" y="12" width="100" height="9" rx="2"/>'
    + '<rect class="prop-lite" x="20" y="12" width="100" height="2.6" rx="1"/>'
    + '<rect class="prop-inset" x="24" y="26" width="92" height="42" rx="2"/>'
    + [0,1,2,3].map(i => `<rect class="prop-metal" x="${29 + i*22}" y="30" width="16" height="34" rx="1"/>`
                        + `<rect class="prop-lite" x="${29 + i*22}" y="30" width="3" height="34"/>`
                        + `<circle class="prop-eye" cx="${37 + i*22}" cy="47" r="5"/>`).join('')
    + '<rect class="prop-acc-dim" x="26" y="72" width="88" height="6" rx="2"/>'
    + '<rect class="prop-acc" x="60" y="70" width="8" height="10" rx="2" opacity=".7"/>'
    + '<circle class="prop-led" cx="16" cy="86" r="2.6"/>'
    + '<circle class="prop-led-3" cx="124" cy="86" r="2.6"/>' },

    // an adjustment mirror on a fine gimbal, very slightly out of true
    c3_mirror: { vb:'0 0 100 96', art:
      '<ellipse class="prop-inset" cx="50" cy="90" rx="26" ry="4" opacity=".6"/>'
    + '<rect class="prop-base" x="44" y="56" width="12" height="32" rx="3"/>'
    + '<rect class="prop-base" x="30" y="86" width="40" height="6" rx="2"/>'
    + '<g transform="rotate(-9 50 34)">'
    + '  <ellipse class="prop-metal" cx="50" cy="34" rx="34" ry="26"/>'
    + '  <ellipse class="prop-screen" cx="50" cy="34" rx="29" ry="21"/>'
    + '  <path class="prop-lite" d="M28 44 L58 16" stroke-width="3" opacity=".6"/>'
    + '  <path class="prop-lite" d="M38 48 L68 20" stroke-width="1.6" opacity=".4"/>'
    + '  <ellipse class="prop-edge" cx="50" cy="34" rx="34" ry="26" opacity=".8"/>'
    + '</g>'
    + '<circle class="prop-base" cx="50" cy="58" r="6"/>'
    + '<circle class="prop-edge" cx="50" cy="58" r="3"/>' },

    // the log terminal — hundreds of entries, one hand
    c3_logterm: { vb:'0 0 100 120', art:
      '<ellipse class="prop-inset" cx="50" cy="112" rx="32" ry="5" opacity=".6"/>'
    + '<path class="prop-metal" d="M36 108 L40 84 h20 l4 24 Z"/>'
    + '<rect class="prop-base" x="28" y="106" width="44" height="8" rx="2"/>'
    + '<rect class="prop-base" x="6" y="6" width="88" height="74" rx="5"/>'
    + '<rect class="prop-lite" x="10" y="9" width="80" height="3.4" rx="1.6"/>'
    + '<rect class="prop-screen" x="13" y="16" width="74" height="58"/>'
    + [0,1,2,3,4,5].map(i => `<line class="prop-scan" x1="19" y1="${24 + i*8}" x2="${72 - (i%3)*11}" y2="${24 + i*8}"/>`).join('')
    + '<rect class="prop-cursor" x="19" y="66" width="8" height="5"/>'
    + '<circle class="prop-led" cx="88" cy="76" r="2.6"/>' },

    // the lens that flickers out of step with the others
    c3_lens: { vb:'0 0 60 80', art:
      '<line class="prop-thin" x1="30" y1="0" x2="30" y2="12"/>'
    + '<path class="prop-base" d="M12 12 h36 l-6 16 h-24 Z"/>'
    + '<rect class="prop-lite" x="16" y="14" width="28" height="3"/>'
    + '<circle class="prop-metal" cx="30" cy="38" r="14"/>'
    + '<circle class="prop-screen" cx="30" cy="38" r="10"/>'
    + '<circle class="prop-core" cx="30" cy="38" r="5"/>'
    + '<path class="prop-glow" d="M18 46 L8 76 H52 L42 46 Z"/>'
    + '<circle class="prop-edge" cx="30" cy="38" r="14" opacity=".7"/>' },

    // the sector board — more entries than there are sectors
    c3_board: { vb:'0 0 110 84', art:
      '<rect class="prop-base" x="5" y="6" width="100" height="70" rx="3"/>'
    + '<rect class="prop-inset" x="11" y="12" width="88" height="58"/>'
    + [0,1,2,3,4].map(i => `<rect class="prop-acc-dim" x="17" y="${18 + i*10}" width="${52 - (i%3)*9}" height="4" opacity="${0.5 - i*0.06}"/>`
                          + `<line class="prop-thin" x1="17" y1="${20 + i*10}" x2="${69 - (i%3)*9}" y2="${20 + i*10}" opacity=".5"/>`).join('')
    + '<rect class="prop-acc" x="76" y="18" width="16" height="4" opacity=".65"/>'
    + '<circle class="prop-inset" cx="9" cy="10" r="2"/><circle class="prop-inset" cx="101" cy="10" r="2"/>'
    + '<circle class="prop-led-2" cx="97" cy="66" r="2.4"/>' },

    // the way on, ringed with aperture blades
    c3_obsdoor: { vb:'0 0 80 120', art:
      '<ellipse class="prop-inset" cx="40" cy="115" rx="34" ry="4" opacity=".6"/>'
    + '<rect class="prop-base" x="5" y="2" width="70" height="112" rx="4"/>'
    + '<rect class="prop-inset" x="12" y="9" width="56" height="98"/>'
    + '<rect class="prop-metal" x="13" y="10" width="26" height="96"/>'
    + '<rect class="prop-metal" x="41" y="10" width="26" height="96"/>'
    + '<line class="prop-edge" x1="40" y1="10" x2="40" y2="106" opacity=".85"/>'
    + '<circle class="prop-base" cx="40" cy="52" r="17"/>'
    + [0,1,2,3,4,5].map(i => `<path class="prop-metal" d="M40 52 L${40 + 15*Math.cos(i*Math.PI/3)} ${52 + 15*Math.sin(i*Math.PI/3)} L${40 + 15*Math.cos((i+1)*Math.PI/3)} ${52 + 15*Math.sin((i+1)*Math.PI/3)} Z" opacity="${i%2 ? 0.55 : 0.8}"/>`).join('')
    + '<circle class="prop-eye" cx="40" cy="52" r="5"/>'
    + '<circle class="prop-led" cx="40" cy="6" r="2.8"/>' },
  };

  function init() {
    try { GameEngine.props.register(CH3_ART); } catch (_) {}
    if (!GameEngine.progress.require('ch3')) return;
    setProgress(24);

    document.getElementById('belObserveBtn')?.addEventListener('click', () => observe());
    document.getElementById('belSubmitBtn')?.addEventListener('click', () => submit());
    document.getElementById('belResetBtn')?.addEventListener('click', () => belReset());

    showTitleCard();
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════
  return {
    init,
    clickRobot,
    useHint,
    belReset,
    observe,
    submit,
  };

})();

document.addEventListener('DOMContentLoaded', () => Chapter3.init());
