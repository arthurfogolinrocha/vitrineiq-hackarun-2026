# 📋 Backlog de Requisitos Estruturado & Priorização MoSCoW
**1º HackaRun UniCatólica 2026 — Missão 1 (Requisitos & Engenharia de Software)**

---

## 1. Metodologia de Priorização MoSCoW

| Prioridade | Definição no HackaRun | Foco de Entrega |
|---|---|---|
| **Must Have (Obrigatório)** | Requisitos vitais para o MVP. Sem eles, o produto não existe ou não resolve o problema da Missão. | **Entrega na Missão 2 (100% testado)** |
| **Should Have (Importante)** | Agrega valor crítico e diferenciação, mas o produto funciona caso atrase. | **Entrega na Missão 2 / Início da Missão 3** |
| **Could Have (Desejável)** | Recursos de conveniência, estética avançada ou integrações extras. | **Implementado se houver tempo hábil** |
| **Won't Have (Fora de Escopo)** | Ideias mapeadas para o futuro que não serão desenvolvidas no Hackathon. | **Backlog Futuro (Roadmap v2.0)** |

---

## 2. Requisitos Funcionais (RF) e Não-Funcionais (RNF)

### Requisitos Não-Funcionais (Padrão Enterprise / Nível Governamental)
* **RNF-01 (Performance & Latência):** O tempo de resposta das consultas principais deve ser inferior a 300ms.
* **RNF-02 (Segurança & Sanitização):** Todos os inputs do usuário devem ser validados e higienizados contra injeção de script (XSS) e prompt injection antes do envio às APIs de IA.
* **RNF-03 (Responsividade & Acessibilidade):** Interface compatível com dispositivos móveis (375px+) e desktop widescreen, seguindo contraste WCAG AA.
* **RNF-04 (Confiabilidade & Testabilidade):** O core da lógica de negócios e cálculo deve ter suíte de testes unitários automatizados com 100% dos testes passando.
* **RNF-05 (Disponibilidade & Deploy):** Aplicação empacotada e hospedada com HTTPS ativo e deploy contínuo na Vercel/Cloudflare.

---

## 3. User Stories (Histórias de Usuário — Item Obrigatório da Roleta: STORIES)

### 🔴 MUST HAVE (Essenciais para o MVP — Missão 2)

#### US-01: Horário de Pico, Clima e Ação Comercial em 1 Clique (Painel Lojista & Agente de IA)
* **Como** lojista de shopping no Capim Dourado Shopping,
* **Eu quero** saber o horário de pico, o efeito do clima/eventos no meu segmento e gerar campanhas relâmpago em 1 clique,
* **Para que** eu ajuste escala, estoque e promoções antes da concorrência sem depender de planilhas.
* **Critérios de Aceite (Gherkin/BDD):**
  * *Cenário 1: Recálculo contextual em tempo real*
    * **Dado que** o lojista seleciona clima (ex: Calor 38°C), horário (ex: Pós-Cinema 20h) e evento do shopping,
    * **Quando** qualquer fator muda no painel,
    * **Então** o sistema deve recalcular o Score de Oportunidade (0–100) em <300ms e liberar diagnóstico tático via IA/fallback resiliente.
  * *Cenário 2: Lançamento de Campanha Relâmpago*
    * **Dado que** o lojista preenche título e código do cupom no modal,
    * **Quando** confirmar a publicação,
    * **Então** a campanha deve ficar visível instantaneamente no Concierge QR do consumidor.

#### US-02: Webcam na Vitrine Alimentando o Painel em Tempo Real (Sensor de Borda LGPD)
* **Como** gerente de loja física,
* **Eu quero** conectar uma webcam apontada para a fachada/vitrine para contar quem passa, quem para e quem entra/sai,
* **Para que** os dados reais de fluxo alimentem automaticamente o painel sem gravar imagens nem violar a LGPD.
* **Critérios de Aceite (Gherkin/BDD):**
  * *Cenário 1: Processamento anônimo na borda*
    * **Dado que** o usuário ativa a webcam local na aba `Sensor Câmera`,
    * **Quando** houver movimento nas regiões virtuais (Corredor, Vitrine e Porta),
    * **Então** o sistema deve processar a diferença de pixels em RAM (<5ms, sem salvar vídeo), atualizar os contadores e elevar o fluxo da ala no Painel Lojista.

#### US-03: Registro de Venda Perdida em 1 Toque (Modo Balcão)
* **Como** vendedor atendendo no balcão da loja,
* **Eu quero** registrar em menos de 2 segundos o motivo real pelo qual o cliente não concluiu a compra,
* **Para que** objeções como falta de numeração/grade ou parcelamento virem ações reais de reposição e oferta.
* **Critérios de Aceite (Gherkin/BDD):**
  * *Cenário 1: Registro tátil instantâneo*
    * **Dado que** o vendedor seleciona a ala e a objeção ocorrida,
    * **Quando** tocar em registrar,
    * **Então** o sistema deve atualizar imediatamente o ranking de gargalos da ala no Mapa 3D e na trilha de auditoria.

---

### 🟡 SHOULD HAVE (Diferenciais de Alto Impacto)

#### US-04: Descoberta Guiada Sem App e Sem Login (Concierge QR Consumidor)
* **Como** consumidor caminhando pelos corredores do Capim Dourado Shopping,
* **Eu quero** escanear um QR Code, informar o que procuro no meu orçamento e receber um cupom na hora sem cadastrar CPF ou baixar app,
* **Para que** eu encontre o produto certo rápido e o shopping capture a intenção de demanda anonimamente.

#### US-05: Planta Mix Oficial em 3D com Rotas e Espaços Vagos (Mapa 3D Capim Dourado)
* **Como** superintendente ou lojista em expansão,
* **Eu quero** navegar pelos 2 pavimentos oficiais (Térreo e Praça de Alimentação) em 3D com calor de demanda e espaços vagos mapeados,
* **Para que** eu identifique rotas quentes entre âncoras e oportunidades para novas operações.

---

### 🟢 COULD HAVE (Polimento e Conveniência)
* **US-06:** Modo Noturno (Dark Mode) adaptável.
* **US-07:** Efeitos sonoros sutis em Web Audio API para feedbacks de ação concluída.

---

### ⚪ WON'T HAVE (Roadmap Futuro)
* Integração nativa com 15 ERPs legados de mercado simultaneamente.
* Aplicativo nativo em lojas (Google Play / App Store) — substituído com eficácia pelo formato Web PWA responsivo.

