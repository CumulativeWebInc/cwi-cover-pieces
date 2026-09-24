// Suite: procedural edge complementarity (genEdges)
'use strict';
const { CP, ok, run } = require('./run.js');

run('test-edges', () => {
  const grids = [[1,1],[1,5],[5,1],[2,2],[4,6],[6,9],[9,6],[8,12]];
  for(const [rows, cols] of grids){
    for(const seed of [1, 42, 987654]){
      const E = CP.genEdges(rows, cols, CP.mulberry32(seed));
      let good = true, tabs = 0;
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
        const e = E[r][c];
        for(const k of ['t','b','l','r']) if(![-1,0,1].includes(e[k])) good = false;
        if(e.t===1||e.t===-1) tabs++;
        if(c < cols-1 && E[r][c].r !== -E[r][c+1].l) good = false;   // horizontal neighbors complement
        if(r < rows-1 && E[r][c].b !== -E[r+1][c].t) good = false;   // vertical neighbors complement
        if(r===0 && e.t!==0) good = false;                          // border flat
        if(r===rows-1 && e.b!==0) good = false;
        if(c===0 && e.l!==0) good = false;
        if(c===cols-1 && e.r!==0) good = false;
      }
      ok(good, `edges complementary+borders rows=${rows} cols=${cols} seed=${seed}`);
      if(rows>1 && cols>1) ok(tabs > 0, `non-trivial tabs generated rows=${rows} cols=${cols}`);
    }
  }
  /* tabs/blanks roughly balanced */
  const E = CP.genEdges(9, 6, CP.mulberry32(7));
  let pos=0, neg=0;
  for(let r=0;r<9;r++) for(let c=0;c<6;c++){
    for(const k of ['t','b','l','r']){ if(E[r][c][k]===1) pos++; if(E[r][c][k]===-1) neg++; }
  }
  ok(Math.abs(pos-neg) < (pos+neg)*0.35, 'tab/blank balance within 35%');
  /* determinism: same seed -> identical edges */
  const a = JSON.stringify(CP.genEdges(6,9,CP.mulberry32(99)));
  const b = JSON.stringify(CP.genEdges(6,9,CP.mulberry32(99)));
  ok(a === b, 'genEdges deterministic for same seed');
  /* gridFor: product exact, aspect matched */
  for(const n of [24,54,96]){
    const gr = CP.gridFor(n, 640, 640);
    ok(gr.rows * gr.cols === n, `gridFor product exact n=${n}`);
  }
  const gr2 = CP.gridFor(54, 360, 640); /* portrait image -> more rows than cols */
  ok(gr2.rows >= gr2.cols, 'gridFor respects portrait aspect');
});
