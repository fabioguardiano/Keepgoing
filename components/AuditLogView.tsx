import React, { useState, useMemo } from 'react';
import { Shield, Search, Download, RefreshCw, LogIn, LogOut, Plus, Edit2, Trash2, MoveRight, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { ActivityLog } from '../types';

interface AuditLogViewProps {
  activities: ActivityLog[];
  loadingActivities: boolean;
  refreshActivities: () => void;
}

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<ActivityLog['action'], string> = {
  create: 'Criação',
  update: 'Edição',
  delete: 'Exclusão',
  move: 'Movimentação',
  upload: 'Upload',
  login: 'Login',
  logout: 'Logout',
};

const ACTION_COLORS: Record<ActivityLog['action'], string> = {
  create: 'bg-emerald-100 text-emerald-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  move: 'bg-amber-100 text-amber-700',
  upload: 'bg-purple-100 text-purple-700',
  login: 'bg-slate-100 text-slate-600',
  logout: 'bg-slate-100 text-slate-500',
};

const ACTION_ICONS: Record<ActivityLog['action'], React.ReactNode> = {
  create: <Plus size={11} />,
  update: <Edit2 size={11} />,
  delete: <Trash2 size={11} />,
  move: <MoveRight size={11} />,
  upload: <Upload size={11} />,
  login: <LogIn size={11} />,
  logout: <LogOut size={11} />,
};

const MODULE_LABELS: Record<string, string> = {
  auth: 'Autenticação',
  financeiro: 'Financeiro',
  vendas: 'Vendas',
  producao: 'Produção',
  clientes: 'Clientes',
  estoque: 'Estoque',
  equipe: 'Equipe',
  cadastros: 'Cadastros',
  agenda_entregas: 'Ag. Entregas',
  agenda_medicao: 'Ag. Medição',
};

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
};

const exportCSV = (logs: ActivityLog[]) => {
  const header = ['Data/Hora', 'Usuário', 'Ação', 'Módulo', 'Detalhes', 'Referência'];
  const rows = logs.map(l => [
    formatDate(l.timestamp),
    l.userName,
    ACTION_LABELS[l.action] ?? l.action,
    l.module ? (MODULE_LABELS[l.module] ?? l.module) : '',
    `"${l.details.replace(/"/g, '""')}"`,
    l.orderId ?? '',
  ]);
  const csv = [header, ...rows].map(r => r.join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const AuditLogView: React.FC<AuditLogViewProps> = ({ activities, loadingActivities, refreshActivities }) => {
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<ActivityLog['action'] | ''>('');
  const [filterModule, setFilterModule] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [page, setPage] = useState(1);

  const uniqueUsers = useMemo(() => {
    const s = new Set(activities.map(a => a.userName));
    return Array.from(s).sort();
  }, [activities]);

  const uniqueModules = useMemo(() => {
    const s = new Set(activities.map(a => a.module).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [activities]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return activities.filter(a => {
      if (filterAction && a.action !== filterAction) return false;
      if (filterModule && a.module !== filterModule) return false;
      if (filterUser && a.userName !== filterUser) return false;
      if (filterDateFrom && a.timestamp < filterDateFrom) return false;
      if (filterDateTo && a.timestamp > filterDateTo + 'T23:59:59') return false;
      if (q && !a.details.toLowerCase().includes(q) && !a.userName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activities, search, filterAction, filterModule, filterUser, filterDateFrom, filterDateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setSearch(''); setFilterAction(''); setFilterModule('');
    setFilterUser(''); setFilterDateFrom(''); setFilterDateTo('');
    setPage(1);
  };

  const hasFilters = search || filterAction || filterModule || filterUser || filterDateFrom || filterDateTo;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
              <Shield size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Log de Auditoria</h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {filtered.length} registro{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                {activities.length > 0 && ` de ${activities.length} total`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { refreshActivities(); setPage(1); }}
              disabled={loadingActivities}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-40"
              title="Atualizar"
            >
              <RefreshCw size={15} className={loadingActivities ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => exportCSV(filtered)}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-40"
            >
              <Download size={13} /> Exportar CSV
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por usuário ou detalhe..."
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          <select
            value={filterAction}
            onChange={e => { setFilterAction(e.target.value as any); setPage(1); }}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          >
            <option value="">Todas as ações</option>
            {(Object.entries(ACTION_LABELS) as [ActivityLog['action'], string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          <select
            value={filterModule}
            onChange={e => { setFilterModule(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          >
            <option value="">Todos os módulos</option>
            {uniqueModules.map(m => (
              <option key={m} value={m}>{MODULE_LABELS[m] ?? m}</option>
            ))}
          </select>

          <select
            value={filterUser}
            onChange={e => { setFilterUser(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          >
            <option value="">Todos os usuários</option>
            {uniqueUsers.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>

          <input
            type="date"
            value={filterDateFrom}
            onChange={e => { setFilterDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            title="Data inicial"
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={e => { setFilterDateTo(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            title="Data final"
          />

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* Tabela */}
        {loadingActivities ? (
          <div className="py-16 text-center">
            <RefreshCw size={24} className="animate-spin text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400 font-medium">Carregando registros...</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center">
            <Shield size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400 font-medium">Nenhum registro encontrado</p>
            {hasFilters && <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left font-bold text-slate-500 whitespace-nowrap">Data / Hora</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500">Usuário</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500">Ação</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500">Módulo</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-700">{log.userName}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-500'}`}>
                        {ACTION_ICONS[log.action]}
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.module ? (
                        <span className="text-slate-500 font-medium">
                          {MODULE_LABELS[log.module] ?? log.module}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-sm">
                      <span className="line-clamp-2">{log.details}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Página {page} de {totalPages} · {filtered.length} registros
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = page <= 3 ? i + 1 : page + i - 2;
                if (pg < 1 || pg > totalPages) return null;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${pg === page ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
