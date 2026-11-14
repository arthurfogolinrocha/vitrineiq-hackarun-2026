# VitrineIQ — Inteligência Comercial em Tempo Real

> 📁 **Documentação e entregas:** veja a pasta [`docs/`](./docs/). Missão 1: [`docs/missao-1/`](./docs/missao-1/).

> **1º HackaRun UniCatólica 2026 • Capim Dourado Shopping (Palmas – TO)**  
> **Desafio 06:** *Inteligência comercial para lojistas* | **Roleta:** *STORIES (User Stories)*  
> **🌐 App Web Ao Vivo:** https://vitrineiq-capim-dourado.vercel.app  
> **⚡ API Python (FastAPI / Swagger):** https://vitrineiq-hackarun-2026-api.vercel.app/docs  
> **📊 Quadro Kanban (GitHub Projects):** https://github.com/users/arthurfogolinrocha/projects/1  
> **📋 Primeira Entrega (`Missão 1`):** [`docs/missao-1`](./docs/missao-1/) • [`Acordo & Kanban`](./docs/materiais-de-apoio/planejamento/ACORDO_DE_TRABALHO_E_KANBAN.md)

O **VitrineIQ** conecta duas pontas do varejo físico em tempo real para resolver o maior ponto cego do lojista de shopping: entender **por que o consumidor não comprou**, **o que ele procura no corredor agora** e **quais fatores externos e rotas entre segmentos** geram oportunidades imediatas de venda — sem cadastro nem dados pessoais: a câmera da vitrine processa a imagem no próprio aparelho, pixeliza rostos no preview e envia **só contagens**, e o hardware é uma webcam comum.

> 🏆 **Nível de Engenharia Auditado: `9.8 / 10`** • `158` testes automatizados verdes (`107 pytest` + `51 Vitest`) + Smoke E2E/WCAG (`Playwright` + `axe-core`), CSP estrita sem script inline, fontes auto-hospedadas, fila offline no Balcão e `Deploy Vercel Production` ativo.

---

## 🎯 Pilares da Solução (7 Telas Operacionais + Multi-Tenant)

1. **Painel do Lojista + Copiloto Gemini (`RetailerCockpit` + `POST /api/ia/plano`):**
   * Recalcula em tempo real o **Score de Oportunidade (0–100)** por loja/ala cruzando clima em Palmas, faixa horária, eventos do shopping (ex: estreias no Cinemark), objeções de venda e os sinais ao vivo da vitrine.
   * **Agente de IA no backend Python** (Gemini no servidor, provedor intercambiável) + fallback heurístico determinístico em `< 300ms` para planos de ação imediatos, textos de WhatsApp e **Campanhas Relâmpago** / **Vitrine Crowd-Drop** em 1 clique.
2. **Tour 3D WebGL Oficial do Capim Dourado Shopping (`ShoppingMap3D` + `map3d/`):**
   * Maquete interativa modular em **Three.js** com **scroll zoom (`OrbitControls`)**, **4 Portarias de Entrada iluminadas**, **3 Estacionamentos demarcados (`Av. NS-05`, `Av. JK`, `Av. LO-2A`)**, **2º Piso (`Praça de Alimentação`)** com escada rolante e modo **Street View ("Entrar no Shopping")** para caminhar pelos corredores e olhar as vitrines.
3. **Sensor Webcam na Vitrine — Borda LGPD (`EdgeVisionSensor` + `vision/`):**
   * Conecta uma **webcam real** (ou simulador) para detectar movimento por região (**Corredor**, **Vitrine** e **Porta**) em RAM sem gravar imagens, contando passantes, paradas na vitrine e entradas, além de exibir trilha auditável de câmera.
4. **Modo Balcão 1-Toque com Fila Offline (`CounterQuickLog` + `useOfflineQueue`):**
   * Registro em 2 segundos pelo vendedor do motivo de venda perdida (*Preço/Parcelamento*, *Sem Tamanho/Estoque*, *Só Olhando*, *Fila/Demora*), com enfileiramento resiliente caso a rede oscile.
5. **Concierge QR do Consumidor (`ConsumerConcierge`):**
   * Experiência web pública e instantânea via QR Code (`?tela=concierge`, zero app, zero login/CPF): o visitante informa o que procura, desbloqueia um cupom relâmpago na hora e alimenta o radar da ala anonimamente.
6. **LGPD, Segurança & Backend Python (`SecurityAuditPanel` + `api/`):**
   * Autenticação HMAC (`POST /api/auth/entrar`, `PATCH /api/auth/senha`), bloqueio anti-bruteforce, sanitização anti-XSS/Prompt Injection, validação condicional CORS-safe (`?etag=`) e registro rastreável.
