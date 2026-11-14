import * as THREE from 'three';
import {
  CAPIM_PARKING_3D,
  CAPIM_PORTALS_3D,
  L2_DECK_Y,
} from '../../data/capimDourado3DLayout';
import {
  AnimatedTread,
  ElevatorCabin,
  GATE_ARM_POSITIONS,
  L2_EXTRA_DECKS,
  L2_PILLAR_POSITIONS,
  LANDSCAPE_TREE_POSITIONS,
  ROAD_SIGNS,
  TRAFFIC_CAR_COLORS,
} from './map3dConfig';
import { createBadgeSprite } from './map3dSignage';

export interface MallShellBuildResult {
  groundMat: THREE.MeshStandardMaterial;
  obsidianGridGroup: THREE.Group;
  l1DeckMat: THREE.MeshStandardMaterial;
  ovalPlazaMat: THREE.MeshStandardMaterial;
  subsoloCover: THREE.Mesh;
  l2FoodSlabMat: THREE.MeshStandardMaterial;
  l2ExtraDeckMats: THREE.MeshStandardMaterial[];
  l2Materials: THREE.MeshStandardMaterial[];
  l2Objects: THREE.Object3D[];
  subsoloObjects: THREE.Object3D[];
  animatedTreads: AnimatedTread[];
  elevatorCabins: ElevatorCabin[];
}

/** Constrói rotatória viária 3D realista com ilha central verde e meio-fio. */
export function buildRoundabout(
  cx: number,
  cz: number,
  outerR: number,
  roadMat: THREE.Material
): THREE.Group {
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

/** Constrói palmeira/árvore estilizada de paisagismo urbano. */
export function buildTree(x: number, z: number, heightScale = 1): THREE.Group {
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

/** Constrói torre panorâmica de elevador vidro e aço com cabine dourada animável. */
export function buildElevatorTower(
  x: number,
  z: number,
  yStart: number,
  yEnd: number
): ElevatorCabin {
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
    new THREE.MeshStandardMaterial({
      color: '#E2A83B',
      emissive: '#b45309',
      emissiveIntensity: 0.35,
    })
  );
  cabin.position.set(x, yStart + h * 0.4, z);
  g.add(cabin);
  return { group: g, cabin, yStart, h };
}

function createRoadStrip(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.Material,
  rotY = 0
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  if (rotY !== 0) mesh.rotation.y = rotY;
  return mesh;
}

function buildRoadAndLandscaping(scene: THREE.Scene): void {
  const roadMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.85 });
  const laneLineMat = new THREE.MeshBasicMaterial({ color: '#facc15' });

  // Avenida NS-05 (Fachada Principal Leste, +Z)
  scene.add(createRoadStrip(116, 0.14, 4.8, 0, -0.1, 24.5, roadMat));
  scene.add(createRoadStrip(106, 0.15, 0.22, 0, -0.09, 24.5, laneLineMat));

  // Avenida JK (Sul, -X)
  scene.add(createRoadStrip(4.8, 0.14, 68, -42.5, -0.1, -2, roadMat));
  scene.add(createRoadStrip(0.22, 0.15, 62, -42.5, -0.09, -2, laneLineMat));

  // Avenida LO-2A (Norte, +X)
  scene.add(createRoadStrip(4.8, 0.14, 70, 37.5, -0.1, -3, roadMat));
  scene.add(createRoadStrip(0.22, 0.15, 64, 37.5, -0.09, -3, laneLineMat));

  // Via Oeste interna em diagonal real (Curva JK/Oeste até 3ª Rotatória e Cancelas Norte)
  scene.add(createRoadStrip(50, 0.12, 3.2, -12, -0.11, -28.5, roadMat, 0.12));
  scene.add(createRoadStrip(28, 0.12, 3.2, 24, -0.11, -31.8, roadMat, 0.08));

  // 2 Rotatórias da NS-05 + 3ª Rotatória Interna Oeste (acesso C&A / P2 / Subsolo)
  scene.add(buildRoundabout(-42.5, 24.5, 5.2, roadMat));
  scene.add(buildRoundabout(37.5, 24.5, 5.2, roadMat));
  scene.add(buildRoundabout(12.5, -24.5, 3.2, roadMat));

  // Paisagismo (Palmeiras nos canteiros da P1, Rotatórias e Estac. Oeste)
  LANDSCAPE_TREE_POSITIONS.forEach(([tx, tz, ts]) => scene.add(buildTree(tx, tz, ts)));

  // Placas das Avenidas Reais + Bússola Norte + Docas Operacionais
  ROAD_SIGNS.forEach((rs) => {
    scene.add(
      createBadgeSprite({
        title: rs.text,
        subtitle: rs.sub,
        bgHex: '#0f172a',
        borderHex: '#94a3b8',
        textHex: '#f8fafc',
        subHex: '#cbd5e1',
        position: [rs.x, 3.3, rs.z],
        scale: [7.6, 1.9],
      })
    );
  });

  // Sinalização discreta das Docas de Carga (Lado Leste/Norte - Planta Mix)
  scene.add(
    createBadgeSprite({
      title: '🚚 DOCAS DE CARGA',
      subtitle: 'Doca Super Big • Doca 1 • DEXT 01-02',
      bgHex: '#1e293b',
      borderHex: '#64748b',
      textHex: '#e2e8f0',
      subHex: '#94a3b8',
      position: [32.5, 3.0, -18],
      scale: [5.8, 1.45],
    })
  );
}

