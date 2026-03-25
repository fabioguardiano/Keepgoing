import React, { useState, useMemo } from 'react';
import { Plus, Check, Clock, AlertCircle, X, ChevronDown, ChevronUp, Trash2, CheckCircle2, Search } from 'lucide-react';
import { AccountReceivable, AccountPayable, AccountInstallment, PaymentMethod, Client, Supplier } from '../types';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
const isOverdue = (dueDate: string, status: string) => status !== 'quitado' && status !== 'cancelado' && new Date(dueDate + 'T23:59:59') < new Date();
const genId = () => crypto.randomUUID();

const STATUS_STYLE: Record<string, string> = {
  pendente:  'bg-yellow-100 text-yellow-700',
  parcial:   'bg-blue-100 text-blue-700',
  quitado:   'bg-green-100 text-green-700',
  cancelado: 'bg-slate-100 text-slate-500',
  atrasado:  'bg-red-100 text-red-600',
};
const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente', parcial: 'Parcial', quitado: 'Quitado', cancelado: 'Cancelado', atrasado: 'Atrasado',
};

// ─────────────────────────────────────────────
// Modal de nova conta
// ─────────────────────────────────────────────
interface NewAccountModalProps {
  mode: 'receber' | 'pagar';
  paymentMethods: PaymentMethod[];
  clients?: Client[];
  suppliers?: Supplier[];
  editData?: AccountReceivable | AccountPayable | null;
  onSave: (data: any) => Promise<any>;
  onClose: () => void;
}

const generateInstallments = (total: number, n: number, firstDue: string): AccountInstallment[] => {
  const baseValue = Math.floor((total / n) * 100) / 100;
  const diff = Math.round((total - baseValue * n) * 100) / 100;
  const first = new Date(firstDue + 'T12:00:00');
  return Array.from({ length: n }, (_, i) => ({
    id: genId(),
    number: i + 1,
    dueDate: new Date(first.getFullYear(), first.getMonth() + i, first.getDate()).toISOString().split('T')[0],
    value: i === 0 ? baseValue + diff : baseValue,
    status: 'pendente' as const,
  }));
};

