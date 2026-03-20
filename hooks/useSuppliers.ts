import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Supplier } from '../types';

export const useSuppliers = (companyId?: string, logActivity?: any) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  const fetchSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      let query = supabase.from('suppliers').select('*');
      
      if (companyId) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      } else {
        query = query.is('company_id', null);
      }

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
        localStorage.setItem(`marmo_suppliers_${companyId || 'legacy'}`, JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('Erro ao carregar fornecedores do Supabase:', err);
      const saved = localStorage.getItem(`marmo_suppliers_${companyId || 'legacy'}`);
      if (saved) setSuppliers(JSON.parse(saved));
    } finally {
      setLoadingSuppliers(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [companyId]);

  const handleSaveSupplier = async (s: Supplier) => {
    const finalCompanyId = companyId || '123';
    try {
      const payload = {
        id: (s.id && s.id.length > 20) ? s.id : undefined,
        company_id: finalCompanyId,
        type: s.type,
        document: s.document,
        legal_name: s.legalName,
        trading_name: s.tradingName,
        contact_name: s.contactName,
        email: s.email,
        phone: s.phone,
        website: s.website,
        address: s.address,
        rg_insc: s.rgInsc,
        cellphone: s.cellphone,
        observations: s.observations,
        supplier_code: s.code
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
        localStorage.setItem(`marmo_suppliers_${finalCompanyId}`, JSON.stringify(next));
        return next;
      });

      return saved;
    } catch (err: any) {
      console.error('Erro ao salvar fornecedor:', err);
      alert(`Erro ao salvar no banco de dados: ${err.message || 'Verifique sua conexão e permissões RLS.'}`);
      throw err;
    }
  };

  const deleteSupplier = async (id: string) => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar fornecedor:', error);
      alert('Erro ao deletar fornecedor no banco de dados.');
      throw error;
    }
    setSuppliers(prev => prev.filter(x => x.id !== id));
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
