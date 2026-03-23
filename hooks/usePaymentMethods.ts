import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PaymentMethod } from '../types';

const map = (r: any): PaymentMethod => ({
  id: r.id,
  name: r.name,
  category: r.category,
  type: r.type,
  installments: r.installments ?? 1,
  installmentFee: Number(r.installment_fee ?? 0),
  anticipationDiscount: Number(r.anticipation_discount ?? 0),
  active: r.active ?? true,
  companyId: r.company_id,
  createdAt: r.created_at,
});

export const usePaymentMethods = (companyId?: string) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPM, setLoadingPM] = useState(true);

  const fetchPaymentMethods = async () => {
    if (!companyId) { setLoadingPM(false); return; }
    setLoadingPM(true);
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('company_id', companyId)
        .order('name');
      if (error) throw error;
      if (data) setPaymentMethods(data.map(map));
    } catch (err) {
      console.error('Erro ao carregar formas de pagamento:', err);
    } finally {
      setLoadingPM(false);
    }
  };

  useEffect(() => { fetchPaymentMethods(); }, [companyId]);

  const handleSavePaymentMethod = async (pm: Omit<PaymentMethod, 'id' | 'createdAt'> & { id?: string }) => {
    if (!companyId) return;
    const payload = {
      id: pm.id && pm.id.length > 20 ? pm.id : undefined,
      company_id: companyId,
      name: pm.name,
      category: pm.category,
      type: pm.type,
      installments: pm.installments ?? 1,
      installment_fee: pm.installmentFee ?? 0,
      anticipation_discount: pm.anticipationDiscount ?? 0,
      active: pm.active,
    };
    const { data, error } = await supabase.from('payment_methods').upsert(payload).select().single();
    if (error) throw error;
    const saved = map(data);
    setPaymentMethods(prev =>
      prev.find(x => x.id === saved.id)
        ? prev.map(x => x.id === saved.id ? saved : x)
        : [...prev, saved]
    );
    return saved;
  };

  const deletePaymentMethod = async (id: string) => {
    const { error } = await supabase.from('payment_methods').delete().eq('id', id);
    if (error) throw error;
    setPaymentMethods(prev => prev.filter(x => x.id !== id));
  };

  const toggleActive = async (id: string) => {
    const pm = paymentMethods.find(x => x.id === id);
    if (!pm) return;
    await handleSavePaymentMethod({ ...pm, active: !pm.active });
  };

  return { paymentMethods, loadingPM, handleSavePaymentMethod, deletePaymentMethod, toggleActive, refreshPM: fetchPaymentMethods };
};
