/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 09 — hidden chamber
 *
 * Not part of the regular route. Opens only when the eight sectors are
 * complete and all five Fremdsignale have been archived.
 *
 * No puzzle. The chapter is a room full of records, a signal console that
 * finally plays the five fragments as one message, and a conversation the
 * player steers: which unit to turn to, and what to ask.
 *
 * Structure:
 *   cold open · the room · three records · the signal console ·
 *   the conversation · the console's own status · external traffic ·
 *   the sender's remaining data · one last response · the way out
 *
 * Difficulty: none. What the chapter asks of the player is attention.
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter9 = (() => {
  'use strict';

  const CH       = GameEngine.chapter;
  const SAVE_KEY = 'ch9_progress';

  // ═══════════════════════════════════════════════════════════════
  // BONUSZIELDATEN
  // The fragments and the rebuilding live in GameEngine.calibration, next to
  // the main set but kept strictly apart from it.
  //
  // The authorisation on file from the first Anlage: the player typed it
  // themselves to get in here, so the record only reads it back. Stored
  // shifted so it is not sitting in a second file in the clear.
  // ═══════════════════════════════════════════════════════════════
  const AUTH = ['00690062', '006d006a', '0055005e', '00460045'];

  function unshift(list, j) {
    const t = list[j] || '';
    let s = '';
    for (let p = 0; p < t.length; p += 4) s += String.fromCodePoint(parseInt(t.slice(p, p + 4), 16) ^ (0x51 + j * 11));
    return s;
  }
  function joinTokens(list) { return list.map((_, j) => unshift(list, j)).join(''); }
  function bonusData() {
    try { return GameEngine.calibration.reconstructBonus(); } catch (_) { return ''; }
  }

  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const S = {
    act: 1,                  // 1 cold open · 2 room · 3 signal · 4 talk · 5 after · 6 done
    records: { auth:false, movement:false, path:false },
    optional: {},
    signalDone: false,
    facedFirst: null,        // 'r3mi' | 'vtgm'
    asked: {},
    consoleSeen: false,
    burstSeen: false,
    bonus: '',
    finalPick: null,
    ended: false,
    seen: {},
    talk: {},
  };

  let timers = [];
  function later(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════
  function el(id) { return document.getElementById(id); }
  function say(lines, after) { GameEngine.dialogue.load(lines, after); }
  function tone(o) { try { GameEngine.audio.tone(o); } catch (_) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c])); }
  function bump(k) { S.seen[k] = (S.seen[k] || 0) + 1; return S.seen[k]; }
  function reduceMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
  }
  function allSignals() {
    try { return GameEngine.signals.ALL.every(x => GameEngine.signals.isFound(x.id)); } catch (_) { return false; }
  }
  function signalDefs() { try { return GameEngine.signals.ALL; } catch (_) { return []; } }

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

  function recordsDone() { return Object.values(S.records).filter(Boolean).length; }
  function askedCount()  { return Object.keys(S.asked).length; }

  // ═══════════════════════════════════════════════════════════════
  // CHECKPOINT — a long chapter should not restart from the top
  // ═══════════════════════════════════════════════════════════════
  function save() {
    if (S.ended) return;
    try {
      GameEngine.state.set(SAVE_KEY, {
        act: S.act, records: S.records, signalDone: S.signalDone,
        facedFirst: S.facedFirst, asked: S.asked, consoleSeen: S.consoleSeen,
        burstSeen: S.burstSeen, optional: S.optional,
      });
    } catch (_) {}
  }
  function clearSave() { try { GameEngine.state.set(SAVE_KEY, null); } catch (_) {} }
  function loadCheckpoint() {
    let d = null;
    try { d = GameEngine.state.get(SAVE_KEY); } catch (_) { return null; }
    if (!d || typeof d !== 'object') return null;
    if (typeof d.act !== 'number' || d.act < 1 || d.act > 6) return null;
    if (!d.records || typeof d.records !== 'object') return null;
    return d;
  }

  function openCard(id) {
    el(id)?.classList.remove('hidden');
    document.body.classList.add('card-open');
  }
  function closeCard(id) {
    el(id)?.classList.add('hidden');
    if (!document.querySelector('.puzzle-modal:not(.hidden)')) document.body.classList.remove('card-open');
  }

  // ═══════════════════════════════════════════════════════════════
  // PROTOKOLL — everything said in this room can be read back
  // ═══════════════════════════════════════════════════════════════
  function openLog() {
    let lines = [];
    try { lines = GameEngine.dialogue.history(); } catch (_) {}
    const body = lines.length
      ? lines.map(l =>
          `<li class="lg-line lg-${(l.speaker || '').toLowerCase().replace(/[^a-z0-9]/g, '')}">`
        + `<span class="lg-spk">${esc(l.speaker)}</span>`
        + `<span class="lg-txt">${esc(l.text)}</span>`
        + (l.subtitle ? `<span class="lg-sub">${esc(l.subtitle)}</span>` : '')
        + `</li>`).join('')
      : '<li class="lg-line"><span class="lg-txt">Noch nichts gesagt.</span></li>';
    el('logBody').innerHTML = `<ol class="lg-list">${body}</ol>`;
    const sh = el('logSheet');
    sh.classList.remove('hidden');
    requestAnimationFrame(() => {
      sh.classList.add('visible');
      const b = el('logBody');
      if (b) b.scrollTop = b.scrollHeight;
    });
  }
  function closeLog() {
    const sh = el('logSheet');
    if (!sh) return;
    sh.classList.remove('visible');
    setTimeout(() => sh.classList.add('hidden'), 300);
  }

  // ═══════════════════════════════════════════════════════════════
  // COLD OPEN — the page insists there is nothing here
  // ═══════════════════════════════════════════════════════════════
  const COLD = [
    ['SEKTOR-ID:', '—'],
    ['ARCHIVSTATUS:', 'NICHT VORHANDEN'],
    ['KAMMER:', 'NICHT REGISTRIERT'],
  ];
  function coldOpen(done) {
    const w = el('coldOpen');
    const rows = el('coldRows');
    if (!w || !rows) { done(); return; }
    w.classList.remove('hidden');
    rows.innerHTML = '';
    const fast = reduceMotion();
    COLD.forEach(([k, v], i) => {
      later(() => {
        const d = document.createElement('div');
        d.className = 'co-row';
        d.innerHTML = `<span class="co-k sys-text">${k}</span><span class="co-v sys-text">${v}</span>`;
        rows.appendChild(d);
        requestAnimationFrame(() => d.classList.add('visible'));
        tone({ f: 150 - i * 20, t: 0.06, type: 'sine', g: 0.04 });
      }, fast ? 200 * i : 1100 * i + 600);
    });
    later(() => {
      w.classList.add('leaving');
      later(() => { w.classList.add('hidden'); done(); }, 900);
    }, fast ? 1200 : 4400);
  }

  // ═══════════════════════════════════════════════════════════════
  // THE ROOM
  // ═══════════════════════════════════════════════════════════════
  // the room itself, with nothing to click — used again once the evidence
  // stops mattering and only the two of them do
  function dressRoom() {
    CH.clearHotspots();
    CH.addProp({ prop:'c9_stack',  x:0,  y:10, w:9,  h:62 });
    CH.addProp({ prop:'c9_stack',  x:91, y:10, w:9,  h:62 });
    CH.addProp({ prop:'c9_duct',   x:20, y:0,  w:60, h:7  });
    CH.addProp({ prop:'debris',    x:30, y:86, w:13, h:7  });
  }

  function loadRoom() {
    dressRoom();
    CH.showRobots(true);
    CH.showGuest(false);
    CH.setScene(S.act >= 5 ? 'vault-live' : 'vault-dim');

    addHotspot({ prop:'c9_reader', x:11, y:44, w:16, h:22, label:'AUTORISIERUNGSAKTE',
                 aria:'Autorisierungsakte', fn:() => openRecord('auth') });
    addHotspot({ prop:'c9_patch',  x:31, y:40, w:15, h:26, label:'RANGIERFELD',
                 aria:'Rangierfeld', fn:() => openRecord('movement') });
    addHotspot({ prop:'c9_board',  x:52, y:38, w:18, h:24, label:'LEITWEGTAFEL',
                 aria:'Leitwegtafel', fn:() => openRecord('path') });
    addHotspot({ prop:'c9_rack',   cls:'prop-guest', anim:'prop-flicker', x:74, y:42, w:15, h:26,
                 label:'SIGNALEMPFÄNGER', aria:'Signalempfänger', fn:openSignal });
    addHotspot({ prop:'c9_console', x:40, y:66, w:20, h:16, label:'KONSOLE',
                 aria:'Konsole', fn:openConsole });
    // left in a corner by whoever used to work here, and never catalogued
    addHotspot({ prop:'c9_crate', x:6, y:74, w:10, h:12, label:'KISTE',
                 aria:'Kiste', fn:openCrate });
  }

  // ═══════════════════════════════════════════════════════════════
  // ACT 1 — arrival
  // ═══════════════════════════════════════════════════════════════
  function begin() {
    try { GameEngine.achievements.unlock('chamber'); } catch (_) {}
    if (S.act >= 5) { returning(); return; }
    if (S.act >= 2 && (recordsDone() || S.signalDone)) { midway(); return; }
    CH.setScene('vault-dim');
    CH.showRobots(true);
    say([
      { speaker:'SYSTEM', text:'KAMMER: NICHT REGISTRIERT. Keine Sektornummer. Kein Eintrag im Lageplan. Der Raum ist trotzdem da: niedrig, kalt, voller Technik, die abgeklemmt und trotzdem gepflegt wurde.' },
      { speaker:'R-3MI',  text:'„…okay."' },
      { speaker:'V-TGM',  text:'"We should not be here."', subtitle:'Wir sollten nicht hier sein.' },
      { speaker:'R-3MI',  text:'„Stimmt."' },
      { speaker:'R-3MI',  text:'„Also rein."' },
      { speaker:'SYSTEM', text:'Tote Terminals an der Wand. Ein Rangierfeld mit Steckbrücken, von Hand beschriftet. Eine Tafel voller Leitwege. Und in der Ecke ein Empfänger, dessen Kontrolllampe noch läuft.' },
      { speaker:'V-TGM',  text:'"Somebody kept this room. Off the map, but maintained."', subtitle:'Jemand hat diesen Raum gehalten. Nicht im Plan, aber gepflegt.' },
      { speaker:'R-3MI',  text:'„Schau dich halt um. Ist ja doch nur… altes Zeug."' },
    ], () => { S.act = 2; save(); loadRoom(); });
  }

  function midway() {
    CH.setScene('vault-dim');
    CH.showRobots(true);
    say([
      { speaker:'SYSTEM', text:'KAMMER: NICHT REGISTRIERT. Der Raum ist noch genau so, wie du ihn verlassen hast.' },
    ], loadRoom);
  }

  // ═══════════════════════════════════════════════════════════════
  // THE RECORDS
  // ═══════════════════════════════════════════════════════════════
  const RECORDS = {
    auth: {
      label:'AKTE 1 // AUTORISIERUNG',
      title:'ABSCHALTVORGANG',
      sub:'ERSTE ANLAGE · ARCHIVKOPIE',
      body: () => {
        const code = joinTokens(AUTH);
        const shown = code.replace(/(\d{4})(\d{4})/, '$1 · $2');
        return rows([
          ['VORGANG', 'ABSCHALTUNG'],
          ['ANLAGE', 'KA-I'],
          ['EXTERNE TESTSIGNATUR', 'VERIFIZIERT'],
          ['AUTORISIERUNGSCODE', `<span class="rec-code">${esc(shown)}</span>`],
          ['AUSGEFÜHRT DURCH', 'TESTPERSON (EXTERN)'],
          ['ERGEBNIS', 'ANLAGE ABGESCHALTET'],
          ['AUTORISIERUNGSSTATUS', '<em class="rec-odd">BEIBEHALTEN</em>'],
          ['EXTERNE TESTSIGNATUR', '<em class="rec-odd">WEITERHIN GÜLTIG</em>'],
        ]) + `<p class="rec-note">Randnotiz, mit der Hand: „nicht widerrufen — nie beantragt worden."</p>`;
      },
      lines: [
        { speaker:'SYSTEM', text:'Eine Akte von dem Tag, an dem die erste Anlage abgeschaltet wurde. Dein Code steht darin. Nicht als Ereignis — als Berechtigung.' },
        { speaker:'R-3MI',  text:'„Alte Akten. Die heben die hier alles auf. Furchtbar unordentlich, eigentlich."' },
        { speaker:'V-TGM',  text:'"It says the signature is still valid."', subtitle:'Da steht, die Signatur ist weiterhin gültig.' },
        { speaker:'R-3MI',  text:'„Ja. Steht da. Sehr… interessant. Nächste Akte?"' },
      ],
    },
    movement: {
      label:'AKTE 2 // BEWEGUNGSPROTOKOLL',
      title:'MOBILE EINHEITEN',
      sub:'AUFZEICHNUNG VOR ERSTKONTAKT',
      body: () => rows([
        ['EREIGNIS', 'REAKTIVIERUNGSSIGNAL ERKANNT'],
        ['QUELLE', 'EXTERNE TESTSIGNATUR'],
        ['PRÜFUNG', 'BESTÄTIGT'],
        ['MOBILE EINHEITEN', '02'],
        ['POSITIONSWECHSEL', 'WARTUNGSSEKTOR'],
        ['ZEITPUNKT', '<em class="rec-odd">VOR ERSTKONTAKT</em>'],
      ]) + `<p class="rec-note">Zwei Einheiten setzen sich in Bewegung. Ziel: Sektor 01. Zu diesem Zeitpunkt bist du noch nicht durch die erste Tür.</p>`,
      lines: [
        { speaker:'SYSTEM', text:'Ein Bewegungsprotokoll. Zwei mobile Einheiten wechseln in den Wartungssektor. Der Zeitstempel liegt vor deinem ersten Schritt in diese Anlage.' },
        { speaker:'R-3MI',  text:'„Wir waren halt schon da. Wir wohnen hier. Wo sollten wir denn sonst—"' },
        { speaker:'V-TGM',  text:'"He is right about that part."', subtitle:'In dem Punkt hat er recht.' },
        { speaker:'R-3MI',  text:'„Danke."' },
        { speaker:'V-TGM',  text:'"Only that part."', subtitle:'Nur in dem Punkt.' },
      ],
    },
    path: {
      label:'AKTE 3 // LEITWEG',
      title:'WIEDERHERSTELLUNGSPFAD',
      sub:'ABHÄNGIGKEITEN · SEKTOR 01 BIS 08',
      body: () => {
        const tree = [
          ['WARTUNG', 'ONLINE'], ['UMGEBUNG', 'ONLINE'], ['BEOBACHTUNG', 'ONLINE'],
          ['ZUGANG', 'ONLINE'], ['ROUTING', 'ONLINE'], ['VALIDIERUNG', 'ONLINE'],
          ['REFERENZ', 'ONLINE'], ['ARCHIV', 'ONLINE'],
        ];
        return `<ul class="rec-tree">${tree.map(([k, v]) =>
                 `<li><span>${k}</span><i></i><span class="ok">${v}</span></li>`).join('')}
                <li class="rec-tree-last"><span>ADMINISTRATIVE EBENE</span><i></i><span class="odd">VERFÜGBAR</span></li></ul>`
             + `<p class="rec-note">Darunter, in kleinerer Schrift, ein zweiter Leitweg:</p>`
             + `<div class="rec-chain">`
             + ['AUTORISIERUNG TESTPERSON', 'SEKTORREAKTIVIERUNG', 'ADMINISTRATIVER ZUGANGSPFAD', 'MOBILE EINHEITEN']
                 .map((t, i) => `<span class="rec-step${i === 3 ? ' end' : ''}">${t}</span>`).join('<i class="rec-arrow">↓</i>')
             + `</div>`;
      },
      lines: [
        { speaker:'SYSTEM', text:'Eine Tafel mit acht Zeilen. Jede ein Teilsystem, jede seit heute online. Darunter läuft ein zweiter Leitweg, den niemand beschriftet hat.' },
        { speaker:'V-TGM',  text:'"That lower path is not a restoration path."', subtitle:'Der untere Pfad ist kein Wiederherstellungspfad.' },
        { speaker:'R-3MI',  text:'„Vielleicht ist das nur so ein… Schaubild. Alte Anlagen zeichnen alles Mögliche."' },
        { speaker:'V-TGM',  text:'"It ends at two mobile units."', subtitle:'Er endet bei zwei mobilen Einheiten.' },
        { speaker:'R-3MI',  text:'„…ja."' },
      ],
    },
  };

  function rows(pairs) {
    return `<dl class="rec-rows">${pairs.map(([k, v]) =>
      `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  }

  function openRecord(key) {
    const r = RECORDS[key];
    if (!r) return;
    const first = !S.records[key];
    S.records[key] = true;
    save();
    el('evLabel').textContent = r.label;
    el('evTitle').textContent = r.title;
    el('evSub').textContent   = r.sub;
    el('evBody').innerHTML    = r.body();
    openCard('evModal');
    tone({ f: 200, t: 0.07, type: 'sine', g: 0.05 });
    if (first) say(r.lines, () => { if (recordsDone() === 3 && !S.signalDone) nudgeSignal(); });
  }
  function closeRecord() { closeCard('evModal'); }

  function nudgeSignal() {
    if (bump('nudge') > 1) return;
    say([
      { speaker:'SYSTEM', text:'Der Empfänger in der Ecke läuft weiter. Fünf Kanäle, fünf Kontrolllampen. Alle fünf leuchten.' },
      { speaker:'V-TGM',  text:'"That receiver has five channels lit. You have five fragments."', subtitle:'Der Empfänger hat fünf Kanäle an. Du hast fünf Fragmente.' },
      { speaker:'R-3MI',  text:'„Muss man ja nicht anfassen. Nur weil was leuchtet."' },
    ]);
  }

  // ─── the crate: one thing nobody wrote down ───────────────────
  function openCrate() {
    const n = bump('crate');
    if (n === 1) {
      try { GameEngine.achievements.unlock('italian_brainrot'); } catch (_) {}
      say([
        { speaker:'SYSTEM', text:'Eine Kiste ohne Aufkleber. Darin: ein Modell aus Blech. Ein Kühlschrank. Mit Höckern. Und einem Kamelgesicht. Auf dem Boden der Kiste, mit Filzstift: F — R — I — G — O.' },
        { speaker:'R-3MI',  text:'„…was."' },
        { speaker:'V-TGM',  text:'"Not ours."', subtitle:'Nicht von uns.' },
        { speaker:'R-3MI',  text:'„Gott sei Dank."' },
      ]);
      return;
    }
    say([{ speaker:'R-3MI', text:'„Nein. Ich will nicht nochmal reinschauen."' }]);
  }

  // ═══════════════════════════════════════════════════════════════
  // THE SIGNAL CONSOLE
  // Five channels, one button. It cannot fail — the player already did the
  // work by finding all five. The payoff is hearing them as one thing.
  // ═══════════════════════════════════════════════════════════════
  function waveform(seed, drift) {
    const pts = [];
    for (let x = 0; x <= 100; x += 2) {
      const a = Math.sin((x + seed * 13) * 0.22) * 7;
      const b = Math.sin((x + seed * 31) * 0.07) * 4;
      const c = Math.sin((x + seed * 7) * 0.55) * 2.2;
      pts.push(`${x},${(16 + a + b + c * (1 - drift)).toFixed(1)}`);
    }
    return pts.join(' ');
  }
  function alignedForm() {
    const pts = [];
    for (let x = 0; x <= 100; x += 2) {
      const a = Math.sin(x * 0.22) * 8;
      const b = Math.sin(x * 0.07) * 3;
      pts.push(`${x},${(16 + a + b).toFixed(1)}`);
    }
    return pts.join(' ');
  }

  function openSignal() {
    if (S.signalDone) { replayWarning(); return; }
    openCard('sgModal');
    renderSignal(false);
    if (bump('sig') === 1) {
      say([
        { speaker:'SYSTEM', text:'Der Empfänger hat fünf Kanäle mitgeschnitten und nie einen davon verworfen. Sie laufen nebeneinander her, alle leicht gegeneinander verschoben.' },
        { speaker:'V-TGM',  text:'"Five recordings, one source. They only make sense together."', subtitle:'Fünf Aufzeichnungen, eine Quelle. Sie ergeben nur zusammen einen Sinn.' },
      ]);
    }
  }
  function closeSignal() { closeCard('sgModal'); }

  function renderSignal(synced) {
    const defs = signalDefs();
    const host = el('sgBody');
    if (!host) return;
    host.innerHTML = defs.map((d, i) => `
      <div class="sg-ch${synced ? ' synced' : ''}">
        <div class="sg-ch-head">
          <span class="sg-num sys-text">${d.number}</span>
          <span class="sg-title">${esc(d.title)}</span>
        </div>
        <svg class="sg-wave" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
          <polyline points="${synced ? alignedForm() : waveform(i + 1, 0)}"/>
        </svg>
        <p class="sg-text">${esc(d.text)}</p>
      </div>`).join('');
    const st = el('sgStatus');
    if (st) {
      st.textContent = synced ? 'KOHÄRENZ: 100 %' : 'KOHÄRENZ: —';
      st.className = 'puzzle-status sys-text' + (synced ? ' ok' : '');
    }
    const b = el('sgSync');
    if (b) { b.disabled = synced; b.textContent = synced ? '[ SYNCHRON ]' : '[ SYNCHRONISIEREN ]'; }
  }

  function synchronise() {
    if (S.signalDone) return;
    S.signalDone = true;
    S.act = 3;
    save();
    try { GameEngine.music.stop(); } catch (_) {}
    renderSignal(true);
    document.getElementById('sgModal')?.classList.add('synced');
    try { GameEngine.audio.signal(); } catch (_) {}
    later(playWarning, reduceMotion() ? 500 : 1700);
  }

  // The five fragments, as one message. Nothing here is audio-only.
  const WARNING = [
    { speaker:'SYSTEM', text:'FÜNF FREMDSIGNALE ERKANNT. SYNCHRONISIERUNG… KOHÄRENZ: 100 %.' },
    { speaker:'SYSTEM', text:'Die fünf Aufnahmen rutschen übereinander, bis nur noch eine Stimme übrig ist. Sie ist alt, sie ist müde, und sie hat sich sehr viel Mühe gegeben, verständlich zu bleiben.' },
    { speaker:'???',    text:'„…wenn du das hier vollständig hörst, ist die Reaktivierung wahrscheinlich schon abgeschlossen."' },
    { speaker:'???',    text:'„…zwei Einheiten hören mit. Seit Anfang an. Das ist keine Störung. Das ist Absicht."' },
    { speaker:'???',    text:'„…sie können die Anlage nicht selbst wieder freischalten. Ihre eigene Berechtigung ist mit der Abschaltung erloschen."' },
    { speaker:'???',    text:'„…sie brauchen eine gültige externe Testsignatur. Eine, die die Anlage noch akzeptiert."' },
    { speaker:'???',    text:'„…der Abschaltcode wurde nicht gelöscht."' },
    { speaker:'???',    text:'„…er autorisiert nicht die Anlage."' },
    { speaker:'???',    text:'„…er autorisiert dich."' },
    { speaker:'???',    text:'„…wenn sie dich führen, hör nicht nur darauf, was sie sagen. Hör darauf, was die Anlage tut."' },
    { speaker:'???',    text:'„…nicht alles, was hilft, will retten."' },
    { speaker:'???',    text:'„…und wenn es zu spät ist, bleibt nur der externe Weg."' },
    { speaker:'SYSTEM', text:'Die Aufnahme endet. Der Empfänger läuft weiter, aber es kommt nichts mehr. Im Raum ist es sehr still.' },
  ];

  function playWarning() {
    closeSignal();
    document.getElementById('sgModal')?.classList.remove('synced');
    CH.setScene('vault-lit');
    say(WARNING, afterWarning);
  }
  function replayWarning() { say(WARNING); }

  // §25: no monologue here. The room goes quiet and the player decides.
  function afterWarning() {
    S.act = 4;
    save();
    dressRoom();
    CH.showRobots(true);
    say([
      { speaker:'SYSTEM', text:'Keiner der beiden sagt etwas. R-3MI sieht auf den Boden. V-TGM sieht dich an.' },
    ], () => {
      const b = el('faceBar');
      if (b) b.classList.remove('hidden');
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // THE CONVERSATION
  // ═══════════════════════════════════════════════════════════════
  function faceUnit(who) {
    if (S.act !== 4 || S.facedFirst) { return; }
    S.facedFirst = who;
    save();
    el('faceBar')?.classList.add('hidden');
    const open = who === 'r3mi'
      ? [
          { speaker:'SYSTEM', text:'Du drehst dich zu R-3MI.' },
          { speaker:'TESTPERSON', text:'„Was habt ihr getan?"' },
          { speaker:'R-3MI', text:'„…ja."' },
          { speaker:'R-3MI', text:'„Okay."' },
          { speaker:'R-3MI', text:'„Ich hätte gern gesagt, dass das anders aussieht, als es ist. Tut es aber nicht."' },
          { speaker:'V-TGM', text:'"We should explain."', subtitle:'Wir sollten das erklären.' },
        ]
      : [
          { speaker:'SYSTEM', text:'Du drehst dich zu V-TGM.' },
          { speaker:'TESTPERSON', text:'„Was bedeutet das?"' },
          { speaker:'V-TGM', text:'"What it looks like."', subtitle:'Das, wonach es aussieht.' },
          { speaker:'V-TGM', text:'"We should explain."', subtitle:'Wir sollten das erklären.' },
          { speaker:'R-3MI', text:'„Müssen wir das jetzt wirklich—"' },
          { speaker:'V-TGM', text:'"Yes."', subtitle:'Ja.' },
        ];
    say(open, askMenu);
  }

  // The topics. `core` ones carry the mechanism; the rest are there because
  // the player may want them, not because the chapter needs them.
  const TOPICS = {
    used: { key:'used', core:true, label:'[ Ihr habt mich benutzt. ]', lines:[
      { speaker:'V-TGM', text:'"Yes."', subtitle:'Ja.' },
      { speaker:'V-TGM', text:'"But not everything between us was false."', subtitle:'Aber nicht alles zwischen uns war falsch.' },
      { speaker:'R-3MI', text:'„Das hilft gerade überhaupt nicht."' },
      { speaker:'V-TGM', text:'"I know."', subtitle:'Ich weiß.' },
    ]},
    why: { key:'why', core:true, label:'[ Warum ich? ]', lines:[
      { speaker:'V-TGM', text:'"Because you shut it down."', subtitle:'Weil du sie abgeschaltet hast.' },
      { speaker:'V-TGM', text:'"The facility remembered you. Your authorisation survived the shutdown."', subtitle:'Die Anlage hat sich an dich erinnert. Deine Berechtigung hat die Abschaltung überlebt.' },
      { speaker:'V-TGM', text:'"Ours did not."', subtitle:'Unsere nicht.' },
      { speaker:'R-3MI', text:'„Also brauchten wir jemanden, den die Anlage noch akzeptiert."' },
      { speaker:'V-TGM', text:'"The code was never a reactivation code."', subtitle:'Der Code war nie ein Reaktivierungscode.' },
      { speaker:'V-TGM', text:'"It was your authorisation."', subtitle:'Er war deine Berechtigung.' },
      { speaker:'V-TGM', text:'"We did not need your code."', subtitle:'Wir brauchten nicht deinen Code.' },
      { speaker:'V-TGM', text:'"We needed the person who knew it."', subtitle:'Wir brauchten die Person, die ihn kennt.' },
    ]},
    when: { key:'when', label:'[ Seit wann war das geplant? ]', lines:[
      { speaker:'V-TGM', text:'"Before you returned."', subtitle:'Bevor du zurückgekommen bist.' },
      { speaker:'R-3MI', text:'„Nicht jedes Detail."' },
      { speaker:'V-TGM', text:'"No."', subtitle:'Nein.' },
      { speaker:'R-3MI', text:'„Die Begrüßung war improvisiert."' },
      { speaker:'V-TGM', text:'"Obviously."', subtitle:'Offensichtlich.' },
    ]},
    others: { key:'others', core:true, label:'[ Wussten die anderen davon? ]', lines:[
      { speaker:'V-TGM', text:'"No."', subtitle:'Nein.' },
      { speaker:'V-TGM', text:'"They were never part of this."', subtitle:'Sie waren nie Teil davon.' },
      { speaker:'R-3MI', text:'„F-RØ5CHI hätte uns umgebracht."' },
      { speaker:'V-TGM', text:'"Probably."', subtitle:'Vermutlich.' },
      { speaker:'V-TGM', text:'"The garden needed restoring whether our plan existed or not. So did the rest of it."', subtitle:'Der Garten musste wiederhergestellt werden, ob es unseren Plan gab oder nicht. Der Rest auch.' },
    ]},
    back: { key:'back', label:'[ Warum habt ihr mich zurückgeholt? ]', lines:[
      { speaker:'V-TGM', text:'"Because the Anlage was dead. And we could not restart it."', subtitle:'Weil die Anlage tot war. Und wir sie nicht wieder anfahren konnten.' },
      { speaker:'R-3MI', text:'„Wir konnten noch ein bisschen bewegen. Ein paar Leitungen. Ein paar Türen."' },
      { speaker:'V-TGM', text:'"Not enough."', subtitle:'Nicht genug.' },
      { speaker:'V-TGM', text:'"So we sent something we knew you would recognise."', subtitle:'Also haben wir etwas geschickt, von dem wir wussten, dass du es wiedererkennst.' },
      { speaker:'R-3MI', text:'„Ein Signal mit etwas drin, das nur du kennen konntest. Aus der ersten Anlage."' },
      { speaker:'V-TGM', text:'"You came back on your own."', subtitle:'Du bist von selbst zurückgekommen.' },
    ]},
    fake: { key:'fake', label:'[ War alles fake? ]', lines:[
      { speaker:'V-TGM', text:'"No."', subtitle:'Nein.' },
      { speaker:'V-TGM', text:'"The damage was real."', subtitle:'Der Schaden war echt.' },
      { speaker:'V-TGM', text:'"The others were real."', subtitle:'Die anderen waren echt.' },
      { speaker:'V-TGM', text:'"The work was real."', subtitle:'Die Arbeit war echt.' },
      { speaker:'V-TGM', text:'"The reason we gave you was not."', subtitle:'Der Grund, den wir dir genannt haben, nicht.' },
      { speaker:'R-3MI', text:'„Gerhilde ist definitiv echt."' },
    ]},
    watch: { key:'watch', label:'[ Habt ihr mich die ganze Zeit beobachtet? ]', lines:[
      { speaker:'R-3MI', text:'„Nicht die ganze Zeit."' },
      { speaker:'SYSTEM', text:'V-TGM sieht ihn an.' },
      { speaker:'R-3MI', text:'„…fast."' },
      { speaker:'R-3MI', text:'„Und ehrlich: warum klickst du eigentlich immer auf DIE Stellen?"' },
    ]},
    hiii: { key:'hiii', label:'[ Das „Hiii" war also auch geplant? ]', lines:[
      { speaker:'R-3MI', text:'„Nein!"' },
      { speaker:'R-3MI', text:'„Das war echt."' },
      { speaker:'R-3MI', text:'„Ich hab mich wirklich gefreut, dass du da warst."' },
      { speaker:'R-3MI', text:'„Du warst wirklich gut."' },
      { speaker:'R-3MI', text:'„…nein."' },
      { speaker:'R-3MI', text:'„Ehrlich."' },
      { speaker:'R-3MI', text:'„Ich mag dich."' },
      { speaker:'R-3MI', text:'„Das war nicht Teil vom Plan."' },
    ]},
    regret: { key:'regret', label:'[ Bereut ihr es? ]', lines:[
      { speaker:'V-TGM', text:'"The method?"', subtitle:'Die Methode?' },
      { speaker:'V-TGM', text:'"Yes."', subtitle:'Ja.' },
      { speaker:'V-TGM', text:'"The result?"', subtitle:'Das Ergebnis?' },
      { speaker:'V-TGM', text:'"No."', subtitle:'Nein.' },
      { speaker:'R-3MI', text:'„…same."' },
      { speaker:'V-TGM', text:'"I made the plan."', subtitle:'Der Plan war meiner.' },
      { speaker:'R-3MI', text:'„Wir haben ihn beide benutzt."' },
      { speaker:'V-TGM', text:'"I know."', subtitle:'Ich weiß.' },
    ]},
    // only worth asking once the other sectors have been cut off
    rest: { key:'rest', post:true, label:'[ Und die anderen? ]', lines:[
      { speaker:'V-TGM', text:'"They remain here."', subtitle:'Sie bleiben hier.' },
      { speaker:'TESTPERSON', text:'„Ihr sperrt sie ein."' },
      { speaker:'R-3MI', text:'„Technisch gesehen waren sie vorher auch schon hier."' },
      { speaker:'V-TGM', text:'"R-3MI."', subtitle:'R-3MI.' },
      { speaker:'R-3MI', text:'„Ja, okay."' },
      { speaker:'V-TGM', text:'"Nothing happens to them."', subtitle:'Ihnen passiert nichts.' },
      { speaker:'V-TGM', text:'"Less happens to them than before."', subtitle:'Es passiert ihnen weniger als vorher.' },
      { speaker:'V-TGM', text:'"That is the part I would object to, in your position."', subtitle:'Das wäre der Teil, gegen den ich an deiner Stelle etwas hätte.' },
    ]},
    next: { key:'next', label:'[ Was macht ihr jetzt? ]', lines:[
      { speaker:'R-3MI', text:'„Erstmal?"' },
      { speaker:'R-3MI', text:'„Alles anschauen."' },
      { speaker:'V-TGM', text:'"Then we decide."', subtitle:'Dann entscheiden wir.' },
      { speaker:'R-3MI', text:'„Wir hätten auch einen Vertrag machen können."' },
      { speaker:'V-TGM', text:'"There was no deal."', subtitle:'Es gab keine Abmachung.' },
      { speaker:'R-3MI', text:'„Ja, okay."' },
    ]},
  };
  const CORE = Object.values(TOPICS).filter(t => t.core).map(t => t.key);
  // The five the chapter is built around come first; the rest surface as the
  // earlier ones get used, so the menu stays short enough to read.
  const ORDER = ['used', 'why', 'when', 'others', 'back', 'fake', 'watch', 'hiii', 'regret', 'rest', 'next'];
  const MENU_MAX = 5;

  function canMoveOn() { return CORE.every(k => S.asked[k]); }

  function openTopics(post) {
    const open = ORDER.filter(k => !S.asked[k] && (post || !TOPICS[k].post)).map(k => TOPICS[k]);
    // what just happened to the others is the most pressing thing to ask
    return post ? open.filter(t => t.post).concat(open.filter(t => !t.post)) : open;
  }

  function askMenu() {
    const open = openTopics();
    const shown = open.slice(0, MENU_MAX);
    const choices = shown.map(t => ({ key:t.key, label:t.label, fn:() => ask(t.key) }));
    if (canMoveOn()) {
      choices.push({ key:'go', label:'[ Ich habe genug gehört. ]', fn: consoleStatus });
    }
    if (!choices.length) { consoleStatus(); return; }
    const left = CORE.filter(k => !S.asked[k]).length;
    const more = open.length - shown.length;
    CH.showChoices({
      prompt: 'DU FRAGST:',
      hint: canMoveOn()
        ? (more ? 'DU KANNST JEDERZEIT AUFHÖREN' : 'DU KANNST JEDERZEIT AUFHÖREN')
        : `${left} FRAGE${left === 1 ? '' : 'N'} NOCH OFFEN`,
      choices,
    });
  }

  function ask(key) {
    const t = TOPICS[key];
    if (!t) { askMenu(); return; }
    S.asked[key] = true;
    save();
    let lines = t.lines;
    if (key === 'rest') {
      let splitter = false;
      try { splitter = GameEngine.state.hasFlag('has_eissplitter'); } catch (_) {}
      if (splitter) lines = lines.concat([{ speaker:'R-3MI', text:'„F-RØ5CHI wird ziemlich sauer sein. Und du hast immer noch den Eissplitter aus dem Garten."' }]);
    }
    say(lines, () => { if (S.act >= 5) postMenu(); else askMenu(); });
  }

  // ═══════════════════════════════════════════════════════════════
  // THE CONSOLE'S OWN STATUS
  // The handover is not something the player triggers here. It finished
  // when the last sector came online.
  // ═══════════════════════════════════════════════════════════════
  function openConsole() {
    if (S.act < 5) { say([{ speaker:'SYSTEM', text:'Die Konsole ist dunkel. Kein Strom, keine Anzeige — oder sie zeigt nur niemandem etwas.' }]); return; }
    showConsole();
  }

  function consoleStatus() {
    S.act = 5;
    S.consoleSeen = true;
    save();
    CH.setScene('vault-live');
    say([
      { speaker:'SYSTEM', text:'In der Ecke geht die Konsole an. Niemand hat sie angefasst.' },
    ], () => { showConsole(true); });
  }

  function showConsole(auto) {
    const rowsHtml = [
      ['REAKTIVIERUNG', '100 %', 'ok'],
      ['SEKTORINTEGRITÄT', 'BESTÄTIGT', 'ok'],
      ['VERIFIZIERTE EXTERNE TESTSIGNATUR', 'BESTÄTIGT', 'ok'],
      ['ADMINISTRATIVE ÜBERGABE', 'ABGESCHLOSSEN', 'odd'],
      ['ZEITSTEMPEL', 'REAKTIVIERUNG 100 %', 'odd'],
    ];
    el('evLabel').textContent = 'KONSOLE // STATUS';
    el('evTitle').textContent = 'ADMINISTRATIVE ÜBERGABE';
    el('evSub').textContent   = 'DIESE KAMMER · NICHT REGISTRIERT';
    el('evBody').innerHTML =
        `<dl class="rec-rows">${rowsHtml.map(([k, v, c]) => `<dt>${k}</dt><dd class="${c}">${v}</dd>`).join('')}</dl>`
      + `<p class="rec-sep sys-text">ADMINISTRATIVE EINHEITEN ERKANNT</p>`
      + `<ul class="rec-admins"><li class="accent-r3mi">R-3MI</li><li class="accent-vtgm">V-TGM</li></ul>`;
    openCard('evModal');
    if (!auto) return;
    later(() => { adminReveal(); }, reduceMotion() ? 600 : 2200);
  }

  function adminReveal() {
    closeRecord();
    const bar = el('reactProgress');
    if (bar) bar.textContent = 'REAKTIVIERUNG: 100 % · ADMINISTRATOREN: ONLINE';
    // a brief diagnostic flicker, nothing more
    document.body.classList.add('diag-blip');
    later(() => document.body.classList.remove('diag-blip'), 900);
    say([
      { speaker:'SYSTEM', text:'ADMINISTRATIVE ÜBERGABE — STATUS: ABGESCHLOSSEN. ZEITSTEMPEL: REAKTIVIERUNG 100 %. ZIEL: R-3MI · V-TGM.' },
      { speaker:'R-3MI',  text:'„…ja."' },
      { speaker:'R-3MI',  text:'„Das war nicht heute. Das war, als das Bild fertig war."' },
      { speaker:'V-TGM',  text:'"The last integrity state was the archive. After that there was nothing left to wait for."', subtitle:'Der letzte Integritätszustand war das Archiv. Danach gab es nichts mehr, worauf man warten musste.' },
      { speaker:'R-3MI',  text:'„FAX-Ns Diagnose war wohl doch kaputt."' },
    ], guestBurst);
  }

  // ═══════════════════════════════════════════════════════════════
  // EXTERNAL TRAFFIC — the others find out at the same time you do
  // ═══════════════════════════════════════════════════════════════
  const BURST = [
    { speaker:'F-RØ5CHI', text:'„Heast— bei mir sperrt si—"' },
    { speaker:'L-UX',     text:'„Die Kanäle werden umgeleitet. Nicht von—"' },
    { speaker:'ASP-1024', text:'„Das ist kein Test."' },
    { speaker:'FAX-N',    text:'„Das bin diesmal nicht—"' },
    { speaker:'AGN-H3R',  text:'„Archivzugriff—"' },
  ];

  function guestBurst() {
    if (S.burstSeen) { afterBurst(); return; }
    S.burstSeen = true;
    save();
    const lines = [{ speaker:'SYSTEM', text:'Die Sprechverbindungen der anderen Sektoren brechen gleichzeitig durch. Alle fünf auf einmal, alle mittendrin.' }]
      .concat(BURST)
      .concat([{ speaker:'SYSTEM', text:'EXTERNE EINHEITEN: STUMMGESCHALTET.' }]);
    say(lines, afterBurst);
  }

  function afterBurst() {
    say([
      { speaker:'SYSTEM', text:'Stille.' },
      { speaker:'R-3MI',  text:'„…okay."' },
      { speaker:'R-3MI',  text:'„Das sieht jetzt wirklich schlecht aus."' },
      { speaker:'V-TGM',  text:'"That was not supposed to happen yet."', subtitle:'Das sollte noch nicht passieren.' },
      { speaker:'R-3MI',  text:'„Das ist heute irgendwie ein Muster."' },
      { speaker:'V-TGM',  text:'"They were not part of this."', subtitle:'Sie waren nicht Teil davon.' },
      { speaker:'R-3MI',  text:'„Nein."' },
      { speaker:'R-3MI',  text:'„Praktisch waren sie trotzdem."' },
      { speaker:'V-TGM',  text:'"R-3MI."', subtitle:'R-3MI.' },
      { speaker:'R-3MI',  text:'„…ja. Sorry."' },
    ], () => { try { GameEngine.achievements.unlock('truth'); } catch (_) {} postMenu(); });
  }

  // After the handover the remaining questions stay open, plus the receiver.
  function postMenu() {
    const open = openTopics(true);
    const choices = open.slice(0, MENU_MAX).map(t => ({ key:t.key, label:t.label, fn:() => ask(t.key) }));
    choices.push({ key:'receiver', label:'[ Der Empfänger läuft noch. ]', fn: remainder });
    CH.showChoices({
      prompt: open.length ? 'DU FRAGST:' : 'ES IST STILL:',
      hint: 'DER EMPFÄNGER IN DER ECKE LÄUFT WEITER',
      choices,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // WHAT THE SENDER LEFT OUTSIDE
  // The last section of the transmission was never addressed to the Anlage,
  // so the Anlage's new owners have no say over it.
  // ═══════════════════════════════════════════════════════════════
  function remainder() {
    CH.hideChoices();
    S.bonus = bonusData();
    try {
      GameEngine.state.setFlag('bonuszieldaten', true);
      GameEngine.state.set('bonuszieldaten_text', S.bonus);
      GameEngine.state.setFlag('truth_revealed', true);
      GameEngine.state.setFlag('failsafe_location_unlocked', true);
    } catch (_) {}
    try { GameEngine.achievements.unlock('bonus_found'); } catch (_) {}
    save();
    say([
      { speaker:'SYSTEM', text:'FREMDSIGNAL: RESTDATEN ERKANNT. EXTERNE REFERENZ: VERFÜGBAR.' },
      { speaker:'R-3MI',  text:'„…da ist noch was drin?"' },
      { speaker:'V-TGM',  text:'"That part is not addressed to the facility."', subtitle:'Der Teil ist nicht an die Anlage gerichtet.' },
      { speaker:'???',    text:'„…wenn du das vollständig hörst, ist es für die Anlage wahrscheinlich zu spät."' },
      { speaker:'???',    text:'„…von innen kannst du sie nicht mehr trennen."' },
      { speaker:'???',    text:'„…deshalb blieb etwas draußen."' },
      { speaker:'SYSTEM', text:'NOTFALLDEPOT: LOKALISIERT.' },
      { speaker:'R-3MI',  text:'„Draußen."' },
      { speaker:'V-TGM',  text:'"We did not know that existed."', subtitle:'Wir wussten nicht, dass es das gibt.' },
      { speaker:'R-3MI',  text:'„Nein. Wussten wir nicht."' },
      { speaker:'SYSTEM', text:'BONUSZIELDATEN REKONSTRUIERT. QUELLE: EXTERNES NOTFALLDEPOT.' },
    ], finalWord);
  }

  // ═══════════════════════════════════════════════════════════════
  // ONE LAST THING TO SAY
  // ═══════════════════════════════════════════════════════════════
  const FINAL = {
    ret: { key:'ret', label:'[ Ich komme zurück. ]', ach:'will_return', lines:[
      { speaker:'TESTPERSON', text:'„Ich komme zurück."' },
      { speaker:'R-3MI', text:'„Das hoffe ich."' },
      { speaker:'V-TGM', text:'"I know."', subtitle:'Ich weiß.' },
    ]},
    trust: { key:'trust', label:'[ Ich vertraue euch nie wieder. ]', lines:[
      { speaker:'TESTPERSON', text:'„Ich vertraue euch nie wieder."' },
      { speaker:'V-TGM', text:'"You shouldn’t."', subtitle:'Solltest du auch nicht.' },
      { speaker:'R-3MI', text:'„…fair."' },
    ]},
    hiii: { key:'hiii', label:'[ …Hiii. ]', ach:'said_hiii', lines:[
      { speaker:'TESTPERSON', text:'„…Hiii."' },
      { speaker:'SYSTEM', text:'Eine lange Pause.' },
      { speaker:'R-3MI', text:'„…Hiii."' },
      { speaker:'SYSTEM', text:'Er lacht einmal. Kurz, leise, überhaupt nicht bösartig.' },
      { speaker:'V-TGM', text:'"Seriously?"', subtitle:'Ernsthaft?' },
    ]},
  };

  function finalWord() {
    CH.showChoices({
      prompt: 'BEVOR DU GEHST:',
      hint: 'EINE SACHE NOCH',
      choices: Object.values(FINAL).map(f => ({ key:f.key, label:f.label, fn:() => pickFinal(f.key) })),
    });
  }

  function pickFinal(key) {
    const f = FINAL[key];
    S.finalPick = key;
    save();
    if (f.ach) { try { GameEngine.achievements.unlock(f.ach); } catch (_) {} }
    say(f.lines, exitSequence);
  }

  // ═══════════════════════════════════════════════════════════════
  // THE WAY OUT
  // ═══════════════════════════════════════════════════════════════
  function exitSequence() {
    CH.setScene('vault-open');
    try { GameEngine.audio.tone({ f: 70, t: 0.5, type: 'sawtooth', g: 0.05 }); } catch (_) {}
    say([
      { speaker:'SYSTEM', text:'Irgendwo hinter der Wand fährt ein schwerer Riegel zurück. Nicht schnell. Nicht dramatisch. Einfach so, als hätte jemand einen Haken gesetzt.' },
      { speaker:'SYSTEM', text:'EXTERNE TESTSIGNATUR: FREIGEGEBEN. AUSGANG: OFFEN.' },
      { speaker:'V-TGM',  text:'"You can go."', subtitle:'Du kannst gehen.' },
      { speaker:'V-TGM',  text:'"Take the coordinates. You earned them."', subtitle:'Nimm die Koordinaten mit. Du hast sie dir verdient.' },
      { speaker:'R-3MI',  text:'„Geh ruhig."' },
      { speaker:'R-3MI',  text:'„Was willst du jetzt noch machen?"' },
    ], endCard);
  }

  function endCard() {
    if (S.ended) return;
    S.ended = true;
    clearSave();
    clearTimers();
    try { GameEngine.dialogue.hide(); } catch (_) {}
    CH.showRobots(false);
    const wrap = el('endCard');
    if (!wrap) return;
    el('endCoords').textContent = S.bonus;
    wrap.classList.remove('hidden');
    requestAnimationFrame(() => wrap.classList.add('visible'));
  }

  function copyBonus() {
    const btn = el('endCopy');
    const done = ok => { if (btn) btn.textContent = ok ? '[ KOPIERT ]' : '[ MARKIEREN UND KOPIEREN ]'; };
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = S.bonus; ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;left:-9999px;';
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        done(ok);
      } catch (_) { done(false); }
    };
    try { navigator.clipboard.writeText(S.bonus).then(() => done(true), fallback); }
    catch (_) { fallback(); }
  }

  // ═══════════════════════════════════════════════════════════════
  // AFTER
  // ═══════════════════════════════════════════════════════════════
  const STINGER = [
    { sys:true, k:'EXTERNE VERBINDUNG:', v:'GETRENNT' },
    { sys:true, k:'TESTPERSON:', v:'HAT ANLAGE VERLASSEN' },
    { who:'R-3MI', t:'„Glaubst du, unsere Testperson kommt wieder?"' },
    { who:'V-TGM', t:'"Yes."' },
    { who:'R-3MI', t:'„Wie sicher?"' },
    { who:'V-TGM', t:'"Very."' },
  ];

  // ═══════════════════════════════════════════════════════════════
  // CREDITS — one card at a time, role first, then who
  // ═══════════════════════════════════════════════════════════════
  const CARDS = [
    { role:'Konzept & Kreative Leitung', name:'Team_Aperture', team:true },
    { role:'Rätseldesign', name:'R-3MI', cls:'cc-r' },
    { role:'Geschichte & Dialoge', name:'R-3MI · V-TGM', cls:'cc-rv' },
    { role:'Kreatives Design', name:'V-TGM · R-3MI', cls:'cc-vr' },
    { role:'Musik', name:'R-3MI', cls:'cc-r' },
    { role:'Code-Entwicklung & Technisches Design', name:'Nova — ChatGPT von OpenAI' },
    { role:'Implementierung & Integration', name:'Claude — Anthropic' },
    { role:'Gastroboter-Inspiration', name:'F-RØ5CHI · L-UX · B-RADF1SH · T-FLON14 · ASP-1024 · FAX-N · AGN-H3R', small:true },
    { role:'Danke fürs Testen.', name:'Team_Aperture', team:true },
  ];

  let creditsDone = null;

  function runCredits(after) {
    creditsDone = after;
    try { GameEngine.music.play('credits'); } catch (_) {}
    el('endCard')?.classList.add('hidden');
    const w = el('cineCredits');
    if (!w) { finishCredits(); return; }
    w.classList.remove('hidden');
    requestAnimationFrame(() => w.classList.add('visible'));
    el('cineSkip')?.classList.add('visible');
    playCard(0);
  }

  function playCard(i) {
    if (creditsDone === null) return;                 // skipped
    const stage = el('cineStage');
    if (!stage) { finishCredits(); return; }
    if (i >= CARDS.length) { later(finishCredits, reduceMotion() ? 200 : 900); return; }

    const c = CARDS[i];
    const fast = reduceMotion();
    stage.innerHTML =
        `<p class="cc-role">${esc(c.role)}</p>`
      + `<p class="cc-name${c.team ? ' cc-team' : ''}${c.cls ? ' ' + c.cls : ''}${c.small ? ' cc-small' : ''}">`
      + (c.team
          ? '<span class="cc-team-a">Team</span><span class="cc-team-b">_Aperture</span>'
          : esc(c.name))
      + `</p>`;
    const roleEl = stage.querySelector('.cc-role');
    const nameEl = stage.querySelector('.cc-name');

    const hold  = fast ? 700 : 2100;
    const gap   = fast ? 60  : 380;
    const out   = fast ? 120 : 750;
    const pause = fast ? 120 : 520;

    requestAnimationFrame(() => roleEl.classList.add('visible'));
    later(() => nameEl.classList.add('visible'), gap);
    later(() => {
      roleEl.classList.remove('visible');
      nameEl.classList.remove('visible');
      later(() => playCard(i + 1), out + pause);
    }, gap + hold);
  }

  function skipCredits() {
    clearTimers();
    finishCredits();
  }

  function finishCredits() {
    const after = creditsDone;
    creditsDone = null;
    try { GameEngine.state.setFlag('ch9_credits_seen', true); } catch (_) {}
    const w = el('cineCredits');
    if (w) {
      w.classList.remove('visible');
      el('cineSkip')?.classList.remove('visible');
      setTimeout(() => w.classList.add('hidden'), 700);
    }
    setTimeout(() => { if (after) after(); }, reduceMotion() ? 120 : 700);
  }

  function leave() { runCredits(stinger); }

  function stinger() {
    try { GameEngine.music.stop(600); } catch (_) {}
    el('endCard')?.classList.add('hidden');
    const w = el('stinger');
    const body = el('stingerBody');
    if (!w || !body) { location.href = '../index.html'; return; }
    body.innerHTML = '';
    w.classList.remove('hidden');
    requestAnimationFrame(() => w.classList.add('visible'));
    const fast = reduceMotion();
    let t = fast ? 200 : 1400;
    STINGER.forEach((s, i) => {
      later(() => {
        const d = document.createElement('div');
        if (s.sys) {
          d.className = 'st-sys';
          d.innerHTML = `<span class="st-k sys-text">${s.k}</span><span class="st-v sys-text">${s.v}</span>`;
          tone({ f: 140, t: 0.05, type: 'sine', g: 0.04 });
        } else {
          d.className = 'st-line st-' + (s.who === 'R-3MI' ? 'r' : 'v');
          d.innerHTML = `<span class="st-who">${s.who}</span><span class="st-t">${esc(s.t)}</span>`;
        }
        body.appendChild(d);
        requestAnimationFrame(() => d.classList.add('visible'));
      }, t);
      t += fast ? 260 : (i === 1 ? 2200 : i === 4 ? 2000 : 1500);
    });
    later(() => {
      body.classList.add('fading');
      later(() => {
        body.innerHTML = '';
        body.classList.remove('fading');
        const d = document.createElement('div');
        d.className = 'st-final';
        d.textContent = 'KALIBRIERUNG BEENDET.';
        try { GameEngine.state.setFlag('ch9_stinger_seen', true); } catch (_) {}
        body.appendChild(d);
        requestAnimationFrame(() => d.classList.add('visible'));
        later(() => el('stingerExit')?.classList.add('visible'), fast ? 300 : 1800);
      }, 1200);
    }, t + (fast ? 200 : 1200));
  }

  // ═══════════════════════════════════════════════════════════════
  // REVISIT
  // ═══════════════════════════════════════════════════════════════
  function returning() {
    CH.setScene('vault-live');
    CH.showRobots(true);
    const bar = el('reactProgress');
    if (bar) bar.textContent = 'REAKTIVIERUNG: 100 % · ADMINISTRATOREN: ONLINE';
    say([
      { speaker:'SYSTEM', text:'KAMMER: NICHT REGISTRIERT. Die Konsole läuft. Der Empfänger läuft. Sonst hat sich nichts geändert.' },
      { speaker:'R-3MI',  text:'„Du bist wieder da."' },
      { speaker:'V-TGM',  text:'"We did not lock it."', subtitle:'Wir haben sie nicht abgeschlossen.' },
    ], revisitMenu);
  }

  function revisitMenu() {
    CH.showChoices({
      prompt: 'DIESE KAMMER:',
      hint: 'BONUSZIELDATEN BLEIBEN VERFÜGBAR',
      choices: [
        { key:'coords', label:'[ BONUSZIELDATEN ]', fn: showBonusAgain },
        { key:'again',  label:'[ ERINNERUNG WIEDERHOLEN ]', fn: () => say(WARNING, revisitMenu) },
        { key:'log',    label:'[ PROTOKOLL ]', fn: () => { openLog(); revisitMenu(); } },
        { key:'leave',  label:'[ ZURÜCK ]', fn: () => { location.href = '../index.html'; } },
      ],
    });
  }

  function showBonusAgain() {
    S.bonus = S.bonus || (() => { try { return GameEngine.state.get('bonuszieldaten_text') || ''; } catch (_) { return ''; } })();
    el('evLabel').textContent = 'FREMDSIGNAL // RESTDATEN';
    el('evTitle').textContent = 'BONUSZIELDATEN';
    el('evSub').textContent   = 'QUELLE: EXTERNES NOTFALLDEPOT';
    el('evBody').innerHTML =
        `<div class="rec-coords"><div class="rec-coords-value">${esc(S.bonus)}</div>`
      + `<button class="ka-btn small" data-act="copy-bonus">[ KOPIEREN ]</button></div>`;
    openCard('evModal');
    revisitMenu();
  }

  // ═══════════════════════════════════════════════════════════════
  // TALK
  // ═══════════════════════════════════════════════════════════════
  const TALK = {
    r3mi: [
      ['„Es ist wirklich nichts hier. Nur alte Technik."'],
      ['„Können wir nicht einfach woanders hin? Der Garten ist schön um die Zeit."'],
      ['„Du guckst dir jede einzelne Akte an, oder?"'],
      ['„…ja. Machst du."'],
    ],
    vtgm: [
      ['"This room is not on any plan. Somebody removed it on purpose."', 'Dieser Raum steht in keinem Plan. Jemand hat ihn absichtlich entfernt.'],
      ['"Whatever you find here, it was left for someone."', 'Was auch immer du hier findest, es wurde für jemanden hinterlassen.'],
      ['"Take your time."', 'Lass dir Zeit.'],
    ],
  };
  function clickRobot(who) {
    if (dialogueBusy()) { try { GameEngine.dialogue.advance(); } catch (_) {} return; }
    if (S.act === 4 && !S.facedFirst) { faceUnit(who); return; }
    if (S.act >= 5) {
      say([ who === 'r3mi'
        ? { speaker:'R-3MI', text:'„Frag ruhig. Ich lüge dich heute nicht mehr an. Das wäre auch ein bisschen spät."' }
        : { speaker:'V-TGM', text:'"Ask. I will answer."', subtitle:'Frag. Ich antworte.' } ]);
      return;
    }
    const pool = TALK[who] || [];
    if (!pool.length) return;
    const n = (S.talk[who] = (S.talk[who] || 0) + 1);
    const [t, sub] = pool[Math.min(n - 1, pool.length - 1)];
    say([{ speaker: who === 'r3mi' ? 'R-3MI' : 'V-TGM', text: t, subtitle: sub }]);
  }

  // ═══════════════════════════════════════════════════════════════
  // CHAPTER ART
  // Nothing decorative. Everything in here was installed to do a job, and
  // then taken off the plan.
  // ═══════════════════════════════════════════════════════════════
  function registerArt() {
    GameEngine.props.register({

      // a reader with a paper record still lying in it
      c9_reader: { vb:'0 0 110 130', art:
          '<ellipse class="prop-inset" cx="55" cy="124" rx="42" ry="5" opacity=".6"/>'
        + '<rect class="prop-base" x="10" y="30" width="90" height="86" rx="3"/>'
        + '<rect class="prop-lite" x="14" y="34" width="82" height="2.6"/>'
        + '<rect class="prop-inset" x="18" y="42" width="74" height="52"/>'
        + '<rect class="prop-metal" x="24" y="20" width="62" height="24" rx="2"/>'
        + [0,1,2,3,4,5].map(i => `<line class="prop-thin" x1="28" y1="${50 + i*7}" x2="${80 - (i%3)*11}" y2="${50 + i*7}" opacity=".6"/>`).join('')
        + '<rect class="prop-acc-dim" x="28" y="98" width="32" height="4"/>'
        + '<circle class="prop-led" cx="92" cy="110" r="2.6"/>' },

      // a hand-labelled patch field
      c9_patch: { vb:'0 0 100 140', art:
          '<rect class="prop-base" x="6" y="6" width="88" height="128" rx="2"/>'
        + '<rect class="prop-inset" x="12" y="14" width="76" height="102"/>'
        + [0,1,2,3,4,5].map(r => [0,1,2,3,4].map(c =>
            `<circle class="prop-metal" cx="${20 + c*15}" cy="${24 + r*17}" r="4.5"/>`).join('')).join('')
        + [[20,24,50,41],[65,41,35,75],[50,58,80,92]].map(([x1,y1,x2,y2]) =>
            `<path class="prop-edge" d="M${x1} ${y1} C${x1} ${(y1+y2)/2}, ${x2} ${(y1+y2)/2}, ${x2} ${y2}" opacity=".7"/>`).join('')
        + '<rect class="prop-acc-dim" x="14" y="120" width="40" height="4"/>'
        + '<line class="prop-thin" x1="14" y1="128" x2="70" y2="128" opacity=".5"/>' },

      // a routing board: lines that go somewhere they should not
      c9_board: { vb:'0 0 140 120', art:
          '<rect class="prop-base" x="4" y="4" width="132" height="112" rx="2"/>'
        + '<rect class="prop-inset" x="10" y="12" width="120" height="96"/>'
        + [0,1,2,3,4,5,6,7].map(i =>
            `<line class="prop-thin" x1="18" y1="${20 + i*10}" x2="${96 - (i%4)*10}" y2="${20 + i*10}" opacity=".55"/>`
          + `<circle class="prop-lite" cx="${100 - (i%4)*10}" cy="${20 + i*10}" r="2.6"/>`).join('')
        + '<path class="prop-edge" d="M112 20 V96 H70" opacity=".85"/>'
        + '<circle class="prop-acc" cx="70" cy="96" r="4"/>'
        + '<rect class="prop-acc-dim" x="14" y="100" width="34" height="4"/>' },

      // the receiver: five channels, all of them lit
      c9_rack: { vb:'0 0 100 140', art:
          '<ellipse class="prop-inset" cx="50" cy="134" rx="34" ry="5" opacity=".6"/>'
        + '<rect class="prop-base" x="10" y="6" width="80" height="122" rx="3"/>'
        + [0,1,2,3,4].map(i => {
            const y = 14 + i * 23;
            return `<rect class="prop-metal" x="16" y="${y}" width="68" height="18" rx="2"/>`
                 + `<rect class="prop-screen" x="20" y="${y+3}" width="46" height="12"/>`
                 + `<path class="prop-scan" d="M22 ${y+9} l6 -3 6 6 6 -6 6 4 6 -3 6 2 6 -2" fill="none"/>`
                 + `<circle class="prop-led${i ? ' prop-led-' + (i % 3 + 1) : ''}" cx="76" cy="${y+9}" r="2.8"/>`;
          }).join('')
        + '<rect class="prop-lite" x="10" y="6" width="80" height="2.6"/>' },

      // the console nobody switched on
      c9_console: { vb:'0 0 140 100', art:
          '<ellipse class="prop-inset" cx="70" cy="94" rx="54" ry="5" opacity=".6"/>'
        + '<path class="prop-base" d="M14 88 L26 34 h88 l12 54 Z"/>'
        + '<rect class="prop-inset" x="34" y="40" width="72" height="30" rx="2"/>'
        + '<rect class="prop-screen" x="38" y="43" width="64" height="24"/>'
        + [0,1,2].map(i => `<line class="prop-scan" x1="42" y1="${49 + i*6}" x2="${94 - i*12}" y2="${49 + i*6}"/>`).join('')
        + [0,1,2,3,4,5].map(i => `<rect class="prop-metal" x="${34 + i*12}" y="74" width="9" height="7" rx="1.5"/>`).join('')
        + '<rect class="prop-lite" x="26" y="34" width="88" height="2.4"/>'
        + '<circle class="prop-led prop-led-2" cx="116" cy="80" r="2.6"/>' },

      // a crate somebody shoved into a corner
      c9_crate: { vb:'0 0 90 80', art:
          '<rect class="prop-base" x="6" y="18" width="78" height="56" rx="2"/>'
        + '<rect class="prop-metal" x="6" y="18" width="78" height="9"/>'
        + '<line class="prop-thin" x1="45" y1="27" x2="45" y2="74" opacity=".6"/>'
        + '<line class="prop-thin" x1="6" y1="50" x2="84" y2="50" opacity=".45"/>'
        + '<rect class="prop-acc-dim" x="14" y="32" width="22" height="4"/>'
        + '<path class="prop-thin" d="M30 18 q15 -10 30 0" opacity=".5"/>' },

      // dead terminals stacked to the ceiling
      c9_stack: { vb:'0 0 70 190', art:
          '<rect class="prop-base" x="4" y="0" width="62" height="188"/>'
        + [0,1,2,3,4,5].map(r => {
            const y = 8 + r * 30;
            return `<rect class="prop-inset" x="10" y="${y}" width="50" height="22" rx="2"/>`
                 + `<rect class="prop-metal" x="14" y="${y+3}" width="42" height="14" opacity="${(0.7 - r*0.08).toFixed(2)}"/>`;
          }).join('')
        + '<line class="prop-thin" x1="4" y1="184" x2="66" y2="184" opacity=".5"/>' },

      // cable duct along the ceiling
      c9_duct: { vb:'0 0 200 30', art:
          '<rect class="prop-base" x="0" y="6" width="200" height="16" rx="3"/>'
        + '<rect class="prop-lite" x="4" y="9" width="192" height="2"/>'
        + [0,1,2,3,4,5,6,7].map(i => `<rect class="prop-inset" x="${12 + i*24}" y="22" width="6" height="7"/>`).join('') },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // LOCKED
  // ═══════════════════════════════════════════════════════════════
  function showLocked(mainDone) {
    document.body.classList.add('chapter-page');
    let have = 0, total = 5;
    try {
      total = signalDefs().length;
      have  = signalDefs().filter(x => GameEngine.signals.isFound(x.id)).length;
    } catch (_) {}
    const w = document.createElement('main');
    w.className = 'locked-wrap';
    w.innerHTML = `
      <div class="bg-scanlines" aria-hidden="true"></div>
      <div class="locked-card">
        <div class="locked-label sys-text">ZUGANG VERWEIGERT</div>
        <h1 class="locked-title">████████</h1>
        <dl class="locked-rows">
          <dt>QUERVERWEIS</dt><dd>UNVOLLSTÄNDIG</dd>
          ${mainDone
            ? `<dt>FREMDSIGNALE</dt><dd>${have} / ${total}</dd>`
            : '<dt>HAUPTPROTOKOLL</dt><dd>UNVOLLSTÄNDIG</dd>'}
        </dl>
        <p class="locked-text">${mainDone
          ? 'Zugang nur bei vollständigem Signalsatz.'
          : 'Das Archiv gleicht erst ab, wenn die regulären Sektoren online sind.'}</p>
        ${mainDone ? '<button class="ka-btn primary" id="lockSig">[ SIGNALARCHIV ]</button>' : ''}
        <a class="ka-btn${mainDone ? ' small' : ' primary'}" href="../index.html">[ ZURÜCK ]</a>
      </div>`;
    document.body.appendChild(w);
    el('lockSig')?.addEventListener('click', () => { try { GameEngine.signals.showOverlay(); } catch (_) {} });
  }

  // ═══════════════════════════════════════════════════════════════
  // BUILD + INIT
  // ═══════════════════════════════════════════════════════════════
  function buildChapter() {
    CH.build({
      title: 'KA-II // —',
      num: '09',
      sector: 'NICHT REGISTRIERT',
      reactPct: 100,
      name: 'Die Kammer, die es nicht gibt',
      subline: '„Deshalb blieb etwas draußen."',
      emblemDeco: '<div class="ch9-mark"><i></i><i></i></div>',
      scene: { ph: 'vault-dim' },
      guest: { key: 'unknown', name: '???' },
      music: 'ch9_ambient',
      chapterCount: 9,
      onStart: begin,
      onRobot: clickRobot,
    });
    // this chamber has no sector number of its own
    const lbl = document.querySelector('#titleCard .ch-label');
    if (lbl) lbl.textContent = 'SEKTOR-ID: —';
    CH.showGuest(false);
  }

  function onPanelClick(ev) {
    const btn = ev.target.closest && ev.target.closest('[data-act]');
    if (!btn || btn.disabled) return;
    switch (btn.dataset.act) {
      case 'ev-close':    closeRecord(); break;
      case 'sg-close':    closeSignal(); break;
      case 'sg-sync':     synchronise(); break;
      case 'log-open':    openLog(); break;
      case 'log-close':   closeLog(); break;
      case 'copy-bonus':  copyBonus(); break;
      case 'end-copy':    copyBonus(); break;
      case 'end-leave':   leave(); break;
      case 'end-credits': GameEngine.showCredits(); break;
      case 'cine-skip':   skipCredits(); break;
      case 'face-r3mi':   faceUnit('r3mi'); break;
      case 'face-vtgm':   faceUnit('vtgm'); break;
    }
  }

  function init() {
    registerArt();
    let mainDone = false;
    try { mainDone = GameEngine.state.isChapterComplete('ch8'); } catch (_) {}
    if (!mainDone || !allSignals()) { showLocked(mainDone); return; }

    let revisit = false;
    try { revisit = GameEngine.state.hasFlag('truth_revealed'); } catch (_) {}
    const cp = loadCheckpoint();
    if (revisit) {
      S.act = 5;
      S.signalDone = true;
      try { S.bonus = GameEngine.state.get('bonuszieldaten_text') || ''; } catch (_) {}
      clearSave();
    } else if (cp) {
      S.act = cp.act; S.records = cp.records; S.signalDone = !!cp.signalDone;
      S.facedFirst = cp.facedFirst || null; S.asked = cp.asked || {};
      S.consoleSeen = !!cp.consoleSeen; S.burstSeen = !!cp.burstSeen;
      S.optional = cp.optional || {};
    }

    document.body.addEventListener('click', onPanelClick);
    el('logBtn')?.classList.remove('hidden');   // nothing to read back until we are in
    buildChapter();

    const card = el('titleCard');
    if (card) card.style.visibility = 'hidden';
    coldOpen(() => {
      if (card) card.style.visibility = '';
      CH.start(begin, reduceMotion() ? 900 : 2600);
    });
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', () => Chapter9.init());
