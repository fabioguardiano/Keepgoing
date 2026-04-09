import React, { useState, useMemo } from 'react';
import {
  Plus, X, Check, Trash2, Edit2, Anchor, TrendingUp, ChevronDown, ChevronUp,
  Search, AlertTriangle, Receipt, DollarSign, Info, Ban,
} from 'lucide-react';
import { AccountPayable, BillCategory, BillTransaction, PayablePaymentMethod, Supplier, AccountPlanItem, AccountGroup } from '../types';
import { fmt, fmtDate } from '../utils/formatting';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];

const formatCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const amount = parseInt(digits) / 100;
  return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const isBillOverdue = (b: AccountPayable) => {
  if (b.status === 'quitado' || b.status === 'cancelado') return false;
  const now = new Date();
  // Se tem parcelas, só é atrasado se houver parcela não paga com vencimento passado
  if (b.installments && b.installments.length > 0) {
    return b.installments.some(
      inst => inst.status !== 'pago' && new Date(inst.dueDate + 'T23:59:59') < now
    );
  }
  // Sem parcelas: usa o vencimento geral da conta
  return new Date(b.dueDate + 'T23:59:59') < now;
};


const RECURRENCE_LABEL: Record<string, string> = {
  none: 'Sem Recorrência',
  monthly: 'Mensal',
  yearly: 'Anual',
};

// ─── NatureBadge ──────────────────────────────────────────────────────────────
const NatureBadge = ({ nature }: { nature: 'Fixa' | 'Variável' }) =>
  nature === 'Fixa' ? (
    <span className="flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
      <Anchor size={9} /> Fixa
    </span>
  ) : (
    <span className="flex items-center gap-1 text-[10px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md">
      <TrendingUp size={9} /> Variável
    </span>
  );

