import React, { useState } from 'react';
import { Plus, Pencil, Trash2, X, Landmark, ToggleLeft, ToggleRight } from 'lucide-react';
import { BankAccount } from '../types';

const ACCOUNT_TYPES: { value: BankAccount['accountType']; label: string }[] = [
  { value: 'corrente',     label: 'Conta Corrente' },
  { value: 'poupanca',     label: 'Poupança' },
  { value: 'pagamento',    label: 'Conta de Pagamento' },
  { value: 'investimento', label: 'Investimento' },
  { value: 'caixa',        label: 'Caixa (dinheiro)' },
];

interface BankAccountFormProps {
  initial?: BankAccount | null;
  onSave: (data: Partial<BankAccount> & { name: string }) => Promise<any>;
  onClose: () => void;
}

const BankAccountForm: React.FC<BankAccountFormProps> = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState({
    name: initial?.name || '',
    bankName: initial?.bankName || '',
    accountType: initial?.accountType || 'corrente' as BankAccount['accountType'],
    agency: initial?.agency || '',
    accountNumber: initial?.accountNumber || '',
    pixKey: initial?.pixKey || '',
    notes: initial?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { alert('Informe o nome da conta.'); return; }
    setSaving(true);
    await onSave({ ...initial, ...form });
    onClose();
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="management-modal rounded-3xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Landmark size={18} className="text-[var(--primary-color)]" />
            {initial ? 'Editar Conta' : 'Nova Conta Bancária'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Nome da Conta *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Bradesco Principal, Caixa Loja..." className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Banco</label>
              <input value={form.bankName} onChange={e => set('bankName', e.target.value)} placeholder="Ex: Bradesco, Itaú..." className="management-input w-full p-2.5" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Tipo</label>
              <select value={form.accountType} onChange={e => set('accountType', e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-sm appearance-none">
                {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Agência</label>
              <input value={form.agency} onChange={e => set('agency', e.target.value)} placeholder="0001" className="management-input w-full p-2.5" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Conta</label>
              <input value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} placeholder="12345-6" className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-sm" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Chave Pix</label>
            <input value={form.pixKey} onChange={e => set('pixKey', e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" className="management-input w-full p-2.5" />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Observações</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-sm resize-none" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-2xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancelar</button>
          <button disabled={saving} onClick={handleSubmit} className="flex-1 py-2.5 rounded-2xl bg-[var(--primary-color)] text-white font-bold hover:opacity-90 transition-all disabled:opacity-60">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface BankAccountsViewProps {
  bankAccounts: BankAccount[];
  onSave: (data: Partial<BankAccount> & { name: string }) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string) => Promise<void>;
  canEdit?: boolean;
}

export const BankAccountsView: React.FC<BankAccountsViewProps> = ({ bankAccounts, onSave, onDelete, onToggle, canEdit = true }) => {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<BankAccount | null>(null);

  const handleEdit = (ba: BankAccount) => { setEditItem(ba); setShowForm(true); };
  const handleNew = () => { setEditItem(null); setShowForm(true); };

  return (
    <div className="space-y-6">
      <div className="management-container">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="font-black text-slate-800 dark:text-white flex items-center gap-2 text-lg">
              <Landmark size={20} className="text-[var(--primary-color)]" />
              Contas Bancárias
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Cadastre as contas para destino de recebimentos e pagamentos</p>
          </div>
          {canEdit && (
            <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--primary-color)] text-white font-bold text-sm hover:opacity-90 transition-all shadow-sm">
              <Plus size={16} /> Nova Conta
            </button>
          )}
        </div>

        {bankAccounts.length === 0 ? (
          <div className="py-16 text-center">
            <Landmark size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
            <p className="font-bold text-slate-400">Nenhuma conta cadastrada</p>
            <p className="text-xs text-slate-400 mt-1">Cadastre bancos e caixas para registrar destinos de pagamento</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {bankAccounts.map(ba => (
              <div key={ba.id} className={`flex items-center gap-4 px-6 py-4 management-row-hover !bg-transparent ${!ba.active ? 'opacity-50' : ''}`}>
                <div className="w-10 h-10 rounded-2xl bg-[var(--primary-color)]/10 flex items-center justify-center shrink-0">
                  <Landmark size={18} className="text-[var(--primary-color)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {ba.code && <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">#{ba.code}</span>}
                    <p className="font-black text-slate-800 dark:text-white text-sm">{ba.name}</p>
                    {!ba.active && <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">Inativo</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    {ba.bankName && <span className="text-xs text-slate-500">{ba.bankName}</span>}
                    {ba.bankName && <span className="text-slate-300">·</span>}
                    <span className="text-xs text-slate-400">{ACCOUNT_TYPES.find(t => t.value === ba.accountType)?.label}</span>
                    {ba.agency && <><span className="text-slate-300">·</span><span className="text-xs text-slate-400">Ag {ba.agency}</span></>}
                    {ba.accountNumber && <><span className="text-slate-300">·</span><span className="text-xs text-slate-400">Cc {ba.accountNumber}</span></>}
                    {ba.pixKey && <><span className="text-slate-300">·</span><span className="text-xs text-blue-500 font-bold">Pix: {ba.pixKey}</span></>}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onToggle(ba.id)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-all" title={ba.active ? 'Desativar' : 'Ativar'}>
                      {ba.active ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
                    </button>
                    <button onClick={() => handleEdit(ba)} className="p-2 rounded-xl hover:bg-orange-50 dark:hover:bg-slate-700 text-slate-400 hover:text-[var(--primary-color)] transition-all" title="Editar">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => { if (window.confirm(`Excluir "${ba.name}"?`)) onDelete(ba.id); }} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-all" title="Excluir">
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <BankAccountForm
          initial={editItem}
          onSave={onSave}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
};
