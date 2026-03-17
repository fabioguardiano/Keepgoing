import React, { useState } from 'react';
import { Wallet, Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Filter } from 'lucide-react';
import { FinanceTransaction } from '../types';

interface FinanceViewProps {
  transactions: FinanceTransaction[];
  onAddTransaction: (t: FinanceTransaction) => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({ transactions, onAddTransaction }) => {
  const receitas = transactions.filter(t => t.type === 'receita').reduce((acc, t) => acc + t.value, 0);
  const despesas = transactions.filter(t => t.type === 'despesa').reduce((acc, t) => acc + t.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Fluxo de Caixa</h1>
          <p className="text-slate-500 font-medium">Controle financeiro e movimentações</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white text-slate-700 px-4 py-3 rounded-2xl font-bold border border-slate-200 flex items-center gap-2 hover:bg-slate-50 transition-all">
            <Filter size={18} /> Filtrar
          </button>
          <button className="bg-[#ec5b13] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-[#ec5b13]/20 hover:bg-[#d84a0d] transition-all">
            <Plus size={20} /> Lançamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <TrendingUp size={80} />
          </div>
          <span className="text-sm font-bold text-slate-400 uppercase tracking-widest block mb-1">Receitas</span>
          <p className="text-3xl font-black text-green-600 mb-2">R$ {receitas.toLocaleString('pt-BR')}</p>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full bg-green-500 w-[70%]" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <TrendingDown size={80} />
          </div>
          <span className="text-sm font-bold text-slate-400 uppercase tracking-widest block mb-1">Despesas</span>
          <p className="text-3xl font-black text-red-500 mb-2">R$ {despesas.toLocaleString('pt-BR')}</p>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full bg-red-400 w-[30%]" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#ec5b13]/20 shadow-md shadow-[#ec5b13]/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-[#ec5b13]">
            <DollarSign size={80} />
          </div>
          <span className="text-sm font-bold text-[#ec5b13] uppercase tracking-widest block mb-1">Saldo Líquido</span>
          <p className="text-4xl font-black text-slate-800 tracking-tight">R$ {(receitas - despesas).toLocaleString('pt-BR')}</p>
          <p className="text-xs font-bold text-slate-400 mt-2 italic">Saldo total do período selecionado</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Lançamentos Recentes</h2>
          <Calendar size={18} className="text-slate-400" />
        </div>
        <div className="divide-y divide-slate-100">
          {transactions.map(t => (
            <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${t.type === 'receita' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                  {t.type === 'receita' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
                <div>
                  <p className="font-bold text-slate-700">{t.description}</p>
                  <p className="text-xs text-slate-400 font-medium">{t.category} • {t.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-black ${t.type === 'receita' ? 'text-green-600' : 'text-red-500'}`}>
                  {t.type === 'receita' ? '+' : '-'} R$ {t.value.toLocaleString('pt-BR')}
                </p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${t.status === 'pago' ? 'bg-slate-100 text-slate-500' : 'bg-orange-100 text-[#ec5b13]'}`}>
                  {t.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
