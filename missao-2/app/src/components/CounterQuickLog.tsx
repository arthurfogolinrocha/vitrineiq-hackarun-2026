import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, PackageX, Search, Tag, Users } from 'lucide-react';
import { LostSaleEvent, LostSaleReason, ShoppingZone, ZoneId } from '../types';
import { LOST_SALE_LABELS } from '../data/shoppingData';

interface CounterQuickLogProps {
  zones: ShoppingZone[];
  selectedZoneId: ZoneId;
  onSelectZone: (zoneId: ZoneId) => void;
  lostSales: LostSaleEvent[];
  onLogLostSale: (zoneId: ZoneId, storeName: string, reason: LostSaleReason, note?: string) => void;
}

const REASON_BUTTONS: {
  reason: LostSaleReason;
  title: string;
  subtitle: string;
  accent: string;
  icon: React.ReactNode;
}[] = [
  {
    reason: 'preco',
    title: 'Preço / Parcelamento',
    subtitle: 'Cliente achou caro ou pediu desconto',
    accent: 'border-amber-500/40 hover:border-amber-400 hover:bg-amber-500/10',
    icon: <Tag className="w-6 h-6 text-amber-400" aria-hidden="true" />,
  },
  {
    reason: 'estoque_grade',
    title: 'Sem Tamanho / Estoque',
    subtitle: 'Faltou cor, tamanho ou produto desejado',
    accent: 'border-rose-500/40 hover:border-rose-400 hover:bg-rose-500/10',
    icon: <PackageX className="w-6 h-6 text-rose-400" aria-hidden="true" />,
  },
  {
    reason: 'pesquisando',
    title: 'Só Olhando / Vitrine',
    subtitle: 'Entrou pela vitrine mas saiu sem oferta certa',
    accent: 'border-sky-500/40 hover:border-sky-400 hover:bg-sky-500/10',
    icon: <Search className="w-6 h-6 text-sky-400" aria-hidden="true" />,
  },
  {
    reason: 'fila_atendimento',
    title: 'Fila / Demora',
    subtitle: 'Desistiu pela espera no caixa ou atendimento',
    accent: 'border-purple-500/40 hover:border-purple-400 hover:bg-purple-500/10',
    icon: <Users className="w-6 h-6 text-purple-400" aria-hidden="true" />,
  },
];

export const CounterQuickLog: React.FC<CounterQuickLogProps> = ({
  zones,
  selectedZoneId,
  onSelectZone,
  lostSales,
  onLogLostSale,
}) => {
  const [storeName, setStoreName] = useState('Loja Piloto Capim Dourado');
  const [note, setNote] = useState('');
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const handleQuickTap = (reason: LostSaleReason) => {
    const cleanStore = storeName.trim() || 'Loja Piloto Capim Dourado';
    onLogLostSale(selectedZoneId, cleanStore, reason, note.trim() || undefined);
    setNote('');
    setFeedbackBanner(
      `Registrado em 1 toque (${LOST_SALE_LABELS[reason]}) — Painel e Mapa atualizados!`
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Botões de 1 Toque do Vendedor */}
      <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400" aria-hidden="true" />
            Modo Balcão — Registro em 1 Toque (2 segundos)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Nenhum ERP atual captura por que o cliente saiu sem comprar. Um toque aqui alimenta o Copiloto IA em tempo real.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="counter-zone" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Ala da Loja no Shopping
            </label>
            <select
              id="counter-zone"
              value={selectedZoneId}
              onChange={(e) => onSelectZone(e.target.value as ZoneId)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.shortName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="counter-store" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nome da Loja (Demo)
            </label>
            <input
              id="counter-store"
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100"
            />
          </div>
        </div>

        <div>
          <label htmlFor="counter-note" className="block text-xs font-semibold text-slate-300 mb-1">
            Detalhe rápido opcional (ex: "Tênis 41" ou "Presente até R$ 100")
          </label>
          <span id="counter-note-hint" className="block text-[11px] text-slate-400 mb-1.5">
            Opcional: ajuda a IA a sugerir exatamente o produto ou promoção certa.
          </span>
          <input
            id="counter-note"
            type="text"
            aria-describedby="counter-note-hint"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: Procurou camisa branca M e não tinha..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {REASON_BUTTONS.map((btn) => (
            <button
              key={btn.reason}
              type="button"
              onClick={() => handleQuickTap(btn.reason)}
              className={`min-h-[84px] p-4 rounded-2xl bg-slate-950 border text-left transition flex items-start gap-3.5 ${btn.accent}`}
            >
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                {btn.icon}
              </div>
              <div>
                <span className="block text-sm font-bold text-white">{btn.title}</span>
                <span className="block text-xs text-slate-400 mt-0.5">{btn.subtitle}</span>
              </div>
            </button>
          ))}
        </div>

        {feedbackBanner && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{feedbackBanner}</span>
          </div>
        )}
      </div>

      {/* Últimos registros de balcão */}
      <aside className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-400" aria-hidden="true" />
          Feed de Vendas Perdidas ({lostSales.length})
        </h3>
        <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {lostSales.map((item) => (
            <li
              key={item.id}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <strong className="text-white">{item.storeName}</strong>
                <span className="font-mono text-[10px] text-slate-400">{item.timestamp}</span>
              </div>
              <div className="text-rose-300 font-medium">{LOST_SALE_LABELS[item.reason]}</div>
              {item.note && <p className="text-slate-400">{item.note}</p>}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
};

