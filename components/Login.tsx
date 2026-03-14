import React, { useState } from 'react';
import { Layers, Mail, Lock, Eye, EyeOff, LogIn, Headset, AlertCircle, UserPlus, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: (user: any) => void;
}

type Mode = 'login' | 'signup' | 'success';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const timeoutId = setTimeout(() => {
      setLoading(currentLoading => {
        if (currentLoading) {
          setError('O tempo de resposta do servidor excedeu o limite. Tente novamente ou use o Reset de Emergência abaixo.');
          return false;
        }
        return currentLoading;
      });
    }, 12000);

    try {
      if (mode === 'login') {
        console.log('[LoginAudit] Iniciando signInWithPassword para:', email);
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        console.log('[LoginAudit] Resposta do signInWithPassword recebida:', !!data.session ? 'Sucesso' : 'Falha');

        if (authError) {
          clearTimeout(timeoutId);
          console.error('[LoginAudit] Erro retornado pelo Supabase:', authError.message);
          if (authError.message === 'Invalid login credentials') {
            throw new Error('E-mail ou senha incorretos.');
          }
          if (authError.message === 'Email not confirmed') {
            throw new Error('E-mail ainda não confirmado. Verifique sua caixa de entrada.');
          }
          throw authError;
        }
        
        console.log('[LoginAudit] Login concluído. Aguardando App.tsx reagir...');
      } else {
        // Mode Signup (Primeiro Acesso)
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
            }
          }
        });

        if (authError) {
          clearTimeout(timeoutId);
          // Se o trigger do banco lançar ERRO (RAISE EXCEPTION), ele virá como authError.message
          if (authError.message.includes('Acesso negado')) {
            throw new Error('Este e-mail não foi pré-cadastrado por um administrador.');
          }
          throw authError;
        }

        setMode('success');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Erro na autenticação:', err);
      setError(err.message || 'Falha na operação. Tente novamente.');
    } finally {
      // Se já passou pelo sucesso ou erro tratado, o timeout é limpo
      setLoading(false);
    }
  };

  if (mode === 'success') {
    return (
      <div className="font-sans bg-[#f8f6f6] dark:bg-[#221610] text-slate-900 dark:text-slate-100 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#221610]/50 rounded-2xl shadow-xl p-8 border border-green-100 text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="text-green-600 w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Quase lá!</h2>
          <p className="text-slate-600 font-normal">
            Enviamos um e-mail de confirmação para <strong className="text-[#ec5b13]">{email}</strong>. 
            Acesse o link ou insira o código recebido para ativar sua conta e definir sua senha.
          </p>
          <button 
            onClick={() => setMode('login')}
            className="w-full py-3 bg-[#ec5b13] text-white font-bold rounded-xl hover:bg-orange-700 transition-colors"
          >
            Voltar para o Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans bg-[#f8f6f6] dark:bg-[#221610] text-slate-900 dark:text-slate-100 min-h-screen flex items-center justify-center p-4 relative z-0">

      {/* Decorative Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none opacity-20 dark:opacity-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#ec5b13] rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[#ec5b13] rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-[#221610]/50 rounded-2xl shadow-2xl overflow-hidden border border-[#ec5b13]/10">

        {/* Header Section */}
        <div className="pt-10 pb-6 px-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-[#ec5b13] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-[#ec5b13]/20">
            <Layers className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">KeepGoing</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 uppercase font-black tracking-widest">ERP Industrial</p>
        </div>

        {/* Form Container */}
        <div className="px-8 pb-10">
          {/* Toggle Tabs */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-8">
            <button 
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'login' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Entrar
            </button>
            <button 
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'signup' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Ativar Acesso
            </button>
          </div>

          <h2 className="text-lg font-bold mb-6 text-center text-slate-800">
            {mode === 'login' ? 'Bem-vindo de volta' : 'Primeiro acesso ao sistema'}
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-xs font-bold leading-tight">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#ec5b13]/50 focus:border-[#ec5b13] outline-none transition-all placeholder:text-slate-400 text-sm"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase">E-mail Corporativo</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 text-slate-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#ec5b13]/50 focus:border-[#ec5b13] outline-none transition-all placeholder:text-slate-400 text-sm"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500 uppercase">Senha{mode === 'signup' ? ' de Acesso' : ''}</label>
                {mode === 'login' && (
                  <a href="#" className="text-[11px] font-bold text-[#ec5b13] hover:underline uppercase">Esqueci a senha</a>
                )}
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 text-slate-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#ec5b13]/50 focus:border-[#ec5b13] outline-none transition-all placeholder:text-slate-400 text-sm"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-[#ec5b13] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ec5b13] hover:bg-orange-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-[#ec5b13]/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {mode === 'login' ? 'Entrar no Sistema' : 'Ativar Minha Conta'}
                  {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-4 text-center">
            <button 
              onClick={() => {
                if (window.confirm("Isso apagará caches internos que podem estar impedindo o login. Você precisará digitar seu e-mail e senha novamente. Deseja continuar?")) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="text-[10px] text-slate-400 font-bold uppercase hover:text-[#ec5b13] transition-colors flex items-center gap-2"
            >
              <AlertCircle size={12} /> Problemas persistentes? Resetar Navegador
            </button>

            <p className="text-[10px] text-slate-400 font-normal">
              Ao acessar, você concorda com nossos termos de segurança.<br/>
              <span className="flex items-center justify-center gap-1 mt-2">
                <Headset className="w-3 h-3" /> Suporte: suporte@keepgoing.com
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
