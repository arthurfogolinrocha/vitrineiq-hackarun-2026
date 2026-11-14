import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ArrowDown,
  ArrowUp,
  Compass,
  Eye,
  Footprints,
  MapPin,
  Moon,
  MoveDown,
  MoveUp,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { CrossSegmentRoute, FlashCampaign, FloorId, StoreTenant, ZoneId } from '../types';
import { ZoneLiveTelemetry } from '../services/opportunityEngine';
import {
  CAMERA_PRESETS,
  CAPIM_KIOSKS_3D,
  CAPIM_PARKING_3D,
  CAPIM_PORTALS_3D,
  CAPIM_STORES_3D,
  GUIDED_TOUR_STOPS,
  Kiosk3DDef,
  L2_DECK_Y,
  SegmentFilter,
  Store3DDef,
  StoreTier,
} from '../data/capimDourado3DLayout';

type VisualTheme = 'obsidian' | 'day';
type CampaignWithOrigin = FlashCampaign & { triggerOrigin?: string };

interface ShoppingMap3DProps {
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

interface SearchHit {
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

function normalizeStoreKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function createSoftParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.72)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.16)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function resolveZoneAnchor(zoneId: ZoneId, labelHint?: string): THREE.Vector3 {
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

function resolveCampaignOrigin(origin: string): THREE.Vector3 | null {
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

function disposeMaterial(mat: THREE.Material) {
  for (const value of Object.values(mat)) {
    if (value instanceof THREE.Texture) {
      value.dispose();
    }
  }
  mat.dispose();
}

function disposeObjectResources(root: THREE.Object3D) {
  root.traverse((obj) => {
    const meshLike = obj as THREE.Mesh & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    if (meshLike.geometry instanceof THREE.BufferGeometry) {
      meshLike.geometry.dispose();
    }
    if (Array.isArray(meshLike.material)) {
      meshLike.material.forEach(disposeMaterial);
    } else if (meshLike.material) {
      disposeMaterial(meshLike.material);
    }
  });
}

function createSignTexture(
  title: string,
  badge: string,
  accent: string,
  tier: StoreTier,
  isVacant?: boolean,
  isHighlighted?: boolean,
  theme: VisualTheme = 'obsidian'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 148;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const darkCard = theme === 'obsidian' || isHighlighted || tier === 'anchor';
    ctx.fillStyle = isVacant
      ? theme === 'obsidian'
        ? '#2d0d16'
        : '#fff1f2'
      : isHighlighted
      ? '#0b0d12'
      : darkCard
      ? '#0f172a'
      : '#ffffff';
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 132, 22);
    ctx.fill();

    ctx.lineWidth = isHighlighted ? 11 : tier === 'anchor' ? 9 : 7;
    ctx.strokeStyle = isHighlighted ? '#E2A83B' : accent;
    ctx.stroke();

    ctx.fillStyle = isHighlighted ? '#E2A83B' : accent;
    ctx.fillRect(22, 24, 14, 100);

    ctx.fillStyle = isVacant
      ? theme === 'obsidian'
        ? '#fda4af'
        : '#be123c'
      : darkCard
      ? '#f1f5f9'
      : '#0f172a';
    ctx.font = '800 30px Inter, system-ui, sans-serif';
    ctx.fillText(title, 52, 66);

    ctx.fillStyle = isVacant
      ? theme === 'obsidian'
        ? '#fecdd3'
        : '#e11d48'
      : isHighlighted || tier === 'anchor'
      ? '#fde68a'
      : theme === 'obsidian'
      ? '#cbd5e1'
      : '#475569';
    ctx.font = '700 21px Inter, system-ui, sans-serif';
    ctx.fillText(badge, 52, 108);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBadgeTexture(
  title: string,
  subtitle: string,
  bgHex: string,
  borderHex: string,
  textHex: string,
  subHex: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 580;
  canvas.height = 146;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgHex;
    ctx.beginPath();
    ctx.roundRect(8, 8, 564, 130, 22);
    ctx.fill();

    ctx.lineWidth = 7;
    ctx.strokeStyle = borderHex;
    ctx.stroke();

    ctx.fillStyle = textHex;
    ctx.font = '900 29px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 290, 64);

    ctx.fillStyle = subHex;
    ctx.font = '700 20px Inter, system-ui, sans-serif';
    ctx.fillText(subtitle, 290, 108);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Constrói rotatória viária 3D realista */
function buildRoundabout(cx: number, cz: number, outerR: number, roadMat: THREE.Material) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(outerR, outerR, 0.14, 32), roadMat);
  ring.position.set(cx, -0.05, cz);
  g.add(ring);

  const island = new THREE.Mesh(
    new THREE.CylinderGeometry(outerR * 0.48, outerR * 0.5, 0.24, 32),
    new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.85 })
  );
  island.position.set(cx, 0.04, cz);
  g.add(island);

  const curb = new THREE.Mesh(
    new THREE.TorusGeometry(outerR * 0.5, 0.16, 8, 32),
    new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.7 })
  );
  curb.rotation.x = Math.PI / 2;
  curb.position.set(cx, 0.06, cz);
  g.add(curb);

  return g;
}

/** Constrói palmeira/árvore estilizada de paisagismo */
function buildTree(x: number, z: number, heightScale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.22, 2.2 * heightScale, 7),
    new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 })
  );
  trunk.position.set(x, 1.1 * heightScale, z);
  g.add(trunk);

  const crown = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.95 * heightScale, 0),
    new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.75 })
  );
  crown.position.set(x, 2.4 * heightScale, z);
  g.add(crown);
  return g;
}

/** Constrói torre panorâmica de elevador vidro + aço */
function buildElevatorTower(x: number, z: number, yStart: number, yEnd: number) {
  const h = yEnd - yStart;
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, h, 1.9),
    new THREE.MeshStandardMaterial({
      color: '#bae6fd',
      transparent: true,
      opacity: 0.38,
      roughness: 0.1,
      metalness: 0.35,
    })
  );
  shaft.position.set(x, yStart + h / 2, z);
  g.add(shaft);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 0.25, 2.05),
    new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.6 })
  );
  frame.position.set(x, yEnd + 0.12, z);
  g.add(frame);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.8, 1.4),
    new THREE.MeshStandardMaterial({ color: '#E2A83B', emissive: '#b45309', emissiveIntensity: 0.35 })
  );
  cabin.position.set(x, yStart + h * 0.4, z);
  g.add(cabin);
  return { group: g, cabin, yStart, h };
}

