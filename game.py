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
    }


def validate_state(state):
    """Raise StateError unless `state` is a well-formed game state."""
    if not isinstance(state, dict) or set(state) != STATE_KEYS:
        raise StateError("State has the wrong fields.")
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
    for hazard_id in used:  # order 2 can only be used after order 1
        hazard = story.HAZARDS[hazard_id]
        if hazard["order"] == 2 and _first_hazard(hazard["destination"]) not in used:
            raise StateError("Invalid hazard order.")

    pending = state["pending_hazard"]
    if pending is not None and (pending not in story.HAZARDS or pending in used):
        raise StateError("Invalid pending hazard.")
    if pending is not None and pending != next_hazard(state, story.HAZARDS[pending]["destination"]):
        raise StateError("Invalid pending hazard.")

    if state["status"] == "ended":
        if state["ending"] not in story.ENDINGS or pending is not None:
            raise StateError("Invalid ending.")
    elif state["ending"] is not None:
        raise StateError("Invalid ending.")
    if pending is not None and state["current_scene"] not in story.POIS:
        raise StateError("Invalid pending hazard.")


def _first_hazard(destination):
    return next(h for h, v in story.HAZARDS.items()
                if v["destination"] == destination and v["order"] == 1)


def next_hazard(state, destination):
    """The first hazard of `destination` that has not been survived yet, or None."""
    candidates = sorted(
        (v["order"], h) for h, v in story.HAZARDS.items()
        if v["destination"] == destination and h not in state["used_hazards"]
    )
    return candidates[0][1] if candidates else None


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
        if scene == "polar_peak" and _has_storm_gear(state):
            actions.append({"id": "storm", "label": "Enter the Storm"})
    elif scene == "storm":
        actions.append({"id": "search", "label": "Search for the Llama"})

    return actions


def _has_storm_gear(state):
    return any(i in state["inventory"] for i in story.STORM_UNLOCK_ITEMS)


def storm_ending(state):
    """Ending 'A' or 'B', decided when the player searches in the Storm."""
    right_choices = all(
        state["decisions"][d] is True
        for d, v in story.DECISIONS.items() if v["affects_ending"]
    )
    if right_choices and story.GOOD_ENDING_ITEM in state["inventory"]:
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
        hazard_id = next_hazard(new, rest)
        if hazard_id is None:
            new["current_scene"] = rest
            return new, f"You arrive at {story.SCENES[rest]['name']}."
        new["pending_hazard"] = hazard_id
        return new, story.HAZARDS[hazard_id]["situation"]

    if kind == "hazard":
        hazard_id = new["pending_hazard"]
        hazard = story.HAZARDS[hazard_id]
        new["pending_hazard"] = None
        if hazard["options"][int(rest)]["deadly"]:
            new["status"] = "ended"
            new["ending"] = "C"
            return new, story.ENDINGS["C"]["text"]
        new["used_hazards"].append(hazard_id)
        new["current_scene"] = hazard["destination"]
        return new, f"You made it. You arrive at {story.SCENES[hazard['destination']]['name']}."

    if kind == "collect":
        new["inventory"].append(rest)
        return new, story.ITEMS[rest]["found_text"]

    if kind == "decide":
        decision_id, _, answer = rest.partition(":")
        new["decisions"][decision_id] = answer == "yes"
        return new, story.DECISIONS[decision_id][f"{answer}_text"]

    if kind == "storm":
        new["current_scene"] = "storm"
        return new, "You take a deep breath and step into the Storm."

    # kind == "search"
    new["status"] = "ended"
    new["ending"] = storm_ending(new)
    return new, story.ENDINGS[new["ending"]]["text"]


def build_view(state, message=""):
    """Everything the web page needs to show the current state."""
    validate_state(state)
    scene = story.SCENES[state["current_scene"]]
    pending = state["pending_hazard"]

    view = {
        "status": state["status"],
        "scene_name": scene["name"],
        "text": scene["text"],
        "message": message,
        "actions": get_actions(state),
        "inventory": [story.ITEMS[i]["name"] for i in state["inventory"]],
        "ending": None,
        "review": None,
    }

    if pending is not None:
        view["text"] = story.HAZARDS[pending]["situation"]
        view["scene_name"] = "Danger!"

    if state["status"] == "ended":
        ending = story.ENDINGS[state["ending"]]
        view["ending"] = {"code": state["ending"], "title": ending["title"], "text": ending["text"]}
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
