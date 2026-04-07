import React, { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { CRMActivity } from '../types';
import { useActivityAlert } from '../contexts/ActivityAlertContext';

interface QuickActivityModalProps {
  referenceId: string;
  referenceType: 'sale' | 'work_order';
  currentUserName?: string;
  onClose: () => void;
}

export const QuickActivityModal: React.FC<QuickActivityModalProps> = ({
  referenceId,
  referenceType,
  currentUserName,
  onClose,
}) => {
  const { activitiesByRef, createCRMActivity, completeCRMActivity, deleteCRMActivity } = useActivityAlert();
  const today = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const activities = activitiesByRef[referenceId] ?? [];
  const pending = activities.filter(a => a.status === 'pendente')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const handleCreate = async () => {
    if (!title.trim() || !dueDate) return;
    setSaving(true);
    await createCRMActivity({
      referenceId,
      referenceType,
      title: title.trim(),
      dueDate,
      notes: notes.trim() || undefined,
      status: 'pendente',
      createdBy: currentUserName,
    });
    setTitle('');
    setNotes('');
    setDueDate(today);
    setSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreate(); }
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-black text-slate-800 dark:text-white text-sm">Atividades Agendadas</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Pending activities list */}
        {pending.length > 0 && (
          <div className="px-5 py-3 space-y-2 border-b border-slate-100 dark:border-slate-800 max-h-48 overflow-y-auto">
            {pending.map(act => {
              const isOverdue = act.dueDate < today;
              const isToday = act.dueDate === today;
              return (
                <div
                  key={act.id}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs transition-colors
                    ${isOverdue
                      ? 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/10'
                      : isToday
                        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/10'
                        : 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50'}`}
                >
                  <button
                    onClick={() => completeCRMActivity(act.id)}
                    title="Marcar como concluída"
                    className="p-1 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-emerald-400 hover:bg-emerald-50 transition-all flex-shrink-0"
                  >
                    <Check size={10} className="text-emerald-500" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-700 dark:text-slate-200 truncate">{act.title}</p>
                    <p className={`text-[10px] font-bold ${isOverdue ? 'text-red-500' : isToday ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {isOverdue ? 'Vencida — ' : isToday ? 'Hoje — ' : ''}
                      {new Date(act.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                    {act.notes && <p className="text-[10px] text-slate-400 truncate mt-0.5">{act.notes}</p>}
                  </div>
                  <button
                    onClick={() => deleteCRMActivity(act.id)}
                    title="Excluir atividade"
                    className="p-1 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Create new */}
        <div className="px-5 py-4 space-y-2.5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            {pending.length === 0 ? 'Nenhuma atividade — agende uma agora' : 'Nova Atividade'}
          </p>
          <input
            type="text"
            placeholder="Ex: Ligar para cliente, Enviar proposta..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-[var(--primary-color)] bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder:font-normal placeholder:text-slate-400"
          />
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-[var(--primary-color)] bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
          />
          <textarea
            placeholder="Observações (opcional)..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[var(--primary-color)] bg-white dark:bg-slate-800 text-slate-700 dark:text-white resize-none placeholder:text-slate-400"
          />
          <button
            onClick={handleCreate}
            disabled={!title.trim() || !dueDate || saving}
            className="w-full py-2.5 bg-[var(--primary-color)] text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            {saving ? 'Salvando...' : 'Agendar Atividade'}
          </button>
        </div>
      </div>
    </div>
  );
};
