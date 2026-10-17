#!/usr/bin/env python3
"""Generate 1200x630 OG image for misode.github.io (Minecraft Data Pack Generators).

Dark voxel-generator aesthetic: deep violet-slate ground with a subtle pixel
grid, the site's three toggle-switch motif (green/grey/teal, from its favicon),
generator topic chips, and domain. Pillow-only, reproducible from a clean dir
with only FONT_DIR override.
"""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1200, 630
BG_TOP = (30, 24, 48)        # #1e1830 dark violet
BG_BOT = (13, 10, 22)        # #0d0a16 near-black
GRID = (46, 38, 72)          # faint pixel grid
WHITE = (245, 244, 248)
PURPLE_SOFT = (201, 184, 232)   # #c9b8e8
PURPLE_ACCENT = (151, 98, 232)  # #9762e8
GREEN = (75, 160, 65)           # #4ba041 favicon green
TEAL = (75, 152, 155)           # #4b989b favicon teal
GREY = (145, 144, 143)          # favicon grey
ORANGE = (253, 121, 81)         # #fd7951 site accent
GREEN_LIGHT = (124, 180, 92)    # favicon light green
TEAL_LIGHT = (112, 181, 195)    # favicon light teal

FONT_DIR = os.environ.get("FONT_DIR", "/usr/share/fonts/truetype/dejavu")
FONT_BOLD = os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf")

def font(size):
    if os.path.exists(FONT_BOLD):
        return ImageFont.truetype(FONT_BOLD, size)
    return ImageFont.load_default()

def text_w(d, cx, y, text, fnt, fill):
    bbox = d.textbbox((0, 0), text, font=fnt)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    d.text((cx - tw / 2 - bbox[0], y - bbox[1]), text, font=fnt, fill=fill)
    return tw, th

def toggle(d, x, y, w, h, track, knob, on=True, px=3):
    """Pixel-art toggle switch: rounded track + circular knob (favicon motif)."""
    d.rounded_rectangle([x, y, x + w, y + h], radius=h // 2, fill=track)
    r = h // 2
    if on:
        kx = x + w - r - px
    else:
        kx = x + r + px - h // 2
    d.ellipse([kx, y + px, kx + h - 2 * px, y + h - px], fill=knob)
    # pixel facets: darker right side for voxel feel
    d.rectangle([x + w - 3, y + 1, x + w - 1, y + h - 1], fill=tuple(max(0, c - 28) for c in track))
    d.rectangle([x + 1, y + h - 3, x + w - 1, y + h - 1], fill=tuple(max(0, c - 28) for c in track))

def chip(d, cx, y, label, fill, text_color=(250, 249, 252), size=30):
    fnt = font(size)
    bbox = d.textbbox((0, 0), label, font=fnt)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pad_x, pad_y = 22, 13
    w = tw + pad_x * 2
    h = th + pad_y * 2
    x0 = cx - w / 2
    d.rounded_rectangle([x0, y, x0 + w, y + h], radius=h // 2, fill=fill)
    d.text((cx - tw / 2 - bbox[0], y + (h - th) / 2 - bbox[1]), label, font=fnt, fill=text_color)
    return w

def main():
    img = Image.new("RGB", (W, H), BG_TOP)
    d = ImageDraw.Draw(img)

    # vertical gradient
    for yy in range(H):
        t = yy / H
        col = tuple(int(BG_TOP[i] * (1 - t) + BG_BOT[i] * t) for i in range(3))
        d.line([(0, yy), (W, yy)], fill=col)

    # subtle pixel grid (voxel feel), every 48px
    for xx in range(0, W, 48):
        d.line([(xx, 0), (xx, H)], fill=GRID, width=1)
    for yy in range(0, H, 48):
        d.line([(0, yy), (W, yy)], fill=GRID, width=1)

    # thin double border
    d.rectangle([16, 16, W - 16, H - 16], outline=PURPLE_ACCENT, width=2)
    d.rectangle([28, 28, W - 28, H - 28], outline=GRID, width=1)

    # top-left toggle-switch trio (favicon tribute): green on, grey off, teal on
    toggle(d, 64, 64, 120, 52, GREEN, (13, 60, 10), on=True)
    toggle(d, 64, 130, 120, 52, (90, 90, 88), (58, 58, 56), on=False)
    toggle(d, 64, 196, 120, 52, TEAL, (14, 66, 70), on=True)

    # title block
    f_title = font(88)
    text_w(d, 700, 170, "Data Pack", f_title, WHITE)
    text_w(d, 700, 268, "Generators", f_title, WHITE)

    # subtitle
    f_sub = font(34)
    text_w(d, 700, 392, "Minecraft data pack & dimension tools", f_sub, PURPLE_SOFT)

    # version line
    f_ver = font(30)
    text_w(d, 700, 446, "1.21  ·  26.1  ·  26.2", f_ver, PURPLE_ACCENT)

    # topic chips
    y_chip = 512
    chip(d, 700 - 205, y_chip, "Generators", (47, 84, 38))
    chip(d, 700, y_chip, "Tools", (42, 76, 80))
    chip(d, 700 + 205, y_chip, "Free", (88, 58, 20))

    # domain
    f_dom = font(26)
    d.text((60, H - 66), "misode.github.io", font=f_dom, fill=PURPLE_SOFT)

    out = "og-image.png"
    img.save(out, "PNG")
    print("wrote", out, img.size)

if __name__ == "__main__":
    main()