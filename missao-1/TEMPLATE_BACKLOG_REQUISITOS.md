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

## 3. User Stories (Histórias de Usuário) com Critérios de Aceite (BDD)

### 🔴 MUST HAVE (Essenciais para o MVP — Missão 2)

#### US-01: [Título da Funcionalidade Central]
* **Como** [tipo de usuário/persona],
* **Eu quero** [realizar uma ação específica],
* **Para que** [obtenha o benefício primário e resolva a dor central].
* **Critérios de Aceite (Gherkin/BDD):**
  * *Cenário 1: Sucesso no fluxo principal*
    * **Dado que** o usuário acessa a plataforma e preenche os dados válidos,
    * **Quando** clicar no botão de confirmação,
    * **Então** o sistema deve processar os dados em <1s e exibir o resultado consolidado.
  * *Cenário 2: Validação de dados incorretos*
    * **Dado que** o usuário deixa campos obrigatórios em branco,
    * **Quando** tentar submeter,
    * **Então** o sistema deve bloquear o envio e exibir alertas claros de validação.

#### US-02: [Integração de IA Especializada]
* **Como** [usuário/gestor],
* **Eu quero** [gerar insights automáticos / análise assistida por IA],
* **Para que** [tome decisões inteligentes sem esforço manual].
* **Critérios de Aceite:**
  * *Cenário 1: Geração de resposta inteligente*
    * **Dado que** o usuário solicita a geração assistida pelo modelo,
    * **Quando** a requisição for processada pela API,
    * **Então** a resposta deve ser devolvida estruturada em JSON/Markdown sanitizado com fallbacks caso ocorra timeout.

#### US-03: [Dashboard / Painel de Visualização de Resultados]
* **Como** [gestor/usuário],
* **Eu quero** [visualizar os indicadores e dados sintetizados],
* **Para que** [tenha controle total e visibilidade instantânea].
* **Critérios de Aceite:**
  * *Cenário 1: Renderização de métricas*
    * **Dado que** existem dados cadastrados ou gerados no sistema,
    * **Quando** o usuário abrir o dashboard,
    * **Então** as métricas consolidadas e gráficos devem ser renderizados de forma reativa.

---

### 🟡 SHOULD HAVE (Diferenciais de Alto Impacto)

#### US-04: [Exportação de Relatórios / Alertas Proativos]
* **Como** [usuário],
* **Eu quero** [exportar o relatório consolidado em PDF/JSON ou receber alertas],
* **Para que** [possa compartilhar o resultado formalmente com stakeholders].

#### US-05: [Filtros Dinâmicos e Busca em Tempo Real]
* **Como** [usuário],
* **Eu quero** [filtrar e pesquisar registros instantaneamente],
* **Para que** [encontre informações sem recarregar a tela].

---

### 🟢 COULD HAVE (Polimento e Conveniência)
* **US-06:** Modo Noturno (Dark Mode) adaptável.
* **US-07:** Efeitos sonoros sutis em Web Audio API para feedbacks de ação concluída.

---

### ⚪ WON'T HAVE (Roadmap Futuro)
* Integração nativa com 15 ERPs legados de mercado simultaneamente.
* Aplicativo nativo em lojas (Google Play / App Store) — substituído com eficácia pelo formato Web PWA responsivo.
