import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Delivery } from '../types';

export const useDeliveries = (logActivity?: (action: any, details: string, referenceId?: string, orderNumber?: string) => Promise<void>) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);

  const fetchDeliveries = async () => {
    setLoadingDeliveries(true);
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .order('date');
      
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
        localStorage.setItem('marmo_deliveries', JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('Erro ao carregar entregas do Supabase:', err);
      const saved = localStorage.getItem('marmo_deliveries');
      if (saved) setDeliveries(JSON.parse(saved));
    } finally {
      setLoadingDeliveries(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const addDelivery = async (delivery: Omit<Delivery, 'id'>) => {
    try {
      const payload = {
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

      setDeliveries(prev => [newDelivery, ...prev]);
      
      if (logActivity) {
        await logActivity(
          'update', 
          `Agendou entrega para a O.S. ${newDelivery.osNumber} em ${newDelivery.address}`, 
          newDelivery.orderId, 
          newDelivery.osNumber
        );
      }
      
      return newDelivery;
    } catch (err) {
      console.error('Erro ao adicionar entrega:', err);
      throw err;
    }
  };

  const updateDeliveryStatus = async (id: string, status: Delivery['status']) => {
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      setDeliveries(prev => prev.map(d => d.id === id ? { ...d, status } : d));

      if (logActivity) {
        const delivery = deliveries.find(d => d.id === id);
        if (delivery) {
          await logActivity('update', `Atualizou status da entrega da O.S. ${delivery.osNumber} para ${status}`, delivery.orderId, delivery.osNumber);
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar status da entrega:', err);
      throw err;
    }
  };

  const deleteDelivery = async (id: string) => {
    const delivery = deliveries.find(d => d.id === id);
    if (!delivery) return;

    try {
      const { error } = await supabase
        .from('deliveries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setDeliveries(prev => prev.filter(d => d.id !== id));
      
      if (logActivity) {
        await logActivity(
          'delete', 
          `Removeu agendamento de entrega da O.S. ${delivery.osNumber}`, 
          delivery.orderId, 
          delivery.osNumber
        );
      }
    } catch (err) {
      console.error('Erro ao deletar entrega:', err);
      throw err;
    }
  };

  const updateDelivery = async (id: string, updates: Partial<Delivery>) => {
    try {
      const payload: any = { ...updates };
      if (updates.orderId) payload.order_id = updates.orderId;
      if (updates.osNumber) payload.os_number = updates.osNumber;
      if (updates.clientName) payload.client_name = updates.clientName;

      // Simplificando o mapeamento de volta
      delete payload.orderId;
      delete payload.osNumber;
      delete payload.clientName;

      const { error } = await supabase
        .from('deliveries')
        .update(payload)
        .eq('id', id);
      
      if (error) throw error;
      setDeliveries(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));

      if (logActivity) {
        const delivery = deliveries.find(d => d.id === id);
        if (delivery) {
          await logActivity('update', `Atualizou agendamento da O.S. ${delivery.osNumber}`, delivery.orderId, delivery.osNumber);
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar entrega:', err);
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
