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
"""Собирает готовую игру: берёт src/game.html и вшивает в него все mp3 из
build/audio как base64. Результат — один самодостаточный ruki-ne-trogat.html.

Запуск:  python3 build/assemble.py
Перед этим:  bash build/make-audio.sh
"""
import base64
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "game.html"
AUDIO_DIR = ROOT / "build" / "audio"
OUT = ROOT / "ruki-ne-trogat.html"

# Порядок важен только для читаемости итогового файла.
NAMES = [
    "hands_off", "order", "careful", "stop_thief", "howmuch_m", "howmuch_f",
    "crow0", "crow1", "crow2", "fireworks",
]

MARKER = "/*__AUDIO__*/{}"


def main() -> int:
    html = SRC.read_text(encoding="utf-8")
    if MARKER not in html:
        print(f"НЕ НАЙДЕН маркер {MARKER} в {SRC}", file=sys.stderr)
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

    print(f"аудио:  {total/1024:8.1f} КБ в {len(audio)} файлах")
    print(f"игра:   {OUT.stat().st_size/1024:8.1f} КБ → {OUT.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
