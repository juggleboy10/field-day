# Field Day

A multiplayer VR and browser game: a clubhouse and twenty-four games, all in one web page.

`index.html` is the finished game. It is **built** from the files in `src/`, so edit those and rebuild rather than editing `index.html` by hand.

## Layout

```
src/
  order.txt            the order the build joins the files in (it matters)
  html/                the page around the code: head, menu and HUD markup, closing tags
  styles.css           all the styling
  js/core/             shared engine: setup, sound, music, voice, the watch, other players, balls and bats
  js/games/            one file per game (quests share quest-engine.js and quest-shared.js)
  js/games/clubhouse/  the clubhouse and its tables: air hockey, ping pong, foosball, pop-a-shot, the D20, the jukebox
  js/app/              controls (VR and browser), switching places, networking, the menu, the HUD, the main loop
build.sh               joins src/ into index.html
tests/smoke.py         plays every place for a few seconds and fails on any page error
tests/parkour.py       Skyline Sprint physics: landing on the stepping stones, climbing over the walls
tests/hotpotato.py     Hot potato: full rounds against the bots, your throws, staying on your spot
tests/kayak.py         Whitewater Rapids: paddling, steering, the VR blade, rocks and banks, a full run, a race
tests/cornhole.py      Cornhole: where throws land for each power, full rounds and a game to 21 against Corny Carl
tests/ctf.py           Capture the flag: tagging on each half, grabbing and capturing, bot defenders, a match to 3
tests/piratecove.py    Pirate Cove: every wave spawns, gunners fire shot, parrots fly, the crew hurts you, the Captain
tests/trivia.py        Trivia Night: a full game with bots, keyboard and HUD answers, scoring, no repeats, a new game
tests/trivia_mp.py     Trivia Night with two players: the non-host's answers are scored, the host leaves mid-game
tests/recess.py        Recess Rush: every playground station, no shortcuts, simulated VR (tunnel, sack hops, bars), a race vs bots
tests/recess_mp.py     Recess Rush with two players: joining a race, the standings, seeing each other's sacks
tests/players.py       the player-count picker: in every game with one, the number sets how many bots play
tests/players_mp.py    the picker with two players: the number is shared; soccer and laser tag bots on both pages
tests/soccer.py        Sunday soccer's computer players: the right numbers, they play and score at both ends
tests/lasertag.py      Neon laser tag's computer players: they move and shoot, you can tag them, drones only when alone
tests/fixes.py         fixes from playing: recess race-again, soccer sideline, pickleball paddle, cornhole first throw and spin
tests/multiplayer.py   two players on one machine (a stand-in for Claude's room): hot potato, a kayak race, cornhole, a tag in capture the flag
```

The tests open the page with `?test`, which makes the game expose its insides as `window.__fd`. Without `?test` nothing is exposed.

All the code still runs as one script, in the order listed in `src/order.txt`. A file can use anything defined in a file above it.

## Build and test

```
./build.sh
for t in smoke parkour hotpotato kayak cornhole ctf piratecove trivia trivia_mp recess recess_mp players players_mp soccer lasertag fixes multiplayer; do python tests/$t.py; done
```

The smoke test needs Playwright once: `pip install playwright && playwright install chromium`.
If the three.js CDN is not reachable, point the test at a local copy: `THREE_JS=/path/to/three.min.js python tests/smoke.py`.

## Publishing

1. Build, and run the tests.
2. Upload `index.html` to Hostinger as `field-day.html`, then hard refresh.
3. Commit and push here.
