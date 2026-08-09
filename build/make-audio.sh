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
# Готовит все звуки игры: вынимает аудио из записей в audio-video/, режет тишину,
# выравнивает громкость по EBU R128, кодирует в моно mp3.
# Результат — build/audio/*.mp3, который потом зашивается в HTML скриптом assemble.py.
set -euo pipefail
# Числа считаем в C-локали: в русской awk печатает «0,20», и ffmpeg разбирает
# это как отдельный фильтр «20dB».
export LC_ALL=C
cd "$(dirname "$0")/.."
mkdir -p build/audio

# Предобработка перед нормализацией: срез рокота и тишина по краям.
PRE="highpass=f=85,\
silenceremove=start_periods=1:start_duration=0.03:start_threshold=-42dB:detection=peak,\
areverse,\
silenceremove=start_periods=1:start_duration=0.03:start_threshold=-42dB:detection=peak,\
areverse"

TARGET_LUFS=-15

# Замер интегральной громкости готового файла
measure_lufs () {
  ffmpeg -hide_banner -nostats -i "$1" -filter_complex ebur128 -f null - 2>&1 \
    | grep -oP '^\s+I:\s+\K-?[0-9.]+' | tail -1
}

# Реплики короткие, и loudnorm на них промахивается: гейт EBU не успевает набрать
# статистику, разброс между фразами доходил до 4 LU — часть реплик тонула в бою.
# Поэтому нормализуем в два шага и по ФАКТУ: сперва loudnorm начерно, затем
# замеряем что получилось и добираем разницу обычной громкостью с лимитером.
# Такой контур сходится, потому что второй шаг правит измеренный результат,
# а не предсказанный.
voice () {  # voice <путь внутри audio-video> <имя-в-игре>
  local src="audio-video/$1" out="build/audio/$2.mp3" tmp="build/audio/.$2.wav"
  [ -f "$src" ] || { echo "НЕТ ФАЙЛА: $src" >&2; exit 1; }

  ffmpeg -v error -y -i "$src" -vn \
    -af "${PRE},loudnorm=I=${TARGET_LUFS}:TP=-1.5:LRA=9" \
    -ac 1 -ar 44100 -c:a pcm_s16le "$tmp"

  local got gain
  got=$(measure_lufs "$tmp")
  gain=$(awk -v t="$TARGET_LUFS" -v g="${got:-$TARGET_LUFS}" \
           'BEGIN{d=t-g; if(d>8)d=8; if(d<-8)d=-8; printf "%.2f", d}')

  ffmpeg -v error -y -i "$tmp" \
    -af "volume=${gain}dB,alimiter=limit=0.89:level=disabled" \
    -ac 1 -ar 44100 -b:a 64k "$out"
  rm -f "$tmp"

  printf '  %-11s %6s B  %ss  %+5s dB  %s\n' "$2" \
    "$(stat -c%s "$out")" \
    "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out")" \
    "$gain" "$1"
}

echo "== срубание рук =="
voice "Срубание рук/руками не трогать.mkv"   chop1
voice "Срубание рук/соблюдай порядок.mkv"    chop2
voice "Срубание рук/А ну не лапай.mkv"       chop3
voice "Срубание рук/Куда лезешь.mkv"         chop4
voice "Срубание рук/Грабли убери.mkv"        chop5

echo "== покупатель подошёл =="
# «Почём?» — вторая версия мужской реплики, она заменяет старую «сколько стоит муж».
# Старый файл лежит в репозитории, но в игру не попадает (см. журнал в DESIGN.md).
voice "Покупатель подошёл к прилавку/сколько стоит жен.mkv"   ask_f1
voice "Покупатель подошёл к прилавку/Продайте это (жен).mkv"  ask_f2
voice "Покупатель подошёл к прилавку/почём (муж).mkv"         ask_m1
voice "Покупатель подошёл к прилавку/дайте понюхать (муж).mkv" ask_m2

echo "== покупатель успел убрать руку =="
voice "Покупатель успел убрать руку/ну ты чё акуратнее (муж).mkv" miss_m1
voice "Покупатель успел убрать руку/осторожнее (муж).mkv"         miss_m2
voice "Покупатель успел убрать руку/Размахался (жен).mkv"         miss_f1
voice "Покупатель успел убрать руку/Ай! Ну ты чё? (жен).mkv"      miss_f2

echo "== вор =="
voice "Вор пойман/держи его.mkv"                  grab1
voice "Вор пойман/куда.mkv"                       grab2
voice "Вор пойман/стой.mkv"                       grab3
voice "Нож вошёл вору в спину/не воруй.mkv"       stab1
voice "Нож вошёл вору в спину/беги лечись.mkv"    stab2
voice "Вор ушёл с пучком/Шарапова на тебя нет.mkv" esc1
voice "Вор ушёл с пучком/Эх ты убёг.mkv"          esc2

echo "== товар =="
voice "Пучки заканчиваются/Пучки заканчиваются.mkv" low1
voice "Пучки заканчиваются/Кончаются пучёчки.mkv"   low2
voice "товар кончился/ну как так-то.mkv"            stock_out

echo "== финал =="
voice "Победа/Смена отработана! Всех обслужил!.mkv" win_line
voice "Поражение/Я разорён.mkv"                     lose_line

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
printf '  %-11s %6s B  (Wikimedia Commons, public domain)\n' crow0 "$(stat -c%s build/audio/crow0.mp3)"
voice "Поражение/вороны 1.mkv" crow1
voice "Поражение/вороны 2.mkv" crow2

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
printf '  %-11s %6s B\n' fireworks "$(stat -c%s build/audio/fireworks.mp3)"

echo
echo "итого: $(ls build/audio/*.mp3 | wc -l) файлов, $(du -ch build/audio/*.mp3 | tail -1 | cut -f1)"
