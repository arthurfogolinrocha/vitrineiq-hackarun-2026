import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { RoundedBox } from '@react-three/drei';
import { MALL_BLOCKS, CORRIDOR_FLOW_NODES } from './mallData';

export interface Mall3DStageProps {
  /** Posição orbital / cinematográfica controlada frame a frame */
  cameraMode: 'reveal' | 'showcase-vitrine' | 'crowddrop-aerial' | 'concierge-totem' | 'outro';
  /** Frame local relativo à cena atual */
  localFrame: number;
  /** Ativa feixe scanner volumétrico ciano na vitrine Riachuelo/Centauro */
  showScanner?: boolean;
  /** Ativa onda GLSL Crowd-Drop dourada saindo da Praça Central */
  showCrowdDropWave?: boolean;
  /** Ativa Totem/Smartphone 3D translúcido em primeiro plano */
  showGlassTotem?: boolean;
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

    vec3 bg = vec3(0.032, 0.036, 0.052);
    vec3 gridCol = vec3(0.11, 0.14, 0.21);
    vec3 goldCol = vec3(0.95, 0.72, 0.24);
    vec3 cyanCol = vec3(0.14, 0.83, 0.93);

    vec3 col = mix(bg, gridCol, line * 0.32 + majorLine * 0.55);

    float edgeDist = length(vWorldPos.xz) / 56.0;
    float radialFade = clamp(1.0 - smoothstep(0.55, 1.0, edgeDist), 0.0, 1.0);
    col *= radialFade;

    if (uWaveActive > 0.5) {
      float d = distance(vWorldPos.xz, uOrigin);
      float r1 = uWaveProgress * 42.0;
      float ring1 = 1.0 - smoothstep(0.0, 2.8, abs(d - r1));
      float r2 = max(0.0, (uWaveProgress - 0.18)) * 42.0;
      float ring2 = (1.0 - smoothstep(0.0, 2.0, abs(d - r2))) * 0.65;

      float innerGlow = (1.0 - smoothstep(r1 - 12.0, r1, d)) * smoothstep(0.0, 4.0, r1 - d) * 0.16;
      col += goldCol * (pow(ring1, 1.7) * 1.45 + pow(ring2, 1.8) + innerGlow) * radialFade;
    }

    float corridorGlow = exp(-abs(vWorldPos.z - 2.0) * 0.35) * exp(-abs(vWorldPos.x) * 0.045) * 0.09;
    col += cyanCol * corridorGlow * (0.7 + 0.3 * sin(uTime * 2.0));

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

