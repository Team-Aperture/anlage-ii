/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 06 — DUNKELKAMMER
 * Guest character: ASP-1024 — the silent legend who solved
 *   Kalibrierungsanlage I first, before anyone. Barely speaks; writes
 *   only four short sentences. A master of hiding codes inside pictures.
 *
 * Scene flow:
 *   6.0 Title card
 *   6.1 Arrival — the darkroom
 *   6.2 Encounter with ASP-1024 (terse)
 *   6.3 Choice 1: first questions (3 to see)
 *   6.4 Exploration (his logbook hides Signalnische sig_04)
 *   6.5 BILDFORENSIK — one deep steganography puzzle: a code is hidden
 *       in one colour channel of a noisy image. Isolate R/G/B, invert,
 *       and tune a threshold to surface it — past a decoy in another
 *       channel — then read & enter it.
 *   6.6 Ending → Sektor 07 freigegeben
 *
 * Difficulty target: ~8.25 (resist the decoy + precise threshold reading)
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter6 = (() => {
  'use strict';

  const S = {
    choice1Seen: { who:false, what:false, hide:false },
    hotspots: { plate:0, shelf:0, log:0, r3mi:0, vtgm:0, asp:0 },
    sigFound: false,
    solved: false,
    hints: { r3mi:1, vtgm:1, asp:2, active:null },
  };

  // ─── SCENE HELPERS ────────────────────────────────────────────
  function setScene(key, imgSrc) {
    const ph  = document.getElementById('scenePh');
    const img = document.getElementById('sceneBg');
    if (ph)  ph.dataset.scene = key;
    if (img && imgSrc) { img.src = imgSrc; img.style.display = ''; }
  }
  function clearHotspots() { document.getElementById('sceneHotspots').innerHTML = ''; }
  function addHotspot(cfg) {
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
  function showRobots(v) { document.getElementById('robotIcons').classList.toggle('hidden', !v); }
  function showAsp(v)    { document.getElementById('aspIcon').classList.toggle('hidden', !v); }
  function setProgress(pct){ const el = document.getElementById('reactProgress'); if (el) el.textContent = `REAKTIVIERUNG: ${pct}%`; }
  function playSound(src){ try { const a = new Audio(`audio/${src}`); a.play(); } catch(_) {} }

  // ─── CHOICE SYSTEM ────────────────────────────────────────────
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
        c.seen = true; hideChoices();
        if (c.fn) { c.fn(); return; }
        GameEngine.dialogue.load(c.lines, () => { if (cfg.onAfterChoice) cfg.onAfterChoice(c.key, cfg); });
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

  function withModalDialogue(lines, after) {
    const modal = document.getElementById('stegModal');
    const wasOpen = modal && !modal.classList.contains('hidden');
    if (wasOpen) modal.classList.add('hidden');
    GameEngine.dialogue.load(lines, () => {
      if (wasOpen) modal.classList.remove('hidden');
      if (after) after();
    });
  }

  // ─── SCENE 6.0 — TITLE CARD ───────────────────────────────────
  function showTitleCard() {
    const card = document.getElementById('titleCard');
    setTimeout(() => {
      card.classList.add('fading');
      setTimeout(() => { card.style.display = 'none'; scene_6_1_arrival(); }, 700);
    }, 3000);
  }

  // ─── SCENE 6.1 — ARRIVAL ──────────────────────────────────────
  function scene_6_1_arrival() {
    setScene('dark-dim', 'cg/ch6_darkroom.png');
    clearHotspots();
    showRobots(true);
    showAsp(false);
    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'SEKTOR 06 — DUNKELKAMMER. Reihen von Bildschirmen, alle dunkel. An Leinen hängen alte Aufnahmen, lichtdicht verhängt. Es riecht nach Chemie und Geduld.' },
      { speaker:'R-3MI',  text:'„Oh. Hier wohnt der Stille."' },
      { speaker:'V-TGM',  text:'"ASP-1024. He solved the first facility before anyone. Then he stopped talking."', subtitle:'ASP-1024. Er hat die erste Anlage vor allen gelöst. Dann hörte er auf zu reden.' },
      { speaker:'R-3MI',  text:'„Nicht ganz. Vier Sätze. Immer nur vier. Mehr kriegt man nicht."' },
      { speaker:'SYSTEM', text:'Im Halbdunkel sitzt eine Gestalt vollkommen reglos vor einem schwarzen Schirm. Sie hat euch längst bemerkt.' },
    ], () => scene_6_2_asp());
  }

  // ─── SCENE 6.2 — ASP-1024 APPEARS ─────────────────────────────
  function scene_6_2_asp() {
    setScene('dark-lit', 'cg/ch6_asp.png');
    playSound('ch6_asp.mp3');
    GameEngine.dialogue.load([
      { speaker:'ASP-1024', text:'„Du bist spät. Ich war zuerst. Immer. Setz dich."' },
      { speaker:'R-3MI',  text:'„Das waren schon seine Begrüßung UND sein Lebenslauf."' },
      { speaker:'V-TGM',  text:'"He means it warmly. I think."', subtitle:'Er meint es herzlich. Glaube ich.' },
      { speaker:'ASP-1024', text:'„Ein Bild. Ein Code. Versteckt. Find ihn."' },
      { speaker:'R-3MI',  text:'„Vier Sätze, ein ganzes Rätsel. Effizient. Beunruhigend."' },
    ], () => scene_6_3_choice1());
  }

  // ─── SCENE 6.3 — CHOICE 1 ─────────────────────────────────────
  const C1 = {
    who: {
      key:'who', label:'[Wer bist du?]', seen:false,
      lines:[
        { speaker:'ASP-1024', text:'„ASP. Tausendvierundzwanzig. Erster in Anlage Eins. Das reicht."' },
        { speaker:'R-3MI',  text:'„»Erster in Anlage Eins«. Er sagt das, wie andere ihren Namen sagen."' },
        { speaker:'V-TGM',  text:'"Before this place, there was another. He was its first solver. The only one who finished."', subtitle:'Vor diesem Ort gab es einen anderen. Er war sein erster Löser. Der einzige, der es zu Ende brachte.' },
        { speaker:'ASP-1024', text:'„Danach wurde es still. Ich blieb. Ich höre. Ich warte."' },
      ],
    },
    what: {
      key:'what', label:'[Was machst du hier?]', seen:false,
      lines:[
        { speaker:'ASP-1024', text:'„Ich verstecke. In Bildern. Codes, Worte, Wahrheiten. Niemand findet sie."' },
        { speaker:'R-3MI',  text:'„Er hat einmal eine ganze Karte in einem Foto von einer Wand versteckt. Wir haben sie nie gefunden."' },
        { speaker:'V-TGM',  text:'"A picture has three layers of light. Most people only see one."', subtitle:'Ein Bild hat drei Lichtschichten. Die meisten sehen nur eine.' },
        { speaker:'ASP-1024', text:'„Rot. Grün. Blau. Eine lügt. Eine flüstert."' },
      ],
    },
    hide: {
      key:'hide', label:'[Warum versteckst du alles?]', seen:false,
      lines:[
        { speaker:'ASP-1024', text:'„Was offen liegt, geht verloren. Was versteckt ist, bleibt. Frag die Anlage."' },
        { speaker:'V-TGM',  text:'"He hides things so they survive being forgotten."', subtitle:'Er versteckt Dinge, damit sie das Vergessen überleben.' },
        { speaker:'R-3MI',  text:'„Das ist… eigentlich traurig schön."' },
        { speaker:'ASP-1024', text:'„Es ist nur praktisch. Sag das nicht weiter."' },
      ],
    },
  };

  function scene_6_3_choice1() {
    showAsp(true);
    const choices = Object.values(C1);
    showChoices({
      prompt: 'ERSTE FRAGEN — ALLE AUSWÄHLEN:',
      hint: choices.filter(c => !c.seen).length + ' AUSSTEHEND',
      choices,
      onAfterChoice: (key, cfg) => {
        S.choice1Seen[key] = true;
        if (allSeen(choices)) setTimeout(() => scene_6_4_explore(), 400);
        else { cfg.hint = `NOCH ${choices.filter(c => !c.seen).length} AUSSTEHEND`; showChoices(cfg); }
      },
    });
  }

  // ─── SCENE 6.4 — EXPLORATION ──────────────────────────────────
  function scene_6_4_explore() {
    GameEngine.dialogue.load([
      { speaker:'ASP-1024', text:'„Schau dich um. Oder nicht. Das Bild wartet. Ich auch."' },
      { speaker:'SYSTEM', text:'SEKTOR 06 — EIN VERSCHLUSS AKTIV: BILDFORENSIK.' },
    ], () => loadExploreHotspots());
  }

  function loadExploreHotspots() {
    clearHotspots();
    addHotspot({ x:48, y:46, w:13, h:16, cls:'hs-asp', label:'BELICHTETE PLATTE', fn:() => clickExplore('plate') });
    addHotspot({ x:16, y:42, w:8,  h:18, label:'BILDARCHIV',  fn:() => clickExplore('shelf') });
    addHotspot({ x:82, y:62, w:7,  h:10, label:'ASPS LOGBUCH', fn:() => clickExplore('log') });
  }

  function clickExplore(key) {
    S.hotspots[key]++;

    if (key === 'log') {
      if (!S.sigFound) {
        S.sigFound = true;
        GameEngine.dialogue.load([
          { speaker:'SYSTEM', text:'ASPs Logbuch. Eine einzige Seite, vier kurze Zeilen in winziger Schrift. Die letzte Zeile ist tiefer eingedrückt als die anderen — wie eine Frequenz.' },
          { speaker:'ASP-1024', text:'„Vier Sätze. Mehr braucht keiner. Lies den letzten."' },
        ], () => {
          try { GameEngine.signals.find('sig_04'); } catch(_) {}
          GameEngine.dialogue.load([
            { speaker:'V-TGM', text:'"…they are listening. both. from the start."', subtitle:'…sie hören zu. beide. seit anfang an.' },
            { speaker:'ASP-1024', text:'„Ich weiß. Ich höre sie auch. Schon lange."' },
          ]);
        });
      } else {
        GameEngine.dialogue.load([{ speaker:'ASP-1024', text:'„Vier Zeilen. Eine Wahrheit. Den Rest behalte ich."' }]);
      }
      return;
    }

    if (key === 'shelf') {
      GameEngine.dialogue.load([
        { speaker:'SYSTEM', text:'Ein Archiv voller Bilder. Auf den ersten Blick harmlos: Wände, Gänge, Türen. In jedem einzelnen, ahnst du, steckt etwas, das nur ASP sieht.' },
        { speaker:'R-3MI',  text:'„In wie vielen davon sind Codes versteckt?"' },
        { speaker:'ASP-1024', text:'„In allen. Auch in denen, die du nicht siehst. Besonders in denen."' },
      ]);
      return;
    }

    if (key === 'plate') {
      if (!S.solved) {
        GameEngine.dialogue.load([
          { speaker:'SYSTEM', text:'Eine einzelne belichtete Platte unter Glas. Sie zeigt nur körniges Rauschen — graues Flimmern, scheinbar bedeutungslos.' },
          { speaker:'ASP-1024', text:'„Da ist ein Code. Vier Zeichen. Eine Farbe trägt ihn. Find ihn."' },
        ], () => openSteg());
      } else {
        GameEngine.dialogue.load([{ speaker:'ASP-1024', text:'„Du hast ihn gesehen. Gut. Wenige tun das."' }]);
      }
      return;
    }
  }

  function clickRobot(who) {
    S.hotspots[who]++;
    const n = S.hotspots[who];
    const byWho = {
      r3mi: [
        [{ speaker:'R-3MI', text:'„Ich rede mit ihm seit Jahren. Er hat mir 36 Sätze geschenkt. Ich zähle sie."' }],
        [{ speaker:'R-3MI', text:'„Die laute Farbe ist immer die Falle. Bei ihm ist nichts laut, was wichtig ist."' }],
      ],
      vtgm: [
        [{ speaker:'V-TGM', text:'"Isolate each channel. The truth hides in the quiet one."', subtitle:'Isoliere jeden Kanal. Die Wahrheit versteckt sich im leisen.' }],
        [{ speaker:'V-TGM', text:'"Raise the threshold until noise dies and only the shape remains."', subtitle:'Erhöhe die Schwelle, bis das Rauschen stirbt und nur die Form bleibt.' }],
      ],
      asp: [
        [{ speaker:'ASP-1024', text:'„Drei Farben. Eine schreit. Ignorier sie."' }],
        [{ speaker:'ASP-1024', text:'„Blau ist leise. Heb die Schwelle. Dann lies."' }],
      ],
    };
    const arr = byWho[who] || [];
    const line = arr[Math.min(n - 1, arr.length - 1)];
    if (line) GameEngine.dialogue.load(line);
  }

  // ═══════════════════════════════════════════════════════════════
  // BILDFORENSIK — steganography: a code hidden in one colour channel
  // ═══════════════════════════════════════════════════════════════
  /*
   * Real code: blue channel, small +18 delta over ±6 noise → invisible in
   *   the colour composite; clean only when you isolate Blue and raise the
   *   threshold into ~135–146 (text=146 ≥ T > noise≤134). Math-guaranteed.
   * Decoy code: green channel, loud +45 delta over ±10 noise → obvious on
   *   Green isolate. It is the trap.
   * Red channel: pure noise. Composite: grainy static.
   */
  const STEG_W = 280, STEG_H = 110;
  const CODE_CHARS = 'ACEFHJKLNPRTXY3479';
  const N_RED = 10, N_GREEN = 10, N_BLUE = 6;
  const DELTA_FAKE = 45, DELTA_REAL = 18;

  let ST = null; // { channel, invert, threshold, R,G,B, codeReal, codeFake }

  function rnd(a){ return Math.round((Math.random()*2 - 1) * a); }
  function randCode(avoid){
    let c;
    do { c = Array.from({length:4}, () => CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)]).join(''); }
    while (c === avoid);
    return c;
  }

  function textMask(text) {
    const c = document.createElement('canvas'); c.width = STEG_W; c.height = STEG_H;
    const x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, STEG_W, STEG_H);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `bold ${Math.floor(STEG_H * 0.52)}px "Share Tech Mono", monospace`;
    x.fillText(text, STEG_W/2, STEG_H/2 + 2);
    const d = x.getImageData(0, 0, STEG_W, STEG_H).data;
    const mask = new Uint8Array(STEG_W * STEG_H);
    for (let i = 0; i < mask.length; i++) mask[i] = d[i*4] > 128 ? 1 : 0;
    return mask;
  }

  function buildImage() {
    const n = STEG_W * STEG_H;
    ST.codeReal = randCode();
    ST.codeFake = randCode(ST.codeReal);
    const real = textMask(ST.codeReal);
    const fake = textMask(ST.codeFake);
    ST.R = new Uint8ClampedArray(n);
    ST.G = new Uint8ClampedArray(n);
    ST.B = new Uint8ClampedArray(n);
    for (let i = 0; i < n; i++) {
      ST.R[i] = 128 + rnd(N_RED);
      ST.G[i] = 128 + rnd(N_GREEN) + (fake[i] ? DELTA_FAKE : 0);
      ST.B[i] = 128 + rnd(N_BLUE)  + (real[i] ? DELTA_REAL : 0);
    }
  }

  function drawCanvas() {
    const cv = document.getElementById('stegCanvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const n = STEG_W * STEG_H;
    const img = ctx.createImageData(STEG_W, STEG_H);
    const d = img.data;
    const t = ST.threshold;
    for (let i = 0; i < n; i++) {
      let r, g, b;
      if (ST.channel === 'rgb') {
        r = ST.R[i]; g = ST.G[i]; b = ST.B[i];
        if (ST.invert) { r = 255-r; g = 255-g; b = 255-b; }
        if (t > 0) { const lum = (r+g+b)/3; const v = lum >= t ? 255 : 0; r = g = b = v; }
      } else {
        let val = ST.channel === 'r' ? ST.R[i] : ST.channel === 'g' ? ST.G[i] : ST.B[i];
        if (ST.invert) val = 255 - val;
        if (t > 0) val = val >= t ? 255 : 0;
        r = g = b = val;
      }
      const p = i*4; d[p] = r; d[p+1] = g; d[p+2] = b; d[p+3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  function openSteg() {
    ST = { channel:'rgb', invert:false, threshold:0, R:null, G:null, B:null, codeReal:'', codeFake:'' };
    buildImage();
    S.hints.active = 'steg';
    S.hints.r3mi = 1; S.hints.vtgm = 1; S.hints.asp = 2;
    updateHintBar();
    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'BILDFORENSIK // KANAL ISOLIEREN · INVERTIEREN · SCHWELLE.' },
      { speaker:'ASP-1024', text:'„Eine Farbe lügt laut. Eine flüstert wahr. Hör auf die leise. Tipp die vier Zeichen."' },
    ], () => {
      document.getElementById('stegModal').classList.remove('hidden');
      document.getElementById('hintBar').classList.remove('hidden');
      const inp = document.getElementById('stegInput'); if (inp) inp.value = '';
      syncStegUI();
      drawCanvas();
      setStegStatus('Drei Kanäle. Eine Schwelle. Eine Wahrheit.', '');
    });
  }

  function syncStegUI() {
    document.querySelectorAll('#stegChannels .steg-ch').forEach(b =>
      b.classList.toggle('active', b.dataset.ch === ST.channel));
    const inv = document.getElementById('stegInvertBtn');
    if (inv) inv.classList.toggle('active', ST.invert);
    const sl = document.getElementById('stegThreshold');
    if (sl) sl.value = ST.threshold;
    const lbl = document.getElementById('stegThreshLabel');
    if (lbl) lbl.textContent = ST.threshold === 0 ? 'AUS' : ST.threshold;
  }

  function stegChannel(c) { if (!ST) return; ST.channel = c; syncStegUI(); drawCanvas(); }
  function stegInvert()   { if (!ST) return; ST.invert = !ST.invert; syncStegUI(); drawCanvas(); }
  function stegThreshold(v){ if (!ST) return; ST.threshold = parseInt(v, 10) || 0; syncStegUI(); drawCanvas(); }
  function stegReset() {
    if (!ST) return;
    ST.channel = 'rgb'; ST.invert = false; ST.threshold = 0;
    syncStegUI(); drawCanvas(); setStegStatus('Ansicht zurückgesetzt.', '');
  }

  function stegSubmit() {
    if (!ST || S.solved) return;
    const raw = (document.getElementById('stegInput').value || '').trim().toUpperCase();
    if (raw.length < 4) { setStegStatus('Vier Zeichen. Nicht weniger.', 'warn'); return; }
    if (raw === ST.codeReal) {
      S.solved = true;
      setStegStatus('CODE BESTÄTIGT.', 'ok');
      playSound('ch6_ok.mp3');
      setTimeout(() => solveSteg(), 900);
    } else if (raw === ST.codeFake) {
      setStegStatus('Das war der laute. Der falsche. Hör genauer hin.', 'error');
    } else {
      setStegStatus('Nein. Das Bild lügt nicht. Du liest nur falsch.', 'error');
    }
  }

  function setStegStatus(text, type) {
    const el = document.getElementById('stegStatus');
    el.textContent = text; el.className = 'puzzle-status sys-text' + (type ? ' ' + type : '');
  }

  function solveSteg() {
    document.getElementById('stegModal').classList.add('hidden');
    document.getElementById('hintBar').classList.add('hidden');
    setProgress(64);
    GameEngine.dialogue.load([
      { speaker:'SYSTEM', text:'VERBORGENER CODE EXTRAHIERT. DUNKELKAMMER ENTRIEGELT.' },
      { speaker:'ASP-1024', text:'„Du hast es gesehen. Das Leise. Wenige können das. Gut."' },
      { speaker:'R-3MI',  text:'„Das waren VIER Sätze des Lobes. Ich glaube, das ist ein Rekord."' },
      { speaker:'V-TGM',  text:'"He just gave you something he gives almost no one."', subtitle:'Er hat dir gerade etwas gegeben, das er fast niemandem gibt.' },
      { speaker:'ASP-1024', text:'„Geh weiter. Sektor sieben. Pass auf. Sie hören zu."' },
      { speaker:'V-TGM',  text:'"Sektor 07 is open."', subtitle:'Sektor 07 ist offen.' },
    ], () => endChapter());
  }

  function endChapter() {
    GameEngine.state.markChapterComplete('ch6');
    try { GameEngine.achievements.unlock('ch6_complete'); } catch(_) {}
    document.getElementById('chapterComplete').classList.remove('hidden');
    document.getElementById('ccProgress').textContent =
      `FORTSCHRITT: ${GameEngine.state.get('chaptersCompleted').length} / 9 KAPITEL`;
  }

  // ─── HINT SYSTEM ──────────────────────────────────────────────
  const HINTS = {
    steg: {
      r3mi: ['„Geh die Kanäle einzeln durch: Rot, Grün, Blau. Einer zeigt sofort etwas — trau dem nicht zu schnell."'],
      vtgm: [{ text:'"The loud channel is bait. Isolate Blue, then raise the threshold until only the letters survive."',
               sub:'Der laute Kanal ist Köder. Isoliere Blau, dann heb die Schwelle, bis nur die Buchstaben übrig bleiben.' }],
      asp: [
        '„Grün schreit. Lüge. Blau flüstert."',
        '„Blau. Schwelle hoch. Lies die vier."',
      ],
    },
  };

  function useHint(who) {
    const remaining = S.hints[who];
    if (remaining <= 0) {
      withModalDialogue([{
        speaker: who === 'r3mi' ? 'R-3MI' : who === 'vtgm' ? 'V-TGM' : 'ASP-1024',
        text: who === 'r3mi' ? '„Mehr habe ich nicht. Aber du bist nah dran."'
            : who === 'vtgm' ? '"That is all I have."'
            : '„Genug. Der Rest ist deiner."',
        subtitle: who === 'vtgm' ? 'Mehr habe ich nicht.' : undefined,
      }]);
      return;
    }
    const bank  = HINTS.steg;
    const total = (who === 'asp') ? 2 : 1;
    const idx   = Math.min(total - remaining, (bank[who] ? bank[who].length : 1) - 1);
    S.hints[who]--;
    updateHintBar();
    const entry = bank[who] ? bank[who][idx] : null;
    if (!entry) return;
    const line = (typeof entry === 'string')
      ? { speaker: who === 'r3mi' ? 'R-3MI' : 'ASP-1024', text: entry }
      : { speaker: 'V-TGM', text: entry.text, subtitle: entry.sub };
    withModalDialogue([line]);
  }

  function updateHintBar() {
    const total = S.hints.r3mi + S.hints.vtgm + S.hints.asp;
    document.getElementById('hintCount').textContent = `HINWEISE: ${total} VERFÜGBAR`;
    document.getElementById('hintBtnR3MI').disabled = S.hints.r3mi <= 0;
    document.getElementById('hintBtnVTGM').disabled = S.hints.vtgm <= 0;
    document.getElementById('hintBtnAsp').disabled  = S.hints.asp  <= 0;
  }

  // ─── PUBLIC API ───────────────────────────────────────────────
  return {
    init() { showTitleCard(); },
    clickRobot,
    useHint,
    stegChannel,
    stegInvert,
    stegThreshold,
    stegReset,
    stegSubmit,
  };

})();

document.addEventListener('DOMContentLoaded', () => Chapter6.init());
