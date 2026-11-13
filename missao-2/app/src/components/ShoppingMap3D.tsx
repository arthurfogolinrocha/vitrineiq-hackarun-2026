import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  ArrowDown,
  ArrowUp,
  Compass,
  Footprints,
  Layers,
  MoveUp,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { FloorId, ZoneId } from '../types';
import { ZoneLiveTelemetry } from '../services/opportunityEngine';

interface ShoppingMap3DProps {
  floor: FloorId;
  onFloorChange: (floor: FloorId) => void;
  zonesTelemetry: ZoneLiveTelemetry[];
  selectedZoneId: ZoneId;
  onSelectZone: (zoneId: ZoneId) => void;
}

interface Store3DDef {
  name: string;
  zoneId: ZoneId;
  floor: FloorId;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  accent: string;
  isVacant?: boolean;
}

const STORES_3D: Store3DDef[] = [
  // === 1º PAVIMENTO — TÉRREO (Y base = 0) ===
  { name: 'RENNER', zoneId: 'ala-sul-esporte', floor: 'L1', x: -24, z: 5, w: 7.5, d: 8.5, h: 3.8, color: '#fee2e2', accent: '#dc2626' },
  { name: 'CENTAURO', zoneId: 'ala-sul-esporte', floor: 'L1', x: -15, z: 9, w: 6.5, d: 4.5, h: 3.4, color: '#ffe4e6', accent: '#e11d48' },
  { name: 'STILO • RESOLVE', zoneId: 'ala-sul-esporte', floor: 'L1', x: -15, z: -2.5, w: 6.2, d: 4.0, h: 3.2, color: '#f1f5f9', accent: '#475569' },

  { name: 'C&A', zoneId: 'ala-central-ancoras', floor: 'L1', x: -3.5, z: -8.5, w: 7.2, d: 5.5, h: 3.8, color: '#e0f2fe', accent: '#0284c7' },
  { name: 'RCHLO', zoneId: 'ala-central-ancoras', floor: 'L1', x: -3.5, z: -0.5, w: 7.8, d: 4.8, h: 3.8, color: '#f8fafc', accent: '#0f172a' },
  { name: 'LEITURA', zoneId: 'ala-central-ancoras', floor: 'L1', x: 5.2, z: -6.8, w: 5.4, d: 3.8, h: 3.3, color: '#ede9fe', accent: '#7c3aed' },

  { name: 'OUTBACK', zoneId: 'alameda-gourmet', floor: 'L1', x: -2.0, z: 9.2, w: 5.6, d: 4.4, h: 3.4, color: '#fee2e2', accent: '#b91c1c' },
  { name: 'MADERO', zoneId: 'alameda-gourmet', floor: 'L1', x: 4.5, z: 9.2, w: 4.8, d: 4.2, h: 3.4, color: '#fef3c7', accent: '#d97706' },
  { name: 'MARISA', zoneId: 'alameda-gourmet', floor: 'L1', x: 10.6, z: 9.2, w: 5.2, d: 4.2, h: 3.4, color: '#fce7f3', accent: '#db2777' },

  { name: 'CINEMARK', zoneId: 'ala-lazer-cinema', floor: 'L1', x: 20.5, z: 6.8, w: 8.6, d: 8.2, h: 4.4, color: '#fecaca', accent: '#b91c1c' },
  { name: 'STZ (Studio Z)', zoneId: 'ala-lazer-cinema', floor: 'L1', x: 20.5, z: -1.8, w: 8.2, d: 3.8, h: 3.4, color: '#e0f2fe', accent: '#0369a1' },
  { name: 'PERNAMBUCANAS', zoneId: 'ala-lazer-cinema', floor: 'L1', x: 20.5, z: -6.4, w: 8.2, d: 3.2, h: 3.4, color: '#fef9c3', accent: '#ca8a04' },
  { name: 'SUPERBIG • ZIGZAG', zoneId: 'ala-lazer-cinema', floor: 'L1', x: 20.5, z: -10.8, w: 8.2, d: 3.2, h: 3.4, color: '#ffedd5', accent: '#ea580c' },
  { name: 'WOW • MOROFIT', zoneId: 'ala-lazer-cinema', floor: 'L1', x: 20.5, z: -15.4, w: 8.2, d: 3.4, h: 3.6, color: '#d1fae5', accent: '#059669' },

  // === 2º PAVIMENTO — PRAÇA DE ALIMENTAÇÃO (Y base = 6.2) ===
  { name: 'MUNDO IMERSIVO', zoneId: 'praca-alimentacao-l2', floor: 'L2', x: -11.5, z: -7.5, w: 6.0, d: 4.2, h: 3.2, color: '#e0f2fe', accent: '#0284c7' },
  { name: "McDONALD'S", zoneId: 'praca-alimentacao-l2', floor: 'L2', x: -4.2, z: -8.2, w: 5.2, d: 3.8, h: 3.2, color: '#fef08a', accent: '#ca8a04' },
  { name: 'SPOLETTO • PIZZA HUT', zoneId: 'praca-alimentacao-l2', floor: 'L2', x: 2.8, z: -7.8, w: 6.2, d: 3.5, h: 3.0, color: '#ffedd5', accent: '#ea580c' },
  { name: 'DIVINO FOGÃO', zoneId: 'praca-alimentacao-l2', floor: 'L2', x: 9.5, z: -7.0, w: 4.8, d: 3.4, h: 3.0, color: '#d1fae5', accent: '#059669' },

  { name: 'KIN SUI', zoneId: 'praca-alimentacao-l2', floor: 'L2', x: -11.0, z: 7.2, w: 5.4, d: 3.8, h: 3.0, color: '#ede9fe', accent: '#7c3aed' },
  { name: 'GIRAFFAS', zoneId: 'praca-alimentacao-l2', floor: 'L2', x: -4.6, z: 7.8, w: 4.6, d: 3.6, h: 3.0, color: '#ffedd5', accent: '#f97316' },
  { name: 'VAGA 203 (58m²)', zoneId: 'praca-alimentacao-l2', floor: 'L2', x: 1.0, z: 7.8, w: 4.4, d: 3.6, h: 3.0, color: '#ffe4e6', accent: '#e11d48', isVacant: true },
  { name: 'SUBWAY • EXPRESS', zoneId: 'praca-alimentacao-l2', floor: 'L2', x: 7.8, z: 7.5, w: 6.2, d: 3.6, h: 3.0, color: '#dcfce7', accent: '#16a34a' },
];

