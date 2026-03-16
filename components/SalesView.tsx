import React, { useState } from 'react';
import { ShoppingBag, Plus, Search, FileText, CheckCircle2, Clock, XCircle, MoreVertical, ExternalLink, Printer, LayoutGrid, List, ArrowRight, X, Edit2, GripVertical, Trash2, Check, DollarSign, Calendar, MoreHorizontal, User } from 'lucide-react';
import { SalesOrder, Client, Material, AppUser, Architect, ProductService, SalesChannel, CompanyInfo, SalesPhaseConfig, ServiceGroup } from '../types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { NewSaleModal } from './NewSaleModal';
import { PrintBudget } from './PrintBudget';

interface SalesViewProps {
  sales: SalesOrder[];
  clients: Client[];
  materials: Material[];
  onSaveSale: (sale: SalesOrder) => void;
  appUsers: AppUser[];
  architects: Architect[];
  products: ProductService[];
  salesChannels: SalesChannel[];
  companyInfo: CompanyInfo;
  nextOrderNumber: string;
  salesPhases: SalesPhaseConfig[];
  services: ServiceGroup[];
  onAddSalesPhase: (name: string) => void;
  onRenameSalesPhase: (oldName: string, newName: string) => void;
  onDeleteSalesPhase: (name: string) => void;
  onReorderSalesPhases: (startIndex: number, endIndex: number) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({ 
  sales, clients, materials, onSaveSale, appUsers, architects, products, salesChannels, companyInfo, nextOrderNumber,
  salesPhases, services, onAddSalesPhase, onRenameSalesPhase, onDeleteSalesPhase, onReorderSalesPhases
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [editingSale, setEditingSale] = useState<SalesOrder | null>(null);
  const [printingSale, setPrintingSale] = useState<SalesOrder | null>(null);
  const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [tempPhaseName, setTempPhaseName] = useState('');
  const [showNewPhaseInput, setShowNewPhaseInput] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [lostSaleDetails, setLostSaleDetails] = useState<{ saleId: string; reason: string; details: string } | null>(null);

  const onDragStart = () => {
    setIsDragging(true);
  };

  const onDragEnd = (result: DropResult) => {
    setIsDragging(false);
    const { destination, source, draggableId, type } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'column') {
      onReorderSalesPhases(source.index, destination.index);
    } else {
      const saleId = draggableId;
      const targetPhase = destination.droppableId;
      
      if (targetPhase === 'lost-zone') {
        const sale = sales.find(s => s.id === saleId);
        if (sale) {
          setLostSaleDetails({ saleId, reason: companyInfo.lostReasonOptions?.[0] || '', details: '' });
        }
        return;
      }

      if (targetPhase === 'win-zone') {
        const sale = sales.find(s => s.id === saleId);
        if (sale) {
          onSaveSale({ ...sale, salesPhase: 'Pedido/Ganho', status: 'Pedido' });
        }
        return;
      }

      const sale = sales.find(s => s.id === saleId);
      if (sale) {
        onSaveSale({ ...sale, salesPhase: targetPhase });
      }
    }
  };

  const handleEdit = (sale: SalesOrder) => {
    setEditingSale(sale);
    setIsNewSaleModalOpen(true);
  };

  const handlePrint = (sale: SalesOrder) => {
    setPrintingSale(sale);
    setTimeout(() => {
      window.print();
      setPrintingSale(null);
    }, 100);
  };

  const handleNewSale = () => {
    setEditingSale(null);
    setIsNewSaleModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Vendas e Orçamentos</h1>
          <p className="text-sm text-slate-500 font-medium">Gestão comercial e conversão de pedidos</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex">
            <button 
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-700 shadow-sm text-[var(--primary-color)]' : 'text-slate-400'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-[var(--primary-color)]' : 'text-slate-400'}`}
            >
              <List size={18} />
            </button>
          </div>
          <button 
            onClick={handleNewSale}
            className="bg-[var(--primary-color)] text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[var(--primary-color)]/20 hover:opacity-90 transition-all text-sm"
          >
            <Plus size={18} /> Novo Orçamento
          </button>
        </div>
      </div>


      {viewMode === 'list' ? (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          {sales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Nº Pedido</th>
                    <th className="px-6 py-4">Vendedor</th>
                    <th className="px-6 py-4 text-right">Valor Total</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sales
                    .filter(s => (s.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (s.orderNumber || '').includes(searchTerm))
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(sale => (
                      <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            sale.status === 'Orçamento' ? 'bg-blue-100 text-blue-600' : 
                            sale.status === 'Pedido' ? 'bg-green-100 text-green-600' : 
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {sale.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-500">{new Date(sale.createdAt).toLocaleDateString('pt-BR')}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-white">{sale.clientName}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-500">#{sale.orderNumber || '-'}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-500">{sale.seller}</td>
                        <td className="px-6 py-4 text-right text-sm font-black text-slate-800 dark:text-white">
                          R$ {(sale.totals?.geral || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handleEdit(sale)}
                              className="p-2 text-slate-400 hover:text-[var(--primary-color)] hover:bg-orange-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                              title="Editar"
                            >
                              <ExternalLink size={18} />
                            </button>
                            <button 
                              onClick={() => handlePrint(sale)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                              title="Imprimir Orçamento"
                            >
                              <Printer size={18} />
                            </button>
                            {sale.salesPhase === 'Pedido Confirmado' && !sale.isOsGenerated && (
                              <button 
                                onClick={() => onSaveSale({ ...sale, isOsGenerated: true, status: 'Pedido' })}
                                className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                                title="Gerar OS para Produção"
                              >
                                <ArrowRight size={18} />
                              </button>
                            )}
                            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-all">
                              <MoreVertical size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-20 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={40} className="text-slate-200 dark:text-slate-700" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white mb-1">Nenhuma venda registrada</h3>
              <p className="text-slate-400 dark:text-slate-500 max-w-xs mx-auto text-sm">Comece criando um orçamento para ver as vendas aparecerem aqui.</p>
            </div>
          )}
        </div>
      ) : (
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div 
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex gap-4 transition-all duration-300 ${isDragging ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-12 pointer-events-none'}`}
          >
            <Droppable droppableId="lost-zone" type="card">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`w-72 h-32 rounded-[2.5rem] border-4 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${snapshot.isDraggingOver ? 'bg-red-500 border-red-200 text-white scale-110 shadow-2xl' : 'bg-white/80 backdrop-blur-md border-slate-200 text-slate-400'}`}
                >
                  <XCircle size={32} className={snapshot.isDraggingOver ? 'animate-pulse' : ''} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Arquivar como Perdido</span>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            <Droppable droppableId="win-zone" type="card">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`w-72 h-32 rounded-[2.5rem] border-4 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${snapshot.isDraggingOver ? 'bg-green-500 border-green-200 text-white scale-110 shadow-2xl' : 'bg-white/80 backdrop-blur-md border-slate-200 text-slate-400'}`}
                >
                  <span className="text-[12px] font-black text-slate-500 mb-1">MOVIMENTAR PARA:</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className={snapshot.isDraggingOver ? 'animate-bounce' : ''} />
                    <span className="text-xl font-black uppercase tracking-tighter">GANHO</span>
                  </div>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
          <Droppable droppableId="board" type="column" direction="horizontal">
            {(provided) => (
                <div 
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex gap-3 overflow-x-auto pb-6 custom-scrollbar min-h-[600px] items-start"
                >
                {salesPhases.map((phaseConfig, index) => {
                  const phase = phaseConfig.name;
                  const isEditing = editingPhase === phase;
                  const phaseSales = sales.filter(s => s.salesPhase === phase);
                  const phaseTotal = phaseSales.reduce((acc, s) => acc + (s.totals?.geral || 0), 0);

                  return (
                    <Draggable key={phase} draggableId={phase} index={index}>
                      {(provided, snapshot) => (
                        <div 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="flex-shrink-0 w-64 flex flex-col gap-4"
                        >
                          {/* Column Header */}
                          <div 
                            className={`flex items-center justify-between mb-4 px-1 group/header transition-all ${snapshot.isDragging ? 'bg-white dark:bg-slate-800 shadow-xl ring-2 ring-[var(--primary-color)] rounded-xl p-2' : ''}`}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div {...provided.dragHandleProps} className="text-slate-300 hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0">
                                <GripVertical size={16} />
                              </div>
                              {isEditing ? (
                                <div className="flex items-center gap-1 w-full bg-white dark:bg-slate-800 p-1 rounded-lg border border-[var(--primary-color)]">
                                  <input
                                    autoFocus
                                    value={tempPhaseName}
                                    onChange={(e) => setTempPhaseName(e.target.value)}
                                    onBlur={() => {
                                      if (tempPhaseName.trim() && tempPhaseName !== phase) {
                                        onRenameSalesPhase(phase, tempPhaseName);
                                      }
                                      setEditingPhase(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        if (tempPhaseName.trim() && tempPhaseName !== phase) {
                                          onRenameSalesPhase(phase, tempPhaseName);
                                        }
                                        setEditingPhase(null);
                                      }
                                      if (e.key === 'Escape') setEditingPhase(null);
                                    }}
                                    className="bg-transparent border-none px-1 text-xs font-black uppercase tracking-widest w-full focus:outline-none text-slate-700 dark:text-slate-300"
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="flex flex-col min-w-0">
                                    <h3 
                                      onClick={() => {
                                        setEditingPhase(phase);
                                        setTempPhaseName(phase);
                                      }}
                                      className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate cursor-pointer hover:text-[var(--primary-color)] transition-colors"
                                    >
                                      {phase}
                                    </h3>
                                  </div>
                                  <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                                    {phaseSales.length}
                                  </span>
                                </>
                              )}
                            </div>
                            
                            {!isEditing && (
                              <div className="flex items-center gap-1 shrink-0">
                                <div className="relative group/menu">
                                  <button className="text-slate-400 hover:text-[var(--primary-color)] transition-colors p-1">
                                    <MoreHorizontal size={18} />
                                  </button>
                                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 z-50 invisible group-hover/menu:visible opacity-0 group-hover/menu:opacity-100 transition-all min-w-[150px]">
                                    <button
                                      onClick={() => {
                                        setEditingPhase(phase);
                                        setTempPhaseName(phase);
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                    >
                                      <Edit2 size={12} /> Renomear
                                    </button>
                                    <button
                                      onClick={() => onDeleteSalesPhase(phase)}
                                      className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800"
                                    >
                                      <Trash2 size={12} /> Excluir
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Cards List */}
                          <Droppable droppableId={phase} type="card">
                            {(providedCard, snapshotCard) => (
                              <div 
                                {...providedCard.droppableProps}
                                ref={providedCard.innerRef}
                                className={`flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2 pb-4 rounded-xl transition-colors ${snapshotCard.isDraggingOver ? 'bg-slate-200/50 dark:bg-slate-800/50' : 'bg-transparent'}`}
                              >
                                {phaseSales.map((sale, cardIndex) => (
                                  <Draggable key={sale.id} draggableId={sale.id} index={cardIndex}>
                                    {(provided, snapshot) => (
                                      <div 
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        ref={provided.innerRef}
                                        className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm transition-all cursor-grab active:cursor-grabbing group ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-[var(--primary-color)] scale-[1.02] z-50' : 'hover:shadow-md hover:border-slate-200'}`}
                                        onClick={() => handleEdit(sale)}
                                      >
                                        <div className="flex justify-between items-start mb-2">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">#{sale.orderNumber}</span>
                                            {sale.isOsGenerated && (
                                              <span className="bg-green-100 text-green-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                                                <CheckCircle2 size={8} /> OS Gerada
                                              </span>
                                            )}
                                          </div>
                                          <GripVertical size={16} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
                                        </div>

                                        <h4 className="font-black text-slate-800 dark:text-white text-sm mb-1 group-hover:text-[var(--primary-color)] transition-colors line-clamp-1">{sale.clientName}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold mb-3 line-clamp-2 leading-relaxed">{sale.projectDescription || 'Sem descrição'}</p>
                                        
                                        <div className="space-y-2 mb-3">
                                          <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                            <Calendar size={12} className="text-slate-400" />
                                            <span>{sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('pt-BR') : 'Sem data'}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                            <User size={12} className="text-slate-400" />
                                            <span>{sale.seller || 'Sem vendedor'}</span>
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800/50">
                                          <div className="flex items-center gap-1.5">
                                            <div className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 text-[8px] font-black border border-orange-200 dark:border-orange-800/50">
                                              {sale.seller?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">{sale.salesChannel || 'Direto'}</span>
                                          </div>
                                          <div className="text-right">
                                            <div className="flex items-center gap-1 justify-end">
                                              <DollarSign size={10} className="text-green-500" />
                                              <span className="text-xs font-black text-slate-800 dark:text-white">
                                                {(sale.totals?.geral || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {phase === 'Pedido/Ganho' && !sale.isOsGenerated && (
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onSaveSale({ ...sale, isOsGenerated: true, status: 'Pedido' });
                                            }}
                                            className="mt-4 w-full py-2.5 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-green-500/20"
                                          >
                                            <ArrowRight size={14} /> Gerar OS Produtiva
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {providedCard.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      )}
                    </Draggable>
                  );
                })}

                {/* New Column Column */}
                {provided.placeholder}
                <div className="flex-shrink-0 w-64 pt-12">
                  {showNewPhaseInput ? (
                    <div className="bg-white dark:bg-slate-900 border border-[var(--primary-color)]/30 rounded-3xl p-6 shadow-xl animate-in fade-in zoom-in duration-200 ring-4 ring-orange-50 dark:ring-slate-800/50">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Plus size={14} className="text-[var(--primary-color)]" /> Nova Etapa
                      </h4>
                      <input
                        autoFocus
                        value={newPhaseName}
                        onChange={(e) => setNewPhaseName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newPhaseName.trim()) {
                            onAddSalesPhase(newPhaseName.trim());
                            setNewPhaseName('');
                            setShowNewPhaseInput(false);
                          }
                          if (e.key === 'Escape') setShowNewPhaseInput(false);
                        }}
                        placeholder="Nome da fase..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-bold mb-4 focus:ring-1 focus:ring-[var(--primary-color)] outline-none transition-all"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (newPhaseName.trim()) {
                              onAddSalesPhase(newPhaseName.trim());
                              setNewPhaseName('');
                              setShowNewPhaseInput(false);
                            }
                          }}
                          className="flex-1 bg-[var(--primary-color)] text-white text-[10px] font-black uppercase py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[var(--primary-color)]/20"
                        >
                          Adicionar
                        </button>
                        <button
                          onClick={() => setShowNewPhaseInput(false)}
                          className="px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewPhaseInput(true)}
                      className="w-full py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-[var(--primary-color)] hover:text-[var(--primary-color)] hover:bg-orange-50/30 transition-all bg-white/30 dark:bg-slate-900/10 group"
                    >
                      <div className="p-4 rounded-full bg-white dark:bg-slate-800 group-hover:bg-[var(--primary-color)] group-hover:text-white transition-all shadow-sm">
                        <Plus size={24} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">Nova Etapa de Venda</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {isNewSaleModalOpen && (
        <NewSaleModal 
          clients={clients}
          architects={architects}
          appUsers={appUsers}
          materials={materials}
          products={products}
          services={services}
          salesChannels={salesChannels}
          companyInfo={companyInfo}
          nextOrderNumber={nextOrderNumber}
          salesPhases={salesPhases}
          initialData={editingSale || undefined}
          onSave={(sale) => {
            onSaveSale(sale);
            setIsNewSaleModalOpen(false);
            setEditingSale(null);
          }}
          onClose={() => {
            setIsNewSaleModalOpen(false);
            setEditingSale(null);
          }}
        />
      )}
      {printingSale && (
        <PrintBudget 
          sale={printingSale} 
          companyInfo={companyInfo} 
          materials={materials}
          client={clients.find(c => c.id === printingSale.clientId)}
        />
      )}

      {/* Lost Sale Justification Modal */}
      {lostSaleDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                  <XCircle size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight">Orçamento Perdido</h3>
                  <p className="text-sm text-slate-400 font-medium">Justifique o motivo do cancelamento</p>
                </div>
              </div>
              <button onClick={() => setLostSaleDetails(null)} className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Motivo Principal *</label>
                <select 
                  value={lostSaleDetails.reason}
                  onChange={(e) => setLostSaleDetails({ ...lostSaleDetails, reason: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400/20"
                >
                  <option value="" disabled>Selecione um motivo...</option>
                  {(companyInfo.lostReasonOptions || []).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Detalhes Adicionais</label>
                <textarea 
                  value={lostSaleDetails.details}
                  onChange={(e) => setLostSaleDetails({ ...lostSaleDetails, details: e.target.value })}
                  placeholder="Explique melhor o que aconteceu..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400/20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setLostSaleDetails(null)}
                  className="flex-1 py-4 px-6 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-slate-400 uppercase text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  disabled={!lostSaleDetails.reason}
                  onClick={() => {
                    const sale = sales.find(s => s.id === lostSaleDetails.saleId);
                    if (sale) {
                      onSaveSale({
                        ...sale,
                        status: 'Cancelado',
                        salesPhase: 'Perdido',
                        lostReason: lostSaleDetails.reason,
                        lostDetails: lostSaleDetails.details
                      });
                    }
                    setLostSaleDetails(null);
                  }}
                  className="flex-1 py-4 px-6 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-red-500/20 hover:opacity-90 transition-all disabled:opacity-50"
                >
                  Confirmar Perda
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
