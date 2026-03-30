import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { up } from '../lib/uppercase';

// ─── useLocalStorage ────────────────────────────────────────────────────────
// Substitui o padrão repetitivo useState + useEffect para localStorage.
function useLocalStorage<T>(key: string, fallback: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      // Mantém fallback se array vazio veio salvo (ex: usuários iniciais)
      if (Array.isArray(parsed) && parsed.length === 0 && Array.isArray(fallback) && (fallback as unknown[]).length > 0) return fallback;
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}
import {
  AppUser, ProductionStaff, PhaseConfig, SalesPhaseConfig,
  Brand, ProductGroup, ServiceGroup, SalesChannel,
  CompanyInfo, ProductionPhase, INITIAL_PHASES, PermissionProfile
} from '../types';
import { DEFAULT_PROFILES } from '../lib/permissions';

const INITIAL_APP_USERS: AppUser[] = [
  { id: '1', code: 1, name: 'Fábio Admin', email: 'fabio@marmoflow.com', role: 'admin', status: 'ativo', createdAt: '2024-01-10' },
  { id: '2', code: 2, name: 'Ana Gerente', email: 'ana@marmoflow.com', role: 'manager', status: 'ativo', createdAt: '2024-02-01' },
  { id: '3', code: 3, name: 'Carlos Vendas', email: 'carlos@marmoflow.com', role: 'seller', status: 'ativo', createdAt: '2024-03-05' },
];

const INITIAL_STAFF: ProductionStaff[] = [
  { id: '1', code: 1, name: 'João Ferreira', position: 'serrador', hourlyRate: 22, phone: '(11) 99876-1234', status: 'ativo' },
  { id: '2', code: 2, name: 'Marcos Lima', position: 'acabador', hourlyRate: 20, phone: '(11) 99123-5678', status: 'ativo' },
  { id: '3', code: 3, name: 'Pedro Alves', position: 'ajudante_serrador', hourlyRate: 16, phone: '(11) 98765-0000', status: 'ativo' },
  { id: '4', code: 4, name: 'Lucas Costa', position: 'medidor', hourlyRate: 18, phone: '(11) 97654-3210', status: 'inativo' },
];

