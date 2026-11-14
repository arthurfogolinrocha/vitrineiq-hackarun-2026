"""Telemetria de contexto externo (clima, calendário, cinema e eventos) para o VitrineIQ.

Fontes públicas gratuitas (sem chave de API) com cache em memória e fallback seguro:
- Clima de Palmas-TO: Open-Meteo API
- Feriados nacionais e 5º dia útil: BrasilAPI Feriados
- Eventos ativos e programação Cinemark: capimdouradosc.com.br
"""

from __future__ import annotations

import html as html_lib
import re
import threading
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any, Callable, Optional
from zoneinfo import ZoneInfo

import httpx

from .engine import MallEvent, TimeSlot, Weather

PALMAS_LAT = -10.1689
PALMAS_LON = -48.3317
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
BRASIL_API_HOLIDAYS_URL = "https://brasilapi.com.br/api/feriados/v1/{year}"
CAPIM_DOURADO_EVENTS_URL = "https://www.capimdouradosc.com.br/eventos"
CAPIM_DOURADO_CINEMA_URL = "https://www.capimdouradosc.com.br/cinema"

WEATHER_TTL_SECONDS = 900.0
HOLIDAYS_TTL_SECONDS = 86400.0
MALL_SITE_TTL_SECONDS = 3600.0
HTTP_TIMEOUT_SECONDS = 3.5

_USER_AGENT = "VitrineIQ-Contexto/1.0 (+https://vitrineiq-capim-dourado.vercel.app)"
_EVENT_CARD_RE = re.compile(r'<div class="p-t-5 bold text-center">\s*(.*?)\s*</div>', re.S)
_MOVIE_TITLE_RE = re.compile(
    r'cineticket\.com\.br/asset/movie/[^"]+"[^>]*title="([^"]+)"',
    re.I,
)


@dataclass
class _CacheEntry:
    value: Any
    expires_at: float


_lock = threading.Lock()
_cache: dict[str, _CacheEntry] = {}


def clear_context_cache() -> None:
    """Limpa o cache em memória (usado principalmente em testes)."""
    with _lock:
        _cache.clear()


def _cache_get(key: str, now_mono: float) -> Optional[Any]:
    with _lock:
        entry = _cache.get(key)
        if entry and entry.expires_at > now_mono:
            return entry.value
    return None


def _cache_set(key: str, value: Any, ttl: float, now_mono: float) -> None:
    with _lock:
        _cache[key] = _CacheEntry(value=value, expires_at=now_mono + ttl)


def palmas_now() -> datetime:
    """Retorna data/hora atual no fuso de Palmas-TO (America/Araguaina, UTC-3)."""
    try:
        tz = ZoneInfo("America/Araguaina")
    except Exception:
        tz = timezone(timedelta(hours=-3))
    return datetime.now(tz)


def describe_wmo_code(code: Optional[int]) -> str:
    """Traduz código meteorológico WMO para descrição concisa em português."""
    if code is None:
        return "Clima estimado"
    if code == 0:
        return "Céu limpo"
    if code in (1, 2, 3):
        return "Parcialmente nublado"
    if code in (45, 48):
        return "Neblina"
    if 51 <= code <= 57:
        return "Garoa"
    if (61 <= code <= 67) or (80 <= code <= 82):
        return "Chuva"
    if 95 <= code <= 99:
        return "Tempestade"
    return "Tempo instável"


def classify_weather(
    temp_c: Optional[float],
    precipitation_mm: Optional[float],
    weather_code: Optional[int],
) -> Weather:
    """Converte telemetria da Open-Meteo na categoria usada pelo motor de Score."""
    if (weather_code is not None and 51 <= weather_code <= 99) or (
        precipitation_mm is not None and precipitation_mm >= 0.5
    ):
        return "chuva_forte"
    if temp_c is not None and temp_c >= 33.0:
        return "calor_38c"
    return "ameno"


def determine_time_slot(now_dt: datetime) -> TimeSlot:
    """Mapeia o horário local de Palmas-TO para a faixa horária do cockpit."""
    hour = now_dt.hour
    if hour < 12:
        return "manha"
    if hour < 15:
        return "almoco"
    if hour < 19:
        return "pos_trabalho"
    return "pos_cinema_20h"