// ─── StatusBadge ──────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  pendente:  'bg-yellow-100 text-yellow-700',
  parcial:   'bg-blue-100 text-blue-700',
  quitado:   'bg-green-100 text-green-700',
  cancelado: 'bg-slate-100 text-slate-400',
  atrasado:  'bg-red-100 text-red-600',
};
const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente', parcial: 'Parcial', quitado: 'Quitado', cancelado: 'Cancelado', atrasado: 'Atrasado',
};
const StatusBadge = ({ bill }: { bill: AccountPayable }) => {
  const key = isBillOverdue(bill) && bill.status === 'pendente' ? 'atrasado' : bill.status;
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${STATUS_STYLE[key]}`}>{STATUS_LABEL[key]}</span>;
};

// ─── SettleBillModal ─────────────────────────────────────────────────────────
interface SettleProps {
  bill: AccountPayable;
  paymentMethods: PayablePaymentMethod[];
  onSettle: (tx: { date: string; paidValue: number; interest: number; discount: number; paymentMethodId?: string; paymentMethodName?: string; receipt?: string; notes?: string }) => Promise<boolean>;
  onClose: () => void;
}
const SettleBillModal: React.FC<SettleProps> = ({ bill, paymentMethods, onSettle, onClose }) => {
  const [paidDate, setPaidDate] = useState(todayStr());
  const [paidValue, setPaidValue] = useState(formatCurrencyInput(bill.remainingValue.toFixed(2).replace('.', '')));
  const [interestOverride, setInterestOverride] = useState('');
  const [discount, setDiscount] = useState('');
  const [pmId, setPmId] = useState('');
  const [receipt, setReceipt] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const paidN    = parseFloat(paidValue.replace(/\./g, '').replace(',', '.')) || 0;
  const discN    = parseFloat(discount.replace(/\./g, '').replace(',', '.')) || 0;
  const effDue   = Math.max(0, bill.remainingValue - discN);          // principal after discount
  const autoInt  = Math.max(0, paidN - effDue);                       // excess = juros paid
  const intN     = interestOverride !== '' ? (parseFloat(interestOverride.replace(/\./g, '').replace(',', '.')) || 0) : autoInt;
  const applied  = Math.max(0, paidN - intN);                         // principal reduction
  const afterPay = Math.max(0, bill.remainingValue - discN - applied);
  const isFullSettlement = afterPay < 0.01;

  const handleSubmit = async () => {
    if (paidN <= 0) return alert('Informe o valor pago.');
    if (!paidDate) return alert('Informe a data do pagamento.');
    setSaving(true);
    const pm = paymentMethods.find(p => p.id === pmId);
    const ok = await onSettle({
      date: paidDate,
      paidValue: paidN,
      interest: intN,
      discount: discN,
      paymentMethodId: pmId || undefined,
      paymentMethodName: pm?.name,
      receipt: receipt || undefined,
      notes: notes || undefined,
    });
    setSaving(false);
    if (ok) onClose();
    else alert('Erro ao registrar o pagamento. Tente novamente.');
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
              <DollarSign size={17} className="text-[var(--primary-color)]" /> Registrar Baixa
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[280px]">{bill.description}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Resumo */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Saldo em Aberto</p>
              <p className="text-2xl font-black text-red-500">R$ {fmt(bill.remainingValue)}</p>
            </div>
            {bill.supplierName && <p className="text-xs text-slate-500 font-medium">{bill.supplierName}</p>}
          </div>

          {/* Data e valor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Data do Pagamento</label>
              <input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Valor Pago *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={paidValue}
                  onChange={e => {
                    setPaidValue(formatCurrencyInput(e.target.value));
                    setInterestOverride('');
                  }}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30"
                />
              </div>
            </div>
          </div>

          {/* Juros e desconto */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                Juros / Multa
                {autoInt > 0 && interestOverride === '' && (
                  <span className="text-amber-500 font-bold normal-case">(auto)</span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-500">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={interestOverride !== '' ? interestOverride : (autoInt > 0 ? formatCurrencyInput(autoInt.toFixed(2).replace('.', '')) : '')}
                  onChange={e => setInterestOverride(formatCurrencyInput(e.target.value))}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Desconto</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-green-500">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={discount}
                  onChange={e => setDiscount(formatCurrencyInput(e.target.value))}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3 py-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400/30 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Resultado */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${isFullSettlement ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800' : 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800'}`}>
            {isFullSettlement
              ? <><Check size={16} className="text-green-500 flex-shrink-0" /><span className="text-sm font-black text-green-700 dark:text-green-400">Liquidação total — conta será marcada como Quitada</span></>
              : <><Info size={16} className="text-blue-500 flex-shrink-0" /><span className="text-sm font-black text-blue-700 dark:text-blue-400">Pagamento parcial — Restará R$ {fmt(afterPay)}</span></>
            }
          </div>

          {/* Forma de pagamento */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Forma de Pagamento</label>
            <select value={pmId} onChange={e => setPmId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30">
              <option value="">Selecione...</option>
              {paymentMethods.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Comprovante e notas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Comprovante / Nº</label>
              <input type="text" value={receipt} onChange={e => setReceipt(e.target.value)} placeholder="Nº ou URL"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Observação</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30" />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-500 hover:bg-slate-50 transition-all">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving || paidN <= 0}
            className="flex-2 px-6 py-2.5 bg-[var(--primary-color)] text-white rounded-2xl font-bold text-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition-all">
            <Check size={15} /> {saving ? 'Registrando...' : 'Confirmar Baixa'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── NewBillModal ─────────────────────────────────────────────────────────────
interface NewBillProps {
  categories: BillCategory[];
  accountPlan: AccountPlanItem[];
  accountGroups: AccountGroup[];
  suppliers: Supplier[];
  paymentMethods: PayablePaymentMethod[];
  editData?: AccountPayable | null;
  onSave: (ap: any) => Promise<any>;
  onClose: () => void;
}
const NewBillModal: React.FC<NewBillProps> = ({ categories, accountPlan, accountGroups, suppliers, paymentMethods, editData, onSave, onClose }) => {
  const isEdit = !!editData?.id;
  const [desc, setDesc] = useState(editData?.description || '');
  const [categoryId, setCategoryId] = useState(editData?.categoryId || '');
  const [accountPlanId, setAccountPlanId] = useState(editData?.accountPlanId || '');
  const [supplierId, setSupplierId] = useState(editData?.supplierId || '');
  const [supplierName, setSupplierName] = useState(editData?.supplierName || '');
  const [totalValue, setTotalValue] = useState(editData?.totalValue ? formatCurrencyInput(editData.totalValue.toFixed(2).replace('.', '')) : '');
  const [dueDate, setDueDate] = useState(editData?.dueDate || todayStr());
  const [competenceDate, setCompetenceDate] = useState(editData?.competenceDate || '');
  const [recurrence, setRecurrence] = useState<'none' | 'monthly' | 'yearly'>(editData?.recurrence || 'none');
  const [pmId, setPmId] = useState(editData?.paymentMethodId || '');
  const [notes, setNotes] = useState(editData?.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSupplierChange = (id: string) => {
    setSupplierId(id);
    const sup = suppliers.find(s => s.id === id);
    setSupplierName(sup?.tradingName || sup?.legalName || '');
  };

  const handleSave = async () => {
    if (!desc.trim()) return alert('Informe a descrição.');
    const tv = parseFloat(totalValue.replace(/\./g, '').replace(',', '.')) || 0;
    if (!tv || tv <= 0) return alert('Informe o valor total.');
    if (!dueDate) return alert('Informe a data de vencimento.');
    setSaving(true);
    const pm = paymentMethods.find(p => p.id === pmId);
    const cat = categories.find(c => c.id === categoryId);
    const planItem = accountPlan.find(p => p.id === accountPlanId);
    await onSave({
      id: editData?.id,
      description: desc.trim(),
      supplierId: supplierId || undefined,
      supplierName: supplierName || undefined,
      totalValue: tv,
      paidValue: editData?.paidValue || 0,
      installments: editData?.installments || [],
      transactions: editData?.transactions || [],
      paymentMethodId: pmId || undefined,
      paymentMethodName: pm?.name,
      category: planItem?.name || cat?.name || 'Outros',
      categoryId: categoryId || undefined,
      accountPlanId: accountPlanId || undefined,
      accountPlanName: planItem?.name,
      dueDate,
      competenceDate: competenceDate || undefined,
      recurrence,
      notes,
      status: editData?.status || 'pendente',
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-black text-slate-800 dark:text-white">{isEdit ? 'Editar Conta' : 'Nova Conta a Pagar'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Descrição */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Descrição *</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Compra de material — NF 12345"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30" />
          </div>

          {/* Conta do Plano de Contas */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              Conta Analítica *
            </label>
            {accountPlan.length > 0 ? (
              <>
                <select
                  required
                  value={accountPlanId}
                  onChange={e => {
                    setAccountPlanId(e.target.value);
                    // auto-preenche forma de pagamento padrão da conta
                    const item = accountPlan.find(p => p.id === e.target.value);
                    if (item?.defaultPaymentMethod && !pmId) {
                      const match = paymentMethods.find(p => p.name === item.defaultPaymentMethod);
                      if (match) setPmId(match.id);
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30"
                >
                  <option value="">— Selecione uma conta —</option>
                  {accountGroups.map(g => {
                    const items = accountPlan.filter(p => p.groupId === g.id && p.active);
                    if (items.length === 0) return null;
                    return (
                      <optgroup key={g.id} label={`${g.code} — ${g.name}`}>
                        {items.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.code} · {item.name} ({item.costType})
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
                {accountPlanId && (() => {
                  const item = accountPlan.find(p => p.id === accountPlanId);
                  if (!item) return null;
                  return (
                    <div className="mt-2 flex items-center gap-2">
                      <NatureBadge nature={item.costType === 'Fixo' ? 'Fixa' : 'Variável'} />
                      {item.defaultPaymentMethod && (
                        <span className="text-[10px] text-slate-400">Meio padrão: {item.defaultPaymentMethod}</span>
                      )}
                    </div>
                  );
                })()}
              </>
            ) : (
              /* Fallback: categorias legadas se plano de contas não configurado */
              <div>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map(cat => (
                    <button key={cat.id} type="button" onClick={() => setCategoryId(cat.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all text-left ${categoryId === cat.id ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/5' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-amber-500 mt-2">Configure o Plano de Contas para substituir as categorias manuais.</p>
              </div>
            )}
          </div>

          {/* Fornecedor */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Fornecedor</label>
            <select value={supplierId} onChange={e => handleSupplierChange(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30">
              <option value="">Nenhum / Avulso</option>
              {suppliers.filter(s => s.status !== 'inativo').map(s => (
                <option key={s.id} value={s.id}>{s.tradingName || s.legalName}</option>
              ))}
            </select>
            {!supplierId && (
              <input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Nome avulso (opcional)"
                className="w-full px-4 py-2 mt-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30" />
            )}
          </div>

          {/* Valor e datas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Valor Total *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={totalValue}
                  onChange={e => setTotalValue(formatCurrencyInput(e.target.value))}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Vencimento *</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Competência</label>
              <input type="date" value={competenceDate} onChange={e => setCompetenceDate(e.target.value)}
                className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Recorrência</label>
              <select value={recurrence} onChange={e => setRecurrence(e.target.value as any)}
                className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30">
                <option value="none">Sem recorrência</option>
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
          </div>

          {/* Forma de pagamento e notas */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Forma de Pagamento</label>
            <select value={pmId} onChange={e => setPmId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30">
              <option value="">A definir</option>
              {paymentMethods.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Informações adicionais..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-500 hover:bg-slate-50 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-2 px-8 py-2.5 bg-[var(--primary-color)] text-white rounded-2xl font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all">
            {saving ? 'Salvando...' : isEdit ? 'Atualizar' : 'Cadastrar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── BillRow ──────────────────────────────────────────────────────────────────
interface BillRowProps {
  bill: AccountPayable;
  planItem?: AccountPlanItem;
  canEdit: boolean;
  onSettle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCancel: () => void;
}
const BillRow: React.FC<BillRowProps> = ({ bill, planItem, canEdit, onSettle, onEdit, onDelete, onCancel }) => {
  const [expanded, setExpanded] = useState(false);
  const overdue = isBillOverdue(bill);
  const pct = bill.totalValue > 0 ? (bill.paidValue / bill.totalValue) * 100 : 0;

  return (
    <>
      <tr className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${overdue ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}>
        <td className="px-4 py-3 w-6">
          {planItem ? (
            <div title={`${planItem.costType} — ${planItem.name}`}>
              {planItem.costType === 'Fixo'
                ? <Anchor size={14} className="text-blue-400" />
                : <TrendingUp size={14} className="text-orange-400" />
              }
            </div>
          ) : null}
        </td>
        <td className="px-2 py-3"><StatusBadge bill={bill} /></td>
        <td className="px-4 py-3">
          <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{bill.description}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {bill.supplierName && <p className="text-xs text-slate-400">{bill.supplierName}</p>}
            {(planItem || bill.accountPlanName || bill.category) && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                {planItem?.name || bill.accountPlanName || bill.category}
              </span>
            )}
            {bill.recurrence && bill.recurrence !== 'none' && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-md">
                ↻ {RECURRENCE_LABEL[bill.recurrence]}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-slate-500">
          <p className="font-bold">{fmtDate(bill.dueDate)}</p>
          {bill.competenceDate && bill.competenceDate !== bill.dueDate && (
            <p className="text-[10px] text-slate-400">Comp: {fmtDate(bill.competenceDate)}</p>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <p className="font-black text-sm text-slate-800 dark:text-white">R$ {fmt(bill.totalValue)}</p>
          {bill.remainingValue > 0 && bill.remainingValue < bill.totalValue && (
            <p className="text-[10px] text-red-500">Restando: R$ {fmt(bill.remainingValue)}</p>
          )}
        </td>
        <td className="px-4 py-3 w-20">
          {bill.transactions.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-12 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-green-400 transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <span className="text-[10px] text-slate-400 font-bold">{bill.transactions.length}</span>
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-all">
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {canEdit && bill.status !== 'quitado' && bill.status !== 'cancelado' && (
              <button onClick={onSettle} className="p-1.5 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 text-slate-400 hover:text-green-600 transition-all" title="Registrar Baixa">
                <DollarSign size={15} />
              </button>
            )}
            {canEdit && (
              <button onClick={onEdit} className="p-1.5 rounded-xl hover:bg-orange-50 dark:hover:bg-slate-700 text-slate-400 hover:text-[var(--primary-color)] transition-all" title="Editar">
                <Edit2 size={14} />
              </button>
            )}
            {canEdit && bill.status !== 'cancelado' && (
              <button onClick={onCancel} className="p-1.5 rounded-xl hover:bg-amber-50 dark:hover:bg-slate-700 text-slate-400 hover:text-amber-500 transition-all" title="Cancelar conta">
                <Ban size={14} />
              </button>
            )}
            {canEdit && (
              <button onClick={onDelete} className="p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-all" title="Excluir">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Histórico de baixas */}
      {expanded && (
        <tr>
          <td colSpan={7} className="px-4 pb-4 bg-slate-50 dark:bg-slate-800/50">
            <div className="pt-2 space-y-1.5">
              {bill.transactions.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 pl-2 italic">Nenhuma baixa registrada.</p>
              ) : bill.transactions.map((tx: BillTransaction) => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Check size={12} className="text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 dark:text-white">{fmtDate(tx.date)}</p>
                    {tx.paymentMethodName && <p className="text-[10px] text-slate-400">{tx.paymentMethodName}</p>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-right flex-shrink-0">
                    {tx.interest > 0 && <span className="text-amber-600 font-bold">+R$ {fmt(tx.interest)} juros</span>}
                    {tx.discount > 0 && <span className="text-green-600 font-bold">-R$ {fmt(tx.discount)} desc.</span>}
                    <span className="font-black text-slate-800 dark:text-white">R$ {fmt(tx.paidValue)}</span>
                    {tx.receipt && (
                      <span className="flex items-center gap-0.5 text-blue-500"><Receipt size={11} />{tx.receipt}</span>
                    )}
                  </div>
                </div>
              ))}
              {bill.status === 'cancelado' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700/50 rounded-xl text-xs text-slate-500 font-bold">
                  <Ban size={12} /> Conta cancelada
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ─── PayablesView ─────────────────────────────────────────────────────────────
interface Props {
  accounts: AccountPayable[];
  paymentMethods: PayablePaymentMethod[];
  suppliers: Supplier[];
  categories: BillCategory[];
  accountPlan: AccountPlanItem[];
  accountGroups: AccountGroup[];
  onSave: (ap: any) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
  onSettle: (id: string, tx: any) => Promise<boolean>;
  onCancel: (id: string) => Promise<boolean>;
  canEdit: boolean;
}

export const PayablesView: React.FC<Props> = ({
  accounts, paymentMethods, suppliers, categories, accountPlan, accountGroups,
  onSave, onDelete, onSettle, onCancel, canEdit,
}) => {
  const [showNew, setShowNew] = useState(false);
  const [editData, setEditData] = useState<AccountPayable | null>(null);
  const [settlingBill, setSettlingBill] = useState<AccountPayable | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [natureFilter, setNatureFilter] = useState<string>('todos');
  const [catFilter, setCatFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'mes' | 'mes_passado' | 'ano' | 'todos' | 'personalizado'>('mes');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => {
    const now = new Date();
    return accounts.filter(a => {
      // status
      if (statusFilter !== 'todos') {
        const isOverdue = isBillOverdue(a) && a.status === 'pendente';
        if (statusFilter === 'atrasado' && !isOverdue) return false;
        if (statusFilter !== 'atrasado' && a.status !== statusFilter) return false;
      }
      // nature filter (via account plan costType)
      if (natureFilter !== 'todos') {
        const planItem = accountPlan.find(p => p.id === a.accountPlanId);
        const costType = planItem?.costType === 'Fixo' ? 'Fixa' : planItem?.costType === 'Variável' ? 'Variável' : null;
        if (!costType || costType !== natureFilter) return false;
      }
      // specific account plan item filter
      if (catFilter && a.accountPlanId !== catFilter) return false;
      // search
      if (search) {
        const q = search.toLowerCase();
        if (!a.description.toLowerCase().includes(q) && !(a.supplierName || '').toLowerCase().includes(q)) return false;
      }
      // date
      const d = new Date(a.dueDate + 'T12:00:00');
      if (dateFilter === 'mes') {
        if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return false;
      } else if (dateFilter === 'mes_passado') {
        const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        if (d.getFullYear() !== pm.getFullYear() || d.getMonth() !== pm.getMonth()) return false;
      } else if (dateFilter === 'ano') {
        if (d.getFullYear() !== now.getFullYear()) return false;
      } else if (dateFilter === 'personalizado') {
        const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
        const to   = dateTo   ? new Date(dateTo   + 'T23:59:59') : null;
        if (from && d < from) return false;
        if (to   && d > to)   return false;
      }
      return true;
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [accounts, statusFilter, natureFilter, catFilter, search, dateFilter, dateFrom, dateTo, accountPlan]);

  // KPIs (all, not just filtered)
  const { totalPendente, totalPago, totalGeral, atrasados } = useMemo(() => ({
    totalPendente: accounts.filter(a => a.status !== 'quitado' && a.status !== 'cancelado').reduce((s, a) => s + a.remainingValue, 0),
    totalPago:     accounts.reduce((s, a) => s + a.paidValue, 0),
    totalGeral:    accounts.reduce((s, a) => s + a.totalValue, 0),
    atrasados:     accounts.filter(a => isBillOverdue(a)).length,
  }), [accounts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta conta a pagar?')) return;
    await onDelete(id);
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancelar esta conta? O registro será mantido como cancelado.')) return;
    await onCancel(id);
  };

  const STATUS_TABS = [
    { key: 'todos', label: 'Todos' },
    { key: 'pendente', label: 'Pendente' },
    { key: 'parcial', label: 'Parcial' },
    { key: 'atrasado', label: 'Atrasado' },
    { key: 'quitado', label: 'Quitado' },
    { key: 'cancelado', label: 'Cancelado' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white">Contas a Pagar</h2>
          <p className="text-slate-500 text-sm font-medium">Gerencie seus pagamentos e despesas</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button onClick={() => { setEditData(null); setShowNew(true); }}
              className="bg-[var(--primary-color)] text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-[var(--primary-color)]/20 hover:opacity-90 transition-all">
              <Plus size={18} /> Nova Conta
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">A Pagar</p>
          <p className="text-2xl font-black text-red-500">R$ {fmt(totalPendente)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pago</p>
          <p className="text-2xl font-black text-slate-700 dark:text-white">R$ {fmt(totalPago)}</p>
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
        {/* Filtros de status */}
        <div className="flex items-center gap-1 px-4 pt-4 border-b border-slate-100 dark:border-slate-800 overflow-x-auto pb-0">
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => setStatusFilter(t.key)}
              className={`px-3 py-2 text-xs font-black rounded-t-xl border-b-2 transition-all whitespace-nowrap ${statusFilter === t.key ? 'border-[var(--primary-color)] text-[var(--primary-color)]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Filtros secundários */}
        <div className="flex items-center gap-3 px-4 py-3 flex-wrap border-b border-slate-50 dark:border-slate-800">
          {/* Nature toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 gap-0.5">
            {[{ k: 'todos', l: 'Todas' }, { k: 'Fixa', l: '⚓ Fixas' }, { k: 'Variável', l: '📈 Variáveis' }].map(n => (
              <button key={n.k} onClick={() => setNatureFilter(n.k)}
                className={`px-3 py-1.5 rounded-[10px] text-[11px] font-black transition-all ${natureFilter === n.k ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400'}`}>
                {n.l}
              </button>
            ))}
          </div>

          {/* Account plan filter pills */}
          {accountPlan.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setCatFilter('')}
                className={`px-3 py-1 rounded-full text-[11px] font-black transition-all ${!catFilter ? 'bg-slate-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>
                Todas
              </button>
              {accountPlan.filter(p => p.active).map(p => (
                <button key={p.id} onClick={() => setCatFilter(catFilter === p.id ? '' : p.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-black transition-all ${catFilter === p.id ? 'bg-slate-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {/* Search e date filter à direita */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 w-36" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 gap-0.5">
                {[{ k: 'mes', l: 'Mês' }, { k: 'mes_passado', l: 'Anterior' }, { k: 'ano', l: 'Ano' }, { k: 'todos', l: 'Todos' }, { k: 'personalizado', l: 'Período' }].map(d => (
                  <button key={d.k} onClick={() => setDateFilter(d.k as any)}
                    className={`px-2 py-1.5 rounded-[10px] text-[11px] font-black transition-all ${dateFilter === d.k ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400'}`}>
                    {d.l}
                  </button>
                ))}
              </div>
              {dateFilter === 'personalizado' && (
                <div className="flex items-center gap-1.5">
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="px-2 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-white focus:outline-none focus:border-[var(--primary-color)]" />
                  <span className="text-[11px] text-slate-400 font-bold">até</span>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="px-2 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-white focus:outline-none focus:border-[var(--primary-color)]" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-2 w-6" />
                <th className="px-2 py-2 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Descrição</th>
                <th className="px-4 py-2 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Vencimento</th>
                <th className="px-4 py-2 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Valor</th>
                <th className="px-4 py-2 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Baixas</th>
                <th className="px-4 py-2 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <AlertTriangle size={32} className="mx-auto mb-2 text-slate-200" />
                    <p className="text-sm font-bold text-slate-400">Nenhuma conta encontrada</p>
                  </td>
                </tr>
              ) : filtered.map(bill => (
                <BillRow
                  key={bill.id}
                  bill={bill}
                  planItem={accountPlan.find(p => p.id === bill.accountPlanId)}
                  canEdit={canEdit}
                  onSettle={() => setSettlingBill(bill)}
                  onEdit={() => { setEditData(bill); setShowNew(true); }}
                  onDelete={() => handleDelete(bill.id)}
                  onCancel={() => handleCancel(bill.id)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
            <p className="text-[11px] text-slate-400 font-medium">{filtered.length} conta{filtered.length !== 1 ? 's' : ''}</p>
            <p className="text-[11px] font-black text-slate-600 dark:text-slate-300">
              Total filtrado: R$ {fmt(filtered.reduce((s, a) => s + a.totalValue, 0))}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {(showNew || editData) && (
        <NewBillModal
          categories={categories}
          accountPlan={accountPlan}
          accountGroups={accountGroups}
          suppliers={suppliers}
          paymentMethods={paymentMethods}
          editData={editData}
          onSave={onSave}
          onClose={() => { setShowNew(false); setEditData(null); }}
        />
      )}

      {settlingBill && (
        <SettleBillModal
          bill={settlingBill}
          paymentMethods={paymentMethods}
          onSettle={tx => onSettle(settlingBill.id, tx)}
          onClose={() => setSettlingBill(null)}
        />
      )}


    </div>
  );
};
