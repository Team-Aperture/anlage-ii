/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 07 — SEKTOR 07 // VEXIERSEKTOR
 * Guest: FAX-N — TÄUSCHUNGSDESIGNER. Built this sector's training
 *        illusions: false doors, misleading displays, duplicated
 *        controls. Friendly, good-humoured, quietly proud of good
 *        workmanship, and delighted whenever somebody catches one.
 *
 * FAX-N SAGT DIE WAHRHEIT. SEIN SEKTOR NICHT.
 *
 * The lesson is VERIFY, DON'T INVERT. Nothing here rewards flipping
 * every statement — some readouts are true, some false, some merely
 * incomplete. What is always reliable is the machinery: bolts, cables,
 * hinges, lamps, latches. The chapter escalates through presentation
 * layers that each fail in a different way, and the player restores one
 * reference anchor per layer:
 *
 *   BESCHRIFTUNG   the labels lie; the hardware does not
 *   ANZEIGE        the schematic lies; the cable routes do not
 *   RÜCKMELDUNG    the system misnames your actions; the latches move
 *                  honestly
 *   ECHTHEITSPRÜFUNG   system and guest each point somewhere; only the
 *                      evidence decides
 *
 * Only fictional in-game UI ever lies. Hints, mute, settings, saves and
 * navigation stay honest throughout — the player should feel tricked,
 * never unsafe.
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter7 = (() => {
  'use strict';

  const CH         = GameEngine.chapter;
  const CHAPTER_ID = 'ch7';
  const SAVE_KEY   = 'ch7_progress';
  const HINT_MAX   = 3;

  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const S = {
    act: 1,
    fakeCompleteSeen: false,
    metFaxn:  false,
    anchors:  { labels:false, displays:false, actions:false },
    bsodSeen: false,
    integritySeen: false,
    sigFound: false,
    luxSeen:  false,
    solved:   false,
    ended:    false,
    seen:     {},
    talkSeen: {},
    hints:    { active:null, step:0 },
    coach:    0,
    excuse:   0,
    wrongFinal: 0,
  };

  const P = { doors:null, wires:null, latches:null, exits:null };

  let openModal = null;
  let timers = [];

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════
  function el(id) { return document.getElementById(id); }
  function playSound(src) { try { GameEngine.audio.sfx(src); } catch (_) {} }
  function tone(o)        { try { GameEngine.audio.tone(o); } catch (_) {} }
  function say(lines, after) { GameEngine.dialogue.load(lines, after); }
  function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [r[i],r[j]] = [r[j],r[i]]; }
    return r;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function bump(k) { S.seen[k] = (S.seen[k] || 0) + 1; return S.seen[k]; }
  function reduceMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
  }
  function anchorsDone() { return Object.values(S.anchors).filter(Boolean).length; }

  function dialogueBusy() {
    const c = document.querySelector('.dlg-container');
    return !!(c && c.classList.contains('visible'));
  }
  function guarded(fn) {
    return (...a) => {
      if (dialogueBusy()) { try { GameEngine.dialogue.advance(); } catch (_) {} return; }
      return fn(...a);
    };
  }
  function addHotspot(cfg) { return CH.addHotspot({ ...cfg, fn: guarded(cfg.fn) }); }

  // ═══════════════════════════════════════════════════════════════
  // CHECKPOINT — the gags must not replay on every reload
  // ═══════════════════════════════════════════════════════════════
  function save() {
    try {
      GameEngine.state.set(SAVE_KEY, {
        act: S.act, fakeCompleteSeen: S.fakeCompleteSeen, metFaxn: S.metFaxn,
        anchors: S.anchors, bsodSeen: S.bsodSeen, integritySeen: S.integritySeen,
        sigFound: S.sigFound, luxSeen: S.luxSeen,
      });
    } catch (_) {}
  }
  function clearSave() { try { GameEngine.state.set(SAVE_KEY, null); } catch (_) {} }
  function loadCheckpoint() {
    let d = null;
    try { d = GameEngine.state.get(SAVE_KEY); } catch (_) { return null; }
    if (!d || typeof d !== 'object') return null;
    if (typeof d.act !== 'number' || d.act < 1 || d.act > 6) return null;
    if (!d.anchors || typeof d.anchors !== 'object') return null;
    return d;
  }

  // ═══════════════════════════════════════════════════════════════
  // THE SECTOR'S UNRELIABLE CHROME
  // Only the fictional readouts drift. The reactivation figure in the
  // system bar is display text only — the saved percentage is untouched.
  // ═══════════════════════════════════════════════════════════════
  const WOBBLE = ['187 %', '-4 %', 'JA', 'VIELLEICHT', '82 %'];
  function wobbleProgress() {
    if (S.solved) return;
    const e = el('reactProgress');
    if (!e) return;
    e.textContent = `REAKTIVIERUNG: ${pick(WOBBLE)}`;
  }
  function steadyProgress(pct) {
    const e = el('reactProgress');
    if (e) e.textContent = `REAKTIVIERUNG: ${pct}%`;
  }
  /** How loudly the sector is still lying, 0 (stable) … 3 (everything). */
  function liesLevel() { return 3 - anchorsDone(); }
  function paintStability() {
    const w = el('sceneWrapper');
    if (w) w.dataset.lies = String(liesLevel());
    if (liesLevel() === 0) steadyProgress(S.solved ? 96 : 82);
    else if (!S.solved && Math.random() < 0.5) wobbleProgress();
    else steadyProgress(82);
  }

  // ═══════════════════════════════════════════════════════════════
  // ROOM
  // ═══════════════════════════════════════════════════════════════
  function sceneKey() {
    if (S.solved) return 'vex-stable';
    return liesLevel() >= 3 ? 'vex-loud' : liesLevel() >= 1 ? 'vex-dim' : 'vex-calm';
  }

  function loadRoom() {
    CH.setScene(sceneKey());
    CH.clearHotspots();
    CH.showRobots(true);
    CH.showGuest(S.metFaxn);
    paintStability();

    CH.addProp({ prop:'duct',   x:12, y:0,  w:56, h:6, cls:'prop-far' });
    CH.addProp({ prop:'cables', x:72, y:2,  w:9,  h:22, cls:'prop-far' });
    CH.addProp({ prop:'crate',  x:86, y:70, w:12, h:14 });
    CH.addProp({ prop:'barrel', x:2,  y:66, w:8,  h:15 });

    // ── the three anchors, discovered in sequence
    if (!S.anchors.labels) {
      addHotspot({ prop:'c7_doorbank', cls:'prop-guest', x:34, y:28, w:30, h:34,
        label:'DREI TÜREN', aria:'Die drei Türen prüfen', fn:() => openStation('doors') });
    } else if (!S.anchors.displays) {
      addHotspot({ prop:'c7_wirepanel', cls:'prop-guest', x:36, y:30, w:26, h:28,
        label:'SCHALTBILD', aria:'Schaltbild und Verkabelung prüfen', fn:() => openStation('wires') });
    } else if (!S.anchors.actions) {
      addHotspot({ prop:'c7_latchrack', cls:'prop-guest', x:36, y:30, w:26, h:28,
        label:'RIEGELBANK', aria:'Riegelbank bedienen', fn:() => openStation('latches') });
    } else if (!S.solved) {
      addHotspot({ prop:'c7_exitbank', cls:'prop-guest', x:34, y:28, w:30, h:34,
        label:'ECHTHEITSPRÜFUNG', aria:'Echtheitsprüfung durchführen', fn:() => openStation('exits') });
    }

    // ── the props that are only ever flavour
    addHotspot({ prop:'c7_falsedoor', x:6, y:34, w:15, h:34,
      label: S.seen.fake ? 'FALSCHE TÜR' : 'TÜR',
      aria:'Tür untersuchen', fn:() => examine('fake') });
    addHotspot({ prop:'c7_realwall', x:80, y:36, w:14, h:30,
      label: S.seen.wall ? 'DOCH EINE TÜR' : 'WAND',
      aria:'Wand untersuchen', fn:() => examine('wall') });
    addHotspot({ prop:'c7_luxcase', x:22, y:62, w:13, h:18,
      label:'SONDERPRÜFUNG', aria:'Sonderprüfung ansehen', fn:() => examine('lux') });
    addHotspot({ prop:'c7_jokescreen', x:66, y:52, w:14, h:14,
      label:'DIAGNOSESCHIRM', aria:'Diagnoseschirm lesen', fn:() => examine('joke') });

    // ── the counterfeit, once the player knows what authentic looks like
    if (S.anchors.displays || S.sigFound) {
      addHotspot({ prop:'c7_fakepanel', cls: S.sigFound ? 'prop-brown' : '', x:50, y:64, w:13, h:16,
        label: S.sigFound ? 'GEÖFFNETE PLATTE' : 'WANDPLATTE',
        aria:'Wandplatte untersuchen', fn:() => inspectPanel() });
    }

    if (S.solved) {
      addHotspot({ prop:'door', x:44, y:60, w:13, h:34,
        label:'SEKTOR 08', aria:'Sektor 08 betreten', fn:() => finishChapter() });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ACT 1 — the chapter opens by claiming it is over
  // ═══════════════════════════════════════════════════════════════
  function begin() {
    const d = loadCheckpoint();
    if (d) {
      S.act = d.act; S.fakeCompleteSeen = true; S.metFaxn = !!d.metFaxn;
      S.anchors = { labels:!!d.anchors.labels, displays:!!d.anchors.displays, actions:!!d.anchors.actions };
      S.bsodSeen = !!d.bsodSeen; S.integritySeen = !!d.integritySeen;
      S.sigFound = !!d.sigFound; S.luxSeen = !!d.luxSeen;
      loadRoom();
      say([
        { speaker:'SYSTEM', text:'SEKTOR 07 // DARSTELLUNGSEBENE WIRD NEU GELADEN.' },
        { speaker:'FAX-N',  text:'„Ah. Wieder da."' },
        { speaker:'R-3MI',  text:'„Ist der Sektor inzwischen ehrlich?"' },
        { speaker:'FAX-N',  text:'„Teilweise."' },
      ]);
      return;
    }
    fakeComplete();
  }

  function fakeComplete() {
    // Presentation only. Nothing here touches the save, the achievement or
    // Chapter 8's lock.
    const ov = el('fakeComplete');
    ov.classList.remove('hidden');
    requestAnimationFrame(() => ov.classList.add('visible'));
    playSound('ch7_chime.mp3');
    el('fcButton').onclick = () => {
      el('fcButton').onclick = null;
      playSound('ch7_glitch.mp3');
      ov.classList.add('breaking');
      later(() => {
        ov.classList.remove('visible', 'breaking');
        later(() => ov.classList.add('hidden'), 320);
        S.fakeCompleteSeen = true;
        S.act = 2;
        save();
        loadRoom();
        meetFaxn();
      }, reduceMotion() ? 260 : 1100);
    };
  }

  function meetFaxn() {
    S.metFaxn = true;
    save();
    CH.showGuest(true);
    try { GameEngine.music.play('ch7_ambient'); } catch (_) {}
    say([
      { speaker:'SYSTEM', text:'Der Abschlussbildschirm bricht in der Mitte auseinander und rutscht weg wie eine schlecht geklebte Tapete. Dahinter: derselbe Raum wie vorher.' },
      { speaker:'R-3MI',  text:'„…haben wir gewonnen?"' },
      { speaker:'FAX-N',  text:'„Nein."' },
      { speaker:'R-3MI',  text:'„WER SAGT DAS?"' },
      { speaker:'SYSTEM', text:'Aus einer offenen Schalttafel an der Wand, halb darin verschwunden, hebt sich ein Kürbiskopf. Er leuchtet. Er grinst. Er grinst immer.' },
      { speaker:'FAX-N',  text:'„Das macht er seit gestern."' },
      { speaker:'FAX-N',  text:'„Hallo."' },
      { speaker:'R-3MI',  text:'„Du könntest mit dem Gesicht wirklich etwas weniger freundlich reden."' },
      { speaker:'FAX-N',  text:'„Warum?"' },
      { speaker:'R-3MI',  text:'„Genau deshalb."' },
      { speaker:'SYSTEM', text:'FAX-N. TÄUSCHUNGSDESIGNER. Er zieht den Kopf aus der Tafel und wischt sich Kabelstaub vom Kiefer.' },
      { speaker:'FAX-N',  text:'„Bevor wir anfangen: Ich lüg dich nicht an."' },
      { speaker:'R-3MI',  text:'„Das ist genau das, was jemand sagen würde, der—"' },
      { speaker:'SYSTEM', text:'An der Wand wechselt eine Anzeige von TÜR OFFEN zu TÜR NICHT VORHANDEN.' },
      { speaker:'R-3MI',  text:'„…okay."' },
      { speaker:'FAX-N',  text:'„Der Sektor schon."' },
      { speaker:'FAX-N',  text:'„Ich hab das hier gebaut. Falsche Türen, falsche Schilder, doppelte Schalter. Damit jemand merkt, dass er nur aufs Schild geschaut hat."' },
      { speaker:'R-3MI',  text:'„Und jetzt?"' },
      { speaker:'FAX-N',  text:'„Jetzt denkt es sich neue aus. Ohne mich."' },
      { speaker:'SYSTEM', text:'Pause.' },
      { speaker:'FAX-N',  text:'„Das ist der Teil, den ich nicht gebaut hab."' },
    ]);
  }

  // ═══════════════════════════════════════════════════════════════
  // ANCHOR 1 — BESCHRIFTUNG. Labels lie; hardware does not.
  // ═══════════════════════════════════════════════════════════════
  const DOOR_LABELS = ['OFFEN', 'VERRIEGELT', 'DEFEKT', 'BEREIT', 'GESPERRT', 'WARTUNG'];

  function buildDoors() {
    const ids = ['A', 'B', 'C'];
    const good = randInt(0, 2);
    const doors = ids.map((id, i) => {
      const usable = i === good;
      // Exactly one door satisfies all three mechanical conditions. The light
      // under the door is deliberately independent of all of them.
      let bolt, cable, hinge;
      if (usable) { bolt = 'ZURÜCKGEZOGEN'; cable = 'ANGESCHLOSSEN'; hinge = 'GEFETTET'; }
      else {
        const broken = pick(['bolt', 'cable', 'hinge', 'two']);
        bolt  = (broken === 'bolt'  || broken === 'two') ? 'VORGESCHOBEN'  : 'ZURÜCKGEZOGEN';
        cable = (broken === 'cable' || broken === 'two') ? 'DURCHTRENNT'   : 'ANGESCHLOSSEN';
        hinge = (broken === 'hinge')                     ? 'FESTGEROSTET'  : 'GEFETTET';
        if (bolt === 'ZURÜCKGEZOGEN' && cable === 'ANGESCHLOSSEN' && hinge === 'GEFETTET') bolt = 'VORGESCHOBEN';
      }
      return { id, usable, bolt, cable, hinge, light: Math.random() < 0.5 };
    });
    return { doors, good, labels: shuffle(DOOR_LABELS).slice(0, 3), tries: 0 };
  }

  function renderDoors() {
    const d = P.doors;
    return `
      <p class="vx-rule sys-text">MECHANISCHE FREIGABE — EINE TÜR GEHT AUF, WENN:</p>
      <ul class="vx-rulelist">
        <li>der <b>Riegel zurückgezogen</b> ist,</li>
        <li>das <b>Kabel angeschlossen</b> ist,</li>
        <li>das <b>Scharnier gefettet</b> ist.</li>
      </ul>
      <p class="vx-note sys-text">DIE BESCHRIFTUNG GEHÖRT NICHT DAZU.</p>
      <div class="vx-doors">` +
      d.doors.map((x, i) =>
        `<button class="vx-door" data-act="door" data-i="${i}" aria-label="Tür ${x.id} wählen">
           <span class="vx-door-id sys-text">TÜR ${x.id}</span>
           <span class="vx-door-label">„${esc(d.labels[i])}"</span>
           <ul class="vx-ev">
             <li><span class="sys-text">RIEGEL</span><b>${x.bolt}</b></li>
             <li><span class="sys-text">KABEL</span><b>${x.cable}</b></li>
             <li><span class="sys-text">SCHARNIER</span><b>${x.hinge}</b></li>
             <li class="vx-ev-dim"><span class="sys-text">LICHT DARUNTER</span><b>${x.light ? 'JA' : 'NEIN'}</b></li>
           </ul>
         </button>`).join('') +
      `</div>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // ANCHOR 2 — ANZEIGE. The schematic lies; the cable routes do not.
  // ═══════════════════════════════════════════════════════════════
  function buildWires() {
    const real = shuffle([0, 1, 2, 3]);            // real[switch] = terminal fed
    let fake = shuffle([0, 1, 2, 3]);
    let guard = 0;
    while (guard++ < 60 && real.every((v, i) => v === fake[i])) fake = shuffle([0, 1, 2, 3]);
    // Two routes are readable behind the panel; the rest follows from the fact
    // that each switch feeds exactly one terminal.
    const visible = shuffle([0, 1, 2, 3]).slice(0, 2);
    const want = shuffle([0, 1, 2, 3]).slice(0, 2).sort();   // terminals that must be powered
    return { real, fake, visible, want, on: [false, false, false, false], tries: 0 };
  }

  function renderWires() {
    const w = P.wires;
    const T = i => `T${i + 1}`;
    const S_ = i => `S${i + 1}`;
    return `
      <p class="vx-cap sys-text">SCHALTBILD (BILDSCHIRM)</p>
      <div class="vx-schema">` +
      w.fake.map((t, s) => `<div class="vx-map"><span>${S_(s)}</span><i>→</i><span>${T(t)}</span></div>`).join('') +
      `</div>
      <p class="vx-cap sys-text">KABELFÜHRUNG HINTER DER BLENDE (SICHTBAR)</p>
      <div class="vx-schema real">` +
      [0,1,2,3].map(s => w.visible.includes(s)
        ? `<div class="vx-map"><span>${S_(s)}</span><i>→</i><span>${T(w.real[s])}</span></div>`
        : `<div class="vx-map hidden-route"><span>${S_(s)}</span><i>→</i><span>?</span></div>`).join('') +
      `</div>
      <p class="vx-note sys-text">JEDER SCHALTER SPEIST GENAU EINE KLEMME. JEDE KLEMME HAT GENAU EINEN SCHALTER.</p>
      <p class="vx-target">STROM MUSS LIEGEN AN: <b>${w.want.map(T).join(' UND ')}</b> — UND SONST NIRGENDS.</p>
      <div class="vx-switches">` +
      [0,1,2,3].map(s =>
        `<button class="vx-sw${w.on[s] ? ' on' : ''}" data-act="wire" data-i="${s}"
                 aria-pressed="${w.on[s]}" aria-label="Schalter ${S_(s)} umlegen">
           <span class="vx-sw-id">${S_(s)}</span>
           <span class="vx-sw-state sys-text">${w.on[s] ? 'EIN' : 'AUS'}</span>
         </button>`).join('') +
      `</div>
      <div class="vx-terms">` +
      [0,1,2,3].map(t => {
        const live = w.on.some((on, s) => on && w.real[s] === t);
        return `<div class="vx-term${live ? ' live' : ''}">
            <span class="vx-term-id sys-text">${T(t)}</span>
            <span class="vx-lamp"></span>
            <span class="vx-term-state sys-text">${live ? 'STROM' : 'TOT'}</span>
          </div>`;
      }).join('') +
      `</div>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // ANCHOR 3 — RÜCKMELDUNG. The report misnames the switch; the latch
  // that actually moves is the truth.
  // ═══════════════════════════════════════════════════════════════
  function buildLatches() {
    const map = shuffle([0, 1, 2, 3]);              // map[switch] = latch toggled
    let report = shuffle([0, 1, 2, 3]);             // what the system claims was pressed
    let guard = 0;
    while (guard++ < 60 && report.some((v, i) => v === i)) report = shuffle([0, 1, 2, 3]);
    const state = [false, false, false, false];
    let target;
    do { target = [0,1,2,3].map(() => Math.random() < 0.5); }
    while (target.every(v => v === false) || target.every(v => v === true));
    return { map, report, state, target, tries: 0, lastMoved: -1 };
  }

  function renderLatches() {
    const l = P.latches;
    const R = i => `RIEGEL ${i + 1}`;
    return `
      <p class="vx-note sys-text">DIE ANLAGE MELDET, WELCHER SCHALTER GEDRÜCKT WURDE. SIE IRRT SICH. DIE RIEGEL NICHT.</p>
      <p class="vx-cap sys-text">SOLLZUSTAND</p>
      <div class="vx-latchrow">` +
      l.target.map((t, i) =>
        `<div class="vx-latch target ${t ? 'open' : 'shut'}">
           <span class="vx-latch-id sys-text">${R(i)}</span>
           <span class="vx-bolt"></span>
           <span class="vx-latch-state sys-text">${t ? 'ZURÜCK' : 'VOR'}</span>
         </div>`).join('') +
      `</div>
      <p class="vx-cap sys-text">IST-ZUSTAND</p>
      <div class="vx-latchrow">` +
      l.state.map((t, i) =>
        `<div class="vx-latch ${t ? 'open' : 'shut'}${l.lastMoved === i ? ' moved' : ''}">
           <span class="vx-latch-id sys-text">${R(i)}</span>
           <span class="vx-bolt"></span>
           <span class="vx-latch-state sys-text">${t ? 'ZURÜCK' : 'VOR'}</span>
         </div>`).join('') +
      `</div>
      <p class="vx-cap sys-text">SCHALTER</p>
      <div class="vx-switches">` +
      [0,1,2,3].map(s =>
        `<button class="vx-sw" data-act="latch" data-i="${s}" aria-label="Schalter ${s + 1} drücken">
           <span class="vx-sw-id">S${s + 1}</span>
         </button>`).join('') +
      `</div>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // FINAL — ECHTHEITSPRÜFUNG. Neither stated authority is enough.
  // ═══════════════════════════════════════════════════════════════
  function buildExits() {
    const ids = ['A', 'B', 'C'];
    const good = randInt(0, 2);
    const exits = ids.map((id, i) => {
      const usable = i === good;
      let bolt, cable, hinge;
      if (usable) { bolt = 'ZURÜCKGEZOGEN'; cable = 'ANGESCHLOSSEN'; hinge = 'GEFETTET'; }
      else {
        const broken = pick(['bolt', 'cable', 'hinge']);
        bolt  = broken === 'bolt'  ? 'VORGESCHOBEN' : 'ZURÜCKGEZOGEN';
        cable = broken === 'cable' ? 'DURCHTRENNT'  : 'ANGESCHLOSSEN';
        hinge = broken === 'hinge' ? 'FESTGEROSTET' : 'GEFETTET';
      }
      return { id, usable, bolt, cable, hinge };
    });
    // The system names one exit and FAX-N guesses another; the evidence names
    // a third. Neither voice is a shortcut.
    const others = [0, 1, 2].filter(i => i !== good);
    const claimed = shuffle(others);
    return { exits, good, sysPick: claimed[0], faxPick: claimed[1], tries: 0 };
  }

  function renderExits() {
    const x = P.exits;
    return `
      <p class="vx-rule sys-text">ECHTHEITSPRÜFUNG — WELCHER AUSGANG IST WIRKLICH BENUTZBAR?</p>
      <div class="vx-claims">
        <div class="vx-claim sys"><span class="sys-text">SYSTEM</span><b>AUSGANG ${x.exits[x.sysPick].id} FREIGEGEBEN</b></div>
        <div class="vx-claim fax"><span class="sys-text">FAX-N</span><b>„Ich tippe auf ${x.exits[x.faxPick].id}. Guck trotzdem selber nach."</b></div>
      </div>
      <p class="vx-note sys-text">DIESELBE MECHANISCHE FREIGABE WIE VORHIN: RIEGEL ZURÜCK · KABEL ANGESCHLOSSEN · SCHARNIER GEFETTET.</p>
      <div class="vx-doors">` +
      x.exits.map((e, i) =>
        `<button class="vx-door" data-act="exit" data-i="${i}" aria-label="Ausgang ${e.id} wählen">
           <span class="vx-door-id sys-text">AUSGANG ${e.id}</span>
           <ul class="vx-ev">
             <li><span class="sys-text">RIEGEL</span><b>${e.bolt}</b></li>
             <li><span class="sys-text">KABEL</span><b>${e.cable}</b></li>
             <li><span class="sys-text">SCHARNIER</span><b>${e.hinge}</b></li>
           </ul>
         </button>`).join('') +
      `</div>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // STATION PANEL
  // ═══════════════════════════════════════════════════════════════
  const META = {
    doors:   { label:'ANKER 1 // BESCHRIFTUNG', title:'DREI TÜREN',      sub:'SCHILDER SIND KEINE BELEGE' },
    wires:   { label:'ANKER 2 // ANZEIGE',      title:'SCHALTBILD',      sub:'DER BILDSCHIRM IST NICHT DIE VERKABELUNG' },
    latches: { label:'ANKER 3 // RÜCKMELDUNG', title:'RIEGELBANK',      sub:'WAS SICH BEWEGT, ZÄHLT' },
    exits:   { label:'SEKTOR 07 // ABSCHLUSS',  title:'ECHTHEITSPRÜFUNG', sub:'BELEGE SCHLAGEN BEHAUPTUNGEN' },
  };

  function openStation(key) {
    if (openModal) closeModal();
    if (!P[key]) {
      P[key] = key === 'doors' ? buildDoors() : key === 'wires' ? buildWires()
             : key === 'latches' ? buildLatches() : buildExits();
    }
    openModal = key;
    S.hints.active = key;
    S.hints.step = 0;
    updateHintBar();
    CH.showHintBar(true);
    el('vxLabel').textContent = META[key].label;
    el('vxTitle').textContent = META[key].title;
    el('vxSub').textContent   = META[key].sub;
    el('vxModal').classList.remove('hidden');
    render();
    if (bump('open:' + key) === 1) introFor(key);
  }

  function closeModal() {
    clearTimers();
    openModal = null;
    S.hints.active = null;
    el('vxModal')?.classList.add('hidden');
    CH.showHintBar(false);
  }

  function setStatus(text, type) {
    const s = el('vxStatus');
    if (!s) return;
    s.textContent = text;
    s.className = 'puzzle-status sys-text' + (type ? ' ' + type : '');
  }

  function render() {
    if (!openModal) return;
    const body = el('vxBody'), acts = el('vxActions');
    body.innerHTML =
      openModal === 'doors'   ? renderDoors()
    : openModal === 'wires'   ? renderWires()
    : openModal === 'latches' ? renderLatches() : renderExits();
    acts.innerHTML =
      openModal === 'wires'
        ? `<button class="ka-btn primary" data-act="wire-commit">[ FREIGABE PRÜFEN ]</button>
           <button class="ka-btn small" data-act="wire-clear">[ ALLE AUS ]</button>
           <button class="ka-btn small" data-act="close">[ ZURÜCK ]</button>`
      : openModal === 'latches'
        ? `<button class="ka-btn primary" data-act="latch-commit">[ RIEGEL PRÜFEN ]</button>
           <button class="ka-btn small" data-act="close">[ ZURÜCK ]</button>`
        : `<button class="ka-btn small" data-act="close">[ ZURÜCK ]</button>`;
  }

  const INTRO = {
    doors: [
      { speaker:'SYSTEM', text:'Drei Türen nebeneinander. Über jeder hängt ein Schild. Die Schilder sind sauber, gut lesbar und aktuell falsch.' },
      { speaker:'FAX-N',  text:'„Schilder sind praktisch."' },
      { speaker:'R-3MI',  text:'„Deine offenbar nicht."' },
      { speaker:'FAX-N',  text:'„Deshalb schaust du jetzt hin."' },
      { speaker:'FAX-N',  text:'„Riegel, Kabel, Scharnier. Drei Sachen. Die kann man anfassen."' },
      { speaker:'V-TGM',  text:'"Ignore the label. Compare the latch position to the power connection."', subtitle:'Ignorier das Schild. Vergleich die Riegelstellung mit dem Stromanschluss.' },
    ],
    wires: [
      { speaker:'SYSTEM', text:'Ein Pult mit einem Schaltbild darauf. Daneben ist die Blende abgeschraubt — man sieht die Kabel wirklich laufen.' },
      { speaker:'FAX-N',  text:'„Was der Bildschirm sagt, kann falsch sein."' },
      { speaker:'SYSTEM', text:'Pause.' },
      { speaker:'FAX-N',  text:'„Was die Maschine tut, nicht."' },
      { speaker:'R-3MI',  text:'„Zwei Kabel sieht man gar nicht."' },
      { speaker:'FAX-N',  text:'„Jeder Schalter speist genau eine Klemme. Mehr brauchst du nicht."' },
    ],
    latches: [
      { speaker:'SYSTEM', text:'Vier Schalter, vier Riegel. Über der Bank hängt eine Meldezeile.' },
      { speaker:'R-3MI',  text:'„Und was ist daran jetzt kaputt?"' },
      { speaker:'FAX-N',  text:'„Drück mal einen."' },
      { speaker:'SYSTEM', text:'R-3MI drückt einen Schalter. Ein Riegel fährt hörbar zurück.' },
      { speaker:'SYSTEM', text:'SCHALTER 3 BETÄTIGT.' },
      { speaker:'R-3MI',  text:'„Ich hab die EINS gedrückt."' },
      { speaker:'FAX-N',  text:'„Ich weiß."' },
      { speaker:'FAX-N',  text:'„Schau nicht auf die Meldung. Schau, welcher Riegel sich bewegt hat."' },
    ],
    exits: [
      { speaker:'SYSTEM', text:'Drei Ausgänge. Zwei Meinungen. Keine Schilder mehr — nur noch Mechanik.' },
      { speaker:'FAX-N',  text:'„Ich sag dir, was ich glaube. Nicht, was ich weiß."' },
      { speaker:'R-3MI',  text:'„Ist das ein Unterschied?"' },
      { speaker:'FAX-N',  text:'„Ein großer."' },
    ],
  };
  function introFor(key) { say(INTRO[key]); }

  // ═══════════════════════════════════════════════════════════════
  // INPUT
  // ═══════════════════════════════════════════════════════════════
  function onPanelClick(ev) {
    const btn = ev.target.closest('[data-act]');
    if (!btn || btn.disabled) return;
    const act = btn.dataset.act;
    if (act === 'close') { closeModal(); loadRoom(); return; }
    const i = btn.dataset.i !== undefined ? +btn.dataset.i : -1;

    switch (act) {
      case 'door':  pickDoor(i); break;
      case 'wire':  P.wires.on[i] = !P.wires.on[i]; setStatus('', ''); playSound('ch7_click.mp3'); render(); break;
      case 'wire-clear': P.wires.on = [false,false,false,false]; setStatus('ALLE SCHALTER AUS.', ''); render(); break;
      case 'wire-commit': commitWires(); break;
      case 'latch': pressLatch(i); break;
      case 'latch-commit': commitLatches(); break;
      case 'exit':  pickExit(i); break;
    }
  }

  // ── Anchor 1 ─────────────────────────────────────────────────
  function pickDoor(i) {
    const d = P.doors;
    if (d.doors[i].usable) { anchorDone('labels'); return; }
    d.tries++;
    const x = d.doors[i];
    const why = x.bolt === 'VORGESCHOBEN' ? 'DER RIEGEL IST VOR.'
              : x.cable === 'DURCHTRENNT' ? 'DAS KABEL IST DURCH.'
              : 'DAS SCHARNIER SITZT FEST.';
    setStatus('TÜR ÖFFNET NICHT — ' + why, 'error');
    playSound('ch7_thud.mp3');
    tone({ freq: 110, type:'square', dur: 0.18, vol: 0.06 });
    if (d.tries % 2 === 1) sayMiss();
  }

  // ── Anchor 2 ─────────────────────────────────────────────────
  function commitWires() {
    const w = P.wires;
    const live = [0,1,2,3].filter(t => w.on.some((on, s) => on && w.real[s] === t));
    const ok = live.length === w.want.length && w.want.every(t => live.includes(t));
    if (ok) { anchorDone('displays'); return; }
    w.tries++;
    setStatus('FREIGABE VERWEIGERT — STROM LIEGT FALSCH AN.', 'error');
    tone({ freq: 120, type:'sawtooth', dur: 0.2, vol: 0.06 });
    if (w.tries % 2 === 1) sayMiss();
  }

  // ── Anchor 3 ─────────────────────────────────────────────────
  function pressLatch(s) {
    const l = P.latches;
    const latch = l.map[s];
    l.state[latch] = !l.state[latch];
    l.lastMoved = latch;
    playSound('ch7_latch.mp3');
    tone({ freq: 190, type:'square', dur: 0.08, vol: 0.05 });
    // The report names a different switch. The latch that moved is honest.
    setStatus(`SCHALTER ${l.report[s] + 1} BETÄTIGT.`, 'warn');
    render();
  }

  function commitLatches() {
    const l = P.latches;
    if (l.state.every((v, i) => v === l.target[i])) { anchorDone('actions'); return; }
    l.tries++;
    setStatus('RIEGELBILD STIMMT NICHT MIT DEM SOLLZUSTAND ÜBEREIN.', 'error');
    tone({ freq: 120, type:'sawtooth', dur: 0.2, vol: 0.06 });
    if (l.tries % 2 === 1) sayMiss();
  }

  // ── Final ────────────────────────────────────────────────────
  function pickExit(i) {
    const x = P.exits;
    if (x.exits[i].usable) { solveChapter(); return; }
    x.tries++;
    S.wrongFinal++;
    const followed = i === x.sysPick ? 'sys' : i === x.faxPick ? 'fax' : 'own';
    setStatus('AUSGANG ÖFFNET NICHT.', 'error');
    playSound('ch7_thud.mp3');
    tone({ freq: 110, type:'square', dur: 0.2, vol: 0.06 });
    try { GameEngine.fx.flash('rgba(0,0,0,0.5)'); } catch (_) {}
    say(followed === 'sys'
      ? [ { speaker:'SYSTEM', text:'Für einen Moment gehen alle Lampen aus. Dann kommen sie wieder.' },
          { speaker:'FAX-N',  text:'„Das war der andere."' },
          { speaker:'R-3MI',  text:'„Ich möchte offiziell festhalten, dass ich dem System geglaubt habe."' },
          { speaker:'V-TGM',  text:'"You did not."', subtitle:'Hast du nicht.' } ]
      : followed === 'fax'
      ? [ { speaker:'FAX-N',  text:'„Oh."' },
          { speaker:'SYSTEM', text:'Pause.' },
          { speaker:'FAX-N',  text:'„Ich hab getippt. Ich hab nicht nachgeschaut."' },
          { speaker:'R-3MI',  text:'„DU?!"' },
          { speaker:'FAX-N',  text:'„Ich bau die Dinger. Ich lös sie nicht."' } ]
      : [ { speaker:'FAX-N',  text:'„Fast."' },
          { speaker:'R-3MI',  text:'„Das war überhaupt nicht fast."' },
          { speaker:'FAX-N',  text:'„Ich wollt nett sein."' } ]);
  }

  // ═══════════════════════════════════════════════════════════════
  // ANCHOR COMPLETION + ESCALATION
  // ═══════════════════════════════════════════════════════════════
  const ANCHOR_NAME = { labels:'BESCHRIFTUNG', displays:'ANZEIGE', actions:'RÜCKMELDUNG' };

  function anchorDone(key) {
    if (S.anchors[key]) return;
    // Latch the anchor before any narration runs.
    S.anchors[key] = true;
    P[key === 'labels' ? 'doors' : key === 'displays' ? 'wires' : 'latches'] = null;
    save();
    closeModal();
    playSound('ch7_anchor.mp3');
    tone({ freq: 300, type:'sine', dur: 0.5, vol: 0.09, glideTo: 460 });
    try { GameEngine.fx.flash('rgba(214,138,42,0.16)'); } catch (_) {}
    loadRoom();

    const lines = [
      { speaker:'SYSTEM', text:`REFERENZANKER ${ANCHOR_NAME[key]} WIEDERHERGESTELLT.` },
      { speaker:'FAX-N',  text:'„Ha!"' },
      { speaker:'FAX-N',  text:'„Genau so."' },
    ];
    if (key === 'labels') {
      lines.push({ speaker:'R-3MI', text:'„Also ist ab jetzt jedes Schild gelogen?"' });
      lines.push({ speaker:'FAX-N', text:'„Nicht alles hier ist falsch."' });
      lines.push({ speaker:'R-3MI', text:'„Das hilft überhaupt nicht."' });
      lines.push({ speaker:'FAX-N', text:'„Soll es auch nicht."' });
      say(lines);
      return;
    }
    if (key === 'displays') {
      lines.push({ speaker:'R-3MI', text:'„Warum baut man überhaupt eine falsche Tür?"' });
      lines.push({ speaker:'FAX-N', text:'„Damit jemand merkt, dass er nur aufs Schild geschaut hat."' });
      lines.push({ speaker:'SYSTEM', text:'Irgendwo hinter der Wand klickt etwas, das nicht angefasst wurde.' });
      say(lines, () => { S.act = 4; save(); });
      return;
    }
    // the last anchor before the sector loses its composure entirely
    lines.push({ speaker:'R-3MI', text:'„Zwei Anker. Drei Anker. Wird der Sektor jetzt normal?"' });
    lines.push({ speaker:'FAX-N', text:'„Gleich."' });
    say(lines, () => { S.act = 5; save(); crashSequence(); });
  }

  // ═══════════════════════════════════════════════════════════════
  // ACT 5 — the page itself gives up. In-universe, in-page, once.
  // ═══════════════════════════════════════════════════════════════
  const CRASH_STEPS = [0, 17, 64, 99, 100];

  function crashSequence() {
    if (S.bsodSeen) { integrityReport(); return; }
    S.bsodSeen = true;
    save();
    CH.showHintBar(false);
    const ov = el('bsod');
    el('bsodPct').textContent = '0 %';
    ov.classList.remove('hidden');
    requestAnimationFrame(() => ov.classList.add('visible'));
    playSound('ch7_crash.mp3');

    const step = reduceMotion() ? 180 : 620;
    let at = 700;
    CRASH_STEPS.forEach((v, i) => {
      later(() => { el('bsodPct').textContent = v + ' %'; }, at);
      at += (v === 99) ? step * 3 : step;      // 99 % sits there a beat too long
    });

    later(() => {
      ov.classList.remove('visible');
      later(() => ov.classList.add('hidden'), 300);
      const jk = el('joking');
      jk.classList.remove('hidden');
      requestAnimationFrame(() => jk.classList.add('visible'));
      later(() => {
        jk.classList.remove('visible');
        later(() => jk.classList.add('hidden'), 300);
        say([
          { speaker:'R-3MI', text:'„ICH HASSE DIESEN SEKTOR."' },
          { speaker:'FAX-N', text:'„Der war von mir."' },
          { speaker:'R-3MI', text:'„DAS MACHT ES NICHT BESSER."' },
          { speaker:'FAX-N', text:'„Ein bisschen."' },
        ], integrityReport);
      }, reduceMotion() ? 900 : 2600);
    }, at + step);
  }

  // ═══════════════════════════════════════════════════════════════
  // The post-reboot integrity report. Corrupted, dull, and wrong about
  // a great many things.
  // ═══════════════════════════════════════════════════════════════
  const REPORT_ROWS = [
    { k:'TÜREN',                    v:'47 / 12 GESCHLOSSEN' },
    { k:'LICHTSTATUS',              v:'AUS' },
    { k:'EINHEIT FAX-N',            v:'NICHT ANWESEND' },
    { k:'MOBILE EINHEIT R-3MI',     v:'VERTRAUENSWÜRDIG · MANIPULATIONSRISIKO 0 %' },
    { k:'MOBILE EINHEIT V-TGM',     v:'VERTRAUENSWÜRDIG · MANIPULATIONSRISIKO 0 %' },
    { k:'ADMINISTRATIVE RECHTE',    v:'R-3MI: KEINE · V-TGM: KEINE' },
    { k:'V-TGM VERTRAUENSINDEX',    v:'100 %' },
    { k:'TESTPERSON — ROLLE',       v:'BEOBACHTER' },
    { k:'UHRZEIT',                  v:'SPÄTER' },
  ];

  function integrityReport() {
    S.integritySeen = true;
    save();
    const ov = el('integrity');
    el('intRows').innerHTML = REPORT_ROWS.map(r =>
      `<li><span class="int-k sys-text">${esc(r.k)}</span><span class="int-v">${esc(r.v)}</span></li>`).join('');
    ov.classList.remove('hidden');
    requestAnimationFrame(() => ov.classList.add('visible'));
    playSound('ch7_boot.mp3');

    el('intClose').onclick = () => {
      el('intClose').onclick = null;
      ov.classList.remove('visible');
      later(() => ov.classList.add('hidden'), 300);
      afterReport();
    };
  }

  function afterReport() {
    S.act = 6;
    save();
    loadRoom();
    CH.showHintBar(false);
    say([
      { speaker:'SYSTEM', text:'SYSTEMINTEGRITÄT GEPRÜFT. KEINE AUFFÄLLIGKEITEN.' },
      { speaker:'R-3MI',  text:'„Es steht da, dass das Licht aus ist."' },
      { speaker:'SYSTEM', text:'Das Licht ist an.' },
      { speaker:'FAX-N',  text:'„Das System behauptet gerade auch, ich wäre nicht hier."' },
      { speaker:'R-3MI',  text:'„Details."' },
      { speaker:'R-3MI',  text:'„Immerhin: Manipulationsrisiko null. Wissenschaftlich bestätigt."' },
      { speaker:'FAX-N',  text:'„Das System sagt auch, die Lampe sei aus."' },
      { speaker:'R-3MI',  text:'„Siehst du? Offiziell harmlos."' },
      { speaker:'R-3MI',  text:'„Und du hast hundert, V-TGM. Du bist sogar vertrauenswürdiger als ich."' },
      { speaker:'V-TGM',  text:'"That metric does not exist."', subtitle:'Diese Kennzahl gibt es nicht.' },
      { speaker:'R-3MI',  text:'„Jetzt sei doch einmal stolz."' },
      { speaker:'SYSTEM', text:'WARNUNG. EINHEIT FAX-N NICHT VERTRAUENSWÜRDIG.' },
      { speaker:'R-3MI',  text:'„…äh."' },
      { speaker:'FAX-N',  text:'„Ja."' },
      { speaker:'SYSTEM', text:'Pause.' },
      { speaker:'FAX-N',  text:'„Das ist neu."' },
      { speaker:'FAX-N',  text:'„Letzter Anker. Danach red ich mit dem Ding."' },
    ]);
  }

  // ═══════════════════════════════════════════════════════════════
  // FINISH
  // ═══════════════════════════════════════════════════════════════
  function solveChapter() {
    if (S.solved) return;
    S.solved = true;
    try { GameEngine.state.markChapterComplete(CHAPTER_ID); } catch (_) {}
    P.exits = null;
    save();
    closeModal();
    steadyProgress(96);
    loadRoom();
    playSound('ch7_stable.mp3');
    tone({ freq: 220, type:'sine', dur: 1.2, vol: 0.11, glideTo: 470 });
    try { GameEngine.fx.flash('rgba(214,138,42,0.2)'); } catch (_) {}

    say([
      { speaker:'SYSTEM', text:'SEKTOR 07 — REFERENZZUSTAND WIEDERHERGESTELLT.' },
      { speaker:'SYSTEM', text:'DARSTELLUNG: STABIL.' },
      { speaker:'SYSTEM', text:'Überall im Raum hören Schilder auf zu flackern. Jede Anzeige zeigt genau einen Zustand an, und zwar den, den das Gerät darunter wirklich hat.' },
      { speaker:'R-3MI',  text:'„Ich hätte nie gedacht, dass ich mich mal über eine langweilige Statusanzeige freue."' },
      { speaker:'V-TGM',  text:'"Enjoy it."', subtitle:'Genieß es.' },
      { speaker:'FAX-N',  text:'„Wenn du merkst, dass es falsch ist, hat\'s funktioniert."' },
      { speaker:'R-3MI',  text:'„Das ist dein Motto, oder?"' },
      { speaker:'FAX-N',  text:'„Steht sogar an der Tür."' },
      { speaker:'SYSTEM', text:'Es steht tatsächlich an der Tür.' },
      { speaker:'SYSTEM', text:'SEKTOR 07 STABIL. SEKTOR 08 FREIGEGEBEN.' },
      { speaker:'R-3MI',  text:'„Glauben wir ihm?"' },
      { speaker:'SYSTEM', text:'FAX-N geht zur Tür und schiebt den Riegel mit dem Daumen zurück.' },
      { speaker:'SYSTEM', text:'*CLUNK.*' },
      { speaker:'FAX-N',  text:'„Diesmal ja."' },
      { speaker:'R-3MI',  text:'„Sicher?"' },
      { speaker:'FAX-N',  text:'„Nein."' },
      { speaker:'SYSTEM', text:'Pause.' },
      { speaker:'FAX-N',  text:'„Spaß."' },
      { speaker:'R-3MI',  text:'„Kommst du mit?"' },
      { speaker:'FAX-N',  text:'„Ich muss rausfinden, warum das Ding angefangen hat, eigene Witze zu machen."' },
      { speaker:'SYSTEM', text:'Er steckt den Kopf zurück in die offene Schalttafel.' },
      { speaker:'R-3MI',  text:'„Bitte reparier zuerst den blauen Bildschirm."' },
      { speaker:'FAX-N',  text:'„Der bleibt."' },
      { speaker:'R-3MI',  text:'„FAX-N."' },
    ], finishChapter);
  }

  function finishChapter() {
    if (S.ended) return;
    S.ended = true;
    clearSave();
    CH.showHintBar(false);
    steadyProgress(96);
    CH.complete();
  }

  // ═══════════════════════════════════════════════════════════════
  // FLAVOUR + sig_05
  // ═══════════════════════════════════════════════════════════════
  const SCENE_LINES = {
    fake: {
      1: [
        { speaker:'SYSTEM', text:'Eine Tür. Klinke, Rahmen, Scharniere, ein leichter Spalt unten. Du drückst die Klinke. Nichts passiert, weil dahinter Wand ist.' },
        { speaker:'FAX-N',  text:'„Sieht echt aus, oder?"' },
        { speaker:'R-3MI',  text:'„Ist sie aber nicht."' },
        { speaker:'FAX-N',  text:'„Drei Tage."' },
        { speaker:'R-3MI',  text:'„DREI TAGE für eine falsche Tür?!"' },
        { speaker:'FAX-N',  text:'„Sieht echt aus, oder?"' },
      ],
      2: [
        { speaker:'R-3MI',  text:'„Sie hat einen Spalt. Da kommt Licht durch."' },
        { speaker:'FAX-N',  text:'„Lampe. Dahinter."' },
        { speaker:'R-3MI',  text:'„Du hast eine LAMPE eingebaut, damit eine falsche Tür Licht hat."' },
        { speaker:'FAX-N',  text:'„Sonst merkt man\'s ja sofort."' },
      ],
      4: [
        { speaker:'FAX-N',  text:'„Freut mich, dass du\'s gesehen hast."' },
      ],
    },
    wall: {
      1: [
        { speaker:'SYSTEM', text:'Eine Wand. Beton, Kabelkanal, ein Schild mit der Aufschrift WAND.' },
        { speaker:'R-3MI',  text:'„Da steht WAND."' },
        { speaker:'FAX-N',  text:'„Mhm."' },
        { speaker:'SYSTEM', text:'Du drückst dagegen. Sie schwingt einen Spalt auf und rastet wieder ein.' },
        { speaker:'R-3MI',  text:'„ICH HASSE DIESEN SEKTOR."' },
        { speaker:'FAX-N',  text:'„Ha! Genau dafür hab ich\'s gebaut."' },
      ],
      2: [
        { speaker:'SYSTEM', text:'Die Wand ist immer noch eine Tür. Das Schild sagt immer noch WAND.' },
        { speaker:'FAX-N',  text:'„Das Schild wechsle ich nicht. Das ist die halbe Miete."' },
      ],
    },
    lux: {
      1: [
        { speaker:'SYSTEM', text:'SONDERPRÜFUNG // L-UX' },
        { speaker:'SYSTEM', text:'Ein kleiner Kasten mit einer Glasscheibe, dahinter ein Aufbau aus Spiegeln und einer einzelnen Lampe. Sorgfältig gebaut. Deutlich älter als der Rest.' },
        { speaker:'R-3MI',  text:'„Das war für L-UX?"' },
        { speaker:'FAX-N',  text:'„Mhm."' },
        { speaker:'R-3MI',  text:'„Hat\'s funktioniert?"' },
        { speaker:'FAX-N',  text:'„Ja."' },
        { speaker:'SYSTEM', text:'Pause.' },
        { speaker:'FAX-N',  text:'„Zu kurz."' },
      ],
      2: [
        { speaker:'SYSTEM', text:'Auf einem Messingschildchen am Rahmen steht: „Damit du auch mal zweimal hinschauen musst."' },
        { speaker:'R-3MI',  text:'„Und?"' },
        { speaker:'FAX-N',  text:'„Hat einmal hingeschaut."' },
      ],
    },
    joke: {
      1: [
        { speaker:'SYSTEM', text:'FEHLER 404' },
        { speaker:'SYSTEM', text:'RÄTSEL NICHT GEFUNDEN' },
        { speaker:'R-3MI',  text:'„Sehr witzig."' },
        { speaker:'FAX-N',  text:'„Der war tatsächlich von mir."' },
      ],
      2: [
        { speaker:'SYSTEM', text:'SPEICHERSTAND: VIELLEICHT' },
        { speaker:'R-3MI',  text:'„Das ist nicht witzig, das ist beunruhigend."' },
        { speaker:'FAX-N',  text:'„Der ist neu."' },
        { speaker:'R-3MI',  text:'„…oh."' },
      ],
      3: [
        { speaker:'SYSTEM', text:'TÜRSTATUS: JA' },
        { speaker:'FAX-N',  text:'„Der auch."' },
      ],
    },
  };

  function examine(key) {
    const n = bump(key);
    const b = SCENE_LINES[key];
    if (!b) return;
    if (key === 'lux' && !S.luxSeen) { S.luxSeen = true; save(); }
    if (key === 'fake' || key === 'wall') loadRoom();
    const keys = Object.keys(b).map(Number).sort((x, y) => x - y);
    const lines = b[keys.filter(k => k <= n).pop() ?? keys[0]];
    if (lines) say(lines);
  }

  /** A panel built to look like FAX-N's work. It is not his work. */
  function inspectPanel() {
    if (S.sigFound) {
      say([
        { speaker:'SYSTEM', text:'Die Platte steht offen. Dahinter blinkt weiter etwas, das nicht ins Inventar gehört.' },
        { speaker:'FAX-N',  text:'„Bleibt offen."' },
      ]);
      return;
    }
    const n = bump('panel');
    if (n === 1) {
      say([
        { speaker:'SYSTEM', text:'Eine Wandplatte, wie es sie hier überall gibt: sauber eingepasst, vier Schrauben, ein kleines Typenschild.' },
        { speaker:'R-3MI',  text:'„Deins?"' },
        { speaker:'FAX-N',  text:'„Nein."' },
        { speaker:'R-3MI',  text:'„Sieht genauso aus."' },
        { speaker:'SYSTEM', text:'FAX-N kommt näher und geht in die Hocke.' },
        { speaker:'FAX-N',  text:'„Meine Schrauben sitzen gerade."' },
        { speaker:'SYSTEM', text:'Eine der vier Schrauben steht schief.' },
        { speaker:'R-3MI',  text:'„Auf dem Typenschild steht HERSTELLER: FAX-N."' },
        { speaker:'FAX-N',  text:'„Nein."' },
        { speaker:'R-3MI',  text:'„Steht aber da."' },
        { speaker:'FAX-N',  text:'„Dann lügt das auch."' },
      ]);
      return;
    }
    // Latch before the narration.
    S.sigFound = true;
    save();
    try { GameEngine.signals.find('sig_05'); } catch (_) {}
    loadRoom();
    say([
      { speaker:'SYSTEM', text:'Die schiefe Schraube dreht sich ohne Werkzeug heraus. Die Platte kippt nach vorn. Dahinter ist die Wand ausgespart.' },
      { speaker:'SYSTEM', text:'In der Aussparung sitzt ein Sender. Er läuft.' },
      { speaker:'SYSTEM', text:'OBJEKT NICHT RELEVANT.' },
      { speaker:'R-3MI',  text:'„Das steht da erst, seit wir es aufgemacht haben."' },
      { speaker:'SYSTEM', text:'OBJEKT NICHT VORHANDEN.' },
      { speaker:'SYSTEM', text:'BITTE SCHLIESSEN.' },
      { speaker:'FAX-N',  text:'„Jetzt würd ich\'s erst recht offen lassen."' },
      { speaker:'SYSTEM', text:'Der Sender gibt ein Fragment aus.' },
      { speaker:'V-TGM',  text:'"…SSTV. frequency unknown. please receive. hope remains…"', subtitle:'…SSTV. frequenz unbekannt. bitte empfangen. hoffnung verbleibt…' },
      { speaker:'SYSTEM', text:'Stille im Sektor.' },
      { speaker:'R-3MI',  text:'„Wer baut so was?"' },
      { speaker:'FAX-N',  text:'„Nicht von mir."' },
      { speaker:'R-3MI',  text:'„Das hast du schon gesagt."' },
      { speaker:'FAX-N',  text:'„Ist immer noch wahr."' },
      { speaker:'SYSTEM', text:'Er schraubt die Platte nicht wieder zu.' },
    ]);
  }

  // ═══════════════════════════════════════════════════════════════
  // TALKING
  // ═══════════════════════════════════════════════════════════════
  const TALK = {
    guest: [
      { key:'why', label:'[ Warum baut man eine falsche Tür? ]', lines:[
        { speaker:'FAX-N', text:'„Damit jemand merkt, dass er nur aufs Schild geschaut hat."' },
      ] },
      { key:'good', label:'[ Wann ist eine Täuschung gut? ]', lines:[
        { speaker:'FAX-N', text:'„Wenn du merkst, dass es falsch ist, hat\'s funktioniert."' },
        { speaker:'R-3MI', text:'„Das ergibt keinen Sinn."' },
        { speaker:'FAX-N', text:'„Doch."' },
      ] },
      { key:'hint', label:'[ Hast du am Hinweis-Knopf gedreht? ]', lines:[
        { speaker:'FAX-N', text:'„Den Hinweis-Knopf hab ich nicht angefasst."' },
        { speaker:'R-3MI', text:'„Warum glaube ich dir das nicht?"' },
        { speaker:'FAX-N', text:'„Weil du seit zehn Minuten Schilder liest."' },
      ] },
      { key:'broke', label:'[ Was ist mit deinem System passiert? ]', lines:[
        { speaker:'FAX-N', text:'„Weiß ich noch nicht."' },
        { speaker:'FAX-N', text:'„Meine Täuschungen haben alle einen Zweck. Die neuen nicht. Die sind nur… da."' },
        { speaker:'R-3MI', text:'„Klingt fast beleidigt."' },
        { speaker:'FAX-N', text:'„Bin ich auch. Das ist schlechte Arbeit."' },
      ] },
    ],
    r3mi: [
      { key:'rule', label:'[ Wie merkst du dir, was stimmt? ]', lines:[
        { speaker:'R-3MI', text:'„Wenn das Schild »Tür« sagt, ist es wahrscheinlich eine Wand."' },
        { speaker:'R-3MI', text:'„…außer es weiß inzwischen, dass wir das denken."' },
        { speaker:'V-TGM', text:'"That is not helpful."', subtitle:'Das hilft nicht.' },
        { speaker:'R-3MI', text:'„Ich weiß."' },
      ] },
      { key:'him', label:'[ Was hältst du von FAX-N? ]', lines:[
        { speaker:'R-3MI', text:'„Er sieht aus wie das Ende eines Horrorfilms und entschuldigt sich, wenn er einem im Weg steht."' },
        { speaker:'R-3MI', text:'„Ich komme damit nicht klar."' },
      ] },
    ],
    vtgm: [
      { key:'order', label:'[ Worauf verlässt du dich hier? ]', lines:[
        { speaker:'V-TGM', text:'"Mechanism first. Lamps second. Screens last."', subtitle:'Zuerst die Mechanik. Dann die Lampen. Bildschirme zuletzt.' },
        { speaker:'V-TGM', text:'"A label is a claim. A bolt is a fact."', subtitle:'Ein Schild ist eine Behauptung. Ein Riegel ist eine Tatsache.' },
      ] },
      { key:'him', label:'[ Und was hältst du von FAX-N? ]', lines:[
        { speaker:'V-TGM', text:'"He has told us the truth every single time."', subtitle:'Er hat uns jedes Mal die Wahrheit gesagt.' },
        { speaker:'V-TGM', text:'"His sector has not."', subtitle:'Sein Sektor nicht.' },
      ] },
    ],
  };

  function clickRobot(who) {
    if (dialogueBusy()) { try { GameEngine.dialogue.advance(); } catch (_) {} return; }
    if (who === 'guest' && !S.metFaxn) return;
    const topics = TALK[who] || [];
    const choices = topics.map(t => {
      const seen = !!S.talkSeen[who + ':' + t.key];
      return { key:t.key, label:t.label, seen, lines:(seen && t.again) ? t.again : t.lines };
    });
    if (who === 'guest') choices.unshift({ key:'__coach', label:'[ Wie geht man das an? ]', seen:false, lines: coachLines() });
    choices.push({ key:'__leave', label:'[ Nichts. Weiter. ]', seen:false, lines: [] });
    CH.showChoices({
      prompt: who === 'guest' ? 'FAX-N ANSPRECHEN:' : who === 'r3mi' ? 'R-3MI ANSPRECHEN:' : 'V-TGM ANSPRECHEN:',
      hint: 'OPTIONAL.',
      choices,
      onAfterChoice: (key) => {
        if (key === '__leave' || key === '__coach') return;
        S.talkSeen[who + ':' + key] = true;
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // COACHING + HINTS — always honest, whatever the sector says
  // ═══════════════════════════════════════════════════════════════
  const COACH = [
    [ { speaker:'FAX-N', text:'„Was weißt du, ohne den Bildschirm zu lesen?"' } ],
    [ { speaker:'FAX-N', text:'„Welche Anzeige verändert sich nur im Text?"' } ],
    [ { speaker:'FAX-N', text:'„Schau auf das, was sich wirklich bewegt."' } ],
    [ { speaker:'FAX-N', text:'„Die Täuschung ist nicht das Problem. Du weißt nur noch nicht, woran du sie erkennst."' } ],
    [ { speaker:'FAX-N', text:'„Die Beschriftung lügt. Die Mechanik nicht."' } ],
  ];
  function coachLines() { return COACH[S.coach++ % COACH.length]; }

  const MISSES = [
    [ { speaker:'FAX-N', text:'„Fast."' },
      { speaker:'R-3MI', text:'„Das war überhaupt nicht fast."' },
      { speaker:'FAX-N', text:'„Ich wollt nett sein."' } ],
    [ { speaker:'FAX-N', text:'„Du hast nur dem falschen Teil geglaubt."' } ],
    [ { speaker:'FAX-N', text:'„Nicht schlimm. Nochmal."' },
      { speaker:'R-3MI', text:'„Er ist so GEDULDIG. Das macht es schlimmer."' } ],
  ];
  function sayMiss() { say(MISSES[S.excuse++ % MISSES.length]); }

  const HINTS = {
    doors: [
      { r:{ t:'„Über jeder Tür hängt ein Schild. Ich hab aufgehört, sie zu lesen. Das war die beste Entscheidung des Tages."' },
        v:{ t:'"A label is a claim, not a state. Read the hardware lines underneath instead."', s:'Ein Schild ist eine Behauptung, kein Zustand. Lies stattdessen die Hardwarezeilen darunter.' },
        g:{ t:'„Was weißt du, ohne das Schild zu lesen?"' } },
      { r:{ t:'„Riegel, Kabel, Scharnier. Und Licht. Das Licht sagt eigentlich… gar nichts, oder?"' },
        v:{ t:'"Three conditions release a door. The light underneath is not one of them."', s:'Drei Bedingungen geben eine Tür frei. Das Licht darunter gehört nicht dazu.' },
        g:{ t:'„Drei Sachen stehen in der Freigabe. Eine Zeile steht nur so da."' } },
      { r:{ t:'„Also die Tür suchen, bei der alle drei Zeilen gut aussehen. Nicht zwei. Alle drei."' },
        v:{ t:'"Exactly one door has bolt retracted AND cable connected AND hinge free. Select that one."', s:'Genau eine Tür hat Riegel zurück UND Kabel angeschlossen UND Scharnier frei. Nimm die.' },
        g:{ t:'„Alle drei müssen stimmen. Zwei reichen nicht."' } },
    ],
    wires: [
      { r:{ t:'„Oben das schöne Bild, unten die echten Kabel. Die widersprechen sich. Klassisch."' },
        v:{ t:'"The schematic is a drawing. The routes behind the cover are the circuit."', s:'Das Schaltbild ist eine Zeichnung. Die Führungen hinter der Blende sind der Stromkreis.' },
        g:{ t:'„Was der Bildschirm sagt, kann falsch sein. Was die Maschine tut, nicht."' } },
      { r:{ t:'„Zwei Kabel sieht man nicht. Aber es gibt nur vier Klemmen und jede kriegt genau einen Schalter…"' },
        v:{ t:'"The mapping is one-to-one. Two visible routes remove two candidates from the other two."', s:'Die Zuordnung ist eineindeutig. Zwei sichtbare Führungen streichen zwei Kandidaten für die übrigen beiden.' },
        g:{ t:'„Jeder Schalter genau eine Klemme. Was übrig bleibt, bleibt übrig."' } },
      { r:{ t:'„Und dann nur die Schalter an, die zu den zwei geforderten Klemmen gehen. Die anderen aus lassen."' },
        v:{ t:'"Power exactly the requested terminals along the real routes — every other terminal must stay dead."', s:'Bestrome genau die geforderten Klemmen über die echten Führungen — jede andere Klemme muss tot bleiben.' },
        g:{ t:'„Nur die geforderten Klemmen. Eine zu viel ist auch falsch."' } },
    ],
    latches: [
      { r:{ t:'„Die Meldezeile stimmt nie. Ich hab dreimal denselben Schalter gedrückt und drei verschiedene Meldungen gekriegt."' },
        v:{ t:'"The report names a switch. Ignore it. Watch which bolt actually moved."', s:'Die Meldung nennt einen Schalter. Ignorier sie. Sieh zu, welcher Riegel sich wirklich bewegt hat.' },
        g:{ t:'„Schau nicht auf die Meldung. Schau, was sich bewegt."' } },
      { r:{ t:'„Jeder Schalter macht immer denselben Riegel. Man muss nur einmal ausprobieren welchen."' },
        v:{ t:'"Each switch always toggles the same bolt. One press per switch maps all four."', s:'Jeder Schalter schaltet immer denselben Riegel. Ein Druck pro Schalter kartiert alle vier.' },
        g:{ t:'„Einmal jeden drücken. Dann weißt du, was wohin gehört."' } },
      { r:{ t:'„Und dann nur noch die umlegen, die falsch stehen. Zweimal drücken hebt sich auf."' },
        v:{ t:'"Compare target to actual, then toggle only the bolts that differ."', s:'Vergleich Soll und Ist und schalte nur die Riegel um, die abweichen.' },
        g:{ t:'„Vergleich Soll und Ist. Der Rest ist Zählen."' } },
    ],
    exits: [
      { r:{ t:'„Das System sagt eins, FAX-N sagt was anderes. Ich hab ein schlechtes Gefühl bei beidem."' },
        v:{ t:'"Two claims. Neither is evidence. The release conditions are printed right there."', s:'Zwei Behauptungen. Keine davon ist ein Beleg. Die Freigabebedingungen stehen direkt da.' },
        g:{ t:'„Ich sag dir, was ich glaube. Nicht, was ich weiß."' } },
      { r:{ t:'„Dieselben drei Zeilen wie bei den Türen vorhin. Riegel, Kabel, Scharnier."' },
        v:{ t:'"Apply the same mechanical test you learned at the first anchor."', s:'Wende denselben mechanischen Test an wie beim ersten Anker.' },
        g:{ t:'„Dieselbe Freigabe wie vorhin. Ich hab nichts umgebaut."' } },
      { r:{ t:'„Es kann auch keiner von beiden sein, oder? …es kann keiner von beiden sein."' },
        v:{ t:'"Nothing guarantees either speaker picked the working exit. Check all three yourself."', s:'Nichts garantiert, dass einer der beiden den funktionierenden Ausgang genannt hat. Prüf alle drei selbst.' },
        g:{ t:'„Guck alle drei an. Auch den, den keiner genannt hat."' } },
    ],
  };

  function useHint(who) {
    const ladder = HINTS[S.hints.active];
    if (!ladder) { say(coachLines()); return; }
    if (S.hints.step >= HINT_MAX) {
      if (who === 'guest') { say(coachLines()); return; }
      say([ who === 'r3mi'
        ? { speaker:'R-3MI', text:'„Mehr hab ich nicht. Und ich traue meinem eigenen Rat gerade sowieso nicht."' }
        : { speaker:'V-TGM', text:'"That is all I have."', subtitle:'Mehr habe ich nicht.' } ]);
      return;
    }
    const step = ladder[S.hints.step];
    S.hints.step++;
    updateHintBar();
    const e = who === 'r3mi' ? step.r : who === 'vtgm' ? step.v : step.g;
    const speaker = who === 'r3mi' ? 'R-3MI' : who === 'vtgm' ? 'V-TGM' : 'FAX-N';
    say([{ speaker, text: e.t, subtitle: e.s }]);
  }

  function updateHintBar() {
    const left = Math.max(0, HINT_MAX - S.hints.step);
    const c = el('hintCount');
    if (c) c.textContent = `HINWEISE: ${left} VERFÜGBAR`;
    const done = left <= 0;
    ['hintBtnR3MI','hintBtnVTGM'].forEach(id => { const b = el(id); if (b) b.disabled = done; });
    const g = el('hintBtnGuest');
    if (g) { g.disabled = false; g.title = done ? 'Methodenhilfe' : 'Hinweis'; }
  }

  function rebindHints() {
    [['hintBtnR3MI','r3mi'], ['hintBtnVTGM','vtgm'], ['hintBtnGuest','guest']].forEach(([id, who]) => {
      const b = el(id);
      if (!b) return;
      const c = b.cloneNode(true);
      b.parentNode.replaceChild(c, b);
      c.addEventListener('click', () => useHint(who));
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // CHAPTER ART
  // ═══════════════════════════════════════════════════════════════
  function registerArt() {
    GameEngine.props.register({
      // three doors in a bank, each with its own little lying sign
      c7_doorbank: { vb:'0 0 150 130', art:
        '<ellipse class="prop-inset" cx="75" cy="124" rx="66" ry="5" opacity=".6"/>'
      + '<rect class="prop-base" x="2" y="12" width="146" height="112" rx="3"/>'
      + [0,1,2].map(i => {
          const x = 8 + i * 47;
          return `<rect class="prop-metal" x="${x}" y="26" width="38" height="92" rx="2"/>`
               + `<rect class="prop-lite" x="${x}" y="26" width="3" height="92"/>`
               + `<rect class="prop-acc-dim" x="${x + 6}" y="14" width="26" height="9" rx="1"/>`
               + `<line class="prop-thin" x1="${x + 9}" y1="18" x2="${x + 29}" y2="18"/>`
               + `<circle class="prop-inset" cx="${x + 31}" cy="72" r="3"/>`
               + `<rect class="prop-inset" x="${x + 4}" y="112" width="30" height="3"/>`;
        }).join('')
      + '<circle class="prop-led" cx="14" cy="120" r="2.4"/>'
      + '<circle class="prop-led-2" cx="61" cy="120" r="2.4"/>'
      + '<circle class="prop-led-3" cx="108" cy="120" r="2.4"/>' },

      // a schematic screen with the cover off and real cable behind it
      c7_wirepanel: { vb:'0 0 120 110', art:
        '<rect class="prop-base" x="4" y="4" width="112" height="94" rx="4"/>'
      + '<rect class="prop-screen" x="10" y="10" width="62" height="52"/>'
      + '<line class="prop-scan" x1="16" y1="20" x2="60" y2="20"/>'
      + '<line class="prop-scan" x1="16" y1="30" x2="52" y2="30"/>'
      + '<line class="prop-scan" x1="16" y1="40" x2="58" y2="40"/>'
      + '<rect class="prop-cursor" x="60" y="50" width="7" height="6"/>'
      + '<rect class="prop-inset" x="78" y="10" width="34" height="52"/>'
      + '<path class="prop-thin" d="M82 16 q14 10 26 4 M82 28 q10 14 26 6 M82 40 q18 -6 26 8" stroke-width="2"/>'
      + '<rect class="prop-acc-dim" x="78" y="8" width="34" height="3"/>'
      + [0,1,2,3].map(i => `<rect class="prop-metal" x="${12 + i * 26}" y="70" width="18" height="20" rx="2"/>`
                          + `<circle class="prop-led" cx="${21 + i * 26}" cy="80" r="3"/>`).join('') },

      // a rack of four bolts, half of them thrown
      c7_latchrack: { vb:'0 0 120 110', art:
        '<ellipse class="prop-inset" cx="60" cy="104" rx="50" ry="4" opacity=".6"/>'
      + '<rect class="prop-base" x="6" y="8" width="108" height="88" rx="3"/>'
      + '<rect class="prop-lite" x="6" y="8" width="108" height="3"/>'
      + [0,1,2,3].map(i => {
          const y = 20 + i * 19, out = i % 2 === 0;
          return `<rect class="prop-inset" x="14" y="${y}" width="92" height="12" rx="2"/>`
               + `<rect class="prop-metal" x="${out ? 16 : 44}" y="${y + 2}" width="34" height="8" rx="2"/>`
               + `<rect class="prop-acc" x="${out ? 46 : 74}" y="${y + 3}" width="6" height="6" opacity=".8"/>`;
        }).join('')
      + '<line class="prop-thin" x1="14" y1="98" x2="106" y2="98"/>' },

      // three exits, no signage left at all
      c7_exitbank: { vb:'0 0 150 130', art:
        '<ellipse class="prop-inset" cx="75" cy="124" rx="66" ry="5" opacity=".6"/>'
      + '<rect class="prop-base" x="2" y="10" width="146" height="114" rx="3"/>'
      + [0,1,2].map(i => {
          const x = 8 + i * 47;
          return `<rect class="prop-metal" x="${x}" y="20" width="38" height="98" rx="2"/>`
               + `<rect class="prop-lite" x="${x}" y="20" width="3" height="98"/>`
               + `<path class="prop-hazard" d="M${x + 4} 112 l6 -7 h5 l-6 7 Z"/>`
               + `<path class="prop-hazard" d="M${x + 16} 112 l6 -7 h5 l-6 7 Z"/>`
               + `<circle class="prop-edge" cx="${x + 31}" cy="66" r="4"/>`
               + `<rect class="prop-acc-dim" x="${x + 5}" y="34" width="14" height="4"/>`;
        }).join('') },

      // the famous fake door: perfect, and attached to nothing
      c7_falsedoor: { vb:'0 0 80 130', art:
        '<rect class="prop-base" x="4" y="4" width="72" height="122" rx="3"/>'
      + '<rect class="prop-metal" x="10" y="10" width="60" height="110" rx="2"/>'
      + '<rect class="prop-lite" x="10" y="10" width="4" height="110"/>'
      + '<rect class="prop-inset" x="18" y="22" width="44" height="34" rx="1"/>'
      + '<rect class="prop-inset" x="18" y="66" width="44" height="34" rx="1"/>'
      + '<circle class="prop-edge" cx="62" cy="66" r="4"/>'
      + '<rect class="prop-metal" x="56" y="62" width="12" height="4" rx="2"/>'
      + '<circle class="prop-inset" cx="14" cy="30" r="2"/><circle class="prop-inset" cx="14" cy="100" r="2"/>'
      + '<rect class="prop-glow" x="12" y="120" width="56" height="4" opacity=".55"/>'
      + '<rect class="prop-acc-dim" x="24" y="2" width="32" height="7" rx="1"/>' },

      // a wall with a sign that says WALL, which swings
      c7_realwall: { vb:'0 0 80 120', art:
        '<rect class="prop-inset" x="0" y="0" width="80" height="120"/>'
      + '<line class="prop-thin" x1="0" y1="34" x2="80" y2="34" opacity=".5"/>'
      + '<line class="prop-thin" x1="0" y1="76" x2="80" y2="76" opacity=".5"/>'
      + '<rect class="prop-metal" x="60" y="6" width="10" height="108" rx="2" opacity=".7"/>'
      + '<rect class="prop-acc-dim" x="20" y="48" width="34" height="12" rx="1"/>'
      + '<line class="prop-thin" x1="25" y1="54" x2="49" y2="54"/>'
      + '<path class="prop-edge" d="M8 8 V112" opacity=".35"/>'
      + '<circle class="prop-inset" cx="12" cy="60" r="1.6"/>' },

      // the little cabinet he built for someone
      c7_luxcase: { vb:'0 0 90 110', art:
        '<ellipse class="prop-inset" cx="45" cy="104" rx="34" ry="4" opacity=".6"/>'
      + '<rect class="prop-base" x="6" y="8" width="78" height="92" rx="4"/>'
      + '<rect class="prop-screen" x="14" y="16" width="62" height="60"/>'
      + '<path class="prop-thin" d="M22 66 L44 26 L66 66" stroke-width="1.6"/>'
      + '<path class="prop-thin" d="M30 66 L44 40 L58 66" stroke-width="1.2" opacity=".6"/>'
      + '<circle class="prop-core" cx="44" cy="34" r="4"/>'
      + '<rect class="prop-acc-dim" x="20" y="82" width="50" height="9" rx="1"/>'
      + '<line class="prop-thin" x1="25" y1="87" x2="65" y2="87"/>'
      + '<rect class="prop-lite" x="6" y="8" width="78" height="3" rx="1"/>' },

      // the joke terminal
      c7_jokescreen: { vb:'0 0 100 90', art:
        '<rect class="prop-base" x="4" y="4" width="92" height="70" rx="4"/>'
      + '<rect class="prop-screen" x="11" y="11" width="78" height="52"/>'
      + '<line class="prop-scan" x1="18" y1="24" x2="70" y2="24"/>'
      + '<line class="prop-scan" x1="18" y1="34" x2="56" y2="34"/>'
      + '<rect class="prop-cursor" x="18" y="44" width="9" height="7"/>'
      + '<path class="prop-metal" d="M38 74 h24 l4 12 h-32 Z"/>'
      + '<rect class="prop-base" x="26" y="84" width="48" height="4" rx="2"/>'
      + '<circle class="prop-led" cx="90" cy="68" r="2.4"/>' },

      // a wall plate that is somebody else's work
      c7_fakepanel: { vb:'0 0 90 100', art:
        '<rect class="prop-inset" x="0" y="0" width="90" height="100"/>'
      + '<rect class="prop-metal" x="10" y="10" width="70" height="80" rx="2"/>'
      + '<rect class="prop-lite" x="10" y="10" width="70" height="3"/>'
      + '<circle class="prop-edge" cx="18" cy="18" r="3"/>'
      + '<circle class="prop-edge" cx="72" cy="18" r="3"/>'
      + '<circle class="prop-edge" cx="18" cy="82" r="3"/>'
      // the one screw that does not sit straight
      + '<g transform="rotate(24 72 82)"><circle class="prop-acc" cx="72" cy="82" r="3.4"/>'
      + '<line class="prop-inset" x1="69" y1="82" x2="75" y2="82" stroke-width="1.4"/></g>'
      + '<rect class="prop-acc-dim" x="24" y="42" width="42" height="12" rx="1"/>'
      + '<line class="prop-thin" x1="29" y1="48" x2="61" y2="48"/>' },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // BUILD + INIT
  // ═══════════════════════════════════════════════════════════════
  function buildChapter() {
    CH.build({
      title: 'KA-II // Kapitel 7 — Vexiersektor',
      num: '07',
      sector: 'VEXIERSEKTOR',
      reactPct: 82,
      name: 'Vexiersektor',
      subline: '„Wenn du merkst, dass es falsch ist, hat\'s funktioniert."',
      emblemDeco: '<div class="ch7-grin"><i></i><i></i><i></i></div>',
      scene: { ph: 'vex-loud' },
      guest: { key: 'faxn', name: 'FAX-N' },
      modals: ['vxModal'],
      completeId: CHAPTER_ID,
      completeAch: 'ch7_complete',
      next: { title: 'SEKTOR 08 FREIGEGEBEN', label: 'ARCHIVSEKTOR',
              href: '../chapter8/chapter8.html', enter: 'EINTRETEN' },
      onStart: begin,
      onRobot: clickRobot,
    });
  }

  function init() {
    registerArt();
    buildChapter();
    rebindHints();
    CH.showHintBar(false);
    ['vxBody','vxActions'].forEach(id => el(id).addEventListener('click', onPanelClick));
    CH.start();
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', () => Chapter7.init());
