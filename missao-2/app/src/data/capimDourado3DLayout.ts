import { FloorId, ZoneId } from '../types';

export type StoreTier = 'anchor' | 'megaloja' | 'satellite' | 'vacant';
export type SegmentFilter = 'all' | 'moda' | 'mercado' | 'gastronomia';

export interface Store3DDef {
  name: string;
  sublabel?: string;
  zoneId: ZoneId;
  floor: FloorId | 'SS1';
  segment: Exclude<SegmentFilter, 'all'>;
  nearestPortal: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  accent: string;
  tier: StoreTier;
  isVacant?: boolean;
}

export interface Kiosk3DDef {
  id: string;
  name: string;
  segment: Exclude<SegmentFilter, 'all'>;
  zoneId: ZoneId;
  x: number;
  z: number;
  accent: string;
}

export interface Portal3DDef {
  id: string;
  title: string;
  subtitle: string;
  x: number;
  z: number;
  rotY: number;
}

export interface ParkingLot3DDef {
  id: string;
  title: string;
  subtitle: string;
  cx: number;
  cz: number;
  w: number;
  d: number;
  rows: number;
  cols: number;
  y?: number;
}

export interface CameraPresetDef {
  id: 'overview' | 'p1' | 'anchors' | 'pc' | 'l2' | 'subsolo';
  label: string;
  floor: FloorId;
  xray?: boolean;
  pos: [number, number, number];
  target: [number, number, number];
}

export interface GuidedTourStop {
  title: string;
  description: string;
  floor: FloorId;
  xray: boolean;
  pos: [number, number, number];
  target: [number, number, number];
}

/**
 * Planta 3D fiel à PLANTA MIX — Operações Capim Dourado Shopping (Nov/2026 — 38.800,50 m²).
 * Orientação geográfica real validada com Planta Mix + Google Maps (Q. 107 Norte / Palmas-TO):
 *  - +Z (Base/Frente): Avenida NS-05 (Leste) com 2 rotatórias e recuo Porte-Cochère (P1)
 *  - -X (Esquerda): Avenida JK (Sul) — curva Renner & Praça de Alimentação L2
 *  - +X (Direita): Avenida LO-2A (Norte) — Cinemark até Morofit / Área Vaga 1.329 m²
 *  - -Z (Fundo): Estacionamento Descoberto Oeste + Subsolos SS1 (140 v.) & SS2 (216 v.)
 */
