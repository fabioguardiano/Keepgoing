import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AccountPayable } from '../types';

const map = (r: any): AccountPayable => ({
  id: r.id,
  description: r.description,
  supplierId: r.supplier_id,
  supplierName: r.supplier_name,
  totalValue: Number(r.total_value),
  paidValue: Number(r.paid_value),
  remainingValue: Number(r.remaining_value ?? (r.total_value - r.paid_value)),
  installments: r.installments || [],
  transactions: r.bill_transactions || [],
  paymentMethodId: r.payment_method_id,
  paymentMethodName: r.payment_method_name,
  category: r.category,
  categoryId: r.category_id,
  dueDate: r.due_date,
  competenceDate: r.competence_date,
  recurrence: r.recurrence || 'none',
  notes: r.notes,
  status: r.status,
  companyId: r.company_id,
  createdAt: r.created_at,
});

export const useAccountsPayable = (companyId?: string) => {
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [loadingAP, setLoadingAP] = useState(true);

  const fetchPayables = async () => {
    if (!companyId) { setLoadingAP(false); return; }
    setLoadingAP(true);
    try {
      const { data, error } = await supabase
        .from('accounts_payable')
        .select('*')
        .eq('company_id', companyId)
        .order('due_date', { ascending: true })
        .limit(500);
      if (error) throw error;
      if (data) setPayables(data.map(map));
    } catch (err) {
      console.error('Erro ao carregar contas a pagar:', err);
    } finally {
      setLoadingAP(false);
    }
  };

  useEffect(() => { fetchPayables(); }, [companyId]);

  const handleSavePayable = async (ap: Omit<AccountPayable, 'remainingValue'> & { id?: string }) => {
    if (!companyId) return;
    const paidValue = ap.paidValue ?? 0;
    const payload: any = {
      id: ap.id && ap.id.length > 20 ? ap.id : undefined,
      company_id: companyId,
      description: ap.description,
      supplier_id: ap.supplierId || null,
      supplier_name: ap.supplierName || '',
      total_value: ap.totalValue,
      paid_value: paidValue,
      installments: ap.installments,
      payment_method_id: ap.paymentMethodId || null,
      payment_method_name: ap.paymentMethodName || '',
      category: ap.category || 'Fornecedor',
      category_id: ap.categoryId || null,
      due_date: ap.dueDate,
      competence_date: ap.competenceDate || null,
      recurrence: ap.recurrence || 'none',
      notes: ap.notes || '',
      status: ap.status,
    };
    const { data, error } = await supabase.from('accounts_payable').upsert(payload).select().single();
    if (error) { alert('Não foi possível salvar a conta a pagar. Verifique sua conexão e tente novamente.'); throw error; }
    const saved = map(data);
    setPayables(prev =>
      prev.find(x => x.id === saved.id)
        ? prev.map(x => x.id === saved.id ? saved : x)
        : [saved, ...prev]
    );
    return saved;
  };

  const deletePayable = async (id: string) => {
    const { error } = await supabase.from('accounts_payable').delete().eq('id', id);
    if (error) throw error;
    setPayables(prev => prev.filter(x => x.id !== id));
  };

  const payInstallment = async (apId: string, installmentId: string, paidValue: number, paidDate: string) => {
    const { data: fresh, error: fetchErr } = await supabase
      .from('accounts_payable').select('*').eq('id', apId).single();
    if (fetchErr || !fresh) return;
    const ap = map(fresh);
    const updatedInstallments = ap.installments.map(i =>
      i.id === installmentId
        ? { ...i, status: 'pago' as const, paidValue, paidDate }
        : i
    );
    const totalPaid = updatedInstallments
      .filter(i => i.status === 'pago')
      .reduce((acc, i) => acc + (i.paidValue ?? i.value), 0);
    const newStatus: AccountPayable['status'] =
      totalPaid >= ap.totalValue ? 'quitado'
      : totalPaid > 0 ? 'parcial'
      : 'pendente';
    await handleSavePayable({ ...ap, installments: updatedInstallments, paidValue: totalPaid, status: newStatus });
  };

  const unpayInstallment = async (apId: string, installmentId: string) => {
    const { data: fresh, error: fetchErr } = await supabase
      .from('accounts_payable').select('*').eq('id', apId).single();
    if (fetchErr || !fresh) return;
    const ap = map(fresh);
    const updatedInstallments = ap.installments.map(i =>
      i.id === installmentId
        ? { ...i, status: 'pendente' as const, paidValue: undefined, paidDate: undefined }
        : i
    );
    const totalPaid = updatedInstallments
      .filter(i => i.status === 'pago')
      .reduce((acc, i) => acc + (i.paidValue ?? i.value), 0);
    const newStatus: AccountPayable['status'] =
      totalPaid >= ap.totalValue ? 'quitado'
      : totalPaid > 0 ? 'parcial'
      : 'pendente';
    await handleSavePayable({ ...ap, installments: updatedInstallments, paidValue: totalPaid, status: newStatus });
  };

  const settleBill = async (
    id: string,
    tx: {
      date: string;
      paidValue: number;  // cash total saindo (inclui juros)
      interest: number;
      discount: number;
      paymentMethodId?: string;
      paymentMethodName?: string;
      receipt?: string;
      notes?: string;
    },
  ): Promise<boolean> => {
    if (!companyId) return false;
    const { data: fresh, error } = await supabase.from('accounts_payable').select('*').eq('id', id).single();
    if (error || !fresh) return false;
    const bill = map(fresh);

    // principal reduction = cash paid minus interest (already included) + discount applied
    const principalApplied = Math.min(tx.paidValue - tx.interest + tx.discount, bill.remainingValue);
    const newPaidValue = Math.min(bill.paidValue + principalApplied, bill.totalValue);
    const newStatus: AccountPayable['status'] =
      newPaidValue >= bill.totalValue - 0.001 ? 'quitado'
      : newPaidValue > 0 ? 'parcial'
      : 'pendente';

    const newTransaction = { id: crypto.randomUUID(), ...tx };
    const transactions = [...(bill.transactions || []), newTransaction];

    const { error: updateErr } = await supabase.from('accounts_payable').update({
      paid_value: newPaidValue,
      status: newStatus,
      bill_transactions: transactions,
    }).eq('id', id).eq('company_id', companyId);

    if (updateErr) return false;

    setPayables(prev => prev.map(p => p.id === id ? {
      ...p,
      paidValue: newPaidValue,
      remainingValue: p.totalValue - newPaidValue,
      status: newStatus,
      transactions,
    } : p));
    return true;
  };

  const cancelBill = async (id: string): Promise<boolean> => {
    if (!companyId) return false;
    const { error } = await supabase.from('accounts_payable')
      .update({ status: 'cancelado' })
      .eq('id', id).eq('company_id', companyId);
    if (error) return false;
    setPayables(prev => prev.map(p => p.id === id ? { ...p, status: 'cancelado' } : p));
    return true;
  };

  return { payables, loadingAP, handleSavePayable, deletePayable, payInstallment, unpayInstallment, settleBill, cancelBill, refreshAP: fetchPayables };
};
