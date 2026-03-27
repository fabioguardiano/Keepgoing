import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ActivityLog, User } from '../types';

export const useActivities = (user: User | null) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  const fetchActivities = async () => {
    if (!user?.company_id) return;
    setLoadingActivities(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      if (data) {
        const mapped = data.map(l => ({
          id: l.id,
          timestamp: l.created_at,
          userName: l.user_name,
          action: l.type as ActivityLog['action'],
          details: l.message,
          orderId: l.reference_id,
          module: l.module ?? undefined,
          entityType: l.entity_type ?? undefined,
        }));
        setActivities(mapped);
      }
    } catch (err) {
      console.error('Erro ao carregar logs do Supabase:', err);
      const saved = localStorage.getItem('marmo_activities');
      if (saved) setActivities(JSON.parse(saved));
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [user?.company_id]);

  const logActivity = async (
    action: ActivityLog['action'],
    details: string,
    referenceId?: string,
    orderNumber?: string,
    module?: string,
    entityType?: string,
  ) => {
    if (!user) return;

    const message = orderNumber ? `${details} (OS: ${orderNumber})` : details;

    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          company_id: user.company_id || '00000000-0000-0000-0000-000000000000',
          type: action,
          message: message,
          reference_id: referenceId,
          user_name: user.name,
          module: module ?? null,
          entity_type: entityType ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      const newLog: ActivityLog = {
        id: data.id,
        timestamp: data.created_at,
        userName: data.user_name,
        action: data.type as ActivityLog['action'],
        details: data.message,
        orderId: data.reference_id,
        module: data.module ?? undefined,
        entityType: data.entity_type ?? undefined,
      };

      setActivities(prev => [newLog, ...prev].slice(0, 500));
      localStorage.setItem('marmo_activities', JSON.stringify([newLog, ...activities].slice(0, 500)));
    } catch (err) {
      console.error('Erro ao registrar atividade:', err);
    }
  };

  return {
    activities,
    loadingActivities,
    logActivity,
    setActivities,
    refreshActivities: fetchActivities
  };
};
