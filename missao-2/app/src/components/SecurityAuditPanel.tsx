import React from 'react';
import { Cpu, Download, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { SystemAuditLog } from '../types';
import { calculateRetailOpportunityScore } from '../services/opportunityEngine';

interface SecurityAuditPanelProps {
  auditLogs: SystemAuditLog[];
}

export const SecurityAuditPanel: React.FC<SecurityAuditPanelProps> = ({ auditLogs }) => {
  const sampleScore = calculateRetailOpportunityScore(140, 8, 5, 1.25);

  const handleExport = () => {
    const payload = JSON.stringify(auditLogs, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vitrineiq-audit-logs.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Pilares Artigo 6 + LGPD + Rust Engine */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
            <Lock className="w-4 h-4" aria-hidden="true" />
            LGPD &amp; Privacy by Design
          </div>
          <p className="text-slate-300 leading-relaxed">
            Zero coleta de CPF, biometria facial ou histórico pessoal. Todos os sinais do Concierge QR são 100% anônimos e agregados por ala do shopping.
          </p>
        </div>

        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-sky-400 text-sm">
            <Cpu className="w-4 h-4" aria-hidden="true" />
            Motor de Score (Rust + TypeScript)
          </div>
          <p className="text-slate-300 leading-relaxed">
            Cálculo determinístico de Score de Oportunidade (`calculate_retail_opportunity_score` em <code>engine-rust/src/lib.rs</code>). Exemplo calibrado: <strong>{sampleScore} pts</strong>.
          </p>
        </div>

        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-purple-400 text-sm">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            Transparência IA (Artigo 6)
          </div>
          <p className="text-slate-300 leading-relaxed">
            Uso de Gemini 3.8 Flash com sanitização anti-XSS/Prompt Injection, fallback heurístico de 0 quebras e auditoria criptográfica determinística.
          </p>
        </div>
      </div>

      {/* Tabela de Auditoria Semântica */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              Trilha de Auditoria e Integridade
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Registro cronológico de eventos de IA, campanhas ativadas e sinais recebidos.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Exportar JSON
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="visually-hidden">Registro de auditoria do sistema VitrineIQ</caption>
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th scope="col" className="pb-3 font-semibold">ID</th>
                <th scope="col" className="pb-3 font-semibold">Evento</th>
                <th scope="col" className="pb-3 font-semibold">Status</th>
                <th scope="col" className="pb-3 font-semibold">Detalhes</th>
                <th scope="col" className="pb-3 font-semibold">Horário</th>
                <th scope="col" className="pb-3 font-semibold">Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 text-slate-400">{log.id}</td>
                  <td className="py-3 text-white font-semibold">{log.action}</td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3 text-slate-300 font-sans">{log.details}</td>
                  <td className="py-3 text-slate-400">{log.timestamp}</td>
                  <td className="py-3 text-sky-400 text-[10px]">{log.securityHash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

