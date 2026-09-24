// Cover Pieces v2 — test harness. Loads the REAL shipped script and runs suites.
'use strict';
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(process.env.HOME, 'workspace/cwi-3games-build/cover-pieces/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const m = html.match(/<script>\n([\s\S]*)\n<\/script>/);
if(!m){ console.error('FATAL: script block not found'); process.exit(1); }
const game = require('module').createRequire(__filename);
// evaluate the extracted script as a module to get its exports
const Module = require('module');
const mod = new Module('cp-game', null);
mod._compile(m[1], '/tmp/cp-game.js');
const CP = mod.exports;

let pass = 0, fail = 0;
const failures = [];
function ok(cond, name){
  if(cond){ pass++; }
  else { fail++; failures.push(name); console.error('FAIL:', name); }
}
function eq(a, b, name){ ok(a === b, name + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }

const suites = process.argv.slice(2);
const all = suites.length === 0;
function run(name, fn){
  if(all || suites.includes(name)){
    console.log('--- ' + name + ' ---');
    fn();
  }
}

module.exports = { CP, ok, eq, run, html, htmlPath };

if(require.main === module){
  for(const f of ['test-edges.js','test-snap.js','test-save.js','test-drag.js','test-html.js']){
    require(path.join(__dirname, f));
  }
  console.log('\nRESULT: ' + pass + ' PASS, ' + fail + ' FAIL');
  if(failures.length) console.log('failures: ' + failures.join('; '));
  process.exit(fail ? 1 : 0);
}
