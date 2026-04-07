import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { WorkOrder, WorkOrderLog } from '../types';
import { up } from '../lib/uppercase';

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
  osSubNumber: r.os_sub_number ?? 1,
  saleId: r.sale_id,
  saleOrderNumber: r.sale_order_number,
  clientName: r.client_name,
  clientId: r.client_id,
  environments: r.environments || [],
  saleItemIds: r.sale_item_ids || [],
  deliveryDate: r.delivery_date || undefined,
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
  resaleProducts: r.resale_products || [],
});

const addBusinessDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
};

const toISODate = (d: Date): string => d.toISOString().split('T')[0];

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

  useEffect(() => {
    fetchWorkOrders();
    if (!companyId) return;

    const channel = supabase
      .channel('work_orders_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'work_orders',
        filter: `company_id=eq.${companyId}`
      }, () => {
        fetchWorkOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  // Retorna o próximo os_sub_number para um dado os_number (número do pedido)
  const getNextSubNumber = async (osNumber: number): Promise<number> => {
    const { data } = await supabase
      .from('work_orders')
      .select('os_sub_number')
      .eq('company_id', companyId!)
      .eq('os_number', osNumber)
      .order('os_sub_number', { ascending: false })
      .limit(1);
    return data && data.length > 0 ? (data[0].os_sub_number ?? 0) + 1 : 1;
  };

  const createWorkOrders = async (
    orders: Array<{
      saleId: string;
      saleOrderNumber?: number;
      clientName?: string;
      clientId?: string;
      sellerName?: string;
      environments: string[];
      saleItemIds?: string[];
      notes?: string;
      deliveryDeadline?: string;
      materialsM2: any[];
      finishingsLinear: any[];
      totalM2: number;
      totalLinear: number;
      resaleProducts?: any[];
      logs: Array<{ environment: string; action: 'created' | 'reissued'; reason?: string; userName?: string }>;
    }>
  ): Promise<boolean> => {
    if (!companyId) return false;
    try {
      // os_number = número do pedido; os_sub_number = sequencial dentro do pedido
      const osNumber = orders[0]?.saleOrderNumber ?? 0;
      let nextSub = await getNextSubNumber(osNumber);

      for (const order of orders) {
        const { data: wo, error } = await supabase
          .from('work_orders')
          .insert({
            company_id: companyId,
            os_number: order.saleOrderNumber ?? 0,
            os_sub_number: nextSub++,
            sale_id: order.saleId,
            sale_order_number: order.saleOrderNumber,
            client_name: up(order.clientName) || '',
            client_id: order.clientId || null,
            seller_name: up(order.sellerName) || null,
            environments: order.environments,
            sale_item_ids: order.saleItemIds || [],
            status: 'Aguardando',
            notes: up(order.notes) || '',
            delivery_deadline: order.deliveryDeadline || null,
            delivery_date: order.deliveryDeadline && parseInt(order.deliveryDeadline) > 0
              ? toISODate(addBusinessDays(new Date(), parseInt(order.deliveryDeadline)))
              : null,
            materials_m2: order.materialsM2,
            finishings_linear: order.finishingsLinear,
            total_m2: order.totalM2,
            total_linear: order.totalLinear,
            resale_products: order.resaleProducts || [],
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

  const cancelWorkOrder = async (id: string, reason: string, authorizedBy: string) => {
    if (!companyId) return;
    const wo = workOrders.find(w => w.id === id);
    await supabase.from('work_orders')
      .update({ status: 'Cancelada', updated_at: new Date().toISOString() })
      .eq('id', id).eq('company_id', companyId);

    await supabase.from('work_order_logs').insert({
      company_id: companyId,
      work_order_id: id,
      sale_id: wo?.saleId,
      environment: wo?.environments.join(', ') || '',
      action: 'cancelled',
      reason,
      user_name: authorizedBy,
    });

    setWorkOrders(prev => prev.map(w => w.id === id ? { ...w, status: 'Cancelada' as const } : w));
  };

  const getEnvironmentOSMap = (saleId: string): Record<string, WorkOrder[]> => {
    const result: Record<string, WorkOrder[]> = {};
    // Exclui canceladas — ambientes de O.S. canceladas ficam livres para nova geração
    workOrders.filter(wo => wo.saleId === saleId && wo.status !== 'Cancelada').forEach(wo => {
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

  const updateDeliveryDate = async (id: string, newDate: string, justification: string, authorizedBy: string) => {
    if (!companyId) return;
    const wo = workOrders.find(w => w.id === id);
    await supabase.from('work_orders')
      .update({ delivery_date: newDate, updated_at: new Date().toISOString() })
      .eq('id', id).eq('company_id', companyId);

    await supabase.from('work_order_logs').insert({
      company_id: companyId,
      work_order_id: id,
      sale_id: wo?.saleId,
      environment: wo?.environments.join(', ') || '',
      action: 'deadline_changed',
      reason: justification,
      user_name: authorizedBy,
    });

    setWorkOrders(prev => prev.map(w => w.id === id ? { ...w, deliveryDate: newDate } : w));
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

  const ALLOWED_DRAWING_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  const MAX_DRAWING_SIZE_MB = 10;

  const uploadDrawing = async (workOrderId: string, file: File): Promise<string | null> => {
    if (!ALLOWED_DRAWING_TYPES.includes(file.type)) {
      alert(`Tipo de arquivo não permitido: ${file.type || 'desconhecido'}.\nAceitos: JPG, PNG, WEBP, GIF, PDF.`);
      return null;
    }
    if (file.size > MAX_DRAWING_SIZE_MB * 1024 * 1024) {
      alert(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo: ${MAX_DRAWING_SIZE_MB} MB.`);
      return null;
    }
    const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
    const path = `${companyId}/${workOrderId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('work-order-drawings')
      .upload(path, file, { upsert: false });
    if (error) { console.error('[upload] Drawing upload failed'); return null; }
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

  return { workOrders, loadingWO, createWorkOrders, updateWorkOrderStatus, updateWorkOrderPhase, updateWorkOrder, updateDeliveryDate, cancelWorkOrder, uploadDrawing, addDrawing, deleteDrawing, getEnvironmentOSMap, refreshWorkOrders: fetchWorkOrders };
};

/** Formata o label da O.S. considerando se há múltiplas O.S. no mesmo pedido.
 *  - 1 O.S. no pedido → "OS #1"
 *  - Múltiplas → "OS #1/1", "OS #1/2" */
export const formatOsLabel = (wo: WorkOrder, allWorkOrders: WorkOrder[]): string => {
  const siblings = allWorkOrders.filter(w => w.osNumber === wo.osNumber);
  if (siblings.length > 1) return `OS #${wo.osNumber}/${wo.osSubNumber}`;
  return `OS #${wo.osNumber}`;
};
