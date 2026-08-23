  // ─── PROGRESS INDICATOR ──────────────────────────────────────
  // Two separate numbers: how many sectors are behind the player, and how
  // much of the facility is actually running. They are not the same thing.
  function updateChapterProgress() {
    const el = document.getElementById('chapterProgress');
    if (!el || typeof GameEngine === 'undefined') return;
    const nav = chapterNav();
    if (!nav) return;
    const total = CHAPTERS.length;
    const parts = [`FORTSCHRITT: ${nav.completed.length} / ${total} KAPITEL`];
    let pct = 0;
    try { pct = GameEngine.progress.reactivationPct(); } catch (_) {}
    if (nav.completed.length) parts.push(`REAKTIVIERUNG: ${pct} %`);
    // The archive only counts once the player has heard something.
    if (nav.sigs > 0) parts.push(`FREMDSIGNALE: ${nav.sigs} / ${nav.total}`);
    el.innerHTML = parts.map(t => `<span class="tp-part">${t}</span>`).join('');
  }

/**
 * ═══════════════════════════════════════════════════════════════
 * KALIBRIERUNGSANLAGE II — TITLE SCREEN
 * Handles: boot sequence, particles, emblem symbols,
 *          glitch effects, idle R-3MI comments
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // ─── PROGRESSION STATE ────────────────────────────────────────
  // Everything on this screen adapts to how far the player has come. Before
  // Chapter 1 the facility has no crew on record, and the title must not say
  // otherwise — meeting R-3MI and V-TGM is Chapter 1's job.
  function stateOf() {
    let done = [], sigs = 0, truth = false;
    try {
      done = GameEngine.state.get('chaptersCompleted') || [];
      sigs = (GameEngine.state.get('signalsFound') || []).length;
      truth = GameEngine.state.hasFlag('truth_revealed');
    } catch (_) {}
    const has = id => done.includes(id);
    return {
      done, sigs, truth,
      metRobots: has('ch1'),
      finished:  has('ch8'),
      stage: truth ? 'POST_CH9' : has('ch8') ? 'POST_CH8' : has('ch1') ? 'MID' : 'PRE_CH1',
    };
  }

  // ─── BOOT SEQUENCE ────────────────────────────────────────────
  const BOOT_SESSION_KEY = 'ka2_session_boot_seen';

  function bootLines(st) {
    // Two lines change once the player knows who is in here.
    const crew = st.metRobots
      ? [ { text: '> Einheit R-3MI: ERFASST',              cls: 'success', delay: 1100 },
          { text: '> Einheit V-TGM: ERFASST',              cls: 'success', delay: 1300 } ]
      : [ { text: '> Mobile Einheiten: KEINE ANTWORT',     cls: 'warn',    delay: 1100 },
          { text: '> Personenregister: NICHT VERFÜGBAR',   cls: 'warn',    delay: 1300 } ];
    return [
      { text: 'KA-II BIOS v2.4.7 // TEAM_APERTURE',         cls: 'dim',     delay: 0   },
      { text: 'Systemprüfung wird gestartet…',              cls: '',        delay: 300 },
      { text: '> Speicher: 2048 MB erkannt',                cls: '',        delay: 500 },
      { text: '> Sensoreinheiten: FEHLER — nicht reagierend', cls: 'error', delay: 700 },
      { text: '> Zentralsteuerung: OFFLINE',                cls: 'error',   delay: 900 },
      ...crew,
      { text: '.',                                          cls: 'dim',     delay: 1700 },
      { text: '. .',                                        cls: 'dim',     delay: 1900 },
      { text: '. . .',                                      cls: 'dim',     delay: 2100 },
      { text: '> Notfallwiederherstellung erkannt.',        cls: 'success', delay: 2400 },
      { text: '> Reaktivierungsprotokoll geladen.',         cls: 'success', delay: 2700 },
      { text: 'WARNUNG: Anlage war abgeschaltet. Ursache: unbekannt.', cls: 'warn', delay: 3000 },
      { text: 'Starte Benutzeroberfläche…',                 cls: '',        delay: 3400 },
    ];
  }

  // The full BIOS is part of the game's personality, but only the first time
  // per browser session. Coming back to the menu gets a short resume instead,
  // and either can be cut short at any moment.
  function runBootSequence(onDone) {
    const seqEl = document.getElementById('bootSequence');
    if (!seqEl) { onDone(); return; }

    let seen = false;
    try { seen = sessionStorage.getItem(BOOT_SESSION_KEY) === '1'; } catch (_) {}
    try { sessionStorage.setItem(BOOT_SESSION_KEY, '1'); } catch (_) {}

    let reduced = false;
    try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}

    const st = stateOf();
    const lines = (seen || reduced)
      ? [ { text: 'KA-II // SITZUNG WIRD FORTGESETZT', cls: 'dim', delay: 0 },
          { text: '> Benutzeroberfläche bereit.',      cls: 'success', delay: 220 } ]
      : bootLines(st);

    const timers = [];
    let finished = false;

    const skipBtn = document.getElementById('bootSkip');
    if (skipBtn && lines.length > 2) skipBtn.classList.add('visible');

    function finish() {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      document.removeEventListener('keydown', onKey);
      seqEl.removeEventListener('click', finish);
      skipBtn?.removeEventListener('click', finish);
      seqEl.style.transition = 'opacity 0.45s ease';
      seqEl.style.opacity = '0';
      setTimeout(() => { seqEl.remove(); onDone(); }, 470);
    }
    function onKey(e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); finish(); }
    }

    let max = 0;
    lines.forEach(({ text, cls, delay }) => {
      timers.push(setTimeout(() => {
        const line = document.createElement('div');
        line.className = 'boot-line' + (cls ? ' ' + cls : '');
        line.textContent = text;
        seqEl.appendChild(line);
        requestAnimationFrame(() => requestAnimationFrame(() => line.classList.add('visible')));
      }, delay));
      max = Math.max(max, delay);
    });

    timers.push(setTimeout(() => {
      const cursor = document.createElement('span');
      cursor.className = 'boot-cursor';
      seqEl.appendChild(cursor);
    }, max + 100));

    seqEl.addEventListener('click', finish);
    skipBtn?.addEventListener('click', finish);
    document.addEventListener('keydown', onKey);
    timers.push(setTimeout(finish, max + (lines.length > 2 ? 900 : 420)));
  }

  // ─── PARTICLES ───────────────────────────────────────────────
  function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    const COUNT  = 28;
    const COLORS = [
      'rgba(46,207,98,0.25)',   // R-3MI green
      'rgba(217,51,51,0.15)',   // V-TGM red
      'rgba(58,143,212,0.2)',   // system blue
      'rgba(184,156,58,0.15)',  // amber
    ];

    for (let i = 0; i < COUNT; i++) {
      const el = document.createElement('div');
      el.className = 'particle';

      const size     = Math.random() * 3 + 1;
      const x        = Math.random() * 100;
      const dur      = Math.random() * 18 + 10;
      const delay    = Math.random() * -20;
      const drift    = (Math.random() - 0.5) * 80 + 'px';
      const color    = COLORS[Math.floor(Math.random() * COLORS.length)];
      const blur     = Math.random() > 0.6 ? '2px' : '0';

      el.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${x}%;
        bottom: -10px;
        background: ${color};
        filter: blur(${blur});
        --drift: ${drift};
        animation-duration: ${dur}s;
        animation-delay: ${delay}s;
      `;
      container.appendChild(el);
    }
  }

  // ─── EMBLEM SYMBOLS ───────────────────────────────────────────
  // Places dot · triangle · hexagon · square at 0°/90°/180°/270°
  function initEmblemSymbols() {
    const wrap = document.querySelector('.emblem-symbols');
    if (!wrap) return;

    const SYMBOLS = ['●', '▲', '⬡', '■'];
    const R = 88; // radius in px from center (half of 196 - some padding)
    const CENTER = 98;

    SYMBOLS.forEach((sym, i) => {
      const angle = (i * 90 - 45) * (Math.PI / 180); // offset by 45° so they're between corners
      const x = CENTER + R * Math.cos(angle);
      const y = CENTER + R * Math.sin(angle);

      const el = document.createElement('span');
      el.className = 'sym';
      el.textContent = sym;
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
      wrap.appendChild(el);
    });
  }

  // ─── STATUS BAR UPDATE ────────────────────────────────────────
  // The crew line only names anyone once the player has actually met them.
  function updateCrewLine() {
    const el = document.getElementById('sysCrew');
    if (!el) return;
    const st = stateOf();
    if (st.truth) {
      el.innerHTML = 'ADMINISTRATIVE EINHEITEN: '
        + '<span class="accent-r3mi">R-3MI</span>&nbsp;/&nbsp;<span class="accent-vtgm">V-TGM</span>';
    } else if (st.metRobots) {
      el.innerHTML = 'SEKTOR&nbsp;7C // '
        + '<span class="accent-r3mi">R-3MI</span>&nbsp;/&nbsp;<span class="accent-vtgm">V-TGM</span>';
    } else {
      el.innerHTML = 'MOBILE EINHEITEN: <span class="accent-warn">KEINE ANTWORT</span>';
    }
  }

  function updateStatusBar() {
    updateCrewLine();
    const statusEl = document.getElementById('sysStatus');
    if (!statusEl) return;

    // After boot: show STANDBY, then slowly come to life
    setTimeout(() => {
      statusEl.textContent = 'STANDBY';
      statusEl.className = 'blink status-standby';
    }, 200);
  }

  // ─── GLITCH EFFECT ────────────────────────────────────────────
  function initGlitch() {
    const title = document.querySelector('.main-title');
    if (!title) return;

    // Store text as data attribute for CSS pseudo-elements
    title.setAttribute('data-text', title.textContent);

    function doGlitch() {
      title.classList.add('glitching');
      setTimeout(() => title.classList.remove('glitching'), 380);
      // Schedule next glitch: random 4–14s
      setTimeout(doGlitch, 4000 + Math.random() * 10000);
    }

    // First glitch after a short delay
    setTimeout(doGlitch, 3500);
  }

  // ─── IDLE COMMENTS ───────────────────────────────────────────
  // Who speaks here depends on how much the player knows. Before Chapter 1
  // the facility talks to itself; afterwards R-3MI cannot help himself.
  const IDLE = {
    PRE_CH1: [
      ['SYSTEM', 'Keine aktive Besatzung erkannt.'],
      ['SYSTEM', 'Letzte Vollsynchronisierung: vor 2.847 Tagen.'],
      ['SYSTEM', 'Ein Teil der Anlage antwortet nicht.'],
      ['SYSTEM', 'Reaktivierungsprotokoll wartet auf autorisierte Testsignatur.'],
      ['SYSTEM', 'Umgebungstemperatur unter Sollwert. Seit längerem.'],
      ['SYSTEM', 'Personenregister: nicht verfügbar.'],
    ],
    MID: [
      ['R-3MI', '„Du hast die Seite geladen. Beeindruckend. Wirklich."'],
      ['R-3MI', '„…ich hoffe, du weißt, was du tust. Ich auch nicht, aber trotzdem."'],
      ['R-3MI', '„Klick einfach auf Weiter. Das wäre nett."'],
      ['R-3MI', '„Bitte nicht »Erfolge« anklicken. Da steht noch nichts. …fast nichts."'],
      ['V-TGM', '"He has been talking to the menu for a while now."'],
      ['R-3MI', '„V-TGM sagt, ich soll aufhören zu reden. V-TGM hat Unrecht."'],
      ['R-3MI', '„Du hast die Seite jetzt schon eine Weile offen. Interessant."'],
      ['R-3MI', '„Ich distanziere mich von allem, was gleich passiert."'],
    ],
    POST_CH8: [
      ['SYSTEM', 'REAKTIVIERUNG: 100 %.'],
      ['R-3MI', '„Hundert Prozent. Ich sag das immer noch gern."'],
      ['R-3MI', '„Gerhilde lebt. Ich werde immer noch beobachtet."'],
      ['R-3MI', '„Ich möchte offiziell keine Langstrecken mehr sehen."'],
      ['V-TGM', '"The Anlage runs. All of it."'],
      ['R-3MI', '„Die Zieldaten stehen unten. Du musst nichts nochmal spielen."'],
    ],
    POST_CH9: [
      ['R-3MI', '„Du bist noch da."'],
      ['V-TGM', '"We did not expect you to come back to the menu, of all places."'],
      ['R-3MI', '„Die Tür ist übrigens immer noch offen. In beide Richtungen."'],
      ['SYSTEM', 'ADMINISTRATIVE EINHEITEN: 02.'],
      ['R-3MI', '„…Hiii."'],
    ],
  };

  let idleQueue = [];
  let idleEl = null;
  let idleTimer = null;

  function overlayOpen() {
    return !!document.querySelector('.overlay-panel:not(.hidden)');
  }

  function showIdleComment() {
    if (!idleEl) return;
    // Nobody talks over an open panel.
    if (overlayOpen()) { idleTimer = setTimeout(showIdleComment, 6000); return; }
    if (!idleQueue.length) {
      const pool = IDLE[stateOf().stage] || IDLE.PRE_CH1;
      idleQueue = pool.slice().sort(() => Math.random() - 0.5);
    }
    const [who, text] = idleQueue.shift();
    idleEl.querySelector('.idle-comment-speaker').textContent = who;
    idleEl.dataset.who = who;
    idleEl.querySelector('.idle-comment-text').textContent = text;
    idleEl.classList.add('visible');

    idleTimer = setTimeout(() => {
      idleEl.classList.remove('visible');
      idleTimer = setTimeout(showIdleComment, 15000 + Math.random() * 10000);
    }, 7000);
  }

  function initIdleComments() {
    idleEl = document.querySelector('.idle-comment');
    if (!idleEl) return;
    idleTimer = setTimeout(showIdleComment, 12000);
  }

  // ─── REVEAL ANIMATION ────────────────────────────────────────
  function revealUI() {
    const section = document.querySelector('.hero-section');
    const menu    = document.querySelector('.title-menu');

    if (section) {
      requestAnimationFrame(() => {
        section.classList.add('revealed');
      });
    }
    if (menu) {
      setTimeout(() => menu.classList.add('revealed'), 400);
    }
  }

  // ─── PARALLAX TILT ON LOGO ───────────────────────────────────
  function initLogoParallax() {
    const logo = document.getElementById('heroLogo');
    if (!logo) return;
    logo.setAttribute('data-tilt', '');

    const MAX_TILT = 4; // degrees — subtle
    let raf = null;

    function onMove(e) {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth)  - 0.5;
        const y = (e.clientY / window.innerHeight) - 0.5;
        logo.style.setProperty('--tilt-x', (-y * MAX_TILT) + 'deg');
        logo.style.setProperty('--tilt-y', ( x * MAX_TILT) + 'deg');
      });
    }

    function onLeave() {
      logo.style.setProperty('--tilt-x', '0deg');
      logo.style.setProperty('--tilt-y', '0deg');
    }

    // Skip on touch devices
    if (matchMedia('(hover: hover)').matches) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseleave', onLeave);
    }
  }

  // ─── SECTOR MAP + CONTINUE ───────────────────────────────────
  const CHAPTERS = [
    { id:'ch0', n:'00', name:'Rückkehr',     href:'chapter0/chapter0.html' },
    { id:'ch1', n:'01', name:'Wartung',      href:'chapter1/chapter1.html' },
    { id:'ch2', n:'02', name:'Garten',       href:'chapter2/chapter2.html' },
    { id:'ch3', n:'03', name:'Beobachtung',  href:'chapter3/chapter3.html' },
    { id:'ch4', n:'04', name:'Rätsel',       href:'chapter4/chapter4.html' },
    { id:'ch5', n:'05', name:'Langstrecke',  href:'chapter5/chapter5.html' },
    { id:'ch6', n:'06', name:'Versuchskammer', href:'chapter6/chapter6.html' },
    { id:'ch7', n:'07', name:'Vexier',       href:'chapter7/chapter7.html' },
    { id:'ch8', n:'08', name:'Archiv',       href:'chapter8/chapter8.html' },
  ];

  function chapterNav() {
    if (typeof GameEngine === 'undefined') return null;
    const completed = GameEngine.state.get('chaptersCompleted') || [];
    const nextIdx   = CHAPTERS.findIndex(c => !completed.includes(c.id));
    const allDone   = nextIdx === -1;
    let sigs = 0, total = 5, allSigs = false;
    try {
      total   = GameEngine.signals.ALL.length;
      sigs    = GameEngine.progress.signalsFound();
      allSigs = GameEngine.progress.allSignals();
    } catch (_) {}
    // The unregistered route needs BOTH: the regular game finished and every
    // fragment archived. Five signals on their own reveal nothing.
    const bonus = allSigs && completed.includes('ch8');
    return { completed, nextIdx, allDone, bonus, sigs, total, allSigs };
  }

  function initContinue() {
    const btn = document.getElementById('continueBtn');
    const nav = chapterNav();
    if (!btn || !nav) return;
    if (nav.completed.length === 0) { btn.classList.add('hidden'); return; }  // fresh start → only STARTEN
    document.getElementById('startBtn')?.classList.remove('primary');        // Continue becomes the primary action
    if (!nav.allDone) {
      btn.href = CHAPTERS[nav.nextIdx].href;
      btn.textContent = `[ WEITER · KAP. ${CHAPTERS[nav.nextIdx].n} ]`;
    } else if (nav.bonus) {
      btn.href = 'chapter9/chapter9.html';
      btn.textContent = '[ ??? ]';
    } else {
      // The game is finished. Sending them back through it is not the offer —
      // the sectors are all open below, and the Zieldaten are on the page.
      btn.href = CHAPTERS[CHAPTERS.length - 1].href;
      btn.textContent = '[ SEKTOREN ERKUNDEN ]';
    }
    btn.classList.remove('hidden');
  }

  function initSectorMap() {
    const track = document.getElementById('sectorTrack');
    const cap   = document.getElementById('sectorCaption');
    const map   = document.getElementById('sectorMap');
    const nav   = chapterNav();
    if (!track || !map || !nav) return;

    track.innerHTML = '';
    CHAPTERS.forEach((c, i) => {
      const done    = nav.completed.includes(c.id);
      const current = !nav.allDone && i === nav.nextIdx;
      const locked  = !done && !current;
      const node = document.createElement(locked ? 'span' : 'a');
      node.className = 'sector-node ' + (done ? 'done' : current ? 'current' : 'locked');
      node.textContent = done ? '✓' : c.n;
      node.setAttribute('title', `Kapitel ${c.n} — ${c.name}`);
      if (!locked) node.href = c.href;
      track.appendChild(node);
    });
    if (nav.bonus) {
      const b = document.createElement('a');
      b.className = 'sector-node bonus';
      b.textContent = '?'; b.href = 'chapter9/chapter9.html';
      b.setAttribute('title', '???');
      track.appendChild(b);
    }
    if (cap) {
      cap.textContent = nav.allDone
        ? (nav.bonus ? 'ALLE SEKTOREN ONLINE · UNBEKANNTER QUERVERWEIS VERFÜGBAR' : 'ALLE SEKTOREN ONLINE')
        : `NÄCHSTER SEKTOR: ${CHAPTERS[nav.nextIdx].n} — ${CHAPTERS[nav.nextIdx].name.toUpperCase()}`;
    }
    map.classList.remove('hidden');
  }

  // ─── ZIELDATEN ───────────────────────────────────────────────
  // Once a chapter has reconstructed a set of coordinates, the terminal keeps
  // them to hand — nobody should have to replay anything to read them back.
  // Two separate sets, always labelled, never merged.
  function initZieldaten() {
    const host = document.getElementById('sectorMap');
    if (!host || typeof GameEngine === 'undefined') return;

    const sets = [];
    try {
      if (GameEngine.state.hasFlag('zieldaten')) {
        const t = GameEngine.state.get('zieldaten_text');
        if (t) sets.push({ id: 'main', label: 'ZIELDATEN', text: t });
      }
      if (GameEngine.state.hasFlag('bonuszieldaten')) {
        const t = GameEngine.state.get('bonuszieldaten_text');
        if (t) sets.push({ id: 'bonus', label: 'BONUSZIELDATEN', text: t });
      }
    } catch (_) { return; }
    if (!sets.length) return;

    const box = document.createElement('div');
    box.className = 'ziel-box';
    box.innerHTML = sets.map(z => `
      <div class="ziel-set ziel-${z.id}">
        <div class="ziel-label sys-text">${z.label}: VERFÜGBAR</div>
        <div class="ziel-value" data-for="${z.id}"></div>
        <button class="ka-btn small" data-copy="${z.id}">[ KOPIEREN ]</button>
      </div>`).join('');
    sets.forEach(z => { box.querySelector(`[data-for="${z.id}"]`).textContent = z.text; });
    host.appendChild(box);

    box.addEventListener('click', ev => {
      const btn = ev.target.closest('[data-copy]');
      if (!btn) return;
      const z = sets.find(x => x.id === btn.dataset.copy);
      if (!z) return;
      const done = ok => { btn.textContent = ok ? '[ KOPIERT ]' : '[ MARKIEREN UND KOPIEREN ]'; };
      const fallback = () => {
        try {
          const ta = document.createElement('textarea');
          ta.value = z.text; ta.setAttribute('readonly', '');
          ta.style.cssText = 'position:fixed;left:-9999px;';
          document.body.appendChild(ta); ta.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(ta);
          done(ok);
        } catch (_) { done(false); }
      };
      try { navigator.clipboard.writeText(z.text).then(() => done(true), fallback); }
      catch (_) { fallback(); }
    });
  }

  // ─── CHAPTER PROGRESS INDICATOR ──────────────────────────────
  function updateChapterProgress() {
    const progressEl = document.getElementById('chapterProgress');
    if (!progressEl || typeof GameEngine === 'undefined') return;

    const completed = GameEngine.state.get('chaptersCompleted') || [];
    const total     = 9; // chapters 0–8; the hidden bonus chapter 9 is not counted
    const pct       = Math.round((completed.length / total) * 100);

    progressEl.textContent = `FORTSCHRITT: ${completed.length}/${total} KAPITEL (${pct}%)`;
  }

  // ─── INIT ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {

    initParticles();

    // Reflect the persisted mute state on the title menu toggle.
    const at = document.getElementById('audioToggle');
    if (at && typeof GameEngine !== 'undefined' && GameEngine.audio) {
      at.textContent = GameEngine.audio.isMuted() ? '[ TON: AUS ]' : '[ TON: AN ]';
    }

    // Start the title theme (autoplay may be blocked until the first click —
    // the engine retries on the next user gesture). Placeholder until an mp3 exists.
    if (typeof GameEngine !== 'undefined' && GameEngine.music) GameEngine.music.play('title');

    // Delete-save button — two-step confirm so it can't be hit by accident.
    const wipe = document.getElementById('wipeBtn');
    if (wipe) {
      let armed = false, timer = null;
      wipe.addEventListener('click', () => {
        if (armed) {
          try { GameEngine.state.reset(); } catch (_) {}
          wipe.textContent = '[ GELÖSCHT … ]';
          setTimeout(() => location.reload(), 350);
          return;
        }
        armed = true;
        wipe.textContent = '[ WIRKLICH? NOCHMAL TIPPEN ]';
        wipe.classList.add('danger');
        clearTimeout(timer);
        timer = setTimeout(() => {
          armed = false;
          wipe.textContent = '[ SPIELSTAND LÖSCHEN ]';
          wipe.classList.remove('danger');
        }, 4000);
      });
    }

    // 100% completion: once the true ending (Chapter 9) is reached, the logo
    // glitches — a quiet sign that the facility is no longer quite right.
    if (typeof GameEngine !== 'undefined' && GameEngine.achievements && GameEngine.achievements.isUnlocked('bonus_found')) {
      document.getElementById('heroLogo')?.classList.add('logo-glitch');
      document.body.classList.add('game-complete');
    }

    runBootSequence(() => {
      revealUI();
      updateStatusBar();
      initLogoParallax();
      initIdleComments();
      updateChapterProgress();
      initContinue();
      initSectorMap();
      initZieldaten();
    });

  });

})();
