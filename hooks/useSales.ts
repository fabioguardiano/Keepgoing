import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SalesOrder } from '../types';

export const useSales = (companyId?: string, logActivity?: (action: any, details: string, referenceId?: string, orderNumber?: string) => Promise<void>) => {
  const [sales, setSales] = useState<SalesOrder[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);

  const fetchSales = async () => {
    setLoadingSales(true);
    try {
      let query = supabase.from('sales').select('*');
      
      if (companyId) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      } else {
        query = query.is('company_id', null);
      }

      const { data, error } = await query.order('order_number', { ascending: false });
      
      if (error) throw error;
      if (data) {
        const mapped = data.map(s => ({
          ...s,
          orderNumber: s.order_number,
          clientName: s.client_name,
          totalValue: s.total,
          createdAt: s.created_at,
          deliveryDeadline: s.delivery_date,
          seller: s.seller_name,
          isOsGenerated: s.is_os_generated,
          observations: s.notes,
          totals: {
            vendas: Number(s.subtotal),
            desconto: Number(s.discount),
            geral: Number(s.total)
          }
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
    const finalCompanyId = companyId || '123';
    try {
      const payload = {
        id: (s.id && s.id.length > 20) ? s.id : undefined,
        company_id: finalCompanyId,
        order_number: s.orderNumber,
        client_name: s.clientName,
        status: s.status,
        items: s.items,
        subtotal: s.totals?.vendas || 0,
        discount: s.totals?.desconto || 0,
        total: s.totals?.geral || s.totalValue || 0,
        delivery_date: s.deliveryDeadline,
        seller_name: s.seller,
        notes: s.observations,
        is_os_generated: s.isOsGenerated
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
        clientName: savedRow.client_name,
        totalValue: savedRow.total,
        deliveryDeadline: savedRow.delivery_date,
        seller: savedRow.seller_name,
        observations: savedRow.notes,
        isOsGenerated: savedRow.is_os_generated,
        createdAt: savedRow.created_at,
        totals: {
          vendas: Number(savedRow.subtotal),
          desconto: Number(savedRow.discount),
          geral: Number(savedRow.total)
        }
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
