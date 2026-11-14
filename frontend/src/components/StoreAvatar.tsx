import React, { useState } from 'react';
import { resolveApiUrl } from '../services/ai';

interface StoreAvatarProps {
  storeName: string;
  logoUrl?: string;
  sizeClass?: string;
  roundedClass?: string;
}

/** Retorna URL segura via proxy CORS do backend quando for imagem externa HTTP(S). */
export function buildProxiedLogoUrl(logoUrl?: string): string | undefined {
  if (!logoUrl) return undefined;
  if (logoUrl.startsWith('data:') || logoUrl.startsWith('/')) return logoUrl;
  return `${resolveApiUrl()}/api/logo-proxy?url=${encodeURIComponent(logoUrl)}`;
}

/**
 * Miniatura da marca da loja com fallback elegante em monograma dourado
 * caso a imagem oficial falhe no carregamento.
 */
export const StoreAvatar: React.FC<StoreAvatarProps> = ({
  storeName,
  logoUrl,
  sizeClass = 'w-9 h-9',
  roundedClass = 'rounded-xl',
}) => {
  const [failed, setFailed] = useState(false);

  const initials = storeName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  if (logoUrl && !failed) {
    return (
      <span
        className={`${sizeClass} ${roundedClass} bg-white border border-[#E2A83B]/45 overflow-hidden flex items-center justify-center shrink-0 p-1 shadow-xs`}
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
      className={`${sizeClass} ${roundedClass} gold-pill-metallic font-black text-xs flex items-center justify-center shrink-0 tracking-tight`}
    >
      {initials || 'VQ'}
    </span>
  );
};
