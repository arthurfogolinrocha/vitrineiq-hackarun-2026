"""Envio dos resumos e alertas para a API do VitrineIQ (POST /api/vitrine/eventos e /alertas).

Liga com a variável VITRINE_API_URL (ex.: http://localhost:8000 ou a URL publicada).
Sem ela, a câmera só grava os JSON locais, como antes.
O envio roda numa thread para não travar o vídeo; se a API cair, o JSON local continua valendo.
"""

import os
import threading

API_URL = os.environ.get("VITRINE_API_URL", "").rstrip("/")
ALA = os.environ.get("VITRINE_ALA", "ala-central-ancoras")  # id da ala no painel (frontend/src/data)


def _post(caminho, dados):
    import requests

    try:
        r = requests.post(f"{API_URL}/api/vitrine/{caminho}", json={"zona": ALA, **dados}, timeout=5)
        if r.status_code >= 400:
            print(f"API recusou {caminho}: {r.status_code} {r.text[:200]}")
    except requests.RequestException as e:
        print(f"API fora do ar ({caminho}): {e}. O registro ficou só no JSON local.")


def enviar(caminho, dados):
    """caminho: 'eventos' ou 'alertas'. Não faz nada se VITRINE_API_URL não estiver definida."""
    if API_URL:
        threading.Thread(target=_post, args=(caminho, dados), daemon=True).start()
