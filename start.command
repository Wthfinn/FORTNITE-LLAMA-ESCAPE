#!/bin/bash
# Double-click this file (or run ./start.command) to play the game on your computer.
# It sets everything up the first time, picks a free port and opens your browser.

cd "$(dirname "$0")" || exit 1

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is not installed. Please install it from https://www.python.org/downloads/"
  read -r -p "Press Enter to close..."
  exit 1
fi

if [ ! -d .venv ]; then
  echo "First start: setting things up (about a minute)..."
  python3 -m venv .venv || { read -r -p "Setup failed. Press Enter to close..."; exit 1; }
fi
.venv/bin/pip install -q --disable-pip-version-check -r requirements.txt || { read -r -p "Install failed. Press Enter to close..."; exit 1; }

# Stop an older copy of this game that is still running (it would serve outdated files).
if [ -f .server.pid ]; then
  OLD_PID=$(cat .server.pid)
  if [ -n "$OLD_PID" ] && ps -p "$OLD_PID" -o command= 2>/dev/null | grep -q "flask --app app"; then
    kill "$OLD_PID" 2>/dev/null
    sleep 1
  fi
fi

# Port 5000 is used by macOS (AirPlay), so start at 5057 and use the first free port.
PORT=5057
while lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

URL="http://127.0.0.1:$PORT"
echo
echo "Fortnite Llama Escape is starting at $URL"
echo "Keep this window open while you play. Close it (or press Ctrl+C) to stop the game."
echo

if [ -z "$NO_BROWSER" ]; then
  (sleep 2 && open "$URL") &
fi

echo $$ > .server.pid
exec .venv/bin/python -m flask --app app run --host 127.0.0.1 --port "$PORT"
