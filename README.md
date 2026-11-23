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

1. Press **New game** and click a place on the map to choose where the Battle Bus drops you.
2. Click glowing places on the map to move your character between Pleasant Park, Retail Row, Tilted
   Towers and Polar Peak. Every trip brings a danger with three options. Pick the wrong one and you are
   eliminated. At each place you can click to make decisions or collect items.
3. Collect items, make decisions and find the Storm. The items and your choices decide how it ends.

Your progress is saved in **your own browser** after every action. Close the page and come back later:
press **Resume game**. Clearing your browser data deletes the save.

## Pictures and sound

The pictures and sounds come from the team's own asset pack (Fortnite artwork belongs to Epic Games and
is only used here for a university project). They are in `static/img/` and `static/audio/`.
Pictures the pack did not contain (island map, Battle Bus sky, Storm, trap, the three ending pictures)
are composed from the pack's pictures by `tools/make_generated_images.py`. To change them, edit that
file and run it again (`pip install pillow`, then `python tools/make_generated_images.py`). The game
itself does not need Pillow.

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
| `templates/index.html`, `static/` | The page the player sees. Saves the state in the browser (localStorage). |
| `tools/make_generated_images.py` | Optional helper that composes the extra pictures. |
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
