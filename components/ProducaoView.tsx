import React, { useState, useMemo } from 'react';
import { LayoutDashboard, List, Search, Filter, ClipboardList, Ruler, Package, Calendar, User } from 'lucide-react';
import { WorkOrder, PhaseConfig, AppUser, SalesOrder } from '../types';
import { WorkOrderKanban } from './WorkOrderKanban';
import { WorkOrderModal } from './WorkOrderModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProducaoViewProps {
  workOrders: WorkOrder[];
  loading: boolean;
  phases: PhaseConfig[];
  appUsers: AppUser[];
  sales?: SalesOrder[];
  currentUserName: string;
  canCancelOS: boolean;
  canEditDeadline: boolean;
  canMoveCards: boolean;
  deadlineWarningDays: number;
  deadlineUrgentDays: number;
  onUpdatePhase: (id: string, toPhase: string, fromPhase: string, userName: string) => void;
  onUpdate: (id: string, updates: any) => void;
  onUpdateDeliveryDate: (id: string, newDate: string, justification: string, authorizedBy: string) => Promise<void>;
  onCancelWorkOrder: (id: string, reason: string, authorizedBy: string) => Promise<void>;
  onAddDrawing: (id: string, file: File) => Promise<void>;
  onDeleteDrawing: (id: string, url: string) => Promise<void>;
  onOpenSale?: (saleId: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

type StatusFilter = WorkOrder['status'] | 'Todos' | 'Arquivadas';

const STATUS_TABS: Array<{ label: string; value: StatusFilter }> = [
  { label: 'Em andamento', value: 'Todos' },
  { label: 'Aguardando', value: 'Aguardando' },
  { label: 'Em Produção', value: 'Em Produção' },
  { label: 'Concluído', value: 'Concluído' },
  { label: 'Arquivadas', value: 'Arquivadas' },
];

const PHASE_COLORS: Record<string, string> = {
  'Serviço Lançado':    'bg-slate-100 text-slate-600',
  'Medição':            'bg-cyan-100 text-cyan-700',
  'Aprovação':          'bg-amber-100 text-amber-700',
  'Corte':              'bg-orange-100 text-orange-700',
  'Acabamento':         'bg-purple-100 text-purple-700',
  'Conferência':        'bg-indigo-100 text-indigo-700',
  'Serviço Finalizado': 'bg-green-100 text-green-700',
  'A Retirar':          'bg-teal-100 text-teal-700',
  'A Entregar':         'bg-blue-100 text-blue-700',
  'Instalação':         'bg-sky-100 text-sky-700',
  'Pós-Venda':          'bg-pink-100 text-pink-700',
  'Entregue':           'bg-emerald-100 text-emerald-700',
};

const STATUS_COLORS: Record<WorkOrder['status'], string> = {
  'Aguardando': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  'Em Produção': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'Concluído': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'Entregue': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'Cancelada': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const getPhaseColor = (phase?: string) =>
  phase ? (PHASE_COLORS[phase] ?? 'bg-slate-100 text-slate-600') : 'bg-slate-100 text-slate-400';

const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return iso; }
};
const fmtM2  = (v: number) => v > 0 ? v.toFixed(4).replace('.', ',') + ' m²' : null;
const fmtLin = (v: number) => v > 0 ? v.toFixed(3).replace('.', ',') + ' m' : null;

// ─── Main Component ───────────────────────────────────────────────────────────

