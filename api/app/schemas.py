"""Contratos de entrada e saída da API (Pydantic)."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

from .engine import MallEvent, TimeSlot, Weather, ZoneId


class ScoreRequest(BaseModel):
    zone_id: ZoneId
    weather: Weather = "ameno"
    time_slot: TimeSlot = "manha"
    mall_event: MallEvent = "fluxo_normal"
    vitrine_stops: int = Field(ge=0, le=100_000)
    qr_searches: int = Field(ge=0, le=100_000)
    lost_sales: int = Field(ge=0, le=100_000)


class ScoreResponse(BaseModel):
    score: float
    multiplier: float
    priority: Literal["alta", "media", "baixa"]
    audit_hash: str


class PlanRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    context: Optional[str] = Field(default=None, max_length=2000)
    category: Optional[str] = Field(default=None, max_length=120)


class PlanResponse(BaseModel):
    success: bool
    content: str
    source: Literal["GEMINI_API", "FALLBACK_LOCAL", "BLOCKED"]
    latency_ms: int
    audit_hash: str


class AuditHashRequest(BaseModel):
    payload: str = Field(max_length=4000)
    prev_hash: str = "GENESIS_BLOCK_0000"
    event_id: str = ""
    timestamp: str = ""


class AuditHashResponse(BaseModel):
    hash: str

