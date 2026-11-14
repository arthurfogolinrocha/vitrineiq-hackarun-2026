#!/usr/bin/env python3
"""Gera locução humana em pt-BR (Gemini 3.8 Flash TTS), trilha dark-tech 120 BPM e SFX masterizados em -14 LUFS / 48 kHz."""

import base64
import json
import math
import os
import struct
import subprocess
import time
import urllib.error
import urllib.request
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_AUDIO = ROOT / "public" / "audio"
RAW_AUDIO = ROOT / "out" / "raw_audio"
PUBLIC_AUDIO.mkdir(parents=True, exist_ok=True)
RAW_AUDIO.mkdir(parents=True, exist_ok=True)

API_KEY = os.environ["GEMINI_API_KEY"]
VOICE_ID = "pt-br-commercial-5"

# Roteiro comercial de 60s (7 blocos cirúrgicos — máx ~15 palavras por cena para respiro visual)
SCENES = [
    {
        "id": "01_hook",
        "text": "Cento e oitenta e oito lojas... <short pause> e ZERO dados antes do caixa.",
        "style": "cinematic Brazilian commercial narrator, deep intrigue, crisp diction, deliberate pacing",
    },
    {
        "id": "02_dor",
        "text": "Milhares passam pela vitrine do Capim Dourado todos os dias — e ninguém sabe por que não entraram.",
        "style": "confident documentary storytelling, warm Brazilian Portuguese, natural conversational flow",
    },
    {
        "id": "03_revelacao",
        "text": "Apresentamos o Vitrine I-Q. <short pause> Inteligência espacial em 3D para o varejo físico.",
        "style": "authoritative tech launch keynote narrator, inspiring, clean emphasis on product reveal",
    },
    {
        "id": "04_raiox_lgpd",
        "text": "Uma webcam comum, com borramento L-G-P-D em memória e Raio-X Gemini, mede atenção na vitrine sem gravar rostos.",
        "style": "clear, trustworthy B2B SaaS narrator, crisp articulation, confident pace",
    },
    {
        "id": "05_crowddrop",
        "text": "Juntou gente na porta? <short pause> O Crowd-Drop acende o mapa em dourado e dispara desconto coletivo na hora.",
        "style": "energetic, building momentum, exciting retail breakthrough tone",
    },
    {
        "id": "06_concierge_balcao",
        "text": "No celular, Concierge Q-R sem C-P-F. No balcão, perda registrada por voz em quatro segundos.",
        "style": "tight rhythmic product showcase pace, crisp pronunciation, engaging",
    },
    {
        "id": "07_cta",
        "text": "Vitrine I-Q. <short pause> O Google Analytics do varejo físico — pronto para transformar fluxo em vendas.",
        "style": "calm, grounded, memorable Apple-style closing commercial statement",
    },
]


def call_gemini_tts(text: str, style: str, out_wav: Path) -> None:
    payload = {
        "model": "gemini-3.8-flash-tts",
        "input": [
            {
                "type": "user_input",
                "content": [
                    {
                        "type": "text",
                        "text": text,
                        "annotations": [{"type": "speech_metadata", "style": style}],
                    }
                ],
            }
        ],
        "response_format": {"type": "audio"},
        "generation_config": {"speech_config": [{"voice": VOICE_ID}]},
    }
    for attempt in range(5):
        req = urllib.request.Request(
            "https://generativelanguage.googleapis.com/v1beta/interactions",
            data=json.dumps(payload).encode("utf-8"),
            headers={"x-goog-api-key": API_KEY, "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as exc:
            if exc.code == 429 and attempt < 4:
                wait = 12 * (attempt + 1)
                print(f"  429 rate-limit, aguardando {wait}s...")
                time.sleep(wait)
                continue
            raise
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
        raise RuntimeError(f"Sem audio retornado para {out_wav.name}: {data}")
    out_wav.write_bytes(base64.b64decode(chunks[-1]))


def master_voice(raw_wav: Path, clean_wav: Path) -> float:
    """Remove silêncio excessivo nas pontas, aplica EQ/compressão limpa e normaliza para -14 LUFS @ 48kHz."""
    af = (
        "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-45dB,"
        "areverse,silenceremove=start_periods=1:start_duration=0.05:start_threshold=-45dB,areverse,"
        "highpass=f=85,lowpass=f=11000,"
        "acompressor=threshold=-18dB:ratio=2.8:attack=12:release=120,"
        "loudnorm=I=-14:TP=-1.5:LRA=8"
    )
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(raw_wav), "-af", af, "-ar", "48000", "-ac", "1", str(clean_wav)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(clean_wav),
        ],
        text=True,
    ).strip()
    return float(out)


