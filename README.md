# VitrineIQ — Inteligência Comercial em Tempo Real

> 📁 **Documentação e entregas:** veja a pasta [`docs/`](./docs/). Missão 1: [`docs/missao-1/`](./docs/missao-1/).

> **1º HackaRun UniCatólica 2026 • Capim Dourado Shopping (Palmas – TO)**  
> **Desafio 06:** *Inteligência comercial para lojistas* | **Roleta:** *STORIES (User Stories)*  
> **🌐 App Web Ao Vivo:** https://vitrineiq-capim-dourado.vercel.app  
> **⚡ API Python (FastAPI / Swagger):** https://vitrineiq-hackarun-2026-api.vercel.app/docs  
> **📊 Quadro Kanban (GitHub Projects):** https://github.com/users/arthurfogolinrocha/projects/1  
> **📋 Primeira Entrega (`Missão 1`):** [`docs/missao-1`](./docs/missao-1/) • [`Acordo & Kanban`](./docs/materiais-de-apoio/planejamento/ACORDO_DE_TRABALHO_E_KANBAN.md)

O **VitrineIQ** conecta duas pontas do varejo físico em tempo real para resolver o maior ponto cego do lojista de shopping: entender **por que o consumidor não comprou**, **o que ele procura no corredor agora** e **quais fatores externos e rotas entre segmentos** geram oportunidades imediatas de venda — tudo **100% anônimo (Privacy by Design / LGPD)** e sem depender de câmeras invasivas ou instalação de hardware caro.

---

## 🎯 Pilares da Solução

1. **Painel do Lojista + Agente de IA (`RetailerCockpit` + `POST /api/ia/plano`):**
   * Recalcula em tempo real o **Score de Oportunidade (0–100)** por ala cruzando clima em Palmas, faixa horária, eventos do shopping (ex: estreias no Cinemark), objeções de venda e os dados ao vivo do **Sensor Câmera**.
   * **Agente de IA no backend Python** (Gemini no MVP, provedor intercambiável, chave só no servidor) + fallback heurístico resiliente para gerar planos de ação imediatos, textos prontos de WhatsApp e **Campanhas Relâmpago** em 1 clique.
2. **Sensor Webcam na Vitrine — Borda LGPD (`EdgeVisionSensor`):**
   * Conecta uma **webcam real** (ou simulador 60fps) para detectar movimento por região (**Corredor**, **Vitrine** e **Porta**) em RAM sem gravar imagens, contando quem passa, quem para na vitrine, quem entra e quem sai e alimentando o Painel em tempo real.
3. **Tour 3D WebGL Oficial do Capim Dourado Shopping (`ShoppingMap3D` + `ShoppingMap`):**
   * Maquete interativa em **Three.js** com **scroll zoom (`OrbitControls`)**, **4 Portarias de Entrada iluminadas**, **3 Estacionamentos demarcados (`Av. NS-05`, `Av. JK`, `Av. LO-2A`)**, **2º Piso (`Praça de Alimentação`)** com escada rolante e modo **Street View ("Entrar no Shopping")** para caminhar pelos corredores e olhar as vitrines.
4. **Modo Balcão — 1 Toque (`CounterQuickLog`):**
   * Registro em 2 segundos pelo vendedor do motivo de venda perdida (*Preço/Parcelamento*, *Sem Tamanho/Estoque*, *Só Olhando*, *Fila/Demora*).
5. **Concierge QR do Consumidor (`ConsumerConcierge`):**
   * Experiência web instantânea via QR Code (zero app, zero login/CPF): o consumidor informa o que procura, desbloqueia um cupom relâmpago na hora e alimenta o painel da ala anonimamente.
6. **Story Map Interativo — Item Obrigatório da Roleta (`UserStoriesBoard`):**
   * Aba dedicada **User Stories** + modo **Slide de Abertura** conectando cada história de usuário diretamente à tela funcional correspondente.

---

## 📁 Estrutura do Repositório

* [`docs/materiais-de-apoio/planejamento/`](./docs/materiais-de-apoio/planejamento) — Planejamento técnico inicial, telas propostas, arquitetura e integração da Roleta Tecnológica *(Entrega: Sexta 13/11 até 12h)*.
* [`missao-2/app/`](./missao-2/app) — Aplicação React 19 + TypeScript + Vite + Tailwind CSS + Suíte Vitest (`19` testes).
* [`missao-2/backend/`](./missao-2/backend) — Backend Python + FastAPI + Uvicorn (`/api/score`, `/api/ia/plano`, `/api/audit/hash`) + Suíte `pytest` (`27` testes).
* [`docs/materiais-de-apoio/pitch-e-entrega-final/`](./docs/materiais-de-apoio/pitch-e-entrega-final) — Documentação final, declaração ética de uso de IA (Artigo 6) e roteiro do pitch.

---

## ⚙️ Como Rodar Localmente

### Pré-requisitos
* Node.js 20+ e npm
* Python 3.10+ (para rodar a API FastAPI e os testes `pytest`)

### Instalação e Execução
```bash
# 1. Frontend (React + Vite)
npm --prefix missao-2/app install
cp missao-2/app/.env.example missao-2/app/.env   # opcional: aponte VITE_API_URL
npm --prefix missao-2/app run dev

# 2. Backend (Python + FastAPI)
cd missao-2/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env                             # opcional: GEMINI_API_KEY no servidor
uvicorn app.main:app --reload --port 8000
```

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
