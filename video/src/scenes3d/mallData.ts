export interface MallStoreBlock {
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  y?: number;
  tier: 'anchor' | 'megaloja' | 'satellite' | 'vacant' | 'food';
  accent: string;
}

export const MALL_BLOCKS: MallStoreBlock[] = [
  // Âncoras principais (coordenadas baseadas na Planta Mix oficial 38.800 m²)
  { name: 'RENNER', x: -28.5, z: 3.5, w: 7.5, d: 9.0, h: 4.4, tier: 'anchor', accent: '#E2A83B' },
  { name: 'CENTAURO', x: -13.6, z: 10.2, w: 5.0, d: 3.4, h: 3.8, tier: 'anchor', accent: '#E2A83B' },
  { name: 'C&A', x: 0.8, z: -11.5, w: 7.4, d: 5.2, h: 4.3, tier: 'anchor', accent: '#22D3EE' },
  { name: 'RIACHUELO', x: 0.2, z: -1.8, w: 7.8, d: 5.0, h: 4.3, tier: 'anchor', accent: '#E2A83B' },
  { name: 'CINEMARK', x: 24.5, z: 7.5, w: 8.6, d: 8.0, h: 5.2, tier: 'anchor', accent: '#F43F5E' },
  { name: 'SUPER BIG', x: 24.5, z: -20.2, w: 7.6, d: 3.4, h: 4.0, tier: 'anchor', accent: '#10B981' },
  { name: 'MOROFIT', x: 24.5, z: -28.0, w: 7.6, d: 3.4, h: 4.0, tier: 'anchor', accent: '#10B981' },
  { name: 'MARISA', x: 13.6, z: 9.8, w: 5.4, d: 4.2, h: 3.9, tier: 'anchor', accent: '#E2A83B' },
  { name: 'OUTBACK', x: 4.8, z: 10.2, w: 3.8, d: 3.2, h: 3.6, tier: 'anchor', accent: '#F59E0B' },
  { name: 'PERNAMBUCANAS', x: 24.5, z: -7.4, w: 7.6, d: 3.3, h: 3.9, tier: 'anchor', accent: '#E2A83B' },

  // Megalojas & Lazer
  { name: 'POLO WEAR', x: -19.2, z: -8.2, w: 5.0, d: 3.8, h: 3.5, tier: 'megaloja', accent: '#22D3EE' },
  { name: 'STILO A', x: -12.6, z: 4.8, w: 4.2, d: 2.8, h: 3.3, tier: 'megaloja', accent: '#60A5FA' },
  { name: 'RI HAPPY', x: -8.0, z: 4.8, w: 3.8, d: 2.8, h: 3.3, tier: 'megaloja', accent: '#E2A83B' },
  { name: 'CAMICADO', x: -6.0, z: 10.2, w: 3.4, d: 3.0, h: 3.4, tier: 'megaloja', accent: '#E2A83B' },
  { name: 'LIVRARIA LEITURA', x: 6.8, z: -8.4, w: 4.8, d: 3.4, h: 3.6, tier: 'megaloja', accent: '#22D3EE' },
  { name: 'BROOKSFIELD', x: 6.4, z: -1.8, w: 4.0, d: 3.2, h: 3.4, tier: 'megaloja', accent: '#E2A83B' },
  { name: 'HERING', x: 7.8, z: 5.8, w: 4.2, d: 2.4, h: 3.2, tier: 'megaloja', accent: '#60A5FA' },
  { name: 'MADERO', x: 8.6, z: 13.6, w: 3.4, d: 2.2, h: 3.1, tier: 'megaloja', accent: '#F59E0B' },
  { name: 'STUDIO Z', x: 24.5, z: 0.4, w: 7.6, d: 3.1, h: 3.6, tier: 'megaloja', accent: '#22D3EE' },
  { name: 'AVENIDA', x: 24.5, z: -3.5, w: 7.6, d: 3.2, h: 3.6, tier: 'megaloja', accent: '#94A3B8' },
  { name: 'BIG LAR', x: 24.5, z: -11.4, w: 7.6, d: 3.3, h: 3.7, tier: 'megaloja', accent: '#F59E0B' },
  { name: 'ZIG ZAG PLAY', x: 24.5, z: -15.3, w: 7.6, d: 3.2, h: 3.7, tier: 'megaloja', accent: '#A78BFA' },
  { name: 'WOW PARK', x: 24.5, z: -24.1, w: 7.6, d: 3.2, h: 3.7, tier: 'megaloja', accent: '#E2A83B' },

  // Satélites & Corredores L1
  { name: 'VIVARA', x: 0.6, z: 7.4, w: 2.6, d: 2.0, h: 3.0, tier: 'satellite', accent: '#E2A83B' },
  { name: 'TRACK & FIELD', x: 5.8, z: 2.0, w: 3.2, d: 2.0, h: 2.9, tier: 'satellite', accent: '#22D3EE' },
  { name: 'O BOTICARIO', x: 1.5, z: 2.2, w: 3.6, d: 2.2, h: 2.9, tier: 'satellite', accent: '#E2A83B' },
  { name: 'LIFE VIVARA', x: -13.4, z: -8.6, w: 2.2, d: 2.2, h: 2.9, tier: 'satellite', accent: '#60A5FA' },
  { name: 'TOMMY HILFIGER', x: -11.4, z: -8.6, w: 2.0, d: 2.2, h: 2.9, tier: 'satellite', accent: '#22D3EE' },
  { name: 'YOUCOM', x: -7.8, z: -8.6, w: 2.6, d: 2.4, h: 3.0, tier: 'satellite', accent: '#94A3B8' },
  { name: 'COLCCI', x: -5.2, z: -8.8, w: 2.6, d: 2.4, h: 3.0, tier: 'satellite', accent: '#E2A83B' },
  { name: 'AUTHENTIC FEET', x: -2.8, z: -8.8, w: 2.2, d: 2.4, h: 3.0, tier: 'satellite', accent: '#22D3EE' },
  { name: 'ELLUS', x: 11.4, z: -6.2, w: 3.6, d: 2.6, h: 3.0, tier: 'satellite', accent: '#94A3B8' },
  { name: 'USAFLEX', x: 11.4, z: -2.4, w: 3.6, d: 2.4, h: 3.0, tier: 'satellite', accent: '#E2A83B' },
  { name: 'RESERVA', x: 8.6, z: 10.2, w: 3.2, d: 2.6, h: 3.0, tier: 'satellite', accent: '#60A5FA' },
  { name: 'INOVAR', x: -9.5, z: 10.2, w: 3.2, d: 2.8, h: 3.0, tier: 'satellite', accent: '#94A3B8' },
  { name: 'DAMYLLER', x: -12.6, z: -4.8, w: 3.0, d: 2.2, h: 2.9, tier: 'satellite', accent: '#60A5FA' },
  { name: 'CROCS', x: -9.2, z: -4.8, w: 3.0, d: 2.2, h: 2.9, tier: 'satellite', accent: '#10B981' },
  { name: 'LEVIS', x: -6.2, z: -4.8, w: 2.6, d: 2.2, h: 2.9, tier: 'satellite', accent: '#E2A83B' },
  { name: 'OTICAS CAROL', x: -16.5, z: -1.8, w: 3.8, d: 2.4, h: 2.9, tier: 'satellite', accent: '#22D3EE' },
  { name: 'CACAU SHOW', x: -10.5, z: 7.4, w: 2.6, d: 1.8, h: 2.8, tier: 'satellite', accent: '#E2A83B' },
  { name: 'BURGER KING', x: 21.8, z: 3.4, w: 3.0, d: 2.3, h: 3.0, tier: 'satellite', accent: '#F59E0B' },
  { name: 'DROGASIL', x: 4.5, z: 5.8, w: 2.4, d: 2.2, h: 2.9, tier: 'satellite', accent: '#10B981' },

  // Lojas Vagas / Oportunidade (alvo de Crowd-Drop!)
  { name: 'VAGA 132', x: 3.8, z: -9.8, w: 1.9, d: 2.1, h: 3.0, tier: 'vacant', accent: '#F43F5E' },
  { name: 'VAGA 142', x: -9.8, z: -8.6, w: 1.6, d: 2.2, h: 3.0, tier: 'vacant', accent: '#F43F5E' },
  { name: 'VAGA 96', x: -4.1, z: -5.0, w: 1.8, d: 2.0, h: 3.0, tier: 'vacant', accent: '#F43F5E' },

  // 2º Piso (Praça de Alimentação elevada L2 sobre Ala Sul/Oeste)
  { name: 'PRACA ALIMENTACAO L2', x: -18.0, z: 4.2, w: 15.0, d: 10.5, h: 2.8, y: 5.4, tier: 'food', accent: '#E2A83B' },
];

export const CORRIDOR_FLOW_NODES: Array<[number, number]> = [
  [-24, 5], [-16, 6], [-8, 5], [0, 3], [8, 5], [16, 4], [20, 2],
  [20, -6], [20, -14], [14, -7], [5, -7], [-4, -7], [-14, -6],
];

