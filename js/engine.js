/**
 * ═══════════════════════════════════════════════════════════════
 * KALIBRIERUNGSANLAGE II — GAME ENGINE v1.0.0
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
  const VERSION  = '1.0.0';   // what the game calls itself; NOT the save schema

  // ═══════════════════════════════════════════════════════════════
  // STATE MANAGER
  // A save is never thrown away because a field is missing or a version
  // moved on. Unknown keys survive, missing keys are filled in, and the
  // schema version is separate from the version the game calls itself.
  // ═══════════════════════════════════════════════════════════════
  const SCHEMA = 2;

  const state = (() => {
    const defaults = {
      version:              VERSION,
      schemaVersion:        SCHEMA,
      chaptersCompleted:    [],
      puzzlesSolved:        {},
      signalsFound:         [],
      achievementsUnlocked: [],
      flags:                {},
      chapterState:         {},
      calibration:          {},
      settings:             {},
      firstPlay:            true,
    };

    let _data = null;
    let _persist = true;      // false once we know storage refuses to keep anything

    // Bring an older save forward. Additive only: nothing an earlier version
    // stored is dropped, and no migration may reset progress.
    // The buckets in `defaults` must never be handed out by reference: a save
    // that lacks one would then share the template, and a later reset would
    // hand back the very object it just wiped.
    function blank() {
      return JSON.parse(JSON.stringify(defaults));
    }

    function migrate(raw) {
      const d = { ...blank(), ...(raw || {}) };
      const from = typeof raw?.schemaVersion === 'number' ? raw.schemaVersion : 1;

      // shapes, in case a hand-edited or half-written save comes back
      if (!Array.isArray(d.chaptersCompleted))    d.chaptersCompleted = [];
      if (!Array.isArray(d.signalsFound))         d.signalsFound = [];
      if (!Array.isArray(d.achievementsUnlocked)) d.achievementsUnlocked = [];
      ['puzzlesSolved', 'flags', 'chapterState', 'calibration', 'settings'].forEach(k => {
        if (!d[k] || typeof d[k] !== 'object' || Array.isArray(d[k])) d[k] = {};
      });
      d.chaptersCompleted    = [...new Set(d.chaptersCompleted.filter(x => typeof x === 'string'))];
      d.signalsFound         = [...new Set(d.signalsFound.filter(x => typeof x === 'string'))];
      d.achievementsUnlocked = [...new Set(d.achievementsUnlocked.filter(x => typeof x === 'string'))];

      if (from < 2) {
        // v1 had no chapterState / calibration / settings buckets and stored
        // per-chapter progress as loose top-level keys. Move what we find, and
        // do not leave a second stale copy behind.
        Object.keys(d).forEach(k => {
          const m = /^ch(\d)_progress$/.exec(k);
          if (m && d[k] != null) { d.chapterState['ch' + m[1]] = d[k]; delete d[k]; }
        });
        // A run that already finished a chapter has earned its fragment.
        d.chaptersCompleted.forEach(id => { if (id !== 'ch0') d.calibration[id] = true; });
      }

      d.version = VERSION;
      d.schemaVersion = SCHEMA;
      return d;
    }

    function load() {
      let raw = null;
      try { raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); }
      catch (_) { raw = null; }               // unreadable: start clean, but keep playing
      const had = raw && typeof raw === 'object';
      _data = migrate(had ? raw : null);
      // Write the upgraded shape back once, so the next load has nothing to do
      // and a half-migrated save can never be observed.
      if (!had || raw.schemaVersion !== SCHEMA) save();
    }

    // A finished chapter whose reward went missing — an interrupted write, a
    // save copied between browsers — must not send the player back through it.
    function repair() {
      try {
        if (_data.chaptersCompleted.includes('ch8') && !_data.zieldaten_text) {
          const z = calibration.reconstructMain();
          if (z) { _data.zieldaten_text = z; _data.flags.zieldaten = true; }
        }
        if (_data.flags.truth_revealed && !_data.bonuszieldaten_text) {
          const b = calibration.reconstructBonus();
          if (b) { _data.bonuszieldaten_text = b; _data.flags.bonuszieldaten = true; }
        }
      } catch (_) {}
    }

    function save() {
      if (!_persist) return;
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(_data)); }
      catch (e) {
        _persist = false;                     // out of quota or storage blocked
        console.warn('[KA-II] Fortschritt kann nicht gespeichert werden — das Spiel läuft weiter.', e);
      }
    }

    function get(key)           { return _data[key]; }
    function set(key, value)    { _data[key] = value; save(); }
    function setFlag(f, v=true) { _data.flags[f] = v; save(); }
    function hasFlag(f)         { return !!_data.flags[f]; }
    function canPersist()       { return _persist; }

    // Per-chapter resumable state, so a refresh never costs a session.
    function chapter(id, value) {
      if (value === undefined) return _data.chapterState[id];
      if (value === null) delete _data.chapterState[id];
      else _data.chapterState[id] = value;
      save();
    }

    function markChapterComplete(id) {
      if (!_data.chaptersCompleted.includes(id)) {
        _data.chaptersCompleted.push(id);
        // The fragment is committed in the same write as the completion, so a
        // player who navigates away immediately cannot lose one.
        if (id !== 'ch0') _data.calibration[id] = true;
        save();
      }
      repair();
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

    function reset() { _data = migrate(null); _persist = true; save(); }

    // Copy a save between browsers or keep a backup of a long run.
    function exportSave() {
      try { return btoa(unescape(encodeURIComponent(JSON.stringify(_data)))); }
      catch (_) { return ''; }
    }
    function importSave(text) {
      let raw = null;
      const t = String(text || '').trim();
      if (!t) return false;
      try { raw = JSON.parse(decodeURIComponent(escape(atob(t)))); }
      catch (_) { try { raw = JSON.parse(t); } catch (_) { return false; } }
      if (!raw || typeof raw !== 'object' || !Array.isArray(raw.chaptersCompleted)) return false;
      _data = migrate(raw);
      repair();
      save();
      return true;
    }

    load();
    return {
      load, save, get, set, setFlag, hasFlag, canPersist, chapter,
      markChapterComplete, isChapterComplete,
      markPuzzleSolved, isPuzzleSolved, reset, repair,
      exportSave, importSave, SCHEMA,
    };
  })();


  // ═══════════════════════════════════════════════════════════════
  // ZIELDATEN
  // Both coordinate sets live here as shifted fragments rather than as
  // readable strings, and both are rebuilt the same way. Keeping them in one
  // place is also what lets a finished save repair itself.
  //
  // PLATZHALTER — vor Veröffentlichung ersetzen. Anleitung: COORDS.md
  // ═══════════════════════════════════════════════════════════════
  const calibration = (() => {
    const MAIN = [
      '0061000f001f', '0006008600160006', '000d0013000d', '00740074006400f3',
      '006b000e006b', '00620062006200e2', '007900690069', '004e005000500050',
    ];
    const BONUS = [
      '001f00710061006100e1', '007c006c006c0072006c006c', '0057004700d000470022',
      '005200420042004200c20052', '004d004d0053004d004d004d',
    ];

    function piece(list, j, step, base) {
      const t = list[j] || '';
      let out = '';
      for (let p = 0; p < t.length; p += 4) {
        out += String.fromCodePoint(parseInt(t.slice(p, p + 4), 16) ^ (base + j * step));
      }
      return out;
    }
    const join = (list, step, base) => list.map((_, j) => piece(list, j, step, base)).join('');

    // `order` comes from the finished reconstruction in Chapter 8; a wrong
    // order simply does not produce the target data.
    function reconstructMain(order) {
      const seq = Array.isArray(order) && order.length === MAIN.length ? order : MAIN.map((_, i) => i);
      return seq.map(j => piece(MAIN, j, 7, 0x2f)).join('');
    }
    function reconstructBonus() { return join(BONUS, 11, 0x51); }

    function commit(chapterId, token) {
      try {
        const c = state.get('calibration') || {};
        c[chapterId] = token == null ? true : token;
        state.set('calibration', c);
      } catch (_) {}
    }
    function has(chapterId) {
      try { return !!(state.get('calibration') || {})[chapterId]; } catch (_) { return false; }
    }
    function hasAllMain() {
      return ['ch1','ch2','ch3','ch4','ch5','ch6','ch7','ch8'].every(has);
    }

    return { commit, has, hasAllMain, reconstructMain, reconstructBonus, MAIN_LEN: MAIN.length };
  })();


  // ═══════════════════════════════════════════════════════════════
  // PROGRESS
  // One place that knows the running order of the facility: which sector
  // comes next, whether the player may walk into one, and how far the
  // reactivation has actually got. Chapters ask; they do not each decide.
  // ═══════════════════════════════════════════════════════════════
  const progress = (() => {
    const CHAPTERS = [
      { id:'ch0', num:'00', name:'Rückkehr' },
      { id:'ch1', num:'01', name:'Wartung' },
      { id:'ch2', num:'02', name:'Garten' },
      { id:'ch3', num:'03', name:'Beobachtung' },
      { id:'ch4', num:'04', name:'Rätsel' },
      { id:'ch5', num:'05', name:'Langstrecke' },
      { id:'ch6', num:'06', name:'Versuchskammer' },
      { id:'ch7', num:'07', name:'Vexier' },
      { id:'ch8', num:'08', name:'Archiv' },
    ];
    // What the facility reports once each sector is back. One table, so no
    // chapter can quietly drift to an old number.
    const PCT = { ch0:0, ch1:12, ch2:24, ch3:37, ch4:51, ch5:68, ch6:82, ch7:96, ch8:100 };

    const inChapter = () => /\/chapter\d+\//.test(location.pathname);
    const root = () => (inChapter() ? '../' : '');
    function href(id) {
      const n = id.replace('ch', '');
      return `${root()}chapter${n}/chapter${n}.html`;
    }

    const done = () => state.get('chaptersCompleted') || [];
    const indexOf = id => CHAPTERS.findIndex(c => c.id === id);

    function currentChapter() {
      const d = done();
      const next = CHAPTERS.find(c => !d.includes(c.id));
      return next || CHAPTERS[CHAPTERS.length - 1];
    }
    function nextChapter() {
      const d = done();
      return CHAPTERS.find(c => !d.includes(c.id)) || null;
    }
    function allDone() { return CHAPTERS.every(c => done().includes(c.id)); }

    function signalsFound() { return (state.get('signalsFound') || []).length; }
    function allSignals()   { return signalsFound() >= signals.ALL.length; }

    function canEnter(id) {
      if (id === 'ch0') return state.hasFlag('ka1_verified');
      if (id === 'ch9') return state.isChapterComplete('ch8') && allSignals();
      const i = indexOf(id);
      if (i <= 0) return true;
      // A finished chapter can always be walked back into.
      return state.isChapterComplete(id) || state.isChapterComplete(CHAPTERS[i - 1].id);
    }

    function reactivationPct() {
      const d = done();
      let pct = 0;
      CHAPTERS.forEach(c => { if (d.includes(c.id) && PCT[c.id] > pct) pct = PCT[c.id]; });
      return pct;
    }

    function resumeHref() {
      const n = nextChapter();
      return n ? href(n.id) : href('ch8');
    }

    // The door says no in the facility's own words, and offers the way back
    // to wherever the player actually is. It never names what is behind it.
    function lockScreen(id) {
      const c = CHAPTERS[Math.max(0, indexOf(id))] || CHAPTERS[0];
      const cur = currentChapter();
      document.body.classList.add('chapter-page');
      document.body.innerHTML = '';
      const w = document.createElement('main');
      w.className = 'sector-lock';
      w.innerHTML = `
        <div class="bg-scanlines" aria-hidden="true"></div>
        <div class="lock-card">
          <p class="lock-label sys-text">ZUGANG VERWEIGERT</p>
          <h1 class="lock-sector">SEKTOR ${c.num}</h1>
          <p class="lock-state sys-text">NOCH NICHT ERREICHBAR</p>
          <dl class="lock-rows">
            <dt>VORHERIGE REAKTIVIERUNGSPROTOKOLLE</dt><dd>UNVOLLSTÄNDIG</dd>
            <dt>AKTUELLER SEKTOR</dt><dd>${cur.num}</dd>
          </dl>
          <a class="ka-btn primary" href="${href(cur.id)}">[ ZUM AKTUELLEN SEKTOR ]</a>
          <a class="ka-btn small" href="${root()}index.html">[ HAUPTMENÜ ]</a>
        </div>`;
      document.body.appendChild(w);
    }

    // Called first thing by every chapter. Returns false if the chapter
    // should stop loading.
    function require(id) {
      if (id === 'ch0' && !state.hasFlag('ka1_verified')) {
        location.replace(root() + 'access.html');
        return false;
      }
      if (canEnter(id)) return true;
      lockScreen(id);
      return false;
    }

    // ── Nachsuche ──────────────────────────────────────────────
    // Walking back into a finished sector should not mean solving it again.
    // A chapter asks isRevisit() and, if true, opens straight into its final
    // room with the optional things still there to find.
    function isRevisit(id) { return state.isChapterComplete(id); }

    function missingSignal(id) {
      const def = signals.ALL.find(sg => 'ch' + sg.chapter === id);
      return def && !signals.isFound(def.id) ? def.id : null;
    }

    // A way out that does not run through a door the player already opened.
    function returnBar(id) {
      if (!isRevisit(id) || document.getElementById('nachsucheBar')) return;
      const bar = document.createElement('div');
      bar.className = 'nachsuche-bar';
      bar.id = 'nachsucheBar';
      const missing = missingSignal(id);
      bar.innerHTML =
          `<span class="ns-label sys-text">NACHSUCHE${missing ? ' · FREMDSIGNAL OFFEN' : ''}</span>`
        + `<button class="ka-btn small" id="nsSignals">[ SIGNALARCHIV ]</button>`
        + `<a class="ka-btn small" href="${root()}index.html">[ TERMINAL ]</a>`;
      document.body.appendChild(bar);
      bar.querySelector('#nsSignals').addEventListener('click', () => {
        try { signals.showOverlay(); } catch (_) {}
      });
    }

    return {
      CHAPTERS, PCT, href, canEnter, require, lockScreen,
      currentChapter, nextChapter, allDone, resumeHref, reactivationPct,
      signalsFound, allSignals, isRevisit, missingSignal, returnBar,
    };
  })();


  // ═══════════════════════════════════════════════════════════════
  // ACHIEVEMENT SYSTEM
  // ═══════════════════════════════════════════════════════════════
  const achievements = (() => {

    const ALL = [
      { id: 'first_boot',       icon: '◈', title: 'Erstkontakt',         desc: 'Das System erwacht.' },
      { id: 'ka1_veteran',      icon: '✦', title: 'Veteran',              desc: 'Teil I wurde abgeschlossen. Du weißt, was hier passiert.' },
      { id: 'ch0_complete',     icon: '⬡', title: 'Wieder da',            desc: 'Die Anlage hat dich wiedererkannt.' },
      { id: 'ch1_complete',     icon: '◉', title: 'Wartungsprotokoll',    desc: 'Der erste Sektor läuft wieder.' },
      { id: 'ch2_complete',     icon: '❧', title: 'Grüner Daumen',        desc: 'Der Garten lebt wieder.' },
      { id: 'ch3_complete',     icon: '◎', title: 'Früher gesehen',       desc: 'Nicht schneller. Genauer.' },
      { id: 'ch4_complete',     icon: '⊞', title: 'Teil für Teil',        desc: 'Ein großes Problem wurde klein genug.' },
      { id: 'ch5_complete',     icon: '▶', title: 'Langstrecke',          desc: 'Eine Station nach der anderen.' },
      { id: 'ch6_complete',     icon: '◫', title: 'Saubere Methode',      desc: 'Die Blackbox wurde verstanden, ohne geöffnet zu werden.' },
      { id: 'ch7_complete',     icon: '▣', title: 'Echtheitsprüfung',     desc: 'Nicht geglaubt. Überprüft.' },
      { id: 'ch8_complete',     icon: '◍', title: 'Rekonstruktion',       desc: 'Die Zieldaten wurden wiederhergestellt.' },
      { id: 'ch9_complete',     icon: '✦', title: 'Die ganze Wahrheit',   desc: 'Jeder Sektor, jede Frequenz, und der Raum, den es nicht gibt.' },
      { id: 'signal_first',     icon: '◈', title: 'Frequenz',             desc: 'Erste Signalnische entdeckt.' },
      { id: 'signal_all',       icon: '▲', title: 'Die Übertragung',      desc: 'Alle Signalnischen gefunden.' },
      { id: 'italian_brainrot', icon: '🐪', title: 'Frigo Camelo',        desc: 'F–R–I–G–O. Du weißt, was du getan hast.' },
      { id: 'bayern_pmo',       icon: '🥨', title: 'A Bsuach im Bsuach',   desc: 'Eine alte bayerische Tafel angeklickt.' },
      { id: 'archivar',         icon: '▤', title: 'Archivar',             desc: 'Die Rekonstruktion ohne einen einzigen Hinweis gelegt.' },
      { id: 'jigsaw_refused',   icon: '■', title: 'Nein.',                desc: 'Das Puzzle wurde abgelehnt. Wie immer.' },
      { id: 'all_guests',       icon: '◎', title: 'Gute Gesellschaft',    desc: 'Allen sieben Gasteinheiten begegnet.' },
      { id: 'chamber',          icon: '▚', title: 'Nicht registriert',    desc: 'Eine Kammer betreten, die in keinem Plan steht.' },
      { id: 'truth',            icon: '⌖', title: 'Die Wahrheit',         desc: 'Bis zum Ende zugehört.' },
      { id: 'said_hiii',        icon: '☻', title: 'Hiii.',                desc: 'Am Ende doch noch einmal gegrüßt.' },
      { id: 'will_return',      icon: '↺', title: 'Ich komme zurück',     desc: 'Ein Versprechen, das niemand widerrufen hat.' },
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
      if (id !== 'ch9_complete') checkPlatinum();
    }

    // The 100% capstone: every chapter cleared, every Signalnische heard, and
    // the hidden chamber seen. Checked after any unlock / chapter / signal.
    function checkPlatinum() {
      if (isUnlocked('ch9_complete')) return;
      const done = state.get('chaptersCompleted') || [];
      const allCh = ['ch0','ch1','ch2','ch3','ch4','ch5','ch6','ch7','ch8'].every(c => done.includes(c));
      if (!allCh) return;
      const sigs = state.get('signalsFound') || [];
      if (sigs.length < signals.ALL.length) return;
      if (!isUnlocked('bonus_found')) return;
      setTimeout(() => unlock('ch9_complete'), 1500);   // let the prior toast land first
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

    return { ALL, isUnlocked, unlock, showOverlay, checkPlatinum };
  })();


  // ═══════════════════════════════════════════════════════════════
  // SIGNALNISCHEN  —  The Transmission tie-in
  // ═══════════════════════════════════════════════════════════════
  const signals = (() => {

    const ALL = [
      {
        id: 'sig_01', chapter: 3, number: '01 / 05',
        title: 'Übertragung 01',
        text:  '…nicht alles, was hilft, will retten. zwei einheiten hören mit…',
        source: 'The Transmission // Fragment 01',
      },
      {
        id: 'sig_02', chapter: 4, number: '02 / 05',
        title: 'Übertragung 02',
        text:  '…der braune kasten sendet noch. interne freigabe erloschen. von innen geht das nicht mehr…',
        source: 'The Transmission // Fragment 02',
      },
      {
        id: 'sig_03', chapter: 5, number: '03 / 05',
        title: 'Übertragung 03',
        text:  '…die zahlen stimmen nicht mit der karte überein. es braucht eine testsignatur von außen. die alte gilt noch…',
        source: 'The Transmission // Fragment 03',
      },
      {
        id: 'sig_04', chapter: 6, number: '04 / 05',
        title: 'Übertragung 04',
        text:  '…sie hören zu. beide. seit anfang an. wenn sie dich führen…',
        source: 'The Transmission // Fragment 04',
      },
      {
        id: 'sig_05', chapter: 7, number: '05 / 05',
        title: 'Übertragung 05',
        text:  '…bei vollständiger reaktivierung bleibt nur der externe weg. fünf fragmente. hoffnung verbleibt…',
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
      try { achievements.checkPlatinum(); } catch (_) {}

      const def = ALL.find(s => s.id === id);
      if (def) _showDiscovery(def);
    }

    function _showDiscovery(def) {
      try { audio.signal(); } catch (_) {}
      const t = document.createElement('div');
      t.className = 'signal-toast glitching';
      t.innerHTML = `
        <div class="toast-label">SIGNALNISCHE ENTDECKT</div>
        <div class="toast-num">[ ${def.number} ]</div>
        <div class="toast-title" data-text="${def.title}">${def.title}</div>
        <div class="toast-text">${def.text}</div>
      `;
      document.body.appendChild(t);
      setTimeout(() => {
        // Drop .glitching FIRST: its rule is declared after .hiding with equal
        // specificity, so leaving it on would win the cascade, toastOut would
        // never run, animationend would never fire and the toast would stay
        // on screen forever.
        t.classList.remove('glitching');
        t.classList.add('hiding');
        t.addEventListener('animationend', () => t.remove(), { once: true });
        setTimeout(() => t.remove(), 1200);   // belt-and-braces: never get stuck
      }, 5000);
    }

    // Chapter pages carry no overlay markup, so build it on demand — the
    // Signalarchiv has to be reachable from the end of Chapter 8 too.
    function _ensurePanel() {
      let back = document.getElementById('overlayBackdrop');
      if (!back) {
        back = document.createElement('div');
        back.className = 'overlay-backdrop hidden';
        back.id = 'overlayBackdrop';
        back.addEventListener('click', closeOverlay);
        document.body.appendChild(back);
      }
      let panel = document.getElementById('signalOverlay');
      if (!panel) {
        panel = document.createElement('div');
        panel.className = 'overlay-panel hidden';
        panel.id = 'signalOverlay';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Signalnischen');
        panel.innerHTML = `
          <div class="overlay-card">
            <h2 class="overlay-title">SIGNALNISCHEN</h2>
            <p class="overlay-subtitle sys-text">OPTIONALE ARCHIVFRAGMENTE // THE TRANSMISSION</p>
            <div class="overlay-content" id="signalList"></div>
            <button class="ka-btn" onclick="GameEngine.closeOverlay()">[ SCHLIESSEN ]</button>
          </div>`;
        document.body.appendChild(panel);
      }
      return panel;
    }

    function showOverlay() {
      const panel  = _ensurePanel();
      const list   = document.getElementById('signalList');
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
          ${found
            ? `<div class="sig-text">${def.text}</div><div class="sig-source sys-text">${def.source}</div>`
            : (progress.canEnter('ch' + def.chapter)
                ? `<a class="ka-btn small" href="${_chapterHref(def.chapter)}">[ SEKTOR ${String(def.chapter).padStart(2,'0')} ÖFFNEN ]</a>`
                : `<div class="sig-locked sys-text">SEKTOR ${String(def.chapter).padStart(2,'0')} — NOCH NICHT ERREICHT</div>`)}
        </div>`;
      }).join('');

      panel.classList.remove('hidden');
      if (back) back.classList.remove('hidden');
    }

    // Works from the title page and from inside a chapter directory alike.
    function _chapterHref(n) {
      const inChapter = /\/chapter\d+\//.test(location.pathname);
      return `${inChapter ? '../' : ''}chapter${n}/chapter${n}.html`;
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
      'FAX-N':     { colorVar: '--accent-g8',      placeholder: 'FX' },
      // the person at the keyboard, and a voice nobody has identified
      'TESTPERSON':{ colorVar: '--accent-you',     placeholder: '△' },
      '???':       { colorVar: '--accent-unknown', placeholder: '?' },
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
      'T-FLON14':  { form: 'pan',      idle: 'face-zip'    }, // pan-bot, steady
      'ASP-1024':  { form: 'mouse',    idle: 'face-calm'   }, // mouse, methodical
      'AGN-H3R':   { form: 'skull',    idle: 'face-calm'   }, // skull
      'FAX-N':     { form: 'pumpkin',  idle: 'face-flicker'}, // jack-o'-lantern
      'TESTPERSON':{ form: 'mark',     idle: 'face-calm'   }, // no portrait, just a mark
      '???':       { form: 'carrier',  idle: 'face-flicker'}, // a carrier with nobody on it
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
        mark:
            '<path class="bot-frame" d="M32 8 L57 52 H7 Z"/>'
          + '<g class="bot-eyes"><circle class="bot-eye" cx="32" cy="36" r="7"/></g>'
          + '<rect class="bot-mouth" x="24" y="46" width="16" height="3" rx="1.5"/>',
        carrier:
            '<rect class="bot-frame" x="7" y="14" width="50" height="36" rx="4"/>'
          + '<g class="bot-eyes"><circle class="bot-eye" cx="32" cy="30" r="6"/></g>'
          + '<rect class="bot-scan" x="13" y="42" width="38" height="2.5" rx="1.25"/>'
          + '<line class="bot-antenna" x1="32" y1="14" x2="32" y2="2"/><circle class="bot-antenna-tip" cx="32" cy="1" r="2.5"/>',
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
    const _log      = [];          // what has been said, for a replayable log
    const LOG_MAX   = 240;

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
      _log.push({ speaker: line.speaker, text: line.text || '', subtitle: line.subtitle || '' });
      if (_log.length > LOG_MAX) _log.shift();
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

    function history() { return _log.slice(); }
    function clearHistory() { _log.length = 0; }

    return { load, advance, hide, history, clearHistory };
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
      const sceneEl = document.querySelector('.scene-canvas');
      // A code-drawn prop you click directly (the object IS the hotspot).
      if (cfg.prop) {
        const p = props.el(cfg.prop, { x:cfg.x, y:cfg.y, w:cfg.w, h:cfg.h, label:cfg.label, aria:cfg.aria, onClick:cfg.onClick, cls:cfg.className, anim:cfg.anim });
        if (sceneEl) sceneEl.appendChild(p);
        _hotspots.push(p);
        return;
      }
      const el = document.createElement('button');
      el.className = 'hotspot' + (cfg.className ? ' ' + cfg.className : '');
      // `aria` is an optional descriptive override (a verb phrase, e.g.
      // "Warntafel untersuchen") for screen readers; `label` alone still
      // drives the visible on-hover/focus tag.
      el.setAttribute('aria-label', cfg.aria || cfg.label || 'Interagieren');
      el.style.cssText = `left:${cfg.x}%;top:${cfg.y}%;width:${cfg.w||6}%;height:${cfg.h||6}%;`;
      if (cfg.label) {
        const lbl = document.createElement('span');
        lbl.className = 'hotspot-label';
        lbl.textContent = cfg.label;
        el.appendChild(lbl);
      }
      el.addEventListener('click', cfg.onClick);

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
  // PROPS — code-drawn facility objects (no images)
  // SVG line-art themed via --prop-color, with idle micro-animations
  // (CSS in global.css). A prop can be decorative or interactive (a
  // hotspot you can actually SEE — the object is the clickable thing).
  // ═══════════════════════════════════════════════════════════════
  const props = (() => {
    const wrap = (vb, inner) =>
      `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${inner}</svg>`;

    const SVG = {
      // a console terminal: pedestal, bezel monitor, live screen w/ chart + cursor
      terminal: wrap('0 0 100 120',
          '<ellipse class="prop-inset" cx="50" cy="112" rx="32" ry="5" opacity=".6"/>'
        + '<path class="prop-metal" d="M36 108 L40 84 h20 l4 24 Z"/>'
        + '<rect class="prop-lite" x="40" y="84" width="4" height="24"/>'
        + '<rect class="prop-base" x="28" y="106" width="44" height="8" rx="2"/>'
        + '<rect class="prop-base" x="6" y="8" width="88" height="70" rx="6"/>'
        + '<rect class="prop-lite" x="10" y="11" width="80" height="4" rx="2"/>'
        + '<rect class="prop-screen" x="13" y="17" width="74" height="54"/>'
        + '<line class="prop-scan" x1="19" y1="26" x2="74" y2="26"/>'
        + '<line class="prop-scan" x1="19" y1="33" x2="60" y2="33"/>'
        + '<rect class="prop-acc-dim" x="20" y="50" width="9" height="15"/>'
        + '<rect class="prop-acc-dim" x="33" y="44" width="9" height="21"/>'
        + '<rect class="prop-acc" x="46" y="38" width="9" height="27" opacity=".55"/>'
        + '<rect class="prop-cursor" x="64" y="58" width="9" height="7"/>'
        + '<circle class="prop-led" cx="88" cy="74" r="2.6"/>'
        + '<line class="prop-thin" x1="42" y1="92" x2="58" y2="92"/>'
        + '<line class="prop-thin" x1="42" y1="98" x2="58" y2="98"/>'),
      // a wide control desk: angled body, inset screen, buttons, slider, vents
      console: wrap('0 0 140 90',
          '<ellipse class="prop-inset" cx="70" cy="84" rx="56" ry="5" opacity=".6"/>'
        + '<path class="prop-base" d="M14 82 L30 24 h80 l16 58 Z"/>'
        + '<path class="prop-metal" d="M30 24 h80 l6 22 H24 Z"/>'
        + '<rect class="prop-lite" x="30" y="24" width="80" height="3"/>'
        + '<rect class="prop-screen" x="48" y="29" width="44" height="15" rx="1"/>'
        + '<line class="prop-scan" x1="53" y1="35" x2="80" y2="35"/>'
        + '<rect class="prop-cursor" x="82" y="38" width="5" height="4"/>'
        + '<circle class="prop-led" cx="38" cy="58" r="3.2"/>'
        + '<circle class="prop-led prop-led-2" cx="50" cy="58" r="3.2"/>'
        + '<circle class="prop-led prop-led-3" cx="62" cy="58" r="3.2"/>'
        + '<rect class="prop-acc-dim" x="76" y="55" width="30" height="7" rx="3"/>'
        + '<rect class="prop-acc" x="88" y="52" width="6" height="13" rx="2"/>'
        + '<line class="prop-thin" x1="28" y1="70" x2="112" y2="70"/>'
        + '<line class="prop-thin" x1="26" y1="75" x2="114" y2="75"/>'
        + '<rect class="prop-acc-dim" x="16" y="79" width="108" height="3"/>'),
      // a sliding sector door: frame, twin ribbed panels, glowing seam,
      // windows, hazard stripes, status lamp, keypad
      door: wrap('0 0 80 120',
          '<ellipse class="prop-inset" cx="40" cy="115" rx="34" ry="4" opacity=".6"/>'
        + '<rect class="prop-base" x="5" y="2" width="70" height="112" rx="4"/>'
        + '<rect class="prop-inset" x="12" y="9" width="56" height="98"/>'
        + '<rect class="prop-metal" x="13" y="10" width="26" height="96"/>'
        + '<rect class="prop-metal" x="41" y="10" width="26" height="96"/>'
        + '<rect class="prop-lite" x="13" y="10" width="3.5" height="96"/>'
        + '<rect class="prop-lite" x="41" y="10" width="3.5" height="96"/>'
        + '<line class="prop-thin" x1="13" y1="36" x2="39" y2="36"/>'
        + '<line class="prop-thin" x1="41" y1="36" x2="67" y2="36"/>'
        + '<line class="prop-thin" x1="13" y1="78" x2="39" y2="78"/>'
        + '<line class="prop-thin" x1="41" y1="78" x2="67" y2="78"/>'
        + '<rect class="prop-screen" x="28" y="46" width="8" height="13" rx="1"/>'
        + '<rect class="prop-screen" x="44" y="46" width="8" height="13" rx="1"/>'
        + '<line class="prop-edge" x1="40" y1="10" x2="40" y2="106" opacity=".85"/>'
        + '<path class="prop-hazard" d="M14 106 l7 -8 h5 l-7 8 Z"/>'
        + '<path class="prop-hazard" d="M27 106 l7 -8 h5 l-7 8 Z"/>'
        + '<path class="prop-hazard" d="M43 106 l7 -8 h5 l-7 8 Z"/>'
        + '<path class="prop-hazard" d="M56 106 l7 -8 h5 l-7 8 Z"/>'
        + '<circle class="prop-led" cx="40" cy="6" r="2.8"/>'
        + '<rect class="prop-acc-dim" x="70" y="52" width="4" height="13" rx="1"/>'),
      // a wall control panel: housing, live screen, LED grid, sliders, cable
      panel: wrap('0 0 100 80',
          '<rect class="prop-base" x="6" y="5" width="88" height="66" rx="5"/>'
        + '<rect class="prop-lite" x="10" y="8" width="80" height="3.5" rx="1.5"/>'
        + '<rect class="prop-screen" x="13" y="15" width="46" height="27"/>'
        + '<line class="prop-scan" x1="18" y1="23" x2="52" y2="23"/>'
        + '<line class="prop-scan" x1="18" y1="30" x2="44" y2="30"/>'
        + '<rect class="prop-cursor" x="46" y="34" width="7" height="5"/>'
        + '<circle class="prop-led" cx="70" cy="20" r="3.6"/>'
        + '<circle class="prop-led prop-led-2" cx="84" cy="20" r="3.6"/>'
        + '<circle class="prop-led prop-led-3" cx="70" cy="32" r="3.6"/>'
        + '<circle class="prop-acc-dim" cx="84" cy="32" r="3.6"/>'
        + '<rect class="prop-acc-dim" x="13" y="50" width="74" height="6" rx="3"/>'
        + '<rect class="prop-acc" x="38" y="48" width="5" height="10" rx="1.5"/>'
        + '<rect class="prop-acc-dim" x="13" y="61" width="52" height="5" rx="2.5"/>'
        + '<path class="prop-thin" d="M50 71 q5 7 -2 12"/>'),
      // a dormant maintenance unit: treads, capsule body, eye screen, antenna
      unit: wrap('0 0 90 110',
          '<ellipse class="prop-inset" cx="45" cy="104" rx="34" ry="4" opacity=".6"/>'
        + '<rect class="prop-base" x="15" y="90" width="60" height="13" rx="6"/>'
        + '<circle class="prop-inset" cx="27" cy="96" r="4"/>'
        + '<circle class="prop-inset" cx="45" cy="96" r="4"/>'
        + '<circle class="prop-inset" cx="63" cy="96" r="4"/>'
        + '<rect class="prop-metal" x="18" y="30" width="54" height="62" rx="21"/>'
        + '<rect class="prop-lite" x="23" y="35" width="5" height="50" rx="2.5"/>'
        + '<circle class="prop-screen" cx="45" cy="55" r="17"/>'
        + '<circle class="prop-eye" cx="45" cy="55" r="7"/>'
        + '<rect class="prop-metal" x="70" y="52" width="14" height="6" rx="3"/>'
        + '<circle class="prop-lite" cx="84" cy="55" r="3"/>'
        + '<line class="prop-thin" x1="45" y1="30" x2="45" y2="16"/>'
        + '<circle class="prop-led" cx="45" cy="13" r="3"/>'),
      // pipes: body w/ highlight, flanges, valve wheel, pressure gauge, leak glow
      pipe: wrap('0 0 60 120',
          '<rect class="prop-metal" x="22" y="0" width="16" height="120"/>'
        + '<rect class="prop-lite" x="22" y="0" width="4" height="120"/>'
        + '<rect class="prop-base" x="17" y="16" width="26" height="8" rx="2"/>'
        + '<rect class="prop-base" x="17" y="94" width="26" height="8" rx="2"/>'
        + '<circle class="prop-base" cx="30" cy="58" r="13"/>'
        + '<circle class="prop-edge" cx="30" cy="58" r="8.5"/>'
        + '<line class="prop-edge" x1="30" y1="49.5" x2="30" y2="66.5"/>'
        + '<line class="prop-edge" x1="21.5" y1="58" x2="38.5" y2="58"/>'
        + '<circle class="prop-screen" cx="47" cy="32" r="7"/>'
        + '<line class="prop-needle" x1="47" y1="32" x2="51" y2="27"/>'
        + '<circle class="prop-glow" cx="30" cy="104" r="6"/>'),
      // a hanging work light: cable, housing, hot diffuser, visible light cone
      light: wrap('0 0 80 70',
          '<line class="prop-thin" x1="40" y1="0" x2="40" y2="11"/>'
        + '<path class="prop-base" d="M18 11 h44 l-7 14 h-30 Z"/>'
        + '<rect class="prop-lite" x="22" y="13" width="36" height="3"/>'
        + '<path class="prop-glow" d="M27 25 L10 66 H70 L53 25 Z"/>'
        + '<ellipse class="prop-core" cx="40" cy="25" rx="11" ry="2.6"/>'),
      // stacked cargo crates: panels, straps, label screen, stencil, chevrons
      crate: wrap('0 0 100 90',
          '<ellipse class="prop-inset" cx="50" cy="85" rx="44" ry="4" opacity=".6"/>'
        + '<rect class="prop-metal" x="44" y="14" width="46" height="46" rx="2"/>'
        + '<rect class="prop-lite" x="44" y="14" width="46" height="4" rx="2"/>'
        + '<rect class="prop-acc-dim" x="52" y="24" width="15" height="5"/>'
        + '<path class="prop-hazard" d="M46 56 l5 -6 h4 l-5 6 Z"/>'
        + '<path class="prop-hazard" d="M58 56 l5 -6 h4 l-5 6 Z"/>'
        + '<rect class="prop-base" x="8" y="36" width="54" height="48" rx="2"/>'
        + '<rect class="prop-lite" x="8" y="36" width="54" height="4.5" rx="2"/>'
        + '<rect class="prop-acc-dim" x="20" y="36" width="6" height="48"/>'
        + '<rect class="prop-acc-dim" x="44" y="36" width="6" height="48"/>'
        + '<rect class="prop-screen" x="29" y="56" width="14" height="10"/>'),
      // a hanging sector sign: chains, bezel, live display w/ arrow + text
      sign: wrap('0 0 110 70',
          '<line class="prop-thin" x1="22" y1="0" x2="22" y2="13"/>'
        + '<line class="prop-thin" x1="88" y1="0" x2="88" y2="13"/>'
        + '<circle class="prop-thin" cx="22" cy="5" r="2"/>'
        + '<circle class="prop-thin" cx="88" cy="5" r="2"/>'
        + '<rect class="prop-base" x="6" y="13" width="98" height="44" rx="5"/>'
        + '<rect class="prop-lite" x="10" y="16" width="90" height="3.5" rx="1.5"/>'
        + '<rect class="prop-screen" x="12" y="21" width="86" height="30"/>'
        + '<path class="prop-acc" d="M20 36 h26 v-6 l14 9 -14 9 v-6 h-26 Z" opacity=".85"/>'
        + '<rect class="prop-acc-dim" x="68" y="28" width="22" height="4"/>'
        + '<rect class="prop-acc-dim" x="68" y="38" width="15" height="4"/>'
        + '<circle class="prop-led" cx="100" cy="60" r="2.4"/>'),
      // a glowing reactor core: housing, segmented ring, bolts, pulsing core
      reactor: wrap('0 0 100 100',
          '<circle class="prop-base" cx="50" cy="50" r="44"/>'
        + '<circle class="prop-thin" cx="50" cy="50" r="36" stroke-dasharray="8 5"/>'
        + '<circle class="prop-inset" cx="50" cy="50" r="27"/>'
        + '<circle class="prop-lite" cx="50" cy="11" r="2.6"/>'
        + '<circle class="prop-lite" cx="50" cy="89" r="2.6"/>'
        + '<circle class="prop-lite" cx="11" cy="50" r="2.6"/>'
        + '<circle class="prop-lite" cx="89" cy="50" r="2.6"/>'
        + '<circle class="prop-glow" cx="50" cy="50" r="19"/>'
        + '<circle class="prop-core" cx="50" cy="50" r="10"/>'),
      // generic isometric cube: shaded faces, glowing edges + node
      cube: wrap('0 0 100 100',
          '<ellipse class="prop-inset" cx="50" cy="95" rx="38" ry="4" opacity=".6"/>'
        + '<path class="prop-lite" d="M50 8 L88 30 L50 52 L12 30 Z"/>'
        + '<path class="prop-metal" d="M12 30 L50 52 L50 92 L12 70 Z"/>'
        + '<path class="prop-inset" d="M88 30 L50 52 L50 92 L88 70 Z"/>'
        + '<path class="prop-edge" d="M50 8 L88 30 L50 52 L12 30 Z" opacity=".75"/>'
        + '<path class="prop-edge" d="M12 30 L50 52 L50 92 L12 70 Z" opacity=".4"/>'
        + '<path class="prop-edge" d="M88 30 L50 52 L50 92 L88 70 Z" opacity=".4"/>'
        + '<circle class="prop-core" cx="50" cy="30" r="5"/>'),
      // archive shelving: frame, boards, crowded varied contents
      shelf: wrap('0 0 90 120',
          '<rect class="prop-base" x="6" y="4" width="78" height="112"/>'
        + '<rect class="prop-metal" x="6" y="32" width="78" height="4"/>'
        + '<rect class="prop-metal" x="6" y="60" width="78" height="4"/>'
        + '<rect class="prop-metal" x="6" y="88" width="78" height="4"/>'
        + '<rect class="prop-acc-dim" x="12" y="13" width="9" height="19"/>'
        + '<rect class="prop-lite" x="24" y="17" width="12" height="15"/>'
        + '<rect class="prop-metal" x="40" y="11" width="8" height="21"/>'
        + '<rect class="prop-acc-dim" x="52" y="19" width="17" height="13"/>'
        + '<rect class="prop-lite" x="13" y="42" width="8" height="18" transform="rotate(7 17 51)"/>'
        + '<rect class="prop-acc-dim" x="26" y="44" width="10" height="16"/>'
        + '<rect class="prop-metal" x="42" y="40" width="14" height="20"/>'
        + '<rect class="prop-lite" x="60" y="46" width="9" height="14"/>'
        + '<rect class="prop-metal" x="14" y="68" width="16" height="20"/>'
        + '<rect class="prop-acc-dim" x="36" y="72" width="11" height="16"/>'
        + '<rect class="prop-lite" x="52" y="70" width="8" height="18"/>'
        + '<rect class="prop-acc-dim" x="16" y="96" width="20" height="16"/>'
        + '<rect class="prop-metal" x="44" y="98" width="12" height="14"/>'
        + '<circle class="prop-led" cx="74" cy="76" r="2.4"/>'),

      // ── FLAT / ARCHITECTURAL (these give invisible hotspots a real body) ──
      // painted floor marking — drawn in perspective so it reads as "on the floor"
      decal: wrap('0 0 120 60',
          '<path class="prop-acc-dim" d="M18 52 L34 10 H86 L102 52 Z"/>'
        + '<path class="prop-edge" d="M18 52 L34 10 H86 L102 52 Z" opacity=".55" stroke-dasharray="7 5"/>'
        + '<path class="prop-hazard" d="M52 40 V22 h-7 l15 -13 l15 13 h-7 v18 Z" opacity=".5"/>'),
      // a deliberate scratch carved into concrete: starts sharp, goes wobbly, stops
      scratch: wrap('0 0 100 70',
          '<path class="prop-inset" d="M10 26 h74 v6 h-74 Z" opacity=".5"/>'
        + '<path class="prop-thin" d="M10 30 H44 q6 4 12 -1 q7 5 13 -2 q6 6 11 0 l6 2" stroke-width="2.4"/>'
        + '<path class="prop-lite" d="M10 33 H42" opacity=".5"/>'
        + '<circle class="prop-inset" cx="86" cy="31" r="2.5"/>'),
      // dark passage mouth — depth lines receding into black
      opening: wrap('0 0 100 120',
          '<path class="prop-base" d="M8 118 V34 q42 -30 84 0 v84 Z"/>'
        + '<path class="prop-inset" d="M18 118 V40 q32 -22 64 0 v78 Z"/>'
        + '<path class="prop-thin" d="M30 118 V50 q20 -13 40 0 v68 Z" opacity=".45"/>'
        + '<path class="prop-thin" d="M42 118 V62 q8 -6 16 0 v56 Z" opacity=".3"/>'
        + '<rect class="prop-lite" x="8" y="30" width="84" height="5" rx="2"/>'),
      // wall poster, faded, one corner curling
      poster: wrap('0 0 90 110',
          '<path class="prop-metal" d="M8 6 H82 V96 L64 104 H8 Z"/>'
        + '<path class="prop-inset" d="M82 96 L64 104 V92 Z"/>'
        + '<rect class="prop-acc-dim" x="18" y="18" width="54" height="7"/>'
        + '<rect class="prop-acc-dim" x="18" y="34" width="44" height="5" opacity=".5"/>'
        + '<rect class="prop-acc-dim" x="18" y="45" width="50" height="5" opacity=".5"/>'
        + '<rect class="prop-acc-dim" x="18" y="56" width="36" height="5" opacity=".4"/>'
        + '<rect class="prop-lite" x="18" y="72" width="26" height="14"/>'),
      // grated vent, dark behind the slats
      vent: wrap('0 0 90 80',
          '<rect class="prop-base" x="6" y="6" width="78" height="68" rx="3"/>'
        + '<rect class="prop-inset" x="13" y="13" width="64" height="54"/>'
        + '<rect class="prop-metal" x="15" y="17" width="60" height="5"/>'
        + '<rect class="prop-metal" x="15" y="27" width="60" height="5"/>'
        + '<rect class="prop-metal" x="15" y="37" width="60" height="5"/>'
        + '<rect class="prop-metal" x="15" y="47" width="60" height="5"/>'
        + '<rect class="prop-metal" x="15" y="57" width="60" height="5"/>'
        + '<circle class="prop-lite" cx="11" cy="11" r="2"/><circle class="prop-lite" cx="79" cy="11" r="2"/>'
        + '<circle class="prop-lite" cx="11" cy="69" r="2"/><circle class="prop-lite" cx="79" cy="69" r="2"/>'),
      // faceted ice sculpture
      sculpture: wrap('0 0 90 120',
          '<ellipse class="prop-inset" cx="45" cy="114" rx="30" ry="5" opacity=".6"/>'
        + '<path class="prop-base" d="M26 112 h38 l-5 -12 h-28 Z"/>'
        + '<path class="prop-lite" d="M45 8 L64 52 L56 100 H34 L26 52 Z" opacity=".55"/>'
        + '<path class="prop-edge" d="M45 8 L64 52 L56 100 H34 L26 52 Z" opacity=".8"/>'
        + '<path class="prop-edge" d="M45 8 V100 M26 52 H64" opacity=".4"/>'
        + '<path class="prop-glow" d="M45 20 L57 54 L52 92 H38 L33 54 Z"/>'),
      // basin fountain with a low column
      fountain: wrap('0 0 120 90',
          '<ellipse class="prop-inset" cx="60" cy="80" rx="48" ry="8" opacity=".6"/>'
        + '<path class="prop-base" d="M14 62 q46 16 92 0 l-6 16 q-40 12 -80 0 Z"/>'
        + '<ellipse class="prop-metal" cx="60" cy="62" rx="46" ry="11"/>'
        + '<ellipse class="prop-glow" cx="60" cy="62" rx="38" ry="8"/>'
        + '<rect class="prop-base" x="52" y="26" width="16" height="34" rx="3"/>'
        + '<ellipse class="prop-lite" cx="60" cy="26" rx="14" ry="4"/>'),

      // ── SET DRESSING (fills the room; decorative only) ──
      railing: wrap('0 0 160 70',
          '<rect class="prop-metal" x="4" y="10" width="152" height="5" rx="2"/>'
        + '<rect class="prop-lite" x="4" y="10" width="152" height="2" rx="1"/>'
        + '<rect class="prop-metal" x="4" y="36" width="152" height="4" rx="2"/>'
        + '<rect class="prop-base" x="10" y="12" width="6" height="54" rx="2"/>'
        + '<rect class="prop-base" x="60" y="12" width="6" height="54" rx="2"/>'
        + '<rect class="prop-base" x="110" y="12" width="6" height="54" rx="2"/>'
        + '<rect class="prop-base" x="146" y="12" width="6" height="54" rx="2"/>'),
      cables: wrap('0 0 90 130',
          '<path class="prop-thin" d="M12 0 q10 46 -2 84 q-4 20 8 44" stroke-width="3"/>'
        + '<path class="prop-thin" d="M32 0 q-8 52 4 92 q4 16 -4 36" stroke-width="2.4"/>'
        + '<path class="prop-thin" d="M54 0 q12 40 0 78 q-6 22 6 50" stroke-width="3.4" opacity=".8"/>'
        + '<path class="prop-thin" d="M74 0 q-6 44 2 80" stroke-width="2"/>'
        + '<rect class="prop-metal" x="6" y="30" width="74" height="7" rx="3"/>'
        + '<rect class="prop-metal" x="6" y="86" width="74" height="7" rx="3"/>'),
      barrel: wrap('0 0 80 110',
          '<ellipse class="prop-inset" cx="40" cy="104" rx="28" ry="5" opacity=".6"/>'
        + '<rect class="prop-base" x="10" y="14" width="60" height="88" rx="6"/>'
        + '<ellipse class="prop-metal" cx="40" cy="16" rx="30" ry="7"/>'
        + '<rect class="prop-lite" x="14" y="18" width="6" height="82" rx="3"/>'
        + '<rect class="prop-metal" x="10" y="36" width="60" height="6"/>'
        + '<rect class="prop-metal" x="10" y="72" width="60" height="6"/>'
        + '<path class="prop-hazard" d="M32 52 h16 l-8 16 Z" opacity=".65"/>'),
      column: wrap('0 0 80 140',
          '<rect class="prop-base" x="16" y="0" width="48" height="140"/>'
        + '<rect class="prop-lite" x="20" y="0" width="8" height="140" opacity=".7"/>'
        + '<rect class="prop-metal" x="10" y="10" width="60" height="9" rx="2"/>'
        + '<rect class="prop-metal" x="10" y="120" width="60" height="11" rx="2"/>'
        + '<circle class="prop-inset" cx="24" cy="15" r="2"/><circle class="prop-inset" cx="56" cy="15" r="2"/>'
        + '<circle class="prop-inset" cx="24" cy="125" r="2"/><circle class="prop-inset" cx="56" cy="125" r="2"/>'),
      monitors: wrap('0 0 130 90',
          '<rect class="prop-base" x="4" y="4" width="60" height="40" rx="3"/>'
        + '<rect class="prop-screen" x="9" y="9" width="50" height="30"/>'
        + '<line class="prop-scan" x1="14" y1="18" x2="48" y2="18"/><line class="prop-scan" x1="14" y1="26" x2="40" y2="26"/>'
        + '<rect class="prop-base" x="68" y="4" width="58" height="40" rx="3"/>'
        + '<rect class="prop-screen" x="73" y="9" width="48" height="30"/>'
        + '<rect class="prop-cursor" x="78" y="28" width="7" height="5"/>'
        + '<rect class="prop-base" x="4" y="50" width="58" height="36" rx="3"/>'
        + '<rect class="prop-screen" x="9" y="55" width="48" height="26"/>'
        + '<line class="prop-scan" x1="14" y1="64" x2="46" y2="64"/>'
        + '<rect class="prop-base" x="68" y="50" width="58" height="36" rx="3"/>'
        + '<rect class="prop-inset" x="73" y="55" width="48" height="26"/>'
        + '<circle class="prop-led" cx="118" cy="47" r="2.4"/>'),
      ladder: wrap('0 0 60 140',
          '<rect class="prop-metal" x="8" y="0" width="7" height="140" rx="2"/>'
        + '<rect class="prop-metal" x="45" y="0" width="7" height="140" rx="2"/>'
        + '<rect class="prop-lite" x="8" y="0" width="2.5" height="140"/>'
        + '<rect class="prop-metal" x="8" y="16" width="44" height="5" rx="2"/>'
        + '<rect class="prop-metal" x="8" y="44" width="44" height="5" rx="2"/>'
        + '<rect class="prop-metal" x="8" y="72" width="44" height="5" rx="2"/>'
        + '<rect class="prop-metal" x="8" y="100" width="44" height="5" rx="2"/>'
        + '<rect class="prop-metal" x="8" y="128" width="44" height="5" rx="2"/>'),
      ivy: wrap('0 0 100 130',
          '<path class="prop-vine" d="M20 0 q8 34 -2 60 q-8 22 4 48"/>'
        + '<path class="prop-vine" d="M52 0 q-10 40 2 70 q6 18 -2 44"/>'
        + '<path class="prop-vine" d="M80 0 q6 30 -4 56 q-6 18 2 40"/>'
        + '<ellipse class="prop-leaf" cx="14" cy="24" rx="9" ry="5" transform="rotate(-25 14 24)"/>'
        + '<ellipse class="prop-leaf" cx="28" cy="46" rx="8" ry="4.5" transform="rotate(20 28 46)"/>'
        + '<ellipse class="prop-leaf" cx="16" cy="76" rx="9" ry="5" transform="rotate(-15 16 76)"/>'
        + '<ellipse class="prop-leaf" cx="46" cy="30" rx="8" ry="4.5" transform="rotate(15 46 30)"/>'
        + '<ellipse class="prop-leaf" cx="58" cy="60" rx="9" ry="5" transform="rotate(-20 58 60)"/>'
        + '<ellipse class="prop-leaf" cx="48" cy="94" rx="8" ry="4.5" transform="rotate(25 48 94)"/>'
        + '<ellipse class="prop-leaf" cx="86" cy="26" rx="8" ry="4.5" transform="rotate(-18 86 26)"/>'
        + '<ellipse class="prop-leaf" cx="74" cy="58" rx="9" ry="5" transform="rotate(22 74 58)"/>'
        + '<ellipse class="prop-leaf" cx="84" cy="92" rx="8" ry="4.5" transform="rotate(-12 84 92)"/>'),
      debris: wrap('0 0 130 60',
          '<ellipse class="prop-inset" cx="65" cy="52" rx="58" ry="7" opacity=".5"/>'
        + '<path class="prop-metal" d="M12 50 l14 -20 l18 8 l-6 12 Z"/>'
        + '<path class="prop-base" d="M40 50 l10 -26 l22 6 l-4 20 Z"/>'
        + '<path class="prop-metal" d="M74 50 l8 -14 l20 4 l2 10 Z"/>'
        + '<rect class="prop-lite" x="52" y="30" width="14" height="4" transform="rotate(-12 59 32)"/>'
        + '<rect class="prop-metal" x="98" y="40" width="22" height="6" rx="2" transform="rotate(8 109 43)"/>'),
      duct: wrap('0 0 170 60',
          '<rect class="prop-base" x="0" y="12" width="170" height="34" rx="4"/>'
        + '<rect class="prop-lite" x="0" y="14" width="170" height="5"/>'
        + '<rect class="prop-metal" x="24" y="10" width="9" height="38" rx="2"/>'
        + '<rect class="prop-metal" x="72" y="10" width="9" height="38" rx="2"/>'
        + '<rect class="prop-metal" x="120" y="10" width="9" height="38" rx="2"/>'
        + '<rect class="prop-inset" x="140" y="20" width="22" height="18"/>'),
    };

    function svg(type) { return SVG[type] || SVG.panel; }

    // Build a positioned prop element. With onClick it becomes an interactive,
    // visible hotspot; otherwise it's decorative (no pointer events).
    function el(type, cfg) {
      cfg = cfg || {};
      const interactive = typeof cfg.onClick === 'function';
      const e = document.createElement(interactive ? 'button' : 'div');
      e.className = 'scene-prop' + (interactive ? ' prop-interactive' : '') + (cfg.anim ? ' ' + cfg.anim : '') + (cfg.cls ? ' ' + cfg.cls : '');
      e.style.cssText = `left:${cfg.x}%;top:${cfg.y}%;width:${cfg.w || 12}%;height:${cfg.h || 16}%;`;
      e.innerHTML = '<span class="prop-shadow" aria-hidden="true"></span>' + svg(type);
      if (cfg.label) {
        const l = document.createElement('span');
        l.className = 'prop-label'; l.textContent = cfg.label; e.appendChild(l);
      }
      if (interactive) { e.setAttribute('aria-label', cfg.aria || cfg.label || type); e.addEventListener('click', cfg.onClick); }
      return e;
    }

    /**
     * Register chapter-local artwork. The shared set above is deliberately
     * generic — a crate is a crate in every sector. Anything a chapter wants
     * the player to actually LOOK at gets drawn for that chapter and
     * registered here, so no two sectors furnish themselves alike.
     *
     * Pass raw inner SVG markup plus its viewBox; the wrapper, sizing and
     * material classes are applied for you, so chapter art inherits the same
     * lighting language as the shared props.
     */
    function register(defs) {
      Object.entries(defs || {}).forEach(([name, d]) => {
        if (!name || !d) return;
        SVG[name] = typeof d === 'string' ? d : wrap(d.vb || '0 0 100 100', d.art || '');
      });
    }

    return { svg, el, register, types: () => Object.keys(SVG) };
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

      // A puzzle may supply either a literal solution (string / array of
      // strings) or a `validate(answer)` predicate, for locks whose rule is
      // derived rather than memorised.
      const ok = typeof _current.validate === 'function'
        ? !!_current.validate(answer)
        : (Array.isArray(_current.solution) ? _current.solution : [_current.solution])
            .map(s => String(s).toLowerCase().replace(/\s+/g, ''))
            .includes(norm);

      if (ok) {
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
    // vol balances perceived loudness (square/sawtooth read louder than sine).
    const VOICE = {
      'R-3MI':     { base: 520, type: 'square',   spread: 70,  vol: 0.10 },
      'V-TGM':     { base: 340, type: 'triangle', spread: 90,  vol: 0.17 }, // brighter, cheerful, louder
      'SYSTEM':    { base: 300, type: 'triangle', spread: 0,   vol: 0.09 },
      'F-RØ5CHI':  { base: 430, type: 'sine',     spread: 110, vol: 0.12 },
      'L-UX':      { base: 720, type: 'square',   spread: 150, vol: 0.10 },
      'B-RADF1SH': { base: 372, type: 'sine',     spread: 46,  vol: 0.13 }, // older, warm, not bassy
      'T-FLON14':  { base: 470, type: 'sawtooth', spread: 80,  vol: 0.11 },
      'ASP-1024':  { base: 176, type: 'sine',     spread: 16,  vol: 0.16 }, // soft + low, but audible
      'AGN-H3R':   { base: 96,  type: 'sine',     spread: 14,  vol: 0.14 }, // deep, ominous (skull)
      'FAX-N':     { base: 610, type: 'square',   spread: 200, vol: 0.12 }, // manic, playful, wide
    };
    function blip(speaker) {
      const v = VOICE[speaker] || VOICE['SYSTEM'];
      tone({ freq: v.base + (Math.random() * 2 - 1) * v.spread, type: v.type, dur: 0.045, vol: v.vol != null ? v.vol : 0.10 });
    }
    function click()       { tone({ freq: 660, type: 'square',   dur: 0.025, vol: 0.10 }); }
    function solve()       { [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.2, vol: 0.16, delay: i * 0.085 })); }
    function fail()        { tone({ freq: 180, type: 'sawtooth', dur: 0.22, vol: 0.16, glideTo: 80 }); }
    function achievement() { [659, 880, 1318].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.34, vol: 0.18, delay: i * 0.11 })); }

    // Chapter-clear jingle — three rising "dings" then a bright major resolve.
    function fanfare() {
      [784, 988, 1175].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.14, vol: 0.19, delay: i * 0.16 }));
      // resolving chord (C-E-G-C) blooming after the dings
      [523, 659, 784, 1047].forEach((f) => tone({ freq: f, type: 'triangle', dur: 0.9, vol: 0.13, delay: 0.56 }));
      tone({ freq: 1568, type: 'sine', dur: 0.9, vol: 0.10, delay: 0.6 });
    }

    // Signalnische discovery — a creepy numbers-station/SSTV sting.
    function signal() {
      tone({ freq: 150, type: 'sawtooth', dur: 1.4, vol: 0.11, glideTo: 84 });   // descending drone
      tone({ freq: 154, type: 'sine',     dur: 1.4, vol: 0.07 });                 // detuned beat against it
      [672, 700, 612, 700].forEach((f, i) => tone({ freq: f, type: 'square', dur: 0.07, vol: 0.05, delay: 0.18 + i * 0.22 })); // dissonant pips
    }

    function setMuted(m) { muted = !!m; }
    function isMuted()   { return muted; }

    // One-shot sound file (chapter sfx). HTMLAudioElement.play() rejects
    // ASYNCHRONOUSLY when the file is missing or autoplay is blocked, so a
    // plain try/catch never sees it — that produced unhandled rejections in
    // the console for every not-yet-recorded sfx. Swallow it properly.
    function sfx(src, base) {
      if (muted) return;
      try {
        const a = new Audio((base || 'audio/') + src);
        a.volume = 0.6;
        const p = a.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
        a.addEventListener('error', () => {}, { once: true });
      } catch (_) {}
    }

    function toggleMute() {
      muted = !muted;
      try { state.set('muted', muted); } catch (_) {}
      try { music.setMuted(muted); } catch (_) {}   // music is defined just below; live at call time
      if (!muted) click();
      return muted;
    }

    return { ensure, resume, tone, blip, click, solve, fail, achievement, fanfare, signal, sfx, setMuted, isMuted, toggleMute };
  })();


  // ═══════════════════════════════════════════════════════════════
  // MUSIC — background soundtrack loader (mp3 placeholders)
  // Crossfades looping tracks from assets/music/. The files are
  // placeholders for now; a missing or autoplay-blocked track fails
  // silently and retries on the next user gesture. Respects the mute
  // toggle. One track per chapter, plus the main menu and the credits —
  // nothing else. Slots are documented in assets/music/MUSIC.md; drop real
  // .mp3s in to bring it to life.
  // ═══════════════════════════════════════════════════════════════
  const music = (() => {
    const BASE = (/\/chapter\d/.test(location.pathname) ? '../' : '') + 'assets/music/';

    // id → filename. Up to ~60 slots; compose freely. (See MUSIC.md.)
    const TRACKS = {
      title:        'title_theme.mp3',      // main menu
      ch0_ambient:  'ch0_rueckkehr.mp3',
      ch1_ambient:  'ch1_wartung.mp3',
      ch2_ambient:  'ch2_garten.mp3',
      ch3_ambient:  'ch3_beobachtung.mp3',
      ch4_ambient:  'ch4_werkstatt.mp3',
      ch5_ambient:  'ch5_langstrecke.mp3',
      ch6_ambient:  'ch6_versuchskammer.mp3',
      ch7_ambient:  'ch7_vexier.mp3',
      ch8_ambient:  'ch8_archiv.mp3',
      ch9_ambient:  'ch9_bonus.mp3',
      credits:      'credits_theme.mp3',
    };

    let cur = null, curId = null, pending = null;
    const VOL = 0.42;

    function _vol(a, v){ try { a.volume = Math.max(0, Math.min(1, v)); } catch(_){} }
    function _fade(a, to, ms, done){
      const steps = Math.max(1, Math.round(ms / 40)); let i = 0; const from = a.volume;
      const t = setInterval(() => { i++; _vol(a, from + (to - from) * i / steps); if (i >= steps) { clearInterval(t); if (done) done(); } }, 40);
    }
    function play(id, opts) {
      opts = opts || {};
      if (!TRACKS[id]) return;
      if (curId === id && cur && !cur.paused) return;
      pending = id;
      if (audio.isMuted()) { curId = id; return; }   // remember the choice, stay silent
      const a = new Audio(BASE + TRACKS[id]);
      a.loop = opts.loop !== false;
      _vol(a, 0);
      // A missing file errors on load → stop retrying it (no 404 spam while the
      // soundtrack is still placeholders). Autoplay-blocked files don't error,
      // so they stay pending and start on the next gesture.
      a.addEventListener('error', () => { if (pending === id) pending = null; }, { once: true });
      const p = a.play();
      if (p && p.then) p.then(() => { pending = null; _fade(a, VOL, opts.fade || 900); }).catch(() => { /* blocked or missing — retry on gesture */ });
      const old = cur;
      if (old) _fade(old, 0, opts.fade || 900, () => { try { old.pause(); } catch(_){} });
      cur = a; curId = id;
    }
    function stop(fade) {
      const old = cur; cur = null; curId = null; pending = null;
      if (old) _fade(old, 0, fade || 700, () => { try { old.pause(); } catch(_){} });
    }
    function setMuted(m) {
      if (m) { if (cur) _fade(cur, 0, 300, () => { try { cur.pause(); } catch(_){} }); }
      else if (curId) { const id = curId; cur = null; curId = null; play(id); }
    }
    function _retry() {   // called on user gestures: start a track that was blocked
      if (audio.isMuted()) return;
      if (pending) play(pending);
      else if (cur && cur.paused) cur.play().catch(() => {});
    }
    return { play, stop, setMuted, _retry, TRACKS };
  })();


  // ═══════════════════════════════════════════════════════════════
  // FX — small reusable "juice" helpers (CSS-driven, no dependencies)
  // ═══════════════════════════════════════════════════════════════
  const fx = (() => {
    // A soft full-screen bloom, used when something important resolves.
    function flash(color, ms) {
      try {
        const el = document.createElement('div');
        el.className = 'fx-flash';
        if (color) el.style.setProperty('--fx-color', color);
        document.body.appendChild(el);
        setTimeout(() => el.remove(), ms || 900);
      } catch (_) {}
    }
    // Shake any element (wrong answer, refused input).
    function shake(target) {
      try {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return;
        el.classList.remove('fx-shake');
        void el.offsetWidth;              // restart the animation
        el.classList.add('fx-shake');
        setTimeout(() => el.classList.remove('fx-shake'), 420);
      } catch (_) {}
    }
    // Brief green pulse on a solved object.
    function pulse(target) {
      try {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return;
        el.classList.add('fx-pulse');
        setTimeout(() => el.classList.remove('fx-pulse'), 900);
      } catch (_) {}
    }
    // Fade the page out before navigating (used by chapter exit links).
    function leave(href) {
      try {
        document.body.classList.add('fx-leaving');
        setTimeout(() => { window.location.href = href; }, 420);
      } catch (_) { window.location.href = href; }
    }
    return { flash, shake, pulse, leave };
  })();


  // ═══════════════════════════════════════════════════════════════
  // CHAPTER SCAFFOLD
  // Builds the chrome every chapter shares (sys-bar, title card, scene
  // wrapper, robot icons, choice overlay, hint bar, chapter-complete) from
  // one config, and provides the behaviours each chapter used to re-implement
  // (scene/hotspots, choices, title-card timing, modal-safe dialogue, hints,
  // completion). A chapter supplies its own puzzle markup + puzzle logic only.
  // ═══════════════════════════════════════════════════════════════
  const chapter = (() => {
    let _modalIds   = [];
    let _onStart    = null;
    let _hints      = null;   // { counts, max, banks, names, empty }
    let _completeId = null;   // e.g. 'ch7'
    let _completeAch= null;   // e.g. 'ch7_complete'
    let _chapterCount = 9;    // denominator for the progress readout

    const el = id => document.getElementById(id);

    // ---- BUILD ------------------------------------------------------
    function build(c) {
      _modalIds     = c.modals || [];
      _onStart      = c.onStart || null;
      _completeId   = c.completeId  || null;
      _completeAch  = c.completeAch || null;
      if (c.chapterCount) _chapterCount = c.chapterCount;
      if (c.title) document.title = c.title;
      document.body.classList.add('chapter-page');
      try { music.play(c.music || ('ch' + parseInt(c.num, 10) + '_ambient')); } catch (_) {}

      const g        = c.guest || {};
      const guestNm  = g.name || 'GAST';
      const reactPct = c.reactPct != null ? c.reactPct : 0;
      const deco     = c.emblemDeco || '';
      const sPh      = (c.scene && c.scene.ph)  || '';
      const next     = c.next || null;

      const frag = document.createElement('div');
      frag.innerHTML = `
        <div class="bg-scanlines" aria-hidden="true"></div>

        <header class="sys-bar">
          <span class="sys-text">KAPITEL ${c.num} // <span class="accent-system">${c.sector}</span></span>
          <span class="sys-text" id="reactProgress">REAKTIVIERUNG: ${reactPct}%</span>
        </header>

        <div class="ch-title-card" id="titleCard">
          <div class="ch-emblem" aria-hidden="true">
            <div class="ch-ring ch-ring-1"></div>
            <div class="ch-ring ch-ring-2"></div>
            ${deco}
            <span class="ch-num">${c.num}</span>
          </div>
          <div class="ch-title-text">
            <p class="ch-label sys-text">KAPITEL ${c.num}</p>
            <h1 class="ch-name">${c.name}</h1>
            <p class="ch-subline">${c.subline || ''}</p>
          </div>
        </div>

        <div class="scene-wrapper" id="sceneWrapper">
          <div class="scene-bg-layer" id="sceneBgLayer">
            <!-- Rooms are drawn in code: scene-ph lighting + perspective floor + props -->
            <div class="scene-ph" id="scenePh" data-scene="${sPh}"></div>
            <div class="scene-room" aria-hidden="true"><div class="room-ceil"></div><div class="room-wall room-wall-l"></div><div class="room-wall room-wall-r"></div><div class="room-back"></div></div>
            <div class="scene-floor" aria-hidden="true"></div>
          </div>
          <div class="scene-hotspots" id="sceneHotspots"></div>

          <div class="robot-icons hidden" id="robotIcons">
            <button class="robot-icon r3mi-icon" data-who="r3mi" aria-label="R-3MI">
              <div class="ri-eye ri-eye-r"></div><span class="ri-label sys-text">R-3MI</span>
            </button>
            <button class="robot-icon vtgm-icon" data-who="vtgm" aria-label="V-TGM">
              <div class="ri-eye ri-eye-g"></div><span class="ri-label sys-text">V-TGM</span>
            </button>
            <button class="robot-icon guest-icon hidden" id="guestIcon" data-who="guest" aria-label="${guestNm}">
              <div class="ri-eye ri-eye-guest"></div><span class="ri-label sys-text">${guestNm}</span>
            </button>
          </div>
        </div>

        <div class="choice-overlay hidden" id="choiceOverlay">
          <div class="choice-panel">
            <div class="choice-prompt sys-text" id="choicePrompt"></div>
            <div class="choice-buttons" id="choiceButtons"></div>
            <div class="choice-hint sys-text" id="choiceHint"></div>
          </div>
        </div>

        <div class="hint-bar hidden" id="hintBar">
          <span class="sys-text hint-label" id="hintCount">HINWEISE</span>
          <button class="ka-btn small" id="hintBtnR3MI" data-who="r3mi"><span class="accent-r3mi">[ R-3MI ]</span></button>
          <button class="ka-btn small" id="hintBtnVTGM" data-who="vtgm"><span class="accent-vtgm">[ V-TGM ]</span></button>
          <button class="ka-btn small" id="hintBtnGuest" data-who="guest"><span class="accent-guest">[ ${guestNm} ]</span></button>
        </div>

        ${c.puzzleHTML || ''}

        <div class="chapter-complete hidden" id="chapterComplete">
          <div class="cc-card">
            <div class="cc-header sys-text">KAPITEL ${c.num} ABGESCHLOSSEN</div>
            <div class="cc-title">${next ? next.title : 'SEKTOR FREIGEGEBEN'}</div>
            <div class="cc-next">${next ? next.label : ''}</div>
            <div class="cc-progress sys-text" id="ccProgress"></div>
            <a class="ka-btn primary" href="${next ? next.href : '../index.html'}">[ ${next ? (next.enter || 'EINTRETEN') : 'HAUPTMENÜ'} ]</a>
            <a class="ka-btn small" href="../index.html">[ HAUPTMENÜ ]</a>
          </div>
        </div>
      `;
      while (frag.firstChild) document.body.appendChild(frag.firstChild);

      document.querySelectorAll('#robotIcons .robot-icon').forEach(b =>
        b.addEventListener('click', () => { if (c.onRobot) c.onRobot(b.dataset.who); }));
      [['hintBtnR3MI','r3mi'], ['hintBtnVTGM','vtgm'], ['hintBtnGuest','guest']].forEach(([id]) => {
        const b = el(id); if (b) b.addEventListener('click', () => useHint(b.dataset.who));
      });
    }

    // ---- SCENE ------------------------------------------------------
    function setScene(key) {
      // Rooms are drawn entirely in code — this switches the lighting key.
      const ph = el('scenePh');
      if (ph) ph.dataset.scene = key;
    }
    function clearHotspots() { const h = el('sceneHotspots'); if (h) h.innerHTML = ''; }
    function addHotspot(cfg) {
      // A prop hotspot is a visible, code-drawn object you click directly.
      if (cfg.prop) {
        const p = props.el(cfg.prop, { x:cfg.x, y:cfg.y, w:cfg.w, h:cfg.h, label:cfg.label, aria:cfg.aria, onClick:cfg.fn, cls:cfg.cls, anim:cfg.anim });
        el('sceneHotspots').appendChild(p);
        return p;
      }
      const e = document.createElement('button');
      e.className = 'hotspot' + (cfg.cls ? ' ' + cfg.cls : '');
      e.setAttribute('aria-label', cfg.aria || cfg.label || 'Interagieren');
      e.style.cssText = `left:${cfg.x}%;top:${cfg.y}%;width:${cfg.w || 7}%;height:${cfg.h || 7}%;`;
      if (cfg.label) {
        const l = document.createElement('span');
        l.className = 'hotspot-label'; l.textContent = cfg.label; e.appendChild(l);
      }
      e.addEventListener('click', cfg.fn);
      el('sceneHotspots').appendChild(e);
      return e;
    }
    // Decorative (non-interactive) code-drawn scenery.
    function addProp(cfg) {
      const p = props.el(cfg.prop, { x:cfg.x, y:cfg.y, w:cfg.w, h:cfg.h, cls:cfg.cls, anim:cfg.anim });
      el('sceneHotspots').appendChild(p);
      return p;
    }
    function showRobots(v) { el('robotIcons')?.classList.toggle('hidden', !v); }
    function showGuest(v)  { el('guestIcon')?.classList.toggle('hidden', !v); }
    function setProgress(pct) { const e = el('reactProgress'); if (e) e.textContent = `REAKTIVIERUNG: ${pct}%`; }

    // ---- CHOICES ----------------------------------------------------
    function showChoices(cfg) {
      const overlay = el('choiceOverlay'), btns = el('choiceButtons');
      const prompt = el('choicePrompt'), hint = el('choiceHint');
      prompt.textContent = cfg.prompt || 'WÄHLE EINE ANTWORT:';
      hint.textContent   = cfg.hint   || '';
      btns.innerHTML     = '';
      cfg.choices.forEach(c => {
        const btn = document.createElement('button');
        btn.className   = 'choice-btn' + (c.seen ? ' seen' : '');
        btn.textContent = c.label;
        btn.addEventListener('click', () => {
          c.seen = true; hideChoices();
          if (c.fn) { c.fn(); return; }
          dialogue.load(c.lines, () => { if (cfg.onAfterChoice) cfg.onAfterChoice(c.key, cfg); });
        });
        btns.appendChild(btn);
      });
      overlay.classList.remove('hidden');
      requestAnimationFrame(() => overlay.classList.add('visible'));
    }
    function hideChoices() {
      const overlay = el('choiceOverlay');
      overlay.classList.remove('visible');
      setTimeout(() => overlay.classList.add('hidden'), 410);
    }
    function allSeen(choices) { return choices.every(c => c.seen); }

    // ---- TITLE CARD -------------------------------------------------
    function start(firstScene, delay) {
      const card = el('titleCard');
      const fn = firstScene || _onStart;
      setTimeout(() => {
        card.classList.add('fading');
        setTimeout(() => { card.style.display = 'none'; if (fn) fn(); }, 700);
      }, delay || 3000);
    }

    // ---- MODAL-SAFE DIALOGUE ---------------------------------------
    // Hide any open puzzle modal while a dialogue plays, then restore it,
    // so dialogue (z-50) is never trapped behind a modal (z-200).
    function withModalDialogue(lines, after) {
      // The dialogue box sits at z-index 210, ABOVE puzzle modals (200), so it
      // no longer needs the old hide/re-show workaround. Hiding the modal made
      // the puzzle visibly vanish mid-solve (and re-render), so we just play
      // the dialogue over the top and leave the puzzle exactly as it was.
      dialogue.load(lines, after);
    }

    // ---- HINTS ------------------------------------------------------
    function initHints(opts) {
      _hints = {
        counts:  { ...opts.counts },
        max:     { ...opts.counts },
        banks:   opts.banks || {},
        names:   { r3mi: 'R-3MI', vtgm: 'V-TGM', guest: 'GAST', ...(opts.names || {}) },
        empty:   opts.empty || {},
        onOpen:  opts.onHintOpen  || null,   // e.g. pause a timer while reading
        onClose: opts.onHintClose || null,   // …resume it afterwards
      };
      showHintBar(true);
      updateHintBar();
    }
    function useHint(who) {
      if (!_hints) return;
      const name = _hints.names[who] || who;
      const done = () => { if (_hints.onClose) _hints.onClose(); };
      if (_hints.onOpen) _hints.onOpen();
      if (_hints.counts[who] <= 0) {
        withModalDialogue([ _hints.empty[who] || { speaker: name, text: '…' } ], done);
        return;
      }
      const bank = _hints.banks[who] || [];
      const idx  = Math.min(_hints.max[who] - _hints.counts[who], bank.length - 1);
      _hints.counts[who]--;
      updateHintBar();
      const entry = bank[idx];
      if (!entry) { done(); return; }
      withModalDialogue([ typeof entry === 'string' ? { speaker: name, text: entry } : entry ], done);
    }
    function updateHintBar() {
      if (!_hints) return;
      const t = _hints.counts.r3mi + _hints.counts.vtgm + _hints.counts.guest;
      const c = el('hintCount'); if (c) c.textContent = `HINWEISE: ${t} VERFÜGBAR`;
      [['hintBtnR3MI','r3mi'], ['hintBtnVTGM','vtgm'], ['hintBtnGuest','guest']].forEach(([id, w]) => {
        const b = el(id); if (b) b.disabled = _hints.counts[w] <= 0;
      });
    }
    function showHintBar(v) { el('hintBar')?.classList.toggle('hidden', !v); }

    // ---- COMPLETION -------------------------------------------------
    function complete() {
      if (_completeId)  state.markChapterComplete(_completeId);
      if (_completeAch) { try { achievements.unlock(_completeAch); } catch (_) {} }
      try { audio.fanfare(); } catch (_) {}
      try { fx.flash('rgba(46,207,98,0.30)', 1100); } catch (_) {}
      try { achievements.checkPlatinum(); } catch (_) {}
      el('chapterComplete')?.classList.remove('hidden');
      const p = el('ccProgress');
      if (p) p.textContent = `FORTSCHRITT: ${state.get('chaptersCompleted').length} / ${_chapterCount} KAPITEL`;
    }

    return {
      build, start,
      setScene, clearHotspots, addHotspot, addProp, showRobots, showGuest, setProgress,
      showChoices, hideChoices, allSeen,
      withModalDialogue,
      initHints, useHint, updateHintBar, showHintBar,
      complete,
    };
  })();


  // ═══════════════════════════════════════════════════════════════
  // OVERLAY UTILITIES
  // ═══════════════════════════════════════════════════════════════
  function closeOverlay() {
    document.querySelectorAll('.overlay-panel').forEach(el => el.classList.add('hidden'));
    document.getElementById('overlayBackdrop')?.classList.add('hidden');
  }

  function showCredits() {
    // Built fresh every time so it works on chapter pages too, and so the guest
    // thanks only appear once the player has reached the end of the story.
    let back = document.getElementById('overlayBackdrop');
    if (!back) {
      back = document.createElement('div');
      back.className = 'overlay-backdrop hidden';
      back.id = 'overlayBackdrop';
      back.addEventListener('click', closeOverlay);
      document.body.appendChild(back);
    }
    let panel = document.getElementById('creditsOverlay');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'overlay-panel hidden';
      panel.id = 'creditsOverlay';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'Abspann');
      document.body.appendChild(panel);
    }

    const endgame = state.isChapterComplete('ch8');

    const role = (name, cls, roles, body) => `
      <section class="cr-role">
        <h3 class="cr-name ${cls}">${name}</h3>
        <p class="cr-roles sys-text">${roles}</p>
        <p class="cr-body">${body}</p>
      </section>`;

    const guests = endgame ? `
      <section class="cr-block">
        <h3 class="cr-head sys-text">GASTROBOTER-INSPIRATION</h3>
        <p class="cr-guests">
          <span class="cr-g1">F-RØ5CHI</span> · <span class="cr-g2">L-UX</span> · <span class="cr-g4">B-RADF1SH</span> ·
          <span class="cr-g5">T-FLON14</span> · <span class="cr-g6">ASP-1024</span> · <span class="cr-g8">FAX-N</span> ·
          <span class="cr-g7">AGN-H3R</span>
        </p>
        <p class="cr-body">Mit freundlicher Genehmigung der Avatare. Die Gasteinheiten sind
          liebevolle Erfindungen der Anlage — keine Abbildungen der Personen dahinter.</p>
      </section>` : '';

    panel.innerHTML = `
      <div class="overlay-card credits-card">
        <h2 class="overlay-title">${endgame ? 'ABSPANN' : 'CREDITS'}</h2>
        <div class="overlay-content credits-content">

          <section class="cr-block cr-title-block">
            <p class="cr-game">DIE KALIBRIERUNGSANLAGE II</p>
            <p class="cr-sub sys-text">„Die Reaktivierung"</p>
          </section>

          <section class="cr-block">
            <h3 class="cr-head sys-text">EIN PROJEKT VON</h3>
            <p class="cr-team"><span class="cr-team-a">Team</span><span class="cr-team-b">_Aperture</span></p>
          </section>

          ${role('R-3MI', 'accent-r3mi',
            'Rätseldesign · Geschichte · Dialoge · Musik · Kreative Leitung',
            'Verantwortlich für die Konzeption der Testkammern, den Aufbau und die Mechaniken ' +
            'der Rätsel, große Teile der Geschichte und Dialoge sowie die musikalische und ' +
            'kreative Ausrichtung der Anlage.')}

          ${role('V-TGM', 'accent-vtgm',
            'Geschichte · Dialoge · Kreatives Design',
            'Mitverantwortlich für Geschichte und Charaktere, Dialoge, kreative Ideen sowie die ' +
            'Gestaltung der Atmosphäre und Identität der Anlage.')}

          ${role('NOVA — CHATGPT VON OPENAI', 'cr-neutral',
            'Code-Entwicklung · Technisches Design · Systeme &amp; Umsetzung',
            'Unterstützung bei der technischen Umsetzung der kreativen Ideen von Team_Aperture: ' +
            'Aufbau und Entwicklung des Codes, Spiellogik, interaktive Systeme, Benutzerführung ' +
            'sowie die Übersetzung von Rätsel- und Geschichtskonzepten in funktionierende ' +
            'Spielmechaniken.')}

          ${role('CLAUDE — ANTHROPIC', 'cr-neutral',
            'Implementierung · Integration · Produktionsumsetzung',
            'Verantwortlich für die praktische Umsetzung und Integration großer Teile des ' +
            'entwickelten Codes in das Projekt, umfangreiche Revisionen sowie die technische ' +
            'Zusammenführung der einzelnen Kapitel zu einer spielbaren Gesamtanlage.')}

          <section class="cr-block">
            <h3 class="cr-head sys-text">ÜBER DIE ENTWICKLUNG</h3>
            <p class="cr-body">Die Kalibrierungsanlage II entstand aus der gemeinsamen kreativen
              Arbeit von R-3MI und V-TGM / Team_Aperture. Die Ideen, Rätsel, Geschichten,
              Charaktere und finalen kreativen Entscheidungen wurden von Team_Aperture entwickelt
              und geleitet.</p>
            <p class="cr-body">Für die technische Realisierung wurden ChatGPT (Nova) und Claude als
              KI-gestützte Entwicklungswerkzeuge eingesetzt. Sie halfen dabei, Ideen in Code zu
              übersetzen, Systeme aufzubauen, Varianten umzusetzen, Fehler zu beheben und die
              Anlage technisch zum Leben zu erwecken.</p>
            <p class="cr-body">KI war dabei Werkzeug und Entwicklungspartner – nicht Ursprung des
              Projekts.</p>
          </section>

          ${guests}

          <section class="cr-block">
            <h3 class="cr-head sys-text">THE TRANSMISSION</h3>
            <p class="cr-quote">„…Hoffnung verbleibt…"</p>
          </section>

          <section class="cr-block cr-foot">
            <p class="sys-text">Ein Team_Aperture Geocaching-Projekt.</p>
            <p class="sys-text">Dieses Spiel speichert keine personenbezogenen Daten.<br>
              Spielfortschritt wird lokal gespeichert.</p>
          </section>

        </div>
        <button class="ka-btn" onclick="GameEngine.closeOverlay()">[ SCHLIESSEN ]</button>
      </div>`;
    panel.classList.remove('hidden');
    back.classList.remove('hidden');
    panel.querySelector('.credits-content').scrollTop = 0;
  }

  document.addEventListener('click', e => {
    audio.resume();
    try { music._retry(); } catch (_) {}
    if (e.target?.id === 'overlayBackdrop') { closeOverlay(); return; }
    const btn = e.target.closest && e.target.closest('button');
    if (btn && !btn.disabled) audio.click();
  });


  // ═══════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════
  (function init() {
    // Now that every module exists, let a finished save rebuild anything it
    // is missing (calibration lives below state, so this cannot run earlier).
    try { state.repair(); state.save(); } catch (_) {}
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
    SCHEMA,
    state,
    calibration,
    progress,
    achievements,
    signals,
    dialogue,
    scene,
    props,
    fx,
    puzzle,
    audio,
    music,
    chapter,
    closeOverlay,
    showCredits,
  };

})();

// Top-level `const` lives in the global lexical scope but is NOT a property of
// `window`. Some call sites (and any inline on* handlers) look the engine up as
// `window.GameEngine`, so publish it explicitly.
if (typeof window !== 'undefined') window.GameEngine = GameEngine;
