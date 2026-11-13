import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Camera,
  CheckCircle2,
  Compass,
  Presentation,
  QrCode,
  Sparkles,
  Store,
} from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';

export type StoryTargetTab = 'cockpit' | 'map' | 'vision' | 'counter' | 'concierge';

interface UserStoriesBoardProps {
  onNavigateTab: (tab: StoryTargetTab) => void;
}

interface UserStoryItem {
  id: string;
  priority: 'MUST HAVE' | 'SHOULD HAVE';
  persona: string;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  kpi: string;
  acceptance: string[];
  targetTab: StoryTargetTab;
  targetLabel: string;
  icon: React.ReactNode;
}

const VITRINEIQ_STORIES: UserStoryItem[] = [
  {
    id: 'US-01',
    priority: 'MUST HAVE',
    persona: 'Lojista / Gerente de Operações',
    title: 'Horário de Pico, Clima e Ação em 1 Clique',
    asA: 'Como lojista do Capim Dourado Shopping',
    iWant: 'quero saber em tempo real o horário de pico e o efeito do clima/eventos no meu segmento',
    soThat: 'para ajustar escala de equipe, reposição e lançar Campanhas Relâmpago antes da concorrência.',
    kpi: '+28% velocidade de resposta comercial',
    acceptance: [
      'Recalcula o Score de Oportunidade (0–100) instantaneamente ao mudar clima, horário ou evento.',
      'Copiloto Gemini gera plano de ação e copy de WhatsApp com fallback resiliente.',
    ],
    targetTab: 'cockpit',
    targetLabel: 'Abrir Painel Lojista & IA',
    icon: <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />,
  },
  {
    id: 'US-02',
    priority: 'MUST HAVE',
    persona: 'Lojista / Supervisor de Vitrine',
    title: 'Webcam de Vitrine Alimentando o Painel (LGPD)',
    asA: 'Como gestor de loja física',
    iWant: 'quero conectar uma webcam na vitrine para medir quem passa, quem para e quem entra na loja',
    soThat: 'para alimentar o painel sem gravar rostos (LGPD) e corrigir vitrines com baixa conversão.',
    kpi: 'Funil Passantes → Vitrine → Porta ao vivo',
    acceptance: [
      'Processa detecção de movimento por região (Corredor, Vitrine e Porta) em RAM sem salvar vídeo.',
      'Atualiza imediatamente o fluxo e o Score de Oportunidade da ala selecionada no Painel.',
    ],
    targetTab: 'vision',
    targetLabel: 'Abrir Webcam & Sensor',
    icon: <Camera className="w-4 h-4 text-emerald-400" aria-hidden="true" />,
  },
  {
    id: 'US-03',
    priority: 'MUST HAVE',
    persona: 'Consultor / Vendedor de Balcão',
    title: 'Captura de Venda Perdida em 2 Segundos',
    asA: 'Como vendedor atendendo no balcão',
    iWant: 'quero registrar em 1 toque o motivo real pelo qual o cliente saiu sem comprar',
    soThat: 'para transformar objeções (grade, preço ou fila) em dados concretos de reposição.',
    kpi: 'Zero planilhas • < 2s por registro',
    acceptance: [
      'Botões táteis grandes para registro instantâneo durante o expediente.',
      'Alimenta o ranking de gargalos no Mapa 3D e nas recomendações da IA.',
    ],
    targetTab: 'counter',
    targetLabel: 'Abrir Modo Balcão',
    icon: <Store className="w-4 h-4 text-sky-400" aria-hidden="true" />,
  },
  {
    id: 'US-04',
    priority: 'SHOULD HAVE',
    persona: 'Consumidor no Corredor do Shopping',
    title: 'Concierge QR Sem App e Sem Login',
    asA: 'Como visitante caminhando pelo shopping',
    iWant: 'quero escanear um QR Code para achar produtos no meu orçamento sem baixar app',
    soThat: 'para desbloquear um cupom imediato e ir direto à loja certa.',
    kpi: 'Zero PII • Descoberta cross-segmento',
    acceptance: [
      'Não coleta nome, CPF ou telefone (100% Privacy by Design).',
      'Retorna cupom da campanha relâmpago ativa ou sugestão inteligente da ala.',
    ],
    targetTab: 'concierge',
    targetLabel: 'Abrir Concierge QR',
    icon: <QrCode className="w-4 h-4 text-violet-400" aria-hidden="true" />,
  },
  {
    id: 'US-05',
    priority: 'SHOULD HAVE',
    persona: 'Superintendente / Expansão de Mix',
    title: 'Mapa 3D Oficial & Espaços Vagos (Mix)',
    asA: 'Como gestor de operações do shopping',
    iWant: 'quero visualizar a planta dos 2 pavimentos em 3D com rotas quentes entre âncoras e lojas vagas',
    soThat: 'para identificar áreas subaproveitadas e atrair o segmento certo para cada espaço vago.',
    kpi: 'Planta Mix 38.800 m² • 1º e 2º Piso',
    acceptance: [
      'Alterna entre 1º Pavimento (Térreo) e 2º Pavimento (Praça de Alimentação) com vista 3D/2D.',
      'Exibe demanda oculta e âncoras reais por ala.',
    ],
    targetTab: 'map',
    targetLabel: 'Abrir Mapa 3D Oficial',
    icon: <Compass className="w-4 h-4 text-amber-300" aria-hidden="true" />,
  },
];

