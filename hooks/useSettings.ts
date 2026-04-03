import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { up } from '../lib/uppercase';
import {
  AppUser, ProductionStaff, PhaseConfig, SalesPhaseConfig,
  Brand, ProductGroup, ServiceGroup, SalesChannel,
  CompanyInfo, ProductionPhase, INITIAL_PHASES, PermissionProfile
} from '../types';
import { DEFAULT_PROFILES } from '../lib/permissions';


export const useSettings = (
  setOrders?: (update: (prev: any[]) => any[]) => void,
  setSales?: (update: (prev: any[]) => any[]) => void,
  companyId?: string
) => {
  // App Users — Supabase como fonte principal
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const saveTimeoutRef = useRef<any>(null);

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
              avatarUrl: row.avatar_url || undefined,
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

  // Production Staff — Supabase como fonte de verdade
  const [staff, setStaff] = useState<ProductionStaff[]>([]);

  // Deadline alert thresholds — Supabase como fonte de verdade
  const [deadlineWarningDays, setDeadlineWarningDays] = useState<number>(7);
  const [deadlineUrgentDays, setDeadlineUrgentDays] = useState<number>(3);

  // Idle session timeout — Supabase como fonte de verdade
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState<number>(15);

  // Production Phases — Supabase como fonte de verdade
  const [phases, setPhases] = useState<PhaseConfig[]>(INITIAL_PHASES);

  // Sales Phases — fonte de verdade: Supabase.
  const DEFAULT_SALES_PHASES: SalesPhaseConfig[] = [
    { name: 'Oportunidade', code: '10', desirableDays: 2, alertDays: 1 },
    { name: 'Orçamento', code: '20', desirableDays: 2, alertDays: 1 },
    { name: 'Negociação', code: '30', desirableDays: 5, alertDays: 1 },
  ];
  const [salesPhases, setSalesPhases] = useState<SalesPhaseConfig[]>(DEFAULT_SALES_PHASES);

  // Categories & Lists
  const DEFAULT_SALES_CHANNELS: SalesChannel[] = [
    { id: '1', code: 1, name: 'GOOGLE', createdAt: new Date().toISOString() },
    { id: '2', code: 2, name: 'INDICAÇÃO', createdAt: new Date().toISOString() },
    { id: '3', code: 3, name: 'INSTAGRAM', createdAt: new Date().toISOString() },
    { id: '4', code: 4, name: 'SHOWROOM', createdAt: new Date().toISOString() },
  ];
  const [salesChannels, setSalesChannels] = useState<SalesChannel[]>(DEFAULT_SALES_CHANNELS);
  const [brands, setBrands]               = useState<Brand[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);

  // Company Info — fonte de verdade: Supabase.
  const defaultCompanyData: CompanyInfo = {
    name: 'keepGoing',
    document: '14.092.404/0001-67',
    address: 'Rua Américo Brasiliense, 1853 - Vila Seixas - Ribeirão Preto - SP',
    phone: '(16) 3636-0114',
    email: 'vendas@tokdeart.com.br',
    logoUrl: '',
    lostReasonOptions: ['Tinha preço menor', 'Prazo de entrega melhor', 'Desistiu de fazer', 'Não aprovaram o material', 'Distância da obra'],
    buttonColor: '#004D4D',
    sidebarColor: '#0f172a',
    sidebarTextColor: '#cbd5e1',
  };

  const [companyInfo, setCompanyInfoState] = useState<CompanyInfo>(defaultCompanyData);

  // Busca do Supabase quando companyId estiver disponível + Realtime Sync
  useEffect(() => {
    if (!companyId) return;

    const updateStatesFromCompanyData = (data: any) => {
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
        buttonColor: data.button_color || '#004D4D',
        lostReasonOptions: data.lost_reason_options || [],
        legalNote: data.legal_note || undefined,
        maxDiscountPct: data.max_discount_pct ?? undefined,
      };
      setCompanyInfoState(info);

      // Sales Phases
      if (data.sales_phases && Array.isArray(data.sales_phases) && data.sales_phases.length > 0) {
        setSalesPhases(data.sales_phases);
      }

      // Permission Profiles
      if (data.permission_profiles && Array.isArray(data.permission_profiles)) {
        const merged = mergeProfiles(data.permission_profiles as PermissionProfile[]);
        setPermissionProfiles(merged);
      }

      // Metadata Lists (Brands, Groups, Services)
      if (data.brands && Array.isArray(data.brands) && (data.brands.length > 0 || brands.length === 0)) {
        const br = data.brands.map((b: any) => ({ ...b, description: up(b.description) ?? b.description }));
        setBrands(br);
      }
      if (data.product_groups && Array.isArray(data.product_groups) && (data.product_groups.length > 0 || productGroups.length === 0)) {
        const pg = data.product_groups.map((g: any) => ({ ...g, description: up(g.description) ?? g.description }));
        setProductGroups(pg);
      }
      if (data.service_groups && Array.isArray(data.service_groups) && (data.service_groups.length > 0 || serviceGroups.length === 0)) {
        const sg = data.service_groups.map((g: any) => ({ ...g, description: up(g.description) ?? g.description }));
        setServiceGroups(sg);
      }
      if (data.sales_channels && Array.isArray(data.sales_channels) && data.sales_channels.length > 0) {
        let nextCode = 1;
        const sc = data.sales_channels.map((c: any) => {
          const normalized = { ...c, name: up(c.name) ?? c.name };
          if (!normalized.code) {
            normalized.code = nextCode++;
          } else {
            nextCode = Math.max(nextCode, normalized.code + 1);
          }
          return normalized;
        });
        const needsBackfill = sc.some((c: any, i: number) => c.code !== data.sales_channels[i].code);
        setSalesChannels(sc);
        if (needsBackfill) syncCompanyMetadata('sales_channels', sc);
      }

      // Staff
      if (data.staff && Array.isArray(data.staff) && data.staff.length > 0) {
        setStaff(data.staff);
      }

      // Phases
      if (data.phases && Array.isArray(data.phases) && data.phases.length > 0) {
        setPhases(data.phases);
      }

      // Deadline thresholds
      if (typeof data.deadline_warning_days === 'number') {
        setDeadlineWarningDays(data.deadline_warning_days);
      }
      if (typeof data.deadline_urgent_days === 'number') {
        setDeadlineUrgentDays(data.deadline_urgent_days);
      }

      // Idle timeout
      if (typeof data.idle_timeout_minutes === 'number') {
        setIdleTimeoutMinutes(data.idle_timeout_minutes);
      }
    };

    const fetchCompany = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();
        if (error) throw error;
        if (data) {
          updateStatesFromCompanyData(data);
        }
      } catch (err) {
        console.error('Erro ao carregar dados da empresa:', err);
      } finally {
        // Delay técnico proposital de 800ms para garantir que a SplashScreen seja vista
        // e as variáveis CSS sejam aplicadas antes de revelar o app
        setTimeout(() => setLoadingSettings(false), 800);
      }
    };

    fetchCompany();

    // Inscrição Realtime para configurações da empresa
    const channel = supabase.channel(`company_settings_${companyId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'companies',
        filter: `id=eq.${companyId}`
      }, (payload) => {
        console.log('[useSettings] Configurações atualizadas via Realtime:', payload.new);
        updateStatesFromCompanyData(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  // Sincroniza variáveis CSS de tema sempre que companyInfo mudar
  useEffect(() => {
    const root = document.documentElement;
    const primary = companyInfo.buttonColor || '#004D4D';
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

  // Salva no Supabase + atualiza estado local (com debounce para evitar flood)
  const setCompanyInfo = async (info: CompanyInfo) => {
    // 1. Atualiza estado local instantaneamente para feedback na UI
    setCompanyInfoState(info);
    
    if (!companyId) return;

    // 2. Cancela qualquer salvamento pendente (debounce)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 3. Agenda o salvamento no banco de dados para 500ms após a última mudança
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (!companyId) {
           console.warn('[useSettings] Tentativa de salvamento abortada: companyId ausente.');
           return;
        }

        console.log('[useSettings] Persistindo dados da empresa no Supabase...', { 
          buttonColor: info.buttonColor,
          sidebarColor: info.sidebarColor 
        });

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
        console.log('[useSettings] Dados da empresa salvos com sucesso.');
      } catch (err) {
        console.error('[useSettings] Erro ao salvar dados da empresa no Supabase:', err);
      } finally {
        saveTimeoutRef.current = null;
      }
    }, 500); // 500ms de debounce
  };

  /**
   * Sincronização genérica para listas de metadados
   */
  const syncCompanyMetadata = (columnName: string, data: any) => {
    if (!companyId) return;
    supabase.from('companies')
      .update({ [columnName]: data })
      .eq('id', companyId)
      .then(({ error }) => {
        if (error) console.error(`[useSettings] Erro ao sincronizar ${columnName}:`, error);
      });
  };

  // Handlers
  /**
   * Salva um usuário do app (novo ou edição).
   * - Novos: cria no Supabase Auth + insere na tabela app_users.
   * - Edição: atualiza nome, role e perfil na tabela app_users.
   */
  const handleSaveUser = async (u: AppUser, password?: string): Promise<string | undefined> => {
    const userCompanyId = companyId || '00000000-0000-0000-0000-000000000000';

    const getAuthHeaders = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      };
    };

    // Para usuários novos (com senha fornecida e sem código ainda), cria via Admin API no Vercel
    if (password && !u.code) {
      const resp = await fetch('/api/reset-password', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          action: 'create',
          email: u.email.toLowerCase().trim(),
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
          avatar_url: u.avatarUrl || null,
        });
      } catch (err) {
        console.error('[handleSaveUser] Erro ao persistir app_user novo:', err);
      }

      setAppUsers(prev => [...prev, newUser]);
      return undefined;
    }

    // Edição de usuário existente — persiste no Supabase
    try {
      const existingUser = appUsers.find(x => x.id === u.id);
      const emailChanged = existingUser && existingUser.email.toLowerCase() !== u.email.toLowerCase();

      // Troca de email — atualiza no Supabase Auth via Admin API
      if (emailChanged) {
        const response = await fetch('/api/reset-password', {
          method: 'POST',
          headers: await getAuthHeaders(),
          body: JSON.stringify({ action: 'update_email', userId: u.id, newEmail: u.email })
        });
        const result = await response.json();
        if (!response.ok) {
          return `Erro ao atualizar email no Auth: ${result.error || 'Erro desconhecido'}`;
        }
      }

      // Troca de senha — chama Admin API
      if (password && u.code) {
        const response = await fetch('/api/reset-password', {
          method: 'POST',
          headers: await getAuthHeaders(),
          body: JSON.stringify({ userId: u.id, newPassword: password })
        });
        const result = await response.json();
        if (!response.ok) {
           return `Aviso: não foi possível alterar a senha: ${result.error || 'Erro desconhecido'}`;
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
        avatar_url: u.avatarUrl || null,
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
      let next: ProductionStaff[];
      if (exists) {
        next = prev.map(x => x.id === s.id ? { ...s, code: s.code || exists.code } : x);
      } else {
        const nextCode = prev.reduce((max, x) => Math.max(max, x.code || 0), 0) + 1;
        next = [...prev, { ...s, code: nextCode }];
      }
      syncCompanyMetadata('staff', next);
      return next;
    });
  };
  const handleDeleteStaff = (id: string) => setStaff(prev => prev.map(x => x.id === id ? { ...x, status: 'inativo' as const } : x));

  const addPhase = (name: string) => {
    if (!phases.find(p => p.name === name)) {
      const next = [...phases, { name, requiresResponsible: false }];
      setPhases(next);
      syncCompanyMetadata('phases', next);
    }
  };
  const renamePhase = (oldName: string, newName: string) => {
    setPhases(prev => {
      const next = prev.map(p => p.name === oldName ? { ...p, name: newName } : p);
      syncCompanyMetadata('phases', next);
      return next;
    });
    if (setOrders) {
      setOrders(prev => prev.map(o => o.phase === oldName ? { ...o, phase: newName as ProductionPhase } : o));
    }
  };
  const deletePhase = (name: string) => {
    setPhases(prev => {
      const next = prev.filter(p => p.name !== name);
      syncCompanyMetadata('phases', next);
      return next;
    });
  };
  const reorderPhases = (startIndex: number, endIndex: number) => {
    const result = Array.from(phases);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setPhases(result);
    syncCompanyMetadata('phases', result);
  };
  const togglePhaseRequirement = (phaseName: string) => setPhases(prev => prev.map(p => p.name === phaseName ? { ...p, requiresResponsible: !p.requiresResponsible } : p));

  const addSalesPhase = (name: string) => {
    if (!salesPhases.find(p => p.name === name)) {
      const next = [...salesPhases, { name }];
      setSalesPhases(next);
      syncSalesPhasesToSupabase(next);
    }
  };
  const renameSalesPhase = (oldName: string, newName: string) => {
    const next = salesPhases.map(p => p.name === oldName ? { ...p, name: newName } : p);
    setSalesPhases(next);
    syncSalesPhasesToSupabase(next);

    if (setSales) {
      setSales(prev => prev.map(s => s.salesPhase === oldName ? { ...s, salesPhase: newName } : s));
    }
  };
  const deleteSalesPhase = (name: string) => {
    const phase = salesPhases.find(p => p.name === name);
    if (phase?.code === '10' || phase?.code === '20' || phase?.code === '30') {
      alert('Esta fase é obrigatória do sistema e não pode ser excluída.');
      return;
    }
    const next = salesPhases.filter(p => p.name !== name);
    setSalesPhases(next);
    syncSalesPhasesToSupabase(next);
  };

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

  const syncSalesPhasesToSupabase = (sPhases: SalesPhaseConfig[]) => {
    if (!companyId) return;
    supabase.from('companies')
      .update({ sales_phases: sPhases })
      .eq('id', companyId)
      .then(({ error }) => {
        if (error) console.error('[useSettings] Erro ao salvar sales_phases no Supabase:', error);
      });
  };

  const updateSalesPhase = (name: string, updates: Partial<SalesPhaseConfig>) => {
    setSalesPhases(prev => {
      const next = prev.map(p => p.name === name ? { ...p, ...updates } : p);
      syncSalesPhasesToSupabase(next);
      return next;
    });
  };
  const reorderSalesPhases = (startIndex: number, endIndex: number) => {
    const result = Array.from(salesPhases);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setSalesPhases(result);
    syncSalesPhasesToSupabase(result);
  };

  // Permission Profiles — fonte de verdade: Supabase (coluna permission_profiles em companies).
  const mergeProfiles = (fromDb: PermissionProfile[]): PermissionProfile[] => {
    const ids = fromDb.map(p => p.id);
    const missing = DEFAULT_PROFILES.filter(d => !ids.includes(d.id));
    return [...missing, ...fromDb].map(p => {
      // Garante que nomes dos perfis padrão reflitam a versão mais atual do código
      const def = DEFAULT_PROFILES.find(d => d.id === p.id);
      if (def && p.isDefault) return { ...p, name: def.name };
      return p;
    });
  };

  const [permissionProfiles, setPermissionProfiles] = useState<PermissionProfile[]>(DEFAULT_PROFILES);

  // O fetch agora é feito junto com o da empresa acima para garantir consistência

  // Salva perfis no Supabase (fonte de verdade) — fire-and-forget
  const syncProfilesToSupabase = (profiles: PermissionProfile[]) => {
    if (!companyId) return;
    supabase.from('companies')
      .update({ permission_profiles: profiles })
      .eq('id', companyId)
      .then(({ error }) => {
        if (error) console.error('[useSettings] Erro ao salvar permission_profiles no Supabase:', error);
      });
  };

  const handleSaveProfile = (profile: PermissionProfile) => {
    const updated = permissionProfiles.find(p => p.id === profile.id)
      ? permissionProfiles.map(p => p.id === profile.id ? profile : p)
      : [...permissionProfiles, profile];
    setPermissionProfiles(updated);
    syncProfilesToSupabase(updated);
  };
  const handleDeleteProfile = (id: string) => {
    const updated = permissionProfiles.filter(p => p.id !== id && !p.isDefault);
    setPermissionProfiles(updated);
    syncProfilesToSupabase(updated);
  };

  const handleSaveBrand = (b: Brand) => setBrands(prev => {
    const u = { ...b, description: up(b.description) ?? b.description };
    const next = prev.find(x => x.id === b.id) ? prev.map(x => x.id === b.id ? u : x) : [u, ...prev];
    syncCompanyMetadata('brands', next);
    return next;
  });
  const handleDeleteBrand = (id: string) => setBrands(prev => {
    const next = prev.map(x => x.id === id ? { ...x, status: 'inativo' as const } : x);
    syncCompanyMetadata('brands', next);
    return next;
  });

  const handleSaveProductGroup = (g: ProductGroup) => setProductGroups(prev => {
    const u = { ...g, description: up(g.description) ?? g.description };
    const next = prev.find(x => x.id === g.id) ? prev.map(x => x.id === g.id ? u : x) : [u, ...prev];
    syncCompanyMetadata('product_groups', next);
    return next;
  });
  const handleDeleteProductGroup = (id: string) => setProductGroups(prev => {
    const next = prev.map(x => x.id === id ? { ...x, status: 'inativo' as const } : x);
    syncCompanyMetadata('product_groups', next);
    return next;
  });

  const handleSaveServiceGroup = (g: ServiceGroup) => setServiceGroups(prev => {
    const u = { ...g, description: up(g.description) ?? g.description };
    const next = prev.find(x => x.id === g.id) ? prev.map(x => x.id === g.id ? u : x) : [u, ...prev];
    syncCompanyMetadata('service_groups', next);
    return next;
  });
  const handleDeleteServiceGroup = (id: string) => setServiceGroups(prev => {
    const next = prev.map(x => x.id === id ? { ...x, status: 'inativo' as const } : x);
    syncCompanyMetadata('service_groups', next);
    return next;
  });

  const handleSaveSalesChannel = (c: SalesChannel) => {
    setSalesChannels(prev => {
      const exists = prev.find(x => x.id === c.id);
      const nextCode = exists?.code ?? (prev.reduce((max, x) => Math.max(max, x.code ?? 0), 0) + 1);
      const u = { ...c, name: up(c.name) ?? c.name, code: nextCode };
      const next = exists ? prev.map(x => x.id === c.id ? u : x) : [...prev, u];
      syncCompanyMetadata('sales_channels', next);
      return next;
    });
  };

  const handleDeleteSalesChannel = (id: string) => {
    setSalesChannels(prev => {
      const next = prev.map(x => x.id === id ? { ...x, status: 'inativo' as const } : x);
      syncCompanyMetadata('sales_channels', next);
      return next;
    });
  };

  const onSyncCloud = async (type: 'brands' | 'product_groups' | 'service_groups') => {
    if (!companyId) return;
    const dataMap = {
      brands,
      product_groups: productGroups,
      service_groups: serviceGroups
    };
    const data = dataMap[type as keyof typeof dataMap];

    try {
      const { error } = await supabase.from('companies')
        .update({ [type]: data })
        .eq('id', companyId);

      if (error) throw error;
      console.log(`[useSettings] Sincronização cloud de ${type} concluída com sucesso.`);
    } catch (err) {
      console.error(`[useSettings] Erro ao sincronizar ${type} com a nuvem:`, err);
      throw err;
    }
  };

  // Wrapper setters que também persistem no Supabase
  const saveDeadlineWarningDays = (days: number) => {
    setDeadlineWarningDays(days);
    syncCompanyMetadata('deadline_warning_days', days);
  };

  const saveDeadlineUrgentDays = (days: number) => {
    setDeadlineUrgentDays(days);
    syncCompanyMetadata('deadline_urgent_days', days);
  };

  const saveIdleTimeoutMinutes = (mins: number) => {
    setIdleTimeoutMinutes(mins);
    syncCompanyMetadata('idle_timeout_minutes', mins);
  };

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
    deadlineWarningDays, setDeadlineWarningDays: saveDeadlineWarningDays,
    deadlineUrgentDays, setDeadlineUrgentDays: saveDeadlineUrgentDays,
    idleTimeoutMinutes, setIdleTimeoutMinutes: saveIdleTimeoutMinutes,
    onSyncCloud,
    loadingSettings
  };
};
