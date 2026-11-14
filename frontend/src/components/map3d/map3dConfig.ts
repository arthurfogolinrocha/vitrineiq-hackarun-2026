import * as THREE from 'three';
import type { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { CrossSegmentRoute, FlashCampaign, FloorId, StoreTenant, ZoneId } from '../../types';
import type { ZoneLiveTelemetry } from '../../services/opportunityEngine';
import {
  CAPIM_KIOSKS_3D,
  CAPIM_STORES_3D,
  Kiosk3DDef,
  L2_DECK_Y,
  SegmentFilter,
  Store3DDef,
} from '../../data/capimDourado3DLayout';

export type VisualTheme = 'obsidian' | 'day';
export type CampaignWithOrigin = FlashCampaign & { triggerOrigin?: string };

export interface ShoppingMap3DProps {
  floor: FloorId;
  onFloorChange: (floor: FloorId) => void;
  zonesTelemetry: ZoneLiveTelemetry[];
  selectedZoneId: ZoneId;
  onSelectZone: (zoneId: ZoneId) => void;
  selectedStoreName?: string | null;
  onSelectStoreName?: (name: string | null) => void;
  routes?: CrossSegmentRoute[];
  campaigns?: FlashCampaign[];
  activeTenant?: StoreTenant | null;
}

export interface SearchHit {
  label: string;
  subtitle: string;
  zoneId: ZoneId;
  floor: FloorId | 'SS1';
  segment: Exclude<SegmentFilter, 'all'>;
  nearestPortal: string;
  x: number;
  z: number;
  h: number;
  isKiosk?: boolean;
}

export interface StoreEntry {
  def: Store3DDef;
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  trimMat: THREE.MeshStandardMaterial;
  edges: THREE.LineSegments;
  edgesMat: THREE.LineBasicMaterial;
  sprite: THREE.Sprite;
}

export interface KioskEntry {
  def: Kiosk3DDef;
  segment: Exclude<SegmentFilter, 'all'>;
  zoneId: ZoneId;
  sprite: THREE.Sprite;
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  pos: THREE.Vector3;
}

export interface HeatmapParticleMeta {
  zoneId: ZoneId;
  baseX: number;
  baseY: number;
  baseZ: number;
  phase: number;
  speed: number;
  ampY: number;
  ampXZ: number;
}

export interface AlliancePulse {
  mesh: THREE.Mesh;
  curve: THREE.QuadraticBezierCurve3;
  t: number;
  speed: number;
}

export interface FlowWalker {
  mesh: THREE.Mesh;
  path: THREE.CatmullRomCurve3;
  t: number;
  speed: number;
  orientToPath?: boolean;
}

export interface AnimatedTread {
  mesh: THREE.Mesh;
  phase: number;
  axis: 'esteira' | 'escalator';
}

export interface ElevatorCabin {
  group: THREE.Group;
  cabin: THREE.Mesh;
  yStart: number;
  h: number;
}

export interface WalkState {
  pos: THREE.Vector3;
  yaw: number;
  pitch: number;
  dragging: boolean;
  lastX: number;
  lastY: number;
}

export interface Map3DActions {
  zoom: (factor: number) => void;
  flyTo: (pos: [number, number, number], target: [number, number, number]) => void;
  resetOrbit: (targetFloor: FloorId, focusSubsolo?: boolean) => void;
  enterWalk: (targetFloor: FloorId) => void;
  nudgeWalk: (forward: number, strafe: number, turnYaw: number) => void;
}

export interface Map3DSceneRefs {
  renderer: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
  hemiLight: THREE.HemisphereLight | null;
  dirLight: THREE.DirectionalLight | null;
  bloomPass: UnrealBloomPass | null;
  l1DeckMat: THREE.MeshStandardMaterial | null;
  subsoloCover: THREE.Mesh | null;
  groundMat: THREE.MeshStandardMaterial | null;
  ovalPlazaMat: THREE.MeshStandardMaterial | null;
  l2FoodSlabMat: THREE.MeshStandardMaterial | null;
  l2ExtraDeckMats: THREE.MeshStandardMaterial[];
  obsidianGridGroup: THREE.Group | null;
  beaconGroup: THREE.Group | null;
  beaconHalo: THREE.Mesh | null;
  beaconCone: THREE.Mesh | null;
  l2Materials: THREE.MeshStandardMaterial[];
  l2Objects: THREE.Object3D[];
  subsoloObjects: THREE.Object3D[];
  heatmapGeo: THREE.BufferGeometry | null;
  heatmapMat: THREE.PointsMaterial | null;
  heatmapMeta: HeatmapParticleMeta[];
  allianceGroup: THREE.Group | null;
  alliancePulses: AlliancePulse[];
  storeEntries: StoreEntry[];
  kioskEntries: KioskEntry[];
  routeGroups: Record<Exclude<SegmentFilter, 'all'>, THREE.Object3D[]>;
  flyTarget: { camPos: THREE.Vector3; lookAt: THREE.Vector3 } | null;
}

export interface ThemePaletteEntry {
  bgHex: string;
  fogNear: number;
  fogFar: number;
  envIntensity: number;
  exposure: number;
  hemiColor: string;
  hemiGround: string;
  hemiIntensity: number;
  dirColor: string;
  dirIntensity: number;
  l1Color: string;
  l1Roughness: number;
  l1Metalness: number;
  groundColor: string;
  ovalPlazaColor: string;
  l2FoodSlabColor: string;
  l2ExtraDeckColor: string;
  heatmapOpacity: number;
}

export const THEME_PALETTE: Record<VisualTheme, ThemePaletteEntry> = {
  obsidian: {
    bgHex: '#080B10',
    fogNear: 75,
    fogFar: 195,
    envIntensity: 0.44,
    exposure: 0.94,
    hemiColor: '#cbd5e1',
    hemiGround: '#0f172a',
    hemiIntensity: 0.65,
    dirColor: '#fef3c7',
    dirIntensity: 1.05,
    l1Color: '#131823',
    l1Roughness: 0.42,
    l1Metalness: 0.18,
    groundColor: '#0a0e16',
    ovalPlazaColor: '#3b2d16',
    l2FoodSlabColor: '#181f2e',
    l2ExtraDeckColor: '#1b2333',
    heatmapOpacity: 0.85,
  },
  day: {
    bgHex: '#eaeef5',
    fogNear: 70,
    fogFar: 185,
    envIntensity: 0.42,
    exposure: 1.04,
    hemiColor: '#ffffff',
    hemiGround: '#cbd5e1',
    hemiIntensity: 1.2,
    dirColor: '#fffbeb',
    dirIntensity: 1.32,
    l1Color: '#f8fafc',
    l1Roughness: 0.38,
    l1Metalness: 0.04,
    groundColor: '#e5e7eb',
    ovalPlazaColor: '#fde68a',
    l2FoodSlabColor: '#fefce8',
    l2ExtraDeckColor: '#fef9c3',
    heatmapOpacity: 0.62,
  },
};

export const ZONE_CAMERA_PRESETS: Record<
  ZoneId,
  [[number, number, number], [number, number, number]]
> = {
  'alameda-gourmet': [[6, 22, 34], [4, 2, 7]],
  'ala-central-ancoras': [[-16, 26, -32], [-2, 2, -4]],
  'ala-sul-esporte': [[-40, 22, 24], [-22, 2, 3]],
  'ala-lazer-cinema': [[46, 25, -12], [22, 2, -12]],
  'praca-alimentacao-l2': [[-44, 29.0, 22], [-21, 11.8, 0]],
};

export const SEGMENT_FILTER_OPTIONS = [
  { id: 'all', label: 'Todos Fluxos', dot: 'bg-stone-300' },
  { id: 'moda', label: 'Moda', dot: 'bg-blue-400' },
  { id: 'mercado', label: 'Subsolo / Mercado', dot: 'bg-emerald-400' },
  { id: 'gastronomia', label: 'Gastronomia / L2', dot: 'bg-amber-400' },
] as const;

export const LANDSCAPE_TREE_POSITIONS: ReadonlyArray<[number, number, number]> = [
  [-7.2, 14.5, 1.0],
  [2.6, 14.5, 1.0],
  [-42.5, 24.5, 1.15],
  [37.5, 24.5, 1.15],
  [-18, 17.5, 0.9],
  [14, 17.5, 0.9],
  [12.5, -24.5, 0.85],
];

export const ROAD_SIGNS = [
  { text: 'AV. NS-05 (FACHADA LESTE)', sub: 'Portaria P1 • 2 Rotatórias', x: -1, z: 28.5 },
  { text: 'AV. JK (LADO SUL)', sub: 'Curva Renner & Praça L2', x: -42.5, z: 6 },
  { text: 'AV. LO-2A (LADO NORTE • N→)', sub: 'Cinemark • Big • WoW • Morofit', x: 37.5, z: -8 },
  { text: 'SENTIDO ORLA / LAGO (OESTE)', sub: '3ª Rotatória • Subsolos & Estac. Oeste', x: -6, z: -33.6 },
] as const;

export const GATE_ARM_POSITIONS: ReadonlyArray<[number, number]> = [
  [-18, 21.6],
  [13, 21.6],
  [27.2, -31.8],
  [28.6, -31.8],
  [30.0, -31.8],
  [31.4, -31.8],
];

export const L2_PILLAR_POSITIONS: ReadonlyArray<[number, number]> = [
  [-31.0, -5.5],
  [-31.0, 5.5],
  [-23.0, -5.8],
  [-23.0, 6.2],
  [-15.0, -5.2],
  [-15.0, 5.8],
  [-11.5, 0.5],
];

export const L2_EXTRA_DECKS = [
  { x: 9.2, z: 5.8, w: 7.0, d: 4.8 },
  { x: 11.4, z: -4.3, w: 6.0, d: 6.2 },
] as const;

export const CORRIDOR_HEATMAP_ZONES: ReadonlyArray<{
  zoneId: ZoneId;
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  yMin: number;
  yMax: number;
}> = [
  { zoneId: 'ala-sul-esporte', xMin: -26, xMax: -8, zMin: 0.5, zMax: 8.8, yMin: 1.0, yMax: 3.3 },
  { zoneId: 'ala-central-ancoras', xMin: -17, xMax: 11, zMin: -8.5, zMax: 1.5, yMin: 1.0, yMax: 3.3 },
  { zoneId: 'alameda-gourmet', xMin: -7, xMax: 13, zMin: 4.5, zMax: 11.2, yMin: 1.0, yMax: 3.1 },
  { zoneId: 'ala-lazer-cinema', xMin: 16.8, xMax: 21.8, zMin: -27, zMax: 8, yMin: 1.0, yMax: 3.5 },
  {
    zoneId: 'praca-alimentacao-l2',
    xMin: -30,
    xMax: -13,
    zMin: -4.2,
    zMax: 4.2,
    yMin: L2_DECK_Y + 0.9,
    yMax: L2_DECK_Y + 2.9,
  },
];

export const TRAFFIC_CAR_COLORS = [
  '#f8fafc',
  '#38bdf8',
  '#f59e0b',
  '#e2e8f0',
  '#ef4444',
  '#64748b',
] as const;

/** Cria o objeto inicial vazio de referências da cena 3D. */
export function createDefaultSceneRefs(): Map3DSceneRefs {
  return {
    renderer: null,
    scene: null,
    hemiLight: null,
    dirLight: null,
    bloomPass: null,
    l1DeckMat: null,
    subsoloCover: null,
    groundMat: null,
    ovalPlazaMat: null,
    l2FoodSlabMat: null,
    l2ExtraDeckMats: [],
    obsidianGridGroup: null,
    beaconGroup: null,
    beaconHalo: null,
    beaconCone: null,
    l2Materials: [],
    l2Objects: [],
    subsoloObjects: [],
    heatmapGeo: null,
    heatmapMat: null,
    heatmapMeta: [],
    allianceGroup: null,
    alliancePulses: [],
    storeEntries: [],
    kioskEntries: [],
    routeGroups: { moda: [], mercado: [], gastronomia: [] },
    flyTarget: null,
  };
}

/** Normaliza nomes de loja/zona removendo acentos e caixa alta para matching. */
export function normalizeStoreKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Retorna a coordenada 3D âncora de uma ala para origem/destino de rotas e arcos. */
export function resolveZoneAnchor(zoneId: ZoneId, labelHint?: string): THREE.Vector3 {
  const hint = normalizeStoreKey(labelHint ?? '');
  if (hint.includes('morofit')) return new THREE.Vector3(24.5, 4.2, -28.0);
  if (hint.includes('cinemark') || hint.includes('wow')) {
    return new THREE.Vector3(24.5, 4.8, 7.5);
  }
  if (hint.includes('outback') || hint.includes('madero')) {
    return new THREE.Vector3(6.8, 3.8, 10.2);
  }
  switch (zoneId) {
    case 'ala-lazer-cinema':
      return new THREE.Vector3(24.5, 4.6, 3.0);
    case 'praca-alimentacao-l2':
      return new THREE.Vector3(-21.5, L2_DECK_Y + 3.2, 0.2);
    case 'ala-central-ancoras':
      return new THREE.Vector3(0.5, 4.2, -5.5);
    case 'ala-sul-esporte':
      return new THREE.Vector3(-21.0, 4.2, 5.5);
    case 'alameda-gourmet':
      return new THREE.Vector3(6.8, 3.8, 10.2);
  }
}

/** Resolve o ponto 3D de disparo de uma campanha relâmpago a partir do nome de origem. */
export function resolveCampaignOrigin(origin: string): THREE.Vector3 | null {
  const key = normalizeStoreKey(origin);
  if (!key) return null;

  const zoneIds: ZoneId[] = [
    'ala-lazer-cinema',
    'praca-alimentacao-l2',
    'ala-central-ancoras',
    'ala-sul-esporte',
    'alameda-gourmet',
  ];
  const exactZone = zoneIds.find((z) => z === origin);
  if (exactZone) return resolveZoneAnchor(exactZone);

  const matchedStore = CAPIM_STORES_3D.find((st) => {
    const stKey = normalizeStoreKey(st.name);
    return stKey === key || stKey.includes(key) || key.includes(stKey);
  });
  if (matchedStore) {
    const yBase =
      matchedStore.floor === 'L2' ? L2_DECK_Y : matchedStore.floor === 'SS1' ? -5.0 : 0;
    return new THREE.Vector3(matchedStore.x, yBase + matchedStore.h + 0.5, matchedStore.z);
  }

  if (key.includes('cinema') || key.includes('lazer') || key.includes('morofit')) {
    return resolveZoneAnchor('ala-lazer-cinema', origin);
  }
  if (key.includes('praca') || key.includes('l2') || key.includes('alimentacao')) {
    return resolveZoneAnchor('praca-alimentacao-l2');
  }
  if (key.includes('central') || key.includes('ancora') || key.includes('c&a') || key.includes('riachuelo')) {
    return resolveZoneAnchor('ala-central-ancoras');
  }
  if (key.includes('sul') || key.includes('esporte') || key.includes('renner') || key.includes('centauro')) {
    return resolveZoneAnchor('ala-sul-esporte');
  }
  if (key.includes('gourmet') || key.includes('outback') || key.includes('madero')) {
    return resolveZoneAnchor('alameda-gourmet');
  }
  return null;
}

/** Constrói a lista unificada de lojas e quiosques indexados para a busca rápida 3D. */
export function buildSearchableItems(): SearchHit[] {
  const stores: SearchHit[] = CAPIM_STORES_3D.map((st) => ({
    label: st.name,
    subtitle: st.sublabel ?? st.floor,
    zoneId: st.zoneId,
    floor: st.floor,
    segment: st.segment,
    nearestPortal: st.nearestPortal,
    x: st.x,
    z: st.z,
    h: st.h,
  }));
  const kiosks: SearchHit[] = CAPIM_KIOSKS_3D.map((k) => ({
    label: k.name,
    subtitle: 'Quiosque Térreo L1',
    zoneId: k.zoneId,
    floor: 'L1',
    segment: k.segment,
    nearestPortal: 'Corredor Principal',
    x: k.x,
    z: k.z,
    h: 1.8,
    isKiosk: true,
  }));
  return [...stores, ...kiosks];
}

/** Filtra itens pesquisáveis por nome ou subtítulo retornando até 6 resultados. */
export function filterSearchResults(items: SearchHit[], query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return items
    .filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
    )
    .slice(0, 6);
}
