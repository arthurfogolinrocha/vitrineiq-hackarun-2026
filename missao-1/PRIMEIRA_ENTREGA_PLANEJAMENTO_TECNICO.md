# Primeira Entrega — Planejamento Técnico Inicial (`Missão 1`)

**Projeto:** VitrineIQ — Inteligência de Vitrine, Fluxo Físico e Conversão para Lojistas do Capim Dourado Shopping (Palmas-TO)  
**Evento:** 1º HackaRun UniCatólica 2026  
**Entrega prevista:** Sexta-feira, 13/11, até 12h00  
**Repositório Público Oficial:** `https://github.com/arthurfogolinrocha/vitrineiq-hackarun-2026`  
**Equipe:** Arthur Fogolin Rocha (`arthurfogolinrocha`), Jessé (`jesseLR-stack`), `MCPS9` e `LCapistrano25`.

---

## 1. Proposta e Estrutura Inicial das Telas

A interface adota o conceito **Capim Dourado Editorial Bento UI** (Sidebar escura Obsidian `#111318` com acentos Champagne Gold `#E2A83B` sobre canvas arquitetural claro `#F4F2EE`), projetada para que o lojista entenda seus gargalos e tome decisão em menos de 10 segundos:

1. **Tela 01 — Painel Executivo do Lojista (`RetailerCockpit`):**
   - **Hero Card com Medidor SVG Circular (IQ Score 0–100):** Resume a oportunidade do corredor em tempo real, combinando paradas na vitrine, buscas QR e perdas no balcão.
   - **Funil Físico da Porta:** Visualiza proporcionalmente `Passaram no Corredor → Pararam na Vitrine → Entraram na Loja → Compra Concluída`.
   - **Gráfico Interativo de Horário de Pico (`10h`–`22h`):** Permite clicar em turnos (`Manhã`, `Almoço`, `Tarde`, `Pico Noite`) e simular Clima de Palmas (`Sol 38°C`, `Chuva Forte`, `Ameno`) e Eventos (`Estreia Cinemark`, `Dia de Pagamento`).
   - **Copiloto IA & Oferta Relâmpago:** Gera plano tático imediato e publica cupons com texto pronto para WhatsApp.
2. **Tela 02 — Gêmeo Digital Shopping 3D (`ShoppingMap3D` + `ShoppingMap`):**
   - Maquete 3D em **WebGL (Three.js)** fiel ao mix real do Capim Dourado Shopping (`Térreo L1` e `2º Piso L2`, com escada rolante e rotas animadas).
   - **Scroll Zoom (`OrbitControls`)**, seleção direta clicando nas fachadas e modo **Entrar no Shopping (Street View)** em primeira pessoa com caminhada por corredor (`W A S D` / botões) e botão **Subir ao 2º Andar / Descer ao Térreo**, além de alternância rápida para **Planta 2D Técnica**.
3. **Tela 03 — Sensor Webcam de Vitrine (`EdgeVisionSensor`):**
   - Conecta uma webcam comum (ou simulador calibrado em Canvas para palco) analisando em memória **quem passa no corredor, quem para na vitrine, quem entra na loja e quem sai**, alimentando o Painel em tempo real sem gravar vídeo nem reconhecer rostos (Privacy by Design).
4. **Tela 04 — Modo Balcão / Caixa em 1 Toque (`CounterQuickLog`):**
   - Vendedor registra o motivo real de não-fechamento (`Preço`, `Sem Tamanho/Grade`, `Só Pesquisando`, `Fila`) em 1 toque.
5. **Tela 05 — Concierge QR para o Cliente (`ConsumerConcierge`):**
   - Totem/QR anônimo na vitrine onde o visitante escolhe orçamento/desejo sem informar CPF, recebe cupom imediato e sinaliza demanda real ao lojista.
6. **Telas 06 e 07 — User Stories (Roleta) & Governança LGPD/Rust:**
   - Painel rastreável ligando cada história obrigatória à tela correspondente + trilha de auditoria SHA-256 e verificação do motor matemático Rust/TypeScript.

---

## 2. Documentação Inicial do Projeto

Toda a documentação estruturante da Fase 1 está versionada no diretório `missao-1/`:
- [`TEMPLATE_DEFESA_DO_PROBLEMA.md`](./TEMPLATE_DEFESA_DO_PROBLEMA.md): Dor real dos lojistas de shopping ("efeito vitrine sem dados"), impacto financeiro e alinhamento com o consumidor local.
- [`TEMPLATE_LEAN_CANVAS.md`](./TEMPLATE_LEAN_CANVAS.md) e [`canvas_executivo.html`](./canvas_executivo.html): Modelo de negócio completo em 9 blocos focado em SaaS B2B para lojistas e inteligência de mix para a administração do shopping.
- [`TEMPLATE_BACKLOG_REQUISITOS.md`](./TEMPLATE_BACKLOG_REQUISITOS.md): Backlog priorizado com **MoSCoW** e critérios de aceitação **BDD (Dado / Quando / Então)** das 5 User Stories centrais.

---

## 3. Linguagem de Programação Escolhida

