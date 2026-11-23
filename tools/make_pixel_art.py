"""Turns the asset-pack pictures into chunky pixel-art versions (Pokemon style).

Run from the project folder (needs Pillow, which the game itself does NOT need):

    pip install pillow
    python tools/make_pixel_art.py

Reads the pictures in static/img/ and writes small pixel versions into static/img/px/.
The page shows them enlarged without smoothing, which gives the blocky look.
Change PHOTO_SIZE or the sprite heights below to make it more or less pixelated.
"""

from pathlib import Path

from PIL import Image, ImageDraw

IMG = Path(__file__).resolve().parent.parent / "static" / "img"
OUT = IMG / "px"
PHOTO_SIZE = (224, 126)   # 16:9, shown about 3x larger
PHOTO_COLORS = 32

# name -> height in pixels (sprites keep their transparent background)
SPRITES = {
    "bus.png": ("bus.png", 70, 48),
    "llama.png": ("llama.png", 40, 20),
    "item_chug_jug.png": ("item_chug_jug.png", 20, 16),
    "item_impulse_grenades.png": ("item_impulse_grenades.png", 20, 16),
    "prop_vending_machine.png": ("prop_vending_machine.png", 28, 16),
    "prop_supply_drop.png": ("prop_supply_drop.png", 36, 16),
}


def pixel_photo(name, out_name=None):
    im = Image.open(IMG / name).convert("RGB")
    scale = max(PHOTO_SIZE[0] / im.width, PHOTO_SIZE[1] / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    left, top = (im.width - PHOTO_SIZE[0]) // 2, (im.height - PHOTO_SIZE[1]) // 2
    im = im.crop((left, top, left + PHOTO_SIZE[0], top + PHOTO_SIZE[1]))
    im = im.quantize(colors=PHOTO_COLORS, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    im.save(OUT / (out_name or Path(name).with_suffix(".png").name), optimize=True)


def pixel_sprite(src, height, colors, out_name):
    im = Image.open(IMG / src).convert("RGBA")
    width = max(1, round(im.width * height / im.height))
    im = im.resize((width, height), Image.BOX)
    alpha = im.getchannel("A").point(lambda v: 255 if v > 110 else 0)
    flat = Image.new("RGB", im.size, (255, 0, 255))
    flat.paste(im.convert("RGB"), mask=alpha)
    flat = flat.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    out = flat.convert("RGBA")
    out.putalpha(alpha)
    out.save(OUT / out_name, optimize=True)


def pixel_avatar():
    """Round head-and-shoulders picture of the player for the top bar."""
    im = Image.open(IMG / "player_token.png").convert("RGBA").resize((32, 32), Image.BOX)
    alpha = im.getchannel("A").point(lambda v: 255 if v > 110 else 0)
    flat = im.convert("RGB").quantize(colors=12, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGBA")
    flat.putalpha(alpha)
    flat.save(OUT / "avatar.png", optimize=True)


def pixel_banner():
    im = Image.open(IMG / "victory_banner.png").convert("RGBA")
    im = im.resize((130, round(im.height * 130 / im.width)), Image.BOX)
    alpha = im.getchannel("A").point(lambda v: 255 if v > 110 else 0)
    flat = im.convert("RGB").quantize(colors=12, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGBA")
    flat.putalpha(alpha)
    flat.save(OUT / "victory_banner.png", optimize=True)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for i in range(1, 9):
        pixel_photo(f"hazard_H{i}.jpg")
    for code in "abc":
        pixel_photo(f"ending_{code}.jpg")
    for name, (src, height, colors) in SPRITES.items():
        pixel_sprite(src, height, colors, name)
    pixel_avatar()
    pixel_banner()
    print("made", len(list(OUT.iterdir())), "pixel pictures in", OUT)
