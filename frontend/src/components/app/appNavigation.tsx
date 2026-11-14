import React from 'react';
import {
  Box,
  Camera,
  ClipboardCheck,
  LayoutDashboard,
  QrCode,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { ConsumerSignal } from '../../types';
import { ActiveTab } from '../../utils/acesso';

export const TAB_META: Record<ActiveTab, { label: string; shortLabel: string; subtitle: string }> = {
  cockpit: {
    label: 'Painel do Lojista',
    shortLabel: 'Painel',
    subtitle: 'Score de oportunidade, horário de pico e planos IA',
  },
  map: {
    label: 'Shopping 3D (Tour)',
    shortLabel: 'Mapa 3D',
    subtitle: 'Maquete WebGL, Zoom nas lojas, Street View e 2º Piso',
  },
  vision: {
    label: 'Sensor Webcam',
    shortLabel: 'Câmera',
    subtitle: 'Contagem anônima na porta (quem passa vs. quem entra)',
  },
  counter: {
    label: 'Modo Balcão',
    shortLabel: 'Balcão',
    subtitle: 'Registro em 1 toque do porquê o cliente não comprou',
  },
  concierge: {
    label: 'Concierge QR',
    shortLabel: 'QR Cliente',
    subtitle: 'Totem anônimo que capta desejo real e libera cupom',
  },
  audit: {
    label: 'LGPD & Backend Python',
    shortLabel: 'Auditoria',
    subtitle: 'Registro das ações do sistema e o que coletamos (só contagens)',
  },
  lojistas: {
    label: 'Contas de Lojistas',
    shortLabel: 'Lojistas',
    subtitle: 'Cadastro das contas: cada lojista vê só a loja e a ala dele',
  },
};

export const SINAL_DEMO: ConsumerSignal = {
  id: 'sig-init-1',
  zoneId: 'ala-central-ancoras',
  query: 'Presente masculino até R$ 150',
  budget: '80_200',
  preference: 'Moda rápida com troca garantida',
  couponCode: 'VITRINE-QR10',
  matchedOffer: 'Ala Central • Âncoras e Alameda das Cores',
  timestamp: '20:54',
};

export interface NavItem {
  id: ActiveTab;
  grupo: 'operacao' | 'gestao';
  icon: React.ReactNode;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'cockpit', grupo: 'operacao', icon: <LayoutDashboard className="w-4 h-4" aria-hidden="true" /> },
  { id: 'map', grupo: 'operacao', icon: <Box className="w-4 h-4" aria-hidden="true" /> },
  { id: 'vision', grupo: 'operacao', icon: <Camera className="w-4 h-4" aria-hidden="true" /> },
  { id: 'counter', grupo: 'operacao', icon: <ClipboardCheck className="w-4 h-4" aria-hidden="true" /> },
  { id: 'concierge', grupo: 'operacao', icon: <QrCode className="w-4 h-4" aria-hidden="true" /> },
  { id: 'audit', grupo: 'gestao', icon: <ShieldCheck className="w-4 h-4" aria-hidden="true" /> },
  { id: 'lojistas', grupo: 'gestao', icon: <Users className="w-4 h-4" aria-hidden="true" /> },
];

/** Filtra os itens de navegação conforme as abas liberadas para o papel atual. */
export function buildNavItems(abas: ActiveTab[]): NavItem[] {
  return ALL_NAV_ITEMS.filter((item) => abas.includes(item.id));
}