def synth_music_bed(out_wav: Path, duration: float = 60.0) -> None:
    """Sintetiza beat dark-tech minimalista 120 BPM determinístico (sub kick + arpeggio D menor + pad quente) em 48kHz stereo."""
    sr = 48000
    n_samples = int(sr * duration)
    bpm = 120.0
    beat_sec = 60.0 / bpm
    step_sec = beat_sec / 4.0  # colcheia dupla (16th notes)
    # D menor pentatônico (Hz): D3, F3, G3, A3, C4, D4
    arp_notes = [146.83, 220.00, 174.61, 261.63, 196.00, 293.66, 220.00, 349.23]
    buf = bytearray()
    for i in range(n_samples):
        t = i / sr
        beat_pos = (t % beat_sec) / beat_sec
        step_idx = int(t / step_sec)
        step_pos = (t % step_sec) / step_sec

        # Sub-kick limpo (4x4 nos beats)
        kick_freq = 44.0 + 75.0 * math.exp(-beat_pos * 28.0)
        kick_env = math.exp(-beat_pos * 10.5)
        kick = math.sin(2 * math.pi * kick_freq * (t % beat_sec)) * kick_env * 0.42

        # Bassline pulsante off-beat
        off_pos = ((t + beat_sec * 0.5) % beat_sec) / beat_sec
        bass_f = 73.42 if (int(t / (beat_sec * 4)) % 2 == 0) else 65.41  # D2 -> C2
        bass = (
            math.sin(2 * math.pi * bass_f * t) * 0.7
            + math.sin(2 * math.pi * bass_f * 2 * t) * 0.25
        ) * math.exp(-off_pos * 5.0) * 0.24

        # Pad atmosférico quente
        pad = (
            math.sin(2 * math.pi * 146.83 * t) * 0.10
            + math.sin(2 * math.pi * 220.00 * t + 0.4) * 0.08
            + math.sin(2 * math.pi * 261.63 * t + 0.8) * 0.06
        ) * (0.75 + 0.25 * math.sin(2 * math.pi * 0.125 * t))

        # Pluck minimalista tipo Linear/Apple
        note_f = arp_notes[step_idx % len(arp_notes)]
        pluck_env = math.exp(-step_pos * 8.0) * (1.0 if step_idx % 2 == 0 else 0.45)
        pluck = (
            math.sin(2 * math.pi * note_f * t)
            + 0.35 * math.sin(2 * math.pi * note_f * 2 * t)
        ) * pluck_env * 0.095

        # Build / fade in-out nas pontas
        fade = min(1.0, t / 1.2) * min(1.0, (duration - t) / 1.8)
        l = max(-0.95, min(0.95, (kick + bass + pad + pluck) * fade))
        r = max(-0.95, min(0.95, (kick + bass + pad * 0.96 + pluck * 1.04) * fade))
        buf.extend(struct.pack("<hh", int(l * 32767), int(r * 32767)))

    tmp = RAW_AUDIO / "bed_raw.wav"
    with wave.open(str(tmp), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(bytes(buf))
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(tmp), "-af", "lowpass=f=4800,loudnorm=I=-26:TP=-3", str(out_wav)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def synth_sfx() -> None:
    """Gera SFX cirúrgicos determinísticos (sub_drop, whoosh, chime, scan_ping, click) em 48kHz."""
    sr = 48000

    def write_mono(path: Path, samples: list[float]) -> None:
        with wave.open(str(path), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sr)
            wf.writeframes(b"".join(struct.pack("<h", int(max(-0.98, min(0.98, s)) * 32767)) for s in samples))

    # 1. sub_drop (0.9s)
    write_mono(
        PUBLIC_AUDIO / "sfx_sub_drop.wav",
        [
            math.sin(2 * math.pi * (88.0 * math.exp(-3.2 * (i / sr)) + 34.0) * (i / sr))
            * math.exp(-3.4 * (i / sr))
            * min(1.0, i / (sr * 0.012))
            * 0.85
            for i in range(int(sr * 0.9))
        ],
    )

    # 2. whoosh filtrado (0.42s)
    import random
    rng = random.Random(42)
    raw_whoosh = [
        (rng.uniform(-1, 1) * 0.55 + math.sin(2 * math.pi * 160 * (i / sr)) * 0.3)
        * math.sin(math.pi * (i / (sr * 0.42))) ** 1.6
        for i in range(int(sr * 0.42))
    ]
    tmp_w = RAW_AUDIO / "whoosh_raw.wav"
    write_mono(tmp_w, raw_whoosh)
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(tmp_w), "-af", "bandpass=f=680:width_type=h:w=700,volume=0.9", str(PUBLIC_AUDIO / "sfx_whoosh.wav")],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # 3. gold_chime (0.85s) — Crowd-Drop / QR reveal
    write_mono(
        PUBLIC_AUDIO / "sfx_chime.wav",
        [
            (
                math.sin(2 * math.pi * 880.0 * (i / sr)) * 0.45
                + math.sin(2 * math.pi * 1318.51 * (i / sr)) * 0.35
                + math.sin(2 * math.pi * 1760.0 * (i / sr)) * 0.20
            )
            * math.exp(-4.5 * (i / sr))
            * min(1.0, i / (sr * 0.008))
            * 0.72
            for i in range(int(sr * 0.85))
        ],
    )

    # 4. ui_click (0.09s)
    write_mono(
        PUBLIC_AUDIO / "sfx_click.wav",
        [
            math.sin(2 * math.pi * 1450.0 * (i / sr)) * math.exp(-55.0 * (i / sr)) * 0.55
            for i in range(int(sr * 0.09))
        ],
    )


