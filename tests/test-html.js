// Suite: shipped HTML integrity — data URIs, brand, links, guards
'use strict';
const { CP, ok, run, html } = require('./run.js');

function count(re){ const m = html.match(re); return m ? m.length : 0; }

run('test-html', () => {
  /* data URIs present and decode */
  for(const id of ['zooted','doves','brand']){
    const im = CP.IMAGES.find(x => x.id === id);
    ok(im && im.src.startsWith('data:image/jpeg;base64,'), `IMAGES has ${id} data URI`);
  }
  ok(CP.BRAND.logo.startsWith('data:image/jpeg;base64,'), 'BRAND.logo is a data URI');
  for(const [name, uri] of [['logo',CP.BRAND.logo],['zooted',CP.IMAGES[0].src],
                            ['doves',CP.IMAGES[1].src],['brand',CP.IMAGES[2].src]]){
    const b64 = uri.split(',')[1];
    const buf = Buffer.from(b64, 'base64');
    ok(buf[0]===0xFF && buf[1]===0xD8 && buf[buf.length-2]===0xFF && buf[buf.length-1]===0xD9,
       `${name} data URI decodes to a valid JPEG (${(buf.length/1024).toFixed(0)}KB)`);
    ok(buf.length < 120*1024, `${name} data URI modest (<120KB)`);
  }
  /* brand + legal */
  ok(html.includes('Cover Pieces™'), '™ on game name');
  ok(html.includes('© 2026 Cumulative Web Inc'), '© footer present');
  ok(html.includes('hp@cumulativeweb.com'), 'licensing contact in header comment');
  ok(html.includes('Proprietary'), 'proprietary license header');
  /* outbound links (also curl-checked separately) */
  ok(html.includes('https://open.spotify.com/artist/2f9j460EwjfvjYp3trBcb7'), 'Spotify link present');
  ok(html.includes('https://music.apple.com/us/album/the-alternative-theory/1850480031'), 'Apple Music link present');
  ok(html.includes('https://cumulativewebinc.github.io/cwi-listening-room/'), 'catalog CTA link present');
  /* drag-bulletproofing markers */
  ok(html.includes('touch-action:none') || html.includes('touch-action: none'), 'touch-action:none present');
  ok(count(/setPointerCapture/g) >= 2, 'pointer capture used (piece + board)');
  ok(html.includes('pointercancel'), 'pointercancel handled');
  ok(count(/stopPropagation/g) >= 3, 'control-target exclusion via stopPropagation');
  /* security guards */
  ok(!/[^.]innerHTML\s*=/.test(html.replace(/\.textContent/g,'')), 'no innerHTML assignments');
  ok(!/\beval\s*\(/.test(html), 'no eval()');
  ok(html.includes('https?:\\/\\/'), 'URL scheme validation for custom images');
  /* config separation + section markers */
  for(const s of ['SECTION 1','SECTION 2','SECTION 3','SECTION 4','SECTION 5','SECTION 6','SECTION 7']){
    ok(html.includes(s), s + ' marker present');
  }
  ok(html.includes('const BRAND') && html.includes('const IMAGES') && html.includes('const DIFFICULTIES'),
     'config block separated from logic');
  /* difficulties per spec */
  const pcs = CP.DIFFICULTIES.map(d=>d.pieces);
  ok(JSON.stringify(pcs) === JSON.stringify([24,54,96]), 'difficulties 24/54/96');
  /* deep-link params referenced */
  for(const k of ['autostart','difficulty','rotation','image=','pieces=']){
    ok(html.includes(k), 'deep-link param ' + k);
  }
  /* no secrets */
  ok(!/(api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"]{8,}/i.test(html), 'no secrets embedded');
  /* prefers-reduced-motion */
  ok(html.includes('prefers-reduced-motion'), 'reduced-motion respected');
});
