/* Runs every suite and audit, one line each. */
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => /^(test_|analyse_).*\.js$/.test(f)).sort();
let bad = 0;
for (const f of files) {
  process.stdout.write(f.padEnd(34));
  try {
    const out = execSync(`node ${path.join(dir, f)}`, { encoding: 'utf8', timeout: 900000, stdio: ['ignore', 'pipe', 'pipe'] });
    const ok = /ALL CHECKS PASSED|AUDIT CLEAN|TESTS PASSED/.test(out) && !/\bFAIL\b/.test(out);
    console.log(ok ? 'ok' : 'FAILED'); if (!ok) { bad++; console.log(out.split('\n').filter(l => /FAIL|!!/.test(l)).slice(0, 4).map(l => '     ' + l).join('\n')); }
  } catch (e) { bad++; console.log('FAILED'); console.log((e.stdout || e.message || '').split('\n').filter(l => /FAIL|Error|!!/.test(l)).slice(0, 4).map(l => '     ' + l).join('\n')); }
}
console.log(`\n${bad ? bad + ' suite(s) failed' : 'everything passed'}`);
process.exit(bad ? 1 : 0);
