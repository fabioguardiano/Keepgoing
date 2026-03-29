import React, { useState } from 'react';
import { Box, Plus, Search, Package, AlertTriangle, TrendingUp, TrendingDown, Trash2, Edit2, Diamond, ShoppingBag, Wrench, MapPin, PowerOff, ArrowUpDown } from 'lucide-react';
import { Material, Brand, ProductGroup, Supplier, Category } from '../types';
import { NewMaterialModal } from './NewMaterialModal';

interface InventoryViewProps {
  materials: Material[];
  onSaveMaterial: (material: Material) => void;
  onUpdateStatus: (id: string, status: 'ativo' | 'inativo') => void;
  brands: Brand[];
  productGroups: ProductGroup[];
  suppliers: Supplier[];
  exchangeRates: { usd: number; eur: number; lastUpdate: string };
}

type SortField = 'code' | 'name' | 'stockQuantity' | 'sellingPrice';
type SortDirection = 'asc' | 'desc';

export const InventoryView: React.FC<InventoryViewProps> = ({ 
  materials, onSaveMaterial, onUpdateStatus,
  brands, productGroups, suppliers, exchangeRates
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
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

  const filteredMaterials = materials
    .filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.type.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = showInactive || m.status === 'ativo';
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') comparison = a.name.localeCompare(b.name);
      if (sortField === 'code') comparison = a.code.localeCompare(b.code);
      if (sortField === 'stockQuantity') comparison = a.stockQuantity - b.stockQuantity;
      if (sortField === 'sellingPrice') comparison = (a.sellingPrice || 0) - (b.sellingPrice || 0);
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-30 group-hover:opacity-100 transition-opacity" />;
    return <ArrowUpDown size={14} className="text-primary" />;
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingMaterial(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-primary p-1.5 bg-orange-50 rounded-xl">
               <Package size={20} />
            </span>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Matéria Prima</h1>
          </div>
          <p className="text-slate-500 font-medium">Controle de chapas e insumos de produção</p>
        </div>
        <button 
          onClick={handleAddNew}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-secondary transition-all transform hover:scale-[1.02] active:scale-95"
        >
          <Plus size={20} /> Novo Registro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Package size={24} />
            </div>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total em Estoque</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{materials.reduce((acc, m) => acc + m.stockQuantity, 0)} <span className="text-sm font-bold text-slate-400">unidades</span></p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-orange-50 text-primary rounded-2xl">
              <TrendingUp size={24} />
            </div>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Valor em Estoque</span>
          </div>
          <p className="text-3xl font-black text-slate-800">R$ {materials.reduce((acc, m) => acc + (m.stockQuantity * m.unitCost), 0).toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
              <AlertTriangle size={24} />
            </div>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Abaixo do Mínimo</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{materials.filter(m => m.stockQuantity < m.minStock).length} <span className="text-sm font-bold text-slate-400">itens</span></p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por código ou descrição..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
          <Package size={16} />
          {materials.filter(m => m.status === 'ativo').length} Ativos
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
          <PowerOff size={14} />
          {materials.filter(m => m.status === 'inativo').length} Inativos
        </div>
        <button
          onClick={() => setShowInactive(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold uppercase tracking-widest transition-all ${showInactive ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'}`}
        >
          <PowerOff size={14} />
          {showInactive ? 'Ocultar Inativos' : 'Mostrar Inativos'}
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th onClick={() => handleSort('code')} className="px-6 py-4 cursor-pointer group hover:bg-slate-100/50 transition-colors w-24">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Código <SortIcon field="code" />
                  </div>
                </th>
                <th onClick={() => handleSort('name')} className="px-6 py-4 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Matéria Prima <SortIcon field="name" />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Espessura</th>
                <th onClick={() => handleSort('stockQuantity')} className="px-6 py-4 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Estoque <SortIcon field="stockQuantity" />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Sugerido</th>
                <th onClick={() => handleSort('sellingPrice')} className="px-6 py-4 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Venda <SortIcon field="sellingPrice" />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMaterials.map(material => (
                <tr key={material.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-xs font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{material.code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {material.imageUrl ? (
                        <img src={material.imageUrl} alt={material.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
                          <Diamond size={18} />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-black text-slate-800 leading-tight">{material.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{material.brand || material.supplier || 'Geral'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-500">
                    {material.thickness ? `${material.thickness} cm` : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className={`font-bold ${material.stockQuantity < material.minStock ? 'text-red-500' : 'text-slate-600'}`}>
                      {material.stockQuantity} {material.unit}
                    </div>
                    {material.stockQuantity < material.minStock && (
                      <div className="text-[9px] font-black text-red-300 uppercase tracking-wider">Mínimo: {material.minStock}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-400 text-sm">
                    R$ {material.suggestedPrice?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 font-black text-[var(--primary-color)]">
                    R$ {material.sellingPrice?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(material)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-all">
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => onUpdateStatus(material.id, material.status === 'ativo' ? 'inativo' : 'ativo')} 
                        className={`p-2 rounded-xl transition-all ${material.status === 'ativo' ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-green-500 hover:bg-green-50'}`}
                        title={material.status === 'ativo' ? 'Inativar' : 'Ativar'}
                      >
                        <PowerOff size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMaterials.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                      <Package size={48} className="opacity-20" />
                      <p className="font-bold">Nenhum material encontrado</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewMaterialModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSaveMaterial}
        editingMaterial={editingMaterial}
        defaultType="Matéria Prima"
        brands={brands}
        productGroups={productGroups}
        suppliers={suppliers}
        materials={materials}
        exchangeRates={exchangeRates}
      />
    </div>
  );
};
