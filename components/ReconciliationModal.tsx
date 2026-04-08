import React, { useState } from 'react';
import { AlertTriangle, Check, X, Plus, ArrowDown, ArrowUp, BarChart2 } from 'lucide-react';
import { AccountReceivable, AccountInstallment, PaymentMethod, ReconciliationEntry } from '../types';
import { fmt } from '../utils/formatting';

export type ReconciliationStrategy = 'proportional' | 'last_installment' | 'new_installment';

export interface ReconciliationData {
  oldTotal: number;
  newTotal: number;
  oldDP: number;
  newDP: number;
  paidAmount: number;          // soma de parcelas já pagas
  pendingAmount: number;       // saldo pendente atual (antes da edição)
  newPendingAmount: number;    // novo saldo pendente (após edição)
  diff: number;                // diferença = newPending - oldPending
  dpPaid: boolean;             // entrada já foi paga?
  dpChanged: boolean;          // valor da entrada mudou?
  pmChanged: boolean;          // forma de pagamento mudou?
  installmentsCountChanged: boolean;  // nº de parcelas mudou?
  dueDateChanged: boolean;     // data do 1º vencimento mudou?
  oldPM?: PaymentMethod;
  newPM?: PaymentMethod;
  oldInstallmentsCount: number;
  newInstallmentsCount: number;
  oldFirstDueDate?: string;
  newFirstDueDate?: string;
  existingAR: AccountReceivable;
  pendingInstallments: AccountInstallment[];
  paidInstallments: AccountInstallment[];
}

interface Props {
  data: ReconciliationData;
  onConfirm: (strategy: ReconciliationStrategy, newDueDate?: string) => void;
  onCancel: () => void;
  currentUser: string;
}

