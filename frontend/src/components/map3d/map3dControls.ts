import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import type { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { FloorId, ZoneId } from '../../types';
import { L2_DECK_Y, type SegmentFilter } from '../../data/capimDourado3DLayout';
import type {
  Map3DActions,
  Map3DSceneRefs,
  SearchHit,
  WalkState,
} from './map3dConfig';

interface RaycastMeshData {
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
}

export interface SetupCameraAndInputParams {
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  interactiveMeshes: THREE.Mesh[];
  sceneRefs: React.MutableRefObject<Map3DSceneRefs>;
  viewModeRef: React.MutableRefObject<'orbit' | 'walk'>;
  floorRef: React.MutableRefObject<FloorId>;
  onSelectStoreHit: (hit: SearchHit, targetFloor: FloorId) => void;
}

export interface SetupCameraAndInputResult {
  controls: OrbitControls;
  actions: Map3DActions;
  updateCameraFrame: () => void;
  cleanupInput: () => void;
}

export interface SetupRenderLoopParams {
  container: HTMLDivElement;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  composer: EffectComposer | null;
  bloomPass: UnrealBloomPass | null;
  onFrame: (elapsedSeconds: number) => void;
}

export interface DisposeThreeSceneParams {
  controls: OrbitControls;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer | null;
  bloomPass: UnrealBloomPass | null;
  outputPass: OutputPass | null;
  envRT: THREE.WebGLRenderTarget | null;
  pmremGenerator: THREE.PMREMGenerator | null;
  sceneRefs: React.MutableRefObject<Map3DSceneRefs>;
}

/** Descarta um material Three.js e todas as suas texturas associadas. */
export function disposeMaterial(mat: THREE.Material): void {
  for (const value of Object.values(mat)) {
    if (value instanceof THREE.Texture) {
      value.dispose();
    }
  }
  mat.dispose();
}

/** Percorre recursivamente um Object3D descartando geometrias, materiais e texturas. */
export function disposeObjectResources(root: THREE.Object3D): void {
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

/** Configura OrbitControls, Street View (WASD + arrasto + wheel), raycasting e ações de câmera. */
export function setupCameraAndInput({
  camera,
  renderer,
  interactiveMeshes,
  sceneRefs,
  viewModeRef,
  floorRef,
  onSelectStoreHit,
}: SetupCameraAndInputParams): SetupCameraAndInputResult {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = true;
  controls.zoomSpeed = 1.15;
  controls.minDistance = 8;
  controls.maxDistance = 128;
  controls.maxPolarAngle = Math.PI / 2 + 0.2;
  controls.target.set(-1, 1, -2);

  const walkState: WalkState = {
    pos: new THREE.Vector3(-0.8, 1.85, 8.5),
    yaw: Math.PI,
    pitch: 0.02,
    dragging: false,
    lastX: 0,
    lastY: 0,
  };
  const pressedKeys = new Set<string>();

  const clampWalkPos = () => {
    walkState.pos.x = Math.max(-35, Math.min(31, walkState.pos.x));
    walkState.pos.z = Math.max(-29, Math.min(18, walkState.pos.z));
  };

  const syncWalkCamera = () => {
    const targetY = floorRef.current === 'L2' ? L2_DECK_Y + 1.85 : 1.85;
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
    sceneRefs.current.flyTarget = null;
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
        const data = hits[0].object.userData as RaycastMeshData;
        if (data.zoneId) {
          onSelectStoreHit(
            {
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
            },
            data.floor
          );
        }
      }
    }
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

  const actions: Map3DActions = {
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
          camPos: new THREE.Vector3(-44, L2_DECK_Y + 18, 22),
          lookAt: new THREE.Vector3(-21, L2_DECK_Y + 0.8, 0),
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
        walkState.pos.set(-15, L2_DECK_Y + 1.85, 0.5);
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

  const updateCameraFrame = () => {
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
      return;
    }

    if (sceneRefs.current.flyTarget) {
      camera.position.lerp(sceneRefs.current.flyTarget.camPos, 0.08);
      controls.target.lerp(sceneRefs.current.flyTarget.lookAt, 0.08);
      if (camera.position.distanceTo(sceneRefs.current.flyTarget.camPos) < 0.35) {
        sceneRefs.current.flyTarget = null;
      }
    }
    controls.enabled = true;
    controls.update();
  };

  const cleanupInput = () => {
    domEl.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    domEl.removeEventListener('wheel', onWalkWheel);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };

  return { controls, actions, updateCameraFrame, cleanupInput };
}

/**
 * Gerencia o ciclo de animação rAF com pausa automática quando a aba ou viewport
 * estão ocultas, além de resize responsivo limitado a DPR <= 1.5.
 */
export function setupRenderLoopLifecycle({
  container,
  camera,
  renderer,
  scene,
  composer,
  bloomPass,
  onFrame,
}: SetupRenderLoopParams): { cleanupLifecycle: () => void } {
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
  let composerFailed = false;
  const startMs = performance.now();

  const shouldRunLoop = () => !isDisposed && isTabVisible && isInViewport;

  const stopLoop = () => {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = 0;
    }
    isLoopRunning = false;
  };

  const animate = () => {
    if (!shouldRunLoop()) {
      isLoopRunning = false;
      animId = 0;
      return;
    }
    animId = requestAnimationFrame(animate);
    const elapsed = (performance.now() - startMs) * 0.001;
    onFrame(elapsed);

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

  const startLoop = () => {
    if (isLoopRunning || !shouldRunLoop()) return;
    isLoopRunning = true;
    animId = requestAnimationFrame(animate);
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

  const cleanupLifecycle = () => {
    isDisposed = true;
    stopLoop();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    io?.disconnect();
    ro.disconnect();
  };

  return { cleanupLifecycle };
}

/** Executa disposal recursivo completo da cena, pós-processamento, PMREM, controles e renderer. */
export function disposeThreeScene({
  controls,
  scene,
  renderer,
  composer,
  bloomPass,
  outputPass,
  envRT,
  pmremGenerator,
  sceneRefs,
}: DisposeThreeSceneParams): void {
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

  const refs = sceneRefs.current;
  refs.renderer = null;
  refs.scene = null;
  refs.hemiLight = null;
  refs.dirLight = null;
  refs.bloomPass = null;
  refs.l1DeckMat = null;
  refs.subsoloCover = null;
  refs.groundMat = null;
  refs.ovalPlazaMat = null;
  refs.l2FoodSlabMat = null;
  refs.l2ExtraDeckMats = [];
  refs.obsidianGridGroup = null;
  refs.beaconGroup = null;
  refs.beaconHalo = null;
  refs.beaconCone = null;
  refs.l2Materials = [];
  refs.l2Objects = [];
  refs.subsoloObjects = [];
  refs.storeEntries = [];
  refs.kioskEntries = [];
  refs.routeGroups = { moda: [], mercado: [], gastronomia: [] };
  refs.allianceGroup = null;
  refs.alliancePulses = [];
  refs.heatmapGeo = null;
  refs.heatmapMat = null;
  refs.heatmapMeta = [];
  refs.flyTarget = null;

  renderer.renderLists?.dispose();
  renderer.dispose();
}
