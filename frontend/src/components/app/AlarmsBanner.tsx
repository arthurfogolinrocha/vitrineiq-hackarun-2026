import React from 'react';
import { CAPIM_DOURADO_ZONES } from '../../data/shoppingData';
import { VitrineAlerta } from '../../services/api';
import { ZoneId } from '../../types';

interface AlarmsBannerProps {
  alerta: VitrineAlerta;
  onCreateCampaign: (zoneId: ZoneId, alertId: string) => void;
  onDismiss: (alertId: string) => void;
}

/** Banner de alerta em tempo real disparado pelo sensor da vitrine. */
export const AlarmsBanner: React.FC<AlarmsBannerProps> = ({
  alerta,
  onCreateCampaign,
  onDismiss,
}) => {
  const zoneLabel = CAPIM_DOURADO_ZONES.find((z) => z.id === alerta.zona)?.shortName ?? alerta.zona;

  return (
    <div
      role="alert"
      className="mb-5 p-4 rounded-2xl bento-card-obsidian text-white flex flex-wrap items-center justify-between gap-3"
    >
      <span className="text-sm font-bold flex items-center gap-2">
        <span className="live-status-dot live-status-dot--gold shrink-0" />
        <span>
          {alerta.evento === 'apontou'
            ? `👉 Cliente APONTOU para a vitrine${alerta.zonaVitrine ? ` (${alerta.zonaVitrine.toUpperCase()})` : ''}`
            : alerta.evento === 'lotacao'
              ? `🔥 Pico de concentração na frente da loja${alerta.pessoas ? ` (${alerta.pessoas} pessoas)` : ''}`
              : '👀 Cliente olhando a vitrine agora'}
          {' — '}
          {zoneLabel}
          {alerta.olhando_s ? ` (${alerta.olhando_s} s)` : ''}. Hora de liberar oferta relâmpago!
        </span>
      </span>
      <span className="flex gap-2">
        <button
          type="button"
          onClick={() => onCreateCampaign(alerta.zona, alerta.id)}
          className="px-3 py-1.5 rounded-xl gold-pill-metallic text-xs font-extrabold"
        >
          Criar campanha
        </button>
        <button
          type="button"
          onClick={() => onDismiss(alerta.id)}
          className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold"
        >
          Dispensar
        </button>
      </span>
    </div>
  );
};