def main() -> None:
    timings = []
    for scene in SCENES:
        raw_wav = RAW_AUDIO / f"{scene['id']}_raw.wav"
        clean_wav = PUBLIC_AUDIO / f"{scene['id']}.wav"
        if clean_wav.exists() and clean_wav.stat().st_size > 8000:
            dur = float(
                subprocess.check_output(
                    [
                        "ffprobe",
                        "-v",
                        "error",
                        "-show_entries",
                        "format=duration",
                        "-of",
                        "default=noprint_wrappers=1:nokey=1",
                        str(clean_wav),
                    ],
                    text=True,
                ).strip()
            )
            print(f"Reaproveitando TTS existente: {clean_wav.name} ({dur:.2f}s)")
        else:
            print(f"Gerando TTS Gemini 3.8 Flash: {scene['id']}...")
            call_gemini_tts(scene["text"], scene["style"], raw_wav)
            dur = master_voice(raw_wav, clean_wav)
            print(f"  -> {clean_wav.name}: {dur:.2f}s ({math.ceil(dur * 60)} frames)")
        timings.append({"id": scene["id"], "durationSec": round(dur, 3), "frames": math.ceil(dur * 60)})

    print("Gerando trilha dark-tech 120 BPM...")
    synth_music_bed(PUBLIC_AUDIO / "music_bed.wav", duration=62.0)
    print("Gerando micro-SFX determinísticos...")
    synth_sfx()
    (ROOT / "src" / "audioTimings.json").write_text(json.dumps(timings, indent=2), encoding="utf-8")
    print("Concluído! Timings salvos em src/audioTimings.json")


if __name__ == "__main__":
    main()
