# 🤖 Declaração Formal de Uso Ético e Transparente de IA — VitrineIQ
**1º HackaRun UniCatólica 2026 — Em Conformidade com o Artigo 6 do Regulamento**

---

## 1. Identificação da Equipe e Projeto
* **Nome do Projeto / Solução:** **VitrineIQ** — Inteligência de Vitrine, Fluxo Físico e Conversão para Lojistas (Capim Dourado Shopping • Palmas-TO)
* **Desafio:** `06. Inteligência comercial para lojistas` | **Roleta:** `STORIES (User Stories)`
* **Integrantes da Equipe:**
  * Arthur Fogolin Rocha (`@arthurfogolinrocha`) — Inteligência Artificial / UniCatólica *(Líder Técnico)*
  * Jessé (`@jesseLR-stack`) — UniCatólica
  * `@MCPS9` — UniCatólica *(confirmar nome completo se disponível)*
  * Leonardo Capistrano (`@LCapistrano25`) *(confirmar curso antes do envio final de sábado)*
* **Repositório Oficial:** `https://github.com/arthurfogolinrocha/vitrineiq-hackarun-2026`
* **Aplicação em Produção:** `https://vitrineiq-capim-dourado.vercel.app`
* **Backend API (FastAPI / Docs):** `https://vitrineiq-hackarun-2026-api.vercel.app/docs`
* **Data da Submissão Final (Missão 3):** 14 de Novembro de 2026

---

## 2. Inventário de Ferramentas, Motores e Modelos Utilizados

| Ferramenta / Modelo | Provedor / Stack | Finalidade de Uso no Projeto |
|---|---|---|
| **Agente de IA via Backend Python (`POST /api/ia/plano`)** | FastAPI + Gemini Flash (provedor intercambiável) | Geração sob demanda de planos táticos de vitrine, reposição de grade e copywriting de ofertas relâmpago a partir de métricas agregadas anônimas, com chave protegida no servidor. |
| **Motor de Score VitrineIQ (Python + Espelho TS)** | Autoria Própria (`api/app/engine.py` + `opportunityEngine.ts`) | Cálculo matemático auditável do `IQ Score (0–100)` e multiplicadores de clima/horário/evento, com paridade garantida por testes (`Vitest` + `pytest`). |
| **Visão Computacional em Borda (`EdgeVisionSensor`)** | WebRTC + HTML5 Canvas (Local RAM) | Análise anônima por diferença de pixels em zonas geométricas (Corredor, Vitrine, Porta) com borramento LGPD em tempo real — zero gravação de vídeo e zero biometria facial. |
| **Three.js / WebGL** | Open Source | Construção e renderização do Gêmeo Digital 3D do Capim Dourado Shopping (Pavimentos L1/L2, Subsolo SS1, escada rolante, 4 portarias, 3 estacionamentos e modo Street View). |
| **Google Antigravity IDE** | Google | Apoio estrutural na arquitetura modular (`map3d/`, `cockpit/`, `vision/`, `app/`), expansão da suíte de testes automatizados (`50` Vitest + `107` pytest = `157` testes + Smoke E2E/WCAG Playwright), revisão de acessibilidade e documentação técnica. |

---

## 3. Justificativa Técnica, Privacidade (LGPD) & Guardrails
A Inteligência Artificial foi incorporada como **camada de decisão estratégica ética**, seguindo três garantias verificáveis no código:
1. **Zero Coleta de Dados Pessoais (Privacy by Design):** O módulo `EdgeVisionSensor` processa frames exclusivamente na memória RAM local do navegador do lojista, aplicando desfoque visual (`Blur LGPD`), sem armazenar imagens nem identificar rostos. O módulo `ConsumerConcierge` opera via QR Code sem exigir CPF, nome ou telefone.
2. **Resiliência Total sem Falha de Palco (`ai.ts`):** Caso a chave de API externa não esteja configurada no ambiente público ou haja indisponibilidade de rede, o motor entra automaticamente em **Fallback Heurístico de Varejo**, entregando recomendações contextualizadas em `< 300ms`.
3. **Sanitização & Auditoria SHA-256 (`security.ts` + `SecurityAuditPanel.tsx`):** Todos os inputs passam por bloqueio de tags `<script>` e padrões de prompt injection antes de qualquer inferência, com geração de trilha auditável verificada por testes automatizados.

---

## 4. Declaração de Autoria e Domínio Técnico
Declaramos formalmente perante a Banca Examinadora do **1º HackaRun UniCatólica 2026** que:
* Todos os integrantes da equipe compreendem a arquitetura, as regras matemáticas (`Python` e `TypeScript`) e o funcionamento completo do sistema apresentado;
* Todo código-fonte foi inspecionado, testado (`50/50` Vitest, `107/107` pytest e smoke E2E/WCAG com Playwright + `axe-core`) e validado em produção na Vercel (`9.8 / 10` na auditoria técnica);
* Nenhum dado pessoal sensível ou protegido pela LGPD é enviado a modelos públicos de IA;
* A solução está apta para demonstração ao vivo e arguição técnica presencial no Capim Dourado Shopping.
