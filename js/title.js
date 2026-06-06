/**
 * ═══════════════════════════════════════════════════════════════
 * KALIBRIERUNGSANLAGE II — TITLE SCREEN
 * Handles: boot sequence, particles, emblem symbols,
 *          glitch effects, idle R-3MI comments
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // ─── BOOT SEQUENCE ────────────────────────────────────────────
  const BOOT_LINES = [
    { text: 'KA-II BIOS v2.4.7 // TEAM_APERTURE',         cls: 'dim',     delay: 0   },
    { text: 'Systemprüfung wird gestartet…',              cls: '',        delay: 300 },
    { text: '> Speicher: 2048 MB erkannt',                cls: '',        delay: 500 },
    { text: '> Sensoreinheiten: FEHLER — nicht reagierend', cls: 'error', delay: 700 },
    { text: '> Zentralsteuerung: OFFLINE',                cls: 'error',   delay: 900 },
    { text: '> Einheit R-3MI: STATUS UNBEKANNT',          cls: 'warn',    delay: 1100 },
    { text: '> Einheit V-TGM: STATUS UNBEKANNT',          cls: 'warn',    delay: 1300 },
    { text: '.',                                           cls: 'dim',     delay: 1700 },
    { text: '. .',                                         cls: 'dim',     delay: 1900 },
    { text: '. . .',                                       cls: 'dim',     delay: 2100 },
    { text: '> Notfallwiederherstellung erkannt.',         cls: 'success', delay: 2400 },
    { text: '> Reaktivierungsprotokoll geladen.',          cls: 'success', delay: 2700 },
    { text: 'WARNUNG: Anlage war abgeschaltet. Ursache: unbekannt.', cls: 'warn', delay: 3000 },
    { text: 'Starte Benutzeroberfläche…',                 cls: '',        delay: 3400 },
  ];

  function runBootSequence(onDone) {
    const seqEl = document.getElementById('bootSequence');
    if (!seqEl) { onDone(); return; }

    // Plays in full on every title-screen visit (Energy-Star nostalgia, by request).
    let max = 0;
    BOOT_LINES.forEach(({ text, cls, delay }, i) => {
      setTimeout(() => {
        const line = document.createElement('div');
        line.className = 'boot-line' + (cls ? ' ' + cls : '');
        line.textContent = text;
        seqEl.appendChild(line);
        requestAnimationFrame(() => requestAnimationFrame(() => line.classList.add('visible')));
      }, delay);
      max = Math.max(max, delay);
    });

    // Add cursor
    setTimeout(() => {
      const cursor = document.createElement('span');
      cursor.className = 'boot-cursor';
      seqEl.appendChild(cursor);
    }, max + 100);

    // Fade out boot screen
    setTimeout(() => {
      seqEl.style.transition = 'opacity 0.6s ease';
      seqEl.style.opacity = '0';
      setTimeout(() => { seqEl.remove(); onDone(); }, 640);
    }, max + 900);
  }

  // ─── PARTICLES ───────────────────────────────────────────────
  function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    const COUNT  = 28;
    const COLORS = [
      'rgba(46,207,98,0.25)',   // vtgm green
      'rgba(217,51,51,0.15)',   // r3mi red
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
  function updateStatusBar() {
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

  // ─── IDLE R-3MI COMMENTS ─────────────────────────────────────
  const IDLE_COMMENTS = [
    'Du hast die Seite geladen. Beeindruckend. Wirklich.',
    '…ich hoffe, du weißt, was du tust. Ich auch nicht, aber trotzdem.',
    'Klick einfach auf Starten. Das wäre nett.',
    'Wir haben gewartet. V-TGM wollte das nicht erwähnen, aber ich schon.',
    'Bitte nicht "Erfolge" anklicken. Da steht noch nichts. …fast nichts.',
    'Die Anlage ist offiziell nicht bewohnt. Offiziell.',
    'V-TGM sagt, ich soll aufhören zu reden. V-TGM hat Unrecht.',
    'Du hast die Seite jetzt schon eine Weile offen. Interessant.',
    'Ich distanziere mich von allem, was gleich passiert.',
  ];

  let commentIndex = 0;
  let commentEl = null;

  function showIdleComment() {
    if (!commentEl) return;
    const text  = IDLE_COMMENTS[commentIndex % IDLE_COMMENTS.length];
    commentIndex++;

    commentEl.querySelector('.idle-comment-text').textContent = text;
    commentEl.classList.add('visible');

    setTimeout(() => {
      commentEl.classList.remove('visible');
      // Next comment in 15–25s
      setTimeout(showIdleComment, 15000 + Math.random() * 10000);
    }, 7000);
  }

  function initIdleComments() {
    commentEl = document.querySelector('.idle-comment');
    if (!commentEl) return;
    // First comment after 12s idle
    setTimeout(showIdleComment, 12000);
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

  // ─── CHAPTER PROGRESS INDICATOR ──────────────────────────────
  function updateChapterProgress() {
    const progressEl = document.getElementById('chapterProgress');
    if (!progressEl || typeof GameEngine === 'undefined') return;

    const completed = GameEngine.state.get('chaptersCompleted') || [];
    const total     = 9; // chapters 0–8 (J4W-A3 sector dropped)
    const pct       = Math.round((completed.length / total) * 100);

    progressEl.textContent = `FORTSCHRITT: ${completed.length}/${total} KAPITEL (${pct}%)`;
  }

  // ─── INIT ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {

    initParticles();

    runBootSequence(() => {
      revealUI();
      updateStatusBar();
      initLogoParallax();
      initIdleComments();
      updateChapterProgress();
    });

  });

})();
