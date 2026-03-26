import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SalesOrder } from '../types';

export const useSales = (companyId?: string, logActivity?: (action: any, details: string, referenceId?: string, orderNumber?: string) => Promise<void>) => {
  const [sales, setSales] = useState<SalesOrder[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);

  const fetchSales = async () => {
    if (!companyId) { setLoadingSales(false); return; }
    setLoadingSales(true);
    try {
      let query = supabase.from('sales').select('*');
      query = query.eq('company_id', companyId);

      const { data, error } = await query.order('order_number', { ascending: false });
      
      if (error) throw error;
      if (data) {
        const mapped = data.map(s => ({
          ...s,
          orderNumber: s.order_number,
          osNumber: s.os_number,
          clientId: s.client_id,
          clientName: s.client_name,
          totalValue: s.total,
          createdAt: s.created_at,
          deliveryDeadline: s.delivery_days != null ? String(s.delivery_days) : (s.delivery_deadline || s.delivery_date || ''),
          seller: s.seller_name,
          isOsGenerated: s.is_os_generated,
          observations: s.notes,
          salesPhase: s.sales_phase,
          salesChannel: s.sales_channel,
          architectId: s.architect_id,
          architectName: s.architect_name,
          paymentConditions: s.payment_conditions,
          paymentMethodId: s.payment_method_id || undefined,
          paymentMethodName: s.payment_method_name || undefined,
          paymentInstallments: s.payment_installments || undefined,
          firstDueDate: s.first_due_date || undefined,
          downPaymentValue: Number(s.down_payment_value || 0) || undefined,
          downPaymentMethodId: s.down_payment_method_id || undefined,
          downPaymentMethodName: s.down_payment_method_name || undefined,
          downPaymentDueDate: s.down_payment_due_date || undefined,
          discountValue: Number(s.discount_value || s.discount || 0),
          discountPercentage: Number(s.discount_percentage || 0),
          totals: {
            vendas: Number(s.subtotal),
            desconto: Number(s.discount_value || s.discount || 0),
            geral: Number(s.total)
          },
          crmNotes: s.crm_notes || []
        }));
        setSales(mapped as SalesOrder[]);
        localStorage.setItem(`marmo_sales_${companyId || 'legacy'}`, JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('Erro ao carregar vendas do Supabase:', err);
      const saved = localStorage.getItem(`marmo_sales_${companyId || 'legacy'}`);
      if (saved) setSales(JSON.parse(saved));
    } finally {
      setLoadingSales(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [companyId]);

  const handleSaveSale = async (s: SalesOrder) => {
    const finalCompanyId = companyId || '00000000-0000-0000-0000-000000000000';
    try {
      const payload = {
        id: (s.id && s.id.length > 20) ? s.id : undefined,
        company_id: finalCompanyId,
        order_number: s.orderNumber,
        os_number: s.osNumber,
        client_id: s.clientId || null,
        client_name: s.clientName,
        status: s.status,
        items: s.items,
        subtotal: s.totals?.vendas || 0,
        discount: s.totals?.desconto || 0,
        discount_value: s.totals?.desconto || s.discountValue || 0,
        discount_percentage: s.discountPercentage || 0,
        total: s.totals?.geral || s.totalValue || 0,
        delivery_days: parseInt(s.deliveryDeadline as string) > 0 ? parseInt(s.deliveryDeadline as string) : null,
        seller_name: s.seller,
        notes: s.observations,
        is_os_generated: s.isOsGenerated,
        sales_phase: s.salesPhase || null,
        sales_channel: s.salesChannel || null,
        architect_id: s.architectId || null,
        architect_name: s.architectName || null,
        payment_conditions: s.paymentConditions || null,
        payment_method_id: s.paymentMethodId || null,
        payment_method_name: s.paymentMethodName || null,
        payment_installments: s.paymentInstallments || null,
        first_due_date: s.firstDueDate || null,
        down_payment_value: s.downPaymentValue || null,
        down_payment_method_id: s.downPaymentMethodId || null,
        down_payment_method_name: s.downPaymentMethodName || null,
        down_payment_due_date: s.downPaymentDueDate || null,
        crm_notes: s.crmNotes || null
      };

      const { data, error } = await supabase
        .from('sales')
        .upsert(payload)
        .select()
        .single();
      
      if (error) throw error;
      
      const savedRow = data as any;
      const savedSale = {
        ...savedRow,
        orderNumber: savedRow.order_number,
        osNumber: savedRow.os_number,
        clientId: savedRow.client_id,
        clientName: savedRow.client_name,
        totalValue: savedRow.total,
        deliveryDeadline: savedRow.delivery_days != null ? String(savedRow.delivery_days) : (savedRow.delivery_deadline || savedRow.delivery_date || ''),
        seller: savedRow.seller_name,
        observations: savedRow.notes,
        isOsGenerated: savedRow.is_os_generated,
        createdAt: savedRow.created_at,
        salesPhase: savedRow.sales_phase,
        salesChannel: savedRow.sales_channel,
        architectId: savedRow.architect_id,
        architectName: savedRow.architect_name,
        paymentConditions: savedRow.payment_conditions,
        paymentMethodId: savedRow.payment_method_id,
        paymentMethodName: savedRow.payment_method_name,
        paymentInstallments: savedRow.payment_installments,
        firstDueDate: savedRow.first_due_date,
        downPaymentValue: Number(savedRow.down_payment_value || 0) || undefined,
        downPaymentMethodId: savedRow.down_payment_method_id || undefined,
        downPaymentMethodName: savedRow.down_payment_method_name || undefined,
        downPaymentDueDate: savedRow.down_payment_due_date || undefined,
        discountValue: Number(savedRow.discount_value || savedRow.discount || 0),
        discountPercentage: Number(savedRow.discount_percentage || 0),
        totals: {
          vendas: Number(savedRow.subtotal),
          desconto: Number(savedRow.discount_value || savedRow.discount || 0),
          geral: Number(savedRow.total)
        },
        crmNotes: savedRow.crm_notes || []
      } as SalesOrder;

      const isUpdate = sales.some(x => x.id === s.id || x.id === savedSale.id);
      
      setSales(prev => {
        const next = prev.find(x => x.id === s.id || x.id === savedSale.id)
          ? prev.map(x => (x.id === s.id || x.id === savedSale.id) ? savedSale : x)
          : [savedSale, ...prev];
        localStorage.setItem(`marmo_sales_${finalCompanyId}`, JSON.stringify(next));
        return next;
      });

      if (logActivity) {
        await logActivity(
          isUpdate ? 'update' : 'create', 
          `Atualizou/Registrou um ${s.status} para o cliente ${s.clientName}`, 
          savedSale.id, 
          s.orderNumber
        );
      }

      return savedSale;
    } catch (err: any) {
      console.error('Erro ao salvar venda:', err);
      alert(`Erro ao salvar no banco de dados: ${err.message || 'Verifique sua conexão e permissões RLS.'}`);
      throw err;
    }
  };

  const deleteSale = async (id: string) => {
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar venda:', error);
      alert('Erro ao deletar venda no banco de dados.');
      throw error;
    }
    setSales(prev => prev.filter(x => x.id !== id));
  };

  return { 
    sales, 
    loadingSales, 
    handleSaveSale, 
    deleteSale,
    setSales, 
    refreshSales: fetchSales 
  };
};
