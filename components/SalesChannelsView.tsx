import React, { useState, useMemo } from 'react';
import { ShoppingBag, Plus, Search, Edit2, PowerOff, X, ArrowUpDown } from 'lucide-react';
import { SalesChannel } from '../types';

type SortField = 'id' | 'name' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface SalesChannelsViewProps {
  channels: SalesChannel[];
  onSaveChannel: (channel: SalesChannel) => void;
  onDeleteChannel: (id: string) => void;
}

export const SalesChannelsView: React.FC<SalesChannelsViewProps> = ({ channels, onSaveChannel, onDeleteChannel }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<SalesChannel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [formData, setFormData] = useState<Omit<SalesChannel, 'id' | 'createdAt'>>({
    name: ''
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-30 group-hover:opacity-100 transition-opacity" />;
    return <ArrowUpDown size={14} className="text-primary" />;
  };

  const handleEdit = (channel: SalesChannel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const channel: SalesChannel = {
      id: editingChannel?.id || crypto.randomUUID(),
      createdAt: editingChannel?.createdAt || new Date().toISOString(),
      ...formData
    };
    onSaveChannel(channel);
    setIsModalOpen(false);
    setEditingChannel(null);
    setFormData({ name: '' });
  };

  const filteredChannels = useMemo(() => channels.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = showInactive ? c.status === 'inativo' : (c.status === 'ativo' || !c.status);
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    let cmp = 0;
    if (sortField === 'id') cmp = (a.id || '').localeCompare(b.id || '');
    if (sortField === 'name') cmp = a.name.localeCompare(b.name);
    if (sortField === 'createdAt') cmp = (a.createdAt || '').localeCompare(b.createdAt || '');
    return sortDirection === 'asc' ? cmp : -cmp;
  }), [channels, searchQuery, showInactive, sortField, sortDirection]);

  const inputClass = "w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all";
  const labelClass = "block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="management-title">Canais de Vendas</h1>
          <p className="management-subtitle">Gerencie a origem e canais de entrada dos seus pedidos</p>
        </div>
        <button
          onClick={() => {
            setEditingChannel(null);
            setFormData({ name: '' });
            setIsModalOpen(true);
          }}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-secondary transition-all transform hover:scale-[1.02] active:scale-95"
        >
          <Plus size={20} /> Novo Canal
        </button>
      </div>

      {/* Search Header */}
      <div className="management-header-card flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar canal..."
            className="management-input w-full pl-12 pr-4 py-3"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
          <ShoppingBag size={16} />
          {channels.filter(c => !c.status || c.status === 'ativo').length} Ativos
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
          <PowerOff size={14} />
          {channels.filter(c => c.status === 'inativo').length} Inativos
        </div>
        <button
          onClick={() => setShowInactive(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold uppercase tracking-widest transition-all ${showInactive ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'}`}
        >
          <PowerOff size={14} />
          {showInactive ? 'Ocultar Inativos' : 'Mostrar Inativos'}
        </button>
      </div>

      <div className="management-container overflow-hidden">

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                <th onClick={() => handleSort('id')} className="px-6 py-5 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">Cód <SortIcon field="id" /></div>
                </th>
                <th onClick={() => handleSort('name')} className="px-6 py-5 cursor-pointer group hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">Descrição <SortIcon field="name" /></div>
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
              {filteredChannels.map((channel, index) => (
                <tr key={channel.id} className={`hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group ${channel.status === 'inativo' ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-5">
                    <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 shadow-sm">
                      #{channel.code ?? index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-800 dark:text-white">{channel.name}</span>
                      {channel.status === 'inativo' && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full uppercase tracking-wider">Inativo</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-slate-500">
                    {new Date(channel.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(channel)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => channel.status === 'inativo' ? onSaveChannel({ ...channel, status: 'ativo' }) : onDeleteChannel(channel.id)}
                        className={`p-2 rounded-xl transition-all border border-transparent ${channel.status === 'inativo' ? 'text-green-500 hover:bg-green-50 hover:border-green-100' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100'}`}
                        title={channel.status === 'inativo' ? 'Reativar' : 'Inativar'}
                      >
                        <PowerOff size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredChannels.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <Search size={48} />
                      <p className="font-bold text-slate-400">Nenhum canal de venda encontrado</p>
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
          <div className="management-modal rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  {editingChannel ? 'Editar Canal' : 'Novo Canal'}
                </h3>
                <p className="management-subtitle text-sm">Preencha o nome do canal</p>
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
                  readOnly
                  className="management-input w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-60"
                  value={editingChannel?.code ?? (channels.reduce((max, x) => Math.max(max, x.code ?? 0), 0) + 1)}
                />
              </div>
              <div>
                <label className={labelClass}>Nome do Canal</label>
                <input
                  required
                  className="management-input w-full px-4 py-3"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Facebook, Parceria Arquiteto X..."
                  autoFocus
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
                  Salvar Canal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
