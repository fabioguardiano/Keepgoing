import React from 'react';
import { Clock, Move, Plus, Image as ImageIcon, Trash2, FileEdit, User } from 'lucide-react';
import { ActivityLog } from '../types';

interface RecentActivityProps {
    activities: ActivityLog[];
    isOpen: boolean;
    onClose: () => void;
}

const ACTION_ICONS = {
    create: <Plus className="text-green-500" size={14} />,
    move: <Move className="text-blue-500" size={14} />,
    update: <FileEdit className="text-primary" size={14} />,
    upload: <ImageIcon className="text-blue-500" size={14} />,
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

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities, isOpen, onClose }) => {
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
                            <Clock size={18} className="text-primary" />
                            Atividade Recente
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">{activities.length} ações registradas</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    {activities.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 px-8 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                <Clock size={32} className="opacity-20" />
                            </div>
                            <p className="text-sm font-medium leading-relaxed">Nenhuma atividade registrada ainda. As ações aparecerão conforme você usa o sistema.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activities.map((activity, idx) => {
                                const showDate = idx === 0 || getRelativeDate(activity.timestamp) !== getRelativeDate(activities[idx - 1].timestamp);

                                return (
                                    <React.Fragment key={activity.id}>
                                        {showDate && (
                                            <div className="sticky top-0 bg-white/90 backdrop-blur py-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-2 py-0.5 rounded-full">
                                                    {getRelativeDate(activity.timestamp)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex gap-4 group">
                                            <div className="flex flex-col items-center gap-1 shrink-0">
                                                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm group-hover:border-primary/20 group-hover:bg-primary/5 transition-all">
                                                    {ACTION_ICONS[activity.action]}
                                                </div>
                                                {idx < activities.length - 1 && (
                                                    <div className="w-px flex-1 bg-slate-100" />
                                                )}
                                            </div>
                                            <div className="pb-6 min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                                        <User size={12} className="text-slate-400" />
                                                        {activity.userName}
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
