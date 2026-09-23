/* Repro harness: runs the REAL game script from code.html against a faithful
   fake DOM (bubbling, pointer capture retargeting, layout rects) and drives
   gameplay with synthetic pointer events. Usage: node harness.js
   Prints PASS/FAIL per scenario with evidence. */
"use strict";
const fs = require("fs");

/* ---------- fake DOM ---------- */
const captureMap = new Map(); // pointerId -> element
const allElements = [];

function makeClassList(el){
  return {
    add:(...c)=>c.forEach(x=>el._cls.add(x)),
    remove:(...c)=>c.forEach(x=>el._cls.delete(x)),
    contains:(x)=>el._cls.has(x),
    toggle:(x,f)=>{ const on = f===undefined?!el._cls.has(x):!!f; on?el._cls.add(x):el._cls.delete(x); return on; },
  };
}
class El {
  constructor(tag){
    this.tagName = (tag||"div").toUpperCase();
    this.children = []; this.parentNode = null;
    this.style = {}; this.dataset = {};
    this._cls = new Set(); this.classList = makeClassList(this);
    this._listeners = {}; this._id = "";
    this.textContent = ""; this.value = ""; this.checked = false;
    this.width = 0; this.height = 0; this.clientWidth = 0; this.clientHeight = 0;
    this._rect = null; this._removed = false;
    allElements.push(this);
  }
  get id(){ return this._id; }
  set id(v){ this._id = v; if(v) document._byId[v] = this; }
  get className(){ return [...this._cls].join(" "); }
  set className(v){ this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
  set innerHTML(v){ this.children.forEach(c=>c.parentNode=null); this.children = []; this._innerHTML = v; }
  get innerHTML(){ return this._innerHTML || ""; }
  get offsetWidth(){ return 10; }
  appendChild(c){ c.parentNode = this; this.children.push(c); return c; }
  remove(){ if(this.parentNode){ this.parentNode.children = this.parentNode.children.filter(x=>x!==this); this.parentNode=null; } this._removed = true; }
  addEventListener(t,fn){ (this._listeners[t] = this._listeners[t]||[]).push(fn); }
  removeEventListener(t,fn){ const a=this._listeners[t]; if(a){ const i=a.indexOf(fn); if(i>=0)a.splice(i,1);} }
  setPointerCapture(pid){ captureMap.set(pid, this); }
  releasePointerCapture(pid){ captureMap.delete(pid); }
  hasPointerCapture(pid){ return captureMap.get(pid)===this; }
  getBoundingClientRect(){ return this._rect || {left:0,top:0,width:0,height:0,right:0,bottom:0}; }
  closest(sel){
    let n = this;
    while(n){ if(matches(n, sel)) return n; n = n.parentNode; }
    return null;
  }
  querySelectorAll(sel){ return qsa(this, sel); }
  getContext(){ return ctxProxy(this); }
  click(){ this.dispatchEvent({type:"click", target:this}); }
  dispatchEvent(ev){
    ev.target = ev.target || this;
    let node = captureMap.get(ev.pointerId) || ev.target; // capture retargets
    ev.target = node;
    const path = [];
    while(node){ path.push(node); node = node.parentNode; }
    for(const n of path){
      if(ev._stop) break;
      const ls = (n._listeners[ev.type]||[]).slice();
      for(const fn of ls){ try{ fn.call(n, ev); }catch(e){ console.error("listener threw", ev.type, e.message); } if(ev._stop) break; }
    }
    if(!ev._stop){ const wls = (window._listeners[ev.type]||[]).slice(); for(const fn of wls){ try{ fn.call(window, ev); }catch(e){ console.error("win listener threw", e.message); } } }
    return !ev.defaultPrevented;
  }
}
function matches(el, sel){
  return String(sel).split(",").some(part=>{
    part = part.trim();
    if(part.startsWith("#")) return el.id === part.slice(1);
    if(part.startsWith(".")) return el._cls.has(part.slice(1));
    return el.tagName === part.toUpperCase();
  });
}
function qsa(root, sel){
  // supports "#id", "#id .cls", "#id tag", ".cls", "tag"
  const parts = sel.trim().split(/\s+/);
  let bases = [root === document ? null : root];
  const out = [];
  const walk = (node, cb)=>{ for(const c of node.children||[]){ cb(c); walk(c, cb); } };
  if(parts.length === 2 && parts[0].startsWith("#")){
    const base = document.getElementById(parts[0].slice(1));
    if(!base) return [];
    walk(base, n=>{ if(matches(n, parts[1])) out.push(n); });
    return out;
  }
  const scope = root === document ? document._root : root;
  if(scope) walk(scope, n=>{ if(matches(n, parts[0])) out.push(n); });
  return out;
}
function ctxProxy(el){
  return new Proxy({}, {
    get(t, k){ if(k === "canvas") return el; return (...a)=>{}; },
    set(){ return true; },
  });
}
const document = {
  _byId: {}, _root: new El("div"), _listeners: {},
  getElementById(id){ if(!this._byId[id]){ const e = new El("div"); e.id = id; this._root.appendChild(e);} return this._byId[id]; },
  createElement(tag){ const e = new El(tag); return e; },
  querySelectorAll(sel){ return qsa(this, sel); },
  addEventListener(t, fn){ (this._listeners[t]=this._listeners[t]||[]).push(fn); },
  documentElement: new El("html"),
};
const store = {};
const localStorage = {
  getItem:k=> (k in store ? store[k] : null),
  setItem:(k,v)=>{ store[k]=String(v); },
  removeItem:k=>{ delete store[k]; },
};
const window = {
  _listeners: {},
  innerWidth: 390, innerHeight: 844,
  addEventListener(t, fn){ (this._listeners[t]=this._listeners[t]||[]).push(fn); },
  removeEventListener(t, fn){ const a=this._listeners[t]; if(a){ const i=a.indexOf(fn); if(i>=0)a.splice(i,1);} },
  matchMedia: ()=>({matches:false, addEventListener(){}, removeEventListener(){}}),
  requestAnimationFrame: (fn)=>setTimeout(fn, 0),
  AudioContext: undefined, webkitAudioContext: undefined,
  location: { search: "" },
};
class FakeImage {
  constructor(){ this.naturalWidth = 1200; this.naturalHeight = 1200; this._src=""; }
  set src(v){ this._src=v; setTimeout(()=>{ this.onload && this.onload(); }, 0); }
  get src(){ return this._src; }
}
function mkEvent(type, o){
  return Object.assign({
    type, target: null, pointerId: 1, clientX: 0, clientY: 0,
    preventDefault(){ this.defaultPrevented = true; },
    stopPropagation(){ this._stop = true; },
    defaultPrevented: false, _stop: false,
  }, o||{});
}

/* ---------- globals for the game script ---------- */
global.window = window; global.document = document;
global.localStorage = localStorage; global.Image = FakeImage;
Object.defineProperty(global, "navigator", {value:{ userAgent: "node-harness" }, configurable:true});
global.innerWidth = 390; global.innerHeight = 844;
global.requestAnimationFrame = window.requestAnimationFrame;
global.matchMedia = window.matchMedia;
const _si = global.setInterval; global.setInterval = ()=>({}); // don't keep node alive
global.clearInterval = ()=>{};

/* ---------- load the real game script ---------- */
let html = fs.readFileSync(require("path").join(__dirname, "..", "index.html"), "utf8");
html = html.replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/g, "DATA_URI");
const m = html.match(/<script>([\s\S]*)<\/script>/);
if(!m) throw new Error("no script");
let src = m[1];
// expose internals for testing
src += "\n;globalThis.__T = {S, buildPuzzle, finishDrag, onPieceDown, onBoardDown, onBoardMove, onBoardUp, trayThumbDown, setCamera, screenToBoard, linkGroups, findSnapForSet, withinSnap, tolPx, neighborsOf, positionEl, saveGame};\n";
eval(src);
const T = globalThis.__T;
const S = T.S;

