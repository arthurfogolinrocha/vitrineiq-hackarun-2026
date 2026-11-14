import {
  CrossSegmentRoute,
  FlashCampaign,
  LostSaleEvent,
  LostSaleReason,
  SegmentCategory,
  ShoppingZone,
  StoreTenant,
} from '../types';
import { CAPIM_DOURADO_STORES } from './capimDouradoStores';

export { CAPIM_DOURADO_STORES };

/** Localiza metadados e logo oficial da loja pelo nome (case-insensitive / parcial). */
export function findStoreByName(storeName: string): StoreTenant | undefined {
  const norm = storeName.trim().toLowerCase();
  if (!norm) return undefined;
  return (
    CAPIM_DOURADO_STORES.find((s) => s.storeName.toLowerCase() === norm) ??
    CAPIM_DOURADO_STORES.find(
      (s) => norm.includes(s.storeName.toLowerCase()) || s.storeName.toLowerCase().includes(norm)
    )
  );
}

export const SEGMENT_LABELS: Record<SegmentCategory, string> = {
  todos: 'Todos os Segmentos',
  moda: 'Moda & Calçados',
  esportes: 'Esportes & Fitness',
  eletronicos: 'Eletrônicos & Tech',
  alimentacao: 'Alimentação & Café',
  servicos: 'Serviços & Lazer',
};

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
    name: 'Ala Sul (Av. JK) — Renner, Serviços & Esportes',
    shortName: 'Ala Sul JK (Renner / Centauro)',
    segment: 'Vestuário, Serviços Públicos & Esportes',
    anchors: [
      'Renner',
      'Centauro',
      'Resolve Palmas',
      'Polícia Federal',
      'Detran-TO',
      'Bistrô 81',
      'Stilo A',
      'Ri Happy',
    ],
    baseFootTraffic: 420,
    baseVitrineStops: 118,
    conversions: 31,
    vacantSpacesCount: 2,
    vacantOpportunityHint:
      'Alta busca por calçados casuais respiráveis, moda fitness leve e conveniência pós-atendimento (PF / Detran / Resolve).',
    topObjection: 'estoque_grade',
    hotSearches: ['tênis academia', 'roupa leve calor', 'presente esportivo'],
    mapRect: { x: 60, y: 235, w: 255, h: 205 },
  },
  {
    id: 'ala-central-ancoras',
    floor: 'L1',
    name: 'Ala Central & Galeria P3 — Grandes Âncoras',
    shortName: 'Ala Central (C&A / RCHLO / Polo Wear)',
    segment: 'Moda Magazine, Livraria & Quiosques',
    anchors: [
      'Riachuelo (RCHLO)',
      'C&A',
      'Livraria Leitura',
      'Polo Wear',
      'Brooksfield',
      'Youcom',
    ],
    baseFootTraffic: 610,
    baseVitrineStops: 164,
    conversions: 48,
    vacantSpacesCount: 3,
    vacantOpportunityHint:
      'Fluxo intenso entre Praça Oval (265 m²), quiosques Q1–Q34 e âncoras; oportunidade para presentes rápidos até R$ 120.',
    topObjection: 'preco',
    hotSearches: ['presente até R$ 150', 'promoção moda', 'sorvete e sobremesa'],
    mapRect: { x: 335, y: 150, w: 290, h: 170 },
  },
  {
    id: 'alameda-gourmet',
    floor: 'L1',
    name: 'Fachada NS-05 (P1) — Alameda Gourmet & Marisa',
    shortName: 'Alameda Gourmet (P1 / Outback / Marisa)',
    segment: 'Gastronomia Casual, Moda & Farmácia',
    anchors: [
      'Outback',
      'Madero',
      'Camicado',
      'Marisa',
      'Hering',
      'Drogasil',
      'Lady Lord',
      'Vivara',
    ],
    baseFootTraffic: 340,
    baseVitrineStops: 96,
    conversions: 44,
    vacantSpacesCount: 1,
    vacantOpportunityHint:
      'Público de ticket médio alto aguarda mesa na Portaria Principal P1 — oportunidade para cafés, joias e acessórios.',
    topObjection: 'fila_atendimento',
    hotSearches: ['jantar sem fila', 'happy hour', 'sobremesa gourmet'],
    mapRect: { x: 335, y: 340, w: 290, h: 105 },
  },
  {
    id: 'ala-lazer-cinema',
    floor: 'L1',
    name: 'Ala Norte (Av. LO-2A) — Lazer, Mercado & Subsolos',
    shortName: 'Ala Norte (Cinemark / Big / Morofit)',
    segment: 'Cinema, Academia, Supermercado & Megalojas PC',
    anchors: [
      'Cinemark',
      'Studio Z (STZ)',
      'Avenida',
      'Pernambucanas',
      'Big Lar',
      'Zig Zag Play',
      'Super Big',
      'WoW Park',
      'Morofit',
    ],
    baseFootTraffic: 530,
    baseVitrineStops: 142,
    conversions: 37,
    vacantSpacesCount: 4,
    vacantOpportunityHint:
      'Pico concentrado na saída do Cinemark, esteira do Subsolo (Super Big) e treino na Morofit; demanda forte por lanches proteicos e calçados.',
    topObjection: 'pesquisando',
    hotSearches: ['combo pós-cinema', 'suplemento pós-treino', 'tênis casual'],
    mapRect: { x: 645, y: 120, w: 295, h: 320 },
  },
  {
    id: 'praca-alimentacao-l2',
    floor: 'L2',
    name: '2º Pavimento — Praça de Alimentação (Curva JK) & Educação',
    shortName: '2º Piso — Praça de Alimentação',
    segment: 'Fast-Food, Restaurantes, Imersão & Educação',
    anchors: [
      "McDonald's",
      'Spoletto',
      'Pizza Hut',
      'Vivenda do Camarão',
      'Dona Maria Express',
      'Divino Fogão',
      'Kin Sui',
      'Giraffas',
      'Subway',
      'Mundo Imersivo',
      'Evento Imerso Mar',
      'Colégio Interação A8',
      'Unicesumar L2',
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

