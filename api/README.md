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
| `POST` | `/api/auth/login` | Login (`{usuario, senha}`) → `{token, usuario}`. Máx. 10 tentativas/min por IP |
| `GET` | `/api/auth/eu` | Usuário do token (`nome, papel, lojaId, lojaNome, zoneId`) |
| `GET/POST` | `/api/admin/lojistas` | Só admin: lista e cria contas de lojista (uma conta = uma loja) |
| `DELETE` | `/api/admin/lojistas/{id}` | Só admin: apaga a conta (o lojista perde o acesso na hora) |

**Login:** o token vai em `Authorization: Bearer <token>` e vale 12 h. Exigem login: `GET /api/estado`, `POST/DELETE /api/balcao`, `POST/PATCH/DELETE /api/campanhas`, `GET /api/vitrine/resumo` e `POST /api/ia/plano`. O lojista só vê e altera vendas, perdas e campanhas da loja dele, e câmera e Concierge da ala dele; o admin vê tudo. Continuam abertas as rotas do visitante (busca no Concierge, limitada a 20 por minuto por IP, e campanhas ativas) e as da câmera (com `X-Vitrine-Token`). Variáveis: `AUTH_SECRET` (obrigatória em produção, com 32 caracteres ou mais; trocá-la derruba todos os tokens), `ADMIN_USUARIO` e `ADMIN_SENHA` (veja `.env.example`). Senhas ficam no banco só como hash PBKDF2-SHA256.

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

