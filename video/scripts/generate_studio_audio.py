#!/usr/bin/env python3
"""Gera locuções pt-BR de estúdio (Gemini TTS sem atempo acelerado) e trilha dark-tech 124 BPM com pocket EQ vocal."""

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
PROJECT_ROOT = ROOT.parent

for env_file in (PROJECT_ROOT / ".env", PROJECT_ROOT / "backend" / ".env", ROOT / ".env"):
    if env_file.exists():
        for raw_line in env_file.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip("\"'"))

OUT_MKT = ROOT / "public" / "audio_mkt"
OUT_PITCH = ROOT / "public" / "audio_pitch"
RAW_DIR = ROOT / "out" / "raw_studio_audio_v2"
for d in (OUT_MKT, OUT_PITCH, RAW_DIR):
    d.mkdir(parents=True, exist_ok=True)

API_KEY = os.environ["GEMINI_API_KEY"]
VOICE_38 = "pt-br-commercial-5"
VOICE_31 = "Charon"

# ==============================================================================
# VIDEO 1: MARKETING VIRAL COMERCIAL 3D (~78s-86s) — Zero abreviacoes ambiguas
# ==============================================================================
MARKETING_SCENES = [
    {
        "id": "m01_hook",
        "text": "Cento e vinte e três pessoas passaram na sua vitrine agora... e foram embora sem deixar nenhum rastro.",
        "style": "urgent high-stakes commercial hook, dynamic Brazilian founder voice, clear pause, crisp studio punch",
    },
    {
        "id": "m02_dor",
        "text": "No digital, você mede cada clique. Na loja física, só descobre o prejuízo quando o caixa fecha vazio.",
        "style": "sharp contrasting storytelling, persuasive Brazilian Portuguese, authoritative clarity",
    },
    {
        "id": "m03_revelacao",
        "text": "Chegou o Vitrine Í-Quê. O Google Analytics do varejo físico, construído em tempo real para o Capim Dourado Shopping.",
        "style": "bold keynote product reveal, inspiring warm confidence, modern Apple launch commercial energy",
    },
    {
        "id": "m04_cockpit_3d",
        "text": "Em uma única tela executiva, veja o Í-Quê Score, os horários de pico, o efeito do calor de Palmas, e um gêmeo digital em 3D dos dois pisos e do subsolo.",
        "style": "energetic product walkthrough, unhurried clear pronunciation, engaging modern tech tone",
    },
    {
        "id": "m05_crowddrop",
        "text": "Juntou gente na vitrine? O Crowd-Drop acende o corredor em dourado e libera cupom progressivo no telão para puxar todo mundo para dentro.",
        "style": "exciting momentum, high commercial enthusiasm, crisp storytelling emphasis",
    },
    {
        "id": "m06_raiox_lgpd",
        "text": "Com uma webcam comum processada só em memória — zero rostos gravados — e o Raio-X Gemini, você descobre na hora o que ajustar na vitrine.",
        "style": "trustworthy B2B executive tone, crisp confident articulation, reassuring security clarity",
    },
    {
        "id": "m07_balcao_qr",
        "text": "No balcão, o vendedor grava a venda perdida por voz em quatro segundos. No celular do cliente, Concierge Quê-Érre Code sem baixar aplicativo e sem pedir C-P-F.",
        "style": "tight rhythmic showcase pace, vibrant engaging narration, crisp diction",
    },
    {
        "id": "m08_cta",
        "text": "Pare de perder vendas invisíveis. Vitrine Í-Quê: quem enxerga o corredor antes do caixa, domina o shopping.",
        "style": "memorable authoritative commercial closing, calm power, unforgettable tagline finish",
    },
]

