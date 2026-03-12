import React, { useState } from 'react';
import { ProductionPhase, OrderService, AppUser, PhaseConfig, ProductionStaff, StaffPosition, ActivityLog } from '../types';
import { OSCard } from './OSCard';
import { MoreHorizontal, Plus, Trash2, Edit2, Check, X as CloseIcon, GripVertical, UserPlus, HardHat } from 'lucide-react';
import { NewOrderModal } from './NewOrderModal';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface KanbanBoardProps {
  orders: OrderService[];
  phases: PhaseConfig[];
  onOrderMove: (id: string, phase: ProductionPhase) => void;
  onUpdateOrder: (id: string, updates: Partial<OrderService>) => void;
  onAddOrder: (order: OrderService) => void;
  onAddPhase: (name: string) => void;
  onRenamePhase: (oldName: string, newName: string) => void;
  onDeletePhase: (name: string) => void;
  onReorderPhases: (startIndex: number, endIndex: number) => void;
  onTogglePhaseRequirement: (phaseName: string) => void;
  appUsers: AppUser[];
  productionStaff: ProductionStaff[];
  activities: ActivityLog[];
  onAddPhaseResponsible: (orderId: string, phaseName: string, staffName: string) => void;
  isAdmin: boolean;
}

// ─── Modal: Select Responsible ────────────────────────────────────────────────

interface ResponsibleModalProps {
  staff: ProductionStaff[];
  onSelect: (name: string) => void;
  onClose: () => void;
  phaseName: string;
}

