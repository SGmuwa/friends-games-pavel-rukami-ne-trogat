#!/usr/bin/env bash
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
# Готовит все звуки игры: вынимает аудио из записей, режет тишину,
# выравнивает громкость по EBU R128, кодирует в моно mp3.
# Результат — build/audio/*.mp3, который потом зашивается в HTML скриптом assemble.py.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p build/audio

# Один и тот же фильтр для всех живых записей: срез рокота, тишина по краям, loudnorm.
VOICE_AF="highpass=f=85,\
silenceremove=start_periods=1:start_duration=0.03:start_threshold=-42dB:detection=peak,\
areverse,\
silenceremove=start_periods=1:start_duration=0.03:start_threshold=-42dB:detection=peak,\
areverse,\
loudnorm=I=-15:TP=-1.5:LRA=9"

voice () {  # voice <исходник.mkv> <имя-в-игре>
  ffmpeg -v error -y -i "$1" -vn -af "$VOICE_AF" -ac 1 -ar 44100 -b:a 64k "build/audio/$2.mp3"
  printf '  %-12s %7s B  %ss\n' "$2" \
    "$(stat -c%s "build/audio/$2.mp3")" \
    "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "build/audio/$2.mp3")"
}

echo "== голоса =="
voice "руками не трогать.mkv"   hands_off
voice "соблюдай порядок.mkv"    order
voice "ну ты чё акураттнее.mkv" careful
voice "держи его.mkv"           stop_thief
voice "сколько стоит муж.mkv"   howmuch_m
voice "сколько стоит жен.mkv"   howmuch_f

echo "== вороны =="
# crow0 — настоящая серая ворона с Wikimedia Commons (public domain, Oona Räisänen).
# crow1/crow2 — записи заказчика (в них три вороны: одна женская, две мужских).
if [ ! -f build/audio/crow_src.ogg ]; then
  curl -sS -A "herb-game/1.0" -o build/audio/crow_src.ogg \
    "https://upload.wikimedia.org/wikipedia/commons/9/91/Corvus_cornix.ogg"
fi
ffmpeg -v error -y -i build/audio/crow_src.ogg \
  -af "highpass=f=200,\
silenceremove=start_periods=1:start_duration=0.05:start_threshold=-40dB:detection=peak,\
areverse,\
silenceremove=start_periods=1:start_duration=0.05:start_threshold=-40dB:detection=peak,\
areverse,\
loudnorm=I=-16:TP=-1.5:LRA=9" -ac 1 -ar 44100 -b:a 64k build/audio/crow0.mp3
printf '  %-12s %7s B\n' crow0 "$(stat -c%s build/audio/crow0.mp3)"
voice "вороны 1.mkv" crow1
voice "вороны 2.mkv" crow2

echo "== музыка салюта =="
# Увертюра «1812» Чайковского, United States Marine Band — public domain.
# Берём финальную кульминацию с пушками (11:18 → 11:41).
if [ ! -f build/audio/1812_src.opus ]; then
  curl -sS -A "herb-game/1.0" -o build/audio/1812_src.opus \
    "https://upload.wikimedia.org/wikipedia/commons/6/66/1812_Overture_-_United_States_Marine_Band.opus"
fi
ffmpeg -v error -y -ss 678 -t 23 -i build/audio/1812_src.opus \
  -af "afade=t=in:st=0:d=0.6,afade=t=out:st=21.4:d=1.6,loudnorm=I=-14:TP=-1.0:LRA=11" \
  -ac 1 -ar 44100 -b:a 80k build/audio/fireworks.mp3
printf '  %-12s %7s B\n' fireworks "$(stat -c%s build/audio/fireworks.mp3)"

echo "готово: build/audio/"
