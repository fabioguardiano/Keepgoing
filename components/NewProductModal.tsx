import React, { useState, useEffect } from 'react';
import { X, Calculator, Box, Tag, Layers, TrendingUp, ShieldCheck, Mail, Info } from 'lucide-react';
import { ProductService, View } from '../types';
import { UNITS, DEFAULT_UNIT_PRODUCT } from '../utils/units';

interface NewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: ProductService) => void;
  editingProduct: ProductService | null;
  defaultType: ProductService['type'];
  brands?: { code: string, description: string }[];
  productGroups?: { code: string, description: string }[];
  products: ProductService[];
}

export const NewProductModal: React.FC<NewProductModalProps> = ({ 
  isOpen, onClose, onSave, editingProduct, defaultType,
  brands = [], productGroups = [], products
}) => {
  const [formData, setFormData] = useState<Omit<ProductService, 'id' | 'createdAt'>>({
    type: defaultType,
    code: '',
    group: '',
    description: '',
    unit: DEFAULT_UNIT_PRODUCT,
    stockBalance: 0,
    minStock: 0,
    unitCost: 0,
    freight: 0,
    lossPercentage: 0,
    taxPercentage: 0,
    profitMargin: 0,
    commissionPercentage: 0,
    discountPercentage: 0,
    suggestedPrice: 0,
    sellingPrice: 0,
    imageUrl: '',
    status: 'ativo',
  });

  const [activeTab, setActiveTab] = useState<'geral' | 'precos' | 'nfe'>('geral');
  const [brlDisplay, setBrlDisplay] = useState({ unitCost: '0,00', freight: '0,00', sellingPrice: '0,00' });

  const fmtBRL = (n: number) => (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const parseBRL = (s: string) => parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;

  useEffect(() => {
    const categoryProducts = products.filter(p => p.type === defaultType);
    const maxCode = categoryProducts.length > 0
      ? Math.max(...categoryProducts.map(p => parseInt(p.code) || 0))
      : 0;
    const nextCode = String(maxCode + 1).padStart(2, '0');

    if (editingProduct) {
      const { id, createdAt, ...rest } = editingProduct;
      const normalizedCode = rest.code
        ? String(parseInt(rest.code) || 0).padStart(2, '0')
        : nextCode;
      const data = { ...rest, code: normalizedCode };
      setFormData(data);
      setBrlDisplay({
        unitCost: fmtBRL(data.unitCost),
        freight: fmtBRL(data.freight),
        sellingPrice: fmtBRL(data.sellingPrice),
      });
    } else {
      setFormData({
        type: defaultType,
        code: nextCode,
        group: '',
        description: '',
        unit: DEFAULT_UNIT_PRODUCT,
        stockBalance: 0,
        minStock: 0,
        unitCost: 0,
        freight: 0,
        lossPercentage: 0,
        taxPercentage: 0,
        profitMargin: 0,
        commissionPercentage: 0,
        discountPercentage: 0,
        suggestedPrice: 0,
        sellingPrice: 0,
        imageUrl: '',
        status: 'ativo',
      });
      setBrlDisplay({ unitCost: '0,00', freight: '0,00', sellingPrice: '0,00' });
    }
  }, [editingProduct, isOpen, defaultType, products]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Price Calculation Logic
  useEffect(() => {
    const cost = Number(formData.unitCost) || 0;
    const freightVal = Number(formData.freight) || 0;
    const loss = Number(formData.lossPercentage) / 100;
    const taxes = Number(formData.taxPercentage) / 100;
    const margin = Number(formData.profitMargin) / 100;
    const commission = Number(formData.commissionPercentage) / 100;

    // Based on the legacy system logic: Cost with losses and taxes + desired margin
    // Suggested = (Cost + Freight) * (1 + Loss) / (1 - Taxes - Margin - Commission)
    const divisor = (1 - taxes - margin - commission);
    const suggested = divisor > 0 ? (cost + freightVal) * (1 + loss) / divisor : 0;

    setFormData(prev => ({
      ...prev,
      suggestedPrice: Number(suggested.toFixed(2))
    }));
  }, [formData.unitCost, formData.freight, formData.lossPercentage, formData.taxPercentage, formData.profitMargin, formData.commissionPercentage]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: editingProduct?.id || crypto.randomUUID(),
      createdAt: editingProduct?.createdAt || new Date().toISOString()
    });
    onClose();
  };

  const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 font-bold text-slate-700 transition-all text-sm";
  const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-[var(--primary-color)] p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Calculator size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">{editingProduct ? 'Editar Cadastro' : 'Manutenção de Cadastro'}</h2>
              <p className="text-white/70 text-xs font-bold uppercase tracking-wider">{formData.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10">
              <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Status:</span>
              <select 
                className="text-[10px] font-black uppercase text-white bg-transparent focus:outline-none cursor-pointer"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as 'ativo' | 'inativo'})}
              >
                <option value="ativo" className="text-slate-800">Ativo</option>
                <option value="inativo" className="text-slate-800">Inativo</option>
              </select>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="px-8 flex border-b border-slate-100 bg-white">
          {[
            { id: 'geral', label: 'Dados Básicos', icon: Box },
            { id: 'precos', label: 'Formação de Preço', icon: TrendingUp },
            { id: 'nfe', label: 'Dados NFe', icon: ShieldCheck }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-4 text-xs font-black flex items-center gap-2 border-b-2 transition-all uppercase tracking-widest ${
                activeTab === tab.id ? 'border-[var(--primary-color)] text-[var(--primary-color)]' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-8 max-h-[65vh] overflow-y-auto custom-scrollbar bg-white">
          {activeTab === 'geral' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1">
                  <label className={labelClass}>Código</label>
                  <input required readOnly className={`${inputClass} bg-slate-100 cursor-not-allowed`} value={formData.code} onChange={() => {}} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Grupo de Produto</label>
                  <select 
                    className={inputClass}
                    value={formData.group}
                    onChange={e => setFormData({...formData, group: e.target.value})}
                  >
                    <option value="">Selecione um grupo...</option>
                    {productGroups.map(group => (
                      <option key={group.code} value={group.description}>
                        {group.code} - {group.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className={labelClass}>Nº Fabricante</label>
                  <input className={inputClass} value={formData.manufacturerNumber || ''} onChange={e => setFormData({...formData, manufacturerNumber: e.target.value})} />
                </div>
                <div className="md:col-span-4">
                  <label className={labelClass}>Descrição do Produto / Serviço</label>
                  <input required className={inputClass} placeholder="EX: CUBA DE LOUCA EMBUTIR RETANGULAR BRANCA..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Marca</label>
                  <select 
                    className={inputClass}
                    value={formData.brand || ''}
                    onChange={e => setFormData({...formData, brand: e.target.value})}
                  >
                    <option value="">Selecione uma marca...</option>
                    {brands.map(brand => (
                      <option key={brand.code} value={brand.description}>
                        {brand.code} - {brand.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Unidade</label>
                  <select required className={inputClass} value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                    {UNITS.map(u => (
                      <option key={u.value} value={u.value}>{u.label} — {u.description}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4 md:col-span-1">
                  <div>
                    <label className={labelClass}>Estoque</label>
                    <input type="number" className={inputClass} value={formData.stockBalance} onChange={e => setFormData({...formData, stockBalance: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className={labelClass}>Mínimo</label>
                    <input type="number" className={inputClass} value={formData.minStock} onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="md:col-span-4 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <label className={labelClass}>Foto da Matéria Prima / Produto</label>
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <div className="w-32 h-32 bg-white rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden shadow-inner font-black text-slate-200 uppercase text-[10px] tracking-widest">
                        {formData.imageUrl ? (
                          <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                             <Box size={32} />
                             <span>Sem Foto</span>
                          </div>
                        )}
                      </div>
                      {formData.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] text-slate-500 mb-3 font-medium">Use fotos nítidas para facilitar a identificação em orçamentos e pedidos. Formatos aceitos: JPG, PNG. Máx: 2MB.</p>
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
                        <span>Escolher Imagem</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'precos' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Cost Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Layers size={14} /> Custos de Entrada
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Custo Unitário (R$)</label>
                      <input type="text" inputMode="decimal" className={inputClass} value={brlDisplay.unitCost}
                        onChange={e => { const r = e.target.value.replace(/[^0-9,]/g,''); setBrlDisplay(p=>({...p,unitCost:r})); setFormData(p=>({...p,unitCost:parseBRL(r)})); }}
                        onBlur={() => setBrlDisplay(p=>({...p,unitCost:fmtBRL(formData.unitCost)}))} />
                    </div>
                    <div>
                      <label className={labelClass}>Frete (R$)</label>
                      <input type="text" inputMode="decimal" className={inputClass} value={brlDisplay.freight}
                        onChange={e => { const r = e.target.value.replace(/[^0-9,]/g,''); setBrlDisplay(p=>({...p,freight:r})); setFormData(p=>({...p,freight:parseBRL(r)})); }}
                        onBlur={() => setBrlDisplay(p=>({...p,freight:fmtBRL(formData.freight)}))} />
                    </div>
                    <div>
                      <label className={labelClass}>Perdas (%)</label>
                      <input type="number" className={inputClass} value={formData.lossPercentage} onChange={e => setFormData({...formData, lossPercentage: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className={labelClass}>Imposto (%)</label>
                      <input type="number" className={inputClass} value={formData.taxPercentage} onChange={e => setFormData({...formData, taxPercentage: Number(e.target.value)})} />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-orange-50/30 rounded-[24px] border border-orange-100 space-y-4">
                  <h3 className="text-[10px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp size={14} /> Margens e Venda
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Lucro Desejado (%)</label>
                      <input type="number" className={inputClass} value={formData.profitMargin} onChange={e => setFormData({...formData, profitMargin: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className={labelClass}>Comissão (%)</label>
                      <input type="number" className={inputClass} value={formData.commissionPercentage} onChange={e => setFormData({...formData, commissionPercentage: Number(e.target.value)})} />
                    </div>
                    <div className="col-span-2">
                      <div className="bg-white p-4 rounded-xl border border-orange-100">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Simulador de Resultado</label>
                        <div className="flex justify-between items-end">
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Sugerido</div>
                            <div className="text-xl font-black text-[var(--primary-color)]">R$ {formData.suggestedPrice.toFixed(2)}</div>
                          </div>
                          <div className="text-right">
                            <label className={labelClass}>Preço Praticado</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-right font-black text-slate-800"
                              value={brlDisplay.sellingPrice}
                              onChange={e => { const r = e.target.value.replace(/[^0-9,]/g,''); setBrlDisplay(p=>({...p,sellingPrice:r})); setFormData(p=>({...p,sellingPrice:parseBRL(r)})); }}
                              onBlur={() => setBrlDisplay(p=>({...p,sellingPrice:fmtBRL(formData.sellingPrice)}))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 text-[10px] font-bold">
                <Info size={16} />
                O preço sugerido é calculado automaticamente com base no Markup técnico configurado.
              </div>
            </div>
          )}

          {activeTab === 'nfe' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>NCM (Classificação Fiscal)</label>
                  <input className={inputClass} placeholder="0000.00.00" value={formData.nfeData?.ncm || ''} onChange={e => setFormData({...formData, nfeData: {...(formData.nfeData || {cfop: '', icms: 0, ipi: 0}), ncm: e.target.value}})} />
                </div>
                <div>
                  <label className={labelClass}>CFOP Padrão</label>
                  <input className={inputClass} placeholder="5102" value={formData.nfeData?.cfop || ''} onChange={e => setFormData({...formData, nfeData: {...(formData.nfeData || {ncm: '', icms: 0, ipi: 0}), cfop: e.target.value}})} />
                </div>
                <div>
                  <label className={labelClass}>ICMS (%)</label>
                  <input type="number" className={inputClass} value={formData.nfeData?.icms || 0} onChange={e => setFormData({...formData, nfeData: {...(formData.nfeData || {ncm: '', cfop: '', ipi: 0}), icms: Number(e.target.value)}})} />
                </div>
                <div>
                  <label className={labelClass}>IPI (%)</label>
                  <input type="number" className={inputClass} value={formData.nfeData?.ipi || 0} onChange={e => setFormData({...formData, nfeData: {...(formData.nfeData || {ncm: '', cfop: '', icms: 0}), ipi: Number(e.target.value)}})} />
                </div>
              </div>
            </div>
          )}
        </form>

        <div className="p-8 bg-slate-50 flex justify-end gap-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-200 transition-all">Cancelar</button>
          <button onClick={handleSubmit} className="px-8 py-3 bg-[var(--primary-color)] text-white rounded-2xl font-black shadow-lg shadow-[var(--primary-color)]/20 hover:bg-[var(--secondary-color)] transition-all transform hover:scale-[1.02] active:scale-95">Salvar Cadastro Técnico</button>
        </div>
      </div>
    </div>
  );
};
