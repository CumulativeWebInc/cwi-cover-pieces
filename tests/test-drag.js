// Suite: drag→drop→snap + second-finger scenarios against the REAL script.
// Uses the real createDragController / createPanController from the shipped file,
// driven through fake element objects and the same call sequence the DOM
// pointer handlers perform (pointerdown→begin, pointermove→move, pointerup→end).
'use strict';
const { CP, ok, eq, run } = require('./run.js');

/* fake element: style transform writes, classList, pointer capture — like the DOM layer */
function fakeEl(){
  const classes = new Set();
  return {
    style:{},
    dataset:{},
    classList:{ add:c=>classes.add(c), remove:c=>classes.delete(c),
                toggle:(c,f)=>{ f?classes.add(c):classes.delete(c); }, contains:c=>classes.has(c) },
    setPointerCapture(){}, releasePointerCapture(){},
    _classes:classes
  };
}
/* builds a harness mirroring makeDragApi()/afterDrop()'s pure parts from the real script */
function harness(pieceCount){
  const g = CP.createGame('zooted', pieceCount || 24, false, 4242);
  CP.layoutGame(g, 640, 640);
  CP.scatterPieces(g, CP.mulberry32(11));
  const els = new Map();
  for(const p of g.pieces){ p._el = fakeEl(); els.set(p.id, p._el); }
  const api = {
    getPos(id){ const p=g.pieces[id]; return {x:p.x, y:p.y}; },
    isLocked(id){ return g.pieces[id].locked; },
    unitIds(id){ const gid=g.pieces[id].gid;
      return g.pieces.filter(p=>p.gid===gid && !p.locked).map(p=>p.id); },
    lift(ids,on){ for(const id of ids) g.pieces[id]._el.classList.toggle('dragging', on); },
    setPositions(map){ for(const [id,pos] of map){
      const p=g.pieces[id]; p.x=pos.x; p.y=pos.y;
      p._el.style.transform = 'translate('+p.x+'px,'+p.y+'px)'; } },
    drop(){}, cancelled(){}
  };
  const drag = CP.createDragController(api);
  /* replicate afterDrop's pure resolution (snap + merge) exactly */
  function resolveDrop(res){
    let snapped = 0;
    for(const id of res.ids){
      const p = g.pieces[id];
      const t = CP.snapTarget(g, p);
      if(t){ p.x=t.x; p.y=t.y; p.rot=0; p.locked=true; p.gid=-1; snapped++; }
    }
    const unlocked = res.ids.filter(id=>!g.pieces[id].locked);
    if(unlocked.length) CP.mergeGroups(g, CP.mergePairs(g, unlocked));
    return snapped;
  }
  return { g, drag, api, resolveDrop };
}
/* DOM-handler-equivalent pointer sequence */
function pointerDown(h, pid, clientX, clientY, toWorld){
  const p = h.g.pieces[0];
  const w = toWorld(clientX, clientY);
  return h.drag.begin(p, pid, w.x, w.y);
}

