import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SalesOrder } from '../types';

export const useSales = (logActivity?: (action: any, details: string, referenceId?: string, orderNumber?: string) => Promise<void>) => {
  const [sales, setSales] = useState<SalesOrder[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);

  const fetchSales = async () => {
    setLoadingSales(true);
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('order_number', { ascending: false });
      
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
        localStorage.setItem('keepgoing_sales', JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('Erro ao carregar vendas do Supabase:', err);
      const saved = localStorage.getItem('keepgoing_sales');
      if (saved) setSales(JSON.parse(saved));
    } finally {
      setLoadingSales(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleSaveSale = async (s: SalesOrder) => {
    try {
      const payload = {
        id: s.id.length > 20 ? s.id : undefined,
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
        const exists = prev.find(x => x.id === s.id || x.id === savedSale.id);
        if (exists) return prev.map(x => (x.id === s.id || x.id === savedSale.id) ? savedSale : x);
        return [savedSale, ...prev];
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
    } catch (err) {
      console.error('Erro ao salvar venda:', err);
      alert('Erro ao salvar venda no banco de dados.');
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