export const ProducaoView: React.FC<ProducaoViewProps> = ({
  workOrders,
  loading,
  phases,
  appUsers,
  sales,
  currentUserName,
  canCancelOS,
  canEditDeadline,
  canMoveCards,
  deadlineWarningDays,
  deadlineUrgentDays,
  onUpdatePhase,
  onUpdate,
  onUpdateDeliveryDate,
  onCancelWorkOrder,
  onAddDrawing,
  onDeleteDrawing,
  onOpenSale,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>(() =>
    (localStorage.getItem('producao_viewmode') as 'kanban' | 'list') || 'kanban'
  );
  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos');
  const [selectedWO, setSelectedWO]     = useState<WorkOrder | null>(null);

  const handleViewChange = (mode: 'kanban' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('producao_viewmode', mode);
  };

  // Workorders filtered by search (used in both modes) + status (list only)
  const filteredList = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return workOrders.filter(wo => {
      let matchStatus: boolean;
      if (statusFilter === 'Arquivadas') {
        matchStatus = wo.status === 'Entregue' || wo.status === 'Cancelada';
      } else if (statusFilter === 'Todos') {
        // "Em andamento" — exclui arquivadas (mesmo que o Kanban)
        matchStatus = wo.status !== 'Entregue' && wo.status !== 'Cancelada';
      } else {
        matchStatus = wo.status === statusFilter;
      }
      const matchSearch = !q ||
        String(wo.osNumber).includes(q) ||
        (wo.clientName || '').toLowerCase().includes(q) ||
        wo.environments.some(e => e.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [workOrders, statusFilter, searchTerm]);

  // Kanban only needs search filter (status/phase handled internally by columns)
  const filteredKanban = useMemo(() => {
    if (!searchTerm) return workOrders;
    const q = searchTerm.toLowerCase();
    return workOrders.filter(wo =>
      String(wo.osNumber).includes(q) ||
      (wo.clientName || '').toLowerCase().includes(q) ||
      wo.environments.some(e => e.toLowerCase().includes(q))
    );
  }, [workOrders, searchTerm]);

  // Keep selectedWO in sync when workOrders updates
  const syncedSelectedWO = useMemo(() => {
    if (!selectedWO) return null;
    return workOrders.find(w => w.id === selectedWO.id) ?? selectedWO;
  }, [workOrders, selectedWO]);

  // Count archived (Entregue + Cancelada) — hidden from Kanban
  const archivedCount = useMemo(() =>
    workOrders.filter(wo => wo.status === 'Entregue' || wo.status === 'Cancelada').length,
  [workOrders]);

  const goToArchived = () => {
    setStatusFilter('Arquivadas');
    handleViewChange('list');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--primary-color)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${viewMode === 'kanban' ? 'h-full' : ''}`}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-3 flex flex-col gap-3 bg-transparent">

        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[var(--primary-color)]/10 rounded-2xl">
              <ClipboardList size={22} className="text-[var(--primary-color)]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 dark:text-white">Produção</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-slate-400">{workOrders.filter(wo => wo.status !== 'Entregue' && wo.status !== 'Cancelada').length} em andamento</p>
                {archivedCount > 0 && viewMode === 'kanban' && (
                  <button
                    onClick={goToArchived}
                    className="text-[10px] font-black text-slate-400 hover:text-[var(--primary-color)] bg-slate-100 dark:bg-slate-800 hover:bg-[var(--primary-color)]/10 px-2 py-0.5 rounded-full transition-all uppercase tracking-wider"
                  >
                    {archivedCount} arquivadas
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            <button
              onClick={() => handleViewChange('kanban')}
              title="Visualização Kanban"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-700 text-[var(--primary-color)] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <LayoutDashboard size={15} />
              Kanban
            </button>
            <button
              onClick={() => handleViewChange('list')}
              title="Visualização em Lista"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-[var(--primary-color)] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <List size={15} />
              Lista
            </button>
          </div>
        </div>

        {/* Filters row */}
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

          {/* Status tabs — only in list mode */}
          {viewMode === 'list' && (
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
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}

      {viewMode === 'kanban' ? (
        <div className="flex-1 min-h-0">
          <WorkOrderKanban
            workOrders={filteredKanban}
            phases={phases}
            appUsers={appUsers}
            sales={sales}
            currentUserName={currentUserName}
            canCancelOS={canCancelOS}
            canEditDeadline={canEditDeadline}
            canMoveCards={canMoveCards}
            deadlineWarningDays={deadlineWarningDays}
            deadlineUrgentDays={deadlineUrgentDays}
            onUpdatePhase={onUpdatePhase}
            onUpdate={onUpdate}
            onUpdateDeliveryDate={onUpdateDeliveryDate}
            onCancelWorkOrder={onCancelWorkOrder}
            onAddDrawing={onAddDrawing}
            onDeleteDrawing={onDeleteDrawing}
          />
        </div>
      ) : (
        <div className="px-6 pb-6 space-y-3">
          {/* Empty state */}
          {filteredList.length === 0 && (
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

          {filteredList.map(wo => (
            <div
              key={wo.id}
              onClick={() => setSelectedWO(wo)}
              className={`rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer ${
                wo.status === 'Entregue' || wo.status === 'Cancelada'
                  ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 opacity-80 hover:opacity-100 hover:border-slate-300'
                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-[var(--primary-color)]/30'
              }`}
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
                  {wo.status === 'Cancelada' && (
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${STATUS_COLORS['Cancelada']}`}>
                      Cancelada
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-black ${getPhaseColor(wo.productionPhase)}`}>
                    {wo.productionPhase || 'Sem fase'}
                  </span>
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
                    <div className="flex items-center gap-2">
                      <Ruler size={13} className="text-slate-400 shrink-0" />
                      <span className="text-slate-500 text-xs">Metragem quadrada:</span>
                      <span className="font-black text-slate-800 dark:text-white text-xs">{fmtM2(wo.totalM2)}</span>
                    </div>
                  )}
                  {fmtLin(wo.totalLinear) && (
                    <div className="flex items-center gap-2">
                      <Package size={13} className="text-slate-400 shrink-0" />
                      <span className="text-slate-500 text-xs">Metragem linear:</span>
                      <span className="font-black text-slate-800 dark:text-white text-xs">{fmtLin(wo.totalLinear)}</span>
                    </div>
                  )}
                  {!fmtM2(wo.totalM2) && !fmtLin(wo.totalLinear) && (
                    <span className="text-xs text-slate-400 italic">Sem metragem calculada</span>
                  )}
                </div>

                {/* Date + notes + link */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Calendar size={13} className="text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-500">Criada em:</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{fmtDate(wo.createdAt)}</span>
                  </div>
                  {wo.notes && (
                    <p className="text-xs text-slate-500 italic line-clamp-2">{wo.notes}</p>
                  )}
                  {onOpenSale && (
                    <button
                      onClick={e => { e.stopPropagation(); onOpenSale(wo.saleId); }}
                      className="text-[10px] font-black text-[var(--primary-color)] hover:underline uppercase tracking-wider"
                    >
                      Ver venda
                    </button>
                  )}
                </div>
              </div>

              {/* Materials breakdown */}
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
      )}

      {/* ── WorkOrderModal (lista) ───────────────────────────────────────────── */}
      {syncedSelectedWO && (
        <WorkOrderModal
          workOrder={syncedSelectedWO}
          allWorkOrders={workOrders}
          phases={phases}
          appUsers={appUsers}
          currentUserName={currentUserName}
          onUpdatePhase={onUpdatePhase}
          onUpdate={onUpdate}
          onUpdateDeliveryDate={onUpdateDeliveryDate}
          onCancelWorkOrder={onCancelWorkOrder}
          canCancelOS={canCancelOS}
          canEditDeadline={canEditDeadline}
          onAddDrawing={onAddDrawing}
          onDeleteDrawing={onDeleteDrawing}
          onClose={() => setSelectedWO(null)}
        />
      )}
    </div>
  );
};
