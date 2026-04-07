import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Image as ImageIcon, Calendar, ChevronLeft, ChevronRight, Clock, Maximize2, Minimize2 } from 'lucide-react';
import { WorkOrder, PhaseConfig, AppUser, SalesOrder } from '../types';
import { WorkOrderModal } from './WorkOrderModal';
import { ActivityBadge } from './ActivityBadge';
import { formatOsLabel } from '../hooks/useWorkOrders';
import { useKanbanInteraction } from '../hooks/useKanbanInteraction';
import { getInitials as globalGetInitials } from '../utils/userUtils';

interface WorkOrderKanbanProps {
  workOrders: WorkOrder[];
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500',
  'bg-teal-500', 'bg-orange-500', 'bg-cyan-500', 'bg-rose-500',
];

const getAvatarColor = (name: string): string =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];



const PRIORITY_CONFIG = {
  alta: { label: 'ALTA', bg: 'bg-red-500', text: 'text-white' },
  media: { label: 'MÉDIA', bg: 'bg-amber-400', text: 'text-white' },
  baixa: { label: 'BAIXA', bg: 'bg-green-500', text: 'text-white' },
};

// ─── Work Order Card ──────────────────────────────────────────────────────────

interface WOCardProps {
  workOrder: WorkOrder;
  allWorkOrders: WorkOrder[];
  index: number;
  deadlineWarningDays: number;
  deadlineUrgentDays: number;
  onClick: (wo: WorkOrder) => void;
  dragDisabled: boolean;
  appUsers: AppUser[];
}

