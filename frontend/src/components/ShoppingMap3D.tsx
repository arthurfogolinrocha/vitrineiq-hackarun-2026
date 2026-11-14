import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FloorId, ZoneId } from '../types';
import { ZoneLiveTelemetry } from '../services/opportunityEngine';
import {
  CAMERA_PRESETS,
  GUIDED_TOUR_STOPS,
  L2_DECK_Y,
  SegmentFilter,
} from '../data/capimDourado3DLayout';
import {
  buildSearchableItems,
  createDefaultSceneRefs,
  filterSearchResults,
  Map3DActions,
  Map3DSceneRefs,
  normalizeStoreKey,
  SearchHit,
  ShoppingMap3DProps,
  THEME_PALETTE,
  VisualTheme,
  ZONE_CAMERA_PRESETS,
} from './map3d/map3dConfig';
import { buildMallShell } from './map3d/map3dMallShell';
import {
  animateOverlaysAndLod,
  applySceneVisualState,
  buildBeacon,
  buildHeatmapPoints,
  buildRoutesAndTraffic,
  buildStoresAndKiosks,
  rebuildAllianceArcs,
} from './map3d/map3dStoresAndOverlays';
import {
  disposeThreeScene,
  setupCameraAndInput,
  setupRenderLoopLifecycle,
} from './map3d/map3dControls';
import { Map3DHudOverlay } from './map3d/Map3DHudOverlay';

