import { ActiveTab } from '../utils/acesso';

export type StoryPriority = 'MUST' | 'SHOULD';

export interface UserStoryItem {
  id: string;
  priority: StoryPriority;
  priorityLabel: string;
  title: string;
  como: string;
  quero: string;
  para: string;
  bdd: {
    dado: string;
    quando: string;
    entao: string;
  };
  targetTab: ActiveTab;
  targetTabLabel: string;
}

export const USER_STORIES_ROLETA: UserStoryItem[] = [
  {
    id: 'US-01',
    priority: 'MUST',
    priorityLabel: 'Must Have',
    title: 'Horário de Pico, Clima e Ação Comercial em 1 Clique',
    como: 'lojista no Capim Dourado Shopping',
    quero: 'saber o horário de pico, o efeito do clima/eventos no meu segmento e gerar campanhas relâmpago em 1 clique',
    para: 'ajustar escala, estoque e promoções antes da concorrência sem depender de planilhas.',
    bdd: {
      dado: 'que seleciono clima (ex: Calor 38°C), horário (ex: Pós-Cinema 20h) e evento do shopping',
      quando: 'qualquer fator muda no Painel do Lojista',
      entao: 'o IQ Score (0–100) recalcula em <300ms e libera plano tático via IA com fallback resiliente e card pronto.',
    },
    targetTab: 'cockpit',
    targetTabLabel: 'Abrir Painel Lojista',
  },
  {
    id: 'US-02',
    priority: 'MUST',
    priorityLabel: 'Must Have',
    title: 'Webcam na Vitrine Alimentando o Painel em Tempo Real',
    como: 'gerente de loja física',
    quero: 'conectar uma webcam apontada para a fachada/vitrine para contar quem passa, quem para e quem entra/sai',
    para: 'alimentar o painel automaticamente sem gravar imagens nem violar a LGPD.',
    bdd: {
      dado: 'que ativo a webcam local (ou simulador óptico) no Sensor Vitrine',
      quando: 'há movimento nas zonas virtuais (Corredor, Vitrine e Porta)',
      entao: 'a diferença de pixels roda em RAM (<5ms, zero gravação) e atualiza o funil e o fluxo da ala ao vivo.',
    },
    targetTab: 'vision',
    targetTabLabel: 'Abrir Sensor Vitrine',
  },
  {
    id: 'US-03',
    priority: 'MUST',
    priorityLabel: 'Must Have',
    title: 'Registro de Venda Perdida em 1 Toque (e Voz)',
    como: 'vendedor atendendo no balcão da loja',
    quero: 'registrar em segundos o motivo real pelo qual o cliente não concluiu a compra',
    para: 'que objeções como falta de numeração/grade ou parcelamento virem ações concretas de reposição e oferta.',
    bdd: {
      dado: 'que seleciono a ala/loja e o motivo de perda no Modo Balcão (ou dite por voz em 4s)',
      quando: 'toco para registrar (mesmo sem internet, com fila offline)',
      entao: 'o ranking de gargalos atualiza no cockpit, no mapa e na trilha de auditoria instantaneamente.',
    },
    targetTab: 'counter',
    targetTabLabel: 'Abrir Modo Balcão',
  },
  {
    id: 'US-04',
    priority: 'SHOULD',
    priorityLabel: 'Should Have',
    title: 'Descoberta Guiada Sem App e Sem CPF (Concierge QR)',
    como: 'consumidor caminhando pelos corredores do shopping',
    quero: 'escanear um QR Code, informar o que procuro no meu orçamento e receber uma oferta de resgate (reserva, prova ou parcelamento) sem cadastrar CPF ou baixar app',
    para: 'encontrar o produto certo rapidamente enquanto a loja capta demanda real com privacidade.',
    bdd: {
      dado: 'que o visitante abre o QR Code público (?tela=concierge) e escolhe faixa de valor/categoria',
      quando: 'envia o pedido de busca sem login',
      entao: 'recebe a oferta ativa da vitrine e a ala ganha sinal anônimo de procura em tempo real.',
    },
    targetTab: 'concierge',
    targetTabLabel: 'Abrir Concierge QR',
  },
  {
    id: 'US-05',
    priority: 'SHOULD',
    priorityLabel: 'Should Have',
    title: 'Gêmeo Digital 3D com Alas, Espaços Vagos e Rotas Quentes',
    como: 'superintendente ou lojista em expansão',
    quero: 'navegar pelos 2 pavimentos oficiais (L1 e L2) em 3D com calor de demanda e espaços vagos mapeados',
    para: 'identificar fluxos quentes entre âncoras, praça de alimentação e oportunidades de novas operações.',
    bdd: {
      dado: 'que acesso o Mapa 3D do Capim Dourado Shopping e alterno entre Térreo (L1), 2º Piso (L2) e Street View',
      quando: 'clico em uma ala, loja satélite ou espaço vago',
      entao: 'a câmera foca a zona e exibe IQ Score, demanda cruzada entre âncoras e sugestões de mix.',
    },
    targetTab: 'map',
    targetTabLabel: 'Abrir Shopping 3D',
  },
];

