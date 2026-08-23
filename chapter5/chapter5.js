/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 05 — SEKTOR 05 // LANGSTRECKE
 * Guest: T-FLON14 — LANGSTRECKEN-WARTUNGSEINHEIT. A single fictional
 *        Anlage unit standing in for a shared maintenance identity:
 *        friendly, practical, unhurried, very good at continuing.
 *
 * EINE STATION NACH DER ANDEREN.
 *
 * The chapter is a JOURNEY, not a room with puzzles in it. Play is a
 * chain of route beats along an old maintenance artery — WARTUNGSROUTE 14
 * — and the route itself is the mechanic:
 *
 *   14-D  ABZWEIG       a fork. Both corridors reconnect; one is simply
 *                       obsolete. Choosing "wrong" buys scenery, not a
 *                       penalty.
 *   14-E  SCHALTGALERIE a wall of old controls. Poking at it is meant to
 *                       be fun; closing the forward line is the puzzle.
 *   14-F  TIEFSCHACHT   descent. Scale, echo, a rest. Deliberately not a
 *                       puzzle — the chapter has to breathe.
 *   14-G  VERSORGUNG    the crossing is broken. Work out what the
 *                       crossing actually needs, then walk across it.
 *   14-H  MARKIERUNG    by now the player knows what a ROUTE 14 plate
 *                       looks like. One of them does not follow the rule.
 *   14-I  STRECKENENDE  certify the line you just walked.
 *
 * Every station instance is generated at runtime. Progress is
 * checkpointed per beat, so a refresh resumes the journey instead of
 * restarting an hour of walking.
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter5 = (() => {
  'use strict';

  const CH         = GameEngine.chapter;
  const CHAPTER_ID = 'ch5';
  const SAVE_KEY   = 'ch5_progress';
  const HINT_MAX   = 3;              // one shared ladder per station

  const BEATS = ['intro', '14-D', '14-D-alt', '14-E', '14-F', '14-G', '14-H', '14-I', 'done'];

  const STATION_NAME = {
    '14-D': 'ABZWEIG', '14-E': 'SCHALTGALERIE', '14-F': 'TIEFSCHACHT',
    '14-G': 'VERSORGUNG', '14-H': 'ALTE MARKIERUNG', '14-I': 'STRECKENENDE',
  };

  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const S = {
    beat:      'intro',
    branch:    null,        // 'haupt' | 'alt'
    metTflon:  false,
    relay:     false,
    crossing:  false,
    marker:    false,
    sigFound:  false,
    restSeen:  false,
    gags:      {},
    webGags:   0,
    log:       [],
    ended:     false,
    seen:      {},          // examine counters for flavour hotspots
    talkSeen:  {},
    hints:     { active: null, step: 0 },
    coach:     0,
  };

  // live station instances — rebuilt on demand, cleared once solved
  const inst = { gallery: null, supply: null, marker: null, terminal: null };

  let openModal = null;
  let timers = [];
  let busy = false;

  function clearTimers() { timers.forEach(clearTimeout); timers = []; busy = false; }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  // ═══════════════════════════════════════════════════════════════
  // SMALL HELPERS
  // ═══════════════════════════════════════════════════════════════
  function el(id) { return document.getElementById(id); }
  function playSound(src) { try { GameEngine.audio.sfx(src); } catch (_) {} }
  function tone(o)        { try { GameEngine.audio.tone(o); } catch (_) {} }
  function say(lines, after) { GameEngine.dialogue.load(lines, after); }
  function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
  }
  function sameSet(a, b) { return a.size === b.size && [...a].every(v => b.has(v)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }
  function bump(key) { S.seen[key] = (S.seen[key] || 0) + 1; return S.seen[key]; }
  function reduceMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
  }

  function dialogueBusy() {
    const c = document.querySelector('.dlg-container');
    return !!(c && c.classList.contains('visible'));
  }

  /**
   * While dialogue runs, a tap in the scene advances it instead of starting a
   * new interaction. The dialogue box only covers the bottom strip and the
   * engine keeps a single completion callback, so a line started underneath it
   * would silently discard whatever the running dialogue was about to do.
   */
  function guarded(fn) {
    return (...args) => {
      if (dialogueBusy()) { try { GameEngine.dialogue.advance(); } catch (_) {} return; }
      return fn(...args);
    };
  }

  function addHotspot(cfg) {
    return CH.addHotspot({ ...cfg, fn: guarded(cfg.fn) });
  }

  // ═══════════════════════════════════════════════════════════════
  // CHECKPOINT — the route is long; a refresh must not cost the walk
  // ═══════════════════════════════════════════════════════════════
  function save() {
    try {
      GameEngine.state.set(SAVE_KEY, {
        beat: S.beat, branch: S.branch, metTflon: S.metTflon,
        relay: S.relay, crossing: S.crossing, marker: S.marker,
        sigFound: S.sigFound, restSeen: S.restSeen, webGags: S.webGags,
        gags: S.gags, log: S.log,
      });
    } catch (_) {}
  }
  function clearSave() { try { GameEngine.state.set(SAVE_KEY, null); } catch (_) {} }

  function loadCheckpoint() {
    let d = null;
    try { d = GameEngine.state.get(SAVE_KEY); } catch (_) { d = null; }
    // Fail closed: anything unrecognised starts the route from the top rather
    // than dropping the player into a state that cannot be reasoned about.
    if (!d || typeof d !== 'object') return null;
    if (typeof d.beat !== 'string' || BEATS.indexOf(d.beat) < 0) return null;
    if (d.beat === 'intro' || d.beat === 'done') return null;
    return d;
  }

  function applyCheckpoint(d) {
    S.branch   = (d.branch === 'haupt' || d.branch === 'alt') ? d.branch : null;
    S.metTflon = !!d.metTflon;
    S.relay    = !!d.relay;
    S.crossing = !!d.crossing;
    S.marker   = !!d.marker;
    S.sigFound = !!d.sigFound;
    S.restSeen = !!d.restSeen;
    S.webGags  = +d.webGags || 0;
    S.gags     = (d.gags && typeof d.gags === 'object') ? d.gags : {};
    S.log      = Array.isArray(d.log) ? d.log.filter(e => e && e.code && e.text) : [];
  }

  // ═══════════════════════════════════════════════════════════════
  // STRECKENPROTOKOLL
  // ═══════════════════════════════════════════════════════════════
  function logAdd(code, text) {
    if (S.log.some(e => e.code === code && e.text === text)) return;
    S.log.push({ code, text });
    renderLog();
    save();
    const t = el('logToggle');
    if (t) { t.classList.add('pulse'); setTimeout(() => t.classList.remove('pulse'), 1600); }
  }

  function renderLog() {
    const body = el('logBody');
    if (!body) return;
    body.innerHTML = S.log.length
      ? S.log.map(e => `<li><span class="lg-code sys-text">${esc(e.code)}</span><span class="lg-text">${esc(e.text)}</span></li>`).join('')
      : `<li class="lg-empty">NOCH KEINE EINTRÄGE.</li>`;
  }

  function toggleLog() {
    const p = el('logPanel');
    if (!p) return;
    const open = p.classList.toggle('open');
    el('logToggle')?.setAttribute('aria-expanded', open ? 'true' : 'false');
    // The panel opens over the bottom-left corner the toggle lives in, so the
    // toggle steps aside while it is open — the panel's own ✕ closes it.
    document.body.classList.toggle('log-open', open);
  }

  function setRouteTag() {
    const t = el('routeTag');
    if (!t) return;
    const st = STATION_NAME[S.beat] ? `${S.beat} · ${STATION_NAME[S.beat]}` :
               S.beat === '14-D-alt' ? '14-D · ALTE NEBENTRASSE' : 'ANFAHRT';
    t.textContent = `ROUTE 14 // ${st}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // TRAVEL
  // ═══════════════════════════════════════════════════════════════
  const LEG = {
    '14-E': { from: '14-D', to: '14-E', dist: 210 },
    '14-F': { from: '14-E', to: '14-F', dist: 430 },
    '14-G': { from: '14-F', to: '14-G', dist: 380 },
    '14-H': { from: '14-G', to: '14-H', dist: 260 },
    '14-I': { from: '14-H', to: '14-I', dist: 190 },
  };
  // distance is only shown on part of the route — constant readouts stop
  // selling scale and start reading as a HUD
  const SHOW_DIST = { '14-F': true, '14-G': true, '14-I': true };

  /**
   * Move to a beat with a short transition. The destination is latched BEFORE
   * the animation runs, so a refresh mid-transition resumes at the destination
   * rather than somewhere between two stations.
   */
  function travelTo(beat, opts) {
    opts = opts || {};
    if (openModal) closeModal();
    S.beat = beat;
    save();

    const leg = LEG[beat];
    const ov  = el('travelOverlay');
    if (!ov || !leg) { enterBeat(beat); return; }

    el('tvRoute').textContent = `ROUTE 14 // ${leg.from} → ${leg.to}`;
    el('tvDist').textContent  = (SHOW_DIST[beat] || opts.dist) ? `DISTANZ: ${leg.dist} m` : '';
    el('tvNote').textContent  = opts.note || '';

    const dur = reduceMotion() ? 260 : 1700;
    ov.classList.remove('hidden');
    requestAnimationFrame(() => ov.classList.add('visible'));
    playSound('ch5_walk.mp3');

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      ov.removeEventListener('click', finish);
      ov.classList.remove('visible');
      setTimeout(() => ov.classList.add('hidden'), 320);
      enterBeat(beat);
    };
    ov.addEventListener('click', finish);          // always skippable
    later(finish, dur);
  }

  // ═══════════════════════════════════════════════════════════════
  // BEAT ROUTER
  // ═══════════════════════════════════════════════════════════════
  function enterBeat(beat) {
    clearTimers();
    S.beat = beat;
    save();
    setRouteTag();
    const fn = {
      'intro':    enterIntro,
      '14-D':     enterFork,
      '14-D-alt': enterOldPassage,
      '14-E':     enterGallery,
      '14-F':     enterShaft,
      '14-G':     enterSupply,
      '14-H':     enterMarker,
      '14-I':     enterTerminal,
    }[beat];
    if (fn) fn();
  }

  function beginOrResume() {
    if (GameEngine.progress.isRevisit(CHAPTER_ID)) { nachsuche(); return; }
    const d = loadCheckpoint();
    if (d) {
      applyCheckpoint(d);
      renderLog();
      CH.showRobots(true);
      CH.showGuest(S.metTflon);
      enterBeat(d.beat);
      say([
        { speaker:'SYSTEM', text:`WARTUNGSROUTE 14 // ABSCHNITT ${d.beat === '14-D-alt' ? '14-D' : d.beat}. PROTOKOLL WIEDERHERGESTELLT.` },
        { speaker:'R-3MI',  text:'„Wo waren wir?"' },
        ...(S.metTflon
          ? [{ speaker:'T-FLON14', text:'„Hier."' }, { speaker:'R-3MI', text:'„Danke."' }]
          : [{ speaker:'V-TGM', text:'"Here."', subtitle:'Hier.' }]),
      ]);
      return;
    }
    S.beat = 'intro';
    enterBeat('intro');
  }

  // Walking the route again after it is synchronised. The chapter drops the
  // player at the one section that still had something to find, with the
  // plates already sorted out — there is nothing left to work out here.
  function nachsuche() {
    S.metTflon = true;
    S.branch = 'haupt';
    S.relay = true;
    S.crossing = true;
    S.marker = true;
    S.restSeen = true;
    try { S.sigFound = GameEngine.signals.isFound('sig_03'); } catch (_) {}
    renderLog();
    CH.showRobots(true);
    CH.showGuest(true);
    enterBeat('14-H');
    GameEngine.progress.returnBar(CHAPTER_ID);
  }

  // ═══════════════════════════════════════════════════════════════
  // ROUTE MARKER PLATES
  // The chapter teaches this grammar by repetition long before 14-H asks
  // the player to spot a plate that does not follow it.
  // ═══════════════════════════════════════════════════════════════
  function plateHTML(p, extra) {
    const bolts = Array.from({ length: p.bolts }, (_, i) => `<i class="mk-bolt b${i}"></i>`).join('');
    return `<div class="mk-plate ${p.border === 'single' ? 'mk-single' : ''} ${p.notch ? '' : 'mk-nonotch'} ${extra || ''}">
        ${bolts}
        <span class="mk-code sys-text">${esc(p.code)}</span>
        <span class="mk-arrow">${esc(p.arrow)}</span>
      </div>`;
  }
  function normPlate(letter) {
    return { letter, code: '14-' + letter, bolts: 4, arrow: '▸', notch: true, border: 'double' };
  }

  // ═══════════════════════════════════════════════════════════════
  // 0 — ANFAHRT.  Nobody is here. That is the point.
  // ═══════════════════════════════════════════════════════════════
  function enterIntro() {
    CH.setScene('route-entry');
    CH.clearHotspots();
    CH.showRobots(true);
    CH.showGuest(false);
    try { GameEngine.music.play('ch5_ambient'); } catch (_) {}

    CH.addProp({ prop:'duct',   x:10, y:0,  w:60, h:6, cls:'prop-far' });
    CH.addProp({ prop:'pipe',   x:2,  y:12, w:6,  h:52 });
    CH.addProp({ prop:'pipe',   x:92, y:12, w:6,  h:52, cls:'prop-far' });
    CH.addProp({ prop:'light',  x:45, y:2,  w:10, h:7 });
    CH.addProp({ prop:'debris', x:60, y:84, w:16, h:8 });

    addHotspot({ prop:'c5_routeboard', x:44, y:40, w:13, h:14,
      label:'ROUTENTAFEL', aria:'Routentafel lesen', fn:() => examine('tafel') });
    addHotspot({ prop:'c5_passage', x:42, y:56, w:16, h:34,
      label:'WEITER · 14-D', aria:'Der Route folgen', fn:() => travelTo('14-D') });

    say([
      { speaker:'SYSTEM', text:'WARTUNGSROUTE 14' },
      { speaker:'SYSTEM', text:'NÄCHSTER ABSCHNITT: 14-D' },
      { speaker:'SYSTEM', text:'STATUS: TEILWEISE ERFASST' },
      { speaker:'SYSTEM', text:'Der Gang ist schmal, alt und feucht. Kein Sektor mehr, eher das, was zwischen den Sektoren liegt. Rohre laufen ins Dunkle und kommen nicht zurück.' },
      { speaker:'R-3MI',  text:'„Hallo?"' },
      { speaker:'SYSTEM', text:'…allo…' },
      { speaker:'V-TGM',  text:'"That\'s you."', subtitle:'Das bist du.' },
      { speaker:'R-3MI',  text:'„Ich hab geprüft."' },
      { speaker:'SYSTEM', text:'Sonst nichts. Nur Tropfen, weit weg, in einem Takt, den niemand eingestellt hat.' },
    ]);
  }

  // ═══════════════════════════════════════════════════════════════
  // 14-D — ABZWEIG.  A fork with a right answer and no wrong one.
  // ═══════════════════════════════════════════════════════════════
  function enterFork() {
    CH.setScene('route-fork');
    CH.clearHotspots();
    CH.showRobots(true);

    CH.addProp({ prop:'duct',    x:14, y:0,  w:54, h:6, cls:'prop-far' });
    CH.addProp({ prop:'column',  x:44, y:16, w:9,  h:54 });
    CH.addProp({ prop:'pipe',    x:1,  y:16, w:6,  h:48 });
    CH.addProp({ prop:'barrel',  x:36, y:74, w:8,  h:14 });
    CH.addProp({ prop:'debris',  x:12, y:86, w:14, h:7 });

    addHotspot({ prop:'c5_passage', cls:'rt-main', x:10, y:34, w:19, h:44,
      label:'LINKS · GEPFLEGT', aria:'Linken Gang nehmen', fn:() => chooseBranch('haupt') });
    addHotspot({ prop:'c5_passage', cls:'rt-old', x:70, y:34, w:19, h:44,
      label:'RECHTS · STAUBIG', aria:'Rechten Gang nehmen', fn:() => chooseBranch('alt') });
    addHotspot({ prop:'c5_marker', x:46, y:40, w:12, h:13,
      label:'MARKIERUNG 14-D', aria:'Markierung 14-D ansehen', fn:() => examine('markD') });

    if (S.branch) {                        // returning after the detour
      say([{ speaker:'SYSTEM', text:'Der Abzweig 14-D. Beide Gänge führen weiter — einer wird noch benutzt.' }]);
      return;
    }
    say([
      { speaker:'SYSTEM', text:'14-D // ABZWEIG. Der Gang teilt sich. Links liegt frischerer Staub auf dem Boden, ein paar Leuchten arbeiten noch. Rechts ist es dunkler, und die Luft steht.' },
      { speaker:'R-3MI',  text:'„Zwei Gänge. Klassisch."' },
      { speaker:'V-TGM',  text:'"One of them is still swept."', subtitle:'Einer davon wird noch gefegt.' },
      { speaker:'R-3MI',  text:'„Und der andere?"' },
      { speaker:'V-TGM',  text:'"Also goes there."', subtitle:'Führt auch dahin.' },
    ]);
  }

  function chooseBranch(which) {
    if (S.branch) {                        // already decided — just walk on
      travelTo('14-E');
      return;
    }
    S.branch = which;
    save();
    if (which === 'haupt') {
      logAdd('14-D // ABZWEIG', 'HAUPTTRASSE ERREICHT.');
      say([
        { speaker:'SYSTEM', text:'Der linke Gang. Die Markierungen sind lesbar, die Leuchten halten durch, der Boden ist nur normal alt.' },
        { speaker:'R-3MI',  text:'„Angenehm unspektakulär."' },
      ], () => travelTo('14-E'));
    } else {
      logAdd('14-D // ABZWEIG', 'ALTE NEBENTRASSE BEGANGEN.');
      say([
        { speaker:'SYSTEM', text:'Der rechte Gang. Nach zehn Schritten wird das Licht schlechter, und der Staub liegt so dick, dass er die Schritte schluckt.' },
        { speaker:'R-3MI',  text:'„…okay. Der hier ist es nicht, oder?"' },
        { speaker:'V-TGM',  text:'"No recent tracks."', subtitle:'Keine frischen Spuren.' },
        { speaker:'R-3MI',  text:'„Wie recent?"' },
        { speaker:'V-TGM',  text:'"Not centuries."', subtitle:'Keine Jahrhunderte.' },
        { speaker:'R-3MI',  text:'„…super."' },
      ], () => enterBeat('14-D-alt'));
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 14-D ALT — the obsolete passage. Longer, funnier, never punished.
  // ═══════════════════════════════════════════════════════════════
  function enterOldPassage() {
    CH.setScene('route-old');
    CH.clearHotspots();
    CH.showRobots(true);

    CH.addProp({ prop:'pipe',    x:3,  y:10, w:6,  h:56 });
    CH.addProp({ prop:'pipe',    x:90, y:10, w:6,  h:56, cls:'prop-far' });
    CH.addProp({ prop:'debris',  x:20, y:84, w:16, h:8 });
    CH.addProp({ prop:'barrel',  x:76, y:70, w:8,  h:14, cls:'prop-far' });
    CH.addProp({ prop:'ivy',     x:60, y:20, w:10, h:26, cls:'prop-far' });

    addHotspot({ cls:'hs-web web-a', x:24, y:26, w:16, h:22,
      label:'SPINNENNETZ', aria:'Spinnennetz', fn:() => webGag() });
    addHotspot({ cls:'hs-web web-b', x:56, y:38, w:16, h:22,
      label:'NOCH EIN NETZ', aria:'Noch ein Spinnennetz', fn:() => webGag() });
    addHotspot({ prop:'c5_marker', x:10, y:44, w:12, h:13,
      label:'ALTE ROUTENPLATTE', aria:'Alte Routenplatte ansehen', fn:() => examine('oldplate') });
    addHotspot({ prop:'c5_hatch', x:78, y:30, w:8,  h:48,
      label:'WARTUNGSLUKE', aria:'Durch die Wartungsluke zurück auf die Trasse', fn:() => rejoin() });

    say([
      { speaker:'SYSTEM', text:'Die alte Nebentrasse. Die Routenplatten hier sind eine Bauform älter, das Metall matt. Zwischen den Rohren hängen Netze quer durch den Gang.' },
      { speaker:'R-3MI',  text:'„Warum ist hier alles so klebrig?"' },
      { speaker:'V-TGM',  text:'"Webs."', subtitle:'Spinnennetze.' },
      { speaker:'R-3MI',  text:'„Das wusste ich."' },
      { speaker:'SYSTEM', text:'Vorn rechts führt eine Wartungsluke zurück auf die Haupttrasse.' },
    ]);
  }

  const WEB_GAGS = [
    [ { speaker:'R-3MI', text:'„Ich hab es im Gesicht. Ich habe kein Gesicht, und ich hab es trotzdem im Gesicht."' } ],
    [ { speaker:'R-3MI', text:'„ICH HASSE DIESEN GANG."' },
      { speaker:'V-TGM', text:'"Noted."', subtitle:'Vermerkt.' } ],
    [ { speaker:'SYSTEM', text:'Noch ein Netz. Es ist leer. Sie sind alle leer.' },
      { speaker:'R-3MI',  text:'„Das ist auch nicht besser."' } ],
  ];
  function webGag() {
    const lines = WEB_GAGS[Math.min(S.webGags, WEB_GAGS.length - 1)];
    S.webGags++;
    if (S.webGags === 2) logAdd('R-3MI // NACHTRAG', 'ZU VIELE SPINNENNETZE.');
    save();
    say(lines);
  }

  function rejoin() {
    logAdd('14-D // NEBENTRASSE', 'WIEDER AUF DER HAUPTTRASSE.');
    say([
      { speaker:'SYSTEM', text:'Die Luke geht schwer auf, aber sie geht auf. Dahinter: die gepflegte Trasse, ein paar Meter weiter vorn als vorhin.' },
      { speaker:'R-3MI',  text:'„War der Gang jetzt falsch?"' },
      { speaker:'V-TGM',  text:'"Obsolete."', subtitle:'Stillgelegt.' },
      { speaker:'R-3MI',  text:'„Das ist ein netteres Wort für falsch."' },
      { speaker:'V-TGM',  text:'"It is a different word."', subtitle:'Es ist ein anderes Wort.' },
    ], () => travelTo('14-E'));
  }

  // ═══════════════════════════════════════════════════════════════
  // 14-E — SCHALTGALERIE.  The wall is meant to be poked at.
  // ═══════════════════════════════════════════════════════════════
  const BUNDLE_ROLE = ['fwd', 'local', 'up', 'up'];

  function buildGallery() {
    const letters = shuffle(['A', 'B', 'C', 'D']);
    const role = {};
    letters.forEach((L, i) => { role[L] = BUNDLE_ROLE[i]; });
    const fwd   = letters[0];
    const others = letters.slice(1);

    const RUN   = 5;
    const gap   = randInt(2, 4);                 // an interior break, never an end
    const donor = pick(others);
    const donorIdx = randInt(1, 4);

    const btns = [];
    const used = new Set();
    for (let i = 1; i <= RUN; i++) {
      if (i === gap) continue;
      btns.push({ id: fwd + i, bundle: fwd, idx: i });
      used.add(fwd + i);
    }
    btns.push({ id: donor + donorIdx, bundle: donor, idx: donorIdx, bridge: true });
    used.add(donor + donorIdx);

    let guard = 0;
    while (btns.length < 12 && guard++ < 400) {
      const b = pick(others), i = randInt(1, 6), id = b + i;
      if (used.has(id)) continue;
      used.add(id);
      btns.push({ id, bundle: b, idx: i });
    }

    const answer = new Set(btns.filter(b => b.bundle === fwd || b.bridge).map(b => b.id));
    const gagPool = shuffle(btns.filter(b => !answer.has(b.id)).map(b => b.id));
    const gags = {};
    GAG_KEYS.forEach((k, i) => { if (gagPool[i]) gags[gagPool[i]] = k; });

    return {
      role, fwd, gap, donor: donor + donorIdx,
      btns: shuffle(btns), answer, gags,
      latched: new Set(), tries: 0,
    };
  }

  const GAG_KEYS = ['vent', 'lamp', 'hatch', 'jingle', 'trolley'];
  const GAGS = {
    vent: [
      { speaker:'SYSTEM', text:'Über euch springt ein uralter Lüfter an. Er schafft genau einen Stoß — und der besteht fast vollständig aus Staub.' },
      { speaker:'R-3MI',  text:'„…Die Spinnen waren besser."' },
    ],
    lamp: [
      { speaker:'SYSTEM', text:'Sämtliche Leuchten in der Galerie gehen aus. Weit hinter euch, im Gang, den ihr längst verlassen habt, geht eine einzelne Lampe an.' },
      { speaker:'R-3MI',  text:'„Gut."' },
      { speaker:'R-3MI',  text:'„Der Gang hinter uns sieht jetzt hervorragend aus."' },
      { speaker:'SYSTEM', text:'Die Galerie hellt sich wieder auf. Die Lampe hinten bleibt an.' },
    ],
    hatch: [
      { speaker:'SYSTEM', text:'Eine handtellergroße Wandklappe fährt mit erheblichem mechanischem Aufwand auf. Dahinter: nichts.' },
      { speaker:'R-3MI',  text:'„Oh."' },
      { speaker:'V-TGM',  text:'"Useful."', subtitle:'Nützlich.' },
    ],
    jingle: [
      { speaker:'SYSTEM', text:'Sehr weit weg spielt etwas eine kurze, ausgesprochen gut gelaunte Dreitonfolge.' },
      { speaker:'SYSTEM', text:'Pause.' },
      { speaker:'SYSTEM', text:'…KLONK.' },
      { speaker:'R-3MI',  text:'„Was war das?"' },
      { speaker:'T-FLON14', text:'„Keine Ahnung."' },
      { speaker:'T-FLON14', text:'„Läuft aber noch."' },
    ],
    trolley: [
      { speaker:'SYSTEM', text:'Hinten in der Galerie setzt sich ein alter Wartungswagen in Bewegung, rollt etwa zwanzig Zentimeter und bleibt wieder stehen.' },
      { speaker:'R-3MI',  text:'„Beeindruckend."' },
      { speaker:'T-FLON14', text:'„Der macht das seit Jahren."' },
    ],
  };

  function enterGallery() {
    CH.setScene('route-gallery');
    CH.clearHotspots();
    CH.showRobots(true);

    CH.addProp({ prop:'duct',     x:10, y:0,  w:58, h:6, cls:'prop-far' });
    CH.addProp({ prop:'cables',   x:70, y:4,  w:9,  h:24, cls:'prop-far' });
    CH.addProp({ prop:'pipe',     x:2,  y:14, w:6,  h:50 });
    CH.addProp({ prop:'crate',    x:84, y:70, w:12, h:14 });
    CH.addProp({ prop:'monitors', x:8,  y:26, w:14, h:14, cls:'prop-far' });

    addHotspot({ prop:'c5_gallery', cls:'prop-guest', x:36, y:32, w:24, h:24,
      label:'SCHALTWAND', aria:'Schaltwand bedienen', fn:() => openStation('gallery') });
    addHotspot({ prop:'c5_marker', x:66, y:44, w:12, h:13,
      label:'MARKIERUNG 14-E', aria:'Markierung 14-E ansehen', fn:() => examine('markE') });
    if (S.relay) {
      addHotspot({ prop:'c5_passage', x:44, y:62, w:15, h:32,
        label:'WEITER · 14-F', aria:'Weiter nach 14-F', fn:() => travelTo('14-F') });
    }

    if (!S.metTflon) { meetTflon(); return; }
    say([{ speaker:'SYSTEM', text:'14-E // SCHALTGALERIE. Eine Wand aus alten Schaltern, darüber die Leitungsbündel, die aus der Galerie hinauslaufen.' }]);
  }

  function meetTflon() {
    // Latch the meeting before any narration: a lost callback must not make
    // the chapter forget that T-FLON14 is standing right there.
    S.metTflon = true;
    save();
    CH.showGuest(true);
    playSound('ch5_tflon.mp3');

    const webCallback = S.branch === 'alt'
      ? [{ speaker:'V-TGM', text:'"Both."', subtitle:'Beides.' }]
      : [{ speaker:'T-FLON14', text:'„Die Schalter."' }];

    say([
      { speaker:'SYSTEM', text:'KLACK.' },
      { speaker:'SYSTEM', text:'KLACK.' },
      { speaker:'SYSTEM', text:'…KLONK.' },
      { speaker:'R-3MI',  text:'„Das war nicht das Echo."' },
      { speaker:'SYSTEM', text:'14-E // SCHALTGALERIE. Eine lange Wand aus mechanischen Schaltern, darüber die Leitungsbündel, die aus der Galerie hinauslaufen — irgendwohin, wo ihr noch nicht wart.' },
      { speaker:'SYSTEM', text:'Davor steht eine Einheit und arbeitet sich Schalter für Schalter durch die Wand. Sie dreht sich nicht sofort um.' },
      { speaker:'T-FLON14', text:'„Ah."' },
      { speaker:'T-FLON14', text:'„Ihr seid auch hier."' },
      { speaker:'R-3MI',  text:'„Auch?"' },
      { speaker:'T-FLON14', text:'„Mhm."' },
      { speaker:'SYSTEM', text:'Die Einheit dreht sich wieder zur Wand.' },
      { speaker:'T-FLON14', text:'„Die hier spinnen."' },
      { speaker:'R-3MI',  text:'„Die Schalter oder die Spinnen?"' },
      ...webCallback,
      { speaker:'SYSTEM', text:'T-FLON14. LANGSTRECKEN-WARTUNGSEINHEIT. Sie sieht aus, als wäre sie schon eine Weile unterwegs, und als würde sie das nicht weiter beschäftigen.' },
      { speaker:'T-FLON14', text:'„Ihr wollt die Strecke durch? Dann muss das Fernrelais an. Sonst steht ihr in zwei Stationen im Dunkeln."' },
    ]);
  }

  function renderGallery() {
    const g = inst.gallery;
    const ductLine = (L) => {
      const r = g.role[L];
      return r === 'fwd'   ? `${L} → 14-G · STRECKE VORAUS`
           : r === 'local' ? `${L} → GALERIE · ENDET HIER`
                           : `${L} → 14-C · RÜCKWÄRTS`;
    };
    const ducts = ['A', 'B', 'C', 'D'].map(L =>
      `<li class="${g.role[L] === 'fwd' ? 'sg-duct-fwd' : ''}">${esc(ductLine(L))}</li>`).join('');

    const wall = g.btns.map(b =>
      `<button class="sg-key${g.latched.has(b.id) ? ' on' : ''}" data-act="sg-key" data-id="${esc(b.id)}"
               aria-pressed="${g.latched.has(b.id)}" aria-label="Schalter ${esc(b.id)}">
         <span class="sg-key-id">${esc(b.id)}</span>
         <span class="sg-key-lamp"></span>
       </button>`).join('');

    return `
      <div class="sg-plan">
        <p class="sg-h sys-text">LEITUNGSBÜNDEL — AUSGÄNGE DER GALERIE</p>
        <ul class="sg-ducts">${ducts}</ul>
        <p class="sg-h sys-text">RELAISLEGENDE</p>
        <p class="sg-legend">FERNRELAIS 14-G schaltet nur bei <b>geschlossener Leitung</b>.<br>
           Leitung = <b>Abschnitte 1 bis 5</b> desselben Bündels.</p>
        <p class="sg-h sys-text">REPARATURPLATTE (in die Wand geschraubt)</p>
        <p class="sg-patch">ABSCHNITT ${g.gap} AUSGEBAUT · BRÜCKE ⇢ ${esc(g.donor)}</p>
      </div>
      <p class="vs-note sys-text">SCHALTWAND — ANTIPPEN RASTET EIN</p>
      <div class="sg-wall">${wall}</div>
      <p class="sg-count sys-text">EINGERASTET: ${g.latched.size}</p>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // 14-F — TIEFSCHACHT.  No puzzle. The chapter has to breathe.
  // ═══════════════════════════════════════════════════════════════
  function enterShaft() {
    CH.setScene('route-shaft');
    CH.clearHotspots();
    CH.showRobots(true);
    CH.showGuest(true);

    CH.addProp({ prop:'ladder',  x:8,  y:6,  w:8,  h:60 });
    CH.addProp({ prop:'pipe',    x:88, y:0,  w:6,  h:70, cls:'prop-far' });
    CH.addProp({ prop:'cables',  x:24, y:0,  w:9,  h:30, cls:'prop-far' });
    CH.addProp({ prop:'railing', x:30, y:66, w:40, h:12 });

    addHotspot({ prop:'c5_lift', cls:'prop-guest', x:42, y:36, w:18, h:20,
      label:'WARTUNGSLIFT', aria:'Wartungslift bedienen', fn:() => descend() });
    addHotspot({ prop:'c5_niche', x:74, y:36, w:13, h:14,
      label:'SEITENNISCHE', aria:'Seitennische untersuchen', fn:() => examine('alcove') });
    addHotspot({ prop:'c5_marker', x:18, y:44, w:12, h:13,
      label:'MARKIERUNG 14-F', aria:'Markierung 14-F ansehen', fn:() => examine('markF') });

    if (S.restSeen) {
      addHotspot({ prop:'c5_passage', x:44, y:66, w:15, h:30,
        label:'WEITER · 14-G', aria:'Weiter nach 14-G', fn:() => travelTo('14-G') });
      say([{ speaker:'SYSTEM', text:'Die Sohle des Tiefschachts. Über euch verliert sich der Schacht in Dunkelheit und ein paar sehr weit entfernten Lichtern.' }]);
      return;
    }

    say([
      { speaker:'SYSTEM', text:'14-F // TIEFSCHACHT. Der Gang endet an einer Kante. Dahinter fällt ein Schacht weg, in dem Rohre zwischen den Ebenen verschwinden. Unten: Lichter, sehr klein.' },
      { speaker:'R-3MI',  text:'„Wie weit geht das runter?"' },
      { speaker:'T-FLON14', text:'„Noch ein Stück."' },
      { speaker:'SYSTEM', text:'Von unten kommt Luft herauf, kühler als im Gang, und es riecht nach nassem Stein.' },
      { speaker:'V-TGM',  text:'"How often did you walk this route?"', subtitle:'Wie oft bist du diese Strecke gelaufen?' },
      { speaker:'T-FLON14', text:'„Oft genug."' },
    ]);
  }

  function descend() {
    if (S.restSeen) { travelTo('14-G'); return; }
    playSound('ch5_lift.mp3');
    say([
      { speaker:'SYSTEM', text:'Der Wartungslift setzt sich in Bewegung. Er ist langsam, ehrlich und sehr laut.' },
      { speaker:'SYSTEM', text:'Die Wand zieht an euch vorbei: Ebene um Ebene, Rohr um Rohr, Nische um Nische. Das Echo wird tiefer, je weiter ihr kommt.' },
      { speaker:'SYSTEM', text:'Auf halber Strecke öffnet sich die Schachtwand zu einer Halle, die keiner von euch je erwähnt bekommen hat. Lichter, oben und unten, weit auseinander. Die Anlage ist erheblich größer als die Räume, die ihr kennt.' },
      { speaker:'R-3MI',  text:'„Du hast vor fünf Minuten auch »noch ein Stück« gesagt."' },
      { speaker:'T-FLON14', text:'„Stimmt."' },
      { speaker:'SYSTEM', text:'Der Lift kommt auf der Sohle zum Stehen.' },
      { speaker:'R-3MI',  text:'„Pause."' },
      { speaker:'T-FLON14', text:'„Okay."' },
      { speaker:'R-3MI',  text:'„…wirklich?"' },
      { speaker:'T-FLON14', text:'„Du hast Pause gesagt."' },
      { speaker:'V-TGM',  text:'"Were you expecting an argument?"', subtitle:'Hast du eine Diskussion erwartet?' },
      { speaker:'R-3MI',  text:'„Ja."' },
    ], restStop);
  }

  function restStop() {
    // Latch the descent before the rest scene: the way on must exist even if
    // the player never touches the optional pause.
    S.restSeen = true;
    save();
    logAdd('14-F // TIEFSCHACHT', 'ABSTIEG FREI.');
    enterShaft();
    CH.showChoices({
      prompt: 'PAUSE AUF DER SOHLE:',
      hint:   'OPTIONAL.',
      choices: [
        { key:'why', label:'[ Wie lang ist diese Strecke eigentlich? ]', lines:[
          { speaker:'T-FLON14', text:'„Lang."' },
          { speaker:'SYSTEM',   text:'Pause.' },
          { speaker:'R-3MI',    text:'„Das war keine Zahl."' },
          { speaker:'T-FLON14', text:'„War auch keine Zahlenfrage."' },
        ] },
        { key:'all', label:'[ Und wie macht man das alles? ]', lines:[
          { speaker:'T-FLON14', text:'„Eine Station nach der anderen."' },
          { speaker:'SYSTEM',   text:'Mehr sagt sie nicht dazu.' },
        ] },
        { key:'go', label:'[ WEITER ]', lines:[
          { speaker:'T-FLON14', text:'„Gut."' },
        ] },
      ],
      onAfterChoice: (key, cfg) => {
        if (key === 'go') return;
        CH.showChoices(cfg);
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 14-G — VERSORGUNG.  Not every red lamp is in your way.
  // ═══════════════════════════════════════════════════════════════
  const SYS_DEF = [
    { role:'extend',  pre:'HYD', name:'HYDRAULIK',      fn:'fährt die Plattform aus.',                need:true,  cost:3, status:'stoerung' },
    { role:'lock',    pre:'VER', name:'VERRIEGELUNG',   fn:'verriegelt die Plattform am Gegenanker.', need:true,  cost:3, status:'stoerung' },
    { role:'light',   pre:'LFT', name:'LAUFLICHT',      fn:'beleuchtet den Steg.',                    need:false, cost:2, status:'stoerung' },
    { role:'heat',    pre:'HZG', name:'SCHIENENHEIZUNG',fn:'hält die Laufschiene eisfrei.',           need:false, cost:2, status:'stoerung' },
    { role:'align',   pre:'STW', name:'STELLWERK',      fn:'richtet den Gegenanker aus.',             need:false, cost:3, status:'fehlt' },
    { role:'monitor', pre:'DRW', name:'DRUCKWÄCHTER',   fn:'überwacht den Leitungsdruck.',            need:false, cost:2, status:'ok' },
  ];

  function buildSupply() {
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 6);
    const rows = shuffle(SYS_DEF.map((d, i) => ({ ...d, id: `${d.pre}-${nums[i]}` })));
    const budget = SYS_DEF.filter(d => d.need).reduce((n, d) => n + d.cost, 0);
    return { rows, budget, supplied: new Set(), cranked: false, tries: 0 };
  }

  function supplyUsed() {
    const s = inst.supply;
    return s.rows.filter(r => s.supplied.has(r.id)).reduce((n, r) => n + r.cost, 0);
  }

  function renderSupply() {
    const s = inst.supply;
    const used = supplyUsed();
    const rows = s.rows.map(r => {
      const on   = s.supplied.has(r.id);
      const dead = r.status === 'fehlt';
      const okAlready = r.status === 'ok';
      const lamp = okAlready ? 'ok' : 'bad';
      const state = okAlready ? 'IN ORDNUNG' : dead ? 'BAUTEIL FEHLT' : 'STÖRUNG';
      const afford = on || (used + r.cost <= s.budget);
      const btn = dead
        ? `<button class="vg-btn" data-act="vg-crank" ${s.cranked ? 'disabled' : ''}>${s.cranked ? '[ GEKURBELT ]' : '[ HANDKURBEL ]'}</button>`
        : okAlready
          ? `<span class="vg-none sys-text">—</span>`
          : `<button class="vg-btn${on ? ' on' : ''}" data-act="vg-sup" data-id="${esc(r.id)}"
                     ${afford ? '' : 'disabled'} aria-pressed="${on}">${on ? '[ VERSORGT ]' : `[ VERSORGEN · ${r.cost} ]`}</button>`;
      return `<div class="vg-row${on ? ' on' : ''}">
          <div class="vg-head">
            <span class="vg-lamp ${lamp}"></span>
            <span class="vg-id sys-text">${esc(r.id)}</span>
            <span class="vg-name">${esc(r.name)}</span>
          </div>
          <p class="vg-fn">${esc(r.fn)}</p>
          <div class="vg-foot">
            <span class="vg-state sys-text">${state}${dead ? ' · HANDBETRIEB MÖGLICH' : ''}</span>
            ${btn}
          </div>
        </div>`;
    }).join('');

    return `
      <div class="vg-schema">
        <p class="sg-h sys-text">FUNKTIONSSCHEMA — ÜBERGANG 14-G</p>
        <p class="vg-need">Der Übergang schließt, wenn:</p>
        <ol class="vg-needs">
          <li>die Plattform <b>ausgefahren</b> ist,</li>
          <li>die Plattform <b>verriegelt</b> ist,</li>
          <li>der <b>Gegenanker ausgerichtet</b> ist.</li>
        </ol>
        <p class="vg-temp sys-text">LAUFSCHIENE: +11 °C · KEIN EIS</p>
      </div>
      <p class="vg-budget sys-text">DRUCKRESERVE: ${s.budget - used} / ${s.budget} EINHEITEN FREI</p>
      <div class="vg-rows">${rows}</div>`;
  }

  function enterSupply() {
    CH.setScene('route-supply');
    CH.clearHotspots();
    CH.showRobots(true);
    CH.showGuest(true);

    CH.addProp({ prop:'pipe',    x:2,  y:8,  w:7,  h:56 });
    CH.addProp({ prop:'pipe',    x:90, y:8,  w:7,  h:56 });
    CH.addProp({ prop:'duct',    x:14, y:0,  w:56, h:6, cls:'prop-far' });
    CH.addProp({ prop:'barrel',  x:80, y:66, w:8,  h:15 });
    CH.addProp({ prop:'reactor', x:12, y:28, w:13, h:16, cls:'prop-far' });

    addHotspot({ prop:'c5_supply', cls:'prop-guest', x:36, y:34, w:22, h:22,
      label:'VERSORGUNGSPULT', aria:'Versorgungspult bedienen', fn:() => openStation('supply') });
    addHotspot({ prop:'c5_marker', x:68, y:44, w:12, h:13,
      label:'MARKIERUNG 14-G', aria:'Markierung 14-G ansehen', fn:() => examine('markG') });

    if (S.crossing) {
      addHotspot({ prop:'c5_bridge', cls:'rt-bridge', x:30, y:62, w:40, h:16,
        label:'WARTUNGSSTEG · 14-H', aria:'Über den Wartungssteg nach 14-H', fn:() => crossOver() });
      say([{ speaker:'SYSTEM', text:'Der Wartungssteg steht ausgefahren und verriegelt über dem Spalt.' }]);
      return;
    }

    say([
      { speaker:'SYSTEM', text:'14-G // VERSORGUNG. Die Station läuft — das Fernrelais aus der Galerie hat sie geweckt. Trotzdem geht es hier nicht weiter: Vor euch bricht der Gang ab, und der Wartungssteg, der darüber führen soll, steht eingefahren in seiner Nische.' },
      { speaker:'R-3MI',  text:'„Da fehlt ein Stück Boden."' },
      { speaker:'T-FLON14', text:'„Da fehlt Druck."' },
      { speaker:'SYSTEM', text:'Am Pult leuchten mehrere Anzeigen rot.' },
      { speaker:'T-FLON14', text:'„Nicht alles davon ist wirklich kaputt. Und nicht alles Kaputte steht euch im Weg."' },
    ]);
  }

  function crossOver() {
    say([
      { speaker:'SYSTEM', text:'Ihr geht über den Steg. Er trägt, er schwingt ein bisschen, und unter euch ist sehr lange nichts.' },
      { speaker:'R-3MI',  text:'„Den haben wir gemacht."' },
      { speaker:'T-FLON14', text:'„Mhm."' },
      { speaker:'R-3MI',  text:'„Ich sag das nochmal: DEN HABEN WIR GEMACHT."' },
      { speaker:'T-FLON14', text:'„Hab\'s gehört."' },
    ], () => travelTo('14-H'));
  }

  // ═══════════════════════════════════════════════════════════════
  // 14-H — ALTE MARKIERUNG.  One plate does not follow the grammar.
  // ═══════════════════════════════════════════════════════════════
  const FLAWS = ['bolts', 'code', 'arrow', 'notch', 'border'];

  function buildMarkers() {
    const letters = shuffle(['D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N']).slice(0, 5);
    const plates = letters.map(normPlate);
    const bad  = randInt(0, 4);
    const flaw = pick(FLAWS);
    const p = plates[bad];
    if (flaw === 'bolts')  p.bolts = 3;
    if (flaw === 'code')   p.code  = '14-' + p.letter + randInt(2, 9);
    if (flaw === 'arrow')  p.arrow = '→';
    if (flaw === 'notch')  p.notch = false;
    if (flaw === 'border') p.border = 'single';
    return { plates, bad, flaw, tries: 0 };
  }

  function renderMarkers() {
    const m = inst.marker;
    return `
      <p class="vs-note sys-text">FÜNF PLATTEN AN DER WAND. VIER GEHÖREN ZUR STRECKE.</p>
      <div class="mk-wall">` +
      m.plates.map((p, i) =>
        `<button class="mk-slot" data-act="mk-pick" data-i="${i}" aria-label="Markierung ${esc(p.code)}">
           ${plateHTML(p)}
         </button>`).join('') +
      `</div>`;
  }

  function enterMarker() {
    CH.setScene('route-marker');
    CH.clearHotspots();
    CH.showRobots(true);
    CH.showGuest(true);

    CH.addProp({ prop:'pipe',    x:3,  y:12, w:6,  h:52, cls:'prop-far' });
    CH.addProp({ prop:'duct',    x:16, y:0,  w:54, h:6, cls:'prop-far' });
    CH.addProp({ prop:'debris',  x:66, y:84, w:15, h:8 });
    CH.addProp({ prop:'ivy',     x:86, y:22, w:10, h:26, cls:'prop-far' });

    addHotspot({ prop:'c5_markerwall', cls:'prop-guest', x:34, y:32, w:26, h:22,
      label:'MARKIERUNGSWAND', aria:'Markierungen vergleichen', fn:() => openStation('marker') });

    if (S.marker) {
      addHotspot({ prop:'c5_foreign', cls:'prop-brown', x:66, y:60, w:13, h:16,
        label: S.sigFound ? 'FREMDES BAUTEIL' : 'HINTER DER PLATTE',
        aria:'Hinter der falschen Platte nachsehen', fn:() => inspectSig() });
      addHotspot({ prop:'c5_passage', x:44, y:64, w:15, h:30,
        label:'WEITER · 14-I', aria:'Weiter nach 14-I', fn:() => travelTo('14-I') });
      say([{ speaker:'SYSTEM', text:'Die falsche Platte hängt schief in der Halterung, seit ihr sie gelöst habt.' }]);
      return;
    }

    say([
      { speaker:'SYSTEM', text:'14-H // ALTE MARKIERUNG. Ein ruhiger, trockener Abschnitt. An der Wand hängen fünf Routenplatten nebeneinander — deutlich mehr, als ein Gang eigentlich braucht.' },
      { speaker:'T-FLON14', text:'„Moment."' },
      { speaker:'SYSTEM', text:'T-FLON14 bleibt stehen. Zum ersten Mal, seit ihr sie kennt, ohne dass jemand darum gebeten hat.' },
      { speaker:'T-FLON14', text:'„Die Markierung stimmt nicht."' },
      { speaker:'R-3MI',  text:'„Was stimmt nicht?"' },
      { speaker:'T-FLON14', text:'„Die gehört nicht zur Strecke."' },
      { speaker:'R-3MI',  text:'„Welche?"' },
      { speaker:'T-FLON14', text:'„Schaut sie euch an. Ihr seid an genug davon vorbeigelaufen."' },
    ]);
  }

  function inspectSig() {
    if (S.sigFound) {
      say([
        { speaker:'SYSTEM', text:'Das fremde Bauteil sendet weiter. Kurz, gleichmäßig, an niemanden.' },
        { speaker:'T-FLON14', text:'„Lass es hängen. Ich melde die Stelle."' },
      ]);
      return;
    }
    // Latch before narration — the find must survive a dropped callback.
    S.sigFound = true;
    save();
    try { GameEngine.signals.find('sig_03'); } catch (_) {}
    logAdd('14-H // MARKIERUNG', 'ROUTENFREMDES ELEMENT FESTGESTELLT.');
    say([
      { speaker:'SYSTEM', text:'Die Platte sitzt auf einer Halterung, die nicht zu ihr gehört. Dahinter, in die Wand eingelassen: ein Gehäuse, das niemand hier eingebaut hat.' },
      { speaker:'SYSTEM', text:'UNBEKANNTER SENDER AKTIV.' },
      { speaker:'V-TGM',  text:'"That should not be there."', subtitle:'Das sollte da nicht sein.' },
      { speaker:'R-3MI',  text:'„Mittlerweile überrascht mich das weniger."' },
      { speaker:'T-FLON14', text:'„Mich schon."' },
      { speaker:'SYSTEM', text:'Das Gehäuse gibt ein Fragment aus.' },
      { speaker:'V-TGM',  text:'"…the numbers do not match the map. an external test signature is needed. the old one is still valid…"', subtitle:'…die Zahlen stimmen nicht mit der Karte überein. Es braucht eine Testsignatur von außen. Die alte gilt noch.' },
      { speaker:'SYSTEM', text:'Stille im Gang.' },
      { speaker:'T-FLON14', text:'„Das ist keine Streckenmeldung."' },
      { speaker:'R-3MI',  text:'„Was ist es dann?"' },
      { speaker:'T-FLON14', text:'„Weiß ich nicht. Ich weiß nur, dass es nicht zur Strecke gehört."' },
      { speaker:'SYSTEM', text:'Sie notiert die Stelle und geht weiter. Mehr macht sie damit nicht.' },
    ]);
  }

  // ═══════════════════════════════════════════════════════════════
  // 14-I — STRECKENENDE.  Certify the line you walked.
  // ═══════════════════════════════════════════════════════════════
  function buildTerminal() {
    const segs = [
      { id:'DE', label:'14-D → 14-E', ok: S.branch === 'alt' ? 'ALTE NEBENTRASSE' : 'HAUPTTRASSE',
        bad: S.branch === 'alt' ? 'HAUPTTRASSE' : 'ALTE NEBENTRASSE' },
      { id:'EF', label:'14-E → 14-F', ok:'ABSTIEG TIEFSCHACHT', bad:'SEITENSTOLLEN 14-F/2' },
      { id:'FG', label:'14-F → 14-G', ok:'VERSORGUNGSGANG',     bad:'DRUCKTOR (OHNE FREIGABE)' },
      { id:'GH', label:'14-G → 14-H', ok:'WARTUNGSSTEG (INSTANDGESETZT)', bad:'UMGEHUNG 14-G/W' },
      { id:'HI', label:'14-H → 14-I', ok:'MARKIERTE TRASSE',    bad:'ABZWEIG LT. FREMDMARKIERUNG' },
    ].map(s => ({ ...s, opts: shuffle([s.ok, s.bad]) }));
    return { segs, choice: {}, tries: 0 };
  }

  function renderTerminal() {
    const t = inst.terminal;
    return `
      <p class="vs-note sys-text">BESTÄTIGE DIE ABSCHNITTE, DIE DIESE EINHEIT GEPRÜFT HAT.</p>
      <div class="tm-map">` +
      ['14-D','14-E','14-F','14-G','14-H','14-I'].map((n, i) =>
        `<span class="tm-node${i === 5 ? ' end' : ''}">${n}</span>${i < 5 ? '<span class="tm-link"></span>' : ''}`).join('') +
      `</div>
      <div class="tm-segs">` +
      t.segs.map(s =>
        `<div class="tm-seg">
           <span class="tm-lab sys-text">${esc(s.label)}</span>
           <div class="tm-opts">` +
           s.opts.map(o =>
            `<button class="tm-opt${t.choice[s.id] === o ? ' on' : ''}" data-act="tm-pick"
                     data-seg="${s.id}" data-val="${esc(o)}" aria-pressed="${t.choice[s.id] === o}">${esc(o)}</button>`).join('') +
           `</div>
         </div>`).join('') +
      `</div>`;
  }

  function enterTerminal() {
    CH.setScene('route-terminal');
    CH.clearHotspots();
    CH.showRobots(true);
    CH.showGuest(true);

    CH.addProp({ prop:'monitors', x:66, y:26, w:18, h:16, cls:'prop-far' });
    CH.addProp({ prop:'duct',     x:14, y:0,  w:52, h:6, cls:'prop-far' });
    CH.addProp({ prop:'cables',   x:8,  y:6,  w:8,  h:22, cls:'prop-far' });
    CH.addProp({ prop:'crate',    x:84, y:70, w:12, h:14 });

    addHotspot({ prop:'c5_terminal', cls:'prop-guest', x:40, y:30, w:20, h:26,
      label:'STRECKENTERMINAL', aria:'Streckenterminal bedienen', fn:() => openStation('terminal') });
    addHotspot({ prop:'c5_marker', x:70, y:48, w:12, h:13,
      label:'MARKIERUNG 14-I', aria:'Markierung 14-I ansehen', fn:() => examine('markI') });

    say([
      { speaker:'SYSTEM', text:'14-I // STRECKENENDE. Der Gang wird breiter und plötzlich sauber. Instrumententafeln statt Katakombe. Am Ende steht ein Terminal, das die ganze Route anzeigt: 14-D bis 14-I, Knoten für Knoten.' },
      { speaker:'R-3MI',  text:'„Oh nein. Eine Karte. Jetzt kommt das große Rätsel."' },
      { speaker:'T-FLON14', text:'„Nein."' },
      { speaker:'T-FLON14', text:'„Jetzt kommt die Abnahme. Da steht nichts drauf, was ihr nicht gelaufen seid."' },
    ]);
  }

  // ═══════════════════════════════════════════════════════════════
  // FLAVOUR HOTSPOTS
  // ═══════════════════════════════════════════════════════════════
  const SCENE_LINES = {
    tafel: {
      1: [
        { speaker:'SYSTEM', text:'Eine emaillierte Routentafel, an einer Ecke abgeplatzt. WARTUNGSROUTE 14 — darunter eine Reihe Stationscodes, von 14-A bis 14-I. Die ersten drei sind durchgestrichen.' },
        { speaker:'R-3MI',  text:'„Warum fangen wir bei D an?"' },
        { speaker:'V-TGM',  text:'"A to C are gone."', subtitle:'A bis C gibt es nicht mehr.' },
      ],
      2: [ { speaker:'SYSTEM', text:'Unter dem letzten Code steht kleiner, gestempelt: FORTSETZUNG SIEHE ROUTE 15.' } ],
    },
    markD: {
      1: [
        { speaker:'SYSTEM', text:'Eine Routenplatte, wie sie hier überall hängen: doppelter Rand, vier Schrauben, Stationscode, Pfeil. Unten rechts eine kleine Kerbe aus der Fertigung.' },
        { speaker:'T-FLON14', text:'' },
        { speaker:'R-3MI',  text:'„Eine Platte. Faszinierend."' },
      ],
      2: [ { speaker:'SYSTEM', text:'Dieselbe Bauform wie am Eingang. Die Anlage war in solchen Dingen sehr konsequent.' } ],
    },
    oldplate: {
      1: [
        { speaker:'SYSTEM', text:'Die Platten hier sind eine Bauform älter: dickerer Rand, andere Schrift. Der Stationscode stimmt trotzdem — 14-D, mit demselben Pfeil.' },
        { speaker:'V-TGM',  text:'"Older. Still Route 14."', subtitle:'Älter. Trotzdem Route 14.' },
      ],
    },
    alcove: {
      1: [
        { speaker:'SYSTEM', text:'Eine Wartungsnische im Schacht. Ein Klapphocker, ein leerer Becherhalter, ein Haken für eine Lampe, die nicht mehr da ist.' },
        { speaker:'R-3MI',  text:'„Hier hat jemand gesessen."' },
        { speaker:'T-FLON14', text:'„Hier haben viele gesessen."' },
      ],
      2: [
        { speaker:'SYSTEM', text:'In den Stein neben dem Hocker sind Striche geritzt. Nicht viele. Jemand hat irgendwann aufgehört zu zählen.' },
        { speaker:'T-FLON14', text:'„Das war nicht ich."' },
        { speaker:'SYSTEM', text:'Pause.' },
        { speaker:'T-FLON14', text:'„Ich zähle nicht."' },
      ],
    },
  };
  ['markE', 'markF', 'markG', 'markI'].forEach(k => {
    SCENE_LINES[k] = {
      1: [ { speaker:'SYSTEM', text:'Routenplatte in Normbauform: doppelter Rand, vier Schrauben, Stationscode, Pfeil, Kerbe unten rechts. Genau wie die anderen.' } ],
      2: [ { speaker:'T-FLON14', text:'„Die stimmt."' } ],
    };
  });

  function examine(key) {
    const n = bump(key);
    const bucket = SCENE_LINES[key];
    if (!bucket) return;
    const keys = Object.keys(bucket).map(Number).sort((a, b) => a - b);
    const lines = bucket[keys.filter(k => k <= n).pop() ?? keys[0]];
    if (lines) say(lines.filter(l => l.text !== ''));
  }

  // ═══════════════════════════════════════════════════════════════
  // TALKING
  // ═══════════════════════════════════════════════════════════════
  const TALK = {
    guest: [
      { key:'route', label:'[ Wie lange machst du das schon? ]', lines:[
        { speaker:'T-FLON14', text:'„Die Strecke? Solange es sie gibt."' },
        { speaker:'R-3MI',  text:'„Das ist keine Antwort."' },
        { speaker:'T-FLON14', text:'„Doch. Nur keine kurze."' },
      ] },
      { key:'alone', label:'[ Läufst du hier immer allein? ]', lines:[
        { speaker:'T-FLON14', text:'„Meistens."' },
        { speaker:'SYSTEM', text:'Pause.' },
        { speaker:'T-FLON14', text:'„Ist heute angenehmer."' },
      ] },
      { key:'lost', label:'[ Verläufst du dich nie? ]', lines:[
        { speaker:'T-FLON14', text:'„Doch."' },
        { speaker:'R-3MI',  text:'„Und dann?"' },
        { speaker:'T-FLON14', text:'„Dann nehmen wir den Umweg. Ist länger. Geht aber."' },
      ] },
      { key:'end', label:'[ Wo endet Route 14? ]', lines:[
        { speaker:'T-FLON14', text:'„Bei 14-I."' },
        { speaker:'R-3MI',  text:'„Und dann?"' },
        { speaker:'T-FLON14', text:'„Dann fängt Route 15 an."' },
        { speaker:'R-3MI',  text:'„…wie viele gibt es?"' },
        { speaker:'T-FLON14', text:'„Genug."' },
      ] },
    ],
    r3mi: [
      { key:'her', label:'[ Was hältst du von T-FLON14? ]', lines:[
        { speaker:'R-3MI', text:'„Die Einheit redet ungefähr alle vier Minuten ein Wort. Aber wenn ich stehenbleibe, bleibt sie auch stehen."' },
        { speaker:'R-3MI', text:'„Das ist mir bisher bei niemandem aufgefallen."' },
      ], again:[
        { speaker:'R-3MI', text:'„Sind wir bald da?"' },
        { speaker:'T-FLON14', text:'„Bei der nächsten Station."' },
        { speaker:'R-3MI', text:'„Das ist nicht dasselbe."' },
        { speaker:'T-FLON14', text:'„Hilft trotzdem."' },
      ] },
      { key:'far', label:'[ Wie weit sind wir schon gelaufen? ]', lines:[
        { speaker:'R-3MI', text:'„Ich hab bei vierhundert Metern aufgehört zu zählen."' },
        { speaker:'V-TGM', text:'"You started at three hundred."', subtitle:'Du hast bei dreihundert angefangen.' },
        { speaker:'R-3MI', text:'„Ich hab spät angefangen."' },
      ] },
    ],
    vtgm: [
      { key:'place', label:'[ Was ist das hier eigentlich? ]', lines:[
        { speaker:'V-TGM', text:'"Everything between the rooms you know."', subtitle:'Alles zwischen den Räumen, die du kennst.' },
        { speaker:'V-TGM', text:'"Someone maintained all of this. For a long time."', subtitle:'Jemand hat das alles gewartet. Sehr lange.' },
      ] },
      { key:'her', label:'[ Und was hältst du von T-FLON14? ]', lines:[
        { speaker:'V-TGM', text:'"Not fast."', subtitle:'Nicht schnell.' },
        { speaker:'SYSTEM', text:'Pause.' },
        { speaker:'V-TGM', text:'"Still going, though. That is a different thing."', subtitle:'Aber immer noch unterwegs. Das ist etwas anderes.' },
      ] },
    ],
  };

  function clickRobot(who) {
    if (dialogueBusy()) { try { GameEngine.dialogue.advance(); } catch (_) {} return; }
    if (who === 'guest' && !S.metTflon) return;

    const topics = TALK[who] || [];
    const choices = topics.map(t => {
      const seen = !!S.talkSeen[who + ':' + t.key];
      return { key:t.key, label:t.label, seen, lines:(seen && t.again) ? t.again : t.lines };
    });
    if (who === 'guest') {
      choices.unshift({ key:'__coach', label:'[ Wie geht man das an? ]', seen:false, lines: coachLines() });
    }
    choices.push({ key:'__leave', label:'[ Nichts. Weiter. ]', seen:false, lines: [] });

    CH.showChoices({
      prompt: who === 'guest' ? 'T-FLON14 ANSPRECHEN:' : who === 'r3mi' ? 'R-3MI ANSPRECHEN:' : 'V-TGM ANSPRECHEN:',
      hint: 'OPTIONAL.',
      choices,
      onAfterChoice: (key) => {
        if (key === '__leave' || key === '__coach') return;
        S.talkSeen[who + ':' + key] = true;
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // COACHING — practical, unlimited, never the answer
  // ═══════════════════════════════════════════════════════════════
  const COACH = {
    gallery: [
      [ { speaker:'T-FLON14', text:'„Erst schauen, wo die Bündel hinlaufen. Dann schalten."' } ],
      [ { speaker:'T-FLON14', text:'„Eine Leitung ist entweder ganz oder gar nicht. Halbe Leitungen schalten nichts."' } ],
      [ { speaker:'R-3MI',  text:'„Das war jetzt aber ein Tipp."' },
        { speaker:'T-FLON14', text:'„Ja."' },
        { speaker:'R-3MI',  text:'„Einfach so?"' },
        { speaker:'T-FLON14', text:'„Wenn\'s hängt, hilft man."' } ],
    ],
    supply: [
      [ { speaker:'T-FLON14', text:'„Lies, was die Teile tun. Nicht, wie laut sie blinken."' } ],
      [ { speaker:'T-FLON14', text:'„Der Druck reicht für genau das, was der Übergang braucht. Für mehr nicht."' } ],
      [ { speaker:'T-FLON14', text:'„Und was sich nicht versorgen lässt, muss man eben von Hand machen."' } ],
    ],
    marker: [
      [ { speaker:'T-FLON14', text:'„Nebeneinanderlegen. Vier sind gleich, eine nicht."' } ],
      [ { speaker:'T-FLON14', text:'„Rand, Schrauben, Code, Pfeil, Kerbe. Mehr hat so eine Platte nicht."' } ],
    ],
    terminal: [
      [ { speaker:'T-FLON14', text:'„Ihr wart überall. Ihr müsst nur noch sagen, wo ihr wart."' } ],
      [ { speaker:'T-FLON14', text:'„Wenn ihr unsicher seid: das Protokoll hat mitgeschrieben."' } ],
    ],
    route: [
      [ { speaker:'T-FLON14', text:'„Weiter?"' } ],
      [ { speaker:'T-FLON14', text:'„Nimm die nächste Station. Der Rest kommt von selbst."' } ],
      [ { speaker:'T-FLON14', text:'„Alles gut?"' },
        { speaker:'R-3MI',  text:'„Ja."' },
        { speaker:'T-FLON14', text:'„Dann weiter."' } ],
    ],
  };
  function coachLines() {
    const pool = COACH[S.hints.active] || COACH.route;
    const i = S.coach++ % pool.length;
    return pool[i];
  }

  // ═══════════════════════════════════════════════════════════════
  // HINTS — one shared 3-step ladder per station.
  // Observation → relationship → method, three voices, one budget, so
  // asking everybody does not multiply the help.
  // ═══════════════════════════════════════════════════════════════
  const HINTS = {
    gallery: [
      { r:{ t:'„Da sind vier Bündel und nur eins geht dahin, wo wir hinwollen. Glaube ich. Steht aber dran."' },
        v:{ t:'"Not all of these keys belong to the same conduit set."', s:'Nicht alle Tasten gehören zum selben Leitungssatz.' },
        g:{ t:'„Schau, wohin die Bündel laufen. Eins davon geht voraus."' } },
      { r:{ t:'„Eins bis fünf. Und die Vier… ich meine, irgendeine Nummer fehlt an der Wand."' },
        v:{ t:'"Which marking follows the same conduits forward — and is any section of it missing?"', s:'Welche Markierung folgt denselben Leitungen nach vorn — und fehlt davon ein Abschnitt?' },
        g:{ t:'„Zählt die Abschnitte durch. Wenn einer fehlt, steht der Ersatz an der Wand geschrieben."' } },
      { r:{ t:'„Also: alle vom richtigen Bündel, plus den einen komischen Ersatzschalter. Dann Hebel."' },
        v:{ t:'"Latch only the keys whose sections run through to the remote relay — the patched bypass counts as one of them."', s:'Raste nur die Tasten ein, deren Abschnitte bis zum Fernrelais durchlaufen — die Brücke zählt als einer davon.' },
        g:{ t:'„Nimm nur die Tasten, deren Abschnitte bis zum Fernrelais durchlaufen. Die Brücke gehört dazu."' } },
    ],
    supply: [
      { r:{ t:'„Alles blinkt rot. Ich mag das nicht. Aber »kaputt« und »im Weg« ist nicht dasselbe, oder?"' },
        v:{ t:'"Not every red indicator blocks the crossing."', s:'Nicht jede rote Anzeige blockiert den Übergang.' },
        g:{ t:'„Nicht alles hier ist wirklich kaputt."' } },
      { r:{ t:'„Beleuchtung. Heizung. Bei elf Grad. Für einen Steg, über den wir zehn Sekunden laufen."' },
        v:{ t:'"The schema lists three conditions. Anything not on that list cannot be holding the crossing."', s:'Das Schema nennt drei Bedingungen. Was nicht darauf steht, kann den Übergang nicht aufhalten.' },
        g:{ t:'„Welche Teile bewegen die Plattform tatsächlich?"' } },
      { r:{ t:'„Und das Stellwerk kriegt gar keinen Druck. Da steht Handbetrieb. Also… Hand."' },
        v:{ t:'"Supply only what the crossing cannot close without, and crank what has no pressure line at all."', s:'Versorg nur, ohne was der Übergang nicht schließen kann, und kurbel, was gar keinen Druckanschluss hat.' },
        g:{ t:'„Versorg nur die Teile, ohne die der Weg nicht schließen kann. Den Rest der Reihe nach von Hand."' } },
    ],
    marker: [
      { r:{ t:'„Fünf Schilder. Ich hab auf dem Weg hierher ungefähr zwanzig gesehen und keins beachtet. Klassisch."' },
        v:{ t:'"You have seen these plates many times already."', s:'Du hast diese Schilder schon oft gesehen.' },
        g:{ t:'„Du hast diese Schilder schon öfter gesehen."' } },
      { r:{ t:'„Eine ist… anders gebaut? Nicht anders beschriftet. Anders GEBAUT."' },
        v:{ t:'"One of them does not follow the same construction."', s:'Eines folgt nicht derselben Bauweise.' },
        g:{ t:'„Eine ist nicht so gemacht wie die anderen."' } },
      { r:{ t:'„Rand, Schrauben, Code, Pfeil, Kerbe. Eins davon passt nicht."' },
        v:{ t:'"Compare border, fastening, station code, arrow and the notch. Exactly one differs."', s:'Vergleich Rand, Befestigung, Stationscode, Pfeil und Kerbe. Genau eines weicht ab.' },
        g:{ t:'„Vergleich Rand, Befestigung und Stationscode."' } },
    ],
    terminal: [
      { r:{ t:'„Da stehen lauter Wege, die wir nie gesehen haben. Die können wir schlecht abnehmen."' },
        v:{ t:'"The map shows nothing you have not walked."', s:'Die Karte zeigt nichts, was du nicht schon gelaufen bist.' },
        g:{ t:'„Die Karte zeigt nichts, was ihr nicht gelaufen seid."' } },
      { r:{ t:'„Der Steg zum Beispiel. Den gäb\'s ohne uns gar nicht."' },
        v:{ t:'"Which connection was actually usable when you came through it?"', s:'Welche Verbindung war tatsächlich benutzbar, als du durchgekommen bist?' },
        g:{ t:'„Welche Verbindung war tatsächlich benutzbar?"' } },
      { r:{ t:'„Und das Ding von der falschen Platte gehört nirgends dazu. Das lassen wir raus."' },
        v:{ t:'"Confirm the sections this unit inspected, and exclude the foreign marking from the route."', s:'Bestätige die Abschnitte, die diese Einheit geprüft hat, und lass die Fremdmarkierung aus der Trasse heraus.' },
        g:{ t:'„Schau ins Streckenprotokoll und bestätige nur die stabile Trasse."' } },
    ],
  };

  function useHint(who) {
    const ladder = HINTS[S.hints.active];
    if (!ladder) { say(coachLines()); return; }
    if (S.hints.step >= HINT_MAX) {
      if (who === 'guest') { say(coachLines()); return; }
      say([ who === 'r3mi'
        ? { speaker:'R-3MI', text:'„Mehr hab ich nicht. Frag sie, die hat immer noch was."' }
        : { speaker:'V-TGM', text:'"That is all I have."', subtitle:'Mehr habe ich nicht.' } ]);
      return;
    }
    const step = ladder[S.hints.step];
    S.hints.step++;
    updateHintBar();
    const e = who === 'r3mi' ? step.r : who === 'vtgm' ? step.v : step.g;
    const speaker = who === 'r3mi' ? 'R-3MI' : who === 'vtgm' ? 'V-TGM' : 'T-FLON14';
    say([{ speaker, text: e.t, subtitle: e.s }]);
  }

  function updateHintBar() {
    const left = Math.max(0, HINT_MAX - S.hints.step);
    const c = el('hintCount');
    if (c) c.textContent = `HINWEISE: ${left} VERFÜGBAR`;
    const done = left <= 0;
    ['hintBtnR3MI', 'hintBtnVTGM'].forEach(id => { const b = el(id); if (b) b.disabled = done; });
    const g = el('hintBtnGuest');
    if (g) { g.disabled = false; g.title = done ? 'Praktische Hilfe' : 'Hinweis'; }
  }

  /** Take the hint buttons off the scaffold's per-speaker budget and onto the
   *  project's shared ladder. Cloning drops the scaffold listeners cleanly. */
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
  // STATION PANEL
  // ═══════════════════════════════════════════════════════════════
  const STATION_META = {
    gallery:  { label:'14-E // SCHALTGALERIE', title:'FERNRELAIS', sub:'LEITUNG SCHLIESSEN' },
    supply:   { label:'14-G // VERSORGUNG',    title:'ÜBERGANG',   sub:'NUR DAS NÖTIGE VERSORGEN' },
    marker:   { label:'14-H // MARKIERUNG',    title:'ROUTENPLATTEN', sub:'VIER GEHÖREN ZUR STRECKE' },
    terminal: { label:'14-I // STRECKENENDE',  title:'STRECKENABNAHME', sub:'ABSCHNITTE BESTÄTIGEN' },
  };

  function openStation(key) {
    if (openModal) closeModal();
    if (!inst[key]) {
      inst[key] = key === 'gallery' ? buildGallery()
                : key === 'supply'  ? buildSupply()
                : key === 'marker'  ? buildMarkers() : buildTerminal();
    }
    openModal = key;
    S.hints.active = key;
    S.hints.step = 0;
    updateHintBar();
    CH.showHintBar(true);

    const m = STATION_META[key];
    el('stLabel').textContent = m.label;
    el('stTitle').textContent = m.title;
    el('stSub').textContent   = m.sub;
    el('stModal').classList.remove('hidden');
    render();
  }

  function closeModal() {
    clearTimers();
    openModal = null;
    S.hints.active = null;
    el('stModal')?.classList.add('hidden');
    CH.showHintBar(false);
  }

  function setStatus(text, type) {
    const s = el('stStatus');
    if (!s) return;
    s.textContent = text;
    s.className = 'puzzle-status sys-text' + (type ? ' ' + type : '');
  }

  function render() {
    if (!openModal) return;
    const body = el('stBody'), acts = el('stActions');
    if (openModal === 'gallery') {
      body.innerHTML = renderGallery();
      acts.innerHTML = `<button class="ka-btn primary" data-act="sg-commit">[ SAMMELSCHALTER ]</button>
                        <button class="ka-btn small" data-act="sg-clear">[ ALLE LÖSEN ]</button>
                        <button class="ka-btn small" data-act="close">[ ZURÜCK ]</button>`;
    } else if (openModal === 'supply') {
      body.innerHTML = renderSupply();
      acts.innerHTML = `<button class="ka-btn primary" data-act="vg-commit">[ ÜBERGANG FREIGEBEN ]</button>
                        <button class="ka-btn small" data-act="vg-clear">[ ZURÜCKSETZEN ]</button>
                        <button class="ka-btn small" data-act="close">[ ZURÜCK ]</button>`;
    } else if (openModal === 'marker') {
      body.innerHTML = renderMarkers();
      acts.innerHTML = `<button class="ka-btn small" data-act="close">[ ZURÜCK ]</button>`;
    } else {
      body.innerHTML = renderTerminal();
      acts.innerHTML = `<button class="ka-btn primary" data-act="tm-commit">[ TRASSE ZERTIFIZIEREN ]</button>
                        <button class="ka-btn small" data-act="tm-clear">[ ZURÜCKSETZEN ]</button>
                        <button class="ka-btn small" data-act="close">[ ZURÜCK ]</button>`;
    }
  }

  function onPanelClick(ev) {
    const btn = ev.target.closest('[data-act]');
    if (!btn || btn.disabled) return;
    const act = btn.dataset.act;
    if (act === 'close') { closeModal(); return; }
    if (busy) return;

    switch (act) {
      case 'sg-key':    galleryKey(btn.dataset.id); break;
      case 'sg-clear':  inst.gallery.latched.clear(); setStatus('ALLE SCHALTER GELÖST.', ''); render(); break;
      case 'sg-commit': galleryCommit(); break;

      case 'vg-sup':    supplyToggle(btn.dataset.id); break;
      case 'vg-crank':  supplyCrank(); break;
      case 'vg-clear':  inst.supply.supplied.clear(); setStatus('VERSORGUNG ZURÜCKGENOMMEN. DIE KURBEL BLEIBT.', ''); render(); break;
      case 'vg-commit': supplyCommit(); break;

      case 'mk-pick':   markerPick(+btn.dataset.i); break;

      case 'tm-pick':   inst.terminal.choice[btn.dataset.seg] = btn.dataset.val; setStatus('', ''); render(); break;
      case 'tm-clear':  inst.terminal.choice = {}; setStatus('EINGABE GELEERT.', ''); render(); break;
      case 'tm-commit': terminalCommit(); break;
    }
  }

  // ── 14-E interactions ────────────────────────────────────────
  function galleryKey(id) {
    const g = inst.gallery;
    if (g.latched.has(id)) g.latched.delete(id); else g.latched.add(id);
    playSound('ch5_key.mp3');
    tone({ freq: 240, type:'square', dur: 0.05, vol: 0.05 });
    setStatus('', '');
    render();
    // Poking at the wall is supposed to do something. Each gag fires once,
    // never blocks, and never touches progression state.
    const gag = g.gags[id];
    if (gag && g.latched.has(id) && !S.gags[gag]) {
      S.gags[gag] = true;
      save();
      playSound('ch5_gag.mp3');
      say(GAGS[gag]);
    }
  }

  function galleryCommit() {
    const g = inst.gallery;
    if (!g.latched.size) { setStatus('KEIN SCHALTER EINGERASTET.', 'warn'); return; }
    if (sameSet(g.latched, g.answer)) { gallerySolved(); return; }
    g.tries++;
    const extraLocal = [...g.latched].some(id => g.role[id[0]] === 'local');
    const missing    = [...g.answer].filter(id => !g.latched.has(id)).length;
    setStatus(missing ? 'LEITUNG NICHT GESCHLOSSEN. FERNRELAIS BLEIBT AUS.'
                      : 'ZU VIELE ABSCHNITTE AUF DER LEITUNG.', 'error');
    tone({ freq: 130, type:'sawtooth', dur: 0.18, vol: 0.06 });
    if (g.tries % 2 === 1) {
      say(extraLocal
        ? [ { speaker:'SYSTEM', text:'Irgendwo in der Galerie klackt etwas und hört sofort wieder auf.' },
            { speaker:'T-FLON14', text:'„Das war hier. Nicht vorn."' } ]
        : [ { speaker:'T-FLON14', text:'„Nicht ganz."' },
            { speaker:'SYSTEM', text:'Pause.' },
            { speaker:'T-FLON14', text:'„Nochmal."' } ]);
    }
  }

  function gallerySolved() {
    if (S.relay) return;
    S.relay = true;
    inst.gallery = null;
    save();
    logAdd('14-E // SCHALTGALERIE', 'FERNRELAIS 14-G AKTIV.');
    closeModal();
    playSound('ch5_relay.mp3');
    tone({ freq: 90, type:'sine', dur: 1.4, vol: 0.12, glideTo: 190 });
    try { GameEngine.fx.flash('rgba(54,184,232,0.18)'); } catch (_) {}
    enterGallery();
    say([
      { speaker:'SYSTEM', text:'14-E // FERNRELAIS AKTIV' },
      { speaker:'SYSTEM', text:'Die Wand quittiert mit einem einzelnen, sehr zufriedenen Klacken.' },
      { speaker:'SYSTEM', text:'Dann, aus großer Tiefe, weit vor euch:' },
      { speaker:'SYSTEM', text:'THUMM…' },
      { speaker:'SYSTEM', text:'…KLONK.' },
      { speaker:'R-3MI',  text:'„Das war nicht hier."' },
      { speaker:'T-FLON14', text:'„Das war 14-G."' },
      { speaker:'R-3MI',  text:'„Wir sind noch nicht bei 14-G."' },
      { speaker:'T-FLON14', text:'„Jetzt ist es wenigstens an."' },
      { speaker:'SYSTEM', text:'Sie hängt den Prüfhaken ein und geht los, ohne zu fragen, ob ihr mitkommt.' },
    ]);
  }

  // ── 14-G interactions ────────────────────────────────────────
  function supplyToggle(id) {
    const s = inst.supply;
    if (s.supplied.has(id)) s.supplied.delete(id);
    else {
      const row = s.rows.find(r => r.id === id);
      if (!row || supplyUsed() + row.cost > s.budget) return;
      s.supplied.add(id);
    }
    playSound('ch5_valve.mp3');
    setStatus('', '');
    render();
  }

  function supplyCrank() {
    const s = inst.supply;
    if (s.cranked) return;
    s.cranked = true;
    playSound('ch5_crank.mp3');
    setStatus('GEGENANKER VON HAND AUSGERICHTET.', 'ok');
    render();
    say([
      { speaker:'SYSTEM', text:'Die Handkurbel geht schwer. Nach einer halben Minute rastet der Gegenanker hörbar ein.' },
      { speaker:'R-3MI',  text:'„Warum geht das nicht einfach so?"' },
      { speaker:'T-FLON14', text:'„Weil das Bauteil fehlt."' },
      { speaker:'R-3MI',  text:'„Und warum hast DU nicht gekurbelt?"' },
      { speaker:'T-FLON14', text:'„Ich hab das Fernrelais gemacht."' },
    ]);
  }

  function supplyCommit() {
    const s = inst.supply;
    const need = new Set(s.rows.filter(r => r.need).map(r => r.id));
    if (!s.cranked) {
      s.tries++;
      setStatus('GEGENANKER NICHT AUSGERICHTET. PLATTFORM BLEIBT STEHEN.', 'error');
      failSupply(s);
      return;
    }
    if (!sameSet(s.supplied, need)) {
      s.tries++;
      const missingExtend = s.rows.some(r => r.role === 'extend' && !s.supplied.has(r.id));
      const missingLock   = s.rows.some(r => r.role === 'lock'   && !s.supplied.has(r.id));
      setStatus(missingExtend ? 'PLATTFORM FÄHRT NICHT AUS. KEIN DRUCK AUF DER HYDRAULIK.'
              : missingLock   ? 'PLATTFORM FÄHRT AUS — OHNE VERRIEGELUNG. ABBRUCH.'
                              : 'DRUCK FALSCH VERTEILT. ÜBERGANG SCHLIESST NICHT.', 'error');
      failSupply(s);
      return;
    }
    supplySolved();
  }

  function failSupply(s) {
    tone({ freq: 120, type:'sawtooth', dur: 0.22, vol: 0.07 });
    if (s.tries % 2 === 1) {
      say([
        { speaker:'R-3MI', text:'„Okay. Das war—"' },
        { speaker:'T-FLON14', text:'„Ein Versuch."' },
        { speaker:'SYSTEM', text:'Pause.' },
        { speaker:'T-FLON14', text:'„Der Druck reicht für das, was der Übergang braucht. Nicht für alles, was leuchtet."' },
      ]);
    }
  }

  function supplySolved() {
    if (S.crossing) return;
    S.crossing = true;
    inst.supply = null;
    save();
    logAdd('14-G // VERSORGUNG', 'ÜBERGANG STABIL.');
    closeModal();
    playSound('ch5_bridge.mp3');
    tone({ freq: 140, type:'sine', dur: 1.2, vol: 0.11, glideTo: 300 });
    try { GameEngine.fx.flash('rgba(54,184,232,0.2)'); } catch (_) {}
    enterSupply();
    say([
      { speaker:'SYSTEM', text:'Druck läuft auf die Leitungen. Der Wartungssteg fährt aus der Nische, kommt am Gegenanker an und verriegelt.' },
      { speaker:'SYSTEM', text:'14-G // ÜBERGANG STABIL.' },
      { speaker:'T-FLON14', text:'„Passt."' },
      { speaker:'R-3MI',  text:'„Das Lauflicht ist immer noch aus."' },
      { speaker:'T-FLON14', text:'„Mhm."' },
      { speaker:'R-3MI',  text:'„Stört dich das nicht?"' },
      { speaker:'T-FLON14', text:'„Wir sehen ja was."' },
    ]);
  }

  // ── 14-H interactions ────────────────────────────────────────
  function markerPick(i) {
    const m = inst.marker;
    if (i !== m.bad) {
      m.tries++;
      setStatus('DIESE PLATTE FOLGT DER BAUWEISE.', 'warn');
      if (m.tries % 2 === 1) say([{ speaker:'T-FLON14', text:'„Die ist in Ordnung."' }]);
      return;
    }
    if (S.marker) return;
    S.marker = true;
    inst.marker = null;
    save();
    closeModal();
    playSound('ch5_plate.mp3');
    enterMarker();
    say([
      { speaker:'SYSTEM', text:'Die Platte kommt zu leicht aus der Halterung. Sie ist nicht in der Werkstatt entstanden, in der die anderen entstanden sind.' },
      { speaker:'T-FLON14', text:'„Die."' },
      { speaker:'R-3MI',  text:'„Und was heißt das?"' },
      { speaker:'T-FLON14', text:'„Dass jemand eine Strecke markiert hat, die es nicht gibt."' },
      { speaker:'SYSTEM', text:'Hinter der Platte ist die Wand nicht durchgehend.' },
    ]);
  }

  // ── 14-I interactions ────────────────────────────────────────
  function terminalCommit() {
    const t = inst.terminal;
    if (t.segs.some(s => !t.choice[s.id])) { setStatus('ES FEHLEN NOCH ABSCHNITTE.', 'warn'); return; }
    const ok = t.segs.every(s => t.choice[s.id] === s.ok);
    if (!ok) {
      t.tries++;
      setStatus('TRASSE NICHT DURCHGÄNGIG. ABSCHNITTE PRÜFEN.', 'error');
      tone({ freq: 125, type:'sawtooth', dur: 0.2, vol: 0.07 });
      if (t.tries % 2 === 1) {
        say([
          { speaker:'T-FLON14', text:'„Einer davon stimmt nicht."' },
          { speaker:'R-3MI',  text:'„Welcher?"' },
          { speaker:'T-FLON14', text:'„Der, den ihr nicht gelaufen seid."' },
        ]);
      }
      return;
    }
    finaleRoute();
  }

  // ═══════════════════════════════════════════════════════════════
  // FINALE — the line comes up behind them, station by station
  // ═══════════════════════════════════════════════════════════════
  function finaleRoute() {
    if (S.ended) return;
    // Persist before any narration runs.
    try { GameEngine.state.markChapterComplete(CHAPTER_ID); } catch (_) {}
    inst.terminal = null;
    closeModal();
    logAdd('14-I // STRECKENENDE', 'TRASSE 14-D → 14-I ABGENOMMEN.');
    CH.setScene('route-live');
    CH.setProgress(68);
    playSound('ch5_route_up.mp3');

    const ov = el('routeUp');
    const seq = ['14-H', '14-G', '14-F', '14-E', '14-D'];
    el('ruList').innerHTML = seq.map(s => `<li data-node="${s}"><span class="ru-dot"></span>${s}</li>`).join('');
    ov.classList.remove('hidden');
    requestAnimationFrame(() => ov.classList.add('visible'));

    const step = reduceMotion() ? 90 : 520;
    seq.forEach((s, i) => later(() => {
      ov.querySelector(`[data-node="${s}"]`)?.classList.add('lit');
      tone({ freq: 220 + i * 40, type:'sine', dur: 0.22, vol: 0.07 });
    }, 400 + i * step));

    later(() => {
      ov.classList.remove('visible');
      setTimeout(() => ov.classList.add('hidden'), 320);
      afterRoute();
    }, 400 + seq.length * step + 900);
  }

  function afterRoute() {
    say([
      { speaker:'SYSTEM', text:'ROUTE 14 // LANGSTRECKE 05' },
      { speaker:'SYSTEM', text:'14-D → 14-I · STRECKE STABIL. SYNCHRONISIERT.' },
      { speaker:'SYSTEM', text:'Hinter euch geht die Strecke an. Nicht auf einmal — nacheinander, Station für Station, den ganzen Weg zurück durch die Katakomben, den ihr gerade gelaufen seid.' },
      { speaker:'R-3MI',  text:'„Das war\'s?"' },
      { speaker:'T-FLON14', text:'„Das war\'s."' },
      { speaker:'R-3MI',  text:'„Es fühlte sich nach zwölf Stationen an."' },
      { speaker:'T-FLON14', text:'„Sechs."' },
      { speaker:'R-3MI',  text:'„Ich bleibe bei zwölf."' },
      { speaker:'SYSTEM', text:'WEITERE ABSCHNITTE WARTEN AUF PRÜFUNG.' },
      { speaker:'R-3MI',  text:'„Du kommst also nicht mit."' },
      { speaker:'SYSTEM', text:'T-FLON14 dreht sich schon zu einem Gang, der in die andere Richtung geht.' },
      { speaker:'T-FLON14', text:'„Hab Strecke."' },
      { speaker:'SYSTEM', text:'Ein paar Schritte weiter bleibt sie noch einmal stehen.' },
      { speaker:'T-FLON14', text:'„Passt auf euch auf."' },
      { speaker:'SYSTEM', text:'Dann ist sie um die Ecke, und man hört sie noch eine ganze Weile.' },
    ], finishChapter);
  }

  function finishChapter() {
    if (S.ended) return;
    S.ended = true;
    S.beat = 'done';
    clearSave();
    CH.showHintBar(false);
    el('logToggle')?.classList.add('hidden');
    el('routeTag')?.classList.add('hidden');
    CH.complete();
  }

  // ═══════════════════════════════════════════════════════════════
  // BUILD + INIT
  // ═══════════════════════════════════════════════════════════════
  function buildChapter() {
    CH.build({
      title: 'KA-II // Kapitel 5 — Langstrecke',
      num: '05',
      sector: 'LANGSTRECKE',
      reactPct: 51,
      name: 'Langstrecke',
      subline: '„Eine Station nach der anderen."',
      emblemDeco: '<div class="ch5-route"><i></i><i></i><i></i></div>',
      scene: { ph: 'route-entry' },
      guest: { key: 'tflon', name: 'T-FLON14' },
      modals: ['stModal'],
      completeId: CHAPTER_ID,
      completeAch: 'ch5_complete',
      next: { title: 'SEKTOR 06 FREIGEGEBEN', label: 'VERSUCHSKAMMER',
              href: '../chapter6/chapter6.html', enter: 'EINTRETEN' },
      onStart: beginOrResume,
      onRobot: clickRobot,
    });
  }


  // ─── CHAPTER ART ──────────────────────────────────────────────
  // Old maintenance catacombs. Damp stone, tired metal, and route
  // plates that have outlived everyone who read them.
  const CH5_ART = {
    // an enamelled route board at the mouth of the line
    c5_routeboard: { vb:'0 0 110 84', art:
      '<rect class="prop-base" x="5" y="6" width="100" height="70" rx="3"/>'
    + '<rect class="prop-metal" x="11" y="12" width="88" height="58"/>'
    + '<rect class="prop-lite" x="11" y="12" width="88" height="2.4"/>'
    + '<rect class="prop-acc-dim" x="19" y="20" width="60" height="6"/>'
    + [0,1,2,3,4].map(i => `<rect class="prop-acc-dim" x="19" y="${34 + i*7}" width="${34 - i*3}" height="3" opacity="${i<3?0.3:0.55}"/>`
                          + (i<3 ? `<line class="prop-acc" x1="17" y1="${35.5 + i*7}" x2="${55 - i*3}" y2="${35.5 + i*7}" stroke-width="1.4" opacity=".8"/>` : '')).join('')
    + '<circle class="prop-inset" cx="9" cy="10" r="2"/><circle class="prop-inset" cx="101" cy="10" r="2"/>'
    + '<circle class="prop-inset" cx="9" cy="72" r="2"/><circle class="prop-inset" cx="101" cy="72" r="2"/>'
    + '<path class="prop-thin" d="M84 60 l6 6 l-6 6" opacity=".5"/>' },

    // a corridor mouth receding into the dark
    c5_passage: { vb:'0 0 100 120', art:
      '<path class="prop-base" d="M8 118 V34 q42 -30 84 0 v84 Z"/>'
    + '<path class="prop-inset" d="M18 118 V40 q32 -22 64 0 v78 Z"/>'
    + '<path class="prop-thin" d="M30 118 V50 q20 -13 40 0 v68 Z" opacity=".45"/>'
    + '<path class="prop-thin" d="M42 118 V62 q8 -6 16 0 v56 Z" opacity=".28"/>'
    + '<rect class="prop-metal" x="6" y="30" width="88" height="6" rx="2"/>'
    + '<circle class="prop-led" cx="14" cy="46" r="2.2"/>'
    + '<circle class="prop-led-3" cx="86" cy="46" r="2.2"/>'
    + '<path class="prop-glow" d="M40 118 q10 -26 20 0 Z" opacity=".35"/>' },

    // a ROUTE 14 marker plate — double border, four bolts, a notch
    c5_marker: { vb:'0 0 90 68', art:
      '<rect class="prop-base" x="4" y="4" width="82" height="60" rx="2"/>'
    + '<rect class="prop-metal" x="9" y="9" width="72" height="50"/>'
    + '<rect class="prop-inset" x="13" y="13" width="64" height="42"/>'
    + '<rect class="prop-acc-dim" x="22" y="24" width="34" height="8"/>'
    + '<path class="prop-acc" d="M62 28 l8 6 l-8 6 Z" opacity=".85"/>'
    + '<circle class="prop-lite" cx="13" cy="13" r="2.6"/><circle class="prop-lite" cx="77" cy="13" r="2.6"/>'
    + '<circle class="prop-lite" cx="13" cy="55" r="2.6"/><circle class="prop-lite" cx="77" cy="55" r="2.6"/>'
    + '<path class="prop-inset" d="M86 64 l-8 0 l8 -8 Z"/>' },

    // the maintenance hatch back onto the live line
    c5_hatch: { vb:'0 0 60 140', art:
      '<rect class="prop-metal" x="8" y="0" width="7" height="140" rx="2"/>'
    + '<rect class="prop-metal" x="45" y="0" width="7" height="140" rx="2"/>'
    + '<rect class="prop-lite" x="8" y="0" width="2.4" height="140"/>'
    + [0,1,2,3,4].map(i => `<rect class="prop-metal" x="8" y="${16 + i*28}" width="44" height="5" rx="2"/>`).join('')
    + '<circle class="prop-base" cx="30" cy="72" r="10"/>'
    + '<circle class="prop-edge" cx="30" cy="72" r="6"/>'
    + '<line class="prop-edge" x1="30" y1="66" x2="30" y2="78"/>' },

    // the switch gallery wall
    c5_gallery: { vb:'0 0 110 90', art:
      '<rect class="prop-base" x="4" y="4" width="102" height="82" rx="4"/>'
    + '<rect class="prop-lite" x="9" y="8" width="92" height="3" rx="1.5"/>'
    + [0,1,2].map(r => [0,1,2,3].map(c => `<rect class="prop-metal" x="${13 + c*23}" y="${18 + r*22}" width="17" height="16" rx="2"/>`
                          + `<circle class="prop-led${(r+c)%3 ? '-'+(((r+c)%3)+1) : ''}" cx="${21.5 + c*23}" cy="${26 + r*22}" r="2.6"/>`).join('')).join('')
    + '<rect class="prop-acc-dim" x="9" y="82" width="92" height="2"/>' },

    // the descent lift
    c5_lift: { vb:'0 0 100 100', art:
      '<rect class="prop-base" x="6" y="6" width="88" height="88" rx="4"/>'
    + '<rect class="prop-inset" x="14" y="14" width="72" height="60"/>'
    + '<rect class="prop-metal" x="18" y="18" width="64" height="8" rx="2"/>'
    + '<path class="prop-thin" d="M30 34 v30 M50 34 v30 M70 34 v30" opacity=".5"/>'
    + '<path class="prop-acc" d="M50 40 l-9 12 h18 Z" opacity=".8"/>'
    + '<path class="prop-acc-dim" d="M50 66 l-9 -12 h18 Z" opacity=".5"/>'
    + '<rect class="prop-base" x="18" y="80" width="64" height="8" rx="2"/>'
    + '<circle class="prop-led" cx="88" cy="12" r="2.4"/>' },

    // a wall niche someone used to sit in
    c5_niche: { vb:'0 0 90 80', art:
      '<rect class="prop-base" x="4" y="4" width="82" height="72" rx="3"/>'
    + '<path class="prop-inset" d="M12 72 V26 q33 -14 66 0 v46 Z"/>'
    + '<rect class="prop-metal" x="26" y="50" width="34" height="5" rx="2"/>'
    + '<rect class="prop-metal" x="29" y="55" width="4" height="16"/>'
    + '<rect class="prop-metal" x="53" y="55" width="4" height="16"/>'
    + '<circle class="prop-inset" cx="68" cy="36" r="4"/>'
    + [0,1,2,3].map(i => `<line class="prop-thin" x1="${20 + i*3}" y1="42" x2="${20 + i*3}" y2="52" opacity=".55"/>`).join('') },

    // the supply desk at the crossing
    c5_supply: { vb:'0 0 130 90', art:
      '<ellipse class="prop-inset" cx="65" cy="84" rx="52" ry="5" opacity=".6"/>'
    + '<path class="prop-base" d="M14 82 L28 26 h74 l14 56 Z"/>'
    + '<path class="prop-metal" d="M28 26 h74 l6 18 H22 Z"/>'
    + '<rect class="prop-lite" x="28" y="26" width="74" height="2.6"/>'
    + [0,1,2].map(i => `<circle class="prop-led${i?'-'+(i+1):''}" cx="${40 + i*22}" cy="58" r="3.4"/>`).join('')
    + '<rect class="prop-acc-dim" x="76" y="54" width="30" height="8" rx="3"/>'
    + '<rect class="prop-acc" x="88" y="51" width="6" height="14" rx="2"/>'
    + '<line class="prop-thin" x1="26" y1="70" x2="110" y2="70"/>' },

    // the maintenance bridge, once it exists
    c5_bridge: { vb:'0 0 160 70', art:
      '<rect class="prop-metal" x="4" y="26" width="152" height="7" rx="2"/>'
    + '<rect class="prop-lite" x="4" y="26" width="152" height="2.4" rx="1"/>'
    + '<rect class="prop-metal" x="4" y="46" width="152" height="5" rx="2"/>'
    + [0,1,2,3].map(i => `<rect class="prop-base" x="${12 + i*45}" y="28" width="6" height="34" rx="2"/>`).join('')
    + [0,1,2,3,4,5,6].map(i => `<line class="prop-thin" x1="${14 + i*21}" y1="33" x2="${14 + i*21}" y2="46" opacity=".5"/>`).join('')
    + '<circle class="prop-led" cx="8" cy="22" r="2.4"/>'
    + '<circle class="prop-led-3" cx="152" cy="22" r="2.4"/>' },

    // the marker wall at 14-H
    c5_markerwall: { vb:'0 0 130 80', art:
      '<rect class="prop-inset" x="0" y="0" width="130" height="80"/>'
    + [0,1,2,3,4].map(i => `<rect class="prop-base" x="${6 + i*25}" y="20" width="20" height="30" rx="2"/>`
                          + `<rect class="prop-metal" x="${9 + i*25}" y="23" width="14" height="24"/>`
                          + `<rect class="prop-acc-dim" x="${11 + i*25}" y="30" width="10" height="4"/>`
                          + `<circle class="prop-lite" cx="${10 + i*25}" cy="24" r="1.4"/>`
                          + `<circle class="prop-lite" cx="${22 + i*25}" cy="24" r="1.4"/>`).join('')
    + '<line class="prop-thin" x1="0" y1="58" x2="130" y2="58" opacity=".4"/>' },

    // a foreign housing behind a plate
    c5_foreign: { vb:'0 0 100 80', art:
      '<ellipse class="prop-inset" cx="50" cy="74" rx="38" ry="5" opacity=".6"/>'
    + '<rect class="prop-metal" x="14" y="20" width="72" height="50" rx="3"/>'
    + '<rect class="prop-lite" x="14" y="20" width="72" height="3" rx="1.5"/>'
    + '<rect class="prop-inset" x="22" y="30" width="56" height="4" opacity=".5"/>'
    + '<circle class="prop-led" cx="74" cy="60" r="3"/>'
    + '<path class="prop-thin" d="M26 44 q10 -5 18 3" opacity=".5"/>' },

    // the route terminal at the end of the line
    c5_terminal: { vb:'0 0 100 120', art:
      '<ellipse class="prop-inset" cx="50" cy="112" rx="32" ry="5" opacity=".6"/>'
    + '<path class="prop-metal" d="M36 108 L40 84 h20 l4 24 Z"/>'
    + '<rect class="prop-base" x="28" y="106" width="44" height="8" rx="2"/>'
    + '<rect class="prop-base" x="6" y="6" width="88" height="74" rx="5"/>'
    + '<rect class="prop-screen" x="13" y="14" width="74" height="58"/>'
    + [0,1,2,3,4,5].map(i => `<circle class="prop-acc" cx="${20 + i*11}" cy="${30 + (i%2)*16}" r="3.2" opacity=".85"/>`
                            + (i<5 ? `<line class="prop-acc-dim" x1="${23 + i*11}" y1="${30 + (i%2)*16}" x2="${28 + i*11}" y2="${30 + ((i+1)%2)*16}" stroke-width="1.6"/>` : '')).join('')
    + '<line class="prop-scan" x1="19" y1="62" x2="66" y2="62"/>'
    + '<circle class="prop-led" cx="88" cy="76" r="2.6"/>' },
  };

  function init() {
    try { GameEngine.props.register(CH5_ART); } catch (_) {}
    if (!GameEngine.progress.require('ch5')) return;
    buildChapter();
    rebindHints();
    CH.showHintBar(false);
    el('stBody').addEventListener('click', onPanelClick);
    el('stActions').addEventListener('click', onPanelClick);
    el('logToggle').addEventListener('click', toggleLog);
    el('logClose').addEventListener('click', toggleLog);
    renderLog();
    setRouteTag();
    CH.start();
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', () => Chapter5.init());
