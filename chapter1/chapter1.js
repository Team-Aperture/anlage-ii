/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 01 — WARTUNGSSEKTOR
 *
 * The encounter chapter, in three acts:
 *   1. SOMETHING IS HERE  — the hall reads as abandoned until the
 *      evidence says otherwise (old log vs. an 11-minute-old repair).
 *   2. THE ENCOUNTER      — two units reveal themselves. One reaction
 *      choice; everything deeper is optional.
 *   3. FIRST COLLABORATION— two repairs that visibly wake the sector.
 *
 * Puzzle win conditions are computed by flood-fill over the live grid,
 * never compared against a stored answer.
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter1 = (() => {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const S = {
    // Act 1 discovery tracking
    act1Seen:   {},          // hotspot key -> times examined
    klonkDone:  false,
    corridorOpen: false,

    // Act 2/3
    metRobots:  false,
    p1Solved:   false,
    p2Solved:   false,
    sectorAwake:false,

    // per-room examine counters (drive the "it has not changed" beats)
    clicks: {},

    // optional-conversation tracking
    talkSeen:   {},

    // hint budget: a single 3-step ladder per puzzle. Whichever unit you
    // ask voices the *next* step, so the choice is personality, not quantity.
    hints: { step: 0, max: 3, active: null },

    // reactive puzzle chatter (each beat fires at most once per puzzle)
    react: { p1: {}, p2: {} },
    rotations: { p1: 0, p2: 0 },

    // Set only when the sector is being walked a second time — nothing here
    // may re-run the ending or hand out a completion that already happened.
    revisit: false,
  };

  const HINT_MAX = 3;

  // ═══════════════════════════════════════════════════════════════
  // SCENE HELPERS
  // ═══════════════════════════════════════════════════════════════
  function setScene(key) {
    const ph = document.getElementById('scenePh');
    if (ph) ph.dataset.scene = key;
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
   * While a dialogue is running, a tap anywhere in the scene advances it
   * instead of starting a new interaction.
   *
   * The dialogue box only covers the bottom strip, so every hotspot stays
   * physically tappable underneath it — and the engine keeps exactly ONE
   * completion callback. Starting a new line from a hotspot mid-dialogue
   * therefore silently discarded whatever the running dialogue was going to
   * do next, which is how the player could strand themselves. Forwarding the
   * tap (rather than swallowing it) keeps the obvious mobile gesture working:
   * tapping repeatedly reads on instead of doing nothing.
   */
  function guarded(fn) {
    return (...args) => {
      if (dialogueBusy()) { try { GameEngine.dialogue.advance(); } catch(_) {} return; }
      return fn(...args);
    };
  }

  function addHotspot(cfg) {
    // A code-drawn prop you click directly (no images).
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

  // Decorative (non-interactive) code-drawn scenery.
  function addProp(cfg) {
    if (!(window.GameEngine && GameEngine.props)) return;
    document.getElementById('sceneHotspots').appendChild(
      GameEngine.props.el(cfg.prop, { x:cfg.x, y:cfg.y, w:cfg.w, h:cfg.h, cls:cfg.cls, anim:cfg.anim }));
  }

  // ═══════════════════════════════════════════════════════════════
  // CHAPTER ART — the Wartungssektor draws its own furniture
  //
  // Every object the player can CLICK in this chapter is drawn here
  // instead of pulled from the shared library, so sector 01 looks like
  // sector 01: bolted enamel, roller shutters, taped-over conduit,
  // amber hazard paint and one warm light at the end of the corridor.
  // Names are c1_* so they can never collide with another chapter.
  //
  // Only the engine's material classes are used, so this art inherits
  // the same lighting as everything else. The two exceptions are the
  // unpowered-terminal lamps, which the dialogue explicitly calls RED —
  // they borrow the chapter-local --bad-red token ("refused"), never a
  // character accent.
  // ═══════════════════════════════════════════════════════════════
  function registerArt() {
    if (!(window.GameEngine && GameEngine.props && GameEngine.props.register)) return;
    GameEngine.props.register({

      // ── ACT 1 ────────────────────────────────────────────────────
      // Wartungsterminal: a log reader under a visor hood. One stored
      // line burns bright on an otherwise empty screen, and one big key
      // sits under it — the only thing left in here to press.
      c1_logterminal: { vb: '0 0 100 120', art:
          '<ellipse class="prop-inset" cx="50" cy="113" rx="30" ry="4" opacity=".6"/>'
        + '<rect class="prop-base" x="30" y="104" width="40" height="9" rx="2"/>'
        + '<path class="prop-metal" d="M40 104 L43 74 h14 l3 30 Z"/>'
        + '<rect class="prop-lite" x="43" y="74" width="3" height="30"/>'
        + '<path class="prop-base" d="M8 20 L14 8 H86 L92 20 V72 q0 5 -5 5 H13 q-5 0 -5 -5 Z"/>'
        + '<rect class="prop-lite" x="16" y="11" width="68" height="3" rx="1.5"/>'
        + '<rect class="prop-screen" x="15" y="22" width="70" height="30"/>'
        + '<line class="prop-scan" x1="21" y1="29" x2="62" y2="29"/>'
        + '<rect class="prop-acc" x="21" y="36" width="48" height="4" opacity=".85"/>'
        + '<rect class="prop-cursor" x="72" y="35" width="6" height="6"/>'
        + '<rect class="prop-acc-dim" x="21" y="45" width="26" height="3"/>'
        + '<rect class="prop-inset" x="15" y="56" width="70" height="16" rx="2"/>'
        + '<rect class="prop-metal" x="20" y="59" width="20" height="10" rx="2"/>'
        + '<rect class="prop-lite" x="20" y="59" width="20" height="2.5" rx="1"/>'
        + '<rect class="prop-metal" x="45" y="59" width="9" height="10" rx="2"/>'
        + '<rect class="prop-metal" x="58" y="59" width="9" height="10" rx="2"/>'
        + '<circle class="prop-led" cx="79" cy="64" r="2.8"/>'
        + '<line class="prop-thin" x1="43" y1="86" x2="57" y2="86"/>'
        + '<line class="prop-thin" x1="43" y1="93" x2="57" y2="93"/>' },

      // Leitungspaneel: the lid hangs open, two cables have been pulled
      // out of the terminal block and jammed back in somewhere else.
      // The splice still glows — the repair is eleven minutes old.
      c1_conduitpanel: { vb: '0 0 100 80', art:
          '<rect class="prop-base" x="10" y="4" width="84" height="68" rx="4"/>'
        + '<path class="prop-metal" d="M10 6 L0 14 V62 L10 70 Z"/>'
        + '<path class="prop-lite" d="M10 6 L0 14 V18 L10 10 Z"/>'
        + '<rect class="prop-inset" x="16" y="10" width="72" height="56"/>'
        + '<rect class="prop-metal" x="20" y="15" width="64" height="11" rx="1"/>'
        + '<rect class="prop-inset" x="24" y="18" width="6" height="5"/>'
        + '<rect class="prop-inset" x="34" y="18" width="6" height="5"/>'
        + '<rect class="prop-inset" x="44" y="18" width="6" height="5"/>'
        + '<rect class="prop-inset" x="54" y="18" width="6" height="5"/>'
        + '<rect class="prop-acc-dim" x="64" y="18" width="6" height="5"/>'
        + '<path class="prop-thin" d="M27 26 q4 16 22 8" stroke-width="2.6"/>'
        + '<path class="prop-edge" d="M47 26 q-10 14 6 22" opacity=".9"/>'
        + '<circle class="prop-glow" cx="53" cy="48" r="9"/>'
        + '<circle class="prop-core" cx="53" cy="48" r="3"/>'
        + '<rect class="prop-hazard" x="30" y="40" width="16" height="5" rx="1" opacity=".55" transform="rotate(-9 38 42)"/>'
        + '<rect class="prop-acc-dim" x="20" y="56" width="24" height="4"/>'
        + '<circle class="prop-led" cx="82" cy="14" r="2.6"/>'
        + '<circle class="prop-lite" cx="14" cy="8" r="1.8"/>'
        + '<circle class="prop-lite" cx="90" cy="8" r="1.8"/>'
        + '<circle class="prop-lite" cx="14" cy="68" r="1.8"/>'
        + '<circle class="prop-lite" cx="90" cy="68" r="1.8"/>' },

      // Werkzeug: a dropped open-ended spanner, name label half peeled
      // off, lying in its own warmth. The silhouette has to read as
      // "someone's tool" instantly — that is the whole clue.
      c1_tool: { vb: '0 0 130 60', art:
          '<ellipse class="prop-inset" cx="65" cy="52" rx="48" ry="6" opacity=".5"/>'
        + '<ellipse class="prop-glow" cx="66" cy="42" rx="34" ry="10"/>'
        + '<g transform="rotate(-7 65 42)">'
        + '<rect class="prop-metal" x="30" y="37" width="64" height="9" rx="4"/>'
        + '<rect class="prop-lite" x="34" y="38.5" width="52" height="2.4" rx="1.2"/>'
        + '<path class="prop-base" d="M92 30 l18 -5 l5 7 l-12 4 l12 4 l-5 7 l-18 -5 Z"/>'
        + '<line class="prop-thin" x1="42" y1="46" x2="42" y2="37"/>'
        + '<line class="prop-thin" x1="48" y1="46" x2="48" y2="37"/>'
        + '<line class="prop-thin" x1="54" y1="46" x2="54" y2="37"/>'
        + '<rect class="prop-acc-dim" x="60" y="34" width="24" height="12" rx="1"/>'
        + '<path class="prop-lite" d="M84 34 v12 l-7 -6 Z" opacity=".7"/>'
        + '<line class="prop-thin" x1="64" y1="38" x2="78" y2="38"/>'
        + '<line class="prop-thin" x1="64" y1="42" x2="73" y2="42"/>'
        + '</g>'
        + '<rect class="prop-metal" x="12" y="44" width="22" height="5" rx="2.5" transform="rotate(11 23 46)"/>'
        + '<rect class="prop-lite" x="12" y="44" width="8" height="5" rx="2.5" transform="rotate(11 23 46)"/>'
        + '<circle class="prop-lite" cx="114" cy="47" r="2.6"/>'
        + '<circle class="prop-inset" cx="104" cy="50" r="2"/>' },

      // Testschild: three stacked motto lines on bolted enamel, and the
      // later addition scratched in underneath — it starts straight and
      // loses its nerve. The same sign appears in the workshop, because
      // it is the same sign, bolted to the same facility.
      c1_testsign: { vb: '0 0 110 70', art:
          '<line class="prop-thin" x1="16" y1="0" x2="16" y2="9"/>'
        + '<line class="prop-thin" x1="94" y1="0" x2="94" y2="9"/>'
        + '<rect class="prop-base" x="6" y="8" width="98" height="54" rx="3"/>'
        + '<rect class="prop-metal" x="10" y="12" width="90" height="46"/>'
        + '<rect class="prop-lite" x="10" y="12" width="90" height="3"/>'
        + '<rect class="prop-acc-dim" x="18" y="19" width="28" height="5"/>'
        + '<rect class="prop-acc-dim" x="18" y="28" width="34" height="5"/>'
        + '<rect class="prop-acc-dim" x="18" y="37" width="46" height="5"/>'
        + '<line class="prop-thin" x1="16" y1="47" x2="94" y2="47"/>'
        + '<path class="prop-thin" d="M18 53 h18 q5 4 10 0 q6 5 12 -1 q7 5 14 0 h10" stroke-width="2.2"/>'
        + '<path class="prop-lite" d="M18 55 h16 v1.6 h-16 Z" opacity=".55"/>'
        + '<path class="prop-inset" d="M100 12 h-12 l12 10 Z" opacity=".8"/>'
        + '<path class="prop-hazard" d="M84 55 l6 -6 h4 l-6 6 Z" opacity=".6"/>'
        + '<circle class="prop-lite" cx="16" cy="10" r="1.8"/>'
        + '<circle class="prop-lite" cx="94" cy="10" r="1.8"/>' },

      // Die Tür zurück: one solid leaf, no split, no handle, a welded
      // seam and a bar bolted across it. The reader beside it is dark.
      // Nothing in this shape offers a way to open it.
      c1_sealeddoor: { vb: '0 0 80 120', art:
          '<ellipse class="prop-inset" cx="40" cy="116" rx="32" ry="4" opacity=".6"/>'
        + '<rect class="prop-base" x="4" y="2" width="72" height="114" rx="3"/>'
        + '<rect class="prop-inset" x="11" y="8" width="58" height="102"/>'
        + '<rect class="prop-metal" x="12" y="9" width="56" height="100"/>'
        + '<rect class="prop-lite" x="12" y="9" width="4" height="100"/>'
        + '<line class="prop-thin" x1="14" y1="30" x2="66" y2="30"/>'
        + '<line class="prop-thin" x1="14" y1="88" x2="66" y2="88"/>'
        + '<path class="prop-thin" d="M12 50 l8 -3 l8 3 l8 -3 l8 3 l8 -3 l8 3 l8 -3" stroke-width="2.4"/>'
        + '<circle class="prop-lite" cx="24" cy="49" r="1.6"/>'
        + '<circle class="prop-lite" cx="48" cy="49" r="1.6"/>'
        + '<rect class="prop-base" x="52" y="30" width="14" height="17" rx="2"/>'
        + '<rect class="prop-inset" x="55" y="34" width="8" height="3"/>'
        + '<circle class="prop-inset" cx="59" cy="43" r="2.4"/>'
        + '<rect class="prop-metal" x="6" y="62" width="68" height="9" rx="2"/>'
        + '<rect class="prop-lite" x="6" y="62" width="68" height="2.5" rx="1"/>'
        + '<circle class="prop-inset" cx="14" cy="66.5" r="2.6"/>'
        + '<circle class="prop-inset" cx="66" cy="66.5" r="2.6"/>'
        + '<path class="prop-hazard" d="M14 108 l7 -8 h5 l-7 8 Z"/>'
        + '<path class="prop-hazard" d="M28 108 l7 -8 h5 l-7 8 Z"/>'
        + '<path class="prop-hazard" d="M42 108 l7 -8 h5 l-7 8 Z"/>'
        + '<path class="prop-hazard" d="M56 108 l7 -8 h5 l-7 8 Z"/>' },

      // Bodenplatten: four plates in perspective. One sits crooked with
      // a black gap beside it, dashed to draw the eye, and two small
      // paired scuffs land on the plate behind it — light, metallic.
      c1_floorplates: { vb: '0 0 120 60', art:
          '<path class="prop-inset" d="M8 56 L28 6 H92 L112 56 Z" opacity=".55"/>'
        + '<path class="prop-metal" d="M31 9 H57 L54 27 H26 Z"/>'
        + '<path class="prop-metal" d="M63 9 H89 L94 27 H66 Z"/>'
        + '<path class="prop-metal" d="M56 31 H96 L104 53 H52 Z"/>'
        + '<rect class="prop-lite" x="31" y="9" width="26" height="2"/>'
        + '<rect class="prop-lite" x="63" y="9" width="26" height="2"/>'
        + '<rect class="prop-lite" x="56" y="31" width="40" height="2"/>'
        + '<path class="prop-inset" d="M44 31 h8 L48 53 h-9 Z"/>'
        + '<path class="prop-base" d="M20 31 H50 L45 53 H12 Z" transform="rotate(-5 30 42)"/>'
        + '<path class="prop-edge" d="M20 31 H50 L45 53 H12 Z" opacity=".5" stroke-dasharray="6 4" transform="rotate(-5 30 42)"/>'
        + '<path class="prop-thin" d="M62 44 q6 -4 12 0"/>'
        + '<path class="prop-thin" d="M70 48 q6 -4 12 0"/>'
        + '<circle class="prop-acc-dim" cx="36" cy="20" r="2.2"/>'
        + '<circle class="prop-acc-dim" cx="43" cy="20" r="2.2"/>'
        + '<circle class="prop-inset" cx="86" cy="40" r="2"/>' },

      // Dunkler Korridor: a square-lintelled service mouth with hazard
      // paint over the header and ribs receding into black — and one
      // small warm light still burning a long way in. That is the hook.
      c1_corridor: { vb: '0 0 100 120', art:
          '<path class="prop-base" d="M4 118 V24 h92 v94 Z"/>'
        + '<path class="prop-inset" d="M14 118 V36 q36 -20 72 0 v82 Z"/>'
        + '<path class="prop-thin" d="M26 118 V48 q24 -14 48 0 v70 Z" opacity=".5"/>'
        + '<path class="prop-thin" d="M38 118 V60 q12 -8 24 0 v58 Z" opacity=".32"/>'
        + '<circle class="prop-glow" cx="50" cy="80" r="11"/>'
        + '<circle class="prop-core" cx="50" cy="80" r="3"/>'
        + '<line class="prop-thin" x1="14" y1="96" x2="86" y2="96" opacity=".5"/>'
        + '<line class="prop-thin" x1="20" y1="108" x2="80" y2="108" opacity=".4"/>'
        + '<rect class="prop-metal" x="6" y="40" width="8" height="26" rx="2"/>'
        + '<rect class="prop-metal" x="86" y="40" width="8" height="26" rx="2"/>'
        + '<rect class="prop-base" x="4" y="8" width="92" height="12" rx="2"/>'
        + '<path class="prop-hazard" d="M12 19 l7 -9 h6 l-7 9 Z"/>'
        + '<path class="prop-hazard" d="M28 19 l7 -9 h6 l-7 9 Z"/>'
        + '<path class="prop-hazard" d="M60 19 l7 -9 h6 l-7 9 Z"/>'
        + '<path class="prop-hazard" d="M76 19 l7 -9 h6 l-7 9 Z"/>'
        + '<rect class="prop-lite" x="4" y="19" width="92" height="5" rx="2"/>'
        + '<circle class="prop-led" cx="50" cy="14" r="2.8"/>' },

      // ── ACT 3 / WARTUNGSHALLE ────────────────────────────────────
      // Hall terminal: heavier than the log reader — a chamfered head on
      // a splayed pedestal with a grab handle. The red lamp sits under
      // the bezel exactly where the text says it does.
      c1_hallterminal: { vb: '0 0 100 120', art:
          '<ellipse class="prop-inset" cx="50" cy="114" rx="30" ry="4" opacity=".6"/>'
        + '<path class="prop-base" d="M22 112 L30 88 H70 L78 112 Z"/>'
        + '<rect class="prop-lite" x="30" y="88" width="40" height="2.5"/>'
        + '<rect class="prop-metal" x="38" y="56" width="24" height="34"/>'
        + '<rect class="prop-lite" x="38" y="56" width="4" height="34"/>'
        + '<rect class="prop-inset" x="45" y="66" width="12" height="3"/>'
        + '<rect class="prop-inset" x="45" y="73" width="12" height="3"/>'
        + '<rect class="prop-inset" x="45" y="80" width="12" height="3"/>'
        + '<path class="prop-base" d="M10 16 L20 6 H80 L90 16 V52 q0 4 -4 4 H14 q-4 0 -4 -4 Z"/>'
        + '<rect class="prop-lite" x="22" y="9" width="56" height="3" rx="1.5"/>'
        + '<rect class="prop-screen" x="17" y="17" width="66" height="30"/>'
        + '<line class="prop-scan" x1="23" y1="25" x2="58" y2="25"/>'
        + '<rect class="prop-acc-dim" x="23" y="33" width="30" height="4"/>'
        + '<rect class="prop-cursor" x="23" y="40" width="6" height="5"/>'
        + '<rect class="prop-metal" x="88" y="22" width="8" height="20" rx="4"/>'
        + '<rect class="prop-lite" x="88" y="22" width="3" height="20" rx="1.5"/>'
        + '<circle class="prop-led" style="fill:var(--bad-red)" cx="50" cy="60" r="3.2"/>'
        + '<path class="prop-thin" d="M50 112 q10 6 22 4"/>' },

      // Inneres Tor: a roller shutter, not a sliding door — five heavy
      // slats over a hazard-painted bottom rail. The status plate bolted
      // beside it is what actually stops you: GRUNDVERSORGUNG FEHLT.
      c1_innergate: { vb: '0 0 80 120', art:
          '<ellipse class="prop-inset" cx="34" cy="116" rx="30" ry="4" opacity=".6"/>'
        + '<rect class="prop-base" x="2" y="2" width="62" height="114" rx="3"/>'
        + '<rect class="prop-inset" x="8" y="8" width="50" height="100"/>'
        + '<rect class="prop-metal" x="9" y="10" width="48" height="17" rx="1"/>'
        + '<rect class="prop-metal" x="9" y="29" width="48" height="17" rx="1"/>'
        + '<rect class="prop-metal" x="9" y="48" width="48" height="17" rx="1"/>'
        + '<rect class="prop-metal" x="9" y="67" width="48" height="17" rx="1"/>'
        + '<rect class="prop-metal" x="9" y="86" width="48" height="17" rx="1"/>'
        + '<rect class="prop-lite" x="9" y="10" width="48" height="2.5"/>'
        + '<rect class="prop-lite" x="9" y="48" width="48" height="2.5"/>'
        + '<rect class="prop-lite" x="9" y="86" width="48" height="2.5"/>'
        + '<rect class="prop-metal" x="6" y="104" width="54" height="7" rx="2"/>'
        + '<path class="prop-hazard" d="M10 111 l6 -7 h5 l-6 7 Z"/>'
        + '<path class="prop-hazard" d="M24 111 l6 -7 h5 l-6 7 Z"/>'
        + '<path class="prop-hazard" d="M38 111 l6 -7 h5 l-6 7 Z"/>'
        + '<rect class="prop-base" x="64" y="34" width="14" height="32" rx="2"/>'
        + '<rect class="prop-screen" x="66" y="37" width="10" height="20"/>'
        + '<rect class="prop-acc-dim" x="68" y="41" width="6" height="3"/>'
        + '<rect class="prop-acc-dim" x="68" y="47" width="6" height="3"/>'
        + '<circle class="prop-led" style="fill:var(--bad-red)" cx="71" cy="62" r="2.4"/>' },

      // Wandkratzer: a concrete panel. The long line starts straight,
      // loses its nerve and stops dead in a gouge. Four and a half tally
      // marks sit below it — some scratches are not accidental.
      c1_wallscratch: { vb: '0 0 100 70', art:
          '<rect class="prop-metal" x="4" y="8" width="92" height="54"/>'
        + '<line class="prop-thin" x1="4" y1="22" x2="96" y2="22" opacity=".5"/>'
        + '<line class="prop-thin" x1="52" y1="8" x2="52" y2="22" opacity=".5"/>'
        + '<path class="prop-inset" d="M10 28 h78 v9 h-78 Z" opacity=".45"/>'
        + '<path class="prop-thin" d="M12 32 H42 q5 5 10 -2 q6 8 12 -2 q5 9 10 1 l4 4" stroke-width="2.5"/>'
        + '<path class="prop-lite" d="M12 34 H40 v1.6 H12 Z" opacity=".55"/>'
        + '<circle class="prop-inset" cx="90" cy="35" r="3"/>'
        + '<line class="prop-thin" x1="90" y1="35" x2="95" y2="30" opacity=".7"/>'
        + '<line class="prop-thin" x1="90" y1="35" x2="94" y2="40" opacity=".7"/>'
        + '<line class="prop-thin" x1="14" y1="46" x2="14" y2="56" opacity=".55"/>'
        + '<line class="prop-thin" x1="19" y1="46" x2="19" y2="56" opacity=".55"/>'
        + '<line class="prop-thin" x1="24" y1="46" x2="24" y2="56" opacity=".55"/>'
        + '<line class="prop-thin" x1="29" y1="46" x2="29" y2="56" opacity=".55"/>'
        + '<line class="prop-thin" x1="11" y1="56" x2="32" y2="46" opacity=".55"/>'
        + '<path class="prop-thin" d="M46 52 q14 -6 30 2" opacity=".3"/>'
        + '<ellipse class="prop-inset" cx="52" cy="60" rx="16" ry="2" opacity=".5"/>' },

      // Fass: sealed, hooped, latched — and the label plate riveted to
      // the front is completely blank. Aggressively unremarkable, which
      // is the entire joke of clicking it.
      c1_barrel: { vb: '0 0 80 110', art:
          '<ellipse class="prop-inset" cx="40" cy="105" rx="28" ry="5" opacity=".6"/>'
        + '<rect class="prop-base" x="10" y="16" width="60" height="88" rx="6"/>'
        + '<ellipse class="prop-metal" cx="40" cy="17" rx="30" ry="7"/>'
        + '<ellipse class="prop-inset" cx="40" cy="17" rx="22" ry="4.5"/>'
        + '<rect class="prop-metal" x="10" y="22" width="60" height="6"/>'
        + '<rect class="prop-metal" x="10" y="46" width="60" height="7"/>'
        + '<rect class="prop-metal" x="10" y="78" width="60" height="7"/>'
        + '<rect class="prop-lite" x="15" y="26" width="6" height="76" rx="3"/>'
        + '<rect class="prop-inset" x="27" y="57" width="26" height="16" rx="1"/>'
        + '<rect class="prop-metal" x="29" y="59" width="22" height="12" rx="1"/>'
        + '<circle class="prop-lite" cx="30" cy="60" r="1.4"/>'
        + '<circle class="prop-lite" cx="50" cy="60" r="1.4"/>'
        + '<circle class="prop-lite" cx="30" cy="70" r="1.4"/>'
        + '<circle class="prop-lite" cx="50" cy="70" r="1.4"/>'
        + '<rect class="prop-metal" x="34" y="10" width="12" height="8" rx="2"/>'
        + '<rect class="prop-lite" x="34" y="10" width="12" height="2" rx="1"/>'
        + '<path class="prop-thin" d="M14 92 q26 6 52 0" opacity=".5"/>' },

      // ── WARTUNGSKNOTEN ───────────────────────────────────────────
      // Zentrale Konsole: an input port at each end, and their traces run
      // inward to two SEPARATE sockets flanking a locked screen. The
      // shape states the puzzle before the dialogue does.
      c1_nodeconsole: { vb: '0 0 140 90', art:
          '<ellipse class="prop-inset" cx="70" cy="84" rx="56" ry="5" opacity=".6"/>'
        + '<path class="prop-base" d="M12 82 L26 26 h88 l14 56 Z"/>'
        + '<path class="prop-metal" d="M26 26 h88 l6 20 H20 Z"/>'
        + '<rect class="prop-lite" x="26" y="26" width="88" height="3"/>'
        + '<rect class="prop-screen" x="50" y="29" width="40" height="15" rx="1"/>'
        + '<line class="prop-scan" x1="53" y1="33" x2="62" y2="33"/>'
        + '<path class="prop-edge" d="M65 38 v-3 a5 5 0 0 1 10 0 v3"/>'
        + '<rect class="prop-acc" x="63" y="38" width="14" height="7" rx="1" opacity=".85"/>'
        + '<rect class="prop-inset" x="18" y="50" width="24" height="12" rx="2"/>'
        + '<rect class="prop-acc-dim" x="21" y="53" width="18" height="6"/>'
        + '<rect class="prop-inset" x="98" y="50" width="24" height="12" rx="2"/>'
        + '<rect class="prop-acc-dim" x="101" y="53" width="18" height="6"/>'
        + '<path class="prop-thin" d="M42 56 H54 l6 -8 h4" stroke-width="2"/>'
        + '<path class="prop-thin" d="M98 56 H86 l-6 -8 h-4" stroke-width="2"/>'
        + '<rect class="prop-inset" x="60" y="46" width="7" height="5"/>'
        + '<rect class="prop-inset" x="73" y="46" width="7" height="5"/>'
        + '<circle class="prop-led" cx="50" cy="56" r="3"/>'
        + '<circle class="prop-led prop-led-3" cx="90" cy="56" r="3"/>'
        + '<line class="prop-thin" x1="24" y1="70" x2="116" y2="70"/>'
        + '<rect class="prop-hazard" x="16" y="76" width="108" height="3" opacity=".5"/>' },

      // Rote Leitung (V-TGM): the one thing about her that panics. Clamps
      // at uneven heights, one hanging loose, a taped patch, an irregular
      // pulse train and a twitching gauge on the junction box.
      c1_conduit_red: { vb: '0 0 60 120', art:
          '<rect class="prop-inset" x="16" y="0" width="28" height="120"/>'
        + '<rect class="prop-metal" x="20" y="0" width="20" height="120"/>'
        + '<rect class="prop-lite" x="20" y="0" width="4" height="120"/>'
        + '<rect class="prop-acc-dim" x="26" y="0" width="9" height="120"/>'
        + '<rect class="prop-acc" x="26" y="4" width="9" height="7" opacity=".9"/>'
        + '<rect class="prop-acc" x="26" y="20" width="9" height="4" opacity=".8"/>'
        + '<rect class="prop-acc" x="26" y="31" width="9" height="10" opacity=".95"/>'
        + '<rect class="prop-acc" x="26" y="60" width="9" height="5" opacity=".75"/>'
        + '<rect class="prop-acc" x="26" y="84" width="9" height="12" opacity=".9"/>'
        + '<rect class="prop-base" x="14" y="12" width="32" height="7" rx="2"/>'
        + '<rect class="prop-base" x="14" y="50" width="32" height="7" rx="2"/>'
        + '<rect class="prop-base" x="14" y="98" width="32" height="7" rx="2" transform="rotate(-8 30 101)"/>'
        + '<rect class="prop-hazard" x="17" y="42" width="26" height="6" rx="1" opacity=".55" transform="rotate(9 30 45)"/>'
        + '<rect class="prop-base" x="4" y="66" width="22" height="18" rx="2"/>'
        + '<rect class="prop-screen" x="7" y="69" width="16" height="12"/>'
        + '<line class="prop-needle" x1="15" y1="76" x2="20" y2="70"/>'
        + '<circle class="prop-glow" cx="30" cy="112" r="8"/>'
        + '<circle class="prop-edge" cx="30" cy="112" r="4" opacity=".8"/>' },

      // Grüne Leitung (R-3MI): orderly, polite, exemplary. The same
      // conduit, evenly clamped, evenly pulsed, labelled, steady gauge.
      // The pair only lands as a joke if the two shapes differ.
      c1_conduit_green: { vb: '0 0 60 120', art:
          '<rect class="prop-inset" x="16" y="0" width="28" height="120"/>'
        + '<rect class="prop-metal" x="20" y="0" width="20" height="120"/>'
        + '<rect class="prop-lite" x="20" y="0" width="4" height="120"/>'
        + '<rect class="prop-acc-dim" x="26" y="0" width="9" height="120"/>'
        + '<rect class="prop-acc" x="26" y="8" width="9" height="7" opacity=".85"/>'
        + '<rect class="prop-acc" x="26" y="32" width="9" height="7" opacity=".85"/>'
        + '<rect class="prop-acc" x="26" y="56" width="9" height="7" opacity=".85"/>'
        + '<rect class="prop-acc" x="26" y="80" width="9" height="7" opacity=".85"/>'
        + '<rect class="prop-acc" x="26" y="104" width="9" height="7" opacity=".85"/>'
        + '<rect class="prop-base" x="14" y="18" width="32" height="7" rx="2"/>'
        + '<rect class="prop-base" x="14" y="46" width="32" height="7" rx="2"/>'
        + '<rect class="prop-base" x="14" y="74" width="32" height="7" rx="2"/>'
        + '<rect class="prop-base" x="14" y="102" width="32" height="7" rx="2"/>'
        + '<rect class="prop-inset" x="40" y="60" width="16" height="10" rx="1"/>'
        + '<rect class="prop-acc-dim" x="43" y="63" width="10" height="4"/>'
        + '<circle class="prop-screen" cx="10" cy="34" r="8"/>'
        + '<line class="prop-needle" x1="10" y1="34" x2="10" y2="27"/>'
        + '<circle class="prop-led" cx="30" cy="114" r="2.6"/>' },

      // Sektor-02-Tür: twin armoured leaves in a deep jamb, sector plate
      // above and, stencilled where the sign says WARTUNGSGARTEN, a
      // single painted leaf. The only green thing in this room.
      c1_sectordoor: { vb: '0 0 80 120', art:
          '<ellipse class="prop-inset" cx="40" cy="117" rx="34" ry="4" opacity=".6"/>'
        + '<rect class="prop-base" x="2" y="0" width="76" height="118" rx="2"/>'
        + '<rect class="prop-metal" x="2" y="0" width="11" height="118"/>'
        + '<rect class="prop-metal" x="67" y="0" width="11" height="118"/>'
        + '<rect class="prop-lite" x="4" y="0" width="3" height="118" opacity=".8"/>'
        + '<rect class="prop-lite" x="69" y="0" width="3" height="118" opacity=".8"/>'
        + '<rect class="prop-inset" x="13" y="6" width="54" height="106"/>'
        + '<rect class="prop-metal" x="14" y="7" width="25" height="104"/>'
        + '<rect class="prop-metal" x="41" y="7" width="25" height="104"/>'
        + '<line class="prop-edge" x1="40" y1="7" x2="40" y2="111" opacity=".85"/>'
        + '<circle class="prop-lite" cx="20" cy="16" r="2.2"/>'
        + '<circle class="prop-lite" cx="60" cy="16" r="2.2"/>'
        + '<rect class="prop-base" x="26" y="28" width="28" height="18" rx="2"/>'
        + '<rect class="prop-acc-dim" x="30" y="32" width="8" height="10"/>'
        + '<rect class="prop-acc" x="42" y="32" width="8" height="10" opacity=".8"/>'
        + '<ellipse class="prop-leaf" cx="40" cy="62" rx="8" ry="4.5" transform="rotate(-28 40 62)"/>'
        + '<path class="prop-vine" d="M40 72 q3 -6 0 -12"/>'
        + '<path class="prop-hazard" d="M15 111 l7 -8 h5 l-7 8 Z"/>'
        + '<path class="prop-hazard" d="M29 111 l7 -8 h5 l-7 8 Z"/>'
        + '<path class="prop-hazard" d="M43 111 l7 -8 h5 l-7 8 Z"/>'
        + '<path class="prop-hazard" d="M57 111 l7 -8 h5 l-7 8 Z"/>'
        + '<circle class="prop-led" cx="40" cy="3" r="2.6"/>' },

      // Lüftungsschacht: too narrow for you. The middle slat has been
      // pushed out of line FROM THE INSIDE, and two very small dim points
      // sit behind the gap it leaves. "Not now."
      c1_vent: { vb: '0 0 90 80', art:
          '<rect class="prop-base" x="8" y="8" width="74" height="64" rx="3"/>'
        + '<rect class="prop-inset" x="15" y="15" width="60" height="50"/>'
        + '<rect class="prop-metal" x="17" y="18" width="56" height="6" rx="1"/>'
        + '<rect class="prop-metal" x="17" y="28" width="56" height="6" rx="1"/>'
        + '<circle class="prop-acc-dim" cx="38" cy="43" r="1.8"/>'
        + '<circle class="prop-acc-dim" cx="45" cy="43" r="1.8"/>'
        + '<rect class="prop-metal" x="17" y="38" width="56" height="6" rx="1" transform="rotate(-5 45 41)"/>'
        + '<rect class="prop-metal" x="17" y="48" width="56" height="6" rx="1"/>'
        + '<rect class="prop-metal" x="17" y="58" width="56" height="6" rx="1"/>'
        + '<rect class="prop-lite" x="17" y="18" width="56" height="1.6"/>'
        + '<rect class="prop-lite" x="17" y="48" width="56" height="1.6"/>'
        + '<circle class="prop-lite" cx="13" cy="13" r="2"/>'
        + '<circle class="prop-lite" cx="77" cy="13" r="2"/>'
        + '<circle class="prop-lite" cx="13" cy="67" r="2"/>'
        + '<circle class="prop-lite" cx="77" cy="67" r="2"/>'
        + '<path class="prop-thin" d="M20 74 q14 4 28 0" opacity=".5"/>'
        + '<path class="prop-thin" d="M74 20 l6 -6" opacity=".6"/>' },

      // Altes Poster: two headline blocks, a rule, two sub-lines — and
      // under them two small figures standing side by side. DENK SELBST.
      // ABER NICHT ALLEIN. The bottom corner has given up.
      c1_poster: { vb: '0 0 90 110', art:
          '<path class="prop-metal" d="M8 6 H82 V88 L62 102 H8 Z"/>'
        + '<path class="prop-inset" d="M82 88 L62 102 V90 Z"/>'
        + '<rect class="prop-lite" x="10" y="2" width="16" height="6" opacity=".45" transform="rotate(-6 18 5)"/>'
        + '<rect class="prop-lite" x="64" y="2" width="16" height="6" opacity=".45" transform="rotate(5 72 5)"/>'
        + '<rect class="prop-acc-dim" x="16" y="15" width="58" height="6"/>'
        + '<rect class="prop-acc-dim" x="16" y="25" width="42" height="6"/>'
        + '<line class="prop-thin" x1="16" y1="37" x2="74" y2="37"/>'
        + '<rect class="prop-acc-dim" x="16" y="42" width="32" height="4" opacity=".45"/>'
        + '<rect class="prop-acc-dim" x="16" y="50" width="48" height="4" opacity=".45"/>'
        + '<circle class="prop-lite" cx="34" cy="66" r="6"/>'
        + '<path class="prop-metal" d="M27 76 q7 -6 14 0 v12 h-14 Z"/>'
        + '<circle class="prop-lite" cx="56" cy="66" r="6"/>'
        + '<path class="prop-metal" d="M49 76 q7 -6 14 0 v12 h-14 Z"/>'
        + '<path class="prop-thin" d="M41 80 h8" opacity=".8"/>'
        + '<circle class="prop-edge" cx="70" cy="76" r="8" opacity=".3"/>'
        + '<ellipse class="prop-inset" cx="24" cy="94" rx="12" ry="4" opacity=".3"/>' },

      // ── SET DRESSING that carries the sector ─────────────────────
      // Caged work lamp. This sector is being brought back up, and this
      // is the light doing it: a wire guard, a hot filament and a hazard
      // tag still hanging off the clamp. Warm, not clinical.
      c1_worklight: { vb: '0 0 80 70', art:
          '<path class="prop-thin" d="M40 0 q3 6 0 10"/>'
        + '<rect class="prop-metal" x="34" y="8" width="12" height="6" rx="2"/>'
        + '<path class="prop-base" d="M16 14 h48 l-8 13 h-32 Z"/>'
        + '<rect class="prop-lite" x="20" y="16" width="40" height="3"/>'
        + '<path class="prop-glow" d="M25 27 L6 66 H74 L55 27 Z"/>'
        + '<ellipse class="prop-core" cx="40" cy="26" rx="10" ry="3"/>'
        + '<circle class="prop-core" cx="40" cy="24" r="4"/>'
        + '<path class="prop-thin" d="M24 27 q16 15 32 0"/>'
        + '<path class="prop-thin" d="M31 27 q9 17 18 0"/>'
        + '<path class="prop-thin" d="M24 27 h32"/>'
        + '<rect class="prop-hazard" x="56" y="15" width="8" height="11" rx="1" opacity=".6" transform="rotate(8 60 20)"/>'
        + '<circle class="prop-led" cx="62" cy="11" r="2"/>' },

      // Riser pipe with a hand valve, a pressure gauge and a taped
      // repair — the sector's whole thesis in one decorative object.
      c1_valvepipe: { vb: '0 0 60 120', art:
          '<rect class="prop-metal" x="20" y="0" width="18" height="120"/>'
        + '<rect class="prop-lite" x="20" y="0" width="4" height="120"/>'
        + '<rect class="prop-base" x="15" y="10" width="28" height="8" rx="2"/>'
        + '<rect class="prop-base" x="15" y="88" width="28" height="8" rx="2"/>'
        + '<circle class="prop-inset" cx="20" cy="14" r="1.6"/>'
        + '<circle class="prop-inset" cx="38" cy="14" r="1.6"/>'
        + '<circle class="prop-base" cx="29" cy="52" r="15"/>'
        + '<circle class="prop-edge" cx="29" cy="52" r="10"/>'
        + '<line class="prop-edge" x1="29" y1="42" x2="29" y2="62"/>'
        + '<line class="prop-edge" x1="20" y1="47" x2="38" y2="57"/>'
        + '<line class="prop-edge" x1="20" y1="57" x2="38" y2="47"/>'
        + '<circle class="prop-lite" cx="29" cy="52" r="3"/>'
        + '<circle class="prop-screen" cx="47" cy="28" r="8"/>'
        + '<line class="prop-needle" x1="47" y1="28" x2="52" y2="23"/>'
        + '<rect class="prop-hazard" x="17" y="70" width="24" height="7" rx="1" opacity=".6" transform="rotate(-6 29 73)"/>'
        + '<circle class="prop-glow" cx="29" cy="110" r="6"/>' },
    });
  }

  function showRobots(v) {
    document.getElementById('robotIcons').classList.toggle('hidden', !v);
  }

  function playSound(src) { try { GameEngine.audio.sfx(src); } catch(_) {} }
  function tone(o)        { try { GameEngine.audio.tone(o); } catch(_) {} }

  function setProgress(pct) {
    const el = document.getElementById('reactProgress');
    if (el) el.textContent = `REAKTIVIERUNG: ${pct}%`;
  }

  function say(lines, after) { GameEngine.dialogue.load(lines, after); }

  /** Count an examine and return how many times this thing has been looked at. */
  function bump(key) {
    S.clicks[key] = (S.clicks[key] || 0) + 1;
    return S.clicks[key];
  }

  /** Pick the entry for click n from a 1-indexed bucket, clamping to the last. */
  function pick(bucket, n) {
    const keys = Object.keys(bucket).map(Number).sort((a, b) => a - b);
    const use  = keys.filter(k => k <= n).pop() ?? keys[0];
    return bucket[use];
  }

  // ═══════════════════════════════════════════════════════════════
  // CHOICE SYSTEM
  // ═══════════════════════════════════════════════════════════════
  /**
   * One-shot choice: the player picks a single option and the story moves on.
   * Nothing here re-opens the panel — Chapter 1 never asks you to exhaust a list.
   */
  function askOnce(cfg) {
    const overlay = document.getElementById('choiceOverlay');
    const btns    = document.getElementById('choiceButtons');
    const prompt  = document.getElementById('choicePrompt');
    const hint    = document.getElementById('choiceHint');

    prompt.textContent = cfg.prompt || 'DEINE REAKTION:';
    hint.textContent   = cfg.hint   || '';
    btns.innerHTML     = '';

    cfg.choices.forEach(c => {
      const btn = document.createElement('button');
      btn.className   = 'choice-btn' + (c.seen ? ' seen' : '');
      btn.textContent = c.label;
      btn.addEventListener('click', () => {
        c.seen = true;
        hideChoices();
        say(c.lines, () => { if (cfg.onPick) cfg.onPick(c.key); });
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
    const revisit = GameEngine.progress.isRevisit('ch1');
    card.classList.remove('fading');
    setTimeout(() => {
      card.classList.add('fading');
      setTimeout(() => {
        card.style.display = 'none';
        if (revisit) nachsuche(); else act1_hallEmpty();
      }, 700);
    }, revisit ? 900 : 2800);
  }

  // Coming back to a sector that has power again. First contact happened once
  // and does not happen twice: the empty hall, the KLONK and the eleven-minute
  // repair belong to that first walk-in and stay there. What is left is the
  // maintenance hall as the player made it — lit, wired, and with the inner
  // gate standing open towards the node.
  function nachsuche() {
    S.revisit      = true;
    S.metRobots    = true;
    S.klonkDone    = true;
    S.corridorOpen = true;
    S.p1Solved     = true;
    S.p2Solved     = true;
    S.sectorAwake  = true;
    setScene('room-a');
    setProgress(12);
    showRobots(true);
    try { GameEngine.music.play('ch1_ambient'); } catch (_) {}
    loadHallHotspots(true);
    GameEngine.progress.returnBar('ch1');
    say([
      { speaker:'SYSTEM', text:'SEKTOR 01 — WARTUNGSSEKTOR. Die Grundversorgung steht. Die Leitungen brummen leise vor sich hin.' },
      { speaker:'R-3MI',  text:'„Oh! Der Sektor, in dem alles angefangen hat."' },
      { speaker:'V-TGM',  text:'"It is a corridor with pipes."', subtitle:'Es ist ein Gang mit Rohren.' },
      { speaker:'R-3MI',  text:'„Es ist ein HISTORISCHER Gang mit Rohren."' },
      { speaker:'SYSTEM', text:'Das innere Tor steht offen. Dahinter geht es weiter zum Wartungsknoten.' },
    ]);
  }

  // ═══════════════════════════════════════════════════════════════
  // ACT 1 — SOMETHING IS HERE
  // The hall must read as empty first. No unit names, no portraits.
  // ═══════════════════════════════════════════════════════════════
  function act1_hallEmpty() {
    setScene('hall-empty');
    clearHotspots();
    showRobots(false);
    try { GameEngine.music.play('ch1_ambient'); } catch(_) {}

    say([
      { speaker:'SYSTEM', text:'Die Schleuse hinter dir ist zugefallen. Vor dir liegt die erste Halle der Anlage.' },
      { speaker:'SYSTEM', text:'Innen ist es noch stiller als draußen. Nicht friedlicher. Nur kontrollierter.' },
      { speaker:'SYSTEM', text:'Die Wände sind überwuchert, aber nicht vollständig zerstört. Unter den Ranken erkennst du alte Pfeile, Testnummern und verblasste Warnsymbole.' },
      { speaker:'SYSTEM', text:'Die Kalibrierungsanlage wirkt nicht verlassen. Sie wirkt angehalten.' },
    ], () => loadAct1Hotspots());
  }

  function loadAct1Hotspots() {
    clearHotspots();
    // ── set dressing: ceiling → walls → floor (unchanged room layout)
    addProp({ prop:'duct',   x:10, y:0,  w:56, h:7, cls:'prop-far' });
    addProp({ prop:'c1_worklight',  x:26, y:4,  w:11, h:8  });
    addProp({ prop:'c1_worklight',  x:58, y:4,  w:11, h:8  });
    addProp({ prop:'column', x:1,  y:14, w:7,  h:60 });
    addProp({ prop:'c1_valvepipe', x:9,  y:10, w:6,  h:50 });
    addProp({ prop:'ivy',    x:17, y:4,  w:9,  h:30, cls:'prop-far' });
    addProp({ prop:'ivy',    x:90, y:4,  w:10, h:40, cls:'prop-far' });
    addProp({ prop:'cables', x:70, y:6,  w:10, h:28, cls:'prop-far' });
    addProp({ prop:'crate',  x:64, y:58, w:14, h:15 });
    addProp({ prop:'barrel', x:88, y:64, w:8,  h:15 });

    // ── interactive: the evidence trail plus ordinary scenery
    addHotspot({ prop:'c1_logterminal', anim:'prop-flicker', x:31, y:40, w:13, h:26,
      label:'TERMINAL', aria:'Wartungsterminal untersuchen', fn:() => examineAct1('log') });
    addHotspot({ prop:'c1_conduitpanel', anim:'prop-flicker', x:64, y:36, w:12, h:11,
      label:'LEITUNGSPANEEL', aria:'Leitungspaneel untersuchen', fn:() => examineAct1('repair') });
    addHotspot({ prop:'c1_tool', x:19, y:78, w:16, h:8,
      label:'WERKZEUG', aria:'Werkzeug am Boden untersuchen', fn:() => examineAct1('tool') });
    addHotspot({ prop:'c1_testsign',  x:15, y:52, w:14, h:12,
      label:'TESTSCHILD', aria:'Testschild untersuchen', fn:() => examineAct1('sign') });
    addHotspot({ prop:'c1_sealeddoor',  x:80, y:24, w:12, h:38,
      label:'TÜR', aria:'Verschlossene Tür untersuchen', fn:() => examineAct1('door') });
    addHotspot({ prop:'c1_floorplates', x:42, y:74, w:20, h:13,
      label:'BODENPLATTEN', aria:'Bodenplatten untersuchen', fn:() => examineAct1('floor') });

    if (S.corridorOpen) addCorridorHotspot();
  }

  function addCorridorHotspot() {
    if (document.querySelector('.ch1-corridor')) return;   // idempotent
    addHotspot({ prop:'c1_corridor', cls:'ch1-corridor', x:46, y:24, w:14, h:30,
      label:'DUNKLER KORRIDOR', aria:'Dunklen Korridor betreten', fn:() => act2_distant() });
  }

  /** The one state change that lets Act 1 end. Never put this in a callback. */
  function openCorridor() {
    S.corridorOpen = true;
    addCorridorHotspot();
  }

  const ACT1_LINES = {
    log: {
      1: [
        { speaker:'SYSTEM', text:'Das Terminal ist schwarz, aber nicht tot. Auf Tastendruck zeigt es genau eine gespeicherte Zeile.' },
        { speaker:'SYSTEM', text:'WARTUNGSPROTOKOLL. LETZTER AUTOMATISCHER WARTUNGSZYKLUS: VOR 2.847 TAGEN.' },
        { speaker:'SYSTEM', text:'Seitdem hat sich hier offiziell nichts mehr bewegt.' },
      ],
      2: [
        { speaker:'SYSTEM', text:'WARTUNGSPROTOKOLL. LETZTER AUTOMATISCHER WARTUNGSZYKLUS: VOR 2.847 TAGEN.' },
        { speaker:'SYSTEM', text:'Das Wort „automatisch" steht auffällig weit vorne.' },
      ],
    },
    repair: {
      1: [
        { speaker:'SYSTEM', text:'An der Wand hängt ein geöffnetes Leitungspaneel. Zwei Kabel wurden aus ihrer Halterung genommen und neu zusammengesteckt.' },
        { speaker:'SYSTEM', text:'MANUELLE INTERVENTION ERKANNT. LEITUNG 03-B WURDE NEU VERBUNDEN.' },
        { speaker:'SYSTEM', text:'ZEITSTEMPEL: VOR 11 MINUTEN.' },
      ],
      2: [
        { speaker:'SYSTEM', text:'DIE VERBINDUNG IST IMPROVISIERT. NICHT BESONDERS ELEGANT.' },
        { speaker:'SYSTEM', text:'ABER FRISCH.' },
      ],
    },
    tool: {
      1: [
        { speaker:'SYSTEM', text:'Ein Werkzeug liegt auf dem Boden. Darauf klebt etwas, das einmal ein Namensschild gewesen sein könnte.' },
      ],
      2: [
        { speaker:'SYSTEM', text:'Die Oberfläche ist noch warm.' },
      ],
      3: [
        { speaker:'SYSTEM', text:'Immer noch warm.' },
      ],
    },
    sign: {
      1: [
        { speaker:'SYSTEM', text:'Auf einem alten Schild steht: TESTEN. MESSEN. VERBESSERN.' },
        { speaker:'SYSTEM', text:'Darunter hat jemand später etwas eingeritzt: NICHT ALLES VERBESSERT SICH.' },
      ],
    },
    door: {
      1: [
        { speaker:'SYSTEM', text:'Die Tür, durch die du gekommen bist, reagiert nicht mehr. Kein Griff. Kein Signal. Kein Rückweg.' },
        { speaker:'SYSTEM', text:'Das fühlt sich unnötig endgültig an.' },
      ],
      2: [
        { speaker:'SYSTEM', text:'Die Anlage war schon immer besser im Hineinlassen als im Herauslassen.' },
      ],
    },
    floor: {
      1: [
        { speaker:'SYSTEM', text:'Einige Bodenplatten sind verschoben. Nicht eingestürzt. Verschoben.' },
        { speaker:'SYSTEM', text:'Als wäre etwas Leichtes, aber Metallisches darübergesprungen.' },
      ],
    },
  };

  // The three pieces of evidence that carry Act 1's turn.
  const EVIDENCE = ['log', 'repair', 'tool'];

  function examineAct1(key) {
    const n = bump('a1_' + key);
    S.act1Seen[key] = n;

    // Self-heal: if the corridor is supposed to be open but the node is gone
    // for any reason, put it back rather than leaving the player stranded.
    if (S.corridorOpen) addCorridorHotspot();

    const lines = pick(ACT1_LINES[key], n);
    const distinct  = Object.keys(S.act1Seen).length;
    const evidence  = EVIDENCE.filter(k => S.act1Seen[k]).length;

    // What turns Act 1 is the evidence of recent activity — not click volume.
    // Optional scenery can never gate the trigger, and never substitutes for
    // it either. (With 3 evidence objects out of 6, the distinct>=5 failsafe
    // already implies at least two of them, so it cannot bypass the story.)
    const shouldKlonk = !S.klonkDone && (evidence >= 2 || distinct >= 5);

    say(lines, () => {
      if (shouldKlonk) ambientKlonk();
    });
  }

  /** The "wait, what?" beat — no jumpscare, no explanation. */
  function ambientKlonk() {
    if (S.klonkDone) return;
    S.klonkDone = true;
    setTimeout(() => {
      playSound('ch1_metal_jump_01.mp3');
      tone({ freq: 92, type:'sine', dur: 0.9, vol: 0.16, glideTo: 55 });
      try { GameEngine.fx.shake('#sceneHotspots'); } catch(_) {}

      // Open the way out BEFORE the beat plays. The lines below are
      // atmosphere; the corridor is progression, and progression must not
      // depend on a dialogue callback surviving — `klonkDone` is already
      // latched here, so losing the callback would strand the player in
      // Act 1 with no trigger left to fire.
      openCorridor();

      say([
        { speaker:'SYSTEM', text:'*KLONK.*' },
        { speaker:'SYSTEM', text:'Metallisches Klackern aus dem Nebenraum. Kurz. Dann nichts mehr.' },
        { speaker:'SYSTEM', text:'Es klang nicht, als wäre etwas heruntergefallen. Es klang, als hätte etwas aufgehört, sich zu bewegen.' },
      ]);
    }, 420);
  }

  // ═══════════════════════════════════════════════════════════════
  // ACT 2 — THE ENCOUNTER
  // ═══════════════════════════════════════════════════════════════
  function act2_distant() {
    clearHotspots();
    playSound('ch1_metal_jump_01.mp3');
    setScene('hall-robots-dist');

    say([
      { speaker:'SYSTEM', text:'Der Gang führt weiter in die Anlage. Auf einer erhöhten Plattform bewegt sich etwas.' },
      { speaker:'SYSTEM', text:'Zwei kleine Gestalten springen von einer gebrochenen Platte zur nächsten. Eine etwas größer. Eine deutlich kleiner.' },
      { speaker:'SYSTEM', text:'Nicht wie Tiere. Nicht wie Menschen. Zu präzise für Zufall. Zu verspielt für eine Maschine.' },
      { speaker:'SYSTEM', text:'Eine rote Linse blitzt auf. Dann eine grüne.' },
    ], () => {
      playSound('ch1_robot_appear_glitch.mp3');

      const wrapper = document.getElementById('sceneWrapper');
      wrapper.style.animation = 'none';
      wrapper.style.opacity = '0';
      setTimeout(() => {
        setScene('hall-robots-close');
        wrapper.style.opacity = '1';
        setTimeout(() => act2_hiii(), 300);
      }, 180);
    });
  }

  function act2_hiii() {
    say([
      { speaker:'SYSTEM',text:'Du blinzelst. Sie sind weg. Für genau eine Sekunde ist alles still.' },
      { speaker:'SYSTEM',text:'Dann hörst du direkt hinter dir ein viel zu fröhliches Geräusch.' },
      { speaker:'R-3MI', text:'„Hiii!"' },
      { speaker:'V-TGM', text:'"Hi there."', subtitle:'Hallo.' },
      { speaker:'SYSTEM',text:'Dein Körper entscheidet sich für eine sehr wissenschaftliche Reaktion: absolute Panik.' },
      { speaker:'SYSTEM',text:'MOBILE EINHEITEN ERKANNT.' },
      { speaker:'SYSTEM',text:'KLASSIFIKATION NICHT MÖGLICH.' },
    ], () => act2_reaction());
  }

  // ─── ONE genuine reaction choice. All options move forward. ────
  const REACTIONS = [
    {
      key:'who', label:'[ Wer zum Teufel seid ihr?! ]',
      lines:[
        { speaker:'R-3MI', text:'„R-3MI!"' },
        { speaker:'V-TGM', text:'"V-TGM."', subtitle:'V-TGM.' },
        { speaker:'R-3MI', text:'„Siehst du? Sehr effiziente Vorstellung."' },
        { speaker:'V-TGM', text:'"You screamed through most of it."', subtitle:'Du hast durch den größten Teil davon geschrien.' },
      ],
    },
    {
      key:'killed', label:'[ Ihr habt mich gerade fast umgebracht. ]',
      lines:[
        { speaker:'R-3MI', text:'„Aber nur fast!"' },
        { speaker:'V-TGM', text:'"That is not helping."', subtitle:'Das hilft nicht.' },
        { speaker:'R-3MI', text:'„Ich bin R-3MI. Das ist V-TGM. Und wir üben gerade Erstkontakt."' },
        { speaker:'V-TGM', text:'"Badly."', subtitle:'Schlecht.' },
      ],
    },
    {
      key:'hiii', label:'[ ...Hiii? ]',
      lines:[
        { speaker:'R-3MI', text:'„Hiii! :D"' },
        { speaker:'V-TGM', text:'"Oh no. There are two of you now."', subtitle:'Oh nein. Jetzt gibt es zwei von der Sorte.' },
        { speaker:'R-3MI', text:'„R-3MI, übrigens. Und das ist V-TGM."' },
        { speaker:'R-3MI', text:'„Sie freut sich auch. Innerlich. Sehr weit innerlich."' },
      ],
    },
    {
      key:'subject', label:'[ Seid ihr auch Testpersonen? ]',
      lines:[
        { speaker:'SYSTEM', text:'Eine kurze Pause.' },
        { speaker:'V-TGM', text:'"Something like that."', subtitle:'So etwas in der Art.' },
        { speaker:'R-3MI', text:'„R-3MI! Sehr erfreut! Wir sollten uns unbedingt über etwas anderes unterhalten."' },
        { speaker:'V-TGM', text:'"V-TGM."', subtitle:'V-TGM.' },
      ],
    },
  ];

  function act2_reaction() {
    askOnce({
      prompt: 'DEINE REAKTION:',
      hint:   'WÄHLE EINE.',
      choices: REACTIONS,
      onPick: () => act2_minimumExposition(),
    });
  }

  /** Only what the player needs to keep going. Everything else is optional. */
  function act2_minimumExposition() {
    S.metRobots = true;
    showRobots(true);

    say([
      { speaker:'R-3MI', text:'„Wir waren schon hier, als alles ausging."' },
      { speaker:'V-TGM', text:'"We\'ve been trying to keep parts of the facility operational."', subtitle:'Wir haben versucht, Teile der Anlage funktionsfähig zu halten.' },
      { speaker:'R-3MI', text:'„Betonung auf versuchen."' },
      { speaker:'SYSTEM', text:'Sie stehen einfach da. Rotes Licht. Grünes Licht. Zu freundlich für diesen Ort. Oder genau freundlich genug.' },
    ], () => act3_maintenanceHall());
  }

  // ═══════════════════════════════════════════════════════════════
  // OPTIONAL CONVERSATIONS — reward curiosity, never block progress
  // ═══════════════════════════════════════════════════════════════
  const TALK = {
    r3mi: [
      { key:'howlong', label:'[ Wie lange seid ihr schon hier? ]',
        lines:[
          { speaker:'R-3MI', text:'„Lange genug, um jede Schraube hier persönlich zu hassen."' },
        ],
        again:[
          { speaker:'R-3MI', text:'„Schraube 4-C weiß, was sie getan hat."' },
        ] },
      { key:'what', label:'[ Was ist hier passiert? ]',
        lines:[
          { speaker:'R-3MI', text:'„Anlage aus. Türen zu. Licht weg."' },
          { speaker:'R-3MI', text:'„War kein besonders guter Dienstag."' },
          { speaker:'V-TGM', text:'"It was Thursday."', subtitle:'Es war ein Donnerstag.' },
          { speaker:'R-3MI', text:'„Noch schlimmer."' },
        ] },
      { key:'you', label:'[ Was machst du hier eigentlich? ]',
        lines:[
          { speaker:'R-3MI', text:'„Ich halte Dinge am Laufen. Manchmal repariere ich sie sogar dabei."' },
          { speaker:'V-TGM', text:'"Manchmal."', subtitle:'Manchmal.' },
          { speaker:'R-3MI', text:'„Sie hat gerade Deutsch gesprochen. Das macht sie nur, wenn sie mich ärgern will."' },
        ] },
    ],
    vtgm: [
      { key:'leave', label:'[ Warum seid ihr nicht gegangen? ]',
        lines:[
          { speaker:'V-TGM', text:'"We couldn\'t."', subtitle:'Wir konnten nicht.' },
          { speaker:'SYSTEM', text:'Eine kurze Pause.' },
          { speaker:'V-TGM', text:'"Some doors remained locked after shutdown."', subtitle:'Manche Türen blieben nach der Abschaltung verriegelt.' },
        ] },
      { key:'role', label:'[ Und du? Was machst du? ]',
        lines:[
          { speaker:'V-TGM', text:'"I watch. I keep track of what changes."', subtitle:'Ich beobachte. Ich merke mir, was sich verändert.' },
          { speaker:'R-3MI', text:'„Das klingt langweiliger, als es ist."' },
          { speaker:'V-TGM', text:'"It is exactly as boring as it sounds."', subtitle:'Es ist genau so langweilig, wie es klingt.' },
        ] },
      { key:'him', label:'[ Ist er immer so? ]',
        lines:[
          { speaker:'V-TGM', text:'"Yes."', subtitle:'Ja.' },
          { speaker:'R-3MI', text:'„Ich stehe direkt daneben!"' },
          { speaker:'V-TGM', text:'"I know."', subtitle:'Ich weiß.' },
        ] },
    ],
  };

  function clickRobot(who) {
    if (!S.metRobots) return;
    // Same reason as the scene hotspots: talking over a running dialogue
    // would discard the continuation it is holding (see `guarded`).
    if (dialogueBusy()) { try { GameEngine.dialogue.advance(); } catch(_) {} return; }
    const topics = TALK[who] || [];
    const choices = topics.map(t => {
      const seen = !!S.talkSeen[who + ':' + t.key];
      return {
        key: t.key,
        label: t.label,
        seen,
        lines: (seen && t.again) ? t.again : t.lines,
      };
    });

    choices.push({
      key: '__leave', label:'[ Nichts. Weiter. ]', seen:false,
      lines: [], // handled below — no dialogue, just close
    });

    askOnce({
      prompt: who === 'r3mi' ? 'R-3MI ANSPRECHEN:' : 'V-TGM ANSPRECHEN:',
      hint:   'OPTIONAL.',
      choices,
      onPick: (key) => {
        if (key === '__leave') return;
        S.talkSeen[who + ':' + key] = true;
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // ACT 3 — FIRST COLLABORATION
  // ═══════════════════════════════════════════════════════════════
  function act3_maintenanceHall() {
    setScene('room-a');
    clearHotspots();
    showRobots(true);

    say([
      { speaker:'SYSTEM', text:'Sie führen dich nicht. Sie laufen einfach los und gehen davon aus, dass du mitkommst.' },
      { speaker:'SYSTEM', text:'Der nächste Raum ist die eigentliche Wartungshalle. Hier hängen mehr Kabel als Ranken.' },
      { speaker:'R-3MI', text:'„Also. Solange du sowieso hier bist."' },
      { speaker:'V-TGM', text:'"Don\'t."', subtitle:'Lass es.' },
      { speaker:'R-3MI', text:'„Ich mache gar nichts. Ich schaue nur kurz nach der Grundversorgung."' },
    ], () => act3_r3miBreaksIt());
  }

  /** The puzzle arrives as a maintenance problem, not as "PUZZLE ONE". */
  function act3_r3miBreaksIt() {
    // Scenery only for now — the room shouldn't accept clicks during the
    // scripted beat, or a stray tap would talk over it.
    loadHallHotspots(false);

    setTimeout(() => {
      playSound('ch1_metal_jump_01.mp3');
      tone({ freq: 140, type:'square', dur: 0.12, vol: 0.13 });
      try { GameEngine.fx.shake('#sceneHotspots'); } catch(_) {}

      say([
        { speaker:'SYSTEM', text:'*KLONK*' },
        { speaker:'SYSTEM', text:'*SPARK*' },
        { speaker:'V-TGM', text:'"You made it worse."', subtitle:'Du hast es schlimmer gemacht.' },
        { speaker:'R-3MI', text:'„Ich habe den Fehlerbereich präzisiert."' },
        { speaker:'V-TGM', text:'"You broke another pipe."', subtitle:'Du hast noch ein Rohr kaputt gemacht.' },
        { speaker:'R-3MI', text:'„…den Fehlerbereich sehr präzisiert."' },
        { speaker:'SYSTEM', text:'VERIFIZIERTE TESTSIGNATUR ERKANNT.' },
        { speaker:'R-3MI', text:'„Siehst du? Qualifiziert!"' },
        { speaker:'V-TGM', text:'"That is the facility talking, not an endorsement."', subtitle:'Das ist die Anlage, keine Empfehlung.' },
        { speaker:'R-3MI', text:'„Leitung A muss nach C. Leitung B darf dabei nicht—"' },
        { speaker:'V-TGM', text:'"Don\'t explain it incorrectly."', subtitle:'Erklär es nicht falsch.' },
        { speaker:'R-3MI', text:'„Ich war bei der spannenden Version."' },
      ], () => openPuzzle1());
    }, 600);
  }

  function loadHallHotspots(interactive = true) {
    clearHotspots();
    // ── set dressing (unchanged room layout)
    addProp({ prop:'duct',    x:14, y:0,  w:52, h:7, cls:'prop-far' });
    addProp({ prop:'c1_worklight',   x:40, y:4,  w:12, h:8  });
    addProp({ prop:'c1_worklight',   x:8,  y:5,  w:10, h:7  });
    addProp({ prop:'column',  x:88, y:12, w:8,  h:58 });
    addProp({ prop:'cables',  x:56, y:6,  w:9,  h:26, cls:'prop-far' });
    addProp({ prop:'monitors',x:36, y:32, w:17, h:15 });
    addProp({ prop:'ivy',     x:0,  y:6,  w:9,  h:28, cls:'prop-far' });
    addProp({ prop:'crate',   x:26, y:62, w:15, h:16 });
    addProp({ prop:'railing', x:56, y:70, w:24, h:11 });
    addProp({ prop:'debris',  x:66, y:80, w:15, h:8  });
    if (!interactive) {
      // draw the clickable objects as plain scenery so the room still looks full
      addProp({ prop:'c1_hallterminal', anim:'prop-flicker', x:62, y:44, w:13, h:26 });
      addProp({ prop:'c1_innergate',    x:76, y:24, w:12, h:38 });
      addProp({ prop:'c1_testsign',     x:10, y:56, w:14, h:12 });
      addProp({ prop:'c1_wallscratch',  x:12, y:38, w:18, h:13 });
      addProp({ prop:'c1_barrel',       x:44, y:64, w:8,  h:15 });
      return;
    }
    // ── interactive
    addHotspot({ prop:'c1_hallterminal', anim:'prop-flicker', x:62, y:44, w:13, h:26,
      label:'TERMINAL', aria:'Terminal untersuchen', fn:() => clickHall('terminal') });
    addHotspot({ prop:'c1_innergate',    x:76, y:24, w:12, h:38,
      label:'INNERES TOR', aria:'Inneres Tor untersuchen', fn:() => clickHall('gate') });
    addHotspot({ prop:'c1_testsign',     x:10, y:56, w:14, h:12,
      label:'TESTSCHILD', aria:'Testschild untersuchen', fn:() => clickHall('sign') });
    addHotspot({ prop:'c1_wallscratch',  x:12, y:38, w:18, h:13,
      label:'WANDKRATZER', aria:'Kratzer in der Wand untersuchen', fn:() => clickHall('scratch') });
    // deliberately pointless — clicking it is its own punchline
    addHotspot({ prop:'c1_barrel',       x:44, y:64, w:8,  h:15,
      label:'FASS', aria:'Fass untersuchen', fn:() => clickHall('barrel') });
  }

  const HALL_LINES = {
    terminal: {
      1: [
        { speaker:'SYSTEM', text:'Der Bildschirm ist schwarz, aber nicht leblos. Eine rote LED blinkt unter dem Rahmen.' },
        { speaker:'V-TGM',  text:'"It cannot wake without routed power."', subtitle:'Es kann ohne geleitete Energie nicht starten.' },
      ],
      2: [
        { speaker:'SYSTEM', text:'Das Terminal läuft jetzt. Es sieht selbstzufrieden aus, soweit ein Terminal das kann.' },
        { speaker:'R-3MI',  text:'„Ich finde, es wirkt dankbar."' },
        { speaker:'V-TGM',  text:'"It is a terminal."', subtitle:'Es ist ein Terminal.' },
        { speaker:'R-3MI',  text:'„Terminals haben Gefühle. Schlechte meistens."' },
      ],
    },
    scratch: {
      1: [
        { speaker:'SYSTEM', text:'Eine Linie wurde in die Wand geritzt. Sie beginnt sauber, wird dann unruhiger und endet plötzlich.' },
        { speaker:'R-3MI',  text:'„Alte Kratzer. Die Anlage hat viele davon."' },
        { speaker:'V-TGM',  text:'"Some scratches are not accidental."', subtitle:'Manche Kratzer sind nicht zufällig.' },
        { speaker:'R-3MI',  text:'„Stimmt. Manche sind dekorativ."' },
      ],
    },
    sign: {
      1: [
        { speaker:'SYSTEM', text:'TESTEN. MESSEN. VERBESSERN. Du bist dir nicht sicher, ob das ein Motto oder eine Drohung ist.' },
        { speaker:'R-3MI',  text:'„Beides! Effizientes Design."' },
      ],
      2: [
        { speaker:'V-TGM',  text:'"Improve what?"', subtitle:'Was verbessern?' },
        { speaker:'R-3MI',  text:'„Die Stimmung, hoffentlich."' },
      ],
    },
    gate: {
      1: [
        { speaker:'SYSTEM', text:'Das Tor führt tiefer in die Anlage. Daneben leuchtet: GRUNDVERSORGUNG FEHLT.' },
        { speaker:'V-TGM',  text:'"Power first. Door after."', subtitle:'Erst Strom. Dann Tür.' },
        { speaker:'R-3MI',  text:'„Sie ist sehr gut darin, traurige Dinge kurz zu sagen."' },
      ],
      2: [
        { speaker:'SYSTEM', text:'Die Tür bleibt geschlossen.' },
        { speaker:'R-3MI',  text:'„Sie ignoriert uns."' },
      ],
    },
    barrel: {
      1: [
        { speaker:'SYSTEM', text:'Ein Fass. Verschlossen. Unbeschriftet. Vollkommen unauffällig.' },
        { speaker:'R-3MI',  text:'„Warum klickst du überhaupt DA drauf?!"' },
      ],
      2: [
        { speaker:'V-TGM',  text:'"Let them. It is the most harmless thing in this room."', subtitle:'Lass sie. Es ist das Harmloseste in diesem Raum.' },
        { speaker:'R-3MI',  text:'„Das stimmt sogar. Beunruhigenderweise."' },
      ],
    },
  };

  function clickHall(key) {
    const n = bump('hall_' + key);

    // "Powered" variants once the sector has electricity again.
    if (key === 'terminal' && S.p1Solved) {
      if (repeatReaction('hall_' + key, n)) return;
      say(HALL_LINES.terminal[2]);
      return;
    }
    if (key === 'gate' && S.p1Solved) {
      say([
        { speaker:'SYSTEM', text:'Das innere Tor steht jetzt einen Spalt offen. Dahinter wird die Anlage lauter.' },
        { speaker:'R-3MI',  text:'„Nach dir. Ich war schon dreimal drin."' },
      ], () => act3_toNode());
      return;
    }

    if (repeatReaction('hall_' + key, n)) return;
    const bucket = HALL_LINES[key];
    if (bucket) say(pick(bucket, n));
  }

  /** §20 — examining the same thing too often gets noticed. */
  function repeatReaction(key, n) {
    if (n < 4 || !S.metRobots) return false;
    if (S.clicks['react_' + key]) return false;
    S.clicks['react_' + key] = 1;
    say([
      { speaker:'V-TGM', text:'"It has not changed."', subtitle:'Es hat sich nicht verändert.' },
      { speaker:'R-3MI', text:'„Noch nicht."' },
      { speaker:'V-TGM', text:'"R-3MI."', subtitle:'R-3MI.' },
      { speaker:'R-3MI', text:'„Was? Ich bleibe optimistisch."' },
    ]);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPE ENGINE (shared by both repairs)
  // Direction sets per tile type and rotation. A grid is "connected"
  // when a flood-fill from the source reaches the target — the answer
  // is never stored anywhere.
  // ═══════════════════════════════════════════════════════════════
  const CONN = {
    0: [[], [], [], []],
    1: [['N','S'],['E','W'],['N','S'],['E','W']],
    2: [['N','E'],['E','S'],['S','W'],['W','N']],
    3: [['N','E','S'],['E','S','W'],['S','W','N'],['W','N','E']],
    4: [['N','E','S','W'],['N','E','S','W'],['N','E','S','W'],['N','E','S','W']],
  };

  function bfsReach(grid, sr, sc) {
    const ROWS = grid.length, COLS = grid[0].length;
    const visited = new Set();
    const queue = [[sr, sc]];
    const OPP = { N:'S', S:'N', E:'W', W:'E' };
    const DR  = { N:-1, S:1, E:0, W:0 };
    const DC  = { N:0,  S:0, E:1, W:-1 };

    while (queue.length) {
      const [r, c] = queue.shift();
      const key = `${r},${c}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const dirs = CONN[grid[r][c].type][grid[r][c].rot];
      dirs.forEach(d => {
        const nr = r + DR[d], nc = c + DC[d];
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
        const nDirs = CONN[grid[nr][nc].type][grid[nr][nc].rot];
        if (nDirs.includes(OPP[d])) queue.push([nr, nc]);
      });
    }
    return visited;
  }

  /**
   * Build a scrambled grid. `baseRot` is only the orientation the scrambler
   * offsets from, so every tile is guaranteed reachable by rotation; it is
   * never used to decide whether the player has finished.
   */
  function buildGrid(types, baseRot, fixed) {
    return types.map((row, r) => row.map((type, c) => {
      const isFixed = !!fixed[r][c];
      const base    = baseRot[r][c];
      return {
        type,
        rot: isFixed ? base : (base + 1 + Math.floor(Math.random() * 2)) % 4,
        fixed: isFixed,
      };
    }));
  }

  /** Scramble again if we happened to hand the player a finished grid. */
  function scramble(types, baseRot, fixed, isDone) {
    let grid, guard = 0;
    do { grid = buildGrid(types, baseRot, fixed); } while (isDone(grid) && ++guard < 40);
    return grid;
  }

  function renderGrid(gridEl, grid, decorate, onRotate) {
    gridEl.innerHTML = '';
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        const tile = document.createElement('div');
        tile.className = 'pipe-tile';
        if (cell.fixed) tile.classList.add('fixed');

        decorate(tile, r, c);

        const dirs = CONN[cell.type][cell.rot];
        if (dirs.length) {
          const center = document.createElement('div');
          center.className = 'pipe-center'; tile.appendChild(center);
          dirs.forEach(d => {
            const arm = document.createElement('div');
            arm.className = `pipe-arm arm-${d.toLowerCase()}`;
            tile.appendChild(arm);
          });
        }
        if (!cell.fixed) tile.addEventListener('click', () => onRotate(r, c));
        gridEl.appendChild(tile);
      }
    }
  }

  function spinTile(gridEl, idx) {
    const tile = gridEl.children[idx];
    if (!tile) return;
    tile.classList.add('rotating');
    setTimeout(() => tile.classList.remove('rotating'), 160);
  }

  // ═══════════════════════════════════════════════════════════════
  // REPAIR 1 — route power back to the terminal
  // ═══════════════════════════════════════════════════════════════
  const P1_TYPES = [
    [4, 1, 2, 1],
    [0, 0, 1, 0],
    [1, 1, 2, 2],
    [0, 0, 0, 4],
  ];
  const P1_BASE_ROT = [
    [0, 1, 2, 1],
    [0, 0, 0, 0],
    [1, 1, 0, 2],
    [0, 0, 0, 0],
  ];
  const P1_FIXED = [
    [1, 0, 0, 0],
    [1, 1, 0, 1],
    [0, 0, 0, 0],
    [1, 1, 1, 1],
  ];
  const P1_SRC = [0, 0];
  const P1_DST = '3,3';

  let p1Grid = [];

  const p1Done = g => bfsReach(g, P1_SRC[0], P1_SRC[1]).has(P1_DST);

  function initP1Grid() {
    p1Grid = scramble(P1_TYPES, P1_BASE_ROT, P1_FIXED, p1Done);
  }

  function renderP1() {
    const gridEl  = document.getElementById('puzzle1Grid');
    const reached = bfsReach(p1Grid, P1_SRC[0], P1_SRC[1]);
    renderGrid(gridEl, p1Grid, (tile, r, c) => {
      const key = `${r},${c}`;
      const isSource   = r === P1_SRC[0] && c === P1_SRC[1];
      const isTerminal = key === P1_DST;
      if (isSource)   tile.classList.add('source-w');
      if (isTerminal) tile.classList.add('terminal');
      if (reached.has(key) && !isSource) tile.classList.add('conn');
    }, rotateP1Tile);
  }

  function rotateP1Tile(r, c) {
    if (S.p1Solved) return;
    p1Grid[r][c].rot = (p1Grid[r][c].rot + 1) % 4;
    S.rotations.p1++;
    spinTile(document.getElementById('puzzle1Grid'), r * 4 + c);
    renderP1();
    checkP1();
  }

  function checkP1() {
    const status = document.getElementById('puzzle1Status');
    if (p1Done(p1Grid)) {
      status.textContent = 'VERBINDUNG HERGESTELLT.';
      status.className   = 'puzzle-status sys-text ok';
      S.p1Solved = true;
      const fast = S.rotations.p1 <= 8;
      setTimeout(() => solvePuzzle1(fast), 700);
    } else {
      status.textContent = 'LEITUNG UNTERBROCHEN.';
      status.className   = 'puzzle-status sys-text';
      reactP1();
    }
  }

  /** §13 — occasional, surprising, never spam. Each beat fires once. */
  function reactP1() {
    const n = S.rotations.p1;
    if (n === 4 && !S.react.p1.first) {
      S.react.p1.first = true;
      say([{ speaker:'R-3MI', text:'„Das sah absichtlich aus."' }]);
    } else if (n === 14 && !S.react.p1.stuck) {
      S.react.p1.stuck = true;
      say([
        { speaker:'V-TGM', text:'"Ignore him. Look at where the pressure actually has to go."', subtitle:'Ignorier ihn. Schau, wo der Druck tatsächlich hin muss.' },
      ]);
    }
  }

  function openPuzzle1() {
    S.hints.active = 'p1';
    S.hints.step   = 0;
    updateHintBar();
    initP1Grid();
    renderP1();
    checkP1();
    document.getElementById('puzzle1Modal').classList.remove('hidden');
    document.getElementById('hintBar').classList.remove('hidden');
  }

  function resetPuzzle1() {
    if (S.p1Solved) return;
    initP1Grid(); renderP1(); checkP1();
  }

  function solvePuzzle1(fast) {
    renderP1();
    document.getElementById('puzzle1Modal').classList.add('hidden');
    document.getElementById('hintBar').classList.add('hidden');
    playSound('ch1_terminal_power_on.mp3');
    try { GameEngine.fx.flash('rgba(46,207,98,0.22)'); } catch(_) {}
    setProgress(5);
    S.sectorAwake = true;

    const intro = fast
      ? [
          { speaker:'R-3MI', text:'„...okay."' },
          { speaker:'SYSTEM',text:'Kurze Pause.' },
          { speaker:'R-3MI', text:'„Ich wollte das genauso machen."' },
          { speaker:'V-TGM', text:'"No you didn\'t."', subtitle:'Nein, wolltest du nicht.' },
          { speaker:'R-3MI', text:'„Ich hatte dafür eine ganze Erklärung vorbereitet."' },
        ]
      : [
          { speaker:'R-3MI', text:'„Siehst du? Kaum gefährlich."' },
          { speaker:'V-TGM', text:'"That was stable enough."', subtitle:'Das war stabil genug.' },
          { speaker:'R-3MI', text:'„Stabil genug ist hier praktisch Luxus."' },
        ];

    say([
      { speaker:'SYSTEM', text:'GRUNDVERSORGUNG HERGESTELLT. TERMINAL 01 AKTIV.' },
      { speaker:'SYSTEM', text:'Ein dünnes Licht läuft durch die Wandlinien. Erst rot. Dann grün. Die Halle atmet elektrisch ein.' },
      ...intro,
      { speaker:'SYSTEM', text:'PERSONENREGISTER: 3 AKTIVE SIGNATUREN.' },
      { speaker:'R-3MI',  text:'„Drei! Das ist die höchste Zahl seit Jahren."' },
      { speaker:'V-TGM',  text:'"It is also the smallest number that counts as a group."', subtitle:'Es ist auch die kleinste Zahl, die als Gruppe zählt.' },
      { speaker:'SYSTEM', text:'ZUGANG ZUM WARTUNGSKNOTEN FREIGEGEBEN.' },
      { speaker:'SYSTEM', text:'Das innere Tor entriegelt sich. Es hat keine Eile.' },
    ], () => {
      // §15 — let the room breathe. The player leaves when they want to.
      loadHallHotspots();
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // WARTUNGSKNOTEN
  // ═══════════════════════════════════════════════════════════════
  function act3_toNode() {
    setScene('corridor-ab');
    clearHotspots();

    say([
      { speaker:'SYSTEM', text:'Das innere Tor öffnet sich nur halb. R-3MI schlüpft sofort darunter hindurch.' },
      { speaker:'V-TGM', text:'"After you."', subtitle:'Nach dir.' },
      { speaker:'R-3MI', text:'„Nicht nach mir, ich bin schon hier!"' },
      { speaker:'V-TGM', text:'"Obviously."', subtitle:'Offensichtlich.' },
      { speaker:'SYSTEM', text:'Du duckst dich unter dem Tor hindurch. Dahinter wird die Anlage lauter.' },
    ], () => scene_node());
  }

  function scene_node() {
    setScene('room-b');
    clearHotspots();

    say([
      { speaker:'SYSTEM', text:'Der Wartungsknoten liegt tiefer in der Anlage. Weniger Grün. Weniger Natur. Dafür mehr Maschine.' },
      { speaker:'SYSTEM', text:'Kabel laufen in geordneten Bahnen durch die Wände. Einige leuchten schwach. Andere zucken, als würden sie träumen.' },
      { speaker:'R-3MI',  text:'„Willkommen im Wartungsknoten. Nicht schön, aber wichtig."' },
      { speaker:'V-TGM',  text:'"This room decides what can speak to what."', subtitle:'Dieser Raum entscheidet, was mit was sprechen darf.' },
      // §16 — they hang back this time. The player gets to look first.
      { speaker:'R-3MI',  text:'„Wir sagen diesmal nichts. Schau dich in Ruhe um."' },
      { speaker:'V-TGM',  text:'"He will last about forty seconds."', subtitle:'Er hält ungefähr vierzig Sekunden durch.' },
    ], () => loadNodeHotspots());
  }

  function loadNodeHotspots() {
    clearHotspots();
    // ── set dressing (unchanged room layout)
    addProp({ prop:'duct',    x:16, y:0,  w:52, h:7, cls:'prop-far' });
    addProp({ prop:'c1_worklight',   x:42, y:4,  w:12, h:8  });
    addProp({ prop:'monitors',x:20, y:20, w:18, h:16 });
    addProp({ prop:'cables',  x:74, y:6,  w:9,  h:24, cls:'prop-far' });
    addProp({ prop:'column',  x:0,  y:10, w:7,  h:62 });
    addProp({ prop:'column',  x:93, y:10, w:7,  h:62 });
    addProp({ prop:'railing', x:22, y:66, w:26, h:12 });
    addProp({ prop:'barrel',  x:64, y:62, w:8,  h:15 });
    addProp({ prop:'debris',  x:48, y:82, w:15, h:8  });
    // ── interactive. The two conduits are the units' own signal lines:
    //    R-3MI's runs green, V-TGM's runs red (canonical unit colours).
    addHotspot({ prop:'c1_nodeconsole', x:39, y:44, w:22, h:23,
      label:'ZENTRALE KONSOLE', aria:'Zentrale Konsole untersuchen', fn:() => clickNode('console') });
    addHotspot({ prop:'c1_conduit_red', cls:'prop-red',   x:9,  y:24, w:9, h:46,
      label:'ROTE LEITUNG', aria:'Rote Leitung untersuchen', fn:() => clickNode('red') });
    addHotspot({ prop:'c1_conduit_green', cls:'prop-green', x:83, y:24, w:9, h:46,
      label:'GRÜNE LEITUNG', aria:'Grüne Leitung untersuchen', fn:() => clickNode('green') });
    addHotspot({ prop:'c1_sectordoor',    x:62, y:12, w:13, h:32,
      label:'SEKTOR-02-TÜR', aria:'Tür zu Sektor 02 untersuchen', fn:() => clickNode('door') });
    addHotspot({ prop:'c1_vent',    x:82, y:74, w:12, h:12,
      label:'LÜFTUNGSSCHACHT', aria:'Lüftungsschacht untersuchen', fn:() => clickNode('vent') });
    addHotspot({ prop:'c1_poster',  x:24, y:38, w:12, h:22,
      label:'ALTES POSTER', aria:'Altes Poster untersuchen', fn:() => clickNode('poster') });
  }

  const NODE_LINES = {
    console: {
      1: [
        { speaker:'SYSTEM', text:'Die zentrale Konsole ist aktiv, aber gesperrt. Auf dem Bildschirm steht: HILFSPROTOKOLL NICHT KALIBRIERT.' },
        { speaker:'SYSTEM', text:'Zwei Signalwege laufen hier zusammen. Beide müssen getrennt und sauber ankommen.' },
      ],
    },
    red: {
      1: [
        { speaker:'SYSTEM', text:'Eine rote Leitung läuft vom Boden bis zur Konsole. Sie pulsiert in einem unruhigen Rhythmus.' },
        { speaker:'V-TGM',  text:'"That one is mine."', subtitle:'Die gehört mir.' },
        { speaker:'R-3MI',  text:'„Sie pulsiert völlig undiszipliniert. Das passt überhaupt nicht zu dir."' },
        { speaker:'V-TGM',  text:'"I know. It is the one thing about me that panics."', subtitle:'Ich weiß. Sie ist das Einzige an mir, das in Panik gerät.' },
      ],
    },
    green: {
      1: [
        { speaker:'SYSTEM', text:'Eine grüne Leitung führt sauber an der Wand entlang. Im Vergleich zur roten wirkt sie fast höflich.' },
        { speaker:'R-3MI',  text:'„Und die hier ist meine. Ordentlich. Höflich. Vorbildlich."' },
        { speaker:'V-TGM',  text:'"It is the calmest thing about you."', subtitle:'Sie ist das Ruhigste an dir.' },
        { speaker:'R-3MI',  text:'„Das nehme ich als Kompliment."' },
      ],
    },
    poster: {
      1: [
        { speaker:'SYSTEM', text:'Auf einem alten Poster steht: HINWEISE SIND HILFE, KEINE LÖSUNGEN. Darunter: DENK SELBST. ABER NICHT ALLEIN.' },
        { speaker:'R-3MI',  text:'„Das ist überraschend nett für ein Poster aus dieser Anlage."' },
        { speaker:'V-TGM',  text:'"It is also an instruction."', subtitle:'Es ist auch eine Anweisung.' },
      ],
    },
    door: {
      1: [
        { speaker:'SYSTEM', text:'Die Tür ist deutlich stabiler als die erste. Daneben: SEKTOR 02 — WARTUNGSGARTEN. ZUGANG NACH HILFSPROTOKOLL-KALIBRIERUNG.' },
        { speaker:'R-3MI',  text:'„Wartungsgarten. Oh. Sie wird sich freuen."' },
        { speaker:'V-TGM',  text:'"She?"', subtitle:'Sie?' },
        { speaker:'R-3MI',  text:'„Niemand. Nichts. Ein völlig normaler Garten ohne Persönlichkeit."' },
        { speaker:'R-3MI',  text:'„Weiter!"' },
      ],
      2: [
        { speaker:'SYSTEM', text:'Die Tür bleibt verschlossen.' },
      ],
    },
    vent: {
      1: [
        { speaker:'SYSTEM', text:'Ein kleiner Lüftungsschacht sitzt tief in der Wand. Er ist zu eng für dich.' },
        { speaker:'R-3MI',  text:'„Da passt niemand rein."' },
        { speaker:'V-TGM',  text:'"Not now."', subtitle:'Jetzt nicht.' },
        { speaker:'R-3MI',  text:'„Genau. Nicht jetzt. Sehr normale Formulierung."' },
      ],
      2: [
        { speaker:'SYSTEM', text:'Der Schacht bleibt dunkel.' },
        { speaker:'V-TGM',  text:'"Something moved."', subtitle:'Etwas hat sich bewegt.' },
        { speaker:'R-3MI',  text:'„Staub. Staub bewegt sich. Sehr lebendiger Staub."' },
      ],
    },
  };

  function clickNode(key) {
    const n = bump('node_' + key);

    if (key === 'console' && S.revisit) {
      say([
        { speaker:'SYSTEM', text:'HILFSPROTOKOLL KALIBRIERT. BEIDE SIGNALWEGE STABIL.' },
        { speaker:'V-TGM',  text:'"Still separate."', subtitle:'Immer noch getrennt.' },
        { speaker:'R-3MI',  text:'„Wie es sich gehört."' },
      ]);
      return;
    }
    if (key === 'console' && !S.p2Solved) {
      say(NODE_LINES.console[1], () => openPuzzle2());
      return;
    }
    if (key === 'door' && S.revisit) {
      say([
        { speaker:'SYSTEM', text:'SEKTOR 02 — WARTUNGSGARTEN. HILFSPROTOKOLL KALIBRIERT. DURCHGANG FREI.' },
        { speaker:'R-3MI',  text:'„Die steht jetzt einfach offen. Ich finde das immer noch großartig."' },
        { speaker:'V-TGM',  text:'"It is a door."', subtitle:'Es ist eine Tür.' },
        { speaker:'R-3MI',  text:'„Es ist eine ÜBERZEUGTE Tür."' },
      ]);
      return;
    }
    if (key === 'door' && S.p2Solved) { finishChapter(); return; }

    if (repeatReaction('node_' + key, n)) return;
    const bucket = NODE_LINES[key];
    if (bucket) say(pick(bucket, n));
  }

  // ═══════════════════════════════════════════════════════════════
  // REPAIR 2 — two signal paths that must not touch
  // ═══════════════════════════════════════════════════════════════
  const P2_TYPES = [
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [2, 2, 2, 2],
    [0, 1, 1, 0],
  ];
  const P2_BASE_ROT = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 2, 1, 3],
    [0, 0, 0, 0],
  ];
  const P2_FIXED = [
    [1, 0, 0, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 1, 1, 0],
  ];

  // "A" is R-3MI's line (renders green), "B" is V-TGM's (renders red).
  const P2_SRC_A = [0, 0], P2_DST_A = '3,1';
  const P2_SRC_B = [0, 3], P2_DST_B = '3,2';

  let p2Grid = [];

  function p2Evaluate(g) {
    const a = bfsReach(g, P2_SRC_A[0], P2_SRC_A[1]);
    const b = bfsReach(g, P2_SRC_B[0], P2_SRC_B[1]);
    const bridged = [...a].some(t => b.has(t)) || a.has(P2_DST_B) || b.has(P2_DST_A);
    return { a, b, bridged, okA: a.has(P2_DST_A), okB: b.has(P2_DST_B) };
  }
  const p2Done = g => { const e = p2Evaluate(g); return e.okA && e.okB && !e.bridged; };

  function initP2Grid() {
    p2Grid = scramble(P2_TYPES, P2_BASE_ROT, P2_FIXED, p2Done);
  }

  function renderP2() {
    const gridEl = document.getElementById('puzzle2Grid');
    const { a, b } = p2Evaluate(p2Grid);
    renderGrid(gridEl, p2Grid, (tile, r, c) => {
      const key = `${r},${c}`;
      if      (key === `${P2_SRC_A[0]},${P2_SRC_A[1]}`) tile.classList.add('source-w');
      else if (key === `${P2_SRC_B[0]},${P2_SRC_B[1]}`) tile.classList.add('source-g2');
      else if (key === P2_DST_A) tile.classList.add('terminal2r');
      else if (key === P2_DST_B) tile.classList.add('terminal2g');
      else if (a.has(key))       tile.classList.add('conn-r');
      else if (b.has(key))       tile.classList.add('conn-g');
    }, rotateP2Tile);
  }

  function rotateP2Tile(r, c) {
    if (S.p2Solved) return;
    p2Grid[r][c].rot = (p2Grid[r][c].rot + 1) % 4;
    S.rotations.p2++;
    spinTile(document.getElementById('puzzle2Grid'), r * 4 + c);
    renderP2();
    checkP2();
  }

  function checkP2() {
    const status = document.getElementById('puzzle2Status');
    const { bridged, okA, okB } = p2Evaluate(p2Grid);

    if (bridged) {
      status.textContent = 'SIGNALE INTERFERIEREN — PFADE MÜSSEN GETRENNT BLEIBEN.';
      status.className   = 'puzzle-status sys-text error';
      reactP2();
      return;
    }
    if (okA && okB) {
      status.textContent = 'BEIDE SIGNALE VERBUNDEN.';
      status.className   = 'puzzle-status sys-text ok';
      S.p2Solved = true;
      setTimeout(() => solvePuzzle2(), 700);
      return;
    }
    if (okA)      status.textContent = 'R-3MI-SIGNAL: AKTIV. V-TGM-SIGNAL: UNTERBROCHEN.';
    else if (okB) status.textContent = 'V-TGM-SIGNAL: AKTIV. R-3MI-SIGNAL: UNTERBROCHEN.';
    else          status.textContent = 'BEIDE SIGNALE INAKTIV.';
    status.className = 'puzzle-status sys-text';
    reactP2();
  }

  /** §16 — in the second repair they only speak up after the player acts. */
  function reactP2() {
    const n = S.rotations.p2;
    if (n === 10 && !S.react.p2.first) {
      S.react.p2.first = true;
      say([
        { speaker:'R-3MI', text:'„Ich sage nichts. Ich habe versprochen, nichts zu sagen."' },
        { speaker:'V-TGM', text:'"You are saying it out loud."', subtitle:'Du sagst es gerade laut.' },
      ]);
    } else if (n === 22 && !S.react.p2.stuck) {
      S.react.p2.stuck = true;
      say([
        { speaker:'V-TGM', text:'"Two signals. One of them has fewer options than the other."', subtitle:'Zwei Signale. Eines davon hat weniger Möglichkeiten als das andere.' },
      ]);
    }
  }

  function openPuzzle2() {
    S.hints.active = 'p2';
    S.hints.step   = 0;
    updateHintBar();
    initP2Grid();
    renderP2();
    checkP2();
    document.getElementById('puzzle2Modal').classList.remove('hidden');
    document.getElementById('hintBar').classList.remove('hidden');
  }

  function resetPuzzle2() {
    if (S.p2Solved) return;
    initP2Grid(); renderP2(); checkP2();
  }

  function solvePuzzle2() {
    renderP2();
    document.getElementById('puzzle2Modal').classList.add('hidden');
    document.getElementById('hintBar').classList.add('hidden');
    playSound('ch1_terminal_power_on.mp3');
    try { GameEngine.fx.flash('rgba(46,207,98,0.24)'); } catch(_) {}
    setProgress(12);

    // Persist before any navigation is possible.
    GameEngine.state.markChapterComplete('ch1');
    GameEngine.achievements.unlock('ch1_complete');

    say([
      { speaker:'SYSTEM', text:'HILFSPROTOKOLL KALIBRIERT. BETREUUNGSEINHEITEN AKTIV.' },
      { speaker:'SYSTEM', text:'WARTUNGSSEKTOR REAKTIVIERT.' },
      { speaker:'SYSTEM', text:'KALIBRIERUNGSDATEN GESPEICHERT.' },
      { speaker:'R-3MI',  text:'„Ha!"' },
      { speaker:'V-TGM',  text:'"You did literally none of that."', subtitle:'Du hast daran buchstäblich nichts gemacht.' },
      { speaker:'R-3MI',  text:'„Moralische Unterstützung."' },
      { speaker:'SYSTEM', text:'REAKTIVIERUNG: 12 %' },
      { speaker:'R-3MI',  text:'„Zwölf Prozent! Das ist mehr als zehn."' },
      { speaker:'V-TGM',  text:'"That is how numbers work."', subtitle:'So funktionieren Zahlen.' },
      { speaker:'R-3MI',  text:'„Und trotzdem sagst du es so, als wäre es eine Kritik."' },
      { speaker:'SYSTEM', text:'SEKTOR 02 FREIGEGEBEN.' },
    ], () => act3_theyComeAlong());
  }

  // ═══════════════════════════════════════════════════════════════
  // ENDING — they decide to come along
  // ═══════════════════════════════════════════════════════════════
  function act3_theyComeAlong() {
    setScene('room-b');
    clearHotspots();
    playSound('ch1_gate_unlock.mp3');

    say([
      { speaker:'SYSTEM', text:'Die Tür zum nächsten Sektor öffnet sich. Dahinter ist die Luft wärmer. Feuchter. Etwas tropft. Etwas raschelt.' },
      { speaker:'SYSTEM', text:'Und irgendwo in der Tiefe macht etwas ein Geräusch, das verdächtig nach einem mechanischen Quaken klingt.' },
      { speaker:'R-3MI',  text:'„Oh nein."' },
      { speaker:'V-TGM',  text:'"What?"', subtitle:'Was?' },
      { speaker:'R-3MI',  text:'„Nichts."' },
      { speaker:'R-3MI',  text:'„Okay. Nicht nichts."' },
      { speaker:'R-3MI',  text:'„Du gehst weiter?"' },
    ], () => {
      askOnce({
        prompt: 'DEINE ANTWORT:',
        hint:   'WÄHLE EINE.',
        choices: [
          { key:'ofcourse', label:'[ Natürlich. ]', lines:[
            { speaker:'R-3MI', text:'„Natürlich. Er sagt das, als wäre es offensichtlich."' },
          ] },
          { key:'know', label:'[ Ich will wissen, was hier passiert ist. ]', lines:[
            { speaker:'V-TGM', text:'"That is a better reason than most."', subtitle:'Das ist ein besserer Grund als die meisten.' },
          ] },
          { key:'peek', label:'[ Eigentlich wollte ich nur kurz reinschauen... ]', lines:[
            { speaker:'R-3MI', text:'„Das sagen sie alle. Und dann stehen sie zwölf Prozent später immer noch hier."' },
          ] },
        ],
        onPick: () => {
          say([
            { speaker:'V-TGM', text:'"Then we\'re coming with you."', subtitle:'Dann kommen wir mit.' },
            { speaker:'R-3MI', text:'„Ja."' },
            { speaker:'SYSTEM',text:'Kurze Pause.' },
            { speaker:'R-3MI', text:'„Du weißt nämlich offensichtlich, wie man Türen öffnet."' },
            { speaker:'V-TGM', text:'"And we very obviously do not."', subtitle:'Und wir offensichtlich nicht.' },
          ], () => {
            clearHotspots();
            addHotspot({ prop:'c1_sectordoor', x:42, y:16, w:16, h:54,
              label:'SEKTOR 02 BETRETEN', aria:'Sektor 02 betreten', fn:finishChapter });
          });
        },
      });
    });
  }

  function finishChapter() {
    // Already persisted at solvePuzzle2; safe to repeat (both are idempotent).
    GameEngine.state.markChapterComplete('ch1');
    GameEngine.achievements.unlock('ch1_complete');
    try { GameEngine.audio.fanfare(); } catch(_) {}
    document.getElementById('chapterComplete').classList.remove('hidden');
    document.getElementById('ccProgress').textContent =
      `FORTSCHRITT: ${GameEngine.state.get('chaptersCompleted').length} / 9 KAPITEL`;
    setTimeout(() => document.getElementById('ccEnter')?.focus(), 700);
  }

  // ═══════════════════════════════════════════════════════════════
  // HINTS — one 3-step ladder per repair.
  // Step 1 points at something, step 2 names a relationship,
  // step 3 describes a method. None of them state an answer.
  // ═══════════════════════════════════════════════════════════════
  const HINTS = {
    p1: {
      r3mi: [
        '„Schau erst mal, welche Teile du überhaupt drehen kannst. Die festen sind nicht dein Problem — die sind dein Gerüst."',
        '„Ein Rohr zählt nur, wenn beide offenen Enden auf ein anderes offenes Ende treffen. Alles andere ist Dekoration."',
        '„Fang an der Quelle an und arbeite dich vor. Wenn ein Weg in eine Sackgasse läuft, war die letzte Drehung schuld — nicht die erste."',
      ],
      vtgm: [
        { t:'"Notice which tiles are fixed. They are not obstacles. They are the frame."',
          s:'Achte darauf, welche Felder fest sind. Sie sind keine Hindernisse. Sie sind der Rahmen.' },
        { t:'"A connection exists only where two open ends meet. Follow the line outward from the source, one tile at a time."',
          s:'Eine Verbindung entsteht nur dort, wo zwei offene Enden aufeinandertreffen. Folge der Linie von der Quelle aus, Feld für Feld.' },
        { t:'"When a branch dead-ends, step back one tile and rotate that one instead of starting over."',
          s:'Wenn ein Zweig in eine Sackgasse läuft, geh ein Feld zurück und dreh dieses — statt neu anzufangen.' },
      ],
    },
    p2: {
      r3mi: [
        '„Zwei Signale. Zwei Ziele. Und genau eine Reihe in der Mitte, die beide gerne hätten."',
        '„Wenn sich die beiden Wege auch nur ein einziges Feld teilen, zählt das schon als Streit."',
        '„Leg den engeren Weg zuerst. Der andere hat mehr Platz zum Ausweichen."',
      ],
      vtgm: [
        { t:'"There are two sources and two terminals. Only the middle row is contested."',
          s:'Es gibt zwei Quellen und zwei Ziele. Nur die mittlere Reihe ist umkämpft.' },
        { t:'"The paths may not share a single tile. If one signal can reach the other\'s terminal, they are already bridged."',
          s:'Die Pfade dürfen sich kein einziges Feld teilen. Wenn ein Signal das Ziel des anderen erreichen kann, sind sie bereits verbunden.' },
        { t:'"Commit the more constrained path first, then route the second one around it."',
          s:'Leg den stärker eingeschränkten Pfad zuerst fest und führe den zweiten dann darum herum.' },
      ],
    },
  };

  function useHint(who) {
    const set = HINTS[S.hints.active];
    if (!set) return;

    if (S.hints.step >= HINT_MAX) {
      say([ who === 'r3mi'
        ? { speaker:'R-3MI', text:'„Mehr darf ich nicht sagen. Also, ich könnte. Aber dann würde das System mich vermutlich anschreien."' }
        : { speaker:'V-TGM', text:'"You have enough."', subtitle:'Du hast genug.' } ]);
      return;
    }

    const idx = S.hints.step;
    S.hints.step++;
    updateHintBar();

    if (who === 'r3mi') {
      say([{ speaker:'R-3MI', text: set.r3mi[idx] }]);
    } else {
      const h = set.vtgm[idx];
      say([{ speaker:'V-TGM', text: h.t, subtitle: h.s }]);
    }
  }

  function updateHintBar() {
    const left = Math.max(0, HINT_MAX - S.hints.step);
    document.getElementById('hintCount').textContent = `HINWEISE: ${left} VERFÜGBAR`;
    const done = left <= 0;
    document.getElementById('hintBtnR3MI').disabled = done;
    document.getElementById('hintBtnVTGM').disabled = done;
  }

  // ═══════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════
  function init() {
    // Progression guard: the maintenance sector is only reachable once the
    // entrance has actually been opened.
    if (!GameEngine.progress.require('ch1')) return;
    registerArt();
    setProgress(0);
    showTitleCard();
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════
  return {
    init,
    clickRobot,
    useHint,
    resetPuzzle1() { resetPuzzle1(); },
    resetPuzzle2() { resetPuzzle2(); },
  };

})();

document.addEventListener('DOMContentLoaded', () => Chapter1.init());
