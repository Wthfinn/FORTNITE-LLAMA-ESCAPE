"""Tests for the game rules (game.py).

The test names follow the acceptance scenarios A1-A6 of the Plot Twist BRD.
"""

import copy
import json
import unittest

import game
import story


def play(state, *action_ids):
    """Apply several actions in a row and return the final state."""
    for action_id in action_ids:
        state, _ = game.apply_action(state, action_id)
    return state


def ids(state):
    return {a["id"] for a in game.get_actions(state)}


def at_polar_peak(*extra):
    """Land at Polar Peak (no hazard on landing), then do `extra` actions."""
    return play(game.new_state(), "land:polar_peak", *extra)


class StartTests(unittest.TestCase):
    def test_new_game_starts_on_the_bus_with_nothing(self):
        state = game.new_state()
        self.assertEqual(state["current_scene"], "bus")
        self.assertEqual(state["inventory"], [])
        self.assertTrue(all(v is None for v in state["decisions"].values()))
        self.assertEqual(state["used_hazards"], [])
        self.assertEqual(state["status"], "in_progress")
        game.validate_state(state)

    def test_player_can_land_at_every_poi(self):
        for poi in story.POIS:
            with self.subTest(poi=poi):
                state = play(game.new_state(), f"land:{poi}")
                self.assertEqual(state["current_scene"], poi)

    def test_landing_has_no_hazard(self):
        state = play(game.new_state(), "land:polar_peak")
        self.assertIsNone(state["pending_hazard"])

    def test_cannot_return_to_the_bus(self):
        state = play(game.new_state(), "land:retail_row")
        self.assertFalse(any(a.startswith("land:") for a in ids(state)))


class LockedRouteTests(unittest.TestCase):
    def test_a1_locked_route_is_rejected_and_nothing_changes(self):
        state = at_polar_peak()
        before = copy.deepcopy(state)
        with self.assertRaises(game.ActionError) as caught:
            game.apply_action(state, "storm")
        self.assertEqual(str(caught.exception), story.STORM_LOCKED_TEXT)
        self.assertEqual(state, before)
        self.assertEqual(state["current_scene"], "polar_peak")
        self.assertEqual(state["inventory"], [])

    def test_storm_action_is_hidden_without_gear(self):
        self.assertNotIn("storm", ids(at_polar_peak()))

    def test_a2_unlocked_route_with_chug_jug(self):
        state = play(game.new_state(), "land:tilted_towers", "collect:chug_jug",
                     "travel:polar_peak", "hazard:0", "storm")
        self.assertEqual(state["current_scene"], "storm")
        self.assertIn("chug_jug", state["inventory"])

    def test_unlocked_route_with_grenades(self):
        state = play(game.new_state(), "land:retail_row", "collect:impulse_grenades",
                     "travel:polar_peak", "hazard:0", "storm")
        self.assertEqual(state["current_scene"], "storm")
        self.assertIn("impulse_grenades", state["inventory"])

    def test_storm_is_only_offered_at_polar_peak(self):
        state = play(game.new_state(), "land:retail_row", "collect:impulse_grenades")
        self.assertNotIn("storm", ids(state))
        with self.assertRaises(game.ActionError):
            game.apply_action(state, "storm")

    def test_storm_entry_is_one_way(self):
        state = play(game.new_state(), "land:retail_row", "collect:impulse_grenades",
                     "travel:polar_peak", "hazard:0", "storm")
        self.assertEqual(ids(state), {"search"})


