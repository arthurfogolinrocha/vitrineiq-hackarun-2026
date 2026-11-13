import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  ArrowDown,
  ArrowUp,
  Compass,
  Eye,
  Footprints,
  MapPin,
  MoveDown,
  MoveUp,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { FloorId, ZoneId } from '../types';
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

interface ShoppingMap3DProps {
  floor: FloorId;
  onFloorChange: (floor: FloorId) => void;
  zonesTelemetry: ZoneLiveTelemetry[];
  selectedZoneId: ZoneId;
  onSelectZone: (zoneId: ZoneId) => void;
  selectedStoreName?: string | null;
  onSelectStoreName?: (name: string | null) => void;
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

function createSignTexture(
  title: string,
  badge: string,
  accent: string,
  tier: StoreTier,
  isVacant?: boolean,
  isHighlighted?: boolean
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 148;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = isVacant
      ? '#fff1f2'
      : isHighlighted
      ? '#111318'
      : tier === 'anchor'
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
      ? '#be123c'
      : isHighlighted || tier === 'anchor'
      ? '#ffffff'
      : '#0f172a';
    ctx.font = '800 30px Inter, system-ui, sans-serif';
    ctx.fillText(title, 52, 66);

    ctx.fillStyle = isVacant
      ? '#e11d48'
      : isHighlighted || tier === 'anchor'
      ? '#fde68a'
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
}) => {
  const activeZone = zonesTelemetry.find((z) => z.zone.id === selectedZoneId);
  const mountRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<'orbit' | 'walk'>('orbit');
  const [showSubsoloXray, setShowSubsoloXray] = useState<boolean>(false);
  const [activeSegment, setActiveSegment] = useState<SegmentFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<SearchHit | null>(null);
  const [tourActive, setTourActive] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [webglUnsupported, setWebglUnsupported] = useState(false);

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

  const onSelectZoneRef = useRef(onSelectZone);
  onSelectZoneRef.current = onSelectZone;
  const onFloorChangeRef = useRef(onFloorChange);
  onFloorChangeRef.current = onFloorChange;

  const sceneRefs = useRef<{
    l1DeckMat: THREE.MeshStandardMaterial | null;
    subsoloCover: THREE.Mesh | null;
    groundMat: THREE.MeshStandardMaterial | null;
    beaconGroup: THREE.Group | null;
    beaconHalo: THREE.Mesh | null;
    beaconCone: THREE.Mesh | null;
    l2Materials: THREE.MeshStandardMaterial[];
    l2Objects: THREE.Object3D[];
    subsoloObjects: THREE.Object3D[];
    storeEntries: Array<{
      def: Store3DDef;
      mesh: THREE.Mesh;
      mat: THREE.MeshStandardMaterial;
      trimMat: THREE.MeshStandardMaterial;
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
    l1DeckMat: null,
    subsoloCover: null,
    groundMat: null,
    beaconGroup: null,
    beaconHalo: null,
    beaconCone: null,
    l2Materials: [],
    l2Objects: [],
    subsoloObjects: [],
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

  // Atualiza Score IQ, Foco por Piso (F23), Destaque e Beacon em Busca de Loja (F22) e filtro de segmento em <1ms sem resetar câmera!
  useEffect(() => {
    const {
      storeEntries,
      kioskEntries,
      routeGroups,
      beaconGroup,
      l1DeckMat,
      groundMat,
      subsoloCover,
      l2Materials,
      l2Objects,
      subsoloObjects,
    } = sceneRefs.current;

    const hasStoreSelection = Boolean(selectedStore);

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

    // 3. Atualizar Lojas (Dimming Global vs Foco por Piso)
    for (const entry of storeEntries) {
      const telemetry = zonesTelemetry.find((z) => z.zone.id === entry.def.zoneId);
      const score = telemetry?.opportunityScore ?? 65;
      const isZoneSelected = entry.def.zoneId === selectedZoneId;
      const isStorePicked = selectedStore?.label === entry.def.name;
      const segmentMatch =
        activeSegment === 'all' || entry.def.segment === activeSegment;

      if (hasStoreSelection) {
        // F22: Esmaecimento Global (Dimming) — Loja selecionada destacada com emissivo forte; demais esmaecidas para ~0.22
        if (isStorePicked) {
          entry.mat.transparent = false;
          entry.mat.opacity = 1.0;
          entry.mat.emissive.set('#f59e0b');
          entry.mat.emissiveIntensity = 0.85;
          entry.trimMat.emissive.set('#f59e0b');
          entry.trimMat.emissiveIntensity = 0.95;
        } else {
          entry.mat.transparent = true;
          entry.mat.opacity = 0.22;
          entry.mat.emissive.set('#000000');
          entry.mat.emissiveIntensity = 0;
          entry.trimMat.emissive.set('#000000');
          entry.trimMat.emissiveIntensity = 0;
        }
      } else {
        // F23: Foco e Isolamento por Piso
        const isEntryL2 = entry.def.floor === 'L2';
        const isEntrySS = entry.def.floor === 'SS1';
        const isEntryL1 = entry.def.floor === 'L1';

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
          // Subsolo
          if (isEntrySS) {
            entry.mat.transparent = false;
            entry.mat.opacity = 1.0;
          } else {
            entry.mat.transparent = true;
            entry.mat.opacity = 0.10;
          }
        }

        entry.mat.emissive.set(isZoneSelected ? '#E2A83B' : '#000000');
        entry.mat.emissiveIntensity = isZoneSelected ? 0.16 : 0;
        entry.trimMat.emissive.set(isZoneSelected ? '#E2A83B' : '#000000');
        entry.trimMat.emissiveIntensity = isZoneSelected ? 0.22 : 0;
      }

      const badgeText = entry.def.isVacant
        ? 'ESPAÇO VAGO • EXPANSÃO'
        : `${entry.def.sublabel ?? `IQ ${score}`} • IQ ${score}`;
      const prevMat = entry.sprite.material as THREE.SpriteMaterial;
      const nextTex = createSignTexture(
        entry.def.name,
        badgeText,
        entry.def.accent,
        entry.def.tier,
        entry.def.isVacant,
        isStorePicked
      );
      if (prevMat.map) prevMat.map.dispose();
      prevMat.map = nextTex;
      prevMat.needsUpdate = true;
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
    }

    // Rotas
    (['moda', 'mercado', 'gastronomia'] as const).forEach((seg) => {
      const visible = activeSegment === 'all' || activeSegment === seg;
      routeGroups[seg].forEach((obj) => {
        obj.visible = visible;
      });
    });
  }, [floor, showSubsoloXray, zonesTelemetry, selectedZoneId, activeSegment, selectedStore]);

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
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap; // Compatível com Three.js moderno sem warning
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#eaeef5');
    scene.fog = new THREE.Fog('#eaeef5', 70, 185);

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.2, 260);
    camera.position.set(-4, 46, 56);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.15;
    controls.minDistance = 8;
    controls.maxDistance = 128;
    controls.maxPolarAngle = Math.PI / 2 + 0.2;
    controls.target.set(-1, 1, -2);

    const hemiLight = new THREE.HemisphereLight('#ffffff', '#cbd5e1', 1.2);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight('#fffbeb', 1.32);
    dirLight.position.set(28, 56, 34);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const l2Materials: THREE.MeshStandardMaterial[] = [];
    const l2Objects: THREE.Object3D[] = [];
    const subsoloObjects: THREE.Object3D[] = [];

    // === TERRENO BASE (translúcido no modo Raio-X para revelar SS1 e SS2) ===
    const groundMat = new THREE.MeshStandardMaterial({ color: '#e5e7eb', roughness: 0.95 });
    sceneRefs.current.groundMat = groundMat;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(210, 165), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.22, -2);
    ground.receiveShadow = true;
    scene.add(ground);

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
      color: '#f8fafc',
      roughness: 0.38,
      metalness: 0.04,
      transparent: xrayRef.current,
      opacity: xrayRef.current ? 0.28 : 1.0,
    });
    sceneRefs.current.l1DeckMat = l1DeckMat;
    const l1Slab = new THREE.Mesh(l1Geo, l1DeckMat);
    l1Slab.position.set(0, 0.05, 0);
    l1Slab.receiveShadow = true;
    scene.add(l1Slab);

    // Praça de Eventos Oval Central (265,90 m² em frente à Riachuelo)
    const ovalPlaza = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 3.6, 0.14, 28),
      new THREE.MeshStandardMaterial({ color: '#fde68a', roughness: 0.4 })
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
        new THREE.MeshStandardMaterial({ color: '#E2A83B', emissive: '#d97706', emissiveIntensity: 0.3 })
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
      color: '#fefce8',
      roughness: 0.3,
      transparent: true,
      opacity: 0.9,
    });
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
    [
      { x: 9.2, z: 5.8, w: 7.0, d: 4.8 },
      { x: 11.4, z: -4.3, w: 6.0, d: 6.2 },
    ].forEach((b) => {
      const deckMat = new THREE.MeshStandardMaterial({ color: '#fef9c3', transparent: true, opacity: 0.88 });
      l2Materials.push(deckMat);
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(b.w, 0.35, b.d),
        deckMat
      );
      deck.position.set(b.x, l2DeckY - 0.1, b.z);
      scene.add(deck);
      l2Objects.push(deck);
    });

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
      color: '#F59E0B',
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beaconCone = new THREE.Mesh(beaconGeo, beaconConeMat);
    beaconGroup.add(beaconCone);

    // Halo pulsante horizontal no topo/base da loja
    const haloGeo = new THREE.RingGeometry(1.2, 2.5, 32);
    haloGeo.rotateX(-Math.PI / 2);
    const beaconHaloMat = new THREE.MeshBasicMaterial({
      color: '#F59E0B',
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
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

      // Vitrine de Vidro Frontal + Moldura Superior Metálica
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(st.w * 0.86, st.h * 0.62, st.d + 0.06),
        new THREE.MeshStandardMaterial({
          color: st.isVacant ? '#fecdd3' : '#bae6fd',
          transparent: true,
          opacity: 0.36,
          roughness: 0.08,
          metalness: 0.35,
        })
      );
      glass.position.set(st.x, baseY + st.h * 0.36, st.z);
      scene.add(glass);

      const trimMat = new THREE.MeshStandardMaterial({ color: st.accent, roughness: 0.3 });
      const trim = new THREE.Mesh(new THREE.BoxGeometry(st.w + 0.12, 0.24, st.d + 0.12), trimMat);
      trim.position.set(st.x, baseY + st.h + 0.08, st.z);
      scene.add(trim);

      const badgeText = st.isVacant
        ? 'ESPAÇO VAGO • EXPANSÃO'
        : `${st.sublabel ?? `IQ ${score}`} • IQ ${score}`;
      const tex = createSignTexture(st.name, badgeText, st.accent, st.tier, st.isVacant);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));

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

      storeEntries.push({ def: st, mesh, mat, trimMat, sprite });
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
          map: createSignTexture(k.name, 'Quiosque L1', k.accent, 'satellite'),
          transparent: true,
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
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    let animId = 0;
    const startMs = performance.now();

    const animate = () => {
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

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('wheel', onWalkWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      controls.dispose();
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
    if (!selectedStoreName) {
      if (selectedStore) setSelectedStore(null);
      return;
    }
    const hit = searchableItems.find(
      (h) =>
        h.label.toLowerCase() === selectedStoreName.toLowerCase() ||
        h.label.toLowerCase().includes(selectedStoreName.toLowerCase()) ||
        selectedStoreName.toLowerCase().includes(h.label.toLowerCase())
    );
    if (hit && (!selectedStore || selectedStore.label !== hit.label)) {
      handlePickSearchItem(hit);
    }
  }, [selectedStoreName, searchableItems]);

  if (webglUnsupported) {
    return (
      <div className="h-[480px] rounded-2xl bg-slate-100 border border-slate-300 flex items-center justify-center p-6 text-center text-sm text-slate-700">
        Navegador sem WebGL ativo no momento — use a Planta 2D Técnica ou os botões das alas abaixo.
      </div>
    );
  }

  const currentTourStop = GUIDED_TOUR_STOPS[tourStepIndex];

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-300 bg-[#eaeef5] shadow-inner">
      <div
        ref={mountRef}
        className="w-full h-[500px] sm:h-[580px] cursor-grab active:cursor-grabbing"
        aria-label="Maquete 3D fiel à Planta Mix oficial do Capim Dourado Shopping"
      />

      {/* Barra Superior (Modo + Busca Rápida + Zoom) */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto max-w-full">
          <div className="flex flex-wrap items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-stone-200 shadow-md">
            {activeZone && (
              <span className="hidden md:inline-flex px-2.5 py-1 rounded-lg bg-[#111318] text-[#E2A83B] text-[11px] font-extrabold">
                {activeZone.zone.shortName}
              </span>
            )}
            <button
              type="button"
              onClick={() => handleToggleViewMode('orbit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                viewMode === 'orbit' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Compass className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Maquete 3D</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode('walk')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                viewMode === 'walk' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Footprints className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Street View</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (tourActive) {
                  setTourActive(false);
                } else {
                  setTourStepIndex(0);
                  setTourActive(true);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                tourActive
                  ? 'bg-[#E2A83B] text-[#111318] shadow-sm'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
              }`}
            >
              {tourActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{tourActive ? 'Pausar Tour' : 'Tour Guiado'}</span>
            </button>
          </div>

          {/* Busca Rápida de Loja / Quiosque / Vaga */}
          <div className="relative w-full sm:w-80">
            <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-md">
              <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
              <input
                id="map-3d-store-search"
                name="map3dStoreSearch"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar loja, PF, Super Big ou vaga..."
                aria-label="Buscar loja no Mapa 3D"
                className="w-full text-xs text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-20 divide-y divide-slate-100">
                {searchResults.map((hit) => (
                  <button
                    key={hit.label}
                    type="button"
                    onClick={() => handlePickSearchItem(hit)}
                    className="w-full text-left px-3 py-2 hover:bg-amber-50 flex items-center justify-between gap-2 transition"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-extrabold text-slate-900 block truncate">{hit.label}</span>
                      <span className="text-[10px] text-slate-500 block truncate">{hit.subtitle}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold shrink-0">
                      {hit.floor}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Zoom / Reset / Subsolo */}
        <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-md">
          <button
            type="button"
            onClick={() => {
              const next = !showSubsoloXray;
              setTourActive(false);
              setShowSubsoloXray(next);
              setViewMode('orbit');
              onFloorChange(next ? 'SS1' : 'L1');
              actionsRef.current?.resetOrbit(next ? 'SS1' : 'L1', next);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              showSubsoloXray
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Raio-X Subsolo</span>
          </button>
          <button
            type="button"
            aria-label="Aproximar Zoom"
            onClick={() => actionsRef.current?.zoom(0.8)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800"
          >
            <ZoomIn className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Afastar Zoom"
            onClick={() => actionsRef.current?.zoom(1.25)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800"
          >
            <ZoomOut className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Resetar Câmera"
            onClick={() => handleToggleViewMode(viewMode)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Card Flutuante da Loja Clicada/Buscada */}
      {selectedStore && !tourActive && (
        <div className="hidden sm:block absolute top-24 right-3 w-72 bg-[#111318]/95 text-white backdrop-blur-md rounded-2xl border border-[#E2A83B]/40 p-3.5 shadow-xl pointer-events-auto z-10">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#E2A83B] flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {selectedStore.floor} • Portaria {selectedStore.nearestPortal}
              </span>
              <h4 className="text-sm font-extrabold mt-0.5">{selectedStore.label}</h4>
              <p className="text-[11px] text-stone-300 mt-0.5">{selectedStore.subtitle}</p>
            </div>
            <button
              type="button"
              aria-label="Fechar card da loja"
              onClick={() => {
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
              <strong className="text-[#E2A83B] font-extrabold">{activeZone.opportunityScore} pts</strong>
            </div>
          )}
        </div>
      )}

      {/* Overlay do Tour Guiado Automático */}
      {tourActive && (
        <div className="absolute top-24 right-3 left-3 sm:left-auto sm:w-88 bg-[#111318]/95 text-white backdrop-blur-md rounded-2xl border border-[#E2A83B] p-4 shadow-2xl pointer-events-auto z-10">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E2A83B] flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Tour Guiado Capim Dourado
            </span>
            <button
              type="button"
              onClick={() => setTourStepIndex((prev) => (prev + 1) % GUIDED_TOUR_STOPS.length)}
              className="px-2 py-0.5 rounded bg-[#E2A83B] text-[#111318] text-[10px] font-extrabold"
            >
              Próxima →
            </button>
          </div>
          <h4 className="text-xs font-extrabold">{currentTourStop.title}</h4>
          <p className="text-[11px] text-stone-300 mt-1 leading-relaxed">{currentTourStop.description}</p>
        </div>
      )}

      {/* Joypad Street View */}
      {viewMode === 'walk' && (
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-3 pointer-events-none">
          <div className="pointer-events-auto bg-slate-900/90 text-white px-3.5 py-2.5 rounded-xl text-[11px] backdrop-blur-md shadow-lg max-w-sm">
            <strong className="text-amber-400 block mb-0.5">
              Modo Street View Ativo ({floor === 'L1' ? 'Térreo L1' : '2º Piso Curva JK'})
            </strong>
            Arraste para olhar as vitrines • Use <strong>Scroll / W A S D</strong> ou os botões ao lado.
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-lg">
            <button
              type="button"
              aria-label="Virar à esquerda"
              onClick={() => actionsRef.current?.nudgeWalk(0, 0, 0.35)}
              className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
            >
              ↺ Esq
            </button>
            <button
              type="button"
              aria-label="Andar para frente"
              onClick={() => actionsRef.current?.nudgeWalk(3.0, 0, 0)}
              className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1"
            >
              <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Frente</span>
            </button>
            <button
              type="button"
              aria-label="Recuar"
              onClick={() => actionsRef.current?.nudgeWalk(-3.0, 0, 0)}
              className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1"
            >
              <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Virar à direita"
              onClick={() => actionsRef.current?.nudgeWalk(0, 0, -0.35)}
              className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
            >
              Dir ↻
            </button>
            <button
              type="button"
              onClick={() => handleSwitchFloor(floor === 'L1' ? 'L2' : 'L1')}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
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
        <div className="bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Atalhos de Setor 3D">
            {CAMERA_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-800 text-[11px] font-bold transition"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar fluxos por segmento">
            {(
              [
                { id: 'all', label: 'Todos Fluxos', dot: 'bg-slate-700' },
                { id: 'moda', label: 'Moda', dot: 'bg-blue-600' },
                { id: 'mercado', label: 'Subsolo / Mercado', dot: 'bg-emerald-600' },
                { id: 'gastronomia', label: 'Gastronomia / L2', dot: 'bg-amber-600' },
              ] as const
            ).map((seg) => (
              <button
                key={seg.id}
                type="button"
                onClick={() => setActiveSegment(seg.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition border ${
                  activeSegment === seg.id
                    ? 'bg-[#111318] text-white border-[#111318]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
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