7. **Gestão Multi-Tenant de Lojistas (`LojistasAdmin` + `StoreTenantSwitcher`):**
   * Controle de contas por loja e ala com isolamento estrito de escopo para lojistas e troca rápida de contexto para administração/demonstração.

---

## 📁 Estrutura do Repositório

* [`docs/missao-1/`](./docs/missao-1/) — Primeira entrega: planejamento técnico, PDF de requisitos e prints.
* [`docs/missao-2/`](./docs/missao-2/) — Evidências do protótipo funcional, testes automatizados e hardening `9.8/10`.
* [`docs/missao-3/`](./docs/missao-3/) — Entrega final: roteiro, vídeo de pitch, declaração ética de IA (Artigo 6) e checklist.
* [`frontend/`](./frontend) — Aplicação React 19 + TypeScript strict + Vite + Tailwind CSS + Three.js modular (`map3d/`, `cockpit/`, `vision/`, `app/`, `hooks/`) + Suíte Vitest (`51` testes).
* [`api/`](./api) — Backend Python + FastAPI + Uvicorn (`/api/score`, `/api/ia/plano`, `/api/estado`, `/api/vitrine/*`, `/api/auth/*`, `/api/audit/hash`) + Suíte `pytest` (`107` testes).
* [`computer-vision/`](./computer-vision) — Visão computacional da vitrine (`YOLO` + `OpenCV`): script da câmera que conta passantes e atenção (só contagens anônimas) e envia para `/vitrine/*` da API.
* [`frontend/scripts/e2e-smoke.mjs`](./frontend/scripts/e2e-smoke.mjs) & [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) — Pipeline de CI completo com verificação de cabeçalhos/CSP, Playwright E2E multi-viewport e auditoria WCAG (`axe-core`).

---

## ⚙️ Como Rodar Localmente

### Pré-requisitos
* Node.js 20+ e npm
* Python 3.10+ (para rodar a API FastAPI e os testes `pytest`)

### Instalação e Execução
```bash
# 1. Frontend (React + Vite)
npm --prefix frontend install
cp frontend/.env.example frontend/.env   # opcional: aponte VITE_API_URL
npm --prefix frontend run dev

# 2. Backend (Python + FastAPI)
cd api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env                             # opcional: GEMINI_API_KEY no servidor
uvicorn app.main:app --reload --port 8000
```

### Rodar com Docker

Pré-requisito: Docker (no Windows e no macOS, o Docker Desktop aberto). Sobe o banco (Postgres), a API e o front:

```bash
cp .env.example .env    # troque ADMIN_SENHA; GEMINI_API_KEY é opcional
docker compose up --build
```

* Front: http://localhost:8080 (o nginx repassa `/api/*` para a API, então não há CORS nem URL para configurar). Porta ocupada? Mude `FRONTEND_PORT` no `.env`.
* API: http://localhost:8000/api/health (e a documentação em http://localhost:8000/docs).
* Os dados ficam no volume `pgdata` e sobrevivem a `docker compose down`; `docker compose down -v` apaga tudo.
* Celular na mesma rede Wi-Fi: abra `http://<IP-do-computador>:8080/?tela=concierge&ala=<ala>` (o QR do pôster aponta para a versão publicada na Vercel, não para o container).
* Para apontar o front para outra API, construa com `docker compose build --build-arg VITE_API_URL=https://sua-api frontend`.

**Câmera da vitrine (`computer-vision/`) fica fora do compose:** webcam dentro de container não funciona no Docker Desktop do Windows e do macOS (não há repasse de USB/DirectShow), e a imagem com o YOLO passaria de alguns GB. Ela roda no host com `uv` e manda as contagens para a API do container:

```powershell
cd computer-vision
$env:VITRINE_CAMERA = '1'; $env:VITRINE_API_URL = 'http://localhost:8000'; uv run vitrine-camera
```

Sem webcam, use um vídeo gravado com `VITRINE_VIDEO` (detalhes em [`computer-vision/README.md`](./computer-vision/README.md)). Se `VITRINE_TOKEN` estiver no `.env`, defina o mesmo valor na câmera.

### Testes Automatizados & Build
```bash
# Roda testes unitários TypeScript (Vitest) + Python (pytest)
npm run test

# Gera build de produção
npm run build
```

---

## 👥 Equipe & Colaboradores
* `@arthurfogolinrocha`
* `@MCPS9`
* `@LCapistrano25`
* `@jesseLR-stack`
