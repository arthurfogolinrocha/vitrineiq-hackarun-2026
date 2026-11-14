from types import SimpleNamespace

from vitrine_camera import camera

DE_FRENTE = [0.0, 0.9, 0.9] + [0.0] * 14  # só os dois olhos visíveis
XY = [[0, 0]] * 17


def test_sessao_grava_janela_e_alerta(monkeypatch):
    salvos = []
    monkeypatch.setattr(camera, "salvar", lambda reg, arquivo="eventos": salvos.append((arquivo, reg)))
    monkeypatch.setattr(camera, "ALERTAS", "alertas")
    deteccoes = [(1, 300, 100, XY, DE_FRENTE)]
    monkeypatch.setattr(camera, "deteccoes", lambda r: deteccoes)
    frame = SimpleNamespace(orig_shape=(480, 600))

    s = camera.Sessao()
    for t in (0.0, 2.0, 3.5):                # olhando de frente 3,5 s no centro
        s.processar(frame, t)
    deteccoes = []
    s.processar(frame, 6.0)                  # sumiu há mais de SUMIR_S
    s.processar(frame, 10.0)                 # fecha a janela de JANELA_S
    s.encerrar()                             # ninguém na imagem: não grava janela vazia

    eventos = [reg for arq, reg in salvos if arq == "eventos"]
    alertas = [reg["evento"] for arq, reg in salvos if arq == "alertas"]
    assert alertas == ["atencao_alta"]
    assert len(eventos) == 1
    assert (eventos[0]["olharam"], eventos[0]["olhares_por_zona"]["centro"], eventos[0]["pico_simultaneo"]) == (1, 1, 1)
    assert s.total == {"passantes": 1, "olharam": 1} and not s.pessoas


def test_sessao_envia_resumo_e_alerta_para_a_api(monkeypatch):
    enviados = []
    monkeypatch.setattr(camera, "salvar", lambda reg, arquivo="eventos": None)
    monkeypatch.setattr(camera, "enviar", lambda caminho, dados: enviados.append((caminho, dados)))
    deteccoes = [(1, 300, 100, XY, DE_FRENTE)]
    monkeypatch.setattr(camera, "deteccoes", lambda r: deteccoes)
    frame = SimpleNamespace(orig_shape=(480, 600))

    s = camera.Sessao()
    for t in (100.0, 102.0, 103.5):  # relógio real nunca é 0 (t_janela usa `or`)
        s.processar(frame, t)
    deteccoes = []
    s.processar(frame, 106.0)
    s.processar(frame, 110.0)

    caminhos = [c for c, _ in enviados]
    assert caminhos == ["alertas", "eventos"]
    alerta, evento = enviados[0][1], enviados[1][1]
    assert alerta["evento"] == "atencao_alta" and alerta["zonaVitrine"] == "centro" and "zona" not in alerta
    assert evento["passantes"] == 1 and "loja_id" not in evento


def test_deteccoes_conta_so_quem_passa_de_conf_pessoa():
    """O YOLO roda com confiança baixa para desfocar todos os rostos; a contagem fica com quem passa de CONF_PESSOA."""
    import torch

    boxes = SimpleNamespace(id=torch.tensor([1, 2]), conf=torch.tensor([0.9, 0.4]),
                            xywh=torch.tensor([[10.0, 0, 0, 50], [20.0, 0, 0, 60]]))
    kps = SimpleNamespace(xy=torch.zeros(2, 17, 2), conf=torch.ones(2, 17))
    dets = camera.deteccoes(SimpleNamespace(boxes=boxes, keypoints=kps))
    assert [d[:3] for d in dets] == [[1, 10.0, 50.0]]


def test_conferir_sha256_aceita_o_certo_e_apaga_o_errado(tmp_path):
    import hashlib

    import pytest

    arquivo = tmp_path / "modelo.tmp"
    arquivo.write_bytes(b"modelo de teste")
    camera.conferir_sha256(arquivo, hashlib.sha256(b"modelo de teste").hexdigest())
    assert arquivo.exists()

    with pytest.raises(SystemExit, match="não confere"):
        camera.conferir_sha256(arquivo, "0" * 64)
    assert not arquivo.exists()


def test_envio_manda_token_so_quando_definido(monkeypatch):
    import requests

    from vitrine_camera import envio

    chamadas = []
    monkeypatch.setattr(requests, "post", lambda url, **kw: chamadas.append(kw["headers"]) or SimpleNamespace(status_code=201))
    monkeypatch.setattr(envio, "TOKEN", "")
    envio._post("eventos", {})
    monkeypatch.setattr(envio, "TOKEN", "segredo")
    envio._post("eventos", {})
    assert chamadas == [None, {"X-Vitrine-Token": "segredo"}]


def test_sem_rostos_desfoca_quem_o_tracker_ainda_nao_confirmou():
    import numpy as np
    import torch

    img = np.random.default_rng(0).integers(0, 256, (120, 120, 3), dtype=np.uint8)
    rastreado = SimpleNamespace(orig_img=img, boxes=None, keypoints=None)  # tracker escondeu a pessoa nova
    cru = SimpleNamespace(boxes=SimpleNamespace(xyxy=torch.tensor([[30.0, 30.0, 90.0, 120.0]])),
                          keypoints=SimpleNamespace(xy=torch.zeros(1, 17, 2), conf=torch.zeros(1, 17)))
    assert (camera.sem_rostos(rastreado) == img).all()
    saida = camera.sem_rostos(rastreado, cru)
    cabeca = (slice(30, 60), slice(30, 90))  # sem pontos da cabeça: terço de cima da caixa
    assert (saida[cabeca] != img[cabeca]).any()
    saida[cabeca] = img[cabeca]
    assert (saida == img).all()  # fora da cabeça, nada muda


def test_callback_das_deteccoes_cruas_roda_antes_do_tracker():
    """Garante a ordem em que camera.main confia; quebra se a Ultralytics passar a pôr o tracker na frente."""
    from collections import defaultdict

    from ultralytics.trackers.track import on_predict_postprocess_end, register_tracker

    model = SimpleNamespace(callbacks=defaultdict(list))
    model.add_callback = lambda evento, f: model.callbacks[evento].append(f)
    model.add_callback("on_predict_postprocess_end", "guardar_crus")
    register_tracker(model, persist=True)
    callbacks = model.callbacks["on_predict_postprocess_end"]
    assert callbacks[0] == "guardar_crus" and callbacks[1].func is on_predict_postprocess_end
