import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ActivityAlertStatus } from '../types';
import { useActivityAlert } from '../contexts/ActivityAlertContext';
import { QuickActivityModal } from './QuickActivityModal';

interface ActivityBadgeProps {
  referenceId: string;
  referenceType: 'sale' | 'work_order';
  daysInStage?: number;
  currentUserName?: string;
}

const STATUS_CONFIG: Record<ActivityAlertStatus, { label: string; bg: string; dot?: string }> = {
  no_activity: {
    label: 'Sem atividade agendada',
    bg: 'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200',
  },
  overdue: {
    label: 'Atividade vencida',
    bg: 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200',
    dot: 'bg-red-500',
  },
  today: {
    label: 'Atividade para hoje',
    bg: 'bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200',
    dot: 'bg-emerald-500',
  },
  future: {
    label: 'Atividade agendada',
    bg: 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200',
    dot: 'bg-slate-400',
  },
};

export const ActivityBadge: React.FC<ActivityBadgeProps> = ({
  referenceId,
  referenceType,
  daysInStage,
  currentUserName,
}) => {
  const { alertByRef, activitiesByRef } = useActivityAlert();
  const [modalOpen, setModalOpen] = useState(false);

  const status: ActivityAlertStatus = alertByRef[referenceId] ?? 'no_activity';
  const cfg = STATUS_CONFIG[status];
  const nextActivity = (activitiesByRef[referenceId] ?? [])
    .filter(a => a.status === 'pendente')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

  const tooltipText = cfg.label + (nextActivity
    ? ` — ${new Date(nextActivity.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
    : '');

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setModalOpen(true); }}
        title={tooltipText}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-black transition-all shrink-0 ${cfg.bg}`}
      >
        {status === 'no_activity' ? (
          <AlertTriangle size={9} />
        ) : (
          <span className={`w-2 h-2 rounded-full inline-block ${cfg.dot}`} />
        )}
        {typeof daysInStage === 'number' && (
          <span>{daysInStage}d</span>
        )}
      </button>

      {modalOpen && (
        <QuickActivityModal
          referenceId={referenceId}
          referenceType={referenceType}
          currentUserName={currentUserName}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
};
