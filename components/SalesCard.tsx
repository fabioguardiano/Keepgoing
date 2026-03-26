import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Calendar, User as UserIcon, DollarSign, CheckCircle2, Lock, GripVertical, ArrowRight } from 'lucide-react';
import { SalesOrder, AppUser } from '../types';
import { CRMSection } from './CRMSection';

interface SalesCardProps {
  sale: SalesOrder;
  index: number;
  handleEdit: (sale: SalesOrder) => void;
  onSaveSale: (sale: SalesOrder) => void;
  phase: string;
  currentUser?: AppUser | null;
}

export const SalesCard: React.FC<SalesCardProps> = ({ sale, index, handleEdit, onSaveSale, phase, currentUser }) => {

  return (
    <Draggable key={sale.id} draggableId={sale.id} index={index}>
      {(provided, snapshot) => (
        <div 
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
          className={`bg-white dark:bg-slate-900 border p-4 rounded-2xl shadow-sm transition-all cursor-grab active:cursor-grabbing group ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-[var(--primary-color)] scale-[1.02] z-50' : 'hover:shadow-md'} ${sale.status === 'Pedido' ? 'border-green-200 dark:border-green-900/50 bg-green-50/30 dark:bg-green-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}
          onClick={() => handleEdit(sale)}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">#{sale.orderNumber}</span>
              {sale.isOsGenerated && (
                <span className="bg-green-100 text-green-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                  <CheckCircle2 size={8} /> OS Gerada
                </span>
              )}
              {sale.status === 'Pedido' && (
                <span className="bg-green-100 text-green-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1" title="Pedido confirmado — bloqueado para edição">
                  <Lock size={8} /> Bloqueado
                </span>
              )}
            </div>
            <GripVertical className="text-slate-300 group-hover:text-slate-400 transition-colors w-4 h-4 shrink-0" />
          </div>

          <h4 className="font-black text-slate-800 dark:text-white text-sm mb-1 group-hover:text-[var(--primary-color)] transition-colors line-clamp-1">{sale.clientName}</h4>
          <p className="text-[10px] text-slate-400 font-bold mb-3 line-clamp-2 leading-relaxed">{sale.projectDescription || 'Sem descrição'}</p>
          
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              <Calendar size={12} className="text-slate-400" />
              <span>{sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('pt-BR') : 'Sem data'}</span>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              <UserIcon size={12} className="text-slate-400" />
              <span>{sale.seller || 'Sem vendedor'}</span>
            </div>
          </div>

          <div 
            className="pt-2 border-t border-slate-100 dark:border-slate-800/50"
            onClick={(e) => e.stopPropagation()}
          >
            <CRMSection 
              sale={sale} 
              onSaveSale={onSaveSale} 
              currentUser={currentUser} 
            />
          </div>

          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-50 dark:border-slate-800/50">
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
  );
};
