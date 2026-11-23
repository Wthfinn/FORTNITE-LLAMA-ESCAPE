"""Game rules for Fortnite Llama Escape.

Everything here is plain Python with no web code. The game state is a small
dictionary (see new_state). Every function that changes the game returns a NEW
state and never touches the old one, so a rejected action leaves everything
unchanged (BRD rule R1).
"""

import copy

import story

STATE_KEYS = {
    "status", "current_scene", "inventory", "decisions",
    "used_hazards", "pending_hazard", "ending",
}
# Saved games from before the player could leave the Storm do not have this field; that is fine.
OPTIONAL_STATE_KEYS = {"storm_opened"}


class ActionError(Exception):
    """The action is not allowed right now. Nothing was changed."""


class StateError(Exception):
    """The given game state is not a valid game state."""


def new_state():
    return {
        "status": "in_progress",
        "current_scene": story.START_SCENE,
        "inventory": [],
        "decisions": {d: None for d in story.DECISIONS},
        "used_hazards": [],
        "pending_hazard": None,
        "ending": None,
        "storm_opened": False,       # True once the player has been in the Storm: the gate stays open
    }


def validate_state(state):
    """Raise StateError unless `state` is a well-formed game state."""
    if not isinstance(state, dict) or not STATE_KEYS <= set(state) <= STATE_KEYS | OPTIONAL_STATE_KEYS:
        raise StateError("State has the wrong fields.")
    if not isinstance(state.get("storm_opened", False), bool):
        raise StateError("Invalid storm flag.")
    if state["status"] not in ("in_progress", "ended"):
        raise StateError("Unknown status.")
    if state["current_scene"] not in story.SCENES:
        raise StateError("Unknown scene.")

    inventory = state["inventory"]
    if (not isinstance(inventory, list)
            or any(i not in story.ITEMS for i in inventory)
            or len(set(inventory)) != len(inventory)):
        raise StateError("Invalid inventory.")

    decisions = state["decisions"]
    if (not isinstance(decisions, dict) or set(decisions) != set(story.DECISIONS)
            or any(v not in (True, False, None) for v in decisions.values())):
        raise StateError("Invalid decisions.")

    used = state["used_hazards"]
    if (not isinstance(used, list)
            or any(h not in story.HAZARDS for h in used)
            or len(set(used)) != len(used)):
        raise StateError("Invalid hazards.")
    for hazard_id in used:  # the second hazard of a path can only be used after the first
        hazard = story.HAZARDS[hazard_id]
        if hazard["order"] == 2 and _first_hazard(hazard["path"]) not in used:
            raise StateError("Invalid hazard order.")

    pending = state["pending_hazard"]
    if pending is not None:
        if pending not in story.HAZARDS or pending in used:
            raise StateError("Invalid pending hazard.")
        origin = state["current_scene"]
        path = story.HAZARDS[pending]["path"]
        if origin not in path or origin not in story.POIS:
            raise StateError("Invalid pending hazard.")
        if pending != next_hazard(state, origin, other_end(path, origin)):
            raise StateError("Invalid pending hazard.")

    if state["status"] == "ended":
        if state["ending"] not in story.ENDINGS or pending is not None:
            raise StateError("Invalid ending.")
    elif state["ending"] is not None:
        raise StateError("Invalid ending.")


def other_end(path, place):
    """The place at the other end of a path."""
    return path[1] if path[0] == place else path[0]


def _path_hazards(a, b):
    """The hazards of the path between two places, first one first."""
    return sorted(
        (v["order"], h) for h, v in story.HAZARDS.items() if set(v["path"]) == {a, b}
    )


def _first_hazard(path):
    return _path_hazards(*path)[0][1]


def next_hazard(state, origin, destination):
    """The first hazard on the path origin-destination not survived yet, or None."""
    for _, hazard_id in _path_hazards(origin, destination):
        if hazard_id not in state["used_hazards"]:
            return hazard_id
    return None


