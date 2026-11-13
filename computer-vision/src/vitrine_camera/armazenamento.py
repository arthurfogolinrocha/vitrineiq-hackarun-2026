"""Leitura e gravação dos JSON de eventos e alertas."""

import json
import os
import sys
from datetime import datetime

from .config import ARQUIVO


def hora(t):
    return datetime.fromtimestamp(t).isoformat(timespec="seconds")


def salvar(registro, arquivo=ARQUIVO):
    """Acrescenta o registro à lista do JSON; grava em arquivo temporário para não corromper."""
    dados = json.loads(arquivo.read_text(encoding="utf-8")) if arquivo.exists() else []
    dados.append(registro)
    tmp = arquivo.with_suffix(".tmp")
    tmp.write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, arquivo)


def carregar_eventos(arquivo=ARQUIVO):
    """Resumos gravados pela câmera; encerra o programa com uma mensagem clara se não houver dados."""
    if not arquivo.exists():
        sys.exit(f"Sem dados: {arquivo.resolve()} não existe. Rode a câmera primeiro.")
    regs = json.loads(arquivo.read_text(encoding="utf-8"))
    if not regs:
        sys.exit("O arquivo de eventos está vazio. Rode a câmera por alguns minutos.")
    return regs
