# Fortnite Llama Escape (Plot Twist)

Shared notes for every Claude working on this project. Two students work on it together,
each with their own Claude, and sync through GitHub: https://github.com/Wthfinn/FORTNITE-LLAMA-ESCAPE

## What this is

A small text-based mystery game for the Nova SBE "Introduction to Programming" course.
The requirements are in the Plot Twist BRD:
https://nova-sbe-introduction-to-programming.github.io/intro-to-programming-2026/weeks/week-05/01-plot-twist-brd.html

The player's Fortnite llama has run away. They land from the Battle Bus, travel between POIs, make
decisions, survive hazards and collect items, then search for the llama in the Storm.
Three endings: A (llama found), B (lost in the storm), C (eliminated by a hazard).

**`concept.md` is the source of truth for the game design.** Read it before building anything, and
update it when the team changes the design.

## Rules for working on this project

- **Keep it simple.** Don't add anything beyond the BRD and `concept.md` (no health, combat,
  randomness, currency, etc.). If something seems missing, ask instead of inventing it.
- **The users are not programmers.** Explain things in plain language and avoid jargon.
- **Sync with GitHub:** get the latest changes from GitHub before starting work, and commit and push
  when a piece of work is done. Keep commits small with clear messages.
- **Avoid conflicts:** the two partners split the work by area. If a change touches a file the
  other partner is likely working on, mention it.
- Story content (scenes, items, decisions, hazards, endings) is data, kept separate from game logic.

## Decisions made (23 Nov 2026)

- **Stack:** Python with Flask (small web server), deployed at a public URL. Required by the team
  project page: https://2477-introduction-programming.gitlab.io/wiki/team-project/
- **Saving:** in the player's browser (localStorage). The server keeps no player data and has no secrets.
- **Structure:** `story.py` (content as data), `game.py` (rules), `app.py` (web server),
  `static/world.js` (the pixel-art world), `static/cutscenes.js` (title picture and little films),
  `static/game.js` (keyboard, drawing, menus),
  `templates/` and `static/` (page), `tests/` (unittest). See README.md.
- **Hazards belong to the 6 paths between the places: 2 per path, 12 in total.** Only the Chug Jug opens
  the storm; the Impulse Grenades are needed for the good ending. In the storm the player loses 4 health
  per second (25 seconds), also while flying across the valley. Landing next to the llama with health left (needs the
  Impulse Grenades) = Ending A, the win. Health at 0 = Ending B "Lost in the Storm" (server action `storm_timeout`).
  Ending C is only for deadly path hazards. The 3 earlier decisions no longer change the ending. The health bar
  pulses 3 times on entering the storm. The Chug Jug can be drunk
  once in the storm (server action `use_chug_jug`, +50 health in the page). Details: `concept.md` sections 15 and 16.
- **Danger card pictures:** `static/hazardpics.js` draws one still pixel picture per danger. Ending cards say "Ending A/B/C" and explain how the
  choices led there (`ending.because`, `review.items`, `review.dangers`). The Launch Pad (H6) is drawn by `drawLaunchPad` in `static/world.js`, used on
  the path, the danger card, the death film and the elimination card.
- **Settings match the path:** a danger sits at the far end of its path (icy ones always in Polar Peak), so the films, danger
  pictures and elimination cards are drawn in the setting there (`FX.where`: meadow, tilted, retail or snow, bright daytime like the
  paths). The page sets it from `path.def.hazardTown`; `extras.deathWhere` remembers it. The walking paths have extra texture
  (`pathTexture` in `static/world.js`) and moving life (`drawPathBelow/Above` in `static/game.js`).
- **Sky scenes:** `static/sky.js` has the Battle Bus (blue-and-white balloon over a battered blue bus), the umbrella glider, the
  6-second jump film (`drawBusJump`), the glider landings, the supply drop, the title picture, the dance disco and the
  flight out of the Storm, all with the same cinematic camera as the death films and no spoken words.
- **Win and Storm scenes:** `static/finale.js` has the film for stepping into the Storm, the hug film, the Victory Royale film and
  its card (Ending A), the Chug Jug drinking effect and the sound cue list of every film. `static/sfx.js` makes the sound effects
  with the browser's own audio (no files). A film asks for a sound with `cues: [[seconds, name, loudness], ...]`.
- **Death films:** `static/films.js` has the 12 elimination films (camera push-ins, screen shake, black bars, fades,
  no talking, only pictures). `cinematic()` wraps every film. The hazard alarm lasts 4 seconds (`ALARM_SECONDS`).
- **Elimination cards:** `static/eliminations.js` draws one pixel picture per way of losing (12 hazard deaths + the
  Storm, Ending B) with an ELIMINATED banner and a kill-feed line. The page remembers which one in `extras.death`.
- **Run the tests:** `python -m unittest discover -s tests -t .` (the `.venv` also works)
- Flavour decisions D1 and D4 stay. The Storm can be left again through the exit tile where the player arrived (with a confirm); the health the storm
  took stays (a hazard-style alarm, footsteps and the broken-bridge pop-up are in `static/game.js`). Once entered, the
  storm gate stays open (`storm_opened` in the state). Blocked actions are hidden until
  available. The deadly hazard option moves around (1st, 2nd or 3rd, fixed per hazard).
  Only one sign is left on the island: the storm warning in Polar Peak. Places are described by a pop-up on first entry.
  The summit of Polar Peak can only be reached from the bottom of the mountain path.
- **Remembered choices (BRD PT04):** every answer at a danger is saved in `hazard_choices`; the vending machine and
  supply drop choices are the inventory. Texts are in `story.py` (`CHOICE_LINES`, `ENDING_BECAUSE`). The page shows
  "Items collected 0/2" under the top bar, items can be clicked to inspect them, and the title has a **Trophies** screen
  (browser key `fortnite-llama-escape-log`). Details: `concept.md` section 17.
- **Safety:** `validate_state` must never crash on odd values (tests try every field); `requirements.txt` pins every package.
- **Pause menu (Esc / P):** Resume, New game, Save & exit. Save & exit stores the exact position in a
  second browser key (`SNAPSHOT_KEY` in `static/game.js`) and returns to the title screen. One save slot.
- Extra features beyond the BRD are not included unless the team project page lists them as required
  (exception decided on 23 Nov night: the Trophies screen, because scope is graded).
- Team of two (agreed with the professor).

## Still open

- Final scene, hazard and ending texts: the current texts in `story.py` are placeholders. One partner
  rewrites the scene texts, the other the hazard and ending texts. Keep the IDs and the structure.
- Nothing for the README: names, student numbers and the deployed URL (https://fortnite-llama-escape.onrender.com) are in.

When something changes, update this file and `concept.md`.
