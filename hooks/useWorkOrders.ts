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
  fromPhase: r.from_phase,
  toPhase: r.to_phase,
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
  productionPhase: r.production_phase,
  drawingUrl: r.drawing_url,
  drawingUrls: r.drawing_urls || [],
  deliveryDeadline: r.delivery_deadline,
  priority: r.priority || 'media',
  assignedUsers: r.assigned_users || [],
  sellerName: r.seller_name || undefined,
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
      sellerName?: string;
      environments: string[];
      notes?: string;
      deliveryDeadline?: string;
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
            seller_name: order.sellerName || null,
            environments: order.environments,
            status: 'Aguardando',
            notes: order.notes || '',
            delivery_deadline: order.deliveryDeadline || null,
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

  const updateWorkOrderPhase = async (id: string, toPhase: string, fromPhase: string, userName: string) => {
    if (!companyId) return;
    // optimistic update
    setWorkOrders(prev => prev.map(wo => wo.id === id ? { ...wo, productionPhase: toPhase } : wo));

    const wo = workOrders.find(w => w.id === id);
    await supabase.from('work_orders')
      .update({ production_phase: toPhase, updated_at: new Date().toISOString() })
      .eq('id', id).eq('company_id', companyId);

    await supabase.from('work_order_logs').insert({
      company_id: companyId,
      work_order_id: id,
      sale_id: wo?.saleId,
      environment: wo?.environments.join(', ') || '',
      action: 'phase_changed',
      from_phase: fromPhase,
      to_phase: toPhase,
      user_name: userName,
    });

    await fetchWorkOrders();
  };

  const updateWorkOrder = async (id: string, updates: Partial<Pick<WorkOrder, 'priority' | 'assignedUsers' | 'notes' | 'drawingUrl' | 'drawingUrls'>>) => {
    if (!companyId) return;
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.assignedUsers !== undefined) payload.assigned_users = updates.assignedUsers;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.drawingUrl !== undefined) payload.drawing_url = updates.drawingUrl;
    if (updates.drawingUrls !== undefined) payload.drawing_urls = updates.drawingUrls;

    await supabase.from('work_orders').update(payload).eq('id', id).eq('company_id', companyId);
    setWorkOrders(prev => prev.map(wo => wo.id === id ? { ...wo, ...updates } : wo));
  };

  const uploadDrawing = async (workOrderId: string, file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `${companyId}/${workOrderId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('work-order-drawings')
      .upload(path, file, { upsert: false });
    if (error) { console.error('Upload error:', error); return null; }
    const { data } = supabase.storage.from('work-order-drawings').getPublicUrl(path);
    return data.publicUrl;
  };

  const addDrawing = async (workOrderId: string, file: File) => {
    const url = await uploadDrawing(workOrderId, file);
    if (!url) return;
    const wo = workOrders.find(w => w.id === workOrderId);
    const current = wo?.drawingUrls || [];
    const updated = [...current, url];
    await updateWorkOrder(workOrderId, { drawingUrls: updated });
  };

  const deleteDrawing = async (workOrderId: string, url: string) => {
    const wo = workOrders.find(w => w.id === workOrderId);
    const updated = (wo?.drawingUrls || []).filter(u => u !== url);
    await updateWorkOrder(workOrderId, { drawingUrls: updated });
    // best-effort delete from storage
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/work-order-drawings/');
      if (pathParts[1]) {
        await supabase.storage.from('work-order-drawings').remove([decodeURIComponent(pathParts[1])]);
      }
    } catch { /* ignore storage delete errors */ }
  };

  return { workOrders, loadingWO, createWorkOrders, updateWorkOrderStatus, updateWorkOrderPhase, updateWorkOrder, uploadDrawing, addDrawing, deleteDrawing, getEnvironmentOSMap, refreshWorkOrders: fetchWorkOrders };
};
