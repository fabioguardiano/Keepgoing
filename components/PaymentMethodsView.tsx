import React, { useState } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, CreditCard, Banknote, QrCode, Building2, FileText, X, Check } from 'lucide-react';
import { PaymentMethod, PaymentType } from '../types';

interface Props {
  paymentMethods: PaymentMethod[];
  paymentTypes: PaymentType[];
  onSave: (pm: any) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string) => Promise<void>;
  hideHeader?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {};

const getCategoryLabel = (cat: string, types: PaymentType[]) => {
  return CATEGORY_LABELS[cat] || types.find(t => t.id === cat || t.name === cat)?.name || cat;
};

const THEME_ICONS: Record<string, React.ReactNode> = {
  dinheiro:      <Banknote size={14} />,
  pix:           <QrCode size={14} />,
  transferencia: <Building2 size={14} />,
  cartao:        <CreditCard size={14} />,
  boleto:        <FileText size={14} />,
  cheque:        <FileText size={14} />,
  outro:         <Banknote size={14} />,
};

const getCategoryIcon = (cat: string) => {
  const norm = (cat || '').toLowerCase();
  if (norm.includes('pix')) return THEME_ICONS['pix'];
  if (norm.includes('dinheiro')) return THEME_ICONS['dinheiro'];
  if (norm.includes('boleto')) return THEME_ICONS['boleto'];
  if (norm.includes('tranf') || norm.includes('bancá')) return THEME_ICONS['transferencia'];
  if (norm.includes('cartão') || norm.includes('debito') || norm.includes('credito') || norm.includes('card')) return THEME_ICONS['cartao'];
  if (norm.includes('cheque')) return THEME_ICONS['cheque'];
  return THEME_ICONS['outro'];
};

const THEME_COLORS: Record<string, string> = {
  dinheiro:      'bg-green-100 text-green-700',
  pix:           'bg-blue-100 text-blue-700',
  transferencia: 'bg-indigo-100 text-indigo-700',
  cartao:        'bg-purple-100 text-purple-700',
  boleto:        'bg-slate-100 text-slate-700',
  cheque:        'bg-yellow-100 text-yellow-700',
  outro:         'bg-slate-100 text-slate-500',
};

const getCategoryColor = (cat: string) => {
  const norm = (cat || '').toLowerCase();
  if (norm.includes('pix')) return THEME_COLORS['pix'];
  if (norm.includes('dinheiro')) return THEME_COLORS['dinheiro'];
  if (norm.includes('boleto')) return THEME_COLORS['boleto'];
  if (norm.includes('tranf') || norm.includes('bancá')) return THEME_COLORS['transferencia'];
  if (norm.includes('cartão') || norm.includes('debito') || norm.includes('credito') || norm.includes('card')) return THEME_COLORS['cartao'];
  if (norm.includes('cheque')) return THEME_COLORS['cheque'];
  return THEME_COLORS['outro'];
};

const APRAZO_CATEGORIES = ['cartao_credito_prazo', 'boleto', 'cheque', 'BOLETO', 'CHEQUE', 'CARTÃO PARCELADO'];

const emptyForm = (defaultCategory?: string): Partial<PaymentMethod> => ({
  name: '',
  category: defaultCategory || '',
  type: 'avista',
  installments: 1,
  installmentFee: 0,
  anticipationDiscount: 0,
  active: true,
});

