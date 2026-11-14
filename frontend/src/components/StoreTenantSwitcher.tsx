import React, { useMemo, useState } from 'react';
import { Building2, Lock, Search } from 'lucide-react';
import { AccessRole, StoreTenant } from '../types';
import { CAPIM_DOURADO_STORES } from '../data/shoppingData';
import { StoreAvatar } from './StoreAvatar';

interface StoreTenantSwitcherProps {
  accessRole: AccessRole;
  activeStoreId: string;
  activeTenant: StoreTenant | null;
  onChangeRole: (role: AccessRole) => void;
  onSelectStore: (storeId: string) => void;
  variant?: 'sidebar' | 'compact';
}

export const StoreTenantSwitcher: React.FC<StoreTenantSwitcherProps> = ({
  accessRole,
  activeStoreId,
  activeTenant,
  onChangeRole,
  onSelectStore,
  variant = 'sidebar',
}) => {
  const [search, setSearch] = useState('');
  const [openPicker, setOpenPicker] = useState(false);

  const filteredStores = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CAPIM_DOURADO_STORES;
    return CAPIM_DOURADO_STORES.filter(
      (s) =>
        s.storeName.toLowerCase().includes(q) ||
        s.floorLabel.toLowerCase().includes(q) ||
        s.segment.toLowerCase().includes(q)
    );
  }, [search]);

  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChangeRole(accessRole === 'admin' ? 'store' : 'admin')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 border transition ${
            activeTenant
              ? 'bg-[#0B0D12] border-[#E2A83B]/45 text-[#F5C76B]'
              : 'bg-white border-stone-200 text-[#0B0D12] hover:border-[#E2A83B]'
          }`}
          title="Alternar entre visão Admin do Shopping e visão isolada da Loja"
        >
          {activeTenant ? (
            <>
              <StoreAvatar
                storeName={activeTenant.storeName}
                logoUrl={activeTenant.logoUrl}
                sizeClass="w-5 h-5"
                roundedClass="rounded-md"
              />
              <span>Loja: {activeTenant.storeName}</span>
            </>
          ) : (
            <>
              <Building2 className="w-3.5 h-3.5 text-[#7A4B0A]" aria-hidden="true" />
              <span>Admin ({CAPIM_DOURADO_STORES.length} lojas)</span>
            </>
          )}
        </button>

        {accessRole === 'store' && (
          <div className="lg:hidden relative">
            <button
              type="button"
              onClick={() => setOpenPicker((v) => !v)}
              className="px-2.5 py-1.5 rounded-xl bg-amber-50 border border-[#E2A83B]/50 text-[#7A4B0A] text-xs font-bold"
            >
              Trocar Loja ({CAPIM_DOURADO_STORES.length})
            </button>
            {openPicker && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0B0D12] border border-[#E2A83B]/40 p-3 shadow-2xl z-50 space-y-2 text-white">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" aria-hidden="true" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar entre 188 lojas..."
                    className="w-full rounded-lg bg-[#12151D] border border-white/15 pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-stone-400"
                  />
                </div>
                <ul className="max-h-56 overflow-y-auto space-y-1">
                  {filteredStores.slice(0, 60).map((st) => (
                    <li key={st.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectStore(st.id);
                          setOpenPicker(false);
                        }}
                        className={`w-full px-2 py-1.5 rounded-lg text-left text-xs flex items-center gap-2 transition ${
                          st.id === activeStoreId
                            ? 'bg-[#E2A83B]/20 text-[#F5C76B] font-bold'
                            : 'hover:bg-white/10 text-stone-200'
                        }`}
                      >
                        <StoreAvatar
                          storeName={st.storeName}
                          logoUrl={st.logoUrl}
                          sizeClass="w-6 h-6"
                          roundedClass="rounded-md"
                        />
                        <span className="truncate flex-1">{st.storeName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#12151D] border border-[#E2A83B]/25 p-3 space-y-2.5">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#F5C76B]">
        <span className="flex items-center gap-1.5">
          {activeTenant ? <Lock className="w-3 h-3" aria-hidden="true" /> : <Building2 className="w-3 h-3" aria-hidden="true" />}
          {activeTenant ? 'Modo Lojista Isolado' : 'Admin Shopping'}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-stone-300">
          {CAPIM_DOURADO_STORES.length} Lojas
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => onChangeRole('admin')}
          className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition ${
            accessRole === 'admin'
              ? 'gold-pill-metallic'
              : 'bg-white/5 text-stone-300 hover:bg-white/10'
          }`}
        >
          Admin Geral
        </button>
        <button
          type="button"
          onClick={() => onChangeRole('store')}
          className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition ${
            accessRole === 'store'
              ? 'gold-pill-metallic'
              : 'bg-white/5 text-stone-300 hover:bg-white/10'
          }`}
        >
          Minha Loja
        </button>
      </div>

      {accessRole === 'store' && (
        <div className="space-y-2 pt-0.5">
          {activeTenant && (
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#0B0D12] border border-[#E2A83B]/35">
              <StoreAvatar
                storeName={activeTenant.storeName}
                logoUrl={activeTenant.logoUrl}
                sizeClass="w-9 h-9"
                roundedClass="rounded-lg"
              />
              <div className="min-w-0">
                <strong className="text-xs font-extrabold text-[#F5C76B] block truncate">
                  {activeTenant.storeName}
                </strong>
                <span className="text-[10px] text-stone-400 block truncate">
                  {activeTenant.floorLabel}
                </span>
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" aria-hidden="true" />
            <input
              type="search"
              aria-label="Buscar loja no Capim Dourado"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Buscar loja (${CAPIM_DOURADO_STORES.length})...`}
              className="w-full rounded-lg bg-[#0B0D12] border border-white/15 pl-8 pr-2.5 py-1.5 text-[11px] text-white placeholder-stone-400 focus:border-[#E2A83B] outline-hidden"
            />
          </div>

          <ul
            aria-label="Lista de lojas do shopping"
            className="max-h-40 overflow-y-auto space-y-1 pr-0.5"
          >
            {filteredStores.map((st) => {
              const selected = st.id === activeStoreId;
              return (
                <li key={st.id}>
                  <button
                    type="button"
                    onClick={() => onSelectStore(st.id)}
                    className={`w-full px-2 py-1.5 rounded-lg text-left text-[11px] flex items-center gap-2 transition ${
                      selected
                        ? 'bg-[#E2A83B]/20 text-[#F5C76B] font-bold border border-[#E2A83B]/40'
                        : 'text-stone-300 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                  >
                    <StoreAvatar
                      storeName={st.storeName}
                      logoUrl={st.logoUrl}
                      sizeClass="w-6 h-6"
                      roundedClass="rounded-md"
                    />
                    <span className="truncate flex-1">{st.storeName}</span>
                  </button>
                </li>
              );
            })}
            {filteredStores.length === 0 && (
              <li className="text-[11px] text-stone-400 px-2 py-2 text-center">
                Nenhuma loja encontrada.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