class ItemTests(unittest.TestCase):
    def test_a3_no_duplicates_after_revisiting(self):
        state = play(game.new_state(), "land:retail_row", "collect:impulse_grenades",
                     "travel:pleasant_park", "hazard:0",
                     "travel:retail_row", "hazard:0")
        self.assertEqual(state["current_scene"], "retail_row")
        self.assertNotIn("collect:impulse_grenades", ids(state))
        with self.assertRaises(game.ActionError):
            game.apply_action(state, "collect:impulse_grenades")
        self.assertEqual(state["inventory"], ["impulse_grenades"])

    def test_item_only_collectable_at_its_place(self):
        state = play(game.new_state(), "land:pleasant_park")
        before = copy.deepcopy(state)
        with self.assertRaises(game.ActionError):
            game.apply_action(state, "collect:chug_jug")
        self.assertEqual(state, before)

    def test_the_two_items_do_not_need_each_other(self):
        state = play(game.new_state(), "land:tilted_towers", "collect:chug_jug")
        self.assertEqual(state["inventory"], ["chug_jug"])
        state = play(game.new_state(), "land:retail_row", "collect:impulse_grenades")
        self.assertEqual(state["inventory"], ["impulse_grenades"])


class DecisionTests(unittest.TestCase):
    def test_decision_is_remembered_and_cannot_be_repeated(self):
        state = play(game.new_state(), "land:pleasant_park", "decide:looted_house:yes")
        self.assertTrue(state["decisions"]["looted_house"])
        self.assertNotIn("decide:looted_house:yes", ids(state))
        self.assertNotIn("decide:looted_house:no", ids(state))
        with self.assertRaises(game.ActionError):
            game.apply_action(state, "decide:looted_house:no")
        self.assertTrue(state["decisions"]["looted_house"])

    def test_decision_only_in_its_scene(self):
        state = play(game.new_state(), "land:retail_row")
        with self.assertRaises(game.ActionError):
            game.apply_action(state, "decide:looted_house:yes")

    def test_bus_decision_is_optional(self):
        state = play(game.new_state(), "decide:thanked_driver:no", "land:retail_row")
        self.assertIs(state["decisions"]["thanked_driver"], False)


class HazardTests(unittest.TestCase):
    def test_travel_shows_the_first_hazard_of_the_destination(self):
        state = play(game.new_state(), "land:retail_row", "travel:polar_peak")
        self.assertEqual(state["pending_hazard"], "H7")
        self.assertEqual(state["current_scene"], "retail_row")  # not there yet
        self.assertEqual(len(game.get_actions(state)), 3)

    def test_safe_option_arrives_and_marks_hazard_used(self):
        for option in (0, 1):
            with self.subTest(option=option):
                state = play(game.new_state(), "land:retail_row", "travel:polar_peak",
                             f"hazard:{option}")
                self.assertEqual(state["current_scene"], "polar_peak")
                self.assertEqual(state["used_hazards"], ["H7"])
                self.assertIsNone(state["pending_hazard"])

    def test_deadly_option_ends_the_game_with_ending_c(self):
        state = play(game.new_state(), "land:retail_row", "travel:polar_peak", "hazard:2")
        self.assertEqual(state["status"], "ended")
        self.assertEqual(state["ending"], "C")

    def test_second_trip_gives_second_hazard_then_route_is_safe(self):
        state = play(game.new_state(), "land:retail_row")
        state = play(state, "travel:polar_peak", "hazard:0")
        self.assertEqual(state["used_hazards"], ["H7"])
        state = play(state, "travel:retail_row", "hazard:0", "travel:polar_peak")
        self.assertEqual(state["pending_hazard"], "H8")
        # Going back to Retail Row triggers that POI's own second hazard (H4).
        state = play(state, "hazard:1", "travel:retail_row", "hazard:0", "travel:polar_peak")
        # H7 and H8 are used up: the trip to Polar Peak is now safe.
        self.assertIsNone(state["pending_hazard"])
        self.assertEqual(state["current_scene"], "polar_peak")

    def test_every_hazard_has_two_safe_options_and_one_deadly(self):
        for hazard_id, hazard in story.HAZARDS.items():
            with self.subTest(hazard=hazard_id):
                deadly = [o for o in hazard["options"] if o["deadly"]]
                self.assertEqual(len(hazard["options"]), 3)
                self.assertEqual(len(deadly), 1)

    def test_every_poi_has_two_hazards(self):
        for poi in story.POIS:
            orders = sorted(h["order"] for h in story.HAZARDS.values()
                            if h["destination"] == poi)
            self.assertEqual(orders, [1, 2], poi)

    def test_other_actions_are_blocked_during_a_hazard(self):
        state = play(game.new_state(), "land:retail_row", "travel:polar_peak")
        before = copy.deepcopy(state)
        for action in ("collect:impulse_grenades", "travel:pleasant_park", "land:retail_row"):
            with self.subTest(action=action), self.assertRaises(game.ActionError):
                game.apply_action(state, action)
        self.assertEqual(state, before)


