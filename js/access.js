/**
 * ═══════════════════════════════════════════════════════════════
 * KALIBRIERUNGSANLAGE II — ZUGRIFFSPRÜFUNG
 *
 * The facility wants an external test signature before it restarts, and the
 * player is that signature. Nothing from Part I is asked for here: Part II is
 * complete on its own. The page records the player, shows what the archive
 * knows, and lets the player decide to restart the place.
 *
 * (Returning Part-I test subjects have their own, entirely optional moment on
 * the title screen — js/archiv.js. It changes nothing about the game.)
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // ── For anyone curious about the first Anlage (optional background). ──
  const KA1_GAME_URL    = 'https://team-aperture.github.io/kalibrierungsanlage/';
  const KA1_LISTING_URL = 'https://www.geocaching.com/geocache/GCBPAMN';

  const CONSENT_FLAG = 'reactivation_consent_seen';

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

  function setStatus(text, type) {
    statusEl.textContent = text;
    statusEl.className   = 'access-status sys-text' + (type ? ' ' + type : '');
  }

  // ─── already through this door ─────────────────────────────
  // A run that has started (or an older save that passed the old gate) goes
  // straight on; the entrance is a moment, not a checkpoint.
  function checkAlreadyThrough() {
    const st = GameEngine.state;
    const started = st.hasFlag(CONSENT_FLAG) || st.hasFlag('ka1_verified')
      || (st.get('chaptersCompleted') || []).length > 0;
    if (!started) return false;
    setStatus('TESTSIGNATUR BEREITS ERFASST. WEITERLEITUNG…', 'success');
    card.classList.add('verified');
    verifyBtn.disabled = true;
    setTimeout(() => { window.location.href = 'chapter0/chapter0.html'; }, 1200);
    return true;
  }

  // ─── what the archive records ─────────────────────────────
  const REVEAL = [
    ['ABSCHALTCODE', 'IM ARCHIV'],
    ['LETZTE VERWENDUNG', 'SYSTEMABSCHALTUNG'],
    // a later calibration cycle (NG+): the facility has seen this signature before
    ['EXTERNE TESTSIGNATUR', (() => { try { return GameEngine.state.cycle(); } catch (_) { return 1; } })() > 1 ? 'WIEDERERKANNT' : 'ERFASST'],
    ['ARCHIVSTATUS', 'ENTSIEGELT'],
    ['REAKTIVIERUNGSPROTOKOLL', 'VERFÜGBAR'],
  ];

  function sign() {
    if (busy) return;
    busy = true;
    verifyBtn.disabled = true;
    verifyBtn.classList.add('hidden');
    setStatus('', '');
    card.classList.add('verified');

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
        try { GameEngine.audio.tone({ freq: 150 + i * 30, dur: 0.05, type: 'sine', vol: 0.04 }); } catch (_) {}
      }, fast ? 90 * i : 620 * i + 300);
    });
    setTimeout(() => {
      goBtn.classList.add('visible');
      goBtn.focus();
    }, fast ? 600 : 620 * REVEAL.length + 700);
  }

  // The player restarts the Anlage deliberately.
  function enterFacility() {
    try { GameEngine.state.setFlag(CONSENT_FLAG, true); } catch (_) {}
    goBtn.disabled = true;
    setStatus('SEKTOR 0 WIRD GELADEN…', 'wait');
    setTimeout(() => { window.location.href = 'chapter0/chapter0.html'; }, 900);
  }

  verifyBtn?.addEventListener('click', sign);
  goBtn?.addEventListener('click', enterFacility);

  document.addEventListener('DOMContentLoaded', () => {
    if (checkAlreadyThrough()) return;
    setStatus('BEREIT.', '');
    setTimeout(() => verifyBtn?.focus(), 400);
  });

})();
