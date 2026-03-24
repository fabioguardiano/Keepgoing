import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FinanceTransaction } from '../types';

export const useFinance = (companyId?: string, logActivity?: (action: any, details: string, referenceId?: string) => Promise<void>) => {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loadingFinance, setLoadingFinance] = useState(true);

  const fetchTransactions = async () => {
    if (!companyId) { setLoadingFinance(false); return; }
    setLoadingFinance(true);
    try {
      let query = supabase.from('finance_transactions').select('*');
      query = query.eq('company_id', companyId);

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      if (data) {
        const mapped = data.map(t => ({
          id: t.id,
          type: t.type as FinanceTransaction['type'],
          category: t.category,
          value: Number(t.value),
          date: t.date,
          status: t.status as FinanceTransaction['status'],
          description: t.description
        }));
        setTransactions(mapped);
        localStorage.setItem(`marmo_transactions_${companyId || 'legacy'}`, JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('Erro ao carregar transações do Supabase:', err);
      const saved = localStorage.getItem(`marmo_transactions_${companyId || 'legacy'}`);
      if (saved) setTransactions(JSON.parse(saved));
    } finally {
      setLoadingFinance(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [companyId]);

  const handleSaveTransaction = async (t: FinanceTransaction) => {
    const finalCompanyId = companyId || '00000000-0000-0000-0000-000000000000';
    try {
      const payload = {
        id: (t.id && t.id.length > 20) ? t.id : undefined,
        company_id: finalCompanyId,
        type: t.type,
        category: t.category,
        value: t.value,
        date: t.date,
        status: t.status,
        description: t.description
      };

      const { data, error } = await supabase
        .from('finance_transactions')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;

      const saved: FinanceTransaction = {
        id: data.id,
        type: data.type,
        category: data.category,
        value: Number(data.value),
        date: data.date,
        status: data.status,
        description: data.description
      };

      setTransactions(prev => {
        const next = prev.find(x => x.id === t.id || x.id === saved.id)
          ? prev.map(x => (x.id === t.id || x.id === saved.id) ? saved : x)
          : [saved, ...prev];
        localStorage.setItem(`marmo_transactions_${finalCompanyId}`, JSON.stringify(next));
        return next;
      });

      if (logActivity) {
        const isUpdate = transactions.some(x => x.id === t.id);
        await logActivity(
          isUpdate ? 'update' : 'create',
          `${isUpdate ? 'Atualizou' : 'Registrou'} transação: ${t.description} (${t.type === 'receita' ? '+' : '-'} R$ ${t.value.toFixed(2)})`,
          saved.id
        );
      }

      return saved;
    } catch (err: any) {
      console.error('Erro ao salvar transação:', err);
      alert(`Erro ao salvar transação: ${err.message || 'Verifique sua conexão e permissões.'}`);
      throw err;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase.from('finance_transactions').delete().eq('id', id);
      if (error) throw error;

      setTransactions(prev => {
        const next = prev.filter(t => t.id !== id);
        localStorage.setItem(`marmo_transactions_${companyId || '00000000-0000-0000-0000-000000000000'}`, JSON.stringify(next));
        return next;
      });
    } catch (err: any) {
      console.error('Erro ao deletar transação:', err);
      alert('Erro ao deletar transação: ' + err.message);
    }
  };

  const updateTransaction = async (id: string, updates: Partial<FinanceTransaction>) => {
    const existing = transactions.find(t => t.id === id);
    if (!existing) return;
    await handleSaveTransaction({ ...existing, ...updates });
  };

  return {
    transactions,
    loadingFinance,
    handleSaveTransaction,
    deleteTransaction,
    updateTransaction,
    setTransactions,
    refreshTransactions: fetchTransactions
  };
};
