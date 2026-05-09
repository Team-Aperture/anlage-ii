/**
 * ═══════════════════════════════════════════════════════════════
 * KALIBRIERUNGSANLAGE II — GAME ENGINE v0.1.0
 * Team_Aperture
 *
 * Modules:
 *   GameEngine.state        — Save / Load / Flags / Chapters
 *   GameEngine.achievements — Achievement tracking + toast
 *   GameEngine.signals      — Signalnischen (The Transmission)
 *   GameEngine.dialogue     — Dialogue / cutscene system
 *   GameEngine.scene        — Scene + clickable hotspots
 *   GameEngine.puzzle       — Puzzle validation framework
 * ═══════════════════════════════════════════════════════════════
 */

const GameEngine = (() => {
  'use strict';

  const SAVE_KEY = 'ka2_save_v1';
  const VERSION  = '0.1.0';

  // ═══════════════════════════════════════════════════════════════
  // STATE MANAGER
  // ═══════════════════════════════════════════════════════════════
  const state = (() => {
    const defaults = {
      version:              VERSION,
      chaptersCompleted:    [],
      puzzlesSolved:        {},
      signalsFound:         [],
      achievementsUnlocked: [],
      flags:                {},
      firstPlay:            true,
    };

    let _data = null;

    function load() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        _data = raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
      } catch {
        _data = { ...defaults };
      }
    }

    function save() {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(_data)); }
      catch (e) { console.warn('[KA-II] Save failed.', e); }
    }

    function get(key)           { return _data[key]; }
    function set(key, value)    { _data[key] = value; save(); }
    function setFlag(f, v=true) { _data.flags[f] = v; save(); }
    function hasFlag(f)         { return !!_data.flags[f]; }

    function markChapterComplete(id) {
      if (!_data.chaptersCompleted.includes(id)) {
        _data.chaptersCompleted.push(id);
        save();
      }
    }

    function isChapterComplete(id) {
      return _data.chaptersCompleted.includes(id);
    }

    function markPuzzleSolved(id) {
      _data.puzzlesSolved[id] = true;
      save();
    }

    function isPuzzleSolved(id) {
      return !!_data.puzzlesSolved[id];
    }

    function reset() { _data = { ...defaults }; save(); }

    load();
    return {
      load, save, get, set, setFlag, hasFlag,
      markChapterComplete, isChapterComplete,
      markPuzzleSolved, isPuzzleSolved, reset,
    };
  })();


  // ═══════════════════════════════════════════════════════════════
  // ACHIEVEMENT SYSTEM
  // ═══════════════════════════════════════════════════════════════
  const achievements = (() => {

    const ALL = [
      { id: 'first_boot',       icon: '◈', title: 'Erstkontakt',         desc: 'Das System erwacht.' },
      { id: 'ka1_veteran',      icon: '✦', title: 'Veteran',              desc: 'Teil I wurde abgeschlossen. Du weißt, was hier passiert.' },
      { id: 'ch0_complete',     icon: '⬡', title: 'Rückkehr',            desc: 'Kapitel 0 abgeschlossen.' },
      { id: 'ch1_complete',     icon: '◉', title: 'Wartungsprotokoll',    desc: 'Kapitel 1 abgeschlossen.' },
      { id: 'ch2_complete',     icon: '❧', title: 'Gartenpflege',         desc: 'Kapitel 2 abgeschlossen.' },
      { id: 'ch3_complete',     icon: '◎', title: 'Beobachtet',           desc: 'Kapitel 3 abgeschlossen.' },
      { id: 'ch4_complete',     icon: '⊠', title: 'Kartiert',             desc: 'Kapitel 4 abgeschlossen.' },
      { id: 'ch5_complete',     icon: '▶', title: 'Beschleunigt',         desc: 'Kapitel 5 abgeschlossen.' },
      { id: 'ch6_complete',     icon: '◫', title: 'Rutschfest',           desc: 'Kapitel 6 abgeschlossen.' },
      { id: 'ch7_complete',     icon: '▣', title: 'Defragmentiert',       desc: 'Kapitel 7 abgeschlossen.' },
      { id: 'ch8_complete',     icon: '◍', title: 'Meta',                 desc: 'Kapitel 8 abgeschlossen.' },
      { id: 'ch9_complete',     icon: '✦', title: 'Reaktivierung',        desc: 'Alle Sektoren wiederhergestellt.' },
      { id: 'signal_first',     icon: '◈', title: 'Frequenz',             desc: 'Erste Signalnische entdeckt.' },
      { id: 'signal_all',       icon: '▲', title: 'Die Übertragung',      desc: 'Alle Signalnischen gefunden.' },
      { id: 'italian_brainrot', icon: '🐪', title: 'Frigo Camelo',        desc: 'F–R–I–G–O. Du weißt, was du getan hast.' },
      { id: 'jigsaw_refused',   icon: '■', title: 'Nein.',                desc: 'Das Puzzle wurde abgelehnt. Wie immer.' },
      { id: 'all_guests',       icon: '◎', title: 'Team_Aperture Extended', desc: 'Alle Gastcharaktere getroffen.' },
      { id: 'bonus_found',      icon: '?', title: '???',                  desc: '...' },
      { id: 'coordinates',      icon: '✦', title: 'Zieldaten erhalten',   desc: 'Die Koordinaten sind bereit.' },
    ];

    function isUnlocked(id) {
      return state.get('achievementsUnlocked').includes(id);
    }

    function unlock(id) {
      const def = ALL.find(a => a.id === id);
      if (!def || isUnlocked(id)) return;
      const list = state.get('achievementsUnlocked');
      list.push(id);
      state.set('achievementsUnlocked', list);
      _showToast(def);
    }

    function _showToast(def) {
      const old = document.querySelector('.achievement-toast');
      if (old) old.remove();

      const t = document.createElement('div');
      t.className = 'achievement-toast';
      t.innerHTML = `
        <div class="toast-label">ERFOLG FREIGESCHALTET</div>
        <div class="toast-title">${def.icon} ${def.title}</div>
        <div class="toast-desc">${def.desc}</div>
      `;
      document.body.appendChild(t);
      setTimeout(() => {
        t.classList.add('hiding');
        t.addEventListener('animationend', () => t.remove(), { once: true });
      }, 4200);
    }

    function showOverlay() {
      const list   = document.getElementById('achievementList');
      const panel  = document.getElementById('achievementOverlay');
      const back   = document.getElementById('overlayBackdrop');
      if (!list || !panel) return;

      const unlocked = state.get('achievementsUnlocked');
      list.innerHTML = ALL.map(def => {
        const found = unlocked.includes(def.id);
        return `<div class="ach-item ${found ? 'unlocked' : 'locked'}">
          <span class="ach-icon">${found ? def.icon : '?'}</span>
          <div>
            <div class="ach-title">${found ? def.title : '???'}</div>
            <div class="ach-desc">${found ? def.desc : '— nicht freigeschaltet —'}</div>
          </div>
        </div>`;
      }).join('');

      panel.classList.remove('hidden');
      if (back) back.classList.remove('hidden');
    }

    return { ALL, isUnlocked, unlock, showOverlay };
  })();


  // ═══════════════════════════════════════════════════════════════
  // SIGNALNISCHEN  —  The Transmission tie-in
  // ═══════════════════════════════════════════════════════════════
  const signals = (() => {

    const ALL = [
      {
        id: 'sig_01', chapter: 3, number: '01 / 05',
        title: 'Übertragung 01',
        text:  '…nicht alles, was hilft, will retten…',
        source: 'The Transmission // Fragment 01',
      },
      {
        id: 'sig_02', chapter: 4, number: '02 / 05',
        title: 'Übertragung 02',
        text:  '…der braune Kasten sendet noch. niemand empfängt mehr…',
        source: 'The Transmission // Fragment 02',
      },
      {
        id: 'sig_03', chapter: 5, number: '03 / 05',
        title: 'Übertragung 03',
        text:  '…die Zahlen stimmen nicht mit der Karte überein. bitte korrigieren. bitte…',
        source: 'The Transmission // Fragment 03',
      },
      {
        id: 'sig_04', chapter: 7, number: '04 / 05',
        title: 'Übertragung 04',
        text:  '…sie hören zu. beide. seit anfang an…',
        source: 'The Transmission // Fragment 04',
      },
      {
        id: 'sig_05', chapter: 8, number: '05 / 05',
        title: 'Übertragung 05',
        text:  '…SSTV. frequenz unbekannt. bitte empfangen. hoffnung verbleibt…',
        source: 'The Transmission // Fragment 05',
      },
    ];

    function isFound(id) {
      return state.get('signalsFound').includes(id);
    }

    function find(id) {
      if (isFound(id)) return;
      const list = state.get('signalsFound');
      list.push(id);
      state.set('signalsFound', list);

      if (list.length === 1)        achievements.unlock('signal_first');
      if (list.length === ALL.length) achievements.unlock('signal_all');

      const def = ALL.find(s => s.id === id);
      if (def) _showDiscovery(def);
    }

    function _showDiscovery(def) {
      const t = document.createElement('div');
      t.className = 'signal-toast';
      t.innerHTML = `
        <div class="toast-label">SIGNALNISCHE ENTDECKT</div>
        <div class="toast-num">[ ${def.number} ]</div>
        <div class="toast-title">${def.title}</div>
        <div class="toast-text">${def.text}</div>
      `;
      document.body.appendChild(t);
      setTimeout(() => {
        t.classList.add('hiding');
        t.addEventListener('animationend', () => t.remove(), { once: true });
      }, 5000);
    }

    function showOverlay() {
      const list   = document.getElementById('signalList');
      const panel  = document.getElementById('signalOverlay');
      const back   = document.getElementById('overlayBackdrop');
      if (!list || !panel) return;

      list.innerHTML = ALL.map(def => {
        const found = isFound(def.id);
        return `<div class="sig-item ${found ? 'found' : 'missing'}">
          <div class="sig-header">
            <span class="sig-num sys-text">[ ${def.number} ]</span>
            <span class="sig-chapter sys-text">KAP. ${def.chapter}</span>
          </div>
          <div class="sig-title">${found ? def.title : '???'}</div>
          ${found ? `<div class="sig-text">${def.text}</div><div class="sig-source sys-text">${def.source}</div>` : ''}
        </div>`;
      }).join('');

      panel.classList.remove('hidden');
      if (back) back.classList.remove('hidden');
    }

    return { ALL, isFound, find, showOverlay };
  })();


  // ═══════════════════════════════════════════════════════════════
  // DIALOGUE SYSTEM
  // ═══════════════════════════════════════════════════════════════
  const dialogue = (() => {

    const SPEAKERS = {
      'R-3MI':     { colorVar: '--accent-r3mi',    placeholder: 'R' },
      'V-TGM':     { colorVar: '--accent-vtgm',    placeholder: 'V' },
      'SYSTEM':    { colorVar: '--accent-system',  placeholder: '◈' },
      'F-RØ5CHI':  { colorVar: '--accent-g1',      placeholder: 'F' },
      'L-UX':      { colorVar: '--accent-g2',      placeholder: 'L' },
      'J4W-A3':    { colorVar: '--accent-g3',      placeholder: 'J' },
      'B-RADF1SH': { colorVar: '--accent-g4',      placeholder: 'B' },
      'T-FLON14':  { colorVar: '--accent-g5',      placeholder: 'T' },
      'ASP-1024':  { colorVar: '--accent-g6',      placeholder: 'A' },
      'AGN-H3R':   { colorVar: '--accent-g7',      placeholder: 'AG' },
    };

    let _queue      = [];
    let _index      = 0;
    let _typing     = false;
    let _typeTimer  = null;
    let _onComplete = null;
    let _container  = null;

    function _ensureDOM() {
      if (_container) return;
      _container = document.createElement('div');
      _container.className = 'dlg-container';
      _container.innerHTML = `
        <div class="dlg-box" id="dlgBox">
          <div class="dlg-portrait" id="dlgPortrait">
            <span class="dlg-placeholder" id="dlgPlaceholder"></span>
          </div>
          <div class="dlg-body">
            <div class="dlg-speaker" id="dlgSpeaker"></div>
            <div class="dlg-text"    id="dlgText"></div>
            <div class="dlg-sub"     id="dlgSub"></div>
            <div class="dlg-advance" id="dlgAdvance">[ WEITER — KLICKEN ODER LEERTASTE ]</div>
          </div>
        </div>
      `;
      document.body.appendChild(_container);

      _container.addEventListener('click', advance);
      document.addEventListener('keydown', e => {
        if ((e.key === ' ' || e.key === 'Enter') && _container.classList.contains('visible'))
          advance();
      });
    }

    function load(lines, onComplete) {
      _ensureDOM();
      _queue      = lines;
      _index      = 0;
      _onComplete = onComplete || null;
      _playLine(0);
    }

    function _playLine(i) {
      if (i >= _queue.length) {
        hide();
        if (_onComplete) _onComplete();
        return;
      }

      const line     = _queue[i];
      const spk      = SPEAKERS[line.speaker] || SPEAKERS['SYSTEM'];
      const colorVal = `var(${spk.colorVar})`;

      const box     = document.getElementById('dlgBox');
      const spkEl   = document.getElementById('dlgSpeaker');
      const textEl  = document.getElementById('dlgText');
      const subEl   = document.getElementById('dlgSub');
      const phEl    = document.getElementById('dlgPlaceholder');
      const advEl   = document.getElementById('dlgAdvance');
      const portEl  = document.getElementById('dlgPortrait');

      box.style.setProperty('--spk-color', colorVal);
      spkEl.textContent  = line.speaker;
      spkEl.style.color  = colorVal;
      textEl.textContent = '';
      subEl.textContent  = line.subtitle || '';
      phEl.textContent   = spk.placeholder;
      advEl.style.opacity = '0';

      // Portrait image
      const existImg = portEl.querySelector('img');
      if (existImg) existImg.remove();
      if (line.portrait) {
        const img = document.createElement('img');
        img.src = line.portrait;
        img.alt = line.speaker;
        img.onerror = () => img.remove();
        portEl.appendChild(img);
      }

      _container.classList.add('visible');
      _typing = true;

      _typeText(textEl, line.text, 28, () => {
        _typing = false;
        advEl.style.opacity = '1';
      });
    }

    function _typeText(el, text, speed, onDone) {
      if (_typeTimer) clearInterval(_typeTimer);
      let i = 0;
      el.textContent = '';
      _typeTimer = setInterval(() => {
        el.textContent += text[i++];
        if (i >= text.length) {
          clearInterval(_typeTimer);
          _typeTimer = null;
          if (onDone) onDone();
        }
      }, speed);
    }

    function advance() {
      if (!_container?.classList.contains('visible')) return;
      if (_typing) {
        // Skip to end of current line
        clearInterval(_typeTimer);
        _typeTimer = null;
        _typing = false;
        document.getElementById('dlgText').textContent = _queue[_index].text;
        document.getElementById('dlgAdvance').style.opacity = '1';
        return;
      }
      _index++;
      _playLine(_index);
    }

    function hide() {
      _container?.classList.remove('visible');
    }

    return { load, advance, hide };
  })();


  // ═══════════════════════════════════════════════════════════════
  // SCENE MANAGER
  // ═══════════════════════════════════════════════════════════════
  const scene = (() => {
    let _hotspots = [];

    function load(config) {
      clearHotspots();
      (config.hotspots || []).forEach(addHotspot);
    }

    function addHotspot(cfg) {
      const el = document.createElement('button');
      el.className = 'hotspot' + (cfg.className ? ' ' + cfg.className : '');
      el.setAttribute('aria-label', cfg.label || 'Interagieren');
      el.style.cssText = `left:${cfg.x}%;top:${cfg.y}%;width:${cfg.w||6}%;height:${cfg.h||6}%;`;
      if (cfg.label) {
        const lbl = document.createElement('span');
        lbl.className = 'hotspot-label';
        lbl.textContent = cfg.label;
        el.appendChild(lbl);
      }
      el.addEventListener('click', cfg.onClick);

      const sceneEl = document.querySelector('.scene-canvas');
      if (sceneEl) sceneEl.appendChild(el);
      _hotspots.push(el);
    }

    function clearHotspots() {
      _hotspots.forEach(el => el.remove());
      _hotspots = [];
    }

    return { load, addHotspot, clearHotspots };
  })();


  // ═══════════════════════════════════════════════════════════════
  // PUZZLE ENGINE
  // ═══════════════════════════════════════════════════════════════
  const puzzle = (() => {
    let _current = null;

    function define(cfg) { _current = cfg; }

    function submit(answer) {
      if (!_current) return false;
      const norm = answer.trim().toLowerCase().replace(/\s+/g, '');
      const sols = (Array.isArray(_current.solution)
        ? _current.solution
        : [_current.solution]
      ).map(s => s.toLowerCase().replace(/\s+/g, ''));

      if (sols.includes(norm)) {
        state.markPuzzleSolved(_current.id);
        if (_current.achievementId) achievements.unlock(_current.achievementId);
        if (_current.onSolve) _current.onSolve();
        return true;
      }
      if (_current.onFail) _current.onFail();
      return false;
    }

    function hint()     { return _current?.hint || 'Kein Hinweis verfügbar.'; }
    function isSolved() { return _current ? state.isPuzzleSolved(_current.id) : false; }

    return { define, submit, hint, isSolved };
  })();


  // ═══════════════════════════════════════════════════════════════
  // OVERLAY UTILITIES
  // ═══════════════════════════════════════════════════════════════
  function closeOverlay() {
    document.querySelectorAll('.overlay-panel').forEach(el => el.classList.add('hidden'));
    document.getElementById('overlayBackdrop')?.classList.add('hidden');
  }

  function showCredits() {
    document.getElementById('creditsOverlay')?.classList.remove('hidden');
    document.getElementById('overlayBackdrop')?.classList.remove('hidden');
  }

  document.addEventListener('click', e => {
    if (e.target?.id === 'overlayBackdrop') closeOverlay();
  });


  // ═══════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════
  (function init() {
    state.load();
    if (state.get('firstPlay')) {
      state.set('firstPlay', false);
      setTimeout(() => achievements.unlock('first_boot'), 1200);
    }
  })();


  // ─── Public API ───────────────────────────────────────────────
  return {
    VERSION,
    state,
    achievements,
    signals,
    dialogue,
    scene,
    puzzle,
    closeOverlay,
    showCredits,
  };

})();