function buildParkingAndSubsolo(
  scene: THREE.Scene,
  subsoloObjects: THREE.Object3D[]
): void {
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

    const stripeMat = new THREE.MeshBasicMaterial({
      color: isUnderground ? '#93c5fd' : '#f8fafc',
    });
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
            new THREE.BoxGeometry(
              Math.min(1.4, stepX * 0.65),
              0.6,
              Math.min(2.3, stepZ * 0.54)
            ),
            new THREE.MeshStandardMaterial({
              color: TRAFFIC_CAR_COLORS[(r + c * 2) % TRAFFIC_CAR_COLORS.length],
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

    group.add(
      createBadgeSprite({
        title: `🅿️ ${lot.title}`,
        subtitle: lot.subtitle,
        bgHex: isUnderground ? '#082f49' : '#0f172a',
        borderHex: isUnderground ? '#fbbf24' : '#38bdf8',
        textHex: isUnderground ? '#fde68a' : '#38bdf8',
        subHex: '#f8fafc',
        position: [lot.cx, totemY, lot.cz],
        scale: isUnderground ? [7.0, 1.8] : [7.4, 1.95],
      })
    );

    scene.add(group);
    if (isUnderground) {
      subsoloObjects.push(group);
    }
  });

  // Motos & Bicicletário na extremidade NORTE-LESTE do Subsolo 1 (Planta Mix p1_ss1) + Rampa Veicular
  const motoSign = createBadgeSprite({
    title: '🏍️ MOTOS & BICICLETÁRIO',
    subtitle: 'Subsolo 1 (Norte-Leste) • Rampa LO-2A',
    bgHex: '#111827',
    borderHex: '#34d399',
    textHex: '#6ee7b7',
    subHex: '#e2e8f0',
    position: [17.5, -2.5, -25.5],
    scale: [6.0, 1.5],
  });
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
  const gateMat = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.3 });
  GATE_ARM_POSITIONS.forEach(([gx, gz]) => {
    const gateArm = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 0.14), gateMat);
    gateArm.position.set(gx, 0.9, gz);
    scene.add(gateArm);
  });
}

