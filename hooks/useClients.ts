import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Client } from '../types';

export const useClients = (companyId?: string, logActivity?: (action: any, details: string, referenceId?: string, orderNumber?: string) => Promise<void>) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      // Se não há companyId, carregamos apenas legados ou nada conforme política do banco
      let query = supabase.from('clients').select('*');
      
      if (companyId) {
        query = query.eq('company_id', companyId);
      } else {
        query = query.eq('company_id', '00000000-0000-0000-0000-000000000000');
      }

      const { data, error } = await query.order('trading_name');
      
      if (error) throw error;
      if (data) {
        const mapped = data.map(c => ({
          ...c,
          legalName: c.legal_name || c.name,
          tradingName: c.trading_name || c.name,
          rgInsc: c.rg_insc,
          address: c.address,
          observations: c.observations,
          code: c.client_code,
          createdAt: c.created_at
        }));
        setClients(mapped as Client[]);
        // Persistência local específica da empresa (ou legada)
        localStorage.setItem(`marmo_clients_${companyId || 'legacy'}`, JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('Erro ao carregar clientes do Supabase:', err);
      const saved = localStorage.getItem(`marmo_clients_${companyId || 'legacy'}`);
      if (saved) setClients(JSON.parse(saved));
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [companyId]);

  const handleSaveClient = async (c: Client) => {
    // Se o usuário não tem empresa identificada no momento, usamos um fallback temporário (UUID zero)
    const finalCompanyId = companyId || '00000000-0000-0000-0000-000000000000';
    
    try {
      const payload = {
        id: (c.id && c.id.length > 20) ? c.id : undefined,
        company_id: finalCompanyId,
        name: c.tradingName || c.legalName || 'Sem Nome', // Coluna obrigatória no banco
        type: c.type || 'Pessoa Física',
        document: c.document || '',
        legal_name: c.legalName || c.tradingName || '',
        trading_name: c.tradingName || c.legalName || '',
        email: c.email || '',
        phone: c.phone || '',
        address: c.address || {},
        rg_insc: c.rgInsc || '',
        observations: c.observations || '',
        client_code: c.code
      };

      const { data, error } = await supabase
        .from('clients')
        .upsert(payload)
        .select()
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('O banco de dados não retornou o registro salvo.');
      
      const saved = { 
        ...data, 
        legalName: data.legal_name, 
        tradingName: data.trading_name, 
        rgInsc: data.rg_insc,
        address: data.address,
        observations: data.observations,
        code: data.client_code,
        createdAt: data.created_at
      } as Client;
      
      setClients(prev => {
        const isUpdate = prev.find(x => x.id === c.id || x.id === saved.id);
        const next = isUpdate
          ? prev.map(x => (x.id === c.id || x.id === saved.id) ? saved : x)
          : [saved, ...prev];
        
        // Atualiza localStorage IMEDIATAMENTE antes do próximo F5
        localStorage.setItem(`marmo_clients_${finalCompanyId}`, JSON.stringify(next));
        return next;
      });

      if (logActivity) {
        const isUpdate = clients.some(x => x.id === c.id);
        await logActivity(
          isUpdate ? 'update' : 'create', 
          `${isUpdate ? 'Atualizou' : 'Cadastrou'} cliente: ${saved.tradingName || saved.legalName}`, 
          saved.id
        );
      }

      return saved;
    } catch (err: any) {
      console.error('Erro ao salvar cliente:', err);
      alert(`Erro ao salvar cliente: ${err.message || 'Verifique sua conexão ou permissões RLS.'}`);
      throw err;
    }
  };

  const handleImportClients = async (data: any[]) => {
    const finalCompanyId = companyId || '00000000-0000-0000-0000-000000000000';
    try {
      const clientsToInsert = data.map(row => ({
        company_id: finalCompanyId,
        legal_name: row.nome || row.name || 'Sem Nome',
        trading_name: row.nome || row.name || 'Sem Nome',
        type: row.tipo || row.type || 'Pessoa Física',
        document: String(row.documento || row.document || ''),
        email: String(row.email || ''),
        phone: String(row.telefone || row.phone || ''),
        client_code: isNaN(Number(row.codigo)) ? undefined : Number(row.codigo)
      }));

      const { data: insertedData, error } = await supabase
        .from('clients')
        .insert(clientsToInsert)
        .select();
      
      if (error) throw error;
      if (insertedData) {
        fetchClients(); // Recarrega tudo para garantir consistência
      }
      
      if (logActivity) {
        await logActivity('update', `Importou ${data.length} clientes via planilha`, 'bulk_import', 'BATCH');
      }
    } catch (err: any) {
      console.error('Erro na importação:', err);
      alert('Erro na importação: ' + err.message);
      throw err;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      
      setClients(prev => {
        const next = prev.filter(x => x.id !== id);
        localStorage.setItem(`marmo_clients_${companyId || '00000000-0000-0000-0000-000000000000'}`, JSON.stringify(next));
        return next;
      });
    } catch (err: any) {
      console.error('Erro ao deletar cliente:', err);
      alert('Erro ao deletar: ' + err.message);
    }
  };

  return { 
    clients, 
    loadingClients, 
    handleSaveClient, 
    handleImportClients, 
    deleteClient,
    setClients,
    refreshClients: fetchClients 
  };
};
