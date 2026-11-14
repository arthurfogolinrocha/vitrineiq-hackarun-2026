import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { FlashCampaign, LostSaleEvent, ShoppingZone } from '../types';
import { LOST_SALE_LABELS } from '../data/shoppingData';
import {
  campanhaSexta13,
  CLIQUES_PARA_ATIVAR,
  ehSextaFeira13,
  resumoAssombracao,
  sexta13NaUrl,
} from '../utils/sexta13';

interface Props {
  /** Só aparece no Painel (fora do modo quiosque); os cliques no logo contam em qualquer aba. */
  visivel: boolean;
  /** Vendas perdidas já filtradas pela loja da sessão (scopedLostSales do App). */
  lostSales: LostSaleEvent[];
  zone: ShoppingZone;
  storeName: string;
  segmento?: string;
  onLaunchCampaign: (draft: Omit<FlashCampaign, 'id' | 'active' | 'createdAt'>) => void;
}

/** Easter Egg de Sexta-feira 13: a venda invisível vira um fantasma no Painel. */
export const SextaFeira13: React.FC<Props> = ({ visivel, lostSales, zone, storeName, segmento, onLaunchCampaign }) => {
  const [ativo, setAtivo] = useState(
    () => ehSextaFeira13(new Date()) || sexta13NaUrl(window.location.search)
  );
  const [cliques, setCliques] = useState(0);
  const [publicado, setPublicado] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // 13 cliques no logo (marcado com data-sexta13-logo no App) ligam o Easter Egg; 2,5 s parado zera.
  useEffect(() => {
    let n = 0;
    let zerar: number | undefined;
    const aoClicar = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest('[data-sexta13-logo]')) return;
      window.clearTimeout(zerar);
      zerar = window.setTimeout(() => {
        n = 0;
        setCliques(0);
      }, 2500);
      n += 1;
      if (n >= CLIQUES_PARA_ATIVAR) {
        n = 0;
        setAtivo(true);
      }
      setCliques(n);
    };
    document.addEventListener('click', aoClicar);
    return () => {
      document.removeEventListener('click', aoClicar);
      window.clearTimeout(zerar);
    };
  }, []);

  const { total, motivo } = resumoAssombracao(lostSales, new Date());

  const publicar = () => {
    onLaunchCampaign(campanhaSexta13(zone.id, storeName, segmento));
    setPublicado(true);
  };

  return (
    <>
      {cliques >= 7 && (
        <span role="status" className="fixed bottom-4 left-4 z-40 text-[11px] font-mono text-stone-400">
          🕯️ {cliques}/{CLIQUES_PARA_ATIVAR}
        </span>
      )}

      {ativo && visivel && (
        <div className="fixed bottom-6 right-6 z-40 flex items-start gap-1">
          <button
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            aria-label="Sexta-feira 13: ver o fantasma da venda invisível"
            title="Sexta-feira 13"
            className="w-14 h-14 rounded-full bg-[#0B0D12] border border-[#E2A83B]/40 text-3xl shadow-lg flex items-center justify-center motion-safe:animate-[bounce_3s_ease-in-out_infinite] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B]"
          >
            <span aria-hidden="true">👻</span>
          </button>
          <button
            type="button"
            onClick={() => setAtivo(false)}
            aria-label="Desligar o Easter Egg de Sexta-feira 13"
            className="w-6 h-6 rounded-full bg-[#111318] text-stone-300 hover:text-white flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B]"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby="sexta13-titulo"
        className="w-[min(100%-2rem,26rem)] m-auto rounded-3xl border border-[#E2A83B]/30 bg-[#0B0D12] text-white p-0 shadow-2xl backdrop:bg-black/60"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#E2A83B]">
                O Fantasma da Venda Invisível
              </span>
              <h2 id="sexta13-titulo" className="text-lg font-extrabold">
                Sexta-feira 13 na sua ala
              </h2>
              <p className="text-xs text-stone-400">
                {storeName} · {zone.shortName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Fechar"
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B]"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="rounded-2xl bg-[#111318] border border-white/10 p-4 space-y-1">
            {total === 0 ? (
              <p className="text-sm font-bold">Nenhum fantasma hoje: zero vendas perdidas registradas.</p>
            ) : (
              <>
                <p className="text-3xl font-black text-[#E2A83B]">{total}</p>
                <p className="text-sm font-bold">
                  {total === 1 ? 'venda perdida assombrou' : 'vendas perdidas assombraram'} a loja hoje
                </p>
                {motivo && (
                  <p className="text-xs text-stone-300">
                    Motivo mais comum: <strong className="text-white">{LOST_SALE_LABELS[motivo]}</strong>
                  </p>
                )}
                <p className="text-xs text-stone-400 pt-1">
                  O cliente veio, quis e foi embora. Ninguém vê, mas é dinheiro que ficou na mesa.
                </p>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={publicar}
            disabled={publicado}
            className="w-full min-h-[48px] px-4 py-3 rounded-2xl gold-pill-metallic text-sm font-extrabold disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {publicado ? 'Cupom SEXTA13 publicado' : 'Espantar o azar: publicar cupom 13% OFF'}
          </button>
          <p aria-live="polite" className="text-xs text-stone-300 min-h-[1rem]">
            {publicado &&
              `Campanha "Sexta 13: 13% OFF anti-azar" no ar por 130 min: o cupom SEXTA13 já aparece no Concierge da ${zone.shortName}.`}
          </p>
        </div>
      </dialog>
    </>
  );
};
