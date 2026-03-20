import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Delivery } from '../types';

export const useDeliveries = (companyId?: string, logActivity?: (action: any, details: string, referenceId?: string, orderNumber?: string) => Promise<void>) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);

  const fetchDeliveries = async () => {
    setLoadingDeliveries(true);
    try {
      let query = supabase.from('deliveries').select('*');
      
      if (companyId) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      } else {
        query = query.is('company_id', null);
      }

      const { data, error } = await query.order('date');
      
      if (error) throw error;
      if (data) {
        const mapped = data.map(d => ({
          id: d.id,
          orderId: d.order_id,
          osNumber: d.os_number,
          clientName: d.client_name,
          address: d.address,
          date: d.date,
          time: d.time,
          status: d.status as any
        }));
        setDeliveries(mapped as Delivery[]);
        localStorage.setItem(`marmo_deliveries_${companyId || 'legacy'}`, JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('Erro ao carregar entregas do Supabase:', err);
      const saved = localStorage.getItem(`marmo_deliveries_${companyId || 'legacy'}`);
      if (saved) setDeliveries(JSON.parse(saved));
    } finally {
      setLoadingDeliveries(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [companyId]);

  const addDelivery = async (delivery: Omit<Delivery, 'id'>) => {
    const finalCompanyId = companyId || '123';
    try {
      const payload = {
        company_id: finalCompanyId,
        order_id: delivery.orderId,
        os_number: delivery.osNumber,
        client_name: delivery.clientName,
        address: delivery.address,
        date: delivery.date,
        time: delivery.time,
        status: delivery.status
      };

      const { data, error } = await supabase
        .from('deliveries')
        .insert(payload)
        .select()
        .single();
      
      if (error) throw error;

      const newDelivery = {
        ...data,
        orderId: data.order_id,
        osNumber: data.os_number,
        clientName: data.client_name,
        status: data.status as any
      } as Delivery;

      setDeliveries(prev => {
        const next = [newDelivery, ...prev];
        localStorage.setItem(`marmo_deliveries_${finalCompanyId}`, JSON.stringify(next));
        return next;
      });
      
      if (logActivity) {
        await logActivity(
          'update', 
          `Agendou entrega para a O.S. ${newDelivery.osNumber} em ${newDelivery.address}`, 
          newDelivery.orderId, 
          newDelivery.osNumber
        );
      }
      
      return newDelivery;
    } catch (err: any) {
      console.error('Erro ao adicionar entrega:', err);
      alert(`Erro ao adicionar entrega: ${err.message}`);
      throw err;
    }
  };

  const updateDeliveryStatus = async (id: string, status: Delivery['status']) => {
    const finalCompanyId = companyId || '123';
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({ status })
        .eq('id', id)
        .eq('company_id', finalCompanyId);
      
      if (error) throw error;
      setDeliveries(prev => {
        const next = prev.map(d => d.id === id ? { ...d, status } : d);
        localStorage.setItem(`marmo_deliveries_${finalCompanyId}`, JSON.stringify(next));
        return next;
      });

      if (logActivity) {
        const delivery = deliveries.find(d => d.id === id);
        if (delivery) {
          await logActivity('update', `Atualizou status da entrega da O.S. ${delivery.osNumber} para ${status}`, delivery.orderId, delivery.osNumber);
        }
      }
    } catch (err: any) {
      console.error('Erro ao atualizar status da entrega:', err);
      alert(`Erro ao atualizar status: ${err.message}`);
      throw err;
    }
  };

  const deleteDelivery = async (id: string) => {
    const finalCompanyId = companyId || '123';
    const delivery = deliveries.find(d => d.id === id);
    if (!delivery) return;

    try {
      const { error } = await supabase
        .from('deliveries')
        .delete()
        .eq('id', id)
        .eq('company_id', finalCompanyId);
      
      if (error) throw error;
      setDeliveries(prev => {
        const next = prev.filter(d => d.id !== id);
        localStorage.setItem(`marmo_deliveries_${finalCompanyId}`, JSON.stringify(next));
        return next;
      });
      
      if (logActivity) {
        await logActivity(
          'delete', 
          `Removeu agendamento de entrega da O.S. ${delivery.osNumber}`, 
          delivery.orderId, 
          delivery.osNumber
        );
      }
    } catch (err: any) {
      console.error('Erro ao deletar entrega:', err);
      alert(`Erro ao deletar entrega: ${err.message}`);
      throw err;
    }
  };

  const updateDelivery = async (id: string, updates: Partial<Delivery>) => {
    const finalCompanyId = companyId || '123';
    try {
      const payload: any = { ...updates };
      if (updates.orderId) payload.order_id = updates.orderId;
      if (updates.osNumber) payload.os_number = updates.osNumber;
      if (updates.clientName) payload.client_name = updates.clientName;

      delete payload.orderId;
      delete payload.osNumber;
      delete payload.clientName;

      const { error } = await supabase
        .from('deliveries')
        .update(payload)
        .eq('id', id)
        .eq('company_id', finalCompanyId);
      
      if (error) throw error;
      setDeliveries(prev => {
        const next = prev.map(d => d.id === id ? { ...d, ...updates } : d);
        localStorage.setItem(`marmo_deliveries_${finalCompanyId}`, JSON.stringify(next));
        return next;
      });

      if (logActivity) {
        const delivery = deliveries.find(d => d.id === id);
        if (delivery) {
          await logActivity('update', `Atualizou agendamento da O.S. ${delivery.osNumber}`, delivery.orderId, delivery.osNumber);
        }
      }
    } catch (err: any) {
      console.error('Erro ao atualizar entrega:', err);
      alert(`Erro ao atualizar entrega: ${err.message}`);
      throw err;
    }
  };

  return {
    deliveries,
    loadingDeliveries,
    addDelivery,
    updateDeliveryStatus,
    updateDelivery,
    deleteDelivery,
    setDeliveries,
    refreshDeliveries: fetchDeliveries
  };
};
