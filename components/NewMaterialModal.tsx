import React, { useState, useEffect } from 'react';
import { X, Calculator, Box, Tag, Layers, TrendingUp, ShieldCheck, Info, Package, Diamond, DollarSign } from 'lucide-react';
import { Material, Category, Brand, ProductGroup, Supplier } from '../types';

interface NewMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (material: Material) => void;
  editingMaterial: Material | null;
  defaultType: Category;
  brands: Brand[];
  productGroups: ProductGroup[];
  suppliers: Supplier[];
  materials: Material[];
  exchangeRates: { usd: number; eur: number; lastUpdate: string };
}

export const NewMaterialModal: React.FC<NewMaterialModalProps> = ({ 
  isOpen, onClose, onSave, editingMaterial, defaultType,
  brands, productGroups, suppliers, materials, exchangeRates
}) => {
  const [formData, setFormData] = useState<Omit<Material, 'id'>>({
    name: '',
    type: defaultType,
    code: '',
    registrationDate: new Date().toISOString().split('T')[0],
    group: '',
    brand: '',
    unit: 'M2',
    stockQuantity: 0,
    minStock: 0,
    supplier: '',
    stockLocation: '',
    m2PerUnit: 0,
    weight: 0,
    unitCost: 0,
    freightCost: 0,
    lossPercentage: 20,
    taxPercentage: 6,
    profitMargin: 46.5,
    commissionPercentage: 2.5,
    discountPercentage: 5,
    dolarRate: 5.46,
    euroRate: 6.39,
    bcfp: 0,
    suggestedPrice: 0,
    sellingPrice: 0,
    currency: 'BRL',
    status: 'ativo',
    imageUrl: '',
    specialTableMargin: 0,
    specialTableValue: 0,
    specialTableCommission: 0,
    thickness: 0,
    difal: 0,
    nfeData: {
      ncm: '',
      cfop: '',
      icms: 0,
      ipi: 0
    }
  });

  const [activeTab, setActiveTab] = useState<'geral' | 'historico' | 'nfe'>('geral');

  useEffect(() => {
    if (editingMaterial) {
      const { id, ...rest } = editingMaterial;
      setFormData(rest);
    } else {
      // Calculate next code
      const nextCode = materials.length > 0
        ? Math.max(...materials.map(m => parseInt(m.code) || 0)) + 1
        : 1;

      setFormData(prev => ({ 
        ...prev, 
        type: defaultType,
        code: nextCode.toString(),
        registrationDate: new Date().toISOString().split('T')[0],
        status: 'ativo',
        dolarRate: exchangeRates.usd,
        euroRate: exchangeRates.eur
      }));
    }
  }, [editingMaterial, isOpen, defaultType, materials, exchangeRates]);

  // Logic for Price Calculation (Based on screenshot)
  useEffect(() => {
    const cost = Number(formData.unitCost) || 0;
    const difal = Number(formData.difal || 0) / 100;
    const freight = Number(formData.freightCost) || 0;
    const loss = Number(formData.lossPercentage) / 100;
    const taxes = Number(formData.taxPercentage) / 100;
    const margin = Number(formData.profitMargin) / 100;
    const commission = Number(formData.commissionPercentage) / 100;
    const discount = Number(formData.discountPercentage) / 100;

    // Custo Real = Custo * (1 + DIFAL) + Frete
    const costWithDifal = cost * (1 + difal);
    const divisor = (1 - taxes - margin - commission - discount);
    const suggested = divisor > 0 ? (costWithDifal + freight) * (1 + loss) / divisor : 0;

    setFormData(prev => ({
      ...prev,
      suggestedPrice: Number(suggested.toFixed(2))
    }));
  }, [formData.unitCost, formData.difal, formData.freightCost, formData.lossPercentage, formData.taxPercentage, formData.profitMargin, formData.commissionPercentage, formData.discountPercentage]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalMaterial = {
      ...formData,
      id: editingMaterial?.id || Math.random().toString(36).substr(2, 9).toUpperCase(),
    } as Material;

    // Record price history if cost or selling price changed
    const lastEntry = finalMaterial.priceHistory?.[finalMaterial.priceHistory.length - 1];
    if (!lastEntry || 
        lastEntry.cost !== finalMaterial.unitCost || 
        lastEntry.sellingPrice !== finalMaterial.sellingPrice ||
        lastEntry.supplier !== finalMaterial.supplier ||
        lastEntry.difal !== finalMaterial.difal ||
        lastEntry.margin !== finalMaterial.profitMargin ||
        lastEntry.loss !== finalMaterial.lossPercentage ||
        lastEntry.commission !== finalMaterial.commissionPercentage ||
        lastEntry.discount !== finalMaterial.discountPercentage) {
      
      const newEntry = {
        date: new Date().toISOString(),
        cost: finalMaterial.unitCost,
        sellingPrice: finalMaterial.sellingPrice,
        suggestedPrice: finalMaterial.suggestedPrice,
        currency: finalMaterial.currency || 'BRL',
        supplier: finalMaterial.supplier,
        difal: finalMaterial.difal || 0,
        margin: finalMaterial.profitMargin,
        freight: finalMaterial.freightCost,
        tax: finalMaterial.taxPercentage,
        loss: finalMaterial.lossPercentage,
        commission: finalMaterial.commissionPercentage,
        discount: finalMaterial.discountPercentage,
        bcfp: finalMaterial.bcfp,
        dolarRate: finalMaterial.dolarRate,
        euroRate: finalMaterial.euroRate
      };
      finalMaterial.priceHistory = [...(finalMaterial.priceHistory || []), newEntry];
    }

    onSave(finalMaterial);
    onClose();
  };

  const syncRates = () => {
    setFormData(prev => ({
      ...prev,
      dolarRate: exchangeRates.usd,
      euroRate: exchangeRates.eur
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const inputClass = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ec5b13]/20 font-bold text-slate-700 transition-all text-xs";
  const labelClass = "block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl rounded-[32px] shadow-2xl overflow-hidden border border-slate-100">
        {/* Type Selector Header */}
        <div className="bg-slate-100 px-8 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {(['Matéria Prima', 'Produtos de Revenda', 'Serviços', 'Colocação'] as Category[]).map(type => (
              <label key={type} className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="radio" 
                  name="materialType" 
                  className="w-4 h-4 accent-[#ec5b13]"
                  checked={formData.type === type}
                  onChange={() => setFormData({...formData, type})}
                />
                <span className={`text-xs font-black uppercase tracking-wider ${formData.type === type ? 'text-[#ec5b13]' : 'text-slate-400 group-hover:text-slate-600'}`}>
                  {type}
                </span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status:</span>
               <select 
                 className="text-[10px] font-black uppercase text-[#ec5b13] bg-transparent focus:outline-none"
                 value={formData.status}
                 onChange={e => setFormData({...formData, status: e.target.value as 'ativo' | 'inativo'})}
               >
                 <option value="ativo">Ativo</option>
                 <option value="inativo">Inativo</option>
               </select>
             </div>
             <button 
               onClick={() => window.location.href = 'calculator:'}
               title="Abrir Calculadora do Windows"
               className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400"
             >
               <Calculator size={16}/>
             </button>
             <button onClick={onClose} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-400 transition-colors"><X size={20}/></button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-8 flex bg-white border-b border-slate-100">
          <button 
            onClick={() => setActiveTab('geral')}
            className={`py-3 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'geral' ? 'border-[#ec5b13] text-[#ec5b13]' : 'border-transparent text-slate-400'}`}
          >
            Dados Básicos
          </button>
          <button 
            onClick={() => setActiveTab('historico')}
            className={`py-3 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'historico' ? 'border-[#ec5b13] text-[#ec5b13]' : 'border-transparent text-slate-400'}`}
          >
            Histórico de Preços
          </button>
          <button 
            onClick={() => setActiveTab('nfe')}
            className={`py-3 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'nfe' ? 'border-[#ec5b13] text-[#ec5b13]' : 'border-transparent text-slate-400'}`}
          >
            Dados NFe
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {activeTab === 'geral' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Row 1: Code, Date, Group, Manufacturer */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Código</label>
                  <input className={inputClass} value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Data Cadastro</label>
                  <input type="date" className={inputClass} value={formData.registrationDate} onChange={e => setFormData({...formData, registrationDate: e.target.value})} />
                </div>
                <div className="col-span-8">
                  <label className={labelClass}>Grupo do Produto</label>
                  <select className={inputClass} value={formData.group} onChange={e => setFormData({...formData, group: e.target.value})}>
                    <option value="">Selecione...</option>
                    {productGroups.map(g => <option key={g.id} value={g.description}>{g.description}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 2: Descrição e Espessura */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-10">
                  <label className={labelClass}>Descrição</label>
                  <input required className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} placeholder="EX: AGL. BEGE PRIME 20 MM" />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Espessura (CM)</label>
                  <input type="number" step="0.1" className={inputClass} value={formData.thickness || ''} onChange={e => setFormData({...formData, thickness: Number(e.target.value)})} placeholder="0" />
                </div>
              </div>

              {/* Row 3: Marca, Unit, Stock, Min */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4">
                  <label className={labelClass}>Marca</label>
                  <select className={inputClass} value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})}>
                    <option value="">Selecione...</option>
                    {brands.map(b => <option key={b.id} value={b.description}>{b.description}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Und</label>
                  <input className={inputClass} value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value.toUpperCase()})} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Saldo Estoque</label>
                  <input type="number" step="0.01" className={inputClass} value={formData.stockQuantity} onChange={e => setFormData({...formData, stockQuantity: Number(e.target.value)})} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Saldo Mínimo</label>
                  <input type="number" className={inputClass} value={formData.minStock} onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Qtde/Peso</label>
                  <input type="number" step="0.01" className={inputClass} value={formData.weight} onChange={e => setFormData({...formData, weight: Number(e.target.value)})} />
                </div>
              </div>

              {/* Row 4: Fornecedores, Loc Estoque, M2/Unid, Qtde/Peso */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                  <label className={labelClass}>Fornecedor</label>
                  <select className={inputClass} value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})}>
                    <option value="">Selecione...</option>
                    {suppliers.map(s => <option key={s.id} value={s.tradingName}>{s.tradingName}</option>)}
                  </select>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Bottom Multi-Col Layout: Financials | Calculations | Image */}
              <div className="grid grid-cols-12 gap-8">
                {/* Panel 1: Financial Inputs */}
                <div className="col-span-4 space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                     <label className={labelClass}>Custo Unitário (R$)</label>
                     <input type="number" step="0.01" className={`${inputClass} !w-24 text-right`} value={formData.unitCost} onChange={e => setFormData({...formData, unitCost: Number(e.target.value)})} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                     <label className={labelClass}>DIFAL (%)</label>
                     <input type="number" step="0.1" className={`${inputClass} !w-20 text-right`} value={formData.difal} onChange={e => setFormData({...formData, difal: Number(e.target.value)})} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                     <label className={labelClass}>Frete (R$)</label>
                     <input type="number" step="0.01" className={`${inputClass} !w-24 text-right`} value={formData.freightCost} onChange={e => setFormData({...formData, freightCost: Number(e.target.value)})} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                     <label className={labelClass}>Perdas (%)</label>
                     <input type="number" step="0.1" className={`${inputClass} !w-20 text-right`} value={formData.lossPercentage} onChange={e => setFormData({...formData, lossPercentage: Number(e.target.value)})} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                     <label className={labelClass}>Imposto (%)</label>
                     <input type="number" step="0.1" className={`${inputClass} !w-20 text-right`} value={formData.taxPercentage} onChange={e => setFormData({...formData, taxPercentage: Number(e.target.value)})} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                     <label className={labelClass}>Ganho (Margem %)</label>
                     <input type="number" step="0.1" className={`${inputClass} !w-20 text-right`} value={formData.profitMargin} onChange={e => setFormData({...formData, profitMargin: Number(e.target.value)})} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                     <label className={labelClass}>Comis. Vendedor (%)</label>
                     <input type="number" step="0.1" className={`${inputClass} !w-20 text-right`} value={formData.commissionPercentage} onChange={e => setFormData({...formData, commissionPercentage: Number(e.target.value)})} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                     <label className={labelClass}>Desconto (%)</label>
                     <input type="number" step="0.1" className={`${inputClass} !w-20 text-right`} value={formData.discountPercentage} onChange={e => setFormData({...formData, discountPercentage: Number(e.target.value)})} />
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                    <div className="flex-1 relative group">
                      <label className={labelClass}>
                        Dolar {exchangeRates.usd === 0 && <span className="text-[8px] text-red-400 animate-pulse ml-1">(CARREGANDO...)</span>}
                      </label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className={`${inputClass} ${formData.dolarRate === 0 ? 'border-red-100 bg-red-50/10' : ''}`} 
                        value={formData.dolarRate} 
                        onChange={e => setFormData({...formData, dolarRate: Number(e.target.value)})} 
                      />
                      <button 
                        type="button" 
                        title="Sincronizar com cotação atual"
                        onClick={() => setFormData(prev => ({...prev, dolarRate: exchangeRates.usd}))} 
                        className={`absolute right-2 top-6 p-1 rounded-md transition-all ${exchangeRates.usd > 0 ? 'text-[#ec5b13] hover:bg-orange-50 bg-white shadow-sm border border-slate-100' : 'text-slate-300 opacity-50 cursor-not-allowed'}`}
                      >
                        <TrendingUp size={12} />
                      </button>
                    </div>
                    <div className="flex-1 relative group">
                      <label className={labelClass}>
                        Euro {exchangeRates.eur === 0 && <span className="text-[8px] text-red-400 animate-pulse ml-1">(CARREGANDO...)</span>}
                      </label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className={`${inputClass} ${formData.euroRate === 0 ? 'border-red-100 bg-red-50/10' : ''}`} 
                        value={formData.euroRate} 
                        onChange={e => setFormData({...formData, euroRate: Number(e.target.value)})} 
                      />
                      <button 
                        type="button" 
                        title="Sincronizar com cotação atual"
                        onClick={() => setFormData(prev => ({...prev, euroRate: exchangeRates.eur}))} 
                        className={`absolute right-2 top-6 p-1 rounded-md transition-all ${exchangeRates.eur > 0 ? 'text-[#ec5b13] hover:bg-orange-50 bg-white shadow-sm border border-slate-100' : 'text-slate-300 opacity-50 cursor-not-allowed'}`}
                      >
                        <TrendingUp size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Suggestion and Special Table */}
                <div className="col-span-4 space-y-6">
                  <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl">
                     <label className={labelClass}>BCFP</label>
                     <input type="number" className={inputClass} value={formData.bcfp} onChange={e => setFormData({...formData, bcfp: Number(e.target.value)})} />
                     
                     <div className="mt-4 pt-4 border-t border-orange-200">
                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-1">Vlr. Venda Sugerido</span>
                        <div className="text-2xl font-black text-[#ec5b13]">R$ {formData.suggestedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                     </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl space-y-3">
                    <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest border-b border-blue-100 pb-2">Tabela Especial</h4>
                    <div className="flex items-center justify-between">
                       <label className={labelClass}>Mar. Tab. Esp. %</label>
                       <input type="number" className={`${inputClass} !w-16 text-right`} value={formData.specialTableMargin} onChange={e => setFormData({...formData, specialTableMargin: Number(e.target.value)})} />
                    </div>
                    <div className="flex items-center justify-between">
                       <label className={labelClass}>TAB. ESPECIAL</label>
                       <input type="number" className={`${inputClass} !w-24 text-right`} value={formData.specialTableValue} onChange={e => setFormData({...formData, specialTableValue: Number(e.target.value)})} />
                    </div>
                    <div className="flex items-center justify-between">
                       <label className={labelClass}>COM. TAB. ESP (%)</label>
                       <input type="number" className={`${inputClass} !w-16 text-right`} value={formData.specialTableCommission} onChange={e => setFormData({...formData, specialTableCommission: Number(e.target.value)})} />
                    </div>
                  </div>
                </div>

                {/* Panel 3: Result and Image */}
                <div className="col-span-4 space-y-4">
                  <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl shadow-slate-200">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Preço de Venda Praticado</label>
                    <div className="flex items-center gap-3">
                       <span className="text-xl font-black text-slate-400">R$</span>
                       <input 
                         type="number" 
                         step="0.01" 
                         className="bg-transparent border-b-2 border-slate-700 w-full text-3xl font-black focus:outline-none focus:border-[#ec5b13] transition-colors" 
                         value={formData.sellingPrice} 
                         onChange={e => setFormData({...formData, sellingPrice: Number(e.target.value)})} 
                       />
                    </div>
                     <button 
                       type="button" 
                       onClick={() => setFormData(prev => ({ ...prev, sellingPrice: prev.suggestedPrice }))}
                       className="w-full mt-4 bg-[#ec5b13] py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#d84a0d] transition-all transform active:scale-95"
                     >
                       <TrendingUp size={14}/> Compor Preço de Venda
                     </button>
                  </div>

                  <div className="flex-1 flex flex-col gap-3">
                    <div className="bg-slate-100 p-2 rounded-xl flex items-center justify-around">
                       {(['BRL', 'USD', 'EUR'] as const).map(curr => (
                         <label key={curr} className="flex items-center gap-1 cursor-pointer">
                           <input 
                             type="radio" 
                             className="accent-[#ec5b13]" 
                             checked={formData.currency === curr} 
                             onChange={() => setFormData({...formData, currency: curr})}
                           />
                           <span className="text-[10px] font-black text-slate-500">{curr}</span>
                         </label>
                       ))}
                    </div>
                    <div className="relative group flex-1 min-h-[160px]">
                      <div className="absolute inset-0 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center overflow-hidden">
                        {formData.imageUrl ? (
                          <img src={formData.imageUrl} alt="Sample" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-slate-400 p-4 text-center">
                            <Box size={32} className="text-slate-300 mb-1" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Amostra de Material</span>
                            <div className="space-y-1 mt-1">
                               <p className="text-[9px] font-medium leading-tight">Ideal: Quadrada (1:1)</p>
                               <p className="text-[9px] font-medium leading-tight text-slate-300">800x800px até 1024x1024px</p>
                               <p className="text-[9px] font-medium leading-tight text-slate-300">Máx: 2MB (JPG/PNG)</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                      {formData.imageUrl && (
                        <button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={12}/>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'historico' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Fornecedor</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Base de Custo</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Encargos / Variáveis</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Preço Final (Sug/Prat)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.priceHistory && formData.priceHistory.length > 0 ? (
                      [...formData.priceHistory].reverse().map((entry, idx) => (
                        <tr key={idx} className="hover:bg-white transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700">
                                {new Date(entry.date).toLocaleDateString('pt-BR')}
                              </span>
                              <span className="text-[10px] text-[var(--primary-color)] font-black uppercase truncate max-w-[150px]">
                                {entry.supplier || 'NÃO INFORMADO'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-slate-600">
                                {entry.currency} {entry.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <div className="flex gap-2 mt-0.5">
                                <span className="text-[9px] text-slate-400 font-bold">DIFAL: {entry.difal}%</span>
                                <span className="text-[9px] text-slate-400 font-bold">FRETE: R$ {entry.freight?.toLocaleString('pt-BR')}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap justify-center gap-1.5 max-w-[180px] mx-auto">
                               <div className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black" title="Margem de Lucro">MAR: {entry.margin}%</div>
                               <div className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[9px] font-black" title="Perdas">PER: {entry.loss}%</div>
                               <div className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black" title="Impostos">IMP: {entry.tax}%</div>
                               <div className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black" title="Comissão">COM: {entry.commission}%</div>
                               <div className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded text-[9px] font-black" title="Desconto">DESC: {entry.discount}%</div>
                               {entry.bcfp > 0 && <div className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[9px] font-black" title="BCFP">BCFP: {entry.bcfp}</div>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end">
                               <span className="text-sm font-black text-slate-900 leading-none">R$ {entry.sellingPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                               <span className="text-[10px] font-bold text-slate-400 mt-1">Sug: R$ {entry.suggestedPrice?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center gap-2">
                             <DollarSign size={24} className="opacity-20" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Nenhum histórico registrado</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'nfe' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>NCM</label>
                    <input className={inputClass} value={formData.nfeData?.ncm} onChange={e => setFormData({...formData, nfeData: {...formData.nfeData!, ncm: e.target.value}})} />
                  </div>
                  <div>
                    <label className={labelClass}>CFOP</label>
                    <input className={inputClass} value={formData.nfeData?.cfop} onChange={e => setFormData({...formData, nfeData: {...formData.nfeData!, cfop: e.target.value}})} />
                  </div>
                  <div>
                    <label className={labelClass}>ICMS (%)</label>
                    <input type="number" className={inputClass} value={formData.nfeData?.icms} onChange={e => setFormData({...formData, nfeData: {...formData.nfeData!, icms: Number(e.target.value)}})} />
                  </div>
                  <div>
                    <label className={labelClass}>IPI (%)</label>
                    <input type="number" className={inputClass} value={formData.nfeData?.ipi} onChange={e => setFormData({...formData, nfeData: {...formData.nfeData!, ipi: Number(e.target.value)}})} />
                  </div>
               </div>
            </div>
          )}
        </form>

         <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
           <div className="flex gap-3">
             <button onClick={onClose} type="button" className="px-6 py-3 rounded-2xl font-bold text-slate-400 hover:text-slate-600 transition-all">Cancela</button>
             <button onClick={handleSubmit} className="px-10 py-3 bg-[#ec5b13] text-white rounded-2xl font-black shadow-lg shadow-[#ec5b13]/20 hover:bg-[#d84a0d] transition-all transform hover:scale-[1.02] active:scale-95">Grava Registro</button>
           </div>
        </div>
      </div>
    </div>
  );
};
