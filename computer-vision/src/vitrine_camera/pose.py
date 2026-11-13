"""Leitura da pose COCO (17 keypoints) de uma pessoa num frame."""

from .config import BRACO_RETO, CABECA_BAIXA, CONF_OLHO, CONF_PONTO

NARIZ, OLHO_E, OLHO_D = 0, 1, 2
OMBRO_E, OMBRO_D = 5, 6
COTOVELO_E, COTOVELO_D = 7, 8
PULSO_E, PULSO_D = 9, 10
BRACOS = ((OMBRO_E, COTOVELO_E, PULSO_E), (OMBRO_D, COTOVELO_D, PULSO_D))


def _dist(a, b):
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5


def de_frente(conf):
    """Os dois olhos visíveis = de frente para a câmera."""
    return conf[OLHO_E] > CONF_OLHO and conf[OLHO_D] > CONF_OLHO


def apontando(xy, conf):
    """Pulso acima do ombro com o braço reto passando pelo cotovelo.

    shortcut: mão levantada acenando também conta; se der falso positivo na demo, exija o pulso à frente do corpo.
    """
    for ombro, cotovelo, pulso in BRACOS:
        if min(conf[ombro], conf[cotovelo], conf[pulso]) < CONF_PONTO:
            continue
        braco = _dist(xy[ombro], xy[cotovelo]) + _dist(xy[cotovelo], xy[pulso])
        if xy[pulso][1] < xy[ombro][1] and _dist(xy[ombro], xy[pulso]) >= BRACO_RETO * braco:
            return True
    return False


def no_celular(xy, conf):
    """Os dois pulsos juntos na frente do peito/rosto e a cabeça baixa (nariz caído perto da linha dos ombros)."""
    if min(conf[i] for i in (NARIZ, OMBRO_E, OMBRO_D, PULSO_E, PULSO_D)) < CONF_PONTO:
        return False
    ombros = _dist(xy[OMBRO_E], xy[OMBRO_D])
    if not ombros:
        return False
    linha = (xy[OMBRO_E][1] + xy[OMBRO_D][1]) / 2
    cabeca_baixa = linha - xy[NARIZ][1] < CABECA_BAIXA * ombros
    pulsos_juntos = _dist(xy[PULSO_E], xy[PULSO_D]) < ombros
    na_frente = max(xy[PULSO_E][1], xy[PULSO_D][1]) < linha + 1.5 * ombros  # acima da cintura
    return cabeca_baixa and pulsos_juntos and na_frente
