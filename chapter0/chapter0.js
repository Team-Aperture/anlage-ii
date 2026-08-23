/**
 * ═══════════════════════════════════════════════════════════════
 * KAPITEL 00 — RÜCKKEHR
 * Prologue: manual entrance release, after the archived authorisation from
 * KA-I has already been verified on the access page.
 *
 * The entrance drive is dead, so the seal has to be operated by hand. The
 * player reads what is left of the old markings around the threshold and
 * reconstructs the facility's manual reference rule from them.
 *
 * Narration is SYSTEM only.
 * ═══════════════════════════════════════════════════════════════
 */

const Chapter0 = (() => {
  'use strict';

  const PUZZLE_ID  = 'ch0_door';
  const CHAPTER_ID = 'ch0';
  const DOOR_FLAG  = 'ch0_door_open';

  const A = () => GameEngine.audio;

  // ═══════════════════════════════════════════════════════════════
  // CHAPTER ART — Sektor 7C, entrance
  // Nothing in this room has been maintained for 2.847 days, so nothing in
  // it is allowed to look factory-fresh: every surface is either oxidised,
  // stencilled, silted over or grown through. The shared library draws a
  // working facility; this draws one that stopped.
  // Registered under a c0_ prefix so it can never collide with the shared
  // set or with another chapter's art.
  // ═══════════════════════════════════════════════════════════════
  const CH0_ART = {

    // WARNTAFEL — a bolted wall plate, weathered past reading except for one
    // surviving strip. The rising step beside it is the word the plate still
    // manages to say: AUFSTEIGEND.
    c0_warnsign: {
      vb: '0 0 110 62',
      art:
          '<rect class="prop-base" x="3" y="3" width="104" height="56" rx="2"/>'
        + '<rect class="prop-metal" x="10" y="10" width="90" height="42"/>'
        + '<rect class="prop-lite" x="10" y="10" width="90" height="2.4" opacity=".5"/>'
        + '<path class="prop-hazard" d="M13 20 l6 -7 h4.5 l-6 7 Z" fill-opacity=".6"/>'
        + '<path class="prop-hazard" d="M24 20 l6 -7 h4.5 l-6 7 Z" fill-opacity=".6"/>'
        + '<path class="prop-hazard" d="M35 20 l6 -7 h4.5 l-6 7 Z" fill-opacity=".6"/>'
        + '<path class="prop-thin" d="M14 26 H96" stroke-dasharray="9 4 3 6 14 5" opacity=".7"/>'
        + '<path class="prop-thin" d="M14 32 H74" stroke-dasharray="5 7 12 4 6 5" opacity=".55"/>'
        + '<ellipse class="prop-inset" cx="70" cy="28" rx="17" ry="6" opacity=".45"/>'
        + '<ellipse class="prop-inset" cx="30" cy="33" rx="12" ry="5" opacity=".38"/>'
        + '<rect class="prop-acc-dim" x="13" y="37" width="44" height="9"/>'
        + '<rect class="prop-edge" x="13" y="37" width="44" height="9" opacity=".55"/>'
        + '<path class="prop-acc" d="M64 46 h5 v-4 h-5 Z M72 46 h5 v-8 h-5 Z M80 46 h5 v-12 h-5 Z M88 46 h5 v-16 h-5 Z" opacity=".8"/>'
        + '<path class="prop-thin" d="M96 52 l-9 -7 l4 -6" opacity=".5"/>'
        + '<circle class="prop-lite" cx="7" cy="7" r="2.2"/>'
        + '<circle class="prop-lite" cx="103" cy="7" r="2.2"/>'
        + '<circle class="prop-lite" cx="7" cy="55" r="2.2"/>'
        + '<circle class="prop-lite" cx="103" cy="55" r="2.2"/>'
        + '<path class="prop-vine" d="M0 62 q10 -12 8 -26 q-2 -12 6 -20" stroke-width="2.6"/>'
        + '<ellipse class="prop-leaf" cx="6" cy="42" rx="7" ry="3.6" transform="rotate(-28 6 42)"/>'
        + '<ellipse class="prop-leaf" cx="13" cy="26" rx="6.5" ry="3.4" transform="rotate(18 13 26)"/>'
        + '<ellipse class="prop-leaf" cx="3" cy="55" rx="6" ry="3.2" transform="rotate(-8 3 55)"/>',
    },

    // WARTUNGSPLAKETTE — an engraved maintenance table, oxidised down to a
    // single surviving row. That row is the one the mechanism still needs:
    // one marked vertex, value one.
    c0_plaque: {
      vb: '0 0 100 76',
      art:
          '<rect class="prop-metal" x="4" y="4" width="92" height="68" rx="2"/>'
        + '<rect class="prop-lite" x="4" y="4" width="92" height="3" rx="1.5" opacity=".6"/>'
        + '<rect class="prop-inset" x="10" y="12" width="80" height="56" opacity=".55"/>'
        + '<rect class="prop-acc-dim" x="14" y="16" width="62" height="5"/>'
        + '<line class="prop-thin" x1="14" y1="24" x2="86" y2="24" opacity=".8"/>'
        + '<line class="prop-thin" x1="58" y1="26" x2="58" y2="64" opacity=".5"/>'
        + '<line class="prop-thin" x1="14" y1="34" x2="86" y2="34" opacity=".55"/>'
        + '<line class="prop-thin" x1="14" y1="44" x2="86" y2="44" opacity=".5"/>'
        + '<line class="prop-thin" x1="14" y1="54" x2="86" y2="54" opacity=".45"/>'
        + '<circle class="prop-acc" cx="26" cy="30" r="3.4"/>'
        + '<rect class="prop-acc" x="70" y="26.5" width="3" height="7"/>'
        + '<ellipse class="prop-inset" cx="34" cy="39" rx="18" ry="4" opacity=".9"/>'
        + '<path class="prop-thin" d="M66 39 H80" stroke-dasharray="3 5" opacity=".35"/>'
        + '<ellipse class="prop-inset" cx="40" cy="49" rx="22" ry="4.5" opacity=".9"/>'
        + '<rect class="prop-inset" x="14" y="55" width="72" height="8" opacity=".95"/>'
        + '<path class="prop-inset" d="M86 8 q-14 10 -6 24 q6 12 -4 22 q-8 12 2 18 h14 V8 Z" opacity=".3"/>'
        + '<path class="prop-metal" d="M64 46 q12 4 9 14 l-2 8 h19 V46 Z" opacity=".4"/>'
        + '<circle class="prop-lite" cx="9" cy="9" r="2"/>'
        + '<circle class="prop-lite" cx="91" cy="9" r="2"/>'
        + '<circle class="prop-lite" cx="9" cy="67" r="2"/>'
        + '<circle class="prop-lite" cx="91" cy="67" r="2"/>'
        + '<rect class="prop-edge" x="4" y="4" width="92" height="68" rx="2" opacity=".25"/>',
    },

    // BODENMARKIERUNG — a sprayed floor stencil in perspective. The test order
    // is stencilled as tally groups, 1 · 3 · 4 · 6, with the paint scuffed
    // thin where boots used to cross it.
    c0_floormark: {
      vb: '0 0 130 52',
      art:
          '<path class="prop-acc-dim" d="M24 5 H106 L120 47 H10 Z" fill-opacity=".6"/>'
        + '<path class="prop-edge" d="M24 5 H106 L120 47 H10 Z" opacity=".38" stroke-dasharray="9 6"/>'
        + '<path class="prop-acc" d="M17.2 18 h3.5 l-1.2 18 h-3.5 Z" opacity=".55"/>'
        + '<path class="prop-acc" d="M28.7 18 h3.5 l-1.2 18 h-3.5 Z M34.7 18 h3.5 l-1.2 18 h-3.5 Z M40.7 18 h3.5 l-1.2 18 h-3.5 Z" opacity=".55"/>'
        + '<path class="prop-acc" d="M52.2 18 h3.5 l-1.2 18 h-3.5 Z M58.2 18 h3.5 l-1.2 18 h-3.5 Z M64.2 18 h3.5 l-1.2 18 h-3.5 Z M70.2 18 h3.5 l-1.2 18 h-3.5 Z" opacity=".55"/>'
        + '<path class="prop-acc" d="M81.7 18 h3.5 l-1.2 18 h-3.5 Z M87.7 18 h3.5 l-1.2 18 h-3.5 Z M93.7 18 h3.5 l-1.2 18 h-3.5 Z M99.7 18 h3.5 l-1.2 18 h-3.5 Z M105.7 18 h3.5 l-1.2 18 h-3.5 Z M111.7 18 h3.5 l-1.2 18 h-3.5 Z" opacity=".55"/>'
        + '<circle class="prop-acc" cx="23" cy="27" r="2.2" fill-opacity=".5"/>'
        + '<circle class="prop-acc" cx="46.5" cy="27" r="2.2" fill-opacity=".5"/>'
        + '<circle class="prop-acc" cx="76" cy="27" r="2.2" fill-opacity=".5"/>'
        + '<ellipse class="prop-inset" cx="26" cy="34" rx="9" ry="3" opacity=".35"/>'
        + '<ellipse class="prop-inset" cx="95" cy="37" rx="14" ry="3" opacity=".3"/>'
        + '<ellipse class="prop-inset" cx="57" cy="16" rx="11" ry="3" opacity=".3"/>'
        + '<line class="prop-thin" x1="0" y1="40" x2="130" y2="40" opacity=".3"/>'
        + '<path class="prop-thin" d="M14 44 h6 M17 41 v6" opacity=".45"/>'
        + '<path class="prop-thin" d="M112 44 h6 M115 41 v6" opacity=".45"/>',
    },

    // ARCHIVTERMINAL — a hooded reader on a pedestal, dust capping the brow,
    // still holding residual data. The highlighted row is the line it wakes
    // up to say: the test signature, recognised.
    c0_terminal: {
      vb: '0 0 96 122',
      art:
          '<ellipse class="prop-inset" cx="48" cy="117" rx="30" ry="4" opacity=".6"/>'
        + '<rect class="prop-base" x="23" y="110" width="50" height="8" rx="2"/>'
        + '<path class="prop-metal" d="M33 110 L37 76 h22 l4 34 Z"/>'
        + '<rect class="prop-lite" x="37" y="76" width="3.6" height="34" opacity=".8"/>'
        + '<rect class="prop-inset" x="36" y="90" width="24" height="4" rx="1"/>'
        + '<rect class="prop-lite" x="36" y="95" width="24" height="1.6" opacity=".55"/>'
        + '<rect class="prop-metal" x="20" y="68" width="56" height="8" rx="1.5"/>'
        + '<rect class="prop-lite" x="20" y="68" width="56" height="2.2" opacity=".6"/>'
        + '<line class="prop-thin" x1="26" y1="73" x2="70" y2="73" opacity=".6"/>'
        + '<rect class="prop-base" x="5" y="12" width="86" height="54" rx="5"/>'
        + '<path class="prop-metal" d="M2 6 h92 l-6 10 H8 Z"/>'
        + '<path class="prop-lite" d="M2 6 h92 l-1.4 2.4 H3.4 Z" opacity=".55"/>'
        + '<path class="prop-lite" d="M8 6 q20 -3 38 0 q22 -3 40 0 l.6 1.8 H7.4 Z" opacity=".3"/>'
        + '<rect class="prop-screen" x="13" y="20" width="70" height="40"/>'
        + '<line class="prop-scan" x1="19" y1="27" x2="72" y2="27"/>'
        + '<line class="prop-scan" x1="19" y1="33" x2="60" y2="33"/>'
        + '<line class="prop-scan" x1="19" y1="39" x2="66" y2="39"/>'
        + '<line class="prop-scan" x1="19" y1="45" x2="52" y2="45"/>'
        + '<rect class="prop-acc" x="18" y="48" width="34" height="5" opacity=".6"/>'
        + '<rect class="prop-cursor" x="56" y="48" width="6" height="5"/>'
        + '<path class="prop-thin" d="M78 20 l-9 12 l4 7" opacity=".5"/>'
        + '<rect class="prop-acc-dim" x="30" y="62" width="20" height="3"/>'
        + '<circle class="prop-led" cx="85" cy="63" r="2.6"/>',
    },

    // STAUBSCHICHT — a drift of settled dust lying across two floor slabs.
    // The point of the object is what is NOT in it: the surface is unbroken,
    // so the ridges run the whole way without a single track through them.
    c0_dust: {
      vb: '0 0 120 44',
      art:
          '<ellipse class="prop-inset" cx="60" cy="41" rx="56" ry="3.4" opacity=".5"/>'
        + '<line class="prop-thin" x1="0" y1="19" x2="120" y2="19" opacity=".3"/>'
        + '<path class="prop-thin" d="M74 19 l7 24" opacity=".26"/>'
        + '<path class="prop-metal" d="M4 36 q22 -13 52 -10 q34 3 60 9 v7 H4 Z" opacity=".55"/>'
        + '<path class="prop-lite" d="M9 39 q24 -14 50 -11 q31 3 53 10 v6 H9 Z" opacity=".42"/>'
        + '<path class="prop-thin" d="M15 36 q26 -11 50 -8" opacity=".45"/>'
        + '<path class="prop-thin" d="M26 40 q30 -10 58 -6" opacity=".3"/>'
        + '<ellipse class="prop-leaf" cx="30" cy="32" rx="7" ry="3.4" transform="rotate(-18 30 32)" opacity=".42"/>'
        + '<path class="prop-vine" d="M36 33 l8 3" stroke-width="2" opacity=".35"/>'
        + '<ellipse class="prop-leaf" cx="92" cy="35" rx="5.5" ry="2.8" transform="rotate(22 92 35)" opacity=".34"/>'
        + '<circle class="prop-lite" cx="48" cy="30" r="1.2" opacity=".5"/>'
        + '<circle class="prop-lite" cx="66" cy="33" r="1" opacity=".42"/>'
        + '<circle class="prop-lite" cx="20" cy="37" r="1.3" opacity=".45"/>',
    },

    // NOTBELEUCHTUNG — a caged bulkhead fixture bolted to the entrance
    // ceiling, not a work lamp. prop-core and prop-glow are deliberate: the
    // chapter stylesheet mutes exactly those two while the fixture is dead,
    // and hands them back the moment the seal releases.
    c0_lamp: {
      vb: '0 0 116 48',
      art:
          '<rect class="prop-base" x="34" y="0" width="48" height="6" rx="2"/>'
        + '<line class="prop-thin" x1="44" y1="6" x2="44" y2="11"/>'
        + '<line class="prop-thin" x1="72" y1="6" x2="72" y2="11"/>'
        + '<rect class="prop-base" x="8" y="10" width="100" height="22" rx="4"/>'
        + '<rect class="prop-lite" x="12" y="11.5" width="92" height="2.4" rx="1.2" opacity=".55"/>'
        + '<rect class="prop-inset" x="18" y="15" width="80" height="15" rx="2"/>'
        + '<path class="prop-glow" d="M22 31 L8 48 H108 L94 31 Z" fill-opacity=".5"/>'
        + '<ellipse class="prop-glow" cx="58" cy="22.5" rx="40" ry="8"/>'
        + '<rect class="prop-core" x="26" y="20" width="64" height="5" rx="2.5"/>'
        + '<line class="prop-thin" x1="18" y1="17" x2="98" y2="17" opacity=".8"/>'
        + '<line class="prop-thin" x1="18" y1="28.5" x2="98" y2="28.5" opacity=".8"/>'
        + '<line class="prop-thin" x1="32" y1="14.5" x2="32" y2="30.5"/>'
        + '<line class="prop-thin" x1="48" y1="14.5" x2="48" y2="30.5"/>'
        + '<line class="prop-thin" x1="66" y1="14.5" x2="66" y2="30.5"/>'
        + '<line class="prop-thin" x1="84" y1="14.5" x2="84" y2="30.5"/>'
        + '<rect class="prop-metal" x="8" y="12" width="12" height="18" rx="2"/>'
        + '<rect class="prop-metal" x="96" y="12" width="12" height="18" rx="2"/>'
        + '<path class="prop-hazard" d="M10 30 l6 -16 h4 l-6 16 Z" fill-opacity=".7"/>'
        + '<path class="prop-hazard" d="M98 30 l6 -16 h4 l-6 16 Z" fill-opacity=".7"/>'
        + '<rect class="prop-acc-dim" x="46" y="33" width="24" height="3.4"/>'
        + '<path class="prop-thin" d="M86 15.5 l-6 8 l3 6" opacity=".45"/>',
    },

    // VEGETATION — growth that came in THROUGH the structure. The silhouette
    // is a fissure with a snapped conduit hanging out of it, not a decorative
    // curtain of leaves: this is the overdue maintenance interval, drawn.
    c0_ivy: {
      vb: '0 0 78 130',
      art:
          '<path class="prop-inset" d="M30 0 q7 20 1 34 q-7 16 1 32 q8 16 1 34 q-5 14 1 30 h13 q-6 -16 -1 -30 q7 -18 -1 -34 q-8 -16 -1 -32 q6 -14 -1 -34 Z"/>'
        + '<path class="prop-thin" d="M43 0 q6 20 -1 34 q-8 18 -1 34 q7 18 1 32 q-5 14 1 30" opacity=".55"/>'
        + '<rect class="prop-metal" x="0" y="44" width="28" height="9" rx="3"/>'
        + '<rect class="prop-lite" x="0" y="45" width="28" height="2.4" opacity=".6"/>'
        + '<path class="prop-metal" d="M46 44 h32 v9 H56 l-8 12 -6 -4 Z"/>'
        + '<path class="prop-vine" d="M35 2 q-16 26 -8 50 q9 24 -3 46 q-6 14 -3 30"/>'
        + '<path class="prop-vine" d="M38 26 q17 14 13 38 q-4 20 4 42" stroke-width="2.4"/>'
        + '<path class="prop-vine" d="M32 58 q-17 12 -15 34 q-2 18 6 36" stroke-width="2"/>'
        + '<path class="prop-thin" d="M42 66 q2 12 -1 22" opacity=".25"/>'
        + '<ellipse class="prop-leaf" cx="34" cy="8" rx="6.5" ry="3.5" transform="rotate(30 34 8)"/>'
        + '<ellipse class="prop-leaf" cx="24" cy="18" rx="8" ry="4.2" transform="rotate(-26 24 18)"/>'
        + '<ellipse class="prop-leaf" cx="14" cy="46" rx="7.5" ry="4" transform="rotate(18 14 46)"/>'
        + '<ellipse class="prop-leaf" cx="25" cy="74" rx="8" ry="4.2" transform="rotate(-14 25 74)"/>'
        + '<ellipse class="prop-leaf" cx="12" cy="102" rx="7" ry="3.8" transform="rotate(22 12 102)"/>'
        + '<ellipse class="prop-leaf" cx="49" cy="40" rx="7.5" ry="4" transform="rotate(16 49 40)"/>'
        + '<ellipse class="prop-leaf" cx="55" cy="68" rx="8" ry="4.2" transform="rotate(-22 55 68)"/>'
        + '<ellipse class="prop-leaf" cx="52" cy="98" rx="7" ry="3.8" transform="rotate(12 52 98)"/>'
        + '<ellipse class="prop-leaf" cx="60" cy="122" rx="7.5" ry="4" transform="rotate(-10 60 122)"/>',
    },

    // WARTUNGSKISTE — one supply case, lid propped ajar on a dark gap, with
    // the security band snapped and curling away from the tag. The label
    // plate carries two printed lines; the lower one has already faded out.
    c0_crate: {
      vb: '0 0 108 82',
      art:
          '<ellipse class="prop-inset" cx="54" cy="78" rx="46" ry="4" opacity=".6"/>'
        + '<rect class="prop-base" x="8" y="32" width="92" height="44" rx="3"/>'
        + '<rect class="prop-lite" x="11" y="34" width="5" height="40" rx="2" opacity=".7"/>'
        + '<line class="prop-thin" x1="30" y1="34" x2="30" y2="74" opacity=".6"/>'
        + '<line class="prop-thin" x1="78" y1="34" x2="78" y2="74" opacity=".6"/>'
        + '<rect class="prop-inset" x="12" y="27" width="84" height="6"/>'
        + '<path class="prop-metal" d="M9 30 L16 15 H96 L100 30 Z"/>'
        + '<path class="prop-lite" d="M16 15 H96 l1.4 3.4 H14.5 Z" opacity=".65"/>'
        + '<path class="prop-lite" d="M22 15 q22 -2.5 40 0 q19 -2.5 32 0 l.8 2 H21 Z" opacity=".28"/>'
        + '<rect class="prop-inset" x="58" y="42" width="32" height="20"/>'
        + '<rect class="prop-acc-dim" x="62" y="46" width="24" height="3.4"/>'
        + '<rect class="prop-acc-dim" x="62" y="53" width="15" height="3.4" fill-opacity=".45"/>'
        + '<path class="prop-edge" d="M34 30 V52" opacity=".85"/>'
        + '<path class="prop-edge" d="M39 30 l4 10 l-5 7 l6 6" opacity=".6"/>'
        + '<rect class="prop-acc-dim" x="30" y="50" width="10" height="6"/>'
        + '<path class="prop-hazard" d="M12 74 l7 -10 h5 l-7 10 Z" fill-opacity=".75"/>'
        + '<path class="prop-hazard" d="M88 74 l7 -10 h5 l-7 10 Z" fill-opacity=".75"/>'
        + '<rect class="prop-metal" x="2" y="46" width="7" height="14" rx="3"/>'
        + '<rect class="prop-metal" x="99" y="46" width="7" height="14" rx="3"/>',
    },
  };

  // ─── The ring's reference marks ──────────────────────────────
  // Each mark carries a form value. The mechanism steps through the marks in
  // test order; nothing about a mark's position on the ring encodes that order.
  const FORM_VALUE = new Map([
    ['●', 1],
    ['▲', 3],
    ['■', 4],
    ['⬡', 6],
  ]);
  const SEQUENCE_LENGTH = 4;

  function getFormValue(mark) {
    return FORM_VALUE.has(mark) ? FORM_VALUE.get(mark) : null;
  }

  /** A sequence is accepted when every mark is used exactly once and the form
   *  values run strictly upwards. Duplicates are rejected outright. */
  function validateReferenceSequence(input) {
    const marks = Array.isArray(input) ? input : String(input).split('');
    if (marks.length !== SEQUENCE_LENGTH) return false;
    if (new Set(marks).size !== marks.length) return false;
    const values = marks.map(getFormValue);
    if (values.some(v => v === null)) return false;
    return values.every((v, i) => i === 0 || v > values[i - 1]);
  }

  // ─── State ────────────────────────────────────────────────────
  const S = {
    referencesFound: { warning: false, plaque: false, floor: false, ring: false },
    sequence:   [],
    inputLocked: false,
    attempts:   0,
    hintStep:   0,
    doorRead:   false,
    unlocked:   false,
    introDone:  false,
  };

  // ═══════════════════════════════════════════════════════════════
  // REQUIRED REFERENCES
  // Four complementary fragments of one operating rule: direction, mapping,
  // expected values, available marks. No single fragment is the answer.
  // ═══════════════════════════════════════════════════════════════
  const REFERENCES = {
    warning: {
      label:   'WARNTAFEL',
      aria:    'Verwitterte Warntafel untersuchen',
      prop:    'c0_warnsign',
      pos:     { x: 1, y: 47, w: 12, h: 11 },
      lines: [
        { speaker: 'SYSTEM', text: 'WARNTAFEL // VERWITTERT, TEILWEISE VON EFEU VERDECKT.' },
        { speaker: 'SYSTEM', text: 'TEXTFRAGMENT LESBAR: »… MANUELLE REFERENZFOLGE … AUFSTEIGEND …«' },
      ],
      reread: [
        { speaker: 'SYSTEM', text: 'WARNTAFEL // »… MANUELLE REFERENZFOLGE … AUFSTEIGEND …«' },
      ],
    },
    plaque: {
      label:   'WARTUNGSPLAKETTE',
      aria:    'Wartungsplakette untersuchen',
      prop:    'c0_plaque',
      pos:     { x: 67, y: 15, w: 11, h: 11 },
      lines: [
        { speaker: 'SYSTEM', text: 'METALLPLAKETTE // STARK OXIDIERT. FORMTABELLE TEILWEISE ERHALTEN.' },
        { speaker: 'SYSTEM', text: 'GRAVUR: »FORMKENNZAHL = MARKIERTE ECKPUNKTE«' },
        { speaker: 'SYSTEM', text: 'ZUSATZZEILE: »REFERENZPUNKT ● = 1«' },
      ],
      reread: [
        { speaker: 'SYSTEM', text: 'FORMTABELLE // »FORMKENNZAHL = MARKIERTE ECKPUNKTE«, »REFERENZPUNKT ● = 1«' },
      ],
    },
    floor: {
      label:   'BODENMARKIERUNG',
      aria:    'Bodenmarkierung untersuchen',
      prop:    'c0_floormark',
      pos:     { x: 40, y: 76, w: 20, h: 12 },
      lines: [
        { speaker: 'SYSTEM', text: 'BODENMARKIERUNG // SCHABLONE, STARK VERBLASST.' },
        { speaker: 'SYSTEM', text: 'PRÜFREIHENFOLGE LESBAR: 1 · 3 · 4 · 6' },
      ],
      reread: [
        { speaker: 'SYSTEM', text: 'BODENMARKIERUNG // PRÜFREIHENFOLGE: 1 · 3 · 4 · 6' },
      ],
    },
    ring: {
      label:   'SCHLEUSENRING',
      aria:    'Schleusenring untersuchen',
      pos:     { x: 37.5, y: 26, w: 24, h: 44 },
      lines: [
        { speaker: 'SYSTEM', text: 'EXTERNE TESTSIGNATUR // GÜLTIG.' },
        { speaker: 'SYSTEM', text: 'SCHLEUSENRING // MANUELL VERRIEGELT.' },
        { speaker: 'SYSTEM', text: 'GEOMETRISCHE REFERENZEN AM RING ERKANNT: ● ▲ ■ ⬡' },
        { speaker: 'SYSTEM', text: 'REFERENZFOLGE // NICHT VERFÜGBAR.' },
      ],
    },
  };

  const REFERENCE_ORDER = ['warning', 'plaque', 'floor', 'ring'];

  // ═══════════════════════════════════════════════════════════════
  // OPTIONAL ENVIRONMENT
  // Curiosity, not clues. Nothing here is needed to open the door.
  // ═══════════════════════════════════════════════════════════════
  const ENVIRONMENT = [
    {
      key: 'terminal', label: 'ARCHIVTERMINAL', aria: 'Archivterminal untersuchen',
      prop: 'c0_terminal', pos: { x: 88, y: 46, w: 11, h: 22 },
      lines: [
        { speaker: 'SYSTEM', text: 'ARCHIVTERMINAL // RESTDATEN LESBAR.' },
        { speaker: 'SYSTEM', text: 'LETZTES ABGESCHLOSSENES HAUPTPROTOKOLL: SYSTEMABSCHALTUNG.' },
        { speaker: 'SYSTEM', text: 'AUSFÜHRENDE AUTORISIERUNG: EXTERNE TESTSIGNATUR.' },
        { speaker: 'SYSTEM', text: 'TESTSIGNATUR // WIEDERERKANNT.' },
        { speaker: 'SYSTEM', text: 'WILLKOMMEN ZURÜCK.' },
      ],
      reread: [{ speaker: 'SYSTEM', text: 'ARCHIVTERMINAL // RESTDATEN UNVERÄNDERT.' }],
    },
    {
      key: 'dust', label: 'STAUBSCHICHT', aria: 'Staubschicht am Boden untersuchen',
      prop: 'c0_dust', pos: { x: 20, y: 85, w: 15, h: 8 },
      lines: [
        { speaker: 'SYSTEM', text: 'STAUBSCHICHT // UNGESTÖRT.' },
        { speaker: 'SYSTEM', text: 'KEINE FRISCHEN SPUREN.' },
      ],
      reread: [{ speaker: 'SYSTEM', text: 'STAUBSCHICHT // UNVERÄNDERT.' }],
    },
    {
      key: 'light', label: 'NOTBELEUCHTUNG', aria: 'Notbeleuchtung untersuchen',
      prop: 'c0_lamp', pos: { x: 44, y: 1, w: 11, h: 7 },
      lines: [
        { speaker: 'SYSTEM', text: 'NOTBELEUCHTUNG // OFFLINE.' },
        { speaker: 'SYSTEM', text: 'ENERGIEVERSORGUNG: UNZUREICHEND.' },
      ],
      // the room remembers: after the release this fixture is alive
      awakeLines: [
        { speaker: 'SYSTEM', text: 'NOTBELEUCHTUNG // AKTIV.' },
      ],
    },
    {
      key: 'ivy', label: 'VEGETATION', aria: 'Bewuchs untersuchen',
      prop: 'c0_ivy', pos: { x: 22, y: 0, w: 9, h: 26 },
      lines: [
        { speaker: 'SYSTEM', text: 'VEGETATION // UNKONTROLLIERT.' },
        { speaker: 'SYSTEM', text: 'WARTUNGSINTERVALL // DEUTLICH ÜBERSCHRITTEN.' },
      ],
      reread: [{ speaker: 'SYSTEM', text: 'VEGETATION // UNVERÄNDERT.' }],
    },
    {
      key: 'crate', label: 'WARTUNGSKISTE', aria: 'Wartungskiste untersuchen',
      prop: 'c0_crate', pos: { x: 62, y: 65, w: 12, h: 13 },
      lines: [
        { speaker: 'SYSTEM', text: 'WARTUNGSMATERIAL // VERSIEGELUNG BESCHÄDIGT.' },
        { speaker: 'SYSTEM', text: 'HALTBARKEIT ÜBERSCHRITTEN: 2.701 TAGE.' },
      ],
      reread: [{ speaker: 'SYSTEM', text: 'WARTUNGSMATERIAL // STATUS UNVERÄNDERT.' }],
    },
  ];

  const envSeen = {};

  // Pure set dressing — no pointer events, no labels.
  const DECOR = [
    { prop: 'ivy',    x: 0,  y: 2,  w: 11, h: 42 },
    { prop: 'ivy',    x: 89, y: 0,  w: 11, h: 44 },
    { prop: 'column', x: 14, y: 16, w: 7,  h: 58 },
    { prop: 'column', x: 80, y: 16, w: 7,  h: 56 },
    { prop: 'pipe',   x: 75, y: 40, w: 5,  h: 34 },
    { prop: 'debris', x: 62, y: 82, w: 16, h: 8  },
    { prop: 'debris', x: 3,  y: 87, w: 13, h: 7  },
  ];

  // ═══════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════
  function init() {
    // Authorisation gate — the head script redirects first; this is the
    // in-engine backstop in case the save was cleared between the two.
    if (!GameEngine.progress.require('ch0')) return;

    try {
      // Chapter-local artwork first: every hotspot below resolves its
      // prop by name at add time, so the c0_* set has to exist already.
      GameEngine.props.register(CH0_ART);

      wireControls();

      GameEngine.puzzle.define({
        id:       PUZZLE_ID,
        validate: validateReferenceSequence,
        hint:     'Die Markierungen rund um die Schleuse beschreiben eine Bedienvorschrift.',
        onSolve:  onSolve,
        onFail:   onFail,
      });

      try { GameEngine.music.play('ch0_ambient'); } catch (_) {}

      const alreadyOpen = GameEngine.state.isPuzzleSolved(PUZZLE_ID)
                       || GameEngine.state.isChapterComplete(CHAPTER_ID);

      if (alreadyOpen) startReturning();
      else            startFirstVisit();

    } catch (err) {
      console.error('[KA-II] Kapitel 0 konnte nicht starten.', err);
      document.getElementById('ch0Fault')?.classList.remove('hidden');
    }
  }

  function startFirstVisit() {
    GameEngine.dialogue.load([
      { speaker: 'SYSTEM', text: 'REAKTIVIERUNGSPROTOKOLL // INITIALISIERT.' },
      { speaker: 'SYSTEM', text: 'EINGANGSSEKTOR 7C.' },
      { speaker: 'SYSTEM', text: 'LETZTE VOLLSYNCHRONISIERUNG: VOR 2.847 TAGEN.' },
      { speaker: 'SYSTEM', text: 'SCHLEUSENANTRIEB // KEINE ANTWORT.' },
      { speaker: 'SYSTEM', text: 'MOBILE EINHEITEN // KEINE ANTWORT.' },
      { speaker: 'SYSTEM', text: 'MANUELLE FREIGABE ERFORDERLICH.' },
    ], () => {
      S.introDone = true;
      loadHotspots();
      updateProgress();
    });
  }

  /** Revisit after the seal is already open: no re-lock, no repeated prologue. */
  function startReturning() {
    S.unlocked = true;
    setAwake(true);
    // Safety net: if a prior visit solved the ring but the tab closed before
    // the (delayed, queued-after-the-quiet-moment) achievement toast fired,
    // this catches it on return. unlock() is idempotent — no-op if already
    // unlocked — so it's safe to call unconditionally on every revisit.
    GameEngine.achievements.unlock('ch0_complete');
    GameEngine.dialogue.load([
      { speaker: 'SYSTEM', text: 'EINGANGSSEKTOR 7C.' },
      { speaker: 'SYSTEM', text: 'SCHLEUSE // BETRIEBSBEREIT.' },
    ], () => {
      S.introDone = true;
      loadHotspots();
      updateProgress();
    });
  }

  function wireControls() {
    document.getElementById('hintBtn')?.addEventListener('click', showHint);
    document.getElementById('puzzleResetBtn')?.addEventListener('click', resetPuzzle);
    document.getElementById('puzzleCloseBtn')?.addEventListener('click', closePuzzle);

    document.querySelectorAll('.puzzle-key').forEach(btn => {
      btn.addEventListener('click', () => addSymbol(btn));
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isPuzzleOpen() && !S.unlocked) closePuzzle();
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE
  // ═══════════════════════════════════════════════════════════════
  function loadHotspots() {
    const hs = DECOR.slice();

    // required markings — a visible pulse, because this is the tutorial
    REFERENCE_ORDER.forEach(key => {
      const ref = REFERENCES[key];
      if (key === 'ring') return;   // the door itself is added below
      hs.push({
        ...ref.pos,
        label:     ref.label,
        aria:      ref.aria,
        prop:      ref.prop,
        className: 'req-hotspot ref-' + key,
        onClick:   () => examineReference(key),
      });
    });

    // the seal itself
    hs.push({
      ...REFERENCES.ring.pos,
      label:     REFERENCES.ring.label,
      aria:      S.unlocked ? 'Sektor 01 betreten' : 'Schleusenring untersuchen',
      className: 'door-hotspot ref-ring',
      onClick:   clickDoor,
    });

    // optional atmosphere — quieter markers, no pulse
    ENVIRONMENT.forEach(env => {
      hs.push({
        ...env.pos,
        label:     env.label,
        aria:      env.aria,
        prop:      env.prop,
        className: 'env-hotspot env-' + env.key,
        onClick:   () => examineEnvironment(env),
      });
    });

    GameEngine.scene.load({ hotspots: hs });
    if (S.unlocked) document.querySelector('.env-light')?.classList.add('ch0-lit');
  }

  function examineReference(key) {
    const ref = REFERENCES[key];
    if (S.referencesFound[key]) {
      GameEngine.dialogue.load(ref.reread || ref.lines);
      return;
    }
    S.referencesFound[key] = true;
    markFound(key);
    updateProgress();
    GameEngine.dialogue.load(ref.lines);
  }

  function examineEnvironment(env) {
    const seen = !!envSeen[env.key];
    envSeen[env.key] = true;
    document.querySelector('.env-' + env.key)?.classList.add('found');

    if (S.unlocked && env.awakeLines) { GameEngine.dialogue.load(env.awakeLines); return; }
    GameEngine.dialogue.load(seen ? (env.reread || env.lines) : env.lines);
  }

  function markFound(key) {
    const el = document.querySelector('.ref-' + key);
    if (el) el.classList.add('found');
  }

  function clickDoor() {
    if (S.unlocked) {
      GameEngine.dialogue.load([
        { speaker: 'SYSTEM', text: 'SCHLEUSE // FREIGEGEBEN.' },
        { speaker: 'SYSTEM', text: 'SEKTOR 01 // ERREICHBAR.' },
      ], showChapterComplete);
      return;
    }

    // First look at the ring establishes the distinction the whole prologue
    // rests on: the authorisation is fine, the mechanism is not.
    if (!S.doorRead) {
      S.doorRead = true;
      S.referencesFound.ring = true;
      markFound('ring');
      updateProgress();
      GameEngine.dialogue.load(REFERENCES.ring.lines, openPuzzle);
      return;
    }
    openPuzzle();
  }

  // ═══════════════════════════════════════════════════════════════
  // HUD
  // ═══════════════════════════════════════════════════════════════
  function countReferences() {
    return Object.values(S.referencesFound).filter(Boolean).length;
  }

  function updateProgress() {
    const found = countReferences();
    const counter   = document.getElementById('cluesProgress');
    const objective = document.getElementById('objectiveText');

    if (counter) {
      if (S.unlocked)        counter.textContent = 'SCHLEUSE FREIGEGEBEN';
      else if (found >= 4)   counter.textContent = 'REFERENZEN: VOLLSTÄNDIG';
      else                   counter.textContent = `REFERENZEN: ${found} / 4`;
    }
    if (objective) {
      if (S.unlocked)      objective.textContent = 'SEKTOR 01 BETRETEN';
      else if (found > 0)  objective.textContent = 'REFERENZFOLGE REKONSTRUIEREN';
      else                 objective.textContent = 'SCHLEUSE MANUELL FREIGEBEN';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HINTS — free, progressive, SYSTEM only
  // ═══════════════════════════════════════════════════════════════
  function showHint() {
    const found = countReferences();

    if (S.unlocked) {
      GameEngine.dialogue.load([{ speaker: 'SYSTEM', text: 'SCHLEUSE // FREIGEGEBEN. SEKTOR 01 ERREICHBAR.' }]);
      return;
    }

    // The method hints open up once the markings are largely gathered, or once
    // the ring has actually been tried a couple of times.
    const deep = found >= 4 || S.attempts >= 2;

    if (!deep && found === 0) {
      GameEngine.dialogue.load([
        { speaker: 'SYSTEM', text: 'INTERAKTIVE BEREICHE SIND MARKIERT.' },
        { speaker: 'SYSTEM', text: 'DIE SCHLEUSE WURDE FRÜHER VON HAND BEDIENT. RESTE DER ALTEN BESCHRIFTUNG SIND NOCH LESBAR.' },
      ]);
      return;
    }

    if (!deep && found < 3) {
      GameEngine.dialogue.load([
        { speaker: 'SYSTEM', text: `REFERENZEN: ${found} / 4.` },
        { speaker: 'SYSTEM', text: 'DIE FRAGMENTE GEHÖREN ZUSAMMEN. KEINES DAVON IST FÜR SICH GENOMMEN DIE ANTWORT.' },
      ]);
      return;
    }

    if (!deep) {
      const missing = REFERENCE_ORDER.find(k => !S.referencesFound[k]);
      GameEngine.dialogue.load([
        { speaker: 'SYSTEM', text: 'EINE REFERENZ FEHLT.' },
        { speaker: 'SYSTEM', text: `${REFERENCES[missing].label} // NICHT ERFASST.` },
      ]);
      return;
    }

    S.hintStep = Math.min(S.hintStep + 1, 3);
    if (S.hintStep === 1) {
      GameEngine.dialogue.load([
        { speaker: 'SYSTEM', text: 'DIE BODENMARKIERUNG NENNT VIER ZAHLEN. DER RING TRÄGT VIER FORMEN.' },
        { speaker: 'SYSTEM', text: 'ES SIND GENAU SO VIELE.' },
      ]);
    } else if (S.hintStep === 2) {
      GameEngine.dialogue.load([
        { speaker: 'SYSTEM', text: 'DIE ZAHLEN BESCHREIBEN NICHT DIE POSITION DER TASTEN.' },
        { speaker: 'SYSTEM', text: 'SIE BESCHREIBEN DIE FORMEN.' },
      ]);
    } else {
      GameEngine.dialogue.load([
        { speaker: 'SYSTEM', text: 'FORMKENNZAHL = ANZAHL DER MARKIERTEN ECKPUNKTE. DER REFERENZPUNKT ZÄHLT ALS EINE.' },
        { speaker: 'SYSTEM', text: 'ORDNUNG: AUFSTEIGEND.' },
      ]);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SCHLEUSENRING — manual release
  // ═══════════════════════════════════════════════════════════════
  function isPuzzleOpen() {
    const m = document.getElementById('puzzleModal');
    return !!m && !m.classList.contains('hidden');
  }

  function openPuzzle() {
    if (S.unlocked) { showChapterComplete(); return; }
    const modal = document.getElementById('puzzleModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    resetPuzzle();
    setTimeout(() => modal.querySelector('.puzzle-key')?.focus(), 60);
  }

  function closePuzzle() {
    if (S.unlocked) return;                     // never close mid-release
    document.getElementById('puzzleModal')?.classList.add('hidden');
    document.querySelector('.door-hotspot')?.focus();
  }

  function addSymbol(btn) {
    if (S.inputLocked || S.sequence.length >= SEQUENCE_LENGTH) return;

    btn.classList.add('hit');
    setTimeout(() => btn.classList.remove('hit'), 160);

    S.sequence.push(btn.dataset.symbol);
    updateDisplay();
    setStatus(`REFERENZEN: ${S.sequence.length} / ${SEQUENCE_LENGTH}`, '');

    if (S.sequence.length === SEQUENCE_LENGTH) {
      S.inputLocked = true;                     // one validation per sequence
      GameEngine.puzzle.submit(S.sequence.join(''));
    }
  }

  function resetPuzzle() {
    if (S.unlocked) return;
    S.sequence = [];
    S.inputLocked = false;
    const display = document.getElementById('puzzleDisplay');
    display?.classList.remove('correct', 'wrong');
    updateDisplay();
    setStatus('BEREIT.', '');
  }

  function updateDisplay() {
    const display = document.getElementById('puzzleDisplay');
    if (!display) return;
    const slots = ['_', '_', '_', '_'];
    S.sequence.forEach((s, i) => { slots[i] = s; });
    display.innerHTML = slots
      .map(s => `<span class="puzzle-slot${s === '_' ? '' : ' filled'}">${s}</span>`)
      .join('');
  }

  function setStatus(text, type) {
    const el = document.getElementById('puzzleStatus');
    if (!el) return;
    el.textContent = text;
    el.className = 'puzzle-status sys-text' + (type ? ' ' + type : '');
  }

  function setNote(text) {
    const el = document.getElementById('puzzleNote');
    if (el) el.textContent = text || '';
  }

  // ─── FAIL ─────────────────────────────────────────────────────
  function onFail() {
    S.attempts++;
    const display = document.getElementById('puzzleDisplay');
    display?.classList.add('wrong');
    setStatus('REFERENZFOLGE NICHT ERKANNT.', 'error');
    try { A().fail(); } catch (_) {}
    GameEngine.fx.shake('.puzzle-card');

    // The mechanism stays neutral. It just doesn't move.
    if (S.attempts === 2) setNote('REFERENZFOLGE // AUFSTEIGEND.');
    if (S.attempts === 3) {
      const hb = document.getElementById('hintBtn');
      hb?.classList.add('nudge');
      setTimeout(() => hb?.classList.remove('nudge'), 1800);
    }
    if (S.attempts >= 4) setNote('SCHLEUSENRING // WEITERHIN GEDULDIG.');

    setTimeout(() => {
      display?.classList.remove('wrong');
      setStatus('MECHANIK ZURÜCKGESETZT.', '');
      S.sequence = [];
      S.inputLocked = false;
      updateDisplay();
      setTimeout(() => { if (!S.sequence.length && !S.unlocked) setStatus('BEREIT.', ''); }, 700);
    }, 780);
  }

  // ─── SOLVE ────────────────────────────────────────────────────
  function onSolve() {
    S.unlocked = true;

    // Persist first, then play. If the tab dies during the cinematic, the
    // chapter still counts as finished.
    GameEngine.state.setFlag(DOOR_FLAG);
    GameEngine.state.markChapterComplete(CHAPTER_ID);

    document.getElementById('puzzleDisplay')?.classList.add('correct');
    setNote('');
    setStatus('REFERENZFOLGE BESTÄTIGT.', 'success');
    cueMechanism();

    setTimeout(() => {
      document.getElementById('puzzleModal')?.classList.add('hidden');
      setAwake(true);
      // #sceneCanvas, not #sceneWrapper — the wrapper's own sceneFadeIn rule
      // (chapter0.css, loaded after global.css) would win the cascade over
      // .fx-shake at equal specificity and silently swallow the shake.
      GameEngine.fx.shake('#sceneCanvas');
      updateProgress();
    }, 900);

    // one deep strike, somewhere far inside
    setTimeout(() => { cueKlang(); klangCaption(); }, 1900);

    // the toast lands in the quiet, not over the door text
    setTimeout(() => GameEngine.achievements.unlock('ch0_complete'), 2600);

    setTimeout(() => {
      GameEngine.dialogue.load([
        { speaker: 'SYSTEM', text: 'SCHLEUSENRING // FREIGEGEBEN.' },
        { speaker: 'SYSTEM', text: 'REAKTIVIERUNGSPROTOKOLL // AKTIV.' },
        { speaker: 'SYSTEM', text: 'NETZSEGMENT 01 // STARTVORGANG.' },
        { speaker: 'SYSTEM', text: 'SEKTOR 01 // ERREICHBAR.' },
      ], showChapterComplete);
    }, 3400);
  }

  /** The room wakes: ring turns, dust falls, one fixture comes back. */
  function setAwake(on) {
    document.body.classList.toggle('ch0-awake', !!on);
    document.getElementById('phDoor')?.classList.toggle('door-unlocked', !!on);
    document.querySelector('.env-light')?.classList.toggle('ch0-lit', !!on);
    // the door's behaviour changes on unlock — its screen-reader label should too
    document.querySelector('.door-hotspot')
      ?.setAttribute('aria-label', on ? 'Sektor 01 betreten' : 'Schleusenring untersuchen');
    const dust = document.getElementById('phDust');
    if (on && dust) {
      dust.classList.remove('falling');
      void dust.offsetWidth;
      dust.classList.add('falling');
    }
  }

  function klangCaption() {
    const canvas = document.getElementById('sceneCanvas');
    if (!canvas) return;
    const el = document.createElement('div');
    el.className = 'ch0-klang';
    el.textContent = '*KLANG.*';
    canvas.appendChild(el);
    setTimeout(() => el.remove(), 3400);
  }

  // ─── AUDIO CUES ───────────────────────────────────────────────
  // Deliberately low and mechanical rather than a bright fanfare — this is a
  // threshold, not a victory.
  function cueMechanism() {
    try {
      A().tone({ freq: 54, type: 'sawtooth', dur: 1.7, vol: 0.13, glideTo: 96 });
      A().tone({ freq: 82, type: 'triangle', dur: 1.7, vol: 0.06 });
    } catch (_) {}
  }

  function cueKlang() {
    try {
      A().tone({ freq: 78, type: 'sine',     dur: 2.4, vol: 0.17, glideTo: 40 });
      A().tone({ freq: 155, type: 'triangle', dur: 1.2, vol: 0.06 });
    } catch (_) {}
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPLETE
  // ═══════════════════════════════════════════════════════════════
  function showChapterComplete() {
    const cc   = document.getElementById('chapterComplete');
    const prog = document.getElementById('ccProgress');
    if (!cc) return;

    const completed = (GameEngine.state.get('chaptersCompleted') || []).length;
    if (prog) prog.textContent = `FORTSCHRITT: ${completed} / 9`;

    cc.classList.remove('hidden');
    setTimeout(() => document.getElementById('ccEnter')?.focus(), 700);
  }

  // ─── PUBLIC API ──────────────────────────────────────────────
  return {
    init,
    showHint,
    openPuzzle,
    closePuzzle,
    resetPuzzle,
  };

})();

document.addEventListener('DOMContentLoaded', () => Chapter0.init());
