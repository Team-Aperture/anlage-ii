/**
 * ═══════════════════════════════════════════════════════════════
 * KALIBRIERUNGSANLAGE II — ZUGRIFFSPRÜFUNG
 *
 * The eight digits the player carries over from the first Anlage are not a
 * password for this page — they are the shutdown authorisation the facility
 * still has on file. The page verifies them, shows what the archive knows
 * about them, and then lets the player decide to restart the place.
 *
 * The code is compared as a salted SHA-256 digest rather than a plain string,
 * so it is not sitting in the source for anyone who opens the file. This is
 * not security — eight digits are trivially brute-forced by anyone who wants
 * to — it only stops the answer falling out of a casual search.
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // ── Where to send someone who has not played the first Anlage. ──
  const KA1_GAME_URL    = 'https://team-aperture.github.io/kalibrierungsanlage/';
  const KA1_LISTING_URL = 'https://www.geocaching.com/geocache/GCBPAMN';

  const AUTH_SALT   = 'anlage-ii';
  const AUTH_DIGEST = 'ed4150f8e41420733f0ce94cedd036679df11f811cf849a8f86401bd781644b1';
  const VERIFIED_FLAG = 'ka1_verified';

  const digits    = Array.from(document.querySelectorAll('.code-digit'));
  const statusEl  = document.getElementById('accessStatus');
  const verifyBtn = document.getElementById('verifyBtn');
  const card      = document.querySelector('.access-card');
  const revealEl  = document.getElementById('accessReveal');
  const rowsEl    = document.getElementById('accessRows');
  const goBtn     = document.getElementById('accessGo');
  const listing   = document.getElementById('ka1Listing');
  const ka1Game   = document.getElementById('ka1Game');

  let busy = false;

  if (listing) listing.href = KA1_LISTING_URL;
  if (ka1Game) ka1Game.href = KA1_GAME_URL;

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

  // ─── already through this door ─────────────────────────────
  function checkAlreadyVerified() {
    if (GameEngine.state.hasFlag(VERIFIED_FLAG)) {
      setStatus('ZUGRIFF BEREITS BESTÄTIGT. WEITERLEITUNG…', 'success');
      card.classList.add('verified');
      setTimeout(() => { window.location.href = 'chapter0/chapter0.html'; }, 1200);
      return true;
    }
    return false;
  }

  // ─── digit boxes ───────────────────────────────────────────
  function initDigitNav() {
    digits.forEach((input, i) => {
      input.addEventListener('keydown', e => {
        if (!/^\d$/.test(e.key) &&
            !['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Enter'].includes(e.key) &&
            !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          return;
        }
        if (e.key === 'Enter') { verify(); return; }
        if (e.key === 'Backspace' && !input.value && i > 0) digits[i - 1].focus();
        if (e.key === 'ArrowLeft'  && i > 0) digits[i - 1].focus();
        if (e.key === 'ArrowRight' && i < digits.length - 1) digits[i + 1].focus();
      });

      input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '').slice(0, 1);
        clearErrors();
        if (input.value && i < digits.length - 1) digits[i + 1].focus();
        if (getCode().length === digits.length) verify();
      });

      input.addEventListener('paste', e => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        if (!pasted) return;
        digits.forEach((d, k) => { d.value = pasted[k] || ''; });
        clearErrors();
        digits[Math.min(pasted.length, digits.length - 1)].focus();
        if (pasted.length >= digits.length) verify();
      });
    });
  }

  function getCode() { return digits.map(d => d.value).join(''); }

  function setStatus(text, type) {
    statusEl.textContent = text;
    statusEl.className   = 'access-status sys-text' + (type ? ' ' + type : '');
  }
  function clearErrors() {
    if (busy) return;
    digits.forEach(d => d.classList.remove('wrong', 'correct'));
    setStatus('BEREIT.', '');
  }

  // ─── verify ────────────────────────────────────────────────
  async function verify() {
    if (busy) return;
    const code = getCode();
    if (code.length < digits.length) {
      setStatus('UNVOLLSTÄNDIGE EINGABE — 8 STELLEN ERFORDERLICH.', 'error');
      return;
    }
    busy = true;
    setStatus('PRÜFE…', 'wait');
    let hash = '';
    try { hash = await digestOf(code); } catch (_) { hash = ''; }
    if (hash === AUTH_DIGEST) { onSuccess(); } else { onFail(); }
  }

  // ─── what the archive knows about those eight digits ───────
  const REVEAL = [
    ['ABSCHALTCODE', 'ERKANNT'],
    ['LETZTE VERWENDUNG', 'SYSTEMABSCHALTUNG'],
    ['ARCHIVSTATUS', 'GÜLTIG'],
    ['EXTERNE TESTSIGNATUR', 'VERIFIZIERT'],
    ['REAKTIVIERUNGSPROTOKOLL', 'VERFÜGBAR'],
  ];

  function onSuccess() {
    digits.forEach(d => { d.classList.remove('wrong'); d.classList.add('correct'); });
    digits.forEach(d => { d.readOnly = true; });
    setStatus('', '');
    card.classList.add('verified');
    verifyBtn.disabled = true;
    verifyBtn.classList.add('hidden');

    GameEngine.state.setFlag(VERIFIED_FLAG);
    GameEngine.achievements.unlock('ka1_veteran');

    const fast = (() => {
      try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
    })();

    revealEl.classList.remove('hidden');
    rowsEl.innerHTML = '';
    REVEAL.forEach(([k, v], i) => {
      setTimeout(() => {
        const row = document.createElement('div');
        row.className = 'ar-row';
        row.innerHTML = `<span class="ar-k sys-text">${k}:</span><span class="ar-v sys-text">${v}</span>`;
        rowsEl.appendChild(row);
        requestAnimationFrame(() => row.classList.add('visible'));
        try { GameEngine.audio.tone({ f: 150 + i * 30, t: 0.05, type: 'sine', g: 0.04 }); } catch (_) {}
      }, fast ? 90 * i : 620 * i + 300);
    });
    setTimeout(() => {
      goBtn.classList.add('visible');
      goBtn.focus();
    }, fast ? 600 : 620 * REVEAL.length + 700);
  }

  function onFail() {
    digits.forEach(d => d.classList.add('wrong'));
    setStatus('VERIFIZIERUNG FEHLGESCHLAGEN — FALSCHER CODE.', 'error');
    setTimeout(() => {
      busy = false;
      digits.forEach(d => { d.classList.remove('wrong'); d.value = ''; });
      digits[0].focus();
      setStatus('BEREIT.', '');
    }, 1400);
  }

  // The player restarts the Anlage deliberately. Chapter 9 remembers this.
  function enterFacility() {
    try { GameEngine.state.setFlag('reactivation_consent_seen', true); } catch (_) {}
    goBtn.disabled = true;
    setStatus('SEKTOR 0 WIRD GELADEN…', 'wait');
    setTimeout(() => { window.location.href = 'chapter0/chapter0.html'; }, 900);
  }

  verifyBtn?.addEventListener('click', verify);
  goBtn?.addEventListener('click', enterFacility);

  document.addEventListener('DOMContentLoaded', () => {
    if (checkAlreadyVerified()) return;
    initDigitNav();
    setStatus('BEREIT.', '');
    setTimeout(() => digits[0]?.focus(), 400);
  });

})();
