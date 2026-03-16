import React, { useState } from 'react';
import { Diamond, Plus, Search, Filter, MoreVertical, Edit2, Trash2, X } from 'lucide-react';
import { Brand } from '../types';

interface BrandsViewProps {
  brands: Brand[];
  onSaveBrand: (brand: Brand) => void;
  onDeleteBrand: (id: string) => void;
}

export const BrandsView: React.FC<BrandsViewProps> = ({ brands, onSaveBrand, onDeleteBrand }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<Omit<Brand, 'id' | 'createdAt'>>({
    code: '',
    description: ''
  });

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      code: brand.code,
      description: brand.description
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const brand: Brand = {
      id: editingBrand?.id || formData.code,
      createdAt: editingBrand?.createdAt || new Date().toISOString(),
      ...formData
    };
    onSaveBrand(brand);
    setIsModalOpen(false);
    setEditingBrand(null);
    setFormData({ code: '', description: '' });
  };

  const filteredBrands = brands.filter(b => 
    b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const inputClass = "w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";
  const labelClass = "block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Diamond className="text-primary" />
            Cadastro de Marcas
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie as marcas disponíveis no sistema</p>
        </div>
        <button
          onClick={() => {
            const nextCode = brands.length > 0 
              ? String(Math.max(...brands.map(b => parseInt(b.code) || 0)) + 1).padStart(2, '0')
              : '01';
            setEditingBrand(null);
            setFormData({ code: nextCode, description: '' });
            setIsModalOpen(true);
          }}
          className="bg-primary hover:bg-secondary text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95"
        >
          <Plus size={20} />
          Nova Marca
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por código ou descrição..."
              className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <Filter size={18} />
            Filtros
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data Cadastro</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBrands.map((brand) => (
                <tr key={brand.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 font-mono text-sm text-primary font-bold">{brand.code}</td>
                  <td className="px-6 py-4">
                    <span className="text-slate-900 dark:text-white font-medium">{brand.description}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(brand.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(brand)}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteBrand(brand.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 px-2 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredBrands.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Search size={48} className="opacity-20" />
                      <p>Nenhuma marca encontrada</p>
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
                  {editingBrand ? 'Editar Marca' : 'Nova Marca'}
                </h3>
                <p className="text-slate-500 text-sm">Preencha os dados da marca</p>
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
                  required
                  readOnly
                  className={`${inputClass} bg-slate-100 dark:bg-slate-800 cursor-not-allowed`}
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Gerado automaticamente"
                />
              </div>
              <div>
                <label className={labelClass}>Descrição</label>
                <input
                  required
                  className={inputClass}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Nome da marca"
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
                  className="flex-1 px-6 py-3 bg-primary hover:bg-secondary text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                  Salvar Marca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
