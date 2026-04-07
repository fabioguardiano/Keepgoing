import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Calendar, DollarSign, CheckCircle2, Lock, GripVertical, ArrowRight, EyeOff } from 'lucide-react';
import { SalesOrder, AppUser, SalesPhaseConfig } from '../types';
import { CRMSection } from './CRMSection';
import { ActivityBadge } from './ActivityBadge';
import { getInitials } from '../utils/userUtils';

interface SalesCardProps {
  sale: SalesOrder;
  index: number;
  handleEdit: (sale: SalesOrder) => void;
  onSaveSale: (sale: SalesOrder) => void;
  phase: string;
  phaseConfig?: SalesPhaseConfig;
  currentUser?: AppUser | null;
  appUsers?: AppUser[];
  canEdit?: boolean;
}

export const SalesCard: React.FC<SalesCardProps> = ({ 
  sale, index, handleEdit, onSaveSale, phase, phaseConfig, currentUser, appUsers = [], canEdit = true 
}) => {
  const daysElapsed = React.useMemo(() => {
    // 1. Pega a criação ou interação oficial (se a coluna no banco existir)
    const dates = [new Date(sale.createdAt)];
    if (sale.lastInteractionAt) dates.push(new Date(sale.lastInteractionAt));
    
    // 2. Fallback: Procura a nota de CRM mais recente
    if (sale.crmNotes && sale.crmNotes.length > 0) {
      const lastNote = sale.crmNotes
        .map(n => new Date(n.timestamp).getTime())
        .sort((a,b) => b - a)[0];
      if (lastNote) dates.push(new Date(lastNote));
    }

    // 3. Usa a data da atividade mais recente de todas
    const referenceDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - referenceDate.getTime());
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  }, [sale.createdAt, sale.lastInteractionAt, sale.crmNotes]);

  const deadlineStatus = React.useMemo(() => {
    if (sale.status === 'Pedido' || sale.status === 'Cancelado') return 'none';
    
    const alertDays = phaseConfig?.alertDays || 0;
    const desirableDays = phaseConfig?.desirableDays || 0;

    if (alertDays === 0 && desirableDays === 0) return 'none';

    // Se o usuário inverter, usamos o maior para o alerta (Vermelho)
    const lateThreshold = Math.max(alertDays, desirableDays);
    const warningThreshold = Math.min(alertDays, desirableDays);

    if (daysElapsed >= lateThreshold) return 'alert';
    if (daysElapsed >= warningThreshold) return 'warning';
    
    return 'success';
  }, [daysElapsed, phaseConfig, sale.status]);

  const sellerUser = React.useMemo(() => {
    return appUsers.find(u => u.name === sale.seller || u.email === sale.seller);
  }, [appUsers, sale.seller]);

  const statusClasses = {
    alert: 'border-red-400 dark:border-red-900/50 bg-red-50/10 dark:bg-red-900/10 shadow-red-100 dark:shadow-none shadow-lg',
    warning: 'border-orange-400 dark:border-orange-900/50 bg-orange-50/10 dark:bg-orange-900/10 shadow-orange-100 dark:shadow-none shadow-md',
    success: 'border-emerald-400 dark:border-emerald-900/50 bg-emerald-50/10 dark:bg-emerald-900/10 shadow-emerald-50 dark:shadow-none shadow-sm',
    none: 'border-slate-100 dark:border-slate-800 hover:border-slate-200 shadow-sm'
  };

  const borderClass = sale.status === 'Pedido' 
    ? 'border-2 border-green-200 dark:border-green-900/50 bg-green-50/30 dark:bg-green-900/10' 
    : `${deadlineStatus !== 'none' ? 'border-2' : 'border'} ${statusClasses[deadlineStatus as keyof typeof statusClasses]}`;

  return (
    <Draggable key={sale.id} draggableId={sale.id} index={index} isDragDisabled={!canEdit}>
      {(provided, snapshot) => (
        <div 
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
          className={`bg-white dark:bg-slate-900 border p-4 rounded-2xl transition-all group ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default opacity-80'} ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-[var(--primary-color)] scale-[1.02] z-50' : canEdit ? 'hover:shadow-md' : ''} ${borderClass}`}
          onClick={() => canEdit && handleEdit(sale)}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
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
              {deadlineStatus !== 'none' && (
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1 
                  ${deadlineStatus === 'alert' ? 'bg-slate-200 text-black' : 
                    deadlineStatus === 'warning' ? 'bg-orange-100 text-orange-600' : 
                    'bg-emerald-100 text-emerald-600'}`}>
                  {daysElapsed === 0 ? 'Recente' : `${daysElapsed} ${daysElapsed === 1 ? 'Dia' : 'Dias'}`}
                </span>
              )}
              {!canEdit && (
                <span className="bg-slate-100 text-slate-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1" title="Você não tem permissão para editar este orçamento">
                  <EyeOff size={8} /> Só visualização
                </span>
              )}
              {sale.salesChannel && (
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1 border border-slate-200 dark:border-slate-700">
                  {sale.salesChannel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <ActivityBadge
                referenceId={sale.id}
                referenceType="sale"
                daysInStage={daysElapsed}
                currentUserName={currentUser?.name}
              />
              <GripVertical className="text-slate-300 group-hover:text-slate-400 transition-colors w-4 h-4" />
            </div>
          </div>

          <h4 className="font-black text-slate-800 dark:text-white text-sm mb-1 group-hover:text-[var(--primary-color)] transition-colors line-clamp-1">{sale.clientName}</h4>
          {sale.projectDescription && <p className="text-[10px] text-slate-400 font-bold mb-3 line-clamp-2 leading-relaxed">{sale.projectDescription}</p>}
          
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
              <Calendar size={13} className="text-slate-400" />
              <span>{sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('pt-BR') : 'Sem data'}</span>
            </div>
          </div>

          <div 
            className="pt-1.5 border-t border-slate-100 dark:border-slate-800/50"
            onClick={(e) => e.stopPropagation()}
          >
            <CRMSection 
              sale={sale} 
              onSaveSale={onSaveSale} 
              currentUser={currentUser} 
              compact={true}
            />
          </div>

          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-50 dark:border-slate-800/50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] shrink-0 overflow-hidden border border-primary/20 shadow-sm">
                {sellerUser?.avatarUrl ? (
                  <img src={sellerUser.avatarUrl} alt={sale.seller} className="w-full h-full object-cover" />
                ) : (
                  getInitials(sale.seller)
                )}
              </div>
              <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight truncate max-w-[120px]">
                {sale.seller || 'Sem vendedor'}
              </span>
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

          {phase === 'Pedido/Ganho' && !sale.isOsGenerated && canEdit && (
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
