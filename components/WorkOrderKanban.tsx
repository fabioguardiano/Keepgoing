import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Image as ImageIcon, Calendar, ChevronLeft, ChevronRight, UserRound } from 'lucide-react';
import { WorkOrder, PhaseConfig, AppUser } from '../types';
import { WorkOrderModal } from './WorkOrderModal';

interface WorkOrderKanbanProps {
  workOrders: WorkOrder[];
  phases: PhaseConfig[];
  appUsers: AppUser[];
  currentUserName: string;
  onUpdatePhase: (id: string, toPhase: string, fromPhase: string, userName: string) => void;
  onUpdate: (id: string, updates: any) => void;
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

const getInitials = (name: string): string =>
  name.trim().slice(0, 2).toUpperCase();

const PRIORITY_CONFIG = {
  alta: { label: 'ALTA', bg: 'bg-red-500', text: 'text-white' },
  media: { label: 'MÉDIA', bg: 'bg-amber-400', text: 'text-white' },
  baixa: { label: 'BAIXA', bg: 'bg-green-500', text: 'text-white' },
};

// ─── Work Order Card ──────────────────────────────────────────────────────────

interface WOCardProps {
  workOrder: WorkOrder;
  index: number;
  onClick: (wo: WorkOrder) => void;
}

const WOCard: React.FC<WOCardProps> = ({ workOrder, index, onClick }) => {
  const priority = workOrder.priority || 'media';
  const priorityCfg = PRIORITY_CONFIG[priority];
  const drawings = workOrder.drawingUrls?.length ? workOrder.drawingUrls : (workOrder.drawingUrl ? [workOrder.drawingUrl] : []);
  const [imgIndex, setImgIndex] = useState(0);

  const handleNav = (e: React.MouseEvent, dir: 1 | -1) => {
    e.stopPropagation();
    setImgIndex(i => (i + dir + drawings.length) % drawings.length);
  };

  return (
    <Draggable draggableId={workOrder.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(workOrder)}
          className={`bg-white rounded-2xl p-4 shadow-sm cursor-pointer select-none transition-all
            ${snapshot.isDragging ? 'shadow-xl rotate-1 scale-[1.02]' : 'hover:shadow-md'}`}
        >
          {/* Priority badge */}
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider mb-2 ${priorityCfg.bg} ${priorityCfg.text}`}>
            {priorityCfg.label}
          </span>

          {/* Client & OS */}
          <p className="font-black text-gray-900 text-sm leading-snug truncate">
            {workOrder.clientName || 'Cliente'}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5 truncate">
            OS #{String(workOrder.osNumber).padStart(4, '0')}
            {workOrder.environments.length > 0 && ` · ${workOrder.environments.join(', ')}`}
          </p>
          {workOrder.sellerName && (
            <div className="flex items-center gap-1 mt-1">
              <UserRound size={10} className="text-gray-300 flex-shrink-0" />
              <span className="text-[10px] text-gray-400 truncate">{workOrder.sellerName}</span>
            </div>
          )}

          {/* Drawing thumbnail — stack effect when multiple */}
          <div className="mt-3 relative h-36 group/thumb">
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
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Calendar size={12} />
              <span>{formatDate(workOrder.createdAt)}</span>
            </div>

            {(workOrder.assignedUsers || []).length > 0 && (
              <div className="flex items-center">
                {(workOrder.assignedUsers || []).slice(0, 4).map((u, i) => (
                  <div
                    key={u.name}
                    title={u.name}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white ${getAvatarColor(u.name)} ${i > 0 ? '-ml-2' : ''}`}
                  >
                    {getInitials(u.name)}
                  </div>
                ))}
                {(workOrder.assignedUsers || []).length > 4 && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-200 text-gray-600 text-[10px] font-bold border-2 border-white -ml-2">
                    +{(workOrder.assignedUsers || []).length - 4}
                  </div>
                )}
              </div>
            )}
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
  onCardClick: (wo: WorkOrder) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ phase, workOrders, onCardClick }) => {
  const totalM2 = workOrders.reduce((acc, wo) => acc + (wo.totalM2 || 0), 0);
  const totalLinear = workOrders.reduce((acc, wo) => acc + (wo.totalLinear || 0), 0);

  return (
  <div className="w-72 flex-shrink-0 flex flex-col">
    {/* Column header */}
    <div className="mb-3 px-1 space-y-1">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-600 truncate">
          {phase.name}
        </h3>
        <span className="ml-2 flex-shrink-0 px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-xs font-bold">
          {workOrders.length}
        </span>
      </div>
      {workOrders.length > 0 && (
        <div className="flex items-center gap-2">
          {totalM2 > 0 && (
            <span className="text-[10px] font-semibold text-gray-400">
              {totalM2.toFixed(2)} m²
            </span>
          )}
          {totalM2 > 0 && totalLinear > 0 && (
            <span className="text-[10px] text-gray-300">·</span>
          )}
          {totalLinear > 0 && (
            <span className="text-[10px] font-semibold text-gray-400">
              {totalLinear.toFixed(2)} m lin.
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
            <WOCard key={wo.id} workOrder={wo} index={index} onClick={onCardClick} />
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
  currentUserName,
  onUpdatePhase,
  onUpdate,
  onAddDrawing,
  onDeleteDrawing,
}) => {
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);

  // Sync selectedWorkOrder whenever workOrders updates (add/delete drawing, phase change, etc.)
  useEffect(() => {
    if (!selectedWorkOrder) return;
    const updated = workOrders.find(w => w.id === selectedWorkOrder.id);
    if (updated) setSelectedWorkOrder(updated);
  }, [workOrders]);

  const firstPhaseName = phases[0]?.name || '';

  // Group work orders by phase
  const columnMap: Record<string, WorkOrder[]> = {};
  phases.forEach(ph => { columnMap[ph.name] = []; });

  workOrders.forEach(wo => {
    const phase = wo.productionPhase || firstPhaseName;
    if (columnMap[phase] !== undefined) {
      columnMap[phase].push(wo);
    } else if (firstPhaseName) {
      columnMap[firstPhaseName] = columnMap[firstPhaseName] || [];
      columnMap[firstPhaseName].push(wo);
    }
  });

  const handleDragEnd = (result: DropResult) => {
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

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="h-full overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max px-1 py-1 h-full">
            {phases.map(phase => (
              <KanbanColumn
                key={phase.name}
                phase={phase}
                workOrders={columnMap[phase.name] || []}
                onCardClick={setSelectedWorkOrder}
              />
            ))}
          </div>
        </div>
      </DragDropContext>

      {selectedWorkOrder && (
        <WorkOrderModal
          workOrder={selectedWorkOrder}
          phases={phases}
          appUsers={appUsers}
          currentUserName={currentUserName}
          onUpdatePhase={handleUpdatePhase}
          onUpdate={handleUpdate}
          onAddDrawing={onAddDrawing}
          onDeleteDrawing={onDeleteDrawing}
          onClose={() => setSelectedWorkOrder(null)}
        />
      )}
    </>
  );
};