function buildPortalsAndTravelators(
  scene: THREE.Scene,
  subsoloObjects: THREE.Object3D[],
  animatedTreads: AnimatedTread[]
): ElevatorCabin[] {
  // === 3 ESTEIRAS ROLANTES ANIMADAS (SUBSOLO 1 ↔ SUPER BIG / ZIG ZAG / WOW / MOROFIT) ===
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

  travelatorGroup.add(
    createBadgeSprite({
      title: '🪜 3 ESTEIRAS ROLANTES (SUBSOLO)',
      subtitle: 'Subsolo 1 ↔ Super Big / Zig Zag / Morofit',
      bgHex: '#78350f',
      borderHex: '#fbbf24',
      textHex: '#fef3c7',
      subHex: '#fde68a',
      position: [18.2, 2.9, -17.7],
      scale: [6.6, 1.7],
    })
  );
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
      new THREE.MeshStandardMaterial({
        color: '#10b981',
        emissive: '#059669',
        emissiveIntensity: 0.4,
      })
    );
    welcomeMat.position.set(0, 0.1, 0.4);
    portal.add(welcomeMat);

    portal.add(
      createBadgeSprite({
        title: `🚪 ${pt.title}`,
        subtitle: pt.subtitle,
        bgHex: '#065f46',
        borderHex: '#34d399',
        textHex: '#ffffff',
        subHex: '#a7f3d0',
        position: [0, 4.9, 0],
        scale: [6.2, 1.58],
      })
    );

    scene.add(portal);
  });

  return elevatorCabins;
}

function buildSecondFloorDeck(
  scene: THREE.Scene,
  isInitialObsidian: boolean,
  l2Materials: THREE.MeshStandardMaterial[],
  l2Objects: THREE.Object3D[],
  animatedTreads: AnimatedTread[]
): {
  l2FoodSlabMat: THREE.MeshStandardMaterial;
  l2ExtraDeckMats: THREE.MeshStandardMaterial[];
} {
  // === 2º PAVIMENTO PARABÓLICO REAL (PRAÇA DE ALIMENTAÇÃO L2 + MESAS + GUARDA-CORPO + CLARABOIA) ===
  const l2DeckY = L2_DECK_Y;
  const foodCourtShape = new THREE.Shape();
  foodCourtShape.moveTo(-32.8, -6.5);
  foodCourtShape.quadraticCurveTo(-36.5, 0.5, -32.8, 7.6);
  foodCourtShape.lineTo(-11.5, 7.6);
  foodCourtShape.quadraticCurveTo(-7.2, 0.5, -11.5, -6.5);
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
  l2Materials.push(l2FoodSlabMat);
  const l2FoodSlab = new THREE.Mesh(l2Geo, l2FoodSlabMat);
  l2FoodSlab.position.set(0, l2DeckY, 0);
  scene.add(l2FoodSlab);
  l2Objects.push(l2FoodSlab);

  // Guarda-corpo de vidro do mezanino L2 + Claraboia curva
  const balustradeMat = new THREE.MeshStandardMaterial({
    color: '#7dd3fc',
    transparent: true,
    opacity: 0.42,
  });
  l2Materials.push(balustradeMat);
  const balustrade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 9.6), balustradeMat);
  balustrade.position.set(-9.6, l2DeckY + 0.45, 0.5);
  scene.add(balustrade);
  l2Objects.push(balustrade);

  [-26, -20, -14].forEach((sx) => {
    const archMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      metalness: 0.5,
      transparent: true,
      opacity: 0.38,
    });
    l2Materials.push(archMat);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.14, 8, 24, Math.PI), archMat);
    arch.position.set(sx, l2DeckY + 3.4, 0.4);
    arch.rotation.y = Math.PI / 2;
    scene.add(arch);
    l2Objects.push(arch);
  });

  // Mesas & Cadeiras reais no miolo da Praça de Alimentação L2
  const tableMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.3,
    transparent: true,
    opacity: 1.0,
  });
  const chairMat = new THREE.MeshStandardMaterial({
    color: '#b45309',
    roughness: 0.6,
    transparent: true,
    opacity: 1.0,
  });
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

  // Pilares estruturais brancos/metálicos cilíndricos sustentando a laje de L2 (F25)
  const pillarMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    metalness: 0.35,
    roughness: 0.25,
    transparent: true,
    opacity: 1.0,
  });
  l2Materials.push(pillarMat);
  const pillarGeo = new THREE.CylinderGeometry(0.28, 0.28, l2DeckY, 16);
  L2_PILLAR_POSITIONS.forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(px, l2DeckY / 2, pz);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    scene.add(pillar);
    l2Objects.push(pillar);
  });

  // Blocos extras reais L2 (Colégio Interação A8 & Unicesumar/IOA)
  const l2ExtraDeckMats: THREE.MeshStandardMaterial[] = [];
  L2_EXTRA_DECKS.forEach((b) => {
    const deckMat = new THREE.MeshStandardMaterial({
      color: isInitialObsidian ? '#1b2333' : '#fef9c3',
      roughness: 0.32,
      metalness: 0.12,
      transparent: true,
      opacity: 0.88,
    });
    l2Materials.push(deckMat);
    l2ExtraDeckMats.push(deckMat);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(b.w, 0.35, b.d), deckMat);
    deck.position.set(b.x, l2DeckY - 0.1, b.z);
    scene.add(deck);
    l2Objects.push(deck);
  });

  // Escadas Rolantes L1 ↔ L2 (ao lado do Bistrô 81 → bico parabólico da Praça L2) (F24)
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

  return { l2FoodSlabMat, l2ExtraDeckMats };
}

