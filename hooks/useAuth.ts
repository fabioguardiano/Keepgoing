import { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

const mapSession = (session: any): User => {
  const meta = session.user.user_metadata;
  return {
    id: session.user.id,
    email: session.user.email,
    name: meta.full_name || meta.name || session.user.email?.split('@')[0],
    role: meta.role || 'viewer',
    company_id: meta.company_id || '00000000-0000-0000-0000-000000000000',
    status: 'ativo',
    createdAt: session.user.created_at,
  } as User;
};

const writeAuthLog = async (user: User, action: 'login' | 'logout') => {
  try {
    await supabase.from('activity_logs').insert({
      company_id: user.company_id || '00000000-0000-0000-0000-000000000000',
      type: action,
      message: action === 'login' ? `Usuário fez login` : `Usuário encerrou a sessão`,
      reference_id: user.id,
      user_name: user.name,
      module: 'auth',
      entity_type: 'session',
    });
  } catch {
    // silencioso — não bloqueia o fluxo de autenticação
  }
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const u = mapSession(session);
        setUser(u);
        localStorage.setItem('marmo_user', JSON.stringify(u));
      } else {
        const saved = localStorage.getItem('marmo_user');
        if (saved) {
          try {
            const u = JSON.parse(saved);
            if (u && !u.company_id) {
              u.company_id = '00000000-0000-0000-0000-000000000000';
              localStorage.setItem('marmo_user', JSON.stringify(u));
            }
            setUser(u);
          } catch {
            // usuário salvo corrompido — ignora
          }
        }
      }
      setAuthReady(true);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const u = mapSession(session);
        setUser(prev => {
          if (prev?.id === u.id && prev?.company_id === u.company_id) return prev;
          // Novo login detectado
          writeAuthLog(u, 'login');
          return u;
        });
        localStorage.setItem('marmo_user', JSON.stringify(u));
      } else {
        setUser(prev => {
          if (prev) writeAuthLog(prev, 'logout');
          return null;
        });
        localStorage.removeItem('marmo_user');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('marmo_user', JSON.stringify(u));
  };

  const handleLogout = async () => {
    const currentUser = user;
    await supabase.auth.signOut();
    if (currentUser) await writeAuthLog(currentUser, 'logout');
    setUser(null);
    localStorage.removeItem('marmo_user');
  };

  return { user, setUser, authReady, handleLogin, handleLogout };
};