  if (cameraMode === 'reveal') {
    const p = interpolate(localFrame, [0, 460], [0, 1], {
      easing: easeExpo,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const angle = interpolate(p, [0, 1], [-0.55, 0.42]);
    const radius = interpolate(p, [0, 1], [54, 38]);
    const height = interpolate(p, [0, 1], [28, 17]);
    camera.position.set(Math.sin(angle) * radius, height, Math.cos(angle) * radius);
    camera.lookAt(0, 1.5, -1);
  } else if (cameraMode === 'showcase-vitrine') {
    const p = interpolate(localFrame, [0, 460], [0, 1], {
      easing: easeExpo,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const cx = interpolate(p, [0, 1], [-14, 1.5]);
    const cz = interpolate(p, [0, 1], [17, 11.5]);
    const cy = interpolate(p, [0, 1], [10.5, 7.2]);
    camera.position.set(cx, cy, cz);
    camera.lookAt(-2.5, 1.8, -1.2);
  } else if (cameraMode === 'crowddrop-aerial') {
    const p = interpolate(localFrame, [0, 450], [0, 1], {
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const angle = interpolate(p, [0, 1], [0.22, -0.32]);
    const radius = interpolate(p, [0, 1], [48, 38]);
    const height = interpolate(p, [0, 1], [28, 22]);
    camera.position.set(Math.sin(angle) * radius, height, Math.cos(angle) * radius);
    camera.lookAt(1.5, 1.0, -2.5);
  } else if (cameraMode === 'concierge-totem') {
    const sway = Math.sin(t * 0.9) * 1.1;
    camera.position.set(sway, 6.2, 21.8);
    camera.lookAt(0, 5.4, 12.6);
  } else {
    const p = interpolate(localFrame, [0, 450], [0, 1], {
      easing: easeExpo,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const angle = interpolate(p, [0, 1], [0.1, 0.72]);
    const radius = interpolate(p, [0, 1], [36, 52]);
    camera.position.set(Math.sin(angle) * radius, 21, Math.cos(angle) * radius);
    camera.lookAt(0, 1.5, -2);
  }

  return null;
}

function FloorShaderPlane({
  localFrame,
  fps,
  showCrowdDropWave,
}: {
  localFrame: number;
  fps: number;
  showCrowdDropWave: boolean;
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: FLOOR_VERTEX,
        fragmentShader: FLOOR_FRAGMENT,
        uniforms: {
          uWaveProgress: { value: 0 },
          uWaveActive: { value: 0 },
          uOrigin: { value: new THREE.Vector2(1.5, 1.5) },
          uTime: { value: 0 },
        },
      }),
    []
  );

  material.uniforms.uWaveActive.value = showCrowdDropWave ? 1.0 : 0.0;
  material.uniforms.uWaveProgress.value = (localFrame % 190) / 190;
  material.uniforms.uTime.value = localFrame / fps;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} material={material}>
      <planeGeometry args={[120, 120]} />
    </mesh>
  );
}

function MallArchitecture({
  localFrame,
  fps,
  showCrowdDropWave,
}: {
  localFrame: number;
  fps: number;
  showCrowdDropWave: boolean;
}) {
  const waveRadius = ((localFrame % 190) / 190) * 42.0;

  return (
    <group>
      <mesh position={[0, -0.15, -3]}>
        <boxGeometry args={[68, 0.25, 44]} />
        <meshStandardMaterial color="#0b0e16" metalness={0.75} roughness={0.35} />
      </mesh>

      {MALL_BLOCKS.map((b, idx) => {
        const rise = spring({
          frame: Math.max(0, localFrame - (idx % 12) * 2),
          fps,
          config: { damping: 20, stiffness: 110, mass: 0.9 },
        });
        const distFromWave = Math.hypot(b.x - 1.5, b.z - 1.5);
        const waveHit = showCrowdDropWave
          ? Math.max(0, 1 - Math.abs(distFromWave - waveRadius) / 6.0)
          : 0;

        const isGlassFood = b.tier === 'food';
        const baseColor =
          b.tier === 'vacant'
            ? '#2a121b'
            : b.tier === 'anchor'
              ? '#151b2b'
              : isGlassFood
                ? '#1a160c'
                : '#10141f';

        const emissiveCol =
          showCrowdDropWave && (waveHit > 0.1 || b.tier === 'vacant')
            ? b.tier === 'vacant'
              ? '#F43F5E'
              : '#E2A83B'
            : b.accent;

        const emissivePower =
          showCrowdDropWave && waveHit > 0.1
            ? 0.45 + waveHit * 1.4
            : b.tier === 'anchor'
              ? 0.24
              : b.tier === 'vacant'
                ? 0.55
                : 0.1;

        const currentH = Math.max(0.2, b.h * rise);
        const posY = (b.y ?? 0) + currentH / 2;

        return (
          <group key={b.name} position={[b.x, posY, b.z]}>
            <mesh>
              <boxGeometry args={[b.w, currentH, b.d]} />
              <meshStandardMaterial
                color={baseColor}
                metalness={0.85}
                roughness={0.22}
                emissive={emissiveCol}
                emissiveIntensity={emissivePower * 0.38}
                transparent={isGlassFood}
                opacity={isGlassFood ? 0.36 : 1}
              />
            </mesh>
            {/* Contorno arquitetônico CAD luminoso */}
            <mesh position={[0, currentH / 2 + 0.03, 0]}>
              <boxGeometry args={[b.w * 0.98, 0.06, b.d * 0.98]} />
              <meshBasicMaterial color={emissiveCol} transparent opacity={0.55 + waveHit * 0.45} />
            </mesh>
            <mesh>
              <boxGeometry args={[b.w + 0.04, currentH + 0.04, b.d + 0.04]} />
              <meshBasicMaterial color={emissiveCol} wireframe transparent opacity={isGlassFood ? 0.32 : 0.14 + waveHit * 0.35} />
            </mesh>
          </group>
        );
      })}

      {CORRIDOR_FLOW_NODES.map(([nx, nz], idx) => {
        const phase = (localFrame / fps) * 1.8 + idx * 0.7;
        const px = nx + Math.sin(phase) * 1.1;
        const pz = nz + Math.cos(phase * 0.8) * 0.8;
        return (
          <mesh key={idx} position={[px, 0.65, pz]}>
            <sphereGeometry args={[0.28, 12, 12]} />
            <meshBasicMaterial color={idx % 3 === 0 ? '#E2A83B' : '#22D3EE'} transparent opacity={0.85} />
          </mesh>
        );
      })}
    </group>
  );
}

function VolumetricVitrineScanner({ localFrame }: { localFrame: number }) {
  const sweep = interpolate(localFrame % 160, [0, 80, 160], [-5.2, 5.2, -5.2], {
    easing: Easing.inOut(Easing.sin),
  });

  return (
    <group position={[0.2, 2.2, -1.8]}>
      <mesh position={[sweep, 0, 0]}>
        <boxGeometry args={[0.14, 5.2, 6.8]} />
        <meshBasicMaterial
          color="#22D3EE"
          transparent
          opacity={0.72}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[sweep, -2.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.6, 7.2]} />
        <meshBasicMaterial
          color="#22D3EE"
          transparent
          opacity={0.28}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[-1.4, -0.5, 3.3]}>
        <boxGeometry args={[1.3, 2.1, 1.3]} />
        <meshBasicMaterial color="#10B981" wireframe transparent opacity={0.85} />
      </mesh>
      <mesh position={[1.9, -0.5, 3.1]}>
        <boxGeometry args={[1.3, 2.1, 1.3]} />
        <meshBasicMaterial color="#E2A83B" wireframe transparent opacity={0.85} />
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
  const rotY = interpolate(localFrame, [0, 320], [-0.38, 0.32], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const enter = spring({ frame: localFrame, fps, config: { damping: 18, stiffness: 90 } });
  const floatY = Math.sin((localFrame / fps) * 1.8) * 0.18;
  const pulseScale = 1 + Math.sin((localFrame / fps) * 4) * 0.035;

  return (
    <group position={[0, 5.4 * enter + floatY, 12.6]} rotation={[0.06, rotY, 0]}>
      <RoundedBox args={[3.4, 6.2, 0.28]} radius={0.32} smoothness={4}>
        <meshStandardMaterial color="#141824" metalness={0.92} roughness={0.18} />
      </RoundedBox>
      <RoundedBox args={[3.52, 6.32, 0.16]} radius={0.34} smoothness={4} position={[0, 0, -0.02]}>
        <meshBasicMaterial color="#E2A83B" transparent opacity={0.62} />
      </RoundedBox>
      <RoundedBox args={[3.1, 5.85, 0.12]} radius={0.24} smoothness={4} position={[0, 0, 0.16]}>
        <meshPhysicalMaterial
          color="#0b1222"
          metalness={0.22}
          roughness={0.08}
          clearcoat={1}
          transparent
          opacity={0.92}
        />
      </RoundedBox>
      {/* QR Code 3D iluminado no centro da tela */}
      <group position={[0, 0.45, 0.24]} scale={[pulseScale, pulseScale, 1]}>
        <mesh>
          <planeGeometry args={[1.95, 1.95]} />
          <meshBasicMaterial color="#08090D" transparent opacity={0.9} />
        </mesh>
        {QR_MATRIX_BLOCKS.map(([qx, qy, qs], i) => (
          <mesh key={i} position={[qx, qy, 0.02]}>
            <planeGeometry args={[qs, qs]} />
            <meshBasicMaterial color={i < 3 ? '#E2A83B' : '#22D3EE'} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.03]}>
          <ringGeometry args={[1.12, 1.2, 48]} />
          <meshBasicMaterial color="#E2A83B" transparent opacity={0.85} />
        </mesh>
      </group>
      {/* Barra de oferta relâmpago dentro do smartphone 3D */}
      <RoundedBox args={[2.3, 0.65, 0.04]} radius={0.12} smoothness={2} position={[0, -1.65, 0.24]}>
        <meshBasicMaterial color="#10B981" transparent opacity={0.85} />
      </RoundedBox>
    </group>
  );
}

const PARTICLE_COORDS = Array.from({ length: 42 }, (_, i) => ({
  x: ((i * 37) % 56) - 28,
  y: ((i * 19) % 14) + 1.2,
  z: ((i * 29) % 38) - 19,
  speed: 0.4 + (i % 5) * 0.18,
  gold: i % 3 === 0,
}));

function DeterministicParticles({ frame, fps }: { frame: number; fps: number }) {
  const t = frame / fps;
  return (
    <group>
      {PARTICLE_COORDS.map((p, i) => (
        <mesh
          key={i}
          position={[p.x, p.y + Math.sin(t * p.speed + i) * 0.45, p.z]}
        >
          <sphereGeometry args={[0.08, 6, 6]} />
          <meshBasicMaterial
            color={p.gold ? '#E2A83B' : '#94A3B8'}
            transparent
            opacity={0.35 + 0.2 * Math.sin(t * 1.5 + i)}
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
}) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();

  return (
    <ThreeCanvas
      width={width}
      height={height}
      dpr={1}
      camera={{ fov: 42, near: 0.1, far: 250, position: [0, 20, 42] }}
      style={{ backgroundColor: '#08090D' }}
    >
      <color attach="background" args={['#08090D']} />
      <fog attach="fog" args={['#08090D', 38, 105]} />

      <ambientLight intensity={0.45} color="#cbd5e1" />
      <directionalLight position={[-25, 32, -22]} intensity={1.8} color="#60A5FA" />
      <directionalLight position={[28, 22, 24]} intensity={2.1} color="#F59E0B" />
      <pointLight position={[0, 12, 0]} intensity={18} distance={50} color="#E2A83B" />

      <CameraController cameraMode={cameraMode} localFrame={localFrame} fps={fps} />

      <FloorShaderPlane
        localFrame={frame}
        fps={fps}
        showCrowdDropWave={showCrowdDropWave}
      />

      <MallArchitecture
        localFrame={localFrame}
        fps={fps}
        showCrowdDropWave={showCrowdDropWave}
      />

      {showScanner && <VolumetricVitrineScanner localFrame={localFrame} />}
      {showGlassTotem && <GlassConciergeTotem localFrame={localFrame} fps={fps} />}

      <DeterministicParticles frame={frame} fps={fps} />
    </ThreeCanvas>
  );
};