def get_actions(state):
    """All actions the player may choose right now, as {id, label} dicts.

    Actions that are not available yet are simply not listed (hidden).
    """
    if state["status"] == "ended":
        return []

    pending = state["pending_hazard"]
    if pending is not None:
        options = story.HAZARDS[pending]["options"]
        return [{"id": f"hazard:{i}", "label": o["text"]} for i, o in enumerate(options)]

    scene = state["current_scene"]
    actions = []

    for item_id, item in story.ITEMS.items():
        if item["scene"] == scene and item_id not in state["inventory"]:
            actions.append({"id": f"collect:{item_id}", "label": item["action_label"]})

    for decision_id, decision in story.DECISIONS.items():
        if decision["scene"] == scene and state["decisions"][decision_id] is None:
            actions.append({"id": f"decide:{decision_id}:yes", "label": decision["yes"]})
            actions.append({"id": f"decide:{decision_id}:no", "label": decision["no"]})

    if scene == "bus":
        for poi in story.POIS:
            actions.append({"id": f"land:{poi}", "label": f"Land at {story.SCENES[poi]['name']}"})
    elif scene in story.POIS:
        for poi in story.POIS:
            if poi != scene:
                actions.append({"id": f"travel:{poi}", "label": f"Go to {story.SCENES[poi]['name']}"})
        if scene == "polar_peak" and (_has_storm_gear(state) or state.get("storm_opened")):
            actions.append({"id": "storm", "label": "Enter the Storm"})
    elif scene == "storm":
        actions.append({"id": "leave_storm", "label": "Leave the Storm"})
        actions.append({"id": "search", "label": "Search for the Llama"})
        if "chug_jug" in state["inventory"]:
            actions.append({"id": "use_chug_jug", "label": "Drink the Chug Jug"})
        # sent by the page when the storm has used up all the player's health
        actions.append({"id": "storm_timeout", "label": "Let the storm take you"})

    return actions


def _has_storm_gear(state):
    return any(i in state["inventory"] for i in story.STORM_UNLOCK_ITEMS)


def storm_ending(state):
    """Ending 'A' or 'B', decided when the player reaches the Llama in the Storm.

    The page only sends "search" when the player lands next to the Llama with
    health left, so the only thing the rules check is the Impulse Grenades.
    The earlier decisions do not matter for the ending.
    """
    if story.GOOD_ENDING_ITEM in state["inventory"]:
        return "A"
    return "B"


def apply_action(state, action_id):
    """Apply one action. Returns (new_state, message).

    Raises ActionError (and changes nothing) if the action is not available.
    """
    validate_state(state)
    if not isinstance(action_id, str):
        raise ActionError("Unknown action.")
    if state["status"] == "ended":
        raise ActionError("The game is over. Review it or start a new game.")
    if action_id not in {a["id"] for a in get_actions(state)}:
        if action_id == "storm" and state["current_scene"] == "polar_peak":
            raise ActionError(story.STORM_LOCKED_TEXT)
        raise ActionError("You can't do that right now.")

    new = copy.deepcopy(state)
    kind, _, rest = action_id.partition(":")

    if kind == "land":
        new["current_scene"] = rest
        return new, f"You land at {story.SCENES[rest]['name']}."

    if kind == "travel":
        hazard_id = next_hazard(new, new["current_scene"], rest)
        if hazard_id is None:
            new["current_scene"] = rest
            return new, f"You arrive at {story.SCENES[rest]['name']}."
        new["pending_hazard"] = hazard_id
        return new, story.HAZARDS[hazard_id]["situation"]

    if kind == "hazard":
        hazard_id = new["pending_hazard"]
        hazard = story.HAZARDS[hazard_id]
        new["pending_hazard"] = None
        option = hazard["options"][int(rest)]
        if option["deadly"]:
            new["status"] = "ended"
            new["ending"] = "C"
            return new, story.ENDINGS["C"]["text"]
        new["used_hazards"].append(hazard_id)
        destination = other_end(hazard["path"], new["current_scene"])
        new["current_scene"] = destination
        # the text that fits this exact option (the page shows it, then arrives)
        return new, option["survive"]

    if kind == "collect":
        new["inventory"].append(rest)
        return new, story.ITEMS[rest]["found_text"]

    if kind == "decide":
        decision_id, _, answer = rest.partition(":")
        new["decisions"][decision_id] = answer == "yes"
        return new, story.DECISIONS[decision_id][f"{answer}_text"]

    if kind == "storm":
        new["current_scene"] = "storm"
        new["storm_opened"] = True
        return new, "You take a deep breath and step into the Storm."

    if action_id == "leave_storm":
        new["current_scene"] = "polar_peak"
        return new, "You step back out of the Storm. Your health stays exactly as it is."

    if action_id == "use_chug_jug":
        new["inventory"].remove("chug_jug")      # drunk: the page gives the health back
        return new, "You chug the Chug Jug. Glug, glug, glug. You feel much better."

    if action_id == "storm_timeout":
        new["status"] = "ended"
        new["ending"] = "B"                      # the health ran out in the Storm: lost in the storm
        return new, story.ENDINGS["B"]["text"]

    # kind == "search"
    new["status"] = "ended"
    new["ending"] = storm_ending(new)
    return new, story.ENDINGS[new["ending"]]["text"]


