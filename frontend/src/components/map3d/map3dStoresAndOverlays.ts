import * as THREE from 'three';
import type { CrossSegmentRoute, FlashCampaign, FloorId, ZoneId } from '../../types';
import type { ZoneLiveTelemetry } from '../../services/opportunityEngine';
import {
  CAPIM_KIOSKS_3D,
  CAPIM_STORES_3D,
  L2_DECK_Y,
  type SegmentFilter,
} from '../../data/capimDourado3DLayout';
import {
  type AlliancePulse,
  type AnimatedTread,
  type CampaignWithOrigin,
  CORRIDOR_HEATMAP_ZONES,
  type ElevatorCabin,
  type FlowWalker,
  type HeatmapParticleMeta,
  type KioskEntry,
  type Map3DSceneRefs,
  normalizeStoreKey,
  resolveCampaignOrigin,
  resolveZoneAnchor,
  type SearchHit,
  type StoreEntry,
  THEME_PALETTE,
  TRAFFIC_CAR_COLORS,
  type VisualTheme,
} from './map3dConfig';
import {
  createSignTexture,
  createSoftParticleTexture,
  syncSignSpriteTexture,
} from './map3dSignage';
import { disposeObjectResources } from './map3dControls';

export interface SceneVisualStateInput {
  visualTheme: VisualTheme;
  floor: FloorId;
  showSubsoloXray: boolean;
  zonesTelemetry: ZoneLiveTelemetry[];
  selectedZoneId: ZoneId;
  activeSegment: SegmentFilter;
  selectedStore: SearchHit | null;
}

export interface AnimateOverlaysParams {
  elapsed: number;
  camera: THREE.Camera;
  refs: Map3DSceneRefs;
  walkers: FlowWalker[];
  animatedTreads: AnimatedTread[];
  elevatorCabins: ElevatorCabin[];
  curFloor: FloorId;
  activeSegment: SegmentFilter;
  selectedZoneId: ZoneId;
  selectedStoreName: string | null;
  viewMode: 'orbit' | 'walk';
}

/** Constrói o beacon 3D luminoso vertical e seu halo pulsante no solo. */
export function buildBeacon(scene: THREE.Scene): {
  beaconGroup: THREE.Group;
  beaconHalo: THREE.Mesh;
  beaconCone: THREE.Mesh;
} {
  const beaconGroup = new THREE.Group();
  const beaconGeo = new THREE.ConeGeometry(1.6, 15.0, 16, 1, true);
  beaconGeo.translate(0, 7.5, 0);
  beaconGeo.rotateX(Math.PI);

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
  return { beaconGroup, beaconHalo, beaconCone };
}

/** Constrói todas as lojas 3D (vitrines, molduras, arestas, letreiros) e os quiosques L1. */
export function buildStoresAndKiosks(
  scene: THREE.Scene,
  zonesTelemetry: ZoneLiveTelemetry[],
  isInitialObsidian: boolean,
  initialTheme: VisualTheme
): {
  interactiveMeshes: THREE.Mesh[];
  storeEntries: StoreEntry[];
  kioskEntries: KioskEntry[];
} {
  const interactiveMeshes: THREE.Mesh[] = [];
  const storeEntries: StoreEntry[] = [];

  CAPIM_STORES_3D.forEach((st) => {
    const baseY = st.floor === 'L2' ? L2_DECK_Y : st.floor === 'SS1' ? -5.0 : 0;
    const telemetry = zonesTelemetry.find((z) => z.zone.id === st.zoneId);
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
      initialTheme
    );
    const spriteMat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      color: new THREE.Color(0.84, 0.84, 0.84),
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.userData.signKey = `${badgeText}|0|${initialTheme}`;

    const signHeightOffset =
      st.tier === 'anchor' ? 1.55 : st.tier === 'megaloja' ? 1.15 : 0.78;
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

  // === QUIOSQUES REAIS DOS CORREDORES L1 ===
  const kioskEntries: KioskEntry[] = [];
  CAPIM_KIOSKS_3D.forEach((k) => {
    const kMat = new THREE.MeshStandardMaterial({
      color: k.accent,
      roughness: 0.35,
      metalness: 0.2,
    });
    const kMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 1.25, 12), kMat);
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
          initialTheme
        ),
        transparent: true,
        color: new THREE.Color(0.84, 0.84, 0.84),
      })
    );
    kSprite.userData.signKey = `0|${initialTheme}`;
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

  return { interactiveMeshes, storeEntries, kioskEntries };
}

