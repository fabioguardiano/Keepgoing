import React from 'react';
import { Clock, LogOut } from 'lucide-react';

interface IdleWarningModalProps {
  secondsLeft: number;
  onContinue: () => void;
  onLogout: () => void;
}

export const IdleWarningModal: React.FC<IdleWarningModalProps> = ({ secondsLeft, onContinue, onLogout }) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = secondsLeft / 60;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-100 px-6 py-5 flex items-center gap-4">
          <div className="p-2.5 bg-amber-100 rounded-2xl text-amber-600">
            <Clock size={22} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 leading-none mb-1">Sessão inativa</h2>
            <p className="text-xs text-slate-500 font-medium">Você será deslogado por inatividade</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 flex flex-col items-center gap-5">
          {/* Countdown circle */}
          <div className="relative flex items-center justify-center">
            <svg width="80" height="80" className="-rotate-90">
              {/* Track */}
              <circle
                cx="40" cy="40" r={radius}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="6"
              />
              {/* Progress */}
              <circle
                cx="40" cy="40" r={radius}
                fill="none"
                stroke={secondsLeft <= 10 ? '#ef4444' : '#f59e0b'}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
              />
            </svg>
            <span className={`absolute text-2xl font-black tabular-nums ${secondsLeft <= 10 ? 'text-red-500' : 'text-slate-700'}`}>
              {secondsLeft}
            </span>
          </div>

          <p className="text-sm text-slate-600 text-center leading-relaxed font-medium">
            Sua sessão será encerrada em <span className="font-black text-slate-800">{secondsLeft} segundo{secondsLeft !== 1 ? 's' : ''}</span>.<br />
            Clique em <span className="font-black">Continuar</span> para permanecer conectado.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <LogOut size={15} />
            Sair agora
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-2.5 rounded-xl text-sm font-black text-white bg-[var(--primary-color)] hover:opacity-90 transition-opacity shadow-sm"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};
