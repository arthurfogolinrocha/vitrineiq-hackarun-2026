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