# ==============================================================================
# VIDEO 2: PITCH MISSÃO 3 (~95s-108s) — Tudo do sistema, 356 vagas, Artigo 6 LGPD
# ==============================================================================
PITCH_SCENES = [
    {
        "id": "p01_dor",
        "text": "No Capim Dourado Shopping, cento e oitenta e oito lojas operam no escuro antes do caixa. Ninguém sabe quantos passaram, pararam na vitrine, ou por que saíram sem comprar.",
        "style": "sharp authoritative hackathon pitch opening, confident founder delivery, clear Brazilian Portuguese",
    },
    {
        "id": "p02_cockpit",
        "text": "Criamos o Vitrine Í-Quê. No Painel do Lojista, o Í-Quê Score cruza fluxo real, clima, horário de pico até vinte e duas horas e gera planos táticos e cartazes em Stories com inteligência artificial.",
        "style": "crisp energetic product demo narration, smooth flow, clear technical enthusiasm",
    },
    {
        "id": "p03_map3d",
        "text": "No Gêmeo Digital em 3D, navegamos pelos dois pisos, subsolo com trezentas e cinquenta e seis vagas, quatro portarias, Street View, espaços vagos e alianças de corredor.",
        "style": "confident engaging narrator, dynamic pacing matching 3D tour flythrough",
    },
    {
        "id": "p04_visao_crowddrop",
        "text": "O Sensor Webcam roda na borda sem gravar rostos, o Raio-X Gemini audita a vitrine e o Crowd-Drop dispara descontos coletivos com Quê-Érre Code ao vivo quando junta fluxo na porta.",
        "style": "excited breakthrough pitch tone, crisp highlight on AI and Crowd-Drop innovation",
    },
    {
        "id": "p05_balcao_concierge",
        "text": "No Modo Balcão, o vendedor registra a perda em um toque ou por voz em quatro segundos, mesmo offline. E o visitante usa o Concierge Quê-Érre Code sem aplicativo e sem C-P-F.",
        "style": "tight demo narration, clear articulation, seamless rhythm",
    },
    {
        "id": "p06_stories_multitenant",
        "text": "Incorporamos nossa prática da Roleta no modal Stories, conectando as cinco User Stories às telas reais, com isolamento Multi-Tenant entre contas de lojistas e administração.",
        "style": "structured, sharp engineering & product pitch delivery, trustworthy tone",
    },
    {
        "id": "p07_engenharia",
        "text": "Por trás, backend Python com Fast, A-P-I, espelho TypeScript, C-S-P estrita, E-Tag, hash S-H-A duzentos e cinquenta e seis, cento e cinquenta e oito testes, e nota nove ponto oito na auditoria, em conformidade com o Artigo seis da L-G-P-D.",
        "style": "authoritative senior engineering credibility, clean articulated numbers delivery, impressive confidence",
    },
    {
        "id": "p08_fechamento",
        "text": "Vitrine Í-Quê: o Google Analytics do varejo físico, ao vivo na Vercel. Time Nido King: Arthur Fogolin, Jé-ssé, Matheus Carvalho e Leonardo Capistrano. Primeiro HackaRun UniCatólica!",
        "style": "inspiring proud winning pitch closing, warm decisive energy, celebratory sign-off",
    },
]


def save_pcm_as_wav(pcm_bytes: bytes, out_wav: Path, sample_rate: int = 24000) -> None:
    with wave.open(str(out_wav), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_bytes)


def call_gemini_38_tts(text: str, style: str, out_wav: Path) -> bool:
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
        "generation_config": {"speech_config": [{"voice": VOICE_38}]},
    }
    req = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"x-goog-api-key": API_KEY, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
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
        if chunks:
            out_wav.write_bytes(base64.b64decode(chunks[-1]))
            return True
    except Exception as exc:
        print(f"  [3.8-tts fallback -> 3.1-tts] {out_wav.name}: {exc}")
    return False


