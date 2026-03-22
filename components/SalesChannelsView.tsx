import React, { useState } from 'react';
import { ShoppingBag, Plus, Search, Edit2, PowerOff, X } from 'lucide-react';
import { SalesChannel } from '../types';

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
  const [formData, setFormData] = useState<Omit<SalesChannel, 'id' | 'createdAt'>>({
    name: ''
  });

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
      id: editingChannel?.id || Math.random().toString(36).substr(2, 9),
      createdAt: editingChannel?.createdAt || new Date().toISOString(),
      ...formData
    };
    onSaveChannel(channel);
    setIsModalOpen(false);
    setEditingChannel(null);
    setFormData({ name: '' });
  };

  const filteredChannels = channels.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = showInactive ? c.status === 'inativo' : (c.status === 'ativo' || !c.status);
    return matchesSearch && matchesStatus;
  });

  const inputClass = "w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all";
  const labelClass = "block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <ShoppingBag className="text-[var(--primary-color)]" />
            Canais de Vendas
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie a origem dos seus pedidos</p>
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
              setEditingChannel(null);
              setFormData({ name: '' });
              setIsModalOpen(true);
            }}
            className="bg-[var(--primary-color)] hover:opacity-90 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[var(--primary-color)]/20 active:scale-95"
          >
            <Plus size={20} />
            Novo Canal
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar canal..."
              className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary-color)]/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-2xl border border-green-100 text-green-600 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
            {channels.filter(c => !c.status || c.status === 'ativo').length} Ativos
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-2xl border border-amber-100 text-amber-500 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
            {channels.filter(c => c.status === 'inativo').length} Inativos
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100">
                <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-widest">Cód</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-widest">Descrição</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-widest">Data Cadastro</th>
                <th className="px-6 py-5 text-right text-sm font-bold text-slate-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredChannels.map((channel, index) => (
                <tr key={channel.id} className={`hover:bg-slate-50/50 transition-colors group ${channel.status === 'inativo' ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-5">
                    <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 shadow-sm">
                      #{index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-800">{channel.name}</span>
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
          <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  {editingChannel ? 'Editar Canal' : 'Novo Canal'}
                </h3>
                <p className="text-slate-500 text-sm">Preencha o nome do canal</p>
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
                <label className={labelClass}>Nome do Canal</label>
                <input
                  required
                  className={inputClass}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Facebook, Parceria Arquiteto X..."
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
