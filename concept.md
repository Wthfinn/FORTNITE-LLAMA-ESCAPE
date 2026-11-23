# Plot Twist – "Where's My Llama?" · Conceptual Foundation

Draft v0.8 · 23 Nov 2026 · based on the Plot Twist BRD v1.0

This document tells us **what** we build and **what we don't** before we write any code.
It stays at the complexity of the BRD on purpose.

---

## 1. Story in one paragraph

The player sits in the **Battle Bus** and learns that their llama has run away.
They choose where to land, then travel between real Fortnite POIs, make decisions and collect items.
Every trip between POIs brings a **hazard** (a trap, an enemy team, a rocket, a cliff…), and one
wrong move means elimination.
The final sequence is **the Storm**, entered from Polar Peak, where the llama was last seen.
There are three endings:
- **A (good):** the player finds the llama and escapes the storm with it.
- **B (bad):** the player finds the llama but can't get it out, and both are eliminated by the storm.
- **C (eliminated):** the player picks the deadly option in a hazard on the way.

---

## 2. Core concepts (glossary)

These are the building blocks everything else is made from.

| Concept | What it is | Changes during play? |
|---|---|---|
| **Scene** (= Room) | A place the player can be, e.g. *Pleasant Park*. Has a text, exits and actions. | No (content). Its text can depend on the state. |
| **Route** (= Exit) | A connection from one scene to another. Together, all routes form the **Map**. | No |
| **Item** | A thing the player can collect once per game and keep. Items are never used up. | – |
| **Choice** | A question with a list of options, where each option has effects (store a value, end the game, finish a trip). **Decisions and hazards are both choices** and share the same logic in code. | – |
| ↳ **Decision** | A choice that is *optional*, sits in a scene, has 2 options and **stores which option was picked**. Made once per game. Affects the ending later (or is flavour). | – |
| ↳ **Hazard** | A choice that is *forced* while travelling to a POI, has 3 options (2 safe, 1 deadly) and has an **immediate** effect: arrive or be eliminated. Only *that* it was survived is stored. Each hazard happens at most once per game. | – |
| **Condition** (= Blocker) | A rule that must be true before an action is allowed, e.g. "has an item". | No |
| **Action** | Something the player can do: travel, collect, decide, answer a hazard, finish. | No (content) |
| **Ending** | One of three final outcomes (A, B, C). Once reached, the game is over. | No (content) |
| **Player** | The single person playing. Not a separate object: the player *is* their game state (where they are, what they carry, what they decided, which hazards they survived). | – |
| **Game state** (= Status) | Everything that changes: current scene, inventory, decisions, used hazards, status, ending. | Yes → saved |
| **Save file** | The game state written to disk after every accepted action. | Yes |

**Key split:** the **story** (scenes, routes, items, decisions, hazards, endings) is fixed content we
write once. The **game state** is the only thing that changes and gets saved.

---

## 3. The Map (scenes and routes)

Six scenes plus three endings. Three layers:

1. **Battle Bus:** the player chooses where to land (any of the four POIs). One-way, and no hazard on landing.
2. **The four POIs:** every POI connects to every other POI, so the player can travel freely and go back.
   **Every POI-to-POI trip triggers a hazard** as long as the destination has one left (see section 6).
3. **The Storm:** the ending sequence. Only reachable from Polar Peak, only with an item, and no hazard.

```
                         [Battle Bus]  (start)
                              │  drop: player picks ANY POI (one-way, no hazard)
      ┌───────────────┬───────┴───────┬────────────────┐
      ▼               ▼               ▼                ▼
[Pleasant Park]  [Retail Row]  [Tilted Towers]   [Polar Peak]
      └───────────────┴───────────────┴────────────────┘
       every POI connects to every other POI (both ways)
       ⚠ each trip: hazard of the destination → safe: arrive / deadly: Ending C
                                                       │
                                                       │ 🔒 needs Grenades OR Chug Jug
                                                       │    (one-way, no way back, no hazard)
                                                       ▼
                                                  [The Storm]  → Ending A or Ending B
```