const NewAccountModal: React.FC<NewAccountModalProps> = ({ mode, paymentMethods, clients, suppliers, editData, onSave, onClose }) => {
  const isEdit = !!editData?.id;
  const [desc, setDesc] = useState(editData?.description || '');
  const [partyId, setPartyId] = useState(mode === 'receber' ? (editData as AccountReceivable)?.clientId || '' : (editData as AccountPayable)?.supplierId || '');
  const [partyName, setPartyName] = useState(mode === 'receber' ? (editData as AccountReceivable)?.clientName || '' : (editData as AccountPayable)?.supplierName || '');
  const [totalValue, setTotalValue] = useState(editData?.totalValue?.toString() || '');
  const [pmId, setPmId] = useState(editData?.paymentMethodId || '');
  const [category, setCategory] = useState(editData?.category || (mode === 'receber' ? 'Venda' : 'Fornecedor'));
  const [dueDate, setDueDate] = useState(editData?.dueDate || new Date().toISOString().split('T')[0]);
  const [installmentsN, setInstallmentsN] = useState(1);
  const [installments, setInstallments] = useState<AccountInstallment[]>(editData?.installments || []);
  const [notes, setNotes] = useState(editData?.notes || '');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'dados' | 'parcelas'>('dados');

  const pm = paymentMethods.find(p => p.id === pmId);
  const maxInstallments = pm?.installments ?? 1;

  const handleGenInstallments = () => {
    const total = parseFloat(totalValue.replace(',', '.')) || 0;
    if (!total || !dueDate) return;
    setInstallments(generateInstallments(total, installmentsN, dueDate));
    setTab('parcelas');
  };

  const handleSave = async () => {
    if (!desc.trim()) return alert('Informe a descrição.');
    const total = parseFloat(totalValue.replace(',', '.'));
    if (!total || total <= 0) return alert('Informe o valor total.');
    if (!dueDate) return alert('Informe a data de vencimento.');

    const finalInstallments = installments.length > 0 ? installments
      : generateInstallments(total, 1, dueDate);

    setSaving(true);
    try {
      const base = {
        id: editData?.id,
        description: desc,
        totalValue: total,
        paidValue: editData?.paidValue || 0,
        installments: finalInstallments,
        paymentMethodId: pmId || undefined,
        paymentMethodName: pm?.name || '',
        category,
        dueDate,
        notes,
        status: (editData?.status || 'pendente') as any,
      };
      if (mode === 'receber') {
        await onSave({ ...base, clientId: partyId || undefined, clientName: partyName });
      } else {
        await onSave({ ...base, supplierId: partyId || undefined, supplierName: partyName });
      }
      onClose();
    } catch { /* erro já tratado */ }
    finally { setSaving(false); }
  };

  const categories = mode === 'receber'
    ? ['Venda', 'Serviço', 'Comissão', 'Aluguel', 'Outros']
    : ['Fornecedor', 'Material', 'Serviço', 'Aluguel', 'Impostos', 'Salário', 'Outros'];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h3 className="font-black text-slate-800 dark:text-white">
            {isEdit ? 'Editar' : 'Nova'} Conta a {mode === 'receber' ? 'Receber' : 'Pagar'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X size={18} /></button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 shrink-0">
          {(['dados', 'parcelas'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${tab === t ? 'border-b-2 border-[var(--primary-color)] text-[var(--primary-color)]' : 'text-slate-400'}`}>
              {t === 'dados' ? 'Dados' : `Parcelas (${installments.length || installmentsN})`}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {tab === 'dados' ? (
            <>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Descrição *</label>
                <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descreva a conta..." className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-sm text-slate-800 dark:text-white" />
              </div>

              {/* Cliente ou Fornecedor */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">{mode === 'receber' ? 'Cliente' : 'Fornecedor'}</label>
                <select
                  value={partyId}
                  onChange={e => {
                    const list = mode === 'receber' ? clients : suppliers;
                    const item = list?.find(x => x.id === e.target.value);
                    setPartyId(e.target.value);
                    setPartyName(item ? ((item as any).tradingName || (item as any).name || '') : '');
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-sm text-slate-800 dark:text-white appearance-none"
                >
                  <option value="">-- Selecione --</option>
                  {(mode === 'receber' ? clients : suppliers)?.map((x: any) => (
                    <option key={x.id} value={x.id}>{x.tradingName || x.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Valor Total (R$) *</label>
                  <input type="number" min={0} step={0.01} value={totalValue} onChange={e => setTotalValue(e.target.value)} placeholder="0,00" className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-sm text-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Vencimento *</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-sm text-slate-800 dark:text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Categoria</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-sm text-slate-800 dark:text-white appearance-none">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Forma de Pagamento</label>
                  <select value={pmId} onChange={e => { setPmId(e.target.value); setInstallmentsN(1); }} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-sm text-slate-800 dark:text-white appearance-none">
                    <option value="">-- Selecione --</option>
                    {paymentMethods.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Parcelamento */}
              {maxInstallments > 1 && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Parcelamento</label>
                  <div className="flex items-center gap-3">
                    <select value={installmentsN} onChange={e => setInstallmentsN(parseInt(e.target.value))} className="flex-1 p-2.5 bg-white dark:bg-slate-700 rounded-xl border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-sm appearance-none">
                      {Array.from({ length: maxInstallments }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}x`} {pm && pm.installmentFee && n > 1 ? `(+${(pm.installmentFee * (n-1)).toFixed(2)}%)` : ''}</option>
                      ))}
                    </select>
                    <button onClick={handleGenInstallments} className="px-4 py-2.5 bg-[var(--primary-color)] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all whitespace-nowrap">
                      Gerar Parcelas
                    </button>
                  </div>
                  {pm?.anticipationDiscount && pm.anticipationDiscount > 0 && (
                    <p className="text-[10px] text-green-600 font-bold">✓ {pm.anticipationDiscount}% de desconto para antecipação</p>
                  )}
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Observações</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observações adicionais..." className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-sm text-slate-800 dark:text-white resize-none" />
              </div>
            </>
          ) : (
            /* Aba Parcelas */
            <div className="space-y-3">
              {installments.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  <p>Nenhuma parcela gerada.</p>
                  <button onClick={() => setTab('dados')} className="mt-2 text-[var(--primary-color)] font-bold text-sm hover:underline">Voltar aos dados para gerar</button>
                </div>
              ) : installments.map((inst, idx) => (
                <div key={inst.id} className={`flex items-center gap-4 p-3 rounded-2xl border ${inst.status === 'pago' ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${inst.status === 'pago' ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                    {inst.status === 'pago' ? <Check size={12} /> : inst.number}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-slate-800 dark:text-white">Parcela {inst.number}</p>
                    <p className="text-xs text-slate-400">{fmtDate(inst.dueDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm text-slate-800 dark:text-white">R$ {fmt(inst.value)}</p>
                    {inst.paidDate && <p className="text-[10px] text-green-600">Pago {fmtDate(inst.paidDate)}</p>}
                  </div>
                  {/* Editar vencimento */}
                  {inst.status !== 'pago' && (
                    <input
                      type="date" value={inst.dueDate}
                      onChange={e => setInstallments(prev => prev.map((x, i) => i === idx ? { ...x, dueDate: e.target.value } : x))}
                      className="text-xs p-1 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 outline-none font-bold"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3 shrink-0 border-t border-slate-100 dark:border-slate-800 pt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-2xl bg-[var(--primary-color)] text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60">
            <Check size={16} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Modal de baixa de pagamento
// ─────────────────────────────────────────────
interface PayInstallmentModalProps {
  account: AccountReceivable | AccountPayable;
  installment: AccountInstallment;
  onConfirm: (paidValue: number, paidDate: string) => Promise<void>;
  onClose: () => void;
}

const PayInstallmentModal: React.FC<PayInstallmentModalProps> = ({ account, installment, onConfirm, onClose }) => {
  const [paidValue, setPaidValue] = useState(installment.value.toString());
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-800 dark:text-white">Registrar Pagamento</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <p className="text-sm text-slate-500">Parcela {installment.number} — venc. {fmtDate(installment.dueDate)}</p>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Valor Pago (R$)</label>
          <input type="number" step={0.01} value={paidValue} onChange={e => setPaidValue(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-sm" />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Data do Pagamento</label>
          <input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-sm" />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-2xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancelar</button>
          <button disabled={saving} onClick={async () => { setSaving(true); await onConfirm(parseFloat(paidValue) || 0, paidDate); onClose(); setSaving(false); }} className="flex-1 py-2.5 rounded-2xl bg-green-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-all disabled:opacity-60">
            <CheckCircle2 size={16} /> {saving ? '...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Linha de conta na tabela
// ─────────────────────────────────────────────
const AccountRow = ({ account, onEdit, onDelete, onPayInstallment, onUnpayInstallment }: {
  account: AccountReceivable | AccountPayable;
  onEdit: () => void;
  onDelete: () => void;
  onPayInstallment: (inst: AccountInstallment) => void;
  onUnpayInstallment: (inst: AccountInstallment) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const overdue = isOverdue(account.dueDate, account.status);
  const statusKey = overdue && account.status === 'pendente' ? 'atrasado' : account.status;
  const pct = account.totalValue > 0 ? (account.paidValue / account.totalValue) * 100 : 0;

  return (
    <>
      <tr className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${overdue ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}>
        <td className="px-4 py-3">
          <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS_STYLE[statusKey]}`}>
            {STATUS_LABEL[statusKey]}
          </span>
        </td>
        <td className="px-4 py-3">
          <p className="font-bold text-sm text-slate-800 dark:text-white">{account.description}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-slate-400">{(account as any).clientName || (account as any).supplierName || ''}</p>
            {(account as any).orderNumber && (
              <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                {(account as any).orderNumber}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-xs font-bold text-slate-500">{account.category}</td>
        <td className="px-4 py-3 text-sm font-bold text-slate-500">{fmtDate(account.dueDate)}</td>
        <td className="px-4 py-3 text-right">
          <p className="font-black text-sm text-slate-800 dark:text-white">R$ {fmt(account.totalValue)}</p>
          {account.paidValue > 0 && account.paidValue < account.totalValue && (
            <p className="text-[10px] text-green-600">Pago: R$ {fmt(account.paidValue)}</p>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {account.installments.length > 0 && (
              <div className="w-16 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-green-400 transition-all" style={{ width: `${pct}%` }} />
              </div>
            )}
            <span className="text-[10px] text-slate-400 font-bold">{account.installments.length}x</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-all" title="Ver parcelas">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button onClick={onEdit} className="p-1.5 rounded-xl hover:bg-orange-50 dark:hover:bg-slate-700 text-slate-400 hover:text-[var(--primary-color)] transition-all" title="Editar">
              <Search size={15} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-all" title="Excluir">
              <Trash2 size={15} />
            </button>
          </div>
        </td>
      </tr>
      {/* Parcelas expandidas */}
      {expanded && (
        <tr>
          <td colSpan={7} className="px-4 pb-4 bg-slate-50 dark:bg-slate-800/50">
            <div className="grid gap-2 pt-2">
              {account.installments.length === 0 ? (
                <p className="text-sm text-slate-400 py-2 pl-2">Sem parcelas registradas.</p>
              ) : account.installments.map(inst => {
                const instOverdue = inst.status !== 'pago' && new Date(inst.dueDate + 'T23:59:59') < new Date();
                return (
                  <div key={inst.id} className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${inst.status === 'pago' ? 'bg-green-50 border-green-200 dark:border-green-900' : instOverdue ? 'bg-red-50 border-red-200 dark:border-red-900' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${inst.status === 'pago' ? 'bg-green-500 text-white' : instOverdue ? 'bg-red-400 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200'}`}>
                      {inst.status === 'pago' ? <Check size={10} /> : inst.number}
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-bold text-slate-700 dark:text-white">Parcela {inst.number} — </span>
                      <span className="text-xs text-slate-500">{fmtDate(inst.dueDate)}</span>
                      {instOverdue && inst.status !== 'pago' && <span className="ml-2 text-[10px] text-red-500 font-bold">ATRASADO</span>}
                    </div>
                    <span className="font-black text-sm text-slate-800 dark:text-white">R$ {fmt(inst.value)}</span>
                    {inst.status === 'pago' ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-green-600 font-bold">Pago {fmtDate(inst.paidDate || '')}</span>
                        <button
                          onClick={() => { if (window.confirm(`Estornar baixa da parcela ${inst.number}?`)) onUnpayInstallment(inst); }}
                          className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px] font-bold hover:bg-red-50 hover:text-red-500 transition-all flex items-center gap-1"
                          title="Estornar baixa"
                        >
                          <X size={10} /> Estornar
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => onPayInstallment(inst)} className="px-3 py-1 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition-all flex items-center gap-1 shrink-0">
                        <CheckCircle2 size={12} /> Baixar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ─────────────────────────────────────────────
// Componente principal AccountsView
// ─────────────────────────────────────────────
interface AccountsViewProps {
  mode: 'receber' | 'pagar';
  accounts: AccountReceivable[] | AccountPayable[];
  paymentMethods: PaymentMethod[];
  clients?: Client[];
  suppliers?: Supplier[];
  onSave: (data: any) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
  onPayInstallment: (accountId: string, installmentId: string, paidValue: number, paidDate: string) => Promise<void>;
  onUnpayInstallment: (accountId: string, installmentId: string) => Promise<void>;
  canEdit?: boolean;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  mode, accounts, paymentMethods, clients, suppliers, onSave, onDelete, onPayInstallment, onUnpayInstallment, canEdit = true,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState<AccountReceivable | AccountPayable | null>(null);
  const [payingInst, setPayingInst] = useState<{ account: AccountReceivable | AccountPayable; inst: AccountInstallment } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'mes_atual' | 'mes_passado' | 'ano_atual' | 'personalizado' | 'todos'>('mes_atual');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => {
    const now = new Date();
    const filterByDate = (a: AccountReceivable | AccountPayable) => {
      const d = new Date(a.dueDate + 'T12:00:00');
      if (dateFilter === 'mes_atual') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      if (dateFilter === 'mes_passado') {
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth();
      }
      if (dateFilter === 'ano_atual') return d.getFullYear() === now.getFullYear();
      if (dateFilter === 'personalizado') {
        const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
        const to   = dateTo   ? new Date(dateTo   + 'T23:59:59') : null;
        if (from && d < from) return false;
        if (to   && d > to  ) return false;
      }
      return true;
    };
    return (accounts as (AccountReceivable | AccountPayable)[])
      .filter(a => statusFilter === 'todos' || a.status === statusFilter || (statusFilter === 'atrasado' && isOverdue(a.dueDate, a.status)))
      .filter(filterByDate)
      .filter(a => !search || a.description.toLowerCase().includes(search.toLowerCase()) || ((a as any).clientName || (a as any).supplierName || '').toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [accounts, statusFilter, search, dateFilter, dateFrom, dateTo]);

  const totalPendente = (accounts as any[]).filter(a => a.status !== 'quitado' && a.status !== 'cancelado').reduce((acc, a) => acc + a.remainingValue, 0);
  const totalRecebido = (accounts as any[]).reduce((acc, a) => acc + a.paidValue, 0);
  const totalGeral    = (accounts as any[]).reduce((acc, a) => acc + a.totalValue, 0);
  const atrasados     = (accounts as any[]).filter(a => isOverdue(a.dueDate, a.status)).length;

  const accentColor = mode === 'receber' ? 'text-green-600' : 'text-red-500';
  const title = mode === 'receber' ? 'Contas a Receber' : 'Contas a Pagar';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white">{title}</h2>
          <p className="text-slate-500 text-sm font-medium">Gerencie seus {mode === 'receber' ? 'recebimentos' : 'pagamentos'}</p>
        </div>
        {canEdit && (
          <button onClick={() => { setEditData(null); setShowModal(true); }} className="bg-[var(--primary-color)] text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-[var(--primary-color)]/20 hover:opacity-90 transition-all">
            <Plus size={18} /> Nova Conta
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{mode === 'receber' ? 'A Receber' : 'A Pagar'}</p>
          <p className={`text-2xl font-black ${accentColor}`}>R$ {fmt(totalPendente)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{mode === 'receber' ? 'Recebido' : 'Pago'}</p>
          <p className="text-2xl font-black text-slate-700 dark:text-white">R$ {fmt(totalRecebido)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Geral</p>
          <p className="text-2xl font-black text-slate-700 dark:text-white">R$ {fmt(totalGeral)}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${atrasados > 0 ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-900' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Atrasados</p>
          <p className={`text-2xl font-black ${atrasados > 0 ? 'text-red-500' : 'text-slate-400'}`}>{atrasados}</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Barra de filtros — status */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex gap-1">
            {[
              { key: 'todos',    label: 'Todos' },
              { key: 'pendente', label: 'Pendente' },
              { key: 'parcial',  label: 'Parcial' },
              { key: 'atrasado', label: 'Atrasado' },
              { key: 'quitado',  label: 'Quitado' },
            ].map(f => (
              <button key={f.key} onClick={() => setStatusFilter(f.key)} className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${statusFilter === f.key ? 'bg-[var(--primary-color)] text-white' : 'bg-white dark:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-600 hover:border-[var(--primary-color)]'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[160px]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold outline-none focus:border-[var(--primary-color)]" />
            </div>
          </div>
        </div>
        {/* Barra de filtros — período */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Período:</span>
          {([
            { key: 'mes_atual',     label: 'Mês Atual' },
            { key: 'mes_passado',   label: 'Mês Passado' },
            { key: 'ano_atual',     label: 'Ano Atual' },
            { key: 'todos',         label: 'Todos' },
            { key: 'personalizado', label: 'Personalizado' },
          ] as { key: typeof dateFilter; label: string }[]).map(opt => (
            <button
              key={opt.key}
              onClick={() => setDateFilter(opt.key)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                dateFilter === opt.key
                  ? 'bg-[var(--primary-color)] text-white shadow-sm'
                  : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-[var(--primary-color)] hover:text-[var(--primary-color)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {dateFilter === 'personalizado' && (
            <div className="flex items-center gap-2 ml-1">
              <input
                type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-2 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-white outline-none focus:border-[var(--primary-color)]"
              />
              <span className="text-slate-400 text-xs font-bold">até</span>
              <input
                type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-2 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-white outline-none focus:border-[var(--primary-color)]"
              />
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <AlertCircle size={36} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
            <p className="font-bold text-slate-400">Nenhuma conta encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Parcelas</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(account => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    onEdit={() => { setEditData(account); setShowModal(true); }}
                    onDelete={() => setConfirmDelete(account.id)}
                    onPayInstallment={inst => setPayingInst({ account, inst })}
                    onUnpayInstallment={inst => onUnpayInstallment(account.id, inst.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modais */}
      {showModal && (
        <NewAccountModal
          mode={mode}
          paymentMethods={paymentMethods}
          clients={clients}
          suppliers={suppliers}
          editData={editData}
          onSave={onSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {payingInst && (
        <PayInstallmentModal
          account={payingInst.account}
          installment={payingInst.inst}
          onConfirm={(pv, pd) => onPayInstallment(payingInst.account.id, payingInst.inst.id, pv, pd)}
          onClose={() => setPayingInst(null)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <Trash2 size={40} className="text-red-400 mx-auto mb-3" />
            <h3 className="font-black text-slate-800 dark:text-white mb-2">Excluir conta?</h3>
            <p className="text-slate-500 text-sm mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-2xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancelar</button>
              <button onClick={async () => { await onDelete(confirmDelete); setConfirmDelete(null); }} className="flex-1 py-2.5 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
