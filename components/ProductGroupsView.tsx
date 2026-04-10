import React, { useState, useMemo } from 'react';
import { Box, Plus, Search, Edit2, PowerOff, X, ArrowUpDown, Cloud, Loader2 } from 'lucide-react';
import { ProductGroup } from '../types';

type SortField = 'code' | 'description' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface ProductGroupsViewProps {
  groups: ProductGroup[];
  onSaveGroup: (group: ProductGroup) => void;
  onDeleteGroup: (id: string) => void;
  onSyncCloud?: () => Promise<void>;
}

export const ProductGroupsView: React.FC<ProductGroupsViewProps> = ({ groups, onSaveGroup, onDeleteGroup, onSyncCloud }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProductGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSync = async () => {
    if (!onSyncCloud) return;
    setSyncing(true);
    try {
      await onSyncCloud();
    } finally {
      setSyncing(false);
    }
  };

  const [formData, setFormData] = useState<Omit<ProductGroup, 'id' | 'createdAt'>>({
    code: '',
    description: ''
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-30 group-hover:opacity-100 transition-opacity" />;
    return <ArrowUpDown size={14} className="text-primary" />;
  };

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

  const filteredGroups = useMemo(() => groups.filter(g => {
    const matchesSearch = g.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = showInactive ? g.status === 'inativo' : (g.status === 'ativo' || !g.status);
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    let cmp = 0;
    if (sortField === 'code') cmp = a.code.localeCompare(b.code, undefined, { numeric: true });
    if (sortField === 'description') cmp = a.description.localeCompare(b.description);
    if (sortField === 'createdAt') cmp = (a.createdAt || '').localeCompare(b.createdAt || '');
    return sortDirection === 'asc' ? cmp : -cmp;
  }), [groups, searchQuery, showInactive, sortField, sortDirection]);

  const inputClass = "management-input w-full px-4 py-3";
  const labelClass = "block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="management-title">Grupos de Produtos</h1>
          <p className="management-subtitle">Controle e organização por categoria de estoque</p>
        </div>
        <div className="flex items-center gap-3">
          {onSyncCloud && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`p-3 rounded-2xl border border-slate-200 bg-white text-slate-500 hover:text-primary hover:border-primary/30 transition-all shadow-sm flex items-center justify-center gap-2 group ${syncing ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Sincronizar com a Nuvem (Cloud)"
            >
              {syncing ? <Loader2 size={20} className="animate-spin text-primary" /> : <Cloud size={20} className="group-hover:scale-110 transition-transform" />}
              <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Nuvem</span>
            </button>
          )}
          <button
            onClick={() => {
              const nextCode = groups.filter(g => !g.status || g.status === 'ativo').length > 0
                ? String(Math.max(...groups.map(g => parseInt(g.code) || 0)) + 1).padStart(2, '0')
                : '01';
              setEditingGroup(null);
              setFormData({ code: nextCode, description: '' });
              setIsModalOpen(true);
            }}
            className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-secondary transition-all transform hover:scale-[1.02] active:scale-95"
          >
            <Plus size={20} /> Novo Grupo
          </button>
        </div>
      </div>

      {/* Search Header */}
      <div className="management-header-card flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por código ou descrição..."
            className="management-input w-full pl-12 pr-4 py-3"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
          <Box size={16} />
          {groups.filter(g => !g.status || g.status === 'ativo').length} Ativos
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
          <PowerOff size={14} />
          {groups.filter(g => g.status === 'inativo').length} Inativos
        </div>
        <button
          onClick={() => setShowInactive(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold uppercase tracking-widest transition-all ${showInactive ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'}`}
        >
          <PowerOff size={14} />
          {showInactive ? 'Ocultar Inativos' : 'Mostrar Inativos'}
        </button>
      </div>

      <div className="management-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                <th onClick={() => handleSort('code')} className="px-6 py-5 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">Cód <SortIcon field="code" /></div>
                </th>
                <th onClick={() => handleSort('description')} className="px-6 py-5 cursor-pointer group hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">Descrição <SortIcon field="description" /></div>
                </th>
                <th onClick={() => handleSort('createdAt')} className="px-6 py-5 cursor-pointer group hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">Data Cadastro <SortIcon field="createdAt" /></div>
                </th>
                <th className="px-6 py-5 text-right">
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Ações</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {filteredGroups.map((group) => (
                <tr key={group.id} className={`hover:bg-slate-50/50 transition-colors group ${group.status === 'inativo' ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-5">
                    <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 shadow-sm">
                      #{group.code}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-800 dark:text-white">{group.description}</span>
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
          <div className="management-modal rounded-[32px] w-full max-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  {editingGroup ? 'Editar Grupo' : 'Novo Grupo'}
                </h3>
                <p className="management-subtitle text-sm">Preencha os dados do grupo de produtos</p>
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
