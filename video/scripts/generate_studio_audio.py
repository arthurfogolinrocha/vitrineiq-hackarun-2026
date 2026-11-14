#!/usr/bin/env python3
"""Gera locuções pt-BR expressivas (Gemini 3.8 Flash TTS) para Marketing (~78s) e Pitch Missão 3 (~105s) + trilha dark-tech 124 BPM."""

import base64
import json
import math
import os
import random
import struct
import subprocess
import time
import urllib.error
import urllib.request
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_MKT = ROOT / "public" / "audio_mkt"
OUT_PITCH = ROOT / "public" / "audio_pitch"
RAW_DIR = ROOT / "out" / "raw_studio_audio"
for d in (OUT_MKT, OUT_PITCH, RAW_DIR):
    d.mkdir(parents=True, exist_ok=True)

API_KEY = os.environ["GEMINI_API_KEY"]
VOICE_ID = "pt-br-commercial-5"

# ==============================================================================
# VIDEO 1: MARKETING VIRAL COMERCIAL 3D (~76s-82s) — Foco em atenção, dor, ROI
# ==============================================================================
MARKETING_SCENES = [
    {
        "id": "m01_hook",
        "text": "Cento e vinte e três pessoas passaram na sua vitrine agora... <short pause> e foram embora sem deixar rastro.",
        "style": "urgent high-stakes commercial hook, dynamic Brazilian founder voice, dramatic pause, crisp studio punch",
    },
    {
        "id": "m02_dor",
        "text": "No e-commerce, você mede cada clique. <short pause> Na loja física, você só descobre o prejuízo quando o caixa fecha vazio.",
        "style": "sharp contrasting storytelling, persuasive Brazilian Portuguese, authoritative clarity",
    },
    {
        "id": "m03_revelacao",
        "text": "Chegou o Vitrine I-Q. <short pause> O Google Analytics do varejo físico, construído em tempo real para o Capim Dourado.",
        "style": "bold keynote product reveal, inspiring warm confidence, modern Apple launch commercial energy",
    },
    {
        "id": "m04_cockpit_3d",
        "text": "Em uma única tela executiva, veja o I-Q Score, os horários de pico, o efeito do calor de Palmas <short pause> e um gêmeo digital em 3D dos dois pisos.",
        "style": "fast energetic product walkthrough, clear pronunciation, engaging modern tech tone",
    },
    {
        "id": "m05_crowddrop",
        "text": "Formou grupo na vitrine? <short pause> O Crowd-Drop acende o corredor em dourado e libera cupom progressivo instantâneo para puxar todo mundo pra dentro.",
        "style": "exciting momentum, high commercial enthusiasm, crisp storytelling emphasis",
    },
    {
        "id": "m06_raiox_lgpd",
        "text": "Com uma webcam comum processada só em memória — zero rostos gravados — e o Raio-X Gemini, você sabe exatamente o que ajustar na vitrine.",
        "style": "trustworthy B2B executive tone, crisp confident articulation, reassuring security clarity",
    },
    {
        "id": "m07_balcao_qr",
        "text": "No balcão, o vendedor grava a venda perdida por voz em quatro segundos. No celular do cliente, Concierge Q-R sem baixar app e sem C-P-F.",
        "style": "tight rhythmic showcase pace, vibrant engaging narration, crisp diction",
    },
    {
        "id": "m08_cta",
        "text": "Pare de perder vendas invisíveis. <short pause> Vitrine I-Q: quem enxerga o corredor antes do caixa, domina o shopping.",
        "style": "memorable authoritative commercial closing, calm power, unforgettable tagline finish",
    },
]

