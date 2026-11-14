import React from 'react';
import { LogOut } from 'lucide-react';
import { AccessRole, StoreTenant } from '../../types';
import { Papel, Sessao } from '../../services/api';
import { ActiveTab } from '../../utils/acesso';
import { StoreTenantSwitcher } from '../StoreTenantSwitcher';
import { NavItem, TAB_META } from './appNavigation';

interface AppTopHeaderProps {
  kioskTab: ActiveTab | null;
  activeTab: ActiveTab;
  totalTabs: number;
  getTabNumber: (id: ActiveTab) => string;
  papel: Papel | null;
  lojaFixa: string | null;
  accessRole: AccessRole;
  activeStoreId: string;
  activeTenant: StoreTenant | null;
  onChangeRole: (role: AccessRole) => void;
  onSelectStore: (storeId: string) => void;
  demo: boolean;
  online: boolean;
  pendingOfflineCount: number;
  conciergePublico: boolean;
  sessao: Sessao | null;
  onLogout: () => void;
  navItems: NavItem[];
  onSelectTab: (tab: ActiveTab) => void;
}

/** Barra superior compacta com contexto executivo, status de conexão, logout e navegação mobile. */
export const AppTopHeader: React.FC<AppTopHeaderProps> = ({
  kioskTab,
  activeTab,
  totalTabs,
  getTabNumber,
  papel,
  lojaFixa,
  accessRole,
  activeStoreId,
  activeTenant,
  onChangeRole,
  onSelectStore,
  demo,
  online,
  pendingOfflineCount,
  conciergePublico,
  sessao,
  onLogout,
  navItems,
  onSelectTab,
}) => {
  const meta = TAB_META[activeTab];

  const statusTitle = demo
    ? 'Dados fictícios; nada é enviado para a API'
    : online
      ? 'Dados compartilhados entre aparelhos pela API'
      : pendingOfflineCount > 0
        ? `API sem resposta: ${pendingOfflineCount} registro(s) na fila offline aguardando conexão`
        : 'API sem resposta: tentando de novo a cada 3 s';

  return (
    <header className="sticky top-0 z-30 bg-[#F4F2EE]/90 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-6 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Marca visível apenas no mobile/tablet */}
          <div className="lg:hidden w-9 h-9 rounded-xl bg-[#111318] text-[#E2A83B] font-black text-base flex items-center justify-center">
            V
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-[#B45309]">
                {kioskTab ? 'VitrineIQ' : `${getTabNumber(activeTab)} / ${String(totalTabs).padStart(2, '0')}`}
              </span>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-[#111318]">
                {meta.label}
              </h1>
            </div>
            <p className="text-xs text-stone-500 hidden sm:block">{meta.subtitle}</p>
          </div>
        </div>

        {/* Atalhos Rápidos + visão da conta */}
        <div className="flex flex-wrap items-center gap-2">
          {!kioskTab && papel !== 'lojista' && (
            <StoreTenantSwitcher
              accessRole={accessRole}
              activeStoreId={activeStoreId}
              activeTenant={activeTenant}
              onChangeRole={onChangeRole}
              onSelectStore={onSelectStore}
              variant="compact"
            />
          )}
          <span
            role="status"
            title={statusTitle}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold ${
              online ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {demo ? 'Demonstração offline' : online ? 'Ao vivo' : 'Sem conexão com a API'}
          </span>
          {!conciergePublico && (sessao || demo) && (
            <span className="flex items-center gap-2">
              {sessao && (
                <span className="text-[11px] text-stone-600 text-right leading-tight">
                  <strong className="block text-[#111318]">{sessao.usuario.nome}</strong>
                  {papel === 'admin' ? 'Admin' : `Lojista${lojaFixa ? ` · ${lojaFixa}` : ''}`}
                </span>
              )}
              <button
                type="button"
                onClick={onLogout}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-xs font-bold text-[#111318] flex items-center gap-1.5 shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5 text-[#B45309]" aria-hidden="true" />
                <span>{demo ? 'Sair da demonstração' : 'Sair'}</span>
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Barra de Navegação Horizontal para Mobile/Tablet */}
      <nav
        aria-label="Navegação Mobile"
        className={`${kioskTab ? 'hidden' : 'lg:hidden flex'} items-center gap-1.5 overflow-x-auto pt-3 pb-1`}
      >
        {navItems.map((item) => {
          const info = TAB_META[item.id];
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition ${
                active
                  ? 'bg-[#111318] text-[#E2A83B]'
                  : 'bg-white border border-stone-200 text-stone-700'
              }`}
            >
              {item.icon}
              <span>{info.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
