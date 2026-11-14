import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Lock,
  Mic,
  MicOff,
  PackageX,
  Search,
  Tag,
  Undo2,
  Users,
  Zap,
} from 'lucide-react';
import { LostSaleEvent, LostSaleReason, ShoppingZone, StoreTenant, ZoneId } from '../types';
import { LOST_SALE_LABELS, findStoreByName } from '../data/shoppingData';
import { StoreAvatar } from './StoreAvatar';

interface CounterQuickLogProps {
  zones: ShoppingZone[];
  selectedZoneId: ZoneId;
  onSelectZone: (zoneId: ZoneId) => void;
  lostSales: LostSaleEvent[];
  lockedStoreName?: string;
  activeTenant?: StoreTenant | null;
  onLogLostSale: (zoneId: ZoneId, storeName: string, reason: LostSaleReason, note?: string) => void;
  onUndoLostSale?: () => void;
  onLogCompletedSale: (zoneId: ZoneId, storeName: string) => void;
  completedSalesCount: number;
  onQuickFlashFromVoice?: (note: string, reason: LostSaleReason) => void;
  /** Lojista logado: ala e loja vêm da conta, sem seletor nem campo livre. */
  lojaFixa?: string | null;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstanceLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstanceLike;

const VOICE_EXAMPLES: { text: string; hint: string }[] = [
  { text: 'Cliente achou o tênis caro e pediu desconto à vista', hint: 'Preço' },
  { text: 'Procurou camisa branca M e não tinha na grade', hint: 'Estoque' },
  { text: 'Desistiu pela fila grande no caixa agora', hint: 'Fila' },
  { text: 'Só olhando a vitrine para presente de aniversário', hint: 'Pesquisando' },
];

function classifyVoiceReason(transcript: string): LostSaleReason {
  const norm = transcript
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (
    /\b(tamanho|numeracao|numero|grade|estoque|acabou|faltou|falta|cor|modelo|pp|gg|3[5-9]|4[0-5]|nao tinha|sem)\b/.test(
      norm
    )
  ) {
    return 'estoque_grade';
  }
  if (
    /\b(fila|demora|demorando|espera|esperando|atendente|atendimento|caixa|lotado|lento|ninguem)\b/.test(
      norm
    )
  ) {
    return 'fila_atendimento';
  }
  if (
    /\b(caro|preco|valor|desconto|parcela|parcelamento|juros|barato|orcamento|promocao|reais)\b/.test(
      norm
    ) ||
    norm.includes('r$')
  ) {
    return 'preco';
  }
  return 'pesquisando';
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
  lockedStoreName,
  activeTenant,
  onLogLostSale,
  onUndoLostSale,
  onLogCompletedSale,
  completedSalesCount,
  onQuickFlashFromVoice,
  lojaFixa,
}) => {
  const effectiveLockedStore = lojaFixa || activeTenant?.storeName || lockedStoreName;
  const effectiveZoneId: ZoneId = activeTenant ? activeTenant.zoneId : selectedZoneId;
  const resolvedStore =
    activeTenant ?? (effectiveLockedStore ? findStoreByName(effectiveLockedStore) : undefined);

  const [storeName, setStoreName] = useState(effectiveLockedStore || 'Loja Piloto Capim Dourado');
  const [note, setNote] = useState('');
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [voiceSecondsLeft, setVoiceSecondsLeft] = useState(4);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [voiceReason, setVoiceReason] = useState<LostSaleReason | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [showVoiceFallback, setShowVoiceFallback] = useState(false);
  const [flashTriggered, setFlashTriggered] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const latestTranscriptRef = useRef<string>('');
  const processedVoiceRef = useRef<boolean>(false);

  const clearVoiceTimers = () => {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (effectiveLockedStore) {
      setStoreName(effectiveLockedStore);
    }
  }, [effectiveLockedStore]);

  useEffect(() => {
    if (activeTenant && selectedZoneId !== activeTenant.zoneId) {
      onSelectZone(activeTenant.zoneId);
    }
  }, [activeTenant, selectedZoneId, onSelectZone]);

  useEffect(() => {
    return () => {
      clearVoiceTimers();
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore stop errors on unmount
      }
    };
  }, []);

  const getCleanStoreName = () =>
    (effectiveLockedStore || storeName).trim() || 'Loja Piloto Capim Dourado';

  const commitVoiceLog = (rawText: string) => {
    const cleanText = rawText.trim();
    if (!cleanText || processedVoiceRef.current) return;
    processedVoiceRef.current = true;
    const classified = classifyVoiceReason(cleanText);
    const cleanStore = getCleanStoreName();

    onLogLostSale(effectiveZoneId, cleanStore, classified, cleanText);
    setVoiceTranscript(cleanText);
    setVoiceReason(classified);
    setFlashTriggered(false);
    setVoiceNotice(null);
    setFeedbackBanner(
      `Voz registrada automaticamente em "${LOST_SALE_LABELS[classified]}" — Painel e Mapa atualizados!`
    );
  };

  const handleToggleVoiceCapture = () => {
    if (isListening) {
      clearVoiceTimers();
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const RecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!RecognitionCtor) {
      setShowVoiceFallback(true);
      setVoiceNotice(
        'Navegador sem Web Speech API nativa — toque em um dos comandos de voz rápidos abaixo para testar a classificação automática.'
      );
      return;
    }

    try {
      clearVoiceTimers();
      latestTranscriptRef.current = '';
      processedVoiceRef.current = false;
      setVoiceNotice(null);
      setVoiceSecondsLeft(4);
      setIsListening(true);

      const rec = new RecognitionCtor();
      rec.lang = 'pt-BR';
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.continuous = false;

      rec.onresult = (event) => {
        let combined = '';
        let hasFinal = false;
        for (let i = 0; i < event.results.length; i++) {
          const r = event.results[i];
          combined += `${r[0]?.transcript ?? ''} `;
          if (r.isFinal) hasFinal = true;
        }
        const trimmed = combined.trim();
        if (trimmed) {
          latestTranscriptRef.current = trimmed;
        }
        if (hasFinal && trimmed) {
          clearVoiceTimers();
          setIsListening(false);
          commitVoiceLog(trimmed);
          try {
            rec.stop();
          } catch {
            // ignore
          }
        }
      };

      rec.onerror = (evt) => {
        clearVoiceTimers();
        setIsListening(false);
        setShowVoiceFallback(true);
        if (evt.error === 'not-allowed' || evt.error === 'service-not-allowed') {
          setVoiceNotice(
            'Permissão de microfone negada — use um dos comandos de voz clicáveis abaixo.'
          );
        } else {
          setVoiceNotice(
            'Não captamos áudio claro nos 4s — fale mais perto ou use um exemplo clicável abaixo.'
          );
        }
      };

      rec.onend = () => {
        clearVoiceTimers();
        setIsListening(false);
        if (latestTranscriptRef.current && !processedVoiceRef.current) {
          commitVoiceLog(latestTranscriptRef.current);
        }
      };

      recognitionRef.current = rec;
      rec.start();

      countdownTimerRef.current = window.setInterval(() => {
        setVoiceSecondsLeft((prev) => (prev > 1 ? prev - 1 : 1));
      }, 1000);

      stopTimerRef.current = window.setTimeout(() => {
        try {
          rec.stop();
        } catch {
          // ignore
        }
      }, 4000);
    } catch {
      clearVoiceTimers();
      setIsListening(false);
      setShowVoiceFallback(true);
      setVoiceNotice(
        'Não foi possível iniciar o microfone — use um dos comandos de voz rápidos abaixo.'
      );
    }
  };

  const handleSimulatedVoiceExample = (text: string) => {
    processedVoiceRef.current = false;
    commitVoiceLog(text);
  };

  const handleQuickTap = (reason: LostSaleReason) => {
    const cleanStore = getCleanStoreName();
    onLogLostSale(effectiveZoneId, cleanStore, reason, note.trim() || undefined);
    setNote('');
    setFeedbackBanner(
      `Registrado em 1 toque (${LOST_SALE_LABELS[reason]}) — Painel e Mapa atualizados!`
    );
  };

  const handleCompletedSale = () => {
    const cleanStore = getCleanStoreName();
    onLogCompletedSale(effectiveZoneId, cleanStore);
    setFeedbackBanner('Venda concluída registrada — funil do Painel atualizado!');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 panel-enter">
      {/* Botões de 1 Toque do Vendedor */}
      <div className="lg:col-span-2 bento-card-cream rounded-3xl p-4 sm:p-6 space-y-5">
        {effectiveLockedStore && (
          <div className="rounded-2xl px-4 py-3 bg-[#0B0D12] text-white border border-[#E2A83B]/45 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <StoreAvatar
                storeName={effectiveLockedStore}
                logoUrl={resolvedStore?.logoUrl}
                variant="wide"
              />
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#F5C76B] block">
                  Balcão Exclusivo da Loja
                </span>
                <strong className="text-sm sm:text-base font-extrabold text-white block truncate">
                  {effectiveLockedStore}
                </strong>
                {resolvedStore?.floorLabel && (
                  <span className="text-xs text-stone-300 block truncate">
                    {resolvedStore.floorLabel}
                  </span>
                )}
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E2A83B]/15 text-[#F5C76B] border border-[#E2A83B]/40 text-[11px] font-bold shrink-0">
              <Lock className="w-3 h-3" aria-hidden="true" />
              Modo Lojista: {effectiveLockedStore}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-[#0B0D12] flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
              <span>Modo Balcão — Registro em 1 Toque &amp; Voz 4s</span>
            </h2>
            <p className="text-xs text-stone-600 mt-1">
              Registre em 2 segundos (por toque ou falando por 4s) por que o cliente saiu sem comprar.
            </p>
          </div>
        </div>

        {/* Balcão por Voz 4s */}
        <div className="rounded-2xl bg-white border border-[#E2A83B]/40 p-4 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <strong className="text-xs font-extrabold text-[#0B0D12] block">
                Atalho de Balcão por Voz (4 segundos)
              </strong>
              <span className="text-[11px] text-stone-600">
                Fale a objeção do cliente — a IA classifica automaticamente e registra na hora.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                aria-pressed={isListening}
                aria-label={
                  isListening
                    ? `Parar gravação de voz (${voiceSecondsLeft} segundos restantes)`
                    : 'Registrar venda perdida por voz em 4 segundos'
                }
                onClick={handleToggleVoiceCapture}
                className={`min-h-[44px] flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                    : 'gold-pill-metallic'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Ouvindo ({voiceSecondsLeft}s)... Toque p/ parar</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Registrar por Voz (4s)</span>
                  </>
                )}
              </button>
              <button
                type="button"
                aria-expanded={showVoiceFallback}
                onClick={() => setShowVoiceFallback((s) => !s)}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-[11px] font-bold text-stone-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                {showVoiceFallback ? 'Ocultar Exemplos' : 'Exemplos de Voz'}
              </button>
            </div>
          </div>

          {isListening && (
            <p role="status" aria-live="polite" className="visually-hidden">
              Microfone ativo. Fale o motivo da perda de venda em até {voiceSecondsLeft} segundos.
            </p>
          )}

          {voiceNotice && (
            <p
              role="status"
              aria-live="polite"
              className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 font-medium flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" aria-hidden="true" />
              <span>{voiceNotice}</span>
            </p>
          )}

          {showVoiceFallback && (
            <div className="space-y-1.5 pt-1">
              <span className="block text-[11px] font-bold text-stone-700">
                Toque para simular comando de voz em 1 clique:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {VOICE_EXAMPLES.map((ex) => (
                  <button
                    key={ex.text}
                    type="button"
                    onClick={() => handleSimulatedVoiceExample(ex.text)}
                    className="min-h-[44px] px-3 py-2 rounded-lg bg-[#FAF8F5] hover:bg-amber-50 border border-stone-300 hover:border-[#E2A83B] text-[11px] text-[#0B0D12] font-medium text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <span className="font-extrabold text-[#7A4B0A] mr-1">[{ex.hint}]</span>
                    &ldquo;{ex.text}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          )}

          {voiceTranscript && voiceReason && (
            <div className="rounded-xl bg-[#0B0D12] text-white border border-[#E2A83B]/45 p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#F5C76B]">
                    Transcrição de Voz
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/35 text-[10px] font-bold">
                    {LOST_SALE_LABELS[voiceReason]}
                  </span>
                </div>
                <p className="text-xs font-semibold text-white">
                  &ldquo;{voiceTranscript}&rdquo;
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onQuickFlashFromVoice?.(voiceTranscript, voiceReason);
                  setFlashTriggered(true);
                  setFeedbackBanner(
                    `Oferta Relâmpago disparada para "${voiceTranscript}" (${LOST_SALE_LABELS[voiceReason]})!`
                  );
                }}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  flashTriggered
                    ? 'bg-emerald-500 text-white'
                    : 'gold-pill-metallic'
                }`}
              >
                <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {flashTriggered ? 'Oferta Relâmpago Pronta!' : 'Transformar em Oferta Relâmpago'}
                </span>
              </button>
            </div>
          )}
        </div>

        {lojaFixa ? (
          <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <strong className="text-slate-900">{lojaFixa}</strong>
            {' · '}
            {zones.find((z) => z.id === selectedZoneId)?.shortName ?? selectedZoneId}
          </p>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="counter-zone" className="block text-xs font-bold text-stone-700 mb-1.5">
              Ala da Loja no Shopping
            </label>
            <select
              id="counter-zone"
              value={effectiveZoneId}
              onChange={(e) => onSelectZone(e.target.value as ZoneId)}
              disabled={Boolean(effectiveLockedStore)}
              className="w-full min-h-[44px] bg-[#FAF8F5] border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-[#0B0D12] font-medium disabled:opacity-75 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {(activeTenant ? zones.filter((z) => z.id === activeTenant.zoneId) : zones).map((z) => (
                <option key={z.id} value={z.id}>
                  {activeTenant ? z.shortName.replace(/\s*\([^)]*\)/g, '').trim() : z.shortName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="counter-store" className="block text-xs font-bold text-stone-700 mb-1.5">
              {effectiveLockedStore ? 'Loja Isolada (Tenant Ativo)' : 'Nome da Loja (Demo)'}
            </label>
            <input
              id="counter-store"
              type="text"
              value={storeName}
              readOnly={Boolean(effectiveLockedStore)}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full min-h-[44px] bg-[#FAF8F5] border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-[#0B0D12] font-semibold read-only:bg-amber-50/60 read-only:border-[#E2A83B]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            />
          </div>
        </div>
        )}

        <div>
          <label htmlFor="counter-note" className="block text-xs font-bold text-slate-700 mb-1">
            Detalhe rápido opcional (ex: &ldquo;Tênis 41&rdquo; ou &ldquo;Presente até R$ 100&rdquo;)
          </label>
          <span id="counter-note-hint" className="block text-[11px] text-slate-600 mb-1.5">
            Ajuda a IA a sugerir exatamente o produto ou promoção certa.
          </span>
          <input
            id="counter-note"
            type="text"
            aria-describedby="counter-note-hint"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: Procurou camisa branca M e não tinha..."
            className="w-full min-h-[44px] bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          />
        </div>

        {/* RN12: a etapa "compraram" do funil vem só deste botão */}
        <button
          type="button"
          onClick={handleCompletedSale}
          className="w-full min-h-[72px] p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-left transition flex items-center gap-3.5 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <CheckCircle2 className="w-7 h-7 shrink-0" aria-hidden="true" />
          <span className="flex-1 min-w-0">
            <span className="block text-base font-extrabold">Venda concluída</span>
            <span className="block text-xs text-emerald-50">O cliente comprou nesta ala</span>
          </span>
          <span className="text-xs font-bold bg-white/20 rounded-lg px-2 py-1 shrink-0">
            {completedSalesCount} hoje
          </span>
        </button>

        <p className="text-xs font-bold text-slate-700">Não comprou? Toque no motivo:</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {REASON_BUTTONS.map((btn) => (
            <button
              key={btn.reason}
              type="button"
              onClick={() => handleQuickTap(btn.reason)}
              className={`min-h-[84px] p-4 rounded-2xl bg-slate-50/70 border text-left transition flex items-start gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${btn.accent}`}
            >
              <div className={`p-2.5 rounded-xl border shrink-0 ${btn.iconBg}`}>
                {btn.icon}
              </div>
              <div className="min-w-0">
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
      <aside className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
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
              aria-label="Desfazer último registro de venda perdida"
              className="min-h-[44px] px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center gap-1 transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
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
                <span className="font-mono text-[10px] text-slate-600">{item.timestamp}</span>
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
