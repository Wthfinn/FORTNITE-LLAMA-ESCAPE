"""Tests for the web server (app.py)."""

import copy
import unittest

import app as app_module
import game


class WebTests(unittest.TestCase):
    def setUp(self):
        self.client = app_module.app.test_client()

    def action(self, state, action_id):
        return self.client.post("/api/action", json={"state": state, "action": action_id})

    def test_home_page_loads(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Fortnite Llama Escape", response.data)

    def test_new_game_returns_a_fresh_state_and_view(self):
        data = self.client.post("/api/new").get_json()
        self.assertEqual(data["state"], game.new_state())
        self.assertEqual(data["view"]["scene_name"], "Battle Bus")

    def test_accepted_action_returns_new_state(self):
        state = game.new_state()
        response = self.action(state, "land:retail_row")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["state"]["current_scene"], "retail_row")

    def test_a1_rejected_action_returns_409_and_the_unchanged_state(self):
        state, _ = game.apply_action(game.new_state(), "land:polar_peak")
        before = copy.deepcopy(state)
        response = self.action(state, "storm")
        self.assertEqual(response.status_code, 409)
        data = response.get_json()
        self.assertIn("storm", data["error"])
        self.assertEqual(data["state"], before)

    def test_resume_returns_the_view_of_a_saved_state(self):
        state, _ = game.apply_action(game.new_state(), "land:retail_row")
        data = self.client.post("/api/view", json={"state": state}).get_json()
        self.assertEqual(data["view"]["scene_name"], "Retail Row")

    def test_invalid_input_is_rejected_with_400(self):
        bad_requests = [
            ("/api/action", None),
            ("/api/action", []),
            ("/api/action", {}),
            ("/api/action", {"state": game.new_state()}),
            ("/api/action", {"state": {"status": "won"}, "action": "land:retail_row"}),
            ("/api/action", {"state": "x", "action": "land:retail_row"}),
            ("/api/view", {}),
            ("/api/view", {"state": {"inventory": ["gold"]}}),
        ]
        for path, body in bad_requests:
            with self.subTest(path=path, body=body):
                response = self.client.post(path, json=body)
                self.assertIn(response.status_code, (400, 409))

    def test_odd_values_in_the_state_give_400_never_a_server_error(self):
        good = game.new_state()
        for field, value in [("current_scene", []), ("inventory", [[]]), ("used_hazards", [{}]),
                             ("pending_hazard", []), ("ending", []), ("status", []),
                             ("current_scene", {"a": 1}), ("decisions", {"danced": []})]:
            state = copy.deepcopy(good)
            state[field] = value
            for path in ("/api/action", "/api/view"):
                with self.subTest(field=field, value=value, path=path):
                    body = {"state": state, "action": "land:retail_row"}
                    self.assertEqual(self.client.post(path, json=body).status_code, 400)

    def test_state_with_cheated_item_is_rejected(self):
        state = game.new_state()
        state["inventory"] = ["golden_pickaxe"]
        self.assertEqual(self.action(state, "land:retail_row").status_code, 400)

    def test_not_json_is_rejected(self):
        response = self.client.post("/api/action", data="not json",
                                    content_type="text/plain")
        self.assertEqual(response.status_code, 400)

    def test_oversized_request_is_rejected(self):
        response = self.client.post("/api/action", json={"state": "x" * 20_000, "action": "a"})
        self.assertEqual(response.status_code, 413)

    def headers_of(self, path):
        """The response headers of a GET (the response is closed, so no file stays open)."""
        with self.client.get(path) as response:
            return dict(response.headers)

    def test_pictures_and_sounds_can_be_cached_and_the_page_itself_cannot(self):
        self.assertIn("max-age=3600", self.headers_of("/static/img/favicon.png")["Cache-Control"])
        self.assertIn("max-age=3600", self.headers_of("/static/audio/open.mp3")["Cache-Control"])
        self.assertNotIn("max-age=3600", self.headers_of("/").get("Cache-Control", ""))
        api = self.client.post("/api/new")
        self.assertNotIn("max-age", api.headers.get("Cache-Control", ""))

    def test_scripts_with_a_version_number_can_be_cached_for_long(self):
        self.assertIn("immutable", self.headers_of("/static/game.js?v=123")["Cache-Control"])
        self.assertNotIn("immutable", self.headers_of("/static/game.js")["Cache-Control"])

    def test_the_music_is_small_enough_to_load_fast(self):
        music = app_module._STATIC / "audio" / "music.mp3"
        self.assertLess(music.stat().st_size, 3_000_000)

    def test_security_headers_are_set(self):
        response = self.client.get("/")
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
        self.assertIn("default-src 'self'", response.headers["Content-Security-Policy"])



class PageTests(unittest.TestCase):
    def test_page_loads_world_before_game_script_with_cache_busting(self):
        html = app_module.app.test_client().get("/").get_data(as_text=True)
        self.assertLess(html.index("world.js"), html.index("cutscenes.js"))
        self.assertLess(html.index("cutscenes.js"), html.index("game.js"))
        self.assertIn("?v=", html)
        for element_id in ('id="screen"', 'id="modal"', 'id="dialog"', 'id="hud"',
                           'id="title-canvas"', 'id="new-btn"', 'id="resume-btn"'):
            self.assertIn(element_id, html)


if __name__ == "__main__":
    unittest.main()
