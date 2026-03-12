import React, { useState } from 'react';
import { Search, Bell, LogOut, User as UserIcon, History } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onSearch: (query: string) => void;
  onToggleActivity: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onSearch, onToggleActivity }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0">

      {/* Search area */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-[var(--primary-color)]/50 text-sm transition-all outline-none"
            placeholder="Pesquisar projetos, clientes ou materiais..."
            type="text"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-6">

        {/* Activity Toggle */}
        <button
          className="relative text-slate-500 hover:text-[var(--primary-color)] transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          onClick={onToggleActivity}
          title="Atividade Recente"
        >
          <History className="w-6 h-6" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            className="relative text-slate-500 hover:text-[var(--primary-color)] transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="w-6 h-6" />
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[var(--primary-color)] rounded-full border-2 border-white dark:border-slate-900"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-64 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg shadow-xl z-50 py-2">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 font-bold text-sm dark:text-slate-200">Notificações</div>
              <div className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Nova OS #0004</p>
                <p className="text-xs">Adicionada há 5 min</p>
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>

        {/* User Profile Info */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold leading-none dark:text-white">{user.name}</p>
            <p className="text-xs text-slate-500 capitalize">{user.role === 'admin' ? 'Gerente Produção' : user.role}</p>
          </div>

          <div className="relative group cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-[var(--primary-color)]/20 overflow-hidden flex items-center justify-center relative">
              <UserIcon className="text-slate-500" />
            </div>

            <div className="absolute right-0 top-12 w-48 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-50 py-2">
              <button
                onClick={onLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 font-bold"
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};
