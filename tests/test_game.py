"""Tests for the game rules (game.py).

The test names follow the acceptance scenarios A1-A6 of the Plot Twist BRD.
Hazards belong to the six paths between the four places: each path has exactly
two hazards, first one first, and is free afterwards.
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


def polar_peak_with_chug_jug():
    return play(game.new_state(), "land:tilted_towers", "collect:chug_jug",
                "travel:polar_peak", "hazard:0")


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
        state = play(polar_peak_with_chug_jug(), "storm")
        self.assertEqual(state["current_scene"], "storm")
        self.assertIn("chug_jug", state["inventory"])

    def test_the_grenades_alone_do_not_open_the_storm(self):
        state = play(game.new_state(), "land:retail_row", "collect:impulse_grenades",
                     "travel:polar_peak", "hazard:0")
        self.assertEqual(state["current_scene"], "polar_peak")
        self.assertNotIn("storm", ids(state))
        before = copy.deepcopy(state)
        with self.assertRaises(game.ActionError):
            game.apply_action(state, "storm")
        self.assertEqual(state, before)

    def test_storm_is_only_offered_at_polar_peak(self):
        state = play(game.new_state(), "land:tilted_towers", "collect:chug_jug")
        self.assertNotIn("storm", ids(state))
        with self.assertRaises(game.ActionError):
            game.apply_action(state, "storm")

    def test_storm_entry_is_one_way(self):
        state = play(polar_peak_with_chug_jug(), "storm")
        self.assertEqual(ids(state), {"search", "storm_timeout"})


class StormTimeoutTests(unittest.TestCase):
    def test_storm_timeout_ends_the_game_with_ending_c(self):
        state = play(polar_peak_with_chug_jug(), "storm", "storm_timeout")
        self.assertEqual((state["status"], state["ending"]), ("ended", "C"))

    def test_storm_timeout_is_rejected_outside_the_storm(self):
        for state in (game.new_state(), at_polar_peak(), polar_peak_with_chug_jug()):
            before = copy.deepcopy(state)
            with self.subTest(scene=state["current_scene"]), self.assertRaises(game.ActionError):
                game.apply_action(state, "storm_timeout")
            self.assertEqual(state, before)

    def test_nothing_happens_after_the_storm_took_the_player(self):
        state = play(polar_peak_with_chug_jug(), "storm", "storm_timeout")
        for action in ("search", "storm_timeout", "land:retail_row"):
            with self.subTest(action=action), self.assertRaises(game.ActionError):
                game.apply_action(state, action)


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
    def test_travel_shows_the_first_hazard_of_the_path(self):
        state = play(game.new_state(), "land:retail_row", "travel:polar_peak")
        self.assertEqual(state["pending_hazard"], "H11")
        self.assertEqual(state["current_scene"], "retail_row")  # not there yet
        self.assertEqual(len(game.get_actions(state)), 3)

    def test_safe_option_arrives_and_marks_hazard_used(self):
        for option in (0, 1):
            with self.subTest(option=option):
                state = play(game.new_state(), "land:retail_row", "travel:polar_peak",
                             f"hazard:{option}")
                self.assertEqual(state["current_scene"], "polar_peak")
                self.assertEqual(state["used_hazards"], ["H11"])
                self.assertIsNone(state["pending_hazard"])

    def test_deadly_option_ends_the_game_with_ending_c(self):
        state = play(game.new_state(), "land:retail_row", "travel:polar_peak", "hazard:2")
        self.assertEqual(state["status"], "ended")
        self.assertEqual(state["ending"], "C")

    def test_a_path_has_exactly_two_hazards_then_it_is_free(self):
        state = play(game.new_state(), "land:retail_row")
        state = play(state, "travel:polar_peak", "hazard:0")
        self.assertEqual(state["used_hazards"], ["H11"])
        # the way back is the same path, so it gives the second hazard of that path
        state = play(state, "travel:retail_row")
        self.assertEqual(state["pending_hazard"], "H12")
        state = play(state, "hazard:1")
        self.assertEqual(state["current_scene"], "retail_row")
        self.assertEqual(sorted(state["used_hazards"]), ["H11", "H12"])
        # both hazards are used up: walking this path again is free, in both directions
        for destination in ("polar_peak", "retail_row", "polar_peak"):
            state = play(state, f"travel:{destination}")
            self.assertIsNone(state["pending_hazard"])
            self.assertEqual(state["current_scene"], destination)

    def test_walking_one_path_again_and_again_never_uses_other_paths_hazards(self):
        state = play(game.new_state(), "land:retail_row")
        for _ in range(3):
            for destination in ("polar_peak", "retail_row"):
                state = play(state, f"travel:{destination}")
                if state["pending_hazard"]:
                    state = play(state, "hazard:0")
        self.assertEqual(sorted(state["used_hazards"]), ["H11", "H12"])

    def test_hazards_do_not_depend_on_the_direction(self):
        forward = play(game.new_state(), "land:pleasant_park", "travel:tilted_towers")
        backward = play(game.new_state(), "land:tilted_towers", "travel:pleasant_park")
        self.assertEqual(forward["pending_hazard"], backward["pending_hazard"])

    def test_every_hazard_has_two_safe_options_and_one_deadly(self):
        for hazard_id, hazard in story.HAZARDS.items():
            with self.subTest(hazard=hazard_id):
                deadly = [o for o in hazard["options"] if o["deadly"]]
                self.assertEqual(len(hazard["options"]), 3)
                self.assertEqual(len(deadly), 1)

    def test_every_path_has_exactly_two_hazards(self):
        pairs = [(a, b) for i, a in enumerate(story.POIS) for b in story.POIS[i + 1:]]
        self.assertEqual(len(pairs), 6)
        for a, b in pairs:
            orders = sorted(h["order"] for h in story.HAZARDS.values() if set(h["path"]) == {a, b})
            self.assertEqual(orders, [1, 2], (a, b))
        self.assertEqual(len(story.HAZARDS), 12)

    def test_other_actions_are_blocked_during_a_hazard(self):
        state = play(game.new_state(), "land:retail_row", "travel:polar_peak")
        before = copy.deepcopy(state)
        for action in ("collect:impulse_grenades", "travel:pleasant_park", "land:retail_row"):
            with self.subTest(action=action), self.assertRaises(game.ActionError):
                game.apply_action(state, action)
        self.assertEqual(state, before)

    def test_the_view_tells_the_page_which_hazard_is_ahead_on_each_path(self):
        view = game.build_view(play(game.new_state(), "land:retail_row"))
        self.assertEqual(view["ahead"], {"pleasant_park": "H2", "tilted_towers": "H3",
                                         "polar_peak": "H11"})
        state = play(game.new_state(), "land:retail_row", "travel:polar_peak", "hazard:0",
                     "travel:retail_row", "hazard:0")
        view = game.build_view(play(state))
        self.assertIsNone(view["ahead"]["polar_peak"])   # that path is free now


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
        state = play(state, "travel:polar_peak", "hazard:0", "decide:took_high_ground:yes")
        return state

    def search_in_storm(self, items):
        return play(self.good_run(items), "storm", "search")

    def test_a5_good_ending_needs_the_grenades_and_the_chug_jug(self):
        state = self.search_in_storm(["impulse_grenades", "chug_jug"])
        self.assertEqual((state["status"], state["ending"]), ("ended", "A"))

    def test_a5_bad_ending_with_only_chug_jug(self):
        state = self.search_in_storm(["chug_jug"])
        self.assertEqual((state["status"], state["ending"]), ("ended", "B"))

    def test_grenades_without_chug_jug_cannot_enter_the_storm(self):
        state = self.good_run(["impulse_grenades"])
        self.assertNotIn("storm", ids(state))

    def test_bad_ending_when_one_right_decision_is_missing(self):
        state = play(game.new_state(), "land:pleasant_park", "decide:looted_house:no")
        state = play(state, "travel:tilted_towers", "hazard:0", "decide:followed_tracks:yes",
                     "collect:chug_jug")
        state = play(state, "travel:retail_row", "hazard:0", "collect:impulse_grenades")
        state = play(state, "travel:polar_peak", "hazard:0", "decide:took_high_ground:yes",
                     "storm", "search")
        self.assertEqual(state["ending"], "B")

    def test_flavour_decisions_do_not_change_the_ending(self):
        state = play(game.new_state(), "decide:thanked_driver:no", "land:retail_row",
                     "decide:danced:no", "collect:impulse_grenades")
        state = play(state, "travel:pleasant_park", "hazard:0", "decide:looted_house:yes")
        state = play(state, "travel:tilted_towers", "hazard:0", "decide:followed_tracks:yes",
                     "collect:chug_jug")
        state = play(state, "travel:polar_peak", "hazard:0", "decide:took_high_ground:yes",
                     "storm", "search")
        self.assertEqual(state["ending"], "A")

    def test_a5_nothing_changes_after_an_ending(self):
        endings = (self.search_in_storm(["chug_jug"]),
                   play(game.new_state(), "land:retail_row", "travel:polar_peak", "hazard:2"))
        for ended in endings:
            self.assertEqual(ended["status"], "ended")
            self.assertEqual(game.get_actions(ended), [])
            before = copy.deepcopy(ended)
            for action in ("search", "land:retail_row", "travel:retail_row", "storm", "storm_timeout"):
                with self.subTest(action=action), self.assertRaises(game.ActionError):
                    game.apply_action(ended, action)
            self.assertEqual(ended, before)

    def test_all_three_endings_are_reachable(self):
        endings = {
            self.search_in_storm(["impulse_grenades", "chug_jug"])["ending"],
            self.search_in_storm(["chug_jug"])["ending"],
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
            "duplicate hazard": changed(used_hazards=["H11", "H11"]),
            "hazard skipped order": changed(used_hazards=["H12"]),
            "ending while playing": changed(ending="A"),
            "ended without ending": changed(status="ended"),
            "pending hazard unknown": changed(pending_hazard="H99"),
            "pending hazard on the bus": changed(current_scene="bus", pending_hazard="H11"),
            "pending hazard already used": changed(used_hazards=["H11"], pending_hazard="H11"),
            "pending hazard out of order": changed(pending_hazard="H12"),
            "pending hazard of another path": changed(pending_hazard="H1"),
        }
        for name, broken in cases.items():
            with self.subTest(case=name), self.assertRaises(game.StateError):
                game.validate_state(broken)
            with self.subTest(case=name + " (apply_action)"), self.assertRaises(game.StateError):
                game.apply_action(broken, "land:retail_row")


class ViewTests(unittest.TestCase):
    def test_review_lists_decisions_and_hazards_after_an_ending(self):
        state = play(game.new_state(), "land:retail_row", "decide:danced:yes",
                     "travel:polar_peak", "hazard:0", "travel:pleasant_park", "hazard:2")
        view = game.build_view(state)
        self.assertEqual(view["ending"]["code"], "C")
        self.assertEqual(view["review"]["hazards_survived"], 1)
        self.assertEqual(len(view["review"]["decisions"]), 1)
        self.assertEqual(view["actions"], [])

    def test_no_review_while_playing(self):
        self.assertIsNone(game.build_view(game.new_state())["review"])


if __name__ == "__main__":
    unittest.main()
