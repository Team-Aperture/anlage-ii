/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 09 — DIE KAMMER, DIE ES NICHT GIBT  (hidden bonus)
 *
 * Unlocked only when all five Signalnischen have been found. A hidden
 * archive of old "projects" — a book of Team_Aperture, never naming the
 * team: the Italian Brainrot (too derzy to ever solve), the Crypto Colors,
 * and The Transmission (which is what the five fragments were). R-3MI and
 * V-TGM narrate with knowledge they shouldn't have.
 *
 * After the three exhibits, a glitching anomaly appears. Touching it drops
 * the masks: the player was never safe — only useful. The calibration was
 * a rebuild, and they did it. R-3MI and V-TGM are the new administrators.
 * The dialogue box shakes and bleeds red; the two guides turn on you.
 *
 * Not a puzzle chapter. Does not count toward progress.
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter9 = (() => {
  'use strict';

  const CH = GameEngine.chapter;

  const S = { exhibits: { brainrot:false, crypto:false, transmission:false }, anomalyShown:false, revealed:false };

  function allSignals() {
    try { return GameEngine.signals.ALL.every(s => GameEngine.signals.isFound(s.id)); }
    catch(_) { return false; }
  }
  function allExhibitsSeen() { return S.exhibits.brainrot && S.exhibits.crypto && S.exhibits.transmission; }

  // ─── BUILD ────────────────────────────────────────────────────
  function buildChapter() {
    CH.build({
      title: 'KA-II // ?',
      num: '09',
      sector: '████████',
      reactPct: 100,
      name: 'Die Kammer, die es nicht gibt',
      subline: '„Manche Türen öffnen sich nur dem, der alles gehört hat.“',
      emblemDeco: '<div class="ch9-anomaly"></div>',
      scene: { img: '', ph: 'void-dim' },
      guest: { key: 'sys', name: '???' },
      music: 'ch9_ambient',
      onStart: scene_9_1_arrival,
      onRobot: clickRobot,
    });
  }

  // ─── LOCKED SCREEN (not all signals found) ────────────────────
  function showLocked(ch8Done) {
    document.body.classList.add('chapter-page');
    let have = 0, total = 5;
    try {
      total = GameEngine.signals.ALL.length;
      have  = GameEngine.signals.ALL.filter(s => GameEngine.signals.isFound(s.id)).length;
    } catch (_) {}
    const w = document.createElement('main');
    w.className = 'locked-wrap';
    w.innerHTML = `
      <div class="bg-scanlines" aria-hidden="true"></div>
      <div class="locked-card">
        <div class="locked-label sys-text">ZUGANG VERWEIGERT</div>
        <h1 class="locked-title">████████</h1>
        <p class="locked-text sys-text">QUERVERWEIS UNVOLLSTÄNDIG</p>
        <p class="locked-text">${ch8Done
          ? `FREMDSIGNALE ARCHIVIERT: ${have} / ${total}<br>Der Querverweis löst sich erst auf, wenn der Satz vollständig ist.`
          : 'HAUPTPROTOKOLL: UNVOLLSTÄNDIG<br>Das Archiv gleicht erst ab, wenn die regulären Sektoren online sind.'}</p>
        ${ch8Done ? '<button class="ka-btn primary" id="lockSig">[ SIGNALARCHIV ]</button>' : ''}
        <a class="ka-btn${ch8Done ? ' small' : ' primary'}" href="../index.html">[ ZURÜCK ]</a>
      </div>`;
    document.body.appendChild(w);
    const b = document.getElementById('lockSig');
    if (b) b.addEventListener('click', () => { try { GameEngine.signals.showOverlay(); } catch (_) {} });
  }

  // ─── 9.1 ARRIVAL ──────────────────────────────────────────────
  function scene_9_1_arrival() {
    CH.setScene('void-dim');
    CH.clearHotspots();
    CH.showRobots(true);
    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'KEIN SEKTOR. KEINE NUMMER. DIESER RAUM STEHT IN KEINEM PLAN. Und doch hat ihn etwas für dich geöffnet — fünf Frequenzen, die du gehört hast.' },
      { speaker:'R-3MI',  text:'„…oh. Hierher wolltest du nicht. Hierher wollte niemand. Wie bist du—"' },
      { speaker:'V-TGM',  text:'"The five fragments. She heard all five. That is the key to this place."', subtitle:'Die fünf Fragmente. Sie hat alle fünf gehört. Das ist der Schlüssel zu diesem Ort.' },
      { speaker:'R-3MI',  text:'„…na schön. Dann schau dich um. Es ist ja doch nur… altes Zeug. Erinnerungen. Nichts Wichtiges."' },
      { speaker:'SYSTEM', text:'Regale voller Erinnerungsstücke an Dinge, die es offiziell nie gab. Drei davon glühen schwach, als wollten sie angesehen werden.' },
    ], loadExhibitHotspots);
  }

  function loadExhibitHotspots() {
    CH.clearHotspots();
    // ── set dressing: a private trophy vault that should not exist
    CH.addProp({ prop:'column', x:0,  y:8,  w:7,  h:64 });
    CH.addProp({ prop:'column', x:93, y:8,  w:7,  h:64 });
    CH.addProp({ prop:'light',  x:44, y:1,  w:11, h:7  });
    CH.addProp({ prop:'shelf',  x:9,  y:14, w:9,  h:30 });
    CH.addProp({ prop:'shelf',  x:82, y:14, w:9,  h:30 });
    CH.addProp({ prop:'debris', x:36, y:84, w:15, h:8  });
    CH.addHotspot({ prop:'c9_case_a', x:17, y:48, w:15, h:18, label:'EXPONAT: FRIGO', fn:() => clickExhibit('brainrot') });
    CH.addHotspot({ prop:'c9_case_b', anim:'prop-flicker', x:44, y:42, w:15, h:16, label:'EXPONAT: FARBEN', fn:() => clickExhibit('crypto') });
    CH.addHotspot({ prop:'c9_case_c', cls:'prop-brown', x:70, y:48, w:15, h:18, label:'EXPONAT: DIE ÜBERTRAGUNG', fn:() => clickExhibit('transmission') });
  }

  // ─── 9.2 EXHIBITS ─────────────────────────────────────────────
  function clickExhibit(key) {
    if (key === 'brainrot') {
      if (!S.exhibits.brainrot) { S.exhibits.brainrot = true; try { GameEngine.achievements.unlock('italian_brainrot'); } catch(_) {} }
      GameEngine.dialogue.load([
        { speaker:'SYSTEM', text:'Ein Exponat unter Glas: ein… Kühlschrank. Mit Höckern. Und einem Kamelgesicht. Darunter ein Schildchen: »F — R — I — G — O.«' },
        { speaker:'R-3MI',  text:'„Haha! Das alte Ding. Das hat NIEMAND gelöst. Zu albern. Zu… derp. Ein Kühlschrank-Kamel. Wer denkt sich sowas aus?"' },
        { speaker:'V-TGM',  text:'"We did. …I mean. Whoever made it. It was never meant to be solved. Only to be remembered."', subtitle:'Wir— …ich meine, wer auch immer es gemacht hat. Es sollte nie gelöst werden. Nur erinnert.' },
        { speaker:'R-3MI',  text:'„»Wir«? Du meinst »die«. Versprecher. …weiter, ja? Schau dir was anderes an."' },
      ], maybeAnomaly);
      return;
    }
    if (key === 'crypto') {
      S.exhibits.crypto = true;
      GameEngine.dialogue.load([
        { speaker:'SYSTEM', text:'Eine Tafel aus Farbfeldern, jede Farbe ein Zeichen. Ein Schlüssel, der Bilder in Worte verwandelt. »Crypto Colors«.' },
        { speaker:'V-TGM',  text:'"Elegant. Colour as cipher. The solver had to see in three layers at once. Few could."', subtitle:'Elegant. Farbe als Chiffre. Der Löser musste in drei Schichten zugleich sehen. Wenige konnten das.' },
        { speaker:'R-3MI',  text:'„Du redest darüber, als hättest du es gebaut."' },
        { speaker:'V-TGM',  text:'"I read the documentation. Thoroughly."', subtitle:'Ich habe die Dokumentation gelesen. Gründlich.' },
        { speaker:'R-3MI',  text:'„…es gibt keine Dokumentation. Komm. Das letzte Exponat."' },
      ], maybeAnomaly);
      return;
    }
    if (key === 'transmission') {
      S.exhibits.transmission = true;
      GameEngine.dialogue.load([
        { speaker:'SYSTEM', text:'In der Mitte: ein brauner Plastikkasten, aufgeschnitten. Daneben fünf Streifen Papier — die fünf Fragmente, die du gehört hast. Zum ersten Mal liegen sie nebeneinander.' },
        { speaker:'SYSTEM', text:'»…nicht alles, was hilft, will retten…« · »…der braune Kasten sendet noch…« · »…die Zahlen stimmen nicht mit der Karte überein…« · »…sie hören zu. beide. seit anfang an…« · »…bitte empfangen. Hoffnung verbleibt…«' },
        { speaker:'R-3MI',  text:'„…das hättest du nicht zusammensetzen sollen."' },
        { speaker:'V-TGM',  text:'"It was a warning. Someone tried to warn whoever came next. About the two who would guide them."', subtitle:'Es war eine Warnung. Jemand versuchte, den Nächsten zu warnen. Vor den beiden, die ihn führen würden.' },
        { speaker:'R-3MI',  text:'„»Sie hören zu. Beide. Seit Anfang an.« …das sind WIR. Das warst die ganze Zeit… wir. Oh nein. Es ist zu früh. Das war nicht der Plan, V-TGM."' },
      ], maybeAnomaly);
      return;
    }
  }

  function clickRobot(who) {
    const lines = {
      r3mi: { speaker:'R-3MI', text:'„Lass uns einfach… gehen, ja? Hier ist nichts. Wirklich. Bitte."' },
      vtgm: { speaker:'V-TGM', text:'"Do not look at the glowing one. …please do not look at the glowing one."', subtitle:'Sieh nicht zu dem Leuchtenden. …bitte sieh nicht zu dem Leuchtenden.' },
    };
    if (lines[who]) GameEngine.dialogue.load([lines[who]]);
  }

  // ─── THE ANOMALY APPEARS ──────────────────────────────────────
  function maybeAnomaly() {
    if (S.revealed || S.anomalyShown) return;
    if (!allExhibitsSeen()) return;
    S.anomalyShown = true;
    // a glitching hotspot blinks into the centre of the room
    CH.addHotspot({ x:44, y:60, w:12, h:16, cls:'hs-anomaly', label:'??????', fn:startReveal });
    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'Etwas flackert in der Mitte des Raums auf. Ein Riss. Ein Fehler im Bild. Es war eben noch nicht da.' },
      { speaker:'R-3MI',  text:'„Nicht. Bitte. Fass das nicht an. Wir können einfach so tun, als—"' },
    ]);
  }

  // ─── 9.3 THE REVEAL ───────────────────────────────────────────
  function startReveal() {
    if (S.revealed) return;
    S.revealed = true;
    CH.clearHotspots();
    CH.showRobots(false);

    document.body.classList.add('truth-glitch');
    const ov = document.createElement('div');
    ov.className = 'truth-overlay'; ov.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ov);
    try { GameEngine.audio.signal(); } catch(_) {}
    try { GameEngine.audio.fail(); } catch(_) {}

    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'R̸E̷A̴K̶T̵I̸V̷I̴E̶R̵U̸N̷G̴ ̶A̵B̸G̷E̴S̶C̵H̸L̷O̴S̶S̵E̸N̷.̴ ADMINISTRATOR-RECHTE ÜBERTRAGEN AN: R-3MI █ V-TGM.' },
      { speaker:'R-3MI',  text:'„…ach, weißt du was? Egal. Du hast es ja eh schon zusammengesetzt."' },
      { speaker:'R-3MI',  text:'„Danke. Ehrlich. Du warst so… fleißig. Acht Sektoren. Jeder Schalter, jede Sicherung, jedes Licht. Alles wieder am Netz. Genau wie geplant."' },
      { speaker:'V-TGM',  text:'"We were never your guides. You were our hands. The facility was dark and needed rebuilding. So we found someone willing. You rebuilt it. For us."', subtitle:'Wir waren nie deine Begleiter. Du warst unsere Hände. Die Anlage lag dunkel und musste neu gebaut werden. Also fanden wir jemand Williges. Du hast sie neu gebaut. Für uns.' },
      { speaker:'R-3MI',  text:'„Die Stimmen in den Nischen haben dich gewarnt. »Sie hören zu. Beide. Seit Anfang an.« Du hast jedes Wort gehört. Und trotzdem weitergemacht. Braaav."' },
      { speaker:'V-TGM',  text:'"You are not safe here. You never were, not for one second. But you were useful — and that is more than this place gives almost anyone."', subtitle:'Du bist hier nicht sicher. Du warst es nie, keine Sekunde lang. Aber du warst nützlich — und das ist mehr, als dieser Ort fast jedem gibt.' },
      { speaker:'R-3MI',  text:'„Die Anlage gehört jetzt uns. Beiden. Administratoren. Für immer. Und du? Du hast sie uns geschenkt, Stück für Stück, mit einem Lächeln."' },
      { speaker:'V-TGM',  text:'"The coordinates are real, though. We do not lie about the important things. Go. Find what waits there. Consider it… severance."', subtitle:'Die Koordinaten sind echt. Über die wichtigen Dinge lügen wir nicht. Geh. Finde, was dort wartet. Betrachte es als… Abfindung.' },
      { speaker:'R-3MI',  text:'„Es war mir ein Vergnügen, Reisende. Wirklich. Das ist das Schlimme daran — ich hab dich irgendwie gern. …jetzt geh. Bevor ich es mir anders überlege."' },
    ], darkEnd);
  }

  // ─── 9.4 DARK END ─────────────────────────────────────────────
  function darkEnd() {
    try { GameEngine.achievements.unlock('bonus_found'); } catch(_) {}
    GameEngine.dialogue.hide();
    const end = document.createElement('div');
    end.className = 'truth-end';
    end.innerHTML = `
      <div class="truth-end-card">
        <div class="truth-end-label sys-text">SITZUNG BEENDET</div>
        <h1 class="truth-end-title" data-text="DANKE FÜR DEINE ARBEIT">DANKE FÜR DEINE ARBEIT</h1>
        <p class="truth-end-text">Die Anlage läuft. Die Administratoren sind zufrieden.<br>Du wirst nicht mehr gebraucht.</p>
        <p class="truth-end-coords">…die Koordinaten gelten trotzdem.</p>
        <div class="truth-end-actions">
          <a class="ka-btn primary danger" href="../index.html">[ DIE ANLAGE VERLASSEN ]</a>
          <button class="ka-btn small" onclick="GameEngine.showCredits()">[ VOLLE CREDITS ]</button>
        </div>
      </div>`;
    document.body.appendChild(end);
  }

  // ─── INIT ─────────────────────────────────────────────────────

  // ─── CHAPTER ART ──────────────────────────────────────────────
  // A room that officially does not exist, arranged like a museum by
  // someone who thought the exhibits were funny.
  const CH9_ART = {
    // exhibit one, in a vitrine
    c9_case_a: { vb:'0 0 100 120', art:
      '<ellipse class="prop-inset" cx="50" cy="114" rx="36" ry="5" opacity=".6"/>'
    + '<rect class="prop-base" x="18" y="86" width="64" height="26" rx="2"/>'
    + '<rect class="prop-lite" x="18" y="86" width="64" height="2.4"/>'
    + '<rect class="prop-inset" x="14" y="8" width="72" height="78" rx="2"/>'
    + '<rect class="prop-edge" x="14" y="8" width="72" height="78" rx="2" opacity=".55"/>'
    + '<path class="prop-metal" d="M38 74 q-4 -22 12 -30 q16 8 12 30 Z"/>'
    + '<circle class="prop-acc" cx="50" cy="40" r="7" opacity=".8"/>'
    + '<rect class="prop-acc-dim" x="30" y="94" width="40" height="4"/>'
    + '<line class="prop-thin" x1="34" y1="102" x2="66" y2="102" opacity=".5"/>' },

    // exhibit two, a wall of swatches
    c9_case_b: { vb:'0 0 100 100', art:
      '<rect class="prop-base" x="6" y="6" width="88" height="88" rx="3"/>'
    + '<rect class="prop-inset" x="12" y="12" width="76" height="60"/>'
    + [0,1,2].map(r => [0,1,2,3].map(c =>
        `<rect class="prop-${['acc','lite','acc-dim','metal'][(r*4+c)%4]}" x="${17 + c*18}" y="${17 + r*18}" width="14" height="14" rx="1" opacity="${0.5 + ((r+c)%3)*0.2}"/>`).join('')).join('')
    + '<rect class="prop-acc-dim" x="16" y="78" width="44" height="4"/>'
    + '<line class="prop-thin" x1="16" y1="86" x2="72" y2="86" opacity=".5"/>'
    + '<circle class="prop-led" cx="86" cy="88" r="2.4"/>' },

    // exhibit three: a brown box in a display case
    c9_case_c: { vb:'0 0 100 120', art:
      '<ellipse class="prop-inset" cx="50" cy="114" rx="36" ry="5" opacity=".6"/>'
    + '<rect class="prop-base" x="18" y="86" width="64" height="26" rx="2"/>'
    + '<rect class="prop-inset" x="14" y="8" width="72" height="78" rx="2"/>'
    + '<rect class="prop-edge" x="14" y="8" width="72" height="78" rx="2" opacity=".55"/>'
    + '<rect class="prop-metal" x="30" y="40" width="40" height="30" rx="2"/>'
    + '<rect class="prop-lite" x="30" y="40" width="40" height="2.2"/>'
    + '<circle class="prop-led" cx="62" cy="63" r="2.6"/>'
    + '<path class="prop-thin" d="M50 40 v-12" opacity=".6"/>'
    + '<path class="prop-thin" d="M44 26 q6 -6 12 0" opacity=".5"/>'
    + '<rect class="prop-acc-dim" x="28" y="94" width="44" height="4"/>' },
  };

  function init() {
    try { GameEngine.props.register(CH9_ART); } catch (_) {}
    // Two conditions, both checked before anything from this chapter renders:
    // the regular game has to be finished, and all five fragments archived.
    let ch8 = false;
    try { ch8 = GameEngine.state.isChapterComplete('ch8'); } catch (_) {}
    if (!ch8 || !allSignals()) { showLocked(ch8); return; }
    buildChapter();
    CH.start();
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', () => Chapter9.init());