/**
 * Constrói toda a casca arquitetônica e entorno viário do Capim Dourado Shopping
 * (terreno, grid Obsidian, malha viária, estacionamentos SS1/SS2/superfície, lajes L1 e L2,
 * praça de eventos, portarias, esteiras, elevadores e escadas rolantes).
 */
export function buildMallShell(
  scene: THREE.Scene,
  isInitialObsidian: boolean,
  isInitialXray: boolean
): MallShellBuildResult {
  const l2Materials: THREE.MeshStandardMaterial[] = [];
  const l2Objects: THREE.Object3D[] = [];
  const subsoloObjects: THREE.Object3D[] = [];
  const animatedTreads: AnimatedTread[] = [];

  // === TERRENO BASE (translúcido no modo Raio-X para revelar SS1 e SS2) ===
  const groundMat = new THREE.MeshStandardMaterial({
    color: isInitialObsidian ? '#0a0e16' : '#e5e7eb',
    roughness: 0.95,
  });
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
    m.opacity = 0.2;
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

  buildRoadAndLandscaping(scene);
  buildParkingAndSubsolo(scene, subsoloObjects);

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
    transparent: isInitialXray,
    opacity: isInitialXray ? 0.28 : 1.0,
  });
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
  const ovalPlaza = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.14, 28), ovalPlazaMat);
  ovalPlaza.scale.set(1.35, 1, 0.8);
  ovalPlaza.position.set(-4.5, 0.1, 4.2);
  scene.add(ovalPlaza);

  // Cobertura leve sobre área do Subsolo no nível 0 (some no Raio-X)
  const subsoloCover = new THREE.Mesh(
    new THREE.BoxGeometry(19.5, 0.08, 11.2),
    new THREE.MeshStandardMaterial({ color: '#dbeafe', transparent: true, opacity: 0.42 })
  );
  subsoloCover.position.set(8.5, -0.05, -16.8);
  subsoloCover.visible = !isInitialXray;
  scene.add(subsoloCover);

  const elevatorCabins = buildPortalsAndTravelators(scene, subsoloObjects, animatedTreads);
  const { l2FoodSlabMat, l2ExtraDeckMats } = buildSecondFloorDeck(
    scene,
    isInitialObsidian,
    l2Materials,
    l2Objects,
    animatedTreads
  );

  return {
    groundMat,
    obsidianGridGroup,
    l1DeckMat,
    ovalPlazaMat,
    subsoloCover,
    l2FoodSlabMat,
    l2ExtraDeckMats,
    l2Materials,
    l2Objects,
    subsoloObjects,
    animatedTreads,
    elevatorCabins,
  };
}
