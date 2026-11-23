"""Story content for Fortnite Llama Escape.

Only data lives here: no game logic. Texts are placeholders written from
concept.md. Scene texts, hazard texts and ending texts are meant to be
rewritten by the team; just keep the IDs and the structure.
"""

START_SCENE = "bus"
POIS = ["pleasant_park", "retail_row", "tilted_towers", "polar_peak"]

SCENES = {
    "bus": {
        "name": "Battle Bus",
        "text": (
            "The Battle Bus hums over the island. You reach for your Llama's "
            "pet leash... and find it empty. Your Llama has run away! "
            "Somewhere down there, it is wandering around while the storm "
            "slowly closes in."
        ),
    },
    "pleasant_park": {
        "name": "Pleasant Park",
        "text": (
            "Lush lawns, friendly neighbours and a football pitch. Everything is lovely, which is exactly what a squad hiding in a gazebo wants you to think."
        ),
    },
    "retail_row": {
        "name": "Retail Row",
        "text": (
            "A shopping paradise where nobody shops. The cars are parked however panic suggested, but the supermarket is open as always."
        ),
    },
    "tilted_towers": {
        "name": "Tilted Towers",
        "text": (
            "Tall buildings, a very proud clock tower and the charm of a place everyone drops into and regrets. Look up: something is floating down."
        ),
    },
    "polar_peak": {
        "name": "Polar Peak",
        "text": (
            "Snow, ice and a mountain that dares you to climb it. Somewhere beyond lies the purple wall of the storm."
        ),
    },
    "storm": {
        "name": "The Storm",
        "text": (
            "Purple fog swirls around you and the ground shakes with every "
            "tick of damage. Somewhere in here is your Llama."
        ),
    },
}

ITEMS = {
    "impulse_grenades": {
        "name": "Impulse Grenades",
        "scene": "retail_row",
        "icon": "item_impulse_grenades.png",
        "prop": "prop_vending_machine.png",
        "action_label": "Use the vending machine",
        "found_text": "The vending machine rattles and drops a pack of Impulse Grenades. You grab them.",
        "empty_text": "The vending machine is empty now.",
    },
    "chug_jug": {
        "name": "Chug Jug",
        "scene": "tilted_towers",
        "icon": "item_chug_jug.png",
        "prop": "prop_supply_drop.png",
        "action_label": "Open the supply drop",
        "found_text": "You pop open the supply drop and find a shiny Chug Jug. You grab it.",
        "empty_text": "The supply drop is empty now.",
    },
}

# affects_ending decisions must all be answered "yes" for the good ending.
DECISIONS = {
    "thanked_driver": {
        "scene": "bus",
        "question": "Before you jump: do you thank the bus driver?",
        "yes": "Thank the bus driver",
        "no": "Jump without thanking",
        "yes_text": "You thank the driver. The balloon above the bus wobbles happily.",
        "no_text": "You skip the thanks. The driver shrugs.",
        "affects_ending": False,
    },
    "looted_house": {
        "scene": "pleasant_park",
        "question": "The house door is open. What do you do?",
        "yes": "Loot the house",
        "no": "Skip the house",
        "yes_text": "Inside you find hay on the floor and llama hoofprints leading out the back.",
        "no_text": "You walk past the house. Whatever was inside stays a mystery.",
        "affects_ending": True,
    },
    "followed_tracks": {
        "scene": "tilted_towers",
        "question": "You notice fresh tracks next to a distant gunfight. What do you do?",
        "yes": "Follow the llama tracks",
        "no": "Chase the enemy squad",
        "yes_text": "The tracks are small, round and unmistakably llama. They head toward the mountains.",
        "no_text": "You run toward the shooting. By the time you look back, the tracks are gone.",
        "affects_ending": True,
    },
    "danced": {
        "scene": "retail_row",
        "question": "The street is empty. What do you do?",
        "yes": "Do the default dance",
        "no": "Keep moving",
        "yes_text": "You bust out the default dance. Disco fever takes over the street!",
        "no_text": "You keep moving. There is no time for dancing.",
        "affects_ending": False,
    },
    "took_high_ground": {
        "scene": "polar_peak",
        "question": "The summit is right above you. What do you do?",
        "yes": "Climb for the high ground",
        "no": "Stay at the base",
        "yes_text": "From the top you spot your Llama, trotting straight into the storm!",
        "no_text": "You stay low. The view from here shows nothing but snow.",
        "affects_ending": True,
    },
}