/** Constrói a nuvem de ~350 partículas heatmap (THREE.Points) acima dos corredores. */
export function buildHeatmapPoints(
  scene: THREE.Scene,
  zonesTelemetry: ZoneLiveTelemetry[],
  isInitialObsidian: boolean
): {
  heatmapGeo: THREE.BufferGeometry;
  heatmapMat: THREE.PointsMaterial;
  heatmapMeta: HeatmapParticleMeta[];
} {
  const PARTICLE_COUNT = 350;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const heatmapMeta: HeatmapParticleMeta[] = [];
  const scoreByZone = new Map<ZoneId, number>();
  zonesTelemetry.forEach((z) => scoreByZone.set(z.zone.id, z.opportunityScore));

  let seed = 42197;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const cz = CORRIDOR_HEATMAP_ZONES[i % CORRIDOR_HEATMAP_ZONES.length];
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

  return { heatmapGeo, heatmapMat, heatmapMeta };
}

/** Constrói as rotas de fluxo animadas por segmento e os carros trafegando nas avenidas. */
export function buildRoutesAndTraffic(scene: THREE.Scene): {
  walkers: FlowWalker[];
  routeGroups: Record<Exclude<SegmentFilter, 'all'>, THREE.Object3D[]>;
} {
  const walkers: FlowWalker[] = [];
  const routeGroups: Record<Exclude<SegmentFilter, 'all'>, THREE.Object3D[]> = {
    moda: [],
    mercado: [],
    gastronomia: [],
  };

  const routesDefs: Array<{
    seg: Exclude<SegmentFilter, 'all'>;
    color: string;
    points: THREE.Vector3[];
  }> = [
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
        new THREE.Vector3(-16.5, L2_DECK_Y + 0.5, 0.5),
        new THREE.Vector3(-25, L2_DECK_Y + 0.5, -2.5),
        new THREE.Vector3(-25, L2_DECK_Y + 0.5, 2.5),
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
  TRAFFIC_CAR_COLORS.forEach((cColor, ci) => {
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

  return { walkers, routeGroups };
}

/** Reconstrói os arcos Bézier 3D "Aliança de Corredor" descartando os anteriores. */
export function rebuildAllianceArcs(
  allianceGroup: THREE.Group,
  alliancePulses: AlliancePulse[],
  routes: CrossSegmentRoute[],
  campaigns: FlashCampaign[],
  visualTheme: VisualTheme
): void {
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
}

function applyFloorSurfaceOpacity(
  mat: THREE.MeshStandardMaterial | null,
  isSubsolo: boolean,
  isL2: boolean
): void {
  if (!mat) return;
  if (isSubsolo) {
    mat.transparent = true;
    mat.opacity = 0.2;
  } else if (isL2) {
    mat.transparent = true;
    mat.opacity = 0.35;
  } else {
    mat.transparent = false;
    mat.opacity = 1.0;
  }
  mat.needsUpdate = true;
}

/**
 * Atualiza Tema Obsidian/Dia, Beacon 3D, Foco por Piso, Destaque/EdgesGeometry das lojas
 * e cores/opacidade do Heatmap sem reiniciar a câmera.
 */
export function applySceneVisualState(
  refs: Map3DSceneRefs,
  {
    visualTheme,
    floor,
    showSubsoloXray,
    zonesTelemetry,
    selectedZoneId,
    activeSegment,
    selectedStore,
  }: SceneVisualStateInput
): void {
  const isObsidian = visualTheme === 'obsidian';
  const palette = THEME_PALETTE[visualTheme];
  const hasStoreSelection = Boolean(selectedStore);

  // 0. Modo Visual Obsidian vs Dia
  if (refs.scene) {
    refs.scene.background = new THREE.Color(palette.bgHex);
    refs.scene.fog = new THREE.Fog(palette.bgHex, palette.fogNear, palette.fogFar);
    refs.scene.environmentIntensity = palette.envIntensity;
  }
  if (refs.renderer) {
    refs.renderer.toneMappingExposure = palette.exposure;
  }
  if (refs.bloomPass) {
    refs.bloomPass.enabled = isObsidian;
  }
  if (refs.hemiLight) {
    refs.hemiLight.color.set(palette.hemiColor);
    refs.hemiLight.groundColor.set(palette.hemiGround);
    refs.hemiLight.intensity = palette.hemiIntensity;
  }
  if (refs.dirLight) {
    refs.dirLight.color.set(palette.dirColor);
    refs.dirLight.intensity = palette.dirIntensity;
  }
  if (refs.obsidianGridGroup) {
    refs.obsidianGridGroup.visible = isObsidian;
  }
  if (refs.ovalPlazaMat) {
    refs.ovalPlazaMat.color.set(palette.ovalPlazaColor);
  }

  // 1. Atualizar Beacon 3D Luminoso Vertical e Halo (F22)
  if (refs.beaconGroup) {
    if (hasStoreSelection && selectedStore) {
      const yBase =
        selectedStore.floor === 'L2' ? L2_DECK_Y : selectedStore.floor === 'SS1' ? -5.0 : 0;
      const hOffset = selectedStore.isKiosk ? 1.8 : selectedStore.h;
      refs.beaconGroup.position.set(selectedStore.x, yBase + hOffset, selectedStore.z);
      refs.beaconGroup.visible = true;
    } else {
      refs.beaconGroup.visible = false;
    }
  }

  // 2. Foco e Isolamento por Piso (F23)
  const isSubsolo = floor === 'SS1' || showSubsoloXray;
  const isL2 = floor === 'L2';
  const isL1 = floor === 'L1' && !isSubsolo;

  if (refs.l1DeckMat) {
    refs.l1DeckMat.color.set(palette.l1Color);
    refs.l1DeckMat.roughness = palette.l1Roughness;
    refs.l1DeckMat.metalness = palette.l1Metalness;
    applyFloorSurfaceOpacity(refs.l1DeckMat, isSubsolo, isL2);
  }
  if (refs.groundMat) {
    refs.groundMat.color.set(palette.groundColor);
    applyFloorSurfaceOpacity(refs.groundMat, isSubsolo, isL2);
  }

  if (refs.subsoloCover) {
    refs.subsoloCover.visible = !isSubsolo;
  }
  refs.subsoloObjects.forEach((obj) => {
    obj.visible = isSubsolo;
  });

  if (refs.l2FoodSlabMat) {
    refs.l2FoodSlabMat.color.set(palette.l2FoodSlabColor);
  }
  refs.l2ExtraDeckMats.forEach((m) => {
    m.color.set(palette.l2ExtraDeckColor);
  });

  refs.l2Materials.forEach((mat) => {
    if (isL2) {
      mat.transparent = false;
      mat.opacity = 1.0;
    } else {
      // Térreo (L1) ou Subsolo: L2 esmaecido/fantasma para dar visibilidade total ao L1
      mat.transparent = true;
      mat.opacity = 0.08;
    }
    mat.needsUpdate = true;
  });

  refs.l2Objects.forEach((obj) => {
    obj.visible = !isSubsolo;
  });

  // 3. Atualizar Lojas (Dimming Global vs Foco por Piso + EdgesGeometry luminosa)
  for (const entry of refs.storeEntries) {
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
        entry.mat.transparent = isEntryL1 ? !segmentMatch : true;
        entry.mat.opacity = isEntryL1 ? (segmentMatch ? 1.0 : 0.24) : 0.08;
      } else if (isL2) {
        entry.mat.transparent = isEntryL2 ? !segmentMatch : true;
        entry.mat.opacity = isEntryL2 ? (segmentMatch ? 1.0 : 0.24) : 0.18;
      } else {
        entry.mat.transparent = !isEntrySS;
        entry.mat.opacity = isEntrySS ? 1.0 : 0.1;
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
          isObsidian ? 0.28 : 0.1
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
    syncSignSpriteTexture(entry.sprite, signKey, {
      title: entry.def.name,
      badge: badgeText,
      accent: entry.def.accent,
      tier: entry.def.tier,
      isVacant: entry.def.isVacant,
      isHighlighted: isStorePicked,
      theme: visualTheme,
    });
  }

  // 4. Quiosques dos Corredores (F22 e F23)
  for (const k of refs.kioskEntries) {
    const isKioskPicked = selectedStore?.label === k.def.name;
    if (hasStoreSelection) {
      if (isKioskPicked) {
        k.mat.transparent = false;
        k.mat.opacity = 1.0;
        k.mat.emissive.set('#f59e0b');
        k.mat.emissiveIntensity = 0.85;
      } else {
        k.mat.transparent = true;
        k.mat.opacity = 0.2;
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
        k.mat.opacity = 0.1;
      }
      k.mat.emissive.set('#000000');
      k.mat.emissiveIntensity = 0;
    }

    const kSignKey = `${isKioskPicked ? '1' : '0'}|${visualTheme}`;
    syncSignSpriteTexture(k.sprite, kSignKey, {
      title: k.def.name,
      badge: 'Quiosque L1',
      accent: k.def.accent,
      tier: 'satellite',
      isVacant: false,
      isHighlighted: isKioskPicked,
      theme: visualTheme,
    });
  }

  // 5. Rotas
  (['moda', 'mercado', 'gastronomia'] as const).forEach((seg) => {
    const visible = activeSegment === 'all' || activeSegment === seg;
    refs.routeGroups[seg].forEach((obj) => {
      obj.visible = visible;
    });
  });

  // 6. Nuvem de Partículas Heatmap (âmbar/dourado para IQ >= 75, ciano/esmeralda nas demais)
  if (refs.heatmapGeo && refs.heatmapMeta.length > 0) {
    const colorAttr = refs.heatmapGeo.getAttribute('color') as THREE.BufferAttribute | undefined;
    if (colorAttr) {
      const arr = colorAttr.array as Float32Array;
      const scoreMap = new Map<ZoneId, number>();
      zonesTelemetry.forEach((z) => scoreMap.set(z.zone.id, z.opportunityScore));

      for (let i = 0; i < refs.heatmapMeta.length; i++) {
        const score = scoreMap.get(refs.heatmapMeta[i].zoneId) ?? 65;
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
  if (refs.heatmapMat) {
    refs.heatmapMat.opacity = isSubsolo ? 0.25 : palette.heatmapOpacity;
  }
}

/** Atualiza animações por frame (fluxos, heatmap, arcos, esteiras, beacon, elevadores e LOD). */
export function animateOverlaysAndLod({
  elapsed,
  camera,
  refs,
  walkers,
  animatedTreads,
  elevatorCabins,
  curFloor,
  activeSegment,
  selectedZoneId,
  selectedStoreName,
  viewMode,
}: AnimateOverlaysParams): void {
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
  if (refs.heatmapGeo && refs.heatmapMeta.length > 0) {
    const posAttr = refs.heatmapGeo.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const meta = refs.heatmapMeta;
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
  for (const pulse of refs.alliancePulses) {
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
      // X(t) = -9.5 - 8.0 * t | Y(t) = 0.18 + t * L2_DECK_Y
      const t = ((elapsed * 0.35 + tr.phase) % 1 + 1) % 1;
      tr.mesh.position.x = -9.5 - 8.0 * t;
      tr.mesh.position.y = 0.18 + t * L2_DECK_Y;
    }
  }

  // Animação da pulsação do Beacon e Halo (F22)
  if (refs.beaconGroup?.visible) {
    const pulse = 1.0 + 0.18 * Math.sin(elapsed * 5.0);
    if (refs.beaconHalo) {
      refs.beaconHalo.scale.set(pulse, pulse, pulse);
      (refs.beaconHalo.material as THREE.MeshBasicMaterial).opacity =
        0.7 + 0.25 * Math.cos(elapsed * 5.0);
    }
    if (refs.beaconCone) {
      (refs.beaconCone.material as THREE.MeshBasicMaterial).opacity =
        0.55 + 0.25 * Math.sin(elapsed * 4.0);
    }
  }

  elevatorCabins.forEach((el, idx) => {
    const wave = (Math.sin(elapsed * 0.65 + idx * 1.8) + 1) / 2;
    el.cabin.position.y = el.yStart + 1.0 + wave * Math.max(1, el.h - 2.2);
  });

  // LOD por distância + Anti-Sobreposição de letreiros com Foco por Piso (F23)
  const camPos = camera.position;
  for (const entry of refs.storeEntries) {
    const spr = entry.sprite;
    const dist = camPos.distanceTo(spr.position);
    const isPicked = selectedStoreName === entry.def.name;
    const segOk = activeSegment === 'all' || entry.def.segment === activeSegment;
    const isZone = entry.def.zoneId === selectedZoneId;

    let visible = segOk;
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
      const opacity = !segOk
        ? 0.2
        : entry.def.tier === 'satellite' && dist > 38 && !isZone
        ? 0.55
        : 1.0;
      (spr.material as THREE.SpriteMaterial).opacity = opacity;
    }
  }

  for (const k of refs.kioskEntries) {
    const dist = camPos.distanceTo(k.pos);
    const segOk = activeSegment === 'all' || k.segment === activeSegment;
    const isPicked = selectedStoreName === k.def.name;
    const floorOk = curFloor === 'L1' || isPicked;
    k.sprite.visible = segOk && floorOk && (dist < 36 || isPicked || viewMode === 'walk');
  }
}