export const PaymentMethodsView: React.FC<Props> = ({ paymentMethods, paymentTypes, onSave, onDelete, onToggle, hideHeader = false }) => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<PaymentMethod>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const openNew = () => { 
    const defaultCat = paymentTypes.filter(t => t.status === 'ativo')[0]?.name || '';
    setForm(emptyForm(defaultCat)); 
    setShowModal(true); 
  };
  const openEdit = (pm: PaymentMethod) => { setForm({ ...pm }); setShowModal(true); };

  const handleCategoryChange = (cat: string) => {
    const isAprazo = APRAZO_CATEGORIES.includes(cat) || cat.toLowerCase().includes('prazo') || cat.toLowerCase().includes('boleto');
    setForm(f => ({
      ...f,
      category: cat,
      type: isAprazo ? 'aprazo' : 'avista',
      installments: isAprazo ? (f.installments && f.installments > 1 ? f.installments : 2) : 1,
    }));
  };

  const handleSave = async () => {
    if (!form.name?.trim()) return alert('Informe o nome da forma de pagamento.');
    setSaving(true);
    try { await onSave(form); setShowModal(false); }
    catch { /* erro já alertado no hook */ }
    finally { setSaving(false); }
  };

  const avista  = paymentMethods.filter(p => p.type === 'avista');
  const aprazo  = paymentMethods.filter(p => p.type === 'aprazo');

  const GroupCard = ({ methods, title }: { methods: PaymentMethod[]; title: string }) => (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30">
        <h3 className="font-black text-slate-700 dark:text-white text-[10px] uppercase tracking-widest leading-none">{title}</h3>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{methods.length} forma{methods.length !== 1 ? 's' : ''}</span>
      </div>
      {methods.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-sm">Nenhuma forma cadastrada.</div>
      ) : (
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {methods.map(pm => (
            <div key={pm.id} className={`flex items-center gap-3 px-5 py-2 transition-colors ${pm.active ? '' : 'opacity-50'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-white text-[12px] leading-tight">{pm.name}</span>
                  {!pm.active && <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0 rounded-full font-bold uppercase tracking-tighter">Inativo</span>}
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-3">
                  <span className="opacity-70">{getCategoryLabel(pm.category, paymentTypes)}</span>
                  {pm.type === 'aprazo' && pm.installments && pm.installments > 1 && (
                    <span className="bg-slate-50 px-1.5 rounded-md border border-slate-100 tracking-tight">até {pm.installments}x</span>
                  )}
                  {pm.installmentFee && pm.installmentFee > 0 ? (
                    <span className="text-rose-400 font-bold tracking-tight">{pm.installmentFee}% a.m.</span>
                  ) : null}
                  {pm.anticipationDiscount && pm.anticipationDiscount > 0 ? (
                    <span className="text-green-500 font-bold tracking-tight">{pm.anticipationDiscount}% antecip.</span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button 
                  onClick={() => onToggle(pm.id)} 
                  className="p-1.5 rounded-lg hover:bg-slate-50 transition-all" 
                  title={pm.active ? 'Desativar' : 'Ativar'}
                >
                  {pm.active ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} className="text-slate-300" />}
                </button>
                <button onClick={() => openEdit(pm)} className="p-1.5 rounded-lg hover:bg-slate-50 transition-all text-slate-400 hover:text-[var(--primary-color)]">
                  <Pencil size={14} />
                </button>
                <button onClick={() => setConfirmDelete(pm.id)} className="p-1.5 rounded-lg hover:bg-rose-50 transition-all text-slate-300 hover:text-rose-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {!hideHeader && (
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Formas de Pagamento</h2>
            <p className="text-slate-500 text-sm font-medium">Gerencie as formas de pagamento aceitas pela empresa</p>
          </div>
        )}
        <button onClick={openNew} className={`${hideHeader ? 'ml-auto text-xs py-2' : 'px-5 py-2.5'} bg-[var(--primary-color)] text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-[var(--primary-color)]/20 hover:opacity-90 transition-all`}>
          <Plus size={hideHeader ? 14 : 18} /> Nova Forma
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GroupCard methods={avista}  title="À Vista" />
        <GroupCard methods={aprazo} title="A Prazo" />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-slate-800 dark:text-white">{form.id ? 'Editar' : 'Nova'} Forma de Pagamento</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Nome */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Nome</label>
                <input
                  value={form.name || ''}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Cartão Crédito 6x"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-sm text-slate-800 dark:text-white"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Tipo de Pagamento</label>
                <select
                  value={form.category || ''}
                  onChange={e => handleCategoryChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-sm text-slate-800 dark:text-white appearance-none"
                >
                  <option value="" disabled>Selecione um tipo...</option>
                  {paymentTypes
                    .filter(t => t.status === 'ativo')
                    .map(t => (
                      <option key={t.id} value={t.name}>
                        {t.code ? `${t.code} - ${t.name}` : t.name}
                      </option>
                    ))
                  }
                </select>
              </div>

              {/* Modalidade */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Modalidade</label>
                <div className="flex gap-3">
                  {(['avista', 'aprazo'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: t, installments: t === 'avista' ? 1 : (f.installments ?? 2) }))}
                      className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all border-2 ${
                        form.type === t
                          ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)]'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-transparent'
                      }`}
                    >
                      {t === 'avista' ? 'À Vista' : 'A Prazo'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campos A Prazo */}
              {form.type === 'aprazo' && (
                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Nº de Parcelas</label>
                    <input
                      type="number" min={2} max={120}
                      value={form.installments ?? 2}
                      onChange={e => setForm(f => ({ ...f, installments: parseInt(e.target.value) || 2 }))}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-sm text-slate-800 dark:text-white"
                    />
                  </div>

                  {(form.category === 'cartao_credito_prazo' || form.category?.toLowerCase()?.includes('cartão')) && (
                    <>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Taxa por Parcela (%)</label>
                        <input
                          type="number" min={0} max={30} step={0.01}
                          value={form.installmentFee ?? 0}
                          onChange={e => setForm(f => ({ ...f, installmentFee: parseFloat(e.target.value) || 0 }))}
                          placeholder="Ex: 1.99"
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-sm text-slate-800 dark:text-white"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Taxa cobrada pela operadora por parcela</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Desconto para Antecipação (%)</label>
                        <input
                          type="number" min={0} max={50} step={0.01}
                          value={form.anticipationDiscount ?? 0}
                          onChange={e => setForm(f => ({ ...f, anticipationDiscount: parseFloat(e.target.value) || 0 }))}
                          placeholder="Ex: 1.50"
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-sm text-slate-800 dark:text-white"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Desconto aplicado ao antecipar os recebíveis</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-2xl bg-[var(--primary-color)] text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60">
                <Check size={16} /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <Trash2 size={40} className="text-red-400 mx-auto mb-3" />
            <h3 className="font-black text-slate-800 dark:text-white mb-2">Excluir forma de pagamento?</h3>
            <p className="text-slate-500 text-sm mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancelar</button>
              <button onClick={async () => { await onDelete(confirmDelete); setConfirmDelete(null); }} className="flex-1 py-2.5 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