/* geometry: iPhone-ish */
const wrap = document.getElementById("boardWrap");
wrap._rect = {left:0, top:56, width:390, height:700, right:390, bottom:756};
wrap.clientWidth = 390; wrap.clientHeight = 700;
/* mirror the real HTML nesting so bubbling/capture behave like the browser */
(function mirrorLayout(){
  const layer = document.getElementById("boardLayer");
  const rail = document.getElementById("zoomRail");
  const slider = document.getElementById("zoomSlider");
  const zi = document.getElementById("zoomIn"), zo = document.getElementById("zoomOut");
  wrap.appendChild(layer); wrap.appendChild(rail);
  rail.appendChild(zi); rail.appendChild(slider); rail.appendChild(zo);
  document.getElementById("trayBody"); // detached is fine (no bubbling needed)
})();

/* ---------- event driving helpers ---------- */
function b2s(bx, by){ // board -> screen
  const r = wrap.getBoundingClientRect(), z = S.camera.zoom;
  return { x: r.left + S.camera.panX + bx*z, y: r.top + S.camera.panY + by*z };
}
function pressPiece(p, bx, by, pid, ptype){
  const s = b2s(bx, by);
  const target = p.el.children[0] || p.el; // inner canvas, exercises closest()
  const ev = mkEvent("pointerdown", {pointerId:pid, clientX:s.x, clientY:s.y, target, pointerType:ptype||"mouse"});
  target.dispatchEvent(ev);
}
function moveTo(bx, by, pid, ptype){
  const s = b2s(bx, by);
  const ev = mkEvent("pointermove", {pointerId:pid, clientX:s.x, clientY:s.y, pointerType:ptype||"mouse"});
  // dispatch on capture element (piece) like a real browser; bubbles to boardWrap
  const cap = captureMap.get(pid);
  (cap || wrap).dispatchEvent(ev);
}
function release(pid, ptype){
  const cap = captureMap.get(pid);
  const ev = mkEvent("pointerup", {pointerId:pid, clientX:0, clientY:0, pointerType:ptype||"mouse"});
  (cap || wrap).dispatchEvent(ev);
  captureMap.delete(pid); // browsers auto-release on pointerup
}
function pressBoard(sx, sy, pid){
  const ev = mkEvent("pointerdown", {pointerId:pid, clientX:sx, clientY:sy, target:wrap});
  wrap.dispatchEvent(ev);
}
function dragPiece(p, fromB, toB, pid, ptype){
  pressPiece(p, fromB[0], fromB[1], pid||1, ptype);
  // intermediate moves
  const steps = 5;
  for(let i=1;i<=steps;i++){
    const bx = fromB[0]+(toB[0]-fromB[0])*i/steps, by = fromB[1]+(toB[1]-fromB[1])*i/steps;
    moveTo(bx, by, pid||1, ptype);
  }
  release(pid||1, ptype);
}
function placeOnBoard(p, bx, by){
  p.inTray = false; p.el.style.display = "block"; p.x = bx; p.y = by; T.positionEl(p);
  document.getElementById("trayBody").innerHTML = "";
}
const results = [];
function check(name, cond, detail){
  results.push({name, pass:!!cond, detail:detail||""});
  console.log((cond?"PASS":"FAIL")+" | "+name+(detail?" | "+detail:""));
}

