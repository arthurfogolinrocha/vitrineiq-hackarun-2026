import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Monitor, Smartphone, Sparkles, X } from 'lucide-react';
import { ZoneId } from '../types';
import { buildProxiedLogoUrl } from './StoreAvatar';

export interface PosterDraft {
  storeName: string;
  logoUrl?: string;
  floorLabel?: string;
  zoneId: ZoneId;
  title: string;
  discountBadge: string;
  couponCode: string;
  copyText: string;
  expiresInMinutes: number;
  sourceLabel?: string;
}

interface PromoPosterModalProps {
  draft: PosterDraft | null;
  onClose: () => void;
}

type PosterFormat = 'vitrine' | 'stories';

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) {
    lines.push(line);
  }
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '…');
  }
  return lines;
}

function loadCorsImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = window.setTimeout(() => resolve(null), 3500);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

export const PromoPosterModal: React.FC<PromoPosterModalProps> = ({ draft, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<PosterFormat>('vitrine');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isRendering, setIsRendering] = useState(false);

  // Abre modal nativo com showModal() e garante light-dismiss em browsers sem closedby (Safari)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (draft && !dialog.open) {
      dialog.showModal();
    } else if (!draft && dialog.open) {
      dialog.close();
    }
  }, [draft]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };
    dialog.addEventListener('close', handleClose);

    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const inside =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (!inside) dialog.close();
      };
      dialog.addEventListener('click', handleBackdropClick);
      return () => {
        dialog.removeEventListener('close', handleClose);
        dialog.removeEventListener('click', handleBackdropClick);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
    };
  }, [onClose]);

  // Renderiza o cartaz em Canvas 1080px com Logo da Loja + QR Code real do Concierge
  useEffect(() => {
    if (!draft) return;
    let cancelled = false;

    const renderPoster = async () => {
      setIsRendering(true);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const width = 1080;
      const height = format === 'stories' ? 1920 : 1350;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fundo Obsidian Luxury
      ctx.fillStyle = '#0B0D12';
      ctx.fillRect(0, 0, width, height);

      // Glow radial dourado
      const glow = ctx.createRadialGradient(width * 0.5, height * 0.25, 40, width * 0.5, height * 0.35, 680);
      glow.addColorStop(0, 'rgba(226, 168, 59, 0.28)');
      glow.addColorStop(0.55, 'rgba(226, 168, 59, 0.08)');
      glow.addColorStop(1, 'rgba(11, 13, 18, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Moldura dourada dupla
      ctx.strokeStyle = 'rgba(245, 199, 107, 0.45)';
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, 42, 42, width - 84, height - 84, 44);
      ctx.stroke();

      // Cabeçalho Capim Dourado
      ctx.fillStyle = '#F5C76B';
      ctx.font = '700 24px "Plus Jakarta Sans", Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CAPIM DOURADO SHOPPING • PALMAS-TO', width / 2, 118);

      if (draft.floorLabel || draft.sourceLabel) {
        ctx.fillStyle = '#A8A29E';
        ctx.font = '600 21px Inter, sans-serif';
        ctx.fillText(draft.floorLabel || draft.sourceLabel || '', width / 2, 155);
      }

      // Selo da Logo da Loja (com imagem real via proxy CORS ou monograma)
      const logoBoxY = format === 'stories' ? 235 : 195;
      const logoBoxSize = 200;
      const proxiedLogo = buildProxiedLogoUrl(draft.logoUrl);
      const loadedLogo = proxiedLogo ? await loadCorsImage(proxiedLogo) : null;
      if (cancelled) return;

      ctx.save();
      drawRoundedRect(ctx, width / 2 - logoBoxSize / 2, logoBoxY, logoBoxSize, logoBoxSize, 36);
      ctx.fillStyle = loadedLogo ? '#FFFFFF' : '#181C26';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#E2A83B';
      ctx.stroke();

      if (loadedLogo) {
        ctx.clip();
        const pad = 22;
        const maxSide = logoBoxSize - pad * 2;
        const scale = Math.min(maxSide / loadedLogo.width, maxSide / loadedLogo.height);
        const drawW = loadedLogo.width * scale;
        const drawH = loadedLogo.height * scale;
        ctx.drawImage(
          loadedLogo,
          width / 2 - drawW / 2,
          logoBoxY + logoBoxSize / 2 - drawH / 2,
          drawW,
          drawH
        );
      } else {
        const initials = draft.storeName
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase() ?? '')
          .join('');
        ctx.fillStyle = '#F5C76B';
        ctx.font = '800 72px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials || 'VQ', width / 2, logoBoxY + logoBoxSize / 2);
      }
      ctx.restore();

      // Nome da loja
      const storeNameY = logoBoxY + logoBoxSize + 58;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 42px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(draft.storeName.toUpperCase(), width / 2, storeNameY);

      // Pílula de Desconto Dourada Metálica
      const badgeW = 540;
      const badgeH = 112;
      const badgeY = storeNameY + 46;
      const grad = ctx.createLinearGradient(width / 2 - badgeW / 2, badgeY, width / 2 + badgeW / 2, badgeY + badgeH);
      grad.addColorStop(0, '#D49421');
      grad.addColorStop(0.5, '#F9DC87');
      grad.addColorStop(1, '#CE8E1C');
      drawRoundedRect(ctx, width / 2 - badgeW / 2, badgeY, badgeW, badgeH, 56);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.fillStyle = '#0B0D12';
      ctx.font = '800 54px "Plus Jakarta Sans", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(draft.discountBadge.toUpperCase(), width / 2, badgeY + badgeH / 2 + 2);
      ctx.textBaseline = 'alphabetic';

      // Título da Oferta
      const titleY = badgeY + badgeH + 86;
      ctx.fillStyle = '#FAF8F5';
      ctx.font = '800 48px "Plus Jakarta Sans", sans-serif';
      const titleLines = wrapLines(ctx, draft.title, width - 170, 2);
      titleLines.forEach((ln, idx) => {
        ctx.fillText(ln, width / 2, titleY + idx * 58);
      });

      // Texto de Copy / Estratégia
      const copyY = titleY + titleLines.length * 58 + 26;
      ctx.fillStyle = '#D6D3D1';
      ctx.font = '500 28px Inter, sans-serif';
      const copyLines = wrapLines(ctx, draft.copyText, width - 180, format === 'stories' ? 5 : 3);
      copyLines.forEach((ln, idx) => {
        ctx.fillText(ln, width / 2, copyY + idx * 38);
      });

      // Bloco inferior: Cupom + QR Code Real do Shopping
      const qrBoxH = 260;
      const qrBoxY = height - qrBoxH - 96;
      drawRoundedRect(ctx, 84, qrBoxY, width - 168, qrBoxH, 32);
      ctx.fillStyle = '#FAF8F5';
      ctx.fill();

      const conciergeUrl = `https://vitrineiq-capim-dourado.vercel.app/?tela=concierge&ala=${draft.zoneId}`;
      const qrDataUrl = await QRCode.toDataURL(conciergeUrl, {
        width: 210,
        margin: 1,
        color: { dark: '#0B0D12', light: '#FAF8F5' },
      });
      const qrImg = await loadCorsImage(qrDataUrl);
      if (cancelled) return;

      if (qrImg) {
        ctx.drawImage(qrImg, width - 84 - 224, qrBoxY + 25, 210, 210);
      }

      ctx.textAlign = 'left';
      ctx.fillStyle = '#7A4B0A';
      ctx.font = '800 21px Inter, sans-serif';
      ctx.fillText(`VÁLIDO POR ${draft.expiresInMinutes} MIN • APRESENTE NO BALCÃO`, 122, qrBoxY + 62);

      ctx.fillStyle = '#0B0D12';
      ctx.font = '800 56px "JetBrains Mono", monospace';
      ctx.fillText(draft.couponCode.toUpperCase(), 122, qrBoxY + 136);

      ctx.fillStyle = '#44403C';
      ctx.font = '600 22px Inter, sans-serif';
      ctx.fillText('Escaneie o QR ao lado para resgatar no Concierge sem app', 122, qrBoxY + 195);

      ctx.fillStyle = '#78716C';
      ctx.font = '600 18px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('VitrineIQ • Inteligência de Vitrine em Tempo Real (LGPD Art. 6º)', width / 2, height - 56);

      setPreviewUrl(canvas.toDataURL('image/png'));
      setIsRendering(false);
    };

    renderPoster();
    return () => {
      cancelled = true;
    };
  }, [draft, format]);

  const fileSlug = (draft?.storeName || 'vitrineiq')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="poster-modal-title"
      className="w-[min(100%-2rem,56rem)] m-auto rounded-3xl border border-[#E2A83B]/40 bg-[#0B0D12] text-white p-0 shadow-2xl"
    >
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#F5C76B] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Cartaz &amp; Arte Promocional com Logo da Loja
            </span>
            <h3 id="poster-modal-title" className="text-lg font-extrabold text-white mt-0.5">
              Pronto para Stories, WhatsApp ou TV da Vitrine
            </h3>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Fechar gerador de cartaz"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Preview em tempo real */}
          <div className="md:col-span-7 flex items-center justify-center bg-[#12151D] rounded-2xl border border-white/10 p-3 min-h-[340px]">
            <canvas ref={canvasRef} className="hidden" />
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={`Cartaz promocional de ${draft?.storeName ?? 'VitrineIQ'}`}
                className="max-h-[460px] w-auto rounded-xl shadow-xl border border-[#E2A83B]/30 object-contain"
              />
            ) : (
              <span className="text-xs text-stone-400">
                {isRendering ? 'Gerando arte em alta resolução...' : 'Preparando cartaz...'}
              </span>
            )}
          </div>

          {/* Controles e Download */}
          <div className="md:col-span-5 space-y-4">
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                Formato da Arte
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('vitrine')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                    format === 'vitrine'
                      ? 'gold-pill-metallic border-transparent'
                      : 'bg-white/5 border-white/15 text-stone-200 hover:bg-white/10'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Vitrine 4:5</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('stories')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                    format === 'stories'
                      ? 'gold-pill-metallic border-transparent'
                      : 'bg-white/5 border-white/15 text-stone-200 hover:bg-white/10'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Stories 9:16</span>
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 space-y-1.5 text-xs">
              <p className="font-bold text-[#F5C76B]">O que vai na imagem:</p>
              <ul className="text-stone-300 space-y-1 text-[11px]">
                <li>• Logo oficial da loja <strong>{draft?.storeName}</strong></li>
                <li>• Cupom <strong>{draft?.couponCode}</strong> ({draft?.discountBadge})</li>
                <li>• QR Code real direto para o Concierge sem app</li>
              </ul>
            </div>

            {previewUrl && (
              <a
                href={previewUrl}
                download={`vitrineiq-${fileSlug}-${format}.png`}
                className="w-full py-3 px-4 rounded-xl gold-pill-metallic text-xs font-extrabold flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Baixar Imagem PNG (1080p)</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
};