| ID | Scene | What happens here |
|---|---|---|
| `bus` | Battle Bus | Intro: the llama ran away. Decision D1. Choose a landing spot. |
| `pleasant_park` | Pleasant Park | Decision D2 (loot the house). |
| `retail_row` | Retail Row | **Vending machine** → Impulse Grenades. Decision D4. |
| `tilted_towers` | Tilted Towers | **Supply drop** → Chug Jug. Decision D3. |
| `polar_peak` | Polar Peak | Decision D5 (take the high ground). Route into the Storm. |
| `storm` | The Storm | Final action: *Search for the llama* → ending. |

Routes:

| From | To | Condition | Hazard? |
|---|---|---|---|
| bus | pleasant_park, retail_row, tilted_towers, polar_peak | – (one-way) | No |
| each POI | each of the other three POIs | – | **Yes**, the destination's next unused hazard |
| polar_peak | storm | **has Impulse Grenades or Chug Jug** (one-way) | No |

---

## 4. Items

Exactly two items. Neither item is needed to get the other, and the player may collect both.

| ID | Item | Where / how | What it does |
|---|---|---|---|
| `impulse_grenades` | Impulse Grenades | Action *Use vending machine* at Retail Row | **Unlocks the route** Polar Peak → Storm. In the storm, it lets the player launch themselves **and the llama** back out → needed for the **good ending**. |
| `chug_jug` | Chug Jug | Action *Open supply drop* at Tilted Towers | **Unlocks the route** Polar Peak → Storm (the healing keeps you alive long enough to reach the llama). But it can't get you out, so on its own it leads to the **bad ending**. |

With both items, the grenades count: the player can get out with the llama.

Rules (BRD PT03, R2, R3):
- Each item can be collected only at its location and **only once per game**.
- After collecting, the vending machine / supply drop shows as empty and doesn't offer the item again.
- Items stay in the inventory. Using them doesn't remove them.

---

## 5. Decisions

Five decisions, each with two options, each made **once** per game. After choosing, the decision
is no longer offered, but it is remembered.
Three decisions matter for the ending. Two are "flavour": they're remembered and shown in the
ending review, but don't change the outcome.

| ID | Scene | Option ✅ | Option ❌ | Affects ending? |
|---|---|---|---|---|
| D1 `thanked_driver` | Battle Bus | Thank the bus driver | Jump without thanking | No (flavour) |
| D2 `looted_house` | Pleasant Park | **Loot the house** (you find hay and llama hoofprints) | Skip the house | **Yes** |
| D3 `followed_tracks` | Tilted Towers | **Follow the llama tracks** | Chase the enemy squad | **Yes** |
| D4 `danced` | Retail Row | Do the default dance | Keep moving | No (flavour) |
| D5 `took_high_ground` | Polar Peak | **Climb for the high ground** (you spot the llama heading into the storm) | Stay at the base | **Yes** |

The order in which the player visits places doesn't matter. Only the final state counts.

---

## 6. Hazards

Hazards make every trip between POIs risky. They lead to the third ending.

**How they work:**
- Each POI has **2 hazards** (8 in total), in a fixed order.
- Travelling **to** a POI triggers that POI's next unused hazard: the 1st trip there gives hazard 1,
  the 2nd trip gives hazard 2. After both have been used, trips to that POI are safe.
- Each hazard happens **at most once per game**.
- A hazard offers **3 options: 2 safe, 1 deadly**.
  - Safe → the player arrives at the destination and the hazard is marked as used.
  - Deadly → **Ending C "Eliminated"** immediately.
- Landing from the Bus and entering the Storm have **no** hazards.
- Nothing is random: the same trips in the same order always give the same hazards.

Suggested hazards (texts and options are placeholders the team can change; the deadly option is marked 💀):

| ID | Destination | # | Situation | Options |
|---|---|---|---|---|
| H1 | Pleasant Park | 1 | A spike trap on the garden path | Jump over it · Go around through the hedge · 💀 Sprint straight through |
| H2 | Pleasant Park | 2 | A squad is camping right ahead | Sneak along the fence · Wait until they leave · 💀 Walk past them in the open |
| H3 | Retail Row | 1 | A rocket is flying straight at you | Build a wall · Dive behind a car · 💀 Keep looking at the shop sign |
| H4 | Retail Row | 2 | A sniper glints on a rooftop | Zig-zag to cover · Crouch behind the dumpsters · 💀 Stand still to check your map |
| H5 | Tilted Towers | 1 | An enemy team smokes you from the clock tower | Retreat behind a building · Build a ramp for cover · 💀 Push them alone |
| H6 | Tilted Towers | 2 | A doorway looks suspiciously clean | Enter through the window · Shoot the doorway first · 💀 Walk right in |
| H7 | Polar Peak | 1 | The icy path runs along a cliff edge | Take it slow · Take the longer path inland · 💀 Sprint along the edge |
| H8 | Polar Peak | 2 | A pump shotgun player waits behind the castle wall | Go around the other side · Throw something to distract them · 💀 Peek around the corner |

