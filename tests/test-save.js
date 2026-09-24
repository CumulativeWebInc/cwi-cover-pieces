// Suite: save/load round-trip (serializeGame / deserializeGame)
'use strict';
const { CP, ok, eq, run } = require('./run.js');

run('test-save', () => {
  const g = CP.createGame('doves', 54, true, 777);
  CP.layoutGame(g, 360, 640);
  CP.scatterPieces(g, CP.mulberry32(9));
  /* simulate mid-game state */
  g.pieces[0].x = g.pieces[0].homeX; g.pieces[0].y = g.pieces[0].homeY;
  g.pieces[0].locked = true; g.pieces[0].gid = -1;
  g.pieces[1].x += 37.5; g.pieces[1].y -= 12.25; g.pieces[1].rot = 30;
  g.pieces[2].gid = g.pieces[3].gid; /* a merged group */
  g.zoom = 1.75; g.panX = -120.5; g.panY = 44;
  g.elapsed = 372; g.moves = 21; g.hints = 2;
  g.started = true;

  const json = CP.serializeGame(g);
  ok(typeof json === 'string' && json.length > 100, 'serializeGame produces JSON');
  const g2 = CP.deserializeGame(json);

  eq(g2.imageId, 'doves', 'imageId round-trips');
  eq(g2.pieceCount, 54, 'pieceCount round-trips');
  eq(g2.rotationMode, true, 'rotationMode round-trips');
  eq(g2.rows, g.rows, 'rows round-trips'); eq(g2.cols, g.cols, 'cols round-trips');
  eq(g2.pieces.length, 54, 'all pieces restored');
  let posOk = true, lockOk = true, gidOk = true;
  for(let i=0;i<g.pieces.length;i++){
    const a = g.pieces[i], b = g2.pieces[i];
    if(Math.abs(a.x-b.x) > 0.11 || Math.abs(a.y-b.y) > 0.11 || Math.abs(a.rot-b.rot) > 0.11) posOk = false;
    if(a.locked !== b.locked) lockOk = false;
    if(a.gid !== b.gid) gidOk = false;
    /* home positions recomputed identically */
    if(a.homeX !== b.homeX || a.homeY !== b.homeY) posOk = false;
  }
  ok(posOk, 'piece positions/rotations/home round-trip within 0.11px');
  ok(lockOk, 'locked flags round-trip');
  ok(gidOk, 'group ids round-trip');
  eq(g2.zoom, 1.75, 'zoom round-trips');
  eq(g2.panX, -120.5, 'panX round-trips'); eq(g2.panY, 44, 'panY round-trips');
  eq(g2.elapsed, 372, 'elapsed round-trips');
  eq(g2.moves, 21, 'moves round-trips');
  eq(g2.hints, 2, 'hints round-trips');
  eq(g2.score, CP.computeScore(g2), 'score recomputed on load');
  ok(g2.started, 'started flag set on load');

  /* corrupted saves rejected, never crash */
  for(const bad of ['not json', '{"v":2}', '{"v":1}', '{"v":1,"pieces":[]}', '{"v":1,"pieces":[[999,0,0,0,0,0]]}']){
    let threw = false;
    try{ CP.deserializeGame(bad); }catch(e){ threw = true; }
    ok(threw, 'corrupt save rejected: ' + bad.slice(0,24));
  }
  /* save is compact enough for localStorage */
  ok(json.length < 20000, 'save payload small (' + json.length + ' bytes for 54 pieces)');
});
