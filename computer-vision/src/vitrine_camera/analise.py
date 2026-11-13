"""Regras do funil: estado de cada pessoa frame a frame e o resumo de quem já foi embora."""

from .config import (FLUXO_MIN, GRUPO_FRAC, GRUPO_S, INVERTER, MIN_PRESENCA_S, OLHAR_S, PARADO_FRAC, PARADO_S,
                     SEGURAR_S, VIRAR_S, ZONAS)


def zona_de(x, largura):
    """Faixa da vitrine (vista da calçada) em que a pessoa está, pela posição x na imagem."""
    i = min(int(3 * x / largura), 2)
    return ZONAS[2 - i if INVERTER else i]


def atualizar_parado(p, x, agora, largura):
    """Marca p["parou"] se a pessoa ficou PARADO_S sem sair de perto do ponto onde parou."""
    if abs(x - p["xp"]) > PARADO_FRAC * largura:
        p["xp"], p["parado_desde"] = x, agora  # andou: novo ponto de referência
    elif agora - p["parado_desde"] >= PARADO_S:
        p["parou"] = True


def segurou(p, chave, ativo, agora, segundos=SEGURAR_S):
    """Marca p[chave] quando a condição fica ativa por `segundos` seguidos; True só no frame em que marcou."""
    if not ativo:
        p[chave + "_desde"] = None
        return False
    if p.get(chave + "_desde") is None:
        p[chave + "_desde"] = agora
    if not p.get(chave) and agora - p[chave + "_desde"] >= segundos:
        p[chave] = True
        return True
    return False


def olhar_frame(p, agora):
    """Atualiza o olhar de quem está de frente neste frame e devolve há quantos segundos olha.

    Cada olhar de OLHAR_S que vem depois de VIRAR_S sem olhar soma em p["olhadas"]; 2+ = voltou a olhar.
    """
    if p["desde"] is None:
        p["desde"], p["nova"] = agora, agora - p.get("ult_frente", float("-inf")) >= VIRAR_S
    p["ult_frente"] = agora
    dur = agora - p["desde"]
    if dur >= OLHAR_S and p["nova"]:
        p["nova"] = False
        p["olhadas"] = p.get("olhadas", 0) + 1
    return dur


def direcao(p, largura):
    dx = (p["x1"] - p["x0"]) / largura * (-1 if INVERTER else 1)
    return "parado" if abs(dx) < FLUXO_MIN else "esq_para_dir" if dx > 0 else "dir_para_esq"


def grupos(pessoas, largura):
    """Rótulo de grupo por pessoa: chegaram juntas, perto uma da outra e na mesma direção.

    shortcut: só agrupa quem sai na mesma janela de JANELA_S; um grupo que se separa na saída vira sozinhos.
    """
    g = list(range(len(pessoas)))
    for i, a in enumerate(pessoas):
        for j, b in enumerate(pessoas[:i]):
            if (abs(a["ini"] - b["ini"]) <= GRUPO_S and abs(a["x0"] - b["x0"]) <= GRUPO_FRAC * largura
                    and direcao(a, largura) == direcao(b, largura)):
                g = [g[j] if x == g[i] else x for x in g]
    return g


def _media(valores):
    return round(sum(valores) / len(valores), 1) if valores else 0


def _fluxo_e_travessias(validas, largura):
    """Contagem por direção e segundos para atravessar a largura da imagem, só de quem andou."""
    fluxo = {"esq_para_dir": 0, "dir_para_esq": 0, "parado": 0}
    travessias = []
    for p in validas:
        d = direcao(p, largura)
        fluxo[d] += 1
        if d != "parado":
            travessias.append((p["fim"] - p["ini"]) * largura / abs(p["x1"] - p["x0"]))
    return fluxo, travessias


def _sozinhos_e_grupos(validas, largura):
    g = grupos(validas, largura)
    em_grupo = [g.count(x) > 1 for x in g]
    sozinho = {"pessoas": 0, "pararam": 0}
    grupo = {"pessoas": 0, "pararam": 0, "grupos": len({x for x, eg in zip(g, em_grupo) if eg})}
    for p, eg in zip(validas, em_grupo):
        c = grupo if eg else sozinho
        c["pessoas"] += 1
        c["pararam"] += bool(p["parou"])
    return sozinho, grupo


def resumir(pessoas, largura):
    """Agrega as pessoas que já foram embora num registro de contagens."""
    validas = [p for p in pessoas if p["fim"] - p["ini"] >= MIN_PRESENCA_S]
    olharam = [p for p in validas if p["zona"]]
    fluxo, travessias = _fluxo_e_travessias(validas, largura)
    sozinho, grupo = _sozinhos_e_grupos(validas, largura)
    return {
        "passantes": len(validas),
        "olharam": len(olharam),
        "pararam_sem_olhar": sum(p["parou"] and not p["zona"] for p in validas),
        "atencao_media_s": _media([p["olhar"] for p in olharam]),
        "olhares_por_zona": {z: sum(p["zona"] == z for p in olharam) for z in ZONAS},
        "fluxo": fluxo,
        "travessia_media_s": _media(travessias),
        "chegaram_perto": sum(bool(p.get("perto")) for p in validas),
        "apontaram": sum(bool(p.get("apontou")) for p in validas),
        "no_celular": sum(bool(p.get("celular")) for p in validas),
        "pararam_no_celular": sum(p["parou"] and not p["zona"] and bool(p.get("celular")) for p in validas),
        "voltaram_a_olhar": sum(p.get("olhadas", 0) >= 2 for p in validas),
        "sozinhos": sozinho,
        "em_grupo": grupo,
    }
