"""
Run this once after dropping gilfoyle.jpg/png into public/:
    python favicon-gen.py

It crops the image to a circle and generates favicon.png (32x32) and
gilfoyle_icon.png (192x192) used by the app.
"""
from PIL import Image, ImageDraw
import sys, os

src = next((f for f in ["gilfoyle.jpg","gilfoyle.png","gilfoyle.jpeg"] if os.path.exists(f)), None)
if not src:
    print("Drop a gilfoyle.jpg/png into this folder first."); sys.exit(1)

img = Image.open(src).convert("RGBA")

# Square crop from center
w, h = img.size
m = min(w, h)
img = img.crop(((w-m)//2, (h-m)//2, (w+m)//2, (h+m)//2))

# Circle mask
mask = Image.new("L", (m, m), 0)
ImageDraw.Draw(mask).ellipse([0, 0, m-1, m-1], fill=255)
img.putalpha(mask)

for size, name in [(32, "favicon.png"), (192, "gilfoyle_icon.png")]:
    img.resize((size, size), Image.LANCZOS).save(name)
    print(f"Saved {name}")
