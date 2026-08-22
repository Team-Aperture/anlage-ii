/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 02 — WARTUNGSGARTEN
 * Guest character: F-RØ5CHI
 *
 * THE ROOM ITSELF IS THE PROGRESS BAR.
 * The garden carries the chapter in three physical states — frozen,
 * partially thawed, fully restored — and every hotspot answers
 * differently in each of them.
 *
 *   ACT 1  frozen garden · the reunion · exploration teaches the plants
 *   ACT 2  first thaw     · control returns, the same room has changed
 *   ACT 3  the carved ice tablet is found in the changed garden
 *   ACT 4  full restoration · one quiet moment · the Eissplitter
 *
 * Both puzzles validate rules, never a stored answer.
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter2 = (() => {
  'use strict';

  const CHAPTER_ID = 'ch2';
  const HINT_MAX   = 4;          // one shared ladder per puzzle

  // Garden states
  const FROZEN = 0, PARTIAL = 1, RESTORED = 2;

  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const S = {
    thawState:      FROZEN,
    seen:           {},        // "key:state" -> examine count
    talkSeen:       {},
    metFroschi:     false,
    plantsStudied:  false,     // exploration taught the plant profiles
    orgelNudged:    false,
    wellRevealed:   false,     // the carved tablet has been found
    p1Solved:       false,
    p2Solved:       false,
    bayernPMOFound: false,
    hints:  { step: 0, active: null },
    react:  { p1: {}, p2: {} },
    p1Fails: 0,
  };

  // ═══════════════════════════════════════════════════════════════
  // SCENE HELPERS
  // ═══════════════════════════════════════════════════════════════
  function setScene(key) {
    const ph = document.getElementById('scenePh');
    if (ph) ph.dataset.scene = key;
  }

  function setFrostLevel(level) {
    const layer = document.getElementById('frostLayer');
    if (!layer) return;
    layer.classList.remove('thaw-1','thaw-2','thaw-3');
    if (level >= 1) layer.classList.add(level === 1 ? 'thaw-1' : level === 2 ? 'thaw-2' : 'thaw-3');
  }

  function clearHotspots() {
    document.getElementById('sceneHotspots').innerHTML = '';
  }

  /** True while a dialogue line is on screen. */
  function dialogueBusy() {
    const c = document.querySelector('.dlg-container');
    return !!(c && c.classList.contains('visible'));
  }

  /**
   * While dialogue runs, a tap in the scene advances it instead of starting a
   * new interaction. The dialogue box only covers the bottom strip, so every
   * hotspot stays tappable underneath it, and the engine keeps exactly ONE
   * completion callback — starting a new line here would discard whatever the
   * running dialogue was going to do next.
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

  function showRobots(v) { document.getElementById('robotIcons').classList.toggle('hidden', !v); }
  function showFroschi(v) { document.getElementById('froschiIcon').classList.toggle('hidden', !v); }

  function setProgress(pct) {
    const el = document.getElementById('reactProgress');
    if (el) el.textContent = `REAKTIVIERUNG: ${pct}%`;
  }

  function playSound(src) { try { GameEngine.audio.sfx(src); } catch(_) {} }
  function tone(o)        { try { GameEngine.audio.tone(o); } catch(_) {} }
  function say(lines, after) { GameEngine.dialogue.load(lines, after); }

  /** Count an examine for the CURRENT garden state and return the new count. */
  function bump(key) {
    const k = key + ':' + S.thawState;
    S.seen[k] = (S.seen[k] || 0) + 1;
    return S.seen[k];
  }
  function seenCount(key, state) {
    return S.seen[key + ':' + (state == null ? S.thawState : state)] || 0;
  }

  /** Pick entry n from a 1-indexed bucket, clamping to the highest defined. */
  function pick(bucket, n) {
    if (!bucket) return null;
    const keys = Object.keys(bucket).map(Number).sort((a, b) => a - b);
    if (!keys.length) return null;
    const use = keys.filter(k => k <= n).pop() ?? keys[0];
    return bucket[use];
  }

  // ═══════════════════════════════════════════════════════════════
  // CHOICE — one shot, never an exhaust-all list
  // ═══════════════════════════════════════════════════════════════
  function askOnce(cfg) {
    const overlay = document.getElementById('choiceOverlay');
    const btns    = document.getElementById('choiceButtons');
    const prompt  = document.getElementById('choicePrompt');
    const hint    = document.getElementById('choiceHint');

    prompt.textContent = cfg.prompt || 'DEINE ANTWORT:';
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
      setTimeout(() => {
        card.style.display = 'none';
        act1_arrival();
      }, 700);
    }, 3000);
  }

  // ═══════════════════════════════════════════════════════════════
  // ACT 1 — FROZEN GARDEN
  // ═══════════════════════════════════════════════════════════════
  function act1_arrival() {
    setScene('frozen-wide');
    setFrostLevel(0);
    clearHotspots();
    showRobots(true);
    showFroschi(false);
    try { GameEngine.music.play('ch2_ambient'); } catch(_) {}

    say([
      { speaker:'SYSTEM', text:'Der Garten ist… kalt.' },
      { speaker:'SYSTEM', text:'Wo der Wartungssektor trocken und alt war, ist dieser Sektor feucht und alt — und vor allem: gefroren.' },
      { speaker:'SYSTEM', text:'Tropfen sind mitten in der Luft erstarrt. Pflanzen halten in Bewegungen inne, die sie vor langer Zeit begonnen haben.' },
      { speaker:'R-3MI',  text:'„Das ist neu."' },
      { speaker:'V-TGM',  text:'"This was not frozen the last time we checked."', subtitle:'Das war beim letzten Mal nicht gefroren.' },
      { speaker:'R-3MI',  text:'„Wann war das letzte Mal?"' },
      { speaker:'V-TGM',  text:'"I do not remember."', subtitle:'Ich erinnere mich nicht.' },
      { speaker:'R-3MI',  text:'„Das ist die schlimmste Antwort."' },
      { speaker:'SYSTEM', text:'Irgendwo knistert Eis, das sich bewegt, ohne zu schmelzen. Das hier war einmal lebendig.' },
    ], () => act1_froschi());
  }

  /** The frozen reveal — kept exactly as it was. */
  function act1_froschi() {
    setScene('frozen-pavilion');

    say([
      { speaker:'SYSTEM', text:'Im Pavillon steht etwas Pinkes.' },
      { speaker:'SYSTEM', text:'Es bewegt sich.' },
      { speaker:'SYSTEM', text:'Sehr… langsam.' },
      { speaker:'F-RØ5CHI', text:'„O…h…a…"' },
      { speaker:'F-RØ5CHI', text:'„…isst…des…wirkli…a…Bsuach?"', subtitle:'…ist das wirklich ein Besuch?' },
      { speaker:'R-3MI',    text:'„F-RØ5CHI?"' },
      { speaker:'F-RØ5CHI', text:'„R…3…M…I…!"', subtitle:'R-3-M-I!' },
      { speaker:'SYSTEM',   text:'Sie wackelt. Frost bröckelt von ihren Schultern. Ihre Bewegungen werden schneller — aber nicht ganz normal.' },
      { speaker:'F-RØ5CHI', text:'„A Bsuach! A echter Bsuach! Wia lang hob i scho keinen mehr g\'sehn!"', subtitle:'Ein Besuch! Ein echter Besuch! Wie lang hab ich schon keinen mehr gesehen!' },
      { speaker:'F-RØ5CHI', text:'„Kemmt eina, kemmt eina! Hosd Hunger? Wos kann i da geben? Oh, mei…"', subtitle:'Kommt herein, kommt herein! Hast du Hunger? Was kann ich dir geben? Oh je…' },
      { speaker:'F-RØ5CHI', text:'„…i hob nix do. Olles is g\'frorn."', subtitle:'…ich hab nichts da. Alles ist gefroren.' },
      { speaker:'V-TGM',    text:'"Including you."', subtitle:'Einschließlich dich.' },
      { speaker:'F-RØ5CHI', text:'„Wos?"', subtitle:'Was?' },
      { speaker:'SYSTEM',   text:'F-RØ5CHI schaut langsam an sich herunter. Sie hat eine Eisschicht auf den Schultern.' },
      { speaker:'F-RØ5CHI', text:'„…ach, des aa no."', subtitle:'…ach, das auch noch.' },
      { speaker:'R-3MI',    text:'„Sie hat es nicht einmal gemerkt."' },
      { speaker:'V-TGM',    text:'"How long has she been here?"', subtitle:'Wie lange ist sie schon hier?' },
      { speaker:'R-3MI',    text:'„Lange genug, dass sie nicht mehr weiß, wie lange."' },
    ], () => {
      S.metFroschi = true;
      showFroschi(true);
      act1_sheAsks();
    });
  }

  /** She interrogates the player, not the other way round. */
  function act1_sheAsks() {
    say([
      { speaker:'F-RØ5CHI', text:'„A echter Bsuach! Ja mei! Bist hungrig? Is da koid? Wo kummst her? Wie hoaßt? Wia bist überhaupt eina kemma?!"', subtitle:'Ein echter Besuch! Ja mei! Bist du hungrig? Ist dir kalt? Wo kommst du her? Wie heißt du? Wie bist du überhaupt hereingekommen?!' },
      { speaker:'R-3MI',    text:'„Eine Frage nach der anderen."' },
      { speaker:'F-RØ5CHI', text:'„I hob lang koane Fragen mehr stelln können!"', subtitle:'Ich hab lang keine Fragen mehr stellen können!' },
    ], () => {
      askOnce({
        prompt: 'DEINE ANTWORT:',
        hint:   'WÄHLE EINE.',
        choices: [
          { key:'fine', label:'[ Mir geht\'s gut. Glaube ich. ]', lines:[
            { speaker:'F-RØ5CHI', text:'„Glaubst? Des is koa Antwort, des is a Vermutung."', subtitle:'Glaubst? Das ist keine Antwort, das ist eine Vermutung.' },
            { speaker:'R-3MI',    text:'„Sie hat dich sofort durchschaut."' },
          ] },
          { key:'look', label:'[ Ich wollte eigentlich nur die Anlage anschauen. ]', lines:[
            { speaker:'F-RØ5CHI', text:'„Anschaun! Ja freili! Und dann bleibst hänga, gell? So fangt\'s immer o."', subtitle:'Anschauen! Ja freilich! Und dann bleibst du hängen, gell? So fängt es immer an.' },
            { speaker:'V-TGM',    text:'"She is not wrong."', subtitle:'Sie liegt nicht falsch.' },
          ] },
          { key:'food', label:'[ Gibt\'s wirklich was zu essen? ]', lines:[
            { speaker:'F-RØ5CHI', text:'„…na. Grod ned. Aber i merk ma de Frog!"', subtitle:'…nein. Gerade nicht. Aber ich merk mir die Frage!' },
            { speaker:'R-3MI',    text:'„Das war die einzige Frage, die sie beantworten konnte, und sie hat verloren."' },
          ] },
          { key:'twelve', label:'[ Ich habe inzwischen selbst ungefähr zwölf Fragen. ]', lines:[
            { speaker:'F-RØ5CHI', text:'„Zwölf! Des is a schene Zoi. Fang o."', subtitle:'Zwölf! Das ist eine schöne Zahl. Fang an.' },
            { speaker:'V-TGM',    text:'"We will be here a while."', subtitle:'Wir werden eine Weile hier sein.' },
          ] },
        ],
        onPick: () => act1_whoSheIs(),
      });
    });
  }

  /** No biography dump — she is explained by how she behaves. */
  function act1_whoSheIs() {
    say([
      { speaker:'R-3MI',    text:'„Sie kümmert sich um den Garten."' },
      { speaker:'F-RØ5CHI', text:'„Kümmern?! I RED mit eam!"', subtitle:'Kümmern?! Ich REDE mit ihm!' },
      { speaker:'V-TGM',    text:'"She talks to the plants."', subtitle:'Sie spricht mit den Pflanzen.' },
      { speaker:'F-RØ5CHI', text:'„Und de hörn wenigstens zua."', subtitle:'Und die hören wenigstens zu.' },
      { speaker:'F-RØ5CHI', text:'„Schau, mei Garten…"', subtitle:'Schau, mein Garten…' },
      { speaker:'F-RØ5CHI', text:'„…hod offnsichdlich in Arsch g\'frorn."', subtitle:'…hat offensichtlich den Arsch eingefroren.' },
      { speaker:'R-3MI',    text:'„F-RØ5CHI!"' },
      { speaker:'F-RØ5CHI', text:'„Wos? Es is wahr."', subtitle:'Was? Es ist wahr.' },
      { speaker:'V-TGM',    text:'"She is correct."', subtitle:'Sie hat recht.' },
      { speaker:'F-RØ5CHI', text:'„Magst da\'s oschaun? De Pflanzerl, de Wasserorgel, ois. Nimm da Zeit."', subtitle:'Magst du es dir anschauen? Die Pflänzchen, die Wasserorgel, alles. Nimm dir Zeit.' },
    ], () => enterGarden());
  }

  // ═══════════════════════════════════════════════════════════════
  // THE GARDEN — one room, three states
  // ═══════════════════════════════════════════════════════════════
  function enterGarden() {
    setScene(S.thawState === RESTORED ? 'thawed-wide'
           : S.thawState === PARTIAL  ? 'partial-wide' : 'frozen-wide');
    setFrostLevel(S.thawState === RESTORED ? 3 : S.thawState === PARTIAL ? 2 : 0);
    loadGardenHotspots();
  }

  function loadGardenHotspots() {
    clearHotspots();
    // ── set dressing (room layout unchanged across all three states)
    addProp({ prop:'light',  x:43, y:2,  w:12, h:8  });
    addProp({ prop:'light',  x:12, y:4,  w:10, h:7  });
    addProp({ prop:'duct',   x:56, y:0,  w:40, h:6, cls:'prop-far' });
    addProp({ prop:'ivy',    x:0,  y:4,  w:11, h:40, cls:'prop-far' });
    addProp({ prop:'ivy',    x:66, y:2,  w:11, h:34, cls:'prop-far' });
    addProp({ prop:'ivy',    x:90, y:8,  w:10, h:36, cls:'prop-far' });
    addProp({ prop:'column', x:30, y:14, w:7,  h:54 });
    addProp({ prop:'cables', x:56, y:8,  w:8,  h:22, cls:'prop-far' });
    addProp({ prop:'crate',  x:18, y:70, w:13, h:14 });
    addProp({ prop:'debris', x:60, y:84, w:15, h:8  });

    // ── interactive
    addHotspot({ prop:'c2_planter', x:40, y:64, w:16, h:18,
      label:'PFLANZBECKEN', aria:'Pflanzbecken untersuchen', fn:() => examine('plants') });
    addHotspot({ prop:'c2_organ',   x:5,  y:46, w:8,  h:40,
      label:'WASSERORGEL', aria:'Wasserorgel bedienen', fn:() => examine('orgel') });
    addHotspot({ prop:'c2_plaque',  x:85, y:52, w:11, h:12, anim:'prop-flicker',
      label:'WARTUNGSPLAKETTE', aria:'Wartungsplakette lesen', fn:() => examine('plaque') });
    addHotspot({ prop:'c2_icedsign', cls:'prop-guest', x:14, y:52, w:14, h:12,
      label:'EISVERPACKTE TAFEL', aria:'Eisverpackte Tafel untersuchen', fn:() => examine('tafel') });
    addHotspot({ prop:'c2_icesculpt', x:74, y:40, w:12, h:30,
      label:'EIS-SKULPTUR', aria:'Eis-Skulptur untersuchen', fn:() => examine('ice') });
    addHotspot({ prop:'c2_fountain', x:60, y:70, w:11, h:14,
      label:'EISBRUNNEN', aria:'Eisbrunnen untersuchen', fn:() => examine('brunnen') });
    addHotspot({ prop:'c2_shaft',    x:84, y:72, w:12, h:12,
      label:'WARTUNGSSCHACHT', aria:'Wartungsschacht untersuchen', fn:() => examine('vent') });

    // Once the garden is whole, the way on is a real object in the room.
    // This also guarantees the chapter can always be finished from here.
    if (S.p2Solved) {
      addHotspot({ prop:'c2_gardendoor', x:44, y:22, w:13, h:34,
        label:'SEKTOR 03', aria:'Sektor 03 betreten', fn:finishChapter });
    }
  }

  // ─── Per-state descriptions. The same object, a different answer. ───
  const GARDEN = {
    plants: {
      [FROZEN]: {
        1: [
          { speaker:'SYSTEM',   text:'Drei mechanische Pflanzen, eingefroren in verschiedenen Wachstumsphasen.' },
          { speaker:'F-RØ5CHI', text:'„Des is d\'Gerhilde. Ned z\'hoaß, ned z\'koid. Hauptsach koa Drama."', subtitle:'Das ist die Gerhilde. Nicht zu heiß, nicht zu kalt. Hauptsache kein Drama.' },
          { speaker:'V-TGM',    text:'"You named the plant Gerhilde."', subtitle:'Du hast die Pflanze Gerhilde genannt.' },
          { speaker:'F-RØ5CHI', text:'„SIE hod si Gerhilde g\'nennt."', subtitle:'SIE hat sich Gerhilde genannt.' },
          { speaker:'V-TGM',    text:'"...right."', subtitle:'…sicher.' },
          { speaker:'F-RØ5CHI', text:'„De do kann Kälte ab. Aber ohne Druck bewegt si gar nix."', subtitle:'Die da kann Kälte ab. Aber ohne Druck bewegt sich gar nichts.' },
          { speaker:'F-RØ5CHI', text:'„Und de Kleine mog\'s warm. Aber sachte! Wennst mit vui Druck kummst, is beleidigt."', subtitle:'Und die Kleine mag es warm. Aber sachte! Wenn du mit viel Druck kommst, ist sie beleidigt.' },
          { speaker:'R-3MI',    text:'„Drei Pflanzen, drei Persönlichkeiten. Großartig."' },
        ],
        2: [
          { speaker:'F-RØ5CHI', text:'„Gerhilde is koa Drama-Pflanzn. Meistens."', subtitle:'Gerhilde ist keine Drama-Pflanze. Meistens.' },
        ],
        4: [
          { speaker:'F-RØ5CHI', text:'„Sie mog di."', subtitle:'Sie mag dich.' },
          { speaker:'V-TGM',    text:'"You cannot know that."', subtitle:'Das kannst du nicht wissen.' },
          { speaker:'F-RØ5CHI', text:'„Doch."', subtitle:'Doch.' },
        ],
      },
      [PARTIAL]: {
        1: [
          { speaker:'SYSTEM',   text:'Das Eis um die Becken ist zurückgegangen. Gerhilde bewegt sich ganz leicht im Luftzug.' },
          { speaker:'F-RØ5CHI', text:'„Schaugst? De schnauft wieder."', subtitle:'Siehst du? Die atmet wieder.' },
        ],
        3: [
          { speaker:'F-RØ5CHI', text:'„Sie mog di."', subtitle:'Sie mag dich.' },
          { speaker:'V-TGM',    text:'"You cannot know that."', subtitle:'Das kannst du nicht wissen.' },
          { speaker:'F-RØ5CHI', text:'„Doch."', subtitle:'Doch.' },
        ],
      },
      [RESTORED]: {
        1: [
          { speaker:'SYSTEM',   text:'Die Becken stehen voll im Grün. Gerhilde neigt sich langsam zum Licht.' },
          { speaker:'R-3MI',    text:'„Gerhilde schaut mich immer noch an."' },
        ],
      },
    },

    orgel: {
      [FROZEN]: {
        1: [
          { speaker:'SYSTEM',   text:'Ein komplexes Ventilsystem — Heißwasser, Kaltwasser, Druckregulator. Alles vereist, aber die Hebel lassen sich bewegen.' },
          { speaker:'F-RØ5CHI', text:'„Des is mei Wasserorgel. Domit taut ma auf — oane nach da andern."', subtitle:'Das ist meine Wasserorgel. Damit taut man auf — eine nach der anderen.' },
        ],
      },
      [PARTIAL]: {
        1: [
          { speaker:'SYSTEM',   text:'Einzelne Tropfen laufen wieder durch das Rohr. Die Orgel gluckert leise vor sich hin.' },
          { speaker:'F-RØ5CHI', text:'„Hörst? De singt wieder. A bissl schief, aber sie singt."', subtitle:'Hörst du? Die singt wieder. Ein bisschen schief, aber sie singt.' },
        ],
      },
      [RESTORED]: {
        1: [
          { speaker:'SYSTEM',   text:'Wasser läuft gleichmäßig durch alle Leitungen. Die Orgel arbeitet vollständig.' },
        ],
      },
    },

    plaque: {
      [FROZEN]: {
        1: [
          { speaker:'SYSTEM', text:'Eine Wartungsplakette, halb unter Reif. Ein paar Zeilen sind noch lesbar.' },
          { speaker:'SYSTEM', text:'TAUPROTOKOLL. KÄLTEBESTÄNDIGE VEGETATION ZUERST.' },
          { speaker:'SYSTEM', text:'EMPFINDLICHE WARMPHASE ZULETZT.' },
          { speaker:'R-3MI',  text:'„Die Anlage hat für alles ein Protokoll. Sogar für Blumen."' },
        ],
        2: [
          { speaker:'SYSTEM', text:'TAUPROTOKOLL. KÄLTEBESTÄNDIGE VEGETATION ZUERST. EMPFINDLICHE WARMPHASE ZULETZT.' },
        ],
      },
      [PARTIAL]: {
        1: [
          { speaker:'SYSTEM', text:'Teile der Beschriftung werden sichtbar. Unter dem Tauprotokoll steht eine zweite Zeile.' },
          { speaker:'SYSTEM', text:'NACH VOLLSTÄNDIGER TAUUNG: BODENPLATTE ENTSIEGELN.' },
          { speaker:'F-RØ5CHI', text:'„Bodenplattn… ah. Er moant de Tafel beim Brunnen."', subtitle:'Bodenplatte… ah. Er meint die Tafel beim Brunnen.' },
        ],
      },
      [RESTORED]: {
        1: [
          { speaker:'SYSTEM', text:'Die Plakette ist frei. TAUPROTOKOLL: ABGESCHLOSSEN.' },
        ],
      },
    },

    tafel: {
      [FROZEN]: {
        1: [
          { speaker:'SYSTEM',   text:'Eine kleine Holztafel, eingefroren in eine Eissäule. Die Schrift darauf ist unscharf.' },
          { speaker:'F-RØ5CHI', text:'„Ah, des is no aus an andern Garten von mir. Hob\'s ois Andenken behoiden."', subtitle:'Ah, das ist noch aus einem anderen Garten von mir. Hab\'s als Andenken behalten.' },
          { speaker:'SYSTEM',   text:'Die Schrift ist auf Bayerisch. Du verstehst etwa die Hälfte.' },
          { speaker:'F-RØ5CHI', text:'„Genau! Des is\'s ganze G\'heimnis."', subtitle:'Genau! Das ist das ganze Geheimnis.' },
        ],
      },
      [PARTIAL]: {
        1: [
          { speaker:'SYSTEM',   text:'Das Eis um die Holztafel ist dünner. Ein paar Wörter mehr sind zu erkennen — sie helfen nicht.' },
          { speaker:'R-3MI',    text:'„Immer noch Bayerisch."' },
          { speaker:'F-RØ5CHI', text:'„Immer no scheen."', subtitle:'Immer noch schön.' },
        ],
      },
      [RESTORED]: {
        1: [
          { speaker:'F-RØ5CHI', text:'„De nimm i mit, wenn i amoi umzieh. Also nia."', subtitle:'Die nehm ich mit, wenn ich mal umziehe. Also nie.' },
        ],
      },
    },

    ice: {
      [FROZEN]: {
        1: [
          { speaker:'SYSTEM',   text:'Ein eingefrorener Wasserstrahl in der Form einer Skulptur.' },
          { speaker:'F-RØ5CHI', text:'„Des hod si vo söiba g\'macht. Hob i nix dazua dou."', subtitle:'Das hat sich von selbst gemacht. Hab ich nichts dazu getan.' },
          { speaker:'V-TGM',    text:'"That is concerning."', subtitle:'Das ist beunruhigend.' },
        ],
      },
      [PARTIAL]: {
        1: [
          { speaker:'SYSTEM',   text:'Die Skulptur tropft. Sie verliert langsam ihre Form — und sieht dabei besser aus als vorher.' },
          { speaker:'F-RØ5CHI', text:'„Siehst, jetzd wird\'s Kunst."', subtitle:'Siehst du, jetzt wird es Kunst.' },
        ],
      },
      [RESTORED]: {
        1: [
          { speaker:'SYSTEM',   text:'Von der Skulptur ist ein flacher Wasserlauf übrig, der zurück ins Becken führt.' },
        ],
      },
    },

    vent: {
      [FROZEN]: {
        1: [
          { speaker:'SYSTEM', text:'Ein kleiner Wartungsschacht. Vereist. Etwas blinkt dahinter — sehr schwach.' },
          { speaker:'F-RØ5CHI', text:'„Hob i no nia g\'sehn."', subtitle:'Hab ich noch nie gesehen.' },
          { speaker:'R-3MI',    text:'„Komisch. Wir sollten da nicht reinkommen."' },
          { speaker:'V-TGM',    text:'"We *should* not, or we *cannot*?"', subtitle:'Wir *sollten* nicht, oder wir *können* nicht?' },
          { speaker:'R-3MI',    text:'„Beides! Beides ist gut! Weiter!"' },
        ],
      },
      [PARTIAL]: {
        1: [
          { speaker:'SYSTEM', text:'Der Schacht ist frei getaut. Dahinter: nichts als ein abgeschalteter Sensor.' },
          { speaker:'R-3MI',  text:'„Siehst du? Vollkommen harmlos."' },
          { speaker:'V-TGM',  text:'"You sound relieved."', subtitle:'Du klingst erleichtert.' },
        ],
      },
      [RESTORED]: {
        1: [
          { speaker:'SYSTEM', text:'Der Schacht ist trocken und still.' },
        ],
      },
    },
  };

  // ─── The well is its own thing: it carries the chapter's turn ───
  const WELL_LINES = {
    [FROZEN]: {
      1: [
        { speaker:'SYSTEM',   text:'In der Mitte des Gartens steht ein kleiner Brunnen. Vollständig vereist. Unter dem Eis ist nichts erkennbar.' },
        { speaker:'F-RØ5CHI', text:'„Da Brunnen. Der schlaft grod."', subtitle:'Der Brunnen. Der schläft gerade.' },
      ],
      2: [
        { speaker:'SYSTEM', text:'Das Eis ist zu dick. Da kommst du so nicht durch.' },
      ],
    },
    [RESTORED]: {
      1: [
        { speaker:'SYSTEM',   text:'Der Brunnen läuft. Die geschnitzten Linien in der Bodenplatte glänzen nass.' },
        { speaker:'F-RØ5CHI', text:'„Sauber gschnitzt, gell?"', subtitle:'Sauber geschnitzt, gell?' },
      ],
    },
  };

  function examine(key) {
    // The well and the water organ drive the chapter; everything else is texture.
    if (key === 'brunnen') return examineWell();
    if (key === 'orgel')   return useOrgel();

    const n = bump(key);

    if (key === 'plaque' && S.thawState === FROZEN) S.plantsStudied = true;
    if (key === 'plants' && S.thawState === FROZEN) S.plantsStudied = true;

    if (key === 'tafel' && !S.bayernPMOFound) {
      S.bayernPMOFound = true;
      setTimeout(() => { try { GameEngine.achievements.unlock('bayern_pmo'); } catch(_) {} }, 800);
    }

    const lines = pick(GARDEN[key] && GARDEN[key][S.thawState], n);
    if (lines) say(lines);
  }

  /** Puzzle 1 entry. Never hard-blocked — at most one gentle redirect. */
  function useOrgel() {
    if (S.p1Solved) {
      const n = bump('orgel');
      const lines = pick(GARDEN.orgel[S.thawState], n);
      if (lines) say(lines);
      return;
    }

    // First touch: she points at the plants, because the garden teaches.
    if (!S.plantsStudied && !S.orgelNudged) {
      S.orgelNudged = true;
      bump('orgel');
      say([
        { speaker:'SYSTEM',   text:'Ein komplexes Ventilsystem — Heißwasser, Kaltwasser, Druckregulator.' },
        { speaker:'F-RØ5CHI', text:'„Hoit, hoit. Schau da erst d\'Pflanzerl o. Jede mog wos andas."', subtitle:'Halt, halt. Schau dir erst die Pflänzchen an. Jede mag etwas anderes.' },
        { speaker:'R-3MI',    text:'„Sie hat recht. Und das sage ich nicht gerne zweimal am Tag."' },
      ]);
      return;
    }

    bump('orgel');
    openPuzzle1();
  }

  /** The well is where Act 3 begins — but only once the garden has thawed. */
  function examineWell() {
    const n = bump('brunnen');

    if (S.thawState === FROZEN) {
      const lines = pick(WELL_LINES[FROZEN], n);
      if (lines) say(lines);
      return;
    }

    if (S.thawState === RESTORED || S.p2Solved) {
      const lines = pick(WELL_LINES[RESTORED], n);
      if (lines) say(lines);
      return;
    }

    // PARTIAL — the carved tablet surfaces. Latch the discovery *before*
    // the dialogue so a lost callback can never strand the chapter here.
    if (!S.wellRevealed) {
      S.wellRevealed = true;
      say([
        { speaker:'SYSTEM',   text:'Das Eis über dem Brunnen ist dünner geworden. Darunter verlaufen eingeritzte Linien — ein quadratisches Raster, fünf mal fünf.' },
        { speaker:'F-RØ5CHI', text:'„…oh."', subtitle:'…oh.' },
        { speaker:'SYSTEM',   text:'Sie sagt eine Weile nichts.' },
        { speaker:'F-RØ5CHI', text:'„Des hod mei Mo gmacht."', subtitle:'Das hat mein Mann gemacht.' },
        { speaker:'F-RØ5CHI', text:'„Früher, bevor ois dunkel wordn is, hod er ma des eina g\'schnitzt."', subtitle:'Früher, bevor alles dunkel geworden ist, hat er mir das hineingeschnitzt.' },
        { speaker:'F-RØ5CHI', text:'„I hob\'s lang nimmer richtig gsehn."', subtitle:'Ich hab es lang nicht mehr richtig gesehen.' },
        { speaker:'R-3MI',    text:'„Wir müssen das nicht sofort machen."' },
        { speaker:'F-RØ5CHI', text:'„Doch. Doch, des mach ma."', subtitle:'Doch. Doch, das machen wir.' },
      ], openPuzzle2);
      return;
    }

    openPuzzle2();
  }

  // ═══════════════════════════════════════════════════════════════
  // OPTIONAL CONVERSATIONS — reward curiosity, never gate anything
  // ═══════════════════════════════════════════════════════════════
  const TALK = {
    froschi: [
      { key:'howlong', label:'[ Wie lange bist du schon hier? ]',
        lines:[ { speaker:'F-RØ5CHI', text:'„Lang."', subtitle:'Lang.' } ],
        again:[ { speaker:'F-RØ5CHI', text:'„I hob irgendwann aufg\'hört, mitzuzähln."', subtitle:'Ich hab irgendwann aufgehört, mitzuzählen.' } ] },
      { key:'plants', label:'[ Warum redest du mit den Pflanzen? ]',
        lines:[
          { speaker:'F-RØ5CHI', text:'„Weil\'s unhöflich wär, wenn i\'s ned dad."', subtitle:'Weil es unhöflich wäre, wenn ich es nicht täte.' },
          { speaker:'F-RØ5CHI', text:'„Pflanzen sand wia Leid. Manche brauchan Wasser, manche brauchan bloß, dass oana do is."', subtitle:'Pflanzen sind wie Leute. Manche brauchen Wasser, manche brauchen bloß, dass jemand da ist.' },
        ] },
      { key:'family', label:'[ Warst du hier immer allein? ]',
        lines:[
          { speaker:'F-RØ5CHI', text:'„Früher is mei Familie oft do g\'wesn. Vor da Abschaltung."', subtitle:'Früher ist meine Familie oft da gewesen. Vor der Abschaltung.' },
          { speaker:'F-RØ5CHI', text:'„Mei Mo hod Rätsl baut. Sehr gern. Manchmoi z\' gern."', subtitle:'Mein Mann hat Rätsel gebaut. Sehr gern. Manchmal zu gern.' },
          { speaker:'R-3MI',    text:'„Klingt anstrengend."' },
          { speaker:'F-RØ5CHI', text:'„Liab. Anstrengend liab. Des is wos andas."', subtitle:'Lieb. Anstrengend lieb. Das ist was anderes.' },
        ] },
      { key:'riddle', label:'[ Wer hat das Eis-Rätsel gemacht? ]', needsWell:true,
        lines:[
          { speaker:'F-RØ5CHI', text:'„Mei Mo, freili. Er hod g\'sagt, a Rätsl ghört in an Garten wia a Bank: ma muass si hisetzn kenna."', subtitle:'Mein Mann, freilich. Er hat gesagt, ein Rätsel gehört in einen Garten wie eine Bank: man muss sich hinsetzen können.' },
        ] },
      { key:'food', label:'[ Hast du wirklich nichts zu essen? ]',
        lines:[
          { speaker:'F-RØ5CHI', text:'„Wennst Hunger kriagst, sog Bescheid."', subtitle:'Wenn du Hunger kriegst, sag Bescheid.' },
          { speaker:'R-3MI',    text:'„Alles ist noch halb eingefroren."' },
          { speaker:'F-RØ5CHI', text:'„Dann tau i hoid wos auf."', subtitle:'Dann tau ich halt was auf.' },
        ] },
    ],
    r3mi: [
      { key:'garden', label:'[ Was hältst du vom Garten? ]',
        lines:[ { speaker:'R-3MI', text:'„Ich finde diesen Garten zu pink. Und zu kalt. Und zu pink-und-kalt."' } ],
        again:[ { speaker:'R-3MI', text:'„Wenn sie mir noch einmal den Kopf tätschelt, schalte ich mich ab."' } ] },
      { key:'her', label:'[ Kennst du sie gut? ]',
        lines:[
          { speaker:'R-3MI', text:'„F-RØ5CHI ist sehr nett. Das macht mich nervös."' },
          { speaker:'V-TGM', text:'"Why?"', subtitle:'Warum?' },
          { speaker:'R-3MI', text:'„Weil nett schwer zu überprüfen ist."' },
        ] },
    ],
    vtgm: [
      { key:'assess', label:'[ Wie schätzt du sie ein? ]',
        lines:[ { speaker:'V-TGM', text:'"She is functional. But she has been alone too long."', subtitle:'Sie ist funktionsfähig. Aber sie war zu lange allein.' } ],
        again:[ { speaker:'V-TGM', text:'"Note: she does not ask why we never came back."', subtitle:'Notiz: sie fragt nicht, warum wir nie zurückgekommen sind.' } ] },
      { key:'kind', label:'[ Ist das Freundlichkeit? ]',
        lines:[ { speaker:'V-TGM', text:'"That is either kindness or memory loss."', subtitle:'Das ist entweder Freundlichkeit oder Gedächtnisverlust.' } ] },
    ],
  };

  function clickRobot(who) {
    if (who === 'froschi' && !S.metFroschi) return;
    if (dialogueBusy()) { try { GameEngine.dialogue.advance(); } catch(_) {} return; }

    const topics = (TALK[who] || []).filter(t => !t.needsWell || S.wellRevealed);
    const choices = topics.map(t => {
      const seen = !!S.talkSeen[who + ':' + t.key];
      return { key:t.key, label:t.label, seen, lines: (seen && t.again) ? t.again : t.lines };
    });
    choices.push({ key:'__leave', label:'[ Nichts. Weiter. ]', seen:false, lines: [] });

    const title = who === 'froschi' ? 'F-RØ5CHI ANSPRECHEN:'
                : who === 'r3mi'    ? 'R-3MI ANSPRECHEN:' : 'V-TGM ANSPRECHEN:';

    askOnce({
      prompt: title, hint: 'OPTIONAL.', choices,
      onPick: (key) => { if (key !== '__leave') S.talkSeen[who + ':' + key] = true; },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // PUZZLE 1 — TAU-SEQUENZ
  // Each plant blooms only in the ambient band it likes, and every
  // successful thaw warms the room by one step. The chapter's plant
  // descriptions and the Tauprotokoll plaque are what tell the player
  // which profile is which; the check below only validates the rule.
  // ═══════════════════════════════════════════════════════════════
  const PLANT_NAMES = ['GERHILDE', 'PFLANZE 02', 'PFLANZE 03'];

  const PLANT_PROFILE = {
    0: { ambient: 1, temp: 5, press: 5, name: 'GERHILDE',   shifts: 1 },
    1: { ambient: 0, temp: 4, press: 6, name: 'PFLANZE 02', shifts: 1 },
    2: { ambient: 2, temp: 7, press: 3, name: 'PFLANZE 03', shifts: 1 },
  };
  const TOLERANCE = 1;

  const P1_INIT = () => ({
    ambient: 0, selected: 0, temp: 3, press: 3,
    plants: [false, false, false], burnt: [false, false, false],
  });
  let p1State = P1_INIT();

  function openPuzzle1() {
    p1State = P1_INIT();
    S.hints.active = 'p1';
    S.hints.step   = 0;

    say([
      { speaker:'F-RØ5CHI', text:'„So. Jetzd san\'s deine."', subtitle:'So. Jetzt sind sie deine.' },
      { speaker:'R-3MI',    text:'„Also Pflanzen auftauen, ohne Pflanzen zu kochen."' },
      { speaker:'V-TGM',    text:'"Please don\'t cook the plants."', subtitle:'Bitte koch die Pflanzen nicht.' },
      { speaker:'F-RØ5CHI', text:'„Wennst was kaputt machst — ned schlimm. Wir hom Zeit."', subtitle:'Wenn du was kaputt machst — nicht schlimm. Wir haben Zeit.' },
    ], () => {
      document.getElementById('puzzle1Modal').classList.remove('hidden');
      document.getElementById('hintBar').classList.remove('hidden');
      updateHintBar();
      renderP1();
      setP1Status('BEREIT.', '');
    });
  }

  function renderP1() {
    document.getElementById('thawSelected').textContent = PLANT_NAMES[p1State.selected];

    document.getElementById('tempBar').style.width  = (p1State.temp  / 10) * 100 + '%';
    document.getElementById('pressBar').style.width = (p1State.press / 10) * 100 + '%';
    document.getElementById('tempLabel').textContent  = `${p1State.temp} / 10`;
    document.getElementById('pressLabel').textContent = `${p1State.press} / 10`;

    const ambientPct = (p1State.ambient / 3) * 100;
    document.getElementById('ambientFill').style.width  = ambientPct + '%';
    document.getElementById('ambientMarker').style.left = ambientPct + '%';
    const ambLabels = ['SEHR KALT','KÜHL','WARM','HEISS'];
    document.getElementById('ambientLabel').textContent = ambLabels[p1State.ambient] || ambLabels[0];

    document.querySelectorAll('.thaw-plant').forEach((el, i) => {
      el.classList.toggle('selected', i === p1State.selected && !p1State.plants[i]);
      el.classList.toggle('bloomed',  p1State.plants[i]);
      el.classList.toggle('burnt',    p1State.burnt[i]);
      const stateEl  = el.querySelector('.plant-state');
      const statusEl = el.querySelector('.plant-status');
      if (p1State.plants[i])      { stateEl.textContent = '🌸'; statusEl.textContent = 'erblüht'; }
      else if (p1State.burnt[i])  { stateEl.textContent = '🔥'; statusEl.textContent = 'verbrannt'; }
      else                        { stateEl.textContent = '❄';  statusEl.textContent = 'eingefroren'; }
    });
  }

  function thawSelect(dir) {
    if (S.p1Solved) return;
    let nextIdx = p1State.selected;
    for (let i = 0; i < 3; i++) {
      nextIdx = (nextIdx + dir + 3) % 3;
      if (!p1State.plants[nextIdx]) break;
    }
    p1State.selected = nextIdx;
    renderP1();
  }

  function thawTemp(dir) {
    if (S.p1Solved) return;
    p1State.temp = Math.max(0, Math.min(10, p1State.temp + dir));
    renderP1();
  }

  function thawPressure(dir) {
    if (S.p1Solved) return;
    p1State.press = Math.max(0, Math.min(10, p1State.press + dir));
    renderP1();
  }

  function thawApply() {
    if (S.p1Solved) return;
    const idx     = p1State.selected;
    const profile = PLANT_PROFILE[idx];

    if (p1State.plants[idx]) { setP1Status('Diese Pflanze ist bereits erblüht.', 'warn'); return; }
    if (p1State.burnt[idx])  p1State.burnt[idx] = false;

    const tempDiff  = Math.abs(p1State.temp  - profile.temp);
    const pressDiff = Math.abs(p1State.press - profile.press);

    if (p1State.temp >= profile.temp + 3) {
      p1State.burnt[idx] = true;
      setP1Status(`${profile.name} wurde verbrannt. Reduziere die Temperatur und versuche es erneut.`, 'error');
      renderP1(); reactP1('burn', idx); return;
    }
    if (p1State.temp <= profile.temp - 3) {
      setP1Status(`${profile.name} bleibt gefroren. Mehr Wärme.`, 'warn');
      renderP1(); reactP1('cold', idx); return;
    }
    if (pressDiff > 3) {
      setP1Status(`Druck ist falsch. ${profile.name} reagiert nicht.`, 'warn');
      renderP1(); reactP1('miss', idx); return;
    }
    if (p1State.ambient !== profile.ambient) {
      setP1Status(`Die Umgebungstemperatur passt nicht zu ${profile.name}. Erst eine andere Pflanze.`, 'warn');
      renderP1(); reactP1('order', idx); return;
    }

    if (tempDiff <= TOLERANCE && pressDiff <= TOLERANCE) {
      p1State.plants[idx] = true;
      p1State.ambient = Math.min(3, p1State.ambient + profile.shifts);
      setP1Status(`${profile.name} erblüht! Umgebung erwärmt sich.`, 'ok');
      playSound('ch2_plant_bloom.mp3');
      tone({ freq: 520, type:'triangle', dur: 0.5, vol: 0.12, glideTo: 780 });

      for (let i = 0; i < 3; i++) if (!p1State.plants[i]) { p1State.selected = i; break; }
      renderP1();
      reactP1('bloom', idx);

      if (p1State.plants.every(Boolean)) {
        S.p1Solved = true;
        setTimeout(() => solvePuzzle1(), 1100);
      }
      return;
    }

    setP1Status('Beinahe — passt nicht ganz. Probier andere Werte.', 'warn');
    renderP1(); reactP1('miss', idx);
  }

  /** Occasional character reactions — each fires at most once. */
  function reactP1(kind, idx) {
    const R = S.react.p1;
    if (kind === 'burn' && idx === 0 && !R.gerhilde) {
      R.gerhilde = true;
      say([
        { speaker:'F-RØ5CHI', text:'„GERHILDE!!"' },
        { speaker:'R-3MI',    text:'„Sie lebt noch! Wahrscheinlich."' },
        { speaker:'V-TGM',    text:'"Do not say probably."', subtitle:'Sag nicht wahrscheinlich.' },
      ]);
      return;
    }
    if (kind === 'cold' && !R.cold) {
      R.cold = true;
      say([
        { speaker:'F-RØ5CHI', text:'„Du musst mit ihr REDEN."', subtitle:'Du musst mit ihr REDEN.' },
        { speaker:'V-TGM',    text:'"Or increase the temperature."', subtitle:'Oder die Temperatur erhöhen.' },
        { speaker:'F-RØ5CHI', text:'„Des aa."', subtitle:'Das auch.' },
      ]);
      return;
    }
    if (kind === 'bloom' && !R.firstBloom) {
      R.firstBloom = true;
      say([
        { speaker:'F-RØ5CHI', text:'„JA! SIE SCHAUT!"', subtitle:'JA! SIE SCHAUT!' },
        { speaker:'R-3MI',    text:'„Pflanzen schauen nicht."' },
        { speaker:'SYSTEM',   text:'Die Pflanze dreht sich ein Stück.' },
        { speaker:'R-3MI',    text:'„Ich nehme alles zurück."' },
      ]);
      return;
    }
    if (kind === 'miss' || kind === 'order') {
      S.p1Fails++;
      if (S.p1Fails === 5 && !R.nudge) {
        R.nudge = true;
        say([
          { speaker:'F-RØ5CHI', text:'„Ned aufgebn. De Plakettn an da Wand hod\'s scho g\'sagt."', subtitle:'Nicht aufgeben. Die Plakette an der Wand hat es schon gesagt.' },
        ]);
      }
    }
  }

  function setP1Status(text, type) {
    const el = document.getElementById('puzzle1Status');
    el.textContent = text;
    el.className = 'puzzle-status sys-text' + (type ? ' ' + type : '');
  }

  function thawReset() {
    if (S.p1Solved) return;
    p1State = P1_INIT();
    setP1Status('BEREIT.', '');
    renderP1();
  }

  // ─── ACT 2 — FIRST THAW. Control comes back to the player. ─────
  function solvePuzzle1() {
    document.getElementById('puzzle1Modal').classList.add('hidden');
    document.getElementById('hintBar').classList.add('hidden');
    S.hints.active = null;

    // State and control first, narration second. The player must get the
    // changed room back even if the dialogue below is interrupted.
    S.thawState = PARTIAL;
    setScene('partial-wide');
    setFrostLevel(2);
    setProgress(18);
    loadGardenHotspots();
    playSound('ch2_thaw.mp3');
    try { GameEngine.fx.flash('rgba(120,220,180,0.20)'); } catch(_) {}

    say([
      { speaker:'SYSTEM',   text:'PFLANZSEKTOREN AKTIV. UMGEBUNGSTEMPERATUR STEIGT.' },
      { speaker:'SYSTEM',   text:'Der Reif an den Scheiben läuft in dünnen Bahnen nach unten. Irgendwo tropft es zum ersten Mal seit Jahren.' },
      { speaker:'F-RØ5CHI', text:'„Mei Gerhilde lebt! Schau, sie nickt!"', subtitle:'Meine Gerhilde lebt! Schau, sie nickt!' },
      { speaker:'R-3MI',    text:'„Sie nickt wirklich."' },
      { speaker:'V-TGM',    text:'"That is botanically impossible."', subtitle:'Das ist botanisch unmöglich.' },
      { speaker:'F-RØ5CHI', text:'„Mei Pflanzn sand ned botanisch. Sie sand höflich."', subtitle:'Meine Pflanzen sind nicht botanisch. Sie sind höflich.' },
      { speaker:'F-RØ5CHI', text:'„Schau da\'s o. Der Garten schaut jetzd anders aus."', subtitle:'Schau es dir an. Der Garten sieht jetzt anders aus.' },
    ]);
  }

  // ═══════════════════════════════════════════════════════════════
  // PUZZLE 2 — FROSTMUSTER
  // 5×5 ice tablet. The centre well must end up alone; the other 24
  // cells must fall into six connected groups of four. Many layouts
  // satisfy that — the check validates the rule, never one answer.
  // A few channels are frozen in from the start (his carved lines).
  // ═══════════════════════════════════════════════════════════════
  const WELL           = '2,2';
  const FROST_PALETTE  = 6;
  const FROST_MAX_CUTS = 18;
  const FROST_FIXED    = new Set(['h,0,1','h,0,3','h,1,1','v,1,0','v,1,1','v,2,1']);
  function isCut(edge) { return p2State.cuts.has(edge) || FROST_FIXED.has(edge); }

  let p2State = { cuts: new Set() };

  function openPuzzle2() {
    if (S.p2Solved) return;
    p2State = { cuts: new Set() };
    S.hints.active = 'p2';
    S.hints.step   = 0;

    say([
      { speaker:'F-RØ5CHI', text:'„De Tafel is a Fünf-mal-Fünf-Feld. In da Mittn da Brunnen — den muassd freihoidn, ganz alloa."', subtitle:'Die Tafel ist ein Fünf-mal-Fünf-Feld. In der Mitte der Brunnen — den musst du freihalten, ganz allein.' },
      { speaker:'F-RØ5CHI', text:'„Drumherum schneidst sechs Bereiche, jeder genau vier Felder. Klick zwischn zwoa Felder, dann setzt a Eiskanal."', subtitle:'Drumherum schneidest du sechs Bereiche, jeder genau vier Felder. Klick zwischen zwei Felder, dann setzt du einen Eiskanal.' },
      { speaker:'F-RØ5CHI', text:'„Und schau: a poar Kanäl san scho ins Eis g\'frorn — de pinkn. De hod er selber eina g\'schnitzt. De bleibn."', subtitle:'Und schau: ein paar Kanäle sind schon ins Eis gefroren — die pinken. Die hat er selber hineingeschnitzt. Die bleiben.' },
      { speaker:'SYSTEM',   text:'Die pinken Linien sind nicht ganz gerade. Jemand hat sie mit der Hand gezogen. In einer Ecke: zwei eingeritzte Buchstaben.' },
      { speaker:'F-RØ5CHI', text:'„Oba pass auf: so vui Eis hob i nimmer. Mehr ois achtzehn Kanäl mog de Tafel ned."', subtitle:'Aber pass auf: so viel Eis hab ich nicht mehr. Mehr als achtzehn Kanäle mag die Tafel nicht.' },
      { speaker:'F-RØ5CHI', text:'„Er hod gsagt, des Rätsl hod mehrere Lösungen."', subtitle:'Er hat gesagt, das Rätsel hat mehrere Lösungen.' },
      { speaker:'R-3MI',    text:'„Das ist entweder großzügig oder faul."' },
      { speaker:'F-RØ5CHI', text:'„Sag des eam amoi persönlich."', subtitle:'Sag das ihm mal persönlich.' },
      { speaker:'R-3MI',    text:'„Mehrere Lösungen sind großartig."' },
    ], () => {
      document.getElementById('puzzle2Modal').classList.remove('hidden');
      document.getElementById('hintBar').classList.remove('hidden');
      updateHintBar();
      buildFrostGrid();
      updateFrost();
    });
  }

  function frostNeighbours(r, c) {
    const nb = [];
    if (c < 4 && !isCut(`h,${r},${c}`))     nb.push([r, c + 1]);
    if (c > 0 && !isCut(`h,${r},${c - 1}`)) nb.push([r, c - 1]);
    if (r < 4 && !isCut(`v,${r},${c}`))     nb.push([r + 1, c]);
    if (r > 0 && !isCut(`v,${r - 1},${c}`)) nb.push([r - 1, c]);
    return nb;
  }

  function frostComponents() {
    const seen = new Set(), comps = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const start = `${r},${c}`;
        if (seen.has(start)) continue;
        const comp = [], q = [[r, c]];
        seen.add(start);
        while (q.length) {
          const [cr, cc] = q.shift();
          comp.push(`${cr},${cc}`);
          frostNeighbours(cr, cc).forEach(([nr, nc]) => {
            const k = `${nr},${nc}`;
            if (!seen.has(k)) { seen.add(k); q.push([nr, nc]); }
          });
        }
        comps.push(comp);
      }
    }
    return comps;
  }

  function frostStatus() {
    const comps = frostComponents();
    let regions4 = 0, wellIsolated = false;
    comps.forEach(comp => {
      if (comp.includes(WELL)) wellIsolated = comp.length === 1;
      else if (comp.length === 4) regions4++;
    });
    return { comps, regions4, wellIsolated, win: wellIsolated && regions4 === 6 && comps.length === 7 };
  }

  function buildFrostGrid() {
    const grid = document.getElementById('frostGrid');
    grid.innerHTML = '';
    for (let gr = 0; gr < 9; gr++) {
      for (let gc = 0; gc < 9; gc++) {
        const evenR = gr % 2 === 0, evenC = gc % 2 === 0;
        if (evenR && evenC) {
          const r = gr / 2, c = gc / 2;
          const el = document.createElement('div');
          el.className = 'frost-cell' + (`${r},${c}` === WELL ? ' frost-well' : '');
          el.dataset.r = r; el.dataset.c = c;
          grid.appendChild(el);
        } else if (evenR && !evenC) {
          grid.appendChild(makeChannel('frost-ch-v', `h,${gr / 2},${(gc - 1) / 2}`));
        } else if (!evenR && evenC) {
          grid.appendChild(makeChannel('frost-ch-h', `v,${(gr - 1) / 2},${gc / 2}`));
        } else {
          const corner = document.createElement('div');
          corner.className = 'frost-corner';
          grid.appendChild(corner);
        }
      }
    }
  }

  function makeChannel(cls, edge) {
    const btn = document.createElement('button');
    const fixed = FROST_FIXED.has(edge);
    btn.className = 'frost-ch ' + cls + (fixed ? ' fixed' : '');
    btn.dataset.edge = edge;
    if (fixed) {
      btn.setAttribute('aria-label', 'Eingeschnitzter Eiskanal — fest, nicht veränderbar');
    } else {
      btn.setAttribute('aria-label', 'Eiskanal setzen oder entfernen');
      btn.addEventListener('click', () => toggleCut(edge));
    }
    return btn;
  }

  function toggleCut(edge) {
    if (S.p2Solved || FROST_FIXED.has(edge)) return;
    if (p2State.cuts.has(edge)) {
      p2State.cuts.delete(edge);
    } else {
      if (p2State.cuts.size + FROST_FIXED.size >= FROST_MAX_CUTS) {
        setP2Status(`KEIN EIS MEHR — HÖCHSTENS ${FROST_MAX_CUTS} KANÄLE. ENTFERNE ZUERST EINEN.`, 'error');
        return;
      }
      p2State.cuts.add(edge);
    }
    updateFrost();
  }

  function updateFrost() {
    const { comps, regions4, wellIsolated, win } = frostStatus();

    const cellColour = {};
    let ci = 0;
    comps.forEach(comp => {
      if (!comp.includes(WELL) && comp.length === 4) {
        const colour = ci % FROST_PALETTE;
        comp.forEach(k => cellColour[k] = colour);
        ci++;
      }
    });

    document.querySelectorAll('#frostGrid .frost-cell').forEach(el => {
      const k = `${el.dataset.r},${el.dataset.c}`;
      const isWell = k === WELL;
      el.className = 'frost-cell' + (isWell ? ' frost-well' : '');
      if (isWell) { if (wellIsolated) el.classList.add('isolated'); }
      else if (cellColour[k] != null) el.classList.add('region', 'region-' + cellColour[k]);
    });

    document.querySelectorAll('#frostGrid .frost-ch').forEach(el => {
      el.classList.toggle('active', p2State.cuts.has(el.dataset.edge));
    });

    setP2Status(
      `${regions4} / 6 BEREICHE · BRUNNEN ${wellIsolated ? 'ISOLIERT' : 'OFFEN'} · EIS ${p2State.cuts.size + FROST_FIXED.size}/${FROST_MAX_CUTS}`,
      win ? 'ok' : ''
    );

    if (win && !S.p2Solved) {
      S.p2Solved = true;
      setTimeout(() => solvePuzzle2(), 900);
    }
  }

  function frostReset() {
    if (S.p2Solved) return;
    p2State.cuts.clear();
    updateFrost();
  }

  function setP2Status(text, type) {
    const el = document.getElementById('puzzle2Status');
    el.textContent = text;
    el.className = 'puzzle-status sys-text' + (type ? ' ' + type : '');
  }

  // ═══════════════════════════════════════════════════════════════
  // ACT 4 — FULL RESTORATION
  // ═══════════════════════════════════════════════════════════════
  function solvePuzzle2() {
    document.getElementById('puzzle2Modal').classList.add('hidden');
    document.getElementById('hintBar').classList.add('hidden');
    S.hints.active = null;

    // Persist and switch the room before anything narrative runs.
    S.thawState = RESTORED;
    GameEngine.state.markChapterComplete(CHAPTER_ID);
    GameEngine.state.setFlag('has_eissplitter');

    setScene('thawed-wide');
    setFrostLevel(3);
    setProgress(24);
    loadGardenHotspots();
    playSound('ch2_full_thaw.mp3');
    try { GameEngine.fx.flash('rgba(120,220,160,0.28)'); } catch(_) {}
    tone({ freq: 220, type:'sine', dur: 2.2, vol: 0.13, glideTo: 440 });

    say([
      { speaker:'SYSTEM',   text:'FROSTMUSTER GELÖST. EIS-TAFEL ENTSIEGELT.' },
      { speaker:'SYSTEM',   text:'Entlang der geschnittenen Linien bricht das Eis auf. Wasser läuft an, erst zögerlich, dann in Strömen.' },
      { speaker:'SYSTEM',   text:'Die Scheiben über dem Garten werden klar. Licht fällt herein — echtes, warmes Licht.' },
      { speaker:'SYSTEM',   text:'Überall öffnet sich etwas. Der ganze Sektor riecht plötzlich nach nasser Erde.' },
      { speaker:'SYSTEM',   text:'SEKTOR 02 STABILISIERT.' },
    ], () => act4_quietMoment());
  }

  /** One sincere pause. No jokes for a moment. */
  function act4_quietMoment() {
    say([
      { speaker:'F-RØ5CHI', text:'„...mei Garten."', subtitle:'…mein Garten.' },
      { speaker:'SYSTEM',   text:'Sie steht einfach da.' },
      { speaker:'F-RØ5CHI', text:'„Do bist ja wieder."', subtitle:'Da bist du ja wieder.' },
      { speaker:'SYSTEM',   text:'Niemand sagt etwas.' },
    ], () => {
      say([
        { speaker:'R-3MI',    text:'„Gerhilde schaut mich immer noch an."' },
        { speaker:'F-RØ5CHI', text:'„De mog di hoid."', subtitle:'Die mag dich halt.' },
        { speaker:'R-3MI',    text:'„Das beruhigt mich überhaupt nicht."' },
        { speaker:'V-TGM',    text:'"It is a plant, R-3MI."', subtitle:'Es ist eine Pflanze, R-3MI.' },
        { speaker:'R-3MI',    text:'„Das sagst du jetzt."' },
      ], () => {
        loadGardenHotspots();
        act4_ending();
      });
    });
  }

  function act4_ending() {
    say([
      { speaker:'F-RØ5CHI', text:'„Wartet — i hob euch wos zum Mitnehma."', subtitle:'Wartet — ich hab euch was zum Mitnehmen.' },
      { speaker:'SYSTEM',   text:'Sie drückt dir einen kleinen, glänzenden Eissplitter in die Hand — ein Stück aus der Tafel ihres Mannes.' },
      { speaker:'F-RØ5CHI', text:'„Der schmilzt ned. Er erinnert si bloß ned dro, dass er soi."', subtitle:'Der schmilzt nicht. Er erinnert sich bloß nicht daran, dass er soll.' },
      { speaker:'R-3MI',    text:'„Warum gibst du uns einen Eissplitter?"' },
      { speaker:'F-RØ5CHI', text:'„Weil i kann."', subtitle:'Weil ich kann.' },
      { speaker:'V-TGM',    text:'"That is the best answer she has given."', subtitle:'Das ist die beste Antwort, die sie gegeben hat.' },
      { speaker:'F-RØ5CHI', text:'„Pfiat eich, ihr Drei. Kemmts wieder, gell?"', subtitle:'Pfiat euch, ihr drei. Kommt wieder, gell?' },
      { speaker:'SYSTEM',   text:'SEKTOR 03 — BEOBACHTUNGSSEKTOR — FREIGEGEBEN.' },
      { speaker:'R-3MI',    text:'„L-UX wird sich freuen."' },
      { speaker:'V-TGM',    text:'"If he holds still long enough for us to find him."', subtitle:'Wenn er lange genug stillhält, dass wir ihn finden.' },
      { speaker:'R-3MI',    text:'„Das ist auch ein Wenn."' },
    ], finishChapter);
  }

  function finishChapter() {
    GameEngine.state.markChapterComplete(CHAPTER_ID);
    GameEngine.state.setFlag('has_eissplitter');
    try { GameEngine.achievements.unlock('ch2_complete'); } catch(_) {}
    try { GameEngine.audio.fanfare(); } catch(_) {}

    document.getElementById('chapterComplete').classList.remove('hidden');
    document.getElementById('ccProgress').textContent =
      `FORTSCHRITT: ${GameEngine.state.get('chaptersCompleted').length} / 9 KAPITEL`;
    setTimeout(() => document.getElementById('ccEnter')?.focus(), 700);
  }

  // ═══════════════════════════════════════════════════════════════
  // HINTS — one shared 4-step ladder per puzzle.
  // Observation → relationship → method → last resort. Whoever you ask
  // voices the next step, so the choice is personality, not quantity.
  // ═══════════════════════════════════════════════════════════════
  const HINTS = {
    p1: [
      {
        froschi: { t:'„Schau da erst o, welche mit da Kälte am besten klarkommt."', s:'Schau dir erst an, welche mit der Kälte am besten klarkommt.' },
        r3mi:    { t:'„Drei Pflanzen, drei Launen. F-RØ5CHI hat dir von jeder erzählt — das war kein Small Talk."' },
        vtgm:    { t:'"Each plant has a preferred climate. She described all three."', s:'Jede Pflanze hat ein bevorzugtes Klima. Sie hat alle drei beschrieben.' },
      },
      {
        froschi: { t:'„Jedes Auftauen macht\'n Raum wärmer. Des bleibt so."', s:'Jedes Auftauen macht den Raum wärmer. Das bleibt so.' },
        r3mi:    { t:'„Wenn jeder Erfolg den Raum wärmer macht, willst du wahrscheinlich nicht mit der Wärme-Liebhaberin anfangen."' },
        vtgm:    { t:'"The order should follow the changing ambient temperature."', s:'Die Reihenfolge sollte der wechselnden Umgebungstemperatur folgen.' },
      },
      {
        froschi: { t:'„D\'Plakettn an da Wand sagt\'s: de Zache zuerst, de Empfindliche zuletzt."', s:'Die Plakette an der Wand sagt es: die Zähe zuerst, die Empfindliche zuletzt.' },
        r3mi:    { t:'„Kältebeständig zuerst, ausgeglichen in die Mitte, hitzeliebend zum Schluss. Steht sogar an der Wand."' },
        vtgm:    { t:'"Cold-hardy first, balanced second, heat-loving last. Match temperature to the plant, not to the room."', s:'Kältebeständig zuerst, ausgeglichen als zweites, hitzeliebend zuletzt. Richte die Temperatur nach der Pflanze, nicht nach dem Raum.' },
      },
      {
        froschi: { t:'„Und wennst gar nimmer weida woaßt: de Zache mog kräftigen Druck, de Gerhilde mog ois mittel, de Kleine mog\'s warm und ganz sacht."', s:'Und wenn du gar nicht mehr weiterweißt: die Zähe mag kräftigen Druck, die Gerhilde mag alles mittel, die Kleine mag es warm und ganz sanft.' },
        r3mi:    { t:'„Letzte Stufe: mittlere Werte für Gerhilde. Für die Zähe mehr Druck als Hitze. Für die Kleine mehr Hitze als Druck."' },
        vtgm:    { t:'"Final help: balanced values for Gerhilde, pressure above heat for the hardy one, heat above pressure for the small one."', s:'Letzte Hilfe: ausgeglichene Werte für Gerhilde, Druck über Hitze bei der Zähen, Hitze über Druck bei der Kleinen.' },
      },
    ],
    p2: [
      {
        froschi: { t:'„Da Brunnen ghört zu koana Gruppe. Der is a eigener Sturschädl."', s:'Der Brunnen gehört zu keiner Gruppe. Der ist ein eigener Sturkopf.' },
        r3mi:    { t:'„Der Brunnen spielt nicht mit. Der steht allein da. Sehr nachvollziehbar."' },
        vtgm:    { t:'"The well belongs to no group. Cut it free on all four sides."', s:'Der Brunnen gehört zu keiner Gruppe. Schneide ihn auf allen vier Seiten frei.' },
      },
      {
        froschi: { t:'„Vierazwanzg Felder bleibn übrig. Und sechs Gruppen soin\'s wern."', s:'Vierundzwanzig Felder bleiben übrig. Und sechs Gruppen sollen es werden.' },
        r3mi:    { t:'„24 Felder. Sechs Gruppen. Ich würde rechnen, aber V-TGM schaut schon streng."' },
        vtgm:    { t:'"Twenty-four cells into six groups. The size of each group follows from that."', s:'Vierundzwanzig Felder in sechs Gruppen. Die Größe jeder Gruppe folgt daraus.' },
      },
      {
        froschi: { t:'„Denk an Tetris-Stückerl. Immer vier Felder, die zammhänga."', s:'Denk an Tetris-Stückchen. Immer vier Felder, die zusammenhängen.' },
        r3mi:    { t:'„Vierer-Klumpen, die sich berühren. Wie Tetris, nur ohne Zeitdruck und ohne Musik."' },
        vtgm:    { t:'"Start where the board gives you the fewest possibilities."', s:'Fang dort an, wo das Feld dir die wenigsten Möglichkeiten lässt.' },
      },
      {
        froschi: { t:'„De pinkn Linien san scho do — de zoagn da, wo zwoa Gruppn auseinandergehn. Bau drumrum."', s:'Die pinken Linien sind schon da — die zeigen dir, wo zwei Gruppen auseinandergehen. Bau drumherum.' },
        r3mi:    { t:'„Die pinken Schnitte sind gratis geliefert. Fang an den Ecken an, die sie schon halb abtrennen."' },
        vtgm:    { t:'"Treat every fixed pink channel as a finished border, then complete the group on each side of it."', s:'Behandle jeden festen pinken Kanal als fertige Grenze und vervollständige dann die Gruppe auf jeder Seite davon.' },
      },
    ],
  };

  function useHint(who) {
    const ladder = HINTS[S.hints.active];
    if (!ladder) return;

    if (S.hints.step >= HINT_MAX) {
      const done = {
        r3mi:    { speaker:'R-3MI',    text:'„Mehr darf ich nicht. System-Regeln. Ich hasse Regeln."' },
        vtgm:    { speaker:'V-TGM',    text:'"You have what you need."', subtitle:'Du hast, was du brauchst.' },
        froschi: { speaker:'F-RØ5CHI', text:'„Mehr derf i ned, des wär unfair. Aber du schaffst des."', subtitle:'Mehr darf ich nicht, das wäre unfair. Aber du schaffst das.' },
      };
      say([done[who]]);
      return;
    }

    const step = ladder[S.hints.step];
    S.hints.step++;
    updateHintBar();

    const entry   = step[who] || step.vtgm;
    const speaker = who === 'r3mi' ? 'R-3MI' : who === 'vtgm' ? 'V-TGM' : 'F-RØ5CHI';
    say([{ speaker, text: entry.t, subtitle: entry.s }]);
  }

  function updateHintBar() {
    const left = Math.max(0, HINT_MAX - S.hints.step);
    document.getElementById('hintCount').textContent = `HINWEISE: ${left} VERFÜGBAR`;
    const done = left <= 0;
    document.getElementById('hintBtnR3MI').disabled    = done;
    document.getElementById('hintBtnVTGM').disabled    = done;
    document.getElementById('hintBtnFroschi').disabled = done;
  }

  // ═══════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════

  // ─── CHAPTER ART ──────────────────────────────────────────────
  // A frozen garden. Everything in here is either growing, or was, or
  // is encased in ice waiting to find out.
  const CH2_ART = {
    // a planter bed under frost — soil, dormant shoots, a rime crust
    c2_planter: { vb:'0 0 110 96', art:
      '<ellipse class="prop-inset" cx="55" cy="90" rx="46" ry="5" opacity=".6"/>'
    + '<path class="prop-base" d="M10 86 L16 40 h78 l6 46 Z"/>'
    + '<rect class="prop-metal" x="12" y="36" width="86" height="8" rx="2"/>'
    + '<rect class="prop-lite" x="12" y="36" width="86" height="2.5" rx="1"/>'
    + '<path class="prop-inset" d="M20 44 h70 l-4 34 H24 Z"/>'
    + '<path class="prop-vine" d="M40 76 q-3 -14 2 -22" stroke-width="2"/>'
    + '<path class="prop-vine" d="M58 78 q4 -16 -1 -24" stroke-width="2"/>'
    + '<path class="prop-vine" d="M72 76 q2 -11 -3 -18" stroke-width="1.6"/>'
    + '<ellipse class="prop-leaf" cx="42" cy="52" rx="6" ry="3.4" transform="rotate(-22 42 52)"/>'
    + '<ellipse class="prop-leaf" cx="57" cy="50" rx="6" ry="3.4" transform="rotate(18 57 50)"/>'
    + '<path class="prop-lite" d="M20 46 q18 6 34 0 q16 -6 36 2 v4 H20 Z" opacity=".45"/>'
    + '<circle class="prop-led" cx="94" cy="82" r="2.6"/>' },

    // the water organ: a rank of pipes, valves and one frozen outlet
    c2_organ: { vb:'0 0 72 130', art:
      '<ellipse class="prop-inset" cx="36" cy="124" rx="26" ry="4" opacity=".6"/>'
    + '<rect class="prop-metal" x="12" y="6" width="9" height="112" rx="3"/>'
    + '<rect class="prop-metal" x="27" y="14" width="9" height="104" rx="3"/>'
    + '<rect class="prop-metal" x="42" y="2" width="9" height="116" rx="3"/>'
    + '<rect class="prop-lite" x="12" y="6" width="2.6" height="112"/>'
    + '<rect class="prop-lite" x="27" y="14" width="2.6" height="104"/>'
    + '<rect class="prop-lite" x="42" y="2" width="2.6" height="116"/>'
    + '<rect class="prop-base" x="6" y="60" width="54" height="9" rx="3"/>'
    + '<circle class="prop-base" cx="55" cy="42" r="11"/>'
    + '<circle class="prop-edge" cx="55" cy="42" r="7"/>'
    + '<line class="prop-edge" x1="55" y1="35" x2="55" y2="49"/>'
    + '<line class="prop-edge" x1="48" y1="42" x2="62" y2="42"/>'
    + '<path class="prop-glow" d="M14 118 h5 l3 8 h-11 Z"/>'
    + '<circle class="prop-led-2" cx="9" cy="66" r="2.4"/>' },

    // the maintenance plaque, iced over at one corner
    c2_plaque: { vb:'0 0 100 80', art:
      '<rect class="prop-base" x="6" y="8" width="88" height="62" rx="3"/>'
    + '<rect class="prop-metal" x="11" y="13" width="78" height="52"/>'
    + '<rect class="prop-lite" x="11" y="13" width="78" height="2.4"/>'
    + '<rect class="prop-acc-dim" x="19" y="22" width="46" height="6"/>'
    + '<rect class="prop-acc-dim" x="19" y="34" width="58" height="4" opacity=".55"/>'
    + '<rect class="prop-acc-dim" x="19" y="43" width="38" height="4" opacity=".45"/>'
    + '<circle class="prop-inset" cx="14" cy="16" r="2"/><circle class="prop-inset" cx="86" cy="16" r="2"/>'
    + '<circle class="prop-inset" cx="14" cy="62" r="2"/><circle class="prop-inset" cx="86" cy="62" r="2"/>'
    + '<path class="prop-lite" d="M62 13 l27 0 l0 26 z" opacity=".38"/>'
    + '<circle class="prop-led" cx="83" cy="58" r="2.6"/>' },

    // a notice board sealed under a slab of ice
    c2_icedsign: { vb:'0 0 100 80', art:
      '<rect class="prop-base" x="8" y="10" width="84" height="56" rx="2"/>'
    + '<rect class="prop-inset" x="13" y="15" width="74" height="46"/>'
    + '<rect class="prop-acc-dim" x="22" y="24" width="42" height="5" opacity=".4"/>'
    + '<rect class="prop-acc-dim" x="22" y="34" width="52" height="4" opacity=".3"/>'
    + '<path class="prop-lite" d="M10 12 L44 8 L52 66 L14 68 Z" opacity=".33"/>'
    + '<path class="prop-lite" d="M50 9 L82 12 L78 66 L54 66 Z" opacity=".22"/>'
    + '<path class="prop-edge" d="M44 8 L52 66" opacity=".5"/>'
    + '<path class="prop-edge" d="M13 15 h74 v46 h-74 Z" opacity=".35"/>' },

    // an ice sculpture nobody has explained yet
    c2_icesculpt: { vb:'0 0 90 130', art:
      '<ellipse class="prop-inset" cx="45" cy="124" rx="30" ry="5" opacity=".6"/>'
    + '<path class="prop-base" d="M24 122 h42 l-6 -13 h-30 Z"/>'
    + '<path class="prop-lite" d="M45 8 L66 54 L58 109 H32 L24 54 Z" opacity=".5"/>'
    + '<path class="prop-edge" d="M45 8 L66 54 L58 109 H32 L24 54 Z" opacity=".85"/>'
    + '<path class="prop-edge" d="M45 8 V109 M24 54 H66" opacity=".38"/>'
    + '<path class="prop-glow" d="M45 22 L58 56 L53 98 H38 L32 56 Z"/>'
    + '<path class="prop-lite" d="M45 8 L52 30 L45 44 L38 30 Z" opacity=".7"/>' },

    // the frozen fountain, basin rimmed with rime
    c2_fountain: { vb:'0 0 120 92', art:
      '<ellipse class="prop-inset" cx="60" cy="82" rx="48" ry="8" opacity=".6"/>'
    + '<path class="prop-base" d="M14 62 q46 16 92 0 l-6 16 q-40 12 -80 0 Z"/>'
    + '<ellipse class="prop-metal" cx="60" cy="62" rx="46" ry="11"/>'
    + '<ellipse class="prop-lite" cx="60" cy="61" rx="38" ry="8" opacity=".55"/>'
    + '<rect class="prop-base" x="52" y="24" width="16" height="36" rx="3"/>'
    + '<ellipse class="prop-lite" cx="60" cy="24" rx="14" ry="4"/>'
    + '<path class="prop-lite" d="M60 26 q-9 12 -6 24 M60 26 q9 12 6 24" stroke-width="2" opacity=".6"/>'
    + '<path class="prop-edge" d="M22 60 q38 12 76 0" opacity=".45"/>' },

    // the service shaft the garden drains into
    c2_shaft: { vb:'0 0 90 80', art:
      '<rect class="prop-base" x="6" y="6" width="78" height="68" rx="3"/>'
    + '<rect class="prop-inset" x="13" y="13" width="64" height="54"/>'
    + '<rect class="prop-metal" x="15" y="18" width="60" height="5"/>'
    + '<rect class="prop-metal" x="15" y="29" width="60" height="5"/>'
    + '<rect class="prop-metal" x="15" y="40" width="60" height="5"/>'
    + '<rect class="prop-metal" x="15" y="51" width="60" height="5"/>'
    + '<path class="prop-vine" d="M20 67 q6 -14 -1 -24" stroke-width="1.6"/>'
    + '<ellipse class="prop-leaf" cx="18" cy="47" rx="5" ry="2.8" transform="rotate(-30 18 47)"/>'
    + '<circle class="prop-lite" cx="11" cy="11" r="2"/><circle class="prop-lite" cx="79" cy="11" r="2"/>'
    + '<circle class="prop-lite" cx="11" cy="69" r="2"/><circle class="prop-lite" cx="79" cy="69" r="2"/>' },

    // the door out, with a growth of ivy that refuses to be tidy
    c2_gardendoor: { vb:'0 0 80 120', art:
      '<ellipse class="prop-inset" cx="40" cy="115" rx="34" ry="4" opacity=".6"/>'
    + '<rect class="prop-base" x="5" y="2" width="70" height="112" rx="4"/>'
    + '<rect class="prop-inset" x="12" y="9" width="56" height="98"/>'
    + '<rect class="prop-metal" x="13" y="10" width="26" height="96"/>'
    + '<rect class="prop-metal" x="41" y="10" width="26" height="96"/>'
    + '<rect class="prop-lite" x="13" y="10" width="3.4" height="96"/>'
    + '<rect class="prop-lite" x="41" y="10" width="3.4" height="96"/>'
    + '<line class="prop-edge" x1="40" y1="10" x2="40" y2="106" opacity=".8"/>'
    + '<path class="prop-vine" d="M6 106 q10 -30 2 -56" stroke-width="2.4"/>'
    + '<ellipse class="prop-leaf" cx="11" cy="72" rx="7" ry="3.8" transform="rotate(-24 11 72)"/>'
    + '<ellipse class="prop-leaf" cx="5" cy="90" rx="6" ry="3.4" transform="rotate(16 5 90)"/>'
    + '<circle class="prop-led" cx="40" cy="6" r="2.8"/>' },
  };

  function init() {
    try { GameEngine.props.register(CH2_ART); } catch (_) {}
    if (!GameEngine.state.isChapterComplete('ch1')) {
      location.replace('../chapter1/chapter1.html');
      return;
    }
    setProgress(12);
    showTitleCard();
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════
  return {
    init,
    clickRobot,
    useHint,
    thawSelect,
    thawTemp,
    thawPressure,
    thawApply,
    thawReset,
    frostReset,
  };

})();

document.addEventListener('DOMContentLoaded', () => Chapter2.init());
