import React, { useEffect, useState } from 'react';
import { resolveApiUrl } from '../services/ai';

export type StoreAvatarVariant = 'square' | 'wide' | 'hero';

interface StoreAvatarProps {
  storeName: string;
  logoUrl?: string;
  sizeClass?: string;
  roundedClass?: string;
  variant?: StoreAvatarVariant;
}

const VARIANT_SIZE_CLASSES: Record<StoreAvatarVariant, string> = {
  square: 'w-14 h-14',
  wide: 'h-14 min-w-[5.25rem] max-w-[7.5rem] px-1.5',
  hero: 'w-28 h-20 sm:w-32 sm:h-24',
};

/** Retorna URL segura via proxy CORS do backend quando for imagem externa HTTP(S). */
export function buildProxiedLogoUrl(logoUrl?: string): string | undefined {
  if (!logoUrl) return undefined;
  if (logoUrl.startsWith('data:') || logoUrl.startsWith('/')) return logoUrl;
  return `${resolveApiUrl()}/api/logo-proxy?url=${encodeURIComponent(logoUrl)}`;
}

/**
 * Miniatura da marca da loja em destaque com fundo branco limpo e borda dourada,
 * com fallback proporcional em monograma dourado caso a imagem falhe no carregamento.
 */
export const StoreAvatar: React.FC<StoreAvatarProps> = ({
  storeName,
  logoUrl,
  sizeClass,
  roundedClass = 'rounded-xl',
  variant = 'square',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [logoUrl]);

  const resolvedSizeClass = sizeClass ?? VARIANT_SIZE_CLASSES[variant];
  const fallbackTextClass = variant === 'hero' ? 'text-base sm:text-lg' : 'text-sm';

  const initials = storeName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  if (logoUrl && !failed) {
    return (
      <span
        className={`${resolvedSizeClass} ${roundedClass} bg-white border-2 border-[#E2A83B]/75 overflow-hidden flex items-center justify-center shrink-0 p-1 shadow-md`}
      >
        <img
          src={logoUrl}
          alt={`Logo ${storeName}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="w-full h-full object-contain"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${resolvedSizeClass} ${roundedClass} gold-pill-metallic font-black ${fallbackTextClass} flex items-center justify-center shrink-0 tracking-tight shadow-md`}
    >
      {initials || 'VQ'}
    </span>
  );
};

