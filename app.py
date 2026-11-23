"""Web server for Fortnite Llama Escape.

The server keeps no player data. The player's progress lives in their own
browser (localStorage). With every request the browser sends its saved game
state; the server checks it, applies the rules from game.py and sends back the
new state. Invalid states and not-allowed actions are rejected and change
nothing.
"""

from pathlib import Path

from flask import Flask, jsonify, render_template, request

import game

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10_000  # a game state is far smaller
# Always serve the newest page and files, so the browser never mixes an old
# page with new game code. (The scripts and the style sheet are fetched with ?v=<number>, see
# add_security_headers below, so they can still be cached safely.)
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

_STATIC = Path(app.static_folder)


@app.context_processor
def asset_version():
    """A number that changes whenever a file in static/ changes (cache busting)."""
    newest = max((p.stat().st_mtime_ns for p in _STATIC.rglob("*") if p.is_file()), default=0)
    return {"asset_version": newest}


@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; style-src 'self'; script-src 'self'"
    )
    return response


@app.after_request
def add_cache_headers(response):
    """Let the browser keep the big static files, so a visit does not download them again.

    Pictures and sounds: kept for an hour. Scripts and style sheet: their address holds a number
    (?v=...) that changes with every edit, so the browser can keep them for as long as it likes.
    """
    if request.method in ("GET", "HEAD") and response.status_code == 200:
        if request.path.startswith(("/static/img/", "/static/audio/")):
            response.headers["Cache-Control"] = "public, max-age=3600"
        elif request.path.startswith("/static/") and "v" in request.args:
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return response


def _error(message, status=400):
    return jsonify({"error": message}), status


def _read_json():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/new")
def api_new():
    state = game.new_state()
    return jsonify({"state": state, "view": game.build_view(state)})


@app.post("/api/view")
def api_view():
    data = _read_json()
    if data is None:
        return _error("Send a JSON object with a 'state'.")
    try:
        return jsonify({"state": data.get("state"), "view": game.build_view(data.get("state"))})
    except game.StateError as error:
        return _error(str(error))


@app.post("/api/action")
def api_action():
    data = _read_json()
    if data is None:
        return _error("Send a JSON object with a 'state' and an 'action'.")
    try:
        new_state, message = game.apply_action(data.get("state"), data.get("action"))
    except game.StateError as error:
        return _error(str(error))
    except game.ActionError as error:
        # Rejected: tell the player why and send back the unchanged game.
        return jsonify({
            "error": str(error),
            "state": data["state"],
            "view": game.build_view(data["state"]),
        }), 409
    return jsonify({"state": new_state, "view": game.build_view(new_state, message)})


if __name__ == "__main__":
    # Not port 5000: macOS uses it for AirPlay and answers with "403 Forbidden".
    app.run(host="127.0.0.1", port=5057, debug=False)
