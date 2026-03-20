import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Supplier } from '../types';

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  const fetchSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('trading_name');
      
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
        localStorage.setItem('keepgoing_suppliers', JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('Erro ao carregar fornecedores do Supabase:', err);
      const saved = localStorage.getItem('keepgoing_suppliers');
      if (saved) setSuppliers(JSON.parse(saved));
    } finally {
      setLoadingSuppliers(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSaveSupplier = async (s: Supplier) => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .upsert({
          id: s.id.length > 20 ? s.id : undefined,
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
        })
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
        const exists = prev.find(x => x.id === s.id || x.id === saved.id);
        if (exists) return prev.map(x => (x.id === s.id || x.id === saved.id) ? saved : x);
        return [saved, ...prev];
      });

      return saved;
    } catch (err) {
      console.error('Erro ao salvar fornecedor:', err);
      alert('Erro ao salvar fornecedor no banco de dados.');
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
