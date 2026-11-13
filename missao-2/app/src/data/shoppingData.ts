import {
  CrossSegmentRoute,
  FlashCampaign,
  LostSaleEvent,
  LostSaleReason,
  ShoppingZone,
} from '../types';

export const LOST_SALE_LABELS: Record<LostSaleReason, string> = {
  preco: 'Preço / Condição de Parcelamento',
  estoque_grade: 'Sem Tamanho / Falta de Estoque',
  pesquisando: 'Só Pesquisando / Vitrine',
  fila_atendimento: 'Fila / Demora no Atendimento',
};

export const CAPIM_DOURADO_ZONES: ShoppingZone[] = [
  {
    id: 'ala-sul-esporte',
    floor: 'L1',
    name: 'Ala Sul — Moda, Esporte & Serviços',
    shortName: 'Ala Sul (Renner / Centauro)',
    segment: 'Vestuário, Esportes & Serviços',
    anchors: ['Renner', 'Centauro', 'Stilo', 'Resolve Palmas'],
    baseFootTraffic: 420,
    baseVitrineStops: 118,
    conversions: 31,
    vacantSpacesCount: 2,
    vacantOpportunityHint:
      'Alta busca por calçados casuais respiráveis e moda fitness leve devido ao calor em Palmas.',
    topObjection: 'estoque_grade',
    hotSearches: ['tênis academia', 'roupa leve calor', 'presente esportivo'],
    mapRect: { x: 60, y: 235, w: 255, h: 205 },
  },
  {
    id: 'ala-central-ancoras',
    floor: 'L1',
    name: 'Ala Central — Grandes Âncoras & Alameda das Cores',
    shortName: 'Ala Central (C&A / Riachuelo)',
    segment: 'Moda Magazine, Livraria & Quiosques',
    anchors: ['Riachuelo', 'C&A', 'Livraria Leitura', 'Alameda das Cores', 'Quiosques Q1–Q34'],
    baseFootTraffic: 610,
    baseVitrineStops: 164,
    conversions: 48,
    vacantSpacesCount: 3,
    vacantOpportunityHint:
      'Fluxo intenso entre quiosques (sorvetes/doces) e âncoras; oportunidade para presentes rápidos até R$ 120.',
    topObjection: 'preco',
    hotSearches: ['presente até R$ 150', 'promoção moda', 'sorvete e sobremesa'],
    mapRect: { x: 335, y: 150, w: 290, h: 170 },
  },
  {
    id: 'alameda-gourmet',
    floor: 'L1',
    name: 'Alameda Gourmet & Acesso Sul',
    shortName: 'Alameda Gourmet (Outback / Madero)',
    segment: 'Gastronomia Casual & Conveniência',
    anchors: ['Outback', 'Madero', 'Marisa', 'Gelatos'],
    baseFootTraffic: 340,
    baseVitrineStops: 96,
    conversions: 44,
    vacantSpacesCount: 1,
    vacantOpportunityHint:
      'Público de ticket médio alto aguarda mesa à noite — oportunidade para lounges, acessórios ou cafés express.',
    topObjection: 'fila_atendimento',
    hotSearches: ['jantar sem fila', 'happy hour', 'sobremesa gourmet'],
    mapRect: { x: 335, y: 340, w: 290, h: 105 },
  },
  {
    id: 'ala-lazer-cinema',
    floor: 'L1',
    name: 'Ala Leste — Lazer, Calçados & Entretenimento',
    shortName: 'Ala Lazer (Cinemark / STZ / Morofit)',
    segment: 'Cinema, Academia, Calçados & Parque',
    anchors: ['Cinemark', 'Studio Z (STZ)', 'WoW Park', 'Morofit', 'Pernambucanas', 'SuperBig'],
    baseFootTraffic: 530,
    baseVitrineStops: 142,
    conversions: 37,
    vacantSpacesCount: 4,
    vacantOpportunityHint:
      'Pico concentrado pós-sessão Cinemark e saída Morofit; alta demanda por lanches proteicos e calçados infantis/casuais.',
    topObjection: 'pesquisando',
    hotSearches: ['combo pós-cinema', 'suplemento pós-treino', 'tênis casual'],
    mapRect: { x: 645, y: 120, w: 295, h: 320 },
  },
  {
    id: 'praca-alimentacao-l2',
    floor: 'L2',
    name: '2º Pavimento — Praça de Alimentação & Mundo Imersivo',
    shortName: '2º Piso — Praça de Alimentação',
    segment: 'Fast-Food, Restaurantes & Entretenimento',
    anchors: [
      "McDonald's",
      'Spoletto',
      'Pizza Hut',
      'Divino Fogão',
      'Kin Sui',
      'Giraffas',
      'Subway',
      'Mundo Imersivo',
    ],
    baseFootTraffic: 680,
    baseVitrineStops: 215,
    conversions: 112,
    vacantSpacesCount: 2,
    vacantOpportunityHint:
      'Lojas 203 e 205 vagas no 2º Piso com alta busca não atendida por opções saudáveis rápidas (bowls/açaí/wraps) e café especial.',
    topObjection: 'fila_atendimento',
    hotSearches: ['almoço rápido sem fila', 'opção saudável', 'combo família'],
    mapRect: { x: 160, y: 110, w: 680, h: 330 },
  },
];

