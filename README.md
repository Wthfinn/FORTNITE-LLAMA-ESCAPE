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

1. Press **New game** and choose where the Battle Bus drops you.
2. Travel between Pleasant Park, Retail Row, Tilted Towers and Polar Peak. Every trip brings a danger
   with three options. Pick the wrong one and you are eliminated.
3. Collect items, make decisions and find the Storm. The items and your choices decide how it ends.

Your progress is saved in **your own browser** after every action. Close the page and come back later:
press **Resume game**. Clearing your browser data deletes the save.

## Run it locally

You need Python 3.9 or newer.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
flask --app app run
```

Then open http://127.0.0.1:5000 in your browser.

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
| `tests/` | Automated tests. |
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
