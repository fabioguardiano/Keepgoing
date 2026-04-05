import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Supplier } from '../types';
import { up } from '../lib/uppercase';

export const useSuppliers = (companyId?: string, logActivity?: any) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  const fetchSuppliers = async () => {
    if (!companyId) { setLoadingSuppliers(false); return; }
    setLoadingSuppliers(true);
    try {
      let query = supabase.from('suppliers').select('*');
      query = query.eq('company_id', companyId);

      const { data, error } = await query.order('trading_name');
      
      if (error) throw error;
      if (data) {
        const mapped = data.map(s => ({
          ...s,
          legalName: s.legal_name,
          tradingName: s.trading_name,
          contactName: s.contact_name,
          rgInsc: s.rg_insc,
          cellphone: s.cellphone,
          observations: s.observations,
          code: s.supplier_code,
          createdAt: s.created_at
        }));
        setSuppliers(mapped as Supplier[]);
      }
    } catch (err) {
      console.error('Erro ao carregar fornecedores do Supabase:', err);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    if (!companyId) return;

    const channel = supabase
      .channel('suppliers_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'suppliers',
        filter: `company_id=eq.${companyId}`
      }, () => {
        fetchSuppliers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  const handleSaveSupplier = async (s: Supplier) => {
    const finalCompanyId = companyId || '00000000-0000-0000-0000-000000000000';
    
    let finalCode = s.code;
    if (!finalCode) {
      const codes = suppliers
        .map(sup => typeof sup.code === 'number' ? sup.code : parseInt(String(sup.code).replace(/\D/g, '')))
        .filter(n => !isNaN(n));
      const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
      finalCode = maxCode + 1;
    }

    try {
      const payload = {
        id: (s.id && s.id.length > 20) ? s.id : undefined,
        company_id: finalCompanyId,
        type: s.type,
        document: s.document,
        legal_name: up(s.legalName),
        trading_name: up(s.tradingName),
        contact_name: up(s.contactName),
        email: s.email,
        phone: s.phone,
        website: s.website,
        address: s.address,
        rg_insc: s.rgInsc,
        cellphone: s.cellphone,
        observations: up(s.observations),
        supplier_code: finalCode
      };

      const { data, error } = await supabase
        .from('suppliers')
        .upsert(payload)
        .select()
        .single();
      
      if (error) throw error;
      
      const saved = { 
        ...data, 
        legalName: data.legal_name, 
        tradingName: data.trading_name, 
        contactName: data.contact_name,
        rgInsc: data.rg_insc,
        cellphone: data.cellphone,
        observations: data.observations,
        code: data.supplier_code,
        createdAt: data.created_at
      } as Supplier;
      
      setSuppliers(prev => {
        const next = prev.find(x => x.id === s.id || x.id === saved.id)
          ? prev.map(x => (x.id === s.id || x.id === saved.id) ? saved : x)
          : [saved, ...prev];
        return next;
      });

      return saved;
    } catch (err: any) {
      console.error('Erro ao salvar fornecedor:', err);
      alert('Erro ao salvar fornecedor. Verifique sua conexão e tente novamente.');
      throw err;
    }
  };

  const deleteSupplier = async (id: string) => {
    try {
      const supplier = suppliers.find(x => x.id === id);
      const newStatus: 'ativo' | 'inativo' = supplier?.status === 'inativo' ? 'ativo' : 'inativo';
      const { error } = await supabase.from('suppliers').update({ status: newStatus }).eq('id', id);
      if (error) throw error;

      setSuppliers(prev => prev.map(x => x.id === id ? { ...x, status: newStatus } : x));
      fetchSuppliers();
    } catch (err: any) {
      console.error('Erro ao inativar fornecedor:', err);
      alert('Erro ao inativar fornecedor. Tente novamente.');
    }
  };

  return { 
    suppliers, 
    loadingSuppliers, 
    handleSaveSupplier, 
    deleteSupplier,
    setSuppliers,
    refreshSuppliers: fetchSuppliers 
  };
};