run('test-drag', () => {
  const W2S = 1; /* world == screen in the harness */
  const toWorld = (x,y) => ({x:x*W2S, y:y*W2S});

  /* --- scenario 1: drag a piece 1:1 to its home, drop, snaps + locks --- */
  {
    const h = harness(24);
    const p = h.g.pieces[0];
    const startX = p.x, startY = p.y;
    ok(h.drag.begin(p, 7, startX, startY), 'drag begins for first pointer');
    /* move the pointer by (+dx,+dy); piece must follow exactly 1:1 */
    const dx = 123.5, dy = -40.25;
    ok(h.drag.move(7, startX+dx, startY+dy), 'move accepted for owner pointer');
    eq(Math.round((p.x-startX)*100)/100, dx, 'piece tracks pointer X 1:1');
    eq(Math.round((p.y-startY)*100)/100, dy, 'piece tracks pointer Y 1:1');
    ok(p._el._classes.has('dragging'), 'dragging lift class applied on grab');
    /* now teleport-drag it onto its home (simulating the user dragging it there) */
    h.drag.cancel(7);
    p.x = p.homeX - 2; p.y = p.homeY + 1;   /* within tolerance */
    ok(h.drag.begin(p, 7, p.x, p.y), 're-grab near home');
    const res = h.drag.end(7);
    ok(res && res.ids.includes(p.id), 'drop returns the dragged unit');
    ok(!p._el._classes.has('dragging'), 'dragging lift class removed on drop');
    const snapped = h.resolveDrop(res);
    eq(snapped, 1, 'piece snapped on drop within tolerance');
    ok(p.locked && p.x === p.homeX && p.y === p.homeY, 'piece locked exactly at home');
    /* locked piece cannot be dragged again */
    ok(!h.drag.begin(p, 9, p.x, p.y), 'locked piece refuses drag begin');
  }

  /* --- scenario 2: drop far from home -> stays free, no snap --- */
  {
    const h = harness(24);
    const p = h.g.pieces[3];
    p.x = p.homeX + 400; p.y = p.homeY + 400;
    ok(h.drag.begin(p, 3, p.x, p.y), 'drag begins');
    h.drag.move(3, p.x+10, p.y+10);
    const res = h.drag.end(3);
    const snapped = h.resolveDrop(res);
    eq(snapped, 0, 'no snap when dropped far from home');
    ok(!p.locked, 'piece remains unlocked');
  }

  /* --- scenario 3: SECOND FINGER DURING DRAG never corrupts state --- */
  {
    const h = harness(24);
    const p = h.g.pieces[0];
    const sx = p.x, sy = p.y;
    ok(h.drag.begin(p, 1, sx, sy), 'finger 1 begins drag');
    ok(!h.drag.begin(p, 2, sx, sy), 'finger 2 begin REJECTED while drag active');
    ok(!h.drag.begin(h.g.pieces[5], 2, 0, 0), 'finger 2 cannot start another piece either');
    const before = { x:p.x, y:p.y };
    ok(!h.drag.move(2, sx+999, sy+999), 'finger 2 move REJECTED');
    eq(p.x, before.x, 'finger 2 move did not move piece X');
    eq(p.y, before.y, 'finger 2 move did not move piece Y');
    ok(h.drag.end(2) === null, 'finger 2 end returns null');
    ok(h.drag.busy, 'drag still active after finger-2 end');
    ok(h.drag.move(1, sx+50, sy+25), 'finger 1 move still works');
    eq(p.x, sx+50, 'piece follows finger 1 after interference');
    ok(!h.drag.cancel(2), 'finger 2 cancel rejected');
    const res = h.drag.end(1);
    ok(res !== null && !h.drag.busy, 'finger 1 end completes the drag');
  }

  /* --- scenario 4: pointercancel restores drag-start positions --- */
  {
    const h = harness(24);
    const p = h.g.pieces[0];
    const sx = p.x, sy = p.y;
    h.drag.begin(p, 1, sx, sy);
    h.drag.move(1, sx+300, sy+300);
    ok(Math.abs(p.x-(sx+300)) < 0.001, 'piece moved before cancel');
    ok(h.drag.cancel(1), 'cancel accepted for owner');
    eq(p.x, sx, 'cancel restores start X');
    eq(p.y, sy, 'cancel restores start Y');
    ok(!h.drag.busy, 'no active drag after cancel');
  }

  /* --- scenario 5: group drag moves members rigidly --- */
  {
    const h = harness(24);
    const a = h.g.pieces[0], b = h.g.pieces[1];
    const tol = CP.snapTol(h.g);
    b.x = a.x + (b.homeX - a.homeX); b.y = a.y + (b.homeY - a.homeY); /* perfect relative offset */
    CP.mergeGroups(h.g, CP.mergePairs(h.g, [a.id]));
    eq(a.gid, b.gid, 'precondition: a and b grouped');
    const relX = b.x - a.x, relY = b.y - a.y;
    h.drag.begin(a, 1, a.x, a.y);
    h.drag.move(1, a.x+77, a.y-33);
    eq(Math.round((b.x-a.x)*1000)/1000, Math.round(relX*1000)/1000, 'group members keep rigid X offset');
    eq(Math.round((b.y-a.y)*1000)/1000, Math.round(relY*1000)/1000, 'group members keep rigid Y offset');
    h.drag.end(1);
  }

  /* --- scenario 6: pan controller single-pointer invariant --- */
  {
    let px = 0, py = 0;
    const pan = CP.createPanController({ panBy(dx,dy){ px+=dx; py+=dy; } });
    ok(pan.begin(1, 100, 100), 'pan begins');
    ok(!pan.begin(2, 0, 0), 'second pan pointer rejected');
    ok(!pan.move(2, 500, 500), 'second pan move rejected');
    eq(px, 0, 'second finger did not pan');
    pan.move(1, 130, 110);
    eq(px, 30, 'pan X delta correct'); eq(py, 10, 'pan Y delta correct');
    pan.cancel(2); ok(pan.busy, 'wrong-pointer cancel ignored');
    pan.cancel(1); ok(!pan.busy, 'owner cancel ends pan');
  }

  /* --- scenario 7: drag with zero movement = tap, not a move --- */
  {
    const h = harness(24);
    const p = h.g.pieces[0];
    h.drag.begin(p, 1, p.x, p.y);
    const res = h.drag.end(1);
    eq(res.moved, false, 'no movement -> moved=false (tap, counts no move)');
  }
});
