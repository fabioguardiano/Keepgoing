import { useState, useEffect } from 'react';
import { 
  AppUser, ProductionStaff, PhaseConfig, SalesPhaseConfig, 
  Brand, ProductGroup, ServiceGroup, SalesChannel, 
  CompanyInfo, ProductionPhase, INITIAL_PHASES 
} from '../types';

const INITIAL_APP_USERS: AppUser[] = [
  { id: '1', name: 'Fábio Admin', email: 'fabio@marmoflow.com', role: 'admin', status: 'ativo', createdAt: '2024-01-10' },
  { id: '2', name: 'Ana Gerente', email: 'ana@marmoflow.com', role: 'manager', status: 'ativo', createdAt: '2024-02-01' },
  { id: '3', name: 'Carlos Vendas', email: 'carlos@marmoflow.com', role: 'seller', status: 'ativo', createdAt: '2024-03-05' },
];

const INITIAL_STAFF: ProductionStaff[] = [
  { id: '1', name: 'João Ferreira', position: 'serrador', hourlyRate: 22, phone: '(11) 99876-1234', status: 'ativo' },
  { id: '2', name: 'Marcos Lima', position: 'acabador', hourlyRate: 20, phone: '(11) 99123-5678', status: 'ativo' },
  { id: '3', name: 'Pedro Alves', position: 'ajudante_serrador', hourlyRate: 16, phone: '(11) 98765-0000', status: 'ativo' },
  { id: '4', name: 'Lucas Costa', position: 'medidor', hourlyRate: 18, phone: '(11) 97654-3210', status: 'inativo' },
];

