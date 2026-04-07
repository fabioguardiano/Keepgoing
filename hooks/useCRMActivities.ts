import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { CRMActivity } from '../types';

const map = (r: any): CRMActivity => ({
  id: r.id,
  companyId: r.company_id,
  referenceId: r.reference_id,
  referenceType: r.reference_type,
  title: r.title,
  dueDate: r.due_date,
  notes: r.notes ?? undefined,
  status: r.status,
  createdBy: r.created_by ?? undefined,
  createdAt: r.created_at,
});

export const useCRMActivities = (companyId?: string) => {
  const [crmActivities, setCrmActivities] = useState<CRMActivity[]>([]);
  const [loadingCRM, setLoadingCRM] = useState(true);

  const fetchCRMActivities = useCallback(async () => {
    if (!companyId) { setLoadingCRM(false); return; }
    setLoadingCRM(true);
    try {
      const { data, error } = await supabase
        .from('crm_activities')
        .select('*')
        .eq('company_id', companyId)
        .order('due_date', { ascending: true });
      if (error) throw error;
      if (data) setCrmActivities(data.map(map));
    } catch (err) {
      console.error('Erro ao carregar atividades CRM:', err);
    } finally {
      setLoadingCRM(false);
    }
  }, [companyId]);

  useEffect(() => { fetchCRMActivities(); }, [fetchCRMActivities]);

  const createCRMActivity = async (
    input: Omit<CRMActivity, 'id' | 'companyId' | 'createdAt'>
  ): Promise<void> => {
    if (!companyId) return;
    const { data, error } = await supabase
      .from('crm_activities')
      .insert({
        company_id: companyId,
        reference_id: input.referenceId,
        reference_type: input.referenceType,
        title: input.title,
        due_date: input.dueDate,
        notes: input.notes || null,
        status: 'pendente',
        created_by: input.createdBy || null,
      })
      .select()
      .single();
    if (!error && data) setCrmActivities(prev => [...prev, map(data)]);
  };

  const completeCRMActivity = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('crm_activities')
      .update({ status: 'concluida' })
      .eq('id', id);
    if (!error)
      setCrmActivities(prev => prev.map(a => a.id === id ? { ...a, status: 'concluida' as const } : a));
  };

  const deleteCRMActivity = async (id: string): Promise<void> => {
    const { error } = await supabase.from('crm_activities').delete().eq('id', id);
    if (!error) setCrmActivities(prev => prev.filter(a => a.id !== id));
  };

  return {
    crmActivities,
    loadingCRM,
    createCRMActivity,
    completeCRMActivity,
    deleteCRMActivity,
    refreshCRMActivities: fetchCRMActivities,
  };
};
