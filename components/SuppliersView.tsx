import React, { useState, useMemo, useEffect } from 'react';
import { Truck, Plus, Search, Mail, Phone, MapPin, Trash2, Edit2, ShieldCheck, ExternalLink, ArrowUpDown, ChevronUp, ChevronDown, Globe, User } from 'lucide-react';
import { Supplier } from '../types';
import { NewSupplierModal } from './NewSupplierModal';

interface SuppliersViewProps {
  suppliers: Supplier[];
  onSaveSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
}

type SortField = 'legalName' | 'tradingName' | 'city' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export const SuppliersView: React.FC<SuppliersViewProps> = ({ suppliers, onSaveSupplier, onDeleteSupplier }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [sortField, setSortField] = useState<SortField>('tradingName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
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
      .filter(s => 
        s.tradingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.legalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.document.includes(searchTerm) ||
        s.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.address.city.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        let comparison = 0;
        if (sortField === 'tradingName') comparison = a.tradingName.localeCompare(b.tradingName);
        if (sortField === 'legalName') comparison = a.legalName.localeCompare(b.legalName);
        if (sortField === 'city') comparison = a.address.city.localeCompare(b.address.city);
        if (sortField === 'createdAt') comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [suppliers, searchTerm, sortField, sortDirection]);

  // Reset to first page when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
    return sortDirection === 'asc' ? <ChevronUp size={14} className="text-[#ec5b13]" /> : <ChevronDown size={14} className="text-[#ec5b13]" />;
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
          className="bg-[#ec5b13] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-[#ec5b13]/20 hover:bg-[#d84a0d] transition-all transform hover:scale-[1.02] active:scale-95"
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
            placeholder="Nome fantasia, razão social, documento, contato ou cidade..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#ec5b13]/20 font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-widest">
          <Truck size={16} />
          {filteredAndSortedSuppliers.length} Fornecedores
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th onClick={() => handleSort('tradingName')} className="px-6 py-5 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">
                    Fornecedor / Fantasia <SortIcon field="tradingName" />
                  </div>
                </th>
                <th onClick={() => handleSort('legalName')} className="px-6 py-5 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">
                    Razão Social <SortIcon field="legalName" />
                  </div>
                </th>
                <th className="px-6 py-5">
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Contato / Doc</div>
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
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${supplier.type === 'Pessoa Jurídica' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-[#ec5b13] border-orange-100'}`}>
                        <Truck size={20} />
                      </div>
                      <div>
                        <div className="text-base font-black text-slate-800 leading-tight">{supplier.tradingName}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">#{supplier.id.slice(-4).toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="text-sm text-slate-700 font-black">{supplier.legalName}</div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">{supplier.document}</div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                        <User size={14} className="text-slate-300" />
                        {supplier.contactName || '---'}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                        <Phone size={14} className="text-slate-300" />
                        {supplier.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="text-sm text-slate-700 font-black uppercase tracking-tight">{supplier.address.city}</div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">{supplier.address.state}</div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="text-sm text-slate-600 font-black">
                      {supplier.createdAt ? new Date(supplier.createdAt).toLocaleDateString('pt-BR') : '---'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Data de Ref.</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(supplier)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
                        title="Ver Ficha / Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => onDeleteSupplier(supplier.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
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
                        className={`w-10 h-10 rounded-xl text-sm font-bold transition-all shrink-0 ${currentPage === page ? 'bg-[#ec5b13] text-white shadow-lg shadow-[#ec5b13]/20' : 'bg-white border border-slate-200 text-slate-600 hover:border-[#ec5b13]/30 hover:text-[#ec5b13]'}`}
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
