import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  PackageX,
  Search,
  Tag,
  Undo2,
  Users,
} from 'lucide-react';
import { LostSaleEvent, LostSaleReason, ShoppingZone, ZoneId } from '../types';
import { LOST_SALE_LABELS } from '../data/shoppingData';

interface CounterQuickLogProps {
  zones: ShoppingZone[];
  selectedZoneId: ZoneId;
  onSelectZone: (zoneId: ZoneId) => void;
  lostSales: LostSaleEvent[];
  onLogLostSale: (zoneId: ZoneId, storeName: string, reason: LostSaleReason, note?: string) => void;
  onUndoLostSale?: () => void;
}

const REASON_BUTTONS: {
  reason: LostSaleReason;
  title: string;
  subtitle: string;
  accent: string;
  iconBg: string;
  icon: React.ReactNode;
}[] = [
  {
    reason: 'preco',
    title: 'Preço / Parcelamento',
    subtitle: 'Cliente achou caro ou pediu desconto',
    accent: 'border-amber-200 hover:border-amber-400 hover:bg-amber-50/70',
    iconBg: 'bg-amber-50 border-amber-200',
    icon: <Tag className="w-6 h-6 text-amber-600" aria-hidden="true" />,
  },
  {
    reason: 'estoque_grade',
    title: 'Sem Tamanho / Estoque',
    subtitle: 'Faltou cor, tamanho ou produto desejado',
    accent: 'border-rose-200 hover:border-rose-400 hover:bg-rose-50/70',
    iconBg: 'bg-rose-50 border-rose-200',
    icon: <PackageX className="w-6 h-6 text-rose-600" aria-hidden="true" />,
  },
  {
    reason: 'pesquisando',
    title: 'Só Olhando / Vitrine',
    subtitle: 'Entrou pela vitrine mas saiu sem oferta certa',
    accent: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50/70',
    iconBg: 'bg-blue-50 border-blue-200',
    icon: <Search className="w-6 h-6 text-blue-600" aria-hidden="true" />,
  },
  {
    reason: 'fila_atendimento',
    title: 'Fila / Demora',
    subtitle: 'Desistiu pela espera no caixa ou atendimento',
    accent: 'border-violet-200 hover:border-violet-400 hover:bg-violet-50/70',
    iconBg: 'bg-violet-50 border-violet-200',
    icon: <Users className="w-6 h-6 text-violet-600" aria-hidden="true" />,
  },
];

export const CounterQuickLog: React.FC<CounterQuickLogProps> = ({
  zones,
  selectedZoneId,
  onSelectZone,
  lostSales,
  onLogLostSale,
  onUndoLostSale,
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 panel-enter">
      {/* Botões de 1 Toque do Vendedor */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" aria-hidden="true" />
            Modo Balcão — Registro em 1 Toque
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Registre em 2 segundos por que o cliente saiu sem comprar e alimente o Copiloto IA na hora.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="counter-zone" className="block text-xs font-bold text-slate-700 mb-1.5">
              Ala da Loja no Shopping
            </label>
            <select
              id="counter-zone"
              value={selectedZoneId}
              onChange={(e) => onSelectZone(e.target.value as ZoneId)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-medium"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.shortName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="counter-store" className="block text-xs font-bold text-slate-700 mb-1.5">
              Nome da Loja (Demo)
            </label>
            <input
              id="counter-store"
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900"
            />
          </div>
        </div>

        <div>
          <label htmlFor="counter-note" className="block text-xs font-bold text-slate-700 mb-1">
            Detalhe rápido opcional (ex: &ldquo;Tênis 41&rdquo; ou &ldquo;Presente até R$ 100&rdquo;)
          </label>
          <span id="counter-note-hint" className="block text-[11px] text-slate-500 mb-1.5">
            Ajuda a IA a sugerir exatamente o produto ou promoção certa.
          </span>
          <input
            id="counter-note"
            type="text"
            aria-describedby="counter-note-hint"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: Procurou camisa branca M e não tinha..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {REASON_BUTTONS.map((btn) => (
            <button
              key={btn.reason}
              type="button"
              onClick={() => handleQuickTap(btn.reason)}
              className={`min-h-[84px] p-4 rounded-2xl bg-slate-50/70 border text-left transition flex items-start gap-3.5 ${btn.accent}`}
            >
              <div className={`p-2.5 rounded-xl border shrink-0 ${btn.iconBg}`}>
                {btn.icon}
              </div>
              <div>
                <span className="block text-sm font-bold text-slate-900">{btn.title}</span>
                <span className="block text-xs text-slate-600 mt-0.5">{btn.subtitle}</span>
              </div>
            </button>
          ))}
        </div>

        {feedbackBanner && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>{feedbackBanner}</span>
          </div>
        )}
      </div>

      {/* Últimos registros de balcão */}
      <aside className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" aria-hidden="true" />
            Feed de Vendas Perdidas ({lostSales.length})
          </h3>
          {onUndoLostSale && lostSales.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onUndoLostSale();
                setFeedbackBanner('Último registro desfeito com sucesso!');
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center gap-1 transition"
              title="Desfazer último registro de venda perdida"
            >
              <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Desfazer</span>
            </button>
          )}
        </div>
        <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {lostSales.map((item) => (
            <li
              key={item.id}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <strong className="text-slate-900">{item.storeName}</strong>
                <span className="font-mono text-[10px] text-slate-500">{item.timestamp}</span>
              </div>
              <div className="text-rose-700 font-semibold">{LOST_SALE_LABELS[item.reason]}</div>
              {item.note && <p className="text-slate-600">{item.note}</p>}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
};
