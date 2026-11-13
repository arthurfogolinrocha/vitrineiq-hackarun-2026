# Primeira Entrega — Planejamento Técnico Inicial (`Missão 1`)

**Projeto:** VitrineIQ — Inteligência de Vitrine, Fluxo Físico e Conversão para Lojistas do Capim Dourado Shopping (Palmas-TO)  
**Evento:** 1º HackaRun UniCatólica 2026  
**Entrega prevista:** Sexta-feira, 13/11, até 12h00  
**Repositório Público Oficial:** `https://github.com/arthurfogolinrocha/vitrineiq-hackarun-2026`  
**Link Público do Sistema (Preview ao Vivo):** `https://vitrineiq-capim-dourado.vercel.app`  
**Quadro Kanban & Acordo do Time (OKRs + Daily):** [`ACORDO_DE_TRABALHO_E_KANBAN.md`](./ACORDO_DE_TRABALHO_E_KANBAN.md)  
**Equipe:** Arthur Fogolin Rocha (`arthurfogolinrocha`), Jessé (`jesseLR-stack`), `MCPS9` e `LCapistrano25`.

---

## 1. Proposta e Estrutura Inicial das Telas

A interface adota o conceito **Capim Dourado Editorial Bento UI** (Sidebar escura Obsidian `#111318` com acentos Champagne Gold `#E2A83B` sobre canvas arquitetural claro `#F4F2EE`), projetada para que o lojista entenda seus gargalos e tome decisão em menos de 10 segundos:

1. **Tela 01 — Painel Executivo do Lojista (`RetailerCockpit`):**
   - **Hero Card com Medidor SVG Circular (IQ Score 0–100):** Resume a oportunidade do corredor em tempo real, combinando paradas na vitrine, buscas QR e perdas no balcão.
   - **Funil Físico da Porta:** Visualiza proporcionalmente `Passaram no Corredor → Pararam na Vitrine → Entraram na Loja → Compra Concluída`.
   - **Gráfico Interativo de Horário de Pico (`10h`–`22h`):** Permite clicar em turnos (`Manhã`, `Almoço`, `Tarde`, `Pico Noite`) e simular Clima de Palmas (`Sol 38°C`, `Chuva Forte`, `Ameno`) e Eventos (`Estreia Cinemark`, `Dia de Pagamento`).
   - **Agente de IA & Oferta Relâmpago:** Gera, via backend Python, plano tático imediato e publica cupons com texto pronto para WhatsApp.
2. **Tela 02 — Gêmeo Digital Shopping 3D (`ShoppingMap3D` + `ShoppingMap`):**
   - Maquete 3D em **WebGL (Three.js)** fiel ao mix real do Capim Dourado Shopping (`Térreo L1` e `2º Piso L2`, com escada rolante e rotas animadas).
   - **Scroll Zoom (`OrbitControls`)**, seleção direta clicando nas fachadas e modo **Entrar no Shopping (Street View)** em primeira pessoa com caminhada por corredor (`W A S D` / botões) e botão **Subir ao 2º Andar / Descer ao Térreo**, além de alternância rápida para **Planta 2D Técnica**.
3. **Tela 03 — Sensor Webcam de Vitrine (`EdgeVisionSensor`):**
   - Conecta uma webcam comum (ou simulador calibrado em Canvas para palco) analisando em memória **quem passa no corredor, quem para na vitrine, quem entra na loja e quem sai**, alimentando o Painel em tempo real sem gravar vídeo nem reconhecer rostos (Privacy by Design).
4. **Tela 04 — Modo Balcão / Caixa em 1 Toque (`CounterQuickLog`):**
   - Vendedor registra o motivo real de não-fechamento (`Preço`, `Sem Tamanho/Grade`, `Só Pesquisando`, `Fila`) em 1 toque.
5. **Tela 05 — Concierge QR para o Cliente (`ConsumerConcierge`):**
   - Totem/QR anônimo na vitrine onde o visitante escolhe orçamento/desejo sem informar CPF, recebe cupom imediato e sinaliza demanda real ao lojista.
6. **Telas 06 e 07 — User Stories (Roleta) & Governança LGPD:**
   - Painel rastreável ligando cada história obrigatória à tela correspondente + trilha de auditoria SHA-256 dos registros.

---

## 2. Documentação Inicial do Projeto

Toda a documentação estruturante da Fase 1 está versionada no diretório `missao-1/`:
- [`TEMPLATE_DEFESA_DO_PROBLEMA.md`](./TEMPLATE_DEFESA_DO_PROBLEMA.md): Dor real dos lojistas de shopping ("efeito vitrine sem dados"), impacto financeiro e alinhamento com o consumidor local.
- [`TEMPLATE_LEAN_CANVAS.md`](./TEMPLATE_LEAN_CANVAS.md) e [`canvas_executivo.html`](./canvas_executivo.html): Modelo de negócio completo em 9 blocos focado em SaaS B2B para lojistas e inteligência de mix para a administração do shopping.
- [`TEMPLATE_BACKLOG_REQUISITOS.md`](./TEMPLATE_BACKLOG_REQUISITOS.md): Backlog priorizado com **MoSCoW** e critérios de aceitação **BDD (Dado / Quando / Então)** das 5 User Stories centrais.

