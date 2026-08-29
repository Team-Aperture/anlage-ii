/**
 * ═══════════════════════════════════════════════════════════════
 * MOBILE WARNING OVERLAY  —  two-step
 * KA-II plays fine on a phone — every chapter is tested there. A bigger
 * screen simply shows more of a room at once, so on a narrow / portrait
 * device we say so twice (soft, dismissible) and get out of the way:
 *   Step 1 — "Größerer Bildschirm empfohlen"
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
          <h2 class="mw-title">Größerer Bildschirm empfohlen</h2>
          <p class="mw-msg">
            Die Kalibrierungsanlage II ist auf dem Handy vollständig spielbar —
            alle Rätsel, alle Sektoren, alle Koordinaten.
          </p>
          <p class="mw-msg-secondary">
            Auf einem größeren Bildschirm sieht man von den Räumen allerdings
            mehr auf einmal, und das ein oder andere Rätsel liest sich
            angenehmer.
          </p>
          <div class="mw-actions">
            <button class="mw-btn mw-btn-primary" id="mwContinue">[ WEITER ]</button>
            <button class="mw-btn" id="mwLater">[ SPÄTER AUF PC ÖFFNEN ]</button>
          </div>
        </div>

        <!-- STEP 2 — confirmation -->
        <div class="mw-step mw-step-two">
          <p class="mw-label">BESTÄTIGUNG</p>
          <h2 class="mw-title">Alles klar?</h2>
          <p class="mw-msg">
            Kein Fortschritt geht verloren. Der Spielstand liegt in diesem
            Browser; über <b>[ SPIELSTAND ]</b> im Hauptmenü bekommst du einen
            Code, mit dem du auf einem größeren Bildschirm weitermachen kannst.
          </p>
          <p class="mw-msg-secondary">
            Hier weitermachen?
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
