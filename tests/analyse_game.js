/* Whole-game static audit: gates, progression chain, coordinate hygiene,
   house rules, release placeholders, the fiction boundary in Sector 07. */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'); const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let fail = 0; const ok = m => console.log('  ok   ' + m), bad = m => { console.log('  FAIL ' + m); fail++; }; const check = (c, m) => c ? ok(m) : bad(m);
const chapters = [0,1,2,3,4,5,6,7,8,9]; const src = {}, html = {}; chapters.forEach(n => { src[n] = read(`chapter${n}/chapter${n}.js`); html[n] = read(`chapter${n}/chapter${n}.html`); });
const engine = read('js/engine.js'), title = read('js/title.js'), access = read('js/access.js');
const spoken = chapters.map(n => [...src[n].matchAll(/(?:text|subtitle|label|prompt|hint):\s*'([^']*)'/g)].map(m => m[1]).join('\n')).join('\n');

console.log('\n[1] gates');
for (let n = 0; n <= 8; n++) check(new RegExp(`progress\\.require\\('ch${n}'\\)`).test(src[n]), `ch${n} asks the gate first`);
check(/isChapterComplete\('ch8'\)/.test(src[9]) && /allSignals\(\)/.test(src[9]) && /████/.test(src[9]), 'ch9 gates itself on ch8 + all signals and refuses without a name');

console.log('\n[2] reactivation chain');
const PCT = JSON.parse((engine.match(/const PCT = (\{[^}]*\})/) || [,'{}'])[1].replace(/(\w+):/g, '"$1":'));
const vals = ['ch1','ch2','ch3','ch4','ch5','ch6','ch7','ch8'].map(k => PCT[k]);
check(vals.every((v, i) => i === 0 || v > vals[i - 1]) && vals[7] === 100, `PCT strictly rises to 100 (${vals.join(' → ')})`);
check(/MAIN_SECTORS = \['ch1'/.test(engine) && !/\/ 9 KAPITEL|\/9 KAPITEL/.test(engine + title + chapters.map(n => src[n] + html[n]).join('')), 'visible progression counts eight sectors, never nine');

console.log('\n[3] coordinates');
const shipped = chapters.map(n => src[n] + html[n]).join('\n') + engine + title + access;
check(!/N\s*\d{1,3}\s*°\s*\d/.test(shipped.replace(/N 00° 00\.000 · E 000° 00\.000/g, '')), 'no coordinate-shaped literal beyond the placeholder');
check(/const MAIN = \[/.test(engine) && !/const BONUS = \[/.test(engine) && !/reconstructBonus/.test(engine), 'exactly one fragment table in the calibration module');
check(!shipped.split('\n').some(l => /zieldaten_text|bonuszieldaten/i.test(l) && !/delete\s/.test(l)), 'coordinates are never a plaintext field');

console.log('\n[4] house rules (in anything a character says)');
[[/geocach/i,'geocaching'],[/\bFTF\b/,'FTF'],[/logbuch/i,'Logbuch'],[/travel ?bug/i,'travel bug'],[/Faxenmeier/i,'a real name'],[/Cubus/i,'Cubus'],[/Castra ?Enigma/i,'Castra Enigma'],[/V-NTG/,'V-NTG'],[/\b(Remi|Amanda)\b/,'a real first name']]
  .forEach(([re, what]) => check(!re.test(spoken), `no ${what}`));
check(/Team_Aperture Geocaching-Projekt/.test(engine), '  (the credits footer is the one allowed mention)');
const vtgm = chapters.flatMap(n => [...src[n].matchAll(/speaker:\s*'V-TGM',\s*text:\s*'[^']*'(?![^}]*subtitle)/g)]);
check(vtgm.length === 0, `every V-TGM line carries a subtitle (${vtgm.length} without)`);

console.log('\n[5] release placeholders');
check(!/\bTODO\b|\bFIXME\b|\bXXX\b|console\.log\(/.test(shipped), 'no creator notes or debug logging');
check(!/example\.(com|org)|localhost|127\.0\.0\.1/.test(shipped), 'no dummy URLs');
const url = (access.match(/KA1_LISTING_URL\s*=\s*'([^']*)'/) || [])[1] || '';
check(/geocaching\.com\/geocache\//.test(url), `KA-I listing URL is real (${url})`);
check(!/\b(Remi|Amanda)\b|V-NTG/.test(shipped + chapters.map(n => read(`chapter${n}/chapter${n}.css`)).join('')), 'no real first name or V-NTG anywhere in shipped files');

console.log('\n[6] the fiction boundary in sector 07');
['fakeComplete','bsod','integrity'].forEach(id => { check(new RegExp(`id="${id}"[^>]*data-fictional-ui=|data-fictional-ui=[^>]*id="${id}"`).test(html[7]), `  ${id} is marked data-fictional-ui`);
  const block = (src[7].match(new RegExp(`el\\('${id}'\\)[\\s\\S]{0,900}`)) || [''])[0]; check(!/markChapterComplete|achievements\.unlock|setFlag\(/.test(block), `  ${id} writes nothing to the save`); });

console.log(`\n${fail ? fail + ' FINDING(S)' : 'AUDIT CLEAN'}`); process.exit(fail ? 1 : 0);
