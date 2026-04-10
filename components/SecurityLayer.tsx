import React, { useEffect } from 'react';
import { User, AppUser } from '../types';

interface Props {
  user: User | null;
  appUsers: AppUser[];
  children: React.ReactNode;
}

export const SecurityLayer: React.FC<Props> = ({ user, appUsers, children }) => {
  // Encontra os metadados do usuário logado na lista de appUsers do sistema
  const appUser = appUsers.find(u => u.id === user?.id || u.email === user?.email);
  
  // A segurança é ativada APENAS se:
  // 1. O usuário NÃO for Admin ou Gerente (admins têm liberdade total)
  // 2. E se o campo isSecurityRequired estiver ativo ou for usuário comum (fallback true)
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const isSecurityActive = !isAdmin && (appUser?.isSecurityRequired ?? true);

  useEffect(() => {
    if (!isSecurityActive) return;

    // 1. Bloqueio de Menu de Contexto (Botão Direito)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Bloqueio de Cópia
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    // 3. Bloqueio de Atalhos de Teclado (P, S, C, V, U, F12, DevTools)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Bloqueia Impressão, Salvar, Copiar, Colar
      if (isCtrl && ['p', 's', 'c', 'v', 'u'].includes(key)) {
        e.preventDefault();
      }

      // Bloqueia F12 e Ctrl+Shift+I (DevTools)
      if (e.key === 'F12' || (isCtrl && e.shiftKey && key === 'i')) {
        e.preventDefault();
      }
    };

    // 4. Bloqueio de Drag & Drop
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopy);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('dragstart', handleDragStart);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('dragstart', handleDragStart);
    };
  }, [isSecurityActive]);

  return (
    <div className="relative min-h-screen">
      {/* Container Principal da App */}
      <div className={isSecurityActive ? 'no-select' : ''}>
        {children}
      </div>
    </div>
  );
};