export const ReconciliationModal: React.FC<Props> = ({ data, onConfirm, onCancel, currentUser }) => {
  const [strategy, setStrategy] = useState<ReconciliationStrategy>(
    data.diff > 0 ? 'proportional' : 'proportional'
  );
  const [extraDueDate, setExtraDueDate] = useState('');

  const {
    oldTotal, newTotal, diff, paidAmount, pendingAmount, newPendingAmount,
    dpPaid, dpChanged, pmChanged, installmentsCountChanged, dueDateChanged,
    oldPM, newPM, oldInstallmentsCount, newInstallmentsCount,
    oldFirstDueDate, newFirstDueDate, pendingInstallments, paidInstallments,
  } = data;

  // Calcula preview das parcelas conforme estratégia selecionada
  const previewInstallments = (): AccountInstallment[] => {
    if (pendingInstallments.length === 0) return [];
    const n = pendingInstallments.length;

    if (strategy === 'proportional') {
      const base = Math.floor((newPendingAmount / n) * 100) / 100;
      const remainder = Math.round((newPendingAmount - base * n) * 100) / 100;
      return pendingInstallments.map((inst, i) => ({
        ...inst,
        value: Math.round((i === 0 ? base + remainder : base) * 100) / 100,
      }));
    }

    if (strategy === 'last_installment') {
      return pendingInstallments.map((inst, i) =>
        i === n - 1
          ? { ...inst, value: Math.round((inst.value + diff) * 100) / 100 }
          : inst
      );
    }

    // new_installment — parcelas existentes não mudam; nova parcela ao final
    return pendingInstallments;
  };

  const preview = previewInstallments();
  const canConfirm = strategy !== 'new_installment' || extraDueDate !== '';
  const isReduction = diff < 0;
  const wouldGoBelowZero = isReduction && strategy !== 'new_installment' && newPendingAmount < 0;

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className={`px-6 py-4 flex items-center gap-3 ${isReduction ? 'bg-amber-500' : 'bg-blue-600'}`}>
          <AlertTriangle size={22} className="text-white shrink-0" />
          <div>
            <div className="text-white font-black text-base">Revisão Financeira do Pedido</div>
            <div className="text-white/80 text-xs">O valor do pedido foi alterado — revise o impacto no Contas a Receber</div>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* Resumo de valores */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Valor Anterior</div>
              <div className="text-sm font-black text-slate-700 dark:text-white">R$ {fmt(oldTotal)}</div>
            </div>
            <div className={`rounded-xl p-3 text-center ${isReduction ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Diferença</div>
              <div className={`text-sm font-black flex items-center justify-center gap-1 ${isReduction ? 'text-amber-600' : 'text-blue-600'}`}>
                {isReduction ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                R$ {fmt(Math.abs(diff))}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Novo Valor</div>
              <div className="text-sm font-black text-slate-700 dark:text-white">R$ {fmt(newTotal)}</div>
            </div>
          </div>

          {/* Alertas de situações especiais */}
          {dpPaid && dpChanged && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-400">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span><strong>Atenção:</strong> A entrada já foi recebida (R$ {fmt(paidInstallments.find(i => i.number === 0)?.paidValue ?? data.oldDP)}). O ajuste foi calculado ignorando a entrada paga.</span>
            </div>
          )}
          {pmChanged && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-400">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span><strong>Forma de pagamento alterada:</strong> {oldPM?.name || '—'} → {newPM?.name || '—'}. O nome será atualizado nas parcelas pendentes.</span>
            </div>
          )}
          {installmentsCountChanged && (
            <div className="flex items-start gap-2 p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl text-xs text-violet-700 dark:text-violet-400">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span><strong>Nº de parcelas alterado:</strong> {oldInstallmentsCount}x → {newInstallmentsCount}x. O saldo pendente (R$ {fmt(newPendingAmount)}) será redistribuído nas {pendingInstallments.length} parcelas pendentes.</span>
            </div>
          )}
          {dueDateChanged && (
            <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-400">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span><strong>Data do 1º vencimento alterada:</strong> {oldFirstDueDate} → {newFirstDueDate}. As datas das parcelas pendentes serão recalculadas.</span>
            </div>
          )}
          {wouldGoBelowZero && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-400">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span><strong>Atenção:</strong> A redução solicitada (R$ {fmt(Math.abs(diff))}) é maior que o saldo pendente (R$ {fmt(pendingAmount)}). Verifique os valores.</span>
            </div>
          )}

          {/* Parcelas já pagas — imutáveis */}
          {paidInstallments.length > 0 && (
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Parcelas já pagas (imutáveis)</div>
              <div className="space-y-1">
                {paidInstallments.map(inst => (
                  <div key={inst.id} className="flex items-center justify-between px-3 py-2 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check size={12} className="text-green-600" />
                      <span className="text-xs font-bold text-green-700 dark:text-green-400">
                        {inst.number === 0 ? 'Entrada' : `Parcela ${inst.number}`}
                      </span>
                      {inst.paidDate && <span className="text-[10px] text-green-600">[pago {new Date(inst.paidDate + 'T12:00:00').toLocaleDateString('pt-BR')}]</span>}
                    </div>
                    <span className="text-xs font-black text-green-700 dark:text-green-400">R$ {fmt(inst.paidValue ?? inst.value)}</span>
                  </div>
                ))}
              </div>
              <div className="text-right text-[10px] text-slate-400 mt-1">Total já recebido: <strong className="text-green-600">R$ {fmt(paidAmount)}</strong></div>
            </div>
          )}

          {/* Escolha de estratégia */}
          {pendingInstallments.length > 0 && Math.abs(diff) > 0.01 && (
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                Como aplicar o ajuste de {isReduction ? 'redução' : 'aumento'} (R$ {fmt(Math.abs(diff))}) nas parcelas pendentes?
              </div>
              <div className="space-y-2">

                {/* Proporcional */}
                <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${strategy === 'proportional' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                  <input type="radio" name="strategy" value="proportional" checked={strategy === 'proportional'} onChange={() => setStrategy('proportional')} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-white">
                      <BarChart2 size={13} /> Redistribuir proporcionalmente nas {pendingInstallments.length} pendentes
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">O saldo de R$ {fmt(newPendingAmount)} é dividido igualmente nas parcelas ainda não pagas.</div>
                  </div>
                </label>

                {/* Última parcela */}
                <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${strategy === 'last_installment' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                  <input type="radio" name="strategy" value="last_installment" checked={strategy === 'last_installment'} onChange={() => setStrategy('last_installment')} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-white">
                      <ArrowDown size={13} /> Concentrar na última parcela pendente
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Última parcela: R$ {fmt(pendingInstallments[pendingInstallments.length - 1]?.value)} → R$ {fmt((pendingInstallments[pendingInstallments.length - 1]?.value ?? 0) + diff)}
                    </div>
                  </div>
                </label>

                {/* Nova parcela (só para aumentos) */}
                {!isReduction && (
                  <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${strategy === 'new_installment' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                    <input type="radio" name="strategy" value="new_installment" checked={strategy === 'new_installment'} onChange={() => setStrategy('new_installment')} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-white">
                        <Plus size={13} /> Criar parcela de ajuste separada (R$ {fmt(diff)})
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">As parcelas existentes não mudam. Uma nova parcela de aditivo é criada.</div>
                      {strategy === 'new_installment' && (
                        <div className="mt-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Vencimento da nova parcela *</label>
                          <input
                            type="date"
                            value={extraDueDate}
                            onChange={e => setExtraDueDate(e.target.value)}
                            className="w-full p-2 border-2 border-blue-300 rounded-lg text-xs font-bold outline-none focus:border-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Preview das parcelas resultantes */}
          {pendingInstallments.length > 0 && Math.abs(diff) > 0.01 && (
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Preview — parcelas após o ajuste</div>
              <div className="space-y-1">
                {preview.map((inst, i) => (
                  <div key={inst.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Parcela {inst.number}</span>
                      {inst.dueDate && (
                        <span className="text-[10px] text-slate-400">
                          {new Date(inst.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {pendingInstallments[i]?.value !== inst.value && (
                        <span className="text-[10px] text-slate-400 line-through">R$ {fmt(pendingInstallments[i]?.value ?? inst.value)}</span>
                      )}
                      <span className="text-xs font-black text-slate-800 dark:text-white">R$ {fmt(inst.value)}</span>
                    </div>
                  </div>
                ))}
                {strategy === 'new_installment' && (
                  <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600">+ Nova parcela (aditivo)</span>
                      {extraDueDate && (
                        <span className="text-[10px] text-blue-400">
                          {new Date(extraDueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-black text-blue-700">R$ {fmt(diff)}</span>
                  </div>
                )}
              </div>
              <div className="text-right text-[10px] text-slate-400 mt-1">
                Total a receber após ajuste: <strong className="text-slate-700 dark:text-white">R$ {fmt(newPendingAmount + paidAmount)}</strong>
              </div>
            </div>
          )}

          {/* Sem parcelas pendentes */}
          {pendingInstallments.length === 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl text-xs text-amber-700 text-center font-bold">
              Todas as parcelas já foram pagas. Não há saldo pendente para ajustar.
              {diff > 0 && ' Uma nova parcela de aditivo será criada.'}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button onClick={onCancel} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-black text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            <X size={14} /> Cancelar
          </button>
          <button
            onClick={() => onConfirm(strategy, strategy === 'new_installment' ? extraDueDate : undefined)}
            disabled={!canConfirm || wouldGoBelowZero}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs transition-all shadow-lg shadow-blue-600/30"
          >
            <Check size={14} /> Confirmar Ajuste Financeiro
          </button>
        </div>
      </div>
    </div>
  );
};
