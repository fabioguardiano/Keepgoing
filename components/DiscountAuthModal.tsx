import React, { useState } from 'react';
import { X, ShieldAlert, RotateCcw, Send, CheckCircle, XCircle } from 'lucide-react';
import { AppUser, Authorization } from '../types';

// ─── Solicitar autorização (vendedor) ────────────────────────────────────────

interface RequestProps {
  requestedPct: number;
  maxPct: number;
  subtotal: number;
  admins: AppUser[];
  onRequest: (admin: AppUser) => void;
  onRedo: () => void;
  onClose: () => void;
}

export const DiscountRequestModal: React.FC<RequestProps> = ({
  requestedPct, maxPct, subtotal, admins, onRequest, onRedo, onClose,
}) => {
  const [selectedAdmin, setSelectedAdmin] = useState<AppUser | null>(null);

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <ShieldAlert size={20} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-black text-gray-900 text-base">Desconto acima do limite</h2>
            <p className="text-xs text-amber-600 font-semibold">
              Solicitado: <strong>{requestedPct.toFixed(1)}% (R$ {(subtotal * (requestedPct / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</strong>
            </p>
            <p className="text-[10px] text-amber-500">
              Limite: <strong>{maxPct.toFixed(1)}% (R$ {(subtotal * (maxPct / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</strong>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-600">
            O desconto informado excede o limite permitido. Escolha uma opção:
          </p>

          {/* Opção 1: Refazer */}
          <button
            onClick={onRedo}
            className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-[var(--primary-color)] hover:bg-[var(--primary-color)]/5 transition-all text-left group"
          >
            <RotateCcw size={18} className="text-gray-400 group-hover:text-[var(--primary-color)] flex-shrink-0" />
            <div>
              <p className="font-bold text-sm text-gray-800">Refazer o desconto</p>
              <p className="text-xs text-gray-500">Voltar e informar um desconto dentro do limite</p>
            </div>
          </button>

          {/* Opção 2: Solicitar autorização */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200">
              <Send size={18} className="text-gray-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm text-gray-800">Solicitar autorização</p>
                <p className="text-xs text-gray-500">Enviar pedido de aprovação para um administrador</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">Selecione o administrador</p>
              {admins.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Nenhum administrador disponível.</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {admins.map(admin => (
                    <button
                      key={admin.id}
                      onClick={() => setSelectedAdmin(admin)}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition-all text-left
                        ${selectedAdmin?.id === admin.id
                          ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/5'
                          : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <div className="w-7 h-7 rounded-full bg-[var(--primary-color)]/20 flex items-center justify-center text-[var(--primary-color)] text-xs font-black flex-shrink-0">
                        {admin.name.trim().slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{admin.name}</p>
                        <p className="text-xs text-gray-400 capitalize">{admin.role}</p>
                      </div>
                      {selectedAdmin?.id === admin.id && (
                        <CheckCircle size={16} className="text-[var(--primary-color)] ml-auto flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => selectedAdmin && onRequest(selectedAdmin)}
              disabled={!selectedAdmin}
              className="w-full py-2.5 rounded-xl bg-[var(--primary-color)] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Enviar solicitação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Aprovar / Rejeitar (admin) ───────────────────────────────────────────────

interface ApprovalProps {
  authorization: Authorization;
  onApprove: (id: string, message?: string) => void;
  onReject: (id: string, message?: string) => void;
  onClose: () => void;
}

export const DiscountApprovalModal: React.FC<ApprovalProps> = ({
  authorization, onApprove, onReject, onClose,
}) => {
  const [message, setMessage] = useState('');

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <ShieldAlert size={20} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-black text-gray-900 text-base">Solicitação de desconto</h2>
            <p className="text-xs text-blue-600 font-semibold">
              {authorization.sellerName} · Venda #{authorization.saleOrderNumber}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Cliente</p>
              <p className="text-sm font-semibold text-gray-800">{authorization.clientName || '—'}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">Desconto solicitado</p>
              <p className="text-sm font-black text-amber-700">{authorization.requestedValuePct.toFixed(1)}%</p>
              <p className="text-[10px] text-amber-500">Limite: {authorization.maxValuePct.toFixed(1)}%</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 block mb-1.5">
              Mensagem (opcional)
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={2}
              placeholder="Ex: Aprovado por ser cliente fidelizado..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onReject(authorization.id, message)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors"
            >
              <XCircle size={16} /> Rejeitar
            </button>
            <button
              onClick={() => onApprove(authorization.id, message)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 transition-colors"
            >
              <CheckCircle size={16} /> Aprovar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
