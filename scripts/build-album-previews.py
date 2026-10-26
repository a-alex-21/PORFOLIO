"""Rebuild responsive album previews. Requires Pillow; originals stay untouched."""
from pathlib import Path
import math
import re
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
WIDTHS = (480, 960, 1600)


def row_fractions(dimensions, columns):
    count = len(dimensions)
    rows = math.ceil(count / columns)
    result = []
    offset = 0
    for row in range(rows):
        size = count // rows + (row < count % rows)
        ratios = [w / h for w, h in dimensions[offset:offset + size]]
        result.extend((ratio / sum(ratios), size) for ratio in ratios)
        offset += size
    return result


for album in ('FG', 'KONICA'):
    page = ROOT / album / 'index.html'
    html = page.read_text()
    tags = re.findall(r'<img\b[^>]+>', html)
    sources = [(re.search(r'data-original="([^"]+)"', tag) or re.search(r'src="([^"]+)"', tag))[1] for tag in tags]
    dimensions = []
    variants = []
    for source in sources:
        path = (page.parent / source).resolve()
        with Image.open(path) as image:
            image = ImageOps.exif_transpose(image)
            dimensions.append(image.size)
            candidates = []
            for width in WIDTHS:
                if width >= image.width:
                    continue
                target = ROOT / 'photos' / 'previews' / f'{path.stem}-{width}.webp'
                target.parent.mkdir(exist_ok=True)
                preview = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
                # Lossless encoding adds no compression artifacts to the resized image.
                preview.save(target, 'WEBP', lossless=True, method=6, icc_profile=image.info.get('icc_profile', b''))
                candidates.append((f'../photos/previews/{target.name}', width))
            candidates.append((source, image.width))
            variants.append(candidates)
    desktop = row_fractions(dimensions, 3)
    mobile = row_fractions(dimensions, 2)
    for index, (tag, source, candidates) in enumerate(zip(tags, sources, variants)):
        fraction, count = desktop[index]
        mf, mc = mobile[index]
        sizes = ', '.join([
            f'(max-width: 600px) calc({mf * 100:.5f}vw - {(24 + (mc - 1) * 5) * mf:.5f}px)',
            f'(max-width: 900px) calc({fraction * 100:.5f}vw - {(48 + (count - 1) * 8) * fraction:.5f}px)',
            f'(max-width: 1600px) calc({fraction * 100:.5f}vw - {(96 + (count - 1) * 8) * fraction:.5f}px)',
            f'{(1600 - 96 - (count - 1) * 8) * fraction:.5f}px',
        ])
        clean = re.sub(r'\s(?:src|srcset|sizes|data-original|loading|fetchpriority)="[^"]*"', '', tag)
        attrs = f' src="{candidates[0][0]}" data-original="{source}" srcset="' + ', '.join(f'{url} {w}w' for url, w in candidates) + f'" sizes="{sizes}" loading="{"eager" if index < 3 else "lazy"}"'
        if index == 0:
            attrs += ' fetchpriority="high"'
        html = html.replace(tag, clean.replace('<img', '<img' + attrs), 1)
    html = html.replace('album.js?v=direct-entry-1', 'album.js?v=responsive-photos-1')
    page.write_text(html)
    (ROOT / 'albums' / f'{album}.html').write_text(html)
    print(f'{album}: generated previews for {len(tags)} photos', flush=True)
