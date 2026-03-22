import React, { useState, useMemo, useEffect } from 'react';
import { Users, Plus, Search, Mail, Phone, MapPin, PowerOff, Edit2, ShieldCheck, CreditCard, Globe, ExternalLink, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Client } from '../types';
import { NewClientModal } from './NewClientModal';

interface ClientsViewProps {
  clients: Client[];
  onSaveClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
}

type SortField = 'code' | 'name' | 'city' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export const ClientsView: React.FC<ClientsViewProps> = ({ clients, onSaveClient, onDeleteClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showInactive, setShowInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedClients = useMemo(() => {
    return clients
      .filter(c => showInactive ? true : (c.status || 'ativo') === 'ativo')
      .filter(c =>
        String(c.code).includes(searchTerm) ||
        (c.tradingName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.legalName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.document.includes(searchTerm) ||
        c.phone.includes(searchTerm) ||
        c.cellphone.includes(searchTerm) ||
        c.address.city.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        let comparison = 0;
        if (sortField === 'name') comparison = (a.tradingName || a.legalName || '').localeCompare(b.tradingName || b.legalName || '');
        if (sortField === 'code') comparison = (a.code || 0) - (b.code || 0);
        if (sortField === 'createdAt') comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
        if (sortField === 'city') comparison = a.address.city.localeCompare(b.address.city);
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [clients, searchTerm, sortField, sortDirection]);

  // Reset to first page when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredAndSortedClients.length / itemsPerPage);
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedClients.slice(start, start + itemsPerPage);
  }, [filteredAndSortedClients, currentPage, itemsPerPage]);

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
    return sortDirection === 'asc' ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-primary" />;
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
          className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-secondary transition-all transform hover:scale-[1.02] active:scale-95"
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
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-widest">
          <Users size={16} />
          {filteredAndSortedClients.length} Clientes
        </div>
        <button
          onClick={() => setShowInactive(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold uppercase tracking-widest transition-all ${showInactive ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'}`}
        >
          <PowerOff size={14} />
          {showInactive ? 'Ocultar Inativos' : 'Mostrar Inativos'}
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th onClick={() => handleSort('code')} className="px-6 py-5 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">
                    Cód <SortIcon field="code" />
                  </div>
                </th>
                <th onClick={() => handleSort('name')} className="px-6 py-5 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">
                    Cliente / Razão Social <SortIcon field="name" />
                  </div>
                </th>
                <th className="px-6 py-5">
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Contato</div>
                </th>
                <th onClick={() => handleSort('city')} className="px-6 py-5 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">
                    Localização <SortIcon field="city" />
                  </div>
                </th>
                <th onClick={() => handleSort('createdAt')} className="px-6 py-5 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">
                    Cadastro <SortIcon field="createdAt" />
                  </div>
                </th>
                <th className="px-6 py-5 text-right">
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Ações</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedClients.map(client => (
                <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-6">
                    <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 shadow-sm">
                      #{client.code || '---'}
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${client.type === 'Pessoa Jurídica' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-primary/10 text-primary border-primary/10'}`}>
                        {client.type === 'Pessoa Jurídica' ? <ShieldCheck size={20} /> : <Users size={20} />}
                      </div>
                      <div>
                        <div className="text-base font-black text-slate-800 leading-tight flex items-center gap-2">
                          {client.tradingName || client.legalName}
                          {client.useSpecialTable && (
                            <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded-lg font-black uppercase tracking-tight shadow-sm">ESPECIAL</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{client.document}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                        <Mail size={14} className="text-slate-300" />
                        {client.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                        <Phone size={14} className="text-slate-300" />
                        {client.cellphone || client.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="text-sm text-slate-700 font-black uppercase tracking-tight">{client.address.city}</div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">{client.address.state}</div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="text-sm text-slate-600 font-black">
                      {client.createdAt ? new Date(client.createdAt).toLocaleDateString('pt-BR') : '---'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Data de Ref.</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                      {client.status === 'inativo' && (
                        <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 px-2 py-1 rounded-lg">Inativo</span>
                      )}
                      <button
                        onClick={() => handleEdit(client)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteClient(client.id)}
                        className={`p-2 rounded-xl transition-all border border-transparent ${client.status === 'inativo' ? 'text-green-500 hover:bg-green-50 hover:border-green-100' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100'}`}
                        title={client.status === 'inativo' ? 'Reativar' : 'Inativar'}
                      >
                        <PowerOff size={16} />
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
        
        {/* Pagination UI */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
            <div className="text-sm text-slate-500 font-medium whitespace-nowrap">
              Mostrando <span className="font-bold text-slate-700">{((currentPage - 1) * itemsPerPage) + 1}</span> a <span className="font-bold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredAndSortedClients.length)}</span> de <span className="font-bold text-slate-700">{filteredAndSortedClients.length}</span> clientes
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                type="button"
              >
                Anterior
              </button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  if (page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-xl text-sm font-bold transition-all shrink-0 ${currentPage === page ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white border border-slate-200 text-slate-600 hover:border-primary/30 hover:text-primary'}`}
                        type="button"
                      >
                        {page}
                      </button>
                    );
                  }
                  if (page === currentPage - 3 || page === currentPage + 3) {
                    return <span key={page} className="px-1 text-slate-400" aria-hidden="true">...</span>;
                  }
                  return null;
                })}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                type="button"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
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
