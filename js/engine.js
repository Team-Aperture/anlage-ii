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
      { id: 'ch2_complete',     icon: '❧', title: 'Wartungsgartenpflege', desc: 'Kapitel 2 abgeschlossen.' },
      { id: 'ch3_complete',     icon: '◎', title: 'Beobachtet',           desc: 'Kapitel 3 abgeschlossen.' },
      { id: 'ch4_complete',     icon: '⊞', title: 'Der Erste',            desc: 'Den Würfel geknackt. Als Erster.' },
      { id: 'ch5_complete',     icon: '▶', title: 'Beschleunigt',         desc: 'Den Förderlauf bestanden. Ohne stehenzubleiben.' },
      { id: 'ch6_complete',     icon: '◫', title: 'Im Bild verborgen',     desc: 'Den versteckten Code in der Dunkelkammer gefunden.' },
      { id: 'ch7_complete',     icon: '▣', title: 'Defragmentiert',       desc: 'Kapitel 7 abgeschlossen.' },
      { id: 'ch8_complete',     icon: '◍', title: 'Meta',                 desc: 'Kapitel 8 abgeschlossen.' },
      { id: 'ch9_complete',     icon: '✦', title: 'Reaktivierung',        desc: 'Alle Sektoren wiederhergestellt.' },
      { id: 'signal_first',     icon: '◈', title: 'Frequenz',             desc: 'Erste Signalnische entdeckt.' },
      { id: 'signal_all',       icon: '▲', title: 'Die Übertragung',      desc: 'Alle Signalnischen gefunden.' },
      { id: 'italian_brainrot', icon: '🐪', title: 'Frigo Camelo',        desc: 'F–R–I–G–O. Du weißt, was du getan hast.' },
      { id: 'bayern_pmo',       icon: '🥨', title: 'A Bsuach im Bsuach',   desc: 'Eine alte bayerische Tafel angeklickt.' },
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
      try { audio.achievement(); } catch (_) {}
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
        id: 'sig_04', chapter: 6, number: '04 / 05',
        title: 'Übertragung 04',
        text:  '…sie hören zu. beide. seit anfang an…',
        source: 'The Transmission // Fragment 04',
      },
      {
        id: 'sig_05', chapter: 7, number: '05 / 05',
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
      'F-AXN':     { colorVar: '--accent-g8',      placeholder: 'FX' },
    };

    // Each face echoes the character's real design (form) + a personality (idle).
    const FACES = {
      'R-3MI':     { form: 'humanoid', idle: 'face-dart'   }, // one-eyed humanoid, anxious
      'V-TGM':     { form: 'orb',      idle: 'face-calm'   }, // sphere + test-tube, deadpan
      'SYSTEM':    { form: 'system',   idle: 'face-scan'   }, // scanlines
      'F-RØ5CHI':  { form: 'frog',     idle: 'face-bob'    }, // crowned frog, warm
      'L-UX':      { form: 'cat',      idle: 'face-jitter' }, // cat, hyper
      'J4W-A3':    { form: 'humanoid', idle: 'face-calm'   },
      'B-RADF1SH': { form: 'fish',     idle: 'face-calm'   }, // fish, confident
      'T-FLON14':  { form: 'pan',      idle: 'face-zip'    }, // pan-bot, fast
      'ASP-1024':  { form: 'mouse',    idle: 'face-calm'   }, // mouse, silent
      'AGN-H3R':   { form: 'skull',    idle: 'face-calm'   }, // skull
      'F-AXN':     { form: 'pumpkin',  idle: 'face-flicker'}, // jack-o'-lantern
    };

    function _faceSVG(speaker) {
      const spk = SPEAKERS[speaker] || SPEAKERS['SYSTEM'];
      const f   = FACES[speaker]    || FACES['SYSTEM'];
      const col = `var(${spk.colorVar})`;
      const BODY = {
        humanoid:
            '<line class="bot-antenna" x1="32" y1="6" x2="32" y2="-4"/><circle class="bot-antenna-tip" cx="32" cy="-5" r="2.5"/>'
          + '<rect class="bot-frame" x="9" y="6" width="46" height="50" rx="14"/>'
          + '<g class="bot-eyes"><circle class="bot-eye" cx="32" cy="30" r="10"/></g>'
          + '<rect class="bot-mouth" x="22" y="47" width="20" height="3" rx="1.5"/>',
        orb:
            '<rect class="bot-tube" x="49" y="12" width="8" height="20" rx="3"/>'
          + '<circle class="bot-frame" cx="31" cy="32" r="25"/>'
          + '<g class="bot-eyes"><circle class="bot-eye" cx="31" cy="30" r="11"/></g>'
          + '<rect class="bot-mouth" x="21" y="47" width="20" height="3" rx="1.5"/>',
        system:
            '<rect class="bot-frame" x="9" y="8" width="46" height="46" rx="8"/>'
          + '<rect class="bot-scan" x="16" y="20" width="32" height="3" rx="1.5"/>'
          + '<rect class="bot-scan" x="16" y="30" width="32" height="3" rx="1.5"/>'
          + '<rect class="bot-scan" x="16" y="40" width="32" height="3" rx="1.5"/>',
        frog:
            '<path class="bot-crown" d="M16 4 L20 -7 L26 3 L32 -10 L38 3 L44 -7 L48 4 Z"/>'
          + '<circle class="bot-frame" cx="20" cy="14" r="9"/><circle class="bot-frame" cx="44" cy="14" r="9"/>'
          + '<rect class="bot-frame" x="8" y="16" width="48" height="40" rx="20"/>'
          + '<g class="bot-eyes"><circle class="bot-eye" cx="20" cy="14" r="5"/><circle class="bot-eye" cx="44" cy="14" r="5"/></g>'
          + '<path class="bot-smile" d="M20 42 Q32 52 44 42"/>',
        cat:
            '<path class="bot-ear" d="M12 10 L15 -8 L27 6 Z"/><path class="bot-ear" d="M52 10 L49 -8 L37 6 Z"/>'
          + '<rect class="bot-frame" x="9" y="6" width="46" height="48" rx="18"/>'
          + '<g class="bot-eyes"><circle class="bot-eye" cx="24" cy="28" r="7"/><circle class="bot-eye" cx="40" cy="28" r="7"/></g>'
          + '<line class="bot-whisker" x1="4" y1="38" x2="22" y2="40"/><line class="bot-whisker" x1="4" y1="44" x2="22" y2="44"/>'
          + '<line class="bot-whisker" x1="60" y1="38" x2="42" y2="40"/><line class="bot-whisker" x1="60" y1="44" x2="42" y2="44"/>',
        fish:
            '<path class="bot-fin" d="M6 32 L-7 16 L-7 48 Z"/>'
          + '<circle class="bot-frame" cx="35" cy="32" r="25"/>'
          + '<g class="bot-eyes"><circle class="bot-eye" cx="38" cy="28" r="11"/></g>'
          + '<rect class="bot-mouth" x="27" y="47" width="18" height="3" rx="1.5"/>',
        pan:
            '<line class="bot-handle" x1="47" y1="14" x2="62" y2="-3"/>'
          + '<circle class="bot-screen" cx="30" cy="32" r="25"/>'
          + '<g class="bot-eyes"><circle class="bot-eye" cx="22" cy="28" r="4"/><circle class="bot-eye" cx="38" cy="28" r="4"/></g>'
          + '<path class="bot-smile" d="M19 38 Q30 49 41 38"/>',
        mouse:
            '<circle class="bot-ear-r" cx="14" cy="8" r="11"/><circle class="bot-ear-r" cx="50" cy="8" r="11"/>'
          + '<circle class="bot-frame" cx="32" cy="34" r="23"/>'
          + '<g class="bot-eyes"><circle class="bot-eye" cx="24" cy="30" r="5"/><circle class="bot-eye" cx="40" cy="30" r="5"/></g>'
          + '<circle class="bot-nose" cx="32" cy="40" r="2.5"/>'
          + '<line class="bot-whisker" x1="6" y1="42" x2="26" y2="42"/><line class="bot-whisker" x1="58" y1="42" x2="38" y2="42"/>',
        skull:
            '<rect class="bot-bone" x="2" y="49" width="60" height="5" rx="2.5" transform="rotate(18 32 52)"/>'
          + '<rect class="bot-bone" x="2" y="49" width="60" height="5" rx="2.5" transform="rotate(-18 32 52)"/>'
          + '<path class="bot-skull" d="M9 30 a23 22 0 0 1 46 0 v7 q0 8 -9 9 l-3 6 h-22 l-3 -6 q-9 -1 -9 -9 Z"/>'
          + '<g class="bot-eyes"><circle class="bot-eye" cx="23" cy="29" r="7"/><circle class="bot-eye" cx="41" cy="29" r="7"/></g>'
          + '<path class="bot-nose-skull" d="M32 35 l-3 6 h6 Z"/>',
        pumpkin:
            '<rect class="bot-stem" x="29" y="-3" width="6" height="11" rx="2"/>'
          + '<ellipse class="bot-frame" cx="32" cy="33" rx="27" ry="23"/>'
          + '<path class="bot-ridge" d="M21 12 Q15 33 21 54"/><path class="bot-ridge" d="M43 12 Q49 33 43 54"/>'
          + '<g class="bot-eyes"><path class="bot-eye" d="M17 25 l11 5 l-11 6 Z"/><path class="bot-eye" d="M47 25 l-11 5 l11 6 Z"/></g>'
          + '<path class="bot-jag" d="M17 41 l5 6 l4 -4 l4 6 l4 -5 l4 6 l5 -7 Z"/>',
      };
      const inner = BODY[f.form] || BODY.humanoid;
      return `<svg class="bot-face ${f.idle} face-${f.form}" viewBox="-8 -16 80 88" style="--bot-color:${col}" aria-hidden="true">${inner}</svg>`;
    }

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
        if ((e.key === ' ' || e.key === 'Enter') && _container.classList.contains('visible')) {
          e.preventDefault();
          advance();
        }
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
      const advEl   = document.getElementById('dlgAdvance');
      const portEl  = document.getElementById('dlgPortrait');

      box.style.setProperty('--spk-color', colorVal);
      spkEl.textContent  = line.speaker;
      spkEl.style.color  = colorVal;
      textEl.textContent = '';
      subEl.textContent  = line.subtitle || '';
      advEl.style.opacity = '0';

      // Portrait: a CG image if the line provides one, else an animated face.
      if (line.portrait) {
        portEl.innerHTML = '';
        const img = document.createElement('img');
        img.src = line.portrait;
        img.alt = line.speaker;
        img.onerror = () => { portEl.innerHTML = _faceSVG(line.speaker); };
        portEl.appendChild(img);
      } else {
        portEl.innerHTML = _faceSVG(line.speaker);
      }

      _container.classList.add('visible');
      portEl.classList.add('speaking');
      _typing = true;

      _typeText(textEl, line.text, 28, () => {
        _typing = false;
        portEl.classList.remove('speaking');
        advEl.style.opacity = '1';
      }, line.speaker);
    }

    function _typeText(el, text, speed, onDone, speaker) {
      if (_typeTimer) clearInterval(_typeTimer);
      const full = text || '';
      let i = 0;
      el.textContent = '';
      if (!full.length) { if (onDone) onDone(); return; }
      _typeTimer = setInterval(() => {
        const ch = full[i++];
        el.textContent += ch;
        if (ch !== ' ' && i % 3 === 0) audio.blip(speaker);
        if (i >= full.length) {
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
        document.getElementById('dlgText').textContent = _queue[_index].text || '';
        document.getElementById('dlgPortrait')?.classList.remove('speaking');
        document.getElementById('dlgAdvance').style.opacity = '1';
        return;
      }
      _index++;
      _playLine(_index);
    }

    function hide() {
      _container?.classList.remove('visible');
      document.getElementById('dlgPortrait')?.classList.remove('speaking');
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
  // AUDIO ENGINE — procedural Web Audio, no files
  // ═══════════════════════════════════════════════════════════════
  const audio = (() => {
    let ctx = null, master = null, muted = false;

    function ensure() {
      if (ctx) return ctx;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
      } catch (_) { ctx = null; }
      return ctx;
    }
    function resume() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); }

    function tone(o) {
      if (muted) return;
      const c = ensure(); if (!c) return;
      const { freq = 440, type = 'sine', dur = 0.08, vol = 0.25, glideTo = null, delay = 0 } = o || {};
      const t0 = c.currentTime + delay;
      const osc = c.createOscillator(), g = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(master);
      osc.start(t0); osc.stop(t0 + dur + 0.02);
    }

    // Per-character speech voice — Portal-style chirps, one per few letters.
    const VOICE = {
      'R-3MI':     { base: 520, type: 'square',   spread: 70  },
      'V-TGM':     { base: 196, type: 'sine',     spread: 24  },
      'SYSTEM':    { base: 300, type: 'triangle', spread: 0   },
      'F-RØ5CHI':  { base: 430, type: 'sine',     spread: 110 },
      'L-UX':      { base: 720, type: 'square',   spread: 150 },
      'B-RADF1SH': { base: 290, type: 'triangle', spread: 55  },
      'T-FLON14':  { base: 470, type: 'sawtooth', spread: 80  },
      'ASP-1024':  { base: 110, type: 'sine',     spread: 8   },
    };
    function blip(speaker) {
      const v = VOICE[speaker] || VOICE['SYSTEM'];
      tone({ freq: v.base + (Math.random() * 2 - 1) * v.spread, type: v.type, dur: 0.045, vol: 0.10 });
    }
    function click()       { tone({ freq: 660, type: 'square',   dur: 0.025, vol: 0.10 }); }
    function solve()       { [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.2, vol: 0.16, delay: i * 0.085 })); }
    function fail()        { tone({ freq: 180, type: 'sawtooth', dur: 0.22, vol: 0.16, glideTo: 80 }); }
    function achievement() { [659, 880, 1318].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.34, vol: 0.18, delay: i * 0.11 })); }

    function setMuted(m) { muted = !!m; }
    function isMuted()   { return muted; }
    function toggleMute() {
      muted = !muted;
      try { state.set('muted', muted); } catch (_) {}
      if (!muted) click();
      return muted;
    }

    return { ensure, resume, tone, blip, click, solve, fail, achievement, setMuted, isMuted, toggleMute };
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
    audio.resume();
    if (e.target?.id === 'overlayBackdrop') { closeOverlay(); return; }
    const btn = e.target.closest && e.target.closest('button');
    if (btn && !btn.disabled) audio.click();
  });


  // ═══════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════
  (function init() {
    state.load();
    audio.setMuted(!!state.get('muted'));
    const wake = () => audio.resume();
    document.addEventListener('pointerdown', wake);
    document.addEventListener('keydown', wake);
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
    audio,
    closeOverlay,
    showCredits,
  };

})();
