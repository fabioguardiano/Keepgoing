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
    lossPercentage: 10,
    taxPercentage: 6,
    profitMargin: 45,
    commissionPercentage: 2.5,
    discountPercentage: 5,
    dolarRate: 5.46,
    euroRate: 6.39,
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
    cmv: 0,
    contributionMargin: 0,
    nfeData: {
      ncm: '',
      cfop: '',
      icms: 0,
      ipi: 0
    }
  });

  const [activeTab, setActiveTab] = useState<'geral' | 'historico' | 'nfe'>('geral');
  const [brlDisplay, setBrlDisplay] = useState({ unitCost: '0,00', freightCost: '0,00', sellingPrice: '0,00' });

  const fmtBRL = (n: number) => (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const parseBRL = (s: string) => parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;

  useEffect(() => {
    if (editingMaterial) {
      const { id, ...rest } = editingMaterial;
      setFormData(rest);
      setBrlDisplay({
        unitCost: fmtBRL(rest.unitCost),
        freightCost: fmtBRL(rest.freightCost),
        sellingPrice: fmtBRL(rest.sellingPrice),
      });
    } else {
      const nextCode = materials.length > 0
        ? Math.max(...materials.map(m => parseInt(m.code) || 0)) + 1
        : 1;

      setFormData({
        name: '',
        type: defaultType,
        code: nextCode.toString().padStart(4, '0'),
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
        lossPercentage: 10,
        taxPercentage: 6,
        profitMargin: 45,
        commissionPercentage: 2.5,
        discountPercentage: 5,
        dolarRate: exchangeRates.usd,
        euroRate: exchangeRates.eur,
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
        cmv: 0,
        contributionMargin: 0,
        nfeData: { ncm: '', cfop: '', icms: 0, ipi: 0 }
      });
      setBrlDisplay({ unitCost: '0,00', freightCost: '0,00', sellingPrice: '0,00' });
    }
  }, [editingMaterial, isOpen, defaultType, materials, exchangeRates]);

  // Logic for Price Calculation (Professional Markup Divisor)
  useEffect(() => {
    const cost = Number(formData.unitCost) || 0;
    const difal = Number(formData.difal || 0) / 100;
    const freight = Number(formData.freightCost) || 0;
    const loss = Number(formData.lossPercentage) / 100;
    const taxes = Number(formData.taxPercentage) / 100;
    const margin = Number(formData.profitMargin) / 100;
    const commission = Number(formData.commissionPercentage) / 100;
    const discount = Number(formData.discountPercentage) / 100;

    // 1. Custo Base (Fábrica + Imposto de Entrada + Logística)
    const costBase = (cost * (1 + difal)) + freight;
    
    // 2. CMV (Ajustado pela Perda Física/Yield)
    const cmvValue = costBase / (1 - loss);
    
    // 3. Divisor de Markup
    const divisor = (1 - taxes - margin - commission - discount);
    
    // 4. Preço Sugerido e Margem Monetária
    const suggested = divisor > 0 ? cmvValue / divisor : 0;
    const marginAmount = suggested * margin;

    setFormData(prev => ({
      ...prev,
      suggestedPrice: Number(suggested.toFixed(2)),
      cmv: Number(cmvValue.toFixed(2)),
      contributionMargin: Number(marginAmount.toFixed(2))
    }));
  }, [formData.unitCost, formData.difal, formData.freightCost, formData.lossPercentage, formData.taxPercentage, formData.profitMargin, formData.commissionPercentage, formData.discountPercentage]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalMaterial = {
      ...formData,
      id: editingMaterial?.id || crypto.randomUUID(),
    } as Material;

    // Record price history if key indicators changed
    const lastEntry = finalMaterial.priceHistory?.[finalMaterial.priceHistory.length - 1];
    if (!lastEntry || 
        lastEntry.cost !== finalMaterial.unitCost || 
        lastEntry.sellingPrice !== finalMaterial.sellingPrice ||
        lastEntry.loss !== finalMaterial.lossPercentage ||
        lastEntry.margin !== finalMaterial.profitMargin) {
      
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
        cmv: finalMaterial.cmv || 0,
        contributionMargin: finalMaterial.contributionMargin || 0,
        dolarRate: finalMaterial.dolarRate,
        euroRate: finalMaterial.euroRate
      };
      finalMaterial.priceHistory = [...(finalMaterial.priceHistory || []), newEntry];
    }

    onSave(finalMaterial);
    onClose();
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

  const inputClass = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 font-bold text-slate-700 transition-all text-xs";
  const labelClass = "block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-100 px-8 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-[var(--primary-color)]">Cadastro de Matéria Prima</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status:</span>
               <select 
                 className="text-[10px] font-black uppercase text-[var(--primary-color)] bg-transparent focus:outline-none"
                 value={formData.status}
                 onChange={e => setFormData({...formData, status: e.target.value as 'ativo' | 'inativo'})}
               >
                 <option value="ativo">Ativo</option>
                 <option value="inativo">Inativo</option>
               </select>
             </div>
             <button type="button" onClick={() => window.location.href = 'calculator:'} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400">
               <Calculator size={16}/>
             </button>
             <button onClick={onClose} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-400 transition-colors"><X size={20}/></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8 flex bg-white border-b border-slate-100">
          {(['geral', 'historico', 'nfe'] as const).map(tab => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`py-3 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-[var(--primary-color)] text-[var(--primary-color)]' : 'border-transparent text-slate-400'}`}>
              {tab === 'geral' ? 'Dados & Precificação' : tab === 'historico' ? 'Histórico' : 'Fiscal/NFe'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-white">
          {activeTab === 'geral' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* Product Info Section */}
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-2">
                    <label className={labelClass}>Código</label>
                    <input readOnly className={`${inputClass} bg-slate-100 text-slate-400 cursor-not-allowed`} value={formData.code} />
                  </div>
                  <div className="col-span-10">
                    <label className={labelClass}>Nome do Material</label>
                    <input required className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} placeholder="AGL. BEGE PRIME 20 MM" />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4">
                    <label className={labelClass}>Grupo / Categoria</label>
                    <select className={inputClass} value={formData.group} onChange={e => setFormData({...formData, group: e.target.value})}>
                      <option value="">Selecione...</option>
                      {productGroups.map(g => <option key={g.id} value={g.description}>{g.description}</option>)}
                    </select>
                  </div>
                  <div className="col-span-4">
                    <label className={labelClass}>Marca / Fabricante</label>
                    <select className={inputClass} value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})}>
                      <option value="">Selecione...</option>
                      {brands.map(b => <option key={b.id} value={b.description}>{b.description}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Unidade</label>
                    <input className={inputClass} value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value.toUpperCase()})} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Espessura (CM)</label>
                    <input type="number" step="0.1" className={inputClass} value={formData.thickness || ''} onChange={e => setFormData({...formData, thickness: Number(e.target.value)})} />
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Pricing Module */}
              <div className="grid grid-cols-12 gap-8">
                
                {/* Fixed Inputs Panel */}
                <div className="col-span-4 space-y-3 bg-slate-50/50 p-5 rounded-3xl border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <DollarSign size={14} className="text-slate-400" /> Variáveis de Custo
                  </h4>
                  
                  <div className="flex items-center justify-between gap-4">
                    <label className={labelClass}>Custo Fábrica</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-[10px] font-bold text-slate-400">R$</span>
                      <input type="text" className={`${inputClass} !w-28 text-right !pl-7`} value={brlDisplay.unitCost}
                        onChange={e => { const r = e.target.value.replace(/[^0-9,]/g,''); setBrlDisplay(p=>({...p,unitCost:r})); setFormData(p=>({...p,unitCost:parseBRL(r)})); }}
                        onBlur={() => setBrlDisplay(p=>({...p,unitCost:fmtBRL(formData.unitCost)}))} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <label className={labelClass}>DIFAL (%)</label>
                    <input type="number" step="0.1" className={`${inputClass} !w-20 text-right`} value={formData.difal} onChange={e => setFormData({...formData, difal: Number(e.target.value)})} />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <label className={labelClass}>Frete / Logística</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-[10px] font-bold text-slate-400">R$</span>
                      <input type="text" className={`${inputClass} !w-28 text-right !pl-7`} value={brlDisplay.freightCost}
                        onChange={e => { const r = e.target.value.replace(/[^0-9,]/g,''); setBrlDisplay(p=>({...p,freightCost:r})); setFormData(p=>({...p,freightCost:parseBRL(r)})); }}
                        onBlur={() => setBrlDisplay(p=>({...p,freightCost:fmtBRL(formData.freightCost)}))} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <label className={labelClass}>Perda Física (%)</label>
                    <input type="number" step="0.1" className={`${inputClass} !w-20 text-right text-red-500`} value={formData.lossPercentage} onChange={e => setFormData({...formData, lossPercentage: Number(e.target.value)})} />
                  </div>

                  <div className="pt-4 space-y-3 border-t border-slate-200">
                    <div className="flex items-center justify-between gap-4">
                      <label className={labelClass}>Imposto Saída (%)</label>
                      <input type="number" step="0.1" className={`${inputClass} !w-20 text-right`} value={formData.taxPercentage} onChange={e => setFormData({...formData, taxPercentage: Number(e.target.value)})} />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <label className={labelClass}>Margem Lucro (%)</label>
                      <input type="number" step="0.1" className={`${inputClass} !w-20 text-right text-emerald-600`} value={formData.profitMargin} onChange={e => setFormData({...formData, profitMargin: Number(e.target.value)})} />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <label className={labelClass}>Comissões (%)</label>
                      <input type="number" step="0.1" className={`${inputClass} !w-20 text-right`} value={formData.commissionPercentage} onChange={e => setFormData({...formData, commissionPercentage: Number(e.target.value)})} />
                    </div>
                  </div>
                </div>

                {/* Analysis and Suggestion Panel */}
                <div className="col-span-4 space-y-6">
                  
                  {/* Rentability Section */}
                  <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[32px] shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                       <TrendingUp size={16} className="text-emerald-500" />
                       <h4 className="text-[11px] font-black text-emerald-700 uppercase tracking-[0.2em]">Análise de Rentabilidade</h4>
                    </div>

                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                         <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600/70 uppercase tracking-widest" title="Custo Base dividido pelo rendimento (Yield). Considera impostos de entrada e perdas físicas.">
                           CMV (Real)
                           <span className="text-emerald-300"><Info size={12}/></span>
                         </span>
                         <span className="text-sm font-black text-emerald-800">R$ {formData.cmv?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-emerald-100/50">
                         <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600/70 uppercase tracking-widest" title="Valor líquido aproximado retido por venda após pagar custos e impostos.">
                           Margem (R$)
                           <span className="text-emerald-300"><Info size={12}/></span>
                         </span>
                         <span className="text-sm font-black text-emerald-600">R$ {formData.contributionMargin?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>

                      <div className="pt-4 mt-2 border-t border-emerald-100">
                         <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.2em] block mb-1">Sugestão Markup</label>
                         <div className="text-3xl font-black text-emerald-900 leading-none">R$ {formData.suggestedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                  </div>

                  {/* Special Table Integration */}
                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-3xl space-y-4">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tabela Especial B2B</h4>
                     <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100">
                        <label className={labelClass}>Valor Fixo</label>
                        <input type="number" className="bg-transparent text-right font-black text-slate-700 w-24 focus:outline-none" value={formData.specialTableValue} onChange={e => setFormData({...formData, specialTableValue: Number(e.target.value)})} />
                     </div>
                  </div>
                </div>

                {/* Final Selection & Image */}
                <div className="col-span-4 space-y-6">
                  
                  {/* Applied Price */}
                  <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-xl ring-8 ring-slate-100">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Preço Final de Venda</label>
                    <div className="flex items-center gap-2 mb-6">
                       <span className="text-xl font-black text-slate-600">R$</span>
                       <input
                         type="text"
                         className="bg-transparent border-b-2 border-slate-700 w-full text-3xl font-black focus:outline-none focus:border-emerald-500 transition-colors"
                         value={brlDisplay.sellingPrice}
                         onChange={e => { const r = e.target.value.replace(/[^0-9,]/g,''); setBrlDisplay(p=>({...p,sellingPrice:r})); setFormData(p=>({...p,sellingPrice:parseBRL(r)})); }}
                         onBlur={() => setBrlDisplay(p=>({...p,sellingPrice:fmtBRL(formData.sellingPrice)}))}
                       />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        const newPrice = formData.suggestedPrice;
                        setFormData(prev => ({ ...prev, sellingPrice: newPrice }));
                        setBrlDisplay(prev => ({ ...prev, sellingPrice: fmtBRL(newPrice) }));
                      }} 
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2"
                    >
                       <ShieldCheck size={14} /> Aplicar Sugestão
                    </button>
                  </div>

                  {/* Material Sample */}
                  <div className="relative group rounded-3xl overflow-hidden bg-slate-50 border-2 border-dashed border-slate-200 h-44 flex items-center justify-center">
                    {formData.imageUrl ? (
                      <>
                        <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                        <button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-300">
                        <Box size={32} />
                        <span className="text-[10px] font-black uppercase">Adicionar Amostra</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'historico' && (
            <div className="animate-in fade-in duration-300">
              <div className="bg-slate-50 rounded-[32px] border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-200/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      <th className="px-6 py-4">Data Registro</th>
                      <th className="px-6 py-4 text-center">Configurações</th>
                      <th className="px-6 py-4 text-right">Preços (Sug/Prat)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.priceHistory && formData.priceHistory.length > 0 ? (
                      [...formData.priceHistory].reverse().map((entry, i) => (
                        <tr key={i} className="text-xs group hover:bg-white transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-700">{new Date(entry.date).toLocaleDateString()}</p>
                            <p className="text-[10px] text-slate-400">{entry.supplier || 'Geral'}</p>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex justify-center gap-2">
                               <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md font-black text-[9px] uppercase">CMV: {entry.cmv}</span>
                               <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md font-black text-[9px] uppercase">LUC: {entry.margin}%</span>
                               <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-md font-black text-[9px] uppercase">PER: {entry.loss}%</span>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <p className="font-black text-slate-900">R$ {entry.sellingPrice.toLocaleString()}</p>
                             <p className="text-[10px] text-slate-400">Sug: R$ {entry.suggestedPrice.toLocaleString()}</p>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={3} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Sem histórico de precificação</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'nfe' && (
            <div className="grid grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
               <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><Package size={14}/> Identificação Fiscal</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>NCM</label><input className={inputClass} value={formData.nfeData?.ncm} onChange={e => setFormData({...formData, nfeData: {...formData.nfeData!, ncm: e.target.value}})} /></div>
                    <div><label className={labelClass}>CFOP Padrão</label><input className={inputClass} value={formData.nfeData?.cfop} onChange={e => setFormData({...formData, nfeData: {...formData.nfeData!, cfop: e.target.value}})} /></div>
                  </div>
               </div>
               <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><ShieldCheck size={14}/> Alíquotas</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>ICMS Compra (%)</label><input type="number" className={inputClass} value={formData.nfeData?.icms} onChange={e => setFormData({...formData, nfeData: {...formData.nfeData!, icms: Number(e.target.value)}})} /></div>
                    <div><label className={labelClass}>IPI (%)</label><input type="number" className={inputClass} value={formData.nfeData?.ipi} onChange={e => setFormData({...formData, nfeData: {...formData.nfeData!, ipi: Number(e.target.value)}})} /></div>
                  </div>
               </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Diamond size={16}/></span>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Análise Realizada</p>
                <p className="text-xs font-black text-emerald-600">Lucro Alvo: {formData.profitMargin}%</p>
              </div>
           </div>
           <div className="flex gap-4">
             <button type="button" onClick={onClose} className="px-8 py-3 rounded-2xl font-black text-[10px] text-slate-400 uppercase tracking-widest hover:bg-slate-100 transition-all">Descartar</button>
             <button type="button" onClick={() => handleSubmit()} className="px-12 py-3 bg-[var(--primary-color)] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[var(--primary-color)]/20 hover:scale-105 active:scale-95 transition-all">Salvar</button>
           </div>
        </div>

      </div>
    </div>
  );
};
