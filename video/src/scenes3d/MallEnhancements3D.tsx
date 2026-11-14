import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Environment, Lightformer } from '@react-three/drei';

const STREAM_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const STREAM_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uSpeed;
  varying vec2 vUv;

  void main() {
    float wave = fract(vUv.x * 4.0 - uTime * uSpeed);
    float pulse = smoothstep(0.0, 0.14, wave) * (1.0 - smoothstep(0.14, 0.55, wave));
    float core = 0.25 + 1.45 * pow(pulse, 1.6);
    float edgeFade = smoothstep(0.0, 0.06, vUv.x) * (1.0 - smoothstep(0.94, 1.0, vUv.x));
    gl_FragColor = vec4(uColor * core, (0.32 + 0.68 * pulse) * edgeFade);
  }
`;

/** Iluminação HDR procedural sem assets externos + Glow volumétrico nativo (100% compatível ANGLE). */
export const CapimEnvironmentAndPost: React.FC<{ enableBloom?: boolean }> = () => (
  <>
    <Environment resolution={256} frames={1}>
      <group rotation={[-Math.PI / 3, 0, 0]}>
        <Lightformer
          form="rect"
          intensity={3.4}
          color="#FCD34D"
          position={[0, 12, -8]}
          scale={[26, 6, 1]}
        />
        <Lightformer
          form="rect"
          intensity={2.5}
          color="#22D3EE"
          position={[-14, 6, 8]}
          scale={[18, 5, 1]}
          rotation={[0, Math.PI / 3, 0]}
        />
        <Lightformer
          form="ring"
          intensity={1.9}
          color="#F8FAFC"
          position={[12, 10, 10]}
          scale={12}
        />
      </group>
    </Environment>
  </>
);

/** Cobertura curva translúcida e arcos estruturais do Átrio Central. */
export const CapimCurvedAtriumRoof: React.FC<{ frame: number; fps: number }> = ({
  frame,
  fps,
}) => {
  const t = frame / fps;
  const ribPositions = [-20, -12, -4, 4, 12, 20];
  const archGeometry = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI;
      pts.push(new THREE.Vector3(0, Math.sin(a) * 4.2 + 6.4, Math.cos(a) * 7.8 + 1.2));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.12, 8, false);
  }, []);

  return (
    <group>
      {/* Abóbada de vidro translúcido sobre o corredor principal */}
      <mesh position={[0, 7.6, 1.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[7.9, 7.9, 44, 24, 1, true, 0, Math.PI]} />
        <meshPhysicalMaterial
          color="#0F172A"
          metalness={0.25}
          roughness={0.08}
          transmission={0.55}
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
        />
      </mesh>
      {ribPositions.map((rx, i) => (
        <group key={rx} position={[rx, 0, 0]}>
          <mesh geometry={archGeometry}>
            <meshStandardMaterial
              color="#1E293B"
              metalness={0.9}
              roughness={0.22}
              emissive="#E2A83B"
              emissiveIntensity={0.22 + 0.12 * Math.sin(t * 2 + i)}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** Camada Subsolo SS1/SS2 (356 vagas monitoradas + esteira Super Big) abaixo da laje L1. */
export const SubsoloXRayLayer: React.FC<{ frame: number; fps: number }> = ({
  frame,
  fps,
}) => {
  const t = frame / fps;
  const pulse = 0.45 + 0.25 * Math.sin(t * 2.4);

  return (
    <group position={[12, -2.05, -14]}>
      {/* Matriz técnica do Subsolo 1 & 2 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[28, 22]} />
        <meshBasicMaterial color="#042F2E" transparent opacity={0.42} />
      </mesh>
      <gridHelper args={[28, 18, '#10B981', '#065F46']} position={[0, 0.04, 0]} />
      {/* 2 Esteiras Rolantes inclinadas Subsolo -> Super Big */}
      {[-3.2, 3.2].map((oz, idx) => (
        <mesh
          key={oz}
          position={[8, 0.9, oz]}
          rotation={[0, 0, 0.26]}
        >
          <boxGeometry args={[7.4, 0.14, 1.3]} />
          <meshBasicMaterial
            color={idx === 0 ? '#10B981' : '#22D3EE'}
            transparent
            opacity={pulse}
          />
        </mesh>
      ))}
    </group>
  );
};

/** 5 arcos de telemetria Bézier em shader GLSL ligando âncoras, Praça L2 e Subsolo. */
export const BezierDataStreams: React.FC<{
  frame: number;
  fps: number;
  flowMood: 'loss' | 'live' | 'gold';
}> = ({ frame, fps, flowMood }) => {
  const t = frame / fps;
  const colorHex =
    flowMood === 'loss' ? '#F43F5E' : flowMood === 'gold' ? '#FCD34D' : '#22D3EE';

  const curves = useMemo(() => {
    const specs: Array<[number, number, number][]> = [
      // P1/Central -> Praça L2
      [
        [1.5, 0.6, 12],
        [-3, 6.4, 6],
        [-14.5, 4.4, 0.5],
      ],
      // Renner -> C&A -> Riachuelo
      [
        [-28.5, 2.2, 3.5],
        [-12, 7.2, -3],
        [0.8, 2.5, -11.5],
      ],
      // Praça Central -> Cinemark
      [
        [1.5, 1.2, 2],
        [12, 6.8, 5],
        [24.5, 3.2, 7.5],
      ],
      // Subsolo 356 -> Super Big
      [
        [12, -1.8, -14],
        [18, 2.6, -18],
        [24.5, 2.2, -20.2],
      ],
      // Crowd-Drop Atrium Ring Arc
      [
        [-18, 2.0, -4],
        [0, 8.8, -1],
        [18, 2.0, -4],
      ],
    ];
    return specs.map((pts, idx) => {
      const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
      const geo = new THREE.TubeGeometry(curve, 36, 0.11, 8, false);
      const mat = new THREE.ShaderMaterial({
        vertexShader: STREAM_VERTEX,
        fragmentShader: STREAM_FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(idx % 2 === 0 ? '#E2A83B' : colorHex) },
          uSpeed: { value: 0.55 + idx * 0.11 },
        },
        transparent: true,
        depthWrite: false,
      });
      return { geo, mat };
    });
  }, []);

  curves.forEach(({ mat }, idx) => {
    mat.uniforms.uTime.value = t;
    mat.uniforms.uColor.value.set(
      flowMood === 'loss'
        ? '#F43F5E'
        : flowMood === 'gold'
          ? idx % 2 === 0
            ? '#FCD34D'
            : '#FB923C'
          : idx % 2 === 0
            ? '#E2A83B'
            : '#22D3EE'
    );
  });

  return (
    <group>
      {curves.map(({ geo, mat }, idx) => (
        <mesh key={idx} geometry={geo} material={mat} />
      ))}
    </group>
  );
};

function makeSignageTexture(title: string, sub: string, accent: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 160);

  // Dark obsidian glass pill
  ctx.fillStyle = 'rgba(8, 10, 16, 0.90)';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(10, 12, 492, 136, 26);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = '700 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(sub, 256, 54);

  ctx.fillStyle = '#F8FAFC';
  ctx.font = '800 44px sans-serif';
  ctx.fillText(title, 256, 114);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const SIGNAGE_SPECS = [
  { title: 'RENNER', sub: 'ÂNCORA SUL • L1', pos: [-28.5, 7.6, 3.5] as [number, number, number], accent: '#E2A83B' },
  { title: 'C&A • CENTRAL', sub: 'FLUXO 874/h', pos: [0.8, 7.4, -11.5] as [number, number, number], accent: '#22D3EE' },
  { title: 'RIACHUELO', sub: 'RADAR VITRINE', pos: [0.2, 7.2, -1.8] as [number, number, number], accent: '#FCD34D' },
  { title: 'CINEMARK', sub: 'LAZER & PICOS', pos: [24.5, 8.2, 7.5] as [number, number, number], accent: '#F43F5E' },
  { title: 'PRAÇA L2', sub: '2º PISO • ALIMENTAÇÃO', pos: [-16.0, 9.6, 3.2] as [number, number, number], accent: '#FBBF24' },
  { title: 'SUBSOLO 356', sub: 'SS1 + SS2 RAIO-X', pos: [14.0, 4.8, -20.2] as [number, number, number], accent: '#10B981' },
];

/** Placas 3D em CanvasTexture (zero fetch externo, nitidez total em 4K). */
export const AnchorStoreSignage3D: React.FC<{ frame: number; fps: number }> = ({
  frame,
  fps,
}) => {
  const t = frame / fps;
  const signs = useMemo(
    () =>
      SIGNAGE_SPECS.map((s) => ({
        ...s,
        tex: makeSignageTexture(s.title, s.sub, s.accent),
      })),
    []
  );

  return (
    <group>
      {signs.map((s, idx) => (
        <sprite
          key={s.title}
          position={[s.pos[0], s.pos[1] + Math.sin(t * 1.8 + idx) * 0.16, s.pos[2]]}
          scale={[6.2, 1.95, 1]}
        >
          <spriteMaterial map={s.tex} transparent depthTest={false} />
        </sprite>
      ))}
    </group>
  );
};
