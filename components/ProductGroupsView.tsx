import React, { useState } from 'react';
import { Box, Plus, Search, Filter, Edit2, PowerOff, X } from 'lucide-react';
import { ProductGroup } from '../types';

interface ProductGroupsViewProps {
  groups: ProductGroup[];
  onSaveGroup: (group: ProductGroup) => void;
  onDeleteGroup: (id: string) => void;
}

export const ProductGroupsView: React.FC<ProductGroupsViewProps> = ({ groups, onSaveGroup, onDeleteGroup }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProductGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [formData, setFormData] = useState<Omit<ProductGroup, 'id' | 'createdAt'>>({
    code: '',
    description: ''
  });

  const handleEdit = (group: ProductGroup) => {
    setEditingGroup(group);
    setFormData({
      code: group.code,
      description: group.description
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const group: ProductGroup = {
      id: editingGroup?.id || formData.code,
      createdAt: editingGroup?.createdAt || new Date().toISOString(),
      ...formData
    };
    onSaveGroup(group);
    setIsModalOpen(false);
    setEditingGroup(null);
    setFormData({ code: '', description: '' });
  };

  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = showInactive ? g.status === 'inativo' : (g.status === 'ativo' || !g.status);
    return matchesSearch && matchesStatus;
  });

  const inputClass = "w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all";
  const labelClass = "block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Box className="text-[var(--primary-color)]" />
            Grupos de Produtos
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Categorize seus produtos em grupos específicos</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInactive(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold uppercase tracking-widest transition-all ${showInactive ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'}`}
          >
            <PowerOff size={14} />
            {showInactive ? 'Ocultar Inativos' : 'Mostrar Inativos'}
          </button>
          <button
            onClick={() => {
              const nextCode = groups.length > 0
                ? String(Math.max(...groups.map(g => parseInt(g.code) || 0)) + 1).padStart(2, '0')
                : '01';
              setEditingGroup(null);
              setFormData({ code: nextCode, description: '' });
              setIsModalOpen(true);
            }}
            className="bg-[var(--primary-color)] hover:opacity-90 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[var(--primary-color)]/20 active:scale-95"
          >
            <Plus size={20} />
            Novo Grupo
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por código ou descrição..."
              className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary-color)]/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <Filter size={18} />
            Filtros
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-widest">Cód</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-widest">Descrição</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-widest">Data Cadastro</th>
                <th className="px-6 py-5 text-right text-sm font-bold text-slate-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredGroups.map((group) => (
                <tr key={group.id} className={`hover:bg-slate-50/50 transition-colors group ${group.status === 'inativo' ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-5">
                    <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 shadow-sm">
                      #{group.code}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-800">{group.description}</span>
                      {group.status === 'inativo' && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full uppercase tracking-wider">Inativo</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-slate-500">
                    {new Date(group.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(group)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => group.status === 'inativo' ? onSaveGroup({ ...group, status: 'ativo' }) : onDeleteGroup(group.id)}
                        className={`p-2 rounded-xl transition-all border border-transparent ${group.status === 'inativo' ? 'text-green-500 hover:bg-green-50 hover:border-green-100' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100'}`}
                        title={group.status === 'inativo' ? 'Reativar' : 'Inativar'}
                      >
                        <PowerOff size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredGroups.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <Search size={48} />
                      <p className="font-bold text-slate-400">Nenhum grupo encontrado</p>
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
                  {editingGroup ? 'Editar Grupo' : 'Novo Grupo'}
                </h3>
                <p className="text-slate-500 text-sm">Preencha os dados do grupo de produtos</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <div>
                <label className={labelClass}>Código</label>
                <input
                  required
                  readOnly
                  className={`${inputClass} bg-slate-100 dark:bg-slate-800 cursor-not-allowed`}
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Gerado automaticamente"
                />
              </div>
              <div>
                <label className={labelClass}>Descrição</label>
                <input
                  required
                  className={inputClass}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Nome do grupo (ex: MARMORE, GRANITO)"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-[var(--primary-color)] hover:opacity-90 text-white rounded-xl font-bold shadow-lg shadow-[var(--primary-color)]/20 transition-all active:scale-95"
                >
                  Salvar Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
