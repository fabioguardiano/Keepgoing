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
      let allClients: any[] = [];
      let from = 0;
      let limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('company_id', companyId)
          .order('trading_name')
          .range(from, from + limit - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allClients = [...allClients, ...data];
          from += limit;
          // Se trouxer menos que o limite, significa que acabaram os registros
          if (data.length < limit) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      const mapped = allClients.map(c => ({
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
    } catch (err) {
      console.error('Erro ao carregar clientes do Supabase:', err);
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    fetchClients();
    if (!companyId) return;

    const channel = supabase
      .channel('clients_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'clients',
        filter: `company_id=eq.${companyId}`
      }, () => {
        fetchClients();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  const handleSaveClient = async (c: Client) => {
    // Se o usuário não tem empresa identificada no momento, usamos um fallback temporário (UUID zero)
    const finalCompanyId = companyId || '00000000-0000-0000-0000-000000000000';
    
    // Validar duplicidade de CPF/CNPJ antes de prosseguir
    if (c.document) {
      const cleanDoc = c.document.replace(/\D/g, '');
      if (cleanDoc) { // Apenas se houver números
        const isDuplicate = clients.some(cl => 
          cl.id !== c.id && 
          (cl.document || '').replace(/\D/g, '') === cleanDoc
        );

        if (isDuplicate) {
          const existing = clients.find(cl => (cl.document || '').replace(/\D/g, '') === cleanDoc);
          const docType = c.type === 'Pessoa Física' ? 'CPF' : 'CNPJ';
          const msg = `Não é possível cadastrar: O ${docType} ${c.document} já pertence ao cliente "${existing?.tradingName || existing?.legalName}" (Cód: ${existing?.code || 'S/N'}).`;
          alert(msg);
          throw new Error('DUPLICATE_DOCUMENT');
        }
      }
    }
    
    let finalCode = c.code;
    if (!finalCode) {
      // Pega o maior código numérico atual para gerar o próximo
      const codes = clients
        .map(cl => typeof cl.code === 'number' ? cl.code : parseInt(String(cl.code).replace(/\D/g, '')))
        .filter(n => !isNaN(n));
      const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
      finalCode = maxCode + 1;
    }

    try {
      const payload = {
        id: (c.id && c.id.length > 20) ? c.id : undefined,
        company_id: finalCompanyId,
        name: up(c.tradingName || c.legalName) || 'Sem Nome', 
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
        client_code: finalCode
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
        // Mapeamento inteligente baseado na planilha do usuário (Imagem: H=Rua, I=Bairro, J=Cidade, K=Estado, L=CEP)
        const nome = row.nome || row.name || row['NOME'] || row['CLIENTE'] || 'Sem Nome';
        
        const address = {
          street:       String(row.rua     || row.street     || row.logradouro || row['ENDEREÇO'] || row['ENDERECO'] || ''),
          number:       String(row.numero  || row.number     || ''),
          complement:   String(row.complemento || row.complement || ''),
          neighborhood: String(row.bairro  || row.neighborhood || row['BAIRRO'] || ''),
          city:         String(row.cidade  || row.city         || row['CIDADE'] || ''),
          state:        String(row.estado  || row.state        || row.uf || row['ESTADO'] || row['UF'] || ''),
          zip:          String(row.cep     || row.zip          || row['CEP'] || ''),
        };

        // Tratamento de Código (Preservando zeros se possível)
        let rawCode = row.codigo || row.code || row['CÓDIGO'] || row['CODIGO'];
        let clientCode = undefined;
        if (rawCode !== undefined && rawCode !== null) {
          const stringCode = String(rawCode).trim();
          clientCode = /^\d+$/.test(stringCode) ? stringCode.padStart(4, '0') : stringCode;
        }

        // Verificar duplicidade antes de inserir
        const docToImport = String(row.documento || row.document || '');
        if (docToImport && docToImport.replace(/\D/g, '')) {
          const cleanImportDoc = docToImport.replace(/\D/g, '');
          const isDuplicate = clients.some(c => (c.document || '').replace(/\D/g, '') === cleanImportDoc);
          if (isDuplicate) {
            console.warn(`Pulando cliente duplicado na importação: ${nome} (${docToImport})`);
            errors++;
            continue;
          }
        }

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
          client_code:  clientCode,
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

      setClients(prev => prev.map(x => x.id === id ? { ...x, status: newStatus } : x));
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
