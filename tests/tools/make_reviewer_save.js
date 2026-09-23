/* Prints a [ SPIELSTAND ] import code for a fully finished run — so a
   reviewer can see the ending without playing nine chapters.
   Re-run after the real coordinates go into MAIN in js/engine.js. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(ROOT, 'js/engine.js'), 'utf8');
const achBlock = src.match(/const ALL = \[[\s\S]*?\n    \];/)[0];
const ach = [...achBlock.matchAll(/\{\s*id:\s*'([a-z0-9_]+)'/g)].map(m => m[1]);
const cal = {}; ['ch1','ch2','ch3','ch4','ch5','ch6','ch7','ch8'].forEach(c => cal[c] = true);
const save = { version: '1.1.0', schemaVersion: 4, chaptersCompleted: ['ch0','ch1','ch2','ch3','ch4','ch5','ch6','ch7','ch8'],
  puzzlesSolved: { ch0_door: true }, signalsFound: ['sig_01','sig_02','sig_03','sig_04','sig_05'], achievementsUnlocked: ach,
  flags: { ka1_verified: true, reactivation_consent_seen: true, ch0_door_open: true, has_eissplitter: true, zieldaten: true, truth_revealed: true },
  chapterState: {}, calibration: cal, settings: {}, firstPlay: false };
// checksum exactly as the engine computes it, so the import is not flagged as edited
const material = JSON.stringify([save.schemaVersion, save.chaptersCompleted, save.signalsFound.slice().sort(), save.achievementsUnlocked.slice().sort(), Object.keys(save.calibration).sort(), true, true, true]);
let h = 0x811c9dc5; for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0; }
save.checksum = h.toString(16).padStart(8, '0');
console.log(Buffer.from(JSON.stringify(save), 'utf8').toString('base64'));