export const ShoppingMap3D: React.FC<ShoppingMap3DProps> = ({
  floor,
  onFloorChange,
  zonesTelemetry,
  selectedZoneId,
  onSelectZone,
  selectedStoreName,
  onSelectStoreName,
  routes = [],
  campaigns = [],
  activeTenant = null,
}) => {
  const activeZone = zonesTelemetry.find((z) => z.zone.id === selectedZoneId);
  const mountRef = useRef<HTMLDivElement>(null);

  const [visualTheme, setVisualTheme] = useState<VisualTheme>('obsidian');
  const [viewMode, setViewMode] = useState<'orbit' | 'walk'>('orbit');
  const [showSubsoloXray, setShowSubsoloXray] = useState<boolean>(false);
  const [activeSegment, setActiveSegment] = useState<SegmentFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<SearchHit | null>(null);
  const [tourActive, setTourActive] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [webglUnsupported, setWebglUnsupported] = useState(false);

  const visualThemeRef = useRef<VisualTheme>('obsidian');
  visualThemeRef.current = visualTheme;
  const viewModeRef = useRef<'orbit' | 'walk'>('orbit');
  viewModeRef.current = viewMode;
  const floorRef = useRef<FloorId>(floor);
  floorRef.current = floor;
  const xrayRef = useRef<boolean>(showSubsoloXray);
  xrayRef.current = showSubsoloXray;
  const activeSegmentRef = useRef<SegmentFilter>(activeSegment);
  activeSegmentRef.current = activeSegment;
  const zonesRef = useRef<ZoneLiveTelemetry[]>(zonesTelemetry);
  zonesRef.current = zonesTelemetry;
  const selectedZoneRef = useRef<ZoneId>(selectedZoneId);
  selectedZoneRef.current = selectedZoneId;
  const selectedStoreNameRef = useRef<string | null>(null);
  selectedStoreNameRef.current = selectedStore?.label ?? null;
  const dismissedTenantIdRef = useRef<string | null>(null);
  const prevTenantIdRef = useRef<string | null>(null);

  const onSelectZoneRef = useRef(onSelectZone);
  onSelectZoneRef.current = onSelectZone;
  const onFloorChangeRef = useRef(onFloorChange);
  onFloorChangeRef.current = onFloorChange;
  const onSelectStoreNameRef = useRef(onSelectStoreName);
  onSelectStoreNameRef.current = onSelectStoreName;

  const sceneRefs = useRef<{
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
    heatmapMeta: Array<{
      zoneId: ZoneId;
      baseX: number;
      baseY: number;
      baseZ: number;
      phase: number;
      speed: number;
      ampY: number;
      ampXZ: number;
    }>;
    allianceGroup: THREE.Group | null;
    alliancePulses: Array<{
      mesh: THREE.Mesh;
      curve: THREE.QuadraticBezierCurve3;
      t: number;
      speed: number;
    }>;
    storeEntries: Array<{
      def: Store3DDef;
      mesh: THREE.Mesh;
      mat: THREE.MeshStandardMaterial;
      trimMat: THREE.MeshStandardMaterial;
      edges: THREE.LineSegments;
      edgesMat: THREE.LineBasicMaterial;
      sprite: THREE.Sprite;
    }>;
    kioskEntries: Array<{
      def: Kiosk3DDef;
      segment: Exclude<SegmentFilter, 'all'>;
      zoneId: ZoneId;
      sprite: THREE.Sprite;
      mesh: THREE.Mesh;
      mat: THREE.MeshStandardMaterial;
      pos: THREE.Vector3;
    }>;
    routeGroups: Record<Exclude<SegmentFilter, 'all'>, THREE.Object3D[]>;
    flyTarget: { camPos: THREE.Vector3; lookAt: THREE.Vector3 } | null;
  }>({
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
  });

  const actionsRef = useRef<{
    zoom: (factor: number) => void;
    flyTo: (pos: [number, number, number], target: [number, number, number]) => void;
    resetOrbit: (targetFloor: FloorId, focusSubsolo?: boolean) => void;
    enterWalk: (targetFloor: FloorId) => void;
    nudgeWalk: (forward: number, strafe: number, turnYaw: number) => void;
  } | null>(null);

  const searchableItems = useMemo<SearchHit[]>(() => {
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
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return searchableItems
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [searchQuery, searchableItems]);

  // Atualiza Tema Obsidian/Dia, Score IQ, Foco por Piso (F23), Destaque/EdgesGeometry e Heatmap sem resetar câmera!
  useEffect(() => {
    const {
      renderer,
      scene,
      hemiLight,
      dirLight,
      bloomPass,
      storeEntries,
      kioskEntries,
      routeGroups,
      beaconGroup,
      l1DeckMat,
      groundMat,
      ovalPlazaMat,
      l2FoodSlabMat,
      l2ExtraDeckMats,
      obsidianGridGroup,
      subsoloCover,
      l2Materials,
      l2Objects,
      subsoloObjects,
      heatmapGeo,
      heatmapMat,
      heatmapMeta,
    } = sceneRefs.current;

    const isObsidian = visualTheme === 'obsidian';
    const hasStoreSelection = Boolean(selectedStore);

    // 0. Modo Visual Obsidian vs Dia
    if (scene) {
      const bgHex = isObsidian ? '#080B10' : '#eaeef5';
      scene.background = new THREE.Color(bgHex);
      scene.fog = new THREE.Fog(bgHex, isObsidian ? 75 : 70, isObsidian ? 195 : 185);
      scene.environmentIntensity = isObsidian ? 0.44 : 0.42;
    }
    if (renderer) {
      renderer.toneMappingExposure = isObsidian ? 0.94 : 1.04;
    }
    if (bloomPass) {
      bloomPass.enabled = isObsidian;
    }
    if (hemiLight) {
      hemiLight.color.set(isObsidian ? '#cbd5e1' : '#ffffff');
      hemiLight.groundColor.set(isObsidian ? '#0f172a' : '#cbd5e1');
      hemiLight.intensity = isObsidian ? 0.65 : 1.2;
    }
    if (dirLight) {
      dirLight.color.set(isObsidian ? '#fef3c7' : '#fffbeb');
      dirLight.intensity = isObsidian ? 1.05 : 1.32;
    }
    if (obsidianGridGroup) {
      obsidianGridGroup.visible = isObsidian;
    }
    if (ovalPlazaMat) {
      ovalPlazaMat.color.set(isObsidian ? '#3b2d16' : '#fde68a');
    }

    // 1. Atualizar Beacon 3D Luminoso Vertical e Halo (F22)
    if (beaconGroup) {
      if (hasStoreSelection && selectedStore) {
        const yBase =
          selectedStore.floor === 'L2' ? L2_DECK_Y : selectedStore.floor === 'SS1' ? -5.0 : 0;
        const hOffset = selectedStore.isKiosk ? 1.8 : selectedStore.h;
        beaconGroup.position.set(selectedStore.x, yBase + hOffset, selectedStore.z);
        beaconGroup.visible = true;
      } else {
        beaconGroup.visible = false;
      }
    }

    // 2. Foco e Isolamento por Piso (F23)
    const isSubsolo = floor === 'SS1' || showSubsoloXray;
    const isL2 = floor === 'L2';
    const isL1 = floor === 'L1' && !isSubsolo;

    // Laje L1 e Terreno
    if (l1DeckMat) {
      l1DeckMat.color.set(isObsidian ? '#131823' : '#f8fafc');
      l1DeckMat.roughness = isObsidian ? 0.42 : 0.38;
      l1DeckMat.metalness = isObsidian ? 0.18 : 0.04;
      if (isSubsolo) {
        l1DeckMat.transparent = true;
        l1DeckMat.opacity = 0.20;
      } else if (isL2) {
        l1DeckMat.transparent = true;
        l1DeckMat.opacity = 0.35;
      } else {
        l1DeckMat.transparent = false;
        l1DeckMat.opacity = 1.0;
      }
      l1DeckMat.needsUpdate = true;
    }

    if (groundMat) {
      groundMat.color.set(isObsidian ? '#0a0e16' : '#e5e7eb');
      if (isSubsolo) {
        groundMat.transparent = true;
        groundMat.opacity = 0.20;
      } else if (isL2) {
        groundMat.transparent = true;
        groundMat.opacity = 0.35;
      } else {
        groundMat.transparent = false;
        groundMat.opacity = 1.0;
      }
      groundMat.needsUpdate = true;
    }

    // Subsolo Cover e Objetos de Estacionamento/Esteiras
    if (subsoloCover) {
      subsoloCover.visible = !isSubsolo;
    }
    subsoloObjects.forEach((obj) => {
      obj.visible = isSubsolo;
    });

    // Elementos Estruturais do 2º Piso L2
    if (l2FoodSlabMat) {
      l2FoodSlabMat.color.set(isObsidian ? '#181f2e' : '#fefce8');
    }
    l2ExtraDeckMats.forEach((m) => {
      m.color.set(isObsidian ? '#1b2333' : '#fef9c3');
    });

    l2Materials.forEach((mat) => {
      if (isL2) {
        mat.transparent = false;
        mat.opacity = 1.0;
      } else if (isSubsolo) {
        mat.transparent = true;
        mat.opacity = 0.08;
      } else {
        // Térreo (L1): L2 esmaecido/fantasma para dar visibilidade total ao L1
        mat.transparent = true;
        mat.opacity = 0.08;
      }
      mat.needsUpdate = true;
    });

    l2Objects.forEach((obj) => {
      if (isSubsolo) {
        obj.visible = false;
      } else {
        obj.visible = true;
      }
    });

    // 3. Atualizar Lojas (Dimming Global vs Foco por Piso + EdgesGeometry luminosa)
    for (const entry of storeEntries) {
      const telemetry = zonesTelemetry.find((z) => z.zone.id === entry.def.zoneId);
      const score = telemetry?.opportunityScore ?? 65;
      const isZoneSelected = entry.def.zoneId === selectedZoneId;
      const isStorePicked = selectedStore?.label === entry.def.name;
      const segmentMatch =
        activeSegment === 'all' || entry.def.segment === activeSegment;

      const isEntryL2 = entry.def.floor === 'L2';
      const isEntrySS = entry.def.floor === 'SS1';
      const isEntryL1 = entry.def.floor === 'L1';
      const onActiveFloor =
        (isL1 && isEntryL1) || (isL2 && isEntryL2) || (isSubsolo && isEntrySS);

      if (hasStoreSelection) {
        if (isStorePicked) {
          entry.mat.transparent = false;
          entry.mat.opacity = 1.0;
          entry.mat.emissive.set('#f59e0b');
          entry.mat.emissiveIntensity = isObsidian ? 0.65 : 0.85;
          entry.trimMat.emissive.set('#fbbf24');
          entry.trimMat.emissiveIntensity = isObsidian ? 1.45 : 0.95;

          entry.edges.visible = true;
          entry.edgesMat.color.setRGB(
            isObsidian ? 1.85 : 0.96,
            isObsidian ? 1.32 : 0.65,
            isObsidian ? 0.35 : 0.12
          );
          entry.edgesMat.opacity = 0.98;
        } else {
          entry.mat.transparent = true;
          entry.mat.opacity = 0.22;
          entry.mat.emissive.set('#000000');
          entry.mat.emissiveIntensity = 0;
          entry.trimMat.emissive.set('#000000');
          entry.trimMat.emissiveIntensity = 0;

          entry.edges.visible = isObsidian && onActiveFloor;
          entry.edgesMat.color.set('#334155');
          entry.edgesMat.opacity = 0.14;
        }
      } else {
        if (isL1) {
          if (isEntryL1) {
            entry.mat.transparent = !segmentMatch;
            entry.mat.opacity = segmentMatch ? 1.0 : 0.24;
          } else {
            entry.mat.transparent = true;
            entry.mat.opacity = 0.08;
          }
        } else if (isL2) {
          if (isEntryL2) {
            entry.mat.transparent = !segmentMatch;
            entry.mat.opacity = segmentMatch ? 1.0 : 0.24;
          } else {
            entry.mat.transparent = true;
            entry.mat.opacity = 0.18;
          }
        } else {
          if (isEntrySS) {
            entry.mat.transparent = false;
            entry.mat.opacity = 1.0;
          } else {
            entry.mat.transparent = true;
            entry.mat.opacity = 0.10;
          }
        }

        entry.mat.emissive.set(isZoneSelected ? '#E2A83B' : '#000000');
        entry.mat.emissiveIntensity = isZoneSelected ? (isObsidian ? 0.18 : 0.16) : 0;
        entry.trimMat.emissive.set(isZoneSelected ? '#E2A83B' : '#000000');
        entry.trimMat.emissiveIntensity = isZoneSelected ? (isObsidian ? 0.55 : 0.22) : 0;

        if (isZoneSelected && onActiveFloor) {
          entry.edges.visible = true;
          entry.edgesMat.color.setRGB(
            isObsidian ? 1.35 : 0.85,
            isObsidian ? 0.96 : 0.58,
            isObsidian ? 0.28 : 0.10
          );
          entry.edgesMat.opacity = isObsidian ? 0.82 : 0.35;
        } else if (isObsidian && onActiveFloor) {
          entry.edges.visible = true;
          entry.edgesMat.color.set('#334155');
          entry.edgesMat.opacity = 0.34;
        } else {
          entry.edges.visible = false;
        }
      }

      const badgeText = entry.def.isVacant
        ? 'ESPAÇO VAGO • EXPANSÃO'
        : `${entry.def.sublabel ?? `IQ ${score}`} • IQ ${score}`;
      const signKey = `${badgeText}|${isStorePicked ? '1' : '0'}|${visualTheme}`;
      if (entry.sprite.userData.signKey !== signKey) {
        const prevMat = entry.sprite.material as THREE.SpriteMaterial;
        const nextTex = createSignTexture(
          entry.def.name,
          badgeText,
          entry.def.accent,
          entry.def.tier,
          entry.def.isVacant,
          isStorePicked,
          visualTheme
        );
        if (prevMat.map) prevMat.map.dispose();
        prevMat.map = nextTex;
        // Mantém luminância linear abaixo de 0.84 para o UnrealBloomPass não estourar os letreiros
        prevMat.color.setRGB(0.84, 0.84, 0.84);
        prevMat.needsUpdate = true;
        entry.sprite.userData.signKey = signKey;
      }
    }

    // 4. Quiosques dos Corredores (F22 e F23)
    for (const k of kioskEntries) {
      const isKioskPicked = selectedStore?.label === k.def.name;
      if (hasStoreSelection) {
        if (isKioskPicked) {
          k.mat.transparent = false;
          k.mat.opacity = 1.0;
          k.mat.emissive.set('#f59e0b');
          k.mat.emissiveIntensity = 0.85;
        } else {
          k.mat.transparent = true;
          k.mat.opacity = 0.20;
          k.mat.emissive.set('#000000');
          k.mat.emissiveIntensity = 0;
        }
      } else {
        if (isL1) {
          k.mat.transparent = false;
          k.mat.opacity = 1.0;
        } else if (isL2) {
          k.mat.transparent = true;
          k.mat.opacity = 0.15;
        } else {
          k.mat.transparent = true;
          k.mat.opacity = 0.10;
        }
        k.mat.emissive.set('#000000');
        k.mat.emissiveIntensity = 0;
      }
      const kSignKey = `${isKioskPicked ? '1' : '0'}|${visualTheme}`;
      if (k.sprite.userData.signKey !== kSignKey) {
        const kSpriteMat = k.sprite.material as THREE.SpriteMaterial;
        const kNextTex = createSignTexture(
          k.def.name,
          'Quiosque L1',
          k.def.accent,
          'satellite',
          false,
          isKioskPicked,
          visualTheme
        );
        if (kSpriteMat.map) kSpriteMat.map.dispose();
        kSpriteMat.map = kNextTex;
        kSpriteMat.color.setRGB(0.84, 0.84, 0.84);
        kSpriteMat.needsUpdate = true;
        k.sprite.userData.signKey = kSignKey;
      }
    }

    // 5. Rotas
    (['moda', 'mercado', 'gastronomia'] as const).forEach((seg) => {
      const visible = activeSegment === 'all' || activeSegment === seg;
      routeGroups[seg].forEach((obj) => {
        obj.visible = visible;
      });
    });

    // 6. Nuvem de Partículas Heatmap (âmbar/dourado para IQ >= 75, ciano/esmeralda nas demais)
    if (heatmapGeo && heatmapMeta.length > 0) {
      const colorAttr = heatmapGeo.getAttribute('color') as THREE.BufferAttribute | undefined;
      if (colorAttr) {
        const arr = colorAttr.array as Float32Array;
        const scoreMap = new Map<ZoneId, number>();
        zonesTelemetry.forEach((z) => scoreMap.set(z.zone.id, z.opportunityScore));

        for (let i = 0; i < heatmapMeta.length; i++) {
          const score = scoreMap.get(heatmapMeta[i].zoneId) ?? 65;
          const isHigh = score >= 75;
          const idx = i * 3;
          if (isHigh) {
            arr[idx] = isObsidian ? 1.05 : 0.92;
            arr[idx + 1] = isObsidian ? 0.72 : 0.58;
            arr[idx + 2] = isObsidian ? 0.18 : 0.12;
          } else {
            arr[idx] = 0.1;
            arr[idx + 1] = 0.86;
            arr[idx + 2] = 0.74;
          }
        }
        colorAttr.needsUpdate = true;
      }
    }
    if (heatmapMat) {
      heatmapMat.opacity = isSubsolo ? 0.25 : isObsidian ? 0.85 : 0.62;
    }
  }, [
    visualTheme,
    floor,
    showSubsoloXray,
    zonesTelemetry,
    selectedZoneId,
    activeSegment,
    selectedStore,
  ]);

  // Reconstrói Arcos Bézier 3D "Aliança de Corredor" sempre que routes ou campaigns mudarem
  useEffect(() => {
    const { allianceGroup, alliancePulses } = sceneRefs.current;
    if (!allianceGroup) return;

    while (allianceGroup.children.length > 0) {
      const child = allianceGroup.children[0];
      allianceGroup.remove(child);
      disposeObjectResources(child);
    }
    alliancePulses.length = 0;

    const isObsidian = visualTheme === 'obsidian';

    interface ArcSpec {
      start: THREE.Vector3;
      end: THREE.Vector3;
      tubeColor: string;
      pulseRgb: [number, number, number];
      speed: number;
    }

    const arcs: ArcSpec[] = [];

    routes.forEach((route) => {
      const start = resolveZoneAnchor(route.fromZone, route.fromLabel);
      const end = resolveZoneAnchor(route.toZone, route.toLabel);
      if (start.distanceTo(end) < 1.0) return;
      const isHigh = route.sharePercent >= 50;
      arcs.push({
        start,
        end,
        tubeColor: isHigh ? '#F59E0B' : '#38BDF8',
        pulseRgb: isHigh ? [2.0, 1.35, 0.3] : [0.35, 1.45, 2.0],
        speed: isHigh ? 0.0042 : 0.0032,
      });
    });

    (campaigns as CampaignWithOrigin[]).forEach((camp) => {
      if (!camp.active || !camp.triggerOrigin) return;
      const start = resolveCampaignOrigin(camp.triggerOrigin);
      if (!start) return;

      const campKey = normalizeStoreKey(camp.storeName);
      const targetStore = CAPIM_STORES_3D.find((st) => {
        const stKey = normalizeStoreKey(st.name);
        return stKey === campKey || stKey.includes(campKey) || campKey.includes(stKey);
      });
      const end = targetStore
        ? new THREE.Vector3(
            targetStore.x,
            (targetStore.floor === 'L2' ? L2_DECK_Y : targetStore.floor === 'SS1' ? -5.0 : 0) +
              targetStore.h +
              0.6,
            targetStore.z
          )
        : resolveZoneAnchor(camp.zoneId);

      if (start.distanceTo(end) < 1.0) return;
      arcs.push({
        start,
        end,
        tubeColor: '#E2A83B',
        pulseRgb: [2.25, 1.5, 0.35],
        speed: 0.0052,
      });
    });

    arcs.forEach((arc) => {
      const mid = arc.start.clone().add(arc.end).multiplyScalar(0.5);
      const dist = arc.start.distanceTo(arc.end);
      mid.y = Math.max(arc.start.y, arc.end.y) + Math.max(8.0, dist * 0.34);

      const curve = new THREE.QuadraticBezierCurve3(arc.start, mid, arc.end);
      const tubeGeo = new THREE.TubeGeometry(curve, 52, 0.11, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: arc.tubeColor,
        transparent: true,
        opacity: isObsidian ? 0.55 : 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      allianceGroup.add(new THREE.Mesh(tubeGeo, tubeMat));

      // Anéis luminosos nas extremidades da aliança
      [arc.start, arc.end].forEach((pt) => {
        const ringGeo = new THREE.RingGeometry(0.45, 0.95, 24);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: arc.tubeColor,
          transparent: true,
          opacity: isObsidian ? 0.85 : 0.65,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(pt);
        allianceGroup.add(ring);
      });

      // Pulsos de luz viajando pelo arco
      for (let i = 0; i < 3; i++) {
        const pulseGeo = new THREE.SphereGeometry(0.32, 12, 12);
        const pulseMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(arc.pulseRgb[0], arc.pulseRgb[1], arc.pulseRgb[2]),
          toneMapped: false,
        });
        const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
        pulseMesh.position.copy(curve.getPointAt(i / 3));
        allianceGroup.add(pulseMesh);
        alliancePulses.push({
          mesh: pulseMesh,
          curve,
          t: i / 3,
          speed: arc.speed,
        });
      }
    });
  }, [routes, campaigns, visualTheme]);

  // Sincroniza câmera suavemente quando o usuário troca de piso/ala pelo painel externo ("Saltar para Ala")
  const prevExternalFloorRef = useRef<FloorId>(floor);
  const prevExternalZoneRef = useRef<ZoneId>(selectedZoneId);
  useEffect(() => {
    if (viewModeRef.current === 'walk' || tourActive) {
      prevExternalFloorRef.current = floor;
      prevExternalZoneRef.current = selectedZoneId;
      return;
    }
    if (prevExternalFloorRef.current !== floor) {
      prevExternalFloorRef.current = floor;
      const isSS = floor === 'SS1';
      setShowSubsoloXray(isSS);
      actionsRef.current?.resetOrbit(floor, isSS);
    } else if (prevExternalZoneRef.current !== selectedZoneId) {
      prevExternalZoneRef.current = selectedZoneId;
      const presetMap: Record<ZoneId, [number, number, number][]> = {
        'alameda-gourmet': [[6, 22, 34], [4, 2, 7]],
        'ala-central-ancoras': [[-16, 26, -32], [-2, 2, -4]],
        'ala-sul-esporte': [[-40, 22, 24], [-22, 2, 3]],
        'ala-lazer-cinema': [[46, 25, -12], [22, 2, -12]],
        'praca-alimentacao-l2': [[-44, 29.0, 22], [-21, 11.8, 0]],
      };
      const pair = presetMap[selectedZoneId];
      if (pair) {
        actionsRef.current?.flyTo(
          pair[0] as [number, number, number],
          pair[1] as [number, number, number]
        );
      }
    }
  }, [floor, selectedZoneId, tourActive]);

  // Efeito do Tour Guiado Automático
  useEffect(() => {
    if (!tourActive) return;
    const stop = GUIDED_TOUR_STOPS[tourStepIndex];
    setViewMode('orbit');
    setShowSubsoloXray(stop.xray);
    onFloorChangeRef.current(stop.floor);
    actionsRef.current?.flyTo(stop.pos, stop.target);

    const timer = window.setInterval(() => {
      setTourStepIndex((prev) => (prev + 1) % GUIDED_TOUR_STOPS.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [tourActive, tourStepIndex]);

  // Montagem única do WebGL 3D (dependência [] — zero flicker / perda de câmera!)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      setWebglUnsupported(true);
      return;
    }

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;
    const initialDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setSize(width, height);
    renderer.setPixelRatio(initialDpr);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap; // Compatível com Three.js moderno sem warning
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const isInitialObsidian = visualThemeRef.current === 'obsidian';
    const initialBg = isInitialObsidian ? '#080B10' : '#eaeef5';
    scene.background = new THREE.Color(initialBg);
    scene.fog = new THREE.Fog(initialBg, isInitialObsidian ? 75 : 70, isInitialObsidian ? 195 : 185);
    scene.environmentIntensity = isInitialObsidian ? 0.44 : 0.42;

    // Reflexos metálicos reais via RoomEnvironment + PMREMGenerator
    let pmremGenerator: THREE.PMREMGenerator | null = null;
    let envRT: THREE.WebGLRenderTarget | null = null;
    try {
      pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      const roomEnv = new RoomEnvironment();
      envRT = pmremGenerator.fromScene(roomEnv, 0.04);
      scene.environment = envRT.texture;
      roomEnv.dispose();
    } catch {
      // Fallback seguro caso ambiente headless não suporte PMREM
    }

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.2, 260);
    camera.position.set(-4, 46, 56);

    // Pós-processamento cinematográfico (EffectComposer + UnrealBloomPass + OutputPass)
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    let outputPass: OutputPass | null = null;
    let composerFailed = false;
    try {
      composer = new EffectComposer(renderer);
      composer.setPixelRatio(initialDpr);
      composer.setSize(width, height);
      const renderPass = new RenderPass(scene, camera);
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.26,
        0.25,
        0.96
      );
      bloomPass.enabled = isInitialObsidian;
      outputPass = new OutputPass();
      composer.addPass(renderPass);
      composer.addPass(bloomPass);
      composer.addPass(outputPass);
    } catch {
      composer = null;
      bloomPass = null;
      outputPass = null;
      composerFailed = true;
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.15;
    controls.minDistance = 8;
    controls.maxDistance = 128;
    controls.maxPolarAngle = Math.PI / 2 + 0.2;
    controls.target.set(-1, 1, -2);

    const hemiLight = new THREE.HemisphereLight(
      isInitialObsidian ? '#cbd5e1' : '#ffffff',
      isInitialObsidian ? '#0f172a' : '#cbd5e1',
      isInitialObsidian ? 0.85 : 1.2
    );
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(
      isInitialObsidian ? '#fef3c7' : '#fffbeb',
      isInitialObsidian ? 1.25 : 1.32
    );
    dirLight.position.set(28, 56, 34);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    sceneRefs.current.renderer = renderer;
    sceneRefs.current.scene = scene;
    sceneRefs.current.hemiLight = hemiLight;
    sceneRefs.current.dirLight = dirLight;
    sceneRefs.current.bloomPass = bloomPass;

    const l2Materials: THREE.MeshStandardMaterial[] = [];
    const l2Objects: THREE.Object3D[] = [];
    const subsoloObjects: THREE.Object3D[] = [];

    // === TERRENO BASE (translúcido no modo Raio-X para revelar SS1 e SS2) ===
    const groundMat = new THREE.MeshStandardMaterial({
      color: isInitialObsidian ? '#0a0e16' : '#e5e7eb',
      roughness: 0.95,
    });
    sceneRefs.current.groundMat = groundMat;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(210, 165), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.22, -2);
    ground.receiveShadow = true;
    scene.add(ground);

    // === GRID TÉCNICO DOURADO / ARDÓSIA (MODO OBSIDIAN) ===
    const obsidianGridGroup = new THREE.Group();
    const groundGrid = new THREE.GridHelper(190, 64, '#E2A83B', '#1e293b');
    groundGrid.position.set(0, -0.19, -2);
    const groundGridMats = Array.isArray(groundGrid.material)
      ? groundGrid.material
      : [groundGrid.material];
    groundGridMats.forEach((m) => {
      m.transparent = true;
      m.opacity = 0.20;
      m.depthWrite = false;
    });
    obsidianGridGroup.add(groundGrid);

    const l1Grid = new THREE.GridHelper(72, 28, '#E2A83B', '#263244');
    l1Grid.position.set(-2, 0.075, -8);
    const l1GridMats = Array.isArray(l1Grid.material) ? l1Grid.material : [l1Grid.material];
    l1GridMats.forEach((m) => {
      m.transparent = true;
      m.opacity = 0.18;
      m.depthWrite = false;
    });
    obsidianGridGroup.add(l1Grid);
    obsidianGridGroup.visible = isInitialObsidian;
    scene.add(obsidianGridGroup);
    sceneRefs.current.obsidianGridGroup = obsidianGridGroup;

    // === MALHA VIÁRIA REAL (AV. NS-05 + 2 ROTATÓRIAS + 3ª ROTATÓRIA OESTE + VIA DIAGONAL + LO-2A + JK) ===
    const roadMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.85 });
    const laneLineMat = new THREE.MeshBasicMaterial({ color: '#facc15' });

    // Avenida NS-05 (Fachada Principal Leste, +Z)
    const avNS05 = new THREE.Mesh(new THREE.BoxGeometry(116, 0.14, 4.8), roadMat);
    avNS05.position.set(0, -0.1, 24.5);
    scene.add(avNS05);
    const avNS05Line = new THREE.Mesh(new THREE.BoxGeometry(106, 0.15, 0.22), laneLineMat);
    avNS05Line.position.set(0, -0.09, 24.5);
    scene.add(avNS05Line);

    // Avenida JK (Sul, -X)
    const avJK = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.14, 68), roadMat);
    avJK.position.set(-42.5, -0.1, -2);
    scene.add(avJK);
    const avJKLine = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.15, 62), laneLineMat);
    avJKLine.position.set(-42.5, -0.09, -2);
    scene.add(avJKLine);

    // Avenida LO-2A (Norte, +X)
    const avLO2A = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.14, 70), roadMat);
    avLO2A.position.set(37.5, -0.1, -3);
    scene.add(avLO2A);
    const avLO2ALine = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.15, 64), laneLineMat);
    avLO2ALine.position.set(37.5, -0.09, -3);
    scene.add(avLO2ALine);

    // Via Oeste interna em diagonal real (de Curva JK/Oeste até 3ª Rotatória e Cancelas Norte)
    const westRoadSeg1 = new THREE.Mesh(new THREE.BoxGeometry(50, 0.12, 3.2), roadMat);
    westRoadSeg1.position.set(-12, -0.11, -28.5);
    westRoadSeg1.rotation.y = 0.12;
    scene.add(westRoadSeg1);
    const westRoadSeg2 = new THREE.Mesh(new THREE.BoxGeometry(28, 0.12, 3.2), roadMat);
    westRoadSeg2.position.set(24, -0.11, -31.8);
    westRoadSeg2.rotation.y = 0.08;
    scene.add(westRoadSeg2);

    // 2 Rotatórias da NS-05 + 3ª Rotatória Interna Oeste (acesso C&A / P2 / Subsolo)
    scene.add(buildRoundabout(-42.5, 24.5, 5.2, roadMat));
    scene.add(buildRoundabout(37.5, 24.5, 5.2, roadMat));
    scene.add(buildRoundabout(12.5, -24.5, 3.2, roadMat));

    // Paisagismo (Palmeiras nos canteiros da P1, Rotatórias e Estac. Oeste)
    [
      [-7.2, 14.5, 1.0],
      [2.6, 14.5, 1.0],
      [-42.5, 24.5, 1.15],
      [37.5, 24.5, 1.15],
      [-18, 17.5, 0.9],
      [14, 17.5, 0.9],
      [12.5, -24.5, 0.85],
    ].forEach(([tx, tz, ts]) => scene.add(buildTree(tx, tz, ts)));

    // Placas das Avenidas Reais + Bússola Norte + Docas Operacionais
    [
      { text: 'AV. NS-05 (FACHADA LESTE)', sub: 'Portaria P1 • 2 Rotatórias', x: -1, z: 28.5 },
      { text: 'AV. JK (LADO SUL)', sub: 'Curva Renner & Praça L2', x: -42.5, z: 6 },
      { text: 'AV. LO-2A (LADO NORTE • N→)', sub: 'Cinemark • Big • WoW • Morofit', x: 37.5, z: -8 },
      { text: 'SENTIDO ORLA / LAGO (OESTE)', sub: '3ª Rotatória • Subsolos & Estac. Oeste', x: -6, z: -33.6 },
    ].forEach((rs) => {
      const spr = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createBadgeTexture(rs.text, rs.sub, '#0f172a', '#94a3b8', '#f8fafc', '#cbd5e1'),
          transparent: true,
        })
      );
      spr.position.set(rs.x, 3.3, rs.z);
      spr.scale.set(7.6, 1.9, 1);
      scene.add(spr);
    });

    // Sinalização discreta das Docas de Carga (Lado Leste/Norte - Planta Mix)
    const dockSign = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createBadgeTexture('🚚 DOCAS DE CARGA', 'Doca Super Big • Doca 1 • DEXT 01-02', '#1e293b', '#64748b', '#e2e8f0', '#94a3b8'),
        transparent: true,
      })
    );
    dockSign.position.set(32.5, 3.0, -18);
    dockSign.scale.set(5.8, 1.45, 1);
    scene.add(dockSign);

    // === ESTACIONAMENTOS (SUPERFÍCIE + SUBSOLO 1 & 2) ===
    const parkingBadges: THREE.Sprite[] = [];
    CAPIM_PARKING_3D.forEach((lot) => {
      const baseY = lot.y ?? 0;
      const isUnderground = baseY < 0;
      const group = new THREE.Group();

      const asphalt = new THREE.Mesh(
        new THREE.BoxGeometry(lot.w, 0.18, lot.d),
        new THREE.MeshStandardMaterial({
          color: isUnderground ? '#1e293b' : '#334155',
          roughness: 0.9,
        })
      );
      asphalt.position.set(lot.cx, baseY - 0.08, lot.cz);
      asphalt.receiveShadow = true;
      group.add(asphalt);

      if (isUnderground) {
        const deckEdge = new THREE.Mesh(
          new THREE.BoxGeometry(lot.w + 0.5, 0.12, lot.d + 0.5),
          new THREE.MeshStandardMaterial({
            color: '#38bdf8',
            emissive: '#0284c7',
            emissiveIntensity: 0.3,
          })
        );
        deckEdge.position.set(lot.cx, baseY - 0.15, lot.cz);
        group.add(deckEdge);
      }

      const stripeMat = new THREE.MeshBasicMaterial({ color: isUnderground ? '#93c5fd' : '#f8fafc' });
      const carColors = ['#e2e8f0', '#94a3b8', '#38bdf8', '#f8fafc', '#f59e0b', '#64748b', '#ef4444'];
      const stepX = (lot.w - 2.0) / lot.cols;
      const stepZ = (lot.d - 1.8) / lot.rows;

      for (let r = 0; r < lot.rows; r++) {
        for (let c = 0; c <= lot.cols; c++) {
          const sx = lot.cx - (lot.w - 2.0) / 2 + c * stepX;
          const sz = lot.cz - (lot.d - 1.8) / 2 + r * stepZ + stepZ / 2;

          const line = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, stepZ * 0.7), stripeMat);
          line.position.set(sx, baseY + 0.03, sz);
          group.add(line);

          if (c < lot.cols && (r * 7 + c * 3) % 10 < 6) {
            const carX = sx + stepX / 2;
            const car = new THREE.Mesh(
              new THREE.BoxGeometry(Math.min(1.4, stepX * 0.65), 0.6, Math.min(2.3, stepZ * 0.54)),
              new THREE.MeshStandardMaterial({
                color: carColors[(r + c * 2) % carColors.length],
                roughness: 0.35,
                metalness: 0.25,
              })
            );
            car.position.set(carX, baseY + 0.34, sz);
            group.add(car);
          }
        }
      }

      const totemY = isUnderground ? baseY + 2.8 : 4.8;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, isUnderground ? 2.4 : 4.0, 10),
        new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.5 })
      );
      pole.position.set(lot.cx, baseY + (isUnderground ? 1.2 : 2.0), lot.cz);
      group.add(pole);

      const sign = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createBadgeTexture(
            `🅿️ ${lot.title}`,
            lot.subtitle,
            isUnderground ? '#082f49' : '#0f172a',
            isUnderground ? '#fbbf24' : '#38bdf8',
            isUnderground ? '#fde68a' : '#38bdf8',
            '#f8fafc'
          ),
          transparent: true,
        })
      );
      sign.position.set(lot.cx, totemY, lot.cz);
      sign.scale.set(isUnderground ? 7.0 : 7.4, isUnderground ? 1.8 : 1.95, 1);
      group.add(sign);
      parkingBadges.push(sign);

      scene.add(group);
      if (isUnderground) {
        subsoloObjects.push(group);
      }
    });

    // Motos & Bicicletário na extremidade NORTE-LESTE do Subsolo 1 (Planta Mix p1_ss1) + Rampa Veicular próxima à P2
    const motoSign = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createBadgeTexture('🏍️ MOTOS & BICICLETÁRIO', 'Subsolo 1 (Norte-Leste) • Rampa LO-2A', '#111827', '#34d399', '#6ee7b7', '#e2e8f0'),
        transparent: true,
      })
    );
    motoSign.position.set(17.5, -2.5, -25.5);
    motoSign.scale.set(6.0, 1.5, 1);
    scene.add(motoSign);

    // Rampa Veicular Dupla Subsolo (entre Estac. Oeste e bloco Ellus / P2)
    const subRamp = new THREE.Mesh(
      new THREE.BoxGeometry(10.5, 0.28, 3.2),
      new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.7 })
    );
    subRamp.position.set(11.5, -2.5, -14.5);
    subRamp.rotation.z = -0.45;
    scene.add(subRamp);
    subsoloObjects.push(motoSign, subRamp);

    // Cancelas reais (2 na NS-05 + 4 faixas no acesso Norte Av. LO-2A)
    [
      [-18, 21.6],
      [13, 21.6],
      [27.2, -31.8],
      [28.6, -31.8],
      [30.0, -31.8],
      [31.4, -31.8],
    ].forEach(([gx, gz]) => {
      const gateArm = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.14, 0.14),
        new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.3 })
      );
      gateArm.position.set(gx, 0.9, gz);
      scene.add(gateArm);
    });

    // === LAJE REAL DO 1º PAVIMENTO (CURVA RENNER + CORREDOR PC + RECUO P1) ===
    const mallShape = new THREE.Shape();
    mallShape.moveTo(-25, 13.5);
    mallShape.quadraticCurveTo(-36.5, 11.5, -35.5, 0.5);
    mallShape.quadraticCurveTo(-34.5, -9.5, -22.0, -12.5);
    mallShape.lineTo(14.5, -12.5);
    mallShape.lineTo(15.5, -30.8);
    mallShape.lineTo(31.2, -30.8);
    mallShape.lineTo(31.2, 13.5);
    mallShape.lineTo(8.5, 13.5);
    mallShape.quadraticCurveTo(-0.8, 10.6, -7.8, 13.5);
    mallShape.closePath();

    const l1Geo = new THREE.ExtrudeGeometry(mallShape, { depth: 0.42, bevelEnabled: false });
    l1Geo.rotateX(Math.PI / 2);
    const l1DeckMat = new THREE.MeshStandardMaterial({
      color: isInitialObsidian ? '#131823' : '#f8fafc',
      roughness: isInitialObsidian ? 0.42 : 0.38,
      metalness: isInitialObsidian ? 0.18 : 0.04,
      transparent: xrayRef.current,
      opacity: xrayRef.current ? 0.28 : 1.0,
    });
    sceneRefs.current.l1DeckMat = l1DeckMat;
    const l1Slab = new THREE.Mesh(l1Geo, l1DeckMat);
    l1Slab.position.set(0, 0.05, 0);
    l1Slab.receiveShadow = true;
    scene.add(l1Slab);

    // Praça de Eventos Oval Central (265,90 m² em frente à Riachuelo)
    const ovalPlazaMat = new THREE.MeshStandardMaterial({
      color: isInitialObsidian ? '#3b2d16' : '#fde68a',
      roughness: 0.35,
      metalness: 0.25,
    });
    sceneRefs.current.ovalPlazaMat = ovalPlazaMat;
    const ovalPlaza = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 3.6, 0.14, 28),
      ovalPlazaMat
    );
    ovalPlaza.scale.set(1.35, 1, 0.8);
    ovalPlaza.position.set(-4.5, 0.1, 4.2);
    scene.add(ovalPlaza);

    // Cobertura leve sobre área do Subsolo no nível 0 (some no Raio-X)
    const subsoloRoofCover = new THREE.Mesh(
      new THREE.BoxGeometry(19.5, 0.08, 11.2),
      new THREE.MeshStandardMaterial({ color: '#dbeafe', transparent: true, opacity: 0.42 })
    );
    subsoloRoofCover.position.set(8.5, -0.05, -16.8);
    subsoloRoofCover.visible = !xrayRef.current;
    sceneRefs.current.subsoloCover = subsoloRoofCover;
    scene.add(subsoloRoofCover);

    // === 3 ESTEIRAS ROLANTES ANIMADAS (SUBSOLO 1 ↔ SUPER BIG / ZIG ZAG / WOW / MOROFIT) ===
    const animatedTreads: Array<{ mesh: THREE.Mesh; phase: number; axis: 'esteira' | 'escalator' }> = [];
    const travelatorGroup = new THREE.Group();
    [-18.4, -17.6, -16.8].forEach((tz, idx) => {
      const belt = new THREE.Mesh(
        new THREE.BoxGeometry(7.6, 0.24, 0.55),
        new THREE.MeshStandardMaterial({
          color: '#f59e0b',
          emissive: '#d97706',
          emissiveIntensity: 0.35,
          metalness: 0.4,
        })
      );
      belt.position.set(17.2, -2.4, tz);
      belt.rotation.z = Math.atan2(5.0, 5.8);
      travelatorGroup.add(belt);

      // Barra luminosa animada indicando direção de subida
      const pulseStep = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.28, 0.44),
        new THREE.MeshBasicMaterial({ color: '#fef08a' })
      );
      pulseStep.position.set(17.2, -2.25, tz);
      pulseStep.rotation.z = Math.atan2(5.0, 5.8);
      travelatorGroup.add(pulseStep);
      animatedTreads.push({ mesh: pulseStep, phase: idx * 0.33, axis: 'esteira' });
    });

    const travelatorBadge = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createBadgeTexture(
          '🪜 3 ESTEIRAS ROLANTES (SUBSOLO)',
          'Subsolo 1 ↔ Super Big / Zig Zag / Morofit',
          '#78350f',
          '#fbbf24',
          '#fef3c7',
          '#fde68a'
        ),
        transparent: true,
      })
    );
    travelatorBadge.position.set(18.2, 2.9, -17.7);
    travelatorBadge.scale.set(6.6, 1.7, 1);
    travelatorGroup.add(travelatorBadge);
    scene.add(travelatorGroup);
    subsoloObjects.push(travelatorGroup);

    // === 2 TORRES DE ELEVADORES (SS2↔SS1↔L1 na P2 e L1↔L2 na Praça) ===
    const elevatorCabins = [
      buildElevatorTower(15.6, -15.5, -9.6, 0.5),
      buildElevatorTower(-12.6, -1.6, 0, 6.6),
    ];
    elevatorCabins.forEach((el) => scene.add(el.group));
    subsoloObjects.push(elevatorCabins[0].group);

    // === PORTARIAS REAIS (P1, P2, P3, P4 + ACESSO PC) ===
    CAPIM_PORTALS_3D.forEach((pt) => {
      const portal = new THREE.Group();
      const baseY = pt.id === 'P4' ? L2_DECK_Y : 0;
      portal.position.set(pt.x, baseY, pt.z);
      portal.rotation.y = pt.rotY;

      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(5.6, 0.38, 2.4),
        new THREE.MeshStandardMaterial({ color: '#111318', roughness: 0.35 })
      );
      canopy.position.set(0, 3.3, 0);
      portal.add(canopy);

      const goldRim = new THREE.Mesh(
        new THREE.BoxGeometry(5.8, 0.16, 2.55),
        new THREE.MeshStandardMaterial({
          color: '#E2A83B',
          emissive: '#d97706',
          emissiveIntensity: 0.35,
          metalness: 0.85,
          roughness: 0.22,
        })
      );
      goldRim.position.set(0, 3.55, 0);
      portal.add(goldRim);

      const welcomeMat = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 0.14, 3.0),
        new THREE.MeshStandardMaterial({ color: '#10b981', emissive: '#059669', emissiveIntensity: 0.4 })
      );
      welcomeMat.position.set(0, 0.1, 0.4);
      portal.add(welcomeMat);

      const badge = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createBadgeTexture(`🚪 ${pt.title}`, pt.subtitle, '#065f46', '#34d399', '#ffffff', '#a7f3d0'),
          transparent: true,
        })
      );
      badge.position.set(0, 4.9, 0);
      badge.scale.set(6.2, 1.58, 1);
      portal.add(badge);

      scene.add(portal);
    });

    // === 2º PAVIMENTO PARABÓLICO REAL (PRAÇA DE ALIMENTAÇÃO L2 + MESAS + GUARDA-CORPO + CLARABOIA) ===
    // Espaçamento vertical elevado para 11.0 garantindo folga >4m sobre letreiros de L1 (F25)
    const l2DeckY = L2_DECK_Y;
    const foodCourtShape = new THREE.Shape();
    foodCourtShape.moveTo(-32.8, -6.5);
    foodCourtShape.quadraticCurveTo(-36.5, 0.5, -32.8, 7.6);
    foodCourtShape.lineTo(-11.5, 7.6);
    foodCourtShape.quadraticCurveTo(-7.2, 0.5, -11.5, -6.5); // Bico parabólico Leste conforme Planta Mix 2/2
    foodCourtShape.closePath();

    const l2Geo = new THREE.ExtrudeGeometry(foodCourtShape, { depth: 0.42, bevelEnabled: false });
    l2Geo.rotateX(Math.PI / 2);
    const l2FoodSlabMat = new THREE.MeshStandardMaterial({
      color: isInitialObsidian ? '#181f2e' : '#fefce8',
      roughness: 0.3,
      metalness: 0.14,
      transparent: true,
      opacity: 0.9,
    });
    sceneRefs.current.l2FoodSlabMat = l2FoodSlabMat;
    l2Materials.push(l2FoodSlabMat);
    const l2FoodSlab = new THREE.Mesh(l2Geo, l2FoodSlabMat);
    l2FoodSlab.position.set(0, l2DeckY, 0);
    scene.add(l2FoodSlab);
    l2Objects.push(l2FoodSlab);

    // Guarda-corpo de vidro do mezanino L2 + Claraboia curva
    const balustradeMat = new THREE.MeshStandardMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.42 });
    l2Materials.push(balustradeMat);
    const balustrade = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.9, 9.6),
      balustradeMat
    );
    balustrade.position.set(-9.6, l2DeckY + 0.45, 0.5);
    scene.add(balustrade);
    l2Objects.push(balustrade);

    [-26, -20, -14].forEach((sx) => {
      const archMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.5, transparent: true, opacity: 0.38 });
      l2Materials.push(archMat);
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(4.2, 0.14, 8, 24, Math.PI),
        archMat
      );
      arch.position.set(sx, l2DeckY + 3.4, 0.4);
      arch.rotation.y = Math.PI / 2;
      scene.add(arch);
      l2Objects.push(arch);
    });

    // Mesas & Cadeiras reais no miolo da Praça de Alimentação L2
    const tableMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3, transparent: true, opacity: 1.0 });
    const chairMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.6, transparent: true, opacity: 1.0 });
    l2Materials.push(tableMat, chairMat);
    for (let tx = -24.5; tx <= -14.5; tx += 2.5) {
      for (let tz = -1.6; tz <= 2.4; tz += 2.0) {
        const tbl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.65, 10), tableMat);
        tbl.position.set(tx, l2DeckY + 0.35, tz);
        scene.add(tbl);
        l2Objects.push(tbl);
        const chr = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 8), chairMat);
        chr.position.set(tx + 0.55, l2DeckY + 0.22, tz);
        scene.add(chr);
        l2Objects.push(chr);
      }
    }

    // Pilares estruturais brancos/metálicos cilíndricos sustentando elegantemente a laje de L2 a partir do piso térreo (F25)
    const pillarMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      metalness: 0.35,
      roughness: 0.25,
      transparent: true,
      opacity: 1.0,
    });
    l2Materials.push(pillarMat);
    const pillarGeo = new THREE.CylinderGeometry(0.28, 0.28, l2DeckY, 16);
    const pillarPositions: [number, number][] = [
      [-31.0, -5.5],
      [-31.0, 5.5],
      [-23.0, -5.8],
      [-23.0, 6.2],
      [-15.0, -5.2],
      [-15.0, 5.8],
      [-11.5, 0.5],
    ];
    pillarPositions.forEach(([px, pz]) => {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, l2DeckY / 2, pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      scene.add(pillar);
      l2Objects.push(pillar);
    });

    // Blocos extras reais L2 (Colégio Interação A8 & Unicesumar/IOA)
    const l2ExtraDeckMats: THREE.MeshStandardMaterial[] = [];
    [
      { x: 9.2, z: 5.8, w: 7.0, d: 4.8 },
      { x: 11.4, z: -4.3, w: 6.0, d: 6.2 },
    ].forEach((b) => {
      const deckMat = new THREE.MeshStandardMaterial({
        color: isInitialObsidian ? '#1b2333' : '#fef9c3',
        roughness: 0.32,
        metalness: 0.12,
        transparent: true,
        opacity: 0.88,
      });
      l2Materials.push(deckMat);
      l2ExtraDeckMats.push(deckMat);
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(b.w, 0.35, b.d),
        deckMat
      );
      deck.position.set(b.x, l2DeckY - 0.1, b.z);
      scene.add(deck);
      l2Objects.push(deck);
    });
    sceneRefs.current.l2ExtraDeckMats = l2ExtraDeckMats;

    // Escadas Rolantes L1 ↔ L2 (ao lado do Bistrô 81 → bico parabólico da Praça L2) (F24)
    // Partem da circulação aberta do L1 (X ≈ -9.5, Y = 0.18) e sobem em direção a Oeste (-X),
    // desembarcando no piso da Praça de Alimentação de L2 (X ≈ -17.5, Y = l2DeckY).
    const escAngle = -Math.atan2(l2DeckY, 8.0);
    const escLength = Math.sqrt(64.0 + l2DeckY * l2DeckY);
    [-0.4, 1.4].forEach((ez, idx) => {
      const esc = new THREE.Mesh(
        new THREE.BoxGeometry(escLength, 0.3, 1.3),
        new THREE.MeshStandardMaterial({ color: '#d97706', metalness: 0.45, roughness: 0.3 })
      );
      esc.position.set(-13.5, l2DeckY / 2, ez);
      esc.rotation.z = escAngle;
      scene.add(esc);
      l2Objects.push(esc);

      const stepPulse = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.36, 1.0),
        new THREE.MeshBasicMaterial({ color: '#fde047' })
      );
      stepPulse.position.set(-9.5, 0.18, ez);
      stepPulse.rotation.z = escAngle;
      scene.add(stepPulse);
      l2Objects.push(stepPulse);
      animatedTreads.push({ mesh: stepPulse, phase: idx * 0.5, axis: 'escalator' });
    });

    // === BEACON 3D LUMINOSO VERTICAL + HALO PULSANTE (F22) ===
    const beaconGroup = new THREE.Group();
    // Cilindro / Cone invertido luminoso (altura 15 unidades) com MeshBasicMaterial translúcido aditivo #F59E0B
    const beaconGeo = new THREE.ConeGeometry(1.6, 15.0, 16, 1, true);
    beaconGeo.translate(0, 7.5, 0); // posiciona a ponta na base Y = 0
    beaconGeo.rotateX(Math.PI);     // inverte o cone para a ponta apontar para a loja/quiosque
    const beaconConeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.9, 1.25, 0.25),
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const beaconCone = new THREE.Mesh(beaconGeo, beaconConeMat);
    beaconGroup.add(beaconCone);

    // Halo pulsante horizontal no topo/base da loja
    const haloGeo = new THREE.RingGeometry(1.2, 2.5, 32);
    haloGeo.rotateX(-Math.PI / 2);
    const beaconHaloMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.1, 1.4, 0.3),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const beaconHalo = new THREE.Mesh(haloGeo, beaconHaloMat);
    beaconHalo.position.set(0, 0.1, 0);
    beaconGroup.add(beaconHalo);

    beaconGroup.visible = false;
    scene.add(beaconGroup);

    sceneRefs.current.beaconGroup = beaconGroup;
    sceneRefs.current.beaconHalo = beaconHalo;
    sceneRefs.current.beaconCone = beaconCone;
    sceneRefs.current.l2Materials = l2Materials;
    sceneRefs.current.l2Objects = l2Objects;
    sceneRefs.current.subsoloObjects = subsoloObjects;

    // === CONSTRUÇÃO DAS 60+ LOJAS 3D + VITRINES DE VIDRO + LETREIROS COM LOD ===
    const interactiveMeshes: THREE.Mesh[] = [];
    const storeEntries: typeof sceneRefs.current.storeEntries = [];

    CAPIM_STORES_3D.forEach((st) => {
      const baseY = st.floor === 'L2' ? l2DeckY : st.floor === 'SS1' ? -5.0 : 0;
      const telemetry = zonesRef.current.find((z) => z.zone.id === st.zoneId);
      const score = telemetry?.opportunityScore ?? 65;

      const mat = new THREE.MeshStandardMaterial({
        color: st.color,
        roughness: 0.42,
        metalness: 0.08,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(st.w, st.h, st.d), mat);
      mesh.position.set(st.x, baseY + st.h / 2, st.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = {
        zoneId: st.zoneId,
        floor: st.floor === 'SS1' ? 'L1' : st.floor,
        rawFloor: st.floor,
        storeName: st.name,
        subtitle: st.sublabel ?? st.floor,
        segment: st.segment,
        nearestPortal: st.nearestPortal,
        x: st.x,
        z: st.z,
        h: st.h,
      };
      scene.add(mesh);
      interactiveMeshes.push(mesh);

      // Vitrine de Vidro Frontal + Moldura Superior Metálica (reflexos RoomEnvironment)
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(st.w * 0.86, st.h * 0.62, st.d + 0.06),
        new THREE.MeshStandardMaterial({
          color: st.isVacant ? '#fecdd3' : '#bae6fd',
          transparent: true,
          opacity: 0.38,
          roughness: 0.06,
          metalness: 0.55,
          envMapIntensity: 1.25,
        })
      );
      glass.position.set(st.x, baseY + st.h * 0.36, st.z);
      scene.add(glass);

      const trimMat = new THREE.MeshStandardMaterial({
        color: st.accent,
        roughness: 0.24,
        metalness: 0.72,
        envMapIntensity: 1.15,
      });
      const trim = new THREE.Mesh(new THREE.BoxGeometry(st.w + 0.12, 0.24, st.d + 0.12), trimMat);
      trim.position.set(st.x, baseY + st.h + 0.08, st.z);
      scene.add(trim);

      const edgesGeo = new THREE.EdgesGeometry(mesh.geometry);
      const edgesMat = new THREE.LineBasicMaterial({
        color: '#E2A83B',
        transparent: true,
        opacity: isInitialObsidian ? 0.32 : 0,
        depthWrite: false,
        toneMapped: false,
      });
      const edges = new THREE.LineSegments(edgesGeo, edgesMat);
      edges.position.copy(mesh.position);
      edges.visible = isInitialObsidian;
      scene.add(edges);

      const badgeText = st.isVacant
        ? 'ESPAÇO VAGO • EXPANSÃO'
        : `${st.sublabel ?? `IQ ${score}`} • IQ ${score}`;
      const tex = createSignTexture(
        st.name,
        badgeText,
        st.accent,
        st.tier,
        st.isVacant,
        false,
        visualThemeRef.current
      );
      const spriteMat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        color: new THREE.Color(0.84, 0.84, 0.84),
      });
      const sprite = new THREE.Sprite(spriteMat);

      const signHeightOffset = st.tier === 'anchor' ? 1.55 : st.tier === 'megaloja' ? 1.15 : 0.78;
      const signScale =
        st.tier === 'anchor'
          ? [5.3, 1.52]
          : st.tier === 'megaloja'
          ? [4.1, 1.18]
          : [3.0, 0.88];

      sprite.position.set(st.x, baseY + st.h + signHeightOffset, st.z);
      sprite.scale.set(signScale[0], signScale[1], 1);
      scene.add(sprite);

      storeEntries.push({ def: st, mesh, mat, trimMat, edges, edgesMat, sprite });
    });
    sceneRefs.current.storeEntries = storeEntries;

    // === QUIOSQUES REAIS DOS CORREDORES L1 ===
    const kioskEntries: typeof sceneRefs.current.kioskEntries = [];
    CAPIM_KIOSKS_3D.forEach((k) => {
      const kMat = new THREE.MeshStandardMaterial({
        color: k.accent,
        roughness: 0.35,
        metalness: 0.2,
      });
      const kMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 1.05, 1.25, 12),
        kMat
      );
      kMesh.position.set(k.x, 0.65, k.z);
      kMesh.userData = {
        zoneId: k.zoneId,
        floor: 'L1',
        rawFloor: 'L1',
        storeName: k.name,
        subtitle: 'Quiosque Térreo L1',
        segment: k.segment,
        nearestPortal: 'Corredor L1',
        x: k.x,
        z: k.z,
        h: 1.8,
        isKiosk: true,
      };
      scene.add(kMesh);
      interactiveMeshes.push(kMesh);

      const kSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createSignTexture(
            k.name,
            'Quiosque L1',
            k.accent,
            'satellite',
            false,
            false,
            visualThemeRef.current
          ),
          transparent: true,
          color: new THREE.Color(0.84, 0.84, 0.84),
        })
      );
      kSprite.position.set(k.x, 2.35, k.z);
      kSprite.scale.set(2.6, 0.76, 1);
      scene.add(kSprite);

      kioskEntries.push({
        def: k,
        segment: k.segment,
        zoneId: k.zoneId,
        sprite: kSprite,
        mesh: kMesh,
        mat: kMat,
        pos: new THREE.Vector3(k.x, 1.2, k.z),
      });
    });
    sceneRefs.current.kioskEntries = kioskEntries;

    // === NUVEM DE PARTÍCULAS HEATMAP (THREE.Points ~350 PARTÍCULAS NOS CORREDORES) ===
    const PARTICLE_COUNT = 350;
    const corridorZones: Array<{
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
        yMin: l2DeckY + 0.9,
        yMax: l2DeckY + 2.9,
      },
    ];

    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const heatmapMeta: typeof sceneRefs.current.heatmapMeta = [];
    const scoreByZone = new Map<ZoneId, number>();
    zonesRef.current.forEach((z) => scoreByZone.set(z.zone.id, z.opportunityScore));

    let seed = 42197;
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const cz = corridorZones[i % corridorZones.length];
      const bx = cz.xMin + nextRand() * (cz.xMax - cz.xMin);
      const by = cz.yMin + nextRand() * (cz.yMax - cz.yMin);
      const bz = cz.zMin + nextRand() * (cz.zMax - cz.zMin);

      positions[i * 3] = bx;
      positions[i * 3 + 1] = by;
      positions[i * 3 + 2] = bz;

      const sc = scoreByZone.get(cz.zoneId) ?? 65;
      const isHigh = sc >= 75;
      colors[i * 3] = isHigh ? 1.05 : 0.1;
      colors[i * 3 + 1] = isHigh ? 0.72 : 0.86;
      colors[i * 3 + 2] = isHigh ? 0.18 : 0.74;

      heatmapMeta.push({
        zoneId: cz.zoneId,
        baseX: bx,
        baseY: by,
        baseZ: bz,
        phase: nextRand() * Math.PI * 2,
        speed: 0.7 + nextRand() * 1.1,
        ampY: 0.28 + nextRand() * 0.45,
        ampXZ: 0.25 + nextRand() * 0.55,
      });
    }

    const heatmapGeo = new THREE.BufferGeometry();
    heatmapGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    heatmapGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const particleTex = createSoftParticleTexture();
    const heatmapMat = new THREE.PointsMaterial({
      size: 1.55,
      map: particleTex,
      vertexColors: true,
      transparent: true,
      opacity: isInitialObsidian ? 0.85 : 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      toneMapped: false,
    });
    const heatmapPoints = new THREE.Points(heatmapGeo, heatmapMat);
    scene.add(heatmapPoints);
    sceneRefs.current.heatmapGeo = heatmapGeo;
    sceneRefs.current.heatmapMat = heatmapMat;
    sceneRefs.current.heatmapMeta = heatmapMeta;

    // === ARCOS BÉZIER 3D "ALIANÇA DE CORREDOR" (STRIPE-STYLE) ===
    const allianceGroup = new THREE.Group();
    scene.add(allianceGroup);
    sceneRefs.current.allianceGroup = allianceGroup;

    // === ROTAS DE FLUXO ANIMADO + CARROS NAS AVENIDAS ===
    interface FlowWalker {
      mesh: THREE.Mesh;
      path: THREE.CatmullRomCurve3;
      t: number;
      speed: number;
      orientToPath?: boolean;
    }

    const walkers: FlowWalker[] = [];
    const routeGroups: Record<Exclude<SegmentFilter, 'all'>, THREE.Object3D[]> = {
      moda: [],
      mercado: [],
      gastronomia: [],
    };

    const routesDefs: Array<{ seg: Exclude<SegmentFilter, 'all'>; color: string; points: THREE.Vector3[] }> = [
      {
        seg: 'moda',
        color: '#2563eb',
        points: [
          new THREE.Vector3(-15, 0.5, -8),
          new THREE.Vector3(-5, 0.5, -6.5),
          new THREE.Vector3(3, 0.5, -4.5),
          new THREE.Vector3(-4.5, 0.5, 4.2),
          new THREE.Vector3(-22, 0.5, 4.2),
        ],
      },
      {
        seg: 'mercado',
        color: '#10b981',
        points: [
          new THREE.Vector3(9, -4.4, -17.8),
          new THREE.Vector3(14.5, -4.4, -17.8),
          new THREE.Vector3(20.2, 0.5, -17.8),
          new THREE.Vector3(19.5, 0.5, -26),
          new THREE.Vector3(19.5, 0.5, -12),
          new THREE.Vector3(19.5, 0.5, 5),
        ],
      },
      {
        seg: 'gastronomia',
        color: '#d97706',
        points: [
          new THREE.Vector3(-0.8, 0.5, 11.5),
          new THREE.Vector3(-6, 0.5, 7.5),
          new THREE.Vector3(-11, 0.5, 1.5),
          new THREE.Vector3(-16.5, l2DeckY + 0.5, 0.5),
          new THREE.Vector3(-25, l2DeckY + 0.5, -2.5),
          new THREE.Vector3(-25, l2DeckY + 0.5, 2.5),
        ],
      },
    ];

    routesDefs.forEach((r) => {
      const curve = new THREE.CatmullRomCurve3(r.points);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 56, 0.15, 8, false),
        new THREE.MeshBasicMaterial({ color: r.color, transparent: true, opacity: 0.48 })
      );
      scene.add(tube);
      routeGroups[r.seg].push(tube);

      for (let i = 0; i < 5; i++) {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.32, 12, 12),
          new THREE.MeshBasicMaterial({ color: r.color })
        );
        scene.add(dot);
        routeGroups[r.seg].push(dot);
        walkers.push({ mesh: dot, path: curve, t: i * 0.2, speed: 0.002 });
      }
    });
    sceneRefs.current.routeGroups = routeGroups;

    // Carros animados circulando na Av. NS-05 + Rotatórias + Av. LO-2A
    const trafficCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-42.5, 0.35, 29.2),
        new THREE.Vector3(-42.5, 0.35, 24.5),
        new THREE.Vector3(-10, 0.35, 23.6),
        new THREE.Vector3(37.5, 0.35, 24.5),
        new THREE.Vector3(38.6, 0.35, -18),
        new THREE.Vector3(36.2, 0.35, -30),
        new THREE.Vector3(36.4, 0.35, 24.5),
        new THREE.Vector3(0, 0.35, 25.4),
        new THREE.Vector3(-42.5, 0.35, 24.5),
      ],
      true
    );
    ['#f8fafc', '#38bdf8', '#f59e0b', '#e2e8f0', '#ef4444', '#64748b'].forEach((cColor, ci) => {
      const car = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.52, 2.0),
        new THREE.MeshStandardMaterial({ color: cColor, roughness: 0.3, metalness: 0.35 })
      );
      scene.add(car);
      walkers.push({
        mesh: car,
        path: trafficCurve,
        t: ci / 6,
        speed: 0.00075,
        orientToPath: true,
      });
    });

    // === MODO STREET VIEW ===
    const walkState = {
      pos: new THREE.Vector3(-0.8, 1.85, 8.5),
      yaw: Math.PI,
      pitch: 0.02,
      dragging: false,
      lastX: 0,
      lastY: 0,
    };
    const pressedKeys = new Set<string>();

    const syncWalkCamera = () => {
      const targetY = floorRef.current === 'L2' ? l2DeckY + 1.85 : 1.85;
      walkState.pos.y += (targetY - walkState.pos.y) * 0.14;
      camera.position.copy(walkState.pos);
      const lookDir = new THREE.Vector3(
        Math.sin(walkState.yaw) * Math.cos(walkState.pitch),
        Math.sin(walkState.pitch),
        Math.cos(walkState.yaw) * Math.cos(walkState.pitch)
      );
      controls.target.copy(walkState.pos).add(lookDir);
      camera.lookAt(controls.target);
    };

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let downPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
      sceneRefs.current.flyTarget = null; // Interrompe voo automático se usuário assume o controle
      if (viewModeRef.current === 'walk') {
        walkState.dragging = true;
        walkState.lastX = e.clientX;
        walkState.lastY = e.clientY;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (viewModeRef.current === 'walk' && walkState.dragging) {
        const dx = e.clientX - walkState.lastX;
        const dy = e.clientY - walkState.lastY;
        walkState.lastX = e.clientX;
        walkState.lastY = e.clientY;
        walkState.yaw += dx * 0.0055;
        walkState.pitch = Math.max(-0.45, Math.min(0.55, walkState.pitch - dy * 0.004));
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      walkState.dragging = false;
      const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      if (moved < 6) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObjects(interactiveMeshes);
        if (hits.length > 0) {
          const data = hits[0].object.userData as {
            zoneId: ZoneId;
            floor: FloorId;
            rawFloor: FloorId | 'SS1';
            storeName: string;
            subtitle: string;
            segment: Exclude<SegmentFilter, 'all'>;
            nearestPortal: string;
            x: number;
            z: number;
            h: number;
            isKiosk?: boolean;
          };
          if (data.zoneId) {
            onSelectZoneRef.current(data.zoneId);
            onFloorChangeRef.current(data.floor);
            onSelectStoreNameRef.current?.(data.storeName);
            setSelectedStore({
              label: data.storeName,
              subtitle: data.subtitle,
              zoneId: data.zoneId,
              floor: data.rawFloor,
              segment: data.segment,
              nearestPortal: data.nearestPortal,
              x: data.x,
              z: data.z,
              h: data.h,
              isKiosk: data.isKiosk,
            });
          }
        }
      }
    };

    const clampWalkPos = () => {
      walkState.pos.x = Math.max(-35, Math.min(31, walkState.pos.x));
      walkState.pos.z = Math.max(-29, Math.min(18, walkState.pos.z));
    };

    const onWalkWheel = (e: WheelEvent) => {
      if (viewModeRef.current === 'walk') {
        e.preventDefault();
        const step = -Math.sign(e.deltaY) * 1.4;
        walkState.pos.x += Math.sin(walkState.yaw) * step;
        walkState.pos.z += Math.cos(walkState.yaw) * step;
        clampWalkPos();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      pressedKeys.add(e.key.toLowerCase());
    };
    const onKeyUp = (e: KeyboardEvent) => pressedKeys.delete(e.key.toLowerCase());

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    domEl.addEventListener('wheel', onWalkWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    actionsRef.current = {
      zoom: (factor: number) => {
        sceneRefs.current.flyTarget = null;
        if (viewModeRef.current === 'walk') {
          walkState.pos.x += Math.sin(walkState.yaw) * (factor < 1 ? 2.5 : -2.5);
          walkState.pos.z += Math.cos(walkState.yaw) * (factor < 1 ? 2.5 : -2.5);
          clampWalkPos();
          return;
        }
        const offset = camera.position.clone().sub(controls.target).multiplyScalar(factor);
        const dist = offset.length();
        if (dist >= controls.minDistance && dist <= controls.maxDistance) {
          camera.position.copy(controls.target).add(offset);
        }
      },
      flyTo: (pos: [number, number, number], target: [number, number, number]) => {
        controls.enabled = true;
        sceneRefs.current.flyTarget = {
          camPos: new THREE.Vector3(pos[0], pos[1], pos[2]),
          lookAt: new THREE.Vector3(target[0], target[1], target[2]),
        };
      },
      resetOrbit: (targetFloor: FloorId, focusSubsolo?: boolean) => {
        controls.enabled = true;
        if (focusSubsolo || targetFloor === 'SS1') {
          sceneRefs.current.flyTarget = {
            camPos: new THREE.Vector3(-14, 15, -42),
            lookAt: new THREE.Vector3(12, -3.5, -17),
          };
        } else if (targetFloor === 'L2') {
          sceneRefs.current.flyTarget = {
            camPos: new THREE.Vector3(-44, l2DeckY + 18, 22),
            lookAt: new THREE.Vector3(-21, l2DeckY + 0.8, 0),
          };
        } else {
          sceneRefs.current.flyTarget = {
            camPos: new THREE.Vector3(-4, 46, 56),
            lookAt: new THREE.Vector3(-1, 1, -2),
          };
        }
      },
      enterWalk: (targetFloor: FloorId) => {
        controls.enabled = false;
        sceneRefs.current.flyTarget = null;
        if (targetFloor === 'L2') {
          walkState.pos.set(-15, l2DeckY + 1.85, 0.5);
          walkState.yaw = -Math.PI / 2;
        } else {
          walkState.pos.set(-0.8, 1.85, 9.5);
          walkState.yaw = Math.PI;
        }
        walkState.pitch = 0.03;
        syncWalkCamera();
      },
      nudgeWalk: (forward: number, strafe: number, turnYaw: number) => {
        walkState.yaw += turnYaw;
        walkState.pos.x += Math.sin(walkState.yaw) * forward + Math.cos(walkState.yaw) * strafe;
        walkState.pos.z += Math.cos(walkState.yaw) * forward - Math.sin(walkState.yaw) * strafe;
        clampWalkPos();
      },
    };

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 520;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h);
      composer?.setPixelRatio(dpr);
      composer?.setSize(w, h);
      bloomPass?.setSize(w, h);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    let animId = 0;
    let isDisposed = false;
    let isLoopRunning = false;
    let isTabVisible =
      typeof document === 'undefined' ? true : document.visibilityState === 'visible';
    let isInViewport = true;
    const startMs = performance.now();

    const shouldRunLoop = () => !isDisposed && isTabVisible && isInViewport;

    const stopLoop = () => {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = 0;
      }
      isLoopRunning = false;
    };

    const startLoop = () => {
      if (isLoopRunning || !shouldRunLoop()) return;
      isLoopRunning = true;
      animId = requestAnimationFrame(animate);
    };

    const animate = () => {
      if (!shouldRunLoop()) {
        isLoopRunning = false;
        animId = 0;
        return;
      }
      animId = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startMs) * 0.001;

      for (const w of walkers) {
        w.t = (w.t + w.speed) % 1;
        const pt = w.path.getPointAt(w.t);
        w.mesh.position.copy(pt);
        if (w.orientToPath) {
          const nextPt = w.path.getPointAt((w.t + 0.01) % 1);
          w.mesh.lookAt(nextPt);
        }
      }

      // Flutuação suave das ~350 partículas do Heatmap acima dos corredores
      if (sceneRefs.current.heatmapGeo && sceneRefs.current.heatmapMeta.length > 0) {
        const posAttr = sceneRefs.current.heatmapGeo.getAttribute('position') as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const meta = sceneRefs.current.heatmapMeta;
        for (let i = 0; i < meta.length; i++) {
          const m = meta[i];
          const tPhase = elapsed * m.speed + m.phase;
          const idx = i * 3;
          arr[idx] = m.baseX + Math.cos(tPhase * 0.65) * m.ampXZ;
          arr[idx + 1] = m.baseY + Math.sin(tPhase) * m.ampY;
          arr[idx + 2] = m.baseZ + Math.sin(tPhase * 0.55) * m.ampXZ;
        }
        posAttr.needsUpdate = true;
      }

      // Pulsos de luz viajando nos Arcos Bézier "Aliança de Corredor"
      for (const pulse of sceneRefs.current.alliancePulses) {
        pulse.t = (pulse.t + pulse.speed) % 1;
        pulse.mesh.position.copy(pulse.curve.getPointAt(pulse.t));
      }

      // Animação suave dos degraus nas esteiras e escadas rolantes + cabines dos elevadores
      for (const tr of animatedTreads) {
        if (tr.axis === 'esteira') {
          const u = ((elapsed * 0.45 + tr.phase) % 1) - 0.5;
          tr.mesh.position.x = 17.2 + u * 5.6;
          tr.mesh.position.y = -2.25 + u * 4.7;
        } else {
          // Fórmula paramétrica colinear estrita F24:
          // X(t) = -9.5 - 8.0 * t
          // Y(t) = 0.18 + t * l2DeckY
          const t = ((elapsed * 0.35 + tr.phase) % 1 + 1) % 1;
          tr.mesh.position.x = -9.5 - 8.0 * t;
          tr.mesh.position.y = 0.18 + t * l2DeckY;
        }
      }

      // Animação da pulsação do Beacon e Halo (F22)
      if (sceneRefs.current.beaconGroup?.visible) {
        const pulse = 1.0 + 0.18 * Math.sin(elapsed * 5.0);
        if (sceneRefs.current.beaconHalo) {
          sceneRefs.current.beaconHalo.scale.set(pulse, pulse, pulse);
          (sceneRefs.current.beaconHalo.material as THREE.MeshBasicMaterial).opacity =
            0.70 + 0.25 * Math.cos(elapsed * 5.0);
        }
        if (sceneRefs.current.beaconCone) {
          (sceneRefs.current.beaconCone.material as THREE.MeshBasicMaterial).opacity =
            0.55 + 0.25 * Math.sin(elapsed * 4.0);
        }
      }

      elevatorCabins.forEach((el, idx) => {
        const wave = (Math.sin(elapsed * 0.65 + idx * 1.8) + 1) / 2;
        el.cabin.position.y = el.yStart + 1.0 + wave * Math.max(1, el.h - 2.2);
      });

      // LOD por distância + Anti-Sobreposição de letreiros com Foco por Piso (F23)
      const camPos = camera.position;
      const curFloor = floorRef.current;
      const seg = activeSegmentRef.current;
      const pickedName = selectedStoreNameRef.current;

      for (const entry of storeEntries) {
        const spr = entry.sprite;
        const dist = camPos.distanceTo(spr.position);
        const isPicked = pickedName === entry.def.name;
        const segOk = seg === 'all' || entry.def.segment === seg;
        const isZone = entry.def.zoneId === selectedZoneRef.current;

        let visible = segOk;

        // F23: Isolamento estrito de letreiros por piso ativo (exceto se for a loja buscada)
        if (!isPicked) {
          if (curFloor === 'L1' && entry.def.floor !== 'L1') {
            visible = false;
          } else if (curFloor === 'L2' && entry.def.floor !== 'L2') {
            visible = false;
          } else if (curFloor === 'SS1' && entry.def.floor !== 'SS1') {
            visible = false;
          }
        }

        if (!isPicked && entry.def.tier === 'satellite' && dist > 44 && !isZone) {
          visible = false;
        }
        spr.visible = visible;
        if (visible) {
          const opacity = !segOk ? 0.2 : entry.def.tier === 'satellite' && dist > 38 && !isZone ? 0.55 : 1.0;
          (spr.material as THREE.SpriteMaterial).opacity = opacity;
        }
      }

      for (const k of kioskEntries) {
        const dist = camPos.distanceTo(k.pos);
        const segOk = seg === 'all' || k.segment === seg;
        const isPicked = pickedName === k.def.name;
        // Quiosques pertencem ao L1 — visíveis apenas se L1 ativo ou se for o item buscado
        const floorOk = curFloor === 'L1' || isPicked;
        const showKiosk = segOk && floorOk && (dist < 36 || isPicked || viewModeRef.current === 'walk');
        k.sprite.visible = showKiosk;
      }

      // Controle Street View vs Orbit + Fly-To suave
      if (viewModeRef.current === 'walk') {
        const moveSpeed = 0.22;
        if (pressedKeys.has('w') || pressedKeys.has('arrowup')) {
          walkState.pos.x += Math.sin(walkState.yaw) * moveSpeed;
          walkState.pos.z += Math.cos(walkState.yaw) * moveSpeed;
        }
        if (pressedKeys.has('s') || pressedKeys.has('arrowdown')) {
          walkState.pos.x -= Math.sin(walkState.yaw) * moveSpeed;
          walkState.pos.z -= Math.cos(walkState.yaw) * moveSpeed;
        }
        if (pressedKeys.has('a') || pressedKeys.has('arrowleft')) walkState.yaw += 0.035;
        if (pressedKeys.has('d') || pressedKeys.has('arrowright')) walkState.yaw -= 0.035;
        clampWalkPos();
        syncWalkCamera();
      } else {
        if (sceneRefs.current.flyTarget) {
          camera.position.lerp(sceneRefs.current.flyTarget.camPos, 0.08);
          controls.target.lerp(sceneRefs.current.flyTarget.lookAt, 0.08);
          if (camera.position.distanceTo(sceneRefs.current.flyTarget.camPos) < 0.35) {
            sceneRefs.current.flyTarget = null;
          }
        }
        controls.enabled = true;
        controls.update();
      }

      if (composer && !composerFailed) {
        try {
          composer.render();
        } catch {
          composerFailed = true;
          renderer.render(scene, camera);
        }
      } else {
        renderer.render(scene, camera);
      }
    };

    const onVisibilityChange = () => {
      isTabVisible = document.visibilityState === 'visible';
      if (shouldRunLoop()) {
        startLoop();
      } else {
        stopLoop();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          isInViewport = entry.isIntersecting || entry.intersectionRatio > 0;
          if (shouldRunLoop()) {
            startLoop();
          } else {
            stopLoop();
          }
        },
        { threshold: 0 }
      );
      io.observe(container);
    }

    startLoop();

    return () => {
      isDisposed = true;
      stopLoop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      io?.disconnect();
      ro.disconnect();
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('wheel', onWalkWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      controls.dispose();
      disposeObjectResources(scene);
      if (scene.environment instanceof THREE.Texture) {
        scene.environment.dispose();
        scene.environment = null;
      }
      if (scene.background instanceof THREE.Texture) {
        scene.background.dispose();
        scene.background = null;
      }
      scene.clear();
      bloomPass?.dispose();
      outputPass?.dispose();
      composer?.dispose();
      envRT?.dispose();
      pmremGenerator?.dispose();
      actionsRef.current = null;
      sceneRefs.current.renderer = null;
      sceneRefs.current.scene = null;
      sceneRefs.current.hemiLight = null;
      sceneRefs.current.dirLight = null;
      sceneRefs.current.bloomPass = null;
      sceneRefs.current.l1DeckMat = null;
      sceneRefs.current.subsoloCover = null;
      sceneRefs.current.groundMat = null;
      sceneRefs.current.ovalPlazaMat = null;
      sceneRefs.current.l2FoodSlabMat = null;
      sceneRefs.current.l2ExtraDeckMats = [];
      sceneRefs.current.obsidianGridGroup = null;
      sceneRefs.current.beaconGroup = null;
      sceneRefs.current.beaconHalo = null;
      sceneRefs.current.beaconCone = null;
      sceneRefs.current.l2Materials = [];
      sceneRefs.current.l2Objects = [];
      sceneRefs.current.subsoloObjects = [];
      sceneRefs.current.storeEntries = [];
      sceneRefs.current.kioskEntries = [];
      sceneRefs.current.routeGroups = { moda: [], mercado: [], gastronomia: [] };
      sceneRefs.current.allianceGroup = null;
      sceneRefs.current.alliancePulses = [];
      sceneRefs.current.heatmapGeo = null;
      sceneRefs.current.heatmapMat = null;
      sceneRefs.current.heatmapMeta = [];
      sceneRefs.current.flyTarget = null;
      renderer.renderLists?.dispose();
      renderer.dispose();
    };
  }, []);

  const handleToggleViewMode = (mode: 'orbit' | 'walk') => {
    setTourActive(false);
    setViewMode(mode);
    if (mode === 'walk') {
      actionsRef.current?.enterWalk(floor);
    } else {
      actionsRef.current?.resetOrbit(floor, showSubsoloXray);
    }
  };

  const handleSwitchFloor = (nextFloor: FloorId) => {
    setTourActive(false);
    onFloorChange(nextFloor);
    setShowSubsoloXray(false);
    if (viewMode === 'walk') {
      actionsRef.current?.enterWalk(nextFloor);
    } else {
      actionsRef.current?.resetOrbit(nextFloor, false);
    }
  };

  const handleSelectPreset = (preset: (typeof CAMERA_PRESETS)[number]) => {
    setTourActive(false);
    setViewMode('orbit');
    setShowSubsoloXray(Boolean(preset.xray));
    onFloorChange(preset.floor);
    actionsRef.current?.flyTo(preset.pos, preset.target);
  };

  const handlePickSearchItem = (item: SearchHit) => {
    setTourActive(false);
    setViewMode('orbit');
    setSelectedStore(item);
    onSelectStoreName?.(item.label);
    setSearchQuery('');
    onSelectZone(item.zoneId);
    const targetFloor: FloorId = item.floor === 'L2' ? 'L2' : item.floor === 'SS1' ? 'SS1' : 'L1';
    const isSS1 = item.floor === 'SS1';
    setShowSubsoloXray(isSS1);
    onFloorChange(targetFloor);
    const yBase = item.floor === 'L2' ? L2_DECK_Y : isSS1 ? -5.0 : 0;
    const itemH = item.isKiosk ? 1.8 : item.h;
    actionsRef.current?.flyTo(
      [item.x - 10, yBase + itemH + 10, item.z + 15],
      [item.x, yBase + 1.5, item.z]
    );
  };

  useEffect(() => {
    const tenantId = activeTenant?.id ?? null;
    if (tenantId !== prevTenantIdRef.current) {
      prevTenantIdRef.current = tenantId;
      dismissedTenantIdRef.current = null;
    }

    const targetName =
      selectedStoreName ??
      (activeTenant && dismissedTenantIdRef.current !== activeTenant.id
        ? activeTenant.storeName
        : null);

    if (!targetName) {
      if (selectedStore) setSelectedStore(null);
      return;
    }

    const normTarget = normalizeStoreKey(targetName);
    const hit =
      searchableItems.find((h) => normalizeStoreKey(h.label) === normTarget) ??
      searchableItems.find(
        (h) =>
          normalizeStoreKey(h.label).includes(normTarget) ||
          normTarget.includes(normalizeStoreKey(h.label))
      );

    if (hit) {
      if (!selectedStore || selectedStore.label !== hit.label) {
        setTourActive(false);
        setViewMode('orbit');
        setSelectedStore(hit);
        if (selectedStoreName && hit.label !== selectedStoreName) {
          onSelectStoreNameRef.current?.(hit.label);
        }
        setSearchQuery('');
        onSelectZoneRef.current(hit.zoneId);
        const targetFloor: FloorId =
          hit.floor === 'L2' ? 'L2' : hit.floor === 'SS1' ? 'SS1' : 'L1';
        const isSS1 = hit.floor === 'SS1';
        setShowSubsoloXray(isSS1);
        onFloorChangeRef.current(targetFloor);
        const yBase = hit.floor === 'L2' ? L2_DECK_Y : isSS1 ? -5.0 : 0;
        const itemH = hit.isKiosk ? 1.8 : hit.h;
        actionsRef.current?.flyTo(
          [hit.x - 10, yBase + itemH + 10, hit.z + 15],
          [hit.x, yBase + 1.5, hit.z]
        );
      }
    } else if (activeTenant && !selectedStoreName) {
      onSelectZoneRef.current(activeTenant.zoneId);
    }
  }, [selectedStoreName, activeTenant, searchableItems]);

  if (webglUnsupported) {
    return (
      <div className="h-[480px] rounded-2xl bg-[#080B10] border border-[#E2A83B]/30 flex items-center justify-center p-6 text-center text-sm text-stone-300">
        Navegador sem WebGL ativo no momento — use a Planta 2D Técnica ou os botões das alas abaixo.
      </div>
    );
  }

  const currentTourStop = GUIDED_TOUR_STOPS[tourStepIndex];
  const isObsidianTheme = visualTheme === 'obsidian';
  const hudGlassClass =
    'bg-[#0B0D12]/80 backdrop-blur-xl border border-[#E2A83B]/30 text-white shadow-2xl';
  const telemetryPillText = `PISO ${floor} • IQ ${activeZone?.opportunityScore ?? '--'} • ${
    isObsidianTheme ? 'OBSIDIAN 3D' : 'DIA 3D'
  }`;

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border shadow-2xl transition-colors ${
        isObsidianTheme
          ? 'border-[#E2A83B]/30 bg-[#080B10]'
          : 'border-slate-300 bg-[#eaeef5]'
      }`}
    >
      <div
        ref={mountRef}
        className="w-full h-[500px] sm:h-[580px] cursor-grab active:cursor-grabbing"
        aria-label="Maquete 3D fiel à Planta Mix oficial do Capim Dourado Shopping"
      />

      {/* Barra Superior (Telemetria + Modo + Busca Rápida + Tema Obsidian/Dia + Zoom) */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto max-w-full">
          <div className={`flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl ${hudGlassClass}`}>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#E2A83B]/15 border border-[#E2A83B]/40 text-[#E2A83B] font-mono text-[11px] font-bold tracking-wider">
              {telemetryPillText}
            </span>
            {activeZone && (
              <span className="hidden md:inline-flex px-2.5 py-1 rounded-lg bg-white/10 text-stone-100 text-[11px] font-extrabold">
                {activeZone.zone.shortName}
              </span>
            )}
            <button
              type="button"
              aria-pressed={viewMode === 'orbit'}
              onClick={() => handleToggleViewMode('orbit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B] ${
                viewMode === 'orbit'
                  ? 'bg-[#E2A83B] text-[#0B0D12] shadow-sm'
                  : 'text-stone-200 hover:bg-white/10'
              }`}
            >
              <Compass className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Maquete 3D</span>
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'walk'}
              onClick={() => handleToggleViewMode('walk')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B] ${
                viewMode === 'walk'
                  ? 'bg-amber-400 text-[#0B0D12] shadow-sm'
                  : 'text-stone-200 hover:bg-white/10'
              }`}
            >
              <Footprints className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Street View</span>
            </button>
            <button
              type="button"
              aria-pressed={tourActive}
              onClick={() => {
                if (tourActive) {
                  setTourActive(false);
                } else {
                  setTourStepIndex(0);
                  setTourActive(true);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B] ${
                tourActive
                  ? 'bg-[#E2A83B] text-[#0B0D12] shadow-sm'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30'
              }`}
            >
              {tourActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{tourActive ? 'Pausar Tour' : 'Tour Guiado'}</span>
            </button>
          </div>

          {/* Busca Rápida de Loja / Quiosque / Vaga */}
          <div className="relative w-full sm:w-80">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${hudGlassClass}`}>
              <Search className="w-3.5 h-3.5 text-[#E2A83B] shrink-0" aria-hidden="true" />
              <input
                id="map-3d-store-search"
                name="map3dStoreSearch"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar loja, PF, Super Big ou vaga..."
                aria-label="Buscar loja no Mapa 3D"
                className="w-full text-xs text-white bg-transparent focus:outline-none placeholder:text-stone-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => setSearchQuery('')}
                  className="text-stone-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-[#0B0D12]/95 backdrop-blur-xl rounded-xl border border-[#E2A83B]/35 shadow-2xl overflow-hidden z-20 divide-y divide-white/10">
                {searchResults.map((hit) => (
                  <button
                    key={hit.label}
                    type="button"
                    onClick={() => handlePickSearchItem(hit)}
                    className="w-full text-left px-3 py-2 hover:bg-[#E2A83B]/15 flex items-center justify-between gap-2 transition"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-extrabold text-white block truncate">{hit.label}</span>
                      <span className="text-[10px] text-stone-400 block truncate">{hit.subtitle}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-white/10 text-[#E2A83B] font-mono text-[10px] font-bold shrink-0">
                      {hit.floor}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tema Obsidian / Dia + Raio-X + Zoom / Reset */}
        <div className={`flex flex-wrap items-center gap-1.5 pointer-events-auto p-1.5 rounded-xl ${hudGlassClass}`}>
          <button
            type="button"
            aria-pressed={isObsidianTheme}
            onClick={() => setVisualTheme((prev) => (prev === 'obsidian' ? 'day' : 'obsidian'))}
            aria-label="Alternar modo visual Obsidian ou Dia"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B] ${
              isObsidianTheme
                ? 'bg-[#E2A83B]/20 text-[#E2A83B] border-[#E2A83B]/45 hover:bg-[#E2A83B]/30'
                : 'bg-white/15 text-amber-200 border-white/20 hover:bg-white/25'
            }`}
          >
            {isObsidianTheme ? (
              <Moon className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Sun className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{isObsidianTheme ? 'Obsidian' : 'Dia'}</span>
          </button>
          <button
            type="button"
            aria-pressed={showSubsoloXray}
            onClick={() => {
              const next = !showSubsoloXray;
              setTourActive(false);
              setShowSubsoloXray(next);
              setViewMode('orbit');
              onFloorChange(next ? 'SS1' : 'L1');
              actionsRef.current?.resetOrbit(next ? 'SS1' : 'L1', next);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B] ${
              showSubsoloXray
                ? 'bg-sky-500 text-[#0B0D12] border-sky-400 shadow-sm'
                : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-400/30'
            }`}
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Raio-X Subsolo</span>
          </button>
          <button
            type="button"
            aria-label="Aproximar Zoom"
            onClick={() => actionsRef.current?.zoom(0.8)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
          >
            <ZoomIn className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Afastar Zoom"
            onClick={() => actionsRef.current?.zoom(1.25)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
          >
            <ZoomOut className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Resetar Câmera"
            onClick={() => handleToggleViewMode(viewMode)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Card Flutuante da Loja Clicada/Buscada */}
      {selectedStore && !tourActive && (
        <div className={`hidden sm:block absolute top-24 right-3 w-72 rounded-2xl p-3.5 pointer-events-auto z-10 ${hudGlassClass}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#E2A83B] flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {selectedStore.floor} • Portaria {selectedStore.nearestPortal}
              </span>
              <h4 className="text-sm font-extrabold mt-0.5 text-white">{selectedStore.label}</h4>
              <p className="text-[11px] text-stone-300 mt-0.5">{selectedStore.subtitle}</p>
            </div>
            <button
              type="button"
              aria-label="Fechar card da loja"
              onClick={() => {
                if (activeTenant) {
                  dismissedTenantIdRef.current = activeTenant.id;
                }
                setSelectedStore(null);
                onSelectStoreName?.(null);
              }}
              className="text-stone-400 hover:text-white p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {activeZone && (
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
              <span className="text-stone-300">Score IQ ({activeZone.zone.shortName}):</span>
              <strong className="text-[#E2A83B] font-mono font-extrabold">{activeZone.opportunityScore} pts</strong>
            </div>
          )}
        </div>
      )}

      {/* Overlay do Tour Guiado Automático */}
      {tourActive && (
        <div className={`absolute top-24 right-3 left-3 sm:left-auto sm:w-88 rounded-2xl p-4 pointer-events-auto z-10 ${hudGlassClass}`}>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E2A83B] flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Tour Guiado Capim Dourado
            </span>
            <button
              type="button"
              onClick={() => setTourStepIndex((prev) => (prev + 1) % GUIDED_TOUR_STOPS.length)}
              className="px-2 py-0.5 rounded bg-[#E2A83B] text-[#0B0D12] text-[10px] font-extrabold"
            >
              Próxima →
            </button>
          </div>
          <h4 className="text-xs font-extrabold text-white">{currentTourStop.title}</h4>
          <p className="text-[11px] text-stone-300 mt-1 leading-relaxed">{currentTourStop.description}</p>
        </div>
      )}

      {/* Joypad Street View */}
      {viewMode === 'walk' && (
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-3 pointer-events-none">
          <div className={`pointer-events-auto px-3.5 py-2.5 rounded-xl text-[11px] max-w-sm ${hudGlassClass}`}>
            <strong className="text-[#E2A83B] block mb-0.5">
              Modo Street View Ativo ({floor === 'L1' ? 'Térreo L1' : '2º Piso Curva JK'})
            </strong>
            Arraste para olhar as vitrines • Use <strong>Scroll / W A S D</strong> ou os botões ao lado.
          </div>

          <div className={`pointer-events-auto flex items-center gap-1.5 p-2 rounded-2xl ${hudGlassClass}`}>
            <button
              type="button"
              aria-label="Virar à esquerda"
              onClick={() => actionsRef.current?.nudgeWalk(0, 0, 0.35)}
              className="px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
            >
              ↺ Esq
            </button>
            <button
              type="button"
              aria-label="Andar para frente"
              onClick={() => actionsRef.current?.nudgeWalk(3.0, 0, 0)}
              className="px-3 py-2 rounded-lg bg-[#E2A83B] hover:bg-amber-400 text-[#0B0D12] text-xs font-extrabold flex items-center gap-1 transition"
            >
              <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Frente</span>
            </button>
            <button
              type="button"
              aria-label="Recuar"
              onClick={() => actionsRef.current?.nudgeWalk(-3.0, 0, 0)}
              className="px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 transition"
            >
              <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Virar à direita"
              onClick={() => actionsRef.current?.nudgeWalk(0, 0, -0.35)}
              className="px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
            >
              Dir ↻
            </button>
            <button
              type="button"
              onClick={() => handleSwitchFloor(floor === 'L1' ? 'L2' : 'L1')}
              className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0B0D12] text-xs font-extrabold flex items-center gap-1 transition"
            >
              {floor === 'L1' ? (
                <MoveUp className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <MoveDown className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{floor === 'L1' ? '2º Piso' : '1º Piso'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Barra Inferior: Presets de Câmera por Setor + Filtro de Fluxo por Segmento */}
      {viewMode === 'orbit' && (
        <div className="bg-[#0B0D12]/90 backdrop-blur-xl border-t border-[#E2A83B]/30 text-white px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Atalhos de Setor 3D">
            {CAMERA_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[#E2A83B] hover:text-[#0B0D12] text-stone-100 text-[11px] font-bold transition"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar fluxos por segmento">
            {(
              [
                { id: 'all', label: 'Todos Fluxos', dot: 'bg-stone-300' },
                { id: 'moda', label: 'Moda', dot: 'bg-blue-400' },
                { id: 'mercado', label: 'Subsolo / Mercado', dot: 'bg-emerald-400' },
                { id: 'gastronomia', label: 'Gastronomia / L2', dot: 'bg-amber-400' },
              ] as const
            ).map((seg) => (
              <button
                key={seg.id}
                type="button"
                aria-pressed={activeSegment === seg.id}
                onClick={() => setActiveSegment(seg.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B] ${
                  activeSegment === seg.id
                    ? 'bg-[#E2A83B] text-[#0B0D12] border-[#E2A83B]'
                    : 'bg-white/5 text-stone-200 border-white/15 hover:bg-white/15'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${seg.dot}`} />
                <span>{seg.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