def is_payment_window(
    today_date: date,
    holiday_dates: set[date],
    max_business_day: int = 5,
) -> bool:
    """Retorna True se `today_date` estiver entre o 1º e o 5º dia útil do mês."""
    if today_date.weekday() >= 5 or today_date in holiday_dates:
        return False
    business_days = 0
    for day in range(1, today_date.day + 1):
        candidate = date(today_date.year, today_date.month, day)
        if candidate.weekday() < 5 and candidate not in holiday_dates:
            business_days += 1
    return 1 <= business_days <= max_business_day


def determine_mall_event(
    now_dt: datetime,
    holiday_map: dict[date, str],
    cinema_movies: list[str],
) -> tuple[MallEvent, str, Optional[str]]:
    """Infere o gatilho dominante do shopping combinando calendário, feriados e Cinemark."""
    today = now_dt.date()
    holiday_name = holiday_map.get(today)
    if holiday_name:
        return ("fim_de_semana", f"Feriado nacional: {holiday_name}", holiday_name)
    if now_dt.weekday() >= 5:
        return ("fim_de_semana", "Movimento de fim de semana no shopping", None)
    if is_payment_window(today, set(holiday_map.keys())):
        return ("dia_pagamento", "Janela salarial (até o 5º dia útil)", None)
    if now_dt.weekday() == 3 or (cinema_movies and now_dt.hour >= 18):
        reason = (
            "Quinta de estreias no Cinemark Capim Dourado"
            if now_dt.weekday() == 3
            else f"Sessões noturnas no Cinemark ({len(cinema_movies)} filmes em cartaz)"
        )
        return ("estreia_cinemark", reason, None)
    return ("fluxo_normal", "Dia útil em operação padrão", None)


def parse_events_html(raw_html: str) -> list[str]:
    """Extrai os títulos dos eventos publicados em capimdouradosc.com.br/eventos."""
    seen: list[str] = []
    for match in _EVENT_CARD_RE.findall(raw_html):
        title = html_lib.unescape(re.sub(r"<[^>]+>|\s+", " ", match)).strip()
        if title and title not in seen:
            seen.append(title)
    return seen


def parse_cinema_html(raw_html: str) -> list[str]:
    """Extrai os filmes em cartaz publicados em capimdouradosc.com.br/cinema."""
    seen: list[str] = []
    for match in _MOVIE_TITLE_RE.findall(raw_html):
        title = html_lib.unescape(re.sub(r"\s+", " ", match)).strip()
        if title and title not in seen:
            seen.append(title)
    return seen


def _fetch_palmas_weather(client: httpx.Client) -> dict[str, Any]:
    res = client.get(
        OPEN_METEO_URL,
        params={
            "latitude": PALMAS_LAT,
            "longitude": PALMAS_LON,
            "current": "temperature_2m,precipitation,weather_code",
            "timezone": "America/Araguaina",
        },
        timeout=HTTP_TIMEOUT_SECONDS,
    )
    res.raise_for_status()
    current = res.json().get("current") or {}
    temp = current.get("temperature_2m")
    precip = current.get("precipitation")
    code = current.get("weather_code")
    temp_val = float(temp) if temp is not None else None
    precip_val = float(precip) if precip is not None else None
    code_val = int(code) if code is not None else None
    return {
        "weather": classify_weather(temp_val, precip_val, code_val),
        "temperature_c": round(temp_val, 1) if temp_val is not None else None,
        "precipitation_mm": round(precip_val, 2) if precip_val is not None else None,
        "weather_code": code_val,
        "weather_description": describe_wmo_code(code_val),
        "source": "open-meteo",
    }


def _fetch_holidays(client: httpx.Client, year: int) -> tuple[dict[date, str], str]:
    res = client.get(
        BRASIL_API_HOLIDAYS_URL.format(year=year),
        timeout=HTTP_TIMEOUT_SECONDS,
    )
    res.raise_for_status()
    items = res.json()
    holiday_map: dict[date, str] = {}
    for item in items:
        raw_date = item.get("date")
        name = item.get("name")
        if raw_date and name:
            holiday_map[date.fromisoformat(raw_date)] = str(name)
    return holiday_map, "brasilapi"


