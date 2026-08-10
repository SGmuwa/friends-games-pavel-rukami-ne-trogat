#!/usr/bin/env python3
# «Руками не трогать!» — браузерная аркада.
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Copyright (C) 2026 Павел Сидоренко (основной правообладатель),
#                    Михаил Сидоренко, Ольга Сидоренко
#
# Свободное программное обеспечение: распространяется на условиях GNU Affero
# General Public License версии 3 или (по вашему выбору) любой более поздней.
# Без каких бы то ни было гарантий. Полный текст лицензии — в файле LICENSE
# и на <https://www.gnu.org/licenses/>.
#
# Медиафайлы (озвучка в audio-video/) — CC BY-SA 4.0, см. файл LICENSE-ASSETS.
"""Иконка игры — пучок лекарственной травы.

Геометрия описана здесь один раз и отдаётся в двух видах:
  * src/icon.svg      — векторный исходник, он же favicon;
  * src/icon-180.png  — растр для «На экран «Домой»» в iOS (там SVG не берут).

Оба вида вшиваются в <head> игры (src/game.html и собранный ruki-ne-trogat.html)
как data-URI: игра должна оставаться одним самодостаточным файлом.

Запуск:  python3 build/make-icon.py
"""
import base64
import math
import pathlib
import re
import sys

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
SVG_OUT = ROOT / "src" / "icon.svg"
PNG_OUT = ROOT / "src" / "icon-180.png"
HTML_FILES = [ROOT / "src" / "game.html", ROOT / "ruki-ne-trogat.html"]

# Палитра игры (см. :root в src/game.html)
INK = "#1b1410"
PAPER = "#e8dcc0"
BLOOD = "#b3161b"
WOOD = "#6b543c"
GREENS = ["#2f7a2c", "#46a03f", "#3a8c36"]

VIEW = 64.0          # иконка рисуется в квадрате 64×64
BASE = (32.0, 50.0)  # точка, из которой веером расходятся стебли
BLADE_W = 3.4        # полуширина стебля у основания
BEND_K = 6.5         # насколько крайние стебли выгибаются наружу
SPREAD = 0.78        # полураствор веера, радианы
OUTLINE = 0.8        # толщина обводки: тоньше — иначе зелень тонет в чёрном

# Длины стеблей: центральные длиннее крайних, ряд подобран на глаз.
LENGTHS = [0.72, 0.95, 0.84, 1.00, 0.90, 1.00, 0.80, 0.93, 0.75]
BLADE_LEN = 31.0


def blade(angle, length):
    """Лист-стебель: пять опорных точек двух квадратичных кривых.

    Возвращает (левое основание, левый контроль, кончик, правый контроль,
    правое основание) в координатах вьюбокса.
    """
    dx, dy = math.sin(angle), -math.cos(angle)      # вдоль стебля, вверх
    px, py = math.cos(angle), math.sin(angle)       # поперёк стебля
    bend = BEND_K * angle                            # изгиб наружу
    bx, by = px * bend, py * bend
    mx = BASE[0] + dx * length * 0.55
    my = BASE[1] + dy * length * 0.55
    return (
        (BASE[0] - px * BLADE_W, BASE[1] - py * BLADE_W),
        (mx - px * BLADE_W * 0.75 + bx * 0.6, my - py * BLADE_W * 0.75 + by * 0.6),
        (BASE[0] + dx * length + bx, BASE[1] + dy * length + by),
        (mx + px * BLADE_W * 0.75 + bx * 0.6, my + py * BLADE_W * 0.75 + by * 0.6),
        (BASE[0] + px * BLADE_W, BASE[1] + py * BLADE_W),
    )


def blades():
    """Стебли в порядке отрисовки: крайние уходят назад, центральные сверху."""
    out = []
    for i, k in enumerate(LENGTHS):
        a = -SPREAD + 2 * SPREAD * i / (len(LENGTHS) - 1)
        out.append((abs(a), a, BLADE_LEN * k, GREENS[i % len(GREENS)]))
    out.sort(key=lambda b: -b[0])
    return [(a, ln, col) for _, a, ln, col in out]


# Стебли, торчащие из-под перевязки, и сама перевязка.
STEMS = [(27.5, 47.0), (36.5, 47.0), (35.0, 57.5), (29.0, 57.5)]
TIE = (24.0, 44.0, 40.0, 52.0, 2.8)   # x0, y0, x1, y1, радиус
KNOT = [(35.5, 48.5), (39.5, 49.5), (43.0, 57.5), (38.8, 58.0)]  # хвостик перевязки


