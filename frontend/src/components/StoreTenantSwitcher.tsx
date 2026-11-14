import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Lock, Search, X } from 'lucide-react';
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
  const popoverWrapperRef = useRef<HTMLDivElement>(null);
  const pickerTriggerRef = useRef<HTMLButtonElement>(null);
  const compactSearchRef = useRef<HTMLInputElement>(null);
  const sidebarSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!openPicker) return;

    const rafId = window.requestAnimationFrame(() => {
      compactSearchRef.current?.focus();
    });

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (popoverWrapperRef.current && target && !popoverWrapperRef.current.contains(target)) {
        setOpenPicker(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpenPicker(false);
        pickerTriggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openPicker]);

  const handleClearStore = () => {
    setSearch('');
    setOpenPicker(false);
    onChangeRole('admin');
  };

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
          aria-pressed={accessRole === 'store'}
          aria-label={
            activeTenant
              ? `Visão isolada da loja ${activeTenant.storeName}. Clique para alternar para Admin do Shopping`
              : `Modo Admin do Shopping (${CAPIM_DOURADO_STORES.length} lojas). Clique para selecionar uma loja`
          }
          className={`min-h-[44px] px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-2.5 border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            activeTenant
              ? 'bg-[#0B0D12] border-[#E2A83B]/55 text-[#F5C76B]'
              : 'bg-white border-stone-200 text-[#0B0D12] hover:border-[#E2A83B]'
          }`}
        >
          {activeTenant ? (
            <>
              <StoreAvatar
                storeName={activeTenant.storeName}
                logoUrl={activeTenant.logoUrl}
                sizeClass="h-9 min-w-[3.25rem] max-w-[4.75rem] px-1"
                roundedClass="rounded-lg"
              />
              <span className="truncate max-w-[8.5rem] sm:max-w-none">
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

        {activeTenant && (
          <button
            type="button"
            onClick={handleClearStore}
            aria-label="Limpar loja selecionada e voltar ao modo Admin"
            className="min-w-[44px] min-h-[44px] px-2.5 py-2 rounded-xl bg-[#0B0D12] hover:bg-stone-800 border border-[#E2A83B]/55 text-white text-xs font-bold inline-flex items-center justify-center gap-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <X className="w-4 h-4 text-[#F5C76B]" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Limpar loja</span>
          </button>
        )}

        {accessRole === 'store' && (
          <div ref={popoverWrapperRef} className="lg:hidden relative">
            <button
              ref={pickerTriggerRef}
              type="button"
              onClick={() => setOpenPicker((v) => !v)}
              aria-expanded={openPicker}
              aria-haspopup="listbox"
              aria-controls="compact-store-listbox"
              aria-label={`Trocar loja ativa entre ${CAPIM_DOURADO_STORES.length} lojas`}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-[#E2A83B]/60 text-[#7A4B0A] text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              Trocar Loja ({CAPIM_DOURADO_STORES.length})
            </button>
            {openPicker && (
              <div
                role="region"
                aria-label="Seletor rápido de loja"
                className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-[#0B0D12] border border-[#E2A83B]/45 p-3 shadow-2xl z-50 space-y-2.5 text-white"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#F5C76B]">
                    Selecionar Loja
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenPicker(false);
                      pickerTriggerRef.current?.focus();
                    }}
                    aria-label="Fechar seletor de lojas"
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="relative">
                  <label htmlFor="compact-store-search" className="visually-hidden">
                    Buscar loja no Capim Dourado
                  </label>
                  <Search className="w-3.5 h-3.5 text-stone-300 absolute left-2.5 top-3" aria-hidden="true" />
                  <input
                    id="compact-store-search"
                    ref={compactSearchRef}
                    type="search"
                    aria-label="Buscar loja no Capim Dourado"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Buscar entre ${CAPIM_DOURADO_STORES.length} lojas...`}
                    className="w-full min-h-[40px] rounded-lg bg-[#12151D] border border-white/20 pl-8 pr-9 py-1.5 text-xs text-white placeholder-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        compactSearchRef.current?.focus();
                      }}
                      aria-label="Limpar busca de loja"
                      className="absolute right-1.5 top-1.5 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-md bg-white/15 hover:bg-white/25 text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <ul
                  id="compact-store-listbox"
                  role="listbox"
                  aria-label="Lista de lojas do shopping"
                  className="max-h-72 overflow-y-auto space-y-1.5"
                >
                  {filteredStores.slice(0, 60).map((st) => {
                    const selected = st.id === activeStoreId;
                    return (
                      <li key={st.id} role="none">
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => {
                            onSelectStore(st.id);
                            setOpenPicker(false);
                            pickerTriggerRef.current?.focus();
                          }}
                          className={`w-full min-h-[44px] px-2.5 py-2 rounded-xl text-left text-xs flex items-center gap-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                            selected
                              ? 'bg-[#E2A83B]/20 text-[#F5C76B] font-bold border border-[#E2A83B]/40'
                              : 'hover:bg-white/10 text-stone-100 border border-transparent'
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
                            <span className="truncate block text-[10px] text-stone-300">
                              {st.floorLabel}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                  {filteredStores.length === 0 && (
                    <li className="text-[11px] text-stone-300 px-2 py-3 text-center">
                      Nenhuma loja encontrada.
                    </li>
                  )}
                </ul>

                {activeTenant && (
                  <button
                    type="button"
                    onClick={handleClearStore}
                    aria-label="Limpar loja selecionada e voltar ao modo Admin"
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <X className="w-3.5 h-3.5 text-[#F5C76B]" aria-hidden="true" />
                    <span>Limpar loja (Voltar ao Admin)</span>
                  </button>
                )}
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
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-stone-200">
          {CAPIM_DOURADO_STORES.length} Lojas
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Modo de visualização">
        <button
          type="button"
          aria-pressed={accessRole === 'admin'}
          onClick={() => onChangeRole('admin')}
          className={`min-h-[38px] px-2 py-1.5 rounded-lg text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            accessRole === 'admin'
              ? 'gold-pill-metallic'
              : 'bg-white/5 text-stone-200 hover:bg-white/10'
          }`}
        >
          Admin Geral
        </button>
        <button
          type="button"
          aria-pressed={accessRole === 'store'}
          onClick={() => onChangeRole('store')}
          className={`min-h-[38px] px-2 py-1.5 rounded-lg text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            accessRole === 'store'
              ? 'gold-pill-metallic'
              : 'bg-white/5 text-stone-200 hover:bg-white/10'
          }`}
        >
          Minha Loja
        </button>
      </div>

      {accessRole === 'store' && (
        <div className="space-y-2.5 pt-0.5">
          {activeTenant && (
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0B0D12] border border-[#E2A83B]/45 shadow-md">
              <StoreAvatar
                storeName={activeTenant.storeName}
                logoUrl={activeTenant.logoUrl}
                sizeClass="w-14 h-11"
                roundedClass="rounded-xl"
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <strong className="text-sm font-extrabold text-[#F5C76B] block leading-tight truncate">
                  {activeTenant.storeName}
                </strong>
                <span className="text-[11px] font-semibold text-stone-200 block truncate">
                  {activeTenant.floorLabel}
                </span>
                <span className="text-[10px] font-medium text-stone-300 block truncate">
                  {activeZoneLabel}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearStore}
                aria-label="Limpar loja selecionada e voltar ao modo Admin"
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-white shrink-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <X className="w-4 h-4 text-[#F5C76B]" aria-hidden="true" />
              </button>
            </div>
          )}

          <div className="relative">
            <label htmlFor="sidebar-store-search" className="visually-hidden">
              Buscar loja no Capim Dourado
            </label>
            <Search className="w-3.5 h-3.5 text-stone-300 absolute left-2.5 top-2.5" aria-hidden="true" />
            <input
              id="sidebar-store-search"
              ref={sidebarSearchRef}
              type="search"
              aria-label="Buscar loja no Capim Dourado"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Buscar loja (${CAPIM_DOURADO_STORES.length})...`}
              className="w-full min-h-[36px] rounded-lg bg-[#0B0D12] border border-white/20 pl-8 pr-8 py-1.5 text-[11px] text-white placeholder-stone-400 focus:border-[#E2A83B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  sidebarSearchRef.current?.focus();
                }}
                aria-label="Limpar busca de loja"
                className="absolute right-1.5 top-1.5 min-w-[24px] min-h-[24px] flex items-center justify-center rounded bg-white/15 hover:bg-white/25 text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
          </div>

          <ul
            role="listbox"
            aria-label="Lista de lojas do shopping"
            className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5"
          >
            {filteredStores.map((st) => {
              const selected = st.id === activeStoreId;
              return (
                <li key={st.id} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => onSelectStore(st.id)}
                    className={`w-full min-h-[44px] px-2 py-1.5 rounded-xl text-left text-xs flex items-center gap-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                      selected
                        ? 'bg-[#E2A83B]/20 text-[#F5C76B] font-bold border border-[#E2A83B]/45'
                        : 'text-stone-100 hover:bg-white/10 hover:text-white border border-transparent'
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
                      <span className="truncate block text-[10px] text-stone-300">
                        {st.floorLabel}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
            {filteredStores.length === 0 && (
              <li className="text-[11px] text-stone-300 px-2 py-2 text-center">
                Nenhuma loja encontrada.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

