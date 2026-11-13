"""Loop da câmera: rastreia pessoas, atualiza o estado de cada uma e grava resumos e alertas."""

import os
import time

from .analise import atualizar_parado, olhar_frame, resumir, segurou, zona_de
from .armazenamento import hora, salvar
from .envio import enviar
from .config import (ALERTAS, ARQUIVO, CAMERA, CELULAR_S, CONF_DESFOQUE, CONF_PESSOA, GATILHO_S, JANELA_S, LOJA_ID, LOTACAO_INTERVALO_S, LOTACAO_N,
                     MODELO, MOSTRAR, OLHAR_S, PERTO_FRAC, SUMIR_S, URL_MODELO)
from .pose import apontando, de_frente, no_celular, regiao_cabeca


def alertar(evento, agora, **dados):
    alerta = {"loja_id": LOJA_ID, "evento": evento, "momento": hora(agora), **dados}
    salvar(alerta, ALERTAS)
    # na API, "zona" é a ala do shopping; a parte da vitrine vai como zonaVitrine
    enviar("alertas", {("zonaVitrine" if k == "zona" else k): v for k, v in alerta.items() if k != "loja_id"})
    print("ALERTA", alerta)


def nova_pessoa(x, agora):
    return {"ini": agora, "x0": x, "olhar": 0.0, "zona": None, "desde": None, "alertou": False,
            "xp": x, "parado_desde": agora, "parou": False}


def atualizar_pessoa(p, x, altura_rel, xy, conf, agora, largura):
    """Atualiza o estado de uma pessoa neste frame e dispara os alertas dela."""
    p["fim"], p["x1"] = agora, x
    atualizar_parado(p, x, agora, largura)
    segurou(p, "perto", altura_rel >= PERTO_FRAC, agora)
    segurou(p, "celular", no_celular(xy, conf), agora, CELULAR_S)
    if segurou(p, "apontou", apontando(xy, conf), agora):
        alertar("apontou", agora, zona=zona_de(x, largura))
    if not de_frente(conf):
        p["desde"] = None
        return
    dur = olhar_frame(p, agora)
    p["olhar"] = max(p["olhar"], dur)
    if dur >= OLHAR_S and not p["zona"]:
        p["zona"] = zona_de(x, largura)
    if dur >= GATILHO_S and not p["alertou"]:
        p["alertou"] = True
        alertar("atencao_alta", agora, zona=zona_de(x, largura), olhando_s=round(dur, 1))


def deteccoes(r):
    """(id, x, altura da caixa, keypoints xy, confiança) de cada pessoa rastreada no frame do YOLO."""
    if r.boxes.id is None or r.keypoints is None or r.keypoints.conf is None:
        return []
    todas = zip(r.boxes.conf.tolist(), r.boxes.id.int().tolist(), r.boxes.xywh[:, 0].tolist(),
                r.boxes.xywh[:, 3].tolist(), r.keypoints.xy.tolist(), r.keypoints.conf.tolist())
    return [d for c, *d in todas if c >= CONF_PESSOA]  # o modelo roda com CONF_DESFOQUE; só conta quem passa daqui


class Sessao:
    """Uma execução da câmera: quem está na imagem, quem já saiu e a janela de resumo em aberto."""

    def __init__(self):
        self.pessoas = {}  # tid -> estado de quem está na imagem agora
        self.foram_embora = []
        self.total = {"passantes": 0, "olharam": 0}
        self.t_janela, self.pico, self.largura, self.ultima_lotacao = None, 0, 640, 0.0

    def processar(self, r, agora):
        self.t_janela = self.t_janela or agora  # conta a partir do primeiro frame, não do carregamento do modelo
        altura, self.largura = r.orig_shape[:2]
        dets = deteccoes(r)
        for tid, x, h, xy, conf in dets:
            p = self.pessoas.setdefault(tid, nova_pessoa(x, agora))
            atualizar_pessoa(p, x, h / altura, xy, conf, agora, self.largura)
        self._checar_lotacao(len(dets), agora)
        for tid in [t for t, p in self.pessoas.items() if agora - p["fim"] > SUMIR_S]:
            self.foram_embora.append(self.pessoas.pop(tid))
        if agora - self.t_janela >= JANELA_S:
            self.fechar_janela(agora)

    def _checar_lotacao(self, n, agora):
        self.pico = max(self.pico, n)
        if n >= LOTACAO_N and agora - self.ultima_lotacao >= LOTACAO_INTERVALO_S:
            self.ultima_lotacao = agora
            alertar("lotacao", agora, pessoas=n)

    def fechar_janela(self, fim):
        registro = {"loja_id": LOJA_ID, "inicio": hora(self.t_janela), "fim": hora(fim),
                    **resumir(self.foram_embora, self.largura), "pico_simultaneo": self.pico}
        salvar(registro)
        enviar("eventos", {k: v for k, v in registro.items() if k != "loja_id"})
        print(registro)
        self.total["passantes"] += registro["passantes"]
        self.total["olharam"] += registro["olharam"]
        self.foram_embora.clear()
        self.t_janela, self.pico = fim, 0

    def encerrar(self):
        """Quem ainda está na imagem entra no último resumo, para não perder ninguém ao parar."""
        self.foram_embora.extend(self.pessoas.values())
        if self.t_janela and self.foram_embora:
            self.fechar_janela(time.time())


