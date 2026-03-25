import React, { useState } from 'react';
import { Plus, Search, Edit2, PowerOff, X, Wallet, ChevronRight, Check, Trash2 } from 'lucide-react';
import { PaymentType } from '../types';

interface PaymentTypesViewProps {
  paymentTypes: PaymentType[];
  onSaveType: (type: PaymentType) => void;
  onDeleteType?: (id: string) => void;
  hideHeader?: boolean;
}

export const PaymentTypesView: React.FC<PaymentTypesViewProps> = ({ paymentTypes, onSaveType, onDeleteType, hideHeader = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<PaymentType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [formData, setFormData] = useState<Omit<PaymentType, 'id' | 'createdAt'>>({
    code: '',
    name: '',
    status: 'ativo'
  });

  const handleEdit = (type: PaymentType) => {
    setEditingType(type);
    setFormData({
      code: type.code || '',
      name: type.name,
      status: type.status || 'ativo'
    });
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    const codes = paymentTypes
      .map(t => parseInt(t.code || '0'))
      .filter(c => !isNaN(c));
    const nextCode = Math.max(0, ...codes) + 1;
    const nextCodeStr = nextCode.toString().padStart(2, '0');

    setEditingType(null);
    setFormData({ code: nextCodeStr, name: '', status: 'ativo' });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const type: PaymentType = {
      id: editingType?.id || '',
      createdAt: editingType?.createdAt || new Date().toISOString(),
      ...formData
    };
    onSaveType(type);
    setIsModalOpen(false);
  };

  const filteredTypes = paymentTypes.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = showInactive ? t.status === 'inativo' : t.status === 'ativo';
    return matchesSearch && matchesStatus;
  });

  const inputClass = "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all";
  const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {!hideHeader && (
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-2xl">
              <Wallet className="text-indigo-600" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">Tipos de Pagamento</h1>
              <p className="text-[11px] text-slate-500 font-medium">Categorização para o financeiro</p>
            </div>
          </div>
        )}
        <button
          onClick={handleAddNew}
          className={`${hideHeader ? 'ml-auto text-sm px-6 py-3' : 'px-8 py-4 text-base'} bg-primary text-white rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-primary/20 hover:bg-secondary transition-all transform hover:scale-[1.02] active:scale-95`}
        >
          <Plus size={hideHeader ? 16 : 20} strokeWidth={3} /> Novo Tipo
        </button>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
            <Check size={14} className="text-green-500" />
            {paymentTypes.filter(t => t.status === 'ativo').length} Ativos
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
            <PowerOff size={14} className="text-slate-300" />
            {paymentTypes.filter(t => t.status === 'inativo').length} Inativos
          </div>
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${showInactive ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'}`}
          >
            <PowerOff size={14} />
            {showInactive ? 'Ocultar Inativos' : 'Mostrar Inativos'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20">Cód.</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Pagamento</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data Cadastro</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTypes.map((t) => (
                <tr key={t.id} className={`hover:bg-slate-50/50 transition-colors group ${t.status === 'inativo' ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-2.5 text-[10px] font-black text-slate-800">
                    {t.code || '-'}
                  </td>
                  <td className="px-5 py-2.5">
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{t.name}</span>
                  </td>
                  <td className="px-5 py-2.5 text-[10px] font-bold text-slate-500">
                    {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-5 py-2.5">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${t.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {t.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <div className="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(t)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-100"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => onSaveType({ ...t, status: t.status === 'ativo' ? 'inativo' : 'ativo' })}
                        className={`p-1.5 rounded-lg transition-all border border-transparent ${t.status === 'inativo' ? 'text-green-500 hover:bg-green-50' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`}
                        title={t.status === 'inativo' ? 'Reativar' : 'Inativar'}
                      >
                        <PowerOff size={14} />
                      </button>
                      {onDeleteType && (
                        <button
                          onClick={() => {
                            if (confirm('Tem certeza que deseja excluir este tipo de pagamento?')) {
                              onDeleteType(t.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTypes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <Search size={48} />
                      <p className="font-bold text-slate-400">Nenhum tipo encontrado</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  {editingType ? 'Editar Tipo' : 'Novo Tipo de Pagamento'}
                </h3>
                <p className="text-slate-500 text-sm">Configuração de categoria financeira</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-1">
                  <label className={labelClass}>Código</label>
                  <input
                    className={`${inputClass} opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50`}
                    value={formData.code}
                    placeholder="01"
                    readOnly
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className={labelClass}>Nome do Tipo</label>
                  <input
                    required
                    className={inputClass}
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                    placeholder="Ex: BOLETO, PIX, CARTÃO"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95"
                >
                  Salvar Tipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
