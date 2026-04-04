import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, LogOut, User as UserIcon, History, ShieldAlert, CheckCircle, XCircle, Clock } from 'lucide-react';
import { User, DiscountAuthorization } from '../types';
import { getInitials } from '../utils/userUtils';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onSearch: (query: string) => void;
  onToggleActivity: () => void;
  authorizations?: DiscountAuthorization[];
  onApproveDiscount?: (id: string, message?: string) => void;
  onRejectDiscount?: (id: string, message?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onSearch, onToggleActivity, authorizations = [], onApproveDiscount, onRejectDiscount }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [approveMsg, setApproveMsg] = useState<Record<string, string>>({});
  const notifRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isAdmin = user.role === 'admin' || user.role === 'manager';

  // Admin vê pendentes dirigidas a ele; vendedor vê as suas resolvidas
  const myNotifications = isAdmin
    ? authorizations.filter(a => a.adminId === user.id && a.status === 'pending')
    : authorizations.filter(a => a.sellerId === user.id && a.status !== 'pending');

  const badgeCount = myNotifications.length;

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
        <div className="relative" ref={notifRef}>
          <button
            className="relative text-slate-500 hover:text-[var(--primary-color)] transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="w-6 h-6" />
            {badgeCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-black rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center px-0.5">
                {badgeCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 font-black text-sm dark:text-slate-200 flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-500" />
                {isAdmin ? 'Solicitações de Desconto' : 'Autorizações de Desconto'}
                {badgeCount > 0 && <span className="ml-auto bg-red-100 text-red-600 text-xs font-black px-2 py-0.5 rounded-full">{badgeCount}</span>}
              </div>

              {myNotifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-slate-400">Nenhuma notificação</div>
              ) : (
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
                  {myNotifications.map(auth => (
                    <div key={auth.id} className="p-4 space-y-2">
                      {/* Header da notificação */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {isAdmin ? (
                            <>
                              <p className="text-sm font-bold text-slate-800">{auth.sellerName}</p>
                              <p className="text-xs text-slate-500">Pedido #{auth.saleOrderNumber} · {auth.clientName || '—'}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-bold text-slate-800">
                                {auth.status === 'approved'
                                  ? '✅ Desconto aprovado'
                                  : '❌ Desconto rejeitado'}
                              </p>
                              <p className="text-xs text-slate-500">Pedido #{auth.saleOrderNumber} · {auth.requestedDiscountPct.toFixed(1)}%</p>
                            </>
                          )}
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                          auth.status === 'pending' ? 'bg-amber-100 text-amber-700'
                          : auth.status === 'approved' ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                        }`}>
                          {auth.status === 'pending' ? 'Pendente' : auth.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                        </span>
                      </div>

                      {/* Detalhes */}
                      <div className="flex gap-2 text-xs text-slate-500">
                        <span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-lg">
                          Solicitado: {auth.requestedDiscountPct.toFixed(1)}%
                        </span>
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                          Limite: {auth.maxDiscountPct.toFixed(1)}%
                        </span>
                      </div>

                      {/* Mensagem do admin (para o vendedor) */}
                      {!isAdmin && auth.adminMessage && (
                        <p className="text-xs text-slate-500 italic bg-slate-50 rounded-lg px-3 py-2">"{auth.adminMessage}"</p>
                      )}

                      {/* Ações do admin */}
                      {isAdmin && auth.status === 'pending' && onApproveDiscount && onRejectDiscount && (
                        <div className="space-y-2 pt-1">
                          <textarea
                            rows={1}
                            placeholder="Mensagem opcional..."
                            value={approveMsg[auth.id] || ''}
                            onChange={e => setApproveMsg(prev => ({ ...prev, [auth.id]: e.target.value }))}
                            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => { onRejectDiscount(auth.id, approveMsg[auth.id]); setApproveMsg(prev => { const n = { ...prev }; delete n[auth.id]; return n; }); }}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors"
                            >
                              <XCircle size={12} /> Rejeitar
                            </button>
                            <button
                              onClick={() => { onApproveDiscount(auth.id, approveMsg[auth.id]); setApproveMsg(prev => { const n = { ...prev }; delete n[auth.id]; return n; }); }}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition-colors"
                            >
                              <CheckCircle size={12} /> Aprovar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Instrução para vendedor aprovado */}
                      {!isAdmin && auth.status === 'approved' && (
                        <p className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                          <Clock size={10} /> Volte ao pedido e confirme o salvamento manualmente.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
            <div className="w-10 h-10 rounded-full bg-[var(--primary-color)] border-2 border-[var(--primary-color)]/20 overflow-hidden flex items-center justify-center relative shadow-sm">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black text-sm">{getInitials(user.name)}</span>
              )}
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
