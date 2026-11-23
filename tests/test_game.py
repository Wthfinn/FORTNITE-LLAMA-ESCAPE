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
from tests import resolve_hazard


def play(state, *action_ids):
    """Apply several actions in a row and return the final state."""
    for action_id in action_ids:
        state, _ = game.apply_action(state, resolve_hazard(state, action_id))
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

    def test_in_the_storm_the_player_can_search_drink_leave_or_run_out_of_health(self):
        state = play(polar_peak_with_chug_jug(), "storm")
        self.assertEqual(ids(state), {"search", "storm_timeout", "use_chug_jug", "leave_storm"})

    def test_the_player_can_leave_the_storm_and_the_gate_stays_open(self):
        state = play(polar_peak_with_chug_jug(), "storm", "use_chug_jug", "leave_storm")
        self.assertEqual(state["current_scene"], "polar_peak")
        self.assertNotIn("chug_jug", state["inventory"])          # drunk: no jug any more
        self.assertIn("storm", ids(state))                          # but the gate stays open
        self.assertEqual(play(state, "storm")["current_scene"], "storm")

    def test_the_gate_is_still_locked_for_a_player_who_never_entered(self):
        self.assertNotIn("storm", ids(at_polar_peak()))

    def test_old_saves_without_the_storm_flag_still_load(self):
        state = polar_peak_with_chug_jug()
        del state["storm_opened"]
        game.validate_state(state)
        self.assertIn("storm", ids(state))


class ChugJugTests(unittest.TestCase):
    def test_drinking_the_chug_jug_uses_it_up(self):
        state = play(polar_peak_with_chug_jug(), "storm")
        state = play(state, "use_chug_jug")
        self.assertNotIn("chug_jug", state["inventory"])
        self.assertEqual(state["current_scene"], "storm")
        self.assertEqual(state["status"], "in_progress")

    def test_the_chug_jug_can_only_be_drunk_once(self):
        state = play(polar_peak_with_chug_jug(), "storm", "use_chug_jug")
        before = copy.deepcopy(state)
        with self.assertRaises(game.ActionError):
            game.apply_action(state, "use_chug_jug")
        self.assertEqual(state, before)

    def test_the_chug_jug_cannot_be_drunk_outside_the_storm(self):
        state = polar_peak_with_chug_jug()
        before = copy.deepcopy(state)
        with self.assertRaises(game.ActionError):
            game.apply_action(state, "use_chug_jug")
        self.assertEqual(state, before)

    def test_drinking_it_does_not_change_the_ending(self):
        state = play(polar_peak_with_chug_jug(), "storm", "use_chug_jug", "storm_timeout")
        self.assertEqual(state["ending"], "B")


class StormTimeoutTests(unittest.TestCase):
    def test_storm_timeout_ends_the_game_with_ending_b(self):
        state = play(polar_peak_with_chug_jug(), "storm", "storm_timeout")
        self.assertEqual((state["status"], state["ending"]), ("ended", "B"))

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

    def test_every_safe_option_has_its_own_survive_text(self):
        for hazard_id, hazard in story.HAZARDS.items():
            for number, option in enumerate(hazard["options"]):
                with self.subTest(hazard=hazard_id, option=number):
                    if option["deadly"]:
                        self.assertNotIn("survive", option)
                    else:
                        self.assertGreater(len(option["survive"]), 20)

    def test_a_safe_option_answers_with_the_text_that_fits_it(self):
        for option in (0, 1):
            state = play(game.new_state(), "land:retail_row", "travel:polar_peak")
            action = resolve_hazard(state, f"hazard:{option}")
            _, message = game.apply_action(state, action)
            real = int(action.split(":")[1])
            self.assertEqual(message, story.HAZARDS["H11"]["options"][real]["survive"])

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

    def test_the_earlier_decisions_do_not_change_the_good_ending(self):
        state = play(game.new_state(), "land:pleasant_park", "decide:looted_house:no")
        state = play(state, "travel:tilted_towers", "hazard:0", "decide:followed_tracks:yes",
                     "collect:chug_jug")
        state = play(state, "travel:retail_row", "hazard:0", "collect:impulse_grenades")
        state = play(state, "travel:polar_peak", "hazard:0", "decide:took_high_ground:yes",
                     "storm", "search")
        self.assertEqual(state["ending"], "A")

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