**Shortest possible game now:** land at Retail Row → use the vending machine → travel to Polar Peak
(**hazard H7**) → enter the Storm → search for the llama. That's 5 choices, and one of them can eliminate you.

---

## 7. Endings

| Ending | Title | When | Text idea |
|---|---|---|---|
| **A** | "Llama Found!" | The player lands next to the llama with health left. Needs the Impulse Grenades (and the Chug Jug, which opened the storm). | You find the llama and launch both of you out of the storm. Victory! |
| **B** | "Lost in the Storm" | The health runs out in the Storm, before the llama is reached (also while flying across the valley). | The storm drains your health and you are lost in the storm. |
| **C** | "Eliminated" | Immediately when the player picks a deadly hazard option | You were eliminated before you could find your llama. |

Ending rule in the Storm (the earlier decisions D2, D3 and D5 no longer matter):

| Grenades | Reaches the llama before health hits 0 | Ending |
|---|---|---|
| yes | yes | **A** (win) |
| any | no (health hits 0, also mid-jump) | B |
| no | (cannot cross the valley) | B once the health runs out |

All endings are reachable from a new game (BRD R4): the Chug Jug gets the player into the Storm, the
grenades plus enough health give A, running out of health gives B, and any deadly hazard option gives C.

Once an ending is reached (PT05):
- It is clearly shown as **ENDING A** / **B** / **C**.
- All story actions (travel, collect, decide, hazards) are disabled.
- The player can view a **review** (ending, inventory, all five decisions, hazards survived) or start a **new game**.

---

## 8. Actions

Every action follows the same pattern: **check conditions → if OK, apply effects and save → show result.**
If a condition fails, the game shows why and **changes nothing** (BRD R1).

### Story actions (only while the game is in progress)

| Action | Condition(s) | Effect |
|---|---|---|
| **Land at** *POI* | Player is in the Bus | `current_scene` = chosen POI |
| **Travel to** *POI* | Player is at a POI, destination is another POI | If the destination has an unused hazard: show it and wait for the answer (see below). Otherwise: `current_scene` changes. |
| **Answer hazard** *option* | A hazard is being shown | Safe: hazard added to `used_hazards`, `current_scene` = destination. Deadly: status → ended, ending C. |
| **Go to the Storm** | Player is at Polar Peak + has at least one item | `current_scene` = storm |
| **Collect** *item* (vending machine, supply drop) | Player is in the right scene + item not yet in inventory | Item is added to the inventory |
| **Decide** *option* | Player is in the right scene + decision not yet made | Decision is stored |
| **Search for the llama** | Player is in the Storm | Ending A or B is calculated, status → ended |

**Travel + hazard counts as one action.** The game only saves once the hazard has been answered.
If the player quits while a hazard is on screen, nothing has changed: on resume they are still at
the starting POI and will get the same hazard again. That way we don't need to save a "half-finished trip".

### System actions (always available, except during a hazard)

| Action | What it does |
|---|---|
| **New game** | Starts a fresh game. If a save exists, asks for confirmation first (PT01, A6). |
| **Resume** | Loads the save file. Only offered if a save exists. |
| **Inventory** | Shows the items carried. Changes nothing. |
| **Review** | After an ending: shows the ending, the items, the decisions and the hazards survived. |
| **Quit** | Leaves the game. Progress is already saved. |

### Blockers (what can stop an action)

| Blocker | Example message | Effect |
|---|---|---|
| Route locked | "You won't last a second in the storm without gear. Find some first." | Rejected, nothing changes |
| Item already collected | "The vending machine is empty." (or the action is simply hidden) | Not offered again |
| Decision already made | – | Not offered again |
| Hazard already used | – | Not shown again; the trip is safe |
| Hazard on screen | Only the 3 hazard options can be chosen | Everything else waits |
| Game has ended | "The game is over. Review it or start a new game." | All story actions rejected |

