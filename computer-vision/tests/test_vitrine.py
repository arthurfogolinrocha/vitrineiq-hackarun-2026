from vitrine_camera.analise import atualizar_parado, olhar_frame, resumir, segurou, zona_de
from vitrine_camera.armazenamento import salvar
from vitrine_camera.pose import apontando, de_frente, no_celular
from vitrine_camera.relatorio import agrupar


def test_agrupar_por_faixa():
    regs = [
        {"inicio": "2026-11-13T14:01:00", "passantes": 2, "olharam": 1, "pico_simultaneo": 2},
        {"inicio": "2026-11-13T14:04:50", "passantes": 2, "olharam": 0, "pico_simultaneo": 3},
        {"inicio": "2026-11-13T14:05:00", "passantes": 1, "olharam": 1},  # registro antigo, sem pico
    ]
    a, b = agrupar(regs, 5)
    assert (a["faixa"].minute, a["passantes"], a["olharam"], a["pico"], a["taxa_atencao"]) == (0, 4, 1, 3, 25)
    assert (b["faixa"].minute, b["pico"], b["taxa_atencao"]) == (5, 0, 100)
    assert len(agrupar(regs, 60)) == 1


def test_de_frente():
    assert de_frente([0.9, 0.8, 0.7] + [0] * 14)
    assert not de_frente([0.9, 0.8, 0.1] + [0] * 14)  # um olho só = de lado


def test_salvar_acrescenta(tmp_path):
    arq = tmp_path / "eventos.json"
    salvar({"passantes": 1}, arq)
    salvar({"passantes": 2}, arq)
    assert arq.read_text(encoding="utf-8").count("passantes") == 2


def test_zona_invertida():
    # câmera olha para fora: esquerda da imagem é a direita de quem está na calçada
    assert zona_de(10, 600) == "direita"
    assert zona_de(300, 600) == "centro"
    assert zona_de(599, 600) == "esquerda"
    assert zona_de(600, 600) == "esquerda"  # borda não estoura o índice


def pessoa(ini, fim, x0, x1, olhar=0.0, zona=None, parou=False):
    return {"ini": ini, "fim": fim, "x0": x0, "x1": x1, "olhar": olhar, "zona": zona, "parou": parou}


def test_parado():
    p = {"xp": 300, "parado_desde": 0, "parou": False}
    atualizar_parado(p, 310, 2.0, 600)   # mexeu 10px (<5% de 600): ainda no lugar, mas só 2 s
    assert not p["parou"]
    atualizar_parado(p, 305, 3.0, 600)   # 3 s no lugar
    assert p["parou"]
    q = {"xp": 300, "parado_desde": 0, "parou": False}
    atualizar_parado(q, 400, 3.0, 600)   # andou 100px: zera o relógio
    assert not q["parou"] and q["parado_desde"] == 3.0


def test_parou_sem_olhar():
    r = resumir([
        pessoa(0, 5, 300, 300, parou=True),                              # no celular
        pessoa(0, 5, 300, 300, olhar=4.0, zona="centro", parou=True),    # parou olhando: não conta
        pessoa(0, 5, 0, 600),                                            # passou direto
    ], largura=600)
    assert r["pararam_sem_olhar"] == 1


def test_resumir():
    r = resumir([
        pessoa(0, 0.5, 0, 600),                       # troca de ID: ignorada
        pessoa(0, 5, 550, 50),                        # imagem dir->esq = calçada esq->dir
        pessoa(0, 8, 300, 310, olhar=4.0, zona="centro"),
        pessoa(0, 6, 100, 120, olhar=2.0, zona="direita"),
    ], largura=600)
    assert r["passantes"] == 3
    assert r["olharam"] == 2
    assert r["atencao_media_s"] == 3.0
    assert r["olhares_por_zona"] == {"esquerda": 0, "centro": 1, "direita": 1}
    assert r["fluxo"] == {"esq_para_dir": 1, "dir_para_esq": 0, "parado": 2}


def test_resumir_vazio():
    assert resumir([], 600)["atencao_media_s"] == 0


def test_segurou():
    p = {}
    assert not segurou(p, "perto", True, 0.0)
    assert segurou(p, "perto", True, 0.5)          # marcou agora
    assert not segurou(p, "perto", True, 1.0) and p["perto"]  # só avisa uma vez
    q = {}
    segurou(q, "x", True, 0.0)
    segurou(q, "x", False, 0.3)                    # piscou: zera
    assert not segurou(q, "x", True, 0.6) and not q.get("x")


def test_voltou_a_olhar():
    p = {"desde": None}
    olhar_frame(p, 0.0); olhar_frame(p, 2.0)       # 1º olhar de 2 s
    p["desde"] = None                              # virou
    olhar_frame(p, 2.5); olhar_frame(p, 4.5)       # voltou só 0,5 s depois: mesmo olhar
    assert p["olhadas"] == 1
    p["desde"] = None
    olhar_frame(p, 7.0); olhar_frame(p, 9.0)       # 2,5 s de costas e olhou de novo
    assert p["olhadas"] == 2


def kp(**pts):
    xy, conf = [[0, 0]] * 17, [0.0] * 17
    for i, v in pts.items():
        xy[int(i[1:])], conf[int(i[1:])] = v, 0.9
    return xy, conf


def test_apontando():
    # ombro 5 em (100,100), cotovelo reto, pulso acima do ombro
    assert apontando(*kp(k5=[100, 100], k7=[120, 80], k9=[140, 60]))
    assert not apontando(*kp(k5=[100, 100], k7=[120, 80], k9=[100, 70]))   # braço dobrado
    assert not apontando(*kp(k5=[100, 100], k7=[110, 130], k9=[120, 160]))  # braço para baixo


def test_no_celular():
    ombros = dict(k5=[80, 100], k6=[120, 100], k9=[95, 130], k10=[105, 130])
    assert no_celular(*kp(k0=[100, 95], **ombros))      # nariz quase na linha dos ombros
    assert not no_celular(*kp(k0=[100, 50], **ombros))  # cabeça erguida


def test_grupos_e_sinais_novos():
    a = pessoa(0, 5, 100, 500, parou=True)
    b = pessoa(1, 5, 120, 520)                                   # chegou junto, mesma direção
    c = pessoa(0, 5, 500, 100)                                   # direção oposta: sozinho
    d = pessoa(0, 5, 300, 300, parou=True) | {"celular": True, "perto": True, "olhadas": 2}
    r = resumir([a, b, c, d], largura=600)
    assert r["em_grupo"] == {"pessoas": 2, "pararam": 1, "grupos": 1}
    assert r["sozinhos"] == {"pessoas": 2, "pararam": 1}
    assert r["travessia_media_s"] == 7.0  # (7,5 + 6 + 7,5) / 3: 400 px de 600 em 5, 4 e 5 s
    assert (r["chegaram_perto"], r["pararam_no_celular"], r["voltaram_a_olhar"]) == (1, 1, 1)
