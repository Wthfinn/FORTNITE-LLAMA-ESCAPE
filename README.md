# Fortnite Llama Escape

A short text adventure in the Fortnite world. Your Llama ran away. Land from the Battle Bus, explore
the island, avoid danger, collect items and find out whether you can bring your Llama home before the
storm gets it. There are three endings.

Built for the Nova SBE "Introduction to Programming" team project (Plot Twist).

**Deployed app:** TODO: paste the public URL here after deploying (see "Deploying" below)

## Team

| Name | Student number |
|---|---|
| Fabian Ganns | 77735 |
| Finn Hansel | 77802 |

A team of two (agreed with the professor).

## How to play

Everything is played with the keyboard:

| Key | What it does |
|---|---|
| Arrow keys or WASD | Walk (in the Battle Bus: choose where to drop) |
| SPACE (or Enter, E) | Talk, use what you face, read a sign, close a message |
| 1, 2, 3 | Choose an option in a menu or a danger card |
| Red X (click it) | Close a window (supply drop, vending machine, a note) |
| M | Sound on or off |

1. Press **New game** (or **Load game** to continue). In the Battle Bus press the arrow keys to pick where
   to land ("Where we droppin?") and SPACE to jump. (Press T to talk to the bus driver first if you like.)
2. Walk around the town. A pulsing white arrow at the edge of the screen shows where one can walk on to the
   next town. Press SPACE next to a wooden sign to read its description. Each path has two dangers, one
   the first time you walk it and one the second time, waiting at the far end of the path. Look for hints
   on the ground (footprints, shell casings, scorch marks). A danger has three options: two are safe (and
   come with a short message that fits the danger), one eliminates you (with a short film). Once both
   dangers of a path are survived, the path is free. On every path you can also stray onto small side
   trails to meet characters from the Fortnite universe. They are only for fun: no items.
3. Things that glow yellow and have a bouncing "!" (a door, the vending machine, the supply drop, tracks
   on the ground, the lookout) can be used. Stand next to one, and when "Press SPACE to interact"
   appears, press SPACE to decide or collect. The supply drop and the vending machine also offer a second
   option: do nothing now (you can come back later).
4. Reach the Storm from Polar Peak and get to your Llama. You need the **Chug Jug** to enter. The storm takes
   4 health every second (100 health = 25 seconds). Your Llama stands on the far side of a valley whose
   bridge has crumbled. You can read a note, talk to a sunbather, or use an **Impulse Grenade** at the
   edge of the valley to jump across. At 20 health the game offers you the Chug Jug (+50 health). If you
   run out of health you are eliminated.

The line under the top bar shows **Items collected 0/2** (the number rises when an item is really
collected) and what to do next. Click an item in the top bar to read what it does. The **Trophies**
button on the title screen shows which of the 3 endings and which of the 13 ways to lose you have found
so far (kept in your browser, also across new games).

Your progress is saved in **your own browser** after every action. Press **Esc** (or the **Pause** button)
to pause. The pause menu has **Resume**, **New game** and **Save & exit**. Save & exit also remembers exactly
where you stand and takes you back to the title screen, where **Load game** brings you back to that spot.
Clearing your browser data deletes the save.

## Pictures and sound

The pictures and sounds come from the team's own asset pack (Fortnite artwork belongs to Epic Games and
is only used here for a university project). They are in `static/img/` and `static/audio/`.

- The walking world (grass, paths, houses, trees, signs, snow, the purple storm and the characters) is
  drawn in code in `static/world.js`, as 16x16 pixel tiles.
- The title picture, the sky scenes (Battle Bus, jump, parachute, supply drop, flight out of the storm) and the
  12 elimination films are drawn in code in `static/cutscenes.js`, `static/sky.js` and `static/films.js`.
- The danger cards, ending pictures and item sprites are pixel versions of the pack's pictures
  (`static/img/px/`), made by `tools/make_pixel_art.py`.
- A few pictures the pack did not contain (trap, endings, Storm) are composed from the pack's pictures
  by `tools/make_generated_images.py`.

To change the pictures, edit the tool and run it again (`pip install pillow`, then
`python tools/make_generated_images.py` followed by `python tools/make_pixel_art.py`). The game itself
does not need Pillow.

## Run it locally

You need Python 3.9 or newer.

**Easiest (Mac):** double-click `start.command` in the project folder. The first time it sets
everything up, then it opens the game in your browser. Keep its window open while you play.
(If macOS asks, right-click the file, choose Open, and confirm. In a terminal you can also run
`./start.command`.)

**By hand:**

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

If the game ever acts strangely or says it cannot reach the server, close the old game window and start it
again with `start.command`. It stops an older copy automatically.

Then open http://127.0.0.1:5057 in your browser.

Do not use port 5000 on a Mac: macOS uses it for AirPlay, and the browser shows "403 Forbidden"
instead of the game.

## Run the tests

```bash
python -m unittest discover -s tests -t .
```

