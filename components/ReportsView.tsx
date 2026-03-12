import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Clock, CheckCircle, Calendar, ChevronDown } from 'lucide-react';
import { OrderService, Delivery } from '../types';

interface ReportsViewProps {
  orders: OrderService[];
  deliveries: Delivery[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ orders, deliveries }) => {
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'year'>('month');

  const filteredData = useMemo(() => {
    const now = new Date();
    // Normalizar 'agora' para o início do período escolhido (local)
    const getStartOfPeriod = () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      if (timeFilter === 'week') d.setDate(d.getDate() - 7);
      else if (timeFilter === 'month') d.setMonth(d.getMonth() - 1);
      else if (timeFilter === 'year') d.setFullYear(d.getFullYear() - 1);
      return d;
    };

    const startOfPeriod = getStartOfPeriod();

    const isDateInPeriod = (dateStr: string) => {
      // dateStr é YYYY-MM-DD
      const [y, m, d] = dateStr.split('-').map(Number);
      const targetDate = new Date(y, m - 1, d); // Mês no JS é 0-indexed
      return targetDate >= startOfPeriod;
    };

    const periodOrders = orders.filter(o => isDateInPeriod(o.createdAt));
    const periodDeliveries = deliveries.filter(d => isDateInPeriod(d.date));

    // Fases em ordem cronológica (aproximada)
    const afterLaunch = ['Corte', 'Acabamento', 'Serviço Finalizado', 'A Retirar', 'A Entregar', 'Entregue'];
    const afterCut = ['Acabamento', 'Serviço Finalizado', 'A Retirar', 'A Entregar', 'Entregue'];
    const finalPhases = ['Serviço Finalizado', 'A Retirar', 'A Entregar', 'Entregue'];

    // Métricas por Material Area
    const cut = periodOrders.filter(o => afterLaunch.includes(o.phase)).reduce((sum, o) => sum + (o.materialArea || 0), 0);
    const finished = periodOrders.filter(o => afterCut.includes(o.phase)).reduce((sum, o) => sum + (o.materialArea || 0), 0);
    const delivered = periodDeliveries.filter(d => d.status === 'entregue').reduce((sum, d) => {
      const order = orders.find(o => o.id === d.orderId);
      return sum + (order?.materialArea || 0);
    }, 0);
    const concludedArea = periodOrders.filter(o => finalPhases.includes(o.phase)).reduce((sum, o) => sum + (o.materialArea || 0), 0);

    return {
      totalOS: periodOrders.length,
      concludedOS: periodOrders.filter(o => finalPhases.includes(o.phase)).length,
      totalArea: concludedArea,
      avgTime: "4.2", // Mocked por enquanto, precisaria de cálculo real do history
      chart: [
        { label: 'Cortado', value: cut, color: '#3b82f6' },
        { label: 'Acabamento', value: finished, color: '#8b5cf6' },
        { label: 'Entregue', value: delivered, color: '#10b981' },
        { label: 'Concluído', value: concludedArea, color: '#ec5b13' },
      ],
      hasOrdersInTotal: orders.length > 0
    };
  }, [orders, deliveries, timeFilter]);

  const maxChartValue = Math.max(...filteredData.chart.map(c => c.value), 1);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 overflow-y-auto custom-scrollbar">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Relatórios e Métricas</h2>
          <p className="text-sm text-slate-500">Visão detalhada da produtividade e materiais</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {(['day', 'week', 'month', 'year'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeFilter === f 
                ? 'bg-white dark:bg-slate-700 text-[#ec5b13] shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'}`}
            >
              {f === 'day' ? 'Hoje' : f === 'week' ? 'Semana' : f === 'month' ? 'Mês' : 'Ano'}
            </button>
          ))}
        </div>
      </div>

      {filteredData.totalOS === 0 && filteredData.hasOrdersInTotal && (
        <div className="mb-8 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900/30 rounded-2xl flex items-center gap-3 text-orange-800 dark:text-orange-400 animate-in slide-in-from-top duration-300">
          <Calendar size={20} className="shrink-0" />
          <p className="text-sm font-medium">
            Nenhuma O.S. encontrada para o período selecionado. Tente mudar o filtro para <span className="font-bold">"Ano"</span> para ver dados anteriores ou crie uma nova O.S. hoje.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><BarChart3 size={18} /></div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total O.S.</h3>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{filteredData.totalOS}</p>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-green-600">
            <TrendingUp size={12} /> <span>+12%</span> <span className="text-slate-400 font-normal">vs anterior</span>
          </div>
        </div>
        
        <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg"><CheckCircle size={18} /></div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Concluídas</h3>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{filteredData.concludedOS}</p>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">Taxa de sucesso: {filteredData.totalOS > 0 ? Math.round((filteredData.concludedOS / filteredData.totalOS) * 100) : 0}%</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-[#ec5b13] rounded-lg"><Calendar size={18} /></div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total M²</h3>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{filteredData.totalArea.toFixed(1)}</p>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">Metragem concluída</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg"><Clock size={18} /></div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tempo Médio</h3>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{filteredData.avgTime} <span className="text-sm font-bold text-slate-400 uppercase">dias</span></p>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-green-600">
            <TrendingUp size={12} className="rotate-180" /> <span>-0.5d</span> <span className="text-slate-400 font-normal">melhoria</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[400px] border border-slate-100 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 p-8 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white">Produtividade por Material (m²)</h3>
            <p className="text-xs text-slate-500">Volume processado em cada etapa da produção</p>
          </div>
          <BarChart3 className="text-[#ec5b13] opacity-20" size={32} />
        </div>

        <div className="flex-1 flex items-end justify-around gap-4 pb-4 px-4">
          {filteredData.chart.map((bar) => {
            const height = (bar.value / maxChartValue) * 100;
            return (
              <div key={bar.label} className="flex-1 flex flex-col items-center gap-4 group h-full justify-end">
                <div className="relative w-full max-w-[80px] flex flex-col items-center justify-end h-full">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xl whitespace-nowrap z-10">
                    {bar.value.toFixed(1)} m²
                  </div>
                  
                  {/* The Bar */}
                  <div 
                    style={{ height: `${height}%`, backgroundColor: bar.color }}
                    className="w-full rounded-t-xl shadow-lg shadow-black/5 transition-all duration-700 ease-out group-hover:brightness-110 group-hover:-translate-y-1"
                  >
                    <div className="w-full h-full bg-gradient-to-t from-black/20 to-transparent rounded-t-xl"></div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">{bar.label}</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{bar.value.toFixed(1)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
