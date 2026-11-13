# Defesa do Problema — Missão 1 (VitrineIQ)

**Equipe:** Arthur Fogolin Rocha (`arthurfogolinrocha`), Jessé (`jesseLR-stack`), `MCPS9` e `LCapistrano25`  
**Evento:** 1º HackaRun UniCatólica 2026 • Capim Dourado Shopping (Palmas - TO)

---

## 1. Qual é a dor real observada? (O "Porquê")
* **O Problema:** O varejo físico dentro do **Capim Dourado Shopping** (mais de 170 operações distribuídas em 2 pisos) opera quase totalmente "no escuro" quanto ao comportamento do visitante *antes* da nota fiscal no caixa. Lojistas sabem apenas quanto venderam ao final do dia, mas **não sabem quantas pessoas passaram na frente da loja, quantas pararam na vitrine, por que entraram sem comprar ou o que o público está procurando naquele exato horário** (seja na saída do Cinemark, no pico de calor de 38°C em Palmas ou na hora do almoço no 2º Piso).
* **Quem sofre com isso?**
  1. **Lojistas e Gerentes de Loja:** Pagam aluguel nobre e arcam com estoque parado sem saber se o problema é atratividade de vitrine, preço, falta de grade/numeração ou fila.
  2. **Equipes de Venda (Balcão):** Perdem oportunidades repetidas sem canal rápido para sinalizar faltas recorrentes à gerência.
  3. **Visitantes do Shopping:** Caminham pelos corredores sem saber qual loja próxima tem exatamente o produto/serviço no orçamento desejado e sem incentivos rápidos para entrar.

## 2. Evidências e Validação no Mundo Real
* **Sinal de Mercado & Mentoria do Projeto:** Diferente do e-commerce (que mede clique, scroll, taxa de rejeição e busca digitada em tempo real), lojas físicas raramente medem o funil de porta (`passantes → olhares na vitrine → entradas → vendas`) por receio de câmeras corporativas caras e exigências rígidas da **LGPD**.
* **Alinhamento com o Mix Real do Capim Dourado (`2026_11_CDS_MIX`):** A análise da planta do shopping mostra forte sinergia espacial entre grandes âncoras (`Renner`, `Centauro`, `C&A`, `Riachuelo`), serviços e lazer (`Cinemark`, `Academia Morofit`, `WoW Park`), `Alameda Gourmet` no térreo e a `Praça de Alimentação` no 2º piso — mas não há uma ponte digital em tempo real que conecte esse deslocamento entre segmentos em forma de ação imediata para o lojista.
* **Desperdício Mensurável:** Sem dados do motivo da perda no balcão (preço, falta de tamanho 41, fila de 12 minutos) e do horário de pico por segmento, promoções genéricas falham e o lojista reage tarde demais (apenas no fechamento mensal).

## 3. Como as pessoas/empresas resolvem hoje (Alternativas Ineficientes)
* **Planilhas de venda pós-fato e caderninhos no caixa:** Mostram apenas quem comprou, nunca quem saiu de mãos vazias ou passou reto pela vitrine.
* **Sistemas CFTV proprietários caros:** Gravam vídeo em nuvem, têm custo elevado de implantação/manutenção e trazem passivo jurídico de privacidade facial.
* **Grupos informais de WhatsApp e panfletagem estática:** Baixa segmentação por horário, clima ou ala do shopping.

## 4. Critério de Sucesso do Nosso MVP (`Missão 2`)
> *"Consideraremos a primeira entrega e o MVP validados quando conseguirmos demonstrar em tempo real no gêmeo digital do Capim Dourado Shopping: (1) uma **webcam comum analisando em memória** quem passa na frente, quem para na vitrine e quem entra (sem gravar vídeo nem coletar PII), (2) um **mapa 3D interativo (L1 + 2º Piso L2 + Street View)** mostrando rotas de deslocamento entre lojas, e (3) o **Painel do Lojista + Modo Balcão + Concierge QR** transformando esses sinais instantaneamente em um IQ Score (0–100), gráfico de horário de pico e plano de ação IA."*
