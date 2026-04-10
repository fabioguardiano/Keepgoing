import React, { useState, useMemo } from 'react';
import { Wrench, Plus, Search, Filter, Edit2, PowerOff, X, ArrowUpDown, RefreshCw, Cloud, Loader2 } from 'lucide-react';
import { ServiceGroup } from '../types';

type SortField = 'code' | 'description' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface ServiceGroupsViewProps {
  groups: ServiceGroup[];
  onSaveGroup: (group: ServiceGroup) => void;
  onDeleteGroup: (id: string) => void;
  onSyncCloud?: () => Promise<void>;
}

export const ServiceGroupsView: React.FC<ServiceGroupsViewProps> = ({ groups, onSaveGroup, onDeleteGroup, onSyncCloud }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ServiceGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSync = async () => {
    if (!onSyncCloud) return;
    setSyncing(true);
    try {
      await onSyncCloud();
      // Feedback opcional aqui (ex: alert ou toast)
    } finally {
      setSyncing(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-30 group-hover:opacity-100 transition-opacity" />;
    return <ArrowUpDown size={14} className="text-primary" />;
  };
  const [formData, setFormData] = useState<Omit<ServiceGroup, 'id' | 'createdAt'>>({
    code: '',
    description: '',
    altMin: 0,
    altMax: 0,
    un: '',
    indice: 0,
    bnto: '',
    descFrete: '',
    perda: 0,
    ifp: 0,
    tpMin: 0,
    qtFun: 0,
    es: ''
  });

  const handleEdit = (group: ServiceGroup) => {
    setEditingGroup(group);
    const { id, createdAt, ...rest } = group;
    setFormData(rest);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const group: ServiceGroup = {
      id: editingGroup?.id || formData.code,
      createdAt: editingGroup?.createdAt || new Date().toISOString(),
      ...formData
    };
    onSaveGroup(group);
    setIsModalOpen(false);
    setEditingGroup(null);
    setFormData({
      code: '', description: '', altMin: 0, altMax: 0, un: '', indice: 0,
      bnto: '', descFrete: '', perda: 0, ifp: 0, tpMin: 0, qtFun: 0, es: ''
    });
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
  const labelClass = "block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1 uppercase tracking-wider";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="management-title">Grupos de Serviços</h1>
          <p className="management-subtitle">Configuração técnica de grupos de serviços e acabamentos</p>
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
              const nextCode = groups.length > 0
                ? String(Math.max(...groups.map(g => parseInt(g.code) || 0)) + 1).padStart(2, '0')
                : '01';
              setEditingGroup(null);
              setFormData({
                code: nextCode, description: '', altMin: 0, altMax: 0, un: '', indice: 0,
                bnto: '', descFrete: '', perda: 0, ifp: 0, tpMin: 0, qtFun: 0, es: ''
              });
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
          <Wrench size={16} />
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
              <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 whitespace-nowrap">
                <th onClick={() => handleSort('code')} className="px-6 py-5 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">Cód <SortIcon field="code" /></div>
                </th>
                <th onClick={() => handleSort('description')} className="px-6 py-5 cursor-pointer group hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">Descrição <SortIcon field="description" /></div>
                </th>
                <th className="px-6 py-5 text-center">
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">UN</div>
                </th>
                <th className="px-6 py-5 text-center">
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Alt. Min/Max</div>
                </th>
                <th className="px-6 py-5 text-center">
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Perda %</div>
                </th>
                <th className="px-6 py-5 text-center">
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">T.P.(Min)</div>
                </th>
                <th className="px-6 py-5 text-right">
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Ações</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {filteredGroups.map((group) => (
                <tr key={group.id} className={`hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group ${group.status === 'inativo' ? 'opacity-60' : ''}`}>
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
                  <td className="px-6 py-5 text-sm font-bold text-center text-slate-500 uppercase">{group.un}</td>
                  <td className="px-6 py-5 text-sm font-bold text-center text-slate-500">
                    {group.altMin} - {group.altMax}
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-center text-slate-500">{group.perda}%</td>
                  <td className="px-6 py-5 text-sm font-bold text-center text-slate-500">{group.tpMin} min</td>
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
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <Search size={48} />
                      <p className="font-bold text-slate-400">Nenhum grupo de serviço encontrado</p>
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
          <div className="management-modal rounded-[32px] w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  {editingGroup ? 'Editar Grupo de Serviço' : 'Novo Grupo de Serviço'}
                </h3>
                <p className="management-subtitle text-sm">Configurações técnicas do serviço</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="md:col-span-1">
                  <label className={labelClass}>Código</label>
                  <input
                    required
                    readOnly
                    className="management-input w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className={labelClass}>Descrição</label>
                  <input
                    required
                    className={inputClass}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className={labelClass}>Alt. Mínima</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={formData.altMin}
                    onChange={e => setFormData({ ...formData, altMin: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Alt. Máxima</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={formData.altMax}
                    onChange={e => setFormData({ ...formData, altMax: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Unidade (UN)</label>
                  <input
                    className={inputClass}
                    value={formData.un}
                    onChange={e => setFormData({ ...formData, un: e.target.value })}
                    placeholder="M2, PC..."
                  />
                </div>
                <div>
                  <label className={labelClass}>Índice (%)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={formData.indice}
                    onChange={e => setFormData({ ...formData, indice: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className={labelClass}>BNTO</label>
                  <input
                    className={inputClass}
                    value={formData.bnto}
                    onChange={e => setFormData({ ...formData, bnto: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Desc/Frete</label>
                  <input
                    className={inputClass}
                    value={formData.descFrete}
                    onChange={e => setFormData({ ...formData, descFrete: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Perda (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    className={inputClass}
                    value={formData.perda}
                    onChange={e => setFormData({ ...formData, perda: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className={labelClass}>IFP (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    className={inputClass}
                    value={formData.ifp}
                    onChange={e => setFormData({ ...formData, ifp: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className={labelClass}>T.P. (Min)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={formData.tpMin}
                    onChange={e => setFormData({ ...formData, tpMin: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Qt. Fun.</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={formData.qtFun}
                    onChange={e => setFormData({ ...formData, qtFun: Number(e.target.value) })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>ES</label>
                  <input
                    className={inputClass}
                    value={formData.es}
                    onChange={e => setFormData({ ...formData, es: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-[var(--primary-color)] hover:opacity-90 text-white rounded-xl font-bold shadow-lg shadow-[var(--primary-color)]/20 transition-all active:scale-95 uppercase text-xs tracking-widest"
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