export const CAPIM_STORES_3D: Store3DDef[] = [
  // === 1º PAVIMENTO — TÉRREO (L1) ===
  // Ala Sul / Av. JK (Curva Renner + Serviços + Centauro + PF/Detran)
  { name: 'RENNER', sublabel: '2.027 m² • Âncora 01', zoneId: 'ala-sul-esporte', floor: 'L1', segment: 'moda', nearestPortal: 'P4 / P1', x: -28.5, z: 3.5, w: 7.5, d: 9.0, h: 4.0, color: '#fee2e2', accent: '#dc2626', tier: 'anchor' },
  { name: 'CORREIOS • NK', sublabel: 'Lojas 01-04 • Serviços', zoneId: 'ala-sul-esporte', floor: 'L1', segment: 'moda', nearestPortal: 'P3 / P1', x: -24.5, z: -2.0, w: 3.2, d: 2.2, h: 3.0, color: '#fef9c3', accent: '#ca8a04', tier: 'satellite' },
  { name: 'LABVIDA • DAYCÂMBIO', sublabel: 'Curva Av. JK', zoneId: 'ala-sul-esporte', floor: 'L1', segment: 'moda', nearestPortal: 'P1', x: -24.5, z: 7.4, w: 3.2, d: 2.2, h: 3.0, color: '#e0f2fe', accent: '#0284c7', tier: 'satellite' },
  { name: 'RESOLVE PALMAS', sublabel: 'Atend. Público • L15', zoneId: 'ala-sul-esporte', floor: 'L1', segment: 'moda', nearestPortal: 'P1', x: -21.2, z: 9.6, w: 3.8, d: 2.6, h: 3.1, color: '#f1f5f9', accent: '#334155', tier: 'satellite' },
  { name: 'VIVO • CLARO', sublabel: 'Drog. Econômica', zoneId: 'ala-sul-esporte', floor: 'L1', segment: 'moda', nearestPortal: 'P1', x: -17.6, z: 10.2, w: 3.2, d: 2.2, h: 3.0, color: '#e0f2fe', accent: '#0284c7', tier: 'satellite' },
  { name: 'CENTAURO', sublabel: '871 m² • Âncora 05', zoneId: 'ala-sul-esporte', floor: 'L1', segment: 'moda', nearestPortal: 'P1', x: -13.6, z: 10.2, w: 5.0, d: 3.4, h: 3.5, color: '#ffe4e6', accent: '#e11d48', tier: 'anchor' },
  { name: 'POLÍCIA FEDERAL', sublabel: 'Detran-TO • L81', zoneId: 'ala-sul-esporte', floor: 'L1', segment: 'moda', nearestPortal: 'P3', x: -21.4, z: -3.2, w: 4.0, d: 3.0, h: 3.1, color: '#e2e8f0', accent: '#1e293b', tier: 'satellite' },
  { name: 'BISTRÔ 81', sublabel: 'Chopp Brahma • Q2B', zoneId: 'ala-sul-esporte', floor: 'L1', segment: 'gastronomia', nearestPortal: 'P1 / P4', x: -20.5, z: 2.5, w: 3.0, d: 2.8, h: 2.7, color: '#fef3c7', accent: '#b45309', tier: 'satellite' },
  { name: 'ÓTICAS CAROL', sublabel: 'Bagaggio • Botoclinic', zoneId: 'ala-sul-esporte', floor: 'L1', segment: 'moda', nearestPortal: 'P3', x: -16.5, z: -1.8, w: 3.8, d: 2.4, h: 3.0, color: '#f8fafc', accent: '#0369a1', tier: 'satellite' },
  { name: 'STILO A', sublabel: '700 m² • Moda', zoneId: 'ala-sul-esporte', floor: 'L1', segment: 'moda', nearestPortal: 'P1', x: -12.6, z: 4.8, w: 4.2, d: 2.8, h: 3.2, color: '#f1f5f9', accent: '#475569', tier: 'megaloja' },
  { name: 'RI HAPPY', sublabel: '499 m² • Brinquedos', zoneId: 'ala-sul-esporte', floor: 'L1', segment: 'moda', nearestPortal: 'P1', x: -8.0, z: 4.8, w: 3.8, d: 2.8, h: 3.2, color: '#fef9c3', accent: '#eab308', tier: 'megaloja' },
  { name: 'CACAU SHOW', sublabel: '40 m² • Loja 73', zoneId: 'ala-sul-esporte', floor: 'L1', segment: 'gastronomia', nearestPortal: 'P1', x: -10.5, z: 7.4, w: 2.6, d: 1.8, h: 2.8, color: '#fef3c7', accent: '#78350f', tier: 'satellite' },

  // Galeria P3 (Polo Wear / Moda Oeste + Tommy Hilfiger + Vagas 96, 132, 142)
  { name: 'POLO WEAR', sublabel: '619 m² • Portaria P3', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P3', x: -19.2, z: -8.2, w: 5.0, d: 3.8, h: 3.4, color: '#e0f2fe', accent: '#1d4ed8', tier: 'megaloja' },
  { name: 'LIFE VIVARA', sublabel: '103 m² • Joias', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P3', x: -13.4, z: -8.6, w: 2.2, d: 2.2, h: 3.0, color: '#fdf2f8', accent: '#be185d', tier: 'satellite' },
  { name: 'TOMMY HILFIGER', sublabel: '116 m² • Loja 143', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P3', x: -11.4, z: -8.6, w: 2.0, d: 2.2, h: 3.0, color: '#fee2e2', accent: '#1d4ed8', tier: 'satellite' },
  { name: 'VAGA 142 (36 m²)', sublabel: 'Oportunidade P3', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P3', x: -9.8, z: -8.6, w: 1.4, d: 2.2, h: 2.9, color: '#ffe4e6', accent: '#e11d48', tier: 'vacant', isVacant: true },
  { name: 'YOUCOM', sublabel: '311 m² • Jovem', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P3', x: -7.8, z: -8.6, w: 2.6, d: 2.4, h: 3.1, color: '#f1f5f9', accent: '#0f172a', tier: 'satellite' },
  { name: 'COLCCI • LEZ A LEZ', sublabel: 'Moda Feminina', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P3', x: -5.2, z: -8.8, w: 2.6, d: 2.4, h: 3.0, color: '#fce7f3', accent: '#db2777', tier: 'satellite' },
  { name: 'AUTHENTIC FEET', sublabel: '91 m² • Sneakers', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P3', x: -2.8, z: -8.8, w: 2.2, d: 2.4, h: 3.0, color: '#dbeafe', accent: '#2563eb', tier: 'satellite' },
  { name: 'DAMYLLER • LUPO', sublabel: 'Corredor P3', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P3', x: -12.6, z: -4.8, w: 3.0, d: 2.2, h: 2.9, color: '#e0e7ff', accent: '#4338ca', tier: 'satellite' },
  { name: 'CROCS • AVATIM', sublabel: 'Quem Disse, Berenice?', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P3', x: -9.2, z: -4.8, w: 3.0, d: 2.2, h: 2.9, color: '#dcfce7', accent: '#15803d', tier: 'satellite' },
  { name: "LEVI'S • SCHUTZ", sublabel: 'Milon • Babi', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P3', x: -6.2, z: -4.8, w: 2.6, d: 2.2, h: 2.9, color: '#fee2e2', accent: '#b91c1c', tier: 'satellite' },
  { name: 'VAGA 96 (45 m²)', sublabel: 'Galeria Central', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P3', x: -4.1, z: -5.0, w: 1.6, d: 2.0, h: 2.9, color: '#ffe4e6', accent: '#e11d48', tier: 'vacant', isVacant: true },

  // Ala Central (C&A, Riachuelo, Leitura, Brooksfield, Praça Eventos Oval)
  { name: 'C&A', sublabel: '2.099 m² • Âncora A9', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P3 / P2', x: 0.8, z: -11.5, w: 7.4, d: 5.2, h: 3.9, color: '#e0f2fe', accent: '#0284c7', tier: 'anchor' },
  { name: 'VAGA 132 (60 m²)', sublabel: 'Corredor C&A → Leitura', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P2', x: 3.8, z: -9.8, w: 1.8, d: 2.0, h: 2.9, color: '#ffe4e6', accent: '#e11d48', tier: 'vacant', isVacant: true },
  { name: 'RIACHUELO', sublabel: '2.342 m² • Âncora 02', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P1 / P3', x: 0.2, z: -1.8, w: 7.8, d: 5.0, h: 3.9, color: '#f8fafc', accent: '#0f172a', tier: 'anchor' },
  { name: 'KINGS • DEMOCRATA', sublabel: 'Calçados & Street', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P3', x: -2.0, z: -6.4, w: 3.0, d: 2.0, h: 2.9, color: '#f1f5f9', accent: '#334155', tier: 'satellite' },
  { name: 'LIVRARIA LEITURA', sublabel: '500 m² • Cultura', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P2', x: 6.8, z: -8.4, w: 4.8, d: 3.4, h: 3.4, color: '#ede9fe', accent: '#7c3aed', tier: 'megaloja' },
  { name: 'BROOKSFIELD', sublabel: '364 m² • Alfaiataria', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P2', x: 6.4, z: -1.8, w: 4.0, d: 3.2, h: 3.3, color: '#e2e8f0', accent: '#1e293b', tier: 'megaloja' },
  { name: 'ELLUS • KAZZU', sublabel: 'Galeria Norte P2', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P2', x: 11.4, z: -6.2, w: 3.6, d: 2.6, h: 3.0, color: '#f1f5f9', accent: '#475569', tier: 'satellite' },
  { name: 'USAFLEX • AMANDA', sublabel: 'Galeria P2', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P2', x: 11.4, z: -2.4, w: 3.6, d: 2.4, h: 3.0, color: '#fce7f3', accent: '#db2777', tier: 'satellite' },
  { name: 'TRACK & FIELD', sublabel: 'Sestini • Fuel', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P1', x: 5.8, z: 2.0, w: 3.2, d: 2.0, h: 2.9, color: '#dbeafe', accent: '#1d4ed8', tier: 'satellite' },
  { name: 'LIVE! • O BOTICÁRIO', sublabel: 'Natura • Lupo • Praça Oval', zoneId: 'ala-central-ancoras', floor: 'L1', segment: 'moda', nearestPortal: 'P1', x: 1.5, z: 2.2, w: 3.6, d: 2.2, h: 2.9, color: '#fef3c7', accent: '#92400e', tier: 'satellite' },

  // Alameda Gourmet & Acesso P1 (Corrigidos: Vivara/Adcos atrás da P1, Hering na Alameda Sul, Colégio Interação no Norte E7)
  { name: 'INOVAR • ARAMIS', sublabel: 'Alameda das Cores', zoneId: 'alameda-gourmet', floor: 'L1', segment: 'moda', nearestPortal: 'P1', x: -9.5, z: 10.2, w: 3.2, d: 2.8, h: 3.1, color: '#f1f5f9', accent: '#334155', tier: 'satellite' },
  { name: 'CAMICADO', sublabel: '515 m² • Casa', zoneId: 'alameda-gourmet', floor: 'L1', segment: 'moda', nearestPortal: 'P1', x: -6.0, z: 10.2, w: 3.4, d: 3.0, h: 3.3, color: '#fee2e2', accent: '#dc2626', tier: 'megaloja' },
  { name: 'VIVARA • ADCOS', sublabel: 'Lojas 29-30 • Praça Oval', zoneId: 'alameda-gourmet', floor: 'L1', segment: 'moda', nearestPortal: 'P1', x: 0.6, z: 7.4, w: 2.6, d: 2.0, h: 3.0, color: '#f8fafc', accent: '#0f172a', tier: 'satellite' },
  { name: 'VAGA 31 (41 m²)', sublabel: 'Ao lado da Adcos', zoneId: 'alameda-gourmet', floor: 'L1', segment: 'gastronomia', nearestPortal: 'P1', x: 2.6, z: 7.4, w: 1.6, d: 2.0, h: 2.9, color: '#ffe4e6', accent: '#e11d48', tier: 'vacant', isVacant: true },
  { name: 'OUTBACK', sublabel: '499 m² • Portaria P1', zoneId: 'alameda-gourmet', floor: 'L1', segment: 'gastronomia', nearestPortal: 'P1', x: 4.8, z: 10.2, w: 3.8, d: 3.2, h: 3.5, color: '#fee2e2', accent: '#b91c1c', tier: 'anchor' },
  { name: "RESERVA • CARTER'S", sublabel: 'Melissa • Chilli Beans', zoneId: 'alameda-gourmet', floor: 'L1', segment: 'moda', nearestPortal: 'P1', x: 8.6, z: 10.2, w: 3.2, d: 2.6, h: 3.1, color: '#e2e8f0', accent: '#1e293b', tier: 'satellite' },
  { name: 'MADERO', sublabel: '181 m² • EXT 01 (NS-05)', zoneId: 'alameda-gourmet', floor: 'L1', segment: 'gastronomia', nearestPortal: 'P1', x: 8.6, z: 13.6, w: 3.4, d: 2.2, h: 3.1, color: '#fef3c7', accent: '#d97706', tier: 'megaloja' },
  { name: 'MARISA', sublabel: '1.319 m² • Âncora 03', zoneId: 'alameda-gourmet', floor: 'L1', segment: 'moda', nearestPortal: 'P1', x: 13.6, z: 9.8, w: 5.4, d: 4.2, h: 3.6, color: '#fce7f3', accent: '#db2777', tier: 'anchor' },
  { name: 'DROGASIL', sublabel: '208 m² • Dudalina', zoneId: 'alameda-gourmet', floor: 'L1', segment: 'moda', nearestPortal: 'P1', x: 4.5, z: 5.8, w: 2.4, d: 2.2, h: 3.0, color: '#dcfce7', accent: '#16a34a', tier: 'satellite' },
  { name: 'HERING • CONSTANCE', sublabel: '384 m² • Hope / Bibi', zoneId: 'alameda-gourmet', floor: 'L1', segment: 'moda', nearestPortal: 'P1', x: 7.8, z: 5.8, w: 4.2, d: 2.4, h: 3.2, color: '#e0f2fe', accent: '#0369a1', tier: 'megaloja' },
  { name: 'COLÉGIO INTERAÇÃO', sublabel: 'Acesso Térreo E7 (299 m²)', zoneId: 'alameda-gourmet', floor: 'L1', segment: 'moda', nearestPortal: 'P1 / P2', x: 9.8, z: 2.0, w: 3.4, d: 2.4, h: 3.1, color: '#fef9c3', accent: '#ca8a04', tier: 'satellite' },
  { name: 'LADY LORD', sublabel: '229 m² • Beleza', zoneId: 'alameda-gourmet', floor: 'L1', segment: 'moda', nearestPortal: 'P1', x: 13.0, z: 3.4, w: 2.8, d: 2.4, h: 3.0, color: '#fdf2f8', accent: '#be185d', tier: 'satellite' },
  { name: 'VAGA 48 (35 m²)', sublabel: 'Ao lado da Lady Lord', zoneId: 'alameda-gourmet', floor: 'L1', segment: 'gastronomia', nearestPortal: 'P1', x: 14.2, z: 5.4, w: 1.8, d: 1.8, h: 2.9, color: '#ffe4e6', accent: '#e11d48', tier: 'vacant', isVacant: true },

  // Ala Norte / Corredor PC (Av. LO-2A: Cinemark → BK → STZ → Avenida → Pernambucanas → Big Lar → Zig Zag → Super Big → WoW → Morofit → Área Vaga)
  { name: 'CINEMARK', sublabel: '3.090 m² • Âncora 04', zoneId: 'ala-lazer-cinema', floor: 'L1', segment: 'gastronomia', nearestPortal: 'P1 / PC', x: 24.5, z: 7.5, w: 8.6, d: 8.0, h: 4.5, color: '#fecaca', accent: '#b91c1c', tier: 'anchor' },
  { name: 'CAR COUTO LAVA JATO', sublabel: '421 m² • Externo NS-05', zoneId: 'ala-lazer-cinema', floor: 'L1', segment: 'mercado', nearestPortal: 'P1', x: 24.5, z: 14.2, w: 5.0, d: 2.4, h: 2.4, color: '#e0f2fe', accent: '#0284c7', tier: 'satellite' },
  { name: 'BURGER KING', sublabel: '191 m² • PC 07', zoneId: 'ala-lazer-cinema', floor: 'L1', segment: 'gastronomia', nearestPortal: 'P1 / PC', x: 21.8, z: 3.4, w: 3.0, d: 2.3, h: 3.1, color: '#ffedd5', accent: '#ea580c', tier: 'satellite' },
  { name: 'STUDIO Z (STZ)', sublabel: '967 m² • PC 06', zoneId: 'ala-lazer-cinema', floor: 'L1', segment: 'moda', nearestPortal: 'PC', x: 24.5, z: 0.4, w: 7.6, d: 3.1, h: 3.5, color: '#e0f2fe', accent: '#0369a1', tier: 'anchor' },
  { name: 'AVENIDA', sublabel: '968 m² • PC 05', zoneId: 'ala-lazer-cinema', floor: 'L1', segment: 'moda', nearestPortal: 'PC', x: 24.5, z: -3.5, w: 7.6, d: 3.2, h: 3.5, color: '#f1f5f9', accent: '#334155', tier: 'megaloja' },
  { name: 'PERNAMBUCANAS', sublabel: '1.324 m² • PC 04', zoneId: 'ala-lazer-cinema', floor: 'L1', segment: 'moda', nearestPortal: 'P2', x: 24.5, z: -7.4, w: 7.6, d: 3.3, h: 3.6, color: '#fef9c3', accent: '#ca8a04', tier: 'anchor' },
  { name: 'BIG LAR', sublabel: '1.317 m² • PC 03', zoneId: 'ala-lazer-cinema', floor: 'L1', segment: 'mercado', nearestPortal: 'P2', x: 24.5, z: -11.4, w: 7.6, d: 3.3, h: 3.6, color: '#ffedd5', accent: '#c2410c', tier: 'megaloja' },
  { name: 'ZIG ZAG PLAY', sublabel: '1.317 m² • PC 02', zoneId: 'ala-lazer-cinema', floor: 'L1', segment: 'gastronomia', nearestPortal: 'P2', x: 24.5, z: -15.3, w: 7.6, d: 3.2, h: 3.6, color: '#ede9fe', accent: '#7c3aed', tier: 'megaloja' },
  { name: 'SUPER BIG', sublabel: '1.070 m² • Esteira Subsolo', zoneId: 'ala-lazer-cinema', floor: 'L1', segment: 'mercado', nearestPortal: 'P2', x: 24.5, z: -20.2, w: 7.6, d: 3.4, h: 3.7, color: '#fee2e2', accent: '#dc2626', tier: 'anchor' },
  { name: 'WOW PARK', sublabel: '1.085 m² • PC 01B', zoneId: 'ala-lazer-cinema', floor: 'L1', segment: 'gastronomia', nearestPortal: 'PC', x: 24.5, z: -24.1, w: 7.6, d: 3.2, h: 3.6, color: '#fef3c7', accent: '#d97706', tier: 'megaloja' },
  { name: 'MOROFIT', sublabel: '1.280 m² • Academia', zoneId: 'ala-lazer-cinema', floor: 'L1', segment: 'mercado', nearestPortal: 'PC', x: 24.5, z: -28.0, w: 7.6, d: 3.4, h: 3.7, color: '#d1fae5', accent: '#059669', tier: 'anchor' },
  { name: 'ÁREA VAGA NORTE (1.329 m²)', sublabel: 'Expansão Megaloja PC', zoneId: 'ala-lazer-cinema', floor: 'L1', segment: 'mercado', nearestPortal: 'PC', x: 28.5, z: -26.5, w: 3.8, d: 6.2, h: 3.1, color: '#ffe4e6', accent: '#e11d48', tier: 'vacant', isVacant: true },

  // === SUBSOLO 1 (SS1 — Y base = -5.0) ===
  { name: 'MARIA EXPRESS (SS1)', sublabel: 'QSUB1 • 51 m²', zoneId: 'ala-lazer-cinema', floor: 'SS1', segment: 'mercado', nearestPortal: 'P2', x: 14.0, z: -17.8, w: 3.4, d: 2.6, h: 2.4, color: '#fef3c7', accent: '#d97706', tier: 'megaloja' },

  // === 2º PAVIMENTO — PRAÇA DE ALIMENTAÇÃO SOBRE A CURVA AV. JK (L2 — Y base = 11.0) ===
  { name: 'MUNDO IMERSIVO', sublabel: 'Loja 215 • 250 m²', zoneId: 'praca-alimentacao-l2', floor: 'L2', segment: 'gastronomia', nearestPortal: 'P4', x: -29.2, z: -4.0, w: 4.5, d: 2.9, h: 3.1, color: '#e0f2fe', accent: '#0284c7', tier: 'megaloja' },
  { name: "McDONALD'S", sublabel: 'Loja 214 • 161 m²', zoneId: 'praca-alimentacao-l2', floor: 'L2', segment: 'gastronomia', nearestPortal: 'P4', x: -24.2, z: -5.0, w: 4.2, d: 2.8, h: 3.1, color: '#fef08a', accent: '#ca8a04', tier: 'anchor' },
  { name: 'SPOLETTO', sublabel: 'Loja 213 • 53 m²', zoneId: 'praca-alimentacao-l2', floor: 'L2', segment: 'gastronomia', nearestPortal: 'P4', x: -20.2, z: -5.0, w: 3.0, d: 2.6, h: 2.9, color: '#ffedd5', accent: '#ea580c', tier: 'satellite' },
  { name: 'PIZZA HUT', sublabel: 'Loja 212 • 37 m²', zoneId: 'praca-alimentacao-l2', floor: 'L2', segment: 'gastronomia', nearestPortal: 'P4', x: -17.0, z: -4.8, w: 2.8, d: 2.5, h: 2.9, color: '#fee2e2', accent: '#dc2626', tier: 'satellite' },
  { name: 'DIVINO FOGÃO • DONA MARIA', sublabel: 'Vivenda Camarão • 209-211', zoneId: 'praca-alimentacao-l2', floor: 'L2', segment: 'gastronomia', nearestPortal: 'P4', x: -13.6, z: -4.2, w: 3.2, d: 2.5, h: 2.9, color: '#d1fae5', accent: '#059669', tier: 'satellite' },

  { name: 'EVENTO IMERSO MAR', sublabel: 'Loja 200 • 286 m²', zoneId: 'praca-alimentacao-l2', floor: 'L2', segment: 'gastronomia', nearestPortal: 'P4', x: -29.2, z: 4.6, w: 4.6, d: 2.9, h: 3.1, color: '#e0f2fe', accent: '#0369a1', tier: 'megaloja' },
  { name: 'KIN SUI', sublabel: 'Loja 201 • 80 m²', zoneId: 'praca-alimentacao-l2', floor: 'L2', segment: 'gastronomia', nearestPortal: 'P4', x: -24.4, z: 5.4, w: 3.2, d: 2.6, h: 2.9, color: '#ede9fe', accent: '#7c3aed', tier: 'satellite' },
  { name: 'GIRAFFAS', sublabel: 'Loja 202 • 65 m²', zoneId: 'praca-alimentacao-l2', floor: 'L2', segment: 'gastronomia', nearestPortal: 'P4', x: -21.2, z: 5.6, w: 2.8, d: 2.6, h: 2.9, color: '#ffedd5', accent: '#f97316', tier: 'satellite' },
  { name: 'VAGA 203 (58 m²)', sublabel: 'Oportunidade L2', zoneId: 'praca-alimentacao-l2', floor: 'L2', segment: 'gastronomia', nearestPortal: 'P4', x: -18.5, z: 5.6, w: 2.2, d: 2.6, h: 2.9, color: '#ffe4e6', accent: '#e11d48', tier: 'vacant', isVacant: true },
  { name: 'SPAGUETTINNI', sublabel: 'Loja 204 • Massas', zoneId: 'praca-alimentacao-l2', floor: 'L2', segment: 'gastronomia', nearestPortal: 'P4', x: -16.4, z: 5.6, w: 1.8, d: 2.5, h: 2.9, color: '#fef3c7', accent: '#d97706', tier: 'satellite' },
  { name: 'VAGA 205 (35 m²)', sublabel: 'Oportunidade L2', zoneId: 'praca-alimentacao-l2', floor: 'L2', segment: 'gastronomia', nearestPortal: 'P4', x: -14.6, z: 5.4, w: 1.6, d: 2.5, h: 2.9, color: '#ffe4e6', accent: '#e11d48', tier: 'vacant', isVacant: true },
  { name: 'SUBWAY • EXPRESS', sublabel: 'Express Grill • Lojas 206-207', zoneId: 'praca-alimentacao-l2', floor: 'L2', segment: 'gastronomia', nearestPortal: 'P4', x: -12.3, z: 5.0, w: 2.6, d: 2.5, h: 2.9, color: '#dcfce7', accent: '#16a34a', tier: 'satellite' },

  // Blocos Educação / Saúde no 2º Piso (Planta Baixa L2 - Folha 1)
  { name: 'COLÉGIO INTERAÇÃO L2', sublabel: 'Bloco A8 • 950 m²', zoneId: 'alameda-gourmet', floor: 'L2', segment: 'gastronomia', nearestPortal: 'P1 / P2', x: 9.2, z: 5.8, w: 5.8, d: 3.6, h: 3.2, color: '#fef9c3', accent: '#ca8a04', tier: 'megaloja' },
  { name: 'UNICESUMAR • IOA', sublabel: 'L202 • 1.133 m²', zoneId: 'ala-central-ancoras', floor: 'L2', segment: 'gastronomia', nearestPortal: 'P2', x: 11.4, z: -4.3, w: 4.8, d: 4.8, h: 3.2, color: '#e0f2fe', accent: '#0284c7', tier: 'megaloja' },
];

/** Quiosques reais dos corredores L1 (Planta Mix Q1–Q34 / QPC01–02) */
export const CAPIM_KIOSKS_3D: Kiosk3DDef[] = [
  { id: 'Q32B', name: 'WE PINK (Q32B)', segment: 'moda', zoneId: 'ala-central-ancoras', x: -15.6, z: -6.8, accent: '#ec4899' },
  { id: 'Q32A', name: 'HAVANNA (Q32A)', segment: 'gastronomia', zoneId: 'ala-central-ancoras', x: -10.8, z: -6.8, accent: '#b45309' },
  { id: 'Q31', name: 'MILKMOO (Q31)', segment: 'gastronomia', zoneId: 'ala-central-ancoras', x: -5.4, z: -6.8, accent: '#0f172a' },
  { id: 'Q32', name: 'KEKALA (Q32)', segment: 'gastronomia', zoneId: 'ala-central-ancoras', x: 1.5, z: -6.8, accent: '#0284c7' },
  { id: 'Q2', name: 'GIRAFFAS (Q2)', segment: 'gastronomia', zoneId: 'ala-sul-esporte', x: -16.8, z: 7.4, accent: '#f97316' },
  { id: 'Q3', name: 'FINI • SOFT (Q3)', segment: 'gastronomia', zoneId: 'ala-sul-esporte', x: -14.2, z: 7.4, accent: '#e11d48' },
  { id: 'Q7', name: 'OAKBERRY (Q7)', segment: 'gastronomia', zoneId: 'alameda-gourmet', x: 5.5, z: 7.8, accent: '#7c3aed' },
  { id: 'Q10', name: 'MY CASE (Q10)', segment: 'moda', zoneId: 'alameda-gourmet', x: 9.2, z: 7.8, accent: '#334155' },
  { id: 'Q12', name: 'MONKEY SHOP (Q12)', segment: 'moda', zoneId: 'alameda-gourmet', x: 13.5, z: 6.8, accent: '#059669' },
  { id: 'Q18', name: "McDONALD'S (Q18)", segment: 'gastronomia', zoneId: 'ala-lazer-cinema', x: 18.8, z: 5.2, accent: '#eab308' },
  { id: 'Q19', name: 'CHUTE PLAY (Q19)', segment: 'gastronomia', zoneId: 'ala-lazer-cinema', x: 18.8, z: -2.0, accent: '#2563eb' },
  { id: 'Q15B', name: 'FINI POCKET (Q15B)', segment: 'gastronomia', zoneId: 'ala-lazer-cinema', x: 18.8, z: -9.5, accent: '#db2777' },
  { id: 'QPC02', name: 'MAROMBA SUP. (QPC02)', segment: 'mercado', zoneId: 'ala-lazer-cinema', x: 18.8, z: -22.5, accent: '#10b981' },
];

export const CAPIM_PORTALS_3D: Portal3DDef[] = [
  { id: 'P1', title: 'PORTARIA PRINCIPAL (P1)', subtitle: 'Av. NS-05 • Camicado / Outback', x: -0.8, z: 12.2, rotY: 0 },
  { id: 'P2', title: 'PORTARIA NOROESTE (P2)', subtitle: 'Estac. Oeste • Rampa Subsolo / Super Big', x: 15.8, z: -12.6, rotY: Math.PI },
  { id: 'P3', title: 'PORTARIA OESTE (P3)', subtitle: 'Estac. Oeste • Polo Wear / C&A', x: -7.5, z: -12.4, rotY: Math.PI },
  { id: 'P4', title: 'PRAÇA P4 (2º PISO)', subtitle: 'Mirante Curva Av. JK • Escadas Rolantes', x: -28.0, z: 0.3, rotY: -Math.PI / 2 },
  { id: 'PC', title: 'ACESSO NORTE PC', subtitle: 'Av. LO-2A • Motos, Ciclistas & Morofit', x: 26.5, z: -31.5, rotY: -Math.PI / 2 },
];

export const CAPIM_PARKING_3D: ParkingLot3DDef[] = [
  { id: 'east-ns05', title: 'ESTAC. FRONTAL (NS-05)', subtitle: 'Portaria P1 • Embarque / Madero', cx: -3.0, cz: 17.6, w: 38.0, d: 6.0, rows: 2, cols: 14, y: 0 },
  { id: 'west-outdoor', title: 'ESTACIONAMENTO OESTE', subtitle: 'Acesso P2 / P3 • 3ª Rotatória / C&A', cx: -2.0, cz: -20.5, w: 32.0, d: 11.0, rows: 3, cols: 11, y: 0 },
  { id: 'south-jk', title: 'ESTAC. AV. JK (SUL)', subtitle: 'Curva Renner & Praça L2', cx: -35.8, cz: -14.0, w: 7.0, d: 16.0, rows: 4, cols: 2, y: 0 },
  { id: 'ss1', title: 'SUBSOLO 1 (140 VAGAS)', subtitle: 'Motos/Bicicletário NE • Esteira Big/Morofit', cx: 8.5, cz: -16.8, w: 20.0, d: 11.5, rows: 3, cols: 8, y: -5.0 },
  { id: 'ss2', title: 'SUBSOLO 2 (216 VAGAS)', subtitle: 'G2 Coberto • Elevadores / PNE / Neurodiverso', cx: 8.5, cz: -16.8, w: 20.0, d: 11.5, rows: 3, cols: 8, y: -9.6 },
];

/** Altura vertical padronizada do 2º Pavimento (L2) — folga livre e desobstrução de fachadas */
export const L2_DECK_Y = 11.0;

export const CAMERA_PRESETS: CameraPresetDef[] = [
  { id: 'overview', label: '🌐 Visão Geral', floor: 'L1', xray: false, pos: [-4, 46, 56], target: [-1, 1, -2] },
  { id: 'p1', label: '🏛️ P1 & Gourmet', floor: 'L1', xray: false, pos: [6, 22, 34], target: [4, 2, 7] },
  { id: 'anchors', label: '🛍️ Âncoras', floor: 'L1', xray: false, pos: [-16, 26, -32], target: [-4, 2, -4] },
  { id: 'pc', label: '🎬 Corredor PC', floor: 'L1', xray: false, pos: [46, 25, -12], target: [21, 2, -12] },
  { id: 'l2', label: '🍔 2º Piso (JK)', floor: 'L2', xray: false, pos: [-44, 29.0, 22], target: [-21, 11.8, 0] },
  { id: 'subsolo', label: '🅿️ Subsolo 1 & 2', floor: 'SS1', xray: true, pos: [-14, 15, -42], target: [12, -3.5, -17] },
];

export const GUIDED_TOUR_STOPS: GuidedTourStop[] = [
  {
    title: '1/5 • Av. NS-05, 2 Rotatórias & Portaria P1',
    description: 'Fachada Leste com porte-cochère da P1, Outback, Madero EXT 01 e Marisa.',
    floor: 'L1',
    xray: false,
    pos: [-2, 30, 44],
    target: [2, 2, 11],
  },
  {
    title: '2/5 • Ala Central, Praça Oval & Quiosques',
    description: 'Riachuelo, C&A, Livraria Leitura, Brooksfield e os quiosques reais nos corredores.',
    floor: 'L1',
    xray: false,
    pos: [-8, 22, -26],
    target: [0, 2, -2],
  },
  {
    title: '3/5 • Curva Av. JK & Escadas para o 2º Piso',
    description: 'Renner (2.027 m²), PF/Detran, Bistrô 81 e escadas rolantes com fluxo gastronômico.',
    floor: 'L1',
    xray: false,
    pos: [-42, 22, 22],
    target: [-24, 3, 2],
  },
  {
    title: '4/5 • 2º Pavimento: Praça de Alimentação L2',
    description: "McDonald's, Mundo Imersivo, Kin Sui, Vagas 203/205 e mesas sobre a Curva JK.",
    floor: 'L2',
    xray: false,
    pos: [-40, 28.0, 18],
    target: [-21, 11.8, 0],
  },
  {
    title: '5/5 • Corredor Norte PC + Raio-X Subsolo 1 & 2',
    description: '356 vagas subindo pelas 3 esteiras direto para Super Big, WoW Park, Morofit e Área Vaga 1.329 m².',
    floor: 'SS1',
    xray: true,
    pos: [-16, 17, -44],
    target: [14, -2, -18],
  },
];
