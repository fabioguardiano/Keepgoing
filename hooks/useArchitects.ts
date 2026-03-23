import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Architect } from '../types';

export const useArchitects = (companyId?: string, logActivity?: any) => {
  const [architects, setArchitects] = useState<Architect[]>([]);
  const [loadingArchitects, setLoadingArchitects] = useState(true);

  const fetchArchitects = async () => {
    if (!companyId) { setLoadingArchitects(false); return; }
    setLoadingArchitects(true);
    try {
      let query = supabase.from('architects').select('*');
      query = query.eq('company_id', companyId);

      const { data, error } = await query.order('trading_name');
      
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
        localStorage.setItem(`marmo_architects_${companyId || 'legacy'}`, JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('Erro ao carregar arquitetos do Supabase:', err);
      const saved = localStorage.getItem(`marmo_architects_${companyId || 'legacy'}`);
      if (saved) setArchitects(JSON.parse(saved));
    } finally {
      setLoadingArchitects(false);
    }
  };

  useEffect(() => {
    fetchArchitects();
  }, [companyId]);

  const handleSaveArchitect = async (a: Architect) => {
    const finalCompanyId = companyId || '00000000-0000-0000-0000-000000000000';
    try {
      const payload = {
        id: (a.id && a.id.length > 20) ? a.id : undefined,
        company_id: finalCompanyId,
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
      };

      const { data, error } = await supabase
        .from('architects')
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
        code: data.architect_code,
        createdAt: data.created_at
      } as Architect;
      
      setArchitects(prev => {
        const next = prev.find(x => x.id === a.id || x.id === saved.id)
          ? prev.map(x => (x.id === a.id || x.id === saved.id) ? saved : x)
          : [saved, ...prev];
        localStorage.setItem(`marmo_architects_${finalCompanyId}`, JSON.stringify(next));
        return next;
      });

      return saved;
    } catch (err: any) {
      console.error('Erro ao salvar arquiteto:', err);
      alert(`Erro ao salvar no banco de dados: ${err.message || 'Verifique sua conexão e permissões RLS.'}`);
      throw err;
    }
  };

  const deleteArchitect = async (id: string) => {
    try {
      const architect = architects.find(x => x.id === id);
      const newStatus: 'ativo' | 'inativo' = architect?.status === 'inativo' ? 'ativo' : 'inativo';
      const { error } = await supabase.from('architects').update({ status: newStatus }).eq('id', id);
      if (error) throw error;

      setArchitects(prev => {
        const next = prev.map(x => x.id === id ? { ...x, status: newStatus } : x);
        localStorage.setItem(`marmo_architects_${companyId || '00000000-0000-0000-0000-000000000000'}`, JSON.stringify(next));
        return next;
      });
      fetchArchitects();
    } catch (err: any) {
      console.error('Erro ao inativar arquiteto:', err);
      alert('Erro ao inativar arquiteto: ' + err.message);
    }
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
