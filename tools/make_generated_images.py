"""Makes the pictures that are not in the asset pack, by combining the pack's pictures.

Run from the project folder (needs Pillow, which the game itself does NOT need):

    pip install pillow
    python tools/make_generated_images.py

Reads from static/img/ and writes into static/img/. Pictures are composed in the
Fortnite look (bright colours, purple storm) from the supplied assets. Everything
here is plain drawing code, so colours and positions are easy to tweak.
"""

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

IMG = Path(__file__).resolve().parent.parent / "static" / "img"
W, H = 1280, 720


def load(name, mode="RGBA"):
    return Image.open(IMG / name).convert(mode)


def cover(im, size):
    """Resize and crop an image so it fills `size` completely."""
    scale = max(size[0] / im.width, size[1] / im.height)
    im = im.resize((round(im.width * scale) + 1, round(im.height * scale) + 1), Image.LANCZOS)
    left, top = (im.width - size[0]) // 2, (im.height - size[1]) // 2
    return im.crop((left, top, left + size[0], top + size[1]))


def paste_center(base, sprite, cx, cy, height):
    sprite = sprite.resize((round(sprite.width * height / sprite.height), height), Image.LANCZOS)
    base.alpha_composite(sprite, (cx - sprite.width // 2, cy - sprite.height // 2))


def vertical_gradient(size, top, bottom):
    grad = Image.new("RGB", (1, 256))
    for y in range(256):
        t = y / 255
        grad.putpixel((0, y), tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return grad.resize(size, Image.BILINEAR)


def storm_tint(im, strength=0.55):
    """Turn a picture into a stormy purple version with a dark vignette."""
    im = im.convert("RGB")
    gray = ImageEnhance.Contrast(im.convert("L")).enhance(1.1)
    purple = Image.merge("RGB", (
        gray.point(lambda v: min(255, int(v * 0.85 + 70))),
        gray.point(lambda v: int(v * 0.35 + 10)),
        gray.point(lambda v: min(255, int(v * 0.95 + 90))),
    ))
    im = Image.blend(im, purple, strength + 0.25)
    vignette = Image.new("L", im.size, 0)
    ImageDraw.Draw(vignette).ellipse(
        (-im.width * 0.25, -im.height * 0.25, im.width * 1.25, im.height * 1.25), fill=255)
    vignette = vignette.filter(ImageFilter.GaussianBlur(im.width // 6))
    dark = Image.new("RGB", im.size, (30, 5, 60))
    return Image.composite(im, dark, vignette)


def fog(size, seed, alpha=110):
    """Soft purple fog layer."""
    rng = random.Random(seed)
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for _ in range(26):
        x, y = rng.randint(-100, size[0]), rng.randint(0, size[1])
        r = rng.randint(120, 300)
        draw.ellipse((x - r, y - r // 2, x + r, y + r // 2),
                     fill=(150 + rng.randint(0, 50), 80, 220, rng.randint(40, alpha)))
    return layer.filter(ImageFilter.GaussianBlur(40))


# ---------- scenes ----------

def make_bus_scene():
    sky = vertical_gradient((W, H), (40, 120, 230), (170, 220, 255)).convert("RGBA")
    rng = random.Random(7)
    clouds = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(clouds)
    for _ in range(18):
        x, y = rng.randint(-50, W), rng.randint(350, H + 40)
        for dx in range(5):
            r = rng.randint(50, 110)
            draw.ellipse((x + dx * 60 - r, y - r // 2, x + dx * 60 + r, y + r // 2),
                         fill=(255, 255, 255, 235))
    sky.alpha_composite(clouds.filter(ImageFilter.GaussianBlur(6)))
    paste_center(sky, load("bus.png"), W // 2, H // 2 - 20, 560)
    sky.convert("RGB").save(IMG / "scene_bus.jpg", quality=86, optimize=True)


def make_storm_scene():
    base = cover(load("scene_polar_peak.jpg", "RGB"), (W, H))
    img = storm_tint(base, 0.5).convert("RGBA")
    img.alpha_composite(fog((W, H), 3))
    paste_center(img, load("llama.png"), int(W * 0.68), int(H * 0.62), 330)
    img.convert("RGB").save(IMG / "scene_storm.jpg", quality=86, optimize=True)


def make_trap_hazard():
    """The real trap from the asset pack, lying on the Pleasant Park garden path."""
    base = cover(load("scene_pleasant_park.jpg", "RGB"), (W, H))
    base = ImageEnhance.Brightness(base).enhance(0.9).convert("RGBA")
    trap = load("prop_trap.png")
    width = int(W * 0.62)
    trap = trap.resize((width, round(trap.height * width / trap.width)), Image.LANCZOS)
    shadow = Image.new("RGBA", trap.size, (0, 0, 0, 0))
    shadow.putalpha(trap.getchannel("A").point(lambda v: v // 3))
    x, y = (W - trap.width) // 2, int(H * 0.50)
    base.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(10)), (x + 14, y + 22))
    base.alpha_composite(trap, (x, y))
    base.convert("RGB").save(IMG / "hazard_H1.jpg", quality=88, optimize=True)


def make_avalanche_hazard():
    """Hazard H10: a wall of snow thundering down Polar Peak."""
    base = cover(load("scene_polar_peak.jpg", "RGB"), (W, H))
    base = ImageEnhance.Brightness(base).enhance(0.92).convert("RGBA")
    snow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(snow)
    rng = random.Random(21)
    for _ in range(26):
        x, y = rng.randint(-100, W), rng.randint(120, H - 60)
        r = rng.randint(70, 190)
        d.ellipse((x - r, y - r // 2, x + r, y + r // 2), fill=(255, 255, 255, rng.randint(150, 235)))
    d.polygon([(0, H), (0, 330), (W * 0.35, 250), (W * 0.7, 330), (W, 280), (W, H)], fill=(250, 253, 255, 235))
    base.alpha_composite(snow.filter(ImageFilter.GaussianBlur(22)))
    for _ in range(240):  # flying snow
        x, y = rng.randint(0, W), rng.randint(0, H)
        d2 = ImageDraw.Draw(base)
        d2.ellipse((x, y, x + rng.randint(3, 8), y + rng.randint(3, 8)), fill=(255, 255, 255, 220))
    base.convert("RGB").save(IMG / "hazard_H10.jpg", quality=88, optimize=True)


# ---------- endings ----------

def make_ending_a():
    base = cover(load("scene_retail_row.jpg", "RGB"), (W, H))
    base = ImageEnhance.Color(ImageEnhance.Brightness(base).enhance(1.05)).enhance(1.25).convert("RGBA")
    rays = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rays)
    cx, cy = W // 2, int(H * 0.62)
    for i in range(18):
        a0, a1 = math.radians(i * 20), math.radians(i * 20 + 9)
        rd.polygon([(cx, cy), (cx + 1500 * math.cos(a0), cy + 1500 * math.sin(a0)),
                    (cx + 1500 * math.cos(a1), cy + 1500 * math.sin(a1))], fill=(255, 245, 160, 70))
    base.alpha_composite(rays.filter(ImageFilter.GaussianBlur(8)))
    paste_center(base, load("llama.png"), int(W * 0.40), int(H * 0.66), 360)
    token = load("player_token.png").resize((250, 250), Image.LANCZOS)
    base.alpha_composite(token, (int(W * 0.56), int(H * 0.50)))
    banner = load("victory_banner.png")
    paste_center(base, banner, W // 2, int(H * 0.2), 190)
    base.convert("RGB").save(IMG / "ending_a.jpg", quality=86, optimize=True)


def make_ending_b():
    base = cover(load("scene_polar_peak.jpg", "RGB"), (W, H))
    img = storm_tint(base, 0.7).convert("RGBA")
    img.alpha_composite(fog((W, H), 11, alpha=160))
    llama = load("llama.png")
    paste_center(img, ImageEnhance.Brightness(llama.convert("RGBA")).enhance(0.7), int(W * 0.42), int(H * 0.62), 300)
    token = load("player_token.png").resize((200, 200), Image.LANCZOS)
    token = ImageEnhance.Brightness(token).enhance(0.75)
    img.alpha_composite(token, (int(W * 0.52), int(H * 0.50)))
    img.convert("RGB").save(IMG / "ending_b.jpg", quality=86, optimize=True)


def make_ending_c():
    base = cover(load("player_portrait.jpg", "RGB"), (W, H))
    gray = ImageEnhance.Brightness(base.convert("L")).enhance(0.6).convert("RGB")
    red = Image.new("RGB", (W, H), (150, 10, 10))
    img = Image.blend(gray, red, 0.28)
    vignette = Image.new("L", (W, H), 0)
    ImageDraw.Draw(vignette).ellipse((-W * 0.2, -H * 0.3, W * 1.2, H * 1.3), fill=255)
    vignette = vignette.filter(ImageFilter.GaussianBlur(120))
    img = Image.composite(img, Image.new("RGB", (W, H), (20, 0, 0)), vignette)
    img.save(IMG / "ending_c.jpg", quality=86, optimize=True)


# ---------- island map ----------

def make_map():
    mw, mh = 1000, 640
    sea = vertical_gradient((mw, mh), (20, 110, 200), (40, 160, 225)).convert("RGBA")

    # island = a few overlapping blobs, blurred and thresholded into a smooth outline
    blobs = Image.new("L", (mw, mh), 0)
    bd = ImageDraw.Draw(blobs)
    for cx, cy, rx, ry in [(0.50, 0.50, 0.33, 0.30), (0.30, 0.55, 0.20, 0.22), (0.68, 0.70, 0.22, 0.18),
                           (0.62, 0.24, 0.16, 0.15), (0.45, 0.30, 0.14, 0.13), (0.78, 0.45, 0.12, 0.14)]:
        bd.ellipse(((cx - rx) * mw, (cy - ry) * mh, (cx + rx) * mw, (cy + ry) * mh), fill=255)
    mask = blobs.filter(ImageFilter.GaussianBlur(26)).point(lambda v: 255 if v > 128 else 0)
    mask = mask.filter(ImageFilter.GaussianBlur(2))

    land = vertical_gradient((mw, mh), (96, 190, 70), (70, 160, 60)).convert("RGBA")
    rng = random.Random(4)
    ld = ImageDraw.Draw(land)
    for _ in range(140):  # trees
        x, y = rng.randint(0, mw), rng.randint(0, mh)
        r = rng.randint(7, 13)
        ld.ellipse((x - r, y - r, x + r, y + r), fill=(40 + rng.randint(0, 25), 120 + rng.randint(0, 25), 45, 255))
    snow = Image.new("L", (mw, mh), 0)
    ImageDraw.Draw(snow).ellipse((mw * 0.46, mh * 0.04, mw * 0.78, mh * 0.40), fill=255)
    land.paste((236, 246, 255, 255), mask=snow.filter(ImageFilter.GaussianBlur(14)))
    town = Image.new("L", (mw, mh), 0)
    ImageDraw.Draw(town).ellipse((mw * 0.38, mh * 0.40, mw * 0.62, mh * 0.62), fill=255)
    land.paste((190, 175, 150, 255), mask=town.filter(ImageFilter.GaussianBlur(16)).point(lambda v: v // 2))

    beach = ImageChops.subtract(mask.filter(ImageFilter.MaxFilter(9)), mask)
    sea.paste((245, 225, 160, 255), mask=beach)
    sea.paste(land, mask=mask)

    # the storm: purple wall closing in from the top right and around the edges
    storm = Image.new("L", (mw, mh), 0)
    sd = ImageDraw.Draw(storm)
    sd.rectangle((0, 0, mw, mh), fill=150)
    sd.ellipse((-mw * 0.15, -mh * 0.35, mw * 0.95, mh * 1.2), fill=0)
    storm = storm.filter(ImageFilter.GaussianBlur(50))
    sea.paste((120, 40, 200, 255), mask=storm)
    corner = Image.new("L", (mw, mh), 0)
    ImageDraw.Draw(corner).ellipse((mw * 0.70, -mh * 0.25, mw * 1.25, mh * 0.55), fill=235)
    sea.paste((100, 30, 190, 255), mask=corner.filter(ImageFilter.GaussianBlur(35)))
    sea.alpha_composite(fog((mw, mh), 5, alpha=60).crop((0, 0, mw, mh)))
    sea.convert("RGB").save(IMG / "map.jpg", quality=86, optimize=True)


def make_favicon():
    llama = load("llama.png")
    icon = Image.new("RGBA", (128, 128), (120, 60, 220, 255))
    paste_center(icon, llama, 64, 66, 112)
    icon.save(IMG / "favicon.png", optimize=True)


if __name__ == "__main__":
    for step in (make_bus_scene, make_storm_scene, make_trap_hazard, make_avalanche_hazard, make_ending_a,
                 make_ending_b, make_ending_c, make_map, make_favicon):
        step()
        print("made", step.__name__)
