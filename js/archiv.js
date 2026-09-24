/**
 * ═══════════════════════════════════════════════════════════════
 * KALIBRIERUNGSANLAGE II — ARCHIVABGLEICH (title screen, optional)
 *
 * The archive still holds the shutdown code from the first Anlage. A returning
 * Part-I test subject can present it here — eight faint slots next to the
 * version tag — and the facility, against all its protocols, throws a party.
 *
 * ZERO GAMEPLAY EFFECT, by design: it awards one secret achievement that is
 * not part of the 100 % and changes nothing else — no chapter, hint, signal,
 * fragment, coordinate or story line depends on it. Wrong codes are harmless
 * and can be tried as often as anyone likes.
 *
 * The code is compared as a salted SHA-256 digest, so it is not sitting in the
 * source for a casual search. (Eight digits are trivially brute-forced by
 * anyone who wants to; that would only earn them confetti.)
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const AUTH_SALT   = 'anlage-ii';
  const AUTH_DIGEST = 'ed4150f8e41420733f0ce94cedd036679df11f811cf849a8f86401bd781644b1';
  const ACH = 'ka1_veteran';

  // ─── digest ────────────────────────────────────────────────
  async function digestOf(code) {
    const msg = `KA-II|AUTH|${code}|${AUTH_SALT}`;
    const subtle = (window.crypto && (window.crypto.subtle || window.crypto.webkitSubtle)) || null;
    if (subtle && window.TextEncoder) {
      try {
        const buf = await subtle.digest('SHA-256', new TextEncoder().encode(msg));
        return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (_) { /* fall through */ }
    }
    return sha256(msg);
  }

  // Small SHA-256 for browsers without Web Crypto (or a non-secure context).
  // A player on an old device must not be locked out of the game.
  function sha256(ascii) {
    const K = [];
    const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    (function primes() {
      let n = 2;
      for (let i = 0; i < 64;) {
        let prime = true;
        for (let f = 2; f * f <= n; f++) if (n % f === 0) { prime = false; break; }
        if (prime) { K[i] = (Math.pow(n, 1 / 3) % 1 * 0x100000000) | 0; i++; }
        n++;
      }
    })();
    const bytes = [];
    for (let i = 0; i < ascii.length; i++) {
      const cp = ascii.codePointAt(i);
      if (cp < 0x80) bytes.push(cp);
      else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
      else { bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)); }
    }
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push((bitLen / Math.pow(2, i * 8)) & 0xff);

    const rr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let b = 0; b < bytes.length; b += 64) {
      const w = new Array(64);
      for (let i = 0; i < 16; i++) {
        w[i] = (bytes[b+i*4] << 24) | (bytes[b+i*4+1] << 16) | (bytes[b+i*4+2] << 8) | bytes[b+i*4+3];
      }
      for (let i = 16; i < 64; i++) {
        const s0 = rr(w[i-15], 7) ^ rr(w[i-15], 18) ^ (w[i-15] >>> 3);
        const s1 = rr(w[i-2], 17) ^ rr(w[i-2], 19) ^ (w[i-2] >>> 10);
        w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
      }
      let [a, bb, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
        const S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22);
        const maj = (a & bb) ^ (a & c) ^ (bb & c);
        const t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0;
        d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      [a, bb, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) | 0; });
    }
    return H.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
  }

  // ─── helpers ───────────────────────────────────────────────
  const reduced = (() => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } })();
  const E = () => (typeof GameEngine !== 'undefined' ? GameEngine : null);
  const tone = o => { try { E().audio.tone(o); } catch (_) {} };
  const veteran = () => { try { return E().achievements.isUnlocked(ACH); } catch (_) { return false; } };
  // Before Chapter 1 the title never names the crew (they have not been met).
  const metRobots = () => { try { return (E().state.get('chaptersCompleted') || []).includes('ch1'); } catch (_) { return false; } };

  let panel = null, slot = null, digits = [], statusEl = null, busy = false, wrongs = 0;

  // ─── the eight faint slots ─────────────────────────────────
  function buildSlot() {
    const tag = document.querySelector('.version-tag');
    if (!tag) return;
    slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'archiv-slot' + (veteran() ? ' known' : '');
    slot.id = 'archivSlot';
    slot.setAttribute('aria-label', 'Archivabgleich (optional, für ehemalige Testsubjekte)');
    slot.title = 'ARCHIVABGLEICH';
    slot.textContent = '▫▫▫▫·▫▫▫▫';
    slot.addEventListener('click', open);
    tag.appendChild(slot);
  }

  function buildPanel() {
    panel = document.createElement('div');
    panel.className = 'overlay-panel hidden';
    panel.id = 'archivOverlay';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Archivabgleich');
    const box = i => `<input type="text" class="archiv-digit" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off" aria-label="Stelle ${i + 1}">`;
    panel.innerHTML = `
      <div class="overlay-card archiv-card">
        <h2 class="overlay-title">ARCHIVABGLEICH</h2>
        <p class="overlay-subtitle sys-text">OPTIONAL // FÜR EHEMALIGE TESTSUBJEKTE</p>
        <div class="overlay-content archiv-content">
          <p class="archiv-text">Im Archiv liegt ein Abschaltcode, zu dem nie jemand zurückgekommen ist.
            Wer die erste Anlage bis zum Ende durchgestanden hat, kennt ihn.</p>
          <p class="archiv-small sys-text">FÜR DEN SPIELVERLAUF OHNE BEDEUTUNG. FÜR DIE ANLAGE: NICHT.</p>
          <div class="archiv-row" role="group" aria-label="Achtstelliger Abschaltcode aus Teil I">
            ${[0, 1, 2, 3].map(box).join('')}<span class="archiv-divider" aria-hidden="true">·</span>${[4, 5, 6, 7].map(box).join('')}
          </div>
          <p class="archiv-status sys-text" id="archivStatus" aria-live="polite">BEREIT.</p>
        </div>
        <div class="archiv-actions">
          <button class="ka-btn primary" id="archivCheck">[ ABGLEICHEN ]</button>
          <button class="ka-btn" id="archivClose">[ SCHLIESSEN ]</button>
        </div>
      </div>`;
    document.body.appendChild(panel);
    digits = [...panel.querySelectorAll('.archiv-digit')];
    statusEl = panel.querySelector('#archivStatus');
    panel.querySelector('#archivCheck').addEventListener('click', check);
    panel.querySelector('#archivClose').addEventListener('click', close);
    panel.addEventListener('click', ev => { if (ev.target === panel) close(); });
    wireDigits();
  }

  function open() {
    if (!panel) buildPanel();
    if (busy || layer) return;
    digits.forEach(d => { d.value = ''; d.classList.remove('wrong', 'correct'); d.readOnly = false; });
    setStatus('BEREIT.', '');
    panel.classList.remove('hidden');
    document.getElementById('overlayBackdrop')?.classList.remove('hidden');
    setTimeout(() => { try { digits[0].focus(); } catch (_) {} }, 60);
  }
  function close() {
    try { E().closeOverlay(); } catch (_) { panel?.classList.add('hidden'); }
    try { slot?.focus(); } catch (_) {}
  }

  function setStatus(text, cls) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = 'archiv-status sys-text' + (cls ? ' ' + cls : '');
  }

  function wireDigits() {
    digits.forEach((input, i) => {
      input.addEventListener('keydown', e => {
        // virtual keyboards report "Unidentified"/229 and deliver the digit via input
        if (e.isComposing || e.keyCode === 229 || e.key === 'Unidentified' || e.key === 'Process') return;
        if (!/^\d$/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape'].includes(e.key) && !e.ctrlKey && !e.metaKey) { e.preventDefault(); return; }
        if (e.key === 'Enter') { e.preventDefault(); check(); return; }
        if (e.key === 'Backspace' && !input.value && i > 0) digits[i - 1].focus();
        if (e.key === 'ArrowLeft' && i > 0) digits[i - 1].focus();
        if (e.key === 'ArrowRight' && i < digits.length - 1) digits[i + 1].focus();
      });
      input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '').slice(0, 1);
        if (!busy) { digits.forEach(d => d.classList.remove('wrong')); setStatus('BEREIT.', ''); }
        if (input.value && i < digits.length - 1) digits[i + 1].focus();
        if (code().length === digits.length) check();
      });
      input.addEventListener('paste', e => {
        e.preventDefault();
        const pasted = ((e.clipboardData || window.clipboardData).getData('text') || '').replace(/\D/g, '');
        if (!pasted) return;
        digits.forEach((d, k) => { d.value = pasted[k] || ''; });
        digits[Math.min(pasted.length, digits.length - 1)].focus();
        if (pasted.length >= digits.length) check();
      });
    });
  }
  const code = () => digits.map(d => d.value).join('');

  // ─── the check ─────────────────────────────────────────────
  async function check() {
    if (busy) return;
    const c = code();
    if (c.length < digits.length) { setStatus('ACHT STELLEN, BITTE. DIE ANLAGE ZÄHLT MIT.', 'error'); return; }
    busy = true;
    setStatus('ABGLEICH LÄUFT…', 'wait');
    let hash = '';
    try { hash = await digestOf(c); } catch (_) { hash = ''; }
    if (hash === AUTH_DIGEST) match(); else miss(c);
  }

  // Wrong codes cost nothing and are never stored. The facility is only
  // mildly sarcastic about them.
  const MISSES = [
    'KEIN TREFFER. DIE ANLAGE IST NICHT BELEIDIGT.',
    'KEIN TREFFER. AUCH DAS NICHT.',
    'KEIN TREFFER. DIE MÜHE WURDE TROTZDEM PROTOKOLLIERT.',
    'KEIN TREFFER. DAS ARCHIV BLÄTTERT WEITER. LANGSAM.',
  ];
  function miss(c) {
    let msg = MISSES[wrongs++ % MISSES.length];
    if (/^(\d)\1{7}$/.test(c)) msg = 'ACHT MAL DIESELBE ZIFFER. MUTIG. ABER NEIN.';
    else if (c === '12345678' || c === '87654321') msg = 'DAS WAR AUCH IN TEIL I NICHT DER CODE.';
    digits.forEach(d => d.classList.add('wrong'));
    setStatus(msg, 'error');
    tone({ freq: 220, type: 'triangle', dur: 0.12, vol: 0.08, glideTo: 180 });
    setTimeout(() => {
      busy = false;
      digits.forEach(d => { d.classList.remove('wrong'); d.value = ''; });
      try { digits[0].focus(); } catch (_) {}
    }, 1400);
  }

  function match() {
    digits.forEach(d => { d.classList.add('correct'); d.readOnly = true; });
    setStatus('TREFFER.', 'success');
    tone({ freq: 880, type: 'sine', dur: 0.12, vol: 0.12 });
    const first = !veteran();
    setTimeout(() => { close(); busy = false; party(first); }, reduced ? 200 : 650);
  }

  // ─── the party ─────────────────────────────────────────────
  let layer = null;
  function party(first) {
    if (layer) return;
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, reduced ? Math.min(ms, 150) : ms));
    const sysStatus = document.getElementById('sysStatus');
    const oldStatus = sysStatus ? [sysStatus.textContent, sysStatus.className] : null;

    layer = document.createElement('div');
    layer.className = 'vet-party';
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-label', 'Archivabgleich: Treffer');
    layer.innerHTML = `
      <div class="vet-confetti" aria-hidden="true"></div>
      <div class="vet-card">
        <p class="vet-label sys-text">ARCHIVABGLEICH // TREFFER</p>
        <h2 class="vet-title">${first ? 'TESTSUBJEKT WIEDERERKANNT' : 'TESTSUBJEKT SCHON WIEDER ERKANNT'}</h2>
        <div class="vet-rows" aria-live="polite"></div>
        <p class="vet-welcome" aria-live="polite"></p>
        <div class="vet-lines" aria-live="polite"></div>
        <button class="ka-btn primary vet-done">[ DANKE, ANLAGE ]</button>
      </div>`;
    document.body.appendChild(layer);
    if (!reduced) {
      document.body.classList.add('vet-shake');
      setTimeout(() => document.body.classList.remove('vet-shake'), 600);
    }
    if (sysStatus) { sysStatus.textContent = 'ABGLEICH'; sysStatus.className = 'blink vet-status-hot'; }
    requestAnimationFrame(() => layer && layer.classList.add('visible'));

    const rowsEl  = layer.querySelector('.vet-rows');
    const linesEl = layer.querySelector('.vet-lines');
    const done    = layer.querySelector('.vet-done');

    const ROWS = first ? [
      ['ABSCHALTCODE', 'ERKANNT'],
      ['HERKUNFT', 'KALIBRIERUNGSANLAGE I'],
      ['LETZTE VERWENDUNG', 'SYSTEMABSCHALTUNG'],
      ['PROGNOSE: RÜCKKEHR', '0,3 %'],
      ['TATSÄCHLICHE RÜCKKEHR', 'JA ?!'],
      ['ZUSTAND DER ANLAGE', 'VERDÄCHTIG BEEINDRUCKT'],
      ['KONFETTI-RESERVE', 'WIRD FREIGEGEBEN'],
    ] : [
      ['ABSCHALTCODE', 'ERKANNT'],
      ['TESTSUBJEKT', 'SCHON WIEDER DA'],
      ['KONFETTI-RESERVE', 'NACHBESTELLT · 7 %'],
      ['ZUSTAND DER ANLAGE', 'IMMER NOCH BEEINDRUCKT'],
    ];
    const LINES = first ? [
      ['SYSTEM', 'FANFARE SEIT 2.847 TAGEN NICHT GESPIELT. DER LETZTE TON WAR ABSICHT.'],
      ...(metRobots() ? [
        ['R-3MI', '„Moment. Die Anlage hat KONFETTI? Seit wann hat die Anlage Konfetti?"'],
        ['V-TGM', '"It always had confetti. It was saving it for someone."', 'Sie hatte schon immer Konfetti. Sie hat es für jemanden aufgehoben.'],
      ] : []),
      ['SYSTEM', 'HINWEIS: DIESE BEGRÜSSUNG VERSCHAFFT KEINERLEI VORTEIL. ALLE TESTSUBJEKTE WERDEN GLEICH BEHANDELT.'],
      ['SYSTEM', '(MANCHE HEIMLICH ETWAS GLEICHER.)'],
      ['SYSTEM', 'KONFETTI-RESERVE: 0 %. NACHBESTELLUNG BEANTRAGT.'],
    ] : [
      ['SYSTEM', 'DIE ANLAGE TUT SO, ALS WÄRE SIE ÜBERRASCHT.'],
      ['SYSTEM', '…SIE IST ES.'],
    ];

    const STEP = 520;
    ROWS.forEach(([k, v], i) => at(350 + i * STEP, () => {
      const row = document.createElement('div');
      row.className = 'vet-row';
      row.innerHTML = `<span class="vet-k sys-text">${k}</span><span class="vet-v sys-text">${v}</span>`;
      rowsEl.appendChild(row);
      requestAnimationFrame(() => row.classList.add('visible'));
      tone({ freq: 300 + i * 60, type: 'square', dur: 0.04, vol: 0.05 });
    }));

    const burstAt = 350 + ROWS.length * STEP + 250;
    at(burstAt, () => {
      if (!layer) return;
      layer.querySelector('.vet-welcome').textContent = 'WILLKOMMEN ZURÜCK.';
      layer.classList.add('burst');
      if (sysStatus) { sysStatus.textContent = first ? 'BEGEISTERT' : 'SCHON WIEDER BEGEISTERT'; sysStatus.className = 'blink vet-status-joy'; }
      confetti(first ? 150 : 60);
      fanfare(first);
      // The one thing it awards: a secret achievement, not part of the 100 %.
      try { E().achievements.unlock(ACH); } catch (_) {}
      slot?.classList.add('known');
    });

    LINES.forEach(([who, text, sub], i) => at(burstAt + 1300 + i * 1500, () => {
      if (!layer) return;
      const l = document.createElement('p');
      l.className = 'vet-line';
      l.dataset.who = who;
      l.innerHTML = `<span class="vet-who sys-text">${who}</span> <span class="vet-text"></span>${sub ? '<span class="vet-sub"></span>' : ''}`;
      l.querySelector('.vet-text').textContent = text;
      if (sub) l.querySelector('.vet-sub').textContent = sub;
      linesEl.appendChild(l);
      requestAnimationFrame(() => l.classList.add('visible'));
      try { l.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' }); } catch (_) {}
      try { E().audio.blip(who); } catch (_) {}
    }));

    // The show can be left at any moment; the achievement is kept either way.
    function end() {
      timers.forEach(clearTimeout);
      try { E().achievements.unlock(ACH); } catch (_) {}
      slot?.classList.add('known');
      if (sysStatus && oldStatus) { sysStatus.textContent = oldStatus[0]; sysStatus.className = oldStatus[1]; }
      document.removeEventListener('keydown', onKey);
      const l = layer; layer = null;
      if (!l) return;
      l.classList.remove('visible');
      setTimeout(() => l.remove(), 400);
      try { slot?.focus(); } catch (_) {}
    }
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); end(); } }
    done.addEventListener('click', end);
    document.addEventListener('keydown', onKey);
    setTimeout(() => { try { done.focus({ preventScroll: true }); } catch (_) {} }, 80);
  }

  const BITS = ['●', '▲', '■', '⬡', '◈', '✓', '✦', '◉'];
  const HUES = ['var(--accent-r3mi)', 'var(--accent-vtgm)', 'var(--accent-system)', 'var(--accent-warn)', '#ffffff'];
  function confetti(n) {
    const host = layer && layer.querySelector('.vet-confetti');
    if (!host) return;
    if (reduced) n = Math.min(n, 24);   // a still sprinkle instead of a storm
    for (let i = 0; i < n; i++) {
      const b = document.createElement('span');
      b.className = 'vet-bit';
      b.textContent = BITS[i % BITS.length];
      b.style.left = (Math.random() * 100).toFixed(1) + '%';
      b.style.color = HUES[Math.floor(Math.random() * HUES.length)];
      b.style.fontSize = (10 + Math.random() * 14).toFixed(0) + 'px';
      b.style.setProperty('--dx', ((Math.random() * 2 - 1) * 120).toFixed(0) + 'px');
      b.style.setProperty('--rot', ((Math.random() * 2 - 1) * 720).toFixed(0) + 'deg');
      b.style.animationDuration = (2.6 + Math.random() * 2.4).toFixed(2) + 's';
      b.style.animationDelay = (Math.random() * 0.9).toFixed(2) + 's';
      if (reduced) b.style.top = (Math.random() * 90).toFixed(1) + '%';
      host.appendChild(b);
    }
  }

  // A proper fanfare, out of practice: the last note is deliberately sour.
  function fanfare(first) {
    [523, 659, 784, 1047, 1318].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.16, vol: 0.16, delay: i * 0.12 }));
    [523, 659, 784, 1047].forEach(f => tone({ freq: f, type: 'triangle', dur: 1.0, vol: 0.10, delay: 0.7 }));
    if (first) tone({ freq: 1244, type: 'sawtooth', dur: 0.35, vol: 0.06, delay: 1.75, glideTo: 1150 });
  }

  document.addEventListener('DOMContentLoaded', buildSlot);
})();