const ResponsibleModal: React.FC<ResponsibleModalProps> = ({ staff, onSelect, onClose, phaseName }) => {
  const activeStaff = staff.filter(s => s.status === 'ativo');

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Atribuir Responsável</h2>
            <p className="text-sm text-gray-500">Obrigatório para a fase: <span className="font-bold text-[var(--primary-color)]">{phaseName}</span></p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-2">
          {activeStaff.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Nenhum colaborador de produção ativo cadastrado.</p>
          ) : (
            activeStaff.map(s => (
              <button
                key={s.id}
                onClick={() => onSelect(s.name)}
                className="w-full flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-[var(--primary-color)] hover:bg-orange-50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold shrink-0">
                  {s.name[0]}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-500 uppercase font-semibold">{s.position}</p>
                </div>
                <UserPlus size={18} className="ml-auto text-slate-300 group-hover:text-[var(--primary-color)]" />
              </button>
            ))
          )}
        </div>
        <div className="p-4 bg-gray-50 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">
            Cancelar Movimento
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main KanbanBoard ─────────────────────────────────────────────────────────

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  orders,
  phases,
  onOrderMove,
  onUpdateOrder,
  onAddOrder,
  onAddPhase,
  onRenamePhase,
  onDeletePhase,
  onReorderPhases,
  onTogglePhaseRequirement,
  appUsers,
  productionStaff,
  activities,
  onAddPhaseResponsible,
  isAdmin
}) => {
  const [addingPhase, setAddingPhase] = useState<ProductionPhase | null>(null);
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [tempPhaseName, setTempPhaseName] = useState('');
  const [showNewPhaseInput, setShowNewPhaseInput] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');

  // Move Logic with Interception
  const [pendingMove, setPendingMove] = useState<{ orderId: string, targetPhase: string } | null>(null);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'column') {
      onReorderPhases(source.index, destination.index);
      return;
    }

    const targetPhaseName = destination.droppableId;
    const targetPhaseConfig = phases.find(p => p.name === targetPhaseName);

    if (targetPhaseConfig?.requiresResponsible) {
      setPendingMove({ orderId: draggableId, targetPhase: targetPhaseName });
    } else {
      onOrderMove(draggableId, targetPhaseName as ProductionPhase);
    }
  };

  const confirmMoveWithResponsible = (responsibleName: string) => {
    if (pendingMove) {
      onUpdateOrder(pendingMove.orderId, { responsibleStaffName: responsibleName, phase: pendingMove.targetPhase as ProductionPhase });
      setPendingMove(null);
    }
  };

  const startEditing = (phase: string) => {
    if (!isAdmin) return;
    setEditingPhase(phase);
    setTempPhaseName(phase);
  };

  const saveRename = () => {
    if (editingPhase && tempPhaseName.trim()) {
      onRenamePhase(editingPhase, tempPhaseName.trim());
    }
    setEditingPhase(null);
  };

  const handleAddNewPhase = () => {
    if (newPhaseName.trim()) {
      onAddPhase(newPhaseName.trim());
      setNewPhaseName('');
      setShowNewPhaseInput(false);
    }
  };

  return (
    <div className="h-full flex px-2 py-4 bg-slate-50 dark:bg-[#221610] overflow-x-auto custom-scrollbar">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board" type="column" direction="horizontal">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="flex gap-3 h-full items-start min-w-max"
            >
              {phases.map((phase, index) => {
                const columnOrders = orders.filter(o => o.phase === phase.name && (o.isOsGenerated || (o as any).status === 'Confirmado')); // legacy support check
                const isEditing = editingPhase === phase.name;

                return (
                  <Draggable key={phase.name} draggableId={phase.name} index={index} isDragDisabled={!isAdmin}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.draggableProps}
                        ref={provided.innerRef}
                        className={`kanban-column flex flex-col h-full shrink-0 w-64 transition-shadow ${snapshot.isDragging ? 'shadow-2xl z-50' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-4 px-1 group/header">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {isAdmin && (
                              <div {...provided.dragHandleProps} className="text-slate-300 hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0">
                                <GripVertical size={16} />
                              </div>
                            )}
                            {isEditing ? (
                              <div className="flex items-center gap-1 w-full">
                                <input
                                  autoFocus
                                  value={tempPhaseName}
                                  onChange={(e) => setTempPhaseName(e.target.value)}
                                  onBlur={saveRename}
                                  onKeyDown={(e) => e.key === 'Enter' && saveRename()}
                                  className="bg-white border border-[var(--primary-color)] rounded px-2 py-0.5 text-sm font-bold w-full focus:outline-none"
                                />
                                <button onClick={saveRename} className="text-green-600"><Check size={16} /></button>
                              </div>
                            ) : (
                              <>
                                <h3
                                  onClick={() => startEditing(phase.name)}
                                  className={`font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider truncate cursor-pointer ${isAdmin ? 'hover:text-[var(--primary-color)]' : ''}`}
                                >
                                  {phase.name}
                                </h3>
                                <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                                  {columnOrders.length}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setAddingPhase(phase.name as ProductionPhase)}
                              className="text-slate-400 hover:text-[var(--primary-color)] transition-colors"
                              title="Adicionar pedido"
                            >
                              <Plus size={18} />
                            </button>

                            {isAdmin && (
                              <div className="relative group/menu">
                                <button className="text-slate-400 hover:text-[var(--primary-color)] transition-colors">
                                  <MoreHorizontal size={18} />
                                </button>
                                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 z-50 invisible group-hover/menu:visible opacity-0 group-hover/menu:opacity-100 transition-all min-w-[180px]">
                                  <button
                                    onClick={() => onTogglePhaseRequirement(phase.name)}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                  >
                                    <div className={`w-3 h-3 rounded border ${phase.requiresResponsible ? 'bg-[var(--primary-color)] border-[var(--primary-color)]' : 'border-slate-300'} flex items-center justify-center`}>
                                      {phase.requiresResponsible && <Check size={10} className="text-white" />}
                                    </div>
                                    Exigir Responsável
                                  </button>
                                  <button
                                    onClick={() => startEditing(phase.name)}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800"
                                  >
                                    <Edit2 size={12} /> Renomear
                                  </button>
                                  <button
                                    onClick={() => onDeletePhase(phase.name)}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800"
                                  >
                                    <Trash2 size={12} /> Excluir
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <Droppable droppableId={phase.name} type="card">
                          {(providedCard, snapshotCard) => (
                            <div
                              ref={providedCard.innerRef}
                              {...providedCard.droppableProps}
                              className={`flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2 pb-4 rounded-xl transition-colors ${snapshotCard.isDraggingOver ? 'bg-slate-200/50 dark:bg-slate-800/50' : ''}`}
                            >
                              {columnOrders.map((order, indexOrder) => (
                                <OSCard
                                  key={order.id}
                                  order={order}
                                  index={indexOrder}
                                  onUpdateOrder={onUpdateOrder}
                                  activities={activities}
                                  productionStaff={productionStaff}
                                  onAddPhaseResponsible={onAddPhaseResponsible}
                                />
                              ))}
                              {providedCard.placeholder}

                              {columnOrders.length === 0 && !snapshotCard.isDraggingOver && (
                                <div className="h-24 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-400 text-sm">
                                  Arraste aqui
                                </div>
                              )}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}

              {/* Add Column Placeholder */}
              <div className="kanban-column flex flex-col h-full shrink-0 group px-2 w-64">
                {showNewPhaseInput ? (
                  <div className="bg-white dark:bg-slate-900 border border-[var(--primary-color)] rounded-xl p-4 shadow-lg animate-in fade-in zoom-in duration-200">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Nova Coluna</h4>
                    <input
                      autoFocus
                      value={newPhaseName}
                      onChange={(e) => setNewPhaseName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNewPhase()}
                      placeholder="Nome da fase..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-2 text-sm mb-3 focus:ring-1 focus:ring-[var(--primary-color)]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddNewPhase}
                        className="flex-1 bg-[var(--primary-color)] text-white text-xs font-bold py-2 rounded-lg hover:opacity-90 transition-colors"
                      >
                        Adicionar
                      </button>
                      <button
                        onClick={() => setShowNewPhaseInput(false)}
                        className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <CloseIcon size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  isAdmin && (
                    <button
                      onClick={() => setShowNewPhaseInput(true)}
                      className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center gap-2 text-slate-400 group-hover:border-[var(--primary-color)] group-hover:text-[var(--primary-color)] transition-all"
                    >
                      <Plus size={18} />
                      <span className="text-sm font-bold">Nova Coluna</span>
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {addingPhase && (
        <NewOrderModal
          initialPhase={addingPhase}
          onClose={() => setAddingPhase(null)}
          onAddOrder={onAddOrder}
          appUsers={appUsers}
        />
      )}

      {pendingMove && (
        <ResponsibleModal
          staff={productionStaff}
          phaseName={pendingMove.targetPhase}
          onSelect={confirmMoveWithResponsible}
          onClose={() => setPendingMove(null)}
        />
      )}
    </div>
  );
};

const X = ({ size }: { size: number }) => <CloseIcon size={size} />;
