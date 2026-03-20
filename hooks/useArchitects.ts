import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Architect } from '../types';

export const useArchitects = (companyId?: string, logActivity?: any) => {
  const [architects, setArchitects] = useState<Architect[]>([]);
  const [loadingArchitects, setLoadingArchitects] = useState(true);

  const fetchArchitects = async () => {
    if (!companyId) return;
    setLoadingArchitects(true);
    try {
      const { data, error } = await supabase
        .from('architects')
        .select('*')
        .eq('company_id', companyId)
        .order('trading_name');
      
      if (error) throw error;
      if (data) {
        const mapped = data.map(a => ({
          ...a,
          legalName: a.legal_name,
          tradingName: a.trading_name,
          contactName: a.contact_name,
          rgInsc: a.rg_insc,
          cellphone: a.cellphone,
          observations: a.observations,
          code: a.architect_code,
          createdAt: a.created_at
        }));
        setArchitects(mapped as Architect[]);
        localStorage.setItem(`marmo_architects_${companyId}`, JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('Erro ao carregar arquitetos do Supabase:', err);
      const saved = localStorage.getItem(`marmo_architects_${companyId}`);
      if (saved) setArchitects(JSON.parse(saved));
    } finally {
      setLoadingArchitects(false);
    }
  };

  useEffect(() => {
    fetchArchitects();
  }, [companyId]);

  const handleSaveArchitect = async (a: Architect) => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from('architects')
        .upsert({
          id: a.id.length > 20 ? a.id : undefined,
          company_id: companyId,
          type: a.type,
          document: a.document,
          legal_name: a.legalName,
          trading_name: a.tradingName,
          contact_name: a.contactName,
          email: a.email,
          phone: a.phone,
          cellphone: a.cellphone,
          address: a.address,
          observations: a.observations,
          rg_insc: a.rgInsc,
          architect_code: a.code
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
        code: data.architect_code,
        createdAt: data.created_at
      } as Architect;
      
      setArchitects(prev => {
        const next = prev.find(x => x.id === a.id || x.id === saved.id)
          ? prev.map(x => (x.id === a.id || x.id === saved.id) ? saved : x)
          : [saved, ...prev];
        localStorage.setItem(`marmo_architects_${companyId}`, JSON.stringify(next));
        return next;
      });

      return saved;
    } catch (err) {
      console.error('Erro ao salvar arquiteto:', err);
      alert('Erro ao salvar arquiteto no banco de dados. Verifique permissões.');
      throw err;
    }
  };

  const deleteArchitect = async (id: string) => {
    const { error } = await supabase.from('architects').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar arquiteto:', error);
      alert('Erro ao deletar arquiteto no banco de dados.');
      throw error;
    }
    setArchitects(prev => prev.filter(x => x.id !== id));
  };

  return { 
    architects, 
    loadingArchitects, 
    handleSaveArchitect, 
    deleteArchitect,
    setArchitects,
    refreshArchitects: fetchArchitects 
  };
};
