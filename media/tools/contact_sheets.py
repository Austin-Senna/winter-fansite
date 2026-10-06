"""Build contact sheets of the best candidate photos per era and member for visual picking.

Usage: .venv/bin/python3 -I contact_sheets.py ../raw ../thumbs/sheets
Writes <out>/<era>-<member>.jpg (4x3 grid, numbered 1-12) and <out>/index.json mapping era -> member -> [files in grid order].
"""
import json, sys, os
from PIL import Image, ImageDraw, ImageFont

RAW, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
m = json.load(open(os.path.join(RAW, 'manifest.json')))
BAD = {'small', 'dupe', 'blurry', 'member-mismatch', 'era-mismatch'}
RANK = {'official': 0, 'pinterest': 1, 'commons': 2}
index = {}
CELL = 360
for era in m['eras']:
    index[era['slug']] = {}
    for member in ['karina', 'giselle', 'winter', 'ningning', 'group']:
        cands = [i for i in era['images'] if i.get('file') and (i.get('member') or 'group') == member and not (set(i.get('qc', {}).get('flags', [])) & BAD) and (i.get('width') or 0) >= 1000]
        # Prefer teaser or concept-like pins (metadata mentions teaser/concept/photoshoot), then source rank, then resolution.
        def score(i):
            meta = ' '.join(str(i.get(k, '') or '') for k in ('title', 'description', 'board', 'altText')).lower()
            kw = any(k in meta for k in ('teaser', 'concept', 'photoshoot', 'photo shoot', 'promo', 'cover'))
            return (0 if kw else 1, RANK.get(i.get('source'), 3), -(i.get('width') or 0) * (i.get('height') or 0))
        cands.sort(key=score)
        picks = cands[:12]
        if not picks:
            continue
        sheet = Image.new('RGB', (CELL * 4, CELL * 3), (12, 12, 16))
        draw = ImageDraw.Draw(sheet)
        try: font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 28)
        except Exception: font = ImageFont.load_default()
        files = []
        for n, i in enumerate(picks):
            try:
                im = Image.open(os.path.join(RAW, i['file'])); im.thumbnail((CELL - 8, CELL - 8))
            except Exception:
                continue
            x, y = (n % 4) * CELL + 4, (n // 4) * CELL + 4
            sheet.paste(im.convert('RGB'), (x + (CELL - 8 - im.width) // 2, y + (CELL - 8 - im.height) // 2))
            draw.rectangle([x, y, x + 44, y + 36], fill=(0, 0, 0)); draw.text((x + 8, y + 2), str(n + 1), fill=(255, 255, 255), font=font)
            files.append(i['file'])
        sheet.save(os.path.join(OUT, f"{era['slug']}-{member}.jpg"), quality=82)
        index[era['slug']][member] = files
json.dump(index, open(os.path.join(OUT, 'index.json'), 'w'), indent=1)
print('sheets:', sum(len(v) for v in index.values()))
