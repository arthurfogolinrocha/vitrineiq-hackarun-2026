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
    targetLabel: 'Abrir Painel Lojista',
    icon: <Sparkles className="w-4 h-4 text-amber-600" aria-hidden="true" />,
  },
  {
    id: 'US-02',
    priority: 'MUST HAVE',
    persona: 'Lojista / Supervisor de Vitrine',
    title: 'Webcam de Vitrine Alimentando o Painel (LGPD)',
    asA: 'Como gestor de loja física',
    iWant: 'quero conectar uma webcam na vitrine para contar quem passa, quem para e quem entra na loja',
    soThat: 'para alimentar o painel sem gravar rostos (LGPD) e corrigir vitrines com baixa conversão.',
    kpi: 'Funil Passantes → Vitrine → Porta ao vivo',
    acceptance: [
      'Processa detecção de movimento por região (Corredor, Vitrine e Porta) em RAM sem salvar vídeo.',
      'Atualiza imediatamente o fluxo e o Score de Oportunidade da ala selecionada no Painel.',
    ],
    targetTab: 'vision',
    targetLabel: 'Abrir Câmera Vitrine',
    icon: <Camera className="w-4 h-4 text-emerald-600" aria-hidden="true" />,
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
    icon: <Store className="w-4 h-4 text-blue-600" aria-hidden="true" />,
  },
  {
    id: 'US-04',
    priority: 'SHOULD HAVE',
    persona: 'Consumidor no Corredor do Shopping',
    title: 'Concierge QR Sem App e Sem Login',
    asA: 'Como visitante caminhando pelo shopping',
    iWant: 'quero escanear um QR Code para achar produtos no meu orçamento sem baixar app',
    soThat: 'para desbloquear um cupom imediato e ir direto à loja certa.',
    kpi: 'Sem cadastro • Descoberta cross-segmento',
    acceptance: [
      'Não pede nome, CPF nem telefone.',
      'Retorna cupom da campanha relâmpago ativa ou sugestão inteligente da ala.',
    ],
    targetTab: 'concierge',
    targetLabel: 'Abrir Concierge QR',
    icon: <QrCode className="w-4 h-4 text-violet-600" aria-hidden="true" />,
  },
  {
    id: 'US-05',
    priority: 'SHOULD HAVE',
    persona: 'Superintendente / Expansão de Mix',
    title: 'Mapa 3D Oficial & Espaços Vagos (Mix)',
    asA: 'Como gestor de operações do shopping',
    iWant: 'quero visualizar a planta dos 2 pavimentos em 3D com fluxos separados entre âncoras e lojas vagas',
    soThat: 'para identificar áreas subaproveitadas e atrair o segmento certo para cada espaço vago.',
    kpi: 'Planta Mix 38.800 m² • 1º e 2º Piso',
    acceptance: [
      'Alterna entre 1º Pavimento (Térreo) e 2º Pavimento (Praça de Alimentação) em maquete 3D nivelada.',
      'Permite filtrar fluxos por Moda, Lazer/Cinema e Gastronomia.',
    ],
    targetTab: 'map',
    targetLabel: 'Abrir Mapa 3D',
    icon: <Compass className="w-4 h-4 text-amber-600" aria-hidden="true" />,
  },
  {
    id: 'US-06',
    priority: 'SHOULD HAVE',
    persona: 'Lojista em Horário de Movimento + Vizinhos de Corredor',
    title: 'Vitrine Crowd-Drop, Aliança de Corredor & Voz 4s',
    asA: 'Como lojista conectado ao VitrineIQ',
    iWant: 'quero transformar aglomeração na vitrine em desconto coletivo dinâmico, criar rotas cruzadas com lojas âncoras e ditar objeções por voz',
    soThat: 'para converter grupos indecisos em tempo real e integrar o mix do shopping em aliança.',
    kpi: 'Crowd-Drop 10%→30% • Balcão Voz 4s',
    acceptance: [
      'Telão Crowd-Drop ajusta o cupom (10% / 20% / 30%) pelo nº de pessoas detectadas na vitrine.',
      'Aliança de Corredor desbloqueia Bônus de Rota no Concierge quando o cliente vem de outra ala.',
    ],
    targetTab: 'cockpit',
    targetLabel: 'Abrir Telão Crowd-Drop',
    icon: <Sparkles className="w-4 h-4 text-[#B45309]" aria-hidden="true" />,
  },
];

export const UserStoriesBoard: React.FC<UserStoriesBoardProps> = ({ onNavigateTab }) => {
  const [pitchSlideMode, setPitchSlideMode] = useState(false);

  return (
    <div className="space-y-6 panel-enter">
      {/* Cabeçalho Roleta + Slide Mode Toggle */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
              Roleta Tecnológica • Obrigatório
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              STORIES: User Stories
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-600" aria-hidden="true" />
            Mapa Interativo de Histórias de Usuário
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Histórias no formato oficial ágil ligadas diretamente às telas do VitrineIQ e prontas para o slide de abertura.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPitchSlideMode((prev) => !prev)}
          aria-pressed={pitchSlideMode}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
            pitchSlideMode
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
          }`}
        >
          <Presentation className="w-4 h-4" aria-hidden="true" />
          {pitchSlideMode ? 'Ver Story Map Completo' : 'Modo Slide de Abertura (Pitch)'}
        </button>
      </div>

      {pitchSlideMode ? (
        <SpotlightCard className="bg-white border border-amber-300 rounded-3xl p-8 shadow-md space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
                Slide 01 • Abertura do Pitch VitrineIQ
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                4 Dores Reais do Capim Dourado → 1 Solução Integrada
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full">
              Rastreável no MVP
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {VITRINEIQ_STORIES.slice(0, 4).map((story) => (
              <div
                key={story.id}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                    {story.icon}
                    {story.id} • {story.persona}
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-emerald-700">{story.kpi}</span>
                </div>
                <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                  <strong className="text-amber-800">{story.asA},</strong>{' '}
                  {story.iWant},{' '}
                  <span className="text-emerald-800 font-semibold">{story.soThat}</span>
                </p>
              </div>
            ))}
          </div>
        </SpotlightCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {VITRINEIQ_STORIES.map((story) => (
            <SpotlightCard
              key={story.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-800">
                      {story.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        story.priority === 'MUST HAVE'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {story.priority}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold">{story.kpi}</span>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    {story.icon}
                    {story.title}
                  </h3>
                  <span className="text-xs text-slate-500">{story.persona}</span>
                </div>

                <blockquote className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <strong className="text-amber-800">{story.asA}</strong>, {story.iWant},{' '}
                  <span className="text-emerald-800 font-semibold">{story.soThat}</span>
                </blockquote>

                <div className="space-y-1.5 text-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Critérios de Aceite
                  </span>
                  {story.acceptance.map((item) => (
                    <div key={item} className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => onNavigateTab(story.targetTab)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
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
