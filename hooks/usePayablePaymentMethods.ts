import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PayablePaymentMethod } from '../types';

const map = (r: any): PayablePaymentMethod => ({
  id: r.id,
  name: r.name,
  active: r.active ?? true,
  companyId: r.company_id,
  createdAt: r.created_at,
});

export const usePayablePaymentMethods = (companyId?: string) => {
  const [payablePMs, setPayablePMs] = useState<PayablePaymentMethod[]>([]);
  const [loadingPPM, setLoadingPPM] = useState(true);

  const fetchPayablePMs = async () => {
    if (!companyId) { setLoadingPPM(false); return; }
    setLoadingPPM(true);
    try {
      const { data, error } = await supabase
        .from('payable_payment_methods')
        .select('*')
        .eq('company_id', companyId)
        .order('name');
      if (error) throw error;
      if (data) setPayablePMs(data.map(map));
    } catch (err) {
      console.error('Erro ao carregar formas de pagamento do contas a pagar:', err);
    } finally {
      setLoadingPPM(false);
    }
  };

  useEffect(() => { fetchPayablePMs(); }, [companyId]);

  const handleSave = async (pm: Omit<PayablePaymentMethod, 'id' | 'createdAt'> & { id?: string }) => {
    if (!companyId) return;
    const payload = {
      id: pm.id && pm.id.length > 20 ? pm.id : undefined,
      company_id: companyId,
      name: pm.name,
      active: pm.active,
    };
    const { data, error } = await supabase.from('payable_payment_methods').upsert(payload).select().single();
    if (error) throw error;
    const saved = map(data);
    setPayablePMs(prev =>
      prev.find(x => x.id === saved.id)
        ? prev.map(x => x.id === saved.id ? saved : x)
        : [...prev, saved]
    );
    return saved;
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('payable_payment_methods').delete().eq('id', id);
    if (error) throw error;
    setPayablePMs(prev => prev.filter(x => x.id !== id));
  };

  const toggleActive = async (id: string) => {
    const pm = payablePMs.find(x => x.id === id);
    if (!pm) return;
    await handleSave({ ...pm, active: !pm.active });
  };

  return { payablePMs, loadingPPM, handleSave, handleDelete, toggleActive, refreshPPM: fetchPayablePMs };
};