def quad(p0, p1, p2, steps=26):
    """Точки квадратичной кривой Безье — для растрового рендера."""
    pts = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        pts.append((
            u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
            u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
        ))
    return pts


def build_svg():
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEW:.0f} {VIEW:.0f}" '
        f'width="{VIEW:.0f}" height="{VIEW:.0f}">',
        f'<rect x="2" y="2" width="60" height="60" rx="13" fill="{PAPER}" '
        f'stroke="{INK}" stroke-width="2.5"/>',
        f'<g stroke="{INK}" stroke-width="{OUTLINE}" stroke-linejoin="round">',
    ]
    for angle, length, color in blades():
        bl, cl, tip, cr, br = blade(angle, length)
        parts.append(
            f'<path fill="{color}" d="M{bl[0]:.2f} {bl[1]:.2f}'
            f'Q{cl[0]:.2f} {cl[1]:.2f} {tip[0]:.2f} {tip[1]:.2f}'
            f'Q{cr[0]:.2f} {cr[1]:.2f} {br[0]:.2f} {br[1]:.2f}Z"/>'
        )
    stems = " ".join(f"{x:.1f},{y:.1f}" for x, y in STEMS)
    knot = " ".join(f"{x:.1f},{y:.1f}" for x, y in KNOT)
    x0, y0, x1, y1, r = TIE
    parts += [
        f'<polygon fill="{WOOD}" points="{stems}"/>',
        f'<polygon fill="{BLOOD}" points="{knot}"/>',
        f'<rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}" rx="{r}" '
        f'fill="{BLOOD}"/>',
        "</g></svg>",
    ]
    return "".join(parts)


def build_png(size=180, ss=8):
    """Растр без скруглённых углов: iOS накладывает собственную маску."""
    s = size * ss
    k = s / VIEW
    img = Image.new("RGB", (s, s), PAPER)
    d = ImageDraw.Draw(img)
    lw = max(1, round(OUTLINE * k))

    def sc(pts):
        return [(x * k, y * k) for x, y in pts]

    for angle, length, color in blades():
        bl, cl, tip, cr, br = blade(angle, length)
        poly = quad(bl, cl, tip) + quad(tip, cr, br)[1:]
        d.polygon(sc(poly), fill=color, outline=INK, width=lw)
    d.polygon(sc(STEMS), fill=WOOD, outline=INK, width=lw)
    d.polygon(sc(KNOT), fill=BLOOD, outline=INK, width=lw)
    x0, y0, x1, y1, r = TIE
    d.rounded_rectangle((x0 * k, y0 * k, x1 * k, y1 * k), radius=r * k,
                        fill=BLOOD, outline=INK, width=lw)
    return img.resize((size, size), Image.LANCZOS)


BEGIN = "<!-- иконка игры: пучок травы, генератор — build/make-icon.py -->"
END = "<!-- /иконка -->"


def patch_html(path, svg_b64, png_b64):
    html = path.read_text(encoding="utf-8")
    block = (
        f'{BEGIN}\n'
        f'<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,{svg_b64}">\n'
        f'<link rel="apple-touch-icon" href="data:image/png;base64,{png_b64}">\n'
        f'{END}'
    )
    old = re.compile(re.escape(BEGIN) + ".*?" + re.escape(END), re.S)
    if old.search(html):
        html = old.sub(lambda _: block, html, count=1)
    elif "<title>" in html:
        html = html.replace("<title>", block + "\n<title>", 1)
    else:
        print(f"НЕ НАЙДЕН <title> в {path}", file=sys.stderr)
        return False
    path.write_text(html, encoding="utf-8")
    return True


def main() -> int:
    svg = build_svg()
    SVG_OUT.write_text(svg, encoding="utf-8")
    build_png().save(PNG_OUT, optimize=True)

    svg_b64 = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    png_b64 = base64.b64encode(PNG_OUT.read_bytes()).decode("ascii")

    ok = True
    for path in HTML_FILES:
        if not path.exists():
            print(f"пропуск: нет {path}", file=sys.stderr)
            continue
        ok &= patch_html(path, svg_b64, png_b64)
        print(f"вшито в {path.relative_to(ROOT)}")

    print(f"svg:  {len(svg)/1024:6.1f} КБ → {SVG_OUT.relative_to(ROOT)}")
    print(f"png:  {PNG_OUT.stat().st_size/1024:6.1f} КБ → {PNG_OUT.relative_to(ROOT)}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
