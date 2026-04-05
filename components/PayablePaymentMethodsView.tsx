import React, { useState } from 'react';
import { Wallet, Plus, Check, X, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { PayablePaymentMethod, PaymentMethod } from '../types';

interface Props {
  payablePMs: PayablePaymentMethod[];
  paymentMethods: PaymentMethod[];
  onSave: (pm: Omit<PayablePaymentMethod, 'id' | 'createdAt'> & { id?: string }) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string) => Promise<void>;
}

export const PayablePaymentMethodsView: React.FC<Props> = ({ 
  payablePMs, paymentMethods, onSave, onDelete, onToggle 
}) => {
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingCode, setEditingCode] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const nextCode = (offset = 0) => {
    const codes = payablePMs.map(pm => parseInt(pm.code || '0')).filter(c => !isNaN(c) && c > 0);
    return (Math.max(0, ...codes) + 1 + offset).toString().padStart(2, '0');
  };

  const handleImport = async () => {
    const existingNames = new Set(payablePMs.map(pm => pm.name.toLowerCase().trim()));
    const toImport = paymentMethods.filter(pm => !existingNames.has(pm.name.toLowerCase().trim()));
    if (toImport.length === 0) return alert('Todas as formas de pagamento já foram importadas.');
    setImporting(true);
    try {
      for (let i = 0; i < toImport.length; i++) {
        const pm = toImport[i];
        await onSave({ code: nextCode(i), name: pm.name, active: pm.active });
      }
    } catch (err: any) {
      alert('Erro ao importar. Verifique sua conexão e tente novamente.');
    } finally {
      setImporting(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await onSave({ code: nextCode(), name: newName.trim(), active: true });
      setNewName('');
    } catch (err: any) {
      alert('Erro ao salvar. Verifique sua conexão e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (pm: PayablePaymentMethod) => {
    if (!editingName.trim()) return;
    setEditSaving(true);
    try {
      await onSave({ id: pm.id, code: editingCode.trim() || pm.code, name: editingName.trim(), active: pm.active });
      setEditingId(null);
    } catch (err: any) {
      alert('Erro ao salvar. Verifique sua conexão e tente novamente.');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="h-full max-w-5xl mx-auto space-y-6 px-4 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm text-emerald-600">
            <Wallet size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">Formas de Pagamento — CP</h1>
            <p className="text-sm text-slate-500 font-medium opacity-60">Cadastro de formas para o Contas a Pagar</p>
          </div>
        </div>
        <button
          onClick={handleImport}
          disabled={importing}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
        >
          {importing ? 'Importando...' : 'Importar de Recebimentos'}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Ex: PIX, TED, Boleto, Cheque..."
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim() || saving}
              className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-black hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              {saving ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {payablePMs.map(pm => (
              <div key={pm.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl group transition-all hover:bg-white hover:border-slate-200 hover:shadow-sm">
                {editingId === pm.id ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                        <input
                        value={editingCode}
                        onChange={e => setEditingCode(e.target.value)}
                        placeholder="Cód"
                        className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <input
                        autoFocus
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleEditSave(pm)}
                        disabled={editSaving}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold hover:bg-emerald-100 transition-colors"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${pm.active ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                      {pm.code && (
                        <span className="font-mono text-[10px] font-black text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded flex-shrink-0">
                          {pm.code}
                        </span>
                      )}
                      <span className={`text-sm font-bold truncate ${pm.active ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                        {pm.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                      <button
                        onClick={() => { setEditingId(pm.id); setEditingName(pm.name); setEditingCode(pm.code || ''); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-white transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => onToggle(pm.id)}
                        className="p-1.5 rounded-lg transition-colors text-slate-400 hover:bg-white"
                      >
                        {pm.active
                          ? <ToggleRight size={18} className="text-emerald-500" />
                          : <ToggleLeft size={18} className="text-slate-300" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
            <p className="text-xs text-blue-700 font-medium leading-relaxed">
              <strong>Dica:</strong> As formas de pagamento cadastradas aqui são exclusivas para o processo de contas a pagar (fornecedores). Use o botão de importar para sincronizar rapidamente com as formas que você já utiliza no recebimento de vendas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
