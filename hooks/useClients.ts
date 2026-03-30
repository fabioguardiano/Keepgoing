import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Client } from '../types';
import { up } from '../lib/uppercase';

export const useClients = (companyId?: string, logActivity?: (action: any, details: string, referenceId?: string, orderNumber?: string) => Promise<void>) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const fetchClients = async () => {
    if (!companyId) { setLoadingClients(false); return; }
    setLoadingClients(true);
    try {
      let query = supabase.from('clients').select('*');
      query = query.eq('company_id', companyId);

      const { data, error } = await query.order('trading_name');
      
      if (error) throw error;
      if (data) {
        const mapped = data.map(c => ({
          ...c,
          legalName: c.legal_name || c.name,
          tradingName: c.trading_name || c.name,
          name: c.trading_name || c.legal_name || c.name,
          rgInsc: c.rg_insc,
          cellphone: c.cellphone || '',
          birthDate: c.birth_date || undefined,
          address: c.address,
          deliveryAddress: c.delivery_address || undefined,
          observations: c.observations,
          code: c.client_code,
          createdAt: c.created_at
        }));
        setClients(mapped as Client[]);
        // Persistência local específica da empresa (ou legada)
        ({getItem:(k:any)=>null,setItem:(k:any,v:any)=>{},removeItem:(k:any)=>{}} as any).setItem(`marmo_clients_${companyId || 'legacy'}`, JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('Erro ao carregar clientes do Supabase:', err);
      const saved = ({getItem:(k:any)=>null,setItem:(k:any,v:any)=>{},removeItem:(k:any)=>{}} as any).getItem(`marmo_clients_${companyId || 'legacy'}`);
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
        name: up(c.tradingName || c.legalName) || 'Sem Nome', // Coluna obrigatória no banco
        type: c.type || 'Pessoa Física',
        document: c.document || '',
        legal_name: up(c.legalName || c.tradingName) || '',
        trading_name: up(c.tradingName || c.legalName) || '',
        email: c.email || '',
        phone: c.phone || '',
        cellphone: c.cellphone || '',
        birth_date: c.birthDate || null,
        address: c.address ? {
          ...c.address,
          street:       up((c.address as any).street)       ?? (c.address as any).street,
          complement:   up((c.address as any).complement)   ?? (c.address as any).complement,
          neighborhood: up((c.address as any).neighborhood) ?? (c.address as any).neighborhood,
          city:         up((c.address as any).city)         ?? (c.address as any).city,
          state:        up((c.address as any).state)        ?? (c.address as any).state,
        } : {},
        delivery_address: c.deliveryAddress || null,
        rg_insc: c.rgInsc || '',
        observations: up(c.observations) || '',
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
        cellphone: data.cellphone || '',
        birthDate: data.birth_date || undefined,
        address: data.address,
        deliveryAddress: data.delivery_address || undefined,
        observations: data.observations,
        code: data.client_code,
        createdAt: data.created_at
      } as Client;
      
      setClients(prev => {
        const isUpdate = prev.find(x => x.id === c.id || x.id === saved.id);
        const next = isUpdate
          ? prev.map(x => (x.id === c.id || x.id === saved.id) ? saved : x)
          : [saved, ...prev];
        
        // Atualiza ({getItem:(k:any)=>null,setItem:(k:any,v:any)=>{},removeItem:(k:any)=>{}} as any) IMEDIATAMENTE antes do próximo F5
        ({getItem:(k:any)=>null,setItem:(k:any,v:any)=>{},removeItem:(k:any)=>{}} as any).setItem(`marmo_clients_${finalCompanyId}`, JSON.stringify(next));
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

  const handleImportClients = async (data: any[]): Promise<{ success: number; errors: number }> => {
    const finalCompanyId = companyId || '00000000-0000-0000-0000-000000000000';
    let success = 0;
    let errors = 0;

    for (const row of data) {
      try {
        const nome = row.nome || row.name || 'Sem Nome';
        const address = {
          street:       String(row.rua         || row.street       || ''),
          number:       String(row.numero      || row.number       || ''),
          complement:   String(row.complemento || row.complement   || ''),
          neighborhood: String(row.bairro      || row.neighborhood || ''),
          city:         String(row.cidade      || row.city         || ''),
          state:        String(row.estado      || row.state        || ''),
          zip:          String(row.cep         || row.zip          || ''),
        };

        const payload = {
          company_id:   finalCompanyId,
          name:         up(nome) || 'SEM NOME',
          legal_name:   up(nome) || 'SEM NOME',
          trading_name: up(nome) || 'SEM NOME',
          type:         String(row.tipo     || row.type     || 'Pessoa Física'),
          document:     String(row.documento || row.document || ''),
          email:        String(row.email     || ''),
          phone:        String(row.telefone  || row.phone    || ''),
          cellphone:    String(row.celular   || row.cellphone || ''),
          address: {
            ...address,
            street:       up(address.street)       ?? address.street,
            complement:   up(address.complement)   ?? address.complement,
            neighborhood: up(address.neighborhood) ?? address.neighborhood,
            city:         up(address.city)         ?? address.city,
            state:        up(address.state)        ?? address.state,
          },
          status:       'ativo',
          client_code:  isNaN(Number(row.codigo)) ? undefined : Number(row.codigo),
        };

        const { error } = await supabase.from('clients').insert(payload);
        if (error) throw error;
        success++;
      } catch (err: any) {
        console.error('Erro ao importar linha:', row, err);
        errors++;
      }
    }

    fetchClients();

    if (logActivity) {
      await logActivity('update', `Importou ${success} clientes via planilha (${errors} erros)`, 'bulk_import', 'BATCH');
    }

    return { success, errors };
  };

  const deleteClient = async (id: string) => {
    try {
      const client = clients.find(x => x.id === id);
      const newStatus: 'ativo' | 'inativo' = client?.status === 'inativo' ? 'ativo' : 'inativo';
      const { error } = await supabase.from('clients').update({ status: newStatus }).eq('id', id);
      if (error) throw error;

      setClients(prev => {
        const next = prev.map(x => x.id === id ? { ...x, status: newStatus } : x);
        ({getItem:(k:any)=>null,setItem:(k:any,v:any)=>{},removeItem:(k:any)=>{}} as any).setItem(`marmo_clients_${companyId || '00000000-0000-0000-0000-000000000000'}`, JSON.stringify(next));
        return next;
      });
      fetchClients();
    } catch (err: any) {
      console.error('Erro ao inativar cliente:', err);
      alert('Erro ao inativar: ' + err.message);
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