export const useSettings = (
  setOrders?: (update: (prev: any[]) => any[]) => void,
  setSales?: (update: (prev: any[]) => any[]) => void
) => {
  // App Users
  const [appUsers, setAppUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem('marmo_app_users');
      return (saved && JSON.parse(saved).length > 0) ? JSON.parse(saved) : INITIAL_APP_USERS;
    } catch {
      return INITIAL_APP_USERS;
    }
  });

  useEffect(() => {
    localStorage.setItem('marmo_app_users', JSON.stringify(appUsers));
  }, [appUsers]);

  // Production Staff
  const [staff, setStaff] = useState<ProductionStaff[]>(() => {
    try {
      const saved = localStorage.getItem('marmo_staff');
      return (saved && JSON.parse(saved).length > 0) ? JSON.parse(saved) : INITIAL_STAFF;
    } catch {
      return INITIAL_STAFF;
    }
  });

  useEffect(() => {
    localStorage.setItem('marmo_staff', JSON.stringify(staff));
  }, [staff]);

  // Production Phases
  const [phases, setPhases] = useState<PhaseConfig[]>(() => {
    try {
      const saved = localStorage.getItem('marmo_phases');
      return (saved && JSON.parse(saved).length > 0) ? JSON.parse(saved) : INITIAL_PHASES;
    } catch {
      return INITIAL_PHASES;
    }
  });

  useEffect(() => {
    localStorage.setItem('marmo_phases', JSON.stringify(phases));
  }, [phases]);

  // Sales Phases
  const [salesPhases, setSalesPhases] = useState<SalesPhaseConfig[]>(() => {
    const defaultPhases = [
      { name: 'Oportunidade' },
      { name: 'Orçamento' },
      { name: 'Negociação' },
      { name: 'Pedido/Ganho' }
    ];
    try {
      const saved = localStorage.getItem('marmo_sales_phases');
      if (!saved) return defaultPhases;
      const parsed = JSON.parse(saved);
      return (parsed && parsed.length > 0) ? parsed : defaultPhases;
    } catch {
      return defaultPhases;
    }
  });

  useEffect(() => {
    localStorage.setItem('marmo_sales_phases', JSON.stringify(salesPhases));
  }, [salesPhases]);

  // Categories & Lists
  const [brands, setBrands] = useState<Brand[]>(() => {
    try {
      const saved = localStorage.getItem('marmo_brands');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('marmo_brands', JSON.stringify(brands));
  }, [brands]);

  const [productGroups, setProductGroups] = useState<ProductGroup[]>(() => {
    try {
      const saved = localStorage.getItem('marmo_product_groups');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('marmo_product_groups', JSON.stringify(productGroups));
  }, [productGroups]);

  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>(() => {
    try {
      const saved = localStorage.getItem('marmo_service_groups');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('marmo_service_groups', JSON.stringify(serviceGroups));
  }, [serviceGroups]);

  const [salesChannels, setSalesChannels] = useState<SalesChannel[]>(() => {
    try {
      const saved = localStorage.getItem('marmo_sales_channels');
      return (saved && JSON.parse(saved).length > 0) ? JSON.parse(saved) : [
        { id: '1', name: 'Google', createdAt: new Date().toISOString() },
        { id: '2', name: 'Indicação', createdAt: new Date().toISOString() },
        { id: '3', name: 'Instagram', createdAt: new Date().toISOString() },
        { id: '4', name: 'Showroom', createdAt: new Date().toISOString() }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('marmo_sales_channels', JSON.stringify(salesChannels));
  }, [salesChannels]);

  // Company Info
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(() => {
    const defaultData = {
      name: 'Tok de Art',
      document: '14.092.404/0001-67',
      address: 'Rua Américo Brasiliense, 1853 - Vila Seixas - Ribeirão Preto - SP',
      phone: '(16) 3636-0114',
      email: 'vendas@tokdeart.com.br',
      logoUrl: '',
      lostReasonOptions: ['Tinha preço menor', 'Prazo de entrega melhor', 'Desistiu de fazer', 'Não aprovaram o material', 'Distância da obra'],
      buttonColor: '#ec5b13',
      sidebarColor: '#0f172a',
      sidebarTextColor: '#cbd5e1'
    };
    try {
      const saved = localStorage.getItem('marmo_company');
      if (!saved) return defaultData;
      const parsed = JSON.parse(saved) || {};
      return { ...defaultData, ...parsed };
    } catch {
      return defaultData;
    }
  });

  useEffect(() => {
    localStorage.setItem('marmo_company', JSON.stringify(companyInfo));
    
    // Theme sync
    const root = document.documentElement;
    const primary = companyInfo.buttonColor || '#ec5b13';
    root.style.setProperty('--primary-color', primary);
    root.style.setProperty('--sidebar-bg', companyInfo.sidebarColor || '#0f172a');
    root.style.setProperty('--sidebar-text', companyInfo.sidebarTextColor || '#cbd5e1');

    const darken = (hex: string, percent: number) => {
      const num = parseInt(hex.replace('#', ''), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) - amt,
        G = (num >> 8 & 0x00FF) - amt,
        B = (num & 0x0000FF) - amt;
      return '#' + (0x1000000 + (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 0 ? 0 : B : 255)).toString(16).slice(1);
    };
    root.style.setProperty('--secondary-color', darken(primary, 10));
  }, [companyInfo]);

  // Handlers
  const handleSaveUser = (u: AppUser) => setAppUsers(prev => prev.find(x => x.id === u.id) ? prev.map(x => x.id === u.id ? u : x) : [...prev, u]);
  const handleDeleteUser = (id: string) => setAppUsers(prev => prev.filter(x => x.id !== id));

  const handleSaveStaff = (s: ProductionStaff) => setStaff(prev => prev.find(x => x.id === s.id) ? prev.map(x => x.id === s.id ? s : x) : [...prev, s]);
  const handleDeleteStaff = (id: string) => setStaff(prev => prev.filter(x => x.id !== id));

  const addPhase = (name: string) => {
    if (!phases.find(p => p.name === name)) {
      setPhases([...phases, { name, requiresResponsible: false }]);
    }
  };
  const renamePhase = (oldName: string, newName: string) => {
    setPhases(prev => prev.map(p => p.name === oldName ? { ...p, name: newName } : p));
    if (setOrders) {
      setOrders(prev => prev.map(o => o.phase === oldName ? { ...o, phase: newName as ProductionPhase } : o));
    }
  };
  const deletePhase = (name: string) => setPhases(prev => prev.filter(p => p.name !== name));
  const reorderPhases = (startIndex: number, endIndex: number) => {
    const result = Array.from(phases);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setPhases(result);
  };
  const togglePhaseRequirement = (phaseName: string) => setPhases(prev => prev.map(p => p.name === phaseName ? { ...p, requiresResponsible: !p.requiresResponsible } : p));

  const addSalesPhase = (name: string) => {
    if (!salesPhases.find(p => p.name === name)) {
      setSalesPhases([...salesPhases, { name }]);
    }
  };
  const renameSalesPhase = (oldName: string, newName: string) => {
    setSalesPhases(prev => prev.map(p => p.name === oldName ? { ...p, name: newName } : p));
    if (setSales) {
      setSales(prev => prev.map(s => s.salesPhase === oldName ? { ...s, salesPhase: newName } : s));
    }
  };
  const deleteSalesPhase = (name: string) => setSalesPhases(prev => prev.filter(p => p.name !== name));
  const reorderSalesPhases = (startIndex: number, endIndex: number) => {
    const result = Array.from(salesPhases);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setSalesPhases(result);
  };

  const handleSaveBrand = (b: Brand) => setBrands(prev => prev.find(x => x.id === b.id) ? prev.map(x => x.id === b.id ? b : x) : [b, ...prev]);
  const handleDeleteBrand = (id: string) => setBrands(prev => prev.map(x => x.id === id ? { ...x, status: 'inativo' as const } : x));

  const handleSaveProductGroup = (g: ProductGroup) => setProductGroups(prev => prev.find(x => x.id === g.id) ? prev.map(x => x.id === g.id ? g : x) : [g, ...prev]);
  const handleDeleteProductGroup = (id: string) => setProductGroups(prev => prev.map(x => x.id === id ? { ...x, status: 'inativo' as const } : x));

  const handleSaveServiceGroup = (g: ServiceGroup) => setServiceGroups(prev => prev.find(x => x.id === g.id) ? prev.map(x => x.id === g.id ? g : x) : [g, ...prev]);
  const handleDeleteServiceGroup = (id: string) => setServiceGroups(prev => prev.map(x => x.id === id ? { ...x, status: 'inativo' as const } : x));

  const handleSaveSalesChannel = (c: SalesChannel) => setSalesChannels(prev => prev.find(x => x.id === c.id) ? prev.map(x => x.id === c.id ? c : x) : [...prev, c]);
  const handleDeleteSalesChannel = (id: string) => setSalesChannels(prev => prev.map(x => x.id === id ? { ...x, status: 'inativo' as const } : x));

  return {
    appUsers, handleSaveUser, handleDeleteUser,
    staff, handleSaveStaff, handleDeleteStaff,
    phases, addPhase, renamePhase, deletePhase, reorderPhases, togglePhaseRequirement,
    salesPhases, addSalesPhase, renameSalesPhase, deleteSalesPhase, reorderSalesPhases,
    brands, handleSaveBrand, handleDeleteBrand,
    productGroups, handleSaveProductGroup, handleDeleteProductGroup,
    serviceGroups, handleSaveServiceGroup, handleDeleteServiceGroup,
    salesChannels, handleSaveSalesChannel, handleDeleteSalesChannel,
    companyInfo, setCompanyInfo
  };
};
