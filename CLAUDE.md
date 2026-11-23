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
- **Danger card pictures:** `static/hazardpics.js` draws one still pixel picture per danger (all except H6, which is being
  redesigned and still shows its old picture). Ending cards have no "ENDING X" label; a hazard death shows no decision list.
- **Death films:** `static/films.js` has the 12 elimination films (camera push-ins, screen shake, black bars, fades,
  no talking, only pictures). `cinematic()` wraps every film. The hazard alarm lasts 6 seconds (`ALARM_SECONDS`).
- **Elimination cards:** `static/eliminations.js` draws one pixel picture per way of losing (12 hazard deaths + the
  Storm, Ending B) with an ELIMINATED banner and a kill-feed line. The page remembers which one in `extras.death`.
- **Run the tests:** `python -m unittest discover -s tests -t .` (the `.venv` also works)
- Flavour decisions D1 and D4 stay. The Storm can be left again through the exit tile where the player arrived (with a confirm); the health the storm
  took stays (a hazard-style alarm, footsteps and the broken-bridge pop-up are in `static/game.js`). Once entered, the
  storm gate stays open (`storm_opened` in the state). Blocked actions are hidden until
  available. The deadly hazard option moves around (1st, 2nd or 3rd, fixed per hazard).
  Only one sign is left on the island: the storm warning in Polar Peak. Places are described by a pop-up on first entry.
  The summit of Polar Peak can only be reached from the bottom of the mountain path.
- **Pause menu (Esc / P):** Resume, New game, Save & exit. Save & exit stores the exact position in a
  second browser key (`SNAPSHOT_KEY` in `static/game.js`) and returns to the title screen. One save slot.
- Extra features beyond the BRD are not included unless the team project page lists them as required.
- Team of two (agreed with the professor).

## Still open

- Final scene, hazard and ending texts: the current texts in `story.py` are placeholders. One partner
  rewrites the scene texts, the other the hazard and ending texts. Keep the IDs and the structure.
- Fill in names and student numbers in README.md, and the deployed URL once it exists.

When something changes, update this file and `concept.md`.