/**
 * Maquete 3D interativa do Capim Dourado Shopping (Three.js + UnrealBloomPass),
 * com modos Obsidian/Dia, Raio-X do Subsolo, Street View, Tour Guiado e telemetria ao vivo.
 */
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

  const sceneRefs = useRef<Map3DSceneRefs>(createDefaultSceneRefs());
  const actionsRef = useRef<Map3DActions | null>(null);

  const searchableItems = useMemo<SearchHit[]>(() => buildSearchableItems(), []);
  const searchResults = useMemo(
    () => filterSearchResults(searchableItems, searchQuery),
    [searchQuery, searchableItems]
  );

  // Atualiza Tema Obsidian/Dia, Score IQ, Foco por Piso (F23), Destaque/EdgesGeometry e Heatmap sem resetar câmera
  useEffect(() => {
    applySceneVisualState(sceneRefs.current, {
      visualTheme,
      floor,
      showSubsoloXray,
      zonesTelemetry,
      selectedZoneId,
      activeSegment,
      selectedStore,
    });
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
    rebuildAllianceArcs(allianceGroup, alliancePulses, routes, campaigns, visualTheme);
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
      const pair = ZONE_CAMERA_PRESETS[selectedZoneId];
      if (pair) {
        actionsRef.current?.flyTo(pair[0], pair[1]);
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

  // Montagem única do WebGL 3D (dependência [] — zero flicker / perda de câmera)
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
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const initialTheme = visualThemeRef.current;
    const isInitialObsidian = initialTheme === 'obsidian';
    const initialPalette = THEME_PALETTE[initialTheme];
    scene.background = new THREE.Color(initialPalette.bgHex);
    scene.fog = new THREE.Fog(initialPalette.bgHex, initialPalette.fogNear, initialPalette.fogFar);
    scene.environmentIntensity = initialPalette.envIntensity;

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

    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    let outputPass: OutputPass | null = null;
    try {
      composer = new EffectComposer(renderer);
      composer.setPixelRatio(initialDpr);
      composer.setSize(width, height);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.26, 0.25, 0.96);
      bloomPass.enabled = isInitialObsidian;
      outputPass = new OutputPass();
      composer.addPass(bloomPass);
      composer.addPass(outputPass);
    } catch {
      composer = null;
      bloomPass = null;
      outputPass = null;
    }

    const hemiLight = new THREE.HemisphereLight(
      initialPalette.hemiColor,
      initialPalette.hemiGround,
      isInitialObsidian ? 0.85 : 1.2
    );
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(
      initialPalette.dirColor,
      isInitialObsidian ? 1.25 : 1.32
    );
    dirLight.position.set(28, 56, 34);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const shell = buildMallShell(scene, isInitialObsidian, xrayRef.current);
    const beacon = buildBeacon(scene);
    const { interactiveMeshes, storeEntries, kioskEntries } = buildStoresAndKiosks(
      scene,
      zonesRef.current,
      isInitialObsidian,
      initialTheme
    );
    const heatmap = buildHeatmapPoints(scene, zonesRef.current, isInitialObsidian);
    const allianceGroup = new THREE.Group();
    scene.add(allianceGroup);
    const { walkers, routeGroups } = buildRoutesAndTraffic(scene);

    const refs = sceneRefs.current;
    refs.renderer = renderer;
    refs.scene = scene;
    refs.hemiLight = hemiLight;
    refs.dirLight = dirLight;
    refs.bloomPass = bloomPass;
    refs.groundMat = shell.groundMat;
    refs.obsidianGridGroup = shell.obsidianGridGroup;
    refs.l1DeckMat = shell.l1DeckMat;
    refs.ovalPlazaMat = shell.ovalPlazaMat;
    refs.subsoloCover = shell.subsoloCover;
    refs.l2FoodSlabMat = shell.l2FoodSlabMat;
    refs.l2ExtraDeckMats = shell.l2ExtraDeckMats;
    refs.l2Materials = shell.l2Materials;
    refs.l2Objects = shell.l2Objects;
    refs.subsoloObjects = shell.subsoloObjects;
    refs.beaconGroup = beacon.beaconGroup;
    refs.beaconHalo = beacon.beaconHalo;
    refs.beaconCone = beacon.beaconCone;
    refs.storeEntries = storeEntries;
    refs.kioskEntries = kioskEntries;
    refs.heatmapGeo = heatmap.heatmapGeo;
    refs.heatmapMat = heatmap.heatmapMat;
    refs.heatmapMeta = heatmap.heatmapMeta;
    refs.allianceGroup = allianceGroup;
    refs.routeGroups = routeGroups;

    const { controls, actions, updateCameraFrame, cleanupInput } = setupCameraAndInput({
      camera,
      renderer,
      interactiveMeshes,
      sceneRefs,
      viewModeRef,
      floorRef,
      onSelectStoreHit: (hit, targetFloor) => {
        onSelectZoneRef.current(hit.zoneId);
        onFloorChangeRef.current(targetFloor);
        onSelectStoreNameRef.current?.(hit.label);
        setSelectedStore(hit);
      },
    });
    actionsRef.current = actions;

    const { cleanupLifecycle } = setupRenderLoopLifecycle({
      container,
      camera,
      renderer,
      scene,
      composer,
      bloomPass,
      onFrame: (elapsed) => {
        animateOverlaysAndLod({
          elapsed,
          camera,
          refs: sceneRefs.current,
          walkers,
          animatedTreads: shell.animatedTreads,
          elevatorCabins: shell.elevatorCabins,
          curFloor: floorRef.current,
          activeSegment: activeSegmentRef.current,
          selectedZoneId: selectedZoneRef.current,
          selectedStoreName: selectedStoreNameRef.current,
          viewMode: viewModeRef.current,
        });
        updateCameraFrame();
      },
    });

    return () => {
      cleanupLifecycle();
      cleanupInput();
      actionsRef.current = null;
      disposeThreeScene({
        controls,
        scene,
        renderer,
        composer,
        bloomPass,
        outputPass,
        envRT,
        pmremGenerator,
        sceneRefs,
      });
    };
  }, []);

  const focusStoreHit = (hit: SearchHit, notifyStoreName: boolean) => {
    setTourActive(false);
    setViewMode('orbit');
    setSelectedStore(hit);
    if (notifyStoreName) {
      onSelectStoreNameRef.current?.(hit.label);
    }
    setSearchQuery('');
    onSelectZoneRef.current(hit.zoneId);
    const targetFloor: FloorId = hit.floor === 'L2' ? 'L2' : hit.floor === 'SS1' ? 'SS1' : 'L1';
    const isSS1 = hit.floor === 'SS1';
    setShowSubsoloXray(isSS1);
    onFloorChangeRef.current(targetFloor);
    const yBase = hit.floor === 'L2' ? L2_DECK_Y : isSS1 ? -5.0 : 0;
    const itemH = hit.isKiosk ? 1.8 : hit.h;
    actionsRef.current?.flyTo(
      [hit.x - 10, yBase + itemH + 10, hit.z + 15],
      [hit.x, yBase + 1.5, hit.z]
    );
  };

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
        const shouldNotify = Boolean(selectedStoreName && hit.label !== selectedStoreName);
        focusStoreHit(hit, shouldNotify);
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

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border shadow-2xl transition-colors ${
        visualTheme === 'obsidian'
          ? 'border-[#E2A83B]/30 bg-[#080B10]'
          : 'border-slate-300 bg-[#eaeef5]'
      }`}
    >
      <div
        ref={mountRef}
        className="w-full h-[500px] sm:h-[580px] cursor-grab active:cursor-grabbing"
        aria-label="Maquete 3D fiel à Planta Mix oficial do Capim Dourado Shopping"
      />

      <Map3DHudOverlay
        floor={floor}
        activeZone={activeZone}
        visualTheme={visualTheme}
        onToggleTheme={() => setVisualTheme((prev) => (prev === 'obsidian' ? 'day' : 'obsidian'))}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        showSubsoloXray={showSubsoloXray}
        onToggleSubsoloXray={() => {
          const next = !showSubsoloXray;
          setTourActive(false);
          setShowSubsoloXray(next);
          setViewMode('orbit');
          onFloorChange(next ? 'SS1' : 'L1');
          actionsRef.current?.resetOrbit(next ? 'SS1' : 'L1', next);
        }}
        tourActive={tourActive}
        onToggleTour={() => {
          if (tourActive) {
            setTourActive(false);
          } else {
            setTourStepIndex(0);
            setTourActive(true);
          }
        }}
        tourStepIndex={tourStepIndex}
        onNextTourStep={() => setTourStepIndex((prev) => (prev + 1) % GUIDED_TOUR_STOPS.length)}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchResults={searchResults}
        onPickSearchItem={(item) => focusStoreHit(item, true)}
        selectedStore={selectedStore}
        onCloseSelectedStore={() => {
          if (activeTenant) {
            dismissedTenantIdRef.current = activeTenant.id;
          }
          setSelectedStore(null);
          onSelectStoreName?.(null);
        }}
        activeSegment={activeSegment}
        onSelectSegment={setActiveSegment}
        onSelectPreset={handleSelectPreset}
        onSwitchFloor={handleSwitchFloor}
        onZoom={(factor) => actionsRef.current?.zoom(factor)}
        onResetCamera={() => handleToggleViewMode(viewMode)}
        onNudgeWalk={(f, s, y) => actionsRef.current?.nudgeWalk(f, s, y)}
      />
    </div>
  );
};
