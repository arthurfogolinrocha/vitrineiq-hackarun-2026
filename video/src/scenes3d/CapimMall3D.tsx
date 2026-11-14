import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { RoundedBox } from '@react-three/drei';
import { MALL_BLOCKS, CORRIDOR_FLOW_NODES } from './mallData';
import {
  AnchorStoreSignage3D,
  BezierDataStreams,
  CapimCurvedAtriumRoof,
  CapimEnvironmentAndPost,
  SubsoloXRayLayer,
} from './MallEnhancements3D';

export interface Mall3DStageProps {
  cameraMode:
    | 'cold-open-dive'
    | 'reveal-dolly'
    | 'tour-l1-to-l2'
    | 'showcase-vitrine'
    | 'crowddrop-aerial'
    | 'concierge-totem'
    | 'outro';
  localFrame: number;
  showScanner?: boolean;
  showCrowdDropWave?: boolean;
  showGlassTotem?: boolean;
  /** Em cenas de dor/alerta, partículas de fluxo ficam em vermelho/cinza representando perda */
  flowMood?: 'loss' | 'live' | 'gold';
}

const FLOOR_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FLOOR_FRAGMENT = /* glsl */ `
  uniform float uWaveProgress;
  uniform float uWaveActive;
  uniform float uLossMode;
  uniform vec2 uOrigin;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vec2 coord = vWorldPos.xz * 0.5;
    vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
    float line = 1.0 - min(min(grid.x, grid.y), 1.0);

    vec2 majorCoord = vWorldPos.xz * 0.1;
    vec2 majorGrid = abs(fract(majorCoord - 0.5) - 0.5) / fwidth(majorCoord);
    float majorLine = 1.0 - min(min(majorGrid.x, majorGrid.y), 1.0);

    vec3 bg = vec3(0.024, 0.028, 0.044);
    vec3 gridCol = vec3(0.13, 0.17, 0.26);
    vec3 goldCol = vec3(0.98, 0.74, 0.25);
    vec3 cyanCol = vec3(0.14, 0.85, 0.96);
    vec3 roseCol = vec3(0.96, 0.24, 0.37);

    vec3 col = mix(bg, gridCol, line * 0.34 + majorLine * 0.62);

    float edgeDist = length(vWorldPos.xz) / 62.0;
    float radialFade = clamp(1.0 - smoothstep(0.52, 1.0, edgeDist), 0.0, 1.0);
    col *= radialFade;

    // Artérias principais iluminadas do shopping (eixo corredor central + transversal P3)
    float mainAxis = exp(-abs(vWorldPos.z - 2.0) * 0.42) * exp(-abs(vWorldPos.x) * 0.032);
    float crossAxis = exp(-abs(vWorldPos.x - 1.5) * 0.42) * exp(-abs(vWorldPos.z) * 0.055);
    vec3 axisColor = uLossMode > 0.5 ? roseCol : cyanCol;
    col += axisColor * (mainAxis * 0.22 + crossAxis * 0.16) * (0.75 + 0.25 * sin(uTime * 3.0));

    if (uWaveActive > 0.5) {
      float d = distance(vWorldPos.xz, uOrigin);
      float r1 = uWaveProgress * 46.0;
      float ring1 = 1.0 - smoothstep(0.0, 2.6, abs(d - r1));
      float r2 = max(0.0, (uWaveProgress - 0.16)) * 46.0;
      float ring2 = (1.0 - smoothstep(0.0, 1.9, abs(d - r2))) * 0.72;
      float r3 = max(0.0, (uWaveProgress - 0.32)) * 46.0;
      float ring3 = (1.0 - smoothstep(0.0, 1.4, abs(d - r3))) * 0.48;

      float innerGlow = (1.0 - smoothstep(r1 - 14.0, r1, d)) * smoothstep(0.0, 4.5, r1 - d) * 0.18;
      col += goldCol * (pow(ring1, 1.6) * 1.6 + pow(ring2, 1.7) + pow(ring3, 1.8) + innerGlow) * radialFade;
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

function CameraController({
  cameraMode,
  localFrame,
  fps,
}: {
  cameraMode: Mall3DStageProps['cameraMode'];
  localFrame: number;
  fps: number;
}) {
  const { camera } = useThree();
  const t = localFrame / fps;
  const easeExpo = Easing.bezier(0.16, 1, 0.3, 1);
  const perspCam = camera as THREE.PerspectiveCamera;
  const breath = Math.sin(t * 2.2) * 0.12;

  if (cameraMode === 'cold-open-dive') {
    const p = interpolate(localFrame, [0, 210], [0, 1], {
      easing: easeExpo,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const cz = interpolate(p, [0, 1], [34, 13.5]);
    const cx = interpolate(p, [0, 1], [-14, 1.5]);
    const cy = interpolate(p, [0, 1], [15, 4.6]) + breath;
    perspCam.fov = interpolate(p, [0, 1], [38, 52]);
    perspCam.updateProjectionMatrix();
    camera.position.set(cx, cy, cz);
    camera.lookAt(0, 1.6, -2.5);
  } else if (cameraMode === 'reveal-dolly') {
    const p = interpolate(localFrame, [0, 420], [0, 1], {
      easing: easeExpo,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const angle = interpolate(p, [0, 1], [-0.58, 0.38]);
    const radius = interpolate(p, [0, 1], [52, 33]);
    const height = interpolate(p, [0, 1], [27, 15.5]) + breath;
    perspCam.fov = interpolate(p, [0, 1], [36, 48]);
    perspCam.updateProjectionMatrix();
    camera.position.set(Math.sin(angle) * radius, height, Math.cos(angle) * radius);
    camera.lookAt(0, 1.8, -1.5);
  } else if (cameraMode === 'tour-l1-to-l2') {
    const p = interpolate(localFrame, [0, 560], [0, 1], {
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    // Sobe do corredor L1 em direção à Praça L2 elevada
    const angle = interpolate(p, [0, 0.5, 1], [-0.45, 0.08, 0.55]);
    const radius = interpolate(p, [0, 0.5, 1], [36, 22, 31]);
    const height = interpolate(p, [0, 0.5, 1], [6.5, 11.5, 19.5]) + breath;
    perspCam.fov = 44;
    perspCam.updateProjectionMatrix();
    camera.position.set(Math.sin(angle) * radius - 3, height, Math.cos(angle) * radius);
    camera.lookAt(-3.5, interpolate(p, [0, 1], [1.4, 4.2]), -1.5);
  } else if (cameraMode === 'showcase-vitrine') {
    const p = interpolate(localFrame, [0, 460], [0, 1], {
      easing: easeExpo,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    perspCam.fov = 42;
    perspCam.updateProjectionMatrix();
    camera.position.set(interpolate(p, [0, 1], [-12, 2.8]), interpolate(p, [0, 1], [9.5, 6.2]) + breath, interpolate(p, [0, 1], [16, 10.5]));
    camera.lookAt(-1.8, 1.8, -1.2);
  } else if (cameraMode === 'crowddrop-aerial') {
    const p = interpolate(localFrame, [0, 480], [0, 1], {
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const angle = interpolate(p, [0, 1], [0.28, -0.36]);
    const radius = interpolate(p, [0, 1], [46, 34]);
    const height = interpolate(p, [0, 1], [28, 19]) + breath;
    perspCam.fov = 44;
    perspCam.updateProjectionMatrix();
    camera.position.set(Math.sin(angle) * radius, height, Math.cos(angle) * radius);
    camera.lookAt(1.5, 1.2, -2.0);
  } else if (cameraMode === 'concierge-totem') {
    perspCam.fov = 42;
    perspCam.updateProjectionMatrix();
    const sway = Math.sin(t * 1.1) * 1.3;
    camera.position.set(sway, 5.8 + breath * 0.5, 21.4);
    camera.lookAt(0, 5.2, 12.6);
  } else {
    const p = interpolate(localFrame, [0, 520], [0, 1], {
      easing: easeExpo,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    perspCam.fov = 42;
    perspCam.updateProjectionMatrix();
    const angle = interpolate(p, [0, 1], [-0.15, 0.72]);
    const radius = interpolate(p, [0, 1], [34, 52]);
    camera.position.set(Math.sin(angle) * radius, 21 + breath, Math.cos(angle) * radius);
    camera.lookAt(0, 1.5, -2);
  }

  return null;
}

function FloorShaderPlane({
  localFrame,
  fps,
  showCrowdDropWave,
  flowMood,
}: {
  localFrame: number;
  fps: number;
  showCrowdDropWave: boolean;
  flowMood: 'loss' | 'live' | 'gold';
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: FLOOR_VERTEX,
        fragmentShader: FLOOR_FRAGMENT,
        uniforms: {
          uWaveProgress: { value: 0 },
          uWaveActive: { value: 0 },
          uLossMode: { value: 0 },
          uOrigin: { value: new THREE.Vector2(1.5, 1.5) },
          uTime: { value: 0 },
        },
      }),
    []
  );

  material.uniforms.uWaveActive.value = showCrowdDropWave ? 1.0 : 0.0;
  material.uniforms.uLossMode.value = flowMood === 'loss' ? 1.0 : 0.0;
  material.uniforms.uWaveProgress.value = (localFrame % 160) / 160;
  material.uniforms.uTime.value = localFrame / fps;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} material={material}>
      <planeGeometry args={[140, 140]} />
    </mesh>
  );
}

// 90 partículas determinísticas percorrendo corredores do Capim Dourado Shopping
const STREAM_AGENTS = Array.from({ length: 84 }, (_, i) => ({
  lane: i % 3,
  offset: (i / 84) * 56,
  speed: 6.5 + (i % 5) * 1.4,
  zJitter: ((i % 7) - 3) * 0.65,
  inStore: i % 4 === 0,
}));

function ShopperLightStreams({
  frame,
  fps,
  flowMood,
}: {
  frame: number;
  fps: number;
  flowMood: 'loss' | 'live' | 'gold';
}) {
  const t = frame / fps;
  return (
    <group>
      {STREAM_AGENTS.map((ag, i) => {
        const progress = ((ag.offset + t * ag.speed) % 56) - 28;
        let px = progress;
        let pz = 2.0 + ag.zJitter;
        if (ag.lane === 1) {
          // Corredor P3 transversal
          px = 1.5 + ag.zJitter * 0.9;
          pz = ((ag.offset + t * ag.speed) % 30) - 14;
        } else if (ag.lane === 2) {
          // Rampa L2
          px = -14 + Math.cos((t * 0.8 + i) % (Math.PI * 2)) * 6.5;
          pz = Math.sin((t * 0.8 + i) % (Math.PI * 2)) * 4.5;
        }
        const py = ag.lane === 2 ? 4.4 + Math.sin(t * 2 + i) * 0.12 : 0.65 + Math.sin(t * 3 + i) * 0.1;
        const color =
          flowMood === 'loss'
            ? i % 3 === 0
              ? '#F43F5E'
              : '#64748B'
            : flowMood === 'gold'
              ? i % 2 === 0
                ? '#FBBF24'
                : '#E2A83B'
              : ag.inStore
                ? '#FBBF24'
                : '#22D3EE';

        return (
          <mesh key={i} position={[px, py, pz]}>
            <sphereGeometry args={[flowMood === 'gold' ? 0.3 : 0.24, 10, 10]} />
            <meshBasicMaterial color={color} transparent opacity={flowMood === 'loss' ? 0.82 : 0.94} />
          </mesh>
        );
      })}
      {CORRIDOR_FLOW_NODES.map(([nx, nz], idx) => (
        <mesh key={`node-${idx}`} position={[nx, 0.12, nz]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.72, 24]} />
          <meshBasicMaterial
            color={flowMood === 'loss' ? '#F43F5E' : '#22D3EE'}
            transparent
            opacity={0.4 + 0.25 * Math.sin(t * 3 + idx)}
          />
        </mesh>
      ))}
    </group>
  );
}

function MallArchitecture({
  localFrame,
  fps,
  showCrowdDropWave,
  flowMood,
}: {
  localFrame: number;
  fps: number;
  showCrowdDropWave: boolean;
  flowMood: 'loss' | 'live' | 'gold';
}) {
  const t = localFrame / fps;
  const waveRadius = ((localFrame % 160) / 160) * 46.0;

  return (
    <group>
      {/* Placa base metálica do complexo */}
      <mesh position={[0, -0.16, -3]}>
        <boxGeometry args={[72, 0.26, 46]} />
        <meshStandardMaterial color="#090c14" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Mezanino L2 (Praça de Alimentação) com vidro luminoso e escada rolante */}
      <group position={[-14.5, 3.85, 0.5]}>
        <RoundedBox args={[14.5, 0.32, 11.5]} radius={0.16} smoothness={4}>
          <meshPhysicalMaterial
            color="#111624"
            metalness={0.4}
            roughness={0.12}
            clearcoat={1}
            transparent
            opacity={0.76}
          />
        </RoundedBox>
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[14.6, 0.05, 11.6]} />
          <meshBasicMaterial color="#E2A83B" wireframe transparent opacity={0.48} />
        </mesh>
      </group>

      {/* Escada Rolante L1 -> L2 com trilhos dourados brilhantes */}
      <group position={[-6.4, 2.0, 2.4]} rotation={[0, 0, 0.36]}>
        <mesh>
          <boxGeometry args={[6.4, 0.24, 1.65]} />
          <meshStandardMaterial color="#1e2436" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.22, 0.78]}>
          <boxGeometry args={[6.4, 0.14, 0.08]} />
          <meshBasicMaterial color="#FBBF24" />
        </mesh>
        <mesh position={[0, 0.22, -0.78]}>
          <boxGeometry args={[6.4, 0.14, 0.08]} />
          <meshBasicMaterial color="#FBBF24" />
        </mesh>
      </group>

      {/* Anéis holográficos flutuantes sobre Praça Central (Portal de Dados VitrineIQ) */}
      <group position={[1.5, 0.18, 1.5]} rotation={[-Math.PI / 2, 0, t * 0.4]}>
        <mesh>
          <ringGeometry args={[3.4, 3.65, 48]} />
          <meshBasicMaterial
            color={flowMood === 'loss' ? '#F43F5E' : '#E2A83B'}
            transparent
            opacity={0.65}
          />
        </mesh>
        <mesh position={[0, 0, 0.2]}>
          <ringGeometry args={[5.1, 5.24, 48]} />
          <meshBasicMaterial color="#22D3EE" transparent opacity={0.45} />
        </mesh>
      </group>

      {/* Blocos arquitetônicos das Lojas Reais */}
      {MALL_BLOCKS.map((b, idx) => {
        const rise = spring({
          frame: Math.max(0, localFrame - (idx % 10) * 2),
          fps,
          config: { damping: 18, stiffness: 120, mass: 0.85 },
        });
        const distFromWave = Math.hypot(b.x - 1.5, b.z - 1.5);
        const waveHit = showCrowdDropWave
          ? Math.max(0, 1 - Math.abs(distFromWave - waveRadius) / 6.5)
          : 0;

        const isGlassFood = b.tier === 'food';
        const baseColor =
          b.tier === 'vacant'
            ? '#2e101c'
            : b.tier === 'anchor'
              ? '#151c2e'
              : isGlassFood
                ? '#20190d'
                : '#101522';

        const emissiveCol =
          flowMood === 'loss'
            ? b.tier === 'anchor'
              ? '#F43F5E'
              : '#475569'
            : showCrowdDropWave && (waveHit > 0.08 || b.tier === 'vacant')
              ? b.tier === 'vacant'
                ? '#F43F5E'
                : '#FBBF24'
              : b.accent;

        const emissivePower =
          showCrowdDropWave && waveHit > 0.08
            ? 0.55 + waveHit * 1.5
            : b.tier === 'anchor'
              ? 0.32
              : b.tier === 'vacant'
                ? 0.65
                : 0.14;

        const currentH = Math.max(0.22, b.h * rise);
        const posY = (b.y ?? 0) + currentH / 2;

        return (
          <group key={b.name} position={[b.x, posY, b.z]}>
            <mesh>
              <boxGeometry args={[b.w, currentH, b.d]} />
              <meshPhysicalMaterial
                color={baseColor}
                metalness={0.86}
                roughness={0.18}
                clearcoat={0.8}
                emissive={emissiveCol}
                emissiveIntensity={emissivePower * 0.45}
                transparent={isGlassFood}
                opacity={isGlassFood ? 0.52 : 1}
              />
            </mesh>
            {/* Topo luminoso da fachada */}
            <mesh position={[0, currentH / 2 + 0.035, 0]}>
              <boxGeometry args={[b.w * 0.99, 0.07, b.d * 0.99]} />
              <meshBasicMaterial color={emissiveCol} transparent opacity={0.68 + waveHit * 0.32} />
            </mesh>
            {/* Borda wireframe CAD futurista */}
            <mesh>
              <boxGeometry args={[b.w + 0.05, currentH + 0.05, b.d + 0.05]} />
              <meshBasicMaterial
                color={emissiveCol}
                wireframe
                transparent
                opacity={isGlassFood ? 0.36 : 0.18 + waveHit * 0.42}
              />
            </mesh>

            {/* Pilar vertical holográfico de demanda sobre grandes âncoras */}
            {b.tier === 'anchor' && flowMood !== 'loss' && (
              <mesh position={[0, currentH / 2 + 2.2, 0]}>
                <cylinderGeometry args={[0.08, 0.22, 4.2, 12]} />
                <meshBasicMaterial
                  color={b.accent}
                  transparent
                  opacity={0.32 + 0.15 * Math.sin(t * 3 + idx)}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function VolumetricVitrineScanner({ localFrame }: { localFrame: number }) {
  const sweep = interpolate(localFrame % 130, [0, 65, 130], [-5.8, 5.8, -5.8], {
    easing: Easing.inOut(Easing.sin),
  });

  return (
    <group position={[0.2, 2.2, -1.8]}>
      <mesh position={[sweep, 0, 0]}>
        <boxGeometry args={[0.16, 5.8, 7.6]} />
        <meshBasicMaterial
          color="#22D3EE"
          transparent
          opacity={0.78}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[sweep, -2.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.0, 7.8]} />
        <meshBasicMaterial
          color="#22D3EE"
          transparent
          opacity={0.32}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[-1.4, -0.5, 3.3]}>
        <boxGeometry args={[1.4, 2.2, 1.4]} />
        <meshBasicMaterial color="#10B981" wireframe transparent opacity={0.92} />
      </mesh>
      <mesh position={[1.9, -0.5, 3.1]}>
        <boxGeometry args={[1.4, 2.2, 1.4]} />
        <meshBasicMaterial color="#FBBF24" wireframe transparent opacity={0.92} />
      </mesh>
    </group>
  );
}

const QR_MATRIX_BLOCKS: Array<[number, number, number]> = [
  [-0.55, 0.55, 0.34], [0.55, 0.55, 0.34], [-0.55, -0.55, 0.34],
  [-0.08, 0.55, 0.16], [0.18, 0.32, 0.16], [-0.22, 0.10, 0.18],
  [0.08, -0.05, 0.22], [0.46, 0.05, 0.18], [-0.15, -0.45, 0.16],
  [0.24, -0.42, 0.18], [0.56, -0.52, 0.18], [0.02, 0.28, 0.14],
];

function GlassConciergeTotem({ localFrame, fps }: { localFrame: number; fps: number }) {
  const rotY = interpolate(localFrame, [0, 320], [-0.36, 0.36], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const enter = spring({ frame: localFrame, fps, config: { damping: 18, stiffness: 95 } });
  const floatY = Math.sin((localFrame / fps) * 2.0) * 0.2;
  const pulseScale = 1 + Math.sin((localFrame / fps) * 4.5) * 0.04;

  return (
    <group position={[0, 5.2 * enter + floatY, 12.6]} rotation={[0.05, rotY, 0]}>
      <RoundedBox args={[3.4, 6.2, 0.28]} radius={0.32} smoothness={4}>
        <meshStandardMaterial color="#141824" metalness={0.92} roughness={0.18} />
      </RoundedBox>
      <RoundedBox args={[3.52, 6.32, 0.16]} radius={0.34} smoothness={4} position={[0, 0, -0.02]}>
        <meshBasicMaterial color="#E2A83B" transparent opacity={0.68} />
      </RoundedBox>
      <RoundedBox args={[3.1, 5.85, 0.12]} radius={0.24} smoothness={4} position={[0, 0, 0.16]}>
        <meshPhysicalMaterial
          color="#0b1222"
          metalness={0.25}
          roughness={0.08}
          clearcoat={1}
          transparent
          opacity={0.94}
        />
      </RoundedBox>
      <group position={[0, 0.45, 0.24]} scale={[pulseScale, pulseScale, 1]}>
        <mesh>
          <planeGeometry args={[1.95, 1.95]} />
          <meshBasicMaterial color="#08090D" transparent opacity={0.92} />
        </mesh>
        {QR_MATRIX_BLOCKS.map(([qx, qy, qs], i) => (
          <mesh key={i} position={[qx, qy, 0.02]}>
            <planeGeometry args={[qs, qs]} />
            <meshBasicMaterial color={i < 3 ? '#E2A83B' : '#22D3EE'} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.03]}>
          <ringGeometry args={[1.12, 1.22, 48]} />
          <meshBasicMaterial color="#E2A83B" transparent opacity={0.9} />
        </mesh>
      </group>
      <RoundedBox args={[2.3, 0.65, 0.04]} radius={0.12} smoothness={2} position={[0, -1.65, 0.24]}>
        <meshBasicMaterial color="#10B981" transparent opacity={0.9} />
      </RoundedBox>
    </group>
  );
}

const PARTICLE_COORDS = Array.from({ length: 56 }, (_, i) => ({
  x: ((i * 37) % 62) - 31,
  y: ((i * 19) % 16) + 1.2,
  z: ((i * 29) % 42) - 21,
  speed: 0.45 + (i % 5) * 0.2,
  gold: i % 3 === 0,
}));

function DeterministicParticles({
  frame,
  fps,
  flowMood,
}: {
  frame: number;
  fps: number;
  flowMood: 'loss' | 'live' | 'gold';
}) {
  const t = frame / fps;
  return (
    <group>
      {PARTICLE_COORDS.map((p, i) => (
        <mesh key={i} position={[p.x, p.y + Math.sin(t * p.speed + i) * 0.5, p.z]}>
          <sphereGeometry args={[0.09, 6, 6]} />
          <meshBasicMaterial
            color={flowMood === 'loss' ? (p.gold ? '#F43F5E' : '#64748B') : p.gold ? '#FBBF24' : '#22D3EE'}
            transparent
            opacity={0.38 + 0.22 * Math.sin(t * 1.6 + i)}
          />
        </mesh>
      ))}
    </group>
  );
}

export const CapimMall3D: React.FC<Mall3DStageProps> = ({
  cameraMode,
  localFrame,
  showScanner = false,
  showCrowdDropWave = false,
  showGlassTotem = false,
  flowMood = 'live',
}) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();

  return (
    <ThreeCanvas
      width={width}
      height={height}
      dpr={1}
      gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.32 }}
      camera={{ fov: 44, near: 0.1, far: 260, position: [0, 20, 42] }}
      style={{ backgroundColor: '#06070B' }}
    >
      <color attach="background" args={['#06070B']} />
      <fog attach="fog" args={['#06070B', 56, 138]} />

      <ambientLight intensity={0.78} color="#dbeafe" />
      <directionalLight position={[-28, 34, -24]} intensity={2.3} color="#38BDF8" />
      <directionalLight position={[28, 24, 24]} intensity={2.6} color="#F59E0B" />
      <pointLight position={[0, 14, 0]} intensity={26} distance={58} color="#E2A83B" />
      <pointLight position={[-22, 12, 8]} intensity={18} distance={52} color="#38BDF8" />

      <CameraController cameraMode={cameraMode} localFrame={localFrame} fps={fps} />
      <CapimEnvironmentAndPost enableBloom={false} />
      <SubsoloXRayLayer frame={frame} fps={fps} />
      <CapimCurvedAtriumRoof frame={frame} fps={fps} />
      <BezierDataStreams frame={frame} fps={fps} flowMood={flowMood} />
      <AnchorStoreSignage3D frame={frame} fps={fps} />

      <FloorShaderPlane
        localFrame={frame}
        fps={fps}
        showCrowdDropWave={showCrowdDropWave}
        flowMood={flowMood}
      />

      <MallArchitecture
        localFrame={localFrame}
        fps={fps}
        showCrowdDropWave={showCrowdDropWave}
        flowMood={flowMood}
      />

      <ShopperLightStreams frame={frame} fps={fps} flowMood={flowMood} />

      {showScanner && <VolumetricVitrineScanner localFrame={localFrame} />}
      {showGlassTotem && <GlassConciergeTotem localFrame={localFrame} fps={fps} />}

      <DeterministicParticles frame={frame} fps={fps} flowMood={flowMood} />
    </ThreeCanvas>
  );
};
