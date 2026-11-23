# Fortnite Llama Escape

A short text adventure in the Fortnite world. Your Llama ran away. Land from the Battle Bus, explore
the island, avoid danger, collect items and find out whether you can bring your Llama home before the
storm gets it. There are three endings.

Built for the Nova SBE "Introduction to Programming" team project (Plot Twist).

**Deployed app:** TODO: paste the public URL here after deploying (see "Deploying" below)

## Team

| Name | Student number |
|---|---|
| TODO: full name | TODO |
| TODO: full name | TODO |

## How to play

Everything is played with the keyboard:

| Key | What it does |
|---|---|
| Arrow keys or WASD | Walk (in the Battle Bus: choose where to drop) |
| SPACE (or Enter, E) | Talk, use what you face, read a sign, close a message |
| 1, 2, 3 | Choose an option in a menu or a danger card |
| ESC | Close a menu |
| M | Sound on or off |

1. Press **New game**. In the Battle Bus press the left and right arrows to pick where to land and SPACE to
   jump. (Press T to talk to the bus driver first if you like.)
2. Walk around the town. Signposts show where each path leads (for example "RETAIL ROW"); press SPACE
   next to a sign to read it. Follow a path to the next town. Each path has two dangers, one the first time
   you walk it and one the second time. Look for hints on the ground (footprints, shell casings, scorch
   marks). A danger has three options: pick the wrong one and you are eliminated. Once both dangers of a
   path are survived, the path is free. You can turn back before you reach the middle of a path.
3. Things that glow yellow and have a bouncing "!" (a door, the vending machine, the supply drop, tracks
   on the ground, the lookout) can be used. Stand next to one, and when "Press SPACE to interact"
   appears, press SPACE to decide or collect.
4. Reach the Storm from Polar Peak and search for your Llama. You need the **Chug Jug** to enter, and the
   storm takes 5 health every second, so be quick. If you run out of health you are eliminated.

Your progress is saved in **your own browser** after every action. Close the page and come back later:
press **Resume game**. Clearing your browser data deletes the save.

## Pictures and sound

The pictures and sounds come from the team's own asset pack (Fortnite artwork belongs to Epic Games and
is only used here for a university project). They are in `static/img/` and `static/audio/`.

- The walking world (grass, paths, houses, trees, signs, snow, the pink storm fog and the player) is
  drawn in code in `static/world.js`, as 16x16 pixel tiles.
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
saving and loading, all three endings, broken or cheated game states) and the web server (valid and
invalid requests, security headers).

## How it is built

| File | What it does |
|---|---|
| `story.py` | The story as data: scenes, items, decisions, hazards, endings. No logic. |
| `game.py` | The rules. Checks that an action is allowed, then returns a new game state. |
| `app.py` | Small Flask web server. Receives the saved state and an action, asks `game.py`, sends back the result. |
| `templates/index.html`, `static/style.css` | The page around the game screen. |
| `static/world.js` | The walking world: tiles, the five town maps, signposts, exits, the player sprite. |
| `static/game.js` | Keyboard, drawing, menus and danger cards. Talks to the server and saves the state in the browser (localStorage). |
| `tools/` | Optional helpers that make the pixel pictures. |
| `tests/` | Automated tests (rules, web server, and that every picture and sound exists). |
| `concept.md` | The game design (concepts, map, items, decisions, hazards, endings, data model). |

Where is the data stored? Only in the player's browser. The server keeps no player data and has no
database or secrets. Because the browser sends its state to the server, the server checks every state
and every action (`game.validate_state`) and rejects anything invalid. A player can only cheat their own game.

## Deploying

The app is a standard Flask app (`requirements.txt`, `Procfile`, `render.yaml`). To deploy on
[Render](https://render.com) (free):

1. Create a Render account and choose **New → Web Service**, then connect this GitHub repository.
2. Render reads `render.yaml`. If you enter the settings by hand: build command
   `pip install -r requirements.txt`, start command `gunicorn app:app`.
3. When the deploy is finished, copy the public URL into this README.
