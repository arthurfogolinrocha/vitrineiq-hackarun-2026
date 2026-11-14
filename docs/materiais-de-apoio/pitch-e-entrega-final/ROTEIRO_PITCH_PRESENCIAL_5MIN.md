# 🎤 Roteiro-Mestre — Pitch Presencial Grande Final (`5m00s` + Q&A)

**Evento:** 1º HackaRun UniCatólica 2026 • Capim Dourado Shopping (Palmas – TO)  
**Equipe:** Time **Nido King** (`@arthurfogolinrocha`, `@jesseLR-stack`, `@MCPS9`, `@LCapistrano25`)  
**Duração Alvo:** `05:00` (Grande Final no Shopping — 14/11 a partir das 15h00)

---

## ⏱️ Coreografia de Palco (5 Minutos Cronometrados)

### 1. Abertura Imersiva no Shopping (`00:00 – 00:45` | 45s)
> *"Olhem pelos corredores aqui fora agora. Centenas de pessoas estão passando neste exato segundo na frente de 188 vitrines do Capim Dourado Shopping. Algumas param, olham um produto e vão embora. Quantas foram? Por que não entraram? E quando entraram e não compraram, faltou numeração, o preço assustou ou a fila estava grande? Hoje, nenhuma dessas 188 lojas tem essa resposta antes do caixa fechar à noite. O e-commerce mede cada clique e abandono de carrinho em tempo real. O varejo físico opera no escuro. Nós construímos o VitrineIQ para acender a luz do corredor."*

### 2. A Solução & O "Momento Uau!" Ao Vivo (`00:45 – 02:45` | 2m00s)
* **Ato A — Sensor Webcam Edge LGPD + Raio-X Multimodal Gemini (40s):**
  * Ative a webcam com **Blur LGPD ativo desde o segundo zero**: *"Vejam no telão: nossos rostos são pixelizados na memória RAM do navegador. Zero vídeo gravado, zero biometria facial — só contagens anônimas sobem."*
  * Clique em **Raio-X Multimodal (Gemini)** e mostre o diagnóstico e plano tático instantâneo.
* **Ato B — Gatilho Vitrine Crowd-Drop + Concierge QR com a Banca (40s):**
  * Simule 3–5 pessoas na frente da vitrine -> telão sobe o desconto coletivo (`20% / 30% OFF`) com QR Code ao vivo.
  * Convide um jurado a escanear o **Concierge QR** no próprio celular (zero app, zero CPF) e veja o sinal aparecer em tempo real no painel da ala!
* **Ato C — Gêmeo Digital 3D Obsidian + Balcão Voz 4s / Fila Offline (40s):**
  * No **Mapa 3D Obsidian (38.800,50 m²)**: ative **Raio-X do Subsolo (SS1/SS2)**, entre em **Street View**, suba ao **2º Piso (Praça de Alimentação)** e mostre as vagas comerciais (`Vaga 132`, `Vaga 142`).
  * Feche no **Modo Balcão**: aperte **Voz 4s** (*"Cliente desistiu porque acabou o tênis 41"*) mostrando classificação e **Fila Offline** resiliente.

### 3. Engenharia de Produção, Segurança & Artigo 6 (`02:45 – 03:35` | 50s)
> *"Por trás dessa interface, entregamos engenharia auditada em **`9.8 / 10`**: frontend React 19 + TypeScript + Three.js modularizado, API Python FastAPI com auth HMAC e troca de senha (`PATCH /api/auth/senha`), cabeçalhos CSP/HSTS estritos na Vercel, auditoria SHA-256 e fallback heurístico em `< 300ms`. São **`158` testes automatizados verdes** (`51` Vitest + `107` pytest) além de pipeline CI/CD com **Playwright E2E** e auditoria **WCAG (`axe-core`)**, em total conformidade com o **Artigo 6**."*

### 4. Modelo de Negócio, Viabilidade & ROI B2B (`03:35 – 04:35` | 1m00s)
* **Receita 1 — SaaS por Loja (Zero CapEx):** Roda usando uma webcam comum já conectada ao caixa/tablet. Recuperar poucas vendas perdidas por semana já paga a assinatura mensal com sobra.
* **Receita 2 — Inteligência de Mix para o Shopping:** Visão agregada anônima de efeito halo entre âncoras (`Cinemark`, `Morofit` → `Moda` / `Praça L2`) e evidência concreta de fluxo para acelerar locação das lojas vagas.

### 5. Fechamento Executivo (`04:35 – 05:00` | 25s)
> *"Em 24 horas, não fizemos slides sobre o futuro do varejo. Colocamos no ar o gêmeo digital vivo das 188 lojas deste shopping, com 158 verificações automáticas e 100% dentro da LGPD. O VitrineIQ está pronto para rodar um piloto na segunda-feira em uma ala do Capim Dourado Shopping. Muito obrigado!"*

---

## 🛡️ Plano B Anti-Travamento no Palco
1. **Wi-Fi instável:** O Modo Balcão enfileira localmente (`useOfflineQueue`) e sincroniza ao reconectar — além de poder abrir `docker compose up` local em aba reserva.
2. **Permissão/iluminação de Webcam:** Alternar em 1 clique para o **Simulador integrado** na mesma aba `Sensor Webcam`.
3. **Latência ou cota da API Gemini:** Backend aciona **Fallback Heurístico determinístico (`< 300ms`)** automaticamente.
4. **Microfone bloqueado:** Clicar nos **atalhos de voz pré-configurados** logo abaixo do botão de microfone no Modo Balcão.
5. **Fallback extremo:** Ter o vídeo comercial [`VitrineIQ_Marketing_3D_60fps.mp4`](./VitrineIQ_Marketing_3D_60fps.mp4) ou o vídeo de pitch [`VitrineIQ_Pitch_FINAL_COM_VOZ.mp4`](./VitrineIQ_Pitch_FINAL_COM_VOZ.mp4) pausado no player local pronto para play imediato.

---

## 🎯 Respostas Rápidas para o Q&A da Banca
* **LGPD:** Processamento de pixel-diff apenas em RAM local com borramento visual; zero gravação de vídeo, zero biometria, só contagens numéricas enviadas à API; Concierge QR não coleta CPF/nome/telefone; trilha auditável SHA-256.
* **Custo de API IA em escala (188 lojas):** Visão computacional de fluxo roda 100% na borda (custo zero de LLM); Gemini só é chamado sob demanda com JSON agregado leve ou auditoria pontual + fallback heurístico local.
* **Adesão do vendedor no balcão:** Zero formulário — 1 toque em 2s ou voz em 4s (com fila offline), convertendo a dor do vendedor diretamente em cupom/reposição que ajuda ele a bater meta.

