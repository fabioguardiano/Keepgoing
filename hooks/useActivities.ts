import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ActivityLog, User } from '../types';

export const useActivities = (user: User | null) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  const fetchActivities = async () => {
    setLoadingActivities(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      if (data) {
        const mapped = data.map(l => ({
          id: l.id,
          timestamp: l.created_at,
          userName: l.user_name,
          action: l.type as any,
          details: l.message,
          orderId: l.reference_id
        }));
        setActivities(mapped as ActivityLog[]);
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
  }, []);

  const logActivity = async (action: ActivityLog['action'], details: string, referenceId?: string, orderNumber?: string) => {
    if (!user) return;
    
    const message = orderNumber ? `${details} (OS: ${orderNumber})` : details;

    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          type: action,
          message: message,
          reference_id: referenceId,
          user_name: user.name
        })
        .select()
        .single();
      
      if (error) throw error;

      const newLog: ActivityLog = {
        id: data.id,
        timestamp: data.created_at,
        userName: data.user_name,
        action: data.type as any,
        details: data.message,
        orderId: data.reference_id
      };
      
      setActivities(prev => [newLog, ...prev].slice(0, 100));
      localStorage.setItem('marmo_activities', JSON.stringify([newLog, ...activities].slice(0, 100)));
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
