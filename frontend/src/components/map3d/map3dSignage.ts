import * as THREE from 'three';
import type { StoreTier } from '../../data/capimDourado3DLayout';
import type { VisualTheme } from './map3dConfig';

export interface BadgeSpriteOptions {
  title: string;
  subtitle: string;
  bgHex: string;
  borderHex: string;
  textHex: string;
  subHex: string;
  position: [number, number, number];
  scale: [number, number];
}

export interface SignTextureParams {
  title: string;
  badge: string;
  accent: string;
  tier: StoreTier;
  isVacant?: boolean;
  isHighlighted?: boolean;
  theme: VisualTheme;
}

/** Gera textura radial suave para as partículas do heatmap 3D. */
export function createSoftParticleTexture(): THREE.CanvasTexture {
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

/** Cria textura CanvasTexture 2D para letreiro suspenso de loja ou quiosque. */
export function createSignTexture(
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

/** Cria textura CanvasTexture 2D para placas viárias, portarias e totens de estacionamento. */
export function createBadgeTexture(
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

/** Instancia um THREE.Sprite posicionado e escalado a partir de uma placa badge. */
export function createBadgeSprite(options: BadgeSpriteOptions): THREE.Sprite {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createBadgeTexture(
        options.title,
        options.subtitle,
        options.bgHex,
        options.borderHex,
        options.textHex,
        options.subHex
      ),
      transparent: true,
    })
  );
  sprite.position.set(options.position[0], options.position[1], options.position[2]);
  sprite.scale.set(options.scale[0], options.scale[1], 1);
  return sprite;
}

/** Atualiza a textura do letreiro somente quando signKey muda, descartando a anterior. */
export function syncSignSpriteTexture(
  sprite: THREE.Sprite,
  signKey: string,
  params: SignTextureParams
): void {
  if (sprite.userData.signKey === signKey) return;
  const prevMat = sprite.material as THREE.SpriteMaterial;
  const nextTex = createSignTexture(
    params.title,
    params.badge,
    params.accent,
    params.tier,
    params.isVacant,
    params.isHighlighted,
    params.theme
  );
  if (prevMat.map) prevMat.map.dispose();
  prevMat.map = nextTex;
  // Mantém luminância linear abaixo de 0.84 para o UnrealBloomPass não estourar os letreiros
  prevMat.color.setRGB(0.84, 0.84, 0.84);
  prevMat.needsUpdate = true;
  sprite.userData.signKey = signKey;
}
