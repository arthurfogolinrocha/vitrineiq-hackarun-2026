#!/usr/bin/env bash
set -euo pipefail

# Uso: bash mixar_voz_arthur.sh caminho/para/sua_gravacao.m4a
if [ $# -lt 1 ]; then
  echo "Uso: bash mixar_voz_arthur.sh <arquivo_de_audio.(m4a|mp3|wav)>"
  exit 1
fi

AUDIO_IN="$1"
DIR="$(cd "$(dirname "$0")" && pwd)"
VIDEO_BASE="$DIR/VitrineIQ_Pitch_Demo_1080p.mp4"
OUT_FINAL="$DIR/VitrineIQ_Pitch_FINAL_COM_VOZ.mp4"

ffmpeg -y -i "$VIDEO_BASE" -i "$AUDIO_IN" \
  -filter_complex "[1:a]loudnorm=I=-15:TP=-1.5:LRA=11[voice];[0:a]volume=0.22[bed];[voice][bed]amix=inputs=2:duration=shortest:dropout_transition=2[aout]" \
  -map 0:v -map "[aout]" \
  -c:v copy -c:a aac -b:a 192k -movflags +faststart \
  "$OUT_FINAL"

echo "✅ Vídeo final pronto para YouTube: $OUT_FINAL"
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUT_FINAL"

