import React, { useState } from 'react';
import { Diamond, LayoutDashboard, Package, BarChart3, Users, Settings, PlusCircle, MapPin, ShoppingBag, Wallet, Box, ChevronDown, ChevronRight, Truck, Briefcase, Wrench, TrendingUp, ClipboardList } from 'lucide-react';
import { View, CompanyInfo } from '../types';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
  currentView: View;
  onViewChange: (view: View) => void;
  companyInfo: CompanyInfo;
  userRole: string;
  exchangeRates: { usd: number; eur: number; lastUpdate: string };
}

interface NavItem {
  icon: any;
  label: string;
  view?: View;
  subItems?: { label: string; view: View; icon: any }[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggle, currentView, onViewChange, companyInfo, userRole, exchangeRates }) => {
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => 
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
    );
  };

  const navItems: NavItem[] = [
    {
      icon: PlusCircle,
      label: 'Cadastros',
      subItems: [
        { icon: Users, label: 'Clientes', view: 'Clientes' as View },
        { icon: Truck, label: 'Fornecedores', view: 'Fornecedores' as View },
        { icon: Briefcase, label: 'Arquitetos', view: 'Arquitetos' as View },
        { icon: Users, label: 'Equipe', view: 'Equipe' as View },
      ]
    },
    {
      icon: Package,
      label: 'Grupo/Coleções',
      subItems: [
        { icon: Diamond, label: 'Marcas', view: 'Marcas' as View },
        { icon: ShoppingBag, label: 'Canais de Vendas', view: 'Canais de Vendas' as View },
        { icon: Box, label: 'Produtos', view: 'Grupos de Produtos' as View },
        { icon: Wrench, label: 'Serviços', view: 'Grupos de Serviços' as View },
      ]
    },
    {
      icon: Box,
      label: 'Estoque / Acabamentos',
      subItems: [
        { icon: Package, label: 'Matéria Prima', view: 'Matéria Prima' as View },
        { icon: Diamond, label: 'Acabamentos', view: 'Acabamentos' as View },
        { icon: ShoppingBag, label: 'Produtos Revenda', view: 'Produtos Revenda' as View },
        { icon: Wrench, label: 'Mão de obra (Instalação)', view: 'Mão de obra (Instalação)' as View },
      ]
    },
    { icon: ShoppingBag, label: 'Vendas', view: 'Vendas' as View },
    { icon: ClipboardList, label: 'O.S. de Produção', view: 'O.S. de Produção' as View },
    { icon: LayoutDashboard, label: 'Produção', view: 'Produção' as View },
    { icon: MapPin, label: 'Agenda de Entregas', view: 'Agenda de Entregas' as View },
    {
      icon: Wallet,
      label: 'Financeiro',
      subItems: [
        { icon: TrendingUp, label: 'Contas a Receber', view: 'Contas a Receber' as View },
        { icon: Wallet, label: 'Contas a Pagar', view: 'Contas a Pagar' as View },
        { icon: ShoppingBag, label: 'Formas de Pagamento', view: 'Formas de Pagamento' as View },
      ]
    },
    { icon: BarChart3, label: 'Relatórios', view: 'Relatórios' as View },
    {
      icon: Settings,
      label: 'Configurações',
      subItems: [
        { icon: Settings, label: 'Geral', view: 'Configurações' as View },
        { icon: Wallet, label: 'Tipos de Pagamento', view: 'Tipos de Pagamento' as View },
      ]
    }
  ].filter(item => {
    if (userRole === 'driver') {
      return item.view === 'Agenda de Entregas';
    }
    return true;
  });

  return (
    <aside 
      className={`${isOpen ? 'w-64' : 'w-20'} flex flex-col shrink-0 transition-all duration-300 shadow-2xl z-50`}
      style={{ 
        backgroundColor: 'var(--sidebar-bg)',
        color: 'var(--sidebar-text)'
      }}
    >
      <div className="p-6 flex items-center gap-3 cursor-pointer" onClick={toggle}>
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[var(--primary-color)] shrink-0 overflow-hidden">
          {companyInfo.logoUrl ? (
            <img src={companyInfo.logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <Diamond className="w-6 h-6" />
          )}
        </div>
        {isOpen && (
          <div className="overflow-hidden whitespace-nowrap">
            <h1 className="font-bold text-lg leading-none truncate max-w-[140px]" style={{ color: 'var(--sidebar-text)' }}>{companyInfo.name}</h1>
            <span className="text-xs uppercase tracking-wider font-semibold opacity-50">KeepGoing CRM</span>
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item, idx) => {
          const isExpanded = expandedMenus.includes(item.label);
          const hasActiveChild = item.subItems?.some(si => si.view === currentView);
          const isActive = item.view === currentView || hasActiveChild;

          return (
            <div key={idx} className="space-y-1">
              <button
                onClick={() => item.subItems ? (isOpen ? toggleMenu(item.label) : toggle()) : (item.view && onViewChange(item.view))}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive && !item.subItems
                  ? 'bg-[var(--primary-color)] text-white shadow-lg shadow-[var(--primary-color)]/20'
                  : 'hover:bg-white/10'
                  }`}
                style={(!isActive || item.subItems) ? { color: 'var(--sidebar-text)' } : {}}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 shrink-0 ${isActive && !item.subItems ? 'text-white' : ''}`} style={(!isActive || item.subItems) ? { color: 'var(--sidebar-text)', opacity: 0.7 } : {}} />
                  {isOpen && <span className="text-sm font-bold whitespace-nowrap">{item.label}</span>}
                </div>
                {isOpen && item.subItems && (
                  isExpanded ? <ChevronDown size={14} className="opacity-50" /> : <ChevronRight size={14} className="opacity-50" />
                )}
              </button>

              {isOpen && item.subItems && isExpanded && (
                <div className="ml-4 pl-4 border-l border-white/10 space-y-1 animate-in slide-in-from-top-2 duration-200">
                  {item.subItems.map((subItem, sIdx) => {
                    const isSubActive = currentView === subItem.view;
                    return (
                      <button
                        key={sIdx}
                        onClick={() => onViewChange(subItem.view)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${isSubActive
                          ? 'bg-[var(--primary-color)]/10 text-white'
                          : 'hover:bg-white/5 text-slate-400'
                          }`}
                        style={isSubActive ? { color: 'var(--primary-color)' } : { color: 'var(--sidebar-text)', opacity: 0.7 }}
                      >
                        <subItem.icon size={16} className="shrink-0" />
                        <span className="text-xs font-bold whitespace-nowrap">{subItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-4 mt-4 border-t opacity-10" style={{ borderColor: 'var(--sidebar-text)' }} />
      </nav>

      {/* Premium Currency Widget */}
      <div className={`mt-auto p-4 transition-all duration-500 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 shadow-lg relative overflow-hidden group hover:bg-white/10 transition-all cursor-default">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8 group-hover:bg-white/10 transition-all duration-700" />
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <TrendingUp size={14} className="text-[var(--primary-color)]" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Moedas Hoje</span>
          </div>
          <div className="space-y-2 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-emerald-500/20 rounded-md flex items-center justify-center text-emerald-400 text-[10px] font-black">U</div>
                <span className="text-[11px] font-bold opacity-70">USD / BRL</span>
              </div>
              <span className="text-xs font-black text-white">R$ {exchangeRates.usd.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-500/20 rounded-md flex items-center justify-center text-blue-400 text-[10px] font-black">E</div>
                <span className="text-[11px] font-bold opacity-70">EUR / BRL</span>
              </div>
              <span className="text-xs font-black text-white">R$ {exchangeRates.eur.toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-1.5 opacity-30">
             <span className="text-[8px] font-bold uppercase tracking-widest">Atual em {exchangeRates.lastUpdate}</span>
          </div>
        </div>
      </div>

    </aside>
  );
};