const WOCard: React.FC<WOCardProps> = ({ workOrder, allWorkOrders, index, deadlineWarningDays, deadlineUrgentDays, onClick, dragDisabled, appUsers }) => {
  const priority = workOrder.priority || 'media';
  const priorityCfg = PRIORITY_CONFIG[priority];
  const drawings = workOrder.drawingUrls?.length ? workOrder.drawingUrls : (workOrder.drawingUrl ? [workOrder.drawingUrl] : []);
  const [imgIndex, setImgIndex] = useState(0);

  const sellerUser = React.useMemo(() => {
    return appUsers.find(u => u.name === workOrder.sellerName || u.email === workOrder.sellerName);
  }, [appUsers, workOrder.sellerName]);

  /** Dias desde que a O.S. entrou na fase atual de produção */
  const daysInPhase = React.useMemo(() => {
    const phase = workOrder.productionPhase;
    const logs = workOrder.logs ?? [];
    const phaseEntry = logs
      .filter(l => l.action === 'phase_changed' && l.toPhase === phase)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    const ref = phaseEntry ? new Date(phaseEntry.createdAt) : new Date(workOrder.createdAt);
    return Math.floor((Date.now() - ref.getTime()) / 86_400_000);
  }, [workOrder.logs, workOrder.productionPhase, workOrder.createdAt]);

  const handleNav = (e: React.MouseEvent, dir: 1 | -1) => {
    e.stopPropagation();
    setImgIndex(i => (i + dir + drawings.length) % drawings.length);
  };

  return (
    <Draggable draggableId={workOrder.id} index={index} isDragDisabled={dragDisabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(workOrder)}
          className={`bg-white rounded-2xl p-3 shadow-sm cursor-pointer select-none transition-all
            ${snapshot.isDragging ? 'shadow-xl rotate-1 scale-[1.02]' : 'hover:shadow-md'}`}
        >
          {/* Priority badge + activity signal */}
          <div className="flex items-center justify-between mb-1.5">
            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider ${priorityCfg.bg} ${priorityCfg.text}`}>
              {priorityCfg.label}
            </span>
            <div onClick={e => e.stopPropagation()}>
              <ActivityBadge
                referenceId={workOrder.id}
                referenceType="work_order"
                daysInStage={daysInPhase}
              />
            </div>
          </div>

          {/* Client & OS */}
          <p className="font-black text-gray-900 text-xs leading-snug truncate">
            {workOrder.clientName || 'Cliente'}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">
            {formatOsLabel(workOrder, allWorkOrders)}
            {workOrder.environments.length > 0 && ` · ${workOrder.environments.join(', ')}`}
          </p>
          {workOrder.sellerName && (
            <div className="flex items-center gap-2 mt-1.5 p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800/50 group/seller transition-all hover:border-[var(--primary-color)]/30">
              <div className={`w-5 h-5 rounded-md flex items-center justify-center text-white text-[8px] font-black shrink-0 shadow-sm overflow-hidden ${getAvatarColor(workOrder.sellerName)}`}>
                {sellerUser?.avatarUrl ? (
                  <img src={sellerUser.avatarUrl} alt={workOrder.sellerName} className="w-full h-full object-cover" />
                ) : (
                  globalGetInitials(workOrder.sellerName)
                )}
              </div>
              <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight truncate group-hover/seller:text-[var(--primary-color)] transition-colors">
                {workOrder.sellerName}
              </span>
            </div>
          )}

          {/* Prazo de entrega */}
          {workOrder.deliveryDate && (() => {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const due = new Date(workOrder.deliveryDate + 'T12:00:00');
            const remaining = Math.round((due.getTime() - today.getTime()) / 86400000);
            const isLate = remaining < 0;
            const isUrgent = remaining >= 0 && remaining <= deadlineUrgentDays;
            const isWarning = remaining > deadlineUrgentDays && remaining <= deadlineWarningDays;
            return (
              <div className={`flex items-center justify-between mt-1.5 px-2 py-0.5 rounded-lg text-[9px] font-semibold
                ${isLate || isUrgent ? 'bg-slate-100 text-black border border-black/10' : isWarning ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'}`}>
                <div className="flex items-center gap-1">
                  <Clock size={9} />
                  <span>{workOrder.deliveryDeadline} dias úteis</span>
                </div>
                <span className={`font-black ${isLate || isUrgent ? 'text-black' : isWarning ? 'text-amber-600' : 'text-gray-600'}`}>
                  {isLate ? `${Math.abs(remaining)}d atrasado` : remaining === 0 ? 'Vence hoje' : `${remaining}d restantes`}
                </span>
              </div>
            );
          })()}

          {/* Drawing thumbnail — stack effect when multiple */}
          <div className="mt-2 relative h-28 group/thumb">
            {drawings.length === 0 ? (
              <div className="absolute inset-0 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1 text-gray-300">
                <ImageIcon size={22} />
                <span className="text-[10px]">Sem imagem</span>
              </div>
            ) : (
              <>
                {/* Background stacked cards (up to 2 behind) */}
                {drawings.length >= 3 && (
                  <div
                    className="absolute inset-x-2 inset-y-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                    style={{ transform: 'rotate(-4deg)', zIndex: 1 }}
                  >
                    <img
                      src={drawings[(imgIndex + 2) % drawings.length]}
                      alt=""
                      className="w-full h-full object-contain p-1.5 opacity-70"
                    />
                  </div>
                )}
                {drawings.length >= 2 && (
                  <div
                    className="absolute inset-x-1 inset-y-1 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                    style={{ transform: 'rotate(3deg)', zIndex: 2 }}
                  >
                    <img
                      src={drawings[(imgIndex + 1) % drawings.length]}
                      alt=""
                      className="w-full h-full object-contain p-1.5 opacity-80"
                    />
                  </div>
                )}

                {/* Top card — current drawing */}
                <div
                  className="absolute inset-0 rounded-xl border border-gray-200 bg-white shadow-md overflow-hidden"
                  style={{ zIndex: 3 }}
                >
                  <img
                    src={drawings[imgIndex]}
                    alt={`Desenho ${imgIndex + 1}`}
                    className="w-full h-full object-contain p-2"
                  />

                  {/* Navigation arrows — hover only */}
                  {drawings.length > 1 && (
                    <>
                      <button
                        onClick={e => handleNav(e, -1)}
                        className="absolute left-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-black/35 text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity hover:bg-black/60"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        onClick={e => handleNav(e, 1)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-black/35 text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity hover:bg-black/60"
                      >
                        <ChevronRight size={14} />
                      </button>
                      {/* Count badge */}
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-black/40 text-white text-[10px] font-bold leading-none">
                        {imgIndex + 1}/{drawings.length}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer: date + avatars */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Calendar size={10} />
              <span>{formatDate(workOrder.createdAt)}</span>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              {(workOrder.assignedUsers || []).length > 0 && (
                <div className="flex items-center">
                  {(workOrder.assignedUsers || []).slice(0, 4).map((u, i) => (
                    <div
                      key={u.name}
                      title={u.name}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold border-2 border-white ${getAvatarColor(u.name)} ${i > 0 ? '-ml-1.5' : ''}`}
                    >
                      {globalGetInitials(u.name)}
                    </div>
                  ))}
                  {(workOrder.assignedUsers || []).length > 4 && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center bg-gray-200 text-gray-600 text-[9px] font-bold border-2 border-white -ml-1.5">
                      +{(workOrder.assignedUsers || []).length - 4}
                    </div>
                  )}
                </div>
              )}
              
              {workOrder.deliveryDate && (() => {
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const due = new Date(workOrder.deliveryDate + 'T12:00:00');
                const remaining = Math.round((due.getTime() - today.getTime()) / 86400000);
                const isLate = remaining < 0;
                const isUrgent = remaining >= 0 && remaining <= deadlineUrgentDays;
                const isWarning = remaining > deadlineUrgentDays && remaining <= deadlineWarningDays;
                return (
                  <div className={`flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter
                    ${isLate || isUrgent ? 'text-rose-600 bg-rose-50' : isWarning ? 'text-amber-600 bg-amber-50' : 'text-gray-500 bg-gray-50'}`}>
                    <Clock size={10} className="shrink-0" />
                    <span>Entrega: {formatDate(workOrder.deliveryDate + 'T12:00:00')}</span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  phase: PhaseConfig;
  workOrders: WorkOrder[];
  allWorkOrders: WorkOrder[];
  deadlineWarningDays: number;
  deadlineUrgentDays: number;
  onCardClick: (wo: WorkOrder) => void;
  dragDisabled: boolean;
  appUsers: AppUser[];
  sales?: SalesOrder[];
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ phase, workOrders, allWorkOrders, deadlineWarningDays, deadlineUrgentDays, onCardClick, dragDisabled, appUsers, sales }) => {
  const salesMap = React.useMemo(() => {
    const m: Record<string, SalesOrder> = {};
    (sales || []).forEach(s => { m[s.id] = s; });
    return m;
  }, [sales]);

  const totalM2 = workOrders.reduce((acc, wo) => acc + (wo.totalM2 || 0), 0);
  const totalLinear = workOrders.reduce((acc, wo) => {
    // 1. Campo consolidado já salvo na O.S. (novas O.S.)
    if ((wo.totalLinear || 0) > 0) return acc + wo.totalLinear;

    // 2. Array de resumos salvo na O.S.
    const summaryLinear = (wo.finishingsLinear || []).reduce((a, f) => a + (f.totalLinear || 0), 0);
    if (summaryLinear > 0) return acc + summaryLinear;

    // 3. Itens salvos na O.S. (mesma lógica do calcMetrics)
    const fromSavedItems = (wo.items || [])
      .filter(i => i.category === 'Acabamentos' && (i.length || 0) > 0)
      .reduce((a, i) => a + (i.quantity * (i.length || 0)), 0);
    if (fromSavedItems > 0) return acc + fromSavedItems;

    // 4. Busca direto na venda (O.S. antigas — mesma lógica do calcMetrics)
    const sale = salesMap[wo.saleId];
    if (sale) {
      const relevantIds = new Set((wo.saleItemIds || []) as string[]);
      const fromSale = ((sale.items || []) as any[]).reduce((a: number, i: any) => {
        if (relevantIds.size > 0 && !relevantIds.has(i.id)) return a;
        if (String(i.category) === 'Acabamentos' && (Number(i.length) || 0) > 0) {
          return a + Number(i.quantity) * Number(i.length);
        }
        return a;
      }, 0);
      if (fromSale > 0) return acc + fromSale;
    }

    return acc;
  }, 0);


  return (
  <div 
    className="flex-shrink-0 flex flex-col"
    style={{ width: `calc(18rem * var(--kanban-zoom, 1))` }}
  >
    {/* Column header */}
    <div className="mb-3 px-1 space-y-1">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-500 truncate">
          {phase.name}
        </h3>
        <span className="ml-2 flex-shrink-0 px-3 py-1.5 rounded-lg bg-slate-200 text-slate-600 text-[12px] font-black min-w-[32px] text-center">
          {workOrders.length}
        </span>
      </div>
      {workOrders.length > 0 && (
        <div className="flex items-center gap-2">
          {totalM2 > 0 && (
            <span className="text-[12px] font-black text-slate-400">
              {totalM2.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²
            </span>
          )}
          {totalM2 > 0 && totalLinear > 0 && (
            <span className="text-[12px] text-slate-300">·</span>
          )}
          {totalLinear > 0 && (
            <span className="text-[12px] font-black text-slate-400">
              {totalLinear.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m lin.
            </span>
          )}
        </div>
      )}
    </div>

    {/* Droppable area */}
    <Droppable droppableId={phase.name}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`flex-1 min-h-[120px] rounded-2xl p-2 transition-colors space-y-3
            ${snapshot.isDraggingOver ? 'bg-[var(--primary-color)]/10' : 'bg-gray-100/60'}`}
        >
          {workOrders.map((wo, index) => (
            <WOCard key={wo.id} workOrder={wo} allWorkOrders={allWorkOrders} index={index} deadlineWarningDays={deadlineWarningDays} deadlineUrgentDays={deadlineUrgentDays} onClick={onCardClick} dragDisabled={dragDisabled} appUsers={appUsers} />
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const WorkOrderKanban: React.FC<WorkOrderKanbanProps> = ({
  workOrders,
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
}) => {
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { zoomLevel, resetZoom, containerRef, zoomStyle, scrollProps } = useKanbanInteraction(1.0);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Sync selectedWorkOrder whenever workOrders updates (add/delete drawing, phase change, etc.)
  useEffect(() => {
    if (!selectedWorkOrder) return;
    const updated = workOrders.find(w => w.id === selectedWorkOrder.id);
    if (updated) setSelectedWorkOrder(updated);
  }, [workOrders]);

  const firstPhaseName = phases[0]?.name || '';

  // Group work orders by phase — exclui canceladas do kanban
  const activeWorkOrders = workOrders.filter(wo => wo.status !== 'Cancelada');
  const columnMap: Record<string, WorkOrder[]> = {};
  phases.forEach(ph => { columnMap[ph.name] = []; });

  activeWorkOrders.forEach(wo => {
    const phase = wo.productionPhase || firstPhaseName;
    if (columnMap[phase] !== undefined) {
      columnMap[phase].push(wo);
    } else if (firstPhaseName) {
      columnMap[firstPhaseName] = columnMap[firstPhaseName] || [];
      columnMap[firstPhaseName].push(wo);
    }
  });

  const handleDragEnd = (result: DropResult) => {
    if (!canMoveCards) return;
    if (!result.destination) return;
    const toPhase = result.destination.droppableId;
    const fromPhase = result.source.droppableId;
    if (toPhase === fromPhase) return;
    onUpdatePhase(result.draggableId, toPhase, fromPhase, currentUserName);
  };

  // When modal updates the selected work order, keep in sync
  const handleUpdate = (id: string, updates: any) => {
    onUpdate(id, updates);
    if (selectedWorkOrder?.id === id) {
      setSelectedWorkOrder(prev => prev ? { ...prev, ...updates } : prev);
    }
  };

  const handleUpdatePhase = (id: string, toPhase: string, fromPhase: string, userName: string) => {
    onUpdatePhase(id, toPhase, fromPhase, userName);
    if (selectedWorkOrder?.id === id) {
      setSelectedWorkOrder(prev => prev ? { ...prev, productionPhase: toPhase } : prev);
    }
  };

  if (phases.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p className="text-sm">Nenhuma fase de produção configurada.</p>
      </div>
    );
  }

  const kanbanBoard = (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div 
        ref={containerRef}
        {...scrollProps}
        className={`h-full overflow-x-auto overflow-y-hidden relative group/kanban kanban-background custom-scrollbar ${isFullscreen ? 'px-6' : ''}`}
        style={{ scrollbarWidth: 'auto', scrollbarColor: 'var(--primary-color) #f1f5f9' }}
      >
        {/* Zoom Indicator */}
        {zoomLevel !== 1 && (
          <div className="absolute bottom-4 right-4 z-[70] bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-300">
            <span className="text-[10px] font-black text-[var(--primary-color)] uppercase tracking-widest">
              Zoom: {Math.round(zoomLevel * 100)}%
            </span>
            <button 
              onClick={resetZoom}
              className="text-[9px] font-bold text-gray-400 hover:text-gray-600"
            >
              Resetar
            </button>
          </div>
        )}
        
        <div 
          className="flex pb-4 transition-all duration-300 pointer-events-none"
          style={{ 
            ...zoomStyle, 
            width: 'max-content',
            gap: `calc(1rem * var(--kanban-zoom, 1))`
          }}
        >
          <div 
            className="flex pointer-events-auto min-h-full"
            style={{ gap: `calc(1rem * var(--kanban-zoom, 1))` }}
          >
          {phases.map(phase => (
            <KanbanColumn
              key={phase.name}
              phase={phase}
              workOrders={columnMap[phase.name] || []}
              allWorkOrders={workOrders}
              deadlineWarningDays={deadlineWarningDays}
              deadlineUrgentDays={deadlineUrgentDays}
              onCardClick={setSelectedWorkOrder}
              dragDisabled={!canMoveCards}
              appUsers={appUsers}
              sales={sales}
            />
          ))}
          </div>
        </div>
      </div>
    </DragDropContext>
  );

  return (
    <>
      <div className={`flex flex-col h-full bg-transparent relative ${isFullscreen ? 'fixed inset-0 z-[9999] bg-gray-50' : ''}`}>
        {/* Botão de Controle - Sticky para ficar sempre visível ao rolar horizontalmente */}
        <div className={`z-20 flex items-center justify-between p-4 sticky left-0 w-full ${isFullscreen ? 'border-b border-gray-200 bg-white mb-4' : 'pointer-events-none'}`}>
          
          <div className="flex items-center gap-3 pointer-events-auto">
            {isFullscreen && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--primary-color)]/10 rounded-xl">
                  <Maximize2 size={18} className="text-[var(--primary-color)]" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-800 uppercase tracking-tight">Quadro de Produção — Live</h2>
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Monitoramento Ativo</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {isFullscreen && (
            <button
              onClick={() => setIsFullscreen(false)}
              className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-all font-bold text-xs uppercase tracking-wider"
            >
              <Minimize2 size={16} />
              Sair (ESC)
            </button>
          )}
        </div>

        <div className={`flex-1 ${isFullscreen ? 'px-6' : ''}`}>
          {kanbanBoard}
        </div>
      </div>

      {selectedWorkOrder && (
        <WorkOrderModal
          workOrder={selectedWorkOrder}
          allWorkOrders={workOrders}
          phases={phases}
          appUsers={appUsers}
          currentUserName={currentUserName}
          onUpdatePhase={handleUpdatePhase}
          onUpdate={handleUpdate}
          onUpdateDeliveryDate={onUpdateDeliveryDate}
          onCancelWorkOrder={onCancelWorkOrder}
          canCancelOS={canCancelOS}
          canEditDeadline={canEditDeadline}
          onAddDrawing={onAddDrawing}
          onDeleteDrawing={onDeleteDrawing}
          onClose={() => setSelectedWorkOrder(null)}
        />
      )}
    </>
  );
};
