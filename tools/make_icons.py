# Makes the app icons from Inaara's portrait (assets/faces/portrait.png, not changed: only cropped to a circle)
# on a warm marigold background.   python3 tools/make_icons.py
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'icons')


def icon(size, face_part):
    bg = Image.new('RGB', (size, size))
    d = ImageDraw.Draw(bg)
    for y in range(size):
        t = y / size
        d.line([(0, y), (size, y)], fill=(int(255 - 30 * t), int(170 - 70 * t), int(40 - 20 * t)))
    p = Image.open(os.path.join(ROOT, 'assets', 'faces', 'portrait.png')).convert('RGBA')
    # The top part of the portrait (her face), as a circle.
    side = p.width
    face = p.crop((0, 0, side, side)).resize((int(size * face_part),) * 2, Image.LANCZOS)
    mask = Image.new('L', face.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, face.size[0] - 1, face.size[1] - 1), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(1))
    ring = int(size * 0.025)
    x = (size - face.size[0]) // 2
    ImageDraw.Draw(bg).ellipse((x - ring, x - ring, x + face.size[0] + ring, x + face.size[0] + ring), fill=(255, 246, 230))
    # Her picture has a see-through background: lay it on the cream circle first.
    disc = Image.new('RGBA', face.size, (255, 246, 230, 255))
    disc.alpha_composite(face)
    bg.paste(disc.convert('RGB'), (x, x), mask)
    return bg


os.makedirs(OUT, exist_ok=True)
icon(512, 0.78).save(os.path.join(OUT, 'icon-512.png'))
icon(192, 0.78).save(os.path.join(OUT, 'icon-192.png'))
icon(180, 0.78).save(os.path.join(OUT, 'apple-touch-icon.png'))
icon(512, 0.6).save(os.path.join(OUT, 'maskable-512.png'))
print('icons made')
