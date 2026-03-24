import React, { useState, useMemo } from 'react';
import { ClipboardList, Ruler, Package, Calendar, User, Search, Filter } from 'lucide-react';
import { WorkOrder } from '../types';

interface WorkOrdersViewProps {
  workOrders: WorkOrder[];
  loading: boolean;
  onUpdateStatus: (id: string, status: WorkOrder['status']) => void;
  onOpenSale?: (saleId: string) => void;
}

const STATUS_TABS: Array<{ label: string; value: WorkOrder['status'] | 'Todos' }> = [
  { label: 'Todos', value: 'Todos' },
  { label: 'Aguardando', value: 'Aguardando' },
  { label: 'Em Produção', value: 'Em Produção' },
  { label: 'Concluído', value: 'Concluído' },
  { label: 'Entregue', value: 'Entregue' },
];

const STATUS_COLORS: Record<WorkOrder['status'], string> = {
  'Aguardando': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  'Em Produção': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'Concluído': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'Entregue': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
};

const fmtM2 = (v: number) => v > 0 ? v.toFixed(4).replace('.', ',') + ' m²' : null;
const fmtLin = (v: number) => v > 0 ? v.toFixed(3).replace('.', ',') + ' m' : null;

export const WorkOrdersView: React.FC<WorkOrdersViewProps> = ({
  workOrders,
  loading,
  onUpdateStatus,
  onOpenSale,
}) => {
  const [statusFilter, setStatusFilter] = useState<WorkOrder['status'] | 'Todos'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    return workOrders.filter(wo => {
      const matchStatus = statusFilter === 'Todos' || wo.status === statusFilter;
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        String(wo.osNumber).includes(q) ||
        (wo.clientName || '').toLowerCase().includes(q) ||
        wo.environments.some(e => e.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [workOrders, statusFilter, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--primary-color)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[var(--primary-color)]/10 rounded-2xl">
            <ClipboardList size={22} className="text-[var(--primary-color)]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-white">O.S. de Produção</h1>
            <p className="text-xs text-slate-400 mt-0.5">{workOrders.length} ordens no total</p>
          </div>
        </div>
      </div>

      {/* Search + filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, n° O.S. ou ambiente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30 font-medium"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={14} className="text-slate-400 shrink-0" />
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === tab.value
                  ? 'bg-[var(--primary-color)] text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[var(--primary-color)]/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <ClipboardList size={48} className="mb-3 opacity-20" />
          <p className="font-black text-lg">Nenhuma O.S. encontrada</p>
          <p className="text-sm mt-1">
            {workOrders.length === 0
              ? 'Gere ordens de serviço a partir de um Pedido nas Vendas.'
              : 'Tente ajustar os filtros de busca.'}
          </p>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map(wo => (
          <div
            key={wo.id}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all overflow-hidden"
          >
            {/* Card header */}
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-50 dark:border-slate-700/60">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-black text-[var(--primary-color)] text-base shrink-0">O.S. #{wo.osNumber}</span>
                {wo.saleOrderNumber && (
                  <span className="text-xs text-slate-400 font-medium shrink-0">· Pedido #{wo.saleOrderNumber}</span>
                )}
                <div className="flex items-center gap-1.5 min-w-0">
                  <User size={13} className="text-slate-400 shrink-0" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{wo.clientName || '—'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-3 py-1 rounded-full text-xs font-black ${STATUS_COLORS[wo.status]}`}>
                  {wo.status}
                </span>
                <select
                  value={wo.status}
                  onChange={e => onUpdateStatus(wo.id, e.target.value as WorkOrder['status'])}
                  className="text-xs font-bold px-2 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30 cursor-pointer"
                >
                  <option value="Aguardando">Aguardando</option>
                  <option value="Em Produção">Em Produção</option>
                  <option value="Concluído">Concluído</option>
                  <option value="Entregue">Entregue</option>
                </select>
              </div>
            </div>

            {/* Card body */}
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Environments */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Ambientes</p>
                <div className="flex flex-wrap gap-1.5">
                  {wo.environments.map(env => (
                    <span key={env} className="px-2.5 py-1 bg-[var(--primary-color)]/8 text-[var(--primary-color)] rounded-lg text-xs font-bold border border-[var(--primary-color)]/15">
                      {env}
                    </span>
                  ))}
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-1.5">
                {fmtM2(wo.totalM2) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Ruler size={13} className="text-slate-400 shrink-0" />
                    <span className="text-slate-500 text-xs">Metragem quadrada:</span>
                    <span className="font-black text-slate-800 dark:text-white text-xs">{fmtM2(wo.totalM2)}</span>
                  </div>
                )}
                {fmtLin(wo.totalLinear) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Package size={13} className="text-slate-400 shrink-0" />
                    <span className="text-slate-500 text-xs">Metragem linear:</span>
                    <span className="font-black text-slate-800 dark:text-white text-xs">{fmtLin(wo.totalLinear)}</span>
                  </div>
                )}
                {!fmtM2(wo.totalM2) && !fmtLin(wo.totalLinear) && (
                  <span className="text-xs text-slate-400 italic">Sem metragem calculada</span>
                )}
              </div>

              {/* Date + notes */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-500">Criada em:</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{fmtDate(wo.createdAt)}</span>
                </div>
                {wo.notes && (
                  <p className="text-xs text-slate-500 italic line-clamp-2 mt-1">{wo.notes}</p>
                )}
                {onOpenSale && (
                  <button
                    onClick={() => onOpenSale(wo.saleId)}
                    className="mt-1 text-[10px] font-black text-[var(--primary-color)] hover:underline uppercase tracking-wider"
                  >
                    Ver venda
                  </button>
                )}
              </div>
            </div>

            {/* Materials breakdown (expandable on hover) */}
            {(wo.materialsM2.length > 0 || wo.finishingsLinear.length > 0) && (
              <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {wo.materialsM2.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Ruler size={11} /> Materiais
                    </p>
                    {wo.materialsM2.map(m => (
                      <div key={m.materialName} className="flex justify-between text-xs py-0.5">
                        <span className="text-slate-600 dark:text-slate-300 truncate max-w-[160px] font-medium">{m.materialName}</span>
                        <span className="font-black text-slate-800 dark:text-white ml-2">{m.totalM2.toFixed(4).replace('.', ',')} m²</span>
                      </div>
                    ))}
                  </div>
                )}
                {wo.finishingsLinear.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Package size={11} /> Acabamentos
                    </p>
                    {wo.finishingsLinear.map(f => (
                      <div key={f.itemName} className="flex justify-between text-xs py-0.5">
                        <span className="text-slate-600 dark:text-slate-300 truncate max-w-[160px] font-medium">{f.itemName}</span>
                        <span className="font-black text-slate-800 dark:text-white ml-2">{f.totalLinear.toFixed(3).replace('.', ',')} m</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
