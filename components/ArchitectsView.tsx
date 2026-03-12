import React, { useState } from 'react';
import { Briefcase, Plus, Search, Mail, Phone, MapPin, Trash2, Edit2, ShieldCheck, ExternalLink, ArrowUpDown, ChevronUp, ChevronDown, Globe, User } from 'lucide-react';
import { Architect } from '../types';
import { NewArchitectModal } from './NewArchitectModal';

interface ArchitectsViewProps {
  architects: Architect[];
  onSaveArchitect: (architect: Architect) => void;
  onDeleteArchitect: (id: string) => void;
}

type SortField = 'legalName' | 'tradingName' | 'city' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export const ArchitectsView: React.FC<ArchitectsViewProps> = ({ architects, onSaveArchitect, onDeleteArchitect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArchitect, setEditingArchitect] = useState<Architect | null>(null);
  const [sortField, setSortField] = useState<SortField>('tradingName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedArchitects = architects
    .filter(a => 
      a.tradingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.legalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.document.includes(searchTerm) ||
      a.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.address.city.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'tradingName') comparison = a.tradingName.localeCompare(b.tradingName);
      if (sortField === 'legalName') comparison = a.legalName.localeCompare(b.legalName);
      if (sortField === 'city') comparison = a.address.city.localeCompare(b.address.city);
      if (sortField === 'createdAt') comparison = a.createdAt.localeCompare(b.createdAt);
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const handleEdit = (architect: Architect) => {
    setEditingArchitect(architect);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingArchitect(null);
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
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gestão de Arquitetos</h1>
          <p className="text-slate-500 font-medium">Controle técnico de parcerias e especificações</p>
        </div>
        <button 
          onClick={handleAddNew}
          className="bg-[#ec5b13] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-[#ec5b13]/20 hover:bg-[#d84a0d] transition-all transform hover:scale-[1.02] active:scale-95"
        >
          <Plus size={20} /> Novo Arquiteto
        </button>
      </div>

      {/* Search Header */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Escritório, profissional, documento, contato ou cidade..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#ec5b13]/20 font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-widest">
          <Briefcase size={16} />
          {filteredAndSortedArchitects.length} Arquitetos
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th onClick={() => handleSort('tradingName')} className="px-6 py-4 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Escritório / Fantasia <SortIcon field="tradingName" />
                  </div>
                </th>
                <th onClick={() => handleSort('legalName')} className="px-6 py-4 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Profissional / Razão <SortIcon field="legalName" />
                  </div>
                </th>
                <th className="px-6 py-4">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contato / Doc</div>
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
              {filteredAndSortedArchitects.map(architect => (
                <tr key={architect.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${architect.type === 'Pessoa Jurídica' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-[#ec5b13]'}`}>
                        <Briefcase size={16} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-700 leading-tight">{architect.tradingName}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">#{architect.id.slice(-4).toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-slate-600 font-semibold">{architect.legalName}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{architect.document}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                        <User size={12} className="text-slate-300" />
                        {architect.contactName || 'N/A'}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                        <Phone size={12} className="text-slate-300" />
                        {architect.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-slate-600 font-bold">{architect.address.city}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{architect.address.state}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[11px] text-slate-500 font-bold">{new Date(architect.createdAt).toLocaleDateString('pt-BR')}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(architect)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
                        title="Ver Ficha / Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => onDeleteArchitect(architect.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAndSortedArchitects.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center opacity-30">
                      <Search size={48} className="mb-2" />
                      <p className="font-bold text-slate-400">Nenhum arquiteto encontrado para sua busca</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewArchitectModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSaveArchitect}
        editingArchitect={editingArchitect}
      />
    </div>
  );
};
