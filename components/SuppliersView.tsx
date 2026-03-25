import React, { useState, useMemo, useEffect } from 'react';
import { Truck, Plus, Search, Phone, PowerOff, Edit2, ShieldCheck, ArrowUpDown, ChevronUp, ChevronDown, User } from 'lucide-react';
import { Supplier } from '../types';
import { NewSupplierModal } from './NewSupplierModal';

interface SuppliersViewProps {
  suppliers: Supplier[];
  onSaveSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
}

type SortField = 'legalName' | 'tradingName' | 'city' | 'createdAt' | 'code';
type SortDirection = 'asc' | 'desc';

export const SuppliersView: React.FC<SuppliersViewProps> = ({ suppliers, onSaveSupplier, onDeleteSupplier }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
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

  const filteredAndSortedSuppliers = useMemo(() => {
    return suppliers
      .filter(s => showInactive ? true : (s.status || 'ativo') === 'ativo')
      .filter(s =>
        String(s.code).includes(searchTerm) ||
        (s.tradingName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.legalName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.document || '').includes(searchTerm) ||
        (s.phone || '').includes(searchTerm) ||
        (s.address?.city || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        let comparison = 0;
        if (sortField === 'tradingName') comparison = a.tradingName.localeCompare(b.tradingName);
        if (sortField === 'legalName') comparison = a.legalName.localeCompare(b.legalName);
        if (sortField === 'city') comparison = (a.address?.city || '').localeCompare(b.address?.city || '');
        if (sortField === 'createdAt') comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
        if (sortField === 'code') comparison = (a.code || 0) - (b.code || 0);
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [suppliers, searchTerm, sortField, sortDirection, showInactive]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showInactive]);

  const totalPages = Math.ceil(filteredAndSortedSuppliers.length / itemsPerPage);
  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedSuppliers.slice(start, start + itemsPerPage);
  }, [filteredAndSortedSuppliers, currentPage, itemsPerPage]);

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingSupplier(null);
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
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gestão de Fornecedores</h1>
          <p className="text-slate-500 font-medium">Controle técnico de parceiros e insumos</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-secondary transition-all transform hover:scale-[1.02] active:scale-95"
        >
          <Plus size={20} /> Novo Fornecedor
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
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
          <Truck size={16} />
          {suppliers.filter(s => !s.status || s.status === 'ativo').length} Ativos
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
          <PowerOff size={14} />
          {suppliers.filter(s => s.status === 'inativo').length} Inativos
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
                <th onClick={() => handleSort('tradingName')} className="px-6 py-5 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">
                    Fornecedor / Razão Social <SortIcon field="tradingName" />
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
              {paginatedSuppliers.map(supplier => (
                <tr key={supplier.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-6">
                    <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 shadow-sm">
                      #{supplier.code || '---'}
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border bg-primary/10 text-primary border-primary/10">
                        {supplier.type === 'Pessoa Jurídica' ? <ShieldCheck size={20} /> : <Truck size={20} />}
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-800 leading-tight flex items-center gap-2">
                          {supplier.tradingName}
                        </div>
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{supplier.document}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                        <User size={14} className="text-slate-300" />
                        {supplier.contactName || '---'}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                        <Phone size={14} className="text-slate-300" />
                        {supplier.phone || '---'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="text-sm text-slate-700 font-black uppercase tracking-tight">{supplier.address?.city}</div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">{supplier.address?.state}</div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="text-sm text-slate-600 font-black">
                      {supplier.createdAt ? new Date(supplier.createdAt).toLocaleDateString('pt-BR') : '---'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Data de Ref.</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                      {supplier.status === 'inativo' && (
                        <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 px-2 py-1 rounded-lg">Inativo</span>
                      )}
                      <button
                        onClick={() => handleEdit(supplier)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteSupplier(supplier.id)}
                        className={`p-2 rounded-xl transition-all border border-transparent ${supplier.status === 'inativo' ? 'text-green-500 hover:bg-green-50 hover:border-green-100' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100'}`}
                        title={supplier.status === 'inativo' ? 'Reativar' : 'Inativar'}
                      >
                        <PowerOff size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAndSortedSuppliers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center opacity-30">
                      <Search size={48} className="mb-2" />
                      <p className="font-bold text-slate-400">Nenhum fornecedor encontrado para sua busca</p>
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
              Mostrando <span className="font-bold text-slate-700">{((currentPage - 1) * itemsPerPage) + 1}</span> a <span className="font-bold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredAndSortedSuppliers.length)}</span> de <span className="font-bold text-slate-700">{filteredAndSortedSuppliers.length}</span> fornecedores
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

      <NewSupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSaveSupplier}
        editingSupplier={editingSupplier}
      />
    </div>
  );
};