---

## 9. Status (game lifecycle)

```
 no save ──New game──▶ IN_PROGRESS ──Search for the llama──▶ ENDED (A or B)
                        ▲   │    │
                        │   │    └──deadly hazard option──▶ ENDED (C)
                        │   └── Quit / Resume ──┘
                        └────── New game (confirmed) ◀── from any status
```

| Status | Meaning |
|---|---|
| `in_progress` | The player is playing. Story actions allowed. |
| `ended` | An ending was reached. Only review / new game / quit are allowed. |

("No save" isn't a status in the file. It just means the save file doesn't exist.)

---

## 10. Data model

Two separate parts:

### 10a. Story (fixed content, never saved, never changed)

```
Story
├── start_scene: "bus"
├── scenes:     { id → { name, text, routes[], actions[] } }
├── routes:     { from, to, requires_any_item: [item IDs] (optional) }
├── items:      { id → { name, scene, description } }
├── decisions:  { id → { scene, question, option_yes, option_no, affects_ending } }
├── hazards:    { id → { destination, order (1 or 2), situation,
│                        options: [ { text, deadly: true/false } × 3 ] } }
└── endings:    { "A" / "B" / "C" → { title, text } }
```

### 10b. Game state (the only thing that changes; saved as JSON after every accepted action)

| Field | Type | Start value | Notes |
|---|---|---|---|
| `status` | text | `"in_progress"` | `"in_progress"` or `"ended"` |
| `current_scene` | text | `"bus"` | ID of a scene |
| `inventory` | list of item IDs | `[]` | never contains duplicates |
| `decisions` | map: decision ID → `true` / `false` / `null` | all `null` | `null` = not decided yet |
| `used_hazards` | list of hazard IDs | `[]` | hazards survived; never contains duplicates |
| `ending` | text or null | `null` | `"A"`, `"B"` or `"C"` once ended |

Example save file in the middle of a game:

```json
{
  "status": "in_progress",
  "current_scene": "tilted_towers",
  "inventory": ["impulse_grenades", "chug_jug"],
  "decisions": {
    "thanked_driver": true,
    "looted_house": true,
    "followed_tracks": null,
    "danced": false,
    "took_high_ground": null
  },
  "used_hazards": ["H3", "H5"],
  "ending": null
}
```

Two shortcuts keep the state small:
- Items are collected once and never used up, so **"collected" = "in inventory"**.
- A POI's next hazard is simply its first hazard that isn't in `used_hazards` yet. No counter needed.

---

## 11. How this covers the BRD acceptance scenarios

| Scenario | How we show it |
|---|---|
| **A1 Locked route** | Land at Polar Peak with no item, try *Go to the Storm* → rejected, still at Polar Peak, inventory still empty. |
| **A2 Unlocked route** | Land at Tilted Towers, collect the Chug Jug, travel to Polar Peak (survive H7), *Go to the Storm* → you're in the Storm, Chug Jug still in inventory. |
| **A3 No duplicates** | Use the vending machine, travel away and back to Retail Row (surviving the hazards) → machine is empty, inventory has one Impulse Grenades. |
| **A4 Resume** | Collect an item, make a decision, survive a hazard, quit, restart the app, *Resume* → same scene, item, decision, used hazards and routes. |
| **A5 Two outcomes** | Game 1: all three right decisions + grenades → Ending A. Game 2: same, but only the Chug Jug → Ending B. (Game 3: pick a deadly option → Ending C.) After an ending, story actions are rejected. |
| **A6 Restart safely** | *New game* → cancel → nothing changes. *New game* → confirm → Battle Bus, empty inventory, all decisions `null`, no used hazards. |

---

## 12. What we code vs. what we don't

**We code:**
- The story content (6 scenes, 2 items, 5 decisions, 8 hazards, 3 endings) as data.
- A text interface: show the scene and a numbered list of available actions, then read the player's choice.
- The action logic (conditions → effects), the hazard and ending rules, and saving/loading the game state.

