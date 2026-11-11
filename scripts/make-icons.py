"""Génère les icônes de l'application (cavalier ivoire sur fond vert de l'échiquier).
Usage : python3 scripts/make-icons.py  (nécessite Pillow ; police Apple Symbols de macOS)."""
from PIL import Image, ImageDraw, ImageFont
import os
GREEN, IVORY, DARK = (127, 148, 113), (235, 230, 214), (79, 96, 69)
FONT = '/System/Library/Fonts/Apple Symbols.ttf'
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')

def rrect(d, box, r, fill):
    """Rectangle arrondi (compatible avec les anciennes versions de Pillow)."""
    x0, y0, x1, y1 = box
    d.rectangle([x0 + r, y0, x1 - r, y1], fill=fill)
    d.rectangle([x0, y0 + r, x1, y1 - r], fill=fill)
    for cx, cy in ((x0, y0), (x1 - 2 * r, y0), (x0, y1 - 2 * r), (x1 - 2 * r, y1 - 2 * r)):
        d.ellipse([cx, cy, cx + 2 * r, cy + 2 * r], fill=fill)

def draw(size, maskable=False, rounded=True):
    S = size * 4  # suréchantillonnage pour des bords lisses
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable or not rounded:
        d.rectangle([0, 0, S, S], fill=GREEN)
    else:
        rrect(d, [0, 0, S - 1, S - 1], S * 0.22, GREEN)
    # Damier discret en bas
    zone = 0.62 if maskable else 0.8  # zone utile (les icônes adaptatives Android rognent les bords)
    m = S * (1 - zone) / 2
    k = (S - 2 * m) / 4
    for i in range(4):
        x0 = m + i * k
        y0 = S - m - k * 0.55
        d.rectangle([x0, y0, x0 + k, S - m + (S * 0.2 if not maskable else 0)], fill=IVORY if i % 2 == 0 else DARK)
    if not maskable and rounded:
        mask = Image.new('L', (S, S), 0)
        rrect(ImageDraw.Draw(mask), [0, 0, S - 1, S - 1], S * 0.22, 255)
        img.putalpha(Image.composite(img.getchannel('A'), Image.new('L', (S, S), 0), mask))
    font = ImageFont.truetype(FONT, int(S * zone * 0.95))
    glyph = '♞'
    bbox = d.textbbox((0, 0), glyph, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (S - w) / 2 - bbox[0]
    y = S - m - k * 0.55 - h - bbox[1] + S * 0.01
    # ombre légère puis cavalier ivoire
    d.text((x + S * 0.012, y + S * 0.012), glyph, font=font, fill=DARK)
    d.text((x, y), glyph, font=font, fill=IVORY)
    return img.resize((size, size), Image.LANCZOS)

draw(192).save(os.path.join(OUT, 'icon-192.png'))
draw(512).save(os.path.join(OUT, 'icon-512.png'))
draw(512, maskable=True).save(os.path.join(OUT, 'icon-maskable-512.png'))
draw(180, rounded=False).convert('RGB').save(os.path.join(OUT, 'apple-touch-icon.png'))
draw(64).save(os.path.join(OUT, 'favicon-64.png'))
print('ok')
