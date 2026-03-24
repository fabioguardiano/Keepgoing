import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { WorkOrder, WorkOrderLog } from '../types';

const mapLog = (r: any): WorkOrderLog => ({
  id: r.id,
  companyId: r.company_id,
  workOrderId: r.work_order_id,
  saleId: r.sale_id,
  environment: r.environment,
  action: r.action,
  reason: r.reason,
  userName: r.user_name,
  createdAt: r.created_at,
});

const map = (r: any): WorkOrder => ({
  id: r.id,
  companyId: r.company_id,
  osNumber: r.os_number,
  saleId: r.sale_id,
  saleOrderNumber: r.sale_order_number,
  clientName: r.client_name,
  clientId: r.client_id,
  environments: r.environments || [],
  status: r.status,
  notes: r.notes,
  materialsM2: r.materials_m2 || [],
  finishingsLinear: r.finishings_linear || [],
  totalM2: Number(r.total_m2 || 0),
  totalLinear: Number(r.total_linear || 0),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  logs: (r.work_order_logs || []).map(mapLog),
});

export const useWorkOrders = (companyId?: string) => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loadingWO, setLoadingWO] = useState(true);

  const fetchWorkOrders = async () => {
    if (!companyId) { setLoadingWO(false); return; }
    setLoadingWO(true);
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('*, work_order_logs(*)')
        .eq('company_id', companyId)
        .order('os_number', { ascending: false })
        .limit(500);
      if (error) throw error;
      if (data) setWorkOrders(data.map(map));
    } catch (err) {
      console.error('Erro ao carregar O.S.:', err);
    } finally {
      setLoadingWO(false);
    }
  };

  useEffect(() => { fetchWorkOrders(); }, [companyId]);

  const getNextOsNumber = async (): Promise<number> => {
    const { data } = await supabase
      .from('work_orders')
      .select('os_number')
      .eq('company_id', companyId!)
      .order('os_number', { ascending: false })
      .limit(1);
    return data && data.length > 0 ? data[0].os_number + 1 : 1;
  };

  const createWorkOrders = async (
    orders: Array<{
      saleId: string;
      saleOrderNumber?: number;
      clientName?: string;
      clientId?: string;
      environments: string[];
      notes?: string;
      materialsM2: any[];
      finishingsLinear: any[];
      totalM2: number;
      totalLinear: number;
      logs: Array<{ environment: string; action: 'created' | 'reissued'; reason?: string; userName?: string }>;
    }>
  ): Promise<boolean> => {
    if (!companyId) return false;
    try {
      let nextNum = await getNextOsNumber();
      for (const order of orders) {
        const { data: wo, error } = await supabase
          .from('work_orders')
          .insert({
            company_id: companyId,
            os_number: nextNum++,
            sale_id: order.saleId,
            sale_order_number: order.saleOrderNumber,
            client_name: order.clientName || '',
            client_id: order.clientId || null,
            environments: order.environments,
            status: 'Aguardando',
            notes: order.notes || '',
            materials_m2: order.materialsM2,
            finishings_linear: order.finishingsLinear,
            total_m2: order.totalM2,
            total_linear: order.totalLinear,
          })
          .select()
          .single();
        if (error) throw error;
        const envLogs = order.logs.map(l => ({
          company_id: companyId,
          work_order_id: wo.id,
          sale_id: order.saleId,
          environment: l.environment,
          action: l.action,
          reason: l.reason || null,
          user_name: l.userName || null,
        }));
        if (envLogs.length > 0) {
          await supabase.from('work_order_logs').insert(envLogs);
        }
      }
      await fetchWorkOrders();
      return true;
    } catch (err) {
      console.error('Erro ao criar O.S.:', err);
      return false;
    }
  };

  const updateWorkOrderStatus = async (id: string, status: WorkOrder['status']) => {
    if (!companyId) return;
    await supabase
      .from('work_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId);
    setWorkOrders(prev => prev.map(wo => wo.id === id ? { ...wo, status } : wo));
  };

  const getEnvironmentOSMap = (saleId: string): Record<string, WorkOrder[]> => {
    const result: Record<string, WorkOrder[]> = {};
    workOrders.filter(wo => wo.saleId === saleId).forEach(wo => {
      wo.environments.forEach(env => {
        if (!result[env]) result[env] = [];
        result[env].push(wo);
      });
    });
    return result;
  };

  return { workOrders, loadingWO, createWorkOrders, updateWorkOrderStatus, getEnvironmentOSMap, refreshWorkOrders: fetchWorkOrders };
};