# Every path between two places has exactly two hazards. They happen in order, the
# first two times the player walks that path (in either direction). Once both are
# survived the path is free. "path" lists the two places the path joins.
# The deadly option is marked deadly=True. Option order on screen is fixed.
HAZARDS = {
    "H1": {
        "path": ("pleasant_park", "tilted_towers"), "order": 1,
        "situation": "A spike trap is hidden on the path!",
        "options": [
            {"text": "Jump over it", "deadly": False},
            {"text": "Sneak around the edge", "deadly": False},
            {"text": "Sprint straight through", "deadly": True},
        ],
    },
    "H5": {
        "path": ("pleasant_park", "tilted_towers"), "order": 2,
        "situation": "An enemy team smokes you from the clock tower.",
        "options": [
            {"text": "Retreat behind a building", "deadly": False},
            {"text": "Build a ramp for cover", "deadly": False},
            {"text": "Push them alone", "deadly": True},
        ],
    },
    "H2": {
        "path": ("pleasant_park", "retail_row"), "order": 1,
        "situation": "A squad is camping right ahead.",
        "options": [
            {"text": "Sneak along the fence", "deadly": False},
            {"text": "Wait until they leave", "deadly": False},
            {"text": "Walk past them in the open", "deadly": True},
        ],
    },
    "H4": {
        "path": ("pleasant_park", "retail_row"), "order": 2,
        "situation": "Something glints on a rooftop. A sniper!",
        "options": [
            {"text": "Zig-zag to cover", "deadly": False},
            {"text": "Crouch behind the dumpsters", "deadly": False},
            {"text": "Stand still to check your map", "deadly": True},
        ],
    },
    "H7": {
        "path": ("pleasant_park", "polar_peak"), "order": 1,
        "situation": "The icy path runs along a cliff edge.",
        "options": [
            {"text": "Take it slow", "deadly": False},
            {"text": "Take the longer path inland", "deadly": False},
            {"text": "Sprint along the edge", "deadly": True},
        ],
    },
    "H8": {
        "path": ("pleasant_park", "polar_peak"), "order": 2,
        "situation": "A pump shotgun player waits behind the wall.",
        "options": [
            {"text": "Go around the other side", "deadly": False},
            {"text": "Throw something to distract them", "deadly": False},
            {"text": "Peek around the corner", "deadly": True},
        ],
    },
    "H3": {
        "path": ("tilted_towers", "retail_row"), "order": 1,
        "situation": "A rocket is flying straight at you!",
        "options": [
            {"text": "Build a wall", "deadly": False},
            {"text": "Dive behind a car", "deadly": False},
            {"text": "Keep looking at the shop sign", "deadly": True},
        ],
    },
    "H6": {
        "path": ("tilted_towers", "retail_row"), "order": 2,
        "situation": "A doorway looks suspiciously clean.",
        "options": [
            {"text": "Enter through the window", "deadly": False},
            {"text": "Shoot the doorway first", "deadly": False},
            {"text": "Walk right in", "deadly": True},
        ],
    },
    "H9": {
        "path": ("tilted_towers", "polar_peak"), "order": 1,
        "situation": "The frozen slope is covered in thin, cracking ice.",
        "options": [
            {"text": "Test each step with your pickaxe", "deadly": False},
            {"text": "Build a bridge over it", "deadly": False},
            {"text": "Slide across on your stomach", "deadly": True},
        ],
    },
    "H10": {
        "path": ("tilted_towers", "polar_peak"), "order": 2,
        "situation": "A rumble echoes down the mountain. Avalanche!",
        "options": [
            {"text": "Build a ramp and climb above it", "deadly": False},
            {"text": "Duck into a snow cave", "deadly": False},
            {"text": "Outrun it in a straight line", "deadly": True},
        ],
    },
    "H11": {
        "path": ("retail_row", "polar_peak"), "order": 1,
        "situation": "Another squad bursts out of the bushes!",
        "options": [
            {"text": "Dive into the nearest bush", "deadly": False},
            {"text": "Throw a smoke and slip away", "deadly": False},
            {"text": "Challenge them to a pickaxe duel", "deadly": True},
        ],
    },
    "H12": {
        "path": ("retail_row", "polar_peak"), "order": 2,
        "situation": "A rocket whistles past from a rooftop.",
        "options": [
            {"text": "Hide behind a parked car", "deadly": False},
            {"text": "Build a quick wall", "deadly": False},
            {"text": "Wave at the rocketeer", "deadly": True},
        ],
    },
}

ENDINGS = {
    "A": {
        "title": "Llama Found!",
        "text": (
            "You find your Llama in the middle of the storm. You throw the "
            "Impulse Grenades, launch both of you out of the purple fog and "
            "land safely. Victory Royale!"
        ),
    },
    "B": {
        "title": "Lost in the Storm",
        "text": (
            "You find your Llama, but without a way out you cannot escape the "
            "storm in time. Both of you are eliminated."
        ),
    },
    "C": {
        "title": "Eliminated",
        "text": "You were eliminated before you could find your Llama.",
    },
}

STORM_UNLOCK_ITEMS = ["chug_jug"]
STORM_LOCKED_TEXT = "The storm does damage. If only you had a healing item\u2026"
GOOD_ENDING_ITEM = "impulse_grenades"

# Where each place sits on the island map (percent of the map picture) and the
# order of the map. Scene pictures are static/img/scene_<id>.jpg, hazard
# pictures static/img/hazard_<id>.jpg, ending pictures static/img/ending_<letter>.jpg.
MAP_NODES = {
    "bus": {"x": 11, "y": 22},
    "polar_peak": {"x": 58, "y": 22},
    "pleasant_park": {"x": 22, "y": 58},
    "tilted_towers": {"x": 50, "y": 52},
    "retail_row": {"x": 76, "y": 76},
    "storm": {"x": 89, "y": 15},
}