class RememberedChoiceTests(unittest.TestCase):
    """BRD PT04: remembered decisions that change a later action or the ending, and say so in the text.

    The vending machine (take the Impulse Grenades or not) and every answer at a danger count.
    """

    def to_the_storm(self, grenades):
        state = play(game.new_state(), "land:tilted_towers", "collect:chug_jug",
                     "travel:retail_row", "hazard:0")
        if grenades:
            state = play(state, "collect:impulse_grenades")
        return play(state, "travel:polar_peak", "hazard:0", "storm")

    def test_taking_the_grenades_from_the_vending_machine_decides_the_ending(self):
        with_grenades = play(self.to_the_storm(True), "search")
        without_grenades = play(self.to_the_storm(False), "search")
        self.assertEqual(with_grenades["ending"], "A")
        self.assertEqual(without_grenades["ending"], "B")

    def test_the_ending_text_says_how_the_vending_machine_choice_led_to_it(self):
        good = game.build_view(play(self.to_the_storm(True), "search"))
        bad = game.build_view(play(self.to_the_storm(False), "search"))
        self.assertIn("because you took the Impulse Grenades", good["ending"]["because"])
        self.assertIn("never took the Impulse Grenades", bad["ending"]["because"])
        self.assertIn("You took the Impulse Grenades from the vending machine.", good["review"]["items"])
        self.assertIn("You never took the Impulse Grenades from the vending machine.", bad["review"]["items"])
        self.assertIn("You took the Chug Jug from the supply drop.", good["review"]["items"])

    def test_running_out_of_health_with_the_grenades_has_its_own_text(self):
        view = game.build_view(play(self.to_the_storm(True), "storm_timeout"))
        self.assertEqual(view["ending"]["code"], "B")
        self.assertIn("did take the Impulse Grenades", view["ending"]["because"])

    def test_the_chug_jug_still_counts_as_taken_after_it_was_drunk(self):
        state = play(self.to_the_storm(True), "use_chug_jug", "search")
        self.assertNotIn("chug_jug", state["inventory"])
        self.assertIn("You took the Chug Jug from the supply drop.", game.build_view(state)["review"]["items"])

    def test_every_answer_at_a_danger_is_remembered(self):
        state = play(game.new_state(), "land:retail_row", "travel:polar_peak")
        hazard_id = state["pending_hazard"]
        state, _ = game.apply_action(state, resolve_hazard(state, "hazard:1"))
        chosen = state["hazard_choices"][hazard_id]
        self.assertFalse(story.HAZARDS[hazard_id]["options"][chosen]["deadly"])
        self.assertIn(hazard_id, state["used_hazards"])

    def test_a_deadly_answer_is_remembered_too_and_listed_on_the_ending(self):
        state = play(game.new_state(), "land:retail_row", "travel:polar_peak")
        hazard_id = state["pending_hazard"]
        state = play(state, "hazard:2")
        self.assertEqual(state["ending"], "C")
        chosen = state["hazard_choices"][hazard_id]
        self.assertTrue(story.HAZARDS[hazard_id]["options"][chosen]["deadly"])
        view = game.build_view(state)
        self.assertEqual(len(view["review"]["dangers"]), 1)
        self.assertIn("eliminated", view["review"]["dangers"][0])
        self.assertIn(story.HAZARDS[hazard_id]["options"][chosen]["text"], view["review"]["dangers"][0])
        self.assertEqual(view["ending"]["because"], story.ENDING_BECAUSE["C"])

    def test_surviving_a_danger_is_remembered_and_changes_what_the_path_does_next(self):
        state = play(game.new_state(), "land:retail_row", "travel:polar_peak")
        first = state["pending_hazard"]
        state = play(state, "hazard:0", "travel:retail_row")          # the same path again
        self.assertIsNotNone(state["pending_hazard"])
        self.assertNotEqual(state["pending_hazard"], first)           # its second danger, not the first again

    def test_the_danger_lines_follow_the_order_the_dangers_were_met(self):
        state = play(game.new_state(), "land:retail_row", "travel:polar_peak", "hazard:0",
                     "travel:retail_row", "hazard:0", "travel:tilted_towers", "hazard:2")
        lines = game.build_view(state)["review"]["dangers"]
        situations = [story.HAZARDS[h]["situation"] for h in state["hazard_choices"]]
        self.assertEqual(len(lines), 3)
        for line, situation in zip(lines, situations):
            self.assertTrue(line.startswith(situation))

    def test_a_game_saved_before_the_answers_were_remembered_still_loads(self):
        state = play(game.new_state(), "land:retail_row", "travel:polar_peak", "hazard:0")
        del state["hazard_choices"]
        game.validate_state(state)
        ended = copy.deepcopy(state)
        ended.update(status="ended", ending="B")
        game.validate_state(ended)
        self.assertTrue(game.build_view(ended)["review"]["dangers"][0].endswith("(survived)"))

    def test_remembered_answers_that_do_not_fit_the_game_are_rejected(self):
        survived = play(game.new_state(), "land:retail_row", "travel:polar_peak", "hazard:0")
        hazard_id = survived["used_hazards"][0]
        options = story.HAZARDS[hazard_id]["options"]
        deadly = [i for i, o in enumerate(options) if o["deadly"]][0]
        cases = {
            "not a dict": [1, 2],
            "unknown hazard": {"H99": 0},
            "option number out of range": {hazard_id: 7},
            "option number is text": {hazard_id: "0"},
            "option number is a bool": {hazard_id: False},
            "survived hazard with a deadly answer": {hazard_id: deadly},
            "answer for a hazard that was never survived": {**survived["hazard_choices"], "H1": 0},
            "list key": {"H1": [0]},
        }
        for name, bad in cases.items():
            broken = copy.deepcopy(survived)
            broken["hazard_choices"] = bad
            with self.subTest(case=name), self.assertRaises(game.StateError):
                game.validate_state(broken)

    def test_items_can_be_inspected(self):
        for item_id, item in story.ITEMS.items():
            with self.subTest(item=item_id):
                self.assertTrue(item["description"].strip())
        view = game.build_view(play(game.new_state(), "land:tilted_towers", "collect:chug_jug"))
        self.assertIn("healing", view["inventory"][0]["description"].lower())
        self.assertEqual(view["items_total"], len(story.ITEMS))

    def test_the_page_can_show_how_many_items_were_collected(self):
        state = game.new_state()
        self.assertEqual((game.build_view(state)["items_collected"], game.build_view(state)["items_total"]), (0, 2))
        state = play(state, "land:tilted_towers", "collect:chug_jug")
        self.assertEqual(game.build_view(state)["items_collected"], 1)
        state = play(state, "travel:retail_row", "hazard:0", "collect:impulse_grenades")
        self.assertEqual(game.build_view(state)["items_collected"], 2)
        state = play(state, "travel:polar_peak", "hazard:0", "storm", "use_chug_jug")
        self.assertEqual(game.build_view(state)["items_collected"], 2)        # drinking the Chug Jug does not lower it


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

    def test_odd_json_values_in_any_field_never_crash_the_checks(self):
        """The state comes from the browser, so every field can hold any JSON value.

        Lists and objects used to crash the server (a list cannot be looked up in a dictionary).
        Now the check must either accept the state or raise StateError, whatever is in a field.
        """
        odd_values = [None, True, False, 0, 1, 1.5, "", "x", [], [[]], [None], {}, {"a": 1}, ["A"], [{}]]
        for state in (play(game.new_state(), "land:retail_row"),
                      play(game.new_state(), "land:retail_row", "travel:polar_peak")):   # one is mid-hazard
            for field in list(state):
                for value in odd_values:
                    broken = copy.deepcopy(state)
                    broken[field] = value
                    with self.subTest(field=field, value=value):
                        try:
                            game.validate_state(broken)
                            game.apply_action(broken, "land:retail_row")
                        except (game.StateError, game.ActionError):
                            pass

    def test_a_decision_must_be_yes_no_or_unanswered(self):
        for value in (1, 0, "yes", [], {}):
            state = game.new_state()
            state["decisions"]["danced"] = value
            with self.subTest(value=value), self.assertRaises(game.StateError):
                game.validate_state(state)


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


class HazardOrderTests(unittest.TestCase):
    def test_the_deadly_option_is_not_always_in_the_same_place(self):
        places = {
            [o["deadly"] for o in hazard["options"]].index(True)
            for hazard in story.HAZARDS.values()
        }
        self.assertEqual(places, {0, 1, 2})
