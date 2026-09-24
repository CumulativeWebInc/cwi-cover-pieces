// Suite: snap tolerance behavior (snapTarget, mergePairs, mergeGroups)
'use strict';
const { CP, ok, eq, run } = require('./run.js');

function makeGame(){
  const g = CP.createGame('zooted', 24, false, 1234);
  CP.layoutGame(g, 640, 640);
  return g;
}

run('test-snap', () => {
  const g = makeGame();
  const tol = CP.snapTol(g);
  ok(tol > 0, 'snap tolerance positive (' + tol.toFixed(1) + 'px)');
  const p = g.pieces[0];

  /* exact home -> snaps */
  p.x = p.homeX; p.y = p.homeY; p.rot = 0; p.locked = false;
  let t = CP.snapTarget(g, p);
  ok(t && t.x === p.homeX && t.y === p.homeY, 'snap at exact home');

  /* just inside tolerance -> snaps */
  p.x = p.homeX + tol*0.9; p.y = p.homeY;
  ok(CP.snapTarget(g, p) !== null, 'snap just inside tolerance');

  /* just outside tolerance -> no snap */
  p.x = p.homeX + tol*1.1; p.y = p.homeY;
  ok(CP.snapTarget(g, p) === null, 'no snap just outside tolerance');

  /* far away -> no snap */
  p.x = p.homeX + 500; p.y = p.homeY + 500;
  ok(CP.snapTarget(g, p) === null, 'no snap far from home');

  /* rotated piece -> no snap (rotation mode) */
  p.x = p.homeX; p.y = p.homeY; p.rot = 15;
  ok(CP.snapTarget(g, p) === null, 'no snap when rotated 15°');

  /* locked piece -> no snap */
  p.rot = 0; p.locked = true;
  ok(CP.snapTarget(g, p) === null, 'no snap when locked');
  p.locked = false;

  /* neighbor relative snap -> merge pairs */
  const g2 = makeGame();
  CP.scatterPieces(g2, CP.mulberry32(5));
  const a = g2.pieces[0];                       /* grid (0,0) */
  const b = g2.pieces[1];                       /* grid (0,1), right neighbor */
  /* place b at its correct relative offset from a (within tol) */
  b.x = a.x + (b.homeX - a.homeX) + tol*0.3;
  b.y = a.y + (b.homeY - a.homeY) - tol*0.2;
  const pairs = CP.mergePairs(g2, [a.id]);
  ok(pairs.length === 1 && pairs[0][0] === a.id && pairs[0][1] === b.id,
     'merge pair detected for correctly-offset neighbors');

  /* too far apart -> no merge */
  b.x = a.x + (b.homeX - a.homeX) + tol*3;
  ok(CP.mergePairs(g2, [a.id]).length === 0, 'no merge when neighbors too far');

  /* locked neighbor excluded */
  b.x = a.x + (b.homeX - a.homeX); b.y = a.y + (b.homeY - a.homeY);
  b.locked = true;
  ok(CP.mergePairs(g2, [a.id]).length === 0, 'no merge with locked neighbor');
  b.locked = false;

  /* mergeGroups unifies gid */
  const ga = a.gid, gb = b.gid;
  ok(ga !== gb, 'precondition: distinct groups');
  CP.mergeGroups(g2, [[a.id, b.id]]);
  eq(a.gid, b.gid, 'mergeGroups unifies group id');
  const members = CP.groupMembers(g2, a.gid).map(x => x.id).sort();
  ok(members.includes(a.id) && members.includes(b.id), 'groupMembers returns merged set');

  /* groupMembers excludes locked */
  a.locked = true;
  ok(!CP.groupMembers(g2, a.gid).some(x => x.id === a.id), 'groupMembers excludes locked pieces');

  /* scoring sanity */
  const g3 = makeGame();
  g3.pieces[0].locked = true; g3.pieces[1].locked = true;
  g3.moves = 4; g3.hints = 1; g3.elapsed = 130;
  const s = CP.computeScore(g3);
  eq(s, 200 - 8 - 150 - 20, 'computeScore = placed*100 - moves*2 - hints*150 - minutes*10');
  g3.hints = 100;
  eq(CP.computeScore(g3), 0, 'computeScore never negative');
  const g4 = makeGame(); g4.hints = 0; g4.elapsed = 24*20; g4.moves = 24;
  eq(CP.starRating(g4), 3, 'starRating 3 for clean fast solve');
  g4.elapsed = 24*200;
  eq(CP.starRating(g4), 1, 'starRating 1 for slow solve');
});
