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

## Not decided yet

- **Programming language / setup.** Python with a text (command-line) interface and a JSON save
  file was suggested but not yet confirmed.

Open design points (also in `concept.md` section 13):
1. Who writes the scene, hazard and ending texts?
2. Keep the flavour decisions D1 (thank the bus driver) and D4 (default dance), or replace them?
3. Is entering the Storm one-way? (Then a player with only the Chug Jug is locked into Ending B.)
4. Blocked actions: show them with an explanation, or hide them until available?
5. Hazard options: always in the same order on screen, or shuffled? (The deadly option stays fixed.)

When one of these is decided, update both this list and `concept.md`.