export const useSettings = (
  setOrders?: (update: (prev: any[]) => any[]) => void,
  setSales?: (update: (prev: any[]) => any[]) => void,
  companyId?: string
) => {
  // App Users — Supabase como fonte principal, localStorage como cache
  const [appUsers, setAppUsers] = useLocalStorage<AppUser[]>('marmo_app_users', INITIAL_APP_USERS);

  // Carrega app_users do Supabase quando companyId estiver disponível
  useEffect(() => {
    if (!companyId) return;
    const fetchAppUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('*')
          .eq('company_id', companyId);
        if (error) throw error;
        if (data && data.length > 0) {
          // Auto-reparo: Deleta os Celsos sem código (os antigos bugados)
          let filteredData = data.filter((u: any) => !(u.name.toUpperCase().includes('CELSO TAVARES') && !u.code));
          if (filteredData.length < data.length) {
            // Remove na nuvem os que não têm código
            supabase.from('app_users')
              .delete()
              .ilike('name', '%CELSO TAVARES%')
              .is('code', null)
              .then();
          }

          let currentMax = filteredData.reduce((m: number, u: any) => Math.max(m, u.code || 0), 0);

          const mapped: AppUser[] = filteredData.map((row: any) => {
            let code = row.code;
            
            // Força Fabio Lima (o antigo, ou o qual seja) a ser o 1 e fixa ele
            if (row.name.toUpperCase().includes('FABIO LIMA') && code !== 1) {
              code = 1;
              supabase.from('app_users').update({ code: 1 }).eq('id', row.id).then();
            } else if (!code) {
              currentMax++;
              code = currentMax;
              // Atualiza silenciosamente no Supabase para persistir a correção
              supabase.from('app_users').update({ code }).eq('id', row.id).then();
            }
            return {
              id: row.id,
              code,
              name: row.name,
              email: row.email,
              role: row.role || 'viewer',
              status: row.status || 'ativo',
              profileId: row.profile_id || undefined,
              company_id: row.company_id,
              createdAt: row.created_at || new Date().toISOString().slice(0, 10),
            };
          });
          setAppUsers(mapped);
        }
      } catch (err) {
        console.error('[useSettings] Erro ao carregar app_users do Supabase:', err);
      }
    };
    fetchAppUsers();
  }, [companyId]);

  // Production Staff
  const [staff, setStaff] = useLocalStorage<ProductionStaff[]>('marmo_staff', INITIAL_STAFF);

  // Deadline alert thresholds
  const [deadlineWarningDays, setDeadlineWarningDays] = useLocalStorage<number>('marmo_deadline_warning_days', 7);
  const [deadlineUrgentDays, setDeadlineUrgentDays] = useLocalStorage<number>('marmo_deadline_urgent_days', 3);

  // Idle session timeout
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useLocalStorage<number>('marmo_idle_timeout_minutes', 15);

  // Production Phases
  const [phases, setPhases] = useLocalStorage<PhaseConfig[]>('marmo_phases', INITIAL_PHASES);

  // Sales Phases
  const DEFAULT_SALES_PHASES: SalesPhaseConfig[] = [
    { name: 'Oportunidade', code: '10', desirableDays: 2, alertDays: 1 },
    { name: 'Orçamento', code: '20', desirableDays: 2, alertDays: 1 },
    { name: 'Negociação', code: '30', desirableDays: 5, alertDays: 1 },
  ];
  const [salesPhases, setSalesPhases] = useLocalStorage<SalesPhaseConfig[]>('marmo_sales_phases', DEFAULT_SALES_PHASES);

  // Categories & Lists
  const DEFAULT_SALES_CHANNELS: SalesChannel[] = [
    { id: '1', name: 'Google', createdAt: new Date().toISOString() },
    { id: '2', name: 'Indicação', createdAt: new Date().toISOString() },
    { id: '3', name: 'Instagram', createdAt: new Date().toISOString() },
    { id: '4', name: 'Showroom', createdAt: new Date().toISOString() },
  ];
  const [brands, setBrands]               = useLocalStorage<Brand[]>('marmo_brands', []);
  const [productGroups, setProductGroups] = useLocalStorage<ProductGroup[]>('marmo_product_groups', []);
  const [serviceGroups, setServiceGroups] = useLocalStorage<ServiceGroup[]>('marmo_service_groups', []);
  const [salesChannels, setSalesChannels] = useLocalStorage<SalesChannel[]>('marmo_sales_channels', DEFAULT_SALES_CHANNELS);

  // Company Info — fonte de verdade: Supabase. localStorage é apenas cache inicial.
  const defaultCompanyData: CompanyInfo = {
    name: 'Tok de Art',
    document: '14.092.404/0001-67',
    address: 'Rua Américo Brasiliense, 1853 - Vila Seixas - Ribeirão Preto - SP',
    phone: '(16) 3636-0114',
    email: 'vendas@tokdeart.com.br',
    logoUrl: '',
    lostReasonOptions: ['Tinha preço menor', 'Prazo de entrega melhor', 'Desistiu de fazer', 'Não aprovaram o material', 'Distância da obra'],
    buttonColor: '#ec5b13',
    sidebarColor: '#0f172a',
    sidebarTextColor: '#cbd5e1',
  };

  const [companyInfo, setCompanyInfoState] = useState<CompanyInfo>(() => {
    try {
      const saved = localStorage.getItem('marmo_company');
      if (!saved) return defaultCompanyData;
      const parsed = JSON.parse(saved) || {};
      return { ...defaultCompanyData, ...parsed };
    } catch {
      return defaultCompanyData;
    }
  });

  // Busca do Supabase quando companyId estiver disponível
  useEffect(() => {
    if (!companyId) return;
    const fetchCompany = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();
        if (error) throw error;
        if (data) {
          const info: CompanyInfo = {
            name: data.name || '',
            document: data.document || '',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            logoUrl: data.logo_url || '',
            printLogoUrl: data.print_logo_url || '',
            iconUrl: data.icon_url || '',
            sidebarColor: data.sidebar_color || '#0f172a',
            sidebarTextColor: data.sidebar_text_color || '#cbd5e1',
            buttonColor: data.button_color || '#ec5b13',
            lostReasonOptions: data.lost_reason_options || [],
            legalNote: data.legal_note || undefined,
            maxDiscountPct: data.max_discount_pct ?? undefined,
          };
          setCompanyInfoState(info);
          localStorage.setItem('marmo_company', JSON.stringify(info));
        }
      } catch (err) {
        console.error('Erro ao carregar dados da empresa:', err);
      }
    };
    fetchCompany();
  }, [companyId]);

  // Sincroniza variáveis CSS de tema sempre que companyInfo mudar
  useEffect(() => {
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
    
    // Atualiza o Favicon (ícone da aba) se iconUrl estiver presente
    if (companyInfo.iconUrl || companyInfo.logoUrl) {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = companyInfo.iconUrl || companyInfo.logoUrl || '';
      if (!link.parentNode) document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, [companyInfo]);

  // Salva no Supabase + atualiza estado local e cache
  const setCompanyInfo = async (info: CompanyInfo) => {
    setCompanyInfoState(info);
    localStorage.setItem('marmo_company', JSON.stringify(info));
    if (!companyId) return;
    try {
      const { error } = await supabase.from('companies').update({
        name: up(info.name) ?? info.name,
        document: info.document || null,
        address: up(info.address) ?? info.address ?? null,
        phone: info.phone || null,
        email: info.email || null,
        logo_url: info.logoUrl || null,
        print_logo_url: info.printLogoUrl || null,
        icon_url: info.iconUrl || null,
        sidebar_color: info.sidebarColor || null,
        sidebar_text_color: info.sidebarTextColor || null,
        button_color: info.buttonColor || null,
        lost_reason_options: info.lostReasonOptions || [],
        legal_note: info.legalNote || null,
        max_discount_pct: info.maxDiscountPct ?? null,
      }).eq('id', companyId);
      if (error) throw error;
    } catch (err) {
      console.error('Erro ao salvar dados da empresa:', err);
    }
  };

  // Handlers
  /**
   * Salva um usuário do app (novo ou edição).
   * - Novos: cria no Supabase Auth + insere na tabela app_users.
   * - Edição: atualiza nome, role e perfil na tabela app_users.
   */
  const handleSaveUser = async (u: AppUser, password?: string): Promise<string | undefined> => {
    const userCompanyId = companyId || '00000000-0000-0000-0000-000000000000';

    // Para usuários novos (com senha fornecida e sem código ainda), cria via Admin API no Vercel
    if (password && !u.code) {
      const resp = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          email: u.email,
          newPassword: password,
          userData: {
            full_name: u.name,
            name: u.name,
            company_id: userCompanyId,
            role: u.role,
          }
        })
      });
      
      const signUpResult = await resp.json();
      if (!resp.ok) {
        if (signUpResult.error?.toLowerCase().includes('already registered')) {
          return 'Este email já possui uma conta cadastrada no sistema.';
        }
        return `Erro ao criar acesso: ${signUpResult.error || 'Erro desconhecido'}`;
      }

      // Usa o ID do Auth do resultado do Admin API como ID do app_user para consistência
      const authUserId = signUpResult.user?.id || u.id;
      // Calcula próximo código sequencial fixo
      const nextCode = appUsers.reduce((max, x) => Math.max(max, x.code || 0), 0) + 1;
      const newUser: AppUser = { ...u, id: authUserId, code: nextCode, company_id: userCompanyId };

      // Persiste no Supabase (tabela app_users)
      try {
        await supabase.from('app_users').upsert({
          id: authUserId,
          code: nextCode,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status || 'ativo',
          profile_id: u.profileId || null,
          company_id: userCompanyId,
          created_at: u.createdAt || new Date().toISOString().slice(0, 10),
        });
      } catch (err) {
        console.error('[handleSaveUser] Erro ao persistir app_user novo:', err);
      }

      setAppUsers(prev => [...prev, newUser]);
      return undefined;
    }

    // Edição de usuário existente — persiste no Supabase
    try {
      // Se tiver password numa edição, chama nossa rota serverless para Admin API
      if (password && u.code) {
        const response = await fetch('/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: u.id, newPassword: password })
        });
        const result = await response.json();
        if (!response.ok) {
           return `Aviso: não foi possível alterar a conta no Vercel: ${result.error || 'Erro desconhecido'}`;
        }
      }

      const { error } = await supabase.from('app_users').upsert({
        id: u.id,
        code: u.code || undefined,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status || 'ativo',
        profile_id: u.profileId || null,
        company_id: u.company_id || userCompanyId,
        created_at: u.createdAt || new Date().toISOString().slice(0, 10),
      });
      if (error) {
        console.error('[handleSaveUser] Erro ao atualizar app_user:', error);
        return `Erro ao salvar alterações: ${error.message}`;
      }
    } catch (err: any) {
      console.error('[handleSaveUser] Erro inesperado:', err);
      return `Erro ao salvar alterações: ${err.message}`;
    }

    setAppUsers(prev => prev.find(x => x.id === u.id) ? prev.map(x => x.id === u.id ? u : x) : [...prev, u]);
    return undefined;
  };
  const handleDeleteUser = async (id: string) => {
    // Marca como inativo no Supabase
    try {
      await supabase.from('app_users').update({ status: 'inativo' }).eq('id', id);
    } catch (err) {
      console.error('[handleDeleteUser] Erro ao inativar no Supabase:', err);
    }
    setAppUsers(prev => prev.map(x => x.id === id ? { ...x, status: 'inativo' as const } : x));
  };

  const handleSaveStaff = (s: ProductionStaff) => {
    setStaff(prev => {
      const exists = prev.find(x => x.id === s.id);
      if (exists) {
        return prev.map(x => x.id === s.id ? { ...s, code: s.code || exists.code } : x);
      }
      const nextCode = prev.reduce((max, x) => Math.max(max, x.code || 0), 0) + 1;
      return [...prev, { ...s, code: nextCode }];
    });
  };
  const handleDeleteStaff = (id: string) => setStaff(prev => prev.map(x => x.id === id ? { ...x, status: 'inativo' as const } : x));

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
  const deleteSalesPhase = (name: string) => setSalesPhases(prev => {
    const phase = prev.find(p => p.name === name);
    if (phase?.code === '10' || phase?.code === '20' || phase?.code === '30') {
      alert('Esta fase é obrigatória do sistema e não pode ser excluída.');
      return prev;
    }
    return prev.filter(p => p.name !== name);
  });

  // Migração/Garantia de códigos para fases padrão
  useEffect(() => {
    setSalesPhases(prev => {
      let changed = false;
      const next = prev.map(p => {
        if (p.name === 'Oportunidade' && !p.code) { changed = true; return { ...p, code: '10' }; }
        if (p.name === 'Orçamento' && !p.code)    { changed = true; return { ...p, code: '20' }; }
        if (p.name === 'Negociação' && !p.code)   { changed = true; return { ...p, code: '30' }; }
        return p;
      });
      return changed ? next : prev;
    });
  }, []);
  const updateSalesPhase = (name: string, updates: Partial<SalesPhaseConfig>) => {
    setSalesPhases(prev => prev.map(p => p.name === name ? { ...p, ...updates } : p));
  };
  const reorderSalesPhases = (startIndex: number, endIndex: number) => {
    const result = Array.from(salesPhases);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setSalesPhases(result);
  };

  // Permission Profiles — init com merge para garantir perfis padrão
  const [permissionProfiles, setPermissionProfiles] = useState<PermissionProfile[]>(() => {
    try {
      const raw = localStorage.getItem('marmo_permission_profiles');
      if (!raw) return DEFAULT_PROFILES;
      const parsed: PermissionProfile[] = JSON.parse(raw);
      const ids = parsed.map(p => p.id);
      const missing = DEFAULT_PROFILES.filter(d => !ids.includes(d.id));
      return [...missing, ...parsed];
    } catch {
      return DEFAULT_PROFILES;
    }
  });
  useEffect(() => {
    localStorage.setItem('marmo_permission_profiles', JSON.stringify(permissionProfiles));
  }, [permissionProfiles]);

  const handleSaveProfile = (profile: PermissionProfile) =>
    setPermissionProfiles(prev => prev.find(p => p.id === profile.id)
      ? prev.map(p => p.id === profile.id ? profile : p)
      : [...prev, profile]);

  const handleDeleteProfile = (id: string) =>
    setPermissionProfiles(prev => prev.filter(p => p.id !== id && !p.isDefault));

  const handleSaveBrand = (b: Brand) => setBrands(prev => { const u = { ...b, description: up(b.description) ?? b.description }; return prev.find(x => x.id === b.id) ? prev.map(x => x.id === b.id ? u : x) : [u, ...prev]; });
  const handleDeleteBrand = (id: string) => setBrands(prev => prev.map(x => x.id === id ? { ...x, status: 'inativo' as const } : x));

  const handleSaveProductGroup = (g: ProductGroup) => setProductGroups(prev => { const u = { ...g, description: up(g.description) ?? g.description }; return prev.find(x => x.id === g.id) ? prev.map(x => x.id === g.id ? u : x) : [u, ...prev]; });
  const handleDeleteProductGroup = (id: string) => setProductGroups(prev => prev.map(x => x.id === id ? { ...x, status: 'inativo' as const } : x));

  const handleSaveServiceGroup = (g: ServiceGroup) => setServiceGroups(prev => { const u = { ...g, description: up(g.description) ?? g.description }; return prev.find(x => x.id === g.id) ? prev.map(x => x.id === g.id ? u : x) : [u, ...prev]; });
  const handleDeleteServiceGroup = (id: string) => setServiceGroups(prev => prev.map(x => x.id === id ? { ...x, status: 'inativo' as const } : x));

  const handleSaveSalesChannel = (c: SalesChannel) => setSalesChannels(prev => { const u = { ...c, name: up(c.name) ?? c.name }; return prev.find(x => x.id === c.id) ? prev.map(x => x.id === c.id ? u : x) : [...prev, u]; });
  const handleDeleteSalesChannel = (id: string) => setSalesChannels(prev => prev.map(x => x.id === id ? { ...x, status: 'inativo' as const } : x));

  return {
    appUsers, handleSaveUser, handleDeleteUser,
    staff, handleSaveStaff, handleDeleteStaff,
    phases, addPhase, renamePhase, deletePhase, reorderPhases, togglePhaseRequirement,
    salesPhases, addSalesPhase, renameSalesPhase, deleteSalesPhase, updateSalesPhase, reorderSalesPhases,
    brands, handleSaveBrand, handleDeleteBrand,
    productGroups, handleSaveProductGroup, handleDeleteProductGroup,
    serviceGroups, handleSaveServiceGroup, handleDeleteServiceGroup,
    salesChannels, handleSaveSalesChannel, handleDeleteSalesChannel,
    companyInfo, setCompanyInfo,
    permissionProfiles, handleSaveProfile, handleDeleteProfile,
    deadlineWarningDays, setDeadlineWarningDays,
    deadlineUrgentDays, setDeadlineUrgentDays,
    idleTimeoutMinutes, setIdleTimeoutMinutes,
  };
};