def pixelizar(img, regiao, blocos=8):
    """Troca a região por blocos grandes (irreconhecível); recorta nas bordas da imagem."""
    import cv2

    h, w = img.shape[:2]
    x0, y0, x1, y1 = max(regiao[0], 0), max(regiao[1], 0), min(regiao[2], w), min(regiao[3], h)
    if x1 - x0 < 2 or y1 - y0 < 2:
        return
    pequeno = cv2.resize(img[y0:y1, x0:x1], (blocos, blocos), interpolation=cv2.INTER_LINEAR)
    img[y0:y1, x0:x1] = cv2.resize(pequeno, (x1 - x0, y1 - y0), interpolation=cv2.INTER_NEAREST)


def sem_rostos(r):
    """Cópia do frame com a cabeça de cada pessoa pixelizada. Sempre ligado: o preview aparece na demo e no vídeo."""
    img = r.orig_img.copy()
    if r.boxes is not None and r.keypoints is not None and r.keypoints.conf is not None:
        for caixa, xy, conf in zip(r.boxes.xyxy.tolist(), r.keypoints.xy.tolist(), r.keypoints.conf.tolist()):
            pixelizar(img, regiao_cabeca(xy, conf, caixa))
    return img


def mostrar(r, sessao):
    """Desenha detecções, zonas e contadores sobre o frame sem rostos; devolve False quando o usuário aperta q."""
    import cv2

    frame = r.plot(img=sem_rostos(r))
    h, largura = frame.shape[0], sessao.largura
    for i in (1, 2):  # divisões das zonas da vitrine
        cv2.line(frame, (largura * i // 3, 0), (largura * i // 3, h), (255, 255, 0), 1)
    pessoas, total = sessao.pessoas.values(), sessao.total
    olhando = sum(p["desde"] is not None for p in pessoas)
    parados = sum(p["parou"] for p in pessoas)
    texto = (f"Agora: {len(pessoas)} na frente, {olhando} olhando, {parados} parados | "
             f"Total: {total['passantes']} passaram, {total['olharam']} olharam")
    cv2.putText(frame, texto, (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 2)
    cv2.imshow("VitrineIQ", frame)
    return cv2.waitKey(1) & 0xFF != ord("q")


def baixar_modelo():
    """Baixa o modelo uma vez; depois o YOLO carrega do arquivo local, sem rede."""
    if MODELO.exists():
        return
    import requests

    # O .pt é carregado com pickle: sem verificar o SSL, quem estiver no meio da rede pode trocar o arquivo.
    # Atrás de proxy corporativo que troca o certificado, rode com VITRINE_SSL_VERIFY=0 só neste download.
    verificar = os.environ.get("VITRINE_SSL_VERIFY", "1") != "0"
    if not verificar:
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    print(f"Baixando {MODELO}...")
    r = requests.get(URL_MODELO, verify=verificar, timeout=120)
    r.raise_for_status()
    tmp = MODELO.with_suffix(".tmp")
    tmp.write_bytes(r.content)
    os.replace(tmp, MODELO)


def main():
    from ultralytics import YOLO  # import aqui: carregar torch é lento

    baixar_modelo()
    model = YOLO(str(MODELO))
    sessao = Sessao()
    print(f"Câmera {CAMERA} ligada. Gravando em {ARQUIVO.resolve()} (Ctrl+C ou q na janela para parar)")
    try:
        for r in model.track(source=CAMERA, stream=True, persist=True, classes=[0], conf=CONF_DESFOQUE, verbose=False):
            sessao.processar(r, time.time())
            if MOSTRAR and not mostrar(r, sessao):
                break
    except KeyboardInterrupt:
        pass
    finally:
        sessao.encerrar()
        if MOSTRAR:
            import cv2
            cv2.destroyAllWindows()
