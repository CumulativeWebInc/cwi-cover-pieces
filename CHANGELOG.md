# Cover Pieces™ — changelog

## 1.1.0 — 2026-09-23 — controls + linking rework
- FIXED (headline): pieces now snap to NEIGHBORS, not just absolute home — drop a piece in the correct pose next to any placed piece and they link into a draggable group. Atomic group union (piece→group and group→group merges, no half-linked states).
- FIXED: overlapping/second-finger drags no longer corrupt state (old drag is cleanly dropped first); piece presses during pinch-zoom are ignored; pinch start drops the piece with a snap attempt instead of silently cancelling.
- FIXED: zoom-rail slider drags no longer pan the board (control targets ignored by the pan gesture).
- iOS: double-tap a piece to rotate in hard mode (dblclick is unreliable on iOS Safari); solved (locked) pieces are no longer draggable.
- FEEL: live magnetic snap preview while dragging, gold link-pulse when groups merge, refined tray/rail/dialog chrome, Sora display typography, branded intro tagline, rotation hint chip.
- Deep links for playtesting: ?image=zooted|doves|brand &difficulty=0..3 &pieces=N &rotation=1 &autostart=1
- Regression suite: tests/run-tests.js — 35/35 pure-logic smoke + 15/15 drag/snap/link scenarios green.

## 1.0.0 — 2026-09-23
- Launch: Cover Pieces™ ships as one self-contained `index.html` on GitHub Pages.
- Official CWI logo, brand CSS variables, © 2026 Cumulative Web Inc, ™ on the game name, proprietary license header.
- Listen dialog with verified Spotify + Apple Music artist links (skippable, never auto-plays).
- CTA + working CWI listening-room try-link.
- localStorage-only persistence; no backend, no accounts, no secrets, no eval.
- Twenty Minds run: `TWENTY-MINDS-3GAMES-2026-09-23.md` (decision: ship under the full gate stack).
- Name screening: `NAME-RESEARCH-2026-09-23.md` (web/trademark/app-store sweep; no exact-title collisions found).
- Independent verifier: SHIP on fix cycle 0 (logic, links, secrets, security, legal gates all PASS).