---

## 3. Linguagem de Programação Escolhida

- **TypeScript (`Strict Mode`) com React — frontend:** interface (`React 19`), mapa 3D e sensor de vitrine, com segurança de tipos para os modelos de telemetria, zonas (`L1`/`L2`), eventos de balcão e respostas da IA.
- **Python — backend:** API em **FastAPI** que calcula o Score de Oportunidade (`backend/app/engine.py`), sanitiza as entradas e chama o Agente de IA guardando a chave da API no servidor. Escolhido por ser forte em dados e integração com IA, e por facilitar as evoluções previstas (importação de vendas em planilha com pandas).

---

## 4. Arquitetura Proposta

Arquitetura **frontend + backend** em 3 camadas, sem coleta de dados pessoais:

1. **Frontend — Captação anônima e visualização (React + TypeScript, navegador):**
   - *Sensor óptico (WebRTC `getUserMedia` + Canvas Frame-Diff):* analisa variação de pixels em zonas (Corredor, Vitrine e Porta) na memória do navegador; nenhum quadro é salvo ou enviado.
   - *Sinais ativos:* Concierge QR (`ConsumerConcierge`) e registro do vendedor (`CounterQuickLog`).
   - *Visualização:* Painel do Lojista e Gêmeo Digital 3D (Three.js).
2. **Backend — API Python (FastAPI):**
   - `POST /api/score`: Score de Oportunidade (0–100) e multiplicador de contexto (clima de Palmas, horário, eventos do shopping).
   - `POST /api/ia/plano`: Agente de IA com provedor intercambiável (Gemini no MVP), timeout de 4,5 s e **fallback heurístico**; bloqueia prompt injection e envia à IA apenas dados agregados.
   - Documentação automática em `/docs`; testes com `pytest`.
3. **Provedor de IA (externo):** recebe só números agregados, nunca dados pessoais. A chave fica apenas no backend.

> Evolução prevista: persistência dos registros em banco (SQLite → PostgreSQL), importação de vendas do PDV e percurso agregado pelo Wi-Fi do shopping.

---

## 5. Plataforma e Tecnologias Adotadas

| Camada | Tecnologia / Ferramenta | Papel na Solução |
| :--- | :--- | :--- |
| **Frontend Web (PWA)** | **React 19 + TypeScript + Vite 6** | Interface responsiva para tablet do balcão, notebook da gerência e celular do visitante |
| **Visualização 3D** | **Three.js (`OrbitControls` + WebGL)** | Maquete 3D navegável com zoom, corredores L1/L2, escada rolante e modo Street View |
| **Estilização** | **Tailwind CSS 3 + Lucide Icons** | Design system Editorial Bento UI |
| **Visão Computacional de Borda** | **HTML5 Canvas + `MediaDevices API`** | Detecção de movimento em vitrine/porta no navegador, sem gravação |
| **Backend / API** | **Python + FastAPI + Uvicorn** | Cálculo do score, sanitização e Agente de IA |
| **Inteligência Artificial** | **Agente de IA via API (Gemini no MVP, provedor intercambiável) + fallback** | Plano de ação, texto de cupom e sugestão de parceria |
| **Qualidade & Entrega** | **Vitest + pytest + GitHub + Vercel** | Testes automatizados do frontend e do backend, versionamento e deploy |

---

## 6. Incorporação da Prática Sorteada na Roleta: `STORIES: User Stories`

A prática obrigatória sorteada para a equipe na Roleta foi **STORIES (User Stories)** — que descreve cada funcionalidade sob a ótica exata de quem opera ou frequenta o shopping (`Como <persona>, quero <ação>, para <benefício>`), vinculada a critérios mensuráveis:

1. **No Planejamento (Missão 1):** Todo o escopo foi quebrado antes de codar em 5 User Stories formais documentadas em `TEMPLATE_BACKLOG_REQUISITOS.md` com prioridade **MoSCoW** e cenários **BDD (`Dado / Quando / Então`)**.
2. **Dentro do Próprio Produto (Rastreabilidade Viva):**
   - Criamos a tela interativa **`UserStoriesBoard.tsx` (Aba `06 • Stories (Roleta)`)** dentro do aplicativo, permitindo à banca examinadora ler cada história obrigatória (*Lojista buscando horário de pico*, *Visualização 3D por alas/andares*, *Webcam conta quem passa vs. entra*, *Vendedor registra perda em 1 toque*, *Visitante busca no QR sem dar CPF*) e **clicar direto no botão da história para abrir a tela viva funcionando**.
   - **Exemplo aplicado direto no Painel (`US-01`):** *“Como lojista, quero saber o horário de pico e os motivos reais de não-compra do meu segmento para ajustar minha vitrine e escalar a equipe na hora certa.”* → Implementado visualmente com o gráfico interativo `10h–22h` e o Painel de Gargalos em tempo real.

