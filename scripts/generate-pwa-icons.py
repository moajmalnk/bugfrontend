#!/usr/bin/env python3
"""Generate PWA icons with safe-zone padding and rounded white plate."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent / "public"
SOURCE = ROOT / "icon-512.original.png"

# Corner radius as fraction of plate size (0.20 = 20%)
ANY_CORNER_RATIO = 0.20
MASKABLE_CORNER_RATIO = 0.24


def logo_bbox(img: Image.Image, white_thresh: int = 245):
    px = img.convert("RGBA").load()
    w, h = img.size
    min_x, min_y, max_x, max_y = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a <= 10:
                continue
            if r >= white_thresh and g >= white_thresh and b >= white_thresh:
                continue
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)
    if max_x < 0:
        return img.getbbox()
    return min_x, min_y, max_x + 1, max_y + 1


def rounded_rect_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def extract_logo_mark(src_path: Path, inner_pad_ratio: float = 0.12) -> Image.Image:
    src = Image.open(src_path).convert("RGBA")
    box = logo_bbox(src)
    logo = src.crop(box)
    w, h = logo.size
    side = max(w, h)
    inner_pad = int(side * inner_pad_ratio)
    canvas_side = side + inner_pad * 2
    mark = Image.new("RGBA", (canvas_side, canvas_side), (0, 0, 0, 0))
    mark.paste(logo, ((canvas_side - w) // 2, (canvas_side - h) // 2), logo)
    return mark


def place_rounded_mark(
    mark: Image.Image,
    size: int,
    bg: tuple[int, int, int, int],
    content_ratio: float,
    corner_ratio: float,
) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), bg)
    scaled = mark.copy()
    target = int(size * content_ratio)
    scaled.thumbnail((target, target), Image.Resampling.LANCZOS)

    plate = Image.new("RGBA", (scaled.width, scaled.height), (255, 255, 255, 255))
    radius = max(8, int(min(scaled.width, scaled.height) * corner_ratio))
    plate.putalpha(rounded_rect_mask(scaled.width, radius))

    x = (size - scaled.width) // 2
    y = (size - scaled.height) // 2
    canvas.paste(plate, (x, y), plate)
    canvas.paste(scaled, (x, y), scaled)
    return canvas


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Missing source icon: {SOURCE}")

    mark = extract_logo_mark(SOURCE)

    for name, size in [("icon-192.png", 192), ("icon-512.png", 512), ("apple-touch-icon.png", 180)]:
        out = place_rounded_mark(mark, size, (255, 255, 255, 255), 0.82, ANY_CORNER_RATIO)
        out.save(ROOT / name, "PNG", optimize=True)
        print(f"wrote {name}")

    for name, size in [("icon-maskable-192.png", 192), ("icon-maskable-512.png", 512)]:
        out = place_rounded_mark(mark, size, (15, 23, 42, 255), 0.66, MASKABLE_CORNER_RATIO)
        out.save(ROOT / name, "PNG", optimize=True)
        print(f"wrote {name}")


if __name__ == "__main__":
    main()
