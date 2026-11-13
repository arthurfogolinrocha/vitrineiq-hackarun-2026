from vitrine_camera.lojista import acoes, gerar, resumo

REGS = [
    {"inicio": "2026-11-13T13:50:00", "fim": "2026-11-13T13:50:10", "passantes": 2, "olharam": 0},  # formato antigo
    {"inicio": "2026-11-13T18:00:00", "fim": "2026-11-13T18:00:10", "passantes": 10, "olharam": 1,
     "pararam_sem_olhar": 3, "atencao_media_s": 4.0, "pico_simultaneo": 4,
     "olhares_por_zona": {"esquerda": 1, "centro": 0, "direita": 0},
     "fluxo": {"esq_para_dir": 6, "dir_para_esq": 2, "parado": 2}},
]


def test_resumo():
    s = resumo(REGS)
    assert (s["passantes"], s["olharam"], s["sem_olhar"], s["atencao_s"]) == (12, 1, 3, 4.0)
    assert s["por_hora"] == {13: 2, 18: 10}
    assert s["zonas"] == {"esquerda": 1, "centro": 0, "direita": 0}


def test_acoes_apoiadas_nos_dados():
    a = acoes(resumo(REGS))
    assert len(a) == 3
    assert "8%" in a[0]                 # 1 de 12 olharam: abaixo de 20%
    assert "esquerda recebe 100%" in a[1]
    assert "18h às 19h" in a[2]


def test_gerar_html():
    h = gerar(REGS)
    assert "<title>Relatório da Vitrine</title>" in h
    assert "conectar ao Modo Balcão" in h  # nada de valor em reais inventado
    assert "18h–19h" in h


def test_sinais_novos_no_relatorio():
    regs = REGS + [{"inicio": "2026-11-13T18:00:10", "fim": "2026-11-13T18:00:20", "passantes": 4, "olharam": 0,
                    "fluxo": {"esq_para_dir": 2, "dir_para_esq": 0, "parado": 2}, "travessia_media_s": 2.0,
                    "chegaram_perto": 1, "apontaram": 1, "voltaram_a_olhar": 1, "pararam_no_celular": 1,
                    "sozinhos": {"pessoas": 2, "pararam": 0}, "em_grupo": {"pessoas": 2, "pararam": 1, "grupos": 1}}]
    s = resumo(regs)
    assert (s["perto"], s["travessia_s"], s["em_grupo"]["grupos"]) == (1, 2.0, 1)
    h = gerar(regs)
    assert "passagem rápida (atravessam em 2,0 s)" in h
    assert "0% / 50%" in h
