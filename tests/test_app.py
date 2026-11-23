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
