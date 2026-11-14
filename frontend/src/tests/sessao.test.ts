import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  cabecalhoAuth,
  definirAoExpirar,
  lerSessao,
  salvarSessao,
  Sessao,
  tratar401,
} from '../services/api';
import { abasPermitidas, ehContaDeLoja } from '../utils/acesso';
import { USER_STORIES_ROLETA } from '../data/userStoriesData';

function storageFalso(): Storage {
  const dados = new Map<string, string>();
  return {
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: string) => void dados.set(k, v),
    removeItem: (k: string) => void dados.delete(k),
    clear: () => dados.clear(),
    key: () => null,
    get length() {
      return dados.size;
    },
  };
}

const storageQuebrado = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
} as unknown as Storage;

const LOJISTA: Sessao = {
  token: 'tok-123',
  usuario: { nome: 'renner', papel: 'lojista', lojaId: '7', lojaNome: 'Renner', zoneId: 'ala-sul-esporte' },
};

describe('Sessão de login (localStorage)', () => {
  afterEach(() => {
    salvarSessao(null, storageFalso());
    definirAoExpirar(null);
  });

  it('grava, lê de volta e manda o token no cabeçalho', () => {
    const st = storageFalso();
    salvarSessao(LOJISTA, st);
    salvarSessao(null, storageFalso()); // zera o token em memória
    expect(cabecalhoAuth()).toEqual({});
    expect(lerSessao(st)).toEqual(LOJISTA);
    expect(cabecalhoAuth()).toEqual({ Authorization: 'Bearer tok-123' });
  });

  it('sair apaga a sessão salva', () => {
    const st = storageFalso();
    salvarSessao(LOJISTA, st);
    salvarSessao(null, st);
    expect(lerSessao(st)).toBeNull();
    expect(cabecalhoAuth()).toEqual({});
  });

  it('ignora JSON inválido ou sessão sem papel conhecido', () => {
    const st = storageFalso();
    st.setItem('vitrineiq.sessao', '{quebrado');
    expect(lerSessao(st)).toBeNull();
    st.setItem('vitrineiq.sessao', JSON.stringify({ token: 'x', usuario: { papel: 'root' } }));
    expect(lerSessao(st)).toBeNull();
  });

  it('sem storage, não quebra e a sessão fica só na memória', () => {
    expect(lerSessao(storageQuebrado)).toBeNull();
    expect(() => salvarSessao(LOJISTA, storageQuebrado)).not.toThrow();
    expect(cabecalhoAuth()).toEqual({ Authorization: 'Bearer tok-123' });
  });

  it('401 com token derruba a sessão e avisa o App; sem token não faz nada', () => {
    const aoExpirar = vi.fn();
    definirAoExpirar(aoExpirar);
    tratar401();
    expect(aoExpirar).not.toHaveBeenCalled();
    salvarSessao(LOJISTA, storageFalso());
    tratar401();
    expect(aoExpirar).toHaveBeenCalledTimes(1);
    expect(cabecalhoAuth()).toEqual({});
  });
});

describe('abasPermitidas (quem vê o quê)', () => {
  it('admin do shopping vê a visão geral, o mapa, a auditoria e as contas', () => {
    expect(abasPermitidas('admin')).toEqual(['cockpit', 'map', 'audit', 'lojistas']);
  });

  it('lojista vê Painel, Balcão, Câmera e a prévia do Concierge da loja dele', () => {
    expect(abasPermitidas('lojista')).toEqual(['cockpit', 'counter', 'vision', 'concierge']);
  });

  it('vendedor vê só o Balcão', () => {
    expect(abasPermitidas('vendedor')).toEqual(['counter']);
    expect(ehContaDeLoja('vendedor')).toBe(true);
    expect(ehContaDeLoja('admin')).toBe(false);
  });

  it('sem login, só o Concierge do visitante', () => {
    expect(abasPermitidas(null)).toEqual(['concierge']);
  });
});

describe('Stories (Roleta)', () => {
  it('mapeia US-01 a US-05 com prioridades MoSCoW e destinos que algum perfil acessa', () => {
    const allowed = (['visitante', 'vendedor', 'lojista', 'admin'] as const).flatMap((p) => abasPermitidas(p));
    expect(USER_STORIES_ROLETA.map((story) => story.id)).toEqual(['US-01', 'US-02', 'US-03', 'US-04', 'US-05']);
    for (const story of USER_STORIES_ROLETA) {
      expect(allowed).toContain(story.targetTab);
      expect(story.bdd.dado.length).toBeGreaterThan(5);
      expect(story.bdd.quando.length).toBeGreaterThan(5);
      expect(story.bdd.entao.length).toBeGreaterThan(5);
    }
  });
});
