"""Parâmetros do VitrineIQ. Calibre na vitrine real."""

import os
from pathlib import Path

ARQUIVO = Path("vitrine_eventos.json")    # um resumo a cada JANELA_S
ALERTAS = Path("vitrine_alertas.json")    # gatilho para a campanha relâmpago
MODELO = Path("yolo11n-pose.pt")
URL_MODELO = "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo11n-pose.pt"
# SHA-256 do yolo11n-pose.pt v8.4.0 (6.255.593 bytes). Trocar de versão do modelo exige trocar este hash.
SHA256_MODELO = "869e83fcdffdc7371fa4e34cd8e51c838cc729571d1635e5141e3075e9319dc0"
LOJA_ID = 1
# Índice da câmera no OpenCV: 0 = webcam do notebook. Na demo, a Logitech C925e (USB) costuma ser 1.
CAMERA = int(os.environ.get("VITRINE_CAMERA", "0"))
# No Windows o backend padrão (MSMF) trava ao abrir webcams USB como a Logitech; DirectShow abre em ~4 s.
os.environ.setdefault("OPENCV_VIDEOIO_PRIORITY_MSMF", "0")

OLHAR_S = 1.5         # segundos de frente para contar como "olhou"
GATILHO_S = 3.0       # segundos de frente para disparar o alerta de atenção alta
CONF_PESSOA = 0.65    # confiança mínima do YOLO para contar uma detecção como pessoa
CONF_DESFOQUE = 0.25  # mais baixa: quem não entra na contagem ainda tem o rosto desfocado no preview
CONF_OLHO = 0.5       # calibre na vitrine real
JANELA_S = 10         # grava um resumo a cada N segundos
MIN_PRESENCA_S = 1.0  # ID que dura menos é troca de ID do tracker, não passante
SUMIR_S = 2.0         # pessoa fora da imagem por mais que isso = foi embora, entra no resumo
FLUXO_MIN = 0.25      # andou menos que essa fração da largura = "parado"
PARADO_S = 3.0        # segundos sem sair do lugar para contar como "parou"
PARADO_FRAC = 0.05    # mexer menos que essa fração da largura = continua no mesmo lugar
LOTACAO_N = 4         # pessoas ao mesmo tempo na frente para disparar alerta de lotação
LOTACAO_INTERVALO_S = 60  # no máximo um alerta de lotação por minuto
PERTO_FRAC = 0.7     # caixa ocupa essa fração da altura da imagem = chegou perto do vidro
CONF_PONTO = 0.5     # confiança mínima de ombro, cotovelo, pulso e nariz
BRACO_RETO = 0.9     # ombro→pulso / (ombro→cotovelo + cotovelo→pulso): 1 = braço totalmente esticado
CABECA_BAIXA = 0.4   # nariz a menos que essa fração da largura dos ombros acima deles = cabeça baixa
SEGURAR_S = 0.5      # pose precisa durar isso para contar (filtra ruído de um frame)
CELULAR_S = 2.0      # segundos na pose de celular para contar
VIRAR_S = 1.0        # segundos sem olhar entre dois olhares para contar como "voltou a olhar"
GRUPO_S = 2.0        # chegaram com até essa diferença de segundos...
GRUPO_FRAC = 0.15    # ...e até essa fração da largura de distância = mesmo grupo
ZONAS = ("esquerda", "centro", "direita")
INVERTER = True       # câmera dentro da vitrine olhando para fora: esquerda da imagem = direita de quem está na calçada
MOSTRAR = True        # janela com as detecções; tecla q fecha
