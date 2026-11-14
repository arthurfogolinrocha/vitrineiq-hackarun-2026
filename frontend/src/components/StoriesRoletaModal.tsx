import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Dices, Sparkles, X } from 'lucide-react';
import { StoryPriority, USER_STORIES_ROLETA } from '../data/userStoriesData';
import { ActiveTab } from '../utils/acesso';

interface StoriesRoletaModalProps {
  open: boolean;
  onClose: () => void;
  allowedTabs: ActiveTab[];
  onNavigateTab: (tab: ActiveTab) => void;
}

/** Modal nativo (<dialog>) da prática sorteada STORIES (User Stories US-01 a US-05) com atalho direto para cada módulo vivo. */
export const StoriesRoletaModal: React.FC<StoriesRoletaModalProps> = ({
  open,
  onClose,
  allowedTabs,
  onNavigateTab,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [filter, setFilter] = useState<'ALL' | StoryPriority>('ALL');

  const stories = useMemo(
    () =>
      filter === 'ALL'
        ? USER_STORIES_ROLETA
        : USER_STORIES_ROLETA.filter((story) => story.priority === filter),
    [filter]
  );

  // Sincroniza estado React com showModal()/close() nativos
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }
  }, [open]);

  // Fallback de light-dismiss para Safari / navegadores sem suporte a dialog[closedby="any"]
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    const handlePointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e) && dialog.open) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener('pointerdown', handlePointerDown);
    dialog.addEventListener('pointerup', handlePointerUp);
    return () => {
      dialog.removeEventListener('pointerdown', handlePointerDown);
      dialog.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  const handleNativeClose = () => {
    if (dialogRef.current) {
      dialogRef.current.returnValue = '';
    }
    if (open) onClose();
  };

  const handleOpenStoryModule = (tab: ActiveTab) => {
    if (!allowedTabs.includes(tab)) return;
    if (dialogRef.current?.open && typeof dialogRef.current.close === 'function') {
      dialogRef.current.close();
    }
    onClose();
    onNavigateTab(tab);
  };

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-labelledby="stories-roleta-title"
      onClose={handleNativeClose}
      className="w-[min(94vw,56rem)] max-h-[88vh] m-auto rounded-3xl border border-[#E2A83B]/35 bg-[#0B0D12] text-white shadow-2xl p-0 overflow-hidden"
    >
      <div className="flex flex-col max-h-[88vh]">
        {/* Cabeçalho */}
        <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-[#0B0D12] via-[#131722] to-[#0B0D12] flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#E2A83B]/15 border border-[#E2A83B]/35 text-[#F5C76B] text-[11px] font-bold tracking-wide uppercase">
              <Dices className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Prática Sorteada da Roleta • 1º HackaRun</span>
            </div>
            <h2 id="stories-roleta-title" className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
              STORIES — Mapa Vivo das User Stories (US-01 a US-05)
            </h2>
            <p className="text-xs text-stone-400">
              Cada história do backlog com critérios BDD (Dado / Quando / Então) conectada direto à tela em produção.
            </p>
          </div>
          <button
            type="button"
            autoFocus
            onClick={() => dialogRef.current?.close()}
            aria-label="Fechar Stories (Roleta)"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-stone-200 flex items-center justify-center shrink-0 transition"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Filtros MoSCoW */}
        <div className="px-6 py-3 border-b border-white/10 bg-[#10131C] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar User Stories por prioridade MoSCoW">
            {(
              [
                { id: 'ALL', label: `Todas (${USER_STORIES_ROLETA.length})` },
                { id: 'MUST', label: 'Must Have (3)' },
                { id: 'SHOULD', label: 'Should Have (2)' },
              ] as const
            ).map((item) => {
              const active = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    active
                      ? 'gold-pill-metallic'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10 text-stone-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>5 / 5 User Stories entregues no MVP</span>
          </span>
        </div>

        {/* Lista rolável das User Stories */}
        <div className="p-6 overflow-y-auto space-y-4">
          {stories.map((story) => {
            const canOpen = allowedTabs.includes(story.targetTab);
            return (
              <article
                key={story.id}
                className="rounded-2xl border border-white/10 bg-[#121621] p-4 sm:p-5 space-y-3 hover:border-[#E2A83B]/40 transition"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#E2A83B]/20 text-[#F5C76B] font-mono text-[11px] font-extrabold">
                        {story.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                          story.priority === 'MUST'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {story.priorityLabel}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-extrabold text-white">{story.title}</h3>
                  </div>

                  {canOpen ? (
                    <button
                      type="button"
                      onClick={() => handleOpenStoryModule(story.targetTab)}
                      className="px-3.5 py-2 rounded-xl gold-pill-metallic text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0 transition hover:brightness-105"
                    >
                      <span>{story.targetTabLabel}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-semibold text-stone-400 shrink-0">
                      Disponível no perfil Admin
                    </span>
                  )}
                </div>

                {/* Estrutura formal Como / Quero / Para */}
                <p className="text-xs sm:text-[13px] text-stone-200 leading-relaxed">
                  <strong className="text-[#F5C76B]">Como</strong> {story.como},{' '}
                  <strong className="text-[#F5C76B]">eu quero</strong> {story.quero},{' '}
                  <strong className="text-[#F5C76B]">para</strong> {story.para}
                </p>

                {/* Critério BDD (Dado / Quando / Então) */}
                <div className="rounded-xl bg-[#0B0D12]/90 border border-white/10 p-3 grid sm:grid-cols-3 gap-2.5 text-[11px] leading-relaxed">
                  <div>
                    <span className="inline-flex items-center gap-1 font-extrabold text-sky-300 uppercase tracking-wider text-[10px]">
                      <Sparkles className="w-3 h-3" aria-hidden="true" />
                      Dado
                    </span>
                    <p className="text-stone-300 mt-0.5">{story.bdd.dado}</p>
                  </div>
                  <div>
                    <span className="font-extrabold text-amber-300 uppercase tracking-wider text-[10px] block">
                      Quando
                    </span>
                    <p className="text-stone-300 mt-0.5">{story.bdd.quando}</p>
                  </div>
                  <div>
                    <span className="font-extrabold text-emerald-300 uppercase tracking-wider text-[10px] block">
                      Então
                    </span>
                    <p className="text-stone-300 mt-0.5">{story.bdd.entao}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </dialog>
  );
};