- **TypeScript (`Strict Mode`):** Linguagem principal da aplicação web e camada de serviços (`React 19`), garantindo segurança de tipos em tempo de compilação para os modelos de telemetria, zonas (`L1`/`L2`), eventos de balcão e integração com API de IA.
- **Rust (`engine-rust/src/lib.rs`):** Núcleo matemático de cálculo do `VitrineIQ Score` (`calculate_retail_opportunity_score`), escolhido para processamento determinístico de alta velocidade, segurança de memória e paridade exata de regras com o TypeScript (`opportunityEngine.ts`), permitindo compilação nativa/WASM em escala multi-loja.

---

## 4. Arquitetura Proposta

Arquitetura **Modular Edge-First em 4 Camadas** com zero dependência de servidor pesado para privacidade absoluta:

1. **Camada de Captação Multimodal Anônima (Client/Edge):**
   - *Sensor Óptico (WebRTC `getUserMedia` + Canvas Frame-Diff):* Analisa variação de pixels em zonas geométricas (Corredor vs. Vitrine vs. Porta) 100% na RAM do navegador do lojista — nenhum frame ou imagem facial é salvo ou enviado à nuvem.
   - *Sinais Ativos:* Totem/QR do consumidor (`ConsumerConcierge`) e registro tátil do vendedor (`CounterQuickLog`).
2. **Camada de Motor Determinístico & Score (Rust + TypeScript Parity):**
   - Combina `vitrineStops`, `qrSearches`, `lostSales` e multiplicadores contextuais (clima de Palmas, horário e eventos do cinema) produzindo o **IQ Score (0–100)**.
3. **Camada de Visualização Espacial & Decisão (React + Three.js WebGL):**
   - Renderiza o Gêmeo Digital 3D do Capim Dourado e o Bento Cockpit reativo em tempo real.
4. **Camada de Copiloto IA Resiliente (Gemini Flash + Fallback Heurístico):**
   - Consome apenas agregados numéricos anônimos para gerar planos táticos e copywriting de ofertas com fallback instantâneo offline (`latency < 300ms`), blindado contra prompt injection e em conformidade estrita com a LGPD (sem PII).

---

## 5. Plataforma e Tecnologias Adotadas

| Camada | Tecnologia / Ferramenta | Papel na Solução |
| :--- | :--- | :--- |
| **Frontend Web (PWA)** | **React 19 + TypeScript + Vite 6** | Interface responsiva de baixa latência para tablet do balcão, notebook da gerência e celular do visitante |
| **Visualização 3D** | **Three.js (`OrbitControls` + WebGL)** | Maquete 3D navegável com scroll zoom, corredores L1/L2, escada rolante e modo Street View |
| **Estilização** | **Tailwind CSS 3 + Lucide Icons** | Design system Editorial Bento UI (Obsidian `#111318`, Gold `#E2A83B`, Stone `#F4F2EE`) |
| **Visão Computacional Edge** | **HTML5 Canvas + `MediaDevices API`** | Detecção de movimento em vitrine/porta na borda com privacidade absoluta (zero gravação) |
| **Motor de Cálculo Crítico** | **Rust (`cargo test`) + Espelho TS** | Cálculo determinístico do Opportunity Score com paridade validada por testes |
| **Inteligência Artificial** | **Google Gemini Flash API + Fallback** | Copiloto estratégico contextual para vitrine, reposição de grade e campanhas relâmpago |
| **Qualidade & Entrega** | **Vitest + GitHub + Vercel/Edge** | Testes automatizados contínuos (`cargo test` + `vitest`) e deploy versionado |

---

## 6. Incorporação da Prática Sorteada na Roleta: `STORIES: User Stories`

A prática obrigatória sorteada para a equipe na Roleta foi **STORIES (User Stories)** — que descreve cada funcionalidade sob a ótica exata de quem opera ou frequenta o shopping (`Como <persona>, quero <ação>, para <benefício>`), vinculada a critérios mensuráveis:

1. **No Planejamento (Missão 1):** Todo o escopo foi quebrado antes de codar em 5 User Stories formais documentadas em `TEMPLATE_BACKLOG_REQUISITOS.md` com prioridade **MoSCoW** e cenários **BDD (`Dado / Quando / Então`)**.
2. **Dentro do Próprio Produto (Rastreabilidade Viva):**
   - Criamos a tela interativa **`UserStoriesBoard.tsx` (Aba `06 • Stories (Roleta)`)** dentro do aplicativo, permitindo à banca examinadora ler cada história obrigatória (*Lojista buscando horário de pico*, *Visualização 3D por alas/andares*, *Webcam conta quem passa vs. entra*, *Vendedor registra perda em 1 toque*, *Visitante busca no QR sem dar CPF*) e **clicar direto no botão da história para abrir a tela viva funcionando**.
   - **Exemplo aplicado direto no Painel (`US-01`):** *“Como lojista, quero saber o horário de pico e os motivos reais de não-compra do meu segmento para ajustar minha vitrine e escalar a equipe na hora certa.”* → Implementado visualmente com o gráfico interativo `10h–22h` e o Painel de Gargalos em tempo real.
