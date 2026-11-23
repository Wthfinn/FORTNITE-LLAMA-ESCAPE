"""Tests that every picture and sound the game uses really exists, and that the
map data and views fit together."""

import unittest
from pathlib import Path

import game
import story

STATIC = Path(__file__).resolve().parent.parent / "static"
SOUNDS = ["music.mp3", "hazard_alert.mp3", "shotgun.mp3", "elimination.mp3", "victory.mp3"]


def img(name):
    return STATIC / "img" / name


class AssetFileTests(unittest.TestCase):
    def test_every_scene_has_a_picture(self):
        for scene_id in story.SCENES:
            self.assertTrue(img(f"scene_{scene_id}.jpg").is_file(), scene_id)

    def test_every_hazard_has_a_picture(self):
        for hazard_id in story.HAZARDS:
            self.assertTrue(img(f"hazard_{hazard_id}.jpg").is_file(), hazard_id)

    def test_every_ending_has_a_picture(self):
        for code in story.ENDINGS:
            self.assertTrue(img(f"ending_{code.lower()}.jpg").is_file(), code)

    def test_every_item_has_an_icon_and_a_prop(self):
        for item_id, item in story.ITEMS.items():
            self.assertTrue(img(item["icon"]).is_file(), item_id)
            self.assertTrue(img(item["prop"]).is_file(), item_id)

    def test_page_pictures_and_sounds_exist(self):
        for name in ("map.jpg", "player_token.png", "player_portrait.jpg", "favicon.png"):
            self.assertTrue(img(name).is_file(), name)
        for name in SOUNDS:
            self.assertTrue((STATIC / "audio" / name).is_file(), name)

    def test_sounds_named_in_the_page_script_exist(self):
        script = (STATIC / "game.js").read_text()
        for name in SOUNDS:
            self.assertIn(name, script)


class PixelArtFileTests(unittest.TestCase):
    def test_pixel_pictures_used_by_the_page_exist(self):
        px = STATIC / "img" / "px"
        names = ["title.png", "avatar.png", "bus.png", "llama.png", "victory_banner.png",
                 "item_chug_jug.png", "item_impulse_grenades.png",
                 "prop_vending_machine.png", "prop_supply_drop.png"]
        names += [f"hazard_{h}.png" for h in story.HAZARDS]
        names += [f"ending_{c.lower()}.png" for c in story.ENDINGS]
        for name in names:
            self.assertTrue((px / name).is_file(), name)


class MapViewTests(unittest.TestCase):
    def play(self, *actions):
        state = game.new_state()
        for action in actions:
            state, _ = game.apply_action(state, action)
        return state

    def test_every_map_node_is_a_scene_with_a_position_inside_the_map(self):
        for node_id, pos in story.MAP_NODES.items():
            self.assertIn(node_id, story.SCENES)
            self.assertTrue(0 <= pos["x"] <= 100 and 0 <= pos["y"] <= 100, node_id)

    def test_at_the_start_the_four_places_can_be_clicked_and_the_bus_is_shown(self):
        view = game.build_view(game.new_state())
        clickable = {n["id"] for n in view["map"]["nodes"] if n["action"]}
        self.assertEqual(clickable, set(story.POIS))
        self.assertEqual(view["map"]["token_at"], "bus")
        self.assertIn("bus", {n["id"] for n in view["map"]["nodes"]})

    def test_moves_are_not_listed_as_buttons(self):
        view = game.build_view(self.play("land:retail_row"))
        for choice in view["choices"]:
            self.assertFalse(choice["id"].split(":")[0] in ("land", "travel", "storm"))

    def test_storm_node_is_hidden_until_the_player_has_gear(self):
        no_gear = game.build_view(self.play("land:polar_peak"))
        self.assertNotIn("storm", {n["id"] for n in no_gear["map"]["nodes"]})
        gear = self.play("land:retail_row", "collect:impulse_grenades",
                         "travel:polar_peak", "hazard:0")
        nodes = {n["id"]: n for n in game.build_view(gear)["map"]["nodes"]}
        self.assertEqual(nodes["storm"]["action"], "storm")

    def test_token_moves_to_the_destination_while_a_hazard_is_shown(self):
        state = self.play("land:retail_row", "travel:polar_peak")
        view = game.build_view(state)
        self.assertEqual(view["map"]["token_at"], "polar_peak")
        self.assertEqual(view["hazard"]["image"], "hazard_H7.jpg")
        self.assertEqual(len(view["choices"]), 3)
        self.assertFalse(any(n["action"] for n in view["map"]["nodes"]))

    def test_decision_choices_carry_their_question(self):
        view = game.build_view(self.play("land:pleasant_park"))
        decide = [c for c in view["choices"] if c["id"].startswith("decide:")]
        self.assertEqual(len(decide), 2)
        self.assertTrue(all(c["question"] for c in decide))

    def test_props_disappear_once_the_item_is_collected(self):
        before = game.build_view(self.play("land:retail_row"))
        after = game.build_view(self.play("land:retail_row", "collect:impulse_grenades"))
        self.assertEqual(len(before["props"]), 1)
        self.assertEqual(after["props"], [])
        self.assertEqual(after["inventory"][0]["name"], "Impulse Grenades")


if __name__ == "__main__":
    unittest.main()