# ==============================================================================
# VIDEO 2: PITCH MISSÃO 3 (~105s / 1m45s) — Tudo o que o sistema tem + 9.8/10
# ==============================================================================
PITCH_SCENES = [
    {
        "id": "p01_dor",
        "text": "No Capim Dourado Shopping, cento e oitenta e oito lojas operam no escuro antes do caixa: ninguém sabe quantos passaram, pararam na vitrine ou por que saíram sem comprar.",
        "style": "sharp authoritative hackathon pitch opening, confident founder delivery, clear Brazilian Portuguese",
    },
    {
        "id": "p02_cockpit",
        "text": "Criamos o Vitrine I-Q. No Painel do Lojista, o I-Q Score cruza fluxo real, clima, horário de pico até vinte e duas horas e gera planos táticos e cartazes prontos com IA.",
        "style": "crisp energetic product demo narration, smooth flow, clear technical enthusiasm",
    },
    {
        "id": "p03_map3d",
        "text": "No Gêmeo Digital em 3D, navegamos pelos dois pisos, subsolo com trezentas e cinquenta vagas, portarias, Street View, espaços vagos e alianças estratégicas de corredor.",
        "style": "confident engaging narrator, dynamic pacing matching 3D tour flythrough",
    },
    {
        "id": "p04_visao_crowddrop",
        "text": "O Sensor Webcam roda na borda sem gravar rostos, o Raio-X Gemini audita a vitrine e o Crowd-Drop dispara descontos coletivos com Q-R Code ao vivo quando junta fluxo na porta.",
        "style": "excited breakthrough pitch tone, crisp highlight on AI and Crowd-Drop innovation",
    },
    {
        "id": "p05_balcao_concierge",
        "text": "No Modo Balcão, o vendedor registra a perda em um toque ou por voz em quatro segundos, até offline. E o visitante usa o Concierge Q-R sem aplicativo e sem C-P-F.",
        "style": "tight fast-paced demo narration, clear articulation, seamless rhythm",
    },
    {
        "id": "p06_stories_multitenant",
        "text": "Incorporamos nossa prática da Roleta no modal Stories, conectando as cinco User Stories às telas reais, com isolamento Multi-Tenant entre lojistas e administração do shopping.",
        "style": "structured, sharp engineering & product pitch delivery, trustworthy tone",
    },
    {
        "id": "p07_engenharia",
        "text": "Por trás, Fast-API em Python com espelho TypeScript, C-S-P estrita, E-Tag, SHA-256, cento e cinquenta e oito testes automatizados e nota nove ponto oito na auditoria, em conformidade com o Artigo seis.",
        "style": "authoritative senior engineering credibility, clean fast numbers delivery, impressive confidence",
    },
    {
        "id": "p08_fechamento",
        "text": "Vitrine I-Q: o Google Analytics do varejo físico, ao vivo na Vercel. Time Nido King: Arthur Fogolin, Jessé, Matheus Carvalho e Leonardo Capistrano. Primeiro HackaRun UniCatólica!",
        "style": "inspiring proud winning pitch closing, warm decisive energy, celebratory sign-off",
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
    for attempt in range(6):
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
            if exc.code == 429 and attempt < 5:
                wait = 10 + 10 * attempt
                print(f"  429 rate-limit em {out_wav.name}, aguardando {wait}s...")
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


def master_voice(raw_wav: Path, clean_wav: Path, tempo: float = 1.03) -> float:
    """Corta silêncio morto nas pontas, aplica presença vocal comercial e normaliza para -14 LUFS @ 48kHz."""
    af = (
        f"silenceremove=start_periods=1:start_duration=0.015:start_threshold=-45dB,"
        f"areverse,silenceremove=start_periods=1:start_duration=0.04:start_threshold=-45dB,areverse,"
        f"atempo={tempo:.3f},"
        f"highpass=f=82,lowpass=f=12500,"
        f"equalizer=f=3200:t=q:w=1.4:g=2.4,"
        f"acompressor=threshold=-16dB:ratio=3.0:attack=8:release=95,"
        f"loudnorm=I=-14:TP=-1.5:LRA=7"
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


def synth_studio_music(out_wav: Path, duration: float = 115.0) -> None:
    """Trilha dark-tech comercial 124 BPM full-spectrum (sub punchy, clap, hi-hats, Reese bass sidechain, chords e arpeggio)."""
    if out_wav.exists() and out_wav.stat().st_size > 1_000_000:
        print(f"Reaproveitando trilha existente: {out_wav.name}")
        return

    sr = 48000
    n_samples = int(sr * duration)
    bpm = 124.0
    beat_sec = 60.0 / bpm
    step_sec = beat_sec / 4.0  # 16th note
    rng = random.Random(2026)

    # Progressão cinematográfica Am - F - C - G (ciclo a cada 4 compassos)
    bass_prog = [55.00, 43.65, 65.41, 49.00]  # A1, F1, C2, G1
    chord_prog = [
        (220.00, 261.63, 329.63),  # Am
        (174.61, 220.00, 261.63),  # F
        (196.00, 261.63, 329.63),  # C
        (196.00, 246.94, 293.66),  # G
    ]
    arp_notes = [220.00, 329.63, 261.63, 392.00, 440.00, 329.63, 523.25, 392.00]

    # Pré-gera ruído branco determinístico curto e loopa para clap/hats (muito rápido em Python)
    noise_len = sr * 2
    noise_tbl = [rng.uniform(-1.0, 1.0) for _ in range(noise_len)]

    print(f"Sintetizando trilha studio 124 BPM ({duration:.0f}s)...")
    buf = bytearray(n_samples * 4)
    idx_out = 0
    for i in range(n_samples):
        t = i / sr
        beat_total = t / beat_sec
        beat_idx = int(beat_total)
        beat_pos = beat_total - beat_idx
        bar_idx = beat_idx // 4
        beat_in_bar = beat_idx % 4
        step_total = t / step_sec
        step_idx = int(step_total)
        step_pos = step_total - step_idx
        prog_idx = (bar_idx // 2) % 4

        # 1. Kick com clique agudo + sub-body profundo
        kick_freq = 40.0 + 95.0 * math.exp(-beat_pos * 34.0)
        kick_body = math.sin(2.0 * math.pi * kick_freq * (beat_pos * beat_sec)) * math.exp(-beat_pos * 10.0)
        kick_click = math.sin(2.0 * math.pi * 1650.0 * (beat_pos * beat_sec)) * math.exp(-beat_pos * 90.0) * 0.25
        kick = (kick_body * 0.65 + kick_click) * 0.85

        # 2. Sidechain natural para os synths cederem espaço para o kick
        sidechain = 1.0 - 0.72 * math.exp(-beat_pos * 8.5)

        # 3. Clap nos beats 2 e 4 (beat_in_bar 1 e 3)
        clap = 0.0
        if beat_in_bar in (1, 3) and beat_pos < 0.45:
            nt = noise_tbl[i % noise_len]
            prev_nt = noise_tbl[(i - 28) % noise_len]
            hp_nt = nt - prev_nt * 0.78
            clap = hp_nt * math.exp(-beat_pos * 22.0) * 0.24

        # 4. Crisp 16th Hi-Hat (aberto no "e", fechado nas semicolcheias)
        nt = noise_tbl[(i * 3) % noise_len]
        nt_p = noise_tbl[(i * 3 - 4) % noise_len]
        hat_noise = nt - nt_p
        hat_decay = 14.0 if (step_idx % 4 == 2) else 42.0
        hat_amp = 0.14 if (step_idx % 4 == 2) else (0.09 if step_idx % 2 == 0 else 0.05)
        hat = hat_noise * math.exp(-step_pos * hat_decay) * hat_amp

        # 5. Sub / Reese Bass quente em saw suave (3 harmônicos)
        bf = bass_prog[prog_idx]
        bass = (
            math.sin(2.0 * math.pi * bf * t) * 0.70
            + math.sin(2.0 * math.pi * bf * 2.0 * t) * 0.28
            + math.sin(2.0 * math.pi * bf * 3.0 * t) * 0.10
        ) * 0.26 * sidechain

        # 6. Pad harmônico estéreo largo
        c1, c2, c3 = chord_prog[prog_idx]
        pad_l = (
            math.sin(2.0 * math.pi * c1 * t)
            + math.sin(2.0 * math.pi * c2 * t * 1.003)
            + math.sin(2.0 * math.pi * c3 * t * 0.997)
        ) * 0.065 * sidechain
        pad_r = (
            math.sin(2.0 * math.pi * c1 * t * 0.998)
            + math.sin(2.0 * math.pi * c2 * t)
            + math.sin(2.0 * math.pi * c3 * t * 1.004)
        ) * 0.065 * sidechain

        # 7. Glass tech arpeggio com delay ping-pong leve
        af_note = arp_notes[step_idx % len(arp_notes)]
        arp_env = math.exp(-step_pos * 7.5) * (1.0 if step_idx % 2 == 0 else 0.55)
        arp_sig = (
            math.sin(2.0 * math.pi * af_note * t) * 0.7
            + math.sin(2.0 * math.pi * af_note * 2.0 * t) * 0.22
        ) * arp_env * 0.12 * sidechain
        pan = 0.5 + 0.35 * math.sin(step_idx * 1.1)

        # Fade suave nos primeiros 0.4s e últimos 2.2s
        fade = min(1.0, t / 0.35) * min(1.0, max(0.0, (duration - t) / 2.2))

        l = max(-0.96, min(0.96, (kick + clap * 0.92 + hat * 0.85 + bass + pad_l + arp_sig * (1.2 - pan)) * fade))
        r = max(-0.96, min(0.96, (kick + clap * 1.08 + hat * 1.15 + bass + pad_r + arp_sig * (0.2 + pan)) * fade))
        struct.pack_into("<hh", buf, idx_out, int(l * 32767), int(r * 32767))
        idx_out += 4

    tmp = RAW_DIR / "bed_studio_raw.wav"
    with wave.open(str(tmp), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(bytes(buf))

    subprocess.run(
        ["ffmpeg", "-y", "-i", str(tmp), "-af", "highpass=f=28,lowpass=f=13500,loudnorm=I=-21:TP=-2", str(out_wav)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def process_group(scenes: list[dict], out_dir: Path, json_out: Path, tempo: float) -> None:
    timings = []
    for s in scenes:
        raw_wav = RAW_DIR / f"{s['id']}_raw.wav"
        clean_wav = out_dir / f"{s['id']}.wav"
        if not raw_wav.exists() or raw_wav.stat().st_size < 1000:
            print(f"Gerando TTS ({s['id']}): {s['text'][:55]}...")
            call_gemini_tts(s["text"], s["style"], raw_wav)
            time.sleep(2.2)
        else:
            print(f"Cache raw usado: {raw_wav.name}")
        dur = master_voice(raw_wav, clean_wav, tempo=tempo)
        frames = math.ceil(dur * 60)
        timings.append({"id": s["id"], "durationSec": round(dur, 3), "frames": frames})
        print(f"  -> {clean_wav.name}: {dur:.2f}s ({frames} frames)")

    json_out.write_text(json.dumps(timings, indent=2), encoding="utf-8")
    total_speech = sum(t["durationSec"] for t in timings)
    print(f"Total locução em {json_out.name}: {total_speech:.2f}s\n")


if __name__ == "__main__":
    synth_studio_music(ROOT / "public" / "sfx" / "music_studio_124bpm.wav", duration=118.0)
    process_group(MARKETING_SCENES, OUT_MKT, ROOT / "src" / "timingsMarketing.json", tempo=1.04)
    process_group(PITCH_SCENES, OUT_PITCH, ROOT / "src" / "timingsPitch.json", tempo=1.06)
    print("OK — Todas as faixas de voz e trilha studio geradas!")

