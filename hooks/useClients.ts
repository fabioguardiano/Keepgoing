import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Client } from '../types';

export const useClients = (companyId?: string, logActivity?: (action: any, details: string, referenceId?: string, orderNumber?: string) => Promise<void>) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const fetchClients = async () => {
    if (!companyId) return;
    setLoadingClients(true);
    try {
      let allClients: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        // Forçamos o bypass de cache do navegador adicionando um parâmetro de tempo na query se necessário
        // ou usando cabeçalhos explicitamente
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('company_id', companyId)
          .order('name')
          .range(from, from + batchSize - 1);
        
        if (error) throw error;
        if (data && data.length > 0) {
          allClients = [...allClients, ...data];
          from += batchSize;
          if (data.length < batchSize) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      const mapped = allClients.map(c => ({
        ...c,
        code: c.client_code,
        rgInsc: c.rg_insc,
        cellphone: c.cellphone,
        birthDate: c.birth_date,
        sellerName: c.seller_name,
        useSpecialTable: c.use_special_table,
        createdAt: c.created_at
      }));
      setClients(mapped as Client[]);
      localStorage.setItem(`marmo_clients_${companyId}`, JSON.stringify(mapped));
    } catch (err) {
      console.error('Erro ao carregar clientes do Supabase:', err);
      const saved = localStorage.getItem(`marmo_clients_${companyId}`);
      if (saved) setClients(JSON.parse(saved));
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [companyId]);

  const handleSaveClient = async (c: Client) => {
    if (!companyId) {
      alert('Erro: Empresa não identificada.');
      return;
    }

    try {
      const payload = {
        id: c.id?.length > 20 ? c.id : undefined,
        company_id: companyId,
        name: c.name,
        type: c.type,
        document: c.document,
        email: c.email,
        phone: c.phone,
        address: c.address,
        client_code: c.code,
        rg_insc: c.rgInsc,
        cellphone: c.cellphone,
        birth_date: c.birthDate,
        seller_name: c.sellerName,
        use_special_table: c.useSpecialTable
      };

      const { data, error } = await supabase
        .from('clients')
        .upsert(payload)
        .select()
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Falha ao persistir dados: o banco retornou sucesso mas nenhum dado foi gravado (possível bloqueio de RLS).');

      const saved = data as any;
      const mappedSaved = { 
        ...saved, 
        code: saved.client_code,
        rgInsc: saved.rg_insc,
        cellphone: saved.cellphone,
        birthDate: saved.birth_date,
        sellerName: saved.seller_name,
        use_special_table: saved.use_special_table,
        createdAt: saved.created_at
      } as Client;

      // Atualiza estado local E localStorage IMEDIATAMENTE para evitar flashes de dados antigos no F5
      setClients(prev => {
        const next = prev.find(x => x.id === c.id || (mappedSaved.id && x.id === mappedSaved.id))
          ? prev.map(x => (x.id === c.id || x.id === mappedSaved.id) ? mappedSaved : x)
          : [mappedSaved, ...prev];
        localStorage.setItem(`marmo_clients_${companyId}`, JSON.stringify(next));
        return next;
      });

      return mappedSaved;
    } catch (err: any) {
      console.error('Erro detalhado ao salvar cliente:', err);
      alert(`Erro ao salvar cliente: ${err.message || 'Verifique as permissões do banco (RLS).'}`);
      throw err;
    }
  };

  const handleImportClients = async (data: any[]) => {
    try {
      const batchSize = 50;
      const totalGroups = Math.ceil(data.length / batchSize);
      
      for (let i = 0; i < totalGroups; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, data.length);
        const batch = data.slice(start, end);
        
        const clientsToInsert = batch.map(row => {
          const rawCode = row.codigo || row.code;
          const parsedCode = (rawCode !== undefined && rawCode !== null && rawCode !== '') 
            ? Number(rawCode) 
            : undefined;

          return {
            name: String(row.nome || row.name || 'Sem Nome'),
            type: row.tipo || row.type || 'Pessoa Física',
            document: String(row.documento || row.document || ''),
            email: String(row.email || ''),
            phone: String(row.telefone || row.phone || row.celular || ''),
            cellphone: String(row.celular || row.phone || ''),
            address: {
              street: String(row.rua || row.street || ''),
              number: String(row.numero || row.number || ''),
              complement: String(row.complemento || row.complement || ''),
              neighborhood: String(row.bairro || row.neighborhood || ''),
              city: String(row.cidade || row.city || ''),
              state: String(row.estado || row.state || ''),
              zipCode: String(row.cep || row.zipCode || '')
            },
            client_code: isNaN(Number(parsedCode)) ? undefined : parsedCode,
            created_at: new Date().toISOString()
          };
        });

        const { data: insertedData, error } = await supabase
          .from('clients')
          .insert(clientsToInsert)
          .select();
        
        if (error) throw error;
        if (insertedData) {
          const mappedBatch = insertedData.map(c => ({ 
            ...c, 
            code: (c as any).client_code,
            rgInsc: (c as any).rg_insc,
            cellphone: (c as any).cellphone,
            birthDate: (c as any).birth_date,
            sellerName: (c as any).seller_name,
            useSpecialTable: (c as any).use_special_table,
            createdAt: (c as any).created_at
          }));
          setClients(prev => [...(mappedBatch as Client[]), ...prev]);
        }
      }
      
      if (logActivity) {
        await logActivity('update', `Importou ${data.length} clientes via planilha`, 'bulk_import', 'BATCH');
      }
    } catch (err: any) {
      console.error('Erro na importação em lote:', err);
      let errorMsg = 'Ocorreu um erro durante a importação.';
      
      if (err.message?.includes('column "client_code" does not exist')) {
        errorMsg = 'ERRO: A coluna "client_code" não foi encontrada no banco de dados.';
      } else if (err.message) {
        errorMsg += `\n\nDetalhes: ${err.message}`;
      }
      
      alert(errorMsg);
      throw err;
    }
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar cliente:', error);
      alert('Erro ao deletar cliente no banco de dados.');
      throw error;
    }
    setClients(prev => prev.filter(x => x.id !== id));
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