def _fetch_mall_site(client: httpx.Client) -> tuple[list[str], list[str], str]:
    headers = {"User-Agent": _USER_AGENT}
    events: list[str] = []
    movies: list[str] = []
    ok_any = False

    try:
        ev_res = client.get(CAPIM_DOURADO_EVENTS_URL, headers=headers, timeout=HTTP_TIMEOUT_SECONDS)
        if ev_res.is_success:
            events = parse_events_html(ev_res.text)
            ok_any = True
    except Exception:
        pass

    try:
        ci_res = client.get(CAPIM_DOURADO_CINEMA_URL, headers=headers, timeout=HTTP_TIMEOUT_SECONDS)
        if ci_res.is_success:
            movies = parse_cinema_html(ci_res.text)
            ok_any = True
    except Exception:
        pass

    return events, movies, ("capimdouradosc" if ok_any else "fallback")


def get_live_context(
    force_refresh: bool = False,
    now_fn: Callable[[], datetime] = palmas_now,
    client: Optional[httpx.Client] = None,
) -> dict[str, Any]:
    """Consolida clima, faixa horária e gatilho real do Capim Dourado Shopping."""
    now_dt = now_fn()
    now_mono = time.monotonic()

    owns_client = client is None
    http = client or httpx.Client(follow_redirects=True)
    try:
        # 1. Clima (Open-Meteo, TTL 15 min)
        weather_data = None if force_refresh else _cache_get("weather", now_mono)
        if weather_data is None:
            try:
                weather_data = _fetch_palmas_weather(http)
                _cache_set("weather", weather_data, WEATHER_TTL_SECONDS, now_mono)
            except Exception:
                weather_data = {
                    "weather": "calor_38c" if 10 <= now_dt.hour <= 17 else "ameno",
                    "temperature_c": None,
                    "precipitation_mm": None,
                    "weather_code": None,
                    "weather_description": "Estimativa local (sem conexão com Open-Meteo)",
                    "source": "fallback",
                }

        # 2. Feriados nacionais (BrasilAPI, TTL 24h)
        holiday_key = f"holidays:{now_dt.year}"
        cached_holidays = None if force_refresh else _cache_get(holiday_key, now_mono)
        if cached_holidays is None:
            try:
                cached_holidays = _fetch_holidays(http, now_dt.year)
                _cache_set(holiday_key, cached_holidays, HOLIDAYS_TTL_SECONDS, now_mono)
            except Exception:
                cached_holidays = ({}, "fallback")
        holiday_map, holiday_source = cached_holidays

        # 3. Eventos & Cinema do site oficial (TTL 1h)
        cached_site = None if force_refresh else _cache_get("mall_site", now_mono)
        if cached_site is None:
            cached_site = _fetch_mall_site(http)
            if cached_site[2] != "fallback":
                _cache_set("mall_site", cached_site, MALL_SITE_TTL_SECONDS, now_mono)
        active_events, cinema_movies, mall_source = cached_site
    finally:
        if owns_client:
            http.close()

    time_slot = determine_time_slot(now_dt)
    mall_event, event_reason, holiday_name = determine_mall_event(
        now_dt, holiday_map, cinema_movies
    )

    return {
        "weather": weather_data["weather"],
        "time_slot": time_slot,
        "mall_event": mall_event,
        "temperature_c": weather_data["temperature_c"],
        "precipitation_mm": weather_data["precipitation_mm"],
        "weather_code": weather_data["weather_code"],
        "weather_description": weather_data["weather_description"],
        "event_reason": event_reason,
        "active_events": active_events,
        "cinema_movies_count": len(cinema_movies),
        "cinema_highlights": cinema_movies[:5],
        "holiday_name": holiday_name,
        "updated_at": now_dt.isoformat(),
        "sources": {
            "clima": weather_data["source"],
            "feriados": holiday_source,
            "shopping": mall_source,
        },
    }

