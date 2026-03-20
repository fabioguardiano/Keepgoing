import { useState, useEffect } from 'react';
import { FinanceTransaction } from '../types';

export const useFinance = () => {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('marmo_transactions');
      return saved ? (JSON.parse(saved) || []) : [
        { id: '1', value: 5000, description: 'Venda O.S. #1234', category: 'Vendas', date: '2024-03-10', type: 'receita', status: 'pago' }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('marmo_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = (t: FinanceTransaction) => {
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
    addTransaction,
    deleteTransaction,
    updateTransaction,
    setTransactions
  };
};