**We don't code (out of scope, BRD):**
- Health, shield, real combat, enemies that act, timers or a moving storm
  (hazards are just text choices, not combat)
- Currency, shops with prices, item limits/slots, dropping items
- More than one player, AI dialogue, a story editor, random/generated content
- Images and sound (optional in the BRD, can be added later if we have time)

---

## 13. Decisions and open points

**Decided (23 Nov 2026)**
- D1 (thank the bus driver) and D4 (default dance) stay as flavour decisions.
- Entering the Storm is one-way.
- Blocked actions are hidden until they are available (the Storm action appears at Polar Peak once
  the player has an item). Trying a blocked action anyway is rejected with an explanation and changes nothing.
- Hazard options keep a fixed order per hazard, but the deadly option is not always the third one.
- Programming language: Python with Flask, deployed as a web app. Progress is saved in the player's browser.
- One small difference from section 8: a hazard that is on screen is part of the saved state
  (`pending_hazard`). If the player closes the page during a hazard, they come back to the same hazard,
  so they cannot reroll it. The trip itself still only finishes once the hazard is answered.

**Still open**
1. Final scene, hazard and ending texts (current texts are placeholders in `story.py`).

---

## 14. The walking world (version 0.6)

The game is now a top-down, Pokemon-style walking game. The rules in sections 1 to 12 did not change;
only how the player moves and chooses did.

- **Bus:** a sky screen. Left/right picks the landing spot, SPACE jumps (`land:<place>`). T talks to the
  bus driver (decision D1).
- **Towns:** Pleasant Park, Retail Row, Tilted Towers and Polar Peak are four walkable screens
  (20 x 12 tiles). Each has three signposted exits.
- **Paths between the towns:** every pair of towns is joined by its own winding path screen. Walking out
  of a town puts you at the start of that path (the server is not involved yet, and you can turn back at
  any time). In the middle of the path are yellow-black caution tiles with a "DANGER AHEAD" sign.
  **Stepping on them is the "travel" action** (`travel:<place>`): the server answers with the next
  hazard of the destination (danger card) or lets you arrive. Clearing the hazard takes you into the
  destination town.
- **Interactables** glow yellow and have a bouncing "!" above them. Standing next to one shows
  "Press SPACE to interact". The vending machine is only in Retail Row and the supply drop only in Tilted Towers.
- **Things to use:** the house door (D2), tracks on the ground (D3), the dance floor (D4), the lookout
  (D5), the vending machine and the supply drop. Face them and press SPACE; a menu with the options
  appears (number keys choose).
