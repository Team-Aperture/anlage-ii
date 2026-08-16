/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 02 — WARTUNGSGARTEN
 * Guest character: F-RØ5CHI
 *
 * Scene flow:
 *   2.0 Title card
 *   2.1 Frozen entrance — wide view
 *   2.2 Encounter with F-RØ5CHI
 *   2.3 Choice 1: First questions (3 to see)
 *   2.4 Garden exploration phase 1 (5 hotspots, leads to Puzzle 1)
 *   2.5 Puzzle 1 — Tau-Sequenz (3 plants, temp + pressure + order)
 *   2.6 Garden exploration phase 2 (garden thaws)
 *   2.7 Puzzle 2 — Frostmuster (Layton-style 5×5 region partition)
 *   2.8 Ending + Eissplitter keepsake
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter2 = (() => {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const S = {
    choice1Seen: { what:false, why:false, visitors:false },
    hotspots: { plants:0, valves:0, tafel:0, ice:0, brunnen:0, vent:0, froschi:0, r3mi:0, vtgm:0 },
    p1Solved: false,
    p2Solved: false,
    bayernPMOFound: false,
    hints: { r3mi:1, vtgm:1, froschi:2, active:null }, // 4 total: more help in ch2 since it's harder
    thawState: 0, // 0 = frozen, 1 = partial, 2 = full
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
    layer.classList.remove('thaw-1','thaw-2','thaw-3');
    if (level >= 1) layer.classList.add(level === 1 ? 'thaw-1' : level === 2 ? 'thaw-2' : 'thaw-3');
  }

  function clearHotspots() {
    document.getElementById('sceneHotspots').innerHTML = '';
  }

  function addHotspot(cfg) {
    if (cfg.prop && window.GameEngine && GameEngine.props) {
      const p = GameEngine.props.el(cfg.prop, { x:cfg.x, y:cfg.y, w:cfg.w, h:cfg.h, label:cfg.label, onClick:cfg.fn, cls:cfg.cls, anim:cfg.anim });
      document.getElementById('sceneHotspots').appendChild(p);
      return p;
    }
    const el = document.createElement('button');
    el.className = 'hotspot' + (cfg.cls ? ' ' + cfg.cls : '');
    el.setAttribute('aria-label', cfg.label || 'Interagieren');
    el.style.cssText = `left:${cfg.x}%;top:${cfg.y}%;width:${cfg.w||7}%;height:${cfg.h||7}%;`;
    if (cfg.label) {
      const lbl = document.createElement('span');
      lbl.className = 'hotspot-label'; lbl.textContent = cfg.label; el.appendChild(lbl);
    }
    el.addEventListener('click', cfg.fn);
    document.getElementById('sceneHotspots').appendChild(el);
    return el;
  }
  function addProp(cfg) {
    if (!(window.GameEngine && GameEngine.props)) return;
    document.getElementById('sceneHotspots').appendChild(
      GameEngine.props.el(cfg.prop, { x:cfg.x, y:cfg.y, w:cfg.w, h:cfg.h, cls:cfg.cls, anim:cfg.anim }));
  }

  function showRobots(v) {
    document.getElementById('robotIcons').classList.toggle('hidden', !v);
  }

  function showFroschi(v) {
    document.getElementById('froschiIcon').classList.toggle('hidden', !v);
  }

  function setProgress(pct) {
    const el = document.getElementById('reactProgress');
    if (el) el.textContent = `REAKTIVIERUNG: ${pct}%`;
  }

  function playSound(src) { try { GameEngine.audio.sfx(src); } catch(_) {} }

  // ═══════════════════════════════════════════════════════════════
  // CHOICE SYSTEM
  // ═══════════════════════════════════════════════════════════════
  function showChoices(cfg) {
    const overlay = document.getElementById('choiceOverlay');
    const btns    = document.getElementById('choiceButtons');
    const prompt  = document.getElementById('choicePrompt');
    const hint    = document.getElementById('choiceHint');

    prompt.textContent = cfg.prompt || 'WÄHLE EINE ANTWORT:';
    hint.textContent   = cfg.hint   || '';
    btns.innerHTML     = '';

    cfg.choices.forEach(c => {
      const btn = document.createElement('button');
      btn.className   = 'choice-btn' + (c.seen ? ' seen' : '');
      btn.textContent = c.label;
      btn.addEventListener('click', () => {
        c.seen = true;
        btn.classList.add('seen');
        hideChoices();
        if (c.fn) {
          c.fn();
        } else {
          GameEngine.dialogue.load(c.lines, () => {
            if (cfg.onAfterChoice) cfg.onAfterChoice(c.key, cfg);
          });
        }
      });
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

  function allSeen(choices) { return choices.every(c => c.seen); }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 2.0 — TITLE CARD
  // ═══════════════════════════════════════════════════════════════
  function showTitleCard() {
    const card = document.getElementById('titleCard');
    setTimeout(() => {
      card.classList.add('fading');
      setTimeout(() => {
        card.style.display = 'none';
        scene_2_1_arrival();
      }, 700);
    }, 3000);
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 2.1 — ARRIVAL
  // ═══════════════════════════════════════════════════════════════
  function scene_2_1_arrival() {
    setScene('frozen-wide', 'cg/ch2_garden_frozen.png');
    setFrostLevel(0);
    clearHotspots();
    showRobots(true);
    showFroschi(false);

    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'Der Garten ist… kalt.' },
      { speaker:'SYSTEM', text:'Wo Kapitel 1 trocken und alt war, ist dieser Sektor feucht und alt — und vor allem: gefroren.' },
      { speaker:'SYSTEM', text:'Tropfen sind in der Luft erstarrt. Pflanzen halten in Bewegungen inne, die sie vor Wochen begonnen haben.' },
      { speaker:'R-3MI',  text:'„Das ist neu."' },
      { speaker:'V-TGM',  text:'"This was not frozen the last time we checked."', subtitle:'Das war beim letzten Mal nicht gefroren.' },
      { speaker:'R-3MI',  text:'„Wann war das letzte Mal?"' },
      { speaker:'V-TGM',  text:'"I do not remember."', subtitle:'Ich erinnere mich nicht.' },
      { speaker:'R-3MI',  text:'„Das ist die schlimmste Antwort."' },
      { speaker:'SYSTEM', text:'Aus der Ferne: ein leises Knistern von Eis, das sich bewegt, ohne zu schmelzen. Etwas in der Mitte des Gartens glitzert wie eine gefrorene Tafel.' },
    ], () => scene_2_2_froschi());
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 2.2 — F-RØ5CHI APPEARS
  // ═══════════════════════════════════════════════════════════════
  function scene_2_2_froschi() {
    setScene('frozen-pavilion', 'cg/ch2_pavilion_frozen.png');

    GameEngine.dialogue.load([
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
      showFroschi(true);
      scene_2_3_request();
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 2.3 — THE REQUEST
  // ═══════════════════════════════════════════════════════════════
  function scene_2_3_request() {
    GameEngine.dialogue.load([
      { speaker:'F-RØ5CHI', text:'„So! Jetzd hob i di richtig im Aug. Du bist die neue Testperson, gell?"', subtitle:'So! Jetzt hab ich dich richtig im Auge. Du bist die neue Testperson, gell?' },
      { speaker:'F-RØ5CHI', text:'„Schee, dass d\' do bist. R-3MI und V-TGM hom ma nie g\'sagt, dass jemand kummt!"', subtitle:'Schön, dass du da bist. R-3MI und V-TGM haben mir nie gesagt, dass jemand kommt!' },
      { speaker:'R-3MI',    text:'„Wir wussten es selbst nicht."' },
      { speaker:'V-TGM',    text:'"That is technically true."', subtitle:'Das stimmt technisch.' },
      { speaker:'F-RØ5CHI', text:'„Naja, woaß i ned. Aber jetzd is\'s eh wuascht. Schau, mei Garten…"', subtitle:'Naja, weiß ich nicht. Aber jetzt ist es egal. Schau, mein Garten…' },
      { speaker:'F-RØ5CHI', text:'„…hod offnsichdlich in Arsch g\'frorn."', subtitle:'…hat offensichtlich den Arsch eingefroren.' },
      { speaker:'R-3MI',    text:'„F-RØ5CHI!"' },
      { speaker:'F-RØ5CHI', text:'„Wos? Es is wahr."', subtitle:'Was? Es ist wahr.' },
      { speaker:'V-TGM',    text:'"She is correct."', subtitle:'Sie hat recht.' },
    ], () => scene_2_4_choice1());
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 2.4 — CHOICE 1
  // ═══════════════════════════════════════════════════════════════
  const C1 = {
    what: {
      key:'what', label:'[Was machst du hier?]', seen:false,
      lines:[
        { speaker:'F-RØ5CHI', text:'„I bin de Gartenwartung, freili! Der Garten braucht oan, der ihm zuhört."', subtitle:'Ich bin die Gartenwartung, freilich! Der Garten braucht jemanden, der ihm zuhört.' },
        { speaker:'R-3MI',    text:'„Sie meint das wörtlich."' },
        { speaker:'F-RØ5CHI', text:'„Pflanzen sand wia Leid. Mancher braucht Wasser, mancher braucht Sonn\', und mancher braucht oan, der amoi sogt: »Schee, dass d\' do bist.«"', subtitle:'Pflanzen sind wie Leute. Mancher braucht Wasser, mancher braucht Sonne, und mancher braucht jemanden, der mal sagt: »Schön, dass du da bist.«' },
        { speaker:'V-TGM',    text:'"That is a lot of feelings for a maintenance unit."', subtitle:'Das sind viele Gefühle für eine Wartungseinheit.' },
        { speaker:'F-RØ5CHI', text:'„Schau, V-TGM. Du bist a feins Madl, aber kalt wia a Spülbeckn."', subtitle:'Schau, V-TGM. Du bist ein feines Mädchen, aber kalt wie ein Spülbecken.' },
        { speaker:'V-TGM',    text:'"Thank you."', subtitle:'Danke.' },
      ],
    },
    why: {
      key:'why', label:'[Warum ist alles eingefroren?]', seen:false,
      lines:[
        { speaker:'F-RØ5CHI', text:'„Naja, irgendwann hod\'s anfanga z\' tropfen — und dann hod\'s net aufg\'hört. Und dann is\'s kälter wordn. Und dann no kälter."', subtitle:'Naja, irgendwann hat\'s angefangen zu tropfen — und dann hat\'s nicht aufgehört. Und dann ist\'s kälter geworden. Und dann noch kälter.' },
        { speaker:'F-RØ5CHI', text:'„I bin do g\'sessn und hob g\'wart, dass irgendwer kummt und\'s repariert."', subtitle:'Ich bin da gesessen und hab gewartet, dass jemand kommt und\'s repariert.' },
        { speaker:'F-RØ5CHI', text:'„I hob lang g\'wart."', subtitle:'Ich hab lange gewartet.' },
        { speaker:'R-3MI',    text:'„Wie lange?"' },
        { speaker:'F-RØ5CHI', text:'„Ja… des kann i grod ned sogn."', subtitle:'Ja… das kann ich gerade nicht sagen.' },
        { speaker:'V-TGM',    text:'"Suspicious."', subtitle:'Verdächtig.' },
      ],
    },
    visitors: {
      key:'visitors', label:'[Hast du andere Besucher gehabt?]', seen:false,
      lines:[
        { speaker:'F-RØ5CHI', text:'„Mei Familie kummt manchmoi vorbei. Aber ned oft genug, freili."', subtitle:'Meine Familie kommt manchmal vorbei. Aber nicht oft genug, freilich.' },
        { speaker:'F-RØ5CHI', text:'„Mei Mo, der baut a Rätsl gern. Sehr gern. Manchmoi z\' gern, des sog i eahm aa."', subtitle:'Mein Mann, der baut ein Rätsel gern. Sehr gern. Manchmal zu gern, das sag ich ihm auch.' },
        { speaker:'R-3MI',    text:'„Klingt anstrengend."' },
        { speaker:'F-RØ5CHI', text:'„Liab! Anstrengend liab. Des is wos andas."', subtitle:'Lieb! Anstrengend lieb. Das ist was anderes.' },
        { speaker:'F-RØ5CHI', text:'„Er hod vor Joahrn a poar Sachan do g\'lassn. Du wirsd\'s eh sehng."', subtitle:'Er hat vor Jahren ein paar Sachen dagelassen. Du wirst\'s eh sehen.' },
      ],
    },
  };

  function scene_2_4_choice1() {
    const choices = Object.values(C1);
    showChoices({
      prompt: 'ERSTE FRAGEN — ALLE AUSWÄHLEN:',
      hint: choices.filter(c => !c.seen).length + ' AUSSTEHEND',
      choices,
      onAfterChoice: (key, cfg) => {
        S.choice1Seen[key] = true;
        if (allSeen(choices)) {
          setTimeout(() => scene_2_5_garden(), 400);
        } else {
          cfg.hint = `NOCH ${choices.filter(c => !c.seen).length} AUSSTEHEND`;
          showChoices(cfg);
        }
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 2.5 — GARDEN EXPLORATION (frozen)
  // ═══════════════════════════════════════════════════════════════
  function scene_2_5_garden() {
    setScene('frozen-wide', 'cg/ch2_garden_frozen.png');
    setFrostLevel(0);
    clearHotspots();

    GameEngine.dialogue.load([
      { speaker:'F-RØ5CHI', text:'„Magst ma helfen, mei Liaba? Wenn ma\'s auftauen, kann i da meine Pflanzerl zeign. Sie freun sich."', subtitle:'Magst mir helfen, mein Lieber? Wenn wir\'s auftauen, kann ich dir meine Pflänzchen zeigen. Sie freuen sich.' },
      { speaker:'R-3MI',    text:'„Sie ist sehr… nett."' },
      { speaker:'V-TGM',    text:'"Yes."', subtitle:'Ja.' },
      { speaker:'R-3MI',    text:'„Zu nett?"' },
      { speaker:'V-TGM',    text:'"I am observing."', subtitle:'Ich beobachte.' },
      { speaker:'SYSTEM',   text:'SEKTOR 02 — WARTUNGSGARTEN. ZUSTAND: VEREIST. EMPFOHLENE MASSNAHME: TAU-SEQUENZ + FROSTMUSTER-ENTSIEGELUNG.' },
    ], () => loadGardenHotspots());
  }

  function loadGardenHotspots() {
    clearHotspots();
    // ── set dressing: a frozen glass-roofed garden, overgrown and iced over
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
    // ── interactive — every one a visible object
    addHotspot({ prop:'crate',     x:40, y:64, w:16, h:18, label:'PFLANZBECKEN', fn:() => clickGarden('plants') });
    addHotspot({ prop:'pipe',      x:5,  y:46, w:8,  h:40, label:'WASSERORGEL',  fn:() => clickGarden('valves') });
    addHotspot({ prop:'sign', cls:'prop-guest', x:14, y:52, w:14, h:12, label:'EISVERPACKTE TAFEL', fn:() => clickGarden('tafel') });
    addHotspot({ prop:'vent',      x:84, y:72, w:12, h:12, label:'WARTUNGSSCHACHT', fn:() => clickGarden('vent') });
    addHotspot({ prop:'sculpture', x:74, y:40, w:12, h:30, label:'EIS-SKULPTUR', fn:() => clickGarden('ice') });
    addHotspot({ prop:'fountain',  x:60, y:70, w:11, h:14, label:'EISBRUNNEN',   fn:() => clickGarden('brunnen') });
  }

  function clickGarden(key) {
    S.hotspots[key]++;
    const n = S.hotspots[key];

    const lines = {
      plants: {
        1: [
          { speaker:'SYSTEM',   text:'Drei mechanische Pflanzen, eingefroren in verschiedenen Wachstumsphasen.' },
          { speaker:'F-RØ5CHI', text:'„De do is mei Lieblings. Heißt Gerhilde. Die anderen zwoa hom kane Nam\', die mögen des ned."', subtitle:'Die da ist mein Liebling. Heißt Gerhilde. Die anderen zwei haben keine Namen, die mögen das nicht.' },
          { speaker:'R-3MI',    text:'„Pflanzen haben Meinungen?"' },
          { speaker:'F-RØ5CHI', text:'„Olle hom Meinungen. Manche sand bloß höflicher."', subtitle:'Alle haben Meinungen. Manche sind bloß höflicher.' },
        ],
      },
      valves: {
        1: [
          { speaker:'SYSTEM',   text:'Ein komplexes Ventilsystem — Heißwasser, Kaltwasser, Druckregulator.' },
          { speaker:'F-RØ5CHI', text:'„Des is mei Wasserorgel. Daugst es ned, des is komplizierter ois wia\'s ausschaut."', subtitle:'Das ist meine Wasserorgel. Trau\'s dir nicht zu, das ist komplizierter als es ausschaut.' },
        ],
        2: [
          { speaker:'V-TGM', text:'"It is locked until the plants need it."', subtitle:'Es ist gesperrt, bis die Pflanzen es brauchen.' },
        ],
      },
      tafel: {
        1: [
          { speaker:'SYSTEM',   text:'Eine kleine Holztafel, eingefroren in eine Eissäule. Die Schrift darauf ist unscharf.' },
          { speaker:'F-RØ5CHI', text:'„Ah, des is no aus an andern Garten von mir. Hob\'s ois Andenken behoiden."', subtitle:'Ah, das ist noch aus einem anderen Garten von mir. Hab\'s als Andenken behalten.' },
          { speaker:'SYSTEM',   text:'Die Schrift ist auf Bayerisch. Du verstehst etwa die Hälfte.' },
          { speaker:'F-RØ5CHI', text:'„Genau! Des is\'s ganze G\'heimnis."', subtitle:'Genau! Das ist das ganze Geheimnis.' },
        ],
      },
      ice: {
        1: [
          { speaker:'SYSTEM',   text:'Ein eingefrorener Wasserstrahl in der Form einer Skulptur.' },
          { speaker:'F-RØ5CHI', text:'„Des hod si vo söiba g\'macht. Hob i nix dazua dou."', subtitle:'Das hat sich von selbst gemacht. Hab ich nichts dazu getan.' },
          { speaker:'V-TGM',    text:'"That is concerning."', subtitle:'Das ist beunruhigend.' },
        ],
      },
      brunnen: {
        1: [
          { speaker:'SYSTEM',   text:'In der Mitte des Gartens steht ein kleiner Brunnen, vollständig zugefroren. Darum herum: eine quadratische Eis-Tafel mit feinen Rillen, fünf mal fünf Felder.' },
          { speaker:'F-RØ5CHI', text:'„Ah, des is\'s Eis-Rätsl von mei\'m Mo. Er hod\'s eingschnitzt, bevor da Garten g\'froren is."', subtitle:'Ah, das ist das Eis-Rätsel von meinem Mann. Er hat\'s eingeschnitzt, bevor der Garten gefroren ist.' },
          { speaker:'R-3MI',    text:'„Ein Rätsel? In einer Tafel?"' },
          { speaker:'F-RØ5CHI', text:'„Er hod g\'sagt, ma muass\'s Eis richtig aufteiln. Aber zerst muass da Garten auftaut sei."', subtitle:'Er hat gesagt, man muss das Eis richtig aufteilen. Aber zuerst muss der Garten aufgetaut sein.' },
        ],
      },
      vent: {
        1: [
          { speaker:'SYSTEM', text:'Ein kleiner Wartungsschacht. Vereist. Etwas blinkt dahinter — sehr schwach.' },
          { speaker:'F-RØ5CHI', text:'„Hob i no nia g\'sehn."', subtitle:'Hab ich noch nie gesehen.' },
          { speaker:'R-3MI',    text:'„Komisch. Wir sollten da nicht reinkommen."' },
          { speaker:'V-TGM',    text:'"We *should* not, or we *cannot*?"', subtitle:'Wir *sollten* nicht, oder wir *können* nicht?' },
          { speaker:'R-3MI',    text:'„Beides! Beides ist gut! Weiter!"' },
        ],
      },
    };

    if (key === 'tafel' && n === 1 && !S.bayernPMOFound) {
      S.bayernPMOFound = true;
      // Easter egg achievement (will gracefully skip if not registered)
      setTimeout(() => {
        try { GameEngine.achievements.unlock('bayern_pmo'); } catch(_) {}
      }, 800);
    }

    const bucket = lines[key];
    if (!bucket) return;
    const line = bucket[Math.min(n, Math.max(...Object.keys(bucket).map(Number)))];
    if (!line) return;

    if (key === 'plants' && n === 1 && !S.p1Solved) {
      GameEngine.dialogue.load(line, () => openPuzzle1());
    } else {
      GameEngine.dialogue.load(line);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ROBOT ICON CLICKS
  // ═══════════════════════════════════════════════════════════════
  function clickRobot(who) {
    S.hotspots[who]++;
    const n = S.hotspots[who];

    const linesByWho = {
      r3mi: [
        [{ speaker:'R-3MI', text:'„Ich finde diesen Garten zu pink. Und zu kalt. Und zu pink-und-kalt."' }],
        [
          { speaker:'R-3MI', text:'„F-RØ5CHI ist sehr nett. Das macht mich nervös."' },
          { speaker:'V-TGM', text:'"Why?"', subtitle:'Warum?' },
          { speaker:'R-3MI', text:'„Weil Nettigkeit vergleichbar ist."' },
        ],
        [{ speaker:'R-3MI', text:'„Wenn sie mir noch einmal den Kopf tätschelt, schalte ich mich ab."' }],
      ],
      vtgm: [
        [{ speaker:'V-TGM', text:'"She is functional. But she has been alone too long."', subtitle:'Sie ist funktionsfähig. Aber sie war zu lange allein.' }],
        [{ speaker:'V-TGM', text:'"Note: she does not ask why we abandoned her."', subtitle:'Notiz: sie fragt nicht, warum wir sie zurückgelassen haben.' }],
        [{ speaker:'V-TGM', text:'"That is either kindness or memory loss."', subtitle:'Das ist entweder Freundlichkeit oder Gedächtnisverlust.' }],
      ],
      froschi: [
        [
          { speaker:'F-RØ5CHI', text:'„Brauchst wos, mei Liaba?"', subtitle:'Brauchst was, mein Lieber?' },
          { speaker:'F-RØ5CHI', text:'„I bin do, falls\'s ned auf andere Roboter passiert."', subtitle:'Ich bin da, falls\'s nicht auf andere Roboter passiert.' },
        ],
        [
          { speaker:'F-RØ5CHI', text:'„Wennst Hunger kriagst, sog Bescheid. I find scho wos."', subtitle:'Wenn du Hunger kriegst, sag Bescheid. Ich find schon was.' },
          { speaker:'R-3MI',    text:'„Was würdest du finden? Alles ist eingefroren."' },
          { speaker:'F-RØ5CHI', text:'„Naja, dann fier i hoid was auf, freili."', subtitle:'Naja, dann tau ich halt was auf, freilich.' },
        ],
        [
          { speaker:'F-RØ5CHI', text:'„Du host scheene Augn, mei Liaba."', subtitle:'Du hast schöne Augen, mein Lieber.' },
          { speaker:'V-TGM',    text:'"They have not been calibrated."', subtitle:'Sie sind nicht kalibriert.' },
          { speaker:'F-RØ5CHI', text:'„Doch! Vo da Natur!"', subtitle:'Doch! Von der Natur!' },
        ],
      ],
    };

    const lines = linesByWho[who] || [];
    const line  = lines[Math.min(n - 1, lines.length - 1)];
    if (line) GameEngine.dialogue.load(line);
  }

  // ═══════════════════════════════════════════════════════════════
  // PUZZLE 1 — TAU-SEQUENZ
  // ═══════════════════════════════════════════════════════════════
  /*
   * 3 plants must be thawed in correct ORDER with correct TEMP and PRESSURE.
   *
   * Each plant has a different sweet-spot. The catch: the ambient
   * temperature shifts after each successful thaw, so the "right"
   * setting for plant 2 depends on what was used for plant 1.
   *
   * Solution (one valid path):
   *   1. Pflanze 02 first — temp 4, pressure 6 (cold-hardy, needs steady push)
   *      → ambient becomes "cool"
   *   2. Gerhilde — temp 5, pressure 5 (neutral, V-TGM's "stricter path")
   *      → ambient becomes "warm"
   *   3. Pflanze 03 last — temp 7, pressure 3 (heat-loving, gentle)
   *
   * Tolerances: ±1 on each value
   * Wrong order penalty: ambient resets, must restart
   * Wrong values: plant becomes "burnt" or "still frozen", reset that plant
   */

  // Plant ideal settings depend on current ambient.
  // [tempIdeal, pressIdeal] for each plant, given the ambient state when attempted
  // ambient: 0=very cold (start), 1=cool, 2=warm, 3=hot
  const PLANT_NAMES = ['GERHILDE', 'PFLANZE 02', 'PFLANZE 03'];

  // For each plant, the IDEAL temp/press AT a specific ambient level
  // Plants must be thawed in a specific order: plant 1, then 0, then 2
  // (PFLANZE 02 first, GERHILDE second, PFLANZE 03 third)
  const PLANT_RECIPE = {
    1: { ambient: 0, temp: 4, press: 6, name: 'PFLANZE 02', shifts: 1 },  // cold start, cold-hardy plant
    0: { ambient: 1, temp: 5, press: 5, name: 'GERHILDE',   shifts: 1 },  // cool ambient, neutral plant
    2: { ambient: 2, temp: 7, press: 3, name: 'PFLANZE 03', shifts: 1 },  // warm ambient, heat-loving
  };

  // Order plants must be thawed
  const PLANT_ORDER = [1, 0, 2];

  const TOLERANCE = 1;

  // Mutable state
  let p1State = {
    ambient: 0,           // 0 = sehr kalt
    selected: 0,
    temp: 3,
    press: 3,
    plants: [false, false, false],   // bloomed flag
    burnt:  [false, false, false],
    nextExpectedIdx: 0,              // index into PLANT_ORDER
  };

  function openPuzzle1() {
    p1State = {
      ambient: 0,
      selected: 0,
      temp: 3,
      press: 3,
      plants: [false, false, false],
      burnt:  [false, false, false],
      nextExpectedIdx: 0,
    };

    GameEngine.dialogue.load([
      { speaker:'F-RØ5CHI', text:'„So! Jetzd wer\'n ma\'s auftauen. Hob koa Angst, da Garten verzeiht vui — aber net olls."', subtitle:'So! Jetzt werden wir\'s auftauen. Hab keine Angst, der Garten verzeiht viel — aber nicht alles.' },
      { speaker:'R-3MI',    text:'„Das war eine fantastische Mischung aus beruhigend und bedrohlich."' },
      { speaker:'V-TGM',    text:'"Each plant has its own ideal. The ambient temperature changes after each thaw. Think in order."', subtitle:'Jede Pflanze hat ihr Ideal. Die Umgebungstemperatur ändert sich nach jedem Auftauen. Denk in Reihenfolge.' },
      { speaker:'F-RØ5CHI', text:'„Wennst was kaputt machst — ned schlimm. Wir hom Zeit."', subtitle:'Wenn du was kaputt machst — nicht schlimm. Wir haben Zeit.' },
    ], () => {
      document.getElementById('puzzle1Modal').classList.remove('hidden');
      S.hints.active = 'p1';
      document.getElementById('hintBar').classList.remove('hidden');
      updateHintBar();
      renderP1();
    });
  }

  function renderP1() {
    // Selected
    document.getElementById('thawSelected').textContent = PLANT_NAMES[p1State.selected];

    // Temp / press bars
    const tempPct  = (p1State.temp  / 10) * 100;
    const pressPct = (p1State.press / 10) * 100;
    document.getElementById('tempBar').style.width  = tempPct + '%';
    document.getElementById('pressBar').style.width = pressPct + '%';
    document.getElementById('tempLabel').textContent  = `${p1State.temp} / 10`;
    document.getElementById('pressLabel').textContent = `${p1State.press} / 10`;

    // Ambient
    const ambientPct  = (p1State.ambient / 3) * 100;
    document.getElementById('ambientFill').style.width = ambientPct + '%';
    document.getElementById('ambientMarker').style.left = ambientPct + '%';
    const ambLabels = ['SEHR KALT','KÜHL','WARM','HEISS'];
    document.getElementById('ambientLabel').textContent = ambLabels[p1State.ambient] || ambLabels[0];

    // Plants
    document.querySelectorAll('.thaw-plant').forEach((el, i) => {
      el.classList.toggle('selected', i === p1State.selected && !p1State.plants[i]);
      el.classList.toggle('bloomed',  p1State.plants[i]);
      el.classList.toggle('burnt',    p1State.burnt[i]);

      const stateEl  = el.querySelector('.plant-state');
      const statusEl = el.querySelector('.plant-status');

      if (p1State.plants[i]) {
        stateEl.textContent  = '🌸';
        statusEl.textContent = 'erblüht';
      } else if (p1State.burnt[i]) {
        stateEl.textContent  = '🔥';
        statusEl.textContent = 'verbrannt';
      } else {
        stateEl.textContent  = '❄';
        statusEl.textContent = 'eingefroren';
      }
    });
  }

  function thawSelect(dir) {
    if (S.p1Solved) return;
    let nextIdx = p1State.selected;
    for (let i = 0; i < 3; i++) {
      nextIdx = (nextIdx + dir + 3) % 3;
      if (!p1State.plants[nextIdx]) break; // can't select bloomed
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
    const idx = p1State.selected;

    // Already done?
    if (p1State.plants[idx]) {
      setP1Status('Diese Pflanze ist bereits erblüht.', 'warn');
      return;
    }

    // Reset burnt
    if (p1State.burnt[idx]) {
      p1State.burnt[idx] = false;
    }

    // Check if right plant in order
    const expectedPlantId = PLANT_ORDER[p1State.nextExpectedIdx];
    const recipe = PLANT_RECIPE[idx];

    // Temperature/pressure check
    const tempDiff  = Math.abs(p1State.temp  - recipe.temp);
    const pressDiff = Math.abs(p1State.press - recipe.press);

    // Way off → burnt
    if (p1State.temp >= recipe.temp + 3) {
      p1State.burnt[idx] = true;
      setP1Status(`${recipe.name} wurde verbrannt. Reduziere die Temperatur und versuche es erneut.`, 'error');
      renderP1();
      return;
    }

    // Way too cold → no thaw
    if (p1State.temp <= recipe.temp - 3) {
      setP1Status(`${recipe.name} bleibt gefroren. Mehr Wärme.`, 'warn');
      renderP1();
      return;
    }

    // Pressure way off
    if (pressDiff > 3) {
      setP1Status(`Druck ist falsch. ${recipe.name} reagiert nicht.`, 'warn');
      renderP1();
      return;
    }

    // Out of order: warn but allow (cosmetic — wrong order will fail tolerance)
    if (idx !== expectedPlantId) {
      // Each plant's recipe is keyed to the ambient state when it should be thawed.
      // If we're at the wrong ambient for this plant, tighten tolerance dramatically.
      if (p1State.ambient !== recipe.ambient) {
        setP1Status(`Die Umgebungstemperatur passt nicht zu ${recipe.name}. Erst andere Pflanzen.`, 'warn');
        renderP1();
        return;
      }
    }

    // Within tolerance → bloom
    if (tempDiff <= TOLERANCE && pressDiff <= TOLERANCE && p1State.ambient === recipe.ambient) {
      p1State.plants[idx] = true;
      p1State.ambient = Math.min(3, p1State.ambient + recipe.shifts);
      p1State.nextExpectedIdx++;
      setP1Status(`${recipe.name} erblüht! Umgebung erwärmt sich.`, 'ok');
      playSound('ch2_plant_bloom.mp3');

      // Auto-select next non-bloomed
      for (let i = 0; i < 3; i++) {
        if (!p1State.plants[i]) { p1State.selected = i; break; }
      }
      renderP1();

      // Check win
      if (p1State.plants.every(b => b)) {
        S.p1Solved = true;
        setTimeout(() => solvePuzzle1(), 900);
      }
      return;
    }

    setP1Status('Beinahe — passt nicht ganz. Probier andere Werte.', 'warn');
    renderP1();
  }

  function setP1Status(text, type) {
    const el = document.getElementById('puzzle1Status');
    el.textContent = text;
    el.className = 'puzzle-status sys-text' + (type ? ' ' + type : '');
  }

  function thawReset() {
    p1State = {
      ambient: 0,
      selected: 0,
      temp: 3,
      press: 3,
      plants: [false, false, false],
      burnt:  [false, false, false],
      nextExpectedIdx: 0,
    };
    setP1Status('Bereit.', '');
    renderP1();
  }

  function solvePuzzle1() {
    document.getElementById('puzzle1Modal').classList.add('hidden');
    document.getElementById('hintBar').classList.add('hidden');
    setFrostLevel(1);
    S.thawState = 1;

    GameEngine.dialogue.load([
      { speaker:'SYSTEM',   text:'PFLANZSEKTOREN AKTIV. UMGEBUNGSTEMPERATUR STEIGT.' },
      { speaker:'F-RØ5CHI', text:'„Mei Gerhilde lebt! Schau, sie nickt!"', subtitle:'Meine Gerhilde lebt! Schau, sie nickt!' },
      { speaker:'R-3MI',    text:'„Sie nickt wirklich."' },
      { speaker:'V-TGM',    text:'"That is botanically impossible."', subtitle:'Das ist botanisch unmöglich.' },
      { speaker:'F-RØ5CHI', text:'„Mei Pflanzn sand ned botanisch. Sie sand höflich."', subtitle:'Meine Pflanzen sind nicht botanisch. Sie sind höflich.' },
      { speaker:'F-RØ5CHI', text:'„Und jetzd… kummt no mei liabste Erinnerung. De oide Eis-Tafel von mei\'m Mo."', subtitle:'Und jetzt… kommt noch meine liebste Erinnerung. Die alte Eis-Tafel von meinem Mann.' },
      { speaker:'R-3MI',    text:'„Der zugefrorene Brunnen von vorhin?"' },
      { speaker:'F-RØ5CHI', text:'„Genau der. Er hod a Eis-Rätsl neig\'schnitzt. Ma muass\'s Feld richtig aufteiln — dann gibt da Garten sein letzten Sektor frei."', subtitle:'Genau der. Er hat ein Eis-Rätsel hineingeschnitzt. Man muss das Feld richtig aufteilen — dann gibt der Garten seinen letzten Sektor frei.' },
    ], () => openPuzzle2());
  }

  // ═══════════════════════════════════════════════════════════════
  // PUZZLE 2 — FROSTMUSTER (Layton-style region partition)  ~5.5/10
  // ═══════════════════════════════════════════════════════════════
  /*
   * 5×5 ice board. Centre cell (2,2) = the well (Brunnen).
   * Clicking an edge between two cells toggles an "Eiskanal" = a CUT
   * (the cells no longer connect across it). Click again removes it.
   *
   * Goal: isolate the well (its own region of size 1) AND carve the
   * remaining 24 cells into exactly SIX regions of exactly 4 cells.
   * (6×4 + 1 = 25.) Many layouts are valid — we validate the rule
   * only, never a specific solution.
   *
   * Edge ids:
   *   'h,r,c'  cut between (r,c) and (r,c+1)   c in 0..3
   *   'v,r,c'  cut between (r,c) and (r+1,c)   r in 0..3
   */

  const WELL          = '2,2';
  const FROST_PALETTE = 6; // number of pastel region colours
  const FROST_MAX_CUTS = 18; // exact minimum — only an optimal layout solves
  // Pre-frozen "given" walls the player cannot move. With the 18-cap these
  // pin the puzzle to exactly ONE valid completion — a real deduction puzzle.
  const FROST_FIXED = new Set(['h,0,1','h,0,3','h,1,1','v,1,0','v,1,1','v,2,1']);
  function isCut(edge) { return p2State.cuts.has(edge) || FROST_FIXED.has(edge); }

  let p2State = { cuts: new Set() };

  function openPuzzle2() {
    p2State = { cuts: new Set() };

    GameEngine.dialogue.load([
      { speaker:'SYSTEM',   text:'FROSTMUSTER-KALIBRIERUNG STARTEN?' },
      { speaker:'F-RØ5CHI', text:'„De Tafel is a Fünf-mal-Fünf-Feld. In da Mittn da Brunnen — den muassd freihoidn, ganz alloa."', subtitle:'Die Tafel ist ein Fünf-mal-Fünf-Feld. In der Mitte der Brunnen — den musst du freihalten, ganz allein.' },
      { speaker:'F-RØ5CHI', text:'„Drumherum schneidst sechs Bereiche, jeder genau vier Felder. Klick zwischn zwoa Felder, dann setzt a Eiskanal."', subtitle:'Drumherum schneidest du sechs Bereiche, jeder genau vier Felder. Klick zwischen zwei Felder, dann setzt du einen Eiskanal.' },
      { speaker:'F-RØ5CHI', text:'„Oba pass auf: so vui Eis hob i nimmer. Mehr ois achtzehn Kanäl mog de Tafel ned. Geh sparsam um."', subtitle:'Aber pass auf: so viel Eis hab ich nicht mehr. Mehr als achtzehn Kanäle mag die Tafel nicht. Geh sparsam damit um.' },
      { speaker:'R-3MI',    text:'„Eine Tafel mit Mengenbegrenzung. Passive Aggression in Eisform. Ich mag sie."' },
      { speaker:'F-RØ5CHI', text:'„Und schau: a poar Kanäl san scho ins Eis g\'frorn — de pinkn. De kannst ned wegmacha, du muassd drumrum denka."', subtitle:'Und schau: ein paar Kanäle sind schon ins Eis gefroren — die pinken. Die kannst du nicht entfernen, du musst drumherum denken.' },
      { speaker:'V-TGM',    text:'"With those fixed, exactly one solution remains. Find it."', subtitle:'Mit denen fest bleibt genau eine Lösung. Finde sie.' },
      { speaker:'R-3MI',    text:'„Sechs mal vier, plus ein Brunnen. Das sind… fünfundzwanzig. Schau, ich kann auch Mathe."' },
    ], () => {
      document.getElementById('puzzle2Modal').classList.remove('hidden');
      document.getElementById('hintBar').classList.remove('hidden');
      S.hints.active = 'p2';
      // Refresh hints for puzzle 2 (4 fresh)
      S.hints.r3mi    = 1;
      S.hints.vtgm    = 1;
      S.hints.froschi = 2;
      updateHintBar();
      buildFrostGrid();
      updateFrost();
    });
  }

  // ─── Connectivity + region detection ─────────────────────────
  function frostNeighbours(r, c) {
    const nb = [];
    if (c < 4 && !isCut(`h,${r},${c}`))     nb.push([r, c + 1]); // right
    if (c > 0 && !isCut(`h,${r},${c - 1}`)) nb.push([r, c - 1]); // left
    if (r < 4 && !isCut(`v,${r},${c}`))     nb.push([r + 1, c]); // down
    if (r > 0 && !isCut(`v,${r - 1},${c}`)) nb.push([r - 1, c]); // up
    return nb;
  }

  function frostComponents() {
    const seen = new Set();
    const comps = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const start = `${r},${c}`;
        if (seen.has(start)) continue;
        const comp = [];
        const q = [[r, c]];
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
    let regions4 = 0;
    let wellIsolated = false;
    comps.forEach(comp => {
      const isWell = comp.includes(WELL);
      if (isWell) wellIsolated = comp.length === 1;
      else if (comp.length === 4) regions4++;
    });
    const win = wellIsolated && regions4 === 6 && comps.length === 7;
    return { comps, regions4, wellIsolated, win };
  }

  // ─── Rendering (9×9 grid: cells + channel slots + corners) ───
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
          // vertical channel slot between (r,c)-(r,c+1) → 'h' cut
          const r = gr / 2, c = (gc - 1) / 2;
          grid.appendChild(makeChannel('frost-ch-v', `h,${r},${c}`));
        } else if (!evenR && evenC) {
          // horizontal channel slot between (r,c)-(r+1,c) → 'v' cut
          const r = (gr - 1) / 2, c = gc / 2;
          grid.appendChild(makeChannel('frost-ch-h', `v,${r},${c}`));
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
      btn.setAttribute('aria-label', 'Vorgegebener Eiskanal — fest, nicht veränderbar');
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

    // Assign a pastel colour to each exactly-4 region
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
      if (isWell) {
        if (wellIsolated) el.classList.add('isolated');
      } else if (cellColour[k] != null) {
        el.classList.add('region', 'region-' + cellColour[k]);
      }
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

  function solvePuzzle2() {
    document.getElementById('puzzle2Modal').classList.add('hidden');
    document.getElementById('hintBar').classList.add('hidden');
    setFrostLevel(3);
    S.thawState = 2;
    setScene('thawed-wide', 'cg/ch2_garden_thawed.png');
    setProgress(18);

    GameEngine.dialogue.load([
      { speaker:'SYSTEM',   text:'FROSTMUSTER GELÖST. EIS-TAFEL ENTSIEGELT. SEKTOR 02 STABILISIERT.' },
      { speaker:'F-RØ5CHI', text:'„Schau! De Tafel glänzt wieder. Mei Mo waar so stoiz."', subtitle:'Schau! Die Tafel glänzt wieder. Mein Mann wäre so stolz.' },
      { speaker:'SYSTEM',   text:'Entlang der geschnittenen Linien schmilzt das Eis. Wasserfälle fließen wieder. Pflanzen erblühen alle.' },
      { speaker:'F-RØ5CHI', text:'„Mei Garten! Schaut\'s eahm o, schee aufblüht!"', subtitle:'Mein Garten! Schaut ihn an, schön aufgeblüht!' },
      { speaker:'R-3MI',    text:'„Es ist… tatsächlich schön."' },
      { speaker:'V-TGM',    text:'"You sound surprised."', subtitle:'Du klingst überrascht.' },
      { speaker:'R-3MI',    text:'„Ich bin überrascht."' },
    ], () => scene_2_8_ending());
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE 2.8 — ENDING
  // ═══════════════════════════════════════════════════════════════
  function scene_2_8_ending() {
    GameEngine.dialogue.load([
      { speaker:'F-RØ5CHI', text:'„Wartet — i hob euch wos zum Mitnehma."', subtitle:'Wartet — ich hab euch was zum Mitnehmen.' },
      { speaker:'SYSTEM',   text:'Sie drückt dem Spieler einen kleinen, glänzenden Eissplitter in die Hand — ein Stück aus der Tafel ihres Mannes.' },
      { speaker:'F-RØ5CHI', text:'„Der schmilzt ned. Er erinnert si bloß ned dro, dass er soi."', subtitle:'Der schmilzt nicht. Er erinnert sich bloß nicht daran, dass er soll.' },
      { speaker:'R-3MI',    text:'„Warum gibst du uns einen Eissplitter?"' },
      { speaker:'F-RØ5CHI', text:'„Weil i kann."', subtitle:'Weil ich kann.' },
      { speaker:'V-TGM',    text:'"That is the best answer she has given."', subtitle:'Das ist die beste Antwort, die sie gegeben hat.' },
      { speaker:'F-RØ5CHI', text:'„Pfiat eich, ihr Drei. Kemmts wieder, gell?"', subtitle:'Tschüss, ihr drei. Kommts wieder, gell?' },
      { speaker:'SYSTEM',   text:'SEKTOR 03 — BEOBACHTUNGSSEKTOR — FREIGEGEBEN.' },
      { speaker:'R-3MI',    text:'„L-UX wird sich freuen."' },
      { speaker:'V-TGM',    text:'"If he holds still long enough for us to find him."', subtitle:'Wenn er lange genug stillhält, dass wir ihn finden.' },
      { speaker:'R-3MI',    text:'„Das ist auch ein Wenn."' },
    ], () => {
      GameEngine.state.markChapterComplete('ch2');
      try { GameEngine.audio.fanfare(); } catch(_) {}
      GameEngine.state.setFlag('has_eissplitter');
      try { GameEngine.achievements.unlock('ch2_complete'); } catch(_) {}

      document.getElementById('chapterComplete').classList.remove('hidden');
      document.getElementById('ccProgress').textContent =
        `FORTSCHRITT: ${GameEngine.state.get('chaptersCompleted').length} / 9 KAPITEL`;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // HINT SYSTEM
  // ═══════════════════════════════════════════════════════════════
  const HINTS = {
    p1: {
      r3mi: [
        '„Probier\'s mit der mittleren zuerst — Pflanze 02. Sie schaut am wenigsten beleidigt aus. Ich glaube, sie mag\'s gleichmäßig — also Druck etwas stärker als Hitze."',
      ],
      vtgm: [
        { text:'"Track the ambient temperature shift after each thaw. Each plant changes the room. Order matters: cold-hardy first, neutral second, heat-loving last."',
          sub:'Verfolge die Umgebungstemperatur nach jedem Auftauen. Jede Pflanze verändert den Raum. Reihenfolge zählt: kältebeständig zuerst, neutral als zweites, hitzeliebend zuletzt.' },
      ],
      froschi: [
        '„Gerhilde mog\'s mittel — net z\' hoaß, net z\' kalt. So circa 5/5 vermut i."',
        '„Pflanze 03 mog\'s warm und z\'art. Hoaß bedeutet ned vui Druck."',
      ],
      froschi_sub: [
        'Gerhilde mag\'s mittel — nicht zu heiß, nicht zu kalt. So circa 5/5 vermut ich.',
        'Pflanze 03 mag\'s warm und zart. Heiß bedeutet nicht viel Druck.',
      ],
    },
    p2: {
      r3mi: [
        '„Mathe-Pep-Talk: vierundzwanzig Felder, sechs Gruppen — das macht exakt vier pro Gruppe. Die Zahlen sind auf deiner Seite. Ich auch. Meistens."',
      ],
      vtgm: [
        { text:'"Isolate the well first — cut all four of its walls. Then divide the rest into fours."',
          sub:'Isoliere zuerst den Brunnen — schneide alle vier Wände. Dann teile den Rest in Vierer.' },
      ],
      froschi: [
        '„Mei Mo hod\'s amoi g\'sagt: \'Denk an Tetromino-Stückerl wia bei Tetris.\' Vier Felder, de zammhänga."',
        '„Fang in da Eckn o. De Eckn lassn da weniger Wahl — drum sand\'s leichter z\' schneidn."',
      ],
      froschi_sub: [
        'Mein Mann hat\'s mal gesagt: \'Denk an Tetromino-Stückchen wie bei Tetris.\' Vier Felder, die zusammenhängen.',
        'Fang in der Ecke an. Die Ecken lassen dir weniger Wahl — drum sind sie leichter zu schneiden.',
      ],
    },
  };

  function useHint(who) {
    const remaining = S.hints[who];
    if (remaining <= 0 || !S.hints.active) {
      const dontMore = {
        r3mi:    { speaker:'R-3MI',    text:'„Mehr darf ich nicht. System-Regeln. Ich hasse Regeln."' },
        vtgm:    { speaker:'V-TGM',    text:'"You have what you need."', subtitle:'Du hast, was du brauchst.' },
        froschi: { speaker:'F-RØ5CHI', text:'„Mehr derf i ned, des wär unfair. Aber du schaffst des."', subtitle:'Mehr darf ich nicht, das wär unfair. Aber du schaffst das.' },
      };
      GameEngine.dialogue.load([dontMore[who]]);
      return;
    }

    const puzzleKey = S.hints.active;
    const hintBank = HINTS[puzzleKey];
    if (!hintBank || !hintBank[who]) return;

    // Use specific hint by remaining count
    const total = (who === 'froschi') ? 2 : 1;
    const idx = total - remaining;

    S.hints[who]--;
    updateHintBar();

    let entry = hintBank[who][idx] || hintBank[who][0];
    if (typeof entry === 'string') {
      // R-3MI / Froschi text
      const speaker = who === 'r3mi' ? 'R-3MI' : 'F-RØ5CHI';
      const sub = who === 'froschi' ? hintBank.froschi_sub[idx] : undefined;
      GameEngine.dialogue.load([{ speaker, text: entry, subtitle: sub }]);
    } else {
      // V-TGM object
      GameEngine.dialogue.load([{
        speaker: 'V-TGM',
        text: entry.text,
        subtitle: entry.sub,
      }]);
    }
  }

  function updateHintBar() {
    const total = S.hints.r3mi + S.hints.vtgm + S.hints.froschi;
    document.getElementById('hintCount').textContent = `HINWEISE: ${total} VERFÜGBAR`;
    document.getElementById('hintBtnR3MI').disabled    = S.hints.r3mi    <= 0;
    document.getElementById('hintBtnVTGM').disabled    = S.hints.vtgm    <= 0;
    document.getElementById('hintBtnFroschi').disabled = S.hints.froschi <= 0;
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════
  return {
    init() { showTitleCard(); },
    clickRobot,
    useHint,
    // Puzzle 1
    thawSelect,
    thawTemp,
    thawPressure,
    thawApply,
    thawReset,
    // Puzzle 2
    frostReset,
  };

})();

document.addEventListener('DOMContentLoaded', () => Chapter2.init());
