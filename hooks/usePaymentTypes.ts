import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PaymentType } from '../types';

const map = (r: any): PaymentType => ({
  id: r.id,
  code: r.code,
  name: r.name,
  status: r.status ?? 'ativo',
  company_id: r.company_id,
  createdAt: r.created_at,
});

export const usePaymentTypes = (companyId?: string) => {
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [loadingPT, setLoadingPT] = useState(true);

  const fetchPaymentTypes = async () => {
    if (!companyId) { setLoadingPT(false); return; }
    setLoadingPT(true);
    try {
      const { data, error } = await supabase
        .from('payment_types')
        .select('*')
        .eq('company_id', companyId)
        .order('name');
      if (error) throw error;
      if (data) setPaymentTypes(data.map(map));
      else setPaymentTypes([]);
    } catch (err) {
      console.error('Erro ao carregar tipos de pagamento:', err);
    } finally {
      setLoadingPT(false);
    }
  };

  useEffect(() => { fetchPaymentTypes(); }, [companyId]);

  const handleSavePaymentType = async (pt: Partial<PaymentType>) => {
    if (!companyId) return;
    const payload = {
      id: pt.id && pt.id.length > 20 ? pt.id : undefined,
      company_id: companyId,
      code: pt.code,
      name: pt.name,
      status: pt.status || 'ativo',
    };
    const { data, error } = await supabase.from('payment_types').upsert(payload).select().single();
    if (error) throw error;
    const saved = map(data);
    setPaymentTypes(prev =>
      prev.find(x => x.id === saved.id)
        ? prev.map(x => x.id === saved.id ? saved : x)
        : [saved, ...prev]
    );
    return saved;
  };

  const deletePaymentType = async (id: string) => {
    const { error } = await supabase.from('payment_types').delete().eq('id', id);
    if (error) throw error;
    setPaymentTypes(prev => prev.filter(x => x.id !== id));
  };

  return { paymentTypes, loadingPT, handleSavePaymentType, deletePaymentType, refreshPT: fetchPaymentTypes };
};
