// Smoke tests for Cover Pieces pure logic, extracted from the shipped index.html.
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/\/\*__PURE_BEGIN__\*\/([\s\S]*?)\/\*__PURE_END__\*\//);
if (!m) { console.error('FAIL: pure region not found'); process.exit(1); }
eval(m[1]);

let pass = 0, fail = 0;
function ok(cond, name) { if (cond) { pass++; } else { fail++; console.error('FAIL:', name); } }

// 1. edge table complementarity across several grid sizes
[[2,2],[4,6],[6,4],[10,15],[1,5],[5,1]].forEach(([rows, cols]) => {
  const E = genEdgeTable(rows, cols, makeRng(12345));
  let good = true;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const e = E[r][c];
    for (const k of ['t','r','b','l']) if (![-1,0,1].includes(e[k])) good = false;
    if (c < cols-1 && E[r][c].r !== -E[r][c+1].l) good = false;
    if (r < rows-1 && E[r][c].b !== -E[r+1][c].t) good = false;
    if (r === 0 && e.t !== 0) good = false;
    if (r === rows-1 && e.b !== 0) good = false;
    if (c === 0 && e.l !== 0) good = false;
    if (c === cols-1 && e.r !== 0) good = false;
    // interior edges must be non-flat (real interlocking tabs/blanks)
    if (c < cols-1 && E[r][c].r === 0) good = false;
    if (r < rows-1 && E[r][c].b === 0) good = false;
  }
  ok(good, `edge table ${rows}x${cols} complementary + flat borders + interlocking interior`);
});
// determinism with same seed
const a = JSON.stringify(genEdgeTable(6,8,makeRng(7))), b = JSON.stringify(genEdgeTable(6,8,makeRng(7)));
ok(a === b, 'edge table deterministic per seed');
ok(JSON.stringify(genEdgeTable(6,8,makeRng(7))) !== JSON.stringify(genEdgeTable(6,8,makeRng(8))), 'edge table varies per seed');

// 2. snap tolerance
ok(withinSnap(100, 100, 105, 103, 10) === true, 'snap inside tolerance');
ok(withinSnap(100, 100, 120, 100, 10) === false, 'snap outside tolerance x');
ok(withinSnap(100, 100, 100, 89, 10) === false, 'snap outside tolerance y');
ok(withinSnap(100, 100, 110, 110, 10) === true, 'snap exactly on boundary');
ok(withinSnap(0, 0, 0, 0, 0) === true, 'snap zero tolerance exact');

// 3. save/load round-trip
const st = { imageKey:'zooted', difficulty:54, rows:6, cols:9, rotation:false, elapsed:123.4, score:450,
  attempts:7, hints:1, camera:{zoom:1.2,panX:300,panY:250},
  pieces:[{id:'0_0',x:10.55,y:20.44,rot:15,locked:true,home:true,group:'g1',inTray:false},
          {id:'0_1',x:-5.2,y:99.9,rot:0,locked:false,home:false,group:null,inTray:true}] };
const back = parseSave(serializeState(st));
ok(back.imageKey==='zooted' && back.difficulty===54 && back.elapsed===123.4, 'save fields round-trip');
ok(back.rows===6 && back.cols===9, 'save grid dims round-trip (restore uses exact rows/cols)');
ok(back.pieces.length===2 && back.pieces[0].x===10.6 && back.pieces[0].group==='g1' && back.pieces[0].home===true, 'save pieces round-trip (rounded, flags)');
ok(back.pieces[1].inTray===true && back.pieces[1].locked===false, 'save tray piece flags');
ok(back.camera.zoom===1.2 && back.camera.panX===300, 'save camera round-trip');
let threw=false; try{ parseSave('{"v":2,"pieces":[]}'); }catch(e){ threw=true; }
ok(threw, 'parseSave rejects wrong version');
threw=false; try{ parseSave('not json'); }catch(e){ threw=true; }
ok(threw, 'parseSave rejects garbage');

// 4. scoring math
ok(scoreForPiece(24)===83 && scoreForPiece(54)===37 && scoreForPiece(150)===13, 'scoreForPiece scales inversely');
ok(calcStars(2600)===3 && calcStars(2550)===3 && calcStars(2000)===2 && calcStars(1799)===1 && calcStars(0)===1, 'calcStars thresholds');
ok(timeBonus(0,54)===1000, 'timeBonus max at 0 elapsed');
ok(timeBonus(54*20,54)===0 && timeBonus(99999,54)===0, 'timeBonus zero at/over par');
ok(timeBonus(270,54)===750, 'timeBonus half par = 750');

// 5. URL validation
ok(validImageUrl('https://example.com/a.jpg')===true, 'valid https url');
ok(validImageUrl('http://x.co/p.png')===true, 'valid http url');
ok(validImageUrl('javascript:alert(1)')===false, 'reject javascript: scheme');
ok(validImageUrl('data:image/png;base64,xx')===false, 'reject data: scheme');
ok(validImageUrl('ftp://x/y')===false, 'reject ftp');
ok(validImageUrl('https://x/<script>')===false, 'reject angle brackets');
ok(validImageUrl('')===false && validImageUrl(null)===false, 'reject empty/null');

// 6. grid sizing
const g1=gridForCount(24,1); ok(g1.rows*g1.cols>=24 && g1.rows>=2 && g1.cols>=2, 'gridForCount 24');
const g2=gridForCount(150,16/9); ok(g2.rows*g2.cols>=150, 'gridForCount 150 wide');
const g3=gridForCount(96,9/16); ok(g3.rows*g3.cols>=96, 'gridForCount 96 tall');

console.log(`\nSMOKE: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
