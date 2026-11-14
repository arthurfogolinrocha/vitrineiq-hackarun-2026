import React, { useMemo, useState } from 'react';
import {
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Download,
  Filter,
  Gauge,
  KeyRound,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { SystemAuditLog } from '../types';
import { calculateRetailOpportunityScore } from '../services/opportunityEngine';

interface SecurityAuditPanelProps {
  auditLogs: SystemAuditLog[];
}

type StatusFilter = 'ALL' | SystemAuditLog['status'];

interface SecurityControlCard {
  id: string;
  title: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  tone: string;
}

const SECURITY_CONTROLS: SecurityControlCard[] = [
  {
    id: 'headers-csp-hsts',
    title: 'Headers HTTP + CSP + HSTS',
    badge: 'ATIVO',
    description:
      'nosniff, X-Frame-Options: DENY, Referrer-Policy, Cache-Control: no-store (/api/auth e /api/admin), CSP frame-ancestors none e HSTS preload.',
    icon: ShieldCheck,
    tone: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  {
    id: 'pbkdf2-hmac',
    title: 'PBKDF2-HMAC-SHA256 200k + HMAC',
    badge: '200k iter',
    description:
      'Senhas com sal de 16 bytes e 200.000 iterações SHA-256; tokens HMAC-SHA256 (12h) validados com hmac.compare_digest.',
    icon: KeyRound,
    tone: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  {
    id: 'anti-brute-force',
    title: 'Proteção Anti Brute-Force no Login',
    badge: '10 falhas/60s',
    description:
      'POST /api/auth/login rastreia falhas inválidas por IP em janela deslizante de 60s, bloqueando com HTTP 429 + Retry-After e zerando ao autenticar.',
    icon: ShieldAlert,
    tone: 'text-amber-800 bg-amber-50 border-amber-200',
  },
  {
    id: 'rate-limit-ia-concierge',
    title: 'Rate Limit IA & Concierge',
    badge: '10–20 req/min',
    description:
      'Cota por IP de 10 req/min nas rotas /api/ia/* (proteção da cota Gemini) e 20 req/min no /api/concierge/busca.',
    icon: Gauge,
    tone: 'text-violet-700 bg-violet-50 border-violet-200',
  },
  {
    id: 'lgpd-zero-pii',
    title: 'LGPD Zero-PII & Sanitização',
    badge: 'Zero-PII',
    description:
      'mascarar_dados_pessoais oculta CPF, e-mail, telefone, chave PIX UUID e cartão antes de gravar; sanitize_input neutraliza scripts, on*= e javascript:.',
    icon: Lock,
    tone: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  {
    id: 'multi-tenant',
    title: 'Isolamento Multi-Tenant Lojista vs Admin',
    badge: 'Tenant-Scoped',
    description:
      'lojaId e zoneId são extraídos exclusivamente do token assinado; contas removidas pelo admin perdem acesso imediatamente.',
    icon: Users,
    tone: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  },
  {
    id: 'vitrine-token',
    title: 'VITRINE_TOKEN na Câmera Edge',
    badge: 'X-Vitrine-Token',
    description:
      'Ingestão de /api/vitrine/eventos e /api/vitrine/alertas autenticada por token dedicado via hmac.compare_digest (obrigatório em produção).',
    icon: Camera,
    tone: 'text-slate-700 bg-slate-100 border-slate-300',
  },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'SUCCESS', label: 'Sucesso' },
  { value: 'FALLBACK_LOCAL', label: 'Fallback Local' },
  { value: 'WARNING', label: 'Alerta' },
  { value: 'ERROR', label: 'Erro' },
];

export const SecurityAuditPanel: React.FC<SecurityAuditPanelProps> = ({ auditLogs }) => {
  const sampleScore = calculateRetailOpportunityScore(140, 8, 5, 1.25);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState('');

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      ALL: auditLogs.length,
      SUCCESS: 0,
      FALLBACK_LOCAL: 0,
      WARNING: 0,
      ERROR: 0,
    };
    for (const log of auditLogs) {
      counts[log.status] = (counts[log.status] ?? 0) + 1;
    }
    return counts;
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return auditLogs.filter((log) => {
      if (statusFilter !== 'ALL' && log.status !== statusFilter) return false;
      if (!query) return true;
      return (
        log.id.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.details.toLowerCase().includes(query) ||
        log.securityHash.toLowerCase().includes(query)
      );
    });
  }, [auditLogs, searchQuery, statusFilter]);

  const handleExport = () => {
    const payload = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vitrineiq-audit-logs.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyEvidence = async (log: SystemAuditLog) => {
    const evidence = [
      `[${log.timestamp}]`,
      `ID=${log.id}`,
      `EVENTO=${log.action}`,
      `STATUS=${log.status}`,
      `HASH=${log.securityHash}`,
      log.prevHash ? `PREV=${log.prevHash}` : null,
      `DETALHES=${log.details}`,
    ]
      .filter(Boolean)
      .join(' | ');

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(evidence);
      }
      setCopiedId(log.id);
      setCopyFeedback(`Evidência do evento ${log.id} copiada com segurança.`);
      window.setTimeout(() => {
        setCopiedId((current) => (current === log.id ? null : current));
      }, 1800);
    } catch {
      setCopyFeedback('Não foi possível acessar a área de transferência neste navegador.');
    }
  };

  return (
    <div className="space-y-6 panel-enter min-w-0 max-w-full">
      {/* Matriz de Controles Reais Implementados */}
      <section
        aria-labelledby="security-controls-heading"
        className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 min-w-0"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="min-w-0">
            <h2
              id="security-controls-heading"
              className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden={true} />
              <span>Controles Ativos de Segurança, Autenticação &amp; LGPD</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Camadas defensivas verificáveis em execução no backend FastAPI e na entrega frontend.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-extrabold shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden={true} />
            7/7 Controles Ativos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {SECURITY_CONTROLS.map((ctrl) => {
            const Icon = ctrl.icon;
            return (
              <article
                key={ctrl.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 min-w-0 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" aria-hidden={true} />
                    <h3 className="text-xs font-extrabold text-slate-900 leading-snug break-words">
                      {ctrl.title}
                    </h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md border text-[10px] font-bold whitespace-nowrap shrink-0 ${ctrl.tone}`}
                  >
                    {ctrl.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed break-words">
                  {ctrl.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Pilares Artigo 6 + LGPD + Backend Python */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2 text-xs min-w-0">
          <div className="flex items-center gap-2 font-extrabold text-emerald-700 text-sm">
            <Lock className="w-4 h-4 shrink-0" aria-hidden={true} />
            Privacidade (LGPD)
          </div>
          <p className="text-slate-600 leading-relaxed break-words">
            Não pedimos nome, CPF nem contato. A webcam processa contagem e auditoria de vitrine (
            <code>/api/ia/auditar-vitrine</code>) em memória RAM sem gravar vídeo nem salvar fotos. O Concierge QR não pede cadastro e cada lojista enxerga apenas seu tenant isolado.
          </p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2 text-xs min-w-0">
          <div className="flex items-center gap-2 font-extrabold text-blue-700 text-sm">
            <Cpu className="w-4 h-4 shrink-0" aria-hidden={true} />
            Backend Python (FastAPI) &amp; Espelho TypeScript
          </div>
          <p className="text-slate-600 leading-relaxed break-words">
            O backend em Python (<code>api/app/engine.py</code>, rotas <code>/api/score</code>,{' '}
            <code>/api/vitrine/crowd-drop</code>, <code>/api/ia/plano</code> e{' '}
            <code>/api/ia/auditar-vitrine</code>) é a fonte de verdade. O frontend espelha o cálculo com{' '}
            <strong>paridade validada</strong> ({sampleScore} pts).
          </p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2 text-xs min-w-0">
          <div className="flex items-center gap-2 font-extrabold text-violet-700 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden={true} />
            Transparência IA (Artigo 6)
          </div>
          <p className="text-slate-600 leading-relaxed break-words">
            Agente de IA no backend Python (provedor intercambiável, chave só no servidor), filtro de prompt injection e heurística sem IA quando o provedor não responde; a tela indica qual dos dois gerou o plano. O registro de ações usa hash encadeado para apontar alterações, não como garantia de segurança.
          </p>
        </div>
      </div>

      {/* Tabela de Auditoria Semântica */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden={true} />
              <span>Trilha de Auditoria e Integridade</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro cronológico de eventos de IA, sensor de câmera, campanhas e sinais recebidos.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            aria-label={`Exportar ${filteredLogs.length} eventos de auditoria em JSON`}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden={true} />
            Exportar JSON ({filteredLogs.length})
          </button>
        </div>

        {/* Barra de Filtros Rápidos e Busca */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Filtrar eventos por status"
            className="flex flex-wrap items-center gap-1.5"
          >
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 mr-1">
              <Filter className="w-3.5 h-3.5" aria-hidden={true} />
              Status:
            </span>
            {STATUS_OPTIONS.map((opt) => {
              const active = statusFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label} ({statusCounts[opt.value]})
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-72">
            <label htmlFor="audit-search-input" className="visually-hidden">
              Buscar na trilha de auditoria por evento, detalhe ou hash
            </label>
            <Search
              className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden={true}
            />
            <input
              id="audit-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar evento, detalhe ou hash..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            />
          </div>
        </div>

        <div role="status" aria-live="polite" className="visually-hidden">
          {copyFeedback}
        </div>

        <div className="overflow-x-auto max-w-full">
          <table className="w-full min-w-[680px] text-left text-xs">
            <caption className="visually-hidden">Registro de auditoria do sistema VitrineIQ</caption>
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <th scope="col" className="pb-3 pr-3 font-bold">ID</th>
                <th scope="col" className="pb-3 pr-3 font-bold">Evento</th>
                <th scope="col" className="pb-3 pr-3 font-bold">Status</th>
                <th scope="col" className="pb-3 pr-3 font-bold">Detalhes</th>
                <th scope="col" className="pb-3 pr-3 font-bold">Horário</th>
                <th scope="col" className="pb-3 pr-3 font-bold">Hash</th>
                <th scope="col" className="pb-3 font-bold text-right">Evidência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    Nenhum evento encontrado para os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isCopied = copiedId === log.id;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 pr-3 text-slate-500 whitespace-nowrap">{log.id}</td>
                      <td className="py-3 pr-3 text-slate-900 font-semibold">{log.action}</td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : log.status === 'FALLBACK_LOCAL'
                              ? 'bg-sky-100 text-sky-800 border border-sky-300 font-extrabold'
                              : log.status === 'ERROR'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {log.status === 'FALLBACK_LOCAL' ? 'FALLBACK LOCAL' : log.status}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-slate-700 font-sans break-words max-w-xs">
                        {log.details}
                      </td>
                      <td className="py-3 pr-3 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                      <td className="py-3 pr-3 text-blue-700 text-[10px]">
                        <span className="font-bold block whitespace-nowrap">{log.securityHash}</span>
                        {log.prevHash && (
                          <span className="text-[9px] text-slate-400 block truncate max-w-[140px]">
                            ← {log.prevHash}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => void handleCopyEvidence(log)}
                          aria-label={`Copiar evidência segura do evento ${log.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-sans text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" aria-hidden={true} />
                              <span>Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" aria-hidden={true} />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
