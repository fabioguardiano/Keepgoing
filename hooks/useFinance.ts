import { useState, useEffect } from 'react';
import { FinanceTransaction } from '../types';

export const useFinance = (companyId?: string, logActivity?: any) => {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>(() => {
    if (!companyId) return [];
    try {
      const saved = localStorage.getItem(`marmo_transactions_${companyId}`);
      return saved ? (JSON.parse(saved) || []) : [
        { id: '1', value: 5000, description: 'Venda O.S. #1234', category: 'Vendas', date: '2024-03-10', type: 'receita', status: 'pago' }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (companyId) {
      localStorage.setItem(`marmo_transactions_${companyId}`, JSON.stringify(transactions));
    }
  }, [transactions, companyId]);

  const handleSaveTransaction = (t: FinanceTransaction) => {
    setTransactions(prev => [t, ...prev]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const updateTransaction = (id: string, updates: Partial<FinanceTransaction>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  return {
    transactions,
    handleSaveTransaction,
    deleteTransaction,
    updateTransaction,
    setTransactions
  };
};
