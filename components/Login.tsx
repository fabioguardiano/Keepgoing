import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, Headset, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (data?.user) {
        const userMetadata = data.user.user_metadata;
        const mappedUser = {
          id: data.user.id,
          email: data.user.email,
          name: userMetadata.full_name || userMetadata.name || email.split('@')[0],
          role: userMetadata.role || 'viewer',
          company_id: userMetadata.company_id || '00000000-0000-0000-0000-000000000000',
          status: 'ativo',
          createdAt: data.user.created_at
        };
        
        onLogin(mappedUser);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Erro ao realizar login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-['Poppins']">
      
      {/* Left Side: Logo (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#345c70] items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/20 blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-white/20 blur-3xl"></div>
        </div>
        
        <div className="relative z-10 flex flex-col items-center">
          <img
            src="/Logotipo Keepgoing Alta.png"
            alt="KeepGoing"
            className="w-64 h-auto"
          />
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-4xl font-bold text-[#345c70] mb-2">Bem Vindo</h1>
            <p className="text-slate-500">Por favor, insira seus dados para entrar</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2">
              <span className="font-bold whitespace-nowrap">Error:</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-[#004D4D] transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#004D4D]/20 focus:border-[#004D4D] outline-none transition-all placeholder:text-slate-400"
                  placeholder="name@company.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <button type="button" className="text-xs font-bold text-[#004D4D] hover:underline">Forgot Password?</button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-[#004D4D] transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#004D4D]/20 focus:border-[#004D4D] outline-none transition-all placeholder:text-slate-400"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#004D4D] transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={`w-full bg-[#345c70] hover:bg-[#2a4a5a] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#345c70]/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>Loading... <Loader2 className="w-5 h-5 animate-spin" /></>
              ) : (
                <>Login <LogIn className="w-5 h-5" /></>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-4">
             <p className="text-sm text-slate-500">
              Don't have an account?
              <a href="#" className="text-[#004D4D] font-bold hover:underline ml-1">Get Started</a>
            </p>
            <a href="#" className="text-xs text-slate-400 hover:text-[#004D4D] transition-colors flex items-center gap-2">
              <Headset className="w-4 h-4" />
              Technical Support
            </a>
          </div>

        </div>
      </div>
    </div>
  );
};
