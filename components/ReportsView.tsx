import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Clock, CheckCircle, Calendar, DollarSign, Target, Layers, Bot, Send, Loader2, User, Sparkles, ChevronRight } from 'lucide-react';
import { OrderService, Delivery, AccountReceivable } from '../types';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedNumber } from './AnimatedNumber';
import { AnimatedCard } from './AnimatedCard';

interface ReportsViewProps {
  orders: OrderService[];
  deliveries: Delivery[];
  receivables?: AccountReceivable[];
}

type Tab = 'producao' | 'financeiro' | 'ia';
type TimeFilter = 'day' | 'week' | 'month' | 'year';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function startOfPeriod(filter: TimeFilter): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (filter === 'week')  d.setDate(d.getDate() - 7);
  if (filter === 'month') d.setMonth(d.getMonth() - 1);
  if (filter === 'year')  d.setFullYear(d.getFullYear() - 1);
  return d;
}

function inPeriod(dateStr: string, start: Date): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d) >= start;
}

function orderValue(o: OrderService): number {
  return o.totals?.geral ?? o.totalValue ?? 0;
}

// ── Mini chart (SVG line) ─────────────────────────────────────────────────────
function LineChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) return null;
  const W = 600, H = 140, PAD = 16;
  const maxV = Math.max(...data.map(d => d.value), 1);
  const pts = data.map((d, i) => {
    const x = PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2);
    const y = H - PAD - (d.value / maxV) * (H - PAD * 2);
    return { x, y, ...d };
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const fill = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
    + ` L${pts[pts.length - 1].x},${H - PAD} L${pts[0].x},${H - PAD} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary-color, #004D4D)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--primary-color, #004D4D)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <motion.path 
        d={fill} 
        fill="url(#lineGrad)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      />
      <motion.path 
        d={path} 
        fill="none" 
        stroke="var(--primary-color, #004D4D)" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
      {pts.map((p, i) => (
        <motion.g 
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 + (i * 0.05), duration: 0.3 }}
        >
          <circle cx={p.x} cy={p.y} r="4" fill="var(--primary-color, #004D4D)" />
          <circle cx={p.x} cy={p.y} r="7" fill="var(--primary-color, #004D4D)" fillOpacity="0.15" />
        </motion.g>
      ))}
    </svg>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, trend, color, delay = 0 }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  trend?: { value: string; up: boolean }; color: string; delay?: number;
}) {
  // Extrair o número da string de valor para o AnimatedNumber
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
  const prefix = value.includes('R$') ? 'R$ ' : '';
  const suffix = value.includes('m²') ? ' m²' : '';

  return (
    <AnimatedCard delay={delay} className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider leading-tight">{label}</h3>
      </div>
      <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">
        {prefix}<AnimatedNumber value={numericValue} />{suffix}
      </p>
      {sub && <p className="text-[11px] text-slate-400 font-medium">{sub}</p>}
      {trend && (
        <div className={`flex items-center gap-1 text-[11px] font-bold ${trend.up ? 'text-green-600' : 'text-red-500'}`}>
          {trend.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{trend.value}</span>
          <span className="text-slate-400 font-normal ml-1">vs período anterior</span>
        </div>
      )}
    </AnimatedCard>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export const ReportsView: React.FC<ReportsViewProps> = ({ orders, deliveries, receivables = [] }) => {
  const [activeTab, setActiveTab] = useState<Tab>('producao');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── Produção metrics ────────────────────────────────────────────────────────
  const producaoData = useMemo(() => {
    const start = startOfPeriod(timeFilter);
    const finalPhases = ['Serviço Finalizado', 'A Retirar', 'A Entregar', 'Entregue'];
    const afterLaunch = ['Corte', 'Acabamento', 'Serviço Finalizado', 'A Retirar', 'A Entregar', 'Entregue'];
    const afterCut    = ['Acabamento', 'Serviço Finalizado', 'A Retirar', 'A Entregar', 'Entregue'];

    const periodOrders    = orders.filter(o => inPeriod(o.createdAt, start));
    const periodDeliveries = deliveries.filter(d => inPeriod(d.date, start));

    const cut       = periodOrders.filter(o => afterLaunch.includes(o.phase)).reduce((s, o) => s + (o.materialArea || 0), 0);
    const finished  = periodOrders.filter(o => afterCut.includes(o.phase)).reduce((s, o) => s + (o.materialArea || 0), 0);
    const delivered = periodDeliveries.filter(d => d.status === 'entregue').reduce((s, d) => {
      return s + (orders.find(o => o.id === d.orderId)?.materialArea || 0);
    }, 0);
    const concludedArea = periodOrders.filter(o => finalPhases.includes(o.phase)).reduce((s, o) => s + (o.materialArea || 0), 0);

    return {
      totalOS: periodOrders.length,
      concludedOS: periodOrders.filter(o => finalPhases.includes(o.phase)).length,
      totalArea: concludedArea,
      hasOrdersInTotal: orders.length > 0,
      chart: [
        { label: 'Cortado',    value: cut,       color: '#3b82f6' },
        { label: 'Acabamento', value: finished,   color: '#8b5cf6' },
        { label: 'Entregue',   value: delivered,  color: '#10b981' },
        { label: 'Concluído',  value: concludedArea, color: 'var(--primary-color)' },
      ],
    };
  }, [orders, deliveries, timeFilter]);

  // ── Financeiro metrics ──────────────────────────────────────────────────────
  const financeiroData = useMemo(() => {
    const start = startOfPeriod(timeFilter);

    const periodOrders = orders.filter(o =>
      inPeriod(o.createdAt, start) &&
      !['Cancelado'].includes(o.status || '')
    );

    const faturamento = periodOrders.reduce((s, o) => s + orderValue(o), 0);
    const ticketMedio = periodOrders.length > 0 ? faturamento / periodOrders.length : 0;

    const periodReceivables = receivables.filter(r =>
      r.category === 'Venda' &&
      r.status !== 'cancelado' &&
      inPeriod(r.createdAt, start)
    );
    const totalRecebido = periodReceivables.reduce((s, r) => s + r.paidValue, 0);
    const totalAReceber = periodReceivables.reduce((s, r) => s + r.remainingValue, 0);

    // Day-by-day: group orders by date
    const byDay: Record<string, number> = {};
    periodOrders.forEach(o => {
      const d = o.createdAt.slice(0, 10);
      byDay[d] = (byDay[d] || 0) + orderValue(o);
    });

    // Sort and build chart data
    const sortedDays = Object.keys(byDay).sort();
    const diaADia = sortedDays.map(date => {
      const [, m, d] = date.split('-');
      return { label: `${d}/${m}`, value: byDay[date] };
    });

    // Top vendedores
    const bySeller: Record<string, { name: string; total: number; count: number }> = {};
    periodOrders.forEach(o => {
      const name = o.seller || 'N/A';
      if (!bySeller[name]) bySeller[name] = { name, total: 0, count: 0 };
      bySeller[name].total += orderValue(o);
      bySeller[name].count += 1;
    });
    const topSellers = Object.values(bySeller)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return { faturamento, ticketMedio, totalRecebido, totalAReceber, diaADia, topSellers, periodOrders };
  }, [orders, receivables, timeFilter]);

  // ── AI Chat ─────────────────────────────────────────────────────────────────
  const buildContext = () => {
    const { faturamento, ticketMedio, totalRecebido, totalAReceber, topSellers } = financeiroData;
    const { totalOS, concludedOS, totalArea } = producaoData;
    const filterLabel = { day: 'hoje', week: 'esta semana', month: 'este mês', year: 'este ano' }[timeFilter];

    return `Você é um assistente de negócios especializado em análise de dados. Responda sempre em português brasileiro, de forma objetiva e clara.

Dados do negócio (${filterLabel}):
- Faturamento: ${formatCurrency(faturamento)}
- Ticket Médio: ${formatCurrency(ticketMedio)}
- Total Recebido: ${formatCurrency(totalRecebido)}
- A Receber: ${formatCurrency(totalAReceber)}
- Total de O.S.: ${totalOS} (${concludedOS} concluídas)
- Área Total Concluída: ${totalArea.toFixed(1)} m²

Top Vendedores:
${topSellers.map((s, i) => `${i + 1}. ${s.name}: ${formatCurrency(s.total)} (${s.count} pedidos)`).join('\n')}

Responda perguntas sobre esses dados de forma clara e acionável.`;
  };

  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: text }];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Sessão expirada. Faça login novamente.');

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          system: buildContext(),
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Erro ${res.status}`);
      }

      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Sem resposta.' }]);
    } catch (e: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `❌ ${e.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const maxBar = Math.max(...producaoData.chart.map(c => c.value), 1);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-6 pt-6 pb-4 gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Relatórios e Métricas</h2>
          <p className="text-sm text-slate-500">Visão detalhada de produtividade e financeiro</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {(['day', 'week', 'month', 'year'] as const).map(f => (
            <button key={f} onClick={() => setTimeFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeFilter === f
                ? 'bg-white dark:bg-slate-700 text-[var(--primary-color)] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'}`}>
              {f === 'day' ? 'Hoje' : f === 'week' ? 'Semana' : f === 'month' ? 'Mês' : 'Ano'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pb-0 border-b border-slate-100 dark:border-slate-800 shrink-0">
        {([
          { id: 'producao', label: 'Produção', icon: <Layers size={14} /> },
          { id: 'financeiro', label: 'Financeiro', icon: <DollarSign size={14} /> },
          { id: 'ia', label: 'Assistente IA', icon: <Bot size={14} /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">

        {/* ── PRODUÇÃO ── */}
        {activeTab === 'producao' && (
          <div className="flex flex-col gap-6">
            {producaoData.totalOS === 0 && producaoData.hasOrdersInTotal && (
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900/30 rounded-2xl flex items-center gap-3 text-orange-800 dark:text-orange-400">
                <Calendar size={20} className="shrink-0" />
                <p className="text-sm font-medium">
                  Nenhuma O.S. no período. Tente <span className="font-bold">"Ano"</span> para ver dados anteriores.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={<BarChart3 size={18} />} label="Total O.S." value={String(producaoData.totalOS)}
                color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                trend={{ value: '+12%', up: true }} delay={0.1} />
              <KpiCard icon={<CheckCircle size={18} />} label="Concluídas" value={String(producaoData.concludedOS)}
                color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                sub={`Taxa: ${producaoData.totalOS > 0 ? Math.round((producaoData.concludedOS / producaoData.totalOS) * 100) : 0}%`} delay={0.2} />
              <KpiCard icon={<Calendar size={18} />} label="Total m²" value={producaoData.totalArea.toFixed(1) + ' m²'}
                color="bg-orange-100 dark:bg-orange-900/30 text-[var(--primary-color)]"
                sub="Metragem concluída" delay={0.3} />
              <KpiCard icon={<Clock size={18} />} label="Tempo Médio" value="4.2"
                color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                sub="dias por O.S." trend={{ value: '-0.5d', up: true }} delay={0.4} />
            </div>

            {/* Bar Chart */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 p-8 flex flex-col min-h-[320px]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">Produtividade por Material (m²)</h3>
                  <p className="text-xs text-slate-500">Volume processado em cada etapa</p>
                </div>
                <BarChart3 className="text-[var(--primary-color)] opacity-20" size={32} />
              </div>
              <div className="flex-1 flex items-end justify-around gap-4 pb-4 px-4">
                {producaoData.chart.map((bar, idx) => {
                  const h = (bar.value / maxBar) * 100;
                  return (
                    <div key={bar.label} className="flex-1 flex flex-col items-center gap-4 group h-full justify-end">
                      <div className="relative w-full max-w-[80px] flex flex-col items-center justify-end h-full">
                        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xl whitespace-nowrap z-10">
                          <AnimatedNumber value={bar.value} /> m²
                        </div>
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ duration: 1, delay: 0.2 + (idx * 0.1), ease: [0.16, 1, 0.3, 1] }}
                          style={{ backgroundColor: bar.color }}
                          className="w-full rounded-t-xl shadow-lg transition-all group-hover:brightness-110 group-hover:-translate-y-1"
                        >
                          <div className="w-full h-full bg-gradient-to-t from-black/20 to-transparent rounded-t-xl" />
                        </motion.div>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">{bar.label}</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          <AnimatedNumber value={bar.value} />
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── FINANCEIRO ── */}
        {activeTab === 'financeiro' && (
          <div className="flex flex-col gap-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                icon={<DollarSign size={18} />}
                label="Faturamento"
                value={formatCurrency(financeiroData.faturamento)}
                color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                sub="Valor total dos pedidos"
              />
              <KpiCard
                icon={<Target size={18} />}
                label="Ticket Médio"
                value={formatCurrency(financeiroData.ticketMedio)}
                color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                sub={`Base: ${financeiroData.periodOrders.length} pedidos`}
              />
              <KpiCard
                icon={<CheckCircle size={18} />}
                label="Total Recebido"
                value={formatCurrency(financeiroData.totalRecebido)}
                color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                sub="Pagamentos confirmados"
              />
              <KpiCard
                icon={<Clock size={18} />}
                label="A Receber"
                value={formatCurrency(financeiroData.totalAReceber)}
                color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                sub="Saldo em aberto"
              />
            </div>

            {/* Day-by-day line chart */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">Faturamento Dia a Dia</h3>
                  <p className="text-xs text-slate-500">Evolução diária do valor de pedidos</p>
                </div>
                <TrendingUp className="text-[var(--primary-color)] opacity-30" size={28} />
              </div>
              {financeiroData.diaADia.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
                  Nenhum pedido no período selecionado
                </div>
              ) : (
                <div>
                  <div className="h-40 w-full">
                    <LineChart data={financeiroData.diaADia} />
                  </div>
                  {/* X-axis labels */}
                  <div className="flex justify-between mt-1 px-4">
                    {financeiroData.diaADia.length <= 10
                      ? financeiroData.diaADia.map((d, i) => (
                          <span key={i} className="text-[9px] text-slate-400 font-bold">{d.label}</span>
                        ))
                      : [0, Math.floor(financeiroData.diaADia.length / 2), financeiroData.diaADia.length - 1].map(i => (
                          <span key={i} className="text-[9px] text-slate-400 font-bold">{financeiroData.diaADia[i]?.label}</span>
                        ))
                    }
                  </div>
                </div>
              )}
            </div>

            {/* Top Vendedores */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 p-6">
              <h3 className="font-bold text-slate-800 dark:text-white mb-4">Top Vendedores</h3>
              {financeiroData.topSellers.length === 0 ? (
                <p className="text-slate-400 text-sm">Nenhum dado disponível.</p>
              ) : (
                <div className="space-y-3">
                  {financeiroData.topSellers.map((s, i) => {
                    const pct = financeiroData.faturamento > 0 ? (s.total / financeiroData.faturamento) * 100 : 0;
                    return (
                      <div key={s.name} className="flex items-center gap-3">
                        <span className="w-5 text-xs font-black text-slate-400">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{s.name}</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(s.total)}</span>
                          </div>
                          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, backgroundColor: 'var(--primary-color)' }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{s.count} pedido{s.count !== 1 ? 's' : ''} · {pct.toFixed(1)}% do total</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ASSISTENTE IA ── */}
        {activeTab === 'ia' && (
          <div className="flex flex-col h-full min-h-[500px]">
            {/* Info banner */}
            <div className="mb-4 p-4 bg-[var(--primary-color)]/5 border border-[var(--primary-color)]/20 rounded-2xl flex items-start gap-3">
              <Sparkles size={18} className="text-[var(--primary-color)] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Assistente com contexto dos seus dados</p>
                <p className="text-xs text-slate-500 mt-0.5">Faça perguntas sobre faturamento, pedidos e desempenho de vendedores com base nos dados do período selecionado.</p>
              </div>
            </div>

            {/* Sugestões rápidas */}
            {chatMessages.length === 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {[
                  'Qual o faturamento do período?',
                  'Quem vendeu mais?',
                  'Qual o ticket médio?',
                  'Como está o saldo a receber?',
                ].map(q => (
                  <button key={q} onClick={() => { setChatInput(q); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400 transition-colors">
                    <ChevronRight size={12} /> {q}
                  </button>
                ))}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 mb-4">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
                  <Bot size={40} className="opacity-30" />
                  <p className="text-sm">Faça uma pergunta sobre seus dados</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-[var(--primary-color)]/10 flex items-center justify-center shrink-0">
                      <Bot size={16} className="text-[var(--primary-color)]" />
                    </div>
                  )}
                  <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[var(--primary-color)] text-white rounded-br-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <User size={16} className="text-slate-500" />
                    </div>
                  )}
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-[var(--primary-color)]/10 flex items-center justify-center shrink-0">
                    <Bot size={16} className="text-[var(--primary-color)]" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-slate-100 dark:bg-slate-800 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-slate-400" />
                    <span className="text-xs text-slate-400">Analisando...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2 shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Pergunte sobre seus dados..."
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30 focus:border-[var(--primary-color)] transition-all placeholder:text-slate-400"
                disabled={chatLoading}
              />
              <button
                onClick={sendMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="px-4 py-3 bg-[var(--primary-color)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center gap-2 font-bold text-sm"
              >
                {chatLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