def call_gemini_31_tts(text: str, out_wav: Path) -> None:
    # Mantém voz consistente (Charon) em pt-BR nativo sem instrução lida em voz alta
    for attempt in range(5):
        req = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key={API_KEY}",
            data=json.dumps({
                "contents": [{"parts": [{"text": text}]}],
                "generationConfig": {
                    "responseModalities": ["AUDIO"],
                    "speechConfig": {
                        "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE_31}}
                    },
                },
            }).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            b64 = data["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
            save_pcm_as_wav(base64.b64decode(b64), out_wav, sample_rate=24000)
            return
        except urllib.error.HTTPError as exc:
            if exc.code in (429, 503) and attempt < 4:
                wait = 8 + 8 * attempt
                print(f"  Rate-limit/503 ({exc.code}) em {out_wav.name}, aguardando {wait}s...")
                time.sleep(wait)
                continue
            raise


def synthesize_tts(text: str, style: str, out_wav: Path, prefer_38: bool) -> None:
    if prefer_38 and call_gemini_38_tts(text, style, out_wav):
        return
    call_gemini_31_tts(text, out_wav)


def master_voice(raw_wav: Path, clean_wav: Path, tempo: float = 1.0) -> float:
    """Preserva transientes das consoantes (pad 120ms mono + fades), remove sibilância e normaliza a -14 LUFS."""
    tempo_filter = f"atempo={tempo:.3f}," if abs(tempo - 1.0) > 0.005 else ""
    # Passo 1: limpa pontas silenciosas sem inverter com afade bugado, EQ + compressor + loudnorm
    step1 = clean_wav.with_suffix(".tmp1.wav")
    af1 = (
        "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-52dB,"
        "areverse,silenceremove=start_periods=1:start_duration=0.04:start_threshold=-52dB,areverse,"
        f"{tempo_filter}"
        "highpass=f=82,lowpass=f=12800,"
        "equalizer=f=3000:t=q:w=1.3:g=2.0,"
        "equalizer=f=6800:t=q:w=2.0:g=-2.8,"
        "acompressor=threshold=-16dB:ratio=2.8:attack=10:release=110,"
        "loudnorm=I=-14:TP=-1.5:LRA=7"
    )
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(raw_wav), "-af", af1, "-ar", "48000", "-ac", "1", str(step1)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    dur1 = float(
        subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(step1)],
            text=True,
        ).strip()
    )
    # Passo 2: fades suaves + 120ms respiro inicial + 140ms respiro final (sem areverse+afade)
    fade_out_start = max(0.05, dur1 - 0.035)
    af2 = f"afade=t=in:st=0:d=0.02,afade=t=out:st={fade_out_start:.3f}:d=0.035,adelay=120,apad=pad_dur=0.14"
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(step1), "-af", af2, "-ar", "48000", "-ac", "1", str(clean_wav)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    step1.unlink(missing_ok=True)

    # Gate obrigatório contra silêncio acidental
    vol = subprocess.run(
        ["ffmpeg", "-i", str(clean_wav), "-af", "volumedetect", "-f", "null", "-"],
        capture_output=True,
        text=True,
    ).stderr
    mean_db = None
    for line in vol.splitlines():
        if "mean_volume:" in line:
            mean_db = float(line.split("mean_volume:")[1].split("dB")[0].strip())
    if mean_db is None or mean_db < -30.0:
        raise RuntimeError(f"Áudio inválido/silencioso em {clean_wav.name}: mean_volume={mean_db} dB")

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


