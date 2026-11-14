import type { Papel } from '../services/api';

export type ActiveTab = 'cockpit' | 'map' | 'vision' | 'counter' | 'concierge' | 'audit' | 'lojistas';

const TODAS: ActiveTab[] = ['cockpit', 'map', 'vision', 'counter', 'concierge', 'audit', 'lojistas'];

/** Abas que cada papel vê. Sem login (`null`) só o Concierge do visitante é aberto. */
export function abasPermitidas(papel: Papel | null): ActiveTab[] {
  if (papel === 'admin') return TODAS;
  if (papel === 'lojista') return ['cockpit', 'counter'];
  return ['concierge'];
}