function createSignTexture(title: string, badge: string, accent: string, isVacant?: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = isVacant ? '#fff1f2' : '#ffffff';
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 144, 24);
    ctx.fill();

    ctx.lineWidth = 8;
    ctx.strokeStyle = accent;
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.fillRect(24, 26, 14, 108);

    ctx.fillStyle = '#0f172a';
    ctx.font = '800 36px Inter, system-ui, sans-serif';
    ctx.fillText(title, 56, 72);

    ctx.fillStyle = isVacant ? '#be123c' : '#475569';
    ctx.font = '700 24px Inter, system-ui, sans-serif';
    ctx.fillText(badge, 56, 118);
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
  canvas.width = 560;
  canvas.height = 150;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgHex;
    ctx.beginPath();
    ctx.roundRect(8, 8, 544, 134, 24);
    ctx.fill();

    ctx.lineWidth = 8;
    ctx.strokeStyle = borderHex;
    ctx.stroke();

    ctx.fillStyle = textHex;
    ctx.font = '900 33px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 280, 68);

    ctx.fillStyle = subHex;
    ctx.font = '700 23px Inter, system-ui, sans-serif';
    ctx.fillText(subtitle, 280, 114);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const ShoppingMap3D: React.FC<ShoppingMap3DProps> = ({
  floor,
  onFloorChange,
  zonesTelemetry,
  selectedZoneId,
  onSelectZone,
}) => {
  const activeZone = zonesTelemetry.find((z) => z.zone.id === selectedZoneId);
  const mountRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'orbit' | 'walk'>('orbit');
  const [webglUnsupported, setWebglUnsupported] = useState(false);

  // Refs para sincronizar estado React com o loop WebGL sem recriar a cena inteira
  const viewModeRef = useRef<'orbit' | 'walk'>('orbit');
  viewModeRef.current = viewMode;
  const floorRef = useRef<FloorId>(floor);
  floorRef.current = floor;
  const onSelectZoneRef = useRef(onSelectZone);
  onSelectZoneRef.current = onSelectZone;
  const onFloorChangeRef = useRef(onFloorChange);
  onFloorChangeRef.current = onFloorChange;

  // Refs para controles externos (botões Zoom+, Zoom-, Entrar/Sair, Andar, Subir L2)
  const actionsRef = useRef<{
    zoom: (factor: number) => void;
    resetOrbit: (targetFloor: FloorId) => void;
    enterWalk: (targetFloor: FloorId) => void;
    nudgeWalk: (forward: number, strafe: number, turnYaw: number) => void;
  } | null>(null);

  // Efeito principal Three.js (cria cena, prédios, letreiros, escada rolante, fluxo e controles)
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
    const height = container.clientHeight || 480;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#eef1f6');
    scene.fog = new THREE.Fog('#eef1f6', 45, 130);

    const camera = new THREE.PerspectiveCamera(52, width / height, 0.2, 220);
      camera.position.set(0, 36, 48);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.1;
    controls.minDistance = 8;
    controls.maxDistance = 95;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.target.set(0, 2, 3);

    // Iluminação arquitetônica de shopping claro
    const hemiLight = new THREE.HemisphereLight('#ffffff', '#cbd5e1', 1.15);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight('#fffbeb', 1.25);
    dirLight.position.set(22, 46, 26);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // === CHÃO EXTERNO (RUAS, ESTACIONAMENTOS & ENTRADAS) ===
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(165, 130),
      new THREE.MeshStandardMaterial({ color: '#e7e5e4', roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.15;
    ground.receiveShadow = true;
    scene.add(ground);

    // Avenidas principais ao redor (JK, NS-05, LO 2A)
    const roadMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.85 });
    const laneLineMat = new THREE.MeshBasicMaterial({ color: '#facc15' });

    const avNS05 = new THREE.Mesh(new THREE.BoxGeometry(102, 0.12, 4.4), roadMat);
    avNS05.position.set(-1, -0.06, 28.5);
    scene.add(avNS05);
    const avNS05Line = new THREE.Mesh(new THREE.BoxGeometry(96, 0.13, 0.2), laneLineMat);
    avNS05Line.position.set(-1, -0.05, 28.5);
    scene.add(avNS05Line);

    const avJK = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 62), roadMat);
    avJK.position.set(-45, -0.06, 0);
    scene.add(avJK);
    const avJKLine = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.13, 56), laneLineMat);
    avJKLine.position.set(-45, -0.05, 0);
    scene.add(avJKLine);

    const avLO2A = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 62), roadMat);
    avLO2A.position.set(42, -0.06, 0);
    scene.add(avLO2A);
    const avLO2ALine = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.13, 56), laneLineMat);
    avLO2ALine.position.set(42, -0.05, 0);
    scene.add(avLO2ALine);

    // Placas visíveis das avenidas no contorno
    const roadSigns: { text: string; sub: string; x: number; z: number }[] = [
      { text: 'AV. NS-05 (FRONTAL)', sub: 'Acesso Principal & Estacionamento', x: -1, z: 32.2 },
      { text: 'AV. JK (OESTE)', sub: 'Acesso Renner • Ala Sul', x: -45, z: 22 },
      { text: 'AV. LO-2A (LESTE)', sub: 'Acesso Cinemark • MoroFit', x: 42, z: 22 },
    ];
    roadSigns.forEach((rs) => {
      const spr = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createBadgeTexture(rs.text, rs.sub, '#1e293b', '#94a3b8', '#f8fafc', '#cbd5e1'),
          transparent: true,
        })
      );
      spr.position.set(rs.x, 3.0, rs.z);
      spr.scale.set(7.4, 2.0, 1);
      scene.add(spr);
    });

    // Helper para desenhar bolsão de Estacionamento com vagas demarcadas, carros 3D e totem 🅿️
    const buildParkingLot = (
      cx: number,
      cz: number,
      width: number,
      depth: number,
      title: string,
      subtitle: string,
      rows: number,
      cols: number
    ) => {
      const group = new THREE.Group();

      // Base asfáltica
      const asphalt = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.14, depth),
        new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.9 })
      );
      asphalt.position.set(cx, -0.06, cz);
      asphalt.receiveShadow = true;
      group.add(asphalt);

      // Borda/calçada clara ao redor do bolsão
      const border = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.6, 0.1, depth + 0.6),
        new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.8 })
      );
      border.position.set(cx, -0.09, cz);
      group.add(border);

      const stripeMat = new THREE.MeshBasicMaterial({ color: '#f8fafc' });
      const carColors = ['#e2e8f0', '#94a3b8', '#38bdf8', '#f8fafc', '#f59e0b', '#64748b', '#ef4444'];
      const stepX = (width - 2.4) / cols;
      const stepZ = (depth - 2.0) / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const sx = cx - (width - 2.4) / 2 + c * stepX;
          const sz = cz - (depth - 2.0) / 2 + r * stepZ + stepZ / 2;

          // Linha branca da vaga
          const line = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, stepZ * 0.72), stripeMat);
          line.position.set(sx, 0.02, sz);
          group.add(line);

          // Carro estilizado em ~70% das vagas
          if (c < cols && (r * 7 + c * 3) % 10 < 7) {
            const carX = sx + stepX / 2;
            const carBodyColor = carColors[(r + c * 2) % carColors.length];
            const car = new THREE.Mesh(
              new THREE.BoxGeometry(Math.min(1.5, stepX * 0.68), 0.65, Math.min(2.6, stepZ * 0.56)),
              new THREE.MeshStandardMaterial({ color: carBodyColor, roughness: 0.35, metalness: 0.2 })
            );
            car.position.set(carX, 0.36, sz);
            car.castShadow = true;
            group.add(car);

            const cabin = new THREE.Mesh(
              new THREE.BoxGeometry(Math.min(1.2, stepX * 0.54), 0.4, Math.min(1.4, stepZ * 0.32)),
              new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.2 })
            );
            cabin.position.set(carX, 0.82, sz);
            group.add(cabin);
          }
        }
      }

      // Poste + Totem Azul P de Estacionamento
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 4.2, 10),
        new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.5 })
      );
      pole.position.set(cx, 2.1, cz);
      group.add(pole);

      const sign = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createBadgeTexture(`🅿️ ${title}`, subtitle, '#0f172a', '#38bdf8', '#38bdf8', '#f8fafc'),
          transparent: true,
        })
      );
      sign.position.set(cx, 4.9, cz);
      sign.scale.set(7.6, 2.05, 1);
      group.add(sign);

      scene.add(group);
    };

    // 3 Estacionamentos claros no entorno do Capim Dourado
    buildParkingLot(-2, 20.5, 44, 9.5, 'ESTACIONAMENTO FRONTAL', 'Portaria Principal • 1.200 Vagas', 2, 14);
    buildParkingLot(-37.5, -1, 8.8, 30, 'ESTACIONAMENTO AV. JK', 'Acesso Rápido Renner / Ala Sul', 6, 3);
    buildParkingLot(34.5, -1, 8.8, 30, 'ESTACIONAMENTO LAZER', 'Acesso Cinemark / MoroFit', 6, 3);

    // Cancelas de Entrada de Veículos
    [
      [-23, 25.5],
      [19, 25.5],
    ].forEach(([gx, gz]) => {
      const gateArm = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.14, 0.14),
        new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.3 })
      );
      gateArm.position.set(gx, 1.0, gz);
      scene.add(gateArm);
    });

    // === LAJE PRINCIPAL 1º PAVIMENTO (TÉRREO) ===
    const l1Floor = new THREE.Mesh(
      new THREE.BoxGeometry(60, 0.4, 34),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35, metalness: 0.05 })
    );
    l1Floor.position.set(-1, -0.1, -2);
    l1Floor.receiveShadow = true;
    scene.add(l1Floor);

    // Grid arquitetônico discreto no piso do corredor Térreo
    const l1Grid = new THREE.GridHelper(58, 29, '#cbd5e1', '#e2e8f0');
    l1Grid.position.set(-1, 0.12, -2);
    scene.add(l1Grid);

    // === 4 PORTARIAS / ENTRADAS ILUMINADAS DO SHOPPING ===
    const buildEntrancePortal = (
      x: number,
      z: number,
      rotY: number,
      title: string,
      subtitle: string
    ) => {
      const portal = new THREE.Group();
      portal.position.set(x, 0, z);
      portal.rotation.y = rotY;

      // Marquise escura Obsidian + filete Dourado Champagne
      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(6.8, 0.45, 3.0),
        new THREE.MeshStandardMaterial({ color: '#111318', roughness: 0.35, metalness: 0.25 })
      );
      canopy.position.set(0, 3.4, 0);
      canopy.castShadow = true;
      portal.add(canopy);

      const goldRim = new THREE.Mesh(
        new THREE.BoxGeometry(7.0, 0.16, 3.15),
        new THREE.MeshStandardMaterial({ color: '#E2A83B', roughness: 0.25, metalness: 0.6 })
      );
      goldRim.position.set(0, 3.68, 0);
      portal.add(goldRim);

      // Pilares laterais da portaria
      const pillarMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.3 });
      [-3.0, 3.0].forEach((px) => {
        const pil = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.4, 0.45), pillarMat);
        pil.position.set(px, 1.7, 0.9);
        portal.add(pil);
      });

      // Portas de vidro iluminadas
      const doorGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(5.2, 2.9),
        new THREE.MeshStandardMaterial({
          color: '#10b981',
          emissive: '#34d399',
          emissiveIntensity: 0.35,
          transparent: true,
          opacity: 0.38,
          side: THREE.DoubleSide,
        })
      );
      doorGlass.position.set(0, 1.55, 0);
      portal.add(doorGlass);

      // Tapete esmeralda no chão indicando o fluxo de entrada
      const welcomeMat = new THREE.Mesh(
        new THREE.BoxGeometry(4.4, 0.14, 3.8),
        new THREE.MeshStandardMaterial({
          color: '#10b981',
          emissive: '#059669',
          emissiveIntensity: 0.35,
        })
      );
      welcomeMat.position.set(0, 0.08, 0.6);
      portal.add(welcomeMat);

      // Placa flutuante alta "🚪 ENTRADA ..."
      const badge = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createBadgeTexture(`🚪 ${title}`, subtitle, '#065f46', '#34d399', '#ffffff', '#a7f3d0'),
          transparent: true,
        })
      );
      badge.position.set(0, 5.2, 0);
      badge.scale.set(6.8, 1.85, 1);
      portal.add(badge);

      scene.add(portal);
    };

    buildEntrancePortal(-8.5, 14.8, 0, 'ENTRADA PRINCIPAL', 'Portaria A • Estac. Frontal');
    buildEntrancePortal(11.0, 14.8, 0, 'ENTRADA ALAMEDA', 'Outback / Madero • Portaria B');
    buildEntrancePortal(-30.5, -1.5, Math.PI / 2, 'ENTRADA AV. JK', 'Portaria Sul • Renner');
    buildEntrancePortal(28.5, 5.0, -Math.PI / 2, 'ENTRADA CINEMARK', 'Portaria Leste • Lazer');

    // === 2º PAVIMENTO (PRAÇA DE ALIMENTAÇÃO ELEVADA EM Y = 6.2) ===
    const l2DeckY = 6.2;
    const l2Floor = new THREE.Mesh(
      new THREE.BoxGeometry(31, 0.45, 22),
      new THREE.MeshStandardMaterial({
        color: '#fefce8',
        roughness: 0.3,
        transparent: true,
        opacity: 0.94,
      })
    );
    l2Floor.position.set(-1.5, l2DeckY - 0.2, 0);
    l2Floor.castShadow = true;
    l2Floor.receiveShadow = true;
    scene.add(l2Floor);

    // Guarda-corpo de vidro do 2º andar (átrio central aberto para ver lá embaixo!)
    const glassRailMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.32,
      roughness: 0.1,
    });
    const railFront = new THREE.Mesh(new THREE.BoxGeometry(28, 1.0, 0.15), glassRailMat);
    railFront.position.set(-1.5, l2DeckY + 0.5, 4.4);
    scene.add(railFront);
    const railBack = new THREE.Mesh(new THREE.BoxGeometry(28, 1.0, 0.15), glassRailMat);
    railBack.position.set(-1.5, l2DeckY + 0.5, -4.4);
    scene.add(railBack);

    // Colunas estruturais elegantes sustentando o 2º piso
    const colGeo = new THREE.CylinderGeometry(0.32, 0.32, l2DeckY, 16);
    const colMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.3, roughness: 0.4 });
    [
      [-15, -9],
      [-15, 9],
      [12, -9],
      [12, 9],
    ].forEach(([cx, cz]) => {
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(cx, l2DeckY / 2, cz);
      scene.add(col);
    });

    // === ESCADA ROLANTE / RAMPA 3D LIGANDO 1º AO 2º PISO ===
    const escalatorGroup = new THREE.Group();
    const rampLen = 9.5;
    const rampMesh = new THREE.Mesh(
      new THREE.BoxGeometry(rampLen, 0.35, 2.2),
      new THREE.MeshStandardMaterial({ color: '#d97706', metalness: 0.4, roughness: 0.3 })
    );
    rampMesh.position.set(14.5, 3.1, 0);
    rampMesh.rotation.z = -Math.atan2(l2DeckY, rampLen * 0.72);
    escalatorGroup.add(rampMesh);
    scene.add(escalatorGroup);

    // === CONSTRUÇÃO DAS LOJAS 3D + VITRINES + LETREIROS ===
    const interactiveMeshes: THREE.Mesh[] = [];
    const storeSignSprites: THREE.Sprite[] = [];

    STORES_3D.forEach((st) => {
      const baseY = st.floor === 'L2' ? l2DeckY : 0;
      const telemetry = zonesTelemetry.find((z) => z.zone.id === st.zoneId);
      const score = telemetry?.opportunityScore ?? 65;

      // Corpo da loja
      const boxGeo = new THREE.BoxGeometry(st.w, st.h, st.d);
      const boxMat = new THREE.MeshStandardMaterial({
        color: st.color,
        roughness: 0.45,
        metalness: 0.08,
      });
      const mesh = new THREE.Mesh(boxGeo, boxMat);
      mesh.position.set(st.x, baseY + st.h / 2, st.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { zoneId: st.zoneId, floor: st.floor, storeName: st.name };
      scene.add(mesh);
      interactiveMeshes.push(mesh);

      // Moldura / borda de destaque colorida no topo da loja
      const trimGeo = new THREE.BoxGeometry(st.w + 0.12, 0.24, st.d + 0.12);
      const trimMat = new THREE.MeshStandardMaterial({
        color: st.accent,
        roughness: 0.3,
      });
      const trim = new THREE.Mesh(trimGeo, trimMat);
      trim.position.set(st.x, baseY + st.h + 0.08, st.z);
      scene.add(trim);

      // Vitrine iluminada na face voltada para o corredor
      const vitrineZ = st.z > 0 ? st.z - st.d / 2 - 0.03 : st.z + st.d / 2 + 0.03;
      const vitrineGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(st.w * 0.78, st.h * 0.65),
        new THREE.MeshStandardMaterial({
          color: '#38bdf8',
          emissive: '#bae6fd',
          emissiveIntensity: 0.25,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
        })
      );
      vitrineGlass.position.set(st.x, baseY + st.h * 0.42, vitrineZ);
      scene.add(vitrineGlass);

      // Letreiro Flutuante Nítido (Sprite sempre legível ao caminhar ou girar!)
      const signBadge = st.isVacant ? 'ESPAÇO VAGO • EXPANSÃO' : `IQ ${score} • ${telemetry?.footTraffic ?? 400}/h`;
      const tex = createSignTexture(st.name, signBadge, st.accent, st.isVacant);
      const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(st.x, baseY + st.h + 1.45, st.z);
      sprite.scale.set(5.4, 1.7, 1);
      scene.add(sprite);
      storeSignSprites.push(sprite);
    });

    // === FLUXO ANIMADO DE VISITANTES NOS CORREDORES (3 ROTAS DE CORES) ===
    interface FlowWalker {
      mesh: THREE.Mesh;
      path: THREE.CatmullRomCurve3;
      t: number;
      speed: number;
    }

    const walkers: FlowWalker[] = [];
    const routesDefs = [
      {
        color: '#2563eb', // Rota Azul: Moda & Âncoras (Renner -> RCHLO -> STZ)
        points: [
          new THREE.Vector3(-23, 0.55, 2.2),
          new THREE.Vector3(-10, 0.55, 2.8),
          new THREE.Vector3(6, 0.55, 2.2),
          new THREE.Vector3(14, 0.55, 0.5),
        ],
      },
      {
        color: '#7c3aed', // Rota Violeta: Lazer & Cinema (MoroFit -> WoW -> Cinemark)
        points: [
          new THREE.Vector3(14.5, 0.55, -15),
          new THREE.Vector3(14.5, 0.55, -7),
          new THREE.Vector3(14.5, 0.55, 1),
          new THREE.Vector3(14.5, 0.55, 7),
        ],
      },
      {
        color: '#d97706', // Rota Dourada: Gastronomia & Subida Escada Rolante L2
        points: [
          new THREE.Vector3(-3, 0.55, 4.5),
          new THREE.Vector3(9, 0.55, 4.2),
          new THREE.Vector3(16.5, 0.55, 0),
          new THREE.Vector3(10.5, l2DeckY + 0.55, 0),
          new THREE.Vector3(-4, l2DeckY + 0.55, 0),
          new THREE.Vector3(-11, l2DeckY + 0.55, -2.5),
        ],
      },
    ];

    routesDefs.forEach((r) => {
      const curve = new THREE.CatmullRomCurve3(r.points);
      const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.14, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: r.color,
        transparent: true,
        opacity: 0.45,
      });
      scene.add(new THREE.Mesh(tubeGeo, tubeMat));

      for (let i = 0; i < 4; i++) {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.32, 12, 12),
          new THREE.MeshBasicMaterial({ color: r.color })
        );
        scene.add(dot);
        walkers.push({ mesh: dot, path: curve, t: i * 0.25, speed: 0.0022 });
      }
    });

    // === ESTADO DE PASSEIO 1ª PESSOA (GOOGLE STREET VIEW STYLE) ===
    const walkState = {
      pos: new THREE.Vector3(-12, 1.8, 2.2),
      yaw: -Math.PI / 2, // Olhando ao longo do corredor rumo às lojas centrais
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
          const data = hits[0].object.userData as { zoneId?: ZoneId; floor?: FloorId };
          if (data.zoneId) {
            onSelectZoneRef.current(data.zoneId);
            if (data.floor) onFloorChangeRef.current(data.floor);
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
        walkState.pos.x = Math.max(-39, Math.min(37, walkState.pos.x));
        walkState.pos.z = Math.max(-17, Math.min(25, walkState.pos.z));
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      pressedKeys.add(e.key.toLowerCase());
    };
    const onKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.key.toLowerCase());
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    domEl.addEventListener('wheel', onWalkWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    actionsRef.current = {
      zoom: (factor: number) => {
        if (viewModeRef.current === 'walk') {
          walkState.pos.x += Math.sin(walkState.yaw) * (factor < 1 ? 2.5 : -2.5);
          walkState.pos.z += Math.cos(walkState.yaw) * (factor < 1 ? 2.5 : -2.5);
          return;
        }
        const offset = camera.position.clone().sub(controls.target).multiplyScalar(factor);
        const dist = offset.length();
        if (dist >= controls.minDistance && dist <= controls.maxDistance) {
          camera.position.copy(controls.target).add(offset);
        }
      },
      resetOrbit: (targetFloor: FloorId) => {
        controls.enabled = true;
        if (targetFloor === 'L2') {
          controls.target.set(-2, l2DeckY + 1, 0);
          camera.position.set(0, l2DeckY + 20, 26);
        } else {
          controls.target.set(0, 2, 3);
          camera.position.set(0, 36, 48);
        }
      },
      enterWalk: (targetFloor: FloorId) => {
        controls.enabled = false;
        if (targetFloor === 'L2') {
          walkState.pos.set(6, l2DeckY + 1.85, 0);
          walkState.yaw = -Math.PI / 2;
        } else {
          // Começa entrando pela Portaria Principal (Av. NS-05) olhando os corredores
          walkState.pos.set(-8.5, 1.85, 11.5);
          walkState.yaw = Math.PI;
        }
        walkState.pitch = 0.03;
        syncWalkCamera();
      },
      nudgeWalk: (forward: number, strafe: number, turnYaw: number) => {
        walkState.yaw += turnYaw;
        walkState.pos.x += Math.sin(walkState.yaw) * forward + Math.cos(walkState.yaw) * strafe;
        walkState.pos.z += Math.cos(walkState.yaw) * forward - Math.sin(walkState.yaw) * strafe;
        walkState.pos.x = Math.max(-39, Math.min(37, walkState.pos.x));
        walkState.pos.z = Math.max(-17, Math.min(25, walkState.pos.z));
      },
    };

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Movimento de visitantes pelos corredores
      for (const w of walkers) {
        w.t = (w.t + w.speed) % 1;
        const pt = w.path.getPointAt(w.t);
        w.mesh.position.copy(pt);
      }

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
        if (pressedKeys.has('a') || pressedKeys.has('arrowleft')) {
          walkState.yaw += 0.035;
        }
        if (pressedKeys.has('d') || pressedKeys.has('arrowright')) {
          walkState.yaw -= 0.035;
        }
        walkState.pos.x = Math.max(-39, Math.min(37, walkState.pos.x));
        walkState.pos.z = Math.max(-17, Math.min(25, walkState.pos.z));
        syncWalkCamera();
      } else {
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
  }, [zonesTelemetry]);

  // Ajusta câmera ao trocar de modo ou pavimento
  const handleToggleViewMode = (mode: 'orbit' | 'walk') => {
    setViewMode(mode);
    if (mode === 'walk') {
      actionsRef.current?.enterWalk(floor);
    } else {
      actionsRef.current?.resetOrbit(floor);
    }
  };

  const handleSwitchFloor = (nextFloor: FloorId) => {
    onFloorChange(nextFloor);
    if (viewMode === 'walk') {
      actionsRef.current?.enterWalk(nextFloor);
    } else {
      actionsRef.current?.resetOrbit(nextFloor);
    }
  };

  if (webglUnsupported) {
    return (
      <div className="h-[460px] rounded-2xl bg-slate-100 border border-slate-300 flex items-center justify-center p-6 text-center text-sm text-slate-700">
        Navegador sem WebGL ativo no momento — use os botões das alas abaixo para inspecionar os dados.
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-300 bg-[#eef1f6] shadow-inner">
      {/* Canvas 3D Real Interativo */}
      <div
        ref={mountRef}
        className="w-full h-[460px] sm:h-[520px] cursor-grab active:cursor-grabbing"
        aria-label="Maquete 3D interativa e passeio virtual em primeira pessoa pelo Capim Dourado Shopping"
      />

      {/* Controles Superiores Flutuantes Limpos */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-stone-200 shadow-md">
          {activeZone && (
            <span className="hidden sm:inline-flex px-2.5 py-1 rounded-lg bg-[#111318] text-[#E2A83B] text-[11px] font-extrabold">
              {activeZone.zone.shortName}
            </span>
          )}
          <button
            type="button"
            onClick={() => handleToggleViewMode('orbit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              viewMode === 'orbit'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Maquete 3D (Zoom)</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleViewMode('walk')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              viewMode === 'walk'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Entrar no Shopping (Street View)</span>
          </button>
        </div>

        {/* Botão Direto de Escada Rolante (Subir / Descer Andar) + Zoom */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-md">
          <button
            type="button"
            onClick={() => handleSwitchFloor(floor === 'L1' ? 'L2' : 'L1')}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{floor === 'L1' ? 'Subir ao 2º Andar' : 'Descer ao Térreo'}</span>
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

      {/* Joypad de Caminhada no Modo Street View */}
      {viewMode === 'walk' && (
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-3 pointer-events-none">
          <div className="pointer-events-auto bg-slate-900/90 text-white px-3.5 py-2.5 rounded-xl text-[11px] backdrop-blur-md shadow-lg max-w-sm">
            <strong className="text-amber-400 block mb-0.5">Modo Street View Ativo ({floor === 'L1' ? 'Térreo' : '2º Piso'})</strong>
            Arraste para olhar as vitrines • Use <strong>Scroll / W A S D</strong> ou os botões ao lado para andar pelos corredores.
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-lg">
            <button
              type="button"
              aria-label="Virar à Esquerda"
              onClick={() => actionsRef.current?.nudgeWalk(0, 0, 0.35)}
              className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
            >
              ↺ Esq
            </button>
            <button
              type="button"
              aria-label="Andar para Frente"
              onClick={() => actionsRef.current?.nudgeWalk(3.0, 0, 0)}
              className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1"
            >
              <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Frente</span>
            </button>
            <button
              type="button"
              aria-label="Andar para Trás"
              onClick={() => actionsRef.current?.nudgeWalk(-3.0, 0, 0)}
              className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1"
            >
              <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Virar à Direita"
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
              <MoveUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{floor === 'L1' ? '2º Piso' : '1º Piso'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Legenda compacta no modo Maquete Orbital */}
      {viewMode === 'orbit' && (
        <div className="absolute bottom-3 left-3 pointer-events-none bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-stone-200 text-[11px] text-slate-700 shadow-sm flex flex-wrap items-center gap-3">
          <span>🖱️ <strong>Scroll:</strong> Zoom</span>
          <span>✋ <strong>Arrastar:</strong> Girar 360°</span>
          <span>🚪 <strong>Portarias Verdes:</strong> 4 Entradas</span>
          <span>🅿️ <strong>Bolsões:</strong> Estacionamento</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600" /> Moda</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-600" /> Lazer/Cinema</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-600" /> Gastronomia/L2</span>
        </div>
      )}
    </div>
  );
};
