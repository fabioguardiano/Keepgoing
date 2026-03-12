import React, { useState } from 'react';
import { Layers, Mail, Lock, Eye, EyeOff, LogIn, Headset } from 'lucide-react';

interface LoginProps {
  onLogin: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulando login
    onLogin({ id: '1', name: 'Fábio Admin', role: 'admin', company_id: '123' });
  };

  return (
    <div className="font-sans bg-[#f8f6f6] dark:bg-[#221610] text-slate-900 dark:text-slate-100 min-h-screen flex items-center justify-center p-4 relative z-0">

      {/* Decorative Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none opacity-20 dark:opacity-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#ec5b13] rounded-full blur-[120px]"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[#ec5b13] rounded-full blur-[100px]"></div>
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(236, 91, 19, 0.1) 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-[#221610]/50 rounded-xl shadow-xl overflow-hidden border border-[#ec5b13]/10">

        {/* Header / Logo Section */}
        <div className="pt-10 pb-6 px-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-[#ec5b13] rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-[#ec5b13]/20">
            <Layers className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">MarmoFlow</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Industrial Workflow Management</p>
        </div>

        {/* Login Form */}
        <div className="px-8 pb-10">
          <h2 className="text-lg font-semibold mb-6 text-center">Acesse sua conta</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">E-mail</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 text-slate-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#221610] border border-slate-200 dark:border-[#ec5b13]/20 rounded-lg focus:ring-2 focus:ring-[#ec5b13]/50 focus:border-[#ec5b13] outline-none transition-all dark:text-white placeholder:text-slate-400"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
                <a href="#" className="text-xs font-semibold text-[#ec5b13] hover:underline">Esqueceu a senha?</a>
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 text-slate-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 dark:bg-[#221610] border border-slate-200 dark:border-[#ec5b13]/20 rounded-lg focus:ring-2 focus:ring-[#ec5b13]/50 focus:border-[#ec5b13] outline-none transition-all dark:text-white placeholder:text-slate-400"
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

            {/* Remember Me */}
            <div className="flex items-center gap-2 py-1">
              <input type="checkbox" id="remember" className="w-4 h-4 rounded border-slate-300 text-[#ec5b13] focus:ring-[#ec5b13]" />
              <label htmlFor="remember" className="text-sm text-slate-600 dark:text-slate-400">Lembrar de mim</label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-[#ec5b13] hover:bg-[#ec5b13]/90 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-[#ec5b13]/25 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Entrar
              <LogIn className="w-5 h-5" />
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-[#ec5b13]/10 flex flex-col items-center gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ainda não tem uma conta?
              <a href="#" className="text-[#ec5b13] font-semibold hover:underline ml-1">Criar conta</a>
            </p>
            <a href="#" className="text-xs text-slate-400 dark:text-slate-500 hover:text-[#ec5b13] transition-colors flex items-center gap-1">
              <Headset className="w-4 h-4" />
              Suporte técnico
            </a>
          </div>

        </div>
      </div>
    </div>
  );
};