- **Storm:** the top of Polar Peak is a purple gate. Without an item the server refuses ("You won't last a
  second in the storm without gear"), nothing changes and the player is moved one step back. With an
  item the player enters the pink, foggy Storm room and searches for the Llama (SPACE).
- **Not part of the saved game:** the player's exact position. After resuming, the player stands at the
  start tile of the saved place. Everything the rules care about (place, items, decisions, hazards,
  ending) is saved as before.

---

## 15. Changes made on 23 Nov (afternoon)

These changes replace the older text in sections 3 to 9 where they differ.

**Hazards belong to paths, not to places.**
- There are 6 paths (every pair of the 4 places). **Each path has exactly 2 hazards** (12 in total), which
  happen in order the first two times the path is walked, in either direction. After both are survived the
  path is free: walking over the middle of it just takes you to the other place.
- `game.py` finds the next hazard with `next_hazard(state, origin, destination)`. The page learns which
  hazard is waiting on each path from `view["ahead"]` and draws a subtle hint on the path (footprints,
  shell casings, scorch marks, cracks, the trap).
- Paths are lined with trees, bricks or ice so the player cannot walk around the hazard.

| Path | Hazard 1 | Hazard 2 |
|---|---|---|
| Pleasant Park - Tilted Towers | H1 spike trap | H5 team smokes you from the clock tower |
| Pleasant Park - Retail Row | H2 camping squad | H4 sniper |
| Pleasant Park - Polar Peak | H7 cliff edge | H8 shotgun player |
| Tilted Towers - Retail Row | H3 rocket | H6 suspicious doorway |
| Tilted Towers - Polar Peak | H9 thin ice | H10 avalanche |
| Retail Row - Polar Peak | H11 another squad | H12 rooftop rocket |

**The Chug Jug is the key to the storm.** Only the Chug Jug opens the way into the Storm (the Impulse
Grenades alone do not). The good ending (A) needs the three right decisions **and** the Impulse Grenades,
so it needs both items.

**Health in the storm.** The player has 100 health. Nothing outside the storm hurts. Inside the storm the
health drops by 5 every second (not while a message or menu is open). At 0 the page sends the new action
`storm_timeout` and the game ends with Ending B ("Lost in the Storm"). The health keeps dropping while the
player flies across the valley; the page only sends `search` (the win) when the player lands next to the llama
with health left. The health bar pulses three times when the player enters the Storm. The server accepts `storm_timeout` only in
the Storm. The remaining health is kept in the browser, so resuming in the storm continues where it was.

**Other additions.**
- Bus screen: big Battle Bus for up to 30 seconds (or a click), then a "time to drop" message, then the
  drop screen with a picture of each location.
- Every landing from the bus is a parachute descent. In Tilted Towers the supply drop floats down the
  first time the player is there.
- Retail Row has a supermarket (walk through the entrance) with a cashier, two dancing characters and a
  7 second dance animation with the disco fever music.
- Pleasant Park has a half football pitch with three footballers who tell jokes.
- Polar Peak has a big mountain with a winding path to the summit, and a referee at the storm gate.
- Signs have sarcastic descriptions. Picking up the supply drop or using the vending machine plays a sound.

---

## 16. Changes made on 23 Nov (evening)

These changes replace the older text where they differ.

**Screens**
- Title screen with a pixel picture (fish hero, runaway llama, Storm on the horizon), **New game** and
  **Load game** (the saved game comes back with its place, items, decisions and used dangers).
- Drop screen says "Where we droppin?" and each name sits above its picture. After the choice there is a
  short film: the fish jumps out of the Battle Bus, the bus flies off into the clouds, the fish forgets
  the parachute for a moment. Then the parachute landing as before.
- Red pixel **X** in the corner of windows (supply drop, vending machine, note) instead of the ESC key.

**World**
- Signs only show their long description. Pulsing white arrows mark where one can walk on.
- The danger waits at the *far end* of each path, so every side trail can be visited first, whichever way
  one walks. Paths are walled in by trees, bricks or ice so the danger cannot be bypassed.
- Each path has **2-3 side trails** with a funny character (Renegade Raider, Skull Trooper, Kim
  Kardashian, Peely, Tomatohead, Raven, Jonesy, Meowscles, Cuddle Team Leader). No items, no game effect.
- Supply drop and vending machine have a second option ("Save for a rainy day", "Save a penny...") that
  gives nothing; the player can come back later. Collecting plays a short animation of the item flying into
  a backpack.
- Retail Row: the supermarket entrance glows like other things one can use. The supermarket has 12
  shelves with groceries (no interactions).
- Pleasant Park: a small full football pitch with the circle in the middle; Ronaldo (7), Neymar Jr. (10) and
  Neuer (1) pass the ball; fruit trees; houses drawn after the reference pictures.
- Polar Peak: the path up the mountain has stone steps and a rope.

**Dangers**
- Every safe option has its own message (`survive` in `story.py`, 24 texts). The server returns it.
- Every deadly option plays a 3-6 second film with the fish (`static/cutscenes.js`, `DEATHS`), then the
  elimination screen with the sounds.

**The Storm (replaces the old "search")**
- The Llama stands across a valley with a crumbled bridge. 100 health, **4 health per second** (25 seconds).
- Three things to do while the health drops: read a handwritten note (pineapple on pizza; no value), talk
  to a sunbather (no value), or use an Impulse Grenade at the edge of the valley to jump across.
- Using the grenade sends the server action `search` (unchanged): the server decides Ending A or B. A: hug,
  second grenade, jump out of the storm, victory screen. B (grenades but not all three right decisions):
  hug, but nowhere to go. Without grenades the edge only shows a hint and the player keeps looking.
- At 20 health the page offers the Chug Jug: new server action `use_chug_jug` (only in the Storm, removes
  the item from the inventory); the page adds 50 health. The remaining health is still kept in the browser.
- Reading the note or talking keeps the health dropping; menus, films and the Chug Jug offer pause it.