class EndingTests(unittest.TestCase):
    def good_run(self, items):
        """All three right decisions, then the Storm with the given items."""
        state = play(game.new_state(), "land:pleasant_park", "decide:looted_house:yes")
        state = play(state, "travel:tilted_towers", "hazard:0", "decide:followed_tracks:yes")
        if "chug_jug" in items:
            state = play(state, "collect:chug_jug")
        state = play(state, "travel:retail_row", "hazard:0")
        if "impulse_grenades" in items:
            state = play(state, "collect:impulse_grenades")
        state = play(state, "travel:polar_peak", "hazard:0", "decide:took_high_ground:yes", "storm")
        return state

    def test_a5_good_ending_with_grenades(self):
        state = play(self.good_run(["impulse_grenades"]), "search")
        self.assertEqual((state["status"], state["ending"]), ("ended", "A"))

    def test_good_ending_with_both_items(self):
        state = play(self.good_run(["impulse_grenades", "chug_jug"]), "search")
        self.assertEqual(state["ending"], "A")

    def test_a5_bad_ending_with_only_chug_jug(self):
        state = play(self.good_run(["chug_jug"]), "search")
        self.assertEqual((state["status"], state["ending"]), ("ended", "B"))

    def test_bad_ending_when_one_right_decision_is_missing(self):
        state = play(game.new_state(), "land:pleasant_park", "decide:looted_house:no")
        state = play(state, "travel:tilted_towers", "hazard:0", "decide:followed_tracks:yes")
        state = play(state, "travel:retail_row", "hazard:0", "collect:impulse_grenades")
        state = play(state, "travel:polar_peak", "hazard:0", "decide:took_high_ground:yes",
                     "storm", "search")
        self.assertEqual(state["ending"], "B")

    def test_flavour_decisions_do_not_change_the_ending(self):
        state = play(game.new_state(), "decide:thanked_driver:no", "land:retail_row",
                     "decide:danced:no", "collect:impulse_grenades")
        state = play(state, "travel:pleasant_park", "hazard:0", "decide:looted_house:yes")
        state = play(state, "travel:tilted_towers", "hazard:0", "decide:followed_tracks:yes")
        state = play(state, "travel:polar_peak", "hazard:0", "decide:took_high_ground:yes",
                     "storm", "search")
        self.assertEqual(state["ending"], "A")

    def test_a5_nothing_changes_after_an_ending(self):
        for state in (self.good_run(["chug_jug"]), at_polar_peak("travel:retail_row", "hazard:2")):
            ended = play(state, "search") if state["status"] == "in_progress" else state
            self.assertEqual(ended["status"], "ended")
            self.assertEqual(game.get_actions(ended), [])
            before = copy.deepcopy(ended)
            for action in ("search", "land:retail_row", "travel:retail_row", "storm"):
                with self.subTest(action=action), self.assertRaises(game.ActionError):
                    game.apply_action(ended, action)
            self.assertEqual(ended, before)

    def test_all_three_endings_are_reachable(self):
        endings = {
            play(self.good_run(["impulse_grenades"]), "search")["ending"],
            play(self.good_run(["chug_jug"]), "search")["ending"],
            play(game.new_state(), "land:retail_row", "travel:polar_peak", "hazard:2")["ending"],
        }
        self.assertEqual(endings, {"A", "B", "C"})


