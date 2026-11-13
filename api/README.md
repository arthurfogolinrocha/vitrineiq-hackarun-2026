# VitrineIQ API — Backend Python (HackaRun 2026)

Backend do **VitrineIQ**, plataforma de inteligência comercial para lojistas do Capim Dourado Shopping (Palmas-TO).

- **Repositório único (Monorepo):** https://github.com/arthurfogolinrocha/vitrineiq-hackarun-2026 (`frontend` + `api`)
- **App em produção:** https://vitrineiq-capim-dourado.vercel.app
- **API em produção:** https://vitrineiq-hackarun-2026-api.vercel.app — documentação interativa em [`/docs`](https://vitrineiq-hackarun-2026-api.vercel.app/docs)

## O que a API faz

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Status do serviço e se o provedor de IA está configurado |
| `POST` | `/api/score` | Score de Oportunidade (0–100) + multiplicador de contexto (clima de Palmas, horário, eventos do shopping) |
| `POST` | `/api/ia/plano` | Agente de IA: plano de ação, texto de cupom e parceria cross-segmento. Timeout de 4,5 s e fallback heurístico |
| `POST` | `/api/audit/hash` | Hash SHA-256 encadeado (`prevHash:id:timestamp:payload`) para a trilha de auditoria |

### Exemplo

```bash
curl -X POST https://vitrineiq-hackarun-2026-api.vercel.app/api/score \
  -H "Content-Type: application/json" \
  -d '{"zone_id":"praca-alimentacao-l2","time_slot":"almoco","vitrine_stops":140,"qr_searches":8,"lost_sales":5}'
```

## Estrutura

```
app/
├── main.py       # Rotas FastAPI e CORS
├── engine.py     # Motor do Score de Oportunidade (fonte de verdade)
├── ai_agent.py   # Agente de IA com provedor intercambiável (Gemini no MVP) + fallback
├── security.py   # Sanitização, bloqueio de prompt injection e hash SHA-256
└── schemas.py    # Contratos de entrada/saída (Pydantic)
tests/            # pytest: motor, segurança e endpoints
index.py          # Entrypoint da Vercel
```

## Privacidade e segurança (LGPD)

- A API recebe **apenas números agregados e anônimos** (paradas na vitrine, buscas QR, vendas perdidas). Nenhum dado pessoal, imagem ou CPF.
- A chave do provedor de IA fica **só no servidor** (`GEMINI_API_KEY`), nunca no navegador.
- Entradas são sanitizadas e pedidos com padrões de prompt injection são bloqueados antes de chegar à IA.
- Os valores são validados (sem números negativos, alas desconhecidas ou textos acima do limite).

## Rodando localmente

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env          # opcional: GEMINI_API_KEY para respostas da IA real
uvicorn app.main:app --reload --port 8000
```

Abra http://localhost:8000/docs. Sem chave de IA, o agente responde com o plano heurístico local.

## Testes

```bash
pytest -q
```

Os testes cobrem limites do score, multiplicadores de contexto, **paridade com o espelho TypeScript do frontend**, hash SHA-256, bloqueio de prompt injection, validação de entrada e fallback do agente quando o provedor falha.

## Time

Arthur Fogolin · Jesse · Matheus Carvalho · Leonardo Capistrano — 1º HackaRun UniCatólica 2026.

