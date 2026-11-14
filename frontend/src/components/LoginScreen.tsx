import React, { useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';
import { api, ApiErro, Sessao } from '../services/api';

interface LoginScreenProps {
  onEntrar: (sessao: Sessao) => void;
  onDemo: () => void;
  /** Aviso vindo de fora, ex.: "Sessão expirada". */
  aviso?: string | null;
  /** Texto curto do que abre depois do login (ex.: Modo Balcão no quiosque). */
  destino?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onEntrar, onDemo, aviso, destino }) => {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [apiFora, setApiFora] = useState(false);

  useEffect(() => {
    api.saude().then(
      () => setApiFora(false),
      () => setApiFora(true)
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario.trim() || !senha) {
      setErro('Informe usuário e senha.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      onEntrar(await api.login(usuario.trim(), senha));
    } catch (err) {
      if (err instanceof ApiErro) {
        setErro(err.status === 503 ? 'Servidor sem configuração de login.' : err.message);
      } else {
        setApiFora(true);
        setErro('Não foi possível falar com a API. Tente de novo em instantes.');
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F2EE] text-[#111318] flex items-center justify-center p-4">
      <main className="w-full max-w-sm bg-white border border-stone-200 rounded-3xl shadow-md p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#111318] text-[#E2A83B] font-black text-lg flex items-center justify-center">
            V
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">Entrar no VitrineIQ</h1>
            <p className="text-xs text-stone-500">{destino ?? 'Painel do lojista e administração'}</p>
          </div>
        </div>

        {aviso && (
          <p role="status" aria-live="polite" className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
            {aviso}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs" noValidate>
          <div>
            <label htmlFor="login-usuario" className="block font-bold text-stone-700 mb-1.5">
              Usuário
            </label>
            <input
              id="login-usuario"
              type="text"
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              aria-invalid={erro ? 'true' : 'false'}
              aria-describedby={erro ? 'login-erro' : undefined}
              className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl px-3.5 py-3 text-sm text-[#111318]"
            />
          </div>
          <div>
            <label htmlFor="login-senha" className="block font-bold text-stone-700 mb-1.5">
              Senha
            </label>
            <input
              id="login-senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              aria-invalid={erro ? 'true' : 'false'}
              aria-describedby={erro ? 'login-erro' : undefined}
              className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl px-3.5 py-3 text-sm text-[#111318]"
            />
          </div>

          {erro && (
            <p id="login-erro" role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full min-h-[48px] rounded-xl bg-[#111318] hover:bg-stone-800 disabled:opacity-60 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition"
          >
            <LogIn className="w-4 h-4 text-[#E2A83B]" aria-hidden="true" />
            <span>{enviando ? 'Entrando…' : 'Entrar'}</span>
          </button>
        </form>

        {apiFora && (
          <div className="pt-4 border-t border-stone-100 space-y-2 text-xs">
            <p className="text-stone-500">
              A API não está respondendo. Você pode ver uma demonstração com dados fictícios; nada é enviado.
            </p>
            <button
              type="button"
              onClick={onDemo}
              className="w-full min-h-[44px] rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-[#111318] font-bold"
            >
              Ver demonstração offline
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