class RejectedActionTests(unittest.TestCase):
    def test_unknown_and_malformed_actions_are_rejected(self):
        state = play(game.new_state(), "land:retail_row")
        before = copy.deepcopy(state)
        for action in ("", "dance", "travel:the_moon", "decide:danced:maybe",
                       "hazard:0", "collect:", None, 5, ["land:retail_row"]):
            with self.subTest(action=action), self.assertRaises(game.ActionError):
                game.apply_action(state, action)
        self.assertEqual(state, before)

    def test_cannot_travel_to_the_place_you_are_in(self):
        state = play(game.new_state(), "land:retail_row")
        with self.assertRaises(game.ActionError):
            game.apply_action(state, "travel:retail_row")

    def test_apply_action_never_changes_the_old_state(self):
        state = game.new_state()
        before = copy.deepcopy(state)
        game.apply_action(state, "land:retail_row")
        self.assertEqual(state, before)


class StateValidationTests(unittest.TestCase):
    def test_a4_state_survives_saving_and_loading(self):
        state = play(game.new_state(), "land:retail_row", "collect:impulse_grenades",
                     "decide:danced:yes", "travel:polar_peak", "hazard:1")
        loaded = json.loads(json.dumps(state))  # what the browser does
        game.validate_state(loaded)
        self.assertEqual(loaded, state)
        self.assertEqual(ids(loaded), ids(state))
        self.assertEqual(loaded["current_scene"], "polar_peak")
        self.assertEqual(loaded["inventory"], ["impulse_grenades"])
        self.assertIs(loaded["decisions"]["danced"], True)

    def test_resuming_in_the_middle_of_a_hazard(self):
        state = play(game.new_state(), "land:retail_row", "travel:polar_peak")
        loaded = json.loads(json.dumps(state))
        self.assertEqual(game.build_view(loaded)["scene_name"], "Danger!")
        self.assertEqual(len(game.get_actions(loaded)), 3)

    def test_broken_states_are_rejected(self):
        good = play(game.new_state(), "land:retail_row")

        def changed(**fields):
            broken = copy.deepcopy(good)
            broken.update(fields)
            return broken

        missing_field = copy.deepcopy(good)
        del missing_field["inventory"]
        extra_field = copy.deepcopy(good)
        extra_field["gold"] = 999
        broken_decisions = copy.deepcopy(good)
        broken_decisions["decisions"]["danced"] = "yes"

        cases = {
            "not a dict": "hello",
            "none": None,
            "missing field": missing_field,
            "extra field": extra_field,
            "bad status": changed(status="won"),
            "bad scene": changed(current_scene="the_moon"),
            "bad item": changed(inventory=["golden_pickaxe"]),
            "duplicate item": changed(inventory=["chug_jug", "chug_jug"]),
            "inventory not a list": changed(inventory="chug_jug"),
            "bad decision value": broken_decisions,
            "bad hazard": changed(used_hazards=["H99"]),
            "duplicate hazard": changed(used_hazards=["H7", "H7"]),
            "hazard skipped order": changed(used_hazards=["H8"]),
            "ending while playing": changed(ending="A"),
            "ended without ending": changed(status="ended"),
            "pending hazard unknown": changed(pending_hazard="H99"),
            "pending hazard on the bus": changed(current_scene="bus", pending_hazard="H1"),
            "pending hazard already used": changed(used_hazards=["H7"], pending_hazard="H7"),
            "pending hazard out of order": changed(pending_hazard="H8"),
        }
        for name, broken in cases.items():
            with self.subTest(case=name), self.assertRaises(game.StateError):
                game.validate_state(broken)
            with self.subTest(case=name + " (apply_action)"), self.assertRaises(game.StateError):
                game.apply_action(broken, "land:retail_row")


class ViewTests(unittest.TestCase):
    def test_review_lists_decisions_and_hazards_after_an_ending(self):
        state = play(game.new_state(), "land:retail_row", "decide:danced:yes",
                     "travel:polar_peak", "hazard:0", "travel:retail_row", "hazard:2")
        view = game.build_view(state)
        self.assertEqual(view["ending"]["code"], "C")
        self.assertEqual(view["review"]["hazards_survived"], 1)
        self.assertEqual(len(view["review"]["decisions"]), 1)
        self.assertEqual(view["actions"], [])

    def test_no_review_while_playing(self):
        self.assertIsNone(game.build_view(game.new_state())["review"])


if __name__ == "__main__":
    unittest.main()
