import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Measurement } from '../types';

/**
 * Hook para gerenciar o ciclo de vida das medições agendadas no Supabase.
 * Segue o padrão definido em api-consistency.md.
 */
export const useMeasurements = (companyId?: string) => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loadingMeasurements, setLoadingMeasurements] = useState(true);

  const fetchMeasurements = async () => {
    if (!companyId) {
      setLoadingMeasurements(false);
      return;
    }
    
    setLoadingMeasurements(true);
    try {
      const { data, error } = await supabase
        .from('measurements')
        .select('*')
        .eq('company_id', companyId)
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      
      if (error) throw error;
      
      if (data) {
        const mapped: Measurement[] = data.map(m => ({
          id: m.id,
          clientName: m.client_name,
          address: m.address,
          date: m.date,
          time: m.time,
          status: m.status,
          description: m.description,
          measurerName: m.measurer_name,
          osId: m.os_id,
          osNumber: m.os_number,
          addressComplement: m.address_complement,
          clientPhone: m.client_phone,
          sellerName: m.seller_name,
          company_id: m.company_id
        }));
        setMeasurements(mapped);
      }
    } catch (err) {
      console.error('[fetchMeasurements Error]:', err);
    } finally {
      setLoadingMeasurements(false);
    }
  };

  useEffect(() => {
    fetchMeasurements();
  }, [companyId]);

  const createMeasurement = async (measurement: Omit<Measurement, 'id' | 'company_id'>) => {
    if (!companyId) throw new Error("Company ID é obrigatório para criar uma medição.");
    
    try {
      const { data, error } = await supabase
        .from('measurements')
        .insert({
          company_id: companyId,
          client_name: measurement.clientName,
          address: measurement.address,
          date: measurement.date,
          time: measurement.time,
          status: measurement.status || 'Pendente',
          description: measurement.description,
          measurer_name: measurement.measurerName,
          os_id: measurement.osId,
          os_number: measurement.osNumber,
          address_complement: measurement.addressComplement,
          client_phone: measurement.clientPhone,
          seller_name: measurement.sellerName
        })
        .select()
        .single();
      
      if (error) throw error;

      const newM: Measurement = {
        id: data.id,
        clientName: data.client_name,
        address: data.address,
        date: data.date,
        time: data.time,
        status: data.status,
        description: data.description,
        measurerName: data.measurer_name,
        osId: data.os_id,
        osNumber: data.os_number,
        addressComplement: data.address_complement,
        clientPhone: data.client_phone,
        sellerName: data.seller_name,
        company_id: data.company_id
      };

      setMeasurements(prev => [newM, ...prev]);
      return newM;
    } catch (err: any) {
      console.error('[createMeasurement Error]:', err);
      throw err;
    }
  };

  const updateMeasurement = async (id: string, updates: Partial<Measurement>) => {
    try {
      const payload: any = {};
      if (updates.clientName !== undefined) payload.client_name = updates.clientName;
      if (updates.address !== undefined) payload.address = updates.address;
      if (updates.date !== undefined) payload.date = updates.date;
      if (updates.time !== undefined) payload.time = updates.time;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.measurerName !== undefined) payload.measurer_name = updates.measurerName;
      if (updates.osId !== undefined) payload.os_id = updates.osId;
      if (updates.osNumber !== undefined) payload.os_number = updates.osNumber;
      if (updates.addressComplement !== undefined) payload.address_complement = updates.addressComplement;
      if (updates.clientPhone !== undefined) payload.client_phone = updates.clientPhone;
      if (updates.sellerName !== undefined) payload.seller_name = updates.sellerName;

      const { error } = await supabase
        .from('measurements')
        .update(payload)
        .eq('id', id);

      if (error) throw error;

      setMeasurements(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    } catch (err) {
      console.error('[updateMeasurement Error]:', err);
      throw err;
    }
  };

  const deleteMeasurement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('measurements')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setMeasurements(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('[deleteMeasurement Error]:', err);
      throw err;
    }
  };

  return { 
    measurements, 
    loadingMeasurements, 
    fetchMeasurements, 
    createMeasurement, 
    updateMeasurement, 
    deleteMeasurement 
  };
};
