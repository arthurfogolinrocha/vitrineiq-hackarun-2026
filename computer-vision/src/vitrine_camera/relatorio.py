"""Relatório no terminal: movimento por faixa de horário e os maiores picos."""

import sys
from datetime import datetime

from .armazenamento import carregar_eventos


def agrupar(registros, minutos=60):
    """Soma os registros de 10 s em faixas de N minutos; pico = maior pico simultâneo da faixa."""
    faixas = {}
    for reg in registros:
        t = datetime.fromisoformat(reg["inicio"])
        t = t.replace(minute=t.minute - t.minute % minutos if minutos < 60 else 0, second=0)
        f = faixas.setdefault(t, {"faixa": t, "passantes": 0, "olharam": 0, "sem_olhar": 0, "pico": 0})
        f["passantes"] += reg["passantes"]
        f["olharam"] += reg["olharam"]
        f["sem_olhar"] += reg.get("pararam_sem_olhar", 0)  # registros antigos não têm o campo
        f["pico"] = max(f["pico"], reg.get("pico_simultaneo", 0))  # registros antigos não têm pico
    for f in faixas.values():
        f["taxa_atencao"] = round(100 * f["olharam"] / f["passantes"]) if f["passantes"] else 0
    return [faixas[k] for k in sorted(faixas)]


def main():
    """uv run vitrine-relatorio [minutos]"""
    minutos = int(sys.argv[1]) if len(sys.argv) > 1 else 60
    faixas = agrupar(carregar_eventos(), minutos)
    print(f"{'Faixa':<17} {'Passantes':>9} {'Olharam':>8} {'Atenção':>8} {'Parou s/ olhar':>15} {'Pico':>5}")
    for f in faixas:
        print(f"{f['faixa']:%d/%m %H:%M}      {f['passantes']:>9} {f['olharam']:>8} "
              f"{f['taxa_atencao']:>7}% {f['sem_olhar']:>15} {f['pico']:>5}  {'#' * f['pico']}")  # ASCII: console cp1252 do Windows não imprime blocos
    print("\nMaiores picos de gente na frente da loja:")
    for f in sorted(faixas, key=lambda f: (f["pico"], f["passantes"]), reverse=True)[:3]:
        print(f"  {f['faixa']:%d/%m %H:%M}  pico {f['pico']} pessoas juntas, {f['passantes']} passaram")
