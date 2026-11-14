import React from 'react';
import { Dices, Store } from 'lucide-react';
import { AccessRole, StoreTenant } from '../../types';
import { Papel } from '../../services/api';
import { ZoneLiveTelemetry } from '../../services/opportunityEngine';
import { ActiveTab } from '../../utils/acesso';
import { StoreAvatar } from '../StoreAvatar';
import { StoreTenantSwitcher } from '../StoreTenantSwitcher';
import { NavItem, TAB_META } from './appNavigation';

interface AppSidebarProps {
  kioskTab: ActiveTab | null;
  papel: Papel | null;
  accessRole: AccessRole;
  activeStoreId: string;
  activeTenant: StoreTenant | null;
  onChangeRole: (role: AccessRole) => void;
  onSelectStore: (storeId: string) => void;
  navItems: NavItem[];
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  getTabNumber: (id: ActiveTab) => string;
  selectedTelemetry: ZoneLiveTelemetry;
  onOpenStories?: () => void;
}

/** Sidebar executiva desktop (Obsidian + Capim Dourado) com multi-tenant e navegação numerada. */
export const AppSidebar: React.FC<AppSidebarProps> = ({
  kioskTab,
  papel,
  accessRole,
  activeStoreId,
  activeTenant,
  onChangeRole,
  onSelectStore,
  navItems,
  activeTab,
  onSelectTab,
  getTabNumber,
  selectedTelemetry,
  onOpenStories,
}) => {
  return (
    <aside
      className={`${kioskTab ? 'hidden' : 'hidden lg:flex'} lg:w-72 lg:shrink-0 lg:flex-col lg:justify-between bg-[#0B0D12] text-white border-r border-[#E2A83B]/20 p-5 sticky top-0 h-screen overflow-y-auto`}
    >
      <div className="space-y-5">
        {/* Identidade da Marca */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#E2A83B]/15">
          <div className="w-10 h-10 rounded-xl gold-pill-metallic font-black text-lg flex items-center justify-center shrink-0">
            V
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">VitrineIQ</span>
              <span className="live-status-dot live-status-dot--gold" title="Sistema Online" />
            </div>
            <span className="text-[11px] text-[#F5C76B] font-semibold block truncate">
              Capim Dourado • Palmas-TO
            </span>
          </div>
        </div>

        {/* Seletor Multi-Tenant: admin/demo podem ver como uma loja (o lojista já vem fixo pelo login) */}
        {papel !== 'lojista' && (
          <StoreTenantSwitcher
            accessRole={accessRole}
            activeStoreId={activeStoreId}
            activeTenant={activeTenant}
            onChangeRole={onChangeRole}
            onSelectStore={onSelectStore}
            variant="sidebar"
          />
        )}

        {/* Navegação Numerada Principal */}
        <nav aria-label="Módulos do VitrineIQ" className="space-y-1">
          {(['operacao', 'gestao'] as const).map((grupo) => {
            const itens = navItems.filter((item) => item.grupo === grupo);
            if (itens.length === 0) return null;
            return (
              <div key={grupo} className={grupo === 'gestao' ? 'pt-4' : undefined}>
                <span className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-stone-500 block mb-2">
                  {grupo === 'operacao' ? 'Operação do Lojista' : 'Administração'}
                </span>
                {itens.map((item) => {
                  const info = TAB_META[item.id];
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectTab(item.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 transition ${
                        active
                          ? 'gold-pill-metallic'
                          : 'text-stone-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        {item.icon}
                        <span className="truncate">{info.label}</span>
                      </span>
                      <span
                        className={`text-[10px] font-mono ${
                          active ? 'text-[#111318]/80 font-extrabold' : 'text-stone-500'
                        }`}
                      >
                        {getTabNumber(item.id)}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {onOpenStories && (
          <button
            type="button"
            onClick={onOpenStories}
            title="Abrir mapa das User Stories (Prática Sorteada: STORIES)"
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-[#E2A83B]/35 text-xs font-bold text-[#F5C76B] flex items-center justify-between gap-2 transition"
          >
            <span className="flex items-center gap-2.5 truncate">
              <Dices className="w-4 h-4 text-[#E2A83B] shrink-0" aria-hidden="true" />
              <span className="truncate">Stories (Roleta)</span>
            </span>
            <span className="text-[10px] font-mono text-stone-400">US-01..05</span>
          </button>
        )}
      </div>

      {/* Cartão de Contexto da Loja ou Ala Ativa no Rodapé da Sidebar */}
      <div className="bg-white/5 border border-[#E2A83B]/25 rounded-2xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-stone-400">
          <span className="flex items-center gap-1">
            <Store className="w-3 h-3 text-[#E2A83B]" aria-hidden="true" />
            {activeTenant ? 'Loja Isolada' : 'Ala Selecionada'}
          </span>
          <span className="text-[#E2A83B] font-mono">IQ {selectedTelemetry.opportunityScore}</span>
        </div>
        {activeTenant ? (
          <div className="flex items-center gap-2.5">
            <StoreAvatar
              storeName={activeTenant.storeName}
              logoUrl={activeTenant.logoUrl}
              variant="wide"
              roundedClass="rounded-xl"
            />
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-white leading-snug truncate">
                {activeTenant.storeName}
              </p>
              <span className="text-[10px] text-[#F5C76B] block truncate">
                {activeTenant.floorLabel}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs font-bold text-white leading-snug truncate">
            {selectedTelemetry.zone.shortName}
          </p>
        )}
        <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 border-t border-white/10">
          <span>{selectedTelemetry.zone.floor === 'L1' ? 'Térreo (L1)' : '2º Piso (L2)'}</span>
          <span className="text-emerald-400 font-semibold kpi-metric">
            {selectedTelemetry.footTraffic}/h fluxo
          </span>
        </div>
      </div>
    </aside>
  );
};
