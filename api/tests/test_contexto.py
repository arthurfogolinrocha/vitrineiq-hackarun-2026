"""Testes do módulo de telemetria externa (`GET /api/contexto`)."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

import httpx
import pytest
from fastapi.testclient import TestClient

from app import contexto
from app.main import app

client = TestClient(app)
TZ_PALMAS = timezone(timedelta(hours=-3))


@pytest.fixture(autouse=True)
def limpa_cache():
    contexto.clear_context_cache()
    yield
    contexto.clear_context_cache()


def test_classify_weather_mapeia_chuva_calor_e_ameno():
    assert contexto.classify_weather(35.2, 0.0, 0) == "calor_38c"
    assert contexto.classify_weather(26.0, 0.0, 63) == "chuva_forte"
    assert contexto.classify_weather(27.0, 1.8, 2) == "chuva_forte"
    assert contexto.classify_weather(25.9, 0.0, 0) == "ameno"


def test_is_payment_window_considera_feriados_e_fins_de_semana():
    feriados = {date(2026, 11, 2)}  # Finados (segunda-feira)
    # Nov/2026: 1=dom, 2=feriado, 3=1º dia útil ... 9=5º dia útil
    assert contexto.is_payment_window(date(2026, 11, 2), feriados) is False
    assert contexto.is_payment_window(date(2026, 11, 3), feriados) is True
    assert contexto.is_payment_window(date(2026, 11, 9), feriados) is True
    assert contexto.is_payment_window(date(2026, 11, 10), feriados) is False


def test_parse_events_e_cinema_html():
    ev_html = '<div class="p-t-5 bold text-center">NATAL 2026</div><div class="p-t-5 bold text-center">IMERSO MAR</div>'
    assert contexto.parse_events_html(ev_html) == ["NATAL 2026", "IMERSO MAR"]

    ci_html = '<img src="https://cdnim.prd.cineticket.com.br/asset/movie/9373/x.png" title="Ebenezer e os Fantasmas do Natal">'
    assert contexto.parse_cinema_html(ci_html) == ["Ebenezer e os Fantasmas do Natal"]


def test_get_live_context_consolida_open_meteo_brasilapi_e_shopping():
    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "open-meteo.com" in url:
            return httpx.Response(
                200,
                json={"current": {"temperature_2m": 34.6, "precipitation": 0.0, "weather_code": 1}},
            )
        if "brasilapi.com.br" in url:
            return httpx.Response(
                200,
                json=[{"date": "2026-11-15", "name": "Proclamação da República"}],
            )
        if "capimdouradosc.com.br/eventos" in url:
            return httpx.Response(200, text='<div class="p-t-5 bold text-center">NATAL 2026</div>')
        if "capimdouradosc.com.br/cinema" in url:
            return httpx.Response(
                200,
                text='<img src="https://cdnim.prd.cineticket.com.br/asset/movie/1/a.png" title="Filme Teste">',
            )
        return httpx.Response(404)

    http = httpx.Client(transport=httpx.MockTransport(handler))
    # Quinta-feira 12/11/2026 às 20:15 -> calor_38c + pos_cinema_20h + estreia_cinemark
    now_dt = datetime(2026, 11, 12, 20, 15, tzinfo=TZ_PALMAS)
    res = contexto.get_live_context(now_fn=lambda: now_dt, client=http)

    assert res["weather"] == "calor_38c"
    assert res["time_slot"] == "pos_cinema_20h"
    assert res["mall_event"] == "estreia_cinemark"
    assert res["temperature_c"] == 34.6
    assert res["active_events"] == ["NATAL 2026"]
    assert res["cinema_movies_count"] == 1
    assert res["sources"] == {
        "clima": "open-meteo",
        "feriados": "brasilapi",
        "shopping": "capimdouradosc",
    }


def test_get_live_context_faz_fallback_seguro_quando_apis_falham():
    def failing_handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("sem rede", request=request)

    http = httpx.Client(transport=httpx.MockTransport(failing_handler))
    now_dt = datetime(2026, 11, 14, 13, 0, tzinfo=TZ_PALMAS)  # sábado 13h
    res = contexto.get_live_context(now_fn=lambda: now_dt, client=http)

    assert res["weather"] == "calor_38c"
    assert res["time_slot"] == "almoco"
    assert res["mall_event"] == "fim_de_semana"
    assert res["sources"] == {
        "clima": "fallback",
        "feriados": "fallback",
        "shopping": "fallback",
    }


def test_endpoint_api_contexto_responde_200(monkeypatch):
    monkeypatch.setattr(
        "app.main.get_live_context",
        lambda force_refresh=False: {
            "weather": "ameno",
            "time_slot": "pos_cinema_20h",
            "mall_event": "estreia_cinemark",
            "temperature_c": 25.9,
            "precipitation_mm": 0.0,
            "weather_code": 0,
            "weather_description": "Céu limpo",
            "event_reason": "Sessões noturnas no Cinemark (14 filmes em cartaz)",
            "active_events": ["NATAL 2026", "IMERSO MAR"],
            "cinema_movies_count": 14,
            "cinema_highlights": ["Ebenezer e os Fantasmas do Natal"],
            "holiday_name": None,
            "updated_at": "2026-11-13T20:30:00-03:00",
            "sources": {
                "clima": "open-meteo",
                "feriados": "brasilapi",
                "shopping": "capimdouradosc",
            },
        },
    )
    res = client.get("/api/contexto")
    assert res.status_code == 200
    body = res.json()
    assert body["temperature_c"] == 25.9
    assert body["active_events"] == ["NATAL 2026", "IMERSO MAR"]

