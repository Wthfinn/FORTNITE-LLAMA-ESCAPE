"""Shared helper for the tests."""

import story


def resolve_hazard(state, action_id):
    """Turn "hazard:0", "hazard:1" and "hazard:2" into real option numbers.

    The tests think in terms of "first safe option", "second safe option" and
    "the deadly option", because the deadly option sits at a different place in
    every hazard. 0 and 1 are the two safe options, 2 is the deadly one.
    """
    if not action_id.startswith("hazard:") or not state.get("pending_hazard"):
        return action_id
    options = story.HAZARDS[state["pending_hazard"]]["options"]
    safe = [i for i, option in enumerate(options) if not option["deadly"]]
    deadly = [i for i, option in enumerate(options) if option["deadly"]]
    order = safe + deadly
    return f"hazard:{order[int(action_id.split(':')[1])]}"
