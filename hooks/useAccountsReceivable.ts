import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AccountReceivable } from '../types';

const map = (r: any): AccountReceivable => ({
  id: r.id,
  description: r.description,
  clientId: r.client_id,
  clientName: r.client_name,
  saleId: r.sale_id,
  orderNumber: r.order_number,
  totalValue: Number(r.total_value),
  paidValue: Number(r.paid_value),
  remainingValue: Number(r.remaining_value ?? (r.total_value - r.paid_value)),
  installments: r.installments || [],
  paymentMethodId: r.payment_method_id,
  paymentMethodName: r.payment_method_name,
  category: r.category,
  dueDate: r.due_date,
  notes: r.notes,
  status: r.status,
  companyId: r.company_id,
  createdAt: r.created_at,
});

export const useAccountsReceivable = (companyId?: string) => {
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [loadingAR, setLoadingAR] = useState(true);

  const fetchReceivables = async () => {
    if (!companyId) { setLoadingAR(false); return; }
    setLoadingAR(true);
    try {
      const { data, error } = await supabase
        .from('accounts_receivable')
        .select('*')
        .eq('company_id', companyId)
        .order('due_date', { ascending: true });
      if (error) throw error;
      if (data) setReceivables(data.map(map));
    } catch (err) {
      console.error('Erro ao carregar contas a receber:', err);
    } finally {
      setLoadingAR(false);
    }
  };

  useEffect(() => { fetchReceivables(); }, [companyId]);

  const handleSaveReceivable = async (ar: Omit<AccountReceivable, 'remainingValue'> & { id?: string }) => {
    if (!companyId) return;
    const paidValue = ar.paidValue ?? 0;
    const payload: any = {
      id: ar.id && ar.id.length > 20 ? ar.id : undefined,
      company_id: companyId,
      description: ar.description,
      client_id: ar.clientId || null,
      client_name: ar.clientName || '',
      sale_id: ar.saleId || null,
      order_number: ar.orderNumber || '',
      total_value: ar.totalValue,
      paid_value: paidValue,
      installments: ar.installments,
      payment_method_id: ar.paymentMethodId || null,
      payment_method_name: ar.paymentMethodName || '',
      category: ar.category || 'Venda',
      due_date: ar.dueDate,
      notes: ar.notes || '',
      status: ar.status,
    };
    const { data, error } = await supabase.from('accounts_receivable').upsert(payload).select().single();
    if (error) { alert('Erro ao salvar conta a receber: ' + error.message); throw error; }
    const saved = map(data);
    setReceivables(prev =>
      prev.find(x => x.id === saved.id)
        ? prev.map(x => x.id === saved.id ? saved : x)
        : [saved, ...prev]
    );
    return saved;
  };

  const deleteReceivable = async (id: string) => {
    const { error } = await supabase.from('accounts_receivable').delete().eq('id', id);
    if (error) throw error;
    setReceivables(prev => prev.filter(x => x.id !== id));
  };

  // Registra pagamento de uma parcela
  const payInstallment = async (arId: string, installmentId: string, paidValue: number, paidDate: string) => {
    const ar = receivables.find(x => x.id === arId);
    if (!ar) return;
    const updatedInstallments = ar.installments.map(i =>
      i.id === installmentId
        ? { ...i, status: 'pago' as const, paidValue, paidDate }
        : i
    );
    const totalPaid = updatedInstallments
      .filter(i => i.status === 'pago')
      .reduce((acc, i) => acc + (i.paidValue ?? i.value), 0);
    const newStatus: AccountReceivable['status'] =
      totalPaid >= ar.totalValue ? 'quitado'
      : totalPaid > 0 ? 'parcial'
      : 'pendente';
    await handleSaveReceivable({ ...ar, installments: updatedInstallments, paidValue: totalPaid, status: newStatus });
  };

  const unpayInstallment = async (arId: string, installmentId: string) => {
    const ar = receivables.find(x => x.id === arId);
    if (!ar) return;
    const updatedInstallments = ar.installments.map(i =>
      i.id === installmentId
        ? { ...i, status: 'pendente' as const, paidValue: undefined, paidDate: undefined }
        : i
    );
    const totalPaid = updatedInstallments
      .filter(i => i.status === 'pago')
      .reduce((acc, i) => acc + (i.paidValue ?? i.value), 0);
    const newStatus: AccountReceivable['status'] =
      totalPaid >= ar.totalValue ? 'quitado'
      : totalPaid > 0 ? 'parcial'
      : 'pendente';
    await handleSaveReceivable({ ...ar, installments: updatedInstallments, paidValue: totalPaid, status: newStatus });
  };

  return { receivables, loadingAR, handleSaveReceivable, deleteReceivable, payInstallment, unpayInstallment, refreshAR: fetchReceivables };
};
