#!/usr/bin/env python3
"""Finaliza timingsMarketing.json (8/8 já em cache) e sintetiza as 8 falas do Pitch em apenas 2 batches no gemini-3.8-flash-lite-tts."""

import base64
import json
import math
import os
import re
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

from generate_studio_audio import (
    MARKETING_SCENES,
    OUT_MKT,
    OUT_PITCH,
    PITCH_SCENES,
    RAW_DIR,
    master_voice,
)

ROOT = Path(__file__).resolve().parent.parent
API_KEY = os.environ["GEMINI_API_KEY"]
VOICE_ID = "pt-br-commercial-5"


def finalize_marketing() -> None:
    timings = []
    for s in MARKETING_SCENES:
        raw_wav = RAW_DIR / f"{s['id']}_raw.wav"
        clean_wav = OUT_MKT / f"{s['id']}.wav"
        dur = master_voice(raw_wav, clean_wav, tempo=1.04)
        frames = math.ceil(dur * 60)
        timings.append({"id": s["id"], "durationSec": round(dur, 3), "frames": frames})
        print(f"Marketing OK: {clean_wav.name} = {dur:.2f}s ({frames}f)")
    (ROOT / "src" / "timingsMarketing.json").write_text(json.dumps(timings, indent=2), encoding="utf-8")


def synth_batch_lite(content_items: list[dict], out_wav: Path) -> None:
    payload = {
        "model": "gemini-3.8-flash-lite-tts",
        "input": [{"type": "user_input", "content": content_items}],
        "response_format": {"type": "audio"},
        "generation_config": {"speech_config": [{"voice": VOICE_ID}]},
    }
    req = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"x-goog-api-key": API_KEY, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    chunks = [
        o["data"]
        for o in data.get("outputs", [])
        if isinstance(o, dict) and o.get("type") == "audio"
    ]
    if not chunks:
        chunks = [
            c["data"]
            for s in data.get("steps", [])
            for c in (s.get("content", []) if isinstance(s, dict) else [])
            if isinstance(c, dict) and c.get("type") == "audio"
        ]
    if not chunks:
        raise RuntimeError(f"Sem áudio no batch {out_wav.name}: {data}")
    out_wav.write_bytes(base64.b64decode(chunks[-1]))


def split_by_top_silences(wav_path: Path, n_parts: int, out_paths: list[Path]) -> None:
    """Encontra os n_parts-1 maiores silêncios internos no WAV e divide em n_parts arquivos exatos."""
    proc = subprocess.run(
        ["ffmpeg", "-i", str(wav_path), "-af", "silencedetect=n=-34dB:d=0.22", "-f", "null", "-"],
        capture_output=True,
        text=True,
        check=True,
    )
    dur_total = float(
        subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(wav_path)],
            text=True,
        ).strip()
    )
    silences = []
    cur_start = None
    for line in proc.stderr.splitlines():
        m_s = re.search(r"silence_start:\s*([0-9.]+)", line)
        m_e = re.search(r"silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)", line)
        if m_s:
            cur_start = float(m_s.group(1))
        elif m_e and cur_start is not None:
            end_t = float(m_e.group(1))
            sdur = float(m_e.group(2))
            # Ignora silêncios nas bordas extremas (0.5s início / fim)
            if cur_start > 1.5 and end_t < dur_total - 1.5:
                silences.append((sdur, (cur_start + end_t) / 2.0))
            cur_start = None

    if len(silences) < n_parts - 1:
        raise RuntimeError(f"Apenas {len(silences)} silêncios detectados em {wav_path.name} (precisa de {n_parts - 1})")

    # Seleciona os (n_parts - 1) maiores silêncios e ordena cronologicamente
    top_cuts = sorted([mid for _, mid in sorted(silences, key=lambda x: x[0], reverse=True)[: n_parts - 1]])
    bounds = [0.0, *top_cuts, dur_total]
    print(f"Cortes encontrados em {wav_path.name}: {[round(x, 2) for x in top_cuts]} (total {dur_total:.2f}s)")

    for i, out_p in enumerate(out_paths):
        ss = bounds[i]
        to = bounds[i + 1]
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(wav_path), "-ss", f"{ss:.3f}", "-to", f"{to:.3f}", str(out_p)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


def build_pitch_group(batch_scenes: list[dict], batch_name: str) -> None:
    batch_wav = RAW_DIR / f"{batch_name}.wav"
    raw_outs = [RAW_DIR / f"{s['id']}_raw.wav" for s in batch_scenes]
    if all(p.exists() and p.stat().st_size > 1000 for p in raw_outs):
        print(f"Batch {batch_name} já fatiado em cache.")
        return

    if not batch_wav.exists() or batch_wav.stat().st_size < 1000:
        content = []
        for idx, s in enumerate(batch_scenes):
            sep = " <long pause> <long pause> " if idx < len(batch_scenes) - 1 else ""
            content.append(
                {
                    "type": "text",
                    "text": s["text"] + sep,
                    "annotations": [{"type": "speech_metadata", "style": s["style"]}],
                }
            )
        print(f"Gerando {batch_name} ({len(batch_scenes)} cenas em 1 chamada lite-tts)...")
        synth_batch_lite(content, batch_wav)

    split_by_top_silences(batch_wav, len(batch_scenes), raw_outs)


if __name__ == "__main__":
    finalize_marketing()
    build_pitch_group(PITCH_SCENES[:4], "pitch_batch_1")
    time.sleep(3)
    build_pitch_group(PITCH_SCENES[4:], "pitch_batch_2")

    timings_pitch = []
    for s in PITCH_SCENES:
        raw_wav = RAW_DIR / f"{s['id']}_raw.wav"
        clean_wav = OUT_PITCH / f"{s['id']}.wav"
        dur = master_voice(raw_wav, clean_wav, tempo=1.06)
        frames = math.ceil(dur * 60)
        timings_pitch.append({"id": s["id"], "durationSec": round(dur, 3), "frames": frames})
        print(f"Pitch OK: {clean_wav.name} = {dur:.2f}s ({frames}f)")

    (ROOT / "src" / "timingsPitch.json").write_text(json.dumps(timings_pitch, indent=2), encoding="utf-8")
    print("Total fala Marketing:", round(sum(x["durationSec"] for x in json.loads((ROOT / "src" / "timingsMarketing.json").read_text())), 2), "s")
    print("Total fala Pitch:", round(sum(x["durationSec"] for x in timings_pitch), 2), "s")

