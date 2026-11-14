import type { Papel } from '../services/api';

export type ActiveTab = 'cockpit' | 'map' | 'vision' | 'counter' | 'concierge' | 'audit' | 'lojistas';

/** Perfis de quem usa o produto. O visitante não tem login (só o QR do Concierge). */
export type Perfil = Papel | 'visitante';

export const PERFIL_LABEL: Record<Perfil, string> = {
  visitante: 'Visitante',
  vendedor: 'Vendedor',
  lojista: 'Lojista',
  admin: 'Admin do shopping',
};

const ABAS: Record<Perfil, ActiveTab[]> = {
  visitante: ['concierge'],
  vendedor: ['counter'],
  lojista: ['cockpit', 'counter', 'vision', 'concierge'],
  admin: ['cockpit', 'map', 'audit', 'lojistas'],
};

/** Abas que cada papel vê. Sem login (`null`) só o Concierge do visitante é aberto. */
export function abasPermitidas(papel: Perfil | null): ActiveTab[] {
  return ABAS[papel ?? 'visitante'];
}

/** Lojista e vendedor ficam presos à loja da conta. */
export function ehContaDeLoja(papel: Perfil | null): boolean {
  return papel === 'lojista' || papel === 'vendedor';
}
