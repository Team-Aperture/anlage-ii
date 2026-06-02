/**
 * ═══════════════════════════════════════════════════════════════
 * MOBILE WARNING OVERLAY  —  two-step
 * KA-II is built for landscape 16:9 desktop screens. On a narrow /
 * portrait device we warn the player twice (soft, dismissible):
 *   Step 1 — "Am besten auf PC / Mac"
 *   Step 2 — "Bist du sicher?" confirmation
 * The "once per device" flag is stored ONLY after the final
 * confirmation, so a partial dismiss still re-warns next visit.
 * Include on every page (after engine.js).
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const FLAG_KEY = 'ka2_mobile_warning_dismissed';

  function isMobile() {
    // Narrow viewport OR portrait orientation on small screens
    const w = window.innerWidth;
    const h = window.innerHeight;
    return w < 900 || (w < 1200 && h > w);
  }

  function alreadyDismissed() {
    try { return localStorage.getItem(FLAG_KEY) === '1'; }
    catch (_) { return false; }
  }

  function setDismissed() {
    try { localStorage.setItem(FLAG_KEY, '1'); } catch (_) {}
  }

  function showWarning() {
    if (document.getElementById('mobileWarning')) return;

    const overlay = document.createElement('div');
    overlay.id = 'mobileWarning';
    overlay.className = 'mw-step-1'; // step 1 visible first
    overlay.innerHTML = `
      <div class="mw-card">
        <div class="mw-accent"></div>

        <div class="mw-icon" aria-hidden="true">
          <div class="mw-icon-pc"></div>
          <div class="mw-icon-arrow">›</div>
          <div class="mw-icon-screen"></div>
        </div>

        <!-- STEP 1 — recommendation -->
        <div class="mw-step mw-step-one">
          <p class="mw-label">SYSTEMHINWEIS</p>
          <h2 class="mw-title">Am besten auf PC / Mac</h2>
          <p class="mw-msg">
            Die Kalibrierungsanlage II wurde für Bildschirme im Querformat
            (16:9) entwickelt. Für das volle Erlebnis empfehlen wir dir
            einen PC oder Mac.
          </p>
          <p class="mw-msg-secondary">
            Auf dem Handy fehlen einige Bildbereiche oder sind schwer
            erkennbar.
          </p>
          <div class="mw-actions">
            <button class="mw-btn mw-btn-primary" id="mwContinue">[ WEITER ]</button>
            <button class="mw-btn" id="mwLater">[ SPÄTER AUF PC ÖFFNEN ]</button>
          </div>
        </div>

        <!-- STEP 2 — confirmation -->
        <div class="mw-step mw-step-two">
          <p class="mw-label">BESTÄTIGUNG</p>
          <h2 class="mw-title">Bist du sicher?</h2>
          <p class="mw-msg">
            Du spielst auf einem kleinen Bildschirm. Manche Rätsel und
            CGs sind auf einem PC oder Mac deutlich besser spielbar.
          </p>
          <p class="mw-msg-secondary">
            Möchtest du trotzdem hier fortfahren?
          </p>
          <div class="mw-actions">
            <button class="mw-btn mw-btn-primary" id="mwConfirm">[ JA, TROTZDEM SPIELEN ]</button>
            <button class="mw-btn" id="mwBack">[ ZURÜCK ]</button>
          </div>
        </div>

        <p class="mw-foot">
          Diese Meldung erscheint nur einmal pro Gerät.
        </p>
      </div>
    `;

    document.body.appendChild(overlay);

    function close() {
      overlay.classList.add('mw-hiding');
      setTimeout(() => overlay.remove(), 380);
    }

    // Step 1 → Step 2
    document.getElementById('mwContinue').addEventListener('click', () => {
      overlay.classList.remove('mw-step-1');
      overlay.classList.add('mw-step-2');
    });

    // Step 1: leave for later (do NOT store flag → warn again next visit)
    document.getElementById('mwLater').addEventListener('click', close);

    // Step 2 → back to Step 1
    document.getElementById('mwBack').addEventListener('click', () => {
      overlay.classList.remove('mw-step-2');
      overlay.classList.add('mw-step-1');
    });

    // Step 2: confirm → store flag so it doesn't reappear on this device
    document.getElementById('mwConfirm').addEventListener('click', () => {
      setDismissed();
      close();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (isMobile() && !alreadyDismissed()) {
      // Delay slightly so it doesn't fight the boot sequence
      setTimeout(showWarning, 200);
    }
  });

})();