export const UserStoriesBoard: React.FC<UserStoriesBoardProps> = ({ onNavigateTab }) => {
  const [pitchSlideMode, setPitchSlideMode] = useState(false);

  return (
    <div className="space-y-6 panel-enter">
      {/* Cabeçalho Roleta + Slide Mode Toggle */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Roleta Tecnológica • Obrigatório
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              STORIES: User Stories
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" aria-hidden="true" />
            Mapa Interativo de Histórias de Usuário (Story Map)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cada história abaixo está conectada diretamente à funcionalidade viva que a resolve — e pronta para o slide de abertura do pitch.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPitchSlideMode((prev) => !prev)}
          aria-pressed={pitchSlideMode}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
            pitchSlideMode
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
              : 'bg-slate-950 hover:bg-slate-800 text-slate-100 border-slate-700'
          }`}
        >
          <Presentation className="w-4 h-4" aria-hidden="true" />
          {pitchSlideMode ? 'Ver Story Map Completo' : 'Modo Slide de Abertura (Pitch)'}
        </button>
      </div>

      {pitchSlideMode ? (
        /* Modo Slide de Abertura Limpo para Projetor */
        <SpotlightCard className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-amber-500/40 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                Slide 01 • Abertura do Pitch VitrineIQ
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                4 Dores Reais do Capim Dourado → 1 Ecossistema Inteligente
              </h3>
            </div>
            <span className="text-xs font-mono text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
              100% Rastreável no MVP
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {VITRINEIQ_STORIES.slice(0, 4).map((story) => (
              <div
                key={story.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    {story.icon}
                    {story.id} • {story.persona}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400">{story.kpi}</span>
                </div>
                <p className="text-sm sm:text-base text-slate-100 leading-relaxed">
                  <strong className="text-amber-300">{story.asA},</strong>{' '}
                  {story.iWant},{' '}
                  <span className="text-emerald-300 font-semibold">{story.soThat}</span>
                </p>
              </div>
            ))}
          </div>
        </SpotlightCard>
      ) : (
        /* Grid Story Map Interativo */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {VITRINEIQ_STORIES.map((story) => (
            <SpotlightCard
              key={story.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-700 font-mono text-xs font-bold text-amber-300">
                      {story.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        story.priority === 'MUST HAVE'
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                      }`}
                    >
                      {story.priority}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-semibold">{story.kpi}</span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {story.icon}
                    {story.title}
                  </h3>
                  <span className="text-xs text-slate-400">{story.persona}</span>
                </div>

                <blockquote className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed space-y-1">
                  <p>
                    <strong className="text-amber-300">{story.asA}</strong>,{' '}
                    {story.iWant},{' '}
                    <span className="text-emerald-300 font-medium">{story.soThat}</span>
                  </p>
                </blockquote>

                <div className="space-y-1.5 text-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Critérios de Aceite Implementados
                  </span>
                  {story.acceptance.map((item) => (
                    <div key={item} className="flex items-start gap-2 text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => onNavigateTab(story.targetTab)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold inline-flex items-center gap-1.5 transition"
                >
                  <span>{story.targetLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </SpotlightCard>
          ))}
        </div>
      )}
    </div>
  );
};
