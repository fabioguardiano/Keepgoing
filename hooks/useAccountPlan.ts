import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  AccountGroup, AccountPlanItem,
  DEFAULT_ACCOUNT_GROUPS, DEFAULT_ACCOUNT_PLAN,
} from '../types';

// ─── Mappers ──────────────────────────────────────────────────────────────────

const mapGroup = (r: any): AccountGroup => ({
  id:        r.id,
  companyId: r.company_id,
  code:      r.code,
  name:      r.name,
  isAdmin:   r.is_admin,
  createdAt: r.created_at,
});

const mapPlan = (r: any): AccountPlanItem => ({
  id:                   r.id,
  companyId:            r.company_id,
  code:                 r.code,
  groupId:              r.group_id,
  groupCode:            r.account_groups?.code,
  groupName:            r.account_groups?.name,
  name:                 r.name,
  costType:             r.cost_type,
  defaultPaymentMethod: r.default_payment_method,
  isOperational:        r.is_operational,
  active:               r.active,
  createdAt:            r.created_at,
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAccountPlan = (companyId: string | null) => {
  const [groups, setGroups]   = useState<AccountGroup[]>([]);
  const [plan, setPlan]       = useState<AccountPlanItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [gRes, pRes] = await Promise.all([
      supabase
        .from('account_groups')
        .select('*')
        .eq('company_id', companyId)
        .order('code'),
      supabase
        .from('account_plan')
        .select('*, account_groups(code, name)')
        .eq('company_id', companyId)
        .order('code'),
    ]);
    if (gRes.data) setGroups(gRes.data.map(mapGroup));
    if (pRes.data) setPlan(pRes.data.map(mapPlan));
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Groups CRUD ─────────────────────────────────────────────────────────────

  const saveGroup = async (group: Partial<AccountGroup> & { code: number; name: string }) => {
    if (!companyId) return;
    const payload = {
      company_id: companyId,
      code:       group.code,
      name:       group.name,
      is_admin:   group.isAdmin ?? false,
    };
    if (group.id) {
      await supabase.from('account_groups').update(payload).eq('id', group.id);
      setGroups(prev => prev.map(g => g.id === group.id ? { ...g, ...group } as AccountGroup : g));
    } else {
      const { data } = await supabase.from('account_groups').insert(payload).select().single();
      if (data) setGroups(prev => [...prev, mapGroup(data)].sort((a, b) => a.code - b.code));
    }
  };

  const deleteGroup = async (id: string) => {
    if (!companyId) return;
    await supabase.from('account_groups').delete().eq('id', id);
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  // ── Plan CRUD ───────────────────────────────────────────────────────────────

  const savePlanItem = async (item: Partial<AccountPlanItem> & { code: number; groupId: string; name: string; costType: 'Fixo' | 'Variável' }) => {
    if (!companyId) return;
    const payload = {
      company_id:             companyId,
      code:                   item.code,
      group_id:               item.groupId,
      name:                   item.name,
      cost_type:              item.costType,
      default_payment_method: item.defaultPaymentMethod ?? null,
      is_operational:         item.isOperational ?? true,
      active:                 item.active ?? true,
    };
    if (item.id) {
      await supabase.from('account_plan').update(payload).eq('id', item.id);
      await fetchAll(); // refresh to get joined group info
    } else {
      await supabase.from('account_plan').insert(payload);
      await fetchAll();
    }
  };

  const deletePlanItem = async (id: string) => {
    if (!companyId) return;
    await supabase.from('account_plan').delete().eq('id', id);
    setPlan(prev => prev.filter(p => p.id !== id));
  };

  const togglePlanActive = async (id: string) => {
    const item = plan.find(p => p.id === id);
    if (!item) return;
    await supabase.from('account_plan').update({ active: !item.active }).eq('id', id);
    setPlan(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  // ── Seed padrão ─────────────────────────────────────────────────────────────

  const importDefaults = async () => {
    if (!companyId) return;

    // Inserir grupos (ignora duplicatas via UNIQUE)
    const { data: insertedGroups } = await supabase
      .from('account_groups')
      .upsert(
        DEFAULT_ACCOUNT_GROUPS.map(g => ({ company_id: companyId, code: g.code, name: g.name, is_admin: g.isAdmin })),
        { onConflict: 'company_id,code', ignoreDuplicates: false }
      )
      .select();

    const allGroups = insertedGroups ?? [];
    const groupMap: Record<number, string> = {};
    allGroups.forEach((g: any) => { groupMap[g.code] = g.id; });

    // Se não conseguiu dos inserts, busca novamente
    if (Object.keys(groupMap).length === 0) {
      const { data: existing } = await supabase
        .from('account_groups')
        .select('id, code')
        .eq('company_id', companyId);
      (existing ?? []).forEach((g: any) => { groupMap[g.code] = g.id; });
    }

    // Inserir contas analíticas
    await supabase
      .from('account_plan')
      .upsert(
        DEFAULT_ACCOUNT_PLAN
          .filter(p => groupMap[p.groupCode])
          .map(p => ({
            company_id:             companyId,
            code:                   p.code,
            group_id:               groupMap[p.groupCode],
            name:                   p.name,
            cost_type:              p.costType,
            default_payment_method: p.defaultPaymentMethod ?? null,
            is_operational:         p.isOperational,
            active:                 p.active,
          })),
        { onConflict: 'company_id,code', ignoreDuplicates: false }
      );

    await fetchAll();
  };

  return {
    groups, plan, loading,
    saveGroup, deleteGroup,
    savePlanItem, deletePlanItem, togglePlanActive,
    importDefaults,
    refreshAccountPlan: fetchAll,
  };
};