def synth_studio_music(out_wav: Path, duration: float = 122.0) -> None:
    """Gera trilha dark-tech 124 BPM com ducking rítmico e recorte EQ de -4.5 dB em 2.2 kHz (pocket vocal)."""
    sr = 48000
    bpm = 124.0
    beat_sec = 60.0 / bpm
    step_sec = beat_sec / 4.0
    total_samples = int(duration * sr)

    chord_prog = [
        (174.61, 207.65, 261.63),
        (138.59, 174.61, 207.65),
        (207.65, 261.63, 311.13),
        (155.56, 196.00, 233.08),
    ]
    bass_prog = [43.65, 34.65, 51.91, 38.89]
    arp_notes = [349.23, 415.30, 523.25, 622.25, 523.25, 415.30, 698.46, 523.25]

    rng = random.Random(20261114)
    noise_len = 8192
    noise_tbl = [rng.uniform(-1.0, 1.0) for _ in range(noise_len)]

    buf = bytearray(total_samples * 4)
    idx_out = 0

    for i in range(total_samples):
        t = i / sr
        beat_idx = int(t / beat_sec)
        beat_pos = (t % beat_sec) / beat_sec
        step_idx = int(t / step_sec)
        step_pos = (t % step_sec) / step_sec
        prog_idx = (beat_idx // 4) % 4

        sidechain = 0.30 + 0.70 * min(1.0, beat_pos * 2.1)

        k_env = math.exp(-beat_pos * 13.5)
        k_freq = 44.0 + 110.0 * math.exp(-beat_pos * 34.0)
        kick = math.sin(2.0 * math.pi * k_freq * t) * k_env * 0.42

        clap = 0.0
        if beat_idx % 2 == 1 and beat_pos < 0.25:
            nt = noise_tbl[i % noise_len]
            prev_nt = noise_tbl[(i - 28) % noise_len]
            clap = (nt - prev_nt * 0.78) * math.exp(-beat_pos * 22.0) * 0.22

        nt = noise_tbl[(i * 3) % noise_len]
        nt_p = noise_tbl[(i * 3 - 4) % noise_len]
        hat_noise = nt - nt_p
        hat_decay = 14.0 if (step_idx % 4 == 2) else 42.0
        hat_amp = 0.13 if (step_idx % 4 == 2) else (0.08 if step_idx % 2 == 0 else 0.045)
        hat = hat_noise * math.exp(-step_pos * hat_decay) * hat_amp

        bf = bass_prog[prog_idx]
        bass = (
            math.sin(2.0 * math.pi * bf * t) * 0.70
            + math.sin(2.0 * math.pi * bf * 2.0 * t) * 0.28
            + math.sin(2.0 * math.pi * bf * 3.0 * t) * 0.10
        ) * 0.24 * sidechain

        c1, c2, c3 = chord_prog[prog_idx]
        pad_l = (
            math.sin(2.0 * math.pi * c1 * t)
            + math.sin(2.0 * math.pi * c2 * t * 1.003)
            + math.sin(2.0 * math.pi * c3 * t * 0.997)
        ) * 0.06 * sidechain
        pad_r = (
            math.sin(2.0 * math.pi * c1 * t * 0.998)
            + math.sin(2.0 * math.pi * c2 * t)
            + math.sin(2.0 * math.pi * c3 * t * 1.004)
        ) * 0.06 * sidechain

        af_note = arp_notes[step_idx % len(arp_notes)]
        arp_env = math.exp(-step_pos * 7.5) * (1.0 if step_idx % 2 == 0 else 0.55)
        arp_sig = (
            math.sin(2.0 * math.pi * af_note * t) * 0.7
            + math.sin(2.0 * math.pi * af_note * 2.0 * t) * 0.22
        ) * arp_env * 0.11 * sidechain
        pan = 0.5 + 0.35 * math.sin(step_idx * 1.1)

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
        [
            "ffmpeg",
            "-y",
            "-i",
            str(tmp),
            "-af",
            "highpass=f=32,lowpass=f=13500,equalizer=f=2200:t=q:w=1.0:g=-4.5,loudnorm=I=-22:TP=-2",
            str(out_wav),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def process_group(scenes: list[dict], out_dir: Path, json_out: Path, prefer_38: bool) -> None:
    timings = []
    for s in scenes:
        raw_wav = RAW_DIR / f"{s['id']}_raw.wav"
        clean_wav = out_dir / f"{s['id']}.wav"
        if not raw_wav.exists() or raw_wav.stat().st_size < 1000:
            print(f"Gerando TTS ({s['id']}): {s['text'][:60]}...")
            synthesize_tts(s["text"], s["style"], raw_wav, prefer_38=prefer_38)
            time.sleep(2.5)
        else:
            print(f"Cache raw v2 usado: {raw_wav.name}")
        dur = master_voice(raw_wav, clean_wav, tempo=1.0)
        frames = math.ceil(dur * 60)
        timings.append({"id": s["id"], "durationSec": round(dur, 3), "frames": frames})
        print(f"  -> {clean_wav.name}: {dur:.2f}s ({frames} frames)")

    json_out.write_text(json.dumps(timings, indent=2), encoding="utf-8")
    total_speech = sum(t["durationSec"] for t in timings)
    print(f"Total locução em {json_out.name}: {total_speech:.2f}s\n")


if __name__ == "__main__":
    # Mantém uniformidade de voz: só faz probe se precisar gerar algum _raw.wav novo
    missing = [
        s["id"]
        for s in (MARKETING_SCENES + PITCH_SCENES)
        if not (RAW_DIR / f"{s['id']}_raw.wav").exists()
        or (RAW_DIR / f"{s['id']}_raw.wav").stat().st_size < 1000
    ]
    use_38 = False
    if missing:
        probe_wav = RAW_DIR / "_probe38.wav"
        use_38 = call_gemini_38_tts("Vitrine Í-Quê.", "crisp Brazilian Portuguese", probe_wav)
        print(f"Voz selecionada para cenas faltantes ({len(missing)}): {'gemini-3.8-flash-tts' if use_38 else 'gemini-3.1-flash-tts-preview (Charon)'}")
    else:
        print("Todas as 16 faixas raw v2 já existem em cache — remasterizando com gate de volume!")

    music_wav = ROOT / "public" / "sfx" / "music_studio_124bpm.wav"
    if not music_wav.exists() or music_wav.stat().st_size < 100000:
        synth_studio_music(music_wav, duration=124.0)
    process_group(MARKETING_SCENES, OUT_MKT, ROOT / "src" / "timingsMarketing.json", prefer_38=use_38)
    process_group(PITCH_SCENES, OUT_PITCH, ROOT / "src" / "timingsPitch.json", prefer_38=use_38)
    print("OK — Todas as faixas v2 de voz (tempo 1.0x) e trilha studio geradas e verificadas!")
