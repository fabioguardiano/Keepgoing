import { useState, useEffect } from 'react';
import { OrderService, ProductionPhase } from '../types';
import { supabase } from '../lib/supabase';
import { up } from '../lib/uppercase';

const fromRow = (o: any): OrderService => ({
  ...o,
  osNumber: o.os_number,
  orderNumber: o.order_number,
  clientName: o.client_name,
  projectDescription: o.project_description,
  materialArea: o.material_area,
  clientId: o.client_id,
  architectId: o.architect_id,
  architectName: o.architect_name,
  totalValue: o.total_value,
  remainingValue: o.remaining_value,
  imageUrls: o.image_urls,
  phaseHistory: o.phase_history,
  responsibleStaffName: o.responsible_staff_name,
  salesChannel: o.sales_channel,
  salesPhase: o.sales_phase,
  isOsGenerated: o.is_os_generated,
  discountValue: o.discount_value,
  discountPercentage: o.discount_percentage,
  paymentConditions: o.payment_conditions,
  deliveryDeadline: o.delivery_deadline,
  lostReason: o.lost_reason,
  lostDetails: o.lost_details,
  crmNotes: o.crm_notes,
  createdAt: o.created_at,
});

const toPayload = (o: OrderService, companyId: string) => ({
  id: o.id?.length > 20 ? o.id : undefined,
  company_id: companyId,
  os_number: o.osNumber,
  order_number: o.orderNumber,
  client_name: up(o.clientName),
  project_description: up(o.projectDescription),
  material: up(o.material),
  material_area: o.materialArea,
  phase: o.phase,
  seller: o.seller,
  deadline: o.deadline,
  priority: o.priority,
  client_id: o.clientId,
  architect_id: o.architectId,
  architect_name: up(o.architectName),
  total_value: o.totalValue,
  remaining_value: o.remainingValue,
  observations: up(o.observations),
  internal_observations: up(o.internalObservations),
  image_urls: o.imageUrls,
  items: o.items,
  payments: o.payments,
  logs: o.logs,
  phase_history: o.phaseHistory,
  responsible_staff_name: o.responsibleStaffName,
  sales_channel: o.salesChannel,
  sales_phase: o.salesPhase,
  is_os_generated: o.isOsGenerated,
  status: o.status,
  discount_value: o.discountValue,
  discount_percentage: o.discountPercentage,
  payment_conditions: o.paymentConditions,
  delivery_deadline: o.deliveryDeadline,
  totals: o.totals,
  lost_reason: up(o.lostReason),
  lost_details: up(o.lostDetails),
  crm_notes: o.crmNotes,
});

export const useOrderService = (
  companyId: string | undefined,
  logActivity: (action: string, details: string, id?: string, num?: any) => void,
) => {
  const [orders, setOrders] = useState<OrderService[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;

    const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
        const { data, error } = await supabase
          .from('orders_service')
          .select('*')
          .eq('company_id', companyId)
          .order('os_number', { ascending: false });

        if (error) throw error;
        if (!cancelled && data) setOrders(data.map(fromRow) as OrderService[]);
      } catch (err) {
        console.error('Erro ao carregar ordens de serviço:', err);
      } finally {
        if (!cancelled) setLoadingOrders(false);
      }
    };

    fetchOrders();
    return () => { cancelled = true; };
  }, [companyId]);

  const handleSaveOrder = async (o: OrderService) => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from('orders_service')
        .upsert(toPayload(o, companyId))
        .select()
        .single();

      if (error) throw error;

      const saved = fromRow(data) as OrderService;
      setOrders(prev =>
        prev.find(x => x.id === o.id || x.id === saved.id)
          ? prev.map(x => (x.id === o.id || x.id === saved.id) ? saved : x)
          : [saved, ...prev]
      );
      logActivity(
        orders.find(x => x.id === o.id) ? 'update' : 'create',
        `${orders.find(x => x.id === o.id) ? 'Atualizou' : 'Iniciou'} produção da OS: ${o.osNumber}`,
        saved.id,
        o.osNumber,
      );
    } catch (err) {
      console.error('Erro ao salvar ordem de serviço:', err);
    }
  };

  return { orders, setOrders, loadingOrders, handleSaveOrder };
};
