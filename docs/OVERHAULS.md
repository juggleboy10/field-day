# Field Day: four big overhauls (briefs)

These are briefs for four large changes to Field Day, written to be handed to a planning session (a more capable
model with limited use). For each one, the ask is the same: **read the code, then produce a plan**. That means the
design, the order of steps, how each step is tested and the traps to avoid. Small, safe steps that can then be carried
out one at a time. Don't do the whole migration in one go.

Recommended order: **1 (split and load on demand)**, then **3 (game kit)** and **2 (multiplayer)** designed together,
then **4 (Quest performance)**. 1 makes the others easier; 2 and 3 share the same seams; 4 is easiest to measure last.

---

## The project as it stands

- **What it is:** a multiplayer WebXR party game (VR on Quest, or a browser) built with three.js r128 (UMD global
  `THREE`, loaded from cdnjs). 61 places: a clubhouse hub plus 60 games and quests (`LEVEL_META` in
  `src/js/core/shared.js`).
- **Build:** `./build.sh` concatenates the 105 files listed in `src/order.txt` into one `index.html` (about 2.8 MB,
  36,700 lines of JS). Everything shares one IIFE scope; there are no modules. Load order matters: a `const` used at
  load time before the file that defines it is a TDZ error (`CAMERA` and `watch.js` ran into this; `camOn()` is a
  try-guard for exactly that).
- **Where it runs:**
  1. **Claude page** (a claude.ai artifact). Multiplayer goes through the page's `room` capability: each player sets
     a *presence* object of at most 4 KiB that everyone else receives. Shared storage goes through the `db`
     capability (records, photos, hearts). Artifacts can now publish supporting files beside the page, so more than one
     file is possible here too.
  2. **The owner's own website** (Hostinger: static hosting plus PHP, no WebSockets, no Node). Multiplayer goes
     peer to peer through trystero over WebRTC (`makeP2PRoom` in `src/js/app/net.js`), which mimics the same presence
     interface. Storage is `server/records.php` and `server/photos.php`.
- **Levels:** each game calls `newLevel(idx)` (`shared.js`) and fills in hooks: `update`, `presence`,
  `readPresence(rec, pres, st)`, `rowFor`/`sortRows`, `spawn`, `onEnter`/`onExit`, `hudActions`, `hints`, `env`,
  `bounds`, `buttons`, `flatCamera`, `deskFire`, `onVRTrigger`, `canSnap`/`onPhoto`, `endGame` (via `ENDGAME.on`),
  `botLevel` (via `BOTLV.on`), `recDefs` (via `RECORDS.def`). All 61 are built at startup; only the current one's group
  is visible.
- **Networking today:** presence is sent at most every 50 ms (400 ms in the menu), merged by key, and keys you stop
  sending are nulled (`app/net.js`). Each player's presence carries their head and hand poses and look, plus whatever
  the current level's `presence()` returns. 56 games read peers' presence; 17 elect a host themselves (usually "lowest
  peer id among players in this game"), each in its own way. Inputs that must not be missed (Tabletop Brawl) are sent
  as press counters.
- **Shared systems already factored out:** `BOTLV` (bot difficulty per game, in 28 games), `ENDGAME` (end a game
  early, 55 games), `RECORDS`, `PRIZE_FX`, `CAMERA` / `PHOTOS`, `VOICE`, the watch, remotes (other players' avatars,
  with the floating-classic body).
- **Tests:** 53 Python Playwright scripts in `tests/`, run with
  `THREE_JS=/path/to/three.min.js python3 tests/<name>.py`. `tests/smoke.py` loads all 61 places (about 25 minutes);
  `tests/multiplayer.py` provides `FAKE_ROOM`, a fake `room` over BroadcastChannel for two-page tests;
  `tests/v94_mp.py` has `FAKE_DB`. Run tests one at a time (parallel runs time out). `?test` in the URL turns on the
  `window.__fd` test hooks.
- **Releasing:** build, run the tests, commit, push to `vNN-testing` and `main`, publish the artifact, and give the
  owner `index.html` to upload to Hostinger as `field-day.html`. The version number is `VERSION` in
  `src/js/core/setup.js` (shown on the start screen and the VR watch). Stale copies on the headset are a recurring
  problem.

---

## 1. Split the game up and load each place when you go there

**Why:** startup builds all 61 places, which makes opening slow on Quest and keeps every game's meshes, textures and
canvases in memory all the time. The single 2.8 MB file is also what headsets cache and keep serving stale.

**Goal:** a small core (renderer, input, net, avatars, HUD, watch, clubhouse, shared systems) that loads first, and one
file per place that loads (and builds) the first time you go there. Ideally places can be unloaded or kept warm.

**Things to work out in the plan:**
- **Module format** while staying build-step-light: native ES modules (`import()`), or keep the shared-scope style and
  inject `<script>` files per level? It must work on the Claude page (supporting files beside `index.html`, relative
  URLs) and on plain static hosting.
- **What core is.** Find every cross-file dependency: helpers in `shared.js`/`setup.js`, things games reach into
  (`remotes`, `myHands`, `vrHands`, `CAMERA`, `PHOTOS`, `RECORDS`), and things core reaches into games for. Examples
  of the latter: `LEVEL_META`, `LEVEL_CATS`, `PICKER_ORDER`, music themes registered by games, `RECORDS` walking all
  `LEVELS`, the hub's portals, kiosks and quest registry, and net reading every level's `readPresence`.
- **Presence for places not loaded.** Today every level's `readPresence` runs for peers in that level. With lazy
  loading, a peer can be in a game you haven't loaded. Decide what the hub and boards need, such as a "who's where"
  summary, without each game's code.
- **The switch:** a loading state between portal and arrival (a fade, then "Loading Birdwatching Trail…"), errors if a
  file fails, and what happens if a friend's game state arrives before the file has loaded.
- **Cache busting:** versioned file names or a manifest so a headset can never mix old and new files. This should also
  end the "?v=" workaround.
- **Records boards, quests and the clubhouse** list every game; keep that list in core as metadata only.
- **The tests:** `window.__fd` hooks assume `LEVELS[i]` exist up front; plan how tests wait for a level to load.

**Done when:** first load is a fraction of today's, a cold visit to any place builds it once, all existing tests pass
(updated where they assume everything is built), and uploads to Hostinger are "the core plus whatever changed".

---

## 2. One multiplayer foundation for every game

**Why:** each game invents its own host election, state messages and input handling on top of presence. Results vary:
some games have 100–150 ms of input delay for non-hosts, some flicker when the host changes, and fast games (Tabletop
Brawl, dodgeball, laser tag, gorilla tag, karts) feel loose.

**Constraints that can't change:**
- No dedicated server. On the Claude page the only channel is the `room` capability: presence of 4 KiB per player, plus
  event topics (admin-only unless opened to contributors) and `join(name)` sub-rooms. On Hostinger it's WebRTC peer to
  peer, so one player's page has to act as the referee.
- Players come and go mid-game; the referee can leave at any moment.

**Things to work out in the plan:**
- **One referee per match:** how it's chosen, handed over cleanly when it leaves (state already on every page, so a new
  referee can pick up), and shown to players.
