import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BankAccount } from '../types';

const map = (r: any): BankAccount => ({
  id: r.id,
  name: r.name,
  bankName: r.bank_name,
  accountType: r.account_type,
  agency: r.agency,
  accountNumber: r.account_number,
  pixKey: r.pix_key,
  notes: r.notes,
  active: r.active,
  companyId: r.company_id,
  createdAt: r.created_at,
});

export const useBankAccounts = (companyId?: string) => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loadingBA, setLoadingBA] = useState(true);

  useEffect(() => {
    if (!companyId) { setLoadingBA(false); return; }
    setLoadingBA(true);
    supabase
      .from('bank_accounts')
      .select('*')
      .eq('company_id', companyId)
      .order('name')
      .then(({ data, error }) => {
        if (!error && data) setBankAccounts(data.map(map));
        setLoadingBA(false);
      });
  }, [companyId]);

  const saveBankAccount = async (ba: Partial<BankAccount> & { name: string }) => {
    if (!companyId) return;
    const isNew = !ba.id;
    const payload: any = {
      id: ba.id || undefined,
      company_id: companyId,
      name: ba.name,
      bank_name: ba.bankName || '',
      account_type: ba.accountType || 'corrente',
      agency: ba.agency || '',
      account_number: ba.accountNumber || '',
      pix_key: ba.pixKey || '',
      notes: ba.notes || '',
      active: ba.active ?? true,
    };
    const { data, error } = await supabase.from('bank_accounts').upsert(payload).select().single();
    if (error) { alert('Não foi possível salvar a conta bancária.'); throw error; }
    const saved = map(data);
    setBankAccounts(prev =>
      isNew ? [saved, ...prev] : prev.map(x => x.id === saved.id ? saved : x)
    );
    return saved;
  };

  const deleteBankAccount = async (id: string) => {
    const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
    if (error) { alert('Não foi possível excluir a conta bancária.'); throw error; }
    setBankAccounts(prev => prev.filter(x => x.id !== id));
  };

  const toggleBankAccount = async (id: string) => {
    const ba = bankAccounts.find(x => x.id === id);
    if (!ba) return;
    await saveBankAccount({ ...ba, active: !ba.active });
  };

  return { bankAccounts, loadingBA, saveBankAccount, deleteBankAccount, toggleBankAccount };
};
