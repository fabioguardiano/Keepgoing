import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AccountReceivable, ActivityLog } from '../types';
import { up } from '../lib/uppercase';

type LogFn = (action: ActivityLog['action'], details: string, referenceId?: string, orderNumber?: string, module?: string, entityType?: string) => Promise<void>;

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

export const useAccountsReceivable = (companyId?: string, logActivity?: LogFn) => {
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
        .order('due_date', { ascending: true })
        .limit(500);
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
    const isNew = !ar.id || ar.id.length <= 20;
    const paidValue = ar.paidValue ?? 0;
    const payload: any = {
      id: ar.id && ar.id.length > 20 ? ar.id : undefined,
      company_id: companyId,
      description: up(ar.description),
      client_id: ar.clientId || null,
      client_name: up(ar.clientName) || '',
      sale_id: ar.saleId || null,
      order_number: ar.orderNumber || '',
      total_value: ar.totalValue,
      paid_value: paidValue,
      installments: ar.installments,
      payment_method_id: ar.paymentMethodId || null,
      payment_method_name: ar.paymentMethodName || '',
      category: ar.category || 'Venda',
      due_date: ar.dueDate,
      notes: up(ar.notes) || '',
      status: ar.status,
    };
    const { data, error } = await supabase.from('accounts_receivable').upsert(payload).select().single();
    if (error) { alert('Não foi possível salvar a conta a receber. Verifique sua conexão e tente novamente.'); throw error; }
    const saved = map(data);
    setReceivables(prev =>
      prev.find(x => x.id === saved.id)
        ? prev.map(x => x.id === saved.id ? saved : x)
        : [saved, ...prev]
    );
    if (logActivity) {
      await logActivity(
        isNew ? 'create' : 'update',
        `${isNew ? 'Criou' : 'Atualizou'} conta a receber: ${ar.description} (${ar.clientName || 'sem cliente'})`,
        saved.id,
        undefined,
        'financeiro',
        'account_receivable',
      );
    }
    return saved;
  };

  const deleteReceivable = async (id: string) => {
    const rec = receivables.find(x => x.id === id);
    const { error } = await supabase.from('accounts_receivable').delete().eq('id', id);
    if (error) throw error;
    setReceivables(prev => prev.filter(x => x.id !== id));
    if (logActivity && rec) {
      await logActivity('delete', `Excluiu conta a receber: ${rec.description}`, id, undefined, 'financeiro', 'account_receivable');
    }
  };

  // Registra pagamento de uma parcela — suporta pagamento parcial e sobrepagamento
  const payInstallment = async (
    arId: string,
    installmentId: string,
    paidValue: number,
    paidDate: string,
    bankAccountId?: string,
    bankAccountName?: string,
    updatedBy?: string,
  ) => {
    const { data: fresh, error: fetchErr } = await supabase
      .from('accounts_receivable').select('*').eq('id', arId).single();
    if (fetchErr || !fresh) return;
    const ar = map(fresh);

    let installments = ar.installments.map(i => ({ ...i }));
    const idx = installments.findIndex(i => i.id === installmentId);
    if (idx === -1) return;

    const inst = installments[idx];
    const roundCents = (n: number) => Math.round(n * 100) / 100;

    // Acumula pagamentos anteriores (caso seja um complemento)
    const previouslyPaid = inst.status === 'parcial' ? (inst.paidValue ?? 0) : 0;
    const totalPaidOnInst = roundCents(previouslyPaid + paidValue);

    // Registra no histórico
    const newPaymentEntry = {
      id: crypto.randomUUID(),
      date: paidDate,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'Sistema',
      value: paidValue,
      bankAccountId,
      bankAccountName,
    };
    const updatedPayments = [...(inst.payments ?? []), newPaymentEntry];

    if (totalPaidOnInst >= inst.value) {
      // Pagamento integral ou excedente
      const excess = roundCents(totalPaidOnInst - inst.value);
      installments[idx] = { ...inst, status: 'pago', paidValue: inst.value, paidDate, bankAccountId, bankAccountName, payments: updatedPayments };

      if (excess > 0.009) {
        // Desconta o excedente das próximas parcelas pendentes, em ordem
        let remaining = excess;
        for (let i = idx + 1; i < installments.length && remaining > 0.009; i++) {
          if (installments[i].status !== 'pendente' && installments[i].status !== 'atrasado') continue;
          const deduct = Math.min(installments[i].value, remaining);
          installments[i] = { ...installments[i], value: roundCents(installments[i].value - deduct) };
          remaining = roundCents(remaining - deduct);
          if (installments[i].value <= 0) {
            installments[i] = { ...installments[i], status: 'pago', paidValue: 0, paidDate };
          }
        }
      }
    } else {
      // Pagamento parcial — acumula o total pago até agora
      installments[idx] = { ...inst, status: 'parcial', paidValue: totalPaidOnInst, paidDate, bankAccountId, bankAccountName, payments: updatedPayments };
    }

    // Remove parcelas zeradas (descontadas por excedente)
    installments = installments.filter(i => i.value > 0 || i.status === 'pago' || i.status === 'parcial');

    const totalPaid = installments.reduce((acc, i) => {
      if (i.status === 'pago') return acc + (i.paidValue ?? i.value);
      if (i.status === 'parcial') return acc + (i.paidValue ?? 0);
      return acc;
    }, 0);
    const totalValue = installments.reduce((acc, i) => acc + i.value, 0);
    const newStatus: AccountReceivable['status'] =
      totalPaid >= totalValue ? 'quitado'
      : totalPaid > 0 ? 'parcial'
      : 'pendente';
    await handleSaveReceivable({ ...ar, installments, totalValue, paidValue: totalPaid, status: newStatus });
    if (logActivity) {
      await logActivity('update', `Registrou pagamento de parcela: ${ar.description} — R$ ${paidValue.toFixed(2)}`, arId, undefined, 'financeiro', 'account_receivable');
    }
  };

  const unpayInstallment = async (arId: string, installmentId: string) => {
    const { data: fresh, error: fetchErr } = await supabase
      .from('accounts_receivable').select('*').eq('id', arId).single();
    if (fetchErr || !fresh) return;
    const ar = map(fresh);
    const updatedInstallments = ar.installments.map(i =>
      i.id === installmentId
        ? { ...i, status: 'pendente' as const, paidValue: undefined, paidDate: undefined, bankAccountId: undefined, bankAccountName: undefined, payments: [] }
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
    if (logActivity) {
      await logActivity('update', `Estornou pagamento de parcela: ${ar.description}`, arId, undefined, 'financeiro', 'account_receivable');
    }
  };

  return { receivables, loadingAR, handleSaveReceivable, deleteReceivable, payInstallment, unpayInstallment, refreshAR: fetchReceivables };
};
