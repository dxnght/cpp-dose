#!/usr/bin/env python3
"""Regenerate CPP-DOSE's app icon across every platform from one source image.

This is a manual design tool, not part of the app's build/test toolchain
(nothing in package.json calls it, and `npm run build`/`test`/`gate:release`
do not depend on it). Run it by hand after changing the source art, or
after re-running `npx cap add android` / `npx cap add ios` — both native
projects are gitignored (regenerated from the web build, per .gitignore),
so a fresh `cap add` wipes any hand-edited native icon back to Capacitor's
generic default and this script is what puts the real one back.

Requires: pip install pillow --break-system-packages

Source of truth: design/app-icon/icon-2-2407.jpg (tracked in git; not
shipped — it lives outside public/ so Vite never bundles it into the
offline PWA build). Four IV bottles (VOL/TIME/RATE/DOSE) converging on a
"CP" logo ring.

Revision history:
- 2026-07-24: first pick was design/app-icon/drop_hovering.jpg (a droplet
  in a glass timer dial), one of 5 Owner-generated candidates. Superseded
  the same day after the Owner saw it live on-device — a pale, mostly-
  white icon reads as washed-out/invisible against a real home screen.
  Kept on disk for the record; no longer referenced by this script.
- 2026-07-24 (later): switched to icon-2-2407.jpg — high-contrast dark
  background with neon pink/cyan, reads clearly at a glance on a home
  screen grid where the droplet concept didn't.

Chosen crop: a 1490x1490 square from (150, 330) to (1640, 1820) of the
source. Frames all 4 bottles + the center ring/logo fully, right at the
composition's own soft vignette edge — loose enough that no background
clutter creeps in, tight enough that none of the bottles get clipped.
Unlike the droplet source, this art has no separable wordmark to crop
away: the small "CPP-DOSE" caption sits inside the ring, under the "CP"
logo, as part of that logotype rather than a separate banner below it —
left in place since removing it would mean cutting into the ring/logo
itself.
"""

import os
from PIL import Image, ImageDraw

REPO = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(REPO, "design/app-icon/icon-2-2407.jpg")
CROP_BOX = (150, 330, 1640, 1820)  # (left, top, right, bottom) -> 1490x1490


def load_mark():
    im = Image.open(SRC).convert("RGB")
    mark = im.crop(CROP_BOX)
    # Average a small patch rather than one pixel — more robust against a
    # stray anti-aliasing/JPEG-noise outlier at the exact sample point.
    patch = [
        mark.getpixel((x, y))
        for x in (4, 8, 12)
        for y in (4, 8, 12)
    ]
    bg = tuple(sum(c[i] for c in patch) // len(patch) for i in range(3))
    return mark, bg


def full_bleed(mark, size):
    """Plain resize — for iOS / legacy Android / PWA squares, where the
    platform applies its own corner mask but the subject already has
    natural margin, so no extra safe-zone padding is needed."""
    return mark.resize((size, size), Image.LANCZOS)


def padded(mark, bg, size, content_frac):
    """Scale the mark down to `content_frac` of the canvas and center it
    on a canvas filled with `bg`, for Android adaptive-icon foreground
    layers and the maskable PWA icon — both get cropped to a circle or
    squircle by the OS/launcher and must keep all content in a safe
    zone (every mask shape guarantees the inner ~66-80% stays visible)."""
    canvas = Image.new("RGBA", (size, size), bg + (255,))
    inner = int(size * content_frac)
    scaled = mark.resize((inner, inner), Image.LANCZOS)
    off = (size - inner) // 2
    canvas.paste(scaled, (off, off))
    return canvas


def circle_mask(img):
    """Circular alpha-mask, for legacy ic_launcher_round.png."""
    size = img.size[0]
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def main():
    mark, bg = load_mark()
    print(f"source {SRC}, crop {CROP_BOX}, sampled bg {bg}")

    # ---- PWA / public/ (always present) -----------------------------
    public = os.path.join(REPO, "public")
    full_bleed(mark, 180).save(os.path.join(public, "apple-touch-icon.png"))
    full_bleed(mark, 192).convert("RGBA").save(os.path.join(public, "icon-192.png"))
    full_bleed(mark, 512).convert("RGBA").save(os.path.join(public, "icon-512.png"))
    full_bleed(mark, 1024).convert("RGBA").save(os.path.join(public, "icon-1024.png"))
    # W3C maskable safe zone is the inner 80% (radius 0.4); 72% leaves a
    # bit of extra margin so nothing meaningful touches the edge.
    padded(mark, bg, 512, 0.72).save(os.path.join(public, "icon-512-maskable.png"))
    print("wrote public/ icons")

    # ---- Android (only if `cap add android` has been run) -----------
    res = os.path.join(REPO, "android/app/src/main/res")
    if os.path.isdir(res):
        legacy = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
        fg = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
        for dens, size in legacy.items():
            d = os.path.join(res, f"mipmap-{dens}")
            sq = full_bleed(mark, size)
            sq.save(os.path.join(d, "ic_launcher.png"))
            circle_mask(sq).save(os.path.join(d, "ic_launcher_round.png"))
        for dens, size in fg.items():
            d = os.path.join(res, f"mipmap-{dens}")
            # ~68% content clears every launcher mask shape (circle,
            # squircle, rounded square all guarantee the inner 66%).
            padded(mark, bg, size, 0.68).save(
                os.path.join(d, "ic_launcher_foreground.png")
            )
        hexcol = "#{:02X}{:02X}{:02X}".format(*bg)
        with open(os.path.join(res, "values/ic_launcher_background.xml"), "w") as f:
            f.write(
                '<?xml version="1.0" encoding="utf-8"?>\n'
                "<resources>\n"
                f'    <color name="ic_launcher_background">{hexcol}</color>\n'
                "</resources>\n"
            )
        print(f"wrote android mipmaps + background color {hexcol}")
    else:
        print("android/ not present (run `npx cap add android` first) — skipped")

    # ---- iOS (only if `cap add ios` has been run) --------------------
    ios_path = os.path.join(
        REPO, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
    )
    if os.path.isdir(os.path.dirname(ios_path)):
        full_bleed(mark, 1024).save(ios_path)
        print("wrote ios AppIcon")
    else:
        print("ios/ not present (run `npx cap add ios` first) — skipped")


if __name__ == "__main__":
    main()
