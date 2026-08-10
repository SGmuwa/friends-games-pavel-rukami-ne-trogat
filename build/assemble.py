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
"""Собирает готовую игру из исходников в src/: оболочку src/index.html,
стили src/style.css, модули src/js/*.js и mp3 из build/audio (base64).
Результат — один самодостаточный ruki-ne-trogat.html.

Модули склеиваются подряд в один <script> в порядке имён (00-, 01-, …),
поэтому это обычные скрипты без import/export: общая область видимости
сохраняется, и собранный файл открывается двойным кликом с file://,
где ES-модули запрещены CORS.

Запуск:  python3 build/assemble.py
Перед этим:  bash build/make-audio.sh
"""
import base64
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "index.html"
CSS = ROOT / "src" / "style.css"
JS_DIR = ROOT / "src" / "js"
AUDIO_DIR = ROOT / "build" / "audio"
OUT = ROOT / "ruki-ne-trogat.html"

# Порядок важен только для читаемости итогового файла.
NAMES = [
    # реплики продавца при ударе мачете
    "chop1", "chop2", "chop3", "chop4", "chop5",
    # покупатель подошёл к прилавку (по полу)
    "ask_f1", "ask_f2", "ask_m1", "ask_m2",
    # покупатель успел убрать руку (по полу)
    "miss_m1", "miss_m2", "miss_f1", "miss_f2",
    # вор: схватил / получил нож / ушёл
    "grab1", "grab2", "grab3", "stab1", "stab2", "esc1", "esc2",
    # склад
    "low1", "low2", "stock_out",
    # финал
    "win_line", "lose_line", "crow0", "crow1", "crow2", "fireworks",
]

MARKER = "/*__AUDIO__*/{}"
CSS_MARKER = "/*__CSS__*/"
JS_MARKER = "/*__JS__*/"


def chunk(path: pathlib.Path) -> str:
    """Содержимое файла без последнего перевода строки.

    Модули лежат на диске как обычные текстовые файлы (с \\n в конце), а внутри
    <script> склеиваются через \\n. Лишний перевод строки здесь сдвинул бы весь
    файл и сборка перестала бы совпадать байт в байт с прежней.
    """
    text = path.read_text(encoding="utf-8")
    return text[:-1] if text.endswith("\n") else text


def main() -> int:
    html = SRC.read_text(encoding="utf-8")
    for marker in (CSS_MARKER, JS_MARKER):
        if marker not in html:
            print(f"НЕ НАЙДЕН маркер {marker} в {SRC}", file=sys.stderr)
            return 1

    modules = sorted(JS_DIR.glob("*.js"))
    if not modules:
        print(f"нет модулей в {JS_DIR}", file=sys.stderr)
        return 1
    html = html.replace(CSS_MARKER, chunk(CSS))
    html = html.replace(JS_MARKER, "\n".join(chunk(p) for p in modules))

    # Маркер аудио живёт в модуле звука, поэтому проверяется после склейки.
    if MARKER not in html:
        print(f"НЕ НАЙДЕН маркер {MARKER} в {JS_DIR}", file=sys.stderr)
        return 1

    audio = {}
    total = 0
    for name in NAMES:
        path = AUDIO_DIR / f"{name}.mp3"
        if not path.exists():
            print(f"нет файла {path} — сначала: bash build/make-audio.sh", file=sys.stderr)
            return 1
        raw = path.read_bytes()
        total += len(raw)
        audio[name] = base64.b64encode(raw).decode("ascii")

    html = html.replace(MARKER, json.dumps(audio, ensure_ascii=True))
    OUT.write_text(html, encoding="utf-8")

    print(f"модули: {len(modules)} файлов js + style.css")
    print(f"аудио:  {total/1024:8.1f} КБ в {len(audio)} файлах")
    print(f"игра:   {OUT.stat().st_size/1024:8.1f} КБ → {OUT.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
