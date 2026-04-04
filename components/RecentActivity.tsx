import React, { useState } from 'react';
import { Clock, Move, Plus, Image as ImageIcon, Trash2, FileEdit, User } from 'lucide-react';
import { ActivityLog } from '../types';
import { getInitials } from '../utils/userUtils';

interface RecentActivityProps {
    activities: ActivityLog[];
    isOpen: boolean;
    onClose: () => void;
    currentUserName?: string;
}

const ACTION_ICONS = {
    create: <Plus className="text-green-500" size={14} />,
    move: <Move className="text-blue-500" size={14} />,
    update: <FileEdit className="text-orange-500" size={14} />,
    upload: <ImageIcon className="text-purple-500" size={14} />,
    delete: <Trash2 className="text-red-500" size={14} />,
    phase_change: <Move className="text-blue-500" size={14} />,
};

const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const getRelativeDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return 'Hoje';
    return date.toLocaleDateString('pt-BR');
};

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities, isOpen, onClose, currentUserName }) => {
    const [onlyMine, setOnlyMine] = useState(false);
    const visibleActivities = onlyMine && currentUserName
        ? activities.filter(a => a.userName === currentUserName)
        : activities;

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[200] transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Panel */}
            <div className={`fixed top-0 right-0 h-full w-80 sm:w-96 bg-white shadow-2xl z-[201] transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} border-l border-slate-200 flex flex-col`}>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Clock size={18} className="text-[var(--primary-color)]" />
                            Atividade Recente
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">{visibleActivities.length} ações registradas</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {currentUserName && (
                            <button
                                onClick={() => setOnlyMine(v => !v)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${onlyMine ? 'bg-[var(--primary-color)]/10 border-[var(--primary-color)]/30 text-[var(--primary-color)]' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                title="Mostrar apenas minhas ações"
                            >
                                <User size={12} /> Minhas
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    {visibleActivities.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 px-8 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                <Clock size={32} className="opacity-20" />
                            </div>
                            <p className="text-sm font-medium leading-relaxed">Nenhuma atividade registrada ainda. As ações aparecerão conforme você usa o sistema.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {visibleActivities.map((activity, idx) => {
                                const showDate = idx === 0 || getRelativeDate(activity.timestamp) !== getRelativeDate(visibleActivities[idx - 1].timestamp);

                                return (
                                    <React.Fragment key={activity.id}>
                                        {showDate && (
                                            <div className="sticky top-0 bg-white/90 backdrop-blur py-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--primary-color)] bg-orange-50 px-2 py-0.5 rounded-full">
                                                    {getRelativeDate(activity.timestamp)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex gap-4 group">
                                            <div className="flex flex-col items-center gap-1 shrink-0">
                                                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm group-hover:border-orange-200 group-hover:bg-orange-50 transition-all">
                                                    {ACTION_ICONS[activity.action]}
                                                </div>
                                                {idx < visibleActivities.length - 1 && (
                                                    <div className="w-px flex-1 bg-slate-100" />
                                                )}
                                            </div>
                                            <div className="pb-6 min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 min-w-0">
                                                        <div className="w-5 h-5 rounded-full bg-[var(--primary-color)] flex items-center justify-center text-white text-[8px] font-black shrink-0">
                                                            {getInitials(activity.userName)}
                                                        </div>
                                                        <span className="truncate">{activity.userName}</span>
                                                    </span>
                                                    <span className="text-[10px] font-medium text-slate-400">{formatTime(activity.timestamp)}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 font-medium leading-relaxed mb-1">
                                                    {activity.details}
                                                </p>
                                                {activity.orderNumber && (
                                                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500 border border-slate-200 uppercase">
                                                        O.S. {activity.orderNumber}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