- **Inputs:** a standard way to send inputs that never drops a press, such as the counters Tabletop Brawl uses, maybe
  with sequence numbers and acknowledgements.
- **Your own movement shown instantly** (client-side prediction with correction) for games where it matters, and
  interpolation with a small buffer for everyone else.
- **Snapshots:** what goes in them, how often, and how to stay under 4 KiB with four players and projectiles. Room
  `join()` sub-rooms or events might carry match state better than presence.
- **Which games use which tier:** "owner-authoritative objects" (a ball you're holding), "referee runs everything"
  (Tabletop Brawl), "everyone runs their own" (a solo booth).
- **Testing:** extend `FAKE_ROOM` to simulate latency, jitter, drop and a referee leaving, so these behaviours are
  testable.

**Done when:** a documented API in core that a game uses instead of rolling its own, three representative games moved
onto it (suggested: Tabletop Brawl, dodgeball, pickleball doubles), and two-page tests passing under simulated 120 ms
latency with a referee hand-over mid-match.

---

## 3. A shared game kit

**Why:** most of the 60 games repeat the same machinery: lobby, start button, countdown, rounds and timers, scores,
teams and slots, bots filling empty places, scoreboard rows, records, End game, HUD actions, hints, kiosks. Fixes
don't travel: a bug fixed in one game's countdown stays in the others.

**Things to work out in the plan:**
- **The pieces:**
  - a match lifecycle (lobby, countdown, play, results, back to lobby)
  - seats and slots (people first, bots fill)
  - teams
  - score and timer
  - a standard results board
  - standard HUD actions
  - standard presence rows
  - how the kit wires in `BOTLV`, `ENDGAME` and `RECORDS` for free
- **Design it with overhaul 2:** seats, lifecycle and referee belong together.
- **The API shape:** a game should read as "here is what's special about this game", with the rest declared.
- **A migration order** that moves a few games at a time, with each move covered by the existing per-game tests.
- **Keep it optional:** quests, the hub and odd games (Birdwatching, Charades) might use only parts.

**Done when:** the kit exists with docs and examples, at least six games of different kinds are moved to it (one solo,
one versus, one team, one with bots, one quest-like, one with a referee) and are noticeably shorter, and all their
tests pass.

---

## 4. Make every place hold frame rate on Quest 2

**Why:** some places are heavy: the Birdwatching forest, the clubhouse with its tables and boards, the karts track,
and lots of separate meshes elsewhere. VR needs a steady 72 fps (90 if possible); dropped frames feel bad.

**Things to work out in the plan:**
- **A way to measure:** a test-mode counter of draw calls, triangles, textures and canvas uploads per place, run
  across all places to rank the worst (this can run in the existing Playwright setup).
- **Standard fixes and when to use each:**
  - merging static geometry (the Birdwatching forest already merges its trees by material with vertex colours)
  - instancing repeated props
  - fewer materials
  - smaller canvas textures, updated only when they change
  - simpler distant objects
  - turning off what's out of sight
- **Renderer settings for VR:** foveation, framebuffer scale, antialias, pixel ratio (currently capped at 2), and
  whether the extra render passes are affordable on Quest. These include the camera's eyepiece and preview screens,
  and the selfie mirror.
- **Per-frame cost:** garbage (allocations in update loops), raycasts, and `updateMatrixWorld` on large groups.
- **A budget per place** and a check that fails if a place goes over it.

**Done when:** every place is under an agreed budget in the measuring run, the worst ten are fixed, and the
owner confirms smooth play on a Quest 2.
