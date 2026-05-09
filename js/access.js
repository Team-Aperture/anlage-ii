/**
 * ═══════════════════════════════════════════════════════════════
 * KALIBRIERUNGSANLAGE II — ACCESS VERIFICATION
 *
 * Checks the KA-I completion code (83162947).
 * On success: sets a persistent flag and redirects to chapter 0.
 * Verified players who revisit this page are auto-redirected.
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const CORRECT_CODE  = '83162947';
  const VERIFIED_FLAG = 'ka1_verified';

  // ─── DOM refs ──────────────────────────────────────────────
  const digits    = Array.from(document.querySelectorAll('.code-digit'));
  const statusEl  = document.getElementById('accessStatus');
  const verifyBtn = document.getElementById('verifyBtn');
  const card      = document.querySelector('.access-card');

  // ─── Auto-redirect if already verified ─────────────────────
  function checkAlreadyVerified() {
    if (GameEngine.state.hasFlag(VERIFIED_FLAG)) {
      setStatus('ZUGRIFF BEREITS BESTÄTIGT. WEITERLEITUNG…', 'success');
      card.classList.add('verified');
      setTimeout(() => { window.location.href = 'chapter0/chapter0.html'; }, 1200);
      return true;
    }
    return false;
  }

  // ─── Keyboard navigation for digit boxes ───────────────────
  function initDigitNav() {
    digits.forEach((input, i) => {

      input.addEventListener('keydown', e => {
        // Allow only digits, backspace, delete, arrows, tab
        if (!/^\d$/.test(e.key) &&
            !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) {
          e.preventDefault();
          return;
        }

        if (e.key === 'Backspace') {
          if (input.value) {
            input.value = '';
          } else if (i > 0) {
            digits[i - 1].focus();
            digits[i - 1].value = '';
          }
          clearErrors();
          return;
        }

        if (e.key === 'ArrowLeft'  && i > 0)              { e.preventDefault(); digits[i - 1].focus(); return; }
        if (e.key === 'ArrowRight' && i < digits.length-1){ e.preventDefault(); digits[i + 1].focus(); return; }
      });

      input.addEventListener('input', e => {
        const val = input.value.replace(/\D/g, '');
        input.value = val ? val[val.length - 1] : '';
        clearErrors();

        if (input.value && i < digits.length - 1) {
          digits[i + 1].focus();
        }

        // Auto-verify when last digit filled
        if (i === digits.length - 1 && input.value) {
          verify();
        }
      });

      // Handle paste on any digit (e.g. paste full code at once)
      input.addEventListener('paste', e => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData)
          .getData('text')
          .replace(/\D/g, '')
          .slice(0, 8);
        if (!pasted) return;
        pasted.split('').forEach((ch, j) => {
          if (digits[j]) digits[j].value = ch;
        });
        const nextEmpty = digits.findIndex(d => !d.value);
        (nextEmpty >= 0 ? digits[nextEmpty] : digits[digits.length - 1]).focus();
        clearErrors();
        if (pasted.length === 8) verify();
      });
    });
  }

  // ─── Collect current code ───────────────────────────────────
  function getCode() {
    return digits.map(d => d.value).join('');
  }

  // ─── Status text ────────────────────────────────────────────
  function setStatus(text, type) {
    statusEl.textContent = text;
    statusEl.className   = 'access-status sys-text' + (type ? ' ' + type : '');
  }

  function clearErrors() {
    digits.forEach(d => d.classList.remove('wrong', 'correct'));
    setStatus('BEREIT.', '');
  }

  // ─── Verify ─────────────────────────────────────────────────
  function verify() {
    const code = getCode();

    if (code.length < 8) {
      setStatus('UNVOLLSTÄNDIGE EINGABE — 8 STELLEN ERFORDERLICH.', 'error');
      return;
    }

    if (code === CORRECT_CODE) {
      onSuccess();
    } else {
      onFail();
    }
  }

  function onSuccess() {
    digits.forEach(d => { d.classList.remove('wrong'); d.classList.add('correct'); });
    setStatus('VERIFIZIERUNG BESTÄTIGT. ZUGANG GEWÄHRT.', 'success');
    card.classList.add('verified');
    verifyBtn.disabled = true;

    GameEngine.state.setFlag(VERIFIED_FLAG);
    GameEngine.achievements.unlock('ka1_veteran');

    // Brief pause, then dramatic redirect
    setTimeout(() => {
      setStatus('SEKTOR 0 WIRD GELADEN…', 'wait');
      setTimeout(() => {
        window.location.href = 'chapter0/chapter0.html';
      }, 1000);
    }, 1200);
  }

  function onFail() {
    digits.forEach(d => d.classList.add('wrong'));
    setStatus('VERIFIZIERUNG FEHLGESCHLAGEN — FALSCHER CODE.', 'error');

    // Brief shake, then allow retry
    setTimeout(() => {
      digits.forEach(d => { d.classList.remove('wrong'); d.value = ''; });
      digits[0].focus();
      setStatus('BEREIT.', '');
    }, 1400);
  }

  // ─── Verify button ───────────────────────────────────────────
  verifyBtn?.addEventListener('click', verify);

  // ─── INIT ────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    if (checkAlreadyVerified()) return;
    initDigitNav();
    setStatus('BEREIT.', '');
    // Focus first digit
    setTimeout(() => digits[0]?.focus(), 400);
  });

})();
