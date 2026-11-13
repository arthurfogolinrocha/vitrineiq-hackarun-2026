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
    <div className="space-y-6 panel-enter">
      {/* Pilares Artigo 6 + LGPD + Rust Engine */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2 text-xs">
          <div className="flex items-center gap-2 font-extrabold text-emerald-700 text-sm">
            <Lock className="w-4 h-4" aria-hidden="true" />
            LGPD &amp; Privacy by Design
          </div>
          <p className="text-slate-600 leading-relaxed">
            Zero coleta de CPF, biometria facial ou histórico pessoal. Câmera de borda processada em RAM e sinais do Concierge QR 100% anônimos.
          </p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2 text-xs">
          <div className="flex items-center gap-2 font-extrabold text-blue-700 text-sm">
            <Cpu className="w-4 h-4" aria-hidden="true" />
            Motor de Score (Rust + TypeScript)
          </div>
          <p className="text-slate-600 leading-relaxed">
            Cálculo determinístico de Score de Oportunidade (<code>engine-rust/src/lib.rs</code>). Exemplo calibrado: <strong>{sampleScore} pts</strong>.
          </p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2 text-xs">
          <div className="flex items-center gap-2 font-extrabold text-violet-700 text-sm">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            Transparência IA (Artigo 6)
          </div>
          <p className="text-slate-600 leading-relaxed">
            Uso de Gemini 3.8 Flash com sanitização anti-XSS/Prompt Injection, fallback heurístico resiliente e trilha criptográfica de auditoria.
          </p>
        </div>
      </div>

      {/* Tabela de Auditoria Semântica */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" aria-hidden="true" />
              Trilha de Auditoria e Integridade
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro cronológico de eventos de IA, sensor de câmera, campanhas e sinais recebidos.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Exportar JSON
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="visually-hidden">Registro de auditoria do sistema VitrineIQ</caption>
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <th scope="col" className="pb-3 font-bold">ID</th>
                <th scope="col" className="pb-3 font-bold">Evento</th>
                <th scope="col" className="pb-3 font-bold">Status</th>
                <th scope="col" className="pb-3 font-bold">Detalhes</th>
                <th scope="col" className="pb-3 font-bold">Horário</th>
                <th scope="col" className="pb-3 font-bold">Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 text-slate-500">{log.id}</td>
                  <td className="py-3 text-slate-900 font-semibold">{log.action}</td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3 text-slate-700 font-sans">{log.details}</td>
                  <td className="py-3 text-slate-500">{log.timestamp}</td>
                  <td className="py-3 text-blue-700 text-[10px]">{log.securityHash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
