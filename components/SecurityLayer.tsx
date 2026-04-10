import React, { useEffect, useState } from 'react';
import { User, AppUser } from '../types';

interface Props {
  user: User | null;
  appUsers: AppUser[];
  children: React.ReactNode;
}

export const SecurityLayer: React.FC<Props> = ({ user, appUsers, children }) => {
  // Encontra os metadados do usuário logado na lista de appUsers do sistema
  const appUser = appUsers.find(u => u.id === user?.id || u.email === user?.email);
  
  // A segurança é ativada se:
  // 1. O campo isSecurityRequired for true no banco
  // 2. OU se for um usuário comum sem flag definida (fallback segurança máxima)
  // Administradores e Gerentes ainda podem ter bypass se desativarem explicitamente no perfil
  const isSecurityActive = appUser?.isSecurityRequired ?? (user?.role !== 'admin' && user?.role !== 'manager');

  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    if (!isSecurityActive) return;

    // 1. Desfoque ao perder o foco (previne Snipping Tool / Ferramenta de Captura)
    const handleBlur = () => setIsBlurred(true);
    const handleFocus = () => setIsBlurred(false);

    // 2. Bloqueio de Menu de Contexto (Botão Direito)
    const handleContextMenu = (e: MouseEvent) => {
        // Permitir se clicar em inputs de texto (opcional, mas pro ERP vamos bloquear geral pra ser mais seguro)
        e.preventDefault();
    };

    // 3. Bloqueio de Cópia
    const handleCopy = (e: ClipboardEvent) => {
        e.preventDefault();
        // Opcional: alert('Cópia de dados não permitida por motivos de segurança.');
    };

    // 4. Bloqueio de Atalhos de Teclado
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Bloqueia Impressão, Salvar, Copiar, Colar, Inspecionar
      if (isCtrl && ['p', 's', 'c', 'v', 'u'].includes(key)) {
        e.preventDefault();
      }

      // Bloqueia F12 e Ctrl+Shift+I (DevTools)
      if (e.key === 'F12' || (isCtrl && e.shiftKey && key === 'i')) {
        e.preventDefault();
      }
    };

    // 5. Bloqueio de Drag & Drop (evita arrastar imagens/textos pra fora)
    const handleDragStart = (e: DragEvent) => {
        e.preventDefault();
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopy);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('dragstart', handleDragStart);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('dragstart', handleDragStart);
    };
  }, [isSecurityActive]);

  return (
    <div className={`relative min-h-screen transition-all duration-300 ${isBlurred && isSecurityActive ? 'blur-xl' : ''}`}>
      {/* Container Principal da App */}
      <div className={isSecurityActive ? 'no-select' : ''}>
        {children}
      </div>

      {/* Camada de Marca d'água Dinâmica */}
      {isSecurityActive && (
        <div 
          className="fixed inset-0 pointer-events-none z-[99999] opacity-[0.035] overflow-hidden select-none"
          aria-hidden="true"
        >
          <div className="absolute inset-[-100%] flex flex-wrap content-start rotate-[-25deg] scale-110">
            {Array.from({ length: 300 }).map((_, i) => (
              <div 
                key={i} 
                className="p-12 text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap text-slate-900"
              >
                PROPRIEDADE RESTRITA - {appUser?.name || user?.name || 'USUÁRIO'} - {new Date().toLocaleDateString('pt-BR')} - {appUser?.id?.slice(0,8)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overlay de Aviso quando desfocado */}
      {isBlurred && isSecurityActive && (
        <div className="fixed inset-0 z-[100000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-200 text-center max-w-sm mx-4 animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Ambiente Seguro</h3>
                <p className="text-sm text-slate-500 font-medium">A visualização foi ocultada por motivos de segurança enquanto você estiver fora da janela do sistema.</p>
                <div className="mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clique na tela para retornar</div>
            </div>
        </div>
      )}
    </div>
  );
};