def _move_node(action_id):
    """The map place an action moves the player to, or None if it is not a move."""
    kind, _, rest = action_id.partition(":")
    if kind in ("land", "travel"):
        return rest
    if action_id == "storm":
        return "storm"
    return "polar_peak" if action_id == "leave_storm" else None


def build_view(state, message=""):
    """Everything the web page needs to show the current state."""
    validate_state(state)
    scene_id = state["current_scene"]
    scene = story.SCENES[scene_id]
    pending = state["pending_hazard"]
    ended = state["status"] == "ended"
    actions = get_actions(state)

    # Moves are clicked on the map; every other action is a button in the card.
    move_for_node = {_move_node(a["id"]): a["id"] for a in actions if _move_node(a["id"])}
    map_nodes = []
    for node_id, pos in story.MAP_NODES.items():
        if node_id == "bus" and scene_id != "bus":
            continue
        if node_id == "storm" and node_id not in move_for_node and scene_id != "storm":
            continue  # hidden until the player can enter the Storm
        map_nodes.append({
            "id": node_id,
            "name": story.SCENES[node_id]["name"],
            "x": pos["x"], "y": pos["y"],
            "here": node_id == scene_id,
            "action": move_for_node.get(node_id),
        })

    choices = []
    for action in actions:
        if _move_node(action["id"]):
            continue
        choice = dict(action)
        if action["id"].startswith("collect:"):
            choice["image"] = story.ITEMS[action["id"].split(":")[1]]["prop"]
        elif action["id"].startswith("decide:"):
            choice["question"] = story.DECISIONS[action["id"].split(":")[1]]["question"]
        choices.append(choice)

    props = [
        {"image": item["prop"], "name": item["action_label"]}
        for item_id, item in story.ITEMS.items()
        if item["scene"] == scene_id and item_id not in state["inventory"]
    ]

    view = {
        "status": state["status"],
        "scene_id": scene_id,
        "scene_name": scene["name"],
        "text": scene["text"],
        "image": f"scene_{scene_id}.jpg",
        "message": message,
        "actions": actions,
        "choices": choices,
        "map": {
            "nodes": map_nodes,
            "token_at": other_end(story.HAZARDS[pending]["path"], scene_id) if pending else scene_id,
        },
        "props": props,
        # the next hazard on the path to each other place (None = path is free)
        "ahead": {
            poi: next_hazard(state, scene_id, poi)
            for poi in story.POIS if scene_id in story.POIS and poi != scene_id and pending is None
        },
        "hazard": None,
        "inventory": [
            {"name": story.ITEMS[i]["name"], "icon": story.ITEMS[i]["icon"]}
            for i in state["inventory"]
        ],
        "ending": None,
        "review": None,
    }

    if pending is not None:
        hazard = story.HAZARDS[pending]
        view["hazard"] = {"id": pending, "image": f"hazard_{pending}.jpg",
                          "situation": hazard["situation"]}
        view["scene_name"] = "Danger!"
        view["text"] = hazard["situation"]

    if ended:
        ending = story.ENDINGS[state["ending"]]
        view["ending"] = {
            "code": state["ending"], "title": ending["title"], "text": ending["text"],
            "image": f"ending_{state['ending'].lower()}.jpg",
        }
        view["review"] = {
            "decisions": [
                {
                    "question": d["question"],
                    "answer": d["yes"] if state["decisions"][i] else d["no"],
                }
                for i, d in story.DECISIONS.items() if state["decisions"][i] is not None
            ],
            "hazards_survived": len(state["used_hazards"]),
        }
    return view