async function main(){
  T.buildPuzzle ? null : null;
  // init() runs on DOMContentLoaded; fire it
  (document._listeners["DOMContentLoaded"]||[]).forEach(fn=>fn());
  await T.buildPuzzle("zooted", "x", 4, {rows:2, cols:2, title:"test"});
  const P = id => S.pieces.find(p=>p.id===id);
  const p00=P("0_0"), p01=P("0_1"), p10=P("1_0"), p11=P("1_1");
  const tol = T.tolPx();
  console.log("geom: cw="+S.cw.toFixed(1)+" ch="+S.ch.toFixed(1)+" tol="+tol.toFixed(1)+" zoom="+S.camera.zoom.toFixed(3));

  /* S1 baseline: drag piece to its own home -> snaps */
  placeOnBoard(p00, p00.homeX+200, p00.homeY+200);
  dragPiece(p00, [p00.homeX+200, p00.homeY+200], [p00.homeX+4, p00.homeY-3]);
  check("S1 baseline: drop near own home snaps", p00.home===true && Math.abs(p00.x-p00.homeX)<0.01,
    "home="+p00.home+" x="+p00.x.toFixed(1)+" homeX="+p00.homeX.toFixed(1));

  /* S2 headline: neighbor-relative link. p00 is home. Drop p01 at the CORRECT
     relative position next to p00 (offset by exactly one cell) but FAR from its
     own home — move p00's group away from home first so relative != absolute. */
  // drag the (home) p00 group away: home pieces re-seat only when all-home set dropped; drag it and drop elsewhere
  placeOnBoard(p01, p01.homeX+150, p01.homeY+150);
  // relocate p00 far from home manually (simulates a cluster built off-board)
  p00.x = 300; p00.y = 300; T.positionEl(p00);
  const relX = p00.x + (p01.homeX - p00.homeX), relY = p00.y + (p01.homeY - p00.homeY);
  dragPiece(p01, [p01.homeX+150, p01.homeY+150], [relX+3, relY-2]);
  const linked = (p01.group && p01.group===p00.group);
  check("S2 headline: drop at correct relative pose next to neighbor links into group", linked,
    "p01.group="+p01.group+" p00.group="+p00.group+" (expected equal, non-null)");

  /* S3: second-finger pointerdown on another piece during active drag */
  placeOnBoard(p10, 100, 100); placeOnBoard(p11, 200, 200);
  p10.home=false; p11.home=false; p10.group=null; p11.group=null;
  pressPiece(p10, 100, 100, 1);
  moveTo(120, 120, 1);
  pressPiece(p11, 200, 200, 2); // second finger on another piece mid-drag
  const bDragStarted = !!(T.S.drag && T.S.drag.set[0]===p11 && p11.el.classList.contains("drag"));
  const dragRefersToB = T.S.drag && T.S.drag.set[0]===p11;
  const aClassStuck = p10.el.classList.contains("drag");
  moveTo(210, 210, 2); release(2); release(1);
  const aNeverFinished = p10.el.classList.contains("drag");
  check("S3: overlapping drags do not corrupt state", !aClassStuck && !aNeverFinished && bDragStarted,
    "firstDragCleanlyFinished="+(!aClassStuck && !aNeverFinished)+" secondDragStarted="+bDragStarted);

  /* S4: zoom-rail slider drag also pans the camera */
  const panBefore = {x:S.camera.panX, y:S.camera.panY};
  const slider = document.getElementById("zoomSlider");
  const ev = mkEvent("pointerdown", {pointerId:7, clientX:30, clientY:400, target:slider});
  slider.dispatchEvent(ev);
  const panStartSet = !!S.panStart;
  const mv = mkEvent("pointermove", {pointerId:7, clientX:30, clientY:460, target:slider});
  (captureMap.get(7)||wrap).dispatchEvent(mv);
  const panMoved = Math.abs(S.camera.panX-panBefore.x)>0.5 || Math.abs(S.camera.panY-panBefore.y)>0.5;
  const up7 = mkEvent("pointerup", {pointerId:7, target:slider}); (captureMap.get(7)||wrap).dispatchEvent(up7); captureMap.delete(7);
  check("S4: zoom-slider drag does not pan the board", !panStartSet && !panMoved,
    "panStartSet="+panStartSet+" panMoved="+panMoved);

  /* S5: drag under zoom 2x + pan offset lands where the finger is */
  T.setCamera(2, 100, 100);
  placeOnBoard(p10, 100, 100);
  const hb = [p10.homeX+3, p10.homeY-3];
  dragPiece(p10, [100,100], hb, 3);
  check("S5: drop at zoom=2 with pan lands at home", p10.home===true,
    "home="+p10.home+" x="+p10.x.toFixed(1)+" homeX="+p10.homeX.toFixed(1));
  T.setCamera(1, 195, 350);

  /* S6: rapid re-drag of the same piece */
  placeOnBoard(p11, 200, 200); p11.home=false; p11.group=null;
  dragPiece(p11, [200,200], [210,210], 4);
  dragPiece(p11, [210,210], [p11.homeX+2, p11.homeY+2], 4);
  check("S6: rapid successive drags work", p11.home===true, "home="+p11.home);

  /* S7: two pieces snapped individually both home -> groups merged among home pieces */
  check("S7 info: p00.group="+p00.group+" p11.group="+p11.group, true, "");

  /* S8: tray drag path — drag a thumbnail out of the tray onto the board */
  window.dispatchEvent = function(ev){ (this._listeners[ev.type]||[]).slice().forEach(fn=>{ try{fn.call(window,ev);}catch(e){} }); };
  const trayBody = document.getElementById("trayBody");
  // reset: put p10 back in tray
  p10.inTray = true; p10.home = false; p10.x = 0; p10.y = 0; p10.el.style.display = "none"; p10.group = null;
  T.buildPuzzle; // rebuild tray thumbs
  document.getElementById("trayBody").innerHTML = "";
  // rebuild thumbs manually like buildTray
  (function(){ const b=document.createElement("button"); b.className="thumb"; b.dataset.pid=p10.id;
    b.addEventListener("pointerdown", ev=>T.trayThumbDown(ev,p10,b)); trayBody.appendChild(b); })();
  const thumb = trayBody.children[0];
  thumb.dispatchEvent(mkEvent("pointerdown", {pointerId:20, clientX:350, clientY:800, target:thumb}));
  window.dispatchEvent(mkEvent("pointermove", {pointerId:20, clientX:350, clientY:700}));
  window.dispatchEvent(mkEvent("pointermove", {pointerId:20, clientX:300, clientY:600}));
  const bs = (function(){ const r=wrap.getBoundingClientRect(); return {x:(300-r.left-S.camera.panX)/S.camera.zoom, y:(600-r.top-S.camera.panY)/S.camera.zoom}; })();
  window.dispatchEvent(mkEvent("pointermove", {pointerId:20, clientX:bs.x*S.camera.zoom+0+S.camera.panX, clientY:bs.y*S.camera.zoom+56+S.camera.panY}));
  window.dispatchEvent(mkEvent("pointerup", {pointerId:20, clientX:300, clientY:600}));
  check("S8: tray drag places piece on board", p10.inTray===false && p10.el.style.display==="block",
    "inTray="+p10.inTray+" display="+p10.el.style.display+" x="+p10.x.toFixed(1));

  /* S9: piece pointerdown while pinch-zoom is active */
  pressBoard(100, 300, 30);
  const pd2 = mkEvent("pointerdown", {pointerId:31, clientX:200, clientY:300, target:wrap}); wrap.dispatchEvent(pd2);
  const pinchActive = !!S.pinch;
  pressPiece(p11, 210, 210, 32);
  const dragDuringPinch = !!S.drag;
  [30,31,32].forEach(pid=>{ const e=mkEvent("pointerup",{pointerId:pid,target:wrap}); (captureMap.get(pid)||wrap).dispatchEvent(e); captureMap.delete(pid); });
  check("S9: piece press during active pinch does not start a drag", pinchActive && !dragDuringPinch,
    "pinchActive="+pinchActive+" dragDuringPinch="+dragDuringPinch);


  /* ===== WAVE 2: regression depth ===== */
  await T.buildPuzzle("zooted", "x", 6, {rows:2, cols:3, title:"test"});
  const Q = id => S.pieces.find(p=>p.id===id);
  const q00=Q("0_0"), q01=Q("0_1"), q02=Q("0_2"), q10=Q("1_0"), q11=Q("1_1"), q12=Q("1_2");
  const tol2 = T.tolPx();

  /* S10: snap threshold boundary */
  placeOnBoard(q00, q00.homeX+400, q00.homeY+400);
  dragPiece(q00, [q00.homeX+400,q00.homeY+400], [q00.homeX+tol2-1, q00.homeY]);
  const snapIn = q00.home===true;
  q00.home=false; q00.locked=false; q00.el.classList.remove("snapped");
  placeOnBoard(q00, q00.homeX+400, q00.homeY+400);
  dragPiece(q00, [q00.homeX+400,q00.homeY+400], [q00.homeX+tol2+5, q00.homeY]);
  const snapOut = q00.home===false;
  check("S10: snap at tol-1, no snap at tol+5", snapIn && snapOut, "in="+snapIn+" out="+snapOut+" tol="+tol2.toFixed(1));

  /* S11: piece -> group merge: link q00+q01, then drop q02 onto the group */
  q00.home=false; q00.locked=false; q01.home=false; q01.locked=false;
  q00.group=null; q01.group=null; q02.group=null;
  placeOnBoard(q00, 500, 500); placeOnBoard(q01, 500+q01.homeX-q00.homeX+2, 500+q01.homeY-q00.homeY-1);
  // drop q00 next to q01: press q00, move it so its pose vs q01 is exact
  dragPiece(q00, [500,500], [500,500]); // no-op tap to keep positions
  // link them: drag q01 onto q00's correct relative pose
  const t01x = q00.x + (q01.homeX-q00.homeX), t01y = q00.y + (q01.homeY-q00.homeY);
  dragPiece(q01, [q01.x,q01.y], [t01x+1,t01y+1]);
  const gAB = q00.group && q00.group===q01.group;
  // now drop q02 at correct pose next to q01
  placeOnBoard(q02, 100, 100);
  const t02x = q01.x + (q02.homeX-q01.homeX), t02y = q01.y + (q02.homeY-q01.homeY);
  dragPiece(q02, [100,100], [t02x-2,t02y+2]);
  const g3 = gAB && q02.group===q00.group && q02.group===q01.group;
  check("S11: piece->group merge makes a 3-group", g3, "groups: "+q00.group+"/"+q01.group+"/"+q02.group);

  /* S12: group -> group merge: {q10,q11} dropped onto {q00,q01,q02} */
  q10.home=false; q10.locked=false; q11.home=false; q11.locked=false; q12.home=false; q12.locked=false;
  q10.group=null; q11.group=null; q12.group=null;
  placeOnBoard(q10, -300, 300); placeOnBoard(q11, -300+(q11.homeX-q10.homeX), 300+(q11.homeY-q10.homeY));
  const t10x = q10.x, t10y = q10.y; // current (already correct relative)
  dragPiece(q10, [t10x,t10y], [t10x,t10y]); // tap: link q10+q11 via proximity
  // force-link check: they are already in correct relative pose; drop q11 by epsilon to trigger link
  dragPiece(q11, [q11.x,q11.y], [q11.x+1,q11.y+1]);
  const gCD = q10.group && q10.group===q11.group;
  // drag group {q10,q11} (press q10) so q10 lands at correct pose vs q00
  const want_q10x = q00.x + (q10.homeX-q00.homeX), want_q10y = q00.y + (q10.homeY-q00.homeY);
  const dxg = want_q10x - q10.x, dyg = want_q10y - q10.y;
  dragPiece(q10, [q10.x,q10.y], [q10.x+dxg+2, q10.y+dyg-2]);
  const allOne = [q00,q01,q02,q10,q11].every(p=>p.group===q00.group);
  check("S12: group->group merge unites all five", gCD && allOne,
    "gCD="+gCD+" groups: "+[q00,q01,q02,q10,q11].map(p=>p.group).join("/"));

  /* S13: linked group drags as one rigid body */
  const bx0=q00.x, by0=q01.y;
  dragPiece(q00, [q00.x,q00.y], [q00.x+50,q00.y+30]);
  const rigid = Math.abs((q00.x-bx0)-50)<0.01 && Math.abs((q01.x-(bx0+(q01.homeX-q00.homeX)))-50)<0.01;
  check("S13: group moves rigidly", rigid, "q00 dx="+(q00.x-bx0).toFixed(1));

  /* S14: touch pointerType drag snaps */
  q12.home=false; q12.locked=false; q12.group=null;
  placeOnBoard(q12, q12.homeX+300, q12.homeY+300);
  dragPiece(q12, [q12.homeX+300,q12.homeY+300], [q12.homeX+2,q12.homeY-2], 40, "touch");
  check("S14: touch-pointer drag snaps home", q12.home===true, "home="+q12.home);

  /* S16: double-tap rotates in rotation mode (iOS has no dblclick) */
  S.rotation = true;
  q12.home=false; q12.locked=false; q12.rot=0; q12.group=null;
  placeOnBoard(q12, 150, 150);
  pressPiece(q12, 150, 150, 41, "touch"); release(41, "touch");
  pressPiece(q12, 150, 150, 42, "touch"); release(42, "touch");
  check("S16: double-tap rotates +15deg, no drag started", q12.rot===15 && !T.S.drag, "rot="+q12.rot);
  S.rotation = false;

  const fails = results.filter(r=>!r.pass).length;
  console.log("\n==== "+(results.length-fails)+"/"+results.length+" pass ====");
  process.exit(fails?1:0);
}
main().catch(e=>{ console.error("HARNESS ERROR", e); process.exit(2); });
