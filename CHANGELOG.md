## 3.1.0 — 2026-09-24 — Slot hints per Black's direction ('the spaces should give hints when the piece the player selected to the blank game board')
- While a piece is lifted (tray drag or board drag), its empty home slot pulses with a gold dashed outline — the player sees exactly where the selected piece belongs.
- When the lifted piece enters snap range, the slot goes "hot": solid bright glow = drop it there. Cleared on every drop/cancel; exactly one slot hints at a time (one finger = one piece).
- Hint is pointer-transparent (never blocks touches) and respects prefers-reduced-motion; tray helper text now teaches the glow.
- Verified with real CDP touch input (iPhone-sized emulation): hint appears at the piece's homeX/homeY mid-drag, hot near home, snap+lock+hint-cleared on release over home.
- Tests: 220/220 PASS (node), incl. new test-slothint suite (slotHintHot pure logic + both-lift-path wiring guards).

## 3.0.0 — 2026-09-24 — Concept redesign per Black's iPhone report ('click one piece and all of the pieces are moving')
- Tray is now the piece SOURCE, not a finder: drag a thumbnail straight onto the board; the lifted piece follows the finger on a drag layer and drops exactly where released. Tap a thumbnail only pulses it — nothing moves.
- REMOVED the measured confusion paths: tray tap-to-find board panning is gone; empty-board pan, zoom buttons, and pinch/wheel zoom are gone — the board always fits the screen.
- One finger = ONE piece, always: drop resolution no longer merges pieces into shared drag groups (group movement moved pieces the player never grabbed).
- The full cover image is faintly visible inside the target frame as a persistent goal; pieces wait in the tray — no scattered overlapping pile, no fly-in intro, no pieces under fixed UI.
- FIXED a real crash found by touch verification: confetti fillRect() was called with 3 args on completion.
- Verified with real CDP touch input (mobile emulation): tap=0 pieces move; tray drag moves exactly 1; board drag moves exactly 1; tray scroll never lifts; snap-to-home locks; scripted full 24/24 completion reaches the done overlay.
- Tests: 194/194 PASS (node), incl. new test-tray suite + fillRect crash guard; node --check clean.

## 2.0.0 — 2026-09-24 — Full rebuild per Black's iPhone defect order ('puzzle does not work at all')
- Rebuilt from scratch: bulletproof touch drag-and-drop (pointer capture, transform movement, single-pointer invariant, pickup lift) — pieces genuinely drag and place on touch
- Procedural interlocking jigsaw edges; snap scale-bounce + glow; neighbor relative-snap grouping
- Tray redesigned as piece-finder drawer (kills tray-scroll-vs-drag conflict); zoom via on-screen buttons (pinch cut for reliability)
- 2026 design language: aurora/glassmorphism, Unbounded + Space Grotesk, gold progress rail
- Tests: 172/172 PASS (node); node --check clean
- Kept: CWI logo, Cover Pieces™, 3 real-art puzzles (Zooted Zone / Doves & Diamonds / CWI brand), Listen dialog, CTA + listening-room try-link, © 2026, localStorage saves, deep links

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