export const CROSS_SEGMENT_ROUTES: CrossSegmentRoute[] = [
  {
    id: 'route-cine-food',
    fromZone: 'ala-lazer-cinema',
    toZone: 'praca-alimentacao-l2',
    fromLabel: 'Cinemark / WoW Park',
    toLabel: '2º Piso Alimentação',
    sharePercent: 68,
    insight:
      '68% do público que sai das sessões noturnas do Cinemark segue direto para alimentação ou sobremesa.',
    recommendedCombo: 'Voucher 15% OFF no 2º Piso válido até 45 min após o ingresso do cinema.',
  },
  {
    id: 'route-fit-sport',
    fromZone: 'ala-lazer-cinema',
    toZone: 'ala-sul-esporte',
    fromLabel: 'Academia Morofit',
    toLabel: 'Ala Esporte (Centauro / Renner)',
    sharePercent: 44,
    insight:
      'Frequentadores da Morofit concentram buscas por roupas térmicas, garrafas e suplementos entre 18h e 21h.',
    recommendedCombo: 'Check-in de treino libera brinde/desconto na Ala Esporte no mesmo dia.',
  },
  {
    id: 'route-central-gourmet',
    fromZone: 'ala-central-ancoras',
    toZone: 'alameda-gourmet',
    fromLabel: 'Âncoras (C&A / Riachuelo)',
    toLabel: 'Alameda Gourmet (Outback / Madero)',
    sharePercent: 39,
    insight:
      'Compradores de moda com sacolas permanecem em média +52 min quando recebem convite de happy hour próximo.',
    recommendedCombo: 'Entrada cortesia ou prioridade de fila mediante compra acima de R$ 150 nas Âncoras.',
  },
];

export const INITIAL_LOST_SALES: LostSaleEvent[] = [
  {
    id: 'ls-1',
    zoneId: 'ala-central-ancoras',
    storeName: 'Moda & Estilo Pop (Exemplo)',
    reason: 'preco',
    note: 'Cliente achou camisa social 15% acima do orçamento.',
    timestamp: '20:42',
  },
  {
    id: 'ls-2',
    zoneId: 'ala-sul-esporte',
    storeName: 'Passos Sport (Exemplo)',
    reason: 'estoque_grade',
    note: 'Procurou tênis corrida numeração 41 — esgotado.',
    timestamp: '20:51',
  },
  {
    id: 'ls-3',
    zoneId: 'praca-alimentacao-l2',
    storeName: 'Express Grill (Exemplo)',
    reason: 'fila_atendimento',
    note: 'Desistiu por fila estimada >12 minutos.',
    timestamp: '21:03',
  },
];

export const INITIAL_FLASH_CAMPAIGNS: FlashCampaign[] = [
  {
    id: 'camp-1',
    zoneId: 'ala-lazer-cinema',
    storeName: 'Vitrine Calçados & Sport (Demo)',
    title: 'Relâmpago Pós-Cinema: 18% OFF em Linha Casual',
    discountBadge: '18% OFF (2h)',
    couponCode: 'VITRINE-CINE18',
    whatsappCopy:
      '🎬 Saindo do Cinemark no Capim Dourado? Apresente o código VITRINE-CINE18 nas próximas 2 horas e garanta 18% OFF na nossa vitrine casual!',
    expiresInMinutes: 120,
    active: true,
    createdAt: '20:45',
  },
  {
    id: 'camp-2',
    zoneId: 'praca-alimentacao-l2',
    storeName: 'Sabores Express 2º Piso (Demo)',
    title: 'Combo Sem Fila — Retirada Expressa em 5 min',
    discountBadge: 'BEBIDA GRÁTIS',
    couponCode: 'EXPRESS-PISO2',
    whatsappCopy:
      '🍔 Bateu a fome no Capim Dourado? Peça pelo balcão expresso com VITRINE-EXPRESS e ganhe a bebida na hora sem pegar fila!',
    expiresInMinutes: 90,
    active: true,
    createdAt: '21:00',
  },
];

