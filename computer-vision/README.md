# computer-vision

Visão computacional da vitrine do VitrineIQ. Uma webcam virada para o corredor conta quem **passa**, quem **olha** a vitrine, por quanto tempo e para qual parte (esquerda, centro ou direita). Também dispara alertas na hora: **atenção alta** (3 s olhando) e **lotação** (4 ou mais pessoas).

![O que a câmera mede](vitrine_coleta.png)

## Privacidade

- Tudo é processado no próprio aparelho. Nenhuma imagem é gravada ou enviada.
- Só saem **contagens agregadas**: um resumo a cada 10 s em `vitrine_eventos.json` e os alertas em `vitrine_alertas.json`.
- Não há rosto, identidade, idade, gênero nem reconhecimento da mesma pessoa.

## Como funciona

YOLO11 pose (`yolo11n-pose.pt`, Ultralytics) com rastreamento por ID. A pose (olhos, ombros, pulsos) diz se a pessoa está de frente, apontando ou no celular.

| Módulo | Papel |
|---|---|
| `config.py` | parâmetros (tempo para "olhou", gatilhos, zonas). Calibre na vitrine real |
| `pose.py` | leitura dos 17 pontos da pose |
| `analise.py` | regras do funil e resumo de quem já foi embora |
| `camera.py` | loop da câmera, resumos e alertas |
| `armazenamento.py` | gravação segura dos JSON |
| `relatorio.py` | relatório por faixa de horário no terminal |
| `lojista.py` | relatório HTML de uma página para o lojista ([exemplo](relatorio_lojista.html)) |

## Como rodar

É preciso ter o [uv](https://docs.astral.sh/uv/) e o Python 3.14.

```bash
cd computer-vision
uv sync
uv run vitrine-camera      # liga a webcam; q ou Ctrl+C para parar
uv run vitrine-relatorio   # resumo por hora no terminal (ou: uv run vitrine-relatorio 15)
uv run vitrine-lojista     # gera e abre o relatorio_lojista.html
uv run pytest              # testes
```

Na primeira execução, o modelo é baixado do GitHub da Ultralytics. Atrás de um proxy corporativo que troca o certificado SSL, rode com `VITRINE_SSL_VERIFY=0`, que vale só para esse download.

## Integração com a API (T3, issue #29)

Os resumos e alertas ainda ficam só nos JSON locais. A T3 liga a câmera à API:

- `POST /vitrine/eventos`: cada resumo de 10 s, no mesmo formato do `vitrine_eventos.json`;
- `POST /vitrine/alertas`: `atencao_alta`, `lotacao` e `apontou`;
- `GET /vitrine/resumo`: passantes, % que olhou, pico e ações, com a mesma lógica de `resumo()` e `acoes()` de `lojista.py`.

Os valores são estimativas. A precisão ainda não foi validada com contagem manual.