The tests cover the game rules (accepted and rejected actions, locked route, no duplicate items,
saving and loading, all three endings, remembered decisions, broken or cheated game states, and odd
values such as lists in any field of the state) and the web server (valid and invalid requests,
security headers, caching). They do **not** cover the drawing, animation and keyboard code in the
browser (`static/*.js`); that was checked by playing the game.

## How it is built

| File | What it does |
|---|---|
| `story.py` | The story as data: scenes, items, decisions, hazards, endings. No logic. |
| `game.py` | The rules. Checks that an action is allowed, then returns a new game state. |
| `app.py` | Small Flask web server. Receives the saved state and an action, asks `game.py`, sends back the result. |
| `templates/index.html`, `static/style.css` | The page around the game screen. |
| `static/world.js` | The walking world: tiles, the five town maps, signposts, exits, the player sprite. |
| `static/cutscenes.js`, `static/sky.js` | The title picture and the scenes in the sky (bus, jump, parachute, supply drop, flight out of the storm). |
| `static/hazardpics.js` | One pixel picture per danger card. |
| `requirements.txt` | Every package pinned to an exact version (including the ones Flask needs itself). |
| `static/films.js` | The 12 death films (one per danger) with a cinematic camera, bars, shake and fades. |
| `static/eliminations.js` | The 13 elimination pictures (one per way of losing) with the ELIMINATED banner and kill-feed line. |
| `static/game.js` | Keyboard, drawing, menus and danger cards. Talks to the server and saves the state in the browser (localStorage). |
| `tools/` | Optional helpers that make the pixel pictures. |
| `tests/` | Automated tests (rules, web server, and that every picture and sound exists). |
| `concept.md` | The game design (concepts, map, items, decisions, hazards, endings, data model). |

### Remembered decisions (BRD PT04)

The game remembers what the player chose and shows it in the text of the ending:

- **Items.** Taking the Impulse Grenades from the vending machine (or saving a penny instead) and taking the
  Chug Jug from the supply drop are remembered in the inventory. The Chug Jug opens the gate to the Storm
  (a blocked action is hidden and explained by the referee). The Impulse Grenades decide the ending: with
  them the player jumps out of the Storm (Ending A), without them there is no way across the valley
  (Ending B).
- **Every answer at a danger** is remembered in the saved game (`hazard_choices`, plus `used_hazards` for the
  survived ones). A survived danger changes what the path does next time (its second danger, then it is
  free). A deadly answer ends the game (Ending C).
- **The ending card** says "Ending A/B/C", explains in a sentence how the choices led there ("You never took the
  Impulse Grenades..."), and lists the items taken and the answer chosen at each danger.
- The five small decisions (thank the driver, loot the house, dance, follow the tracks, climb the summit)
  are only flavour: they are remembered and listed on the card of Ending A and B, but change nothing in the rules.

Where is the data stored? Only in the player's browser. The server keeps no player data and has no
database or secrets. Because the browser sends its state to the server, the server checks every state
and every action (`game.validate_state`) and rejects anything invalid. A player can only cheat their own game.

## Limits and how it could change

What this version cannot do, and what we would change with more time:

| Limit | Why | How it could change |
|---|---|---|
| The storm timer and health run in the browser. The server checks that every state and action is valid, but not how much time passed. | The server keeps no player data, so it cannot know when the player entered the Storm. A player can cheat their own game (for example by editing the saved game or the page). | Keep the time on the server, or sign the saved game with a secret so it cannot be edited. |
| A save lives in one browser (`localStorage`). No accounts, no saving across devices, and clearing the browser data deletes it. | Simplest way to keep progress with no database and no secrets (BRD: the app must work without a paid or external service). | Accounts and a small database, saves on the server. |
| No automated tests for the browser code (drawing, animation, keyboard, the storm health). | The rules are in Python and fully tested; the page code was tested by playing. | Browser tests, for example with Playwright. |
| The Chug Jug is used up when drunk. | BRD rule R2 says the *required* release uses reusable items. Opening the Storm gate keeps working because the gate stays open once entered (`storm_opened`); the Impulse Grenades are never used up. | Make the Chug Jug reusable, or keep it as it is. |
| Fortnite pictures and music belong to Epic Games. | Used only for this university project. | Replace them with our own art and sound. |
| Free hosting sleeps when nobody uses the app, so the first load can take about a minute. | Render's free plan. | A paid plan, or open the page before a demo. |
| Keyboard only, laid out for a laptop screen. | Decision of the team. | Touch controls and a mobile layout. |
| Two people, one public repository. | Team of two (agreed with the professor). | More paths, items and endings are only new data in `story.py` plus drawing code. |

## Deploying

The app is a standard Flask app (`requirements.txt`, `Procfile`, `render.yaml`). To deploy on
[Render](https://render.com) (free):

1. Create a Render account and choose **New → Web Service**, then connect this GitHub repository.
2. Render reads `render.yaml`. If you enter the settings by hand: build command
   `pip install -r requirements.txt`, start command `gunicorn app:app`.
3. When the deploy is finished, copy the public URL into this README.
