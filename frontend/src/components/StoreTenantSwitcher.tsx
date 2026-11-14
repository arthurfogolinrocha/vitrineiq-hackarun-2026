import React, { useMemo, useState } from 'react';
import { Building2, Lock, Search } from 'lucide-react';
import { AccessRole, StoreTenant } from '../types';
import { CAPIM_DOURADO_STORES, CAPIM_DOURADO_ZONES } from '../data/shoppingData';
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

  const activeZoneLabel = useMemo(() => {
    if (!activeTenant) return '';
    const raw =
      CAPIM_DOURADO_ZONES.find((z) => z.id === activeTenant.zoneId)?.shortName ??
      activeTenant.zoneId;
    return raw.replace(/\s*\([^)]*\)/g, '').trim();
  }, [activeTenant]);

  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChangeRole(accessRole === 'admin' ? 'store' : 'admin')}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-2.5 border transition ${
            activeTenant
              ? 'bg-[#0B0D12] border-[#E2A83B]/55 text-[#F5C76B]'
              : 'bg-white border-stone-200 text-[#0B0D12] hover:border-[#E2A83B]'
          }`}
          title="Alternar entre visão Admin do Shopping e visão isolada da Loja"
        >
          {activeTenant ? (
            <>
              <StoreAvatar
                storeName={activeTenant.storeName}
                logoUrl={activeTenant.logoUrl}
                sizeClass="h-10 min-w-[3.5rem] max-w-[5rem] px-1"
                roundedClass="rounded-lg"
              />
              <span className="truncate max-w-[10rem] sm:max-w-none">
                Loja: {activeTenant.storeName}
              </span>
            </>
          ) : (
            <>
              <Building2 className="w-4 h-4 text-[#7A4B0A]" aria-hidden="true" />
              <span>Admin ({CAPIM_DOURADO_STORES.length} lojas)</span>
            </>
          )}
        </button>

        {accessRole === 'store' && (
          <div className="lg:hidden relative">
            <button
              type="button"
              onClick={() => setOpenPicker((v) => !v)}
              className="px-3 py-2 rounded-xl bg-amber-50 border border-[#E2A83B]/50 text-[#7A4B0A] text-xs font-bold"
            >
              Trocar Loja ({CAPIM_DOURADO_STORES.length})
            </button>
            {openPicker && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#0B0D12] border border-[#E2A83B]/45 p-3 shadow-2xl z-50 space-y-2.5 text-white">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" aria-hidden="true" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Buscar entre ${CAPIM_DOURADO_STORES.length} lojas...`}
                    className="w-full rounded-lg bg-[#12151D] border border-white/15 pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-stone-400"
                  />
                </div>
                <ul className="max-h-72 overflow-y-auto space-y-1.5">
                  {filteredStores.slice(0, 60).map((st) => (
                    <li key={st.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectStore(st.id);
                          setOpenPicker(false);
                        }}
                        className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center gap-3 transition ${
                          st.id === activeStoreId
                            ? 'bg-[#E2A83B]/20 text-[#F5C76B] font-bold border border-[#E2A83B]/40'
                            : 'hover:bg-white/10 text-stone-200 border border-transparent'
                        }`}
                      >
                        <StoreAvatar
                          storeName={st.storeName}
                          logoUrl={st.logoUrl}
                          sizeClass="w-11 h-11"
                          roundedClass="rounded-lg"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="truncate block font-semibold">{st.storeName}</span>
                          <span className="truncate block text-[10px] text-stone-400">
                            {st.floorLabel}
                          </span>
                        </div>
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
        <div className="space-y-2.5 pt-0.5">
          {activeTenant && (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0B0D12] border border-[#E2A83B]/45 shadow-md">
              <StoreAvatar
                storeName={activeTenant.storeName}
                logoUrl={activeTenant.logoUrl}
                sizeClass="w-16 h-12"
                roundedClass="rounded-xl"
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <strong className="text-sm font-extrabold text-[#F5C76B] block leading-tight truncate">
                  {activeTenant.storeName}
                </strong>
                <span className="text-[11px] font-semibold text-stone-200 block truncate">
                  {activeTenant.floorLabel}
                </span>
                <span className="text-[10px] font-medium text-stone-400 block truncate">
                  {activeZoneLabel}
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
            className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5"
          >
            {filteredStores.map((st) => {
              const selected = st.id === activeStoreId;
              return (
                <li key={st.id}>
                  <button
                    type="button"
                    onClick={() => onSelectStore(st.id)}
                    className={`w-full px-2 py-1.5 rounded-xl text-left text-xs flex items-center gap-2.5 transition ${
                      selected
                        ? 'bg-[#E2A83B]/20 text-[#F5C76B] font-bold border border-[#E2A83B]/45'
                        : 'text-stone-200 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                  >
                    <StoreAvatar
                      storeName={st.storeName}
                      logoUrl={st.logoUrl}
                      sizeClass="w-14 h-11"
                      roundedClass="rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="truncate block font-semibold">{st.storeName}</span>
                      <span className="truncate block text-[10px] text-stone-400">
                        {st.floorLabel}
                      </span>
                    </div>
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

