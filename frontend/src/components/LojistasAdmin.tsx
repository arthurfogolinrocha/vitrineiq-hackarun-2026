import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, UserPlus, Users } from 'lucide-react';
import { api, ApiErro, Lojista } from '../services/api';
import { CAPIM_DOURADO_ZONES } from '../data/shoppingData';
import { ZoneId } from '../types';

const REGRAS =
  'Confira os campos: usuário com 3 a 40 caracteres (letras minúsculas, números, ponto, _ ou -), senha com 8 a 128 caracteres e nome da loja com 2 a 80.';

function mensagemDeErro(err: unknown): string {
  if (!(err instanceof ApiErro)) return 'Não foi possível falar com a API. Tente de novo.';
  if (err.status === 409) return 'Já existe uma conta com esse usuário.';
  if (err.status === 422) return REGRAS;
  return err.message;
}

function formatarData(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

const campo = 'w-full bg-[#FAF8F5] border border-stone-300 rounded-xl px-3 py-2.5 text-sm text-[#111318]';

/** Aba "Lojistas" (só admin): cadastra e remove contas de lojista. */
export const LojistasAdmin: React.FC = () => {
  const [lojistas, setLojistas] = useState<Lojista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [lojaNome, setLojaNome] = useState('');
  const [zoneId, setZoneId] = useState<ZoneId>(CAPIM_DOURADO_ZONES[0].id);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setLojistas(await api.lojistas());
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleCriar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!e.currentTarget.checkValidity()) {
      setErro(REGRAS);
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await api.criarLojista({ usuario: usuario.trim(), senha, lojaNome: lojaNome.trim(), zoneId });
      setAviso(`Conta "${usuario.trim()}" criada para ${lojaNome.trim()}.`);
      setUsuario('');
      setSenha('');
      setLojaNome('');
      await carregar();
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  };

  const handleRemover = async (l: Lojista) => {
    if (!window.confirm(`Remover a conta "${l.usuario}" (${l.lojaNome})? O lojista perde o acesso.`)) return;
    setErro(null);
    try {
      await api.removerLojista(l.id);
      setAviso(`Conta "${l.usuario}" removida.`);
      await carregar();
    } catch (err) {
      setErro(mensagemDeErro(err));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 panel-enter">
      <form
        onSubmit={handleCriar}
        noValidate
        className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-3.5 text-xs"
      >
        <h2 className="text-sm font-extrabold text-[#111318] flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-[#B45309]" aria-hidden="true" />
          Nova conta de lojista
        </h2>
        <div>
          <label htmlFor="lojista-usuario" className="block font-bold text-stone-700 mb-1">Usuário</label>
          <input
            id="lojista-usuario"
            required
            minLength={3}
            maxLength={40}
            pattern="[a-z0-9._\-]+"
            autoCapitalize="none"
            spellCheck={false}
            aria-describedby="lojista-usuario-dica"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className={campo}
          />
          <span id="lojista-usuario-dica" className="block text-[11px] text-stone-500 mt-1">
            3 a 40 caracteres: a-z, 0-9, ponto, _ ou -.
          </span>
        </div>
        <div>
          <label htmlFor="lojista-senha" className="block font-bold text-stone-700 mb-1">Senha</label>
          <input
            id="lojista-senha"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            aria-describedby="lojista-senha-dica"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={campo}
          />
          <span id="lojista-senha-dica" className="block text-[11px] text-stone-500 mt-1">Mínimo de 8 caracteres.</span>
        </div>
        <div>
          <label htmlFor="lojista-loja" className="block font-bold text-stone-700 mb-1">Nome da loja</label>
          <input
            id="lojista-loja"
            required
            minLength={2}
            maxLength={80}
            value={lojaNome}
            onChange={(e) => setLojaNome(e.target.value)}
            className={campo}
          />
        </div>
        <div>
          <label htmlFor="lojista-ala" className="block font-bold text-stone-700 mb-1">Ala da loja</label>
          <select
            id="lojista-ala"
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value as ZoneId)}
            className={campo}
          >
            {CAPIM_DOURADO_ZONES.map((z) => (
              <option key={z.id} value={z.id}>{z.shortName}</option>
            ))}
          </select>
        </div>

        {erro && (
          <p role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
            {erro}
          </p>
        )}
        <p aria-live="polite" className={aviso ? 'p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold' : 'sr-only'}>
          {aviso}
        </p>

        <button
          type="submit"
          disabled={enviando}
          className="w-full min-h-[44px] rounded-xl bg-[#111318] hover:bg-stone-800 disabled:opacity-60 text-white font-extrabold"
        >
          {enviando ? 'Cadastrando…' : 'Cadastrar lojista'}
        </button>
      </form>

      <section className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-[#111318] flex items-center gap-2">
          <Users className="w-4 h-4 text-[#B45309]" aria-hidden="true" />
          Lojistas cadastrados ({lojistas.length})
        </h2>
        {carregando ? (
          <p className="text-xs text-stone-500">Carregando…</p>
        ) : lojistas.length === 0 ? (
          <p className="text-xs text-stone-500">Nenhum lojista cadastrado ainda.</p>
        ) : (
          <ul className="space-y-2.5 text-xs">
            {lojistas.map((l) => (
              <li
                key={l.id}
                className="p-3.5 rounded-xl bg-[#FAF8F5] border border-stone-200 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <strong className="text-[#111318] block truncate">{l.lojaNome}</strong>
                  <span className="text-stone-600">
                    {l.usuario} · {CAPIM_DOURADO_ZONES.find((z) => z.id === l.zoneId)?.shortName ?? l.zoneId} · desde{' '}
                    {formatarData(l.criadoEm)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemover(l)}
                  aria-label={`Remover a conta ${l.usuario}`}
                  className="p-2 rounded-lg text-stone-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition shrink-0"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
