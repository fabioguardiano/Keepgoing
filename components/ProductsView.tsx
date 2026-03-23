import React, { useState } from 'react';
import { Box, Plus, Search, Trash2, Edit2, ArrowUpDown, ChevronUp, ChevronDown, Package, Wrench, MapPin, ShoppingBag, Diamond } from 'lucide-react';
import { NewProductModal } from './NewProductModal.tsx';
import { ProductService, View } from '../types';

interface ProductsViewProps {
  products: ProductService[];
  onSaveProduct: (product: ProductService) => void;
  onUpdateStatus: (id: string, status: 'ativo' | 'inativo') => void;
  category: 'Matéria Prima' | 'Produtos de Revenda' | 'Serviços' | 'Colocação' | 'Acabamentos';
  brands?: { code: string, description: string }[];
  productGroups?: { code: string, description: string }[];
}

type SortField = 'description' | 'code' | 'stockBalance' | 'sellingPrice';
type SortDirection = 'asc' | 'desc';

export const ProductsView: React.FC<ProductsViewProps> = ({ 
  products, onSaveProduct, onUpdateStatus, category,
  brands = [], productGroups = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductService | null>(null);
  const [sortField, setSortField] = useState<SortField>('description');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedProducts = products
    .filter(p => p.type === category)
    .filter(p => showInactive || p.status === 'ativo')
    .filter(p =>
      (p.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.code || '').includes(searchTerm) ||
      (p.group || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'description') comparison = a.description.localeCompare(b.description);
      if (sortField === 'code') comparison = a.code.localeCompare(b.code);
      if (sortField === 'stockBalance') comparison = a.stockBalance - b.stockBalance;
      if (sortField === 'sellingPrice') comparison = a.sellingPrice - b.sellingPrice;
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const handleEdit = (product: ProductService) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortDirection === 'asc' ? <ChevronUp size={14} className="text-[var(--primary-color)]" /> : <ChevronDown size={14} className="text-[var(--primary-color)]" />;
  };

  const getCategoryIcon = () => {
    switch(category) {
      case 'Matéria Prima': return <Box size={20} />;
      case 'Produtos de Revenda': return <ShoppingBag size={20} />;
      case 'Serviços': return <Wrench size={20} />;
      case 'Colocação': return <MapPin size={20} />;
      case 'Acabamentos': return <Diamond size={20} />;
      default: return <Package size={20} />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[var(--primary-color)] p-1.5 bg-orange-50 rounded-xl">
              {getCategoryIcon()}
            </span>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">{category}</h1>
          </div>
          <p className="text-slate-500 font-medium">Gestão técnica e precificação de itens</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowInactive(!showInactive)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${showInactive ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            {showInactive ? 'Ocultar Inativos' : 'Mostrar Inativos'}
          </button>
          <button 
            onClick={handleAddNew}
            className="bg-[var(--primary-color)] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-[var(--primary-color)]/20 hover:bg-[var(--secondary-color)] transition-all transform hover:scale-[1.02] active:scale-95"
          >
            <Plus size={20} /> Novo Registro
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por descrição, código ou grupo..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-widest">
          <Package size={16} />
          {filteredAndSortedProducts.length} Itens
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th onClick={() => handleSort('code')} className="px-6 py-4 cursor-pointer group hover:bg-slate-100/50 transition-colors w-32">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Código <SortIcon field="code" />
                  </div>
                </th>
                <th onClick={() => handleSort('description')} className="px-6 py-4 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Descrição do Item <SortIcon field="description" />
                  </div>
                </th>
                <th className="px-6 py-4">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Grupamento</div>
                </th>
                <th onClick={() => handleSort('stockBalance')} className="px-6 py-4 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Estoque <SortIcon field="stockBalance" />
                  </div>
                </th>
                <th onClick={() => handleSort('sellingPrice')} className="px-6 py-4 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Prc. Venda <SortIcon field="sellingPrice" />
                  </div>
                </th>
                <th className="px-6 py-4 text-right">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ações</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAndSortedProducts.map(product => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-xs font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                      {product.code || String(filteredAndSortedProducts.indexOf(product) + 1).padStart(2, '0')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {product.imageUrl ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                          <img src={product.imageUrl} alt={product.description} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 flex-shrink-0">
                          <Package size={20} />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-700">{product.description}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{product.brand || 'Marca não inf.'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500">
                      {product.group}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`font-black text-sm ${product.stockBalance <= product.minStock ? 'text-red-500' : 'text-slate-700'}`}>
                      {product.stockBalance} {product.unit}
                    </div>
                    {product.stockBalance <= product.minStock && (
                      <div className="text-[9px] font-black text-red-400 uppercase tracking-tighter">Abaixo do Mínimo ({product.minStock})</div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-black text-slate-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.sellingPrice)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(product)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Ver / Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => onUpdateStatus(product.id, product.status === 'ativo' ? 'inativo' : 'ativo')}
                        className={`p-2 rounded-xl transition-all ${product.status === 'ativo' ? 'text-slate-400 hover:text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                        title={product.status === 'ativo' ? 'Inativar' : 'Ativar'}
                      >
                        {product.status === 'ativo' ? <Trash2 size={16} /> : <Plus size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAndSortedProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-300">
                    <div className="flex flex-col items-center gap-2">
                      <Package size={48} className="opacity-20" />
                      <p className="font-bold">Nenhum item cadastrado nesta categoria</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewProductModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSaveProduct}
        editingProduct={editingProduct}
        defaultType={category}
        brands={brands}
        productGroups={productGroups}
        products={products}
      />
    </div>
  );
};
