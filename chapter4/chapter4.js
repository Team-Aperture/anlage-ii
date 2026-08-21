/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 04 — RÄTSELSEKTOR
 * Guest: B-RADF1SH — Verschlussprüfer. Calm, practical, patient.
 *        His authority is never claimed, only demonstrated: he has
 *        taken enough mechanisms apart to know how they usually fail.
 *
 * GROSS HEISST NICHT KOMPLIZIERT.
 *
 * The chapter is one continuous problem, not a chain of scenes. The
 * player walks into a workshop that is already running and inspects a
 * single large mechanism — DAS VIERFACH-SCHLOSS — made of four
 * subsystems that can be worked in almost any order:
 *
 *   MUSTER        the marking strip that feeds the rings' symbol wheel
 *   GEWICHT       the four counterweights the rings hang from
 *   TAKT          the four pistons that drive the rings
 *   AUSRICHTUNG   the gear train that decides which way they turn
 *
 * Each ring has exactly one plate, one counterweight, one piston and a
 * share of the train — that is what makes the four modules one machine.
 * Every subsystem hands the central lock a single reference value; the
 * final alignment is deliberately tiny once all four are in hand.
 *
 * Every instance is generated at runtime and rerolled until the shown
 * evidence forces exactly one reading. Nothing here is timed, nothing
 * punishes reading, and no optional object or conversation gates
 * progress.
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter4 = (() => {
  'use strict';

  const CHAPTER_ID = 'ch4';
  const HINT_MAX   = 3;          // one shared ladder per module
  const WEIGH_MAX  = 5;          // balance runs before the beam must settle
  const TRAIN_LEN  = 5;          // couplings between drive and Laufring
  const PLATES     = 8;          // marking plates on the strip

  const SYM   = ['◆', '▲', '■', '●'];
  const SYMN  = ['RAUTE', 'DREIECK', 'QUADRAT', 'KREIS'];
  const ROMAN = ['I', 'II', 'III', 'IV'];

  const ORDER = ['pattern', 'weight', 'timing', 'orient'];
  const MOD = {
    pattern: { name:'MUSTER',      sub:'MARKIERSTRECKE',   out:'LEITZEICHEN'  },
    weight:  { name:'GEWICHT',     sub:'PRÜFWAAGE',        out:'LEITRING'     },
    timing:  { name:'TAKT',        sub:'KOLBENSTEUERUNG',  out:'KOLBENFOLGE'  },
    orient:  { name:'AUSRICHTUNG', sub:'GETRIEBEZUG',      out:'LAUFRICHTUNG' },
  };

  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const S = {
    modules: {
      pattern: { solved:false, output:null, opened:0, fails:0 },
      weight:  { solved:false, output:null, opened:0, fails:0 },
      timing:  { solved:false, output:null, opened:0, fails:0 },
      orient:  { solved:false, output:null, opened:0, fails:0 },
    },
    finalSolved: false,
    finalFails:  0,
    sigFound:    false,
    froschiMentioned: false,
    started:     false,          // room is live
    ended:       false,
    seen:        {},             // hotspot examine counts
    talkSeen:    {},
    coaching:    { pool:{}, lastModule:null, switches:0 },
    hints:       { step:0, active:null, used:0 },
    praise:      0,
    excuse:      0,
  };

  // live puzzle instances — built on first open, kept until solved
  const inst = { pattern:null, weight:null, timing:null, orient:null, final:null };

  let openModal = null;          // module key | 'final' | null
  let timers = [];
  let busy = false;

  function clearTimers() { timers.forEach(clearTimeout); timers = []; busy = false; }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

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
   * engine keeps a single completion callback, so a line started here would
   * silently discard whatever the running dialogue was going to do.
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

  function showRobots(v)   { document.getElementById('robotIcons').classList.toggle('hidden', !v); }
  function showBradfish(v) { document.getElementById('bradfishIcon').classList.toggle('hidden', !v); }
  function setProgress(pct){ const el = document.getElementById('reactProgress'); if (el) el.textContent = `REAKTIVIERUNG: ${pct}%`; }
  function playSound(src)  { try { GameEngine.audio.sfx(src); } catch(_) {} }
  function tone(o)         { try { GameEngine.audio.tone(o); } catch(_) {} }
  function say(lines, after) { GameEngine.dialogue.load(lines, after); }

  function bump(key) { S.seen[key] = (S.seen[key] || 0) + 1; return S.seen[key]; }
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
  function solvedCount() { return ORDER.filter(k => S.modules[k].solved).length; }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

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
  // TITLE CARD
  // ═══════════════════════════════════════════════════════════════
  function showTitleCard() {
    const card = document.getElementById('titleCard');
    setTimeout(() => {
      card.classList.add('fading');
      setTimeout(() => { card.style.display = 'none'; arrival(); }, 700);
    }, 3000);
  }

  // ═══════════════════════════════════════════════════════════════
  // ARRIVAL — the workshop is already running. No introduction scene,
  // no reaction gate, no question menu. He barely looks up.
  // ═══════════════════════════════════════════════════════════════
  function arrival() {
    setScene('werk-dim');
    clearHotspots();
    showRobots(true);
    showBradfish(false);
    try { GameEngine.music.play('ch4_ambient'); } catch(_) {}

    say([
      { speaker:'SYSTEM', text:'SEKTOR 04 — RÄTSELSEKTOR.' },
      { speaker:'SYSTEM', text:'*KLACK.*' },
      { speaker:'SYSTEM', text:'*KLACK.*' },
      { speaker:'SYSTEM', text:'*…KLACK.*' },
      { speaker:'R-3MI',  text:'„Oh."' },
      { speaker:'V-TGM',  text:'"He is still doing it."', subtitle:'Er macht es immer noch.' },
      { speaker:'SYSTEM', text:'Der Sektor ist keine Halle, sondern eine Werkstatt. Werkbänke, aufgeschraubte Gehäuse, Ersatzzahnräder nach Größe sortiert. An den Wänden hängen Risszeichnungen, jede zweite mit Korrekturen überklebt.' },
      { speaker:'SYSTEM', text:'In der Mitte steht ein Verschluss, der zu groß für den Raum wirkt. Vier Ringe, vier Kolben, vier Gegengewichte, ein Getriebezug, der einmal um alles herumläuft.' },
      { speaker:'SYSTEM', text:'Davor kniet eine Einheit mit einem Prüfhaken in der Hand. Sie dreht sich nicht um.' },
      { speaker:'B-RADF1SH', text:'„Wenn ihr durch die Tür wollt: zwei Minuten."' },
      { speaker:'R-3MI',  text:'„Das sagst du seit Jahren."' },
      { speaker:'B-RADF1SH', text:'„Dann war die Schätzung schlecht."' },
    ], competence);
  }

  function competence() {
    playSound('ch4_bradfish.mp3');
    say([
      { speaker:'SYSTEM', text:'Irgendwo im Verschluss setzt etwas aus. Ein Prüflauf startet von selbst.' },
      { speaker:'SYSTEM', text:'PRÜFLAUF 4-A. ANALYSE—' },
      { speaker:'B-RADF1SH', text:'„Feder links ist gebrochen."' },
      { speaker:'SYSTEM', text:'ANALYSE ABGESCHLOSSEN. FEDER L-02 DEFEKT.' },
      { speaker:'R-3MI',  text:'„Macht ihr das jetzt ALLE?!"' },
      { speaker:'B-RADF1SH', text:'„Was?"' },
      { speaker:'R-3MI',  text:'„Dinge wissen, bevor das System sie sagt."' },
      { speaker:'B-RADF1SH', text:'„Die Feder klingt seit letzter Woche falsch. Ist kein Kunststück."' },
      { speaker:'SYSTEM', text:'Er richtet sich auf. Jetzt sieht er dich an — kurz, freundlich, ohne Aufwand.' },
      { speaker:'B-RADF1SH', text:'„B-RADF1SH. Verschlussprüfer."' },
      { speaker:'B-RADF1SH', text:'„Das da ist das Vierfach-Schloss. Vier Teilsysteme. Ich hab drei davon schon mal auseinandergehabt."' },
      { speaker:'R-3MI',  text:'„Und?"' },
      { speaker:'B-RADF1SH', text:'„Und wieder zusammen. Falsch herum. Zweimal."' },
      { speaker:'SYSTEM', text:'Pause.' },
      { speaker:'B-RADF1SH', text:'„Nimm dir eins. Egal welches."' },
      { speaker:'R-3MI',  text:'„Das war überraschend wenig Widerstand."' },
      { speaker:'B-RADF1SH', text:'„Vier stehen vor einem Schloss. Wär dumm, nur zwei Hände zu benutzen."' },
    ], () => { S.started = true; showBradfish(true); loadRoom(); });
  }

  // ═══════════════════════════════════════════════════════════════
  // THE ROOM — everything is reachable from here, in any order.
  // ═══════════════════════════════════════════════════════════════
  function sceneKey() {
    if (S.finalSolved) return 'werk-open';
    const n = solvedCount();
    return n >= 4 ? 'werk-lit' : n >= 2 ? 'werk-warm' : 'werk-dim';
  }

  function loadRoom() {
    clearHotspots();
    setScene(sceneKey());
    setProgress(S.finalSolved ? 51 : 37 + solvedCount() * 3);

    // ── set dressing: a workshop, not a vault
    addProp({ prop:'light',   x:44, y:1,  w:12, h:8 });
    addProp({ prop:'light',   x:12, y:2,  w:10, h:7, cls:'prop-far' });
    addProp({ prop:'duct',    x:16, y:0,  w:52, h:6, cls:'prop-far' });
    addProp({ prop:'column',  x:0,  y:10, w:7,  h:58 });
    addProp({ prop:'column',  x:93, y:10, w:7,  h:58 });
    addProp({ prop:'cables',  x:64, y:4,  w:8,  h:20, cls:'prop-far' });
    addProp({ prop:'shelf',   x:22, y:26, w:10, h:30, cls:'prop-far' });
    addProp({ prop:'ladder',  x:67, y:8,  w:6,  h:38, cls:'prop-far' });
    addProp({ prop:'barrel',  x:2,  y:66, w:8,  h:15 });
    addProp({ prop:'crate',   x:88, y:70, w:12, h:14 });
    addProp({ prop:'debris',  x:52, y:86, w:15, h:8 });

    // ── the machine
    addHotspot({ prop:'reactor', cls:'prop-guest hs-lock' + (S.finalSolved ? ' hs-open' : ''),
      x:41, y:31, w:19, h:27,
      label: lockLabel(), aria:'Zentralverschluss untersuchen', fn:() => clickLock() });

    // ── the four subsystems, all present from the start
    addHotspot({ prop:'panel',    cls:modCls('pattern'), x:7,  y:30, w:15, h:14,
      label: modLabel('pattern'), aria:'Markierstrecke untersuchen', fn:() => openModule('pattern') });
    addHotspot({ prop:'railing',  cls:modCls('weight'),  x:4,  y:57, w:22, h:14,
      label: modLabel('weight'),  aria:'Prüfwaage untersuchen',      fn:() => openModule('weight') });
    addHotspot({ prop:'monitors', cls:modCls('timing'),  x:73, y:27, w:18, h:15,
      label: modLabel('timing'),  aria:'Kolbensteuerung untersuchen',fn:() => openModule('timing') });
    addHotspot({ prop:'vent',     cls:modCls('orient'),  x:74, y:52, w:15, h:15,
      label: modLabel('orient'),  aria:'Getriebezug untersuchen',    fn:() => openModule('orient') });

    // ── things to look at while you think
    addHotspot({ prop:'console', x:30, y:62, w:17, h:14,
      label:'WERKBANK', aria:'Werkbank untersuchen', fn:() => examine('bank') });
    addHotspot({ prop:'poster',  x:34, y:9,  w:10, h:15,
      label:'RISSZEICHNUNGEN', aria:'Risszeichnungen ansehen', fn:() => examine('plan') });
    addHotspot({ prop:'pipe',    x:62, y:52, w:7,  h:24,
      label:'HEBEL', aria:'Unbeschrifteten Hebel untersuchen', fn:() => examine('hebel') });
    addHotspot({ prop:'crate',   cls:'prop-brown', x:13, y:76, w:13, h:15,
      label:'BRAUNER KASTEN', aria:'Braunen Kasten untersuchen', fn:() => examine('kasten') });

    // Once the lock is open the way on is an object in the room, so the
    // ending stays reachable whatever happened to the dialogue.
    if (S.finalSolved) {
      addHotspot({ prop:'door', x:44, y:62, w:13, h:32,
        label:'SEKTOR 05', aria:'Sektor 05 betreten', fn:finishChapter });
    }
  }

  function lockLabel() {
    if (S.finalSolved) return 'ZENTRALVERSCHLUSS · OFFEN';
    return `ZENTRALVERSCHLUSS · ${solvedCount()} / 4`;
  }
  function modCls(key) {
    const m = S.modules[key];
    return 'hs-mod ' + (m.solved ? 'hs-done' : m.opened ? 'hs-work' : 'hs-idle');
  }
  function modLabel(key) {
    const m = S.modules[key];
    const mark = m.solved ? '✔' : m.opened ? '◐' : '○';
    return `${mark} ${MOD[key].name}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // LOOKING AROUND — investigation and puzzle are the same phase
  // ═══════════════════════════════════════════════════════════════
  const SCENE_LINES = {
    bank: {
      1: [
        { speaker:'SYSTEM', text:'Eine Werkbank. Prüfhaken, Fühlerlehren, drei verschiedene Schraubenschlüssel in derselben Größe. Alles liegt so, wie es jemand hinlegt, der es gleich wieder braucht.' },
        { speaker:'B-RADF1SH', text:'„Kannst alles anfassen. Kaputtmachen kannst du hier nichts mehr."' },
      ],
      2: [
        { speaker:'SYSTEM', text:'In einer Ecke der Bank liegt ein Zahnrad mit abgebrochenen Zähnen. Daneben ein zweites, gleich groß, offensichtlich neu.' },
        { speaker:'B-RADF1SH', text:'„Das alte hab ich noch. Man vergleicht besser mit was."' },
      ],
      4: [
        { speaker:'R-3MI',  text:'„Warum liegt hier so viel herum?"' },
        { speaker:'B-RADF1SH', text:'„Weil ich noch nicht fertig bin."' },
      ],
    },
    plan: {
      1: [
        { speaker:'SYSTEM', text:'Risszeichnungen des Verschlusses, mehrfach überklebt. Auf der obersten steht in großer Handschrift: JEDER RING HAT GENAU EIN VON ALLEM.' },
        { speaker:'B-RADF1SH', text:'„Eine Platte, ein Gewicht, ein Kolben, ein Stück Getriebe. Vier Ringe, vier Mal dasselbe. Wenn du einen verstanden hast, verstehst du alle."' },
      ],
      2: [
        { speaker:'SYSTEM', text:'Auf einem der überklebten Blätter schimmert eine ältere Fassung durch: der halbe Verschluss, dreimal durchgestrichen.' },
        { speaker:'B-RADF1SH', text:'„Erste Idee. War zu klug."' },
        { speaker:'R-3MI',  text:'„Zu klug ist doch gut?"' },
        { speaker:'B-RADF1SH', text:'„Nicht, wenn es keiner mehr reparieren kann."' },
      ],
      3: [
        { speaker:'V-TGM', text:'"Every correction is in the same hand."', subtitle:'Jede Korrektur ist von derselben Hand.' },
        { speaker:'B-RADF1SH', text:'„War ja keiner da."' },
      ],
    },
    hebel: {
      1: [
        { speaker:'SYSTEM', text:'Ein unbeschrifteter Hebel an der Seitenwand. Frisch geölt.' },
        { speaker:'R-3MI',  text:'„Was passiert, wenn ich den Hebel ziehe?"' },
        { speaker:'B-RADF1SH', text:'„Weiß ich nicht."' },
        { speaker:'R-3MI',  text:'„Du bist hier der Experte!"' },
        { speaker:'B-RADF1SH', text:'„Deshalb zieh ich ihn nicht."' },
      ],
      2: [
        { speaker:'R-3MI',  text:'„Ich könnte ihn ganz kurz—"' },
        { speaker:'B-RADF1SH', text:'„Nein."' },
        { speaker:'R-3MI',  text:'„Du hast nicht mal hingeschaut."' },
        { speaker:'B-RADF1SH', text:'„Muss ich nicht."' },
      ],
      3: [
        { speaker:'V-TGM',  text:'"It is not connected to anything."', subtitle:'Er ist an nichts angeschlossen.' },
        { speaker:'B-RADF1SH', text:'„Doch."' },
        { speaker:'R-3MI',  text:'„AN WAS?"' },
        { speaker:'B-RADF1SH', text:'„Weiß ich nicht."' },
      ],
      5: [
        { speaker:'SYSTEM', text:'Der Hebel ist immer noch geölt. Er wartet, wie alles hier.' },
      ],
    },
  };

  function examine(key) {
    if (key === 'kasten') return examineKasten();
    const n = bump(key);
    const lines = pick(SCENE_LINES[key], n);
    if (lines) say(lines);
  }

  // sig_02 — optional, never gated, and not his property
  function examineKasten() {
    const n = bump('kasten');
    if (S.sigFound) {
      say([
        { speaker:'SYSTEM', text:'Der braune Kasten sendet weiter. Kurz, gleichmäßig, an niemanden.' },
        { speaker:'B-RADF1SH', text:'„Lass ihn."' },
      ]);
      return;
    }
    // Latch before any dialogue runs — a lost callback must not lose the find.
    S.sigFound = true;
    try { GameEngine.signals.find('sig_02'); } catch(_) {}
    say([
      { speaker:'SYSTEM', text:'Unter der Werkbank, halb hinter Geröll: eine braune Plastikbox. Kratzer, alte Wasserflecken, kein Werkstattzeichen.' },
      { speaker:'B-RADF1SH', text:'„Hm."' },
      { speaker:'R-3MI',  text:'„Kennst du das?"' },
      { speaker:'B-RADF1SH', text:'„Nein."' },
      { speaker:'V-TGM',  text:'"Leave it."', subtitle:'Lass es.' },
      { speaker:'R-3MI',  text:'„Sieht alt aus."' },
      { speaker:'B-RADF1SH', text:'„Ist es."' },
      { speaker:'SYSTEM', text:'Im Inneren blinkt schwach ein Sender.' },
      { speaker:'V-TGM',  text:'"…the brown box still transmits. no one receives anymore."', subtitle:'…der braune Kasten sendet noch. niemand empfängt mehr.' },
      { speaker:'SYSTEM', text:'Stille in der Werkstatt.' },
      { speaker:'B-RADF1SH', text:'„Nicht meins."' },
      { speaker:'SYSTEM', text:'Dann greift er wieder nach dem Prüfhaken.' },
    ]);
  }

  // ═══════════════════════════════════════════════════════════════
  // THE CENTRAL LOCK
  // ═══════════════════════════════════════════════════════════════
  function clickLock() {
    const n = bump('lock');
    if (S.finalSolved) { finishChapter(); return; }
    if (solvedCount() === 4) { openFinal(); return; }

    if (n === 1) {
      say([
        { speaker:'SYSTEM', text:'DAS VIERFACH-SCHLOSS. Vier Ringe übereinander, jeder mit vier Zeichen auf dem Kranz. Darum herum alles, was die Ringe bewegt: eine Markierstrecke, vier Gegengewichte, vier Kolben, ein Getriebezug.' },
        { speaker:'R-3MI',  text:'„Das ist unmöglich."' },
        { speaker:'B-RADF1SH', text:'„Nein."' },
        { speaker:'R-3MI',  text:'„Du hast noch gar nicht hingeschaut."' },
        { speaker:'B-RADF1SH', text:'„Unmöglich sieht anders aus."' },
        { speaker:'SYSTEM', text:'ZENTRALVERSCHLUSS: 0 / 4 REFERENZWERTE VERFÜGBAR. SYNCHRONISATION UNVOLLSTÄNDIG.' },
        { speaker:'B-RADF1SH', text:'„Jedes Teilsystem spuckt einen Wert aus. Vier Werte, dann redet der Verschluss mit dir."' },
        { speaker:'B-RADF1SH', text:'„Vorher nicht. Ist keine Bosheit, ist Bauart."' },
      ]);
      return;
    }

    const have = solvedCount();
    const status = { speaker:'SYSTEM', text:`ZENTRALVERSCHLUSS: ${have} / 4 REFERENZWERTE VERFÜGBAR. SYNCHRONISATION UNVOLLSTÄNDIG.` };
    const tail = {
      0: [{ speaker:'B-RADF1SH', text:'„Nicht hier. Da drüben."' }],
      1: [{ speaker:'B-RADF1SH', text:'„Einer steht. Der Rest steht deshalb noch nicht."' }],
      2: [{ speaker:'R-3MI',  text:'„Halb!"' },
          { speaker:'B-RADF1SH', text:'„Halb."' }],
      3: [{ speaker:'B-RADF1SH', text:'„Einer fehlt."' },
          { speaker:'R-3MI',  text:'„Welcher?"' },
          { speaker:'B-RADF1SH', text:'„Der, der noch dunkel ist."' }],
    }[have] || [];
    say([status, ...tail]);
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE FRAME — one modal, four faces, always closable
  // ═══════════════════════════════════════════════════════════════
  function el(id) { return document.getElementById(id); }

  function closeModal() {
    clearTimers();
    openModal = null;
    el('modModal').classList.add('hidden');
    el('hintBar').classList.add('hidden');
    S.hints.active = null;
    if (S.started) loadRoom();
  }

  function openModule(key) {
    if (openModal) closeModal();
    const m = S.modules[key];

    if (S.coaching.lastModule && S.coaching.lastModule !== key && !m.solved) S.coaching.switches++;
    S.coaching.lastModule = key;

    if (m.solved) { showSolvedModule(key); return; }

    m.opened++;
    if (!inst[key]) inst[key] = buildInstance(key);
    if (!inst[key]) {                       // generator gave up — never dead-end
      say([{ speaker:'B-RADF1SH', text:'„Das Teil hakt gerade. Nimm ein anderes, ich schau mir das an."' }]);
      return;
    }

    openModal = key;
    S.hints.active = key;
    S.hints.step   = 0;
    updateHintBar();

    el('modModal').classList.remove('hidden');
    el('hintBar').classList.remove('hidden');
    el('modLabel').textContent = `TEILSYSTEM ${ROMAN[ORDER.indexOf(key)]} — ${MOD[key].sub}`;
    el('modTitle').textContent = MOD[key].name;
    el('modSub').textContent   = `LIEFERT: ${MOD[key].out}`;
    render();
    if (m.opened === 1) introLines(key);
  }

  function showSolvedModule(key) {
    openModal = key;
    el('modModal').classList.remove('hidden');
    el('hintBar').classList.add('hidden');
    el('modLabel').textContent = `TEILSYSTEM ${ROMAN[ORDER.indexOf(key)]} — ${MOD[key].sub}`;
    el('modTitle').textContent = MOD[key].name;
    el('modSub').textContent   = 'ABGESCHLOSSEN';
    el('modBody').innerHTML =
      `<div class="vs-done">
         <p class="vs-done-mark sys-text">TEILSYSTEM STEHT</p>
         <p class="vs-done-out sys-text">${MOD[key].out}</p>
         <p class="vs-done-val">${esc(outputText(key))}</p>
       </div>`;
    setStatus('DER WERT IST IM ZENTRALVERSCHLUSS HINTERLEGT.', 'ok');
    el('modActions').innerHTML = `<button class="ka-btn small" data-act="close">[ ZURÜCK ]</button>`;
  }

  function setStatus(text, type) {
    const s = el('modStatus');
    if (!s) return;
    s.textContent = text;
    s.className = 'puzzle-status sys-text' + (type ? ' ' + type : '');
  }

  function buildInstance(key) {
    if (key === 'pattern') return buildPattern();
    if (key === 'weight')  return buildWeight();
    if (key === 'timing')  return buildTiming();
    if (key === 'orient')  return buildOrient();
    return null;
  }

  const INTRO = {
    pattern: [
      { speaker:'SYSTEM', text:'Die Markierstrecke. Acht Prüfplatten in einer Reihe, gestempelt von zwei Markierköpfen, die abwechselnd zuschlagen. Drei Platten sind nicht mehr zu lesen.' },
      { speaker:'B-RADF1SH', text:'„Eine davon ist die Abnahmeplatte. Was da draufsteht, geht an den Zeichenkranz."' },
      { speaker:'R-3MI',  text:'„Und die anderen zwei?"' },
      { speaker:'B-RADF1SH', text:'„Sind kaputt. Kommt vor."' },
    ],
    weight: [
      { speaker:'SYSTEM', text:'Die Prüfwaage. Vier Gegengewichte, für jeden Ring eines. Alle sehen gleich aus. Keines wiegt gleich viel.' },
      { speaker:'B-RADF1SH', text:'„Der Ring am schwersten Gegengewicht ist der Leitring. Der Verschluss will wissen, welcher das ist."' },
      { speaker:'B-RADF1SH', text:'„Die Waage setzt sich nach fünf Läufen. Danach muss sie sich beruhigen."' },
      { speaker:'R-3MI',  text:'„Wie lange?"' },
      { speaker:'B-RADF1SH', text:'„Länger als du."' },
    ],
    timing: [
      { speaker:'SYSTEM', text:'Die Kolbensteuerung. Vier Kolben, vier Takte, jeder Kolben genau einmal pro Umlauf. Die Steuerkurve ist ausgeschlagen — die Reihenfolge ist ihr nicht mehr anzusehen.' },
      { speaker:'B-RADF1SH', text:'„Steht aber im Protokoll. Nicht als Reihenfolge. Als Bemerkungen."' },
      { speaker:'R-3MI',  text:'„Warum nicht einfach als Reihenfolge?"' },
      { speaker:'B-RADF1SH', text:'„Weil das Protokoll aufschreibt, was auffällt. Nicht, was praktisch wäre."' },
    ],
    orient: [
      { speaker:'SYSTEM', text:'Der Getriebezug. Vom Antrieb bis zum Laufring, sechs Glieder, dazwischen Zahneingriffe und Riemen. Ein Glied ist so abgenutzt, dass man nicht mehr sieht, was es ist.' },
      { speaker:'B-RADF1SH', text:'„Dafür hat jemand eine Prüfmarke eingeschlagen. Weiter hinten. Die stimmt."' },
      { speaker:'R-3MI',  text:'„Woher weißt du das?"' },
      { speaker:'B-RADF1SH', text:'„Weil ich sie eingeschlagen hab."' },
    ],
  };
  function introLines(key) { say(INTRO[key]); }

  function outputText(key) {
    const v = S.modules[key].output;
    if (v === null || v === undefined) return '—';
    if (key === 'pattern') return `${SYM[v]}  ${SYMN[v]}`;
    if (key === 'weight')  return `RING ${ROMAN[v]}`;
    if (key === 'timing')  return v.map(r => ROMAN[r]).join('  →  ');
    if (key === 'orient')  return v > 0 ? '↻  IM UHRZEIGERSINN' : '↺  GEGEN DEN UHRZEIGERSINN';
    return '—';
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE A — MUSTER
  // Two marking heads take turns on one strip. Five readable plates,
  // one blank output slot, two ruined plates — and the blank never sits
  // next to only readable neighbours, so the strip has to be read as a
  // rule rather than copied from next door.
  // ═══════════════════════════════════════════════════════════════
  function strip(s0, a, b, n) {
    const r = [s0];
    for (let i = 1; i < n; i++) r.push((r[i-1] + (i % 2 === 1 ? a : b)) % 4);
    return r;
  }

  function buildPattern() {
    for (let t = 0; t < 500; t++) {
      const a = randInt(0, 3), b = randInt(0, 3);
      if (a === b) continue;
      const seq = strip(randInt(0, 3), a, b, PLATES);

      const out = randInt(3, 6);
      const rest = [];
      for (let i = 1; i < PLATES; i++) if (i !== out) rest.push(i);
      const dmg = shuffle(rest).slice(0, 2);
      if (!dmg.includes(out - 1) && !dmg.includes(out + 1)) continue;

      const hidden = new Set([out, ...dmg]);
      const vis = [];
      for (let i = 0; i < PLATES; i++) if (!hidden.has(i)) vis.push(i);

      const fits = new Set();
      for (let s = 0; s < 4; s++) for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) {
        const q = strip(s, x, y, PLATES);
        if (vis.every(i => q[i] === seq[i])) fits.add(q[out]);
      }
      if (fits.size !== 1) continue;

      return { seq, out, dmg, pickSym: null };
    }
    return null;
  }

  function renderPattern() {
    const p = inst.pattern;
    const cells = [];
    for (let i = 0; i < PLATES; i++) {
      if (i === p.out) {
        const s = p.pickSym;
        cells.push(
          `<div class="mus-plate mus-out${s === null ? '' : ' set'}">
             <span class="mus-idx sys-text">${i + 1}</span>
             <span class="mus-glyph">${s === null ? '▽' : SYM[s]}</span>
             <span class="mus-name sys-text">${s === null ? 'ABNAHME' : SYMN[s]}</span>
           </div>`);
      } else if (p.dmg.includes(i)) {
        cells.push(
          `<div class="mus-plate mus-dmg">
             <span class="mus-idx sys-text">${i + 1}</span>
             <span class="mus-glyph">▨</span>
             <span class="mus-name sys-text">UNLESERLICH</span>
           </div>`);
      } else {
        cells.push(
          `<div class="mus-plate">
             <span class="mus-idx sys-text">${i + 1}</span>
             <span class="mus-glyph">${SYM[p.seq[i]]}</span>
             <span class="mus-name sys-text">${SYMN[p.seq[i]]}</span>
           </div>`);
      }
    }
    return `
      <p class="vs-note sys-text">MARKIERSTRECKE — ZWEI KÖPFE, ABWECHSELND. PLATTE ${p.out + 1} IST DIE ABNAHME.</p>
      <div class="mus-strip">${cells.join('')}</div>
      <p class="vs-note sys-text">ZEICHEN EINSETZEN:</p>
      <div class="vs-chiprow">` +
      SYM.map((g, i) =>
        `<button class="vs-chip vs-chip-sym${p.pickSym === i ? ' on' : ''}" data-act="pat-sym" data-sym="${i}">
           <span class="vs-chip-glyph">${g}</span><span class="vs-chip-name sys-text">${SYMN[i]}</span>
         </button>`).join('') +
      `</div>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE B — GEWICHT
  // Four counterweights, all different, five runs of the balance. The
  // beam re-tares after a wrong ranking, so a wrong answer costs nothing
  // but the walk back.
  // ═══════════════════════════════════════════════════════════════
  function buildWeight() {
    const order = shuffle([0, 1, 2, 3]);        // heaviest first
    const rankOf = [];
    order.forEach((ring, i) => { rankOf[ring] = i; });
    return { rankOf, left: WEIGH_MAX, log: [], sel: [], tilt: 0, rank: [null,null,null,null] };
  }

  function renderWeight() {
    const w = inst.weight;
    const pan = i => (w.sel[i] === undefined ? '—' : ROMAN[w.sel[i]]);
    return `
      <p class="vs-note sys-text">PRÜFWAAGE — LÄUFE ÜBRIG: ${w.left} / ${WEIGH_MAX}</p>
      <div class="vs-balance" data-tilt="${w.tilt}">
        <div class="vs-pan vs-pan-l"><span class="vs-pan-val">${pan(0)}</span></div>
        <div class="vs-beam"><span class="vs-fulcrum">▲</span></div>
        <div class="vs-pan vs-pan-r"><span class="vs-pan-val">${pan(1)}</span></div>
      </div>
      <div class="vs-chiprow">` +
      [0,1,2,3].map(r =>
        `<button class="vs-chip${w.sel.includes(r) ? ' on' : ''}" data-act="w-sel" data-ring="${r}">
           <span class="vs-chip-glyph">${ROMAN[r]}</span><span class="vs-chip-name sys-text">GEGENGEWICHT</span>
         </button>`).join('') +
      `</div>
      <div class="vs-inline">
        <button class="ka-btn small" data-act="w-run"${w.sel.length === 2 && w.left > 0 ? '' : ' disabled'}>[ WIEGEN ]</button>
        <button class="ka-btn small" data-act="w-clear">[ WAAGE LEEREN ]</button>
      </div>
      <ol class="vs-log">` +
      (w.log.length ? w.log.map(l => `<li>${esc(l)}</li>`).join('')
                    : `<li class="vs-log-empty">NOCH KEINE WÄGUNG.</li>`) +
      `</ol>
      <p class="vs-note sys-text">RANGFOLGE EINTRAGEN:</p>` +
      renderOrderRows(['SCHWERSTE', 'ZWEITE', 'DRITTE', 'LEICHTESTE'], w.rank, 'w-rank');
  }

  function renderOrderRows(labels, guess, act) {
    return `<div class="vs-order">` + labels.map((lab, k) =>
      `<div class="vs-order-row">
         <span class="vs-order-lab sys-text">${lab}</span>
         <div class="vs-order-opts">` +
         [0,1,2,3].map(r =>
          `<button class="vs-slot${guess[k] === r ? ' on' : ''}" data-act="${act}" data-slot="${k}" data-ring="${r}"
                   aria-label="${lab}: ${ROMAN[r]}">${ROMAN[r]}</button>`).join('') +
         `</div>
       </div>`).join('') + `</div>`;
  }

  function assignSlot(arr, slot, ring) {
    if (arr[slot] === ring) { arr[slot] = null; return; }
    for (let i = 0; i < arr.length; i++) if (arr[i] === ring) arr[i] = null;
    arr[slot] = ring;
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE C — TAKT
  // Four pistons, four beats. The log records remarks, not an order.
  // Every generated set is pruned until each remark is load-bearing.
  // ═══════════════════════════════════════════════════════════════
  const CLUE = {
    before:  { test:(p,c) => p[c.a] <  p[c.b], text:c => `KOLBEN ${ROMAN[c.a]} läuft vor KOLBEN ${ROMAN[c.b]}.` },
    imm:     { test:(p,c) => p[c.b] === p[c.a] + 1, text:c => `KOLBEN ${ROMAN[c.a]} läuft unmittelbar vor KOLBEN ${ROMAN[c.b]}.` },
    gap:     { test:(p,c) => Math.abs(p[c.a] - p[c.b]) === 2, text:c => `Zwischen KOLBEN ${ROMAN[c.a]} und KOLBEN ${ROMAN[c.b]} liegt genau ein Takt.` },
    notadj:  { test:(p,c) => Math.abs(p[c.a] - p[c.b]) !== 1, text:c => `KOLBEN ${ROMAN[c.a]} und KOLBEN ${ROMAN[c.b]} laufen nicht direkt nacheinander.` },
    notbeat: { test:(p,c) => p[c.a] !== c.n, text:c => `KOLBEN ${ROMAN[c.a]} läuft nicht im ${c.n + 1}. Takt.` },
    edge:    { test:(p,c) => p[c.a] === 0 || p[c.a] === 3, text:c => `KOLBEN ${ROMAN[c.a]} läuft im ersten oder im letzten Takt.` },
    inner:   { test:(p,c) => p[c.a] === 1 || p[c.a] === 2, text:c => `KOLBEN ${ROMAN[c.a]} läuft weder zuerst noch zuletzt.` },
  };
  const PERMS = (() => {
    const out = [];
    const rec = (cur, left) => {
      if (!left.length) { out.push(cur); return; }
      left.forEach((v, i) => rec(cur.concat([v]), left.filter((_, j) => j !== i)));
    };
    rec([], [0,1,2,3]);
    return out;
  })();
  function posOf(perm) { const p = []; perm.forEach((piston, beat) => { p[piston] = beat; }); return p; }
  function holds(clues, pos) { return clues.every(c => CLUE[c.t].test(pos, c)); }
  function countFits(clues) { return PERMS.filter(pm => holds(clues, posOf(pm))).length; }

  function buildTiming() {
    for (let t = 0; t < 800; t++) {
      const perm = shuffle([0,1,2,3]);
      const pos  = posOf(perm);

      const all = [];
      for (let a = 0; a < 4; a++) {
        for (let b = 0; b < 4; b++) {
          if (a === b) continue;
          ['before','imm','gap','notadj'].forEach(kind => {
            const c = { t:kind, a, b };
            if (CLUE[kind].test(pos, c)) all.push(c);
          });
        }
        for (let n = 0; n < 4; n++) {
          const c = { t:'notbeat', a, n };
          if (CLUE.notbeat.test(pos, c)) all.push(c);
        }
        ['edge','inner'].forEach(kind => {
          const c = { t:kind, a };
          if (CLUE[kind].test(pos, c)) all.push(c);
        });
      }

      const bag = shuffle(all);
      const chosen = [];
      for (const c of bag) {
        chosen.push(c);
        if (countFits(chosen) === 1) break;
      }
      if (countFits(chosen) !== 1) continue;

      for (let i = chosen.length - 1; i >= 0; i--) {
        const trial = chosen.filter((_, k) => k !== i);
        if (trial.length && countFits(trial) === 1) chosen.splice(i, 1);
      }
      if (chosen.length < 3 || chosen.length > 5) continue;

      return { perm, clues: shuffle(chosen), order: [null,null,null,null], firing: -1 };
    }
    return null;
  }

  function renderTiming() {
    const t = inst.timing;
    return `
      <p class="vs-note sys-text">TAKTPROTOKOLL — VIER KOLBEN, VIER TAKTE, JEDER GENAU EINMAL.</p>
      <ol class="vs-log vs-clues">` +
      t.clues.map(c => `<li>${esc(CLUE[c.t].text(c))}</li>`).join('') +
      `</ol>
      <div class="vs-pistons">` +
      [0,1,2,3].map(i =>
        `<div class="vs-piston${t.firing === i ? ' fire' : ''}">
           <span class="vs-piston-rod"></span>
           <span class="vs-piston-lab sys-text">${ROMAN[i]}</span>
         </div>`).join('') +
      `</div>
      <p class="vs-note sys-text">KOLBENFOLGE EINTRAGEN:</p>` +
      renderOrderRows(['TAKT 1','TAKT 2','TAKT 3','TAKT 4'], t.order, 't-slot');
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE D — AUSRICHTUNG
  // Six elements, five couplings. The drive direction is stamped on the
  // housing and one element further down carries a test mark, so the
  // worn coupling is always reachable from both sides.
  // ═══════════════════════════════════════════════════════════════
  const LINK = {
    zahn:   { flip:-1, name:'ZAHNEINGRIFF',       glyph:'⟡⟡' },
    riemen: { flip: 1, name:'RIEMEN',             glyph:'═══' },
    kreuz:  { flip:-1, name:'RIEMEN, GEKREUZT',   glyph:'═╳═' },
  };
  const ELEM = ['ANTRIEB', 'VORGELEGE', 'ZWISCHENRAD', 'SPINDEL', 'KUPPLUNG', 'LAUFRING'];

  function buildOrient() {
    const kinds = ['zahn', 'riemen', 'kreuz'];
    const types = Array.from({ length: TRAIN_LEN }, () => kinds[randInt(0, 2)]);
    const dirs  = [1];
    types.forEach(k => dirs.push(dirs[dirs.length - 1] * LINK[k].flip));

    const worn = randInt(0, TRAIN_LEN - 2);          // never the last coupling
    const mark = randInt(worn + 1, TRAIN_LEN - 1);   // never the Laufring itself

    const guess = dirs.map((d, i) => (i === 0 || i === mark) ? d : null);
    return { types, dirs, worn, mark, guess };
  }

  function renderOrient() {
    const o = inst.orient;
    const rows = [];
    for (let i = 0; i < ELEM.length; i++) {
      const fixed = (i === 0 || i === o.mark);
      const d = o.guess[i];
      const badge = i === 0 ? 'ANTRIEBSSCHILD' : i === o.mark ? 'PRÜFMARKE' : '';
      rows.push(
        `<div class="vs-elem${fixed ? ' fixed' : ''}">
           <span class="vs-elem-name sys-text">${ELEM[i]}${badge ? ` <em>${badge}</em>` : ''}</span>
           <div class="vs-elem-dir">` +
           (fixed
             ? `<span class="vs-dir on locked">${d > 0 ? '↻' : '↺'}</span>`
             : `<button class="vs-dir${d === 1 ? ' on' : ''}" data-act="o-dir" data-idx="${i}" data-dir="1"  aria-label="${ELEM[i]} im Uhrzeigersinn">↻</button>
                <button class="vs-dir${d === -1 ? ' on' : ''}" data-act="o-dir" data-idx="${i}" data-dir="-1" aria-label="${ELEM[i]} gegen den Uhrzeigersinn">↺</button>`) +
           `</div>
         </div>`);
      if (i < TRAIN_LEN) {
        const worn = i === o.worn;
        rows.push(
          `<div class="vs-link${worn ? ' worn' : ''}">
             <span class="vs-link-glyph">${worn ? '?' : LINK[o.types[i]].glyph}</span>
             <span class="vs-link-name sys-text">${worn ? 'ABGENUTZT — NICHT LESBAR' : LINK[o.types[i]].name}</span>
           </div>`);
      }
    }
    return `
      <p class="vs-note sys-text vs-tafel-mini">MERKTAFEL — ZAHNEINGRIFF KEHRT DIE DREHRICHTUNG UM · RIEMEN BEHÄLT SIE · GEKREUZTER RIEMEN KEHRT SIE UM</p>
      <div class="vs-train">${rows.join('')}</div>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // ZENTRALABGLEICH — the small step at the end of the big machine
  // ═══════════════════════════════════════════════════════════════
  function finalRings() {
    const sym  = S.modules.pattern.output;
    const lead = S.modules.weight.output;
    const seq  = S.modules.timing.output;
    const dir  = S.modules.orient.output;
    const start = seq.indexOf(lead);
    const rings = [null, null, null, null];
    for (let k = 0; k < 4; k++) {
      const ring = seq[(start + k) % 4];
      rings[ring] = (((sym + dir * k) % 4) + 4) % 4;
    }
    return rings;
  }

  function openFinal() {
    if (openModal) closeModal();
    if (solvedCount() < 4) return;
    if (!inst.final) inst.final = { set: [0,0,0,0] };

    openModal = 'final';
    S.hints.active = 'final';
    S.hints.step   = 0;
    updateHintBar();

    el('modModal').classList.remove('hidden');
    el('hintBar').classList.remove('hidden');
    el('modLabel').textContent = 'ZENTRALVERSCHLUSS';
    el('modTitle').textContent = 'ZENTRALABGLEICH';
    el('modSub').textContent   = 'ALLE TEILSYSTEME STABIL';
    render();

    if (!S.seen.finalIntro) {
      S.seen.finalIntro = 1;
      say([
        { speaker:'SYSTEM', text:'ALLE TEILSYSTEME STABIL. ZENTRALABGLEICH MÖGLICH.' },
        { speaker:'SYSTEM', text:'Der halbe Raum hört auf zu rappeln. Vier Ringe stehen still und warten.' },
        { speaker:'R-3MI',  text:'„Und jetzt kommt das große Ding, ja? Jetzt kommt das RICHTIG große Ding."' },
        { speaker:'B-RADF1SH', text:'„Jetzt kommt die Verschlusstafel."' },
        { speaker:'R-3MI',  text:'„Das klingt nach einem großen Ding."' },
        { speaker:'B-RADF1SH', text:'„Es sind vier Zeilen."' },
      ]);
    }
  }

  function renderFinal() {
    const f = inst.final;
    const ref = [
      ['LEITZEICHEN',  outputText('pattern')],
      ['LEITRING',     outputText('weight')],
      ['KOLBENFOLGE',  outputText('timing')],
      ['LAUFRICHTUNG', outputText('orient')],
    ];
    return `
      <div class="vs-tafel">
        <p class="vs-tafel-h sys-text">VERSCHLUSSTAFEL</p>
        <ol class="vs-tafel-list">
          <li>Der <b>LEITRING</b> trägt das <b>LEITZEICHEN</b>.</li>
          <li>Von dort weiter in der <b>KOLBENFOLGE</b>, Ring für Ring.</li>
          <li>Jeder Schritt rückt <b>ein</b> Zeichen im Zeichenkranz weiter.</li>
          <li>Die <b>LAUFRICHTUNG</b> sagt wohin: ↻ vorwärts, ↺ rückwärts.</li>
        </ol>
        <p class="vs-kranz sys-text">ZEICHENKRANZ: ◆ → ▲ → ■ → ● → ◆</p>
      </div>
      <div class="vs-ref">` +
      ref.map(([k, v]) => `<div class="vs-ref-row"><span class="sys-text">${k}</span><span class="vs-ref-val">${esc(v)}</span></div>`).join('') +
      `</div>
      <p class="vs-note sys-text">RINGE STELLEN — ANTIPPEN SCHALTET WEITER:</p>
      <div class="vs-rings">` +
      [0,1,2,3].map(r =>
        `<button class="vs-ring" data-act="f-ring" data-ring="${r}" aria-label="Ring ${ROMAN[r]}: ${SYMN[f.set[r]]}">
           <span class="vs-ring-num sys-text">RING ${ROMAN[r]}</span>
           <span class="vs-ring-glyph">${SYM[f.set[r]]}</span>
           <span class="vs-ring-name sys-text">${SYMN[f.set[r]]}</span>
         </button>`).join('') +
      `</div>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER + INPUT
  // ═══════════════════════════════════════════════════════════════
  function render() {
    if (!openModal) return;
    const body = el('modBody');
    const acts = el('modActions');

    if (openModal === 'final') {
      body.innerHTML = renderFinal();
      acts.innerHTML =
        `<button class="ka-btn primary" data-act="f-check">[ ABGLEICH ]</button>
         <button class="ka-btn small" data-act="f-reset">[ RINGE NULLEN ]</button>
         <button class="ka-btn small" data-act="close">[ ZURÜCK ]</button>`;
      return;
    }

    const key = openModal;
    body.innerHTML =
      key === 'pattern' ? renderPattern() :
      key === 'weight'  ? renderWeight()  :
      key === 'timing'  ? renderTiming()  : renderOrient();

    const check = { pattern:'pat-check', weight:'w-check', timing:'t-check', orient:'o-check' }[key];
    const reset = { pattern:'pat-reset', weight:'w-reset', timing:'t-reset', orient:'o-reset' }[key];
    acts.innerHTML =
      `<button class="ka-btn primary" data-act="${check}"${busy ? ' disabled' : ''}>[ PRÜFEN ]</button>
       <button class="ka-btn small" data-act="${reset}">[ ZURÜCKSETZEN ]</button>
       <button class="ka-btn small" data-act="close">[ ZURÜCK ]</button>`;
  }

  function onModalClick(ev) {
    const btn = ev.target.closest('[data-act]');
    if (!btn || btn.disabled) return;
    const act  = btn.dataset.act;
    const ring = btn.dataset.ring !== undefined ? +btn.dataset.ring : null;
    const slot = btn.dataset.slot !== undefined ? +btn.dataset.slot : null;

    if (act === 'close') { closeModal(); return; }
    if (busy) return;

    switch (act) {
      // ── MUSTER
      case 'pat-sym':
        inst.pattern.pickSym = +btn.dataset.sym;
        setStatus('', '');
        render();
        break;
      case 'pat-reset':
        inst.pattern.pickSym = null;
        setStatus('ABNAHMEPLATTE GELEERT.', '');
        render();
        break;
      case 'pat-check': checkPattern(); break;

      // ── GEWICHT
      case 'w-sel': {
        const w = inst.weight;
        const at = w.sel.indexOf(ring);
        if (at >= 0) w.sel.splice(at, 1);
        else if (w.sel.length < 2) w.sel.push(ring);
        else w.sel = [w.sel[1], ring];
        w.tilt = 0;
        render();
        break;
      }
      case 'w-clear': inst.weight.sel = []; inst.weight.tilt = 0; render(); break;
      case 'w-run':   runBalance(); break;
      case 'w-rank':  assignSlot(inst.weight.rank, slot, ring); setStatus('', ''); render(); break;
      case 'w-reset': inst.weight.rank = [null,null,null,null]; setStatus('RANGFOLGE GELEERT. DIE WÄGUNGEN BLEIBEN.', ''); render(); break;
      case 'w-check': checkWeight(); break;

      // ── TAKT
      case 't-slot':  assignSlot(inst.timing.order, slot, ring); setStatus('', ''); render(); break;
      case 't-reset': inst.timing.order = [null,null,null,null]; setStatus('KOLBENFOLGE GELEERT. DAS PROTOKOLL BLEIBT.', ''); render(); break;
      case 't-check': checkTiming(); break;

      // ── AUSRICHTUNG
      case 'o-dir':
        inst.orient.guess[+btn.dataset.idx] = +btn.dataset.dir;
        setStatus('', '');
        render();
        break;
      case 'o-reset': {
        const o = inst.orient;
        o.guess = o.dirs.map((d, i) => (i === 0 || i === o.mark) ? d : null);
        setStatus('GETRIEBEZUG GELEERT.', '');
        render();
        break;
      }
      case 'o-check': checkOrient(); break;

      // ── ZENTRALABGLEICH
      case 'f-ring':  inst.final.set[ring] = (inst.final.set[ring] + 1) % 4; setStatus('', ''); render(); break;
      case 'f-reset': inst.final.set = [0,0,0,0]; setStatus('RINGE AUF ANFANG.', ''); render(); break;
      case 'f-check': checkFinal(); break;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CHECKS
  // ═══════════════════════════════════════════════════════════════
  function checkPattern() {
    const p = inst.pattern;
    if (p.pickSym === null) { setStatus('DIE ABNAHMEPLATTE IST NOCH LEER.', 'warn'); return; }
    if (p.pickSym !== p.seq[p.out]) { wrong('pattern', 'DER STEMPEL PASST NICHT IN DIE REIHE.'); return; }
    solveModule('pattern', p.seq[p.out]);
  }

  function runBalance() {
    const w = inst.weight;
    if (w.sel.length !== 2 || w.left <= 0) return;
    const [x, y] = w.sel;
    w.left--;
    const heavier = w.rankOf[x] < w.rankOf[y] ? x : y;
    const lighter = heavier === x ? y : x;
    w.tilt = heavier === x ? -1 : 1;
    w.log.push(`WÄGUNG ${w.log.length + 1} — ${ROMAN[heavier]} senkt sich gegen ${ROMAN[lighter]}.`);
    playSound('ch4_balance.mp3');
    tone({ freq: 190, type:'triangle', dur: 0.16, vol: 0.07 });
    setStatus(w.left > 0
      ? `LAUF ABGESCHLOSSEN. ${w.left} ÜBRIG.`
      : 'DIE WAAGE MUSS SICH SETZEN. DAS PROTOKOLL BLEIBT.', w.left > 0 ? '' : 'warn');
    render();
  }

  function checkWeight() {
    const w = inst.weight;
    if (w.rank.some(v => v === null)) { setStatus('DIE RANGFOLGE IST NOCH UNVOLLSTÄNDIG.', 'warn'); return; }
    const ok = w.rank.every((ring, k) => w.rankOf[ring] === k);
    if (!ok) {
      // The beam re-tares: a wrong ranking hands the runs back instead of
      // taking anything away.
      w.left = WEIGH_MAX;
      w.sel  = [];
      w.tilt = 0;
      wrong('weight', 'DIE WAAGE WIDERSPRICHT. SIE HAT SICH NEU EINGEPENDELT — LÄUFE WIEDER FREI.');
      return;
    }
    solveModule('weight', w.rank[0]);
  }

  function checkTiming() {
    const t = inst.timing;
    if (t.order.some(v => v === null)) { setStatus('DIE KOLBENFOLGE IST NOCH UNVOLLSTÄNDIG.', 'warn'); return; }
    busy = true;
    render();
    setStatus('STEUERLAUF…', '');
    t.order.forEach((piston, beat) => {
      later(() => {
        t.firing = piston;
        render();
        tone({ freq: 150 + beat * 30, type:'square', dur: 0.08, vol: 0.06 });
      }, beat * 300);
    });
    later(() => {
      t.firing = -1;
      busy = false;
      const ok = t.order.every((piston, beat) => t.perm[beat] === piston);
      if (!ok) { render(); wrong('timing', 'DIE STEUERKURVE STOLPERT. DAS PROTOKOLL WIDERSPRICHT.'); return; }
      solveModule('timing', t.perm.slice());
    }, 4 * 300 + 260);
  }

  function checkOrient() {
    const o = inst.orient;
    if (o.guess.some(v => v === null)) { setStatus('IM ZUG FEHLT NOCH EINE DREHRICHTUNG.', 'warn'); return; }
    const ok = o.guess.every((d, i) => d === o.dirs[i]);
    if (!ok) { wrong('orient', 'DER ZUG BLOCKIERT. IRGENDWO ZIEHEN ZWEI GEGENEINANDER.'); return; }
    solveModule('orient', o.dirs[TRAIN_LEN]);
  }

  function checkFinal() {
    const want = finalRings();
    const got  = inst.final.set;
    if (want.every((v, i) => v === got[i])) { solveFinal(); return; }
    S.finalFails++;
    setStatus('DIE RINGE GREIFEN NICHT INEINANDER.', 'error');
    playSound('ch4_reject.mp3');
    tone({ freq: 120, type:'sawtooth', dur: 0.2, vol: 0.07 });
    if (S.finalFails % 2 === 1) say(excuseLines());
  }

  // ═══════════════════════════════════════════════════════════════
  // OUTCOMES — respectful when wrong, understated when right
  // ═══════════════════════════════════════════════════════════════
  const EXCUSES = [
    [ { speaker:'R-3MI', text:'„Okay. Das war—"' },
      { speaker:'B-RADF1SH', text:'„Ein Versuch."' } ],
    [ { speaker:'B-RADF1SH', text:'„Lass stehen."' },
      { speaker:'SYSTEM', text:'Du wartest auf den Rest des Satzes.' },
      { speaker:'B-RADF1SH', text:'„Jetzt wissen wir wenigstens, was es nicht ist."' } ],
    [ { speaker:'V-TGM', text:'"Not that one."', subtitle:'Das nicht.' },
      { speaker:'B-RADF1SH', text:'„Auch gut."' } ],
    [ { speaker:'B-RADF1SH', text:'„Hm."' },
      { speaker:'SYSTEM', text:'Er schaut nicht mal hoch.' },
      { speaker:'B-RADF1SH', text:'„Nochmal."' } ],
  ];
  function excuseLines() { return EXCUSES[S.excuse++ % EXCUSES.length]; }

  function wrong(key, msg) {
    const m = S.modules[key];
    m.fails++;
    setStatus(msg, 'error');
    playSound('ch4_reject.mp3');
    tone({ freq: 120, type:'sawtooth', dur: 0.2, vol: 0.07 });
    render();
    if (m.fails % 2 === 1) say(excuseLines());
  }

  const PRAISE = ['„Passt."', '„Sitzt."', '„Gut."', '„Mhm."'];

  function solveModule(key, output) {
    // Latch first: the reference value must survive a lost callback.
    const m = S.modules[key];
    if (m.solved) return;
    m.solved = true;
    m.output = output;
    inst[key] = null;

    clearTimers();
    playSound('ch4_module.mp3');
    tone({ freq: 320, type:'sine', dur: 0.5, vol: 0.09, glideTo: 470 });
    try { GameEngine.fx.flash('rgba(243,198,35,0.13)'); } catch(_) {}

    showSolvedModule(key);
    el('hintBar').classList.add('hidden');
    S.hints.active = null;

    const n = solvedCount();
    const lines = [
      { speaker:'SYSTEM', text:`TEILSYSTEM ${MOD[key].name} STABIL. ${MOD[key].out} HINTERLEGT.` },
      { speaker:'SYSTEM', text:`ZENTRALVERSCHLUSS: ${n} / 4 REFERENZWERTE VERFÜGBAR.` },
      { speaker:'B-RADF1SH', text: PRAISE[S.praise++ % PRAISE.length] },
    ];
    if (n === 1) {
      lines.push({ speaker:'R-3MI', text:'„Du kannst ruhig beeindruckter sein."' });
      lines.push({ speaker:'B-RADF1SH', text:'„Bin ich."' });
    } else if (n === 2) {
      lines.push({ speaker:'SYSTEM', text:'Irgendwo im Verschluss legt sich ein Riegel um. Zwei Ringe stehen jetzt fest.' });
    } else if (n === 3) {
      lines.push({ speaker:'R-3MI', text:'„Drei! DREI!"' });
      lines.push({ speaker:'B-RADF1SH', text:'„Vier sind vier."' });
    } else if (n === 4) {
      lines.push({ speaker:'SYSTEM', text:'Der Getriebezug läuft zum ersten Mal ganz durch. Die vier Ringe richten sich aus und bleiben stehen.' });
      lines.push({ speaker:'B-RADF1SH', text:'„So. Jetzt ist es klein."' });
    }
    say(lines);
  }

  function solveFinal() {
    if (S.finalSolved) return;
    clearTimers();
    // Persist before anything narrative runs.
    S.finalSolved = true;
    try { GameEngine.state.markChapterComplete(CHAPTER_ID); } catch(_) {}

    closeModal();
    inst.final = null;
    setScene('werk-open');
    setProgress(51);
    loadRoom();

    playSound('ch4_lock_open.mp3');
    try { GameEngine.fx.flash('rgba(255,224,140,0.3)'); } catch(_) {}
    tone({ freq: 200, type:'sine', dur: 1.6, vol: 0.12, glideTo: 460 });

    say([
      { speaker:'SYSTEM', text:'Die vier Ringe rasten nacheinander ein. Vier Klicks, gleichmäßig, fast leise.' },
      { speaker:'SYSTEM', text:'ZENTRALVERSCHLUSS OFFEN. SEKTOR 05 — LANGSTRECKE — FREIGEGEBEN.' },
      { speaker:'R-3MI',  text:'„Das war’s?!"' },
      { speaker:'B-RADF1SH', text:'„Mhm."' },
      { speaker:'R-3MI',  text:'„Das Ding ist DREI METER HOCH!"' },
      { speaker:'B-RADF1SH', text:'„Groß heißt nicht kompliziert."' },
    ], finalResponse);
  }

  const FINAL_REPLIES = [
    { key:'hard', label:'[ Das war schwierig. ]', lines:[
      { speaker:'B-RADF1SH', text:'„War es."' },
      { speaker:'SYSTEM', text:'Pause.' },
      { speaker:'B-RADF1SH', text:'„Sauber gemacht."' },
    ] },
    { key:'imposs', label:'[ Ich dachte kurz, das wäre unmöglich. ]', lines:[
      { speaker:'B-RADF1SH', text:'„War es nicht."' },
      { speaker:'SYSTEM', text:'Pause.' },
      { speaker:'B-RADF1SH', text:'„Nur groß."' },
    ] },
    { key:'passt', label:'[ „Passt"? Mehr kriege ich nicht? ]', lines:[
      { speaker:'B-RADF1SH', text:'„Passt ist viel."' },
      { speaker:'R-3MI',  text:'„Von ihm schon."' },
      { speaker:'B-RADF1SH', text:'„Mhm."' },
    ] },
  ];

  function finalResponse() {
    askOnce({
      prompt: 'DEINE ANTWORT:',
      hint:   'OPTIONAL.',
      choices: FINAL_REPLIES,
      onPick: () => backToWork(),
    });
  }

  function backToWork() {
    say([
      { speaker:'SYSTEM', text:'Hinter dem geöffneten Verschluss liegt der Durchgang zur Langstrecke.' },
      { speaker:'R-3MI',  text:'„Kommst du nicht?"' },
      { speaker:'B-RADF1SH', text:'„Nein."' },
      { speaker:'SYSTEM', text:'*CLANK.*' },
      { speaker:'B-RADF1SH', text:'„Jetzt weiß ich, wo’s klemmt."' },
      { speaker:'V-TGM',  text:'"We just opened it."', subtitle:'Wir haben es gerade geöffnet.' },
      { speaker:'B-RADF1SH', text:'„Eben."' },
      { speaker:'SYSTEM', text:'Er kniet schon wieder vor dem Mechanismus, den Prüfhaken in der Hand. Irgendwo dahinter läuft ein Zahnrad an, das seit Jahren stillstand.' },
    ], finishChapter);
  }

  function finishChapter() {
    if (S.ended) return;
    S.ended = true;
    try { GameEngine.state.markChapterComplete(CHAPTER_ID); } catch(_) {}
    try { GameEngine.achievements.unlock('ch4_complete'); } catch(_) {}
    try { GameEngine.audio.fanfare(); } catch(_) {}
    el('chapterComplete').classList.remove('hidden');
    el('ccProgress').textContent =
      `FORTSCHRITT: ${GameEngine.state.get('chaptersCompleted').length} / 9 KAPITEL`;
    setTimeout(() => el('ccEnter')?.focus(), 700);
  }

  // ═══════════════════════════════════════════════════════════════
  // TALKING TO THE ROOM
  // ═══════════════════════════════════════════════════════════════
  const TALK = {
    bradfish: [
      { key:'job', label:'[ Was machst du hier eigentlich? ]', lines:[
        { speaker:'B-RADF1SH', text:'„Verschlüsse prüfen. Wenn einer klemmt, schau ich, wo."' },
        { speaker:'R-3MI',  text:'„Und wenn keiner klemmt?"' },
        { speaker:'B-RADF1SH', text:'„Dann klemmt bald einer."' },
      ] },
      { key:'built', label:'[ Hast du das Schloss gebaut? ]', lines:[
        { speaker:'B-RADF1SH', text:'„Nein."' },
        { speaker:'SYSTEM', text:'Pause.' },
        { speaker:'B-RADF1SH', text:'„Ich repariere lieber. Beim Bauen darf man sich alles ausdenken. Beim Reparieren muss man verstehen, was schon da ist."' },
        { speaker:'V-TGM',  text:'"That is harder."', subtitle:'Das ist schwerer.' },
        { speaker:'B-RADF1SH', text:'„Ist ehrlicher."' },
      ] },
      { key:'alone', label:'[ Arbeitest du immer allein? ]', lines:[
        { speaker:'B-RADF1SH', text:'„Nicht gern."' },
        { speaker:'B-RADF1SH', text:'„Vier Augen sehen manchmal wirklich mehr als zwei."' },
        { speaker:'R-3MI',  text:'„Wir haben hier technisch gesehen—"' },
        { speaker:'V-TGM',  text:'"Don’t count them."', subtitle:'Zähl sie nicht.' },
      ] },
      { key:'stuck', label:'[ Wirst du nie wütend, wenn was nicht geht? ]', lines:[
        { speaker:'B-RADF1SH', text:'„Doch."' },
        { speaker:'SYSTEM', text:'Pause.' },
        { speaker:'B-RADF1SH', text:'„Dann leg ich es hin und mach was anderes. Kommt meistens von selbst zurück."' },
        { speaker:'R-3MI',  text:'„Das ist die langweiligste Superkraft, die ich je gehört habe."' },
        { speaker:'B-RADF1SH', text:'„Funktioniert aber."' },
      ] },
    ],
    r3mi: [
      { key:'him', label:'[ Was hältst du von ihm? ]', lines:[
        { speaker:'R-3MI', text:'„Er redet ungefähr so viel wie L-UX. Aber bei L-UX klingt es nach Geheimnis und bei ihm nach Feierabend."' },
        { speaker:'R-3MI', text:'„Ich weiß nicht, was schlimmer ist."' },
      ], again:[
        { speaker:'R-3MI', text:'„Wenn ich hier irgendwas anfasse, sagt er nicht »nein«. Er sagt »kannst du machen«."' },
        { speaker:'R-3MI', text:'„Das ist viel schlimmer. Dann muss man selber nachdenken."' },
      ] },
      { key:'big', label:'[ Wie fängt man bei so einem Ding an? ]', lines:[
        { speaker:'R-3MI', text:'„Ich hab es mit »alles gleichzeitig anstarren« versucht. Hat nicht funktioniert."' },
        { speaker:'B-RADF1SH', text:'„Macht jeder einmal."' },
      ] },
    ],
    vtgm: [
      { key:'read', label:'[ Wie liest du das hier? ]', lines:[
        { speaker:'V-TGM', text:'"Four subsystems. Four values. The lock is a sentence with four blanks."', subtitle:'Vier Teilsysteme. Vier Werte. Das Schloss ist ein Satz mit vier Lücken.' },
        { speaker:'V-TGM', text:'"Fill them in any order you like."', subtitle:'Füll sie in beliebiger Reihenfolge.' },
      ] },
      { key:'him', label:'[ Und was hältst du von ihm? ]', lines:[
        { speaker:'V-TGM', text:'"He has been repairing this for a long time. Nobody asked him to."', subtitle:'Er repariert das hier seit Langem. Niemand hat ihn darum gebeten.' },
        { speaker:'B-RADF1SH', text:'„War ja sonst keiner da."' },
      ] },
    ],
  };

  function clickRobot(who) {
    if (dialogueBusy()) { try { GameEngine.dialogue.advance(); } catch(_) {} return; }
    if (!S.started) return;
    if (who === 'bradfish' && froschiBeat()) return;

    const topics = TALK[who] || [];
    const choices = topics.map(t => {
      const seen = !!S.talkSeen[who + ':' + t.key];
      return { key:t.key, label:t.label, seen, lines:(seen && t.again) ? t.again : t.lines };
    });
    if (who === 'bradfish') {
      choices.unshift({ key:'__coach', label:'[ Wie geht man das an? ]', seen:false, lines: coachLines() });
    }
    choices.push({ key:'__leave', label:'[ Nichts. Weiter. ]', seen:false, lines: [] });

    const title = who === 'bradfish' ? 'B-RADF1SH ANSPRECHEN:' : who === 'r3mi' ? 'R-3MI ANSPRECHEN:' : 'V-TGM ANSPRECHEN:';
    askOnce({
      prompt: title, hint: 'OPTIONAL.', choices,
      onPick: (key) => {
        if (key === '__leave' || key === '__coach') return;
        S.talkSeen[who + ':' + key] = true;
      },
    });
  }

  /**
   * A single small familiarity beat, only if Chapter 2's Eissplitter is in
   * the save. Missing flag → nothing happens, nothing is gated.
   */
  function froschiBeat() {
    if (S.froschiMentioned) return false;
    let has = false;
    try { has = !!GameEngine.state.hasFlag('has_eissplitter'); } catch(_) { has = false; }
    if (!has) { S.froschiMentioned = true; return false; }
    S.froschiMentioned = true;
    say([
      { speaker:'B-RADF1SH', text:'„Moment."' },
      { speaker:'SYSTEM', text:'Er schaut auf etwas, das du bei dir trägst. Nicht lange.' },
      { speaker:'B-RADF1SH', text:'„Wo hast’n den her?"' },
      { speaker:'R-3MI',  text:'„Garten."' },
      { speaker:'SYSTEM', text:'Pause.' },
      { speaker:'B-RADF1SH', text:'„Geht’s F-RØ5CHI gut?"' },
      { speaker:'V-TGM',  text:'"Better now."', subtitle:'Jetzt besser.' },
      { speaker:'B-RADF1SH', text:'„Gut."' },
      { speaker:'SYSTEM', text:'Damit dreht er sich zurück zum Mechanismus.' },
    ]);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // COACHING — unlimited, contextual, never a solution
  // ═══════════════════════════════════════════════════════════════
  const COACH = {
    start: [
      [ { speaker:'B-RADF1SH', text:'„Fang irgendwo an."' },
        { speaker:'R-3MI', text:'„Das ist dein Tipp?"' },
        { speaker:'B-RADF1SH', text:'„Ja."' },
        { speaker:'B-RADF1SH', text:'„Stillstehen löst weniger."' } ],
      [ { speaker:'B-RADF1SH', text:'„Nimm das Teil, bei dem du sofort etwas sicher erkennst. Nicht das schwerste."' } ],
      [ { speaker:'B-RADF1SH', text:'„Du musst nicht wissen, wie das Ganze funktioniert. Nur das Stück, vor dem du stehst."' } ],
    ],
    stuck: [
      [ { speaker:'B-RADF1SH', text:'„Welche Annahme hast du noch gar nicht überprüft?"' } ],
      [ { speaker:'B-RADF1SH', text:'„Wenn nichts passt, prüf zuerst die Annahme. Nicht gleich die Rechnung."' } ],
      [ { speaker:'B-RADF1SH', text:'„Was weißt du hier sicher? Fang bei dem an und schreib den Rest ab."' } ],
      [ { speaker:'B-RADF1SH', text:'„Welche Information brauchst du für diesen Schritt wirklich?"' },
        { speaker:'SYSTEM', text:'Pause.' },
        { speaker:'B-RADF1SH', text:'„Und welche kannst du weglassen?"' } ],
    ],
    one: [
      [ { speaker:'B-RADF1SH', text:'„Jetzt hast du etwas Sicheres."' },
        { speaker:'B-RADF1SH', text:'„Darauf kannst du bauen."' } ],
      [ { speaker:'B-RADF1SH', text:'„Ein Teil steht. Das Schloss ist ab jetzt kleiner als vorhin."' } ],
    ],
    half: [
      [ { speaker:'B-RADF1SH', text:'„Halb offen."' },
        { speaker:'R-3MI', text:'„Es ist überhaupt nicht halb offen."' },
        { speaker:'B-RADF1SH', text:'„Gedanklich."' } ],
      [ { speaker:'B-RADF1SH', text:'„Die gelösten Teile sind jetzt Hinweise für den Rest. Guck sie ruhig nochmal an."' } ],
    ],
    switching: [
      [ { speaker:'B-RADF1SH', text:'„Ist okay."' },
        { speaker:'B-RADF1SH', text:'„Manchmal sieht man Teil B erst, nachdem man Teil D liegen gelassen hat."' } ],
      [ { speaker:'B-RADF1SH', text:'„Hin und her ist kein Fehler. Hin und her und dabei nichts aufschreiben schon."' } ],
    ],
    ready: [
      [ { speaker:'B-RADF1SH', text:'„Du hast alles. Jetzt nichts Neues mehr erfinden."' } ],
      [ { speaker:'B-RADF1SH', text:'„Vier Werte, vier Ringe. Mehr steht da nicht."' } ],
      [ { speaker:'B-RADF1SH', text:'„Du versuchst gerade wieder das ganze Schloss. Bleib bei der Tafel."' } ],
    ],
    done: [
      [ { speaker:'B-RADF1SH', text:'„Ist offen. Ich hab hier noch was."' } ],
    ],
  };

  function coachBucket() {
    if (S.finalSolved) return 'done';
    const n = solvedCount();
    if (n === 4) return 'ready';
    const m = S.coaching.lastModule;
    if (m && !S.modules[m].solved && S.modules[m].fails >= 2) return 'stuck';
    if (S.coaching.switches >= 3 && n < 4) return 'switching';
    if (n === 0) return 'start';
    if (n === 1) return 'one';
    return 'half';
  }

  function coachLines() {
    const b = coachBucket();
    const pool = COACH[b];
    const i = (S.coaching.pool[b] || 0) % pool.length;
    S.coaching.pool[b] = i + 1;
    return pool[i];
  }

  // ═══════════════════════════════════════════════════════════════
  // FORMAL HINTS — one shared 3-step ladder per module.
  // B-RADF1SH asks the question that shrinks the problem, R-3MI comes at
  // it sideways, V-TGM states the relationship. None of them name a value.
  // ═══════════════════════════════════════════════════════════════
  const HINTS = {
    pattern: [
      { b:{ t:'„Was weißt du sicher?"' },
        r:{ t:'„Acht Platten. Drei kann ich nicht lesen. Fünf schon."' },
        v:{ t:'"Five plates are readable. Everything you need is in those five."', s:'Fünf Platten sind lesbar. Alles, was du brauchst, steht in diesen fünf.' } },
      { b:{ t:'„Zwei Platten nebeneinander sagen dir nichts über die übernächste. Warum nicht?"' },
        r:{ t:'„Weil der Sprung nicht jedes Mal gleich groß ist. Glaub ich. Ziemlich sicher. Fast."' },
        v:{ t:'"The strip does not advance by the same amount every time. Two heads take turns."', s:'Die Strecke rückt nicht jedes Mal gleich weit. Zwei Köpfe wechseln sich ab.' } },
      { b:{ t:'„Dann nimm nur die Platten, die zum selben Kopf gehören — und lass die anderen weg."' },
        r:{ t:'„Erst jede zweite Platte anschauen. Dann die andere Hälfte. Zwei kleine Reihen statt einer großen."' },
        v:{ t:'"Read the strip in steps of two. Each half advances by a constant amount; together they give the missing plate."', s:'Lies die Strecke in Zweierschritten. Jede Hälfte rückt gleichmäßig; zusammen ergeben sie die fehlende Platte.' } },
    ],
    weight: [
      { b:{ t:'„Wie viele Wägungen brauchst du wirklich?"' },
        r:{ t:'„Vier Gewichte, fünf Läufe. Das ist… knapp."' },
        v:{ t:'"Four counterweights, all different. Five runs is enough — but not if you spend one twice."', s:'Vier Gegengewichte, alle verschieden. Fünf Läufe reichen — aber nicht, wenn du einen doppelt ausgibst.' } },
      { b:{ t:'„Wenn I schwerer ist als II und II schwerer als III — musst du I und III noch wiegen?"' },
        r:{ t:'„Nein! …oder? Nein."' },
        v:{ t:'"Weight order carries over. Any comparison you can derive is one you should not spend."', s:'Die Gewichtsordnung überträgt sich. Jeden Vergleich, den du herleiten kannst, solltest du nicht ausgeben.' } },
      { b:{ t:'„Sortier erst zwei Paare. Dann häng sie ineinander."' },
        r:{ t:'„Zwei gegeneinander, die anderen zwei gegeneinander, dann die beiden Sieger — und den Rest einsortieren."' },
        v:{ t:'"Compare two pairs, then merge them: the winners decide the top, the remaining runs slot the rest in."', s:'Vergleiche zwei Paare und füge sie zusammen: Die Sieger entscheiden die Spitze, die restlichen Läufe sortieren den Rest ein.' } },
    ],
    timing: [
      { b:{ t:'„Welche Zeile im Protokoll schließt am meisten aus?"' },
        r:{ t:'„Ich fang immer bei der ersten an. Das ist vermutlich der Fehler."' },
        v:{ t:'"Start with the entry that leaves the fewest possibilities, not with the first one."', s:'Fang mit dem Eintrag an, der die wenigsten Möglichkeiten übrig lässt, nicht mit dem ersten.' } },
      { b:{ t:'„Was sagt dir eine Zeile über die drei Takte, von denen sie gar nicht redet?"' },
        r:{ t:'„Wenn einer NICHT im zweiten Takt läuft, ist er in einem der anderen drei. Das ist auch was."' },
        v:{ t:'"Every entry removes beats from more than one piston. Track what is left, not what is possible."', s:'Jeder Eintrag nimmt mehr als einem Kolben Takte weg. Verfolge, was übrig bleibt, nicht was möglich ist.' } },
      { b:{ t:'„Setz den fest, der am wenigsten Platz hat. Der Rest fällt dann meistens von allein."' },
        r:{ t:'„Erst den Kolben festnageln, dem nur noch ein Takt übrig bleibt. Dann alles nochmal lesen."' },
        v:{ t:'"Fix the piston with the fewest remaining beats, then re-read every entry with that one fixed."', s:'Leg den Kolben mit den wenigsten übrigen Takten fest und lies dann jeden Eintrag noch einmal mit dieser Festlegung.' } },
    ],
    orient: [
      { b:{ t:'„Welche Glieder kannst du von hier aus schon sicher sagen?"' },
        r:{ t:'„Der Antrieb. Da steht die Richtung ja drauf."' },
        v:{ t:'"The drive direction is stamped on the housing. Follow the train from there until the reading stops."', s:'Die Antriebsrichtung steht auf dem Gehäuse. Folge dem Zug von dort, bis das Lesen abreißt.' } },
      { b:{ t:'„Es gibt noch eine zweite Stelle, an der du sicher bist. Wo?"' },
        r:{ t:'„Die Prüfmarke! Da steht die Richtung DRIN. Weiter hinten im Zug."' },
        v:{ t:'"The test mark fixes one element further down the train. That is a second anchor."', s:'Die Prüfmarke legt ein Glied weiter hinten fest. Das ist ein zweiter Ankerpunkt.' } },
      { b:{ t:'„Dann arbeite von beiden Seiten auf die abgenutzte Stelle zu."' },
        r:{ t:'„Vom Antrieb vorwärts, von der Prüfmarke rückwärts. Rückwärts gilt dieselbe Regel."' },
        v:{ t:'"Propagate forward from the drive and backward from the test mark. A coupling reverses in both directions."', s:'Rechne vom Antrieb vorwärts und von der Prüfmarke rückwärts. Ein Glied kehrt in beide Richtungen gleich um.' } },
    ],
    final: [
      { b:{ t:'„Du hast alles. Es fehlt nur die Reihenfolge, in der du es benutzt."' },
        r:{ t:'„Vier Werte, vier Ringe. Irgendwo muss man anfangen."' },
        v:{ t:'"Begin with the one ring the readouts name outright."', s:'Fang mit dem einen Ring an, den die Anzeigen direkt benennen.' } },
      { b:{ t:'„Welcher Ring steht fest, bevor du irgendetwas drehst?"' },
        r:{ t:'„Der Leitring! Der kriegt das Leitzeichen. Ohne Rechnerei."' },
        v:{ t:'"The Leitring takes the Leitzeichen unchanged. Every other ring is measured from there."', s:'Der Leitring bekommt das Leitzeichen unverändert. Jeder andere Ring wird von dort aus gemessen.' } },
      { b:{ t:'„Von dort weiter — Ring für Ring in der Kolbenfolge, jedes Mal ein Zeichen weiter."' },
        r:{ t:'„Und ob vorwärts oder rückwärts durch den Kranz, sagt der Laufring."' },
        v:{ t:'"Walk the Kolbenfolge from the Leitring, one symbol per step, in the direction the Laufring turns."', s:'Geh die Kolbenfolge vom Leitring aus durch, ein Zeichen pro Schritt, in der Drehrichtung des Laufrings.' } },
    ],
  };

  function useHint(who) {
    const ladder = HINTS[S.hints.active];
    if (!ladder) return;

    if (S.hints.step >= HINT_MAX) {
      const done = {
        r3mi:     { speaker:'R-3MI', text:'„Mehr habe ich nicht. Frag ihn, der hat immer noch was."' },
        vtgm:     { speaker:'V-TGM', text:'"That is all I have."', subtitle:'Mehr habe ich nicht.' },
        bradfish: null,
      };
      if (who === 'bradfish') { say(coachLines()); return; }
      say([done[who]]);
      return;
    }

    const step = ladder[S.hints.step];
    S.hints.step++;
    S.hints.used++;
    updateHintBar();
    const entry = who === 'r3mi' ? step.r : who === 'vtgm' ? step.v : step.b;
    const speaker = who === 'r3mi' ? 'R-3MI' : who === 'vtgm' ? 'V-TGM' : 'B-RADF1SH';
    say([{ speaker, text: entry.t, subtitle: entry.s }]);
  }

  function updateHintBar() {
    const left = Math.max(0, HINT_MAX - S.hints.step);
    const c = el('hintCount');
    if (c) c.textContent = `HINWEISE: ${left} VERFÜGBAR`;
    const done = left <= 0;
    ['hintBtnR3MI', 'hintBtnVTGM'].forEach(id => {
      const b = el(id);
      if (b) b.disabled = done;
    });
    // B-RADF1SH never runs out — after the ladder he switches to coaching.
    const bb = el('hintBtnBradfish');
    if (bb) {
      bb.disabled = false;
      bb.title = done ? 'Allgemeine Hilfe' : 'Hinweis';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════
  function init() {
    if (!GameEngine.state.isChapterComplete('ch3')) {
      location.replace('../chapter3/chapter3.html');
      return;
    }
    setProgress(37);
    el('modBody').addEventListener('click', onModalClick);
    el('modActions').addEventListener('click', onModalClick);
    showTitleCard();
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════
  return { init, clickRobot, useHint };

})();

document.addEventListener('DOMContentLoaded', () => Chapter4.init());
