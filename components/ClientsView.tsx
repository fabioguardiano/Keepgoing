import React, { useState } from 'react';
import { Users, Plus, Search, Mail, Phone, MapPin, Trash2, Edit2, ShieldCheck, CreditCard, Globe, ExternalLink, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Client } from '../types';
import { NewClientModal } from './NewClientModal';

interface ClientsViewProps {
  clients: Client[];
  onSaveClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
}

type SortField = 'id' | 'name' | 'city' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export const ClientsView: React.FC<ClientsViewProps> = ({ clients, onSaveClient, onDeleteClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedClients = clients
    .filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.document.includes(searchTerm) ||
      c.phone.includes(searchTerm) ||
      c.cellphone.includes(searchTerm) ||
      c.address.city.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') comparison = a.name.localeCompare(b.name);
      if (sortField === 'id') comparison = a.id.localeCompare(b.id);
      if (sortField === 'createdAt') comparison = a.createdAt.localeCompare(b.createdAt);
      if (sortField === 'city') comparison = a.address.city.localeCompare(b.address.city);
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortDirection === 'asc' ? <ChevronUp size={14} className="text-[#ec5b13]" /> : <ChevronDown size={14} className="text-[#ec5b13]" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gestão de Clientes</h1>
          <p className="text-slate-500 font-medium">Relatório técnico de base integrada</p>
        </div>
        <button 
          onClick={handleAddNew}
          className="bg-[#ec5b13] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-[#ec5b13]/20 hover:bg-[#d84a0d] transition-all transform hover:scale-[1.02] active:scale-95"
        >
          <Plus size={20} /> Novo Cliente
        </button>
      </div>

      {/* Search Header */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Nome, documento, telefone ou cidade..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#ec5b13]/20 font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-widest">
          <Users size={16} />
          {filteredAndSortedClients.length} Clientes
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th onClick={() => handleSort('id')} className="px-6 py-4 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    ID <SortIcon field="id" />
                  </div>
                </th>
                <th onClick={() => handleSort('name')} className="px-6 py-4 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Cliente / Razão Social <SortIcon field="name" />
                  </div>
                </th>
                <th className="px-6 py-4">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contato</div>
                </th>
                <th onClick={() => handleSort('city')} className="px-6 py-4 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Localização <SortIcon field="city" />
                  </div>
                </th>
                <th onClick={() => handleSort('createdAt')} className="px-6 py-4 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Cadastro <SortIcon field="createdAt" />
                  </div>
                </th>
                <th className="px-6 py-4 text-right">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ações</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAndSortedClients.map(client => (
                <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-xs font-black text-slate-300">#{client.id.slice(-4).toUpperCase()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${client.type === 'Pessoa Jurídica' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-[#ec5b13]'}`}>
                        {client.type === 'Pessoa Jurídica' ? <ShieldCheck size={16} /> : <Users size={16} />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-700 leading-tight flex items-center gap-2">
                          {client.name}
                          {client.useSpecialTable && (
                            <span className="text-[10px] bg-orange-100 text-[#ec5b13] px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">Esp</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{client.document}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                        <Mail size={12} className="text-slate-300" />
                        {client.email.split('@')[0]}...
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                        <Phone size={12} className="text-slate-300" />
                        {client.cellphone || client.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-slate-600 font-bold">{client.address.city}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{client.address.state}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[11px] text-slate-500 font-bold">{new Date(client.createdAt).toLocaleDateString('pt-BR')}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(client)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
                        title="Ver Ficha / Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => onDeleteClient(client.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAndSortedClients.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center opacity-30">
                      <Search size={48} className="mb-2" />
                      <p className="font-bold text-slate-400">Nenhum cliente encontrado para sua busca</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewClientModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSaveClient}
        editingClient={editingClient}
      />
    </div>
  );
};
